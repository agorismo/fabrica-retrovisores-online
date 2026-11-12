# Fábrica de Retrovisores · Online

Servidor multiplayer do jogo. Uma única fábrica compartilhada: o **dono** aprova contratações, promove gerentes, controla vagas, velocidade e avisos; cada jogador tem um cargo e só faz as funções do seu setor. Setores sem jogador rodam no automático.

## Rodar local
    npm install
    OWNER_PASS=minhasenha npm start
Abra http://localhost:3000 e entre com o nome `dono` e a senha definida.

## Testes
    npm test
Os testes sobem o servidor de verdade numa porta livre, com um arquivo de dados temporário, e cobrem login, cadastro, bloqueio por tentativas, candidatura, contratação, permissões por setor, gerência, chat e salvamento. Rodam no GitHub Actions a cada push (Node 18, 20 e 22).

## Variáveis
- `OWNER_NAME` (padrão `dono`) e `OWNER_PASS` (obrigatória em produção, 8 ou mais caracteres). Ao trocar `OWNER_PASS`, as sessões antigas do dono deixam de valer.
- `DATA_FILE` caminho do JSON de persistência (padrão `data.json`).
- `PORT` porta HTTP (padrão `3000`; `0` escolhe uma porta livre).
- `TRUST_PROXY=1` usa o IP de `X-Forwarded-For` para os limites de login. Ligado automaticamente no Render; deixe desligado se o servidor ficar exposto direto, sem proxy na frente.

## Como funciona
- `engine.js` executa o próprio `game.html` sem navegador (DOM simulado) e roda a simulação no servidor.
- `server.js` cuida de contas, cargos, permissões, candidaturas e envia o estado por WebSocket.
- `online.js` é injetado no `game.html` por `build.js` e gera `public/index.html`.
- `linhas.js` guarda a simulação por linha, o abastecedor e as vagas novas. É um arquivo só que roda no servidor (carregado logo depois do `game.html`) e no navegador (injetado pelo `build.js`). `ui/linhas-ui.js` desenha a aba **Linhas**, o relógio e os botões de velocidade.
- `ui/icones.js` e `ui/tema.css` são o visual do modo online; `ui/static/` tem o favicon, os ícones do app e o manifest. O `build.js` injeta tudo isso no `public/index.html`.
- Para atualizar o jogo, substitua `game.html` pela versão nova, rode `npm test` e faça deploy. O visual continua valendo, porque não fica dentro do `game.html`.

## Linhas, abastecimento e tempo
- **Aba Linhas:** uma coluna por linha (autos, ônibus, caminhões). Cada uma mostra, por setor, quem está operando, a produção de hoje e de ontem e o estoque na saída. Mostra também o nível de abastecimento, os pedidos abertos, os prontos para despachar, o refugo do dia e a produção por pessoa.
- **Cada um gera a sua linha:** quem está online num setor só dá bônus à linha da sua vaga. Vagas sem linha (injeção, colagem, embalagem, metrologia, auditoria) ajudam todas as linhas do setor. O que um operador produz é creditado a ele; setor sem ninguém roda no automático e aparece como "Automático".
- **Abastecedor de linha** (uma vaga por linha): leva peças para a beira da linha. Se o nível cai abaixo de 25%, colagem, montagem e embalagem daquela linha desaceleram. Sem abastecedor, só a empilhadeira automática abastece, a 80% do ritmo da linha (melhora com a empilhadeira do almoxarifado). Com um abastecedor, a reposição é mais que o dobro. Sem energia ninguém abastece.
- **Vagas de qualidade novas:** inspetor de autos, de ônibus e de caminhões (só inspecionam a própria linha), metrologista e auditor IATF. As vagas por linha de qualidade e de abastecimento já nascem abertas num jogo novo; as outras o dono abre no painel. Um jogo salvo antes desta versão ganha as vagas novas sem perder o que já estava fechado.
- **Tempo mais real:** além de 1x, 3x e 8x, o dono tem **Real** (1 dia de jogo ≈ 1 hora) e **Calmo** (1 dia ≈ 10 minutos). O relógio do topo anda segundo a segundo entre um passo e outro da fábrica, em vez de pular.

## Celular
- Controles do topo em duas fileiras de botões de 44 px; Real e Calmo aparecem como texto no lugar do ícone. O controle de volume some em telas de toque.
- Login enxuto, que cabe numa tela só; o painel do dono quebra as velocidades de linha em vez de cortar.
- A planta da fábrica é larga de propósito e rola de lado, com um aviso embaixo dela.
- Ao apagar a tela o sistema derruba a conexão. Ao voltar para o app (ou quando a rede volta) o jogo reconecta na hora, e se a conexão estiver morta sem avisar, o `ping`/`pong` detecta em 2,5 s.
- Testado em 360, 390 e 768 px de largura e na horizontal (844x390), sem rolagem lateral em nenhuma aba.

## Visual
- **Tela de entrada:** um retrovisor refletindo a fábrica e um crachá de acesso que mostra o capacete com as iniciais enquanto a pessoa digita o nome.
- **Capacetes por função**, como no chão de fábrica: branco para gestão (dono e gerentes), amarelo para produção, azul para manutenção e ferramentaria, verde para qualidade, laranja para logística e compras, cinza para quem ainda não tem cargo. Aparecem na equipe online, no chat, no painel do dono e no cartão do jogador.
- **Ícones** redesenhados para setores, produtos (carro, ônibus, caminhão), controles do topo e abas. Os setores ganham placa amarela com pictograma preto, como sinalização de segurança. As chaves de `IC` são as mesmas do jogo, então o desenho novo aparece em todo lugar.
- **Painel do dono** em duas colunas, com nota do currículo em barra, vagas com o ícone do setor e uma área separada para reiniciar a empresa. Fecha com Esc e não apaga o aviso que está sendo digitado.
- **Celular:** controles do topo só com ícone numa linha, abas com rolagem lateral, chat que abre na última mensagem.
- Funciona no tema claro e no escuro, porque usa só as variáveis de cor do jogo.

Para regerar os PNGs depois de mudar `ui/static/favicon.svg` ou `icon-maskable.svg`, exporte em 180, 192 e 512 px com qualquer editor de SVG ou navegador.

## Segurança
- PIN guardado com `scrypt` e sal; hash e token comparados em tempo constante.
- 5 PINs errados para o mesmo nome a partir do mesmo IP bloqueiam o login por 1 minuto, dobrando a cada novo erro (até 15 min). Até 5 contas novas por IP por hora.
- Mensagens WebSocket limitadas a 16 KB e a 15 por segundo por conexão; chat limitado a rajadas de 5 mensagens.
- Ações, vagas e habilidades do currículo são conferidas no servidor contra as listas do próprio jogo. As permissões por setor também valem no servidor, não só no navegador.
- O `data.json` é gravado num arquivo temporário e renomeado, então uma queda no meio da escrita não corrompe os dados.

## Limites conhecidos
- No plano gratuito do Render o disco é efêmero: a fábrica e as contas somem em redeploys. Use um disco persistente ou Postgres.
- O serviço gratuito hiberna sem acessos; o jogo para até alguém abrir o site.
- Os limites de login ficam na memória e zeram quando o servidor reinicia.
