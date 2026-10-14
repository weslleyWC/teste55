# Orla Social

Jogo social 3D para navegador em uma orla fictícia inspirada em Copacabana. **Fase 3:** festa no quiosque com pista de dança e música original sintetizada, além de corrida em grupo com checkpoints e resultados. A sala continua com até 24 pessoas, apelidos, chat, posições sincronizadas e gestos (acenar, dançar e aplaudir). A fase 1 continua com praia, mar animado, palmeiras, quiosques, caminhada, corrida e câmera livre.

## Desenvolvimento

Requer Node.js 22.12+ (ou 20.19+) e npm.

```sh
npm ci --cache /tmp/orla-npm
npm run dev
```

O comando inicia o servidor social na porta 3001 e o Vite na porta 5173. Abra o endereço exibido pelo Vite em dois navegadores, escolha apelidos e clique em **Explorar a orla**. Os navegadores precisam acessar o mesmo servidor para se encontrar. O Vite encaminha `/social` (WebSocket) e `/api` para o servidor social; não é necessário expor a porta 3001 separadamente durante o desenvolvimento.

Use WASD ou setas para andar, Shift para correr, arraste o cenário para girar a câmera e role o mouse para ajustar a distância. Dispositivos com toque recebem botões direcionais. O botão `?` abre a ajuda. Digitar no chat pausa a movimentação por teclado. Os botões de gesto reproduzem animações de aproximadamente 3,5 segundos, visíveis para as outras pessoas. A conversa pode ser recolhida para liberar espaço na tela.

Se a conexão cair, os jogadores remotos desaparecem, o chat é desativado e a exploração solo continua. Use **Tentar conectar** para entrar novamente. A reconexão cria uma nova sessão e posiciona o personagem em um ponto de entrada livre.

## Rolês na orla

Clique em **Ver rolês** para abrir o painel. **Como chegar** mostra uma seta e a distância até a pista do primeiro quiosque. A festa fica sempre disponível; ao chegar perto da pista, **Dançar na pista** inicia uma dança compartilhada de 15 segundos. O painel mostra quantas pessoas estão na área.

A música começa desligada. **Ligar música** ativa um loop original gerado com Web Audio; **Silenciar música** interrompe a reprodução local. O ritmo usa o relógio compartilhado da sala e o volume aumenta conforme você se aproxima da pista. Cada pessoa controla seu próprio áudio. Não há gravações de terceiros nem downloads de faixas.

A **Corrida da Orla** começa perto do ponto de entrada. Clique em **Participar da corrida** estando na largada: a primeira inscrição abre uma contagem regressiva de 8 segundos para a galera entrar. Pode correr sozinho também. Passe pelos quatro arcos em ordem, acompanhando a seta e o número do próximo arco. Segure Shift para correr. A rodada termina quando todos concluem/saem ou após 90 segundos; o resultado mostra tempos de chegada e quem não concluiu. Depois de 15 segundos, uma nova rodada fica disponível. A corrida não concede moedas e seus resultados não são permanentes.

## Verificação

```sh
npm run test:server
npm test
npm run build
```

Os testes do servidor verificam movimento compartilhado, mensagens, gestos, saída/reentrada, capacidade, validação de entradas, proximidade da pista, contagem de participantes, ordem dos checkpoints, tempos, expiração e reinício das rodadas. Os testes de navegador usam o Chromium em `/usr/bin/chromium` (ajuste `playwright.config.js` caso seu navegador esteja em outro caminho). Exercitam renderização, teclado, controles de toque, duas sessões reais, movimento remoto, chat como texto seguro, gestos e remoção do jogador que saiu. Também verificam inscrição de dois jogadores na mesma corrida, contagem regressiva compartilhada, orientação ao próximo arco e ativação/silenciamento do motor de áudio (sem avaliar a percepção sonora em um aparelho real). WebGL por software pode deixar esses testes mais lentos.

## Executar a versão compilada

```sh
npm run build
npm start
```

O servidor Node serve `dist/`, `/api/health` e o WebSocket `/social` na mesma porta (3001 por padrão; configurável com `PORT`). Ao hospedar com HTTPS, o navegador usa automaticamente WSS. O provedor ou proxy precisa oferecer suporte a WebSocket. Hospedagem exclusivamente estática, como GitHub Pages, não executa o servidor social.

Para inspecionar o build pelo Vite Preview, mantenha `npm start` em um terminal e execute `npm run preview` em outro; o preview encaminha as conexões para a porta 3001.

## Escopo e limitações

Uma única sala por processo, com até 24 sessões anônimas. O servidor mantém os jogadores, atividades e as últimas 40 mensagens apenas em memória; reiniciar o processo limpa esse estado. Apelidos podem se repetir e não representam contas verificadas. Não há banco de dados, login, amigos, múltiplas salas, voz, reprodução de músicas comerciais, moedas ou pagamentos. O limite de sala foi testado no protocolo, mas desempenho com 24 navegadores e em celulares reais ainda precisa ser medido.

O servidor valida limites do mapa, obstáculos, velocidade máxima, mensagens e gestos, e limita frequência/tamanho das entradas. O chat é renderizado como texto. Autenticação, moderação, denúncias, bloqueios e controles para abuso ainda são trabalho necessário antes de um lançamento público.

O cenário, personagem e animações são gerados com Three.js; as fontes são empacotadas localmente. Próximas fases: personalização e moedas gratuitas; cosméticos pagos e lançamento.
