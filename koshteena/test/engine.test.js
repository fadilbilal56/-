import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMeld, Round, seededRandom, makeDeck } from '../shared/engine.js';
import { bestPlan, decide } from '../shared/ai.js';
import { Room } from '../shared/match.js';

const C = (r, s, id) => ({ id: id || `${r}${s}${Math.random()}`, r, s });
const J = (id = 'j' + Math.random()) => ({ id, r: 0, s: 'X' });

test('deck has 108 cards', () => {
  assert.equal(makeDeck().length, 108);
});

test('sets', () => {
  assert.equal(analyzeMeld([C(7, 'S'), C(7, 'H'), C(7, 'D')]).value, 21);
  assert.equal(analyzeMeld([C(1, 'S'), C(1, 'H'), C(1, 'D'), C(1, 'C')]).value, 44);
  assert.equal(analyzeMeld([C(7, 'S'), C(7, 'S'), C(7, 'D')]), null, 'duplicate suit');
  assert.equal(analyzeMeld([C(7, 'S'), C(7, 'H'), J()]).type, 'set');
  assert.equal(analyzeMeld([C(7, 'S'), J(), J()]), null, 'too many jokers');
});

test('runs', () => {
  assert.equal(analyzeMeld([C(1, 'H'), C(2, 'H'), C(3, 'H')]).value, 6);
  assert.equal(analyzeMeld([C(12, 'H'), C(13, 'H'), C(1, 'H')]).value, 31);
  assert.equal(analyzeMeld([C(13, 'H'), C(1, 'H'), C(2, 'H')]), null, 'no wrap');
  const r = analyzeMeld([C(5, 'S'), J('jj'), C(7, 'S')]);
  assert.equal(r.type, 'run');
  assert.equal(r.cards[1].as.r, 6);
  assert.equal(analyzeMeld([C(5, 'S'), C(6, 'H'), C(7, 'S')]), null);
  assert.equal(analyzeMeld([C(11, 'D'), C(12, 'D'), C(13, 'D'), J()]).cards[0].as.r, 10);
});

test('bestPlan finds melds', () => {
  const hand = [C(7, 'S'), C(7, 'H'), C(7, 'D'), C(3, 'C'), C(4, 'C'), C(5, 'C'), C(6, 'C'), C(13, 'S'), J()];
  const p = bestPlan(hand);
  assert.ok(p.value >= 21 + 18);
});

test('round rules: first meld minimum and discard must be used', () => {
  const r = new Round({ playerIds: ['a', 'b'], starter: 0, rand: seededRandom(1) });
  r.hands[0] = [C(2, 'S', 'x1'), C(3, 'S', 'x2'), C(4, 'S', 'x3'), C(9, 'H', 'x4')];
  const res = r.act('a', { type: 'meld', groups: [['x1', 'x2', 'x3']] });
  assert.equal(res.ok, false);
  assert.match(res.error, /51/);
  assert.equal(r.act('b', { type: 'draw', from: 'stock' }).ok, false, 'not your turn');
  assert.ok(r.act('a', { type: 'discard', cardId: 'x4' }).ok);
  // b takes discard and cannot discard it back
  assert.ok(r.act('b', { type: 'draw', from: 'discard' }).ok);
  assert.equal(r.act('b', { type: 'discard', cardId: r.hands[1][0].id === 'x4' ? r.hands[1][1].id : r.hands[1][0].id }).ok, false);
  assert.ok(r.act('b', { type: 'undoDraw' }).ok);
  assert.equal(r.phase, 'draw');
});

test('hareeg doubles penalties', () => {
  const r = new Round({ playerIds: ['a', 'b'], starter: 0, rand: seededRandom(2) });
  r.hands[0] = [C(10, 'S', 'a1'), C(11, 'S', 'a2'), C(12, 'S', 'a3'), C(13, 'S', 'a4'), C(1, 'S', 'a5'), C(9, 'H', 'a6')];
  assert.ok(r.act('a', { type: 'meld', groups: [['a1', 'a2', 'a3', 'a4', 'a5']] }).ok);
  assert.ok(r.act('a', { type: 'discard', cardId: 'a6' }).ok);
  assert.ok(r.over);
  assert.equal(r.result.hareeg, true);
  assert.equal(r.result.scores[1].penalty, 200);
});

test('bots play full matches to completion', async () => {
  for (let seed = 1; seed <= 12; seed++) {
    const rand = seededRandom(seed);
    const done = await new Promise((resolve, reject) => {
      let room;
      room = new Room({
        code: 'T', emit: () => {}, rand, botDelay: 0, local: true,
        settings: { burnLimit: 151 },
        hooks: { onMatchEnd: (rm, ranking) => resolve(ranking) },
      });
      const levels = ['easy', 'medium', 'hard', 'medium'];
      for (let i = 0; i < 2 + (seed % 3); i++) room.addBot(levels[i]);
      // spectator human so broadcasts happen; mark as burned observer is not needed
      room.startMatch();
      const tick = setInterval(() => {
        if (room.phase === 'roundOver') room.startRound();
      }, 1);
      const guard = setTimeout(() => { clearInterval(tick); room.destroy(); reject(new Error('timeout seed ' + seed + ' round ' + room.roundNo)); }, 20000);
      const orig = room.hooks.onMatchEnd;
      room.hooks.onMatchEnd = (rm, rk) => { clearInterval(tick); clearTimeout(guard); setTimeout(() => rm.destroy(), 0); orig(rm, rk); };
    });
    assert.ok(done[0].name);
    console.log('seed', seed, 'ok', done.map(d => d.total).join('/'));
  }
});
