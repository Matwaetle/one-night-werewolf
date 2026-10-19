// 봇 여러 명으로 전체 게임을 자동으로 돌려보는 테스트
// - 무작위 판(3~10명) + 시나리오 행렬(spec 13.12)을 돌리고, 밤의 기록(spec 13.2~13.3)의 서버 단언을 건다.
// - 시나리오 결과는 test/fixtures/night-<이름>.json 으로 남긴다 (W9 test/replay.js 입력).
// 실행: npm test
'use strict';
process.env.TIME_SCALE = '0.02';
process.env.PORT = process.env.PORT || '3999';
if (process.env.NODE_ENV === 'production') process.env.NODE_ENV = 'test';
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { spawnSync } = require('child_process');
const { io } = require('socket.io-client');
const { server, _test } = require('../server.js');
const WW = require('../public/roles.js');

const ROOT = path.join(__dirname, '..');
const URL = `http://localhost:${process.env.PORT}`;
const FIXDIR = path.join(__dirname, 'fixtures');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const LEAK = /"(original|cards|center|night|deal|pos|ev|seats|why|deaths)":/;
const EMOJI = /[\p{Extended_Pictographic}\u{1F000}-\u{1FAFF}‍️]/u;
const problems = [];
const bad = (msg) => { problems.push(msg); };
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---------- 정적 검사 ----------
function staticChecks() {
  const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  // 카드 교환은 swapSlots 하나로만: swapSlots·startGame 밖에서 g.cards[..]=, g.center[..]= 금지
  const fnStarts = [...src.matchAll(/^function (\w+)/gm)].map((m) => [m.index, m[1]]);
  const re = /\bg\.(cards|center)\[[^=\n]*\]\s*=(?!=)/g;
  let m;
  while ((m = re.exec(src))) {
    const fn = [...fnStarts].reverse().find(([i]) => i < m.index);
    if (!fn || !['swapSlots', 'startGame'].includes(fn[1])) throw new Error(`카드 직접 대입: ${m[0]} (함수 ${fn && fn[1]})`);
  }
  for (const f of ['server.js', 'public/strings.js', 'public/roles.js']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const e = t.match(EMOJI);
    if (e) throw new Error(`이모지 발견: ${f} ${e[0]}`);
  }
  if (/\blabel\s*\(|\btimeline\s*\(/.test(src)) throw new Error('label()/timeline() 가 남아 있다');
  console.log('정적 검사 통과 (카드 대입, 이모지)');
}

// ---------- 봇 ----------
function bot(name, pid) {
  const s = io(URL, { forceNew: true, transports: ['websocket'] });
  const b = { name, s, pid: pid || `bot-${name}-${Math.random()}`, state: null, chats: [], script: null, handled: new Set(), gameIds: new Set(), seen: [], stepSeen: {}, insoPrompt: null };
  b.sid = require('crypto').createHash('sha256').update(b.pid).digest('base64url').slice(0, 12);
  s.on('state', (st) => {
    b.state = st;
    if (st.phase === 'night' && st.stepIdx >= 0 && b.stepSeen[st.stepIdx] === undefined) b.stepSeen[st.stepIdx] = Date.now();
    if (st.prompt && st.prompt.type === 'info' && st.prompt.reveal) b.insoPrompt = st.prompt;
    const json = JSON.stringify(st);
    const bytes = Buffer.byteLength(json);
    if (st.gameId) b.gameIds.add(st.gameId);
    if (st.phase !== 'result' && LEAK.test(json)) bad(`${b.name}: 결과 전 상태에 금지 키 (${st.phase}): ${json.match(LEAK)[0]}`);
    if (st.phase !== 'result' && bytes > 3072 && st.players.length <= 10) bad(`${b.name}: 상태 ${bytes}B > 3KB (${st.phase})`);
    if (st.phase === 'result' && bytes > 6144) bad(`${b.name}: 결과 상태 ${bytes}B > 6KB`);
    if (st.phase === 'result' && st.result && st.result.night) {
      const nb = Buffer.byteLength(JSON.stringify(st.result.night));
      if (nb > 1536) bad(`${b.name}: night ${nb}B > 1.5KB`);
    }
    if (st.phase === 'result' && st.result && st.result.gameId !== st.gameId) bad('result.gameId 불일치');
    if (st.phase !== 'result' && st.phase !== 'lobby' && !st.gameId) bad(`gameId 없음 (${st.phase})`);
    for (const e of st.myLog || []) {
      if (typeof e.text !== 'string' || !Array.isArray(e.reveal)) bad('myLog 항목 모양 오류');
      else if (EMOJI.test(e.text)) bad('myLog 이모지: ' + e.text);
    }
    b.script ? scripted(b) : react(b);
  });
  s.on('chat', (m) => { b.chats.push(m); if (EMOJI.test(m.text || '')) bad('채팅 이모지: ' + m.text); });
  b.emit = (ev, data) => new Promise((r) => s.emit(ev, data, r));
  return b;
}

// ----- 무작위 봇 -----
const handled = new Set();
function react(b) {
  const st = b.state;
  if (st.phase === 'night' && st.prompt && !st.prompt.done) {
    const k = `${b.pid}:${st.prompt.key}`;
    if (handled.has(k)) return;
    handled.add(k);
    const others = st.players.filter((p) => p.id !== st.me).map((p) => p.id);
    const p = st.prompt;
    if (p.type === 'info') {
      if (p.ids && p.ids.some((id) => !st.players.some((x) => x.id === id))) bad('info ids 가 방에 없다');
    }
    // 가끔은 아무것도 안 하고 시간 초과 처리도 시험
    if (Math.random() < 0.15) return;
    let data = {};
    if (p.type === 'doppelganger' || p.type === 'robber') data = { player: pick(others) };
    else if (p.type === 'seer') data = Math.random() < 0.5 ? { player: pick(others) } : { centers: [0, 2] };
    else if (p.type === 'troublemaker') data = { players: others.slice(0, 2) };
    else if (p.type === 'drunk' || p.type === 'lonewolf') data = { center: 1 };
    setTimeout(() => b.emit('nightAction', { ...data, key: p.key }).then((r) => {
      if (!r.ok) bad(`${p.type}: ${r.error}`);
      else if (!Array.isArray(r.reveal) || typeof r.text !== 'string') bad(`${p.type}: ack 모양 오류`);
    }), 5);
  }
  if (st.phase === 'day') {
    const me = st.players.find((p) => p.id === st.me);
    if (!me.ready && !b._readySent) { b._readySent = true; setTimeout(() => b.s.emit('ready', { ready: true }), 10); }
  } else b._readySent = false;
  if (st.phase === 'vote' && !st.myVote && !b._voteSent) {
    b._voteSent = true;
    const others = st.players.filter((p) => p.id !== st.me).map((p) => p.id);
    setTimeout(() => b.emit('vote', { target: pick(others) }), 10);
  } else if (st.phase !== 'vote') b._voteSent = false;
}

// ----- 대본 봇 (시나리오) -----
// script = { seat, acts: { [promptType]: data | 'timeout' }, vote: seat|null, ids: [pid...] }
function conv(data, ids) {
  const o = { ...data };
  if (o.player !== undefined) o.player = ids[o.player];
  if (o.players) o.players = o.players.map((i) => ids[i]);
  return o;
}
function scripted(b) {
  const st = b.state, sc = b.script;
  if (st.phase === 'night' && st.prompt && !st.prompt.done) {
    const p = st.prompt;
    if (b.handled.has(p.key)) return;
    b.handled.add(p.key);
    let a = p.type === 'info' ? {} : sc.acts[p.type];
    if (a === undefined) a = 'timeout';
    if (p.type === 'info' && p.ids) {
      const wantIds = p.ids;
      if (wantIds.some((id) => !sc.ids.includes(id) || id === st.me)) bad('info ids 오류');
    }
    if (a === 'timeout') return;
    const data = { ...conv(a, sc.ids), key: p.key };
    setTimeout(async () => {
      const r1 = await b.emit('nightAction', data);
      if (!r1.ok) return bad(`[${sc.name}] ${p.type}: ${r1.error}`);
      if (!Array.isArray(r1.reveal) || typeof r1.text !== 'string') bad(`[${sc.name}] ${p.type}: ack 모양 오류`);
      for (const rv of r1.reveal) {
        if (!(rv.at === 'p' && typeof rv.id === 'string' && rv.role) && !(rv.at === 'c' && Number.isInteger(rv.idx) && rv.role)) bad('reveal 모양 오류');
      }
      b.ackAt = Date.now();
      b.acks.push([p.type, r1]);
      const r2 = await b.emit('nightAction', data);     // 멱등: 같은 ack
      if (!isDeepStrictEqual(r1, r2)) bad(`[${sc.name}] ${p.type}: 재전송 ack 불일치`);
    }, 5);
  }
  if (st.phase === 'day') {
    const me = st.players.find((p) => p.id === st.me);
    if (!me.ready && !b._readySent) { b._readySent = true; setTimeout(() => b.s.emit('ready', { ready: true }), 10); }
  } else b._readySent = false;
  if (st.phase === 'vote' && !b._voteSent) {
    b._voteSent = true;
    if (sc.vote === null || sc.vote === undefined) return;
    setTimeout(async () => {
      const r1 = await b.emit('vote', { target: sc.ids[sc.vote] });
      if (!r1.ok) return bad(`[${sc.name}] vote: ${r1.error}`);
      const r2 = await b.emit('vote', { target: sc.ids[sc.vote] });
      if (!isDeepStrictEqual(r1, r2)) bad(`[${sc.name}] vote 재전송 ack 불일치`);
    }, 10);
  } else if (st.phase !== 'vote') b._voteSent = false;
}

function waitPhase(bots, phase, timeout = 20000) {
  const t0 = Date.now();
  return (async () => {
    while (Date.now() - t0 < timeout) {
      if (bots.every((b) => b.state && b.state.phase === phase)) return;
      await sleep(20);
    }
    throw new Error(`phase ${phase} 대기 시간 초과 (현재: ${bots.map((b) => b.state?.phase).join(',')})`);
  })();
}

// ---------- 결과 검사 ----------
function checkResult(r, deck) {
  // 카드 보존: 처음 카드 + 가운데 = 최종 카드 + 가운데
  const count = (arr) => arr.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
  const a = count([...r.players.map((p) => p.original), ...r.center.original]);
  const b = count([...r.players.map((p) => p.final), ...r.center.final]);
  for (const k of WW.ROLE_ORDER) {
    if ((a[k] || 0) !== (deck[k] || 0)) throw new Error(`처음 카드 수 불일치: ${k}`);
    if ((b[k] || 0) !== (deck[k] || 0)) throw new Error(`최종 카드 수 불일치: ${k}`);
  }
  // 승패 일관성
  const wolves = r.players.filter((p) => p.effective === 'werewolf');
  const deadWolf = wolves.some((p) => p.dead);
  if (wolves.length && r.players.filter((p) => p.team === 'village').some((p) => p.win !== deadWolf)) throw new Error('마을 팀 승패 오류');
  const maxVotes = Math.max(...r.players.map((p) => p.votes));
  if (maxVotes <= 1 && r.hunterKills.length === 0 && r.players.some((p) => p.dead)) throw new Error('1표 이하인데 사망자 발생');
  if (!Array.isArray(r.timeline) || r.timeline.length !== 0) throw new Error('호환 timeline 은 빈 배열이어야 한다');
  if (!Array.isArray(r.hunterKills)) throw new Error('호환 hunterKills 없음');
}

// spec 13.11 서버 정합성 ①~⑧ (⑨는 staticChecks)
const EV_KEYS = new Set(['st', 'r', 'k', 'by', 'dop', 'tg', 'see', 'know', 'mv', 'auto']);
const EV_KINDS = new Set(['copy', 'know', 'peek', 'swap', 'skip', 'idle']);
function checkNight(r, deck) {
  const N = r.night;
  assert(N && Array.isArray(N.deal) && Array.isArray(N.ev) && Array.isArray(N.end), 'night 없음');
  const n = r.players.length;
  assert(N.deal.length === n + 3 && N.end.length === n + 3, 'deal/end 길이');
  assert(N.ev.length <= 20, `ev ${N.ev.length} > 20`);                                     // ⑤
  for (let s = 0; s < n; s++) assert(N.deal[s] === r.players[s].original, `deal[${s}] != original`);
  for (let i = 0; i < 3; i++) assert(N.deal[n + i] === r.center.original[i], 'deal 제단 != center.original');

  // ② deal 에 mv 를 순서대로 적용한 결과 === end. see 는 그 순간의 위치와 맞아야 한다.
  const pos = N.deal.map((_, i) => i);
  let lastOrd = -1;
  for (const e of N.ev) {
    for (const key of Object.keys(e)) assert(EV_KEYS.has(key), `ev 알 수 없는 키 ${key}`);
    assert(WW.NIGHT_ORDER.includes(e.st), `st ${e.st}`);                                   // ⑦
    const ord = WW.NIGHT_ORDER.indexOf(e.st);
    assert(ord >= lastOrd, 'ev 차례 순서');
    lastOrd = ord;
    assert(EV_KINDS.has(e.k), `k ${e.k}`);
    if (e.r !== undefined) assert(e.r !== e.st && WW.ROLES[e.r] && e.r !== 'lonewolf', `r ${e.r}`);  // ⑦ + 'r 생략' 규칙
    assert(Array.isArray(e.by) && e.by.every((s) => Number.isInteger(s) && s >= 0 && s < n), 'by');
    if (e.dop !== undefined) {                                                             // ⑧
      assert(e.dop.length > 0, 'dop 가 비었다');
      assert(e.dop.every((s) => e.by.includes(s) && N.deal[s] === 'doppelganger'), 'dop');
    } else assert(!e.by.some((s) => N.deal[s] === 'doppelganger'), 'dop 누락');
    if (e.mv) {
      assert(e.mv.length === 2, 'mv 길이');
      const [[c1, b], [c2, a]] = e.mv;
      assert(pos[a] === c1 && pos[b] === c2, 'mv 출발지 불일치');
      pos[b] = c1; pos[a] = c2;
    }
    for (const [c, slot] of e.see || []) assert(pos[slot] === c, `see 불일치 ${c}@${slot}`);
    if (e.k === 'idle') assert(e.by.length === 0, 'idle by');
    if (e.k === 'skip') assert(e.by.length === 1, 'skip by');
  }
  assert(isDeepStrictEqual(pos, N.end), `mv 적용 결과 != end (${pos} / ${N.end})`);
  for (let s = 0; s < n; s++) assert(N.deal[N.end[s]] === r.players[s].final, `end 좌석 ${s}`);    // ③
  for (let i = 0; i < 3; i++) assert(N.deal[N.end[n + i]] === r.center.final[i], `end 제단 ${i}`);
  // 덱의 모든 밤 역할은 정확히 한 번 이상 차례가 있다
  for (const role of WW.NIGHT_ORDER) {
    if (deck[role] > 0) assert(N.ev.some((e) => e.st === role), `차례 기록 없음: ${role}`);
    else assert(!N.ev.some((e) => e.st === role), `없는 역할의 차례: ${role}`);
  }
  // 도플갱어 복사 역할 === doppelCopy
  const copyEv = N.ev.find((e) => e.k === 'copy');
  if (copyEv) assert(N.deal[copyEv.see[0][0]] === r.doppelCopy, 'copy 역할 != doppelCopy');
  else assert(!r.doppelCopy, 'copy 이벤트 없는데 doppelCopy');

  // ④ deaths 순서 = 사냥꾼 큐 순서, miss 는 dead 에 영향 없음
  const maxv = Math.max(...r.players.map((p) => p.votes));
  const voteDead = maxv > 1 ? r.players.map((p, i) => (p.votes === maxv ? i : -1)).filter((i) => i >= 0) : [];
  const exp = voteDead.map((s) => ({ s, by: 'vote' }));
  const dead = new Set(voteDead);
  const queue = [...voteDead];
  while (queue.length) {
    const d = queue.shift();
    if (r.players[d].effective !== 'hunter') continue;
    const v = r.players[d].vote;
    const t = v ? r.players.findIndex((p) => p.id === v) : -1;
    if (t >= 0 && !dead.has(t)) { dead.add(t); queue.push(t); exp.push({ s: t, by: 'hunter', h: d }); }
    else exp.push({ s: t, by: 'miss', h: d });
  }
  assert(isDeepStrictEqual(r.deaths, exp), `deaths 불일치 ${JSON.stringify(r.deaths)} / ${JSON.stringify(exp)}`);
  r.players.forEach((p, i) => assert(p.dead === dead.has(i), `dead 플래그 ${i}`));
  assert(r.noDeath === (dead.size === 0), 'noDeath');
  assert(r.hunterKills.length === r.deaths.filter((d) => d.by === 'hunter').length, 'hunterKills 개수');

  // ⑥ why ↔ winners
  const w = new Set(r.winners), codes = r.why.map((x) => x[0]);
  const has = (c) => codes.includes(c);
  assert(r.why.length >= 1, 'why 비었다');
  for (const [c, seats] of r.why) {
    if (seats !== undefined) assert(Array.isArray(seats) && seats.every((s) => Number.isInteger(s) && s >= 0 && s < n), `why 좌석 ${c}`);
  }
  if (has('wolf_died')) assert(w.has('village') && !w.has('wolf'), 'wolf_died');
  if (has('tanner_too')) assert(w.has('tanner') && w.has('village'), 'tanner_too');
  if (has('wolf_lived')) assert(w.has('wolf') && !w.has('village'), 'wolf_lived');
  if (has('tanner_blocked')) assert(w.has('tanner') && !w.has('wolf') && !w.has('village'), 'tanner_blocked');
  if (has('wolf_center') || has('wolf_none')) assert(r.wolvesInPlay === 0 && !has('wolf_died') && !has('wolf_lived'), 'wolf_center/none');
  if (has('wolf_center')) assert(N.deal.includes('werewolf'), 'wolf_center');
  if (has('wolf_none')) assert(!N.deal.includes('werewolf'), 'wolf_none');
  if (has('no_death')) assert(w.has('village') && !w.has('wolf') && r.noDeath, 'no_death');
  if (has('no_wolf_tanner')) assert(w.has('tanner') && !w.has('village') && !w.has('wolf'), 'no_wolf_tanner');
  if (has('minion_only_died')) assert(w.has('village') && !w.has('wolf'), 'minion_only_died');
  if (has('minion_lived')) assert(w.has('wolf') && !w.has('village'), 'minion_lived');
  if (has('innocent_died')) assert(!w.has('wolf') && !w.has('village'), 'innocent_died');
  if (r.wolvesInPlay > 0) assert(has('wolf_died') || has('wolf_lived') || has('tanner_blocked'), 'wolf why 없음');
  else assert(has('wolf_center') || has('wolf_none'), 'no-wolf why 없음');
  for (const t of w) assert(['village', 'wolf', 'tanner'].includes(t), 'winner');
}

// ---------- 시나리오 ----------
const DG = 'doppelganger', WF = 'werewolf', MI = 'minion', MA = 'mason', SE = 'seer', RO = 'robber',
  TR = 'troublemaker', DR = 'drunk', IN = 'insomniac', VI = 'villager', HU = 'hunter', TA = 'tanner';
const SC = [];
function sc(name, deal, acts, votes, extra = {}) { SC.push({ name, deal, acts, votes, ...extra }); }

// F2: 불면증환자 프롬프트 reveal, 강도 reveal.from, 카드를 본 뒤 VIEW_HOLD(10초 x TIME_SCALE) 동안 단계가 끝나지 않음
sc('f2-reveal', [SE, RO, IN, WF, VI, VI], { 0: { seer: { player: 1 } }, 1: { robber: { player: 2 } } }, [1, 0, 0], {
  expect: (r, bots) => {
    const ids = bots.map((b) => b.sid);
    const rb = bots[1].acks.find((a) => a[0] === 'robber');
    assert(rb && rb[1].reveal[0].from === ids[2] && rb[1].reveal[0].id === ids[1] && rb[1].reveal[0].role === IN, 'robber reveal.from');
    const ip = bots[2].insoPrompt;
    assert(ip && isDeepStrictEqual(ip.reveal, [{ at: 'p', id: ids[2], role: RO }]), 'insomniac prompt reveal');
    const st = bots[0].state, si = st.steps.indexOf('seer'), nxt = bots[0].stepSeen[si + 1];
    const hold = 10000 * Number(process.env.TIME_SCALE);
    assert(nxt !== undefined && nxt - bots[0].ackAt >= hold * 0.9, 'VIEW_HOLD 보장: ' + (nxt - bots[0].ackAt) + 'ms < ' + hold);
  },
});
sc('min-3', [WF, SE, RO, WF, TR, VI], { 0: { lonewolf: { center: 0 } }, 1: { seer: { player: 0 } }, 2: { robber: { player: 1 } } }, [1, 0, 0]);
sc('full-10', [DG, WF, MI, MA, MA, SE, RO, TR, DR, IN, HU, TA, VI], {
  0: { doppelganger: { player: 5 }, seer: { player: 2 } }, 1: { lonewolf: { center: 1 } }, 5: { seer: { centers: [0, 2] } },
  6: { robber: { player: 3 } }, 7: { troublemaker: { players: [1, 9] } }, 8: { drunk: { center: 2 } },
}, [1, 2, 1, 1, 1, 1, 1, 1, 1, 1], {
  expect: (r) => {
    const sts = new Set(r.night.ev.map((e) => e.st));
    for (const role of WW.NIGHT_ORDER) assert(sts.has(role), `full-10: ${role} 차례 없음`);
    assert(r.night.ev.filter((e) => e.st === 'doppelganger').length === 2, 'full-10: 도플갱어 2박');
  },
});
sc('doppel-seer', [DG, SE, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 1 }, seer: { player: 2 } }, 1: { seer: { centers: [0, 1] } }, 2: { lonewolf: { skip: true } } }, [2, 2, 0, 2], {
  expect: (r) => {
    const e = r.night.ev;
    assert(e[0].k === 'copy' && e[1].st === 'doppelganger' && e[1].r === 'seer' && e[1].k === 'peek' && isDeepStrictEqual(e[1].dop, [0]), 'doppel-seer 이벤트');
  },
});
sc('doppel-robber', [DG, RO, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 1 }, robber: { player: 3 } }, 1: { robber: { player: 0 } }, 2: { lonewolf: { center: 1 } } }, [2, 2, 1, 2], {
  expect: (r) => assert(r.night.ev[1].st === 'doppelganger' && r.night.ev[1].r === 'robber' && r.night.ev[1].k === 'swap', 'doppel-robber'),
});
sc('doppel-tm', [DG, TR, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 1 }, troublemaker: { players: [2, 3] } }, 1: { troublemaker: { players: [0, 2] } }, 2: { lonewolf: { center: 0 } } }, [2, 3, 0, 0], {
  expect: (r) => assert(r.night.ev[1].r === 'troublemaker' && !r.night.ev[1].see, 'doppel-tm'),
});
sc('doppel-drunk', [DG, DR, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 1 }, drunk: { center: 0 } }, 1: { drunk: { center: 1 } }, 2: { lonewolf: { center: 2 } } }, [2, 2, 0, 2], {
  expect: (r) => assert(r.night.ev[1].r === 'drunk' && r.night.ev[1].tg[0] === 4, 'doppel-drunk'),
});
sc('doppel-wolf', [DG, WF, VI, VI, SE, RO, TR], { 0: { doppelganger: { player: 1 } } }, [1, 0, 0, 0], {
  expect: (r) => { const k = r.night.ev.find((e) => e.st === 'werewolf'); assert(k.k === 'know' && isDeepStrictEqual(k.by, [0, 1]) && isDeepStrictEqual(k.dop, [0]), 'doppel-wolf'); },
});
sc('doppel-minion', [DG, MI, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 1 } }, 2: { lonewolf: { center: 0 } } }, [2, 2, 0, 2], {
  expect: (r) => { const k = r.night.ev.find((e) => e.st === 'minion'); assert(isDeepStrictEqual(k.by, [0, 1]) && isDeepStrictEqual(k.know, [2]), 'doppel-minion'); },
});
sc('doppel-insomniac', [DG, IN, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 1 } }, 2: { lonewolf: { center: 0 } } }, [2, 2, 0, 2], {
  expect: (r) => { const k = r.night.ev.find((e) => e.st === 'insomniac'); assert(k.k === 'peek' && isDeepStrictEqual(k.by, [0, 1]) && k.see.length === 2, 'doppel-insomniac'); },
});
// 주의: 도플갱어가 복사한 사람은 원래 그 역할로 함께 깨므로, 도플갱어 혼자 깨는 경우는 규칙상 나올 수 없다.
// 이 둘은 "다른 쪽 카드는 제단에 있는" 가장 가까운 상황(도플갱어 + 복사당한 한 명 = 둘)으로 고정한다.
sc('doppel-lone-wolf', [DG, WF, VI, VI, WF, SE, VI], { 0: { doppelganger: { player: 1 } } }, [1, 0, 0, 0], {
  expect: (r) => { const k = r.night.ev.find((e) => e.st === 'werewolf'); assert(k.k === 'know' && isDeepStrictEqual(k.by, [0, 1]), 'doppel-lone-wolf'); },
});
sc('doppel-mason-alone', [DG, MA, VI, VI, MA, SE, VI], { 0: { doppelganger: { player: 1 } } }, [1, 0, 0, 0], {
  expect: (r) => { const k = r.night.ev.find((e) => e.st === 'mason'); assert(k.k === 'know' && isDeepStrictEqual(k.by, [0, 1]), 'doppel-mason-alone'); },
});
sc('doppel-hunter-chain', [DG, HU, VI, WF, VI, SE, TR], { 0: { doppelganger: { player: 1 } }, 3: { lonewolf: { center: 2 } } }, [3, 0, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.deaths, [{ s: 0, by: 'vote' }, { s: 3, by: 'hunter', h: 0 }]) && r.players[0].effective === 'hunter', 'doppel-hunter-chain'),
});
sc('doppel-card-moved', [WF, SE, DG, RO, TR, WF, DR, IN], {
  2: { doppelganger: { player: 0 } }, 1: { seer: { centers: [0, 2] } }, 3: { robber: { player: 0 } }, 4: { troublemaker: { players: [1, 2] } },
}, [3, 3, 0, 0, 3], {
  expect: (r) => {
    const want = {
      deal: ['werewolf', 'seer', 'doppelganger', 'robber', 'troublemaker', 'werewolf', 'drunk', 'insomniac'],
      ev: [
        { st: 'doppelganger', k: 'copy', by: [2], tg: [0], see: [[0, 0]], dop: [2] },
        { st: 'werewolf', k: 'know', by: [0, 2], dop: [2] },
        { st: 'seer', k: 'peek', by: [1], tg: [5, 7], see: [[5, 5], [7, 7]] },
        { st: 'robber', k: 'swap', by: [3], tg: [0], mv: [[3, 0], [0, 3]], see: [[0, 3]] },
        { st: 'troublemaker', k: 'swap', by: [4], tg: [1, 2], mv: [[1, 2], [2, 1]] },
        { st: 'drunk', k: 'idle', by: [] },
        { st: 'insomniac', k: 'idle', by: [] },
      ],
      end: [3, 2, 1, 0, 4, 5, 6, 7],
    };
    assert(isDeepStrictEqual(r.night, want), 'spec 13.3 예시와 night 가 다르다: ' + JSON.stringify(r.night));
    assert(isDeepStrictEqual(r.why, [['wolf_died', [3]]]) && isDeepStrictEqual(r.deaths, [{ s: 3, by: 'vote' }]), 'doppel-card-moved why/deaths');
    assert(r.players[1].final === 'doppelganger' && r.players[1].effective === 'werewolf', 'doppel-card-moved 서연');
  },
});
// 도플갱어-말썽쟁이는 자기를 고를 수 없으므로, 진짜 말썽쟁이가 도플갱어 카드를 포함해 바꾼다.
sc('doppel-troublemaker-swaps-self-card', [DG, TR, VI, WF, WF, VI, VI], { 0: { doppelganger: { player: 1 }, troublemaker: { players: [2, 3] } }, 1: { troublemaker: { players: [0, 2] } }, 3: { lonewolf: { center: 0 } } }, [3, 3, 3, 0]);
sc('doppel-robber-steals-wolf', [DG, RO, WF, WF, VI, VI, VI], { 0: { doppelganger: { player: 1 }, robber: { player: 2 } }, 1: { robber: { player: 3 } } }, [2, 2, 0, 0], {
  expect: (r) => {
    const k = r.night.ev.find((e) => e.st === 'werewolf');
    assert(k.k === 'know' && isDeepStrictEqual(k.by, [2, 3]), '늑대 차례 by 는 처음 늑대인 [2,3]');
    assert(r.night.deal[r.night.end[0]] === 'werewolf', '도플갱어-강도 좌석이 늑대 패를 쥐었다');
  },
});
sc('doppel-drunk-pulls-idle-role', [DG, DR, VI, VI, SE, WF, WF], { 0: { doppelganger: { player: 1 }, drunk: { center: 0 } }, 1: { drunk: { center: 1 } } }, [2, 2, 0, 0], {
  expect: (r) => { const k = r.night.ev.find((e) => e.st === 'seer'); assert(k.k === 'idle', 'seer idle'); assert(r.night.deal[r.night.end[0]] === 'seer', '도플갱어-주정뱅이가 예언자 패를 쥐었다'); },
});
sc('doppel-seer-timeout', [DG, SE, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 1 }, seer: 'timeout' }, 1: { seer: { player: 3 } }, 2: { lonewolf: { skip: true } } }, [2, 2, 0, 2], {
  expect: (r) => assert(isDeepStrictEqual(r.night.ev[1], { st: 'doppelganger', r: 'seer', k: 'skip', by: [0], auto: 1, dop: [0] }), 'doppel-seer-timeout ' + JSON.stringify(r.night.ev[1])),
});
sc('robber-steals-doppel', [DG, RO, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 2 } }, 1: { robber: { player: 0 } } }, [1, 0, 0, 0], {
  expect: (r) => assert(r.players[1].final === 'doppelganger' && r.players[1].effective === 'werewolf', 'robber-steals-doppel'),
});
sc('seer-sees-doppel-card', [DG, SE, WF, VI, WF, VI, VI], { 0: { doppelganger: { player: 3 } }, 1: { seer: { player: 0 } }, 2: { lonewolf: { center: 0 } } }, [2, 2, 0, 2]);
sc('insomniac-received-doppel-card', [DG, TR, IN, WF, VI, VI, WF], { 0: { doppelganger: { player: 3 } }, 1: { troublemaker: { players: [0, 2] } } }, [3, 3, 3, 0], {
  expect: (r) => { const k = r.night.ev.find((e) => e.st === 'insomniac'); assert(isDeepStrictEqual(k.by, [2]) && r.night.deal[k.see[0][0]] === 'doppelganger', 'insomniac-received-doppel-card'); },
});
sc('drunk-takes-insomniac', [DR, WF, VI, IN, WF, VI], { 0: { drunk: { center: 0 } }, 1: { lonewolf: { center: 2 } } }, [1, 0, 0], {
  expect: (r) => assert(r.night.ev.find((e) => e.st === 'insomniac').k === 'idle' && r.night.deal[r.night.end[0]] === 'insomniac', 'drunk-takes-insomniac'),
});
sc('lone-wolf-peek', [WF, SE, VI, WF, VI, VI], { 0: { lonewolf: { center: 2 } }, 1: { seer: { player: 2 } } }, [1, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.night.ev[0], { st: 'werewolf', k: 'peek', by: [0], tg: [5], see: [[5, 5]] }), 'lone-wolf-peek ' + JSON.stringify(r.night.ev[0])),
});
sc('lone-wolf-skip', [WF, SE, VI, WF, VI, VI], { 0: { lonewolf: { skip: true } }, 1: { seer: { player: 2 } } }, [1, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.night.ev[0], { st: 'werewolf', k: 'skip', by: [0] }), 'lone-wolf-skip'),
});
sc('lone-wolf-timeout', [WF, SE, VI, WF, VI, VI], { 0: { lonewolf: 'timeout' }, 1: { seer: { player: 2 } } }, [1, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.night.ev[0], { st: 'werewolf', k: 'skip', by: [0], auto: 1 }), 'lone-wolf-timeout ' + JSON.stringify(r.night.ev[0])),
});
const SK = [SE, RO, TR, WF, WF, VI, VI];
sc('deliberate-skip-seer', SK, { 0: { seer: { skip: true } }, 1: { robber: { player: 3 } }, 2: { troublemaker: { players: [0, 3] } }, 3: { lonewolf: { center: 0 } } }, [3, 3, 3, 0], {
  expect: (r) => assert(r.night.ev.some((e) => e.st === 'seer' && e.k === 'skip' && !e.auto), 'deliberate-skip-seer'),
});
sc('deliberate-skip-robber', SK, { 0: { seer: { player: 1 } }, 1: { robber: { skip: true } }, 2: { troublemaker: { players: [0, 3] } }, 3: { lonewolf: { center: 0 } } }, [3, 3, 3, 0], {
  expect: (r) => assert(r.night.ev.some((e) => e.st === 'robber' && e.k === 'skip' && !e.auto), 'deliberate-skip-robber'),
});
sc('deliberate-skip-tm', SK, { 0: { seer: { player: 1 } }, 1: { robber: { player: 3 } }, 2: { troublemaker: { skip: true } }, 3: { lonewolf: { center: 0 } } }, [3, 3, 3, 0], {
  expect: (r) => assert(r.night.ev.some((e) => e.st === 'troublemaker' && e.k === 'skip' && !e.auto), 'deliberate-skip-tm'),
});
sc('minion-no-wolf', [MI, VI, SE, WF, WF, VI], { 2: { seer: { player: 1 } } }, [1, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.night.ev.find((e) => e.st === 'minion').know, []), 'minion-no-wolf'),
});
sc('all-idle', [VI, HU, TA, SE, WF, RO], {}, [1, 2, 0], {
  expect: (r) => assert(r.night.ev.length === 3 && r.night.ev.every((e) => e.k === 'idle'), 'all-idle'),
});
sc('all-timeout', [DG, WF, SE, RO, TR, DR, WF, IN, VI], {}, [1, 2, 3, 4, 5, 0], {
  expect: (r) => {
    assert(r.night.ev.every((e) => e.auto || e.k === 'idle' || e.k === 'know'), 'all-timeout: 모든 행동 이벤트는 auto');
    assert(r.night.ev.some((e) => e.k === 'copy' && e.auto) && r.night.ev.some((e) => e.st === 'drunk' && e.auto), 'all-timeout: 도플갱어·주정뱅이 auto');
  },
});
sc('hunter-chain-2', [DG, HU, VI, VI, WF, SE, TR, VI], { 0: { doppelganger: { player: 1 } }, 4: { lonewolf: { center: 0 } } }, [1, 4, 0, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.deaths, [{ s: 0, by: 'vote' }, { s: 1, by: 'hunter', h: 0 }, { s: 4, by: 'hunter', h: 1 }]), 'hunter-chain-2 ' + JSON.stringify(r.deaths)),
});
const HM = [HU, VI, VI, WF, WF, VI, SE];
sc('hunter-miss', HM, { 3: { lonewolf: { center: 2 } } }, [1, 0, 0, 1], {
  expect: (r) => assert(isDeepStrictEqual(r.deaths, [{ s: 0, by: 'vote' }, { s: 1, by: 'vote' }, { s: 1, by: 'miss', h: 0 }]), 'hunter-miss ' + JSON.stringify(r.deaths)),
});
sc('hunter-no-vote', HM, { 3: { lonewolf: { center: 2 } } }, [null, 0, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.deaths, [{ s: 0, by: 'vote' }, { s: -1, by: 'miss', h: 0 }]), 'hunter-no-vote ' + JSON.stringify(r.deaths)),
});
sc('tie-death', [VI, VI, WF, VI, WF, SE, TR], { 2: { lonewolf: { center: 0 } } }, [1, 0, 1, 0], {
  expect: (r) => assert(r.players.filter((p) => p.dead).length === 2, 'tie-death'),
});
sc('tanner-blocked', [TA, VI, WF, VI, WF, SE, RO], { 2: { lonewolf: { center: 0 } } }, [2, 0, 0, 0], {
  expect: (r) => assert(r.why[0][0] === 'tanner_blocked' && r.winners.join() === 'tanner', 'tanner-blocked ' + JSON.stringify(r.why) + r.winners),
});
sc('no-wolf-no-death', [VI, SE, RO, WF, WF, VI], { 1: { seer: { player: 0 } }, 2: { robber: { skip: true } } }, [1, 2, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.why, [['wolf_center'], ['no_death']]), 'no-wolf-no-death'),
});
sc('no-wolf-in-deck', [VI, SE, RO, VI, VI, TR], { 1: { seer: { player: 0 } }, 2: { robber: { player: 0 } } }, [1, 2, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.why, [['wolf_none'], ['no_death']]), 'no-wolf-in-deck'),
});
sc('no-wolf-tanner', [TA, VI, SE, WF, WF, VI], { 2: { seer: { player: 1 } } }, [1, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.why, [['wolf_center'], ['no_wolf_tanner', [0]]]), 'no-wolf-tanner'),
});
sc('minion-only', [MI, VI, SE, WF, WF, VI], { 2: { seer: { player: 1 } } }, [1, 0, 0], {
  expect: (r) => assert(r.why[1][0] === 'minion_only_died' && r.winners.join() === 'village', 'minion-only'),
});
sc('minion-lived', [MI, VI, SE, WF, WF, VI], { 2: { seer: { player: 1 } } }, [1, 0, 1], {
  expect: (r) => assert(r.why[1][0] === 'minion_lived' && r.winners.join() === 'wolf', 'minion-lived'),
});
sc('no-wolf-innocent', [VI, VI, SE, WF, WF, VI], { 2: { seer: { player: 1 } } }, [1, 0, 0], {
  expect: (r) => assert(isDeepStrictEqual(r.why, [['wolf_center'], ['innocent_died']]), 'no-wolf-innocent'),
});
sc('leave-mid-replay', [VI, SE, WF, VI, WF, VI, TR], { 1: { seer: { player: 0 } }, 2: { lonewolf: { center: 0 } } }, [2, 2, 0, 2], {
  leave: 3,
});
const LONG = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차'].map((c) => c.repeat(12));
sc('max-bytes', [DG, WF, MI, MA, MA, SE, RO, TR, DR, IN, HU, TA, VI], {
  0: { doppelganger: { player: 5 }, seer: { player: 2 } }, 1: { lonewolf: { center: 1 } }, 5: { seer: { centers: [0, 2] } },
  6: { robber: { player: 3 } }, 7: { troublemaker: { players: [1, 9] } }, 8: { drunk: { center: 2 } },
}, [1, 2, 1, 1, 1, 1, 1, 1, 1, 1], { names: LONG, longIds: true });

const sorted = (o) => JSON.parse(JSON.stringify(o));

async function runScenario(s) {
  const n = s.deal.length - 3;
  const bots = Array.from({ length: n }, (_, i) => bot(s.names ? s.names[i] : `봇${i + 1}`,
    s.longIds ? `${'abcdefghijklmnopqrstuvwxyz0123456789'.slice(0, 30)}-${String(i).padStart(5, '0')}` : undefined));
  try {
    await sleep(100);
    const ids = bots.map((b) => b.sid);
    bots.forEach((b, i) => { b.acks = []; b.script = { name: s.name, seat: i, acts: s.acts[i] || {}, vote: s.votes[i], ids }; });
    const host = bots[0];
    const c = await host.emit('create', { name: host.name, playerId: host.pid });
    if (!c.ok) throw new Error(c.error);
    for (const b of bots.slice(1)) {
      const r = await b.emit('join', { code: c.code, name: b.name, playerId: b.pid });
      if (!r.ok) throw new Error(r.error);
    }
    const deck = {};
    for (const r of WW.ROLE_ORDER) deck[r] = s.deal.filter((x) => x === r).length;
    for (const r of WW.ROLE_ORDER) host.s.emit('setDeck', { role: r, count: deck[r] });
    _test.deals.set(host.sid, s.deal);
    const st = await host.emit('start');
    if (!st.ok) throw new Error(`start: ${st.error}`);
    const again = await host.emit('start');          // 멱등
    if (!again.ok) throw new Error('start 재전송이 같은 ack 가 아니다');
    await waitPhase(bots, 'result', 40000);
    const r = host.state.result;
    await sleep(80);
    { const el = host.chats.filter((m) => m.system && m.kind === 'end'); if (el.length !== 1) throw new Error('endLine 채팅에 kind:end 가 정확히 한 번 있어야 한다: ' + el.length); }
    for (const b of bots) if (!isDeepStrictEqual(b.state.result, r)) throw new Error('플레이어마다 결과가 다르다');
    for (const b of bots) if (b.gameIds.size !== 1) throw new Error(`gameId 가 판 안에서 바뀌었다 ${[...b.gameIds]}`);
    checkResult(r, host.state.gameDeck);
    checkNight(r, host.state.gameDeck);
    if (s.expect) s.expect(r, bots);

    // 개인 정보 누출 스모크: 내 myLog 의 reveal 이 다른 사람의 처음 패를 새로 알려주지 않는다 (id 는 방 안의 사람)
    for (const b of bots) for (const e of b.state.myLog) for (const rv of e.reveal) if (rv.at === 'p' && !ids.includes(rv.id)) bad('reveal id 가 방에 없다');

    const extra = {};
    if (s.leave !== undefined) {
      const leaver = bots[s.leave];
      await leaver.emit('leave');
      await sleep(150);
      const hs = host.state;
      if (hs.players.length !== n - 1) throw new Error('leave 후 state.players 감소 안 함');
      if (hs.result.players.length !== n) throw new Error('leave 후 result.players 가 줄었다');
      if (!isDeepStrictEqual(hs.result, r)) throw new Error('leave 후 result 가 바뀌었다');
      extra.leave = { id: leaver.sid, seat: s.leave, statePlayers: hs.players.map((p) => p.id) };
    }
    if (s.longIds) {
      const sizes = bots.map((b) => Buffer.byteLength(JSON.stringify(b.state)));
      extra.sizes = { max: Math.max(...sizes), night: Buffer.byteLength(JSON.stringify(r.night)) };
    }
    fs.mkdirSync(FIXDIR, { recursive: true });
    const me = s.me ?? 0;
    fs.writeFileSync(path.join(FIXDIR, `night-${s.name}.json`), JSON.stringify({
      name: s.name, n, meSeat: me, meId: ids[me], ...extra, result: sorted(r),
    }, null, 1));
    if (extra.sizes && (extra.sizes.max > 6144 || extra.sizes.night > 1536)) throw new Error(`max-bytes 초과 ${JSON.stringify(extra.sizes)}`);
    return { name: s.name, bytes: extra.sizes };
  } finally {
    _test.deals.delete(bots[0].sid);
    bots.forEach((b) => b.s.close());
  }
}

// ---------- 무작위 판 ----------
async function playGame(n, deck) {
  const bots = Array.from({ length: n }, (_, i) => bot(`봇${i + 1}`));
  try {
    await sleep(200);
    const host = bots[0];
    const c = await host.emit('create', { name: host.name, playerId: host.pid });
    if (!c.ok) throw new Error(c.error);
    for (const b of bots.slice(1)) {
      const r = await b.emit('join', { code: c.code, name: b.name, playerId: b.pid });
      if (!r.ok) throw new Error(r.error);
    }
    await sleep(100);
    if (deck) for (const [role, count] of Object.entries(deck)) host.s.emit('setDeck', { role, count });
    await sleep(100);
    const st = await host.emit('start');
    if (!st.ok) throw new Error(st.error);

    // 다른 사람의 역할이 내 상태로 새지 않는지 확인 (키 패턴, spec 7.4)
    await waitPhase(bots, 'night');
    for (const b of bots) if (LEAK.test(JSON.stringify(b.state))) throw new Error('비밀 정보 노출');

    // 재접속 시험: 밤 중에 한 봇의 연결을 끊었다 다시 붙음
    const rb = bots[n - 1];
    rb.s.disconnect();
    await sleep(50);
    rb.s.connect();
    const rj = await rb.emit('join', { code: c.code, playerId: rb.pid, rejoin: true });
    if (!rj.ok) throw new Error('재접속 실패: ' + rj.error);

    await waitPhase(bots, 'result', 40000);
    const r = host.state.result;
    checkResult(r, host.state.gameDeck);
    checkNight(r, host.state.gameDeck);
    const night = bots.flatMap((b) => b.state.myLog);
    const gid = r.gameId;

    // 한 판 더 (새 gameId)
    host.s.emit('playAgain');
    await waitPhase(bots, 'lobby');
    if (bots.some((b) => b.state.result !== null || b.state.gameId !== null)) throw new Error('로비에 이전 판 정보가 남았다');
    return { n, r, night, gid };
  } finally {
    bots.forEach((b) => b.s.close());
  }
}

async function batches(tasks, size) {
  const out = [];
  for (let i = 0; i < tasks.length; i += size) out.push(...await Promise.all(tasks.slice(i, i + size).map((f) => f())));
  return out;
}

// ---------- F1: 채팅 mid / 답글 ----------
// ---------- 잘못된 페이로드 (프로세스가 죽지 않아야 한다) ----------
async function badPayloads() {
  const EVENTS = ['create', 'join', 'leave', 'kick', 'setDeck', 'preset', 'setSettings', 'start', 'nightAction', 'ready', 'forceVote', 'vote', 'playAgain', 'chat'];
  const PAYLOADS = [null, 0, 1, 'x', [], [1], true];
  const errs = [];
  const origErr = console.error;
  console.error = (...a) => { errs.push(a); };
  const socks = [];
  try {
    const witness = bot('증인');
    const wit2 = bot('증인2');
    socks.push(witness, wit2);
    await sleep(100);
    const wr = await witness.emit('create', { name: witness.name, playerId: witness.pid });
    assert(wr && wr.ok, '증인 방 생성');
    // 방 밖
    const outside = io(URL, { forceNew: true, transports: ['websocket'] });
    socks.push({ s: outside });
    await new Promise((r) => outside.on('connect', r));
    for (const ev of EVENTS) for (const p of PAYLOADS) outside.emit(ev, p);
    await sleep(150);
    // 방 안
    const inside = bot('난입');
    socks.push(inside);
    await sleep(100);
    const ir = await inside.emit('create', { name: inside.name, playerId: inside.pid });
    assert(ir && ir.ok, '난입 방 생성');
    for (const ev of EVENTS) for (const p of PAYLOADS) inside.s.emit(ev, p);
    await sleep(200);
    // 덮어쓰기 형태의 값 (프로토타입 오염 시도)
    inside.s.emit('setDeck', { role: '__proto__', count: 3 });
    inside.s.emit('setDeck', { role: 'constructor', count: 3 });
    inside.s.emit('join', { code: ['A'], name: ['b'], playerId: 'p' });
    inside.s.emit('create', { name: { toString: 1 }, playerId: 'p'.repeat(100) });
    await sleep(100);
    // 20KB 채팅: 연결이 끊기거나 버려져야 하고 서버는 멀쩡해야 한다
    const big = io(URL, { forceNew: true, transports: ['websocket'] });
    socks.push({ s: big });
    await new Promise((r) => big.on('connect', r));
    big.emit('chat', { text: 'x'.repeat(20000) });
    await sleep(300);
    assert(!big.connected, '20KB 페이로드는 연결을 끊는다 (maxHttpBufferSize)');
    // 살아 있는지
    const fresh = bot('새봇');
    socks.push(fresh);
    await sleep(100);
    const fr = await fresh.emit('create', { name: fresh.name, playerId: fresh.pid });
    assert(fr && fr.ok === true && fr.code, '잘못된 페이로드 뒤에도 방 생성');
    const before = witness.state;
    const jr = await wit2.emit('join', { code: wr.code, name: wit2.name, playerId: wit2.pid });
    assert(jr && jr.ok, '증인2 합류');
    await sleep(100);
    assert(witness.state && witness.state !== before && witness.state.players.length === 2, '원래 방이 계속 상태를 방송한다');
    const sockErrs = errs.filter((a) => String(a[0]).includes('[sock]') || String(a[0]).includes('[uncaught]'));
    assert(!sockErrs.length, '핸들러 예외 없음: ' + sockErrs.map((a) => String(a[1] && a[1].message)).join(' | '));
    console.log('  잘못된 페이로드 검사 통과');
  } finally {
    console.error = origErr;
    socks.forEach((x) => x.s.close());
  }
}

async function chatChecks() {
  const T = require('../public/strings.js');
  assert(T.msg && T.msg.newChief && T.replay && T.replay.hunt && T.replay.cause && T.replay.ui && T.replay.why, 'strings.js 서버 호환 (T.msg, T.replay 전체)');
  assert(T.body.bgmLv.length === 3 && T.btn.bgmOn && T.chat.reply, '새 문자열 키');
  const bots = Array.from({ length: 3 }, (_, i) => bot(`채팅${i + 1}`));
  try {
    await sleep(100);
    const [a, b, c] = bots;
    const cr = await a.emit('create', { name: a.name, playerId: a.pid });
    for (const x of [b, c]) await x.emit('join', { code: cr.code, name: x.name, playerId: x.pid });
    await sleep(100);
    const send = async (x, o) => { const w = 430 - (Date.now() - (x._t || 0)); if (w > 0) await sleep(w); x._t = Date.now(); x.s.emit('chat', o); await sleep(60); };
    const last = () => a.chats[a.chats.length - 1];
    await send(a, { text: '첫 메시지\n줄바꿈   포함' });
    const m1 = last();
    assert(m1.mid && !m1.re, 'mid 부여');
    const sys = a.chats.find((m) => m.system);
    assert(sys && sys.mid, '시스템 메시지에도 mid');
    await send(b, { text: '답글', re: m1.mid });
    assert(last().re && last().re.mid === m1.mid && last().re.name === a.name && last().re.t === '첫 메시지 줄바꿈 포함', '인용은 서버 원문(공백 정리)');
    // 잘못된 re 는 버리고 일반 메시지로
    let n = 0;
    for (const bad_ of ['12', -1, 0, 1.5, 99999, sys.mid, null, {}, [1]]) {
      await send([a, b, c][n++ % 3], { text: 'x' + n, re: bad_ });
      assert(last().text === 'x' + n && last().re === undefined, 're 검증: ' + JSON.stringify(bad_));
    }
    // 클라이언트가 보낸 인용 내용은 무시
    await send(c, { text: '위조', re: { mid: m1.mid, name: '가짜', t: '가짜' } });
    assert(last().text === '위조' && last().re === undefined, '객체 re 는 무시');
    await send(c, { text: '정상', re: m1.mid, name: '가짜', t: '가짜' });
    assert(last().re.name === a.name && last().re.t !== '가짜', '서버가 인용을 만든다');
    // 45자 + 서로게이트 쌍
    const long = '가'.repeat(38) + '𠀀𠀀𠀀𠀀𠀀' + '나';
    await send(a, { text: long });
    const lm = last();
    await send(b, { text: '긴 인용', re: lm.mid });
    const q = last().re.t, cp = Array.from(q);
    assert(cp.length === 41 && cp[40] === '…' && cp.slice(38, 40).join('') === '𠀀𠀀', '40자 + … (서로게이트 보존)');
    // 인용은 한 단계만
    await send(a, { text: '재인용', re: last().mid });
    assert(last().re.t === '긴 인용' && !('re' in last().re), '한 단계 인용');
    // mid 는 1부터 빠짐없이 증가
    const mids = a.chats.map((m) => m.mid);
    mids.forEach((v, i) => assert(v === mids[0] + i, 'mid 연속: ' + mids.join(',')));
    assert(mids[0] <= 3, 'mid 는 1부터 시작');
    // ack: 정상 / 너무 빠름 / cid 재전송 멱등 / 잘못된 re / 밤
    const ack = (x, o) => new Promise((r) => x.s.timeout(2000).emit('chat', o, (e, v) => r(e ? null : v)));
    await sleep(450);
    const a1 = await ack(b, { text: 'ack첫', cid: 'c1' });
    assert(a1 && a1.ok === true, '정상 전송은 ok:true: ' + JSON.stringify(a1));
    const a2 = await ack(b, { text: 'ack둘', cid: 'c2' });
    assert(a2 && a2.ok === false && a2.error === T.msg.chatFast, '400ms 안의 두 번째 전송은 chatFast: ' + JSON.stringify(a2));
    await sleep(450);
    const a3 = await ack(b, { text: 'ack첫', cid: 'c1' });
    assert(a3 && a3.ok === true, '같은 cid 재전송은 ok:true: ' + JSON.stringify(a3));
    await sleep(80);
    assert(a.chats.filter((m) => m.text === 'ack첫').length === 1, '같은 cid 는 한 번만 게시');
    assert(a.chats.find((m) => m.text === 'ack첫').cid === 'c1', '브로드캐스트 메시지에 보낸 사람의 cid 가 실린다');
    assert(!a.chats.some((m) => m.text === 'ack둘'), '거부된 메시지는 게시되지 않음');
    await sleep(450);
    const a4 = await ack(b, { text: 'ack답글', re: 99999 });
    assert(a4 && a4.ok === true && a4.reDropped === true, 're 99999 는 reDropped: ' + JSON.stringify(a4));
    await sleep(80);
    assert(last().text === 'ack답글' && last().re === undefined, 'reDropped 도 일반 메시지로 게시');
    await sleep(450);
    const a5 = await ack(b, { text: ['배열'] });
    assert(a5 && a5.ok === false && a5.error === T.msg.badRequest, '문자열이 아닌 text 는 거부: ' + JSON.stringify(a5));
    // 밤에는 re 가 붙은 메시지도 거부
    await a.emit('start');
    await waitPhase(bots, 'night');
    const cnt = a.chats.length;
    b.s.emit('chat', { text: '밤 채팅', re: 1 });
    await sleep(80);
    assert(!a.chats.slice(cnt).some((m) => m.text === '밤 채팅'), '밤 채팅 거부');
    const an = await ack(b, { text: '밤 ack' });
    assert(an && an.ok === false && an.error === T.msg.chatNight, '밤 채팅 ack 는 chatNight: ' + JSON.stringify(an));
    await waitPhase(bots, 'result', 40000);
    a.s.emit('playAgain');
    await waitPhase(bots, 'lobby');
    await send(b, { text: '로비 복귀 뒤' });
    assert(last().mid > mids[mids.length - 1], '로비 복귀 뒤에도 chatSeq 유지');
    console.log('  채팅 mid/답글 검사 통과');
  } finally {
    bots.forEach((x) => x.s.close());
  }
}

(async () => {
  try {
    staticChecks();
    console.log('기본 추천 구성으로 3~10명 게임:');
    const base = await batches([3, 4, 5, 6, 7, 8, 9, 10].map((n) => () => playGame(n)), 4);
    for (const { n, r, night } of base) {
      console.log(`  ${n}명 · 승리: ${r.winners.join(',') || '없음'} · 사망: ${r.players.filter((p) => p.dead).map((p) => `${p.name}(${WW.ROLES[p.effective].name})`).join(', ') || '없음'}`);
      console.log(`    기록 ${r.night.ev.length}건, 개인 정보 ${night.length}개`);
    }
    console.log('도플갱어/사냥꾼/무두장이 포함 구성 반복:');
    const deck5 = { werewolf: 1, minion: 0, seer: 1, robber: 1, troublemaker: 1, drunk: 0, insomniac: 1, doppelganger: 1, hunter: 1, tanner: 1, villager: 0 };
    const reps = await batches(Array.from({ length: 15 }, () => () => playGame(5, deck5)), 5);
    if (new Set(reps.map((x) => x.gid)).size !== reps.length) throw new Error('gameId 중복');
    console.log(`  ${reps.length}판 통과`);

    console.log(`시나리오 ${SC.length}개:`);
    const res = await batches(SC.map((s) => () => runScenario(s).then((x) => { console.log(`  ok ${s.name}${x.bytes ? ` (state 최대 ${x.bytes.max}B, night ${x.bytes.night}B)` : ''}`); return x; })), 6);
    console.log('잘못된 페이로드 검사:');
    await badPayloads();
    console.log('채팅 답글 검사:');
    await chatChecks();
    if (problems.length) throw new Error('문제 ' + problems.length + '건:\n  ' + [...new Set(problems)].slice(0, 20).join('\n  '));

    // W9 클라이언트 테스트가 있으면 함께 돌린다 (픽스처가 만들어진 뒤)
    const rp = path.join(__dirname, 'replay.js');
    if (fs.existsSync(rp)) {
      console.log('test/replay.js 실행:');
      const out = spawnSync(process.execPath, [rp], { stdio: 'inherit', cwd: ROOT });
      if (out.status !== 0) throw new Error('test/replay.js 실패 (exit ' + out.status + ')');
    } else console.log('test/replay.js 없음 - 건너뜀');

    console.log(`\n모든 시뮬레이션 통과 (픽스처 ${res.length}개: test/fixtures/night-*.json)`);
    process.exit(0);
  } catch (e) {
    console.error('\n실패:', e);
    if (problems.length) console.error('수집된 문제:\n  ' + [...new Set(problems)].slice(0, 20).join('\n  '));
    process.exit(1);
  } finally {
    server.close();
  }
})();
