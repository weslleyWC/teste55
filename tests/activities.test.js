import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActivities } from '../server/activities.js';
import { party, checkpoints } from '../shared/activities.js';

function fixture() {
  let time = 10000;
  const activity = createActivities({ now: () => time, countdownMs: 1000, raceMs: 10000, resultsMs: 1000 });
  const a = { id: 'a', name: 'Ana', x: -3.5, z: 2 }, b = { id: 'b', name: 'Beto', x: -2.1, z: 2 };
  const players = [a, b];
  return { activity, a, b, state: () => activity.snapshot(players), advance: ms => { time += ms; activity.tick(); } };
}

test('shared race starts once, ignores out-of-order checkpoints and ranks actual finish times', () => {
  const { activity, a, b, state, advance } = fixture();
  assert.equal(activity.join(a), null); const start = state().race.startsAt;
  assert.equal(activity.join(b), null); assert.equal(activity.join(a), null);
  assert.equal(state().race.racers.length, 2); assert.equal(state().race.startsAt, start);
  Object.assign(a, checkpoints[0]); activity.move(a); assert.equal(state().race.racers[0].checkpoint, 0, 'cannot score before start');
  advance(1000); assert.equal(state().race.phase, 'running');
  Object.assign(a, checkpoints[2]); activity.move(a); assert.equal(state().race.racers[0].checkpoint, 0, 'cannot skip an arc');
  for (const point of checkpoints) { advance(500); Object.assign(a, point); activity.move(a); }
  assert.equal(state().race.racers[0].finishedMs, 2000); assert.equal(state().race.phase, 'running');
  for (const point of checkpoints) { advance(500); Object.assign(b, point); activity.move(b); }
  assert.equal(state().race.phase, 'finished'); assert.equal(state().race.racers[1].finishedMs, 4000);
  advance(1000); assert.equal(state().race.phase, 'idle'); assert.equal(state().race.racers.length, 0);
});

test('race rejects distant entry and entry after start; times out without inventing a winner', () => {
  const { activity, a, b, state, advance } = fixture();
  assert.match(activity.join({ ...b, x: 12, z: -40 }), /largada/);
  activity.join(a); advance(1000); assert.match(activity.join(b), /rodada/);
  advance(10000); assert.equal(state().race.phase, 'finished'); assert.equal(state().race.racers[0].finishedMs, null);
});

test('departures cancel empty countdowns, mark unfinished racers and count party attendees by position', () => {
  const { activity, a, b, state, advance } = fixture();
  activity.join(a); activity.leave(a.id); assert.equal(state().race.phase, 'idle');
  activity.join(a); activity.join(b); advance(1000); activity.leave(a.id);
  assert.equal(state().race.racers[0].left, true); assert.equal(state().race.phase, 'running');
  activity.leave(b.id); assert.equal(state().race.phase, 'finished');
  assert.equal(state().party.attendees, 0); Object.assign(a, party); assert.equal(state().party.attendees, 1);
});
