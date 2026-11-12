// Testes de ponta a ponta: sobem o servidor de verdade e conversam por WebSocket.
// Rodar com: npm test
const {test,before,after}=require('node:test');
const assert=require('node:assert');
const {spawn,execFileSync}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),http=require('http');
const WebSocket=require('ws');
const {create,run}=require('../engine');

const ROOT=path.join(__dirname,'..');
const PASS='senha-do-dono-123';
const DATA=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'fabrica-')),'data.json');
let srv,PORT;
const VG=JSON.parse(run(create(fs.readFileSync(path.join(ROOT,'game.html'),'utf8')),'JSON.stringify(VG)'));

function start(){return new Promise((res,rej)=>{
  srv=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:'0',OWNER_PASS:PASS,DATA_FILE:DATA,RENDER:''}});
  let out='';const t=setTimeout(()=>rej(new Error('servidor não subiu: '+out)),15000);
  srv.stdout.on('data',d=>{out+=d;const m=out.match(/porta (\d+)/);if(m){clearTimeout(t);PORT=+m[1];res()}});
  srv.stderr.on('data',d=>{out+=d});})}
function stop(){return new Promise(r=>{if(!srv||srv.exitCode!==null)return r();srv.once('exit',()=>r());srv.kill('SIGTERM')})}

before(async()=>{execFileSync(process.execPath,['build.js'],{cwd:ROOT});await start()});
after(stop);

function get(p){return new Promise((res,rej)=>http.get({host:'127.0.0.1',port:PORT,path:p},r=>{let b='';r.on('data',d=>b+=d);r.on('end',()=>res({status:r.statusCode,body:b,headers:r.headers}))}).on('error',rej))}

// cliente de teste: guarda todas as mensagens e espera pela que interessa
function client(){return new Promise((res,rej)=>{
  const ws=new WebSocket('ws://127.0.0.1:'+PORT);const msgs=[];const waiters=[];
  ws.on('message',d=>{const m=JSON.parse(d);msgs.push(m);for(const w of waiters.slice())if(w.f(m)){waiters.splice(waiters.indexOf(w),1);w.r(m)}});
  const c={ws,msgs,
    send:o=>ws.send(JSON.stringify(o)),
    wait:(f,ms=4000)=>new Promise((r,j)=>{const hit=msgs.find(f);if(hit){msgs.splice(msgs.indexOf(hit),1);return r(hit)}
      const w={f,r:m=>{clearTimeout(t);msgs.splice(msgs.indexOf(m),1);r(m)}};const t=setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);j(new Error('tempo esgotado'))},ms);waiters.push(w)}),
    close:()=>ws.close()};
  ws.on('open',()=>res(c));ws.on('error',rej)})}
async function auth(t,name,pin,token){const c=await client();c.send({t,name,pin,token});const a=await c.wait(m=>m.t==='auth');return{c,a}}

test('HTTP: página, health e 404',async()=>{
  const h=await get('/health');assert.equal(h.body,'ok');
  const p=await get('/');assert.equal(p.status,200);assert.match(p.body,/Enviar candidatura ao dono/);assert.equal(p.headers['x-content-type-options'],'nosniff');
  assert.equal((await get('/nao-existe')).status,404);
  assert.equal((await get('/../server.js')).status,404);});

test('ícones do app, manifest e tema injetados',async()=>{
  const p=await get('/');
  assert.match(p.body,/rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(p.body,/id="tema-online"/);
  assert.match(p.body,/const FX=\(function/);
  for(const [u,t] of [['/favicon.svg','image/svg+xml'],['/icon-192.png','image/png'],['/icon-512.png','image/png'],['/apple-touch-icon.png','image/png'],['/manifest.webmanifest','application/manifest+json']]){
    const r=await get(u);assert.equal(r.status,200,u);assert.equal(r.headers['content-type'],t,u)}
  const m=JSON.parse((await get('/manifest.webmanifest')).body);
  assert.ok(m.icons.some(i=>i.purpose==='maskable'));});

test('nomes de protótipo não abrem sessão fantasma',async()=>{
  for(const name of ['constructor','__proto__','toString','hasOwnProperty']){
    const {c,a}=await auth('token',name);assert.equal(a.ok,false,name);c.close();
    const r=await auth('login',name,'1234');assert.equal(r.a.ok,false,name);r.c.close();}
  const r=await auth('register','__proto__','1234');assert.equal(r.a.ok,false);r.c.close();});

test('cadastro, login e token',async()=>{
  let r=await auth('register','Ana Silva','1234');assert.equal(r.a.ok,true);assert.equal(r.a.name,'ana silva');const tok=r.a.token;r.c.close();
  r=await auth('register','ana silva','9999');assert.equal(r.a.ok,false);r.c.close();
  r=await auth('token','ana silva',undefined,tok);assert.equal(r.a.ok,true);r.c.close();
  r=await auth('token','ana silva',undefined,'x'.repeat(32));assert.equal(r.a.ok,false);r.c.close();
  r=await auth('login','ana silva','1234');assert.equal(r.a.ok,true);assert.notEqual(r.a.token,tok);r.c.close();});

test('login trava após 5 PINs errados',async()=>{
  let r=await auth('register','bruno','4321');r.c.close();
  for(let i=0;i<5;i++){r=await auth('login','bruno','0000');assert.equal(r.a.ok,false);r.c.close()}
  r=await auth('login','bruno','4321');assert.equal(r.a.ok,false);assert.match(r.a.err,/Muitas tentativas/);r.c.close();});

test('fluxo completo: candidatura, contratação, permissões e gerência',async()=>{
  const v=VG.find(x=>x.k==='exp')||VG[0];
  const own=(await auth('login','dono',PASS)).c;
  // abre uma vaga e confirma pelo estado
  own.send({t:'vaga',id:v.id,d:1});
  const p=(await auth('register','carla','1234')).c;
  p.send({t:'apply',vaga:v.id,cv:{n:'Carla',esc:3,exp:40,sk:v.sk.concat(['naoexiste']),t:''}});
  assert.match((await p.wait(m=>m.t==='deny')).msg,/Candidatura enviada/);
  const sa=await own.wait(m=>m.t==='state'&&m.admin&&m.admin.apps.some(a=>a.user==='carla'));
  const adm=sa.admin,before=sa.G.vagas[v.id];
  const app=adm.apps.find(a=>a.user==='carla');
  assert.ok(!app.cv.sk.includes('naoexiste'),'habilidades desconhecidas são descartadas');
  own.send({t:'approve',id:app.id});
  const st=await p.wait(m=>m.t==='state'&&m.you.me);
  assert.equal(st.you.me.vn,v.n);assert.equal(st.G.vagas[v.id],before-1);
  // função de outro setor é negada no servidor, mesmo pulando a checagem do navegador
  const other=v.k==='qa'?'accept':'cert';
  p.send({t:'act',act:other,a:null});
  assert.match((await p.wait(m=>m.t==='deny')).msg,/Função de/);
  // argumento inválido
  p.send({t:'act',act:'shift',a:'999'});
  assert.match((await p.wait(m=>m.t==='deny')).msg,/inválida|Função/);
  // promover e tirar gerência devolve o nome do cargo original
  own.send({t:'role',op:'manager',user:'carla'});
  assert.equal((await p.wait(m=>m.t==='state'&&m.you.me&&m.you.me.mgr)).you.me.vn,'Gerente');
  own.send({t:'role',op:'demote',user:'carla'});
  assert.equal((await p.wait(m=>m.t==='state'&&m.you.me&&!m.you.me.mgr)).you.me.vn,v.n);
  own.close();p.close();});

test('chat ignora vazio e limita flood',async()=>{
  const c=(await auth('register','davi','1234')).c;
  c.send({t:'chat',text:'   '});
  for(let i=0;i<8;i++)c.send({t:'chat',text:'oi '+i});
  assert.match((await c.wait(m=>m.t==='deny')).msg,/muitas mensagens/);
  const s=await c.wait(m=>m.t==='state'&&m.chat.some(x=>x.text==='oi 4'));
  assert.ok(!s.chat.some(x=>x.from==='davi'&&x.text===''));
  c.close();});

test('mensagem gigante é recusada sem derrubar o servidor',async()=>{
  const c=await client();const closed=new Promise(r=>c.ws.on('close',r));
  c.ws.send('x'.repeat(100*1024));await closed;
  assert.equal((await get('/health')).body,'ok');});

test('salva de forma atômica ao encerrar',async()=>{
  await stop();
  const d=JSON.parse(fs.readFileSync(DATA,'utf8'));
  assert.ok(d.users.dono&&d.users.carla);assert.equal(d.users.carla.me.vn,VG.find(x=>x.k==='exp')?.n||VG[0].n);
  assert.ok(!fs.existsSync(DATA+'.tmp'));
  // reinicia lendo o arquivo salvo
  await start();const r=await auth('login','carla','1234');assert.equal(r.a.ok,true);r.c.close();});

test('linhas: abastecedor contratado aparece na linha dele e as velocidades novas funcionam',async()=>{
  const own=(await auth('login','dono',PASS)).c;
  own.send({t:'vaga',id:'abc',d:1});
  const e=(await auth('register','eva','1234')).c;
  e.send({t:'apply',vaga:'abc',cv:{n:'Eva',esc:1,exp:2,sk:['emp','nr12','erp'],t:''}});
  assert.match((await e.wait(m=>m.t==='deny')).msg,/Candidatura enviada/);
  const sa=await own.wait(m=>m.t==='state'&&m.admin&&m.admin.apps.some(a=>a.user==='eva'));
  own.send({t:'approve',id:sa.admin.apps.find(a=>a.user==='eva').id});
  const st=await e.wait(m=>m.t==='state'&&m.you.me&&m.G.ops&&m.G.ops.some(o=>o.n==='eva'));
  assert.equal(st.you.me.k,'abs');assert.equal(st.you.me.p,'truck');
  const op=st.G.ops.find(o=>o.n==='eva');assert.equal(op.k,'abs');assert.equal(op.p,'truck');
  for(const p of ['car','bus','truck']){assert.ok(st.G.lin[p].cap>0,p);assert.ok(st.G.lin[p].ab>=0)}
  // velocidades novas: só o dono muda, e valores fora da lista viram pausa
  for(const s of [0.0167,0.1,1]){own.send({t:'speed',s});assert.equal((await own.wait(m=>m.t==='state'&&m.G.speed===s)).G.speed,s)}
  own.send({t:'speed',s:0.5});assert.equal((await own.wait(m=>m.t==='state'&&m.G.speed===0)).G.speed,0);
  e.send({t:'speed',s:8});await new Promise(r=>setTimeout(r,200));
  own.send({t:'speed',s:0});
  assert.equal((await own.wait(m=>m.t==='state')).G.speed,0);
  // quem opera uma vaga de caminhões não aparece como operador das outras linhas no estado
  assert.ok(!st.G.ops.some(o=>o.n==='eva'&&o.p!=='truck'));
  own.close();e.close();});

test('celular: o servidor responde ping com pong (usado para reconectar ao reabrir o app)',async()=>{
  const c=(await auth('register','mobi','1234')).c;
  c.send({t:'ping'});
  assert.equal((await c.wait(m=>m.t==='pong')).t,'pong');
  c.close();});
