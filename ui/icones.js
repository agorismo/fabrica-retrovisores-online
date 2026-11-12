/* ===== ÍCONES E CAPACETES (injetado por build.js; não depende de mudar o game.html) =====
   Grade de 64×64, traço arredondado. As chaves de IC são as mesmas do jogo, então
   o desenho novo aparece em todo lugar que o jogo já usa ic('chave'). */
const FX=(function(){
const UIC={
 /* produtos */
 car:'<path d="M5 42V35q0-3 3-3.6l10-2.2 6.4-8.3q1.6-1.9 4-1.9h12q2.4 0 4 1.9l6.6 8.3 4.6 1q3.4.8 3.4 4V42"/><path d="M26 30l4.4-6h10.4l4.6 6z" fill="currentColor" opacity=".25"/><path d="M5 42h7m12 0h16m12 0h7"/><circle cx="18" cy="43" r="6"/><circle cx="46" cy="43" r="6"/>',
 bus:'<rect x="4" y="12" width="56" height="32" rx="5"/><path d="M10 18h44v12H10z" fill="currentColor" opacity=".25"/><path d="M21 18v12M32 18v12M43 18v12M4 36h56"/><circle cx="16" cy="45" r="5"/><circle cx="48" cy="45" r="5"/>',
 truck:'<rect x="3" y="12" width="35" height="29" rx="2"/><path d="M38 21h11l10 12v8H38"/><path d="M42 25h6l6 8H42z" fill="currentColor" opacity=".25"/><circle cx="13" cy="45" r="5"/><circle cx="28" cy="45" r="5"/><circle cx="50" cy="45" r="5"/>',
 /* setores */
 rec:'<path d="M32 4v22m-10-9 10 10 10-10"/><path d="M6 36h52"/><rect x="10" y="36" width="44" height="14"/><path d="M14 50v8m36-8v8M32 36v14"/>',
 inj:'<rect x="4" y="36" width="56" height="14" rx="2"/><rect x="10" y="24" width="30" height="12" rx="2"/><path d="M19 24l-4-14h18l-4 14"/><rect x="44" y="14" width="14" height="22" rx="2"/><path d="M10 50v8m44-8v8"/>',
 glue:'<path d="M32 5C24 18 17 27 17 37a15 15 0 0 0 30 0C47 27 40 18 32 5z"/><path d="M25 39a7 7 0 0 0 7 7"/>',
 gear:'<circle cx="32" cy="32" r="8"/><circle cx="32" cy="32" r="17"/><path d="M32 6v9m0 34v9M6 32h9m34 0h9M13.6 13.6l6.3 6.3m24.2 24.2 6.3 6.3m0-36.8-6.3 6.3M19.9 44.1l-6.3 6.3"/>',
 qa:'<circle cx="27" cy="27" r="17"/><path d="M39.5 39.5 57 57"/><path d="M19 27l6 6 11-12"/>',
 box:'<path d="M8 20 32 9l24 11v25L32 56 8 45z"/><path d="M8 20l24 12 24-12M32 32v24"/><path d="M20 14.5 44 26v8" opacity=".7"/>',
 stack:'<path d="M4 54h40"/><rect x="8" y="36" width="15" height="18"/><rect x="25" y="36" width="15" height="18"/><rect x="16" y="18" width="15" height="18"/><path d="M48 30h12m-5-5 5 5-5 5"/>',
 tr:'<path d="M4 16h34v26H4zM38 24h11l11 11v7H38"/><circle cx="14" cy="46" r="5"/><circle cx="48" cy="46" r="5"/><path d="M4 8h14" opacity=".6"/>',
 mnt:'<path d="M8 18q12-6 24 0t24 0v8q-12 6-24 0T8 26z"/><path d="M8 34q12-6 24 0t24 0v8q-12 6-24 0T8 42z"/><path d="M8 50q12-6 24 0t24 0" opacity=".7"/>',
 moi:'<path d="M10 8h44L41 30H23z"/><rect x="20" y="30" width="24" height="16" rx="2"/><path d="M26 38h12M32 32v12M24 46l-4 12m20-12 4 12"/>',
 fer:'<path d="M12 52 36 28"/><path d="M30 12h14l8 8-6 6-8-8-4 4-4-4z"/><path d="M40 40l14 14" opacity=".7"/><circle cx="38" cy="38" r="5"/>',
 amb:'<path d="M32 6 10 14v16c0 13 9 23 22 28 13-5 22-15 22-28V14z"/><path d="M32 20v20M22 30h20"/>'};
/* ícones de interface (fora do conjunto do jogo) */
const UI={
 play:'<path d="M20 12 52 32 20 52z" fill="currentColor"/>',
 pause:'<rect x="16" y="12" width="11" height="40" rx="2" fill="currentColor"/><rect x="37" y="12" width="11" height="40" rx="2" fill="currentColor"/>',
 ff:'<path d="M8 14l24 18L8 50zM32 14l24 18-24 18z" fill="currentColor"/>',
 fff:'<path d="M4 16l19 16L4 48zM23 16l19 16-19 16zM42 16l19 16-19 16z" fill="currentColor"/>',
 music:'<path d="M24 46V12l30-6v34"/><circle cx="17" cy="46" r="7"/><circle cx="47" cy="40" r="7"/>',
 sound:'<path d="M8 24h10l14-12v40L18 40H8z"/><path d="M42 22a14 14 0 0 1 0 20M48 14a24 24 0 0 1 0 36"/>',
 help:'<circle cx="32" cy="32" r="26"/><path d="M24 25a8 8 0 1 1 11 7.4c-2 .8-3 2.6-3 4.6v3"/><circle cx="32" cy="47" r="1.5" fill="currentColor"/>',
 key:'<circle cx="20" cy="32" r="12"/><path d="M32 32h26m-8 0v10m-10-10v7"/>',
 factory:'<path d="M6 56V30l14-9v9l14-9v9l14-9v35z"/><path d="M48 56V12h8v44M6 56h52"/><path d="M14 40h6m8 0h6m-20 8h6m8 0h6"/>',
 boxes:'<rect x="8" y="34" width="22" height="22"/><rect x="34" y="34" width="22" height="22"/><rect x="21" y="10" width="22" height="22"/><path d="M15 34v7m26-7v7M28 10v7"/>',
 mirror:'<path d="M6 22q0-6 6-6.6L50 11q8-1 8 7v20q0 8-8 7l-38-4.4q-6-.6-6-6.6z"/><path d="M14 44l-4 10M4 56h14"/><path d="M18 32l12-12" opacity=".7"/>',
 helmet:'<path d="M10 42a22 22 0 0 1 44 0"/><path d="M4 42h56v6H4z"/><path d="M32 20v12M24 22l2 10m14-10-2 10"/>',
 flag:'<path d="M14 58V6"/><path d="M14 8h34l-7 10 7 10H14"/>',
 money:'<rect x="4" y="16" width="56" height="32" rx="3"/><circle cx="32" cy="32" r="8"/><path d="M12 24v16m40-16v16"/>',
 flask:'<path d="M24 6h16M27 6v18L10 52q-2 6 4 6h36q6 0 4-6L37 24V6"/><path d="M17 42h30" opacity=".7"/>',
 hand:'<rect x="10" y="8" width="28" height="50" rx="1"/><path d="M38 24h14v34M4 58h54"/><path d="M17 17h4m6 0h4m-14 9h4m6 0h4m-14 9h4m6 0h4"/><path d="M21 58V46h6v12"/>',
 tag:'<path d="M6 8h24l28 28-22 22L8 30z"/><circle cx="20" cy="22" r="5"/>',
 trophy:'<path d="M18 8h28v14a14 14 0 0 1-28 0z"/><path d="M18 14H8v4a10 10 0 0 0 10 10m28-14h10v4a10 10 0 0 1-10 10M32 36v12m-12 8h24l-3-8H23z"/>',
 chat:'<path d="M8 10h48v32H26L14 54V42H8z"/><path d="M18 22h28M18 31h18" opacity=".7"/>',
 users:'<circle cx="24" cy="22" r="10"/><path d="M6 56a18 18 0 0 1 36 0"/><path d="M42 13a9 9 0 0 1 0 17M48 38a16 16 0 0 1 10 18"/>',
 close:'<path d="M14 14l36 36M50 14 14 50"/>',
 megaphone:'<path d="M8 26h10l28-14v40L18 38H8z"/><path d="M18 38l4 16h8l-3-14M54 26v12"/>',
 reset:'<path d="M12 32a20 20 0 1 0 6-14"/><path d="M12 8v12h12"/>',
 brief:'<rect x="6" y="18" width="52" height="36" rx="3"/><path d="M24 18v-6h16v6M6 32h52M28 32v6h8v-6"/>',
 wrench:'<path d="M42 6a14 14 0 0 0-13 19L7 47a5 5 0 0 0 7 7l22-22A14 14 0 0 0 55 19l-8 8-8-2-2-8z"/>',
 wifi:'<path d="M6 24a38 38 0 0 1 52 0M14 33a26 26 0 0 1 36 0M22 42a14 14 0 0 1 20 0"/><circle cx="32" cy="51" r="3" fill="currentColor"/>'};
const svgI=(body,s,cls)=>'<svg class="ic'+(cls?' '+cls:'')+'" width="'+(s||20)+'" height="'+(s||20)+'" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
const ui=(k,s,cls)=>svgI(UI[k]||UIC[k]||'',s,cls);
/* Capacete por função, como nas fábricas: branco gestão, amarelo produção, azul manutenção,
   verde qualidade, laranja logística, cinza visitante (ainda sem cargo). */
const HELMET={gestao:['#f4f6f7','Gestão'],prod:['#e0a800','Produção'],tec:['#2f7fc1','Manutenção e ferramentaria'],qa:['#1f9a5f','Qualidade'],log:['#e2701f','Logística e compras'],vis:['#9aa5ae','Visitante, sem cargo']};
function helmetOf(u){if(!u)return 'vis';if(u.role==='owner'||u.mgr)return 'gestao';const k=u.k;if(!k)return 'vis';
 if(['inj','col','mon','emb'].includes(k))return 'prod';if(['man','fer'].includes(k))return 'tec';if(k==='qa')return 'qa';if(['exp','rec','sc'].includes(k))return 'log';return 'prod'}
function helmetSvg(kind,size,ini){const c=(HELMET[kind]||HELMET.vis)[0];const s=size||32;const y=ini?-3.5:0;
 return '<svg class="hm" width="'+s+'" height="'+s+'" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#26303a"/><g transform="translate(0 '+y+')">'+
 '<path d="M7 24.5a13 13 0 0 1 26 0z" fill="'+c+'"/>'+
 '<path d="M3.5 24h33v3.2q0 1.8-1.8 1.8H5.3q-1.8 0-1.8-1.8z" fill="'+c+'"/>'+
 '<path d="M20 12v8.5M14.6 13.8l1.6 6.4M25.4 13.8l-1.6 6.4" stroke="#0006" stroke-width="1.6" stroke-linecap="round"/>'+
 '<path d="M7.6 24h24.8" stroke="#0004" stroke-width="1"/></g>'+
 (ini?'<text x="20" y="35.2" text-anchor="middle" font-size="7" font-weight="700" fill="#f6f7f8" font-family="IBM Plex Mono,monospace" letter-spacing=".3">'+ini+'</text>':'')+'</svg>'}
const initials=n=>String(n||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
Object.assign(IC,UIC);

/* ---- cabeçalho: ícone + rótulo nos controles (o rótulo some no celular, mas continua para leitores de tela) ---- */
(function(){const set=(id,k,lbl)=>{const b=$(id);if(!b||b.querySelector('.ic'))return;const t=lbl||b.textContent.trim();b.innerHTML=ui(k,18)+'<span class="lb">'+t+'</span>';b.setAttribute('aria-label',t);b.title=t};
 set('mus','music');set('snd','sound');set('sp0','pause','Pausa');set('sp1','play','1x');set('sp3','ff','3x');set('sp8','fff','8x');set('hlp','help','Ajuda');
 const h1=document.querySelector('header h1');if(h1&&!h1.querySelector('.logo'))h1.insertAdjacentHTML('afterbegin','<img class="logo" src="/favicon.svg" width="34" height="34" alt="">');})();

/* ---- abas: ícone por seção, desenhado por CSS a partir do mesmo SVG ---- */
(function(){const T={fab:'factory',est:'boxes',qua:'qa',mod:'mirror',pes:'helmet',nfb:'flag',fin:'money',res:'flask',cli:'hand',mar:'tag',ach:'trophy'};
 const url=k=>'url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">'+(UI[k]||UIC[k])+'</svg>')+'")';
 const st=document.createElement('style');st.id='tab-icons';
 st.textContent=Object.entries(T).map(([a,k])=>'.tabbar [data-a="'+a+'"]::before{-webkit-mask-image:'+url(k)+';mask-image:'+url(k)+'}').join('');
 document.head.appendChild(st)})();
return{ui,UI,helmetSvg,helmetOf,initials,HELMET}})();
