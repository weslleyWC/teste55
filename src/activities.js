import { party, raceStart, checkpoints, near } from '../shared/activities.js';
import { createMusic } from './music.js';

export function createActivityUI({ getPosition, send, onNavigate }) {
  let world = null, playerId = null, online = false, offset = 0;
  const panel = document.querySelector('#activities-panel');
  const title = document.querySelector('#race-title');
  const detail = document.querySelector('#race-detail');
  const button = document.querySelector('#race-join');
  const music = createMusic(getPosition);
  document.querySelector('#show-activities').onclick = () => { const hidden = panel.classList.toggle('hidden'); document.querySelector('#show-activities').setAttribute('aria-expanded', String(!hidden)); };
  document.querySelector('#close-activities').onclick = () => { panel.classList.add('hidden'); document.querySelector('#show-activities').setAttribute('aria-expanded', 'false'); };
  document.querySelector('#party-route').onclick = () => onNavigate(party, 'Pista do quiosque');
  document.querySelector('#race-route').onclick = () => onNavigate(raceStart, 'Largada da corrida');
  button.onclick = () => send('race-join');
  document.querySelector('#party-dance').onclick = () => send('party-dance');
  const scoreboard = document.querySelector('#race-scoreboard');
  let lastScore = '';
  function update() {
    const position = getPosition(), time = Date.now() + offset;
    const partyDistance = Math.round(Math.hypot(position.x - party.x, position.z - party.z));
    document.querySelector('#party-detail').textContent = online && world ? `${world.party.attendees} na pista · ${partyDistance} m de você` : 'Conecte-se para participar da festa.';
    document.querySelector('#party-dance').disabled = !online || !near(position, party);
    const race = world?.race;
    button.disabled = !online || !near(position, raceStart);
    const racer = race?.racers.find(p => p.id === playerId);
    button.textContent = racer ? 'Você está na corrida' : 'Participar da corrida';
    if (!online || !race) { title.textContent = 'Uma volta pela orla'; detail.textContent = 'Conecte-se para correr com a galera.'; button.disabled = true; }
    else if (race.phase === 'idle') { title.textContent = 'Uma volta pela orla'; detail.textContent = near(position, raceStart) ? 'Você está na largada. Chame a galera!' : 'Chegue à largada no calçadão para entrar.'; }
    else if (race.phase === 'countdown') { title.textContent = `Largada em ${Math.max(0, Math.ceil((race.startsAt - time) / 1000))} s`; detail.textContent = `${race.racers.length} na corrida · passe pelos 4 arcos em ordem`; }
    else if (race.phase === 'running') {
      title.textContent = racer?.finishedMs !== null && racer ? 'Você chegou!' : 'Valendo!';
      detail.textContent = racer && racer.finishedMs === null ? `Arco ${racer.checkpoint + 1}/4 · ${checkpoints[racer.checkpoint].label} · ${Math.max(0, Math.ceil((race.endsAt - time) / 1000))} s` : `Corrida em andamento · ${race.racers.filter(p => p.finishedMs !== null).length} chegaram`;
      button.disabled = true;
    } else { title.textContent = 'Resultado da rodada'; detail.textContent = `Próxima rodada em ${Math.max(0, Math.ceil((race.resultsUntil - time) / 1000))} s`; button.disabled = true; }
    if (racer) button.disabled = true;
    const finished = (race?.racers ?? []).filter(p => p.finishedMs !== null).sort((a, b) => a.finishedMs - b.finishedMs);
    const scoreKey = JSON.stringify({ phase: race?.phase, finished, remaining: race?.racers.filter(p => p.finishedMs === null).map(p => ({ name: p.name, left: p.left })) });
    if (scoreKey !== lastScore) {
      lastScore = scoreKey; scoreboard.replaceChildren();
      finished.forEach((p, i) => { const line = document.createElement('li'); line.textContent = `${i + 1}. ${p.name} · ${(p.finishedMs / 1000).toFixed(1)} s`; scoreboard.append(line); });
      if (race?.phase === 'finished') for (const p of race.racers.filter(p => p.finishedMs === null)) { const line = document.createElement('li'); line.textContent = `${p.name} · ${p.left ? 'saiu da sala' : 'não concluiu'}`; scoreboard.append(line); }
    }
  }
  const interval = setInterval(update, 100);
  window.addEventListener('pagehide', () => clearInterval(interval));
  return {
    open() { document.querySelector('#show-activities').classList.remove('hidden'); if (innerWidth >= 800) { panel.classList.remove('hidden'); document.querySelector('#show-activities').setAttribute('aria-expanded', 'true'); } },
    receive(state, id) { if (!state) return; online = true; world = state; playerId = id; offset = state.serverNow - Date.now(); music.sync(state); update(); },
    disconnect() { online = false; world = null; update(); },
    error(text) { document.querySelector('#activity-feedback').textContent = text; },
    state() { return { world, playerId, online, music: music.state() }; },
    target() { const racer = world?.race.racers.find(p => p.id === playerId); return world?.race.phase === 'running' && racer && racer.finishedMs === null ? checkpoints[racer.checkpoint] : null; },
  };
}
