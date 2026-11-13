/* ===== Painel de linhas, relógio suave e botões de velocidade (só no navegador) =====
   A simulação fica em linhas.js, que também roda no servidor. Aqui só se desenha o que ela guarda em G.lin. */
(function(){
const I=FX.ui,H=FX.helmetSvg,hOf=FX.helmetOf;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NOME={car:'Autos',bus:'Ônibus',truck:'Caminhões'};
const SETORES=[['inj','Injeção','hous','carcaças'],['col','Colagem','glued','coladas'],['mon','Montagem','asm','montados'],['qa','Qualidade','qok','aprovados'],['emb','Embalagem','pack','embalados']];
const num=n=>Math.round(n).toLocaleString('pt-BR');
const bar=(v,bad)=>'<div class="bar"><i style="width:'+Math.max(0,Math.min(100,v))+'%;background:'+(bad?'var(--bad)':'var(--accent)')+'"></i></div>';

/* ---------- aba "Linhas" ---------- */
const pane=document.createElement('div');pane.id='pane-lin';pane.className='vs';pane.hidden=true;
document.getElementById('pane-mar').before(pane);
TABS.splice(1,0,['lin','Linhas']);
/* o jogo monta a barra de abas no boot, antes deste arquivo; esvaziar faz o próximo render montar de novo com a aba nova */
document.getElementById('tabs').innerHTML='';

function quem(p,k){
 const ops=(G.ops||[]).filter(o=>LINHAS.serve(o,k,p));
 if(!ops.length)return '<span class="mut">Automático</span>';
 return ops.map(o=>'<span class="lin-op">'+H(hOf({k:o.k,mgr:o.mgr}),18)+esc(o.n)+(o.p?'':' <small class="mut">(todas as linhas)</small>')+'</span>').join('')}

function linha(p){
 const L=G.lin&&G.lin[p];if(!L)return '';
 const abp=L.cap?L.ab/L.cap*100:100,baixo=abp<25;
 const fe=(G.ops||[]).filter(o=>o.k==='abs'&&o.p===p);
 const abast=fe.length?fe.map(o=>H('log',18)+esc(o.n)).join(' '):'<span class="mut">Empilhadeira automática</span>';
 const ab=(G.orders||[]).filter(o=>o.state==='open'&&o.p===p),abQtd=ab.reduce((s,o)=>s+o.qty,0);
 const pronto=G.pack[p]||0;
 const linhas=SETORES.map(([k,n,out,un])=>'<tr><td><b>'+n+'</b></td><td>'+quem(p,k)+'</td><td class="num">'+num(L.day[k])+'</td><td class="num mut">'+num(L.ant[k])+'</td><td class="num">'+num(G[out][p])+' <small class="mut un">'+un+'</small></td></tr>').join('');
 const cred=Object.entries(L.cr).filter(([,c])=>c.t>=1).sort((a,b)=>b[1].d-a[1].d||b[1].t-a[1].t).slice(0,5);
 return '<section class="box lin"><h2>'+I(p,24)+NOME[p]+'<span class="ol-n" title="Pedidos abertos desta linha">'+ab.length+' pedidos</span></h2>'+
  '<div class="lin-ab"><div class="row"><span>Abastecimento da linha</span><b class="num'+(baixo?' low':'')+'">'+Math.round(abp)+'%</b></div>'+bar(abp,baixo)+
  '<div class="lin-who">'+abast+'</div>'+(baixo?'<div class="low">Linha limitada: falta peça na beira da linha. Coloque um abastecedor.</div>':'')+'</div>'+
  '<div class="tw"><table><thead><tr><th>Setor</th><th>Quem opera</th><th>Hoje</th><th>Ontem</th><th>Na saída</th></tr></thead><tbody>'+linhas+'</tbody></table></div>'+
  '<div class="lin-sum"><span>Prontos para despachar <b class="num">'+num(pronto)+'</b></span><span>Pedido aberto <b class="num">'+num(abQtd)+'</b> pç</span><span>Refugo hoje <b class="num'+(L.ref.d>=5?' low':'')+'">'+num(L.ref.d)+'</b></span></div>'+
  '<div class="mut lin-cred">'+(cred.length?'Produção por pessoa hoje: '+cred.map(([n,c])=>esc(n)+' '+num(c.d)).join(' · ')+(L.auto.t>=1?' · Automático '+num(L.auto.d):''):(L.auto.t>=1?'Hoje a linha rodou no automático: '+num(L.auto.d)+' peças.':'Sem produção ainda.'))+'</div></section>'}

function linPane(){
 if(!G.lin)return '<div class="box"><h2>Linhas</h2><div class="mut">A fábrica ainda não rodou. Peça ao dono para dar o play.</div></div>';
 return '<div class="mut lin-intro">Cada linha tem a própria produção. Quem opera um setor produz só para a linha da sua vaga. Setores sem ninguém rodam no automático.</div><div class="lin-grid">'+LINHAS.LN.map(linha).join('')+'</div>'}
{const o=drawY;drawY=function(){o();if(G.tab==='lin'){const h=linPane();if(pane.__h!==h){pane.__h=h;pane.innerHTML=h}}}}

/* ---------- relógio que anda segundo a segundo ----------
   O servidor avança a fábrica em passos. Nas velocidades lentas o relógio ficaria parado entre um passo e outro,
   então ele continua andando aqui e se acerta quando o próximo passo chega. */
let t0=null,at=0;
/* mesma conta do relógio do jogo (clk): cada passo vale 24 minutos de jogo, e o dia começa às 06:00 */
const hhmm=m=>{m=Math.floor(m)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
setInterval(()=>{if(typeof G==='undefined'||!G||!G.speed)return;
 if(G.t!==t0){t0=G.t;at=Date.now()}
 const frac=Math.min(.999,(Date.now()-at)/1000*G.speed);
 const e=document.getElementById('k-clock');if(!e)return;
 const turno=e.textContent.split(' · ')[1];
 e.textContent=hhmm(360+((G.t%DAY)+frac)*24)+(turno?' · '+turno:'')},1000);

/* botões de velocidade extras */
{const r=render;render=function(){r();
 [['spr',.0167],['spc',.1]].forEach(([id,s])=>{const b=document.getElementById(id);if(b)b.setAttribute('aria-pressed',String(G.speed===s))})}}
/* no celular não existe clique */
if(matchMedia('(pointer:coarse)').matches){const h=document.querySelector('.plant h2 small');if(h)h.textContent=h.textContent.replace('clique','toque')}
/* ---------- abastecedores andando no corredor da planta ----------
   O corredor livre entre a fileira de cima e a do meio (y 270 a 290) ganha uma pista por linha.
   Quem está online como abastecedor daquela linha empurra um carrinho com peças para a direita e volta vazio.
   Sem ninguém na vaga, só a empilhadeira automática anda, mais devagar. Linha seca: pista vermelha tracejada. */
const COR={y:272,dy:6,x0:28,x1:1172};
const NL={car:'Autos',bus:'Ônibus',truck:'Caminhões'};
let lt=0,lastT=0,tipLn=-1,tipUntil=0;
const veloc=()=>G.speed>=8?3:G.speed>=3?2:G.speed>0?1:0;
const sem=()=>G.fx&&G.fx.blackout>G.t;
const abs=p=>(G.ops||[]).filter(o=>o.k==='abs'&&o.p===p);

function feeders(t){
 if(!G.lin)return;
 const dt=t-lastT;lastT=t;if(dt>0&&dt<.5&&!sem())lt+=dt*veloc();
 const len=COR.x1-COR.x0;
 LINHAS.LN.forEach((p,i)=>{const L=G.lin[p];if(!L)return;
  const y=COR.y+i*COR.dy,baixo=L.cap&&L.ab/L.cap<.25,fe=abs(p),auto=!fe.length;
  cx.save();cx.strokeStyle=baixo?C.bad:PC[p];cx.globalAlpha=baixo?.95:.5;cx.lineWidth=1;if(baixo)cx.setLineDash([4,3]);
  cx.beginPath();cx.moveTo(COR.x0,y+4.5);cx.lineTo(COR.x1,y+4.5);cx.stroke();cx.restore();
  rect(COR.x0-4,y+1,4,7,PC[p]);rect(COR.x1,y+1,4,7,PC[p]);
  const n=auto?1:fe.length,v=auto?55:120;
  for(let q=0;q<n;q++){
   const c=(lt*v+q*2*len/n+i*210)%(2*len),dir=c<len?1:-1,x=COR.x0+(c<len?c:2*len-c);
   if(auto){ /* empilhadeira: cinza, com giroflex */
    rect(x-7,y+3,14,5,sem()?C.line:C.mute);rect(x+dir*7-(dir<0?3:0),y+1,3,7,C.fg);
    if(dir>0)rect(x-3,y-1,5,4,PC[p]);
    if(!sem()&&Math.sin(t*9)>0)dot(x-dir*4,y+1,1.6,C.accent)}
   else{ /* pessoa empurrando o carrinho */
    rect(x-4,y+3,10,4,PC[p]);dot(x-dir*7,y+1,2.2,'#e9c9a0');rect(x-dir*7-1.5,y+3,3,4,C.info);
    if(dir>0)rect(x-1,y-1,5,4,PC[p],C.line)}}});
 /* dica: ao passar o mouse ou tocar no corredor */
 if(tipLn>=0&&(tipUntil===0||performance.now()<tipUntil)){
  const p=LINHAS.LN[tipLn],L=G.lin[p],fe=abs(p);
  if(L){const pct=Math.round(L.cap?L.ab/L.cap*100:100);
   const s=NL[p]+' · beira da linha '+pct+'% · '+(fe.length?fe.map(o=>o.n).join(', ')+' abastecendo':'empilhadeira automática');
   cx.font='600 11px "IBM Plex Mono",monospace';const w=cx.measureText(s).width+20,x=Math.max(4,Math.min(1196-w,tipX-w/2));
   rect(x,296,w,22,C.fg);txt(s,x+10,311,11,C.bg)}}
 else if(tipUntil>0)tipLn=-1}
function achaPista(e){const[x,y]=cvPos(e),i=Math.floor((y-269)/COR.dy);tipX=x;return y>=268&&y<=292&&i>=0&&i<3?i:-1}
let tipX=600;
CV.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const i=achaPista(e);if(i>=0){tipLn=i;tipUntil=0;CV.style.cursor='help'}else if(tipUntil===0)tipLn=-1});
CV.addEventListener('pointerleave',()=>{if(tipUntil===0)tipLn=-1});
CV.addEventListener('pointerdown',e=>{const i=achaPista(e);if(i>=0){tipLn=i;tipUntil=performance.now()+4000}else tipLn=-1});
{const e0=effects;effects=function(t){e0(t);feeders(t)}}
})();

