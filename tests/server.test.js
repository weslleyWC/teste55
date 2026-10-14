import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createOrlaServer } from '../server/index.js';

async function fixture(t) {
  const instance = createOrlaServer({ port: 0, host: '127.0.0.1' }); await instance.listen();
  t.after(() => instance.close());
  const url = `ws://127.0.0.1:${instance.server.address().port}/social`;
  async function connect(name) {
    const ws = new WebSocket(url), queue = [], waiters = [];
    ws.on('message', raw => {
      const m = JSON.parse(raw); const index = waiters.findIndex(w => w.predicate(m));
      if (index >= 0) { const waiter = waiters.splice(index, 1)[0]; clearTimeout(waiter.timer); waiter.resolve(m); } else { queue.push(m); if (queue.length > 100) queue.shift(); }
    });
    const next = predicate => {
      const index = queue.findIndex(predicate); if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
      return new Promise((resolve, reject) => { const waiter = { predicate, resolve }; waiter.timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Expected server message did not arrive')); }, 3000); waiters.push(waiter); });
    };
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    const send = message => ws.send(JSON.stringify(message)); send({ type: 'join', name });
    return { ws, next, send };
  }
  return { connect, port: instance.server.address().port };
}

test('two players share positions, chat, gestures and departure; reconnect gets a new identity', async t => {
  const { connect } = await fixture(t);
  const a = await connect('Ana'), joinedA = await a.next(m => m.type === 'joined');
  const b = await connect('Beto'), joinedB = await b.next(m => m.type === 'joined');
  assert.equal(joinedB.players.length, 2);
  const position = joinedA.players[0];
  a.send({ type: 'move', x: position.x + .1, z: position.z, rotation: .5, moving: true });
  const moved = await b.next(m => m.type === 'snapshot' && m.players.some(p => p.id === joinedA.id && p.x === position.x + .1));
  assert.equal(moved.players.find(p => p.id === joinedA.id).moving, true);
  a.send({ type: 'chat', text: 'Boa tarde, Copa!' });
  assert.equal((await b.next(m => m.type === 'chat')).text, 'Boa tarde, Copa!');
  a.send({ type: 'gesture', gesture: 'wave' });
  await b.next(m => m.type === 'snapshot' && m.players.some(p => p.id === joinedA.id && p.gesture === 'wave'));
  a.ws.close(); await b.next(m => m.type === 'snapshot' && m.players.length === 1);
  const again = await connect('Ana'), rejoined = await again.next(m => m.type === 'joined');
  assert.notEqual(rejoined.id, joinedA.id); assert.equal(rejoined.history[0].text, 'Boa tarde, Copa!');
});

test('server rejects malformed movement, teleporting, collisions and spoofed chat identity', async t => {
  const { connect } = await fixture(t);
  const a = await connect('Ana'), initial = await a.next(m => m.type === 'joined');
  const p = initial.players[0];
  a.ws.send('not json');
  a.send({ type: 'move', x: 'NaN', z: p.z, rotation: 0 });
  a.send({ type: 'move', x: p.x + 10, z: p.z, rotation: 0 });
  const correction = await a.next(m => m.type === 'correct'); assert.equal(correction.x, p.x);
  a.send({ type: 'move', x: 1.8, z: -17, rotation: 0 });
  const snapshot = await a.next(m => m.type === 'snapshot'); assert.equal(snapshot.players[0].x, p.x);
  a.send({ type: 'chat', name: 'Admin', text: 'oi'.repeat(150) });
  const chat = await a.next(m => m.type === 'chat'); assert.equal(chat.name, 'Ana'); assert.equal(chat.text.length, 200);
});

test('room caps membership at 24 and exposes health', async t => {
  const { connect, port } = await fixture(t);
  for (let i = 0; i < 24; i++) { const c = await connect(`Pessoa ${i}`); await c.next(m => m.type === 'joined'); }
  const extra = await connect('Lotado'); const message = await extra.next(m => m.type === 'error'); assert.match(message.text, /cheia/);
  const health = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json(); assert.equal(health.players, 24); assert.equal(health.status, 'ok');
});

test('production server serves compiled application and its JavaScript', async t => {
  const { port } = await fixture(t);
  const root = `http://127.0.0.1:${port}`;
  const response = await fetch(root); assert.equal(response.status, 200);
  const html = await response.text(); assert.match(html, /Orla Social/);
  const script = html.match(/src="(\/assets\/[^\"]+\.js)"/); assert.ok(script, 'build must reference a bundled JavaScript asset');
  const asset = await fetch(root + script[1]); assert.equal(asset.status, 200); assert.match(asset.headers.get('content-type'), /javascript/);
});

test('race lobby and start are shared by two clients, and party dance requires proximity', async t => {
  const { connect } = await fixture(t);
  const a = await connect('Ana'), joined = await a.next(m => m.type === 'joined');
  assert.equal(joined.activities.race.phase, 'idle'); assert.equal(joined.activities.party.attendees, 0);
  const b = await connect('Beto'); await b.next(m => m.type === 'joined');
  a.send({ type: 'race-join' });
  await b.next(m => m.type === 'snapshot' && m.activities.race.phase === 'countdown');
  b.send({ type: 'race-join' });
  const lobby = await a.next(m => m.type === 'snapshot' && m.activities.race.racers.length === 2);
  assert.equal(lobby.activities.race.racers[0].name, 'Ana');
  a.send({ type: 'party-dance' });
  const error = await a.next(m => m.type === 'activity-error'); assert.match(error.text, /pista/);
});

test('walking to the kiosk enables a longer shared party dance', async t => {
  const { connect } = await fixture(t);
  const a = await connect('Ana'), joined = await a.next(m => m.type === 'joined');
  let { x, z } = joined.players[0];
  async function moveTo(targetX, targetZ) {
    while (Math.hypot(targetX - x, targetZ - z) > .01) {
      const distance = Math.hypot(targetX - x, targetZ - z), step = Math.min(1, distance);
      x += (targetX - x) / distance * step; z += (targetZ - z) / distance * step;
      await new Promise(resolve => setTimeout(resolve, 200));
      a.send({ type: 'move', x, z, rotation: 0, moving: true });
      await a.next(m => m.type === 'snapshot' && m.players.some(p => p.id === joined.id && Math.abs(p.x - x) < .01 && Math.abs(p.z - z) < .01));
    }
  }
  await moveTo(7, 2); await moveTo(7, -17);
  a.send({ type: 'party-dance' });
  const dancing = await a.next(m => m.type === 'snapshot' && m.players.some(p => p.id === joined.id && p.gesture === 'dance'));
  assert.equal(dancing.activities.party.attendees, 1);
  assert.ok(dancing.players[0].gestureUntil - Date.now() > 10000);
  const b = await connect('Beto'), shared = await b.next(m => m.type === 'joined');
  assert.equal(shared.activities.party.attendees, 1); assert.equal(shared.players.find(p => p.id === joined.id).gesture, 'dance');
});
