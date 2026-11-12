/* Gera public/ a partir do game.html sem alterá-lo:
   - troca dois textos do fluxo de contratação;
   - injeta ícones, favicon e manifest no <head>;
   - injeta ui/icones.js e online.js no fim do script do jogo;
   - injeta ui/tema.css depois de tudo, para ganhar dos estilos do jogo;
   - copia ui/static/ (ícones do app) para public/. */
const fs=require('fs'),path=require('path');
const P=(...p)=>path.join(__dirname,...p);
let h=fs.readFileSync(P('game.html'),'utf8');
const read=f=>fs.readFileSync(P(f),'utf8');
function rep(o,n){if(h.split(o).length!==2)throw new Error('build: trecho não encontrado: '+o.slice(0,60));h=h.replace(o,n)}
rep('Assinar contrato e abrir a fábrica','Enviar candidatura ao dono');
rep("'Aprovado(a)!',c.n+', você foi contratado(a) como '+v.n+' em '+v.s+'.')","'Pré-aprovado(a)!',c.n+', você passou na triagem para '+v.n+' em '+v.s+'. O dono ainda precisa aprovar a contratação.')");
const head='<meta name="description" content="Fábrica de retrovisores multiplayer: o dono contrata, cada pessoa cuida do seu setor.">'+
 '<meta name="theme-color" content="#151b20"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png">'+
 '<link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">';
{const t=h.indexOf('</title>');h=t<0?head+h:h.slice(0,t+8)+'\n'+head+h.slice(t+8)}
{const i=h.lastIndexOf('</script>');if(i<0)throw new Error('build: </script> não encontrado no game.html');
 h=h.slice(0,i)+'\n'+read('ui/icones.js')+'\n'+read('online.js')+'\n'+h.slice(i)}
{const i=h.lastIndexOf('</script>')+9;h=h.slice(0,i)+'\n<style id="tema-online">\n'+read('ui/tema.css')+'</style>'+h.slice(i)}
fs.mkdirSync(P('public'),{recursive:true});fs.writeFileSync(P('public','index.html'),h);
for(const f of fs.readdirSync(P('ui','static')).filter(f=>f!=='icon-maskable.svg'))fs.copyFileSync(P('ui','static',f),P('public',f));
console.log('build ok',h.length);
