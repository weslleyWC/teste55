import { party, raceStart, checkpoints, near } from '../shared/activities.js';

export function createActivities({ now = Date.now, countdownMs = 8000, raceMs = 90000, resultsMs = 15000 } = {}) {
  const musicStartedAt = now();
  let race = { phase: 'idle', startsAt: 0, endsAt: 0, resultsUntil: 0, racers: [] };
  function finish() { race.phase = 'finished'; race.resultsUntil = now() + resultsMs; }
  function tick() {
    const time = now();
    if (race.phase === 'countdown' && time >= race.startsAt) race.phase = 'running';
    if (race.phase === 'running' && (time >= race.endsAt || race.racers.every(r => r.finishedMs !== null || r.left))) finish();
    if (race.phase === 'finished' && time >= race.resultsUntil) race = { phase: 'idle', startsAt: 0, endsAt: 0, resultsUntil: 0, racers: [] };
  }
  return {
    tick,
    join(player) {
      tick();
      if (!near(player, raceStart)) return 'Chegue à largada no calçadão para participar.';
      if (race.phase === 'running' || race.phase === 'finished') return 'Espere a próxima rodada.';
      if (race.racers.some(r => r.id === player.id)) return null;
      if (race.phase === 'idle') race = { phase: 'countdown', startsAt: now() + countdownMs, endsAt: now() + countdownMs + raceMs, resultsUntil: 0, racers: [] };
      race.racers.push({ id: player.id, name: player.name, checkpoint: 0, finishedMs: null, left: false });
      return null;
    },
    leave(id) {
      if (race.phase === 'countdown') race.racers = race.racers.filter(r => r.id !== id);
      else { const racer = race.racers.find(r => r.id === id); if (racer) racer.left = true; }
      if (race.phase === 'countdown' && !race.racers.length) race.phase = 'idle';
      tick();
    },
    move(player) {
      tick(); if (race.phase !== 'running') return;
      const racer = race.racers.find(r => r.id === player.id);
      if (!racer || racer.left || racer.finishedMs !== null) return;
      if (near(player, checkpoints[racer.checkpoint], 1.5)) {
        racer.checkpoint++;
        if (racer.checkpoint === checkpoints.length) racer.finishedMs = now() - race.startsAt;
      }
      tick();
    },
    snapshot(players) {
      tick();
      return { serverNow: now(), party: { ...party, musicStartedAt, attendees: [...players].filter(p => near(p, party)).length }, race: { ...race, racers: race.racers.map(r => ({ ...r })) } };
    },
  };
}
