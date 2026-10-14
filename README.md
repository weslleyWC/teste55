# Orla Social

Jogo social 3D para navegador em uma orla fictícia inspirada em Copacabana. **Fase 2:** até 24 pessoas na mesma sala, apelidos sobre os personagens, chat por texto, posições sincronizadas e gestos (acenar, dançar e aplaudir). A fase 1 continua com praia, mar animado, palmeiras, quiosques, caminhada, corrida e câmera livre.

## Desenvolvimento

Requer Node.js 22.12+ (ou 20.19+) e npm.

```sh
npm ci --cache /tmp/orla-npm
npm run dev
```

O comando inicia o servidor social na porta 3001 e o Vite na porta 5173. Abra o endereço exibido pelo Vite em dois navegadores, escolha apelidos e clique em **Explorar a orla**. Os navegadores precisam acessar o mesmo servidor para se encontrar. O Vite encaminha `/social` (WebSocket) e `/api` para o servidor social; não é necessário expor a porta 3001 separadamente durante o desenvolvimento.

Use WASD ou setas para andar, Shift para correr, arraste o cenário para girar a câmera e role o mouse para ajustar a distância. Dispositivos com toque recebem botões direcionais. O botão `?` abre a ajuda. Digitar no chat pausa a movimentação por teclado. Os botões de gesto reproduzem animações de aproximadamente 3,5 segundos, visíveis para as outras pessoas. A conversa pode ser recolhida para liberar espaço na tela.

Se a conexão cair, os jogadores remotos desaparecem, o chat é desativado e a exploração solo continua. Use **Tentar conectar** para entrar novamente. A reconexão cria uma nova sessão e posiciona o personagem em um ponto de entrada livre.

## Verificação

```sh
npm run test:server
npm test
npm run build
```

Os testes do servidor verificam movimento compartilhado, mensagens, gestos, saída/reentrada, capacidade e validação de entradas. Os testes de navegador usam o Chromium em `/usr/bin/chromium` (ajuste `playwright.config.js` caso seu navegador esteja em outro caminho). Exercitam renderização, teclado, controles de toque, duas sessões reais, movimento remoto, chat como texto seguro, gestos e remoção do jogador que saiu. WebGL por software pode deixar esses testes mais lentos.

## Executar a versão compilada

```sh
npm run build
npm start
```

O servidor Node serve `dist/`, `/api/health` e o WebSocket `/social` na mesma porta (3001 por padrão; configurável com `PORT`). Ao hospedar com HTTPS, o navegador usa automaticamente WSS. O provedor ou proxy precisa oferecer suporte a WebSocket. Hospedagem exclusivamente estática, como GitHub Pages, não executa o servidor social.

Para inspecionar o build pelo Vite Preview, mantenha `npm start` em um terminal e execute `npm run preview` em outro; o preview encaminha as conexões para a porta 3001.

## Escopo e limitações

Uma única sala por processo, com até 24 sessões anônimas. O servidor mantém os jogadores e as últimas 40 mensagens apenas em memória; reiniciar o processo limpa esse estado. Apelidos podem se repetir e não representam contas verificadas. Não há banco de dados, login, amigos, múltiplas salas, áudio, festas funcionais, moedas ou pagamentos. O limite de sala foi testado no protocolo, mas desempenho com 24 navegadores e em celulares reais ainda precisa ser medido.

O servidor valida limites do mapa, obstáculos, velocidade máxima, mensagens e gestos, e limita frequência/tamanho das entradas. O chat é renderizado como texto. Autenticação, moderação, denúncias, bloqueios e controles para abuso ainda são trabalho necessário antes de um lançamento público.

O cenário, personagem e animações são gerados com Three.js; as fontes são empacotadas localmente. Próximas fases: atividades e festas; personalização; cosméticos pagos e lançamento.
