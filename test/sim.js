// 봇 여러 명으로 전체 게임을 자동으로 돌려보는 테스트
// 실행: npm test
'use strict';
process.env.TIME_SCALE = '0.02';
process.env.PORT = process.env.PORT || '3999';
const { io } = require('socket.io-client');
const { server } = require('../server.js');
const WW = require('../public/roles.js');

const URL = `http://localhost:${process.env.PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function bot(name) {
  const s = io(URL, { forceNew: true, transports: ['websocket'] });
  const b = { name, s, pid: `bot-${name}-${Math.random()}`, state: null, chats: [] };
  s.on('state', (st) => { b.state = st; react(b); });
  s.on('chat', (m) => b.chats.push(m));
  b.emit = (ev, data) => new Promise((r) => s.emit(ev, data, r));
  return b;
}

const handled = new Set();
function react(b) {
  const st = b.state;
  if (st.phase === 'night' && st.prompt && !st.prompt.done) {
    const k = `${b.pid}:${st.prompt.key}`;
    if (handled.has(k)) return;
    handled.add(k);
    const others = st.players.filter((p) => p.id !== st.me).map((p) => p.id);
    const p = st.prompt;
    // 가끔은 아무것도 안 하고 시간 초과 처리도 시험
    if (Math.random() < 0.15) return;
    let data = {};
    if (p.type === 'doppelganger' || p.type === 'robber') data = { player: pick(others) };
    else if (p.type === 'seer') data = Math.random() < 0.5 ? { player: pick(others) } : { centers: [0, 2] };
    else if (p.type === 'troublemaker') data = { players: others.slice(0, 2) };
    else if (p.type === 'drunk' || p.type === 'lonewolf') data = { center: 1 };
    setTimeout(() => b.emit('nightAction', data).then((r) => { if (!r.ok) throw new Error(`${p.type}: ${r.error}`); }), 5);
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
}

async function playGame(n, deck) {
  const bots = Array.from({ length: n }, (_, i) => bot(`봇${i + 1}`));
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

  // 다른 사람의 역할이 내 상태로 새지 않는지 확인
  await waitPhase(bots, 'night');
  for (const b of bots) {
    const json = JSON.stringify(b.state);
    if (json.includes('"original"') || json.includes('"cards"') || json.includes('"center"')) throw new Error('비밀 정보 노출');
  }

  // 재접속 시험: 밤 중에 한 봇의 연결을 끊었다 다시 붙음
  const rb = bots[n - 1];
  rb.s.disconnect();
  await sleep(50);
  rb.s.connect();
  const rj = await rb.emit('join', { code: c.code, playerId: rb.pid, rejoin: true });
  if (!rj.ok) throw new Error('재접속 실패: ' + rj.error);

  await waitPhase(bots, 'result', 30000);
  const r = host.state.result;
  checkResult(r, host.state.gameDeck);
  const night = bots.flatMap((b) => b.state.myLog);
  console.log(`  ${n}명 · 승리: ${r.winners.join(',') || '없음'} · 사망: ${r.players.filter((p) => p.dead).map((p) => `${p.name}(${WW.ROLES[p.effective].name})`).join(', ') || '없음'}`);
  console.log(`    밤 기록 ${r.timeline.length}개, 개인 정보 ${night.length}개`);

  // 한 판 더
  host.s.emit('playAgain');
  await waitPhase(bots, 'lobby');
  bots.forEach((b) => b.s.close());
}

(async () => {
  try {
    console.log('기본 추천 구성으로 3~10명 게임:');
    for (let n = 3; n <= 10; n++) await playGame(n);
    console.log('도플갱어/사냥꾼/무두장이 포함 구성 반복:');
    for (let i = 0; i < 15; i++) {
      await playGame(5, { werewolf: 1, minion: 0, seer: 1, robber: 1, troublemaker: 1, drunk: 0, insomniac: 1, doppelganger: 1, hunter: 1, tanner: 1, villager: 0 });
    }
    console.log('\n✅ 모든 시뮬레이션 통과');
    process.exit(0);
  } catch (e) {
    console.error('\n❌ 실패:', e);
    process.exit(1);
  } finally {
    server.close();
  }
})();
