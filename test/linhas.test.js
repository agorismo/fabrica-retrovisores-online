// Testes da simulação por linha: rodam o motor do jogo sem navegador e sem rede.
const {test}=require('node:test');
const assert=require('node:assert');
const fs=require('fs'),path=require('path');
const {create,run}=require('../engine');
const ROOT=path.join(__dirname,'..');

/* sobe o jogo como o servidor faz: game.html + linhas.js + fábrica nova */
function boot(){
  const ctx=create(fs.readFileSync(path.join(ROOT,'game.html'),'utf8'));
  const R=c=>run(ctx,c);
  R(fs.readFileSync(path.join(ROOT,'linhas.js'),'utf8'));
  R("render=function(){};G=fresh();G.speed=0;rhNew();G.staff={exp:false,rec:false};G.me=null;campBegin();");
  return R;
}
const J=s=>JSON.stringify(s);
/* matéria-prima de sobra e peças na entrada de cada setor, para a linha nunca faltar insumo */
const ABASTECE="Object.keys(G.raw).forEach(k=>G.raw[k]=9000);KEYS.forEach(p=>{G.hous[p]=Math.max(G.hous[p],400);G.glued[p]=Math.max(G.glued[p],400);G.asm[p]=Math.max(G.asm[p],400);G.qok[p]=Math.max(G.qok[p],400)});";

test('vagas de qualidade e de abastecedor existem e abrem num jogo novo',()=>{
  const R=boot();
  const ids=JSON.parse(R('JSON.stringify(VG.map(v=>v.id))'));
  for(const id of ['qaa','qb','qc','qm','qad','aba','abb','abc'])assert.ok(ids.includes(id),id);
  const q=JSON.parse(R('JSON.stringify(VG.filter(v=>v.k==="qa"))'));
  assert.ok(q.length>=6,'qualidade tem várias vagas');
  assert.deepEqual(q.filter(v=>v.p).map(v=>v.p).sort(),['bus','car','truck']);
  const ab=JSON.parse(R('JSON.stringify(VG.filter(v=>v.k==="abs").map(v=>v.p))')).sort();
  assert.deepEqual(ab,['bus','car','truck']);
  const open=JSON.parse(R('JSON.stringify(G.vagas)'));
  for(const id of ['qaa','qb','qc','aba','abb','abc'])assert.ok(open[id]>=1,id+' aberta');
  /* e todas as vagas continuam passando pela nota do currículo */
  assert.ok(R('rhScore(VG.find(v=>v.id==="abc"),{n:"x",esc:1,exp:0,sk:["emp","nr12","erp"],t:""}).sc')>=50);});

test('o bônus de quem opera vale só para a linha dele',()=>{
  const R=boot();
  R('G.lin={};G.ops=[]');R('tick()');
  const base=JSON.parse(R('JSON.stringify({c:stR("mon","car"),t:stR("mon","truck"),b:stR("mon","bus")})'));
  R('G.ops=[{n:"ana",k:"mon",p:"truck",b:.1,lvl:0}]');
  const com=JSON.parse(R('JSON.stringify({c:stR("mon","car"),t:stR("mon","truck"),b:stR("mon","bus")})'));
  assert.ok(com.t>base.t*1.09,'caminhões sobem');
  assert.equal(com.c,base.c);assert.equal(com.b,base.b);
  /* quem não tem linha na vaga (colagem) ajuda todas as linhas do setor */
  R('G.ops=[{n:"leo",k:"col",p:null,b:.1,lvl:0}]');
  const col=JSON.parse(R('JSON.stringify({c:stR("col","car"),t:stR("col","truck")})'));
  R('G.ops=[]');
  const col0=JSON.parse(R('JSON.stringify({c:stR("col","car"),t:stR("col","truck")})'));
  assert.ok(col.c>col0.c&&col.t>col0.t);
  /* outro setor não é afetado */
  R('G.ops=[{n:"ana",k:"mon",p:"truck",b:.1,lvl:0}]');
  assert.equal(R('stR("emb","truck")'),R('(G.ops=[],stR("emb","truck"))'));});

test('a produção é creditada à pessoa da linha e do setor, e ao automático quando não há ninguém',()=>{
  const R=boot();
  R('G.lin={};G.ops=[{n:"ana",k:"mon",p:"truck",b:.05,lvl:0}]');R(ABASTECE);
  for(let i=0;i<12;i++){R(ABASTECE);R('tick()')}
  const L=JSON.parse(R('JSON.stringify(G.lin)'));
  assert.ok(L.truck.cr.ana&&L.truck.cr.ana.t>0,'ana produziu na linha de caminhões');
  assert.ok(L.truck.cr.ana.t<=L.truck.tot.mon+1e-6,'ana só recebe crédito da montagem');
  assert.equal(L.car.cr.ana,undefined);assert.equal(L.bus.cr.ana,undefined);
  assert.ok(L.car.tot.mon>0&&L.car.auto.t>0,'autos rodaram no automático');
  assert.ok(Math.abs(L.car.auto.t-(L.car.tot.inj+L.car.tot.col+L.car.tot.mon+L.car.tot.qa+L.car.tot.emb))<1e-6,'sem operador, tudo é automático');
  /* o que sobe de dia vira "ontem" */
  R('G.t=DAY-1');R(ABASTECE);R('tick()');
  const L2=JSON.parse(R('JSON.stringify(G.lin)'));
  assert.equal(L2.car.day.mon,0);assert.ok(L2.car.ant.mon>0);});

test('abastecedor de linha: sem ele a linha trava, com ele ela anda',()=>{
  const R=boot();
  R('G.lin={};G.ops=[]');R('tick()');
  const cap=R('G.lin.truck.cap');
  /* a beira da linha esvazia: a produção cai */
  R('G.lin.truck.ab=0');
  const livre=R('(G.lin.truck.ab=G.lin.truck.cap,stR("mon","truck"))'),seca=R('(G.lin.truck.ab=0,stR("mon","truck"))');
  assert.ok(seca<livre*.2,'linha seca anda muito devagar');
  /* injeção não depende do abastecimento da beira da linha */
  assert.equal(R('(G.lin.truck.ab=0,stR("inj","truck"))'),R('(G.lin.truck.ab=G.lin.truck.cap,stR("inj","truck"))'));
  /* sem abastecedor só a empilhadeira repõe; com abastecedor repõe bem mais */
  const gasta=`G.lin.truck.ab=${cap/2};G.lnUse.truck=0;`;
  R(gasta);R('G.ops=[];tick()');const auto=R('G.lin.truck.ab')-cap/2;
  R(gasta);R('G.ops=[{n:"davi",k:"abs",p:"truck",b:.05,lvl:0}];tick()');const humano=R('G.lin.truck.ab')-cap/2;
  assert.ok(humano>auto*2,'abastecedor repõe mais que a empilhadeira ('+humano+' x '+auto+')');
  assert.deepEqual(JSON.parse(R('JSON.stringify(G.lin.truck.fd)')),['davi']);
  /* o abastecedor de uma linha não ajuda as outras */
  R('G.lin.bus.ab=0;G.lin.car.ab=0;G.lnUse.bus=0;G.lnUse.car=0;G.ops=[{n:"davi",k:"abs",p:"truck",b:.05,lvl:0}];tick()');
  assert.ok(R('G.lin.bus.ab')<R('RATE.bus')*.9,'ônibus só tem a empilhadeira');
  /* sem energia ninguém abastece */
  R('G.fx.blackout=G.t+99;G.lin.car.ab=0;G.ops=[]');R('tick()');
  assert.equal(R('G.lin.car.ab'),0);});

test('o estado das linhas sobrevive ao salvar e carregar',()=>{
  const R=boot();
  R('G.lin={};G.ops=[{n:"ana",k:"mon",p:"truck",b:.05,lvl:0}]');R(ABASTECE);
  for(let i=0;i<5;i++){R(ABASTECE);R('tick()')}
  const antes=R('JSON.stringify(G.lin)');
  R('G=JSON.parse(JSON.stringify(G))');
  assert.equal(R('JSON.stringify(G.lin)'),antes);
  R(ABASTECE);R('tick()');assert.ok(R('G.lin.truck.tot.mon')>0);});

test('um jogo antigo, sem linhas, é atualizado e abre as vagas novas',()=>{
  const R=boot();
  R('delete G.lin;delete G.lnUse;G.vagas={inj:1,mc:1}');R('tick()');
  assert.ok(R('!!G.lin&&!!G.lin.car&&!!G.lin.bus&&!!G.lin.truck'));
  assert.equal(R('G.vagas.abc'),1);assert.equal(R('G.vagas.qc'),1);assert.equal(R('G.vagas.qm'),0);});
