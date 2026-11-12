/* ===== MODO ONLINE ===== */
(function(){
let ws=null,YOU=null,ST=null,TOK=null,ADM=null,ONL=[],CHAT=[],ready=false,authed=false;
const el=(h)=>{const d=document.createElement('div');d.innerHTML=h;return d.firstElementChild};
const st=document.createElement('style');st.textContent='[hidden]{display:none!important}#olL{position:fixed;inset:0;z-index:60;background:var(--bg);display:grid;place-items:center;padding:16px}#olL .card{background:var(--panel);border:2px solid var(--accent);padding:20px;max-width:420px;width:100%}#olL input{width:100%;margin:4px 0 10px;padding:8px;font:inherit;border:1px solid var(--line);background:var(--panel2);color:var(--fg)}#olL h2{margin:0 0 6px}#olB .ol-r{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid var(--line);font-size:13px}#olC{max-height:150px;overflow:auto;font-size:13px}#olC div{padding:2px 0}#olC .sys{color:var(--mute)}#olC .dono{color:var(--accent);font-weight:700}#olI{width:100%;padding:6px;font:inherit;border:1px solid var(--line);background:var(--panel2);color:var(--fg)}#admB{margin-left:6px}';document.head.appendChild(st);
const login=el('<div id="olL"><div class="card"><h2>Fábrica de Retrovisores · Online</h2><p class="mut">Entre com seu nome e um PIN, ou crie sua conta. O dono da empresa aprova as contratações.</p><label>Nome<input id="olN" maxlength="20" autocomplete="username"></label><label>PIN (4 ou mais caracteres)<input id="olP" type="password" autocomplete="current-password"></label><div class="chips"><button class="btn pri" data-act="olin" data-a="login">Entrar</button><button class="btn" data-act="olin" data-a="register">Criar conta</button></div><p id="olE" class="bad" role="alert"></p></div></div>');
document.body.appendChild(login);
[$('olN'),$('olP')].forEach(i=>i.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')A('olin','login')}));
const box=el('<div class="box" id="olB"><h2>Equipe online</h2><div id="olW"></div><h2 style="margin-top:10px">Chat da empresa</h2><div id="olC"></div><input id="olI" placeholder="Mensagem e Enter" maxlength="200" aria-label="Chat"></div>');
document.querySelector('aside').appendChild(box);
$('olI').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&e.target.value.trim()){S({t:'chat',text:e.target.value});e.target.value=''}});
function S(o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))}
/* aviso de reconexão: quem já estava jogando continua vendo a fábrica em vez de voltar à tela de login */
const bar=el('<div id="olR" role="status" aria-live="polite" hidden style="position:fixed;left:0;right:0;top:0;z-index:70;background:var(--accent);color:#111;text-align:center;font-weight:700;padding:4px 12px;font-size:13px"></div>');
document.body.appendChild(bar);
let tries=0;
function connect(){ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
 ws.onopen=()=>{tries=0;let t=null;try{t=JSON.parse(localStorage.getItem('fabrica-online'))}catch(e){}if(t&&t.token)S({t:'token',name:t.name,token:t.token});else{bar.hidden=true;login.hidden=false}};
 ws.onclose=()=>{const wait=Math.min(30000,1000*2**tries++)+Math.floor(Math.random()*500);
  const msg='Conexão perdida. Tentando reconectar em '+Math.round(wait/1000)+' s...';
  if(authed||ready){bar.textContent=msg;bar.hidden=false}else $('olE').textContent=msg;
  authed=false;setTimeout(connect,wait)};
 ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}
  if(m.t==='auth'){if(!m.ok){$('olE').textContent=m.err||'Erro';if(m.expired){try{localStorage.removeItem('fabrica-online')}catch(e){}bar.hidden=true;login.hidden=false}return}
   authed=true;TOK={name:m.name,token:m.token};try{localStorage.setItem('fabrica-online',JSON.stringify(TOK))}catch(e){}login.hidden=true;bar.hidden=true;$('olE').textContent=''}
  else if(m.t==='deny'){showToast(m.msg);sfx('bad')}
  else if(m.t==='state'){const tab=G.tab||'fab';G=m.G;G.tab=tab;YOU=m.you;ADM=m.admin||null;ONL=m.online;CHAT=m.chat;G.me=YOU.me;apply()}}}
function apply(){const md=$('modal');
 if(!ready){ready=true;md.hidden=true}
 if(YOU.role!=='owner'&&!YOU.me&&!YOU.pending&&md.hidden&&!window.__admOpen){RH.step=RH.step==='res'||RH.step==='vagas'?RH.step:'inicio';if(!RH.cv||RH.step==='inicio')RH.step='inicio';rhShow()}
 if(YOU.me&&!md.hidden&&/Processo seletivo|Vagas abertas|Seu currículo|Aprovado|Pré-aprovado|Não foi desta vez|Enviar currículo/.test(md.textContent)&&!window.__admOpen)md.hidden=true;
 render();ui()}
function ui(){$('olW').innerHTML=ONL.map(u=>'<div class="ol-r"><b>'+esc(u.name)+(u.role==='owner'?' · DONO':'')+'</b><span class="mut">'+esc(u.vn||(u.role==='owner'?'Dono da empresa':'Candidato(a)'))+'</span></div>').join('')||'<div class="mut">Ninguém online.</div>';
 $('olC').innerHTML=CHAT.map(c=>'<div class="'+(c.from==='DONO'?'dono':c.sys?'sys':'')+'"><b>'+esc(c.from)+':</b> '+esc(c.text)+'</div>').join('');$('olC').scrollTop=1e6;
 let b=$('admB');if(YOU.role==='owner'){if(!b){b=document.createElement('button');b.id='admB';b.setAttribute('data-act','adm');b.textContent='Painel do dono';document.querySelector('header .ctl').appendChild(b)}}
 if(window.__admOpen&&YOU.role==='owner')admRender();
 const w=$('funcs');if(w&&YOU.role==='owner'){w.hidden=false;w.innerHTML='<h2>Dono da empresa</h2><div class="mut">Você controla velocidade, vagas, contratações, avisos e reinício pelo Painel do dono. Pode usar todas as funções da fábrica.</div>'}
 else if(w&&!YOU.me){w.hidden=false;w.innerHTML='<h2>'+(YOU.pending?'Candidatura em análise':'Sem cargo')+'</h2><div class="mut">'+(YOU.pending?'Aguarde o dono aprovar a sua contratação. Enquanto isso você pode acompanhar a fábrica.':'Envie um currículo para uma vaga aberta.')+'</div>'+(YOU.pending?'':'<button class="btn pri sm" data-act="rh" data-a="inicio">Abrir vagas</button>')}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LOCAL=['tab','snd','mus','help','close','dismiss','rh','olin','adm','ol','vol'];
{const A0=A;A=function(act,a){
 if(act==='olin'){S({t:a,name:$('olN').value,pin:$('olP').value});return}
 if(act==='adm'){window.__admOpen=true;return admRender()}
 if(act==='ol')return olAct(a);
 if(act==='close'&&window.__admOpen){window.__admOpen=false;$('modal').hidden=true;return}
 if(LOCAL.includes(act))return A0(act,a);
 if(act==='speed'){if(YOU&&YOU.role==='owner')S({t:'speed',s:+a});else showToast('Só o dono controla a velocidade.');return}
 if(YOU&&YOU.role!=='owner'&&!YOU.me){showToast('Você ainda não foi contratado(a).');return}
 if(!canDo(act,a)){showToast(denyMsg(act,a));sfx('bad');return}
 S({t:'act',act,a});sfx('click')}}
setSpeed=function(s){if(YOU&&YOU.role==='owner')S({t:'speed',s})};pause=function(){if(YOU&&YOU.role==='owner')S({t:'speed',s:0})};
{const ra=rhAct;rhAct=async function(a){if(a==='assinar'){S({t:'apply',cv:RH.cv,vaga:RH.res.v.id});$('modal').hidden=true;RH.step='inicio';return}return ra(a)}}
{const mu=meUpd;meUpd=function(){const m=G.me;if(m){const d=G.day;G.day=m.lvl*8+1;try{mu()}finally{G.day=d}}else mu()}}
function admRender(){const m=$('modal');m.hidden=false;const A_=ADM||{apps:[],users:[]};
 m.innerHTML='<div role="dialog" aria-modal="true" style="max-width:820px"><h2>Painel do dono</h2><div class="chips"><span class="mut">Velocidade:</span>'+[[0,'Pausar'],[1,'1x'],[3,'3x'],[8,'8x']].map(([s,t])=>'<button class="btn sm" aria-pressed="'+(G.speed===s)+'" data-act="ol" data-a="speed:'+s+'">'+t+'</button>').join('')+'</div>'+
 '<h3>Candidaturas pendentes ('+A_.apps.length+')</h3>'+(A_.apps.length?A_.apps.map(a=>'<div class="ord"><h3>'+esc(a.cv.n)+' · '+esc(a.vn)+' <span class="mut">('+esc(a.user)+')</span></h3><div class="mut">Nota '+a.sc+'/100 · '+ESC[a.cv.esc]+' · '+a.cv.exp+' anos · '+a.cv.sk.map(s=>SKN[s]).join(', ')+'</div><div class="mut">'+esc((a.cv.t||'').slice(0,240))+'</div><div class="row"><button class="btn sm pri" data-act="ol" data-a="approve:'+a.id+'">Contratar</button><button class="btn sm" data-act="ol" data-a="reject:'+a.id+'">Recusar</button></div></div>').join(''):'<div class="mut">Nenhuma candidatura.</div>')+
 '<h3>Pessoas</h3>'+A_.users.filter(u=>u.role!=='owner').map(u=>'<div class="row"><span><b>'+esc(u.name)+'</b> '+(u.on?'<span class="good">online</span>':'<span class="mut">offline</span>')+' · '+(u.me?esc((u.me.mgr?'Gerente · ':'')+u.me.s)+(u.me.mgr?'':' · nível '+u.me.lvl):'sem cargo')+'</span><span>'+(u.me?(u.me.mgr?'<button class="btn sm" data-act="ol" data-a="demote:'+esc(u.name)+'">Tirar gerência</button>':'<button class="btn sm" data-act="ol" data-a="manager:'+esc(u.name)+'">Promover a gerente</button>')+' <button class="btn sm" data-act="ol" data-a="fire:'+esc(u.name)+'">Desligar</button>':'')+'</span></div>').join('')+
 '<h3>Vagas abertas</h3><div class="grid2">'+VG.map(v=>'<div class="row"><span>'+v.n+'</span><span><button class="btn sm" data-act="ol" data-a="vaga:'+v.id+':-1">−</button> <b class="num">'+((G.vagas&&G.vagas[v.id])||0)+'</b> <button class="btn sm" data-act="ol" data-a="vaga:'+v.id+':1">+</button></span></div>').join('')+'</div>'+
 '<h3>Aviso para todos</h3><input id="admT" maxlength="200" style="width:100%" placeholder="Mensagem"><div class="chips"><button class="btn sm pri" data-act="ol" data-a="announce">Enviar aviso</button><button class="btn sm" data-act="ol" data-a="reset">Reiniciar empresa</button><button class="btn" data-act="close">Fechar</button></div></div>'}
function olAct(a){const[k,x,y]=a.split(':');
 if(k==='speed')S({t:'speed',s:+x});else if(k==='approve'||k==='reject')S({t:k,id:+x});else if(k==='manager'||k==='demote'||k==='fire')S({t:'role',op:k,user:x});
 else if(k==='vaga')S({t:'vaga',id:x,d:+y});else if(k==='announce'){const t=$('admT').value.trim();if(t){S({t:'announce',text:t});$('admT').value=''}}
 else if(k==='reset'){if(prompt('Isto apaga a fábrica, as contratações e os cargos. Digite REINICIAR para confirmar.')==='REINICIAR')S({t:'reset',confirm:'REINICIAR'})}}
connect();
})();
