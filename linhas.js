/* ===== Linhas separadas, abastecedor de linha e vagas de qualidade =====
   Carregado em dois lugares, com o mesmo código:
   - no servidor, logo depois do game.html (motor sem navegador);
   - no navegador, injetado pelo build.js no fim do script do jogo.
   Não mexe no DOM. O que aparece na tela fica em ui/linhas-ui.js.

   Como funciona:
   - Cada linha (autos, ônibus, caminhões) tem seu próprio registro em G.lin[p]:
     produção por setor (hoje, ontem, total), quem produziu e o nível de abastecimento.
   - Quem está online num setor só dá bônus à SUA linha. Quem não tem linha na vaga
     (injeção, colagem, embalagem) ajuda todas as linhas do seu setor.
   - A produção de cada peça é creditada ao jogador da linha e do setor. Sem jogador,
     o crédito vai para o "Automático".
   - O abastecedor de linha leva peças para a beira da linha. Sem ele, só a empilhadeira
     automática abastece, mais devagar, e a linha pode ficar limitada. */
(function(){
const LN=['car','bus','truck'];
const SET=['inj','col','mon','qa','emb'];
const NOME={car:'autos',bus:'ônibus',truck:'caminhões'};
const NOVAS=[
 {id:'qaa',n:'Inspetor(a) de qualidade · autos',s:'Qualidade · autos',sk:['cep','metro','xl'],esc:2,exp:1,k:'qa',p:'car'},
 {id:'qb',n:'Inspetor(a) de qualidade · ônibus',s:'Qualidade · ônibus',sk:['cep','metro','xl'],esc:2,exp:1,k:'qa',p:'bus'},
 {id:'qc',n:'Inspetor(a) de qualidade · caminhões',s:'Qualidade · caminhões',sk:['cep','metro','xl'],esc:2,exp:1,k:'qa',p:'truck'},
 {id:'qm',n:'Metrologista',s:'Qualidade · metrologia',sk:['metro','cep','cnc'],esc:2,exp:2,k:'qa'},
 {id:'qad',n:'Auditor(a) de qualidade (IATF)',s:'Qualidade · auditoria',sk:['cep','idi','erp'],esc:3,exp:2,k:'qa'},
 {id:'aba',n:'Abastecedor(a) de linha · autos',s:'Abastecimento · autos',sk:['emp','nr12','erp'],esc:0,exp:0,k:'abs',p:'car'},
 {id:'abb',n:'Abastecedor(a) de linha · ônibus',s:'Abastecimento · ônibus',sk:['emp','nr12','erp'],esc:0,exp:0,k:'abs',p:'bus'},
 {id:'abc',n:'Abastecedor(a) de linha · caminhões',s:'Abastecimento · caminhões',sk:['emp','nr12','erp'],esc:0,exp:0,k:'abs',p:'truck'}];
/* vagas que já nascem abertas num jogo novo (as demais o dono abre quando quiser) */
const ABERTAS=['qaa','qb','qc','aba','abb','abc'];
NOVAS.forEach(v=>{if(!VG.some(x=>x.id===v.id))VG.push(v)});
BON.abs='+ abastecimento da linha';
LBL.abs='Abastecimento de linha';
FUN.abs='Abastecer a sua linha com peças e embalagens. Sem abastecedor, só a empilhadeira automática abastece, mais devagar, e a linha pode ficar limitada.';
FUN.qa='Inspeção, auditorias e certificações (IATF). Quem tem linha na vaga inspeciona só as peças dela.';

/* jogo novo: o sorteio de vagas do jogo não conhece as vagas novas, então elas abrem aqui.
   jogo antigo: só abre as que ainda não existem, para não desfazer o que o dono já fechou. */
function abrirVagas(novo){if(!G.vagas)return;NOVAS.forEach(v=>{if(novo||G.vagas[v.id]===undefined)G.vagas[v.id]=ABERTAS.includes(v.id)?1:0})}
const _rhNew=rhNew;
rhNew=function(){_rhNew();abrirVagas(true)};

const zero=()=>({inj:0,col:0,mon:0,qa:0,emb:0});
function novaLinha(p){const cap=RATE[p]*6;return{ab:cap,cap,day:zero(),ant:zero(),tot:zero(),cr:{},auto:{d:0,t:0},ref:{d:0,a:0,t:0},fed:{d:0,t:0},fd:[]}}
function init(){
 if(!G.lin){G.lin={};abrirVagas()}
 LN.forEach(p=>{if(!G.lin[p])G.lin[p]=novaLinha(p)});
 if(!G.lnUse)G.lnUse=z();
 if(!G.ops)G.ops=[]}

/* o operador serve a este setor e a esta linha? */
const serve=(o,k,p)=>o.k===k&&(!o.p||o.p===p);
const donos=(k,p)=>(G.ops||[]).filter(o=>serve(o,k,p));

/* abastecimento baixo trava colagem, montagem e embalagem da linha */
function fator(L){const lo=L.cap*.25;return L.ab>=lo?1:Math.max(.15,L.ab/lo)}

const _stR=stR;
stR=function(k,p){let r=_stR(k,p);
 let b=0;for(const o of donos(k,p))b+=o.b||0;
 if(b>0)r*=1+Math.min(.45,b);
 if(G.lin&&G.lin[p]&&(k==='col'||k==='mon'||k==='emb'))r*=fator(G.lin[p]);
 return r};

function credita(k,antes,saida,refugo){
 let tot=0;LN.forEach(p=>{tot+=Math.max(0,G[saida][p]-antes[p])});
 LN.forEach(p=>{const d=G[saida][p]-antes[p];if(d<=0)return;const L=G.lin[p];
  L.day[k]+=d;L.tot[k]+=d;if(k==='col'||k==='mon'||k==='emb')G.lnUse[p]+=d;
  const ds=donos(k,p);
  if(ds.length){const parte=d/ds.length;ds.forEach(o=>{const c=L.cr[o.n]||(L.cr[o.n]={k:o.k,d:0,t:0});c.k=o.k;c.d+=parte;c.t+=parte})}
  else{L.auto.d+=d;L.auto.t+=d}
  if(refugo>0&&tot>0){const r=refugo*d/tot;L.ref.d+=r;L.ref.t+=r}})}
const snap=o=>({car:G[o].car,bus:G[o].bus,truck:G[o].truck});

const _stage=stage;
stage=function(k){if(!G.lin)return _stage(k);
 const d=SEC[k],a=snap(d.out),s0=G.scrap+G.esc;_stage(k);
 credita(k,a,d.out,k==='qa'?G.scrap+G.esc-s0:0)};
const _inject=inject;
inject=function(){if(!G.lin)return _inject();
 const a=snap('hous');_inject();credita('inj',a,'hous',0)};

/* o abastecedor repõe a beira da linha; sem ele, a empilhadeira automática */
function abastece(){
 const apagao=G.fx&&G.fx.blackout>G.t;
 LN.forEach(p=>{const L=G.lin[p],fe=donos('abs',p);
  L.ab=Math.max(0,L.ab-G.lnUse[p]/3);G.lnUse[p]=0;
  let rep=0;
  if(!apagao){
   if(fe.length){let b=0;fe.forEach(o=>b+=o.b||0);rep=RATE[p]*2*(1+Math.min(.6,b))}
   else rep=RATE[p]*.8*(1+.08*(G.fork||0))}
  const add=Math.min(L.cap-L.ab,rep);L.ab+=add;
  L.fd=fe.map(o=>o.n);
  if(fe.length&&add>0){const parte=add/fe.length;fe.forEach(o=>{const c=L.cr[o.n]||(L.cr[o.n]={k:o.k,d:0,t:0});c.k=o.k;c.d+=parte;c.t+=parte});L.fed.d+=add;L.fed.t+=add}})}
function viraDia(){
 LN.forEach(p=>{const L=G.lin[p];L.ant=L.day;L.day=zero();L.ref.a=L.ref.d;L.ref.d=0;L.fed.d=0;L.auto.d=0;
  for(const n in L.cr)L.cr[n].d=0})}

const _tick=tick;
tick=function(){init();_tick();abastece();if(G.t%DAY===0)viraDia()};

globalThis.LINHAS={LN,SET,NOME,NOVAS,serve,fator,init};
})();
