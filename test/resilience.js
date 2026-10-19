// 복원력 테스트: 서버를 띄우고 비정상 입력·재접속·폭주 상황을 확인한다.
// 실행: node test/resilience.js
'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = process.env.RES_PORT || String(3940 + Math.floor(Math.random() * 50));
const URL = `http://localhost:${PORT}`;
const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: { ...process.env, PORT, TIME_SCALE: '0.05', NODE_ENV: 'test', STATIC_ORIGIN: 'http://localhost:1' }, stdio: 'ignore',
});
const socks = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const conn = () => new Promise((res, rej) => {
  const s = io(URL, { forceNew: true, transports: ['websocket'], reconnection: false });
  s.frames = 0; s.last = null;
  s.on('state', (v) => { s.frames++; s.last = v; });
  s.on('connect', () => { socks.push(s); res(s); });
  s.on('connect_error', rej);
});
const emit = (s, ev, d) => new Promise((res) => {
  const t = setTimeout(() => res({ timeout: true }), 1500);
  s.emit(ev, d, (r) => { clearTimeout(t); res(r); });
});
const ok = (c, m) => { if (!c) throw new Error(m); };
async function waitServer() {
  for (let i = 0; i < 60; i++) { try { const s = await conn(); return s; } catch (e) { await sleep(150); } }
  throw new Error('서버가 뜨지 않음');
}

async function main() {
  const a = await waitServer();
  const r = await emit(a, 'create', { name: '방장', playerId: 'pa' });
  ok(r && r.ok, 'create 실패');
  const code = r.code;

  // 같은 소켓 create 두 번 (같은 playerId): 같은 방
  const r2 = await emit(a, 'create', { name: '방장', playerId: 'pa' });
  ok(r2.ok && r2.code === code, 'create 재시도는 같은 방');
  // 다른 playerId 로 한 번 더: 3초 제한 또는 이전 방 정리
  const r3 = await emit(a, 'create', { name: '방장', playerId: 'pa2' });
  ok(!r3.ok, 'create 연타 거절');
  await sleep(100);
  const b = await conn();
  const j = await emit(b, 'join', { code, name: '철수', playerId: 'pb' });
  ok(j.ok, 'join');
  // 동형 이름
  const c = await conn();
  const j2 = await emit(c, 'join', { code, name: '철수\u200b', playerId: 'pc' });
  ok(j2.ok, 'join2');
  await sleep(150);
  const names = c.last.players.map((p) => p.name);
  ok(names.includes('철수2'), '철수2 기대: ' + names.join(','));

  // 채팅: 보이지 않는 문자만
  const ch = await emit(b, 'chat', { text: '\u200b\u200b' });
  ok(ch && ch.ok === false, 'ZWSP 채팅 거절');

  // 잘못된 페이로드
  const bad = [null, undefined, [], 'x'.repeat(20000), { re: 'x' }, { count: '1e9' }, 5, { name: 'x'.repeat(20000), playerId: 'z' }];
  const evs = ['create', 'join', 'leave', 'kick', 'setDeck', 'preset', 'setSettings', 'start', 'nightAction', 'ready', 'forceVote', 'vote', 'playAgain', 'chat'];
  const d = await conn();
  for (const ev of evs) for (const p of bad) { d.emit(ev, p); await sleep(5); }
  await sleep(800);
  const live = await conn();
  const lj = await emit(live, 'join', { code, name: '확인', playerId: 'pl' });
  ok(lj.ok || lj.error, '악성 페이로드 뒤에도 응답');

  // 재접속: 같은 playerId 로 다시 join 해도 방 유지
  b.close();
  await sleep(200);
  const b2 = await conn();
  const rj = await emit(b2, 'join', { code, playerId: 'pb', rejoin: true });
  ok(rj.ok, 'rejoin');

  // ready 연타: 상태 프레임이 크게 줄어야 한다 (낮 단계가 아니면 무시되어도 통과)
  const burstS = await conn();
  const br = await emit(burstS, 'create', { name: '연타', playerId: 'pz' });
  ok(br.ok, 'create 연타용');
  await sleep(150);
  const before = burstS.frames;
  for (let i = 0; i < 50; i++) burstS.emit('ready', { ready: i % 2 === 0 });
  await sleep(500);
  ok(burstS.frames - before < 25, '프레임 폭주: ' + (burstS.frames - before));

  // 한 판: 낮 ready 연타 + 투표 중 끊김/재접속
  const mk = async () => {
    const s = await conn();
    s.on('state', (st) => {
      if (st.phase === 'night' && st.prompt && !st.prompt.done && st.prompt.type === 'info') s.emit('nightAction', { key: st.prompt.key });
    });
    return s;
  };
  const g1 = await mk(); const g2 = await mk(); const g3 = await mk();
  const gr = await emit(g1, 'create', { name: '가', playerId: 'g1' });
  ok(gr.ok, 'game create');
  ok((await emit(g2, 'join', { code: gr.code, name: '나', playerId: 'g2' })).ok, 'g2 join');
  ok((await emit(g3, 'join', { code: gr.code, name: '다', playerId: 'g3' })).ok, 'g3 join');
  const stt = await emit(g1, 'start');
  ok(stt && stt.ok !== false, 'start ' + JSON.stringify(stt));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await sleep(30); } return false; };
  ok(await until(() => g1.last && g1.last.phase === 'day', 40000), '낮에 도달 못함');
  const f0 = g2.frames;
  for (let i = 0; i < 50; i++) g2.emit('ready', { ready: i % 2 === 0 });
  await sleep(600);
  ok(g2.frames - f0 < 25, 'ready 연타 프레임 폭주: ' + (g2.frames - f0));
  g1.emit('forceVote');
  ok(await until(() => g2.last && g2.last.phase === 'vote', 5000), '투표 단계 도달 못함');
  const vr = await emit(g2, 'vote', { target: 'g3' });
  ok(vr.ok, 'vote');
  g2.close();
  await sleep(200);
  const g2b = await conn();
  const rr = await emit(g2b, 'join', { code: gr.code, playerId: 'g2', rejoin: true });
  ok(rr.ok, 'vote rejoin');
  ok(await until(() => g2b.last && ((g2b.last.phase === 'vote' && g2b.last.myVote === 'g3') || g2b.last.phase === 'result'), 3000), '재접속 뒤 투표 유지');
  console.log('RESILIENCE OK');
}

main().then(() => 0, (e) => { console.error('RESILIENCE FAIL:', e.message); return 1; }).then(async (code) => {
  socks.forEach((s) => { try { s.close(); } catch (e) { /* ignore */ } });
  srv.kill();
  await sleep(100);
  process.exit(code);
});
