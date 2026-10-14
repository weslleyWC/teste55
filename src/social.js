export function createSocial({ onJoined, onPlayers, onDisconnected, onCorrection, onActivities, onActivityError }) {
  let socket = null, id = null, nickname = '', joined = false;
  const log = document.querySelector('#chat-log');
  const input = document.querySelector('#chat-input');
  const note = document.querySelector('#network-note');
  const status = document.querySelector('#connection-status');
  const count = document.querySelector('#player-count');
  const retry = document.querySelector('#reconnect');
  const seen = new Set();
  const send = message => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); };
  function chatLine(message) {
    if (message.id && seen.has(message.id)) return;
    if (message.id) { seen.add(message.id); if (seen.size > 200) seen.delete(seen.values().next().value); }
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 35;
    const line = document.createElement('p'); line.className = 'chat-line';
    if (message.type === 'chat') {
      const name = document.createElement('strong'); name.textContent = `${message.name}: `;
      line.append(name, document.createTextNode(message.text));
    } else { line.classList.add('notice'); line.textContent = message.text; }
    log.append(line); while (log.childElementCount > 80) log.firstChild.remove();
    if (atBottom) log.scrollTop = log.scrollHeight;
  }
  function setConnected(value) { joined = value; input.disabled = !value; document.querySelector('#send-chat').disabled = !value; }
  function connect(name) {
    nickname = name;
    if (socket) { const previous = socket; socket = null; previous.close(); }
    id = null; setConnected(false); retry.classList.add('hidden');
    note.textContent = 'Conectando você à orla…'; status.textContent = 'CONECTANDO'; count.textContent = 'Conectando…';
    const next = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/social`); socket = next;
    const timeout = setTimeout(() => { if (!joined && socket === next) next.close(); }, 10000);
    next.addEventListener('open', () => { if (socket === next) send({ type: 'join', name: nickname }); });
    next.addEventListener('message', event => {
      if (socket !== next) return;
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'joined') {
        clearTimeout(timeout); id = message.id; setConnected(true); note.textContent = ''; status.textContent = 'AO VIVO NA ORLA';
        for (const chat of message.history) chatLine(chat);
        onActivities(message.activities, id);
        onJoined(message.players.find(player => player.id === id)); onPlayers(message.players, id);
        count.textContent = `${message.players.length}/24 na orla`;
      } else if (message.type === 'snapshot') {
        onActivities(message.activities, id);
        onPlayers(message.players, id); count.textContent = `${message.players.length}/24 na orla`;
      } else if (message.type === 'chat' || message.type === 'notice') chatLine(message);
      else if (message.type === 'activity-error') onActivityError(message.text);
      else if (message.type === 'correct') onCorrection(message);
      else if (message.type === 'error') { note.textContent = message.text; retry.classList.remove('hidden'); }
    });
    next.addEventListener('close', () => {
      clearTimeout(timeout); if (socket !== next) return;
      setConnected(false); id = null; status.textContent = 'SEM CONEXÃO'; count.textContent = 'Offline';
      if (!note.textContent || note.textContent.startsWith('Conectando')) note.textContent = 'Conexão interrompida. Você pode explorar sozinho ou tentar conectar novamente.';
      retry.classList.remove('hidden'); onDisconnected();
    });
    next.addEventListener('error', () => {});
  }
  document.querySelector('#chat-form').addEventListener('submit', event => {
    event.preventDefault(); const text = input.value.trim();
    if (!joined || !text) return;
    send({ type: 'chat', text }); input.value = ''; input.focus();
  });
  document.querySelector('#toggle-chat').onclick = event => {
    const content = document.querySelector('#chat-content'); const collapsed = content.classList.toggle('hidden');
    event.currentTarget.textContent = collapsed ? '+' : '−';
    event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
    event.currentTarget.setAttribute('aria-label', collapsed ? 'Expandir conversa' : 'Recolher conversa');
  };
  retry.onclick = () => connect(nickname);
  window.addEventListener('pagehide', () => { socket?.close(); });
  return {
    connect,
    move: state => { if (joined) send({ type: 'move', ...state }); },
    gesture: gesture => { if (joined) send({ type: 'gesture', gesture }); },
    connected: () => joined,
    activity: type => { if (joined) send({ type }); },
  };
}
