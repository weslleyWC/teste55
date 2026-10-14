import express from 'express';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { bounds, blocked, gestures } from '../shared/world.js';
import { createActivities } from './activities.js';
import { party, near } from '../shared/activities.js';

export function createOrlaServer({ port = 3001, host = '0.0.0.0', activityOptions = {} } = {}) {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/social', maxPayload: 4096 });
  const players = new Map(), history = [];
  const sockets = new Map();
  const MAX_PLAYERS = 24;
  const activities = createActivities(activityOptions);
  const activityState = () => activities.snapshot(players.values());
  const state = () => [...players.values()].map(({ lastMove, lastChat, lastGesture, ...player }) => player);
  const send = (ws, message) => { if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 65536) ws.send(JSON.stringify(message)); };
  const broadcast = message => { for (const ws of sockets.values()) send(ws, message); };
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', players: players.size, capacity: MAX_PLAYERS }));
  app.use(express.static(fileURLToPath(new URL('../dist', import.meta.url))));
  wss.on('connection', ws => {
    let id = null, alive = true, bucket = Date.now(), count = 0;
    const joinDeadline = setTimeout(() => { if (!id) ws.close(1008, 'Entre na sala'); }, 10000);
    ws.on('pong', () => alive = true);
    ws.on('error', () => {});
    ws.on('message', raw => {
      const now = Date.now();
      if (now - bucket > 1000) { count = 0; bucket = now; }
      if (++count > 45) return;
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      if (!message || typeof message !== 'object') return;
      if (!id) {
        if (message.type !== 'join') return;
        if (players.size >= MAX_PLAYERS) { send(ws, { type: 'error', text: 'Esta sala está cheia. Tente novamente em instantes.' }); ws.close(1013, 'Sala cheia'); return; }
        const name = typeof message.name === 'string' ? message.name.trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 20) : '';
        if (name.length < 2) { send(ws, { type: 'error', text: 'Use um nome com 2 a 20 letras ou números.' }); return; }
        const occupied = new Set([...players.values()].map(p => p.slot));
        let slot = 0; while (occupied.has(slot)) slot++;
        id = randomUUID(); clearTimeout(joinDeadline);
        const player = { id, name, slot, x: -3.5 + (slot % 3) * 1.4, z: 2 + Math.floor(slot / 3) * 1.5, rotation: 0, moving: false, running: false, gesture: null, gestureUntil: 0, lastMove: now, lastChat: 0, lastGesture: 0 };
        players.set(id, player); sockets.set(id, ws);
        send(ws, { type: 'joined', id, players: state(), history, activities: activityState() });
        broadcast({ type: 'notice', text: `${name} chegou na orla.` });
        broadcast({ type: 'snapshot', players: state(), activities: activityState() });
        return;
      }
      const player = players.get(id);
      if (message.type === 'move') {
        if (![message.x, message.z, message.rotation].every(Number.isFinite)) return;
        if (message.x < bounds.minX || message.x > bounds.maxX || message.z < bounds.minZ || message.z > bounds.maxZ || blocked(message.x, message.z)) return;
        const allowed = Math.min((now - player.lastMove) / 1000, 1) * 6.4 + .25;
        if (Math.hypot(message.x - player.x, message.z - player.z) > allowed) {
          send(ws, { type: 'correct', x: player.x, z: player.z }); return;
        }
        Object.assign(player, { x: message.x, z: message.z, rotation: Math.atan2(Math.sin(message.rotation), Math.cos(message.rotation)), moving: message.moving === true, running: message.running === true, lastMove: now });
        activities.move(player);
      } else if (message.type === 'race-join') {
        const error = activities.join(player);
        if (error) send(ws, { type: 'activity-error', text: error });
        else broadcast({ type: 'snapshot', players: state(), activities: activityState() });
      } else if (message.type === 'party-dance') {
        if (!near(player, party)) { send(ws, { type: 'activity-error', text: 'Chegue perto da pista do quiosque para dançar na festa.' }); return; }
        player.gesture = 'dance'; player.gestureUntil = now + 15000; player.lastGesture = now;
        broadcast({ type: 'snapshot', players: state(), activities: activityState() });
      } else if (message.type === 'chat') {
        if (typeof message.text !== 'string' || now - player.lastChat < 800) return;
        const text = message.text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
        if (!text) return;
        player.lastChat = now;
        const chat = { type: 'chat', id: randomUUID(), playerId: id, name: player.name, text, at: now };
        history.push(chat); if (history.length > 40) history.shift(); broadcast(chat);
      } else if (message.type === 'gesture' && gestures.includes(message.gesture) && now - player.lastGesture > 1000) {
        player.lastGesture = now; player.gesture = message.gesture; player.gestureUntil = now + 3500;
        broadcast({ type: 'snapshot', players: state(), activities: activityState() });
      }
    });
    const heartbeat = setInterval(() => { if (!alive) return ws.terminate(); alive = false; ws.ping(); }, 15000);
    ws.on('close', () => {
      clearTimeout(joinDeadline); clearInterval(heartbeat);
      const player = players.get(id); players.delete(id); sockets.delete(id); activities.leave(id);
      if (player) { broadcast({ type: 'notice', text: `${player.name} saiu da orla.` }); broadcast({ type: 'snapshot', players: state(), activities: activityState() }); }
    });
  });
  const snapshots = setInterval(() => {
    const now = Date.now();
    for (const player of players.values()) {
      if (now > player.gestureUntil) player.gesture = null;
      if (now - player.lastMove > 500) player.moving = false;
    }
    if (players.size) broadcast({ type: 'snapshot', players: state(), activities: activityState() });
  }, 100);
  server.on('close', () => clearInterval(snapshots));
  return {
    server,
    listen: () => new Promise(resolve => server.listen(port, host, resolve)),
    close: () => new Promise(resolve => { clearInterval(snapshots); for (const ws of wss.clients) ws.terminate(); wss.close(); server.close(resolve); }),
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const instance = createOrlaServer({ port: Number(process.env.PORT || 3001) });
  await instance.listen();
  console.log(`Orla Social: servidor iniciado na porta ${instance.server.address().port}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await instance.close(); process.exit(0); });
}
