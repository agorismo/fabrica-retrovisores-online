const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {WebSocketServer}=require('ws');const {create,run}=require('./engine');
const PORT=process.env.PORT||3000,DATA=process.env.DATA_FILE||path.join(__dirname,'data.json');
const OWNER=(process.env.OWNER_NAME||'dono').toLowerCase();let OWNER_PASS=process.env.OWNER_PASS;
if(!OWNER_PASS){OWNER_PASS=crypto.randomBytes(5).toString('hex');console.log('[aviso] OWNER_PASS não definido. Senha temporária do dono:',OWNER_PASS)}
/* ---------- persistência ---------- */
let DB={users:{},apps:[],chat:[],nextApp:1,G:null};
try{DB=Object.assign(DB,JSON.parse(fs.readFileSync(DATA,'utf8')))}catch(e){}
const hash=(pin,salt)=>crypto.scryptSync(String(pin),salt,32).toString('hex');
function mkUser(name,pin,role){const salt=crypto.randomBytes(8).toString('hex');return{name,salt,hash:hash(pin,salt),role,me:null,token:crypto.randomBytes(16).toString('hex'),created:Date.now()}}
const ou=DB.users[OWNER];if(!ou)DB.users[OWNER]=mkUser(OWNER,OWNER_PASS,'owner');else{ou.role='owner';ou.salt=crypto.randomBytes(8).toString('hex');ou.hash=hash(OWNER_PASS,ou.salt)}
/* ---------- motor do jogo (headless) ---------- */
const ctx=create(fs.readFileSync(path.join(__dirname,'game.html'),'utf8'));
const R=c=>run(ctx,c);
R("render=function(){};");
if(DB.G){R('G='+JSON.stringify(DB.G)+';')}else{R("G=fresh();G.speed=0;")}
R("if(!G.vagas)rhNew();G.staff={exp:false,rec:false};G.me={n:'Equipe',k:'x',p:null,vn:'',s:'',sc:0,b:0,lvl:4,sk:[],id:'x'};if(!G.camp.started)campBegin();setSpeed(G.speed||0);");
R("var __t0=tick;function FACT_ME(){return {n:'Equipe',k:'x',p:null,vn:'',s:'',sc:0,b:0,lvl:4,sk:[],id:'x'}};tick=function(){__t0();G.me=FACT_ME();if(typeof __AFTER_HOOK==='function')__AFTER_HOOK()};G.me=FACT_ME();");
const J=s=>JSON.stringify(s);
/* ---------- rede ---------- */
const server=http.createServer((req,res)=>{if(req.url==='/health'){res.end('ok');return}
 try{const f=fs.readFileSync(path.join(__dirname,'public','index.html'));res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(f)}catch(e){res.writeHead(500);res.end('build ausente')}});
const wss=new WebSocketServer({server});const conns=new Set();
const send=(w,o)=>{try{if(w.readyState===1)w.send(J(o))}catch(e){}};
const online=()=>[...conns].filter(c=>c.user).map(c=>c.user);
const pub=u=>({name:u.name,role:u.role,k:u.me?u.me.k:null,vn:u.me?(u.me.mgr?'Gerente · '+u.me.s:u.me.vn):null,lvl:u.me?u.me.lvl:null});
function staffUpdate(){const on=online().filter(u=>u.me&&!u.pending);const has=ks=>on.some(u=>ks.includes(u.me.k));R('G.staff='+J({exp:has(['exp']),rec:has(['rec','sc'])})+';')}
function promoUpdate(){const day=+R('G.day');for(const u of Object.values(DB.users)){if(u.me&&!u.me.mgr){const l=Math.min(4,Math.floor((day-u.me.since)/8));if(l>u.me.lvl){u.me.lvl=l;u.me.b+=.02}}}}
function adminData(){return{apps:DB.apps.filter(a=>a.st==='pending'),users:Object.values(DB.users).map(u=>({name:u.name,role:u.role,me:u.me?{vn:u.me.vn,s:u.me.s,k:u.me.k,lvl:u.me.lvl,mgr:!!u.me.mgr}:null,on:online().includes(u)}))}}
let lastDay=0;
function broadcast(){const g=R('JSON.stringify(G)');const day=+R('G.day');if(day!==lastDay){lastDay=day;promoUpdate()}staffUpdate();
 const on=online().map(pub);
 for(const c of conns){if(!c.user)continue;const u=c.user,me=u.role==='owner'?null:(u.me||null);
  c.send_('{"t":"state","G":'+g+',"you":'+J({name:u.name,role:u.role,me,pending:DB.apps.some(a=>a.user===u.name&&a.st==='pending')})+',"online":'+J(on)+',"chat":'+J(DB.chat.slice(-30))+(u.role==='owner'?',"admin":'+J(adminData()):'')+'}')}}
ctx.__AFTER_HOOK=()=>{try{broadcast()}catch(e){console.error('bc',e.message)}};
const ALLOW_BLOCK=new Set(['go','rh','reset','mode','speed','snd','mus','help','close','dismiss','tab','diff']);
function act(u,name,a){if(u.role!=='owner'&&(!u.me))return 'Você ainda não foi contratado(a).';if(ALLOW_BLOCK.has(name))return 'Ação indisponível online.';
 const me=u.role==='owner'?null:u.me;const before=R('G.log?G.log.length:0');
 const msg=R('(function(){const me='+J(me)+';const prev=G.me;G.me=me;let deny="";const ts=showToast;showToast=function(m){deny=m};try{A('+J(name)+','+J(a===undefined?null:a)+')}catch(e){deny="Erro: "+e.message}finally{showToast=ts;G.me=prev}return deny})()');
 broadcast();return msg||''}
function chat(from,text,sys){DB.chat.push({from,text:String(text).slice(0,200),sys:!!sys,at:Date.now()});if(DB.chat.length>100)DB.chat.shift()}
wss.on('connection',ws=>{ws.send_=s=>{try{if(ws.readyState===1)ws.send(s)}catch(e){}};conns.add(ws);
 ws.on('close',()=>{conns.delete(ws);broadcast()});
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}
  try{
  if(m.t==='register'||m.t==='login'||m.t==='token'){
   const name=String(m.name||'').trim().toLowerCase().replace(/[^a-z0-9_ ãáâçéêíóôõú-]/gi,'').slice(0,20);let u=DB.users[name];
   if(m.t==='token'){u=DB.users[String(m.name||'').toLowerCase()];if(!u||u.token!==m.token||u.role==='owner'&&false)return send(ws,{t:'auth',ok:false,err:'Sessão expirada.'})}
   else if(m.t==='register'){if(name.length<3)return send(ws,{t:'auth',ok:false,err:'Nome com pelo menos 3 letras.'});if(u)return send(ws,{t:'auth',ok:false,err:'Nome já usado.'});if(String(m.pin||'').length<4)return send(ws,{t:'auth',ok:false,err:'PIN com 4 ou mais caracteres.'});u=DB.users[name]=mkUser(name,m.pin,'player')}
   else{if(!u||hash(m.pin||'',u.salt)!==u.hash)return send(ws,{t:'auth',ok:false,err:'Nome ou PIN incorretos.'});u.token=crypto.randomBytes(16).toString('hex')}
   ws.user=u;send(ws,{t:'auth',ok:true,name:u.name,token:u.token,role:u.role});chat('Sistema',u.name+' entrou.',true);broadcast();return}
  const u=ws.user;if(!u)return;
  if(m.t==='act'){const r=act(u,m.act,m.a);if(r)send(ws,{t:'deny',msg:r});return}
  if(m.t==='chat'){chat(u.name,m.text);broadcast();return}
  if(m.t==='apply'){if(u.me)return send(ws,{t:'deny',msg:'Você já tem um cargo.'});if(DB.apps.some(a=>a.user===u.name&&a.st==='pending'))return send(ws,{t:'deny',msg:'Você já tem uma candidatura pendente.'});
   const cv=m.cv||{};cv.n=String(cv.n||u.name).slice(0,40);cv.esc=Math.max(0,Math.min(3,+cv.esc||0));cv.exp=Math.max(0,Math.min(40,+cv.exp||0));cv.sk=Array.isArray(cv.sk)?cv.sk.filter(x=>typeof x==='string').slice(0,20):[];cv.t=String(cv.t||'').slice(0,2000);
   const r=JSON.parse(R('(function(){const v=VG.find(x=>x.id==='+J(String(m.vaga))+');if(!v||!(G.vagas&&G.vagas[v.id]>0))return JSON.stringify({err:"Vaga indisponível."});const r=rhScore(v,'+J(cv)+');return JSON.stringify({v:v,r:r})})()'));
   if(r.err)return send(ws,{t:'deny',msg:r.err});
   if(r.r.sc<50){return send(ws,{t:'deny',msg:'Nota '+r.r.sc+'/100 para '+r.v.n+'. Mínimo 50. Melhore o currículo ou escolha outra vaga.'})}
   DB.apps.push({id:DB.nextApp++,user:u.name,cv,vaga:r.v.id,vn:r.v.n,s:r.v.s,k:r.v.k,p:r.v.p||null,sc:r.r.sc,st:'pending',at:Date.now()});chat('Sistema',u.name+' se candidatou a '+r.v.n+'.',true);broadcast();return send(ws,{t:'deny',msg:'Candidatura enviada. Aguarde a aprovação do dono.'})}
  if(u.role!=='owner')return;
  /* ---- painel do dono ---- */
  if(m.t==='approve'||m.t==='reject'){const a=DB.apps.find(x=>x.id===m.id&&x.st==='pending');if(!a)return;const t=DB.users[a.user];
   if(m.t==='reject'){a.st='rejected';chat('Sistema',a.user+': candidatura recusada.',true)}
   else{const left=+R('G.vagas&&G.vagas['+J(a.vaga)+']||0');if(left<1)return send(ws,{t:'deny',msg:'Sem vagas abertas para '+a.vn+'. Abra uma vaga antes.'});
    a.st='approved';R('G.vagas['+J(a.vaga)+']--;');t.me={n:t.name,id:a.vaga,k:a.k,p:a.p,vn:a.vn,s:a.s,sc:a.sc,b:.04+(a.sc-50)/50*.12,lvl:0,sk:a.cv.sk,since:+R('G.day')};chat('Sistema',t.name+' foi contratado(a) como '+a.vn+'.',true)}
   broadcast();return}
  if(m.t==='role'){const t=DB.users[m.user];if(!t||t.role==='owner')return;if(m.op==='manager'&&t.me){t.me.mgr=true;t.me.lvl=4;t.me.vn='Gerente';chat('Sistema',t.name+' foi promovido(a) a gerente de '+t.me.s+'.',true)}
   else if(m.op==='demote'&&t.me){t.me.mgr=false;t.me.lvl=0;t.me.since=+R('G.day');t.me.vn=t.me.vn}
   else if(m.op==='fire'){t.me=null;chat('Sistema',t.name+' foi desligado(a).',true)}
   broadcast();return}
  if(m.t==='vaga'){const d=+m.d||0;R('G.vagas['+J(String(m.id))+']=Math.max(0,Math.min(9,(G.vagas['+J(String(m.id))+']||0)+('+d+')));');broadcast();return}
  if(m.t==='speed'){const s=[0,1,3,8].includes(+m.s)?+m.s:0;R('setSpeed('+s+');');broadcast();return}
  if(m.t==='announce'){chat('DONO',m.text,true);broadcast();return}
  if(m.t==='reset'&&m.confirm==='REINICIAR'){R("G=fresh();G.speed=0;rhNew();G.staff={exp:false,rec:false};campBegin();pause();");for(const x of Object.values(DB.users))x.me=null;DB.apps=[];lastDay=0;chat('Sistema','A empresa foi reiniciada pelo dono.',true);broadcast();return}
  }catch(e){console.error('msg',e)}});
 send(ws,{t:'hello'})});
function save(){try{DB.G=JSON.parse(R('JSON.stringify(G)'));DB.G.me=null;fs.writeFileSync(DATA,J(DB))}catch(e){console.error('save',e.message)}}
setInterval(save,20000);process.on('SIGTERM',()=>{save();process.exit(0)});process.on('SIGINT',()=>{save();process.exit(0)});
setInterval(()=>{if(!R('G.speed'))broadcast()},3000);
server.listen(PORT,()=>console.log('Fábrica online na porta',PORT));
