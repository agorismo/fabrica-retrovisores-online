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
- Para atualizar o jogo, substitua `game.html` pela versão nova, rode `npm test` e faça deploy.

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
