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
})();
