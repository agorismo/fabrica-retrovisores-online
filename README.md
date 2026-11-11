# Fábrica de Retrovisores · Online

Servidor multiplayer do jogo. Uma única fábrica compartilhada: o **dono** aprova contratações, promove gerentes, controla vagas, velocidade e avisos; cada jogador tem um cargo e só faz as funções do seu setor. Setores sem jogador rodam no automático.

## Rodar local
    npm install
    OWNER_PASS=minhasenha npm start
Abra http://localhost:3000 e entre com o nome `dono` e a senha definida.

## Variáveis
- `OWNER_NAME` (padrão `dono`) e `OWNER_PASS` (obrigatória em produção).
- `DATA_FILE` caminho do JSON de persistência (padrão `data.json`).

## Como funciona
- `engine.js` executa o próprio `game.html` sem navegador (DOM simulado) e roda a simulação no servidor.
- `server.js` cuida de contas, cargos, permissões, candidaturas e envia o estado por WebSocket.
- `online.js` é injetado no `game.html` por `build.js` e gera `public/index.html`.
- Para atualizar o jogo, substitua `game.html` pela versão nova e faça deploy.

## Limites conhecidos
- No plano gratuito do Render o disco é efêmero: a fábrica e as contas somem em redeploys. Use um disco persistente ou Postgres.
- O serviço gratuito hiberna sem acessos; o jogo para até alguém abrir o site.
