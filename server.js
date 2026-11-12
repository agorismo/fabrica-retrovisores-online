const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {WebSocketServer}=require('ws');const {create,run}=require('./engine');
const PORT=process.env.PORT||3000,DATA=process.env.DATA_FILE||path.join(__dirname,'data.json');
const OWNER=(process.env.OWNER_NAME||'dono').toLowerCase();let OWNER_PASS=process.env.OWNER_PASS;
/* Atrás de um proxy (Render, Fly, Nginx) o IP real vem em X-Forwarded-For. Só confie nele se houver proxy. */
const TRUST_PROXY=process.env.TRUST_PROXY==='1'||!!process.env.RENDER;
if(!OWNER_PASS){OWNER_PASS=crypto.randomBytes(5).toString('hex');console.log('[aviso] OWNER_PASS não definido. Senha temporária do dono:',OWNER_PASS)}
else if(OWNER_PASS.length<8)console.log('[aviso] OWNER_PASS curto. Use 8 ou mais caracteres.');

/* ---------- persistência ---------- */
/* users usa objeto sem protótipo: nomes como "constructor" ou "__proto__" não podem casar com Object.prototype. */
let DB={users:Object.create(null),apps:[],chat:[],nextApp:1,G:null};
try{const d=JSON.parse(fs.readFileSync(DATA,'utf8'));Object.assign(DB,d);DB.users=Object.assign(Object.create(null),d.users||{})}catch(e){if(e.code!=='ENOENT')console.error('[aviso] não consegui ler',DATA,'-',e.message)}
const getUser=n=>typeof n==='string'&&Object.hasOwn(DB.users,n)?DB.users[n]:null;
const hash=(pin,salt)=>crypto.scryptSync(String(pin),salt,32).toString('hex');
/* comparação em tempo constante para hash e token */
function safeEq(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)}
const checkPin=(u,pin)=>!!(u&&u.salt&&safeEq(hash(pin,u.salt),u.hash));
const newToken=()=>crypto.randomBytes(16).toString('hex');
function mkUser(name,pin,role){const salt=crypto.randomBytes(8).toString('hex');return{name,salt,hash:hash(pin,salt),role,me:null,token:newToken(),created:Date.now()}}
{const ou=getUser(OWNER);
 if(!ou)DB.users[OWNER]=mkUser(OWNER,OWNER_PASS,'owner');
 /* senha do dono mudou: troca o hash e invalida sessões antigas do dono */
 else{ou.role='owner';if(!checkPin(ou,OWNER_PASS)){ou.salt=crypto.randomBytes(8).toString('hex');ou.hash=hash(OWNER_PASS,ou.salt);ou.token=newToken()}}}

/* ---------- motor do jogo (headless) ---------- */
const ctx=create(fs.readFileSync(path.join(__dirname,'game.html'),'utf8'));
const R=c=>run(ctx,c);
/* linhas separadas, abastecedor e vagas de qualidade: o mesmo arquivo roda no navegador (build.js) */
R(fs.readFileSync(path.join(__dirname,'linhas.js'),'utf8'));
R("render=function(){};");
if(DB.G){R('G='+JSON.stringify(DB.G)+';')}else{R("G=fresh();G.speed=0;")}
R("if(!G.vagas)rhNew();G.staff={exp:false,rec:false};G.me={n:'Equipe',k:'x',p:null,vn:'',s:'',sc:0,b:0,lvl:4,sk:[],id:'x'};if(!G.camp.started)campBegin();setSpeed(G.speed||0);LINHAS.init();");
R("var __t0=tick;function FACT_ME(){return {n:'Equipe',k:'x',p:null,vn:'',s:'',sc:0,b:0,lvl:4,sk:[],id:'x'}};tick=function(){__t0();G.me=FACT_ME();if(typeof __AFTER_HOOK==='function')__AFTER_HOOK()};G.me=FACT_ME();");
const J=s=>JSON.stringify(s);
/* listas válidas vindas do próprio jogo, usadas para validar o que o cliente manda */
const VAGA_IDS=new Set(JSON.parse(R('JSON.stringify(VG.map(v=>v.id))')));
const SKILLS=new Set(JSON.parse(R('JSON.stringify(Object.keys(SKN))')));

/* ---------- limites ---------- */
/* login: 5 erros por IP+nome bloqueiam por 1 min, dobrando a cada novo erro (máx. 15 min) */
const FAILS=new Map();
function lockedFor(key){const f=FAILS.get(key);return f&&f.until>Date.now()?Math.ceil((f.until-Date.now())/1000):0}
function failLogin(key){const f=FAILS.get(key)||{n:0,until:0};f.n++;if(f.n>=5)f.until=Date.now()+Math.min(15*60e3,60e3*2**(f.n-5));f.last=Date.now();FAILS.set(key,f)}
/* criação de contas: até 5 por IP por hora */
const REGS=new Map();
function canRegister(ip){const now=Date.now(),L=(REGS.get(ip)||[]).filter(t=>now-t<3600e3);REGS.set(ip,L);return L.length<5}
setInterval(()=>{const now=Date.now();for(const[k,f]of FAILS)if(f.until<now&&now-f.last>3600e3)FAILS.delete(k);for(const[k,L]of REGS)if(!L.some(t=>now-t<3600e3))REGS.delete(k)},600e3).unref();
/* balde de fichas genérico: cap fichas, recarrega rate por segundo */
function bucket(cap,rate){let t=cap,at=Date.now();return()=>{const now=Date.now();t=Math.min(cap,t+(now-at)/1000*rate);at=now;if(t<1)return false;t--;return true}}
const ACT_RE=/^[a-z]{1,16}$/;
function validArg(a){return a===undefined||a===null||typeof a==='number'&&Number.isFinite(a)||typeof a==='string'&&a.length<=40}

/* ---------- rede ---------- */
let PAGE=null;
function page(){if(!PAGE)try{PAGE=fs.readFileSync(path.join(__dirname,'public','index.html'))}catch(e){}return PAGE}
/* ícones do app e manifest: lista fechada, nada de servir caminho arbitrário do disco */
const STATIC={'/favicon.svg':'image/svg+xml','/icon-192.png':'image/png','/icon-512.png':'image/png','/icon-maskable-512.png':'image/png','/apple-touch-icon.png':'image/png','/manifest.webmanifest':'application/manifest+json'};
const ASSETS=new Map();
function asset(u){if(!ASSETS.has(u))try{ASSETS.set(u,fs.readFileSync(path.join(__dirname,'public',u.slice(1))))}catch(e){return null}return ASSETS.get(u)}
const HDR={'x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'SAMEORIGIN'};
const server=http.createServer((req,res)=>{const url=(req.url||'/').split('?')[0];
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,HDR);return res.end()}
 if(url==='/health'){res.writeHead(200,{...HDR,'content-type':'text/plain'});return res.end('ok')}
 if(Object.hasOwn(STATIC,url)){const f=asset(url);if(!f){res.writeHead(404,HDR);return res.end()}
  res.writeHead(200,{...HDR,'content-type':STATIC[url],'cache-control':'public, max-age=86400'});return res.end(req.method==='HEAD'?undefined:f)}
 if(url!=='/'&&url!=='/index.html'){res.writeHead(404,{...HDR,'content-type':'text/plain; charset=utf-8'});return res.end('não encontrado')}
 const f=page();if(!f){res.writeHead(500,HDR);return res.end('build ausente: rode node build.js')}
 res.writeHead(200,{...HDR,'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});res.end(req.method==='HEAD'?undefined:f)});
const wss=new WebSocketServer({server,maxPayload:16*1024});const conns=new Set();
const send=(w,o)=>{try{if(w.readyState===1)w.send(J(o))}catch(e){}};
const online=()=>[...new Set([...conns].filter(c=>c.user).map(c=>c.user))];
const pub=u=>({name:u.name,role:u.role,k:u.me?u.me.k:null,mgr:!!(u.me&&u.me.mgr),vn:u.me?(u.me.mgr?'Gerente · '+u.me.s:u.me.vn):null,lvl:u.me?u.me.lvl:null});
function staffUpdate(){const on=online().filter(u=>u.me&&!u.pending);const has=ks=>on.some(u=>ks.includes(u.me.k));R('G.staff='+J({exp:has(['exp']),rec:has(['rec','sc'])})+';G.ops='+J(on.map(u=>({n:u.name,k:u.me.k,p:u.me.p||null,b:u.me.b||0,lvl:u.me.lvl||0,mgr:!!u.me.mgr})))+';')}
function promoUpdate(){const day=+R('G.day');for(const u of Object.values(DB.users)){if(u.me&&!u.me.mgr){const l=Math.min(4,Math.floor((day-u.me.since)/8));if(l>u.me.lvl){u.me.lvl=l;u.me.b+=.02}}}}
function adminData(){const on=online();return{apps:DB.apps.filter(a=>a.st==='pending'),users:Object.values(DB.users).map(u=>({name:u.name,role:u.role,me:u.me?{vn:u.me.vn,s:u.me.s,k:u.me.k,lvl:u.me.lvl,mgr:!!u.me.mgr}:null,on:on.includes(u)}))}}
let lastDay=0;
function broadcast(){const day=+R('G.day');if(day!==lastDay){lastDay=day;promoUpdate()}staffUpdate();const g=R('JSON.stringify(G)');
 const on=J(online().map(pub)),ch=J(DB.chat.slice(-30));let adm=null;
 for(const c of conns){if(!c.user)continue;const u=c.user,me=u.role==='owner'?null:(u.me||null);
  if(u.role==='owner'&&!adm)adm=J(adminData());
  c.send_('{"t":"state","G":'+g+',"you":'+J({name:u.name,role:u.role,me,pending:DB.apps.some(a=>a.user===u.name&&a.st==='pending')})+',"online":'+on+',"chat":'+ch+(u.role==='owner'?',"admin":'+adm:'')+'}')}}
ctx.__AFTER_HOOK=()=>{try{broadcast()}catch(e){console.error('bc',e.message)}};
/* 0.0167 = tempo realista (1 dia de jogo ≈ 1 h); 0.1 = calmo (1 dia ≈ 10 min) */
const SPEEDS=[0,0.0167,0.1,1,3,8];
const ALLOW_BLOCK=new Set(['go','rh','reset','mode','speed','snd','mus','help','close','dismiss','tab','diff']);
function act(u,name,a){if(u.role!=='owner'&&(!u.me))return 'Você ainda não foi contratado(a).';
 if(typeof name!=='string'||!ACT_RE.test(name)||!validArg(a))return 'Ação inválida.';
 if(ALLOW_BLOCK.has(name))return 'Ação indisponível online.';
 if(name==='shift'&&![1,2,3].includes(+a))return 'Ação inválida.';
 const me=u.role==='owner'?null:u.me;
 const msg=R('(function(){const me='+J(me)+';const prev=G.me;G.me=me;let deny="";const ts=showToast;showToast=function(m){deny=m};try{A('+J(name)+','+J(a===undefined?null:a)+')}catch(e){deny="Ação inválida."}finally{showToast=ts;G.me=prev}return deny})()');
 broadcast();return msg||''}
function chat(from,text,sys){DB.chat.push({from,text:String(text).slice(0,200),sys:!!sys,at:Date.now()});if(DB.chat.length>100)DB.chat.shift()}
/* evita "fulano entrou" a cada queda rápida de conexão */
const SEEN=new Map();
function announceJoin(u){const wasOn=online().includes(u),last=SEEN.get(u.name)||0;if(!wasOn&&Date.now()-last>60e3)chat('Sistema',u.name+' entrou.',true)}
const NAME_RE=/^[a-z0-9ãáâçéêíóôõú][a-z0-9_ ãáâçéêíóôõú-]{2,19}$/;
const cleanName=n=>String(n||'').trim().toLowerCase().replace(/[^a-z0-9_ ãáâçéêíóôõú-]/g,'').replace(/\s+/g,' ').trim().slice(0,20);
function ipOf(req){if(TRUST_PROXY){const x=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();if(x)return x}return req.socket.remoteAddress||'?'}
wss.on('connection',(ws,req)=>{ws.send_=s=>{try{if(ws.readyState===1)ws.send(s)}catch(e){}};conns.add(ws);
 ws.ip=ipOf(req);ws.alive=true;ws.on('pong',()=>{ws.alive=true});
 const rate=bucket(30,15),chatRate=bucket(5,.5);
 ws.on('close',()=>{conns.delete(ws);if(ws.user)SEEN.set(ws.user.name,Date.now());broadcast()});
 ws.on('error',()=>{});
 ws.on('message',raw=>{if(!rate())return;let m;try{m=JSON.parse(raw)}catch(e){return}if(!m||typeof m!=='object')return;
  try{
  if(m.t==='register'||m.t==='login'||m.t==='token'){
   const name=cleanName(m.name),key=ws.ip+'|'+name;let u=getUser(name);
   /* contas antigas podem ter sido gravadas com a normalização anterior (ex.: espaço no fim) */
   if(!u&&m.t!=='register'){const raw=String(m.name||'').toLowerCase();u=getUser(raw.trim().replace(/[^a-z0-9_ ãáâçéêíóôõú-]/gi,'').slice(0,20))||getUser(raw)}
   if(m.t==='token'){if(!u||!safeEq(u.token,m.token))return send(ws,{t:'auth',ok:false,err:'Sessão expirada. Entre de novo.',expired:true})}
   else if(m.t==='register'){if(!NAME_RE.test(name))return send(ws,{t:'auth',ok:false,err:'Nome com 3 a 20 caracteres, começando por letra ou número.'});if(u)return send(ws,{t:'auth',ok:false,err:'Nome já usado.'});
    const pin=String(m.pin||'');if(pin.length<4||pin.length>64)return send(ws,{t:'auth',ok:false,err:'PIN com 4 a 64 caracteres.'});
    if(!canRegister(ws.ip))return send(ws,{t:'auth',ok:false,err:'Muitas contas criadas daqui. Tente mais tarde.'});
    REGS.get(ws.ip).push(Date.now());u=DB.users[name]=mkUser(name,pin,'player')}
   else{const w=lockedFor(key);if(w)return send(ws,{t:'auth',ok:false,err:'Muitas tentativas. Aguarde '+w+' s.'});
    if(!checkPin(u,String(m.pin||'').slice(0,64))){failLogin(key);return send(ws,{t:'auth',ok:false,err:'Nome ou PIN incorretos.'})}
    FAILS.delete(key);u.token=newToken()}
   announceJoin(u);ws.user=u;send(ws,{t:'auth',ok:true,name:u.name,token:u.token,role:u.role});broadcast();return}
  const u=ws.user;if(!u)return;
  if(m.t==='act'){const r=act(u,m.act,m.a);if(r)send(ws,{t:'deny',msg:r});return}
  if(m.t==='chat'){const text=String(m.text||'').trim();if(!text)return;if(!chatRate())return send(ws,{t:'deny',msg:'Calma, muitas mensagens seguidas.'});chat(u.name,text);broadcast();return}
  if(m.t==='apply'){if(u.role==='owner')return send(ws,{t:'deny',msg:'O dono não se candidata.'});if(u.me)return send(ws,{t:'deny',msg:'Você já tem um cargo.'});if(DB.apps.some(a=>a.user===u.name&&a.st==='pending'))return send(ws,{t:'deny',msg:'Você já tem uma candidatura pendente.'});
   const vaga=String(m.vaga);if(!VAGA_IDS.has(vaga))return send(ws,{t:'deny',msg:'Vaga indisponível.'});
   const c=m.cv&&typeof m.cv==='object'?m.cv:{};
   const cv={n:String(c.n||u.name).slice(0,40),esc:Math.max(0,Math.min(3,Math.floor(+c.esc)||0)),exp:Math.max(0,Math.min(40,Math.floor(+c.exp)||0)),sk:Array.isArray(c.sk)?[...new Set(c.sk.filter(x=>SKILLS.has(x)))]:[],t:String(c.t||'').slice(0,2000)};
   const r=JSON.parse(R('(function(){const v=VG.find(x=>x.id==='+J(vaga)+');if(!v||!(G.vagas&&G.vagas[v.id]>0))return JSON.stringify({err:"Vaga indisponível."});const r=rhScore(v,'+J(cv)+');return JSON.stringify({v:v,r:r})})()'));
   if(r.err)return send(ws,{t:'deny',msg:r.err});
   if(r.r.sc<50){return send(ws,{t:'deny',msg:'Nota '+r.r.sc+'/100 para '+r.v.n+'. Mínimo 50. Melhore o currículo ou escolha outra vaga.'})}
   DB.apps.push({id:DB.nextApp++,user:u.name,cv,vaga:r.v.id,vn:r.v.n,s:r.v.s,k:r.v.k,p:r.v.p||null,sc:r.r.sc,st:'pending',at:Date.now()});chat('Sistema',u.name+' se candidatou a '+r.v.n+'.',true);broadcast();return send(ws,{t:'deny',msg:'Candidatura enviada. Aguarde a aprovação do dono.'})}
  if(u.role!=='owner')return;
  /* ---- painel do dono ---- */
  if(m.t==='approve'||m.t==='reject'){const a=DB.apps.find(x=>x.id===m.id&&x.st==='pending');if(!a)return;const t=getUser(a.user);
   if(!t){a.st='rejected';broadcast();return}
   if(m.t==='reject'){a.st='rejected';chat('Sistema',a.user+': candidatura recusada.',true)}
   else{if(t.me){a.st='rejected';broadcast();return send(ws,{t:'deny',msg:t.name+' já tem um cargo.'})}
    const left=+R('G.vagas&&G.vagas['+J(a.vaga)+']||0');if(left<1)return send(ws,{t:'deny',msg:'Sem vagas abertas para '+a.vn+'. Abra uma vaga antes.'});
    a.st='approved';R('G.vagas['+J(a.vaga)+']--;');t.me={n:t.name,id:a.vaga,k:a.k,p:a.p,vn:a.vn,s:a.s,sc:a.sc,b:.04+(a.sc-50)/50*.12,lvl:0,sk:a.cv.sk,since:+R('G.day')};chat('Sistema',t.name+' foi contratado(a) como '+a.vn+'.',true)}
   broadcast();return}
  if(m.t==='role'){const t=getUser(m.user);if(!t||t.role==='owner')return;
   if(m.op==='manager'&&t.me&&!t.me.mgr){t.me.mgr=true;t.me.vn0=t.me.vn;t.me.lvl0=t.me.lvl;t.me.lvl=4;t.me.vn='Gerente';chat('Sistema',t.name+' foi promovido(a) a gerente de '+t.me.s+'.',true)}
   /* volta ao cargo de origem (antes o nome do cargo ficava como "Gerente") */
   else if(m.op==='demote'&&t.me&&t.me.mgr){t.me.mgr=false;t.me.vn=t.me.vn0||t.me.vn;t.me.lvl=0;t.me.since=+R('G.day');delete t.me.vn0;delete t.me.lvl0;chat('Sistema',t.name+' deixou a gerência de '+t.me.s+'.',true)}
   else if(m.op==='fire'&&t.me){t.me=null;chat('Sistema',t.name+' foi desligado(a).',true)}
   broadcast();return}
  if(m.t==='vaga'){const id=String(m.id);if(!VAGA_IDS.has(id))return;const d=Math.sign(+m.d||0);R('if(!G.vagas)G.vagas={};G.vagas['+J(id)+']=Math.max(0,Math.min(9,(G.vagas['+J(id)+']||0)+('+d+')));');broadcast();return}
  if(m.t==='speed'){const s=SPEEDS.includes(+m.s)?+m.s:0;R('setSpeed('+s+');');broadcast();return}
  if(m.t==='announce'){const text=String(m.text||'').trim();if(!text)return;chat('DONO',text,true);broadcast();return}
  if(m.t==='reset'&&m.confirm==='REINICIAR'){R("G=fresh();G.speed=0;rhNew();G.staff={exp:false,rec:false};campBegin();pause();LINHAS.init();");for(const x of Object.values(DB.users))x.me=null;DB.apps=[];lastDay=0;chat('Sistema','A empresa foi reiniciada pelo dono.',true);save();broadcast();return}
  }catch(e){console.error('msg',e)}});
 send(ws,{t:'hello'})});
/* derruba conexões mortas (celular que perdeu sinal etc.) para a lista de online ficar correta */
const hb=setInterval(()=>{for(const ws of conns){if(!ws.alive){ws.terminate();continue}ws.alive=false;try{ws.ping()}catch(e){}}},30e3);hb.unref();
/* grava em arquivo temporário e renomeia: uma queda no meio da escrita não corrompe o data.json */
function save(){try{DB.G=JSON.parse(R('JSON.stringify(G)'));DB.G.me=null;const tmp=DATA+'.tmp';fs.writeFileSync(tmp,J(DB));fs.renameSync(tmp,DATA)}catch(e){console.error('save',e.message)}}
setInterval(save,20000);process.on('SIGTERM',()=>{save();process.exit(0)});process.on('SIGINT',()=>{save();process.exit(0)});
setInterval(()=>{if(!R('G.speed'))broadcast()},3000);
server.listen(PORT,()=>console.log('Fábrica online na porta',server.address().port));
