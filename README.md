# Orla Social

Protótipo da fase 1 de um jogo social carioca para navegador: uma pequena orla fictícia inspirada em Copacabana, com calçadão, praia, mar animado, palmeiras, quiosques e personagem 3D controlável.

## Desenvolvimento

Requer Node.js 22.12+ (ou 20.19+) e npm.

```sh
npm ci --cache /tmp/orla-npm
npm run dev
```

Abra o endereço exibido pelo Vite. Clique em **Explorar a orla**. Use WASD ou setas para andar, Shift para correr, arraste o cenário para girar a câmera e role o mouse para ajustar a distância. Dispositivos com toque recebem botões direcionais. O botão `?` abre a ajuda.

```sh
npm run build
npm run preview
npm test
```

Os testes de navegador usam o Chromium em `/usr/bin/chromium` (ajuste `playwright.config.js` caso seu navegador esteja em outro caminho) e validam renderização, entrada na exploração, movimento e pausa durante a ajuda. O cenário e o personagem são gerados com Three.js; as fontes são empacotadas localmente e não exigem downloads em tempo de execução.

## Escopo

Esta versão é **solo**. Não há contas, multiplayer, chat, áudio, festas funcionais, moedas ou pagamentos. Quiosques e guarda-sóis compõem o cenário. Gráficos estilizados com recursos locais; o desempenho em aparelhos reais ainda precisa ser medido.

Próximas fases: multiplayer e chat; atividades e festas; personalização; cosméticos pagos e lançamento.
