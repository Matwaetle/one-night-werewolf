// 스모크 테스트: 실제 서버 프로세스를 띄우고 소켓 클라이언트 3명이 한 판을 끝까지 돌린다.
// 실행: node test/smoke.js
'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');
const PORT = process.env.SMOKE_PORT || '3931';
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: { ...process.env, PORT, TIME_SCALE: '0.05', NODE_ENV: 'test' }, stdio: 'ignore',
});
const fail = (m) => { console.error('SMOKE FAIL:', m); srv.kill(); process.exit(1); };
const timer = setTimeout(() => fail('시간 초과'), 60000);

function client(name) {
  const s = io(URL, { forceNew: true, transports: ['websocket'] });
  const c = { name, s, pid: `smoke-${name}-${Math.random().toString(36).slice(2)}`, st: null, done: new Set() };
  c.emit = (ev, d) => new Promise((res) => s.emit(ev, d, res));
  s.on('state', async (st) => {
    c.st = st;
    if (st.phase === 'night' && st.prompt && !st.prompt.done && st.prompt.type === 'info' && !c.done.has(st.prompt.key)) {
      c.done.add(st.prompt.key);
      c.emit('nightAction', { key: st.prompt.key });
    }
    if (st.phase === 'day' && !c.readySent) { c.readySent = true; s.emit('ready', { ready: true }); }
    if (st.phase === 'vote' && !c.voted) {
      c.voted = true;
      const t = st.players.find((p) => p.id !== st.me);
      const r = await c.emit('vote', { target: t.id });
      if (!r.ok) fail('vote ' + r.error);
    }
  });
  return c;
}

(async () => {
  await sleep(1500);
  const cs = ['가', '나', '다'].map(client);
  const [host, ...rest] = cs;
  const cr = await host.emit('create', { name: host.name, playerId: host.pid });
  if (!cr || !cr.code) fail('create ' + JSON.stringify(cr));
  for (const c of rest) { const r = await c.emit('join', { code: cr.code, name: c.name, playerId: c.pid }); if (!r.ok) fail('join ' + r.error); }
  const st = await host.emit('start');
  if (!st || st.ok === false) fail('start ' + JSON.stringify(st));
  const t0 = Date.now();
  while (Date.now() - t0 < 50000 && !cs.every((c) => c.st && c.st.phase === 'result')) await sleep(50);
  if (!cs.every((c) => c.st && c.st.phase === 'result')) fail('결과 단계에 도달 못함: ' + cs.map((c) => c.st && c.st.phase));
  const R = cs[0].st.result;
  if (!R) fail('result 없음');
  if (!R.night || !Array.isArray(R.night.ev) || R.night.ev.length === 0) fail('result.night.ev 없음: ' + Object.keys(R));
  if (!R.deaths || !R.why) fail('deaths/why 없음');
  if (!cs.every((c) => c.st.result && c.st.result.night)) fail('모든 클라이언트가 night 를 받지 못함');
  console.log(`SMOKE OK: 방 ${cr.code}, night 이벤트 ${R.night.ev.length}개, 사망 ${R.deaths.length}명, 상태 키 ${Object.keys(R).join(',')}`);
  clearTimeout(timer); cs.forEach((c) => c.s.close()); srv.kill(); process.exit(0);
})().catch((e) => fail(e.stack));
