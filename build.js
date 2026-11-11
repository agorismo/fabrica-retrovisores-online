const fs=require('fs'),path=require('path');
let h=fs.readFileSync(path.join(__dirname,'game.html'),'utf8');const on=fs.readFileSync(path.join(__dirname,'online.js'),'utf8');
function rep(o,n){if(h.split(o).length!==2)throw new Error('build: trecho não encontrado: '+o.slice(0,60));h=h.replace(o,n)}
rep('Assinar contrato e abrir a fábrica','Enviar candidatura ao dono');
rep("'Aprovado(a)!',c.n+', você foi contratado(a) como '+v.n+' em '+v.s+'.')","'Pré-aprovado(a)!',c.n+', você passou na triagem para '+v.n+' em '+v.s+'. O dono ainda precisa aprovar a contratação.')");
const i=h.lastIndexOf('</script>');h=h.slice(0,i)+'\n'+on+'\n'+h.slice(i);
fs.mkdirSync(path.join(__dirname,'public'),{recursive:true});fs.writeFileSync(path.join(__dirname,'public','index.html'),h);console.log('build ok',h.length);
