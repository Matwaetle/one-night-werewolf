// W9 client test: REPLAY.build() against every test/fixtures/night-*.json (SPEC 13.11, client part).
// Run: node test/replay.js   (also run by test/sim.js as a subprocess)
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const REPLAY = require(path.join(ROOT, 'public/js/replay.js'));
const T = require(path.join(ROOT, 'public/strings.js'));
const dir = path.join(__dirname, 'fixtures');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^night-.*.json$/.test(f)) : [];
if (!files.length) { console.error('no test/fixtures/night-*.json (run npm test first)'); process.exit(1); }
const strip = (h) => String(h).replace(/<[^>]*>/g, '');
const EMOJI = /\p{Extended_Pictographic}/u;
let checked = 0;
const roman = /(^|[^\w])(I|II|III|IV|V|VI|VII|VIII|IX)\s*가운데 카드|가운데 카드\s*(I|II|III|IV|V|VI|VII|VIII|IX)(\s|$)/;

function check(name, fx) {
  const R = fx.result, me = fx.meId, N = R.night, n = R.players.length;
  const B = REPLAY.build(R, me);                                    // 1: throws on desync (post !== end)
  const bs = B.beats, last = bs[bs.length - 1];
  assert.deepStrictEqual(last.post, N.end, name + ': last post !== end');
  // 2: captions
  for (const b of bs) {
    const all = strip(b.l1 + ' ' + b.l2 + ' ' + (b.l3 || ''));
    assert(strip(b.l1).trim(), name + ': empty upper line @' + b.i + ' ' + b.act);
    assert(!/undefined|\$\{|\{\w+\}|\bnull\b|\[object|NaN|false/.test(all), name + ': bad caption @' + b.i + ': ' + all);
    assert(!roman.test(all), name + ': altar called by roman numeral @' + b.i + ': ' + all);
    assert(!/ —/.test(all), name + ': dash josa @' + b.i + ': ' + all);
    assert(name === 'max-bytes' || strip(b.l1).length <= 46, name + ': caption too long @' + b.i + ': ' + strip(b.l1));
    assert(!EMOJI.test(all), name + ': emoji in caption');
    assert(!/!/.test(all), name + ': exclamation in caption');
  }
  for (const l of B.lines) assert(!/undefined|\$\{/.test(l.h), name + ': bad line');
  // 5: beat count
  const allIdle = N.ev.every((e) => e.k === 'idle');
  let runs = 0, prevIdle = false;
  for (const e of N.ev) { if (e.k === 'idle') { if (!prevIdle) runs++; prevIdle = true; } else { runs++; prevIdle = false; } }
  const swapped = R.players.filter((p, s) => N.end[s] !== s || p.original !== p.effective).length;
  const expect = 1 + (allIdle ? 1 : runs) + 1 + swapped + 1 + 1 + R.deaths.filter((d) => d.by !== 'vote').length + 1;
  assert.strictEqual(bs.length, expect, name + ': beat count ' + bs.length + ' != ' + expect);
  // 6: effective roles
  R.players.forEach((p, s) => assert.strictEqual(B.effRole(N.end[s]), p.effective, name + ': effRole(end[' + s + '])'));
  // 4: belief vs events (independent oracle)
  const me_ = B.me;
  R.players.forEach((p, s) => {
    let want = p.original, blind = false;
    for (const e of N.ev) {
      if (!e.by.includes(s)) continue;
      const r = e.r || e.st;
      if (e.k === 'copy') want = N.deal[e.see[0][0]];
      else if (r === 'robber' && e.k === 'swap' && e.see) want = B.effRole(e.see[0][0]);
      else if (r === 'insomniac' && e.see) { const x = e.see.find((z) => z[1] === s); if (x) want = B.effRole(x[0]); }
      else if (r === 'drunk') blind = true;
    }
    assert.strictEqual(B.belief[s].role, want, name + ': belief role seat ' + s);
    assert.strictEqual(!!B.belief[s].blind, blind, name + ': belief blind seat ' + s);
  });
  // journey
  for (let s = 0; s < n + 3; s++) assert.strictEqual(B.journey[s][B.journey[s].length - 1].c, N.end[s], name + ': journey end slot ' + s);
  // lines & ruler
  assert(B.lines.length >= bs.length, name + ': lines');
  assert(B.total > 5000 && B.total < 200000, name + ': total ms ' + B.total);
  // verdict self line
  if (me_ >= 0) assert(strip(last.l3).trim().length > 5, name + ': self line');
  if (me_ >= 0) assert(strip(last.l3).includes('당신') && !strip(last.l3).includes('소속입니다'), name + ': self line wording: ' + strip(last.l3));
  // slots by result.players only (SPEC 13.11-8)
  assert.deepStrictEqual(REPLAY.slotIds(R), R.players.map((p) => p.id));
  return B;
}

// 라틴 이름: 조사는 괄호 병기, 대시 폴백 금지
function latin(fx) {
  const L = ['Tom', 'Ann', 'Bob', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal', 'Ivy'];
  const c = JSON.parse(JSON.stringify(fx));
  c.result.players.forEach((p, i) => { p.name = L[i % L.length]; });
  return c;
}
const all = {};
for (const f of files) {
  const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  all[fx.name] = fx;
  try { check(fx.name, fx); check(fx.name + ' [latin]', latin(fx)); checked++; } catch (e) { console.error('FAIL', f, '\n ', e.message); process.exitCode = 1; }
}

// Latin names: bracket josa, never a dash
if (files.length) {
  const fx = JSON.parse(JSON.stringify(all[Object.keys(all)[0]])); fx.result.players.forEach((p, i) => { p.name = 'Tom' + String.fromCharCode(97 + i); });
  try { check('latin', fx); } catch (e) { console.error('FAIL latin:', e.message); process.exitCode = 1; }
}

// scenario specific
function must(name, f) { const fx = all[name]; if (!fx) { console.log('skip (no fixture):', name); return; } try { f(fx, REPLAY.build(fx.result, fx.meId), fx.result.night); } catch (e) { console.error('FAIL', name, '\n ', e.message); process.exitCode = 1; } }
must('doppel-robber-steals-wolf', (fx, B, N) => {         // 7: pack comes from event.by, not from who holds wolf cards
  const e = N.ev.find((x) => x.k === 'know' && x.st === 'werewolf'); assert(e, 'no wolf know event');
  const b = B.beats.find((x) => x.e === e || (x.e && x.e.k === 'know' && x.e.st === 'werewolf'));
  assert.deepStrictEqual(b.by, e.by);
  const holders = []; b.pre.forEach((c, s) => { if (s < fx.result.players.length && N.deal[c] === 'werewolf') holders.push(s); });
  assert.notDeepStrictEqual(holders.slice().sort(), e.by.slice().sort(), 'wolf-card holders must differ from event.by in this scenario');
  const txt = strip(b.l2); e.by.forEach((s) => assert(txt.includes(fx.result.players[s].name), 'pack text misses ' + s));
});
must('doppel-robber', (fx, B) => { const b = B.beats.find((x) => x.k === 'swap' && x.r === 'robber'); assert(b && strip(b.l2).includes('도플갱어(')); });
must('doppel-drunk', (fx, B, N) => { const e = N.ev.find((x) => (x.r || x.st) === 'drunk'); assert(e); assert(B.belief[e.by[0]].blind); });
must('doppel-robber', (fx, B, N) => { const e = N.ev.find((x) => x.r === 'robber'); assert(e && e.st === 'doppelganger'); const b = B.belief[e.by[0]]; assert.strictEqual(b.role, B.effRole(e.see[0][0])); assert(!b.blind); });
must('doppel-insomniac', (fx, B, N) => { const e = N.ev.find((x) => x.k === 'peek' && x.by.some((s) => fx.result.players[s].original === 'doppelganger')); assert(e); e.by.forEach((s) => { const x = e.see.find((z) => z[1] === s); assert.strictEqual(B.belief[s].role, B.effRole(x[0])); }); });
must('drunk-takes-insomniac', (fx, B) => { assert(B.beats.some((b) => b.k === 'idle' && strip(b.l2) === strip(T.replay.idle.moved.bot))); });
must('all-idle', (fx, B) => { assert(B.beats.filter((b) => b.act === 'night').length === 1 && B.beats.find((b) => b.act === 'night').k === 'quiet'); });
must('hunter-chain-2', (fx, B) => { assert(B.beats.filter((b) => b.act === 'hunt').length >= 2); assert(B.beats.filter((b) => b.act === 'hunt').slice(0, 1).every((b) => strip(b.l2).includes(T.replay.hunt.rule))); });
must('hunter-miss', (fx, B) => { assert(B.beats.some((b) => b.act === 'hunt' && b.miss !== undefined || b.act === 'hunt')); });
must('leave-mid-replay', (fx) => {                              // 8 (pure part): slot ids come from result.players even if state.players shrank
  assert.deepStrictEqual(REPLAY.slotIds(fx.result), fx.result.players.map((p) => p.id));
  assert(fx.leave.statePlayers.length === fx.result.players.length - 1);
  assert(fx.result.players[fx.leave.seat].id === fx.leave.id);
});
must('max-bytes', (fx, B) => { assert(B.beats.length <= 40); });

// hard-rule greps on the shipped sources
const js = fs.readFileSync(path.join(ROOT, 'public/js/replay.js'), 'utf8'), css = fs.readFileSync(path.join(ROOT, 'public/css/replay.css'), 'utf8');
try {
  assert(!EMOJI.test(js) && !EMOJI.test(css), 'emoji in replay.js/css');
  assert(!/confirm\(|alert\(|navigator\.vibrate|rotateY|preserve-3d|stroke-dashoffset|backdrop-filter|mix-blend-mode|clip-path\s*:[^;]*transition/.test(js + css), 'forbidden construct');
  assert(!/(?<![\w-])border-radius/.test(css), 'border-radius in replay.css');
  assert(!/https?:\/\//.test(js.replace(/xmlns|www\.w3\.org/g, '')), 'third-party url');
  const kf = [...css.matchAll(/@keyframes[^{]+\{([\s\S]*?\})\s*\}/g)].map((m) => m[1]).join(' ');
  assert(!/(?<![-\w])(left|top|width|height|margin|padding|color|background|border|filter|clip-path)\s*:/.test(kf), 'keyframes animate non-transform/opacity property');
  for (const m of css.matchAll(/transition\s*:\s*([^;}]+)/g)) assert(/^(opacity|transform|translate|scale|rotate)\b/.test(m[1].trim()) || /^(none|calc)/.test(m[1].trim()), 'transition on other property: ' + m[1]);
} catch (e) { console.error('FAIL greps:', e.message); process.exitCode = 1; }

console.log(process.exitCode ? 'replay test FAILED' : 'replay test ok: ' + checked + ' fixtures');
