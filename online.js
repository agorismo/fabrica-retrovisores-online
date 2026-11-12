/* ===== MODO ONLINE ===== */
(function(){
let ws=null,YOU=null,TOK=null,ADM=null,ONL=[],CHAT=[],ready=false,authed=false;
const el=(h)=>{const d=document.createElement('div');d.innerHTML=h;return d.firstElementChild};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I=FX.ui,H=FX.helmetSvg,hOf=FX.helmetOf,ini=FX.initials;
/* troca o HTML só quando muda: evita piscar e não perde a rolagem nem o foco */
const put=(e,h)=>{if(e&&e.__h!==h){e.__h=h;e.innerHTML=h}};
const hhmm=t=>{if(!t)return '';const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const st=document.createElement('style');st.textContent='[hidden]{display:none!important}';document.head.appendChild(st);

/* ---------- tela de entrada: crachá de acesso ---------- */
const ART='<svg class="ol-art" viewBox="0 0 480 312" role="img" aria-label="Retrovisor refletindo a fábrica e a estrada">'+
 '<defs><clipPath id="olG"><path d="M68 116q0-22 22-25l284-29q38-4 38 34v118q0 38-38 34L90 214q-22-3-22-25z"/></clipPath></defs>'+
 '<path d="M108 232 86 290" stroke="var(--accent)" stroke-width="26" stroke-linecap="round"/><rect x="34" y="282" width="112" height="24" rx="5" fill="var(--accent)"/>'+
 '<path d="M40 110q0-36 36-40l304-36q60-6 60 54v130q0 60-60 54L76 238q-36-4-36-40z" fill="var(--accent)"/>'+
 '<g clip-path="url(#olG)"><rect x="60" y="40" width="380" height="200" fill="#33424f"/>'+
 '<path d="M106 152V128l36-18v18l36-18v18l36-18v18l36-18v18l36-18v42z" fill="#f6f7f8"/><path d="M298 152V72h15v80M318 152v-28h44v28z" fill="#f6f7f8"/>'+
 '<circle class="smk" cx="306" cy="60" r="9" fill="#f6f7f8" opacity=".35"/><circle class="smk s2" cx="314" cy="44" r="12" fill="#f6f7f8" opacity=".25"/>'+
 '<rect x="60" y="152" width="380" height="90" fill="#1e2730"/><path d="M222 152h16l150 90H72z" fill="#2c3843"/>'+
 '<path class="lane" d="M230 154v88" stroke="var(--accent)" stroke-width="6" stroke-dasharray="14 14"/>'+
 '<path d="M86 150 170 66M96 196 214 78" stroke="#fff" stroke-opacity=".14" stroke-width="10" stroke-linecap="round"/></g></svg>';
const login=el('<div id="olL"><div class="ol-wrap">'+
 '<section class="ol-hero">'+ART+'<h1 class="ol-t">Fábrica de Retrovisores</h1><p class="ol-sub">Uma fábrica só, tocada pela equipe inteira ao mesmo tempo.</p>'+
 '<ol class="ol-steps"><li><span><b>Crie sua conta</b> e mande o currículo para uma vaga aberta.</span></li><li><span><b>O dono aprova</b> a contratação e você ganha o capacete do seu setor.</span></li><li><span><b>Cuide do seu setor.</b> O que ninguém assume roda no automático.</span></li></ol></section>'+
 '<div class="ol-badge" role="form" aria-labelledby="olBT"><div class="ol-clip" aria-hidden="true"></div>'+
 '<div class="ol-bt" id="olBT">Acesso à fábrica</div>'+
 '<div class="ol-id"><span id="olAv">'+H('vis',64)+'</span><div><b id="olNm">Seu nome</b><span>Visitante</span></div></div>'+
 '<label for="olN">Nome</label><input id="olN" maxlength="20" autocomplete="username" autocapitalize="words" spellcheck="false">'+
 '<label for="olP">PIN</label><input id="olP" type="password" autocomplete="current-password" aria-describedby="olPh"><small id="olPh">4 ou mais caracteres. Quem já tem conta usa o mesmo PIN.</small>'+
 '<div class="ol-btns"><button class="btn pri" data-act="olin" data-a="login">Entrar</button><button class="btn" data-act="olin" data-a="register">Criar conta</button></div>'+
 '<p id="olE" role="alert"></p><div class="ol-code" aria-hidden="true"></div></div></div></div>');
document.body.appendChild(login);
[$('olN'),$('olP')].forEach(i=>i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')A('olin','login')}));
$('olN').addEventListener('input',e=>{const n=e.target.value.trim();$('olNm').textContent=n||'Seu nome';put($('olAv'),H('vis',64,ini(n)))});

/* ---------- equipe e chat ---------- */
const LEG=Object.entries(FX.HELMET).map(([k,[c,t]])=>'<li>'+H(k,22)+t+'</li>').join('');
const box=el('<div class="box" id="olB"><h2>'+I('users',20)+'Equipe online <span class="ol-n" id="olWN"></span></h2><div id="olW" class="ol-team"></div>'+
 '<details class="ol-leg"><summary>Cores dos capacetes</summary><ul>'+LEG+'</ul></details>'+
 '<h2>'+I('chat',20)+'Chat da empresa</h2><div id="olC" class="ol-chat" role="log" aria-live="polite"></div>'+
 '<div class="ol-send"><input id="olI" placeholder="Escreva para a equipe" maxlength="200" aria-label="Mensagem para a equipe"><button class="btn pri" data-act="olsend" aria-label="Enviar mensagem">Enviar</button></div></div>');
document.querySelector('aside').appendChild(box);
let stick=true;$('olC').addEventListener('scroll',e=>{const c=e.target;if(c.clientHeight)stick=c.scrollHeight-c.scrollTop-c.clientHeight<40},{passive:true});
const sendChat=()=>{const i=$('olI');if(i.value.trim()){S({t:'chat',text:i.value});i.value='';stick=true}};
$('olI').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&!e.isComposing)sendChat()});
function S(o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))}

/* aviso de reconexão: quem já estava jogando continua vendo a fábrica em vez de voltar à tela de login */
const bar=el('<div id="olR" role="status" aria-live="polite" hidden></div>');
document.body.appendChild(bar);
let tries=0;
function connect(){ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
 ws.onopen=()=>{tries=0;let t=null;try{t=JSON.parse(localStorage.getItem('fabrica-online'))}catch(e){}if(t&&t.token)S({t:'token',name:t.name,token:t.token});else{bar.hidden=true;login.hidden=false}};
 ws.onclose=()=>{const wait=Math.min(30000,1000*2**tries++)+Math.floor(Math.random()*500);
  const msg='Conexão perdida. Tentando de novo em '+Math.round(wait/1000)+' s.';
  if(authed||ready){bar.innerHTML=I('wifi',16)+'<span>'+msg+'</span>';bar.hidden=false}else $('olE').textContent=msg;
  authed=false;setTimeout(connect,wait)};
 ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}
  if(m.t==='auth'){if(!m.ok){$('olE').textContent=m.err||'Não deu para entrar. Tente de novo.';if(m.expired){try{localStorage.removeItem('fabrica-online')}catch(e){}bar.hidden=true;login.hidden=false}return}
   authed=true;TOK={name:m.name,token:m.token};try{localStorage.setItem('fabrica-online',JSON.stringify(TOK))}catch(e){}login.hidden=true;bar.hidden=true;$('olE').textContent=''}
  else if(m.t==='deny'){showToast(m.msg);sfx('bad')}
  else if(m.t==='state'){const tab=G.tab||'fab';G=m.G;G.tab=tab;YOU=m.you;ADM=m.admin||null;ONL=m.online;CHAT=m.chat;G.me=YOU.me;apply()}}}
function apply(){const md=$('modal');
 if(!ready){ready=true;md.hidden=true}
 if(YOU.role!=='owner'&&!YOU.me&&!YOU.pending&&md.hidden&&!window.__admOpen){RH.step=RH.step==='res'||RH.step==='vagas'?RH.step:'inicio';if(!RH.cv||RH.step==='inicio')RH.step='inicio';rhShow()}
 if(YOU.me&&!md.hidden&&/Processo seletivo|Vagas abertas|Seu currículo|Aprovado|Pré-aprovado|Não foi desta vez|Enviar currículo/.test(md.textContent)&&!window.__admOpen)md.hidden=true;
 render();ui()}
const cargo=u=>u.role==='owner'?'Dono da empresa':u.vn||'Sem cargo';
function ui(){
 const byName={};ONL.forEach(u=>byName[u.name]=u);
 put($('olWN'),String(ONL.length));
 put($('olW'),ONL.map(u=>'<div class="ol-r'+(u.name===YOU.name?' me':'')+'" title="'+esc((FX.HELMET[hOf(u)]||[])[1]||'')+'">'+H(hOf(u),30)+'<div><b>'+esc(u.name)+(u.name===YOU.name?' <small>(você)</small>':'')+'</b><span>'+esc(cargo(u))+'</span></div>'+'</div>').join('')||'<div class="mut">Ninguém online.</div>');
 /* chat: só rola para o fim se a pessoa já estava lá embaixo */
 const c=$('olC');
 put(c,CHAT.map(m=>{const t='<time>'+hhmm(m.at)+'</time>';
  if(m.from==='DONO')return '<div class="c-ann">'+I('megaphone',16)+'<div><b>Aviso do dono</b> '+t+'<p>'+esc(m.text)+'</p></div></div>';
  if(m.sys)return '<div class="c-sys">'+esc(m.text)+' '+t+'</div>';
  const u=byName[m.from];return '<div class="c-msg'+(m.from===YOU.name?' me':'')+'">'+H(u?hOf(u):'vis',24)+'<div><b>'+esc(m.from)+'</b> '+t+'<p>'+esc(m.text)+'</p></div></div>'}).join('')||'<div class="mut">Nenhuma mensagem ainda.</div>');
 if(stick)c.scrollTop=1e6;
 let b=$('admB');if(YOU.role==='owner'){if(!b){b=document.createElement('button');b.id='admB';b.setAttribute('data-act','adm');document.querySelector('header .ctl').appendChild(b)}
  const n=ADM?ADM.apps.length:0;put(b,I('key',18)+'<span class="lb">Painel do dono</span>'+(n?'<span class="n" aria-label="'+n+' candidaturas">'+n+'</span>':''));b.setAttribute('aria-label','Painel do dono'+(n?', '+n+' candidaturas':''));b.title='Painel do dono'}
 if(window.__admOpen&&YOU.role==='owner')admRender();
 const w=$('funcs');if(w&&YOU.role==='owner'){w.hidden=false;put(w,'<h2>Dono da empresa</h2><div class="mut">Você controla velocidade, vagas, contratações, avisos e reinício pelo Painel do dono. Pode usar todas as funções da fábrica.</div>')}
 else if(w&&!YOU.me){w.hidden=false;put(w,'<h2>'+(YOU.pending?'Candidatura em análise':'Sem cargo')+'</h2><div class="mut">'+(YOU.pending?'O dono ainda vai avaliar o seu currículo. Enquanto isso, acompanhe a fábrica.':'Mande um currículo para uma vaga aberta.')+'</div>'+(YOU.pending?'':'<button class="btn pri sm" data-act="rh" data-a="inicio">Ver vagas abertas</button>'))}}
const LOCAL=['tab','snd','mus','help','close','dismiss','rh','olin','adm','ol','vol','mv'];
{const A0=A;A=function(act,a){
 if(act==='olin'){S({t:a,name:$('olN').value,pin:$('olP').value});return}
 if(act==='olsend')return sendChat();
 if(act==='adm'){window.__admOpen=true;return admRender()}
 if(act==='ol')return olAct(a);
 if(act==='close'&&window.__admOpen){window.__admOpen=false;$('modal').hidden=true;$('modal').__adm=0;const b=$('admB');if(b)b.focus();return}
 if(LOCAL.includes(act))return A0(act,a);
 if(act==='speed'){if(YOU&&YOU.role==='owner')S({t:'speed',s:+a});else showToast('Só o dono controla a velocidade.');return}
 if(YOU&&YOU.role!=='owner'&&!YOU.me){showToast('Você ainda não foi contratado(a).');return}
 if(!canDo(act,a)){showToast(denyMsg(act,a));sfx('bad');return}
 S({t:'act',act,a});sfx('click')}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.__admOpen)A('close')});
setSpeed=function(s){if(YOU&&YOU.role==='owner')S({t:'speed',s})};pause=function(){if(YOU&&YOU.role==='owner')S({t:'speed',s:0})};
{const ra=rhAct;rhAct=async function(a){if(a==='assinar'){S({t:'apply',cv:RH.cv,vaga:RH.res.v.id});$('modal').hidden=true;RH.step='inicio';return}return ra(a)}}
{const mu=meUpd;meUpd=function(){const m=G.me;if(m){const d=G.day;G.day=m.lvl*8+1;try{mu()}finally{G.day=d}}else mu();
 const a=$('me-a');if(a&&m){const h=H(m.mgr?'gestao':hOf(m),40,ini(m.n));if(a.__h!==h||!a.querySelector('.hm')){a.__h=h;a.innerHTML=h}}}}

/* ---------- painel do dono ----------
   O esqueleto é montado uma vez; a cada atualização só as partes que mudaram são trocadas,
   então o texto do aviso que o dono está digitando não se perde. */
const VIC={inj:'inj',col:'glue',mon:'gear',qa:'qa',emb:'box',exp:'stack',rec:'rec',fer:'fer',man:'wrench',sc:'boxes',abs:'stack'};
function admRender(){const m=$('modal');m.hidden=false;const A_=ADM||{apps:[],users:[]};
 if(!m.__adm||!m.querySelector('.adm')){m.__adm=1;
  m.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="admH" class="adm"><div class="adm-hd"><h2 id="admH">'+I('key',26)+'Painel do dono</h2>'+
  '<div class="seg" role="group" aria-label="Velocidade" id="admSp"></div><button class="adm-x" data-act="close" aria-label="Fechar painel">'+I('close',18)+'</button></div>'+
  '<div class="adm-grid"><section><h3>'+I('brief',18)+'Candidaturas <span class="ol-n" id="admNA"></span></h3><div id="admApps" class="adm-apps"></div>'+
  '<h3>'+I('helmet',18)+'Equipe</h3><div id="admUsers" class="adm-people"></div></section>'+
  '<section><h3>'+I('factory',18)+'Vagas abertas</h3><p class="mut">Cada vaga aberta permite contratar uma pessoa.</p><div id="admVagas" class="adm-vagas"></div>'+
  '<h3>'+I('megaphone',18)+'Aviso para todos</h3><div class="adm-ann"><input id="admT" maxlength="200" placeholder="Ex.: reunião às 14h no refeitório" aria-label="Texto do aviso"><button class="btn pri" data-act="ol" data-a="announce">Enviar aviso</button></div>'+
  '<div class="adm-risk"><div><b>Reiniciar empresa</b><span class="mut">Apaga a fábrica, as contratações e os cargos. As contas continuam.</span></div><button class="btn bad" data-act="ol" data-a="reset">'+I('reset',16)+'Reiniciar</button></div></section></div></div>';
  $('admT').addEventListener('keydown',e=>{if(e.key==='Escape')return;e.stopPropagation();if(e.key==='Enter')olAct('announce')});
  setTimeout(()=>{const x=m.querySelector('.adm-x');if(x)x.focus()},0)}
 put($('admSp'),[[0,'pause','Pausar'],[.0167,'play','Real'],[.1,'play','Calmo'],[1,'play','1x'],[3,'ff','3x'],[8,'fff','8x']].map(([s,k,t])=>'<button class="btn sm" aria-pressed="'+(G.speed===s)+'" data-act="ol" data-a="speed:'+s+'">'+I(k,14)+t+'</button>').join(''));
 put($('admNA'),String(A_.apps.length));
 put($('admApps'),A_.apps.length?A_.apps.map(a=>{const lv=a.sc>=75?'hi':a.sc>=60?'mid':'lo';
  return '<article class="app"><div class="app-hd">'+H('vis',38,ini(a.cv.n))+'<div><b>'+esc(a.cv.n)+'</b><span>'+esc(a.user)+' quer a vaga de '+esc(a.vn)+'</span></div><div class="score '+lv+'" aria-label="Nota '+a.sc+' de 100"><b class="num">'+a.sc+'</b><small>/100</small></div></div>'+
  '<div class="meter '+lv+'"><i style="width:'+a.sc+'%"></i></div>'+
  '<div class="mut">'+esc(ESC[a.cv.esc]||'')+', '+a.cv.exp+(a.cv.exp===1?' ano':' anos')+' de experiência</div>'+
  (a.cv.sk.length?'<div class="tags">'+a.cv.sk.map(s=>'<span>'+esc(SKN[s]||s)+'</span>').join('')+'</div>':'')+
  (a.cv.t?'<p class="app-cv">'+esc(a.cv.t.slice(0,240))+(a.cv.t.length>240?'…':'')+'</p>':'')+
  '<div class="app-act"><button class="btn sm" data-act="ol" data-a="reject:'+a.id+'">Recusar</button><button class="btn sm pri" data-act="ol" data-a="approve:'+a.id+'">Contratar</button></div></article>'}).join('')
  :'<div class="adm-empty">Nenhuma candidatura agora. Abra vagas ao lado para receber currículos.</div>');
 const ppl=A_.users.filter(u=>u.role!=='owner').sort((x,y)=>(y.on-x.on)||x.name.localeCompare(y.name));
 put($('admUsers'),ppl.length?ppl.map(u=>{const me=u.me,kind=me?(me.mgr?'gestao':hOf({k:me.k})):'vis';const n=esc(u.name);
  return '<div class="person">'+H(kind,32)+'<div class="p-tx"><b>'+n+'<i class="dot'+(u.on?' on':'')+'" title="'+(u.on?'online':'offline')+'"></i><span class="sr">'+(u.on?'online':'offline')+'</span></b><span>'+(me?esc(me.mgr?'Gerente de '+me.s:me.vn+' ('+(LAD[me.lvl]||'')+')'):'Sem cargo')+'</span></div>'+
  (me?'<div class="p-act">'+(me.mgr?'<button class="btn sm" data-act="ol" data-a="demote:'+n+'">Tirar gerência</button>':'<button class="btn sm" data-act="ol" data-a="manager:'+n+'">Promover a gerente</button>')+'<button class="btn sm" data-act="ol" data-a="fire:'+n+'">Desligar</button></div>':'')+'</div>'}).join('')
  :'<div class="adm-empty">Ninguém se cadastrou ainda. Mande o link do jogo para a equipe.</div>');
 put($('admVagas'),VG.map(v=>{const n=(G.vagas&&G.vagas[v.id])||0;
  return '<div class="vaga'+(n?' open':'')+'">'+I(VIC[v.k]||'brief',20)+'<span>'+esc(v.n)+'</span><div class="step"><button class="btn sm" data-act="ol" data-a="vaga:'+v.id+':-1" aria-label="Fechar uma vaga de '+esc(v.n)+'"'+(n?'':' disabled')+'>−</button><b class="num" aria-live="polite">'+n+'</b><button class="btn sm" data-act="ol" data-a="vaga:'+v.id+':1" aria-label="Abrir uma vaga de '+esc(v.n)+'"'+(n>=9?' disabled':'')+'>+</button></div></div>'}).join(''))}
function olAct(a){const[k,x,y]=a.split(':');
 if(k==='speed')S({t:'speed',s:+x});else if(k==='approve'||k==='reject')S({t:k,id:+x});else if(k==='manager'||k==='demote'||k==='fire')S({t:'role',op:k,user:x});
 else if(k==='vaga')S({t:'vaga',id:x,d:+y});else if(k==='announce'){const t=$('admT').value.trim();if(t){S({t:'announce',text:t});$('admT').value='';showToast('Aviso enviado.')}}
 else if(k==='reset'){if(prompt('Isto apaga a fábrica, as contratações e os cargos. Digite REINICIAR para confirmar.')==='REINICIAR')S({t:'reset',confirm:'REINICIAR'})}}
connect();
})();
