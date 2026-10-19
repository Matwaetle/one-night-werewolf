// 스모크 테스트: 실제 서버 프로세스를 띄우고 소켓 클라이언트 3명이 한 판을 끝까지 돌린다.
// 실행: node test/smoke.js
'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');
const TS = require(path.join(__dirname, '..', 'public/strings.js'));
if (TS.fmt('${a:이/가}', { a: { t: '민수', h: '<b>민수</b>' } }) !== '<span class="nw"><b>민수</b>가</span>' || TS.fmt('${a:이/가}', { a: '민수' }) !== '민수가') { console.error('FMT assertion failed'); process.exit(1); }

// ---- 정적 빌드 검사 (FEATURES_SPEC 10.1 G4): 서버를 띄우기 전에 메모리 빌드로 확인한다 ----
{
  const fs = require('fs');
  const sf = (m) => { console.error('SMOKE FAIL:', m); process.exit(1); };
  const B = require(path.join(__dirname, '..', 'tools/stamp.js')).build({ memory: true, quiet: true });
  const text = (re) => { const k = [...B.files.keys()].find((u) => re.test(u)); return k ? B.files.get(k).body.toString('utf8') : null; };
  const game = text(/^\/a\/game\.[0-9a-f]+\.js$/), replay = text(/^\/a\/replay\.[0-9a-f]+\.js$/);
  const chatx = text(/^\/a\/chatx\.[0-9a-f]+\.js$/), audio = text(/^\/a\/audio\.[0-9a-f]+\.js$/), fxj = text(/^\/a\/fx\.[0-9a-f]+\.js$/);
  for (const [n, c] of [['game.js', game], ['replay.js', replay], ['chatx.js', chatx], ['audio.js', audio], ['fx.js', fxj]]) {
    if (c == null) sf('빌드에 ' + n + ' 없음');
    try { new Function(c); } catch (e) { sf(n + ' 구문 오류: ' + e.message); }
  }
  const html = B.files.get('/index.html').body.toString('utf8');
  if (/__CHATX_JS__|__AUDIO_JS__/.test(html)) sf('index.html 에 CHATX/AUDIO 토큰이 남음');
  if (!/chatx:'\/a\/chatx\.[0-9a-f]+\.js'/.test(html) || !/audio:'\/a\/audio\.[0-9a-f]+\.js'/.test(html)) sf('ASSETS.chatx/audio 가 치환되지 않음');
  // strings.js 표식이 있으면: 서버 전용 문장은 game.js 에 없고, replay 전용 문장은 replay.js 에만 있다
  const src = fs.readFileSync(path.join(__dirname, '..', 'public/strings.js'), 'utf8');
  const plain = (v) => JSON.stringify(v).slice(1, -1) === v && !/['`]/.test(v);   // 따옴표·역슬래시·줄바꿈이 없는 문장만 비교(최소화가 따옴표를 바꿀 수 있음)
  const lit = (v) => JSON.stringify(v).slice(1, -1);
  if (/@client:drop-start/.test(src)) {
    const m = Object.values(TS.msg).find((v) => typeof v === 'string' && v.length > 6 && plain(v));
    if (m && game.includes(lit(m))) sf('game.js 에 T.msg 문장이 남아 있음: ' + m);
  }
  if (/@client:replay-start/.test(src)) {
    const only = Object.entries(TS.replay).find(([k, v]) => !['why', 'self', 'ui'].includes(k) && typeof v === 'string' && v.trim().length > 6 && plain(v));
    if (only) {
      if (game.includes(lit(only[1]))) sf('game.js 에 replay 전용 문장이 남아 있음: ' + only[0]);
      if (!replay.includes(lit(only[1]))) sf('replay.js 에 옮겨 온 문장이 없음: ' + only[0]);
    }
  }
  // 정적 검사: 밤에 다른 사람 좌석을 흔드는 tremble 호출 금지, rustle 은 onAck 에 연결하지 않는다
  const app = fs.readFileSync(path.join(__dirname, '..', 'public/js/app.js'), 'utf8');
  if (/fx\(\s*['"]tremble['"]/.test(app)) sf("app.js 가 fx('tremble') 를 부른다 (FEATURES_SPEC 7.2 하드 규칙)");
  const ack = app.match(/function onAck\b[\s\S]*?\n  \}\n/);
  if (ack && /rustle/.test(ack[0])) sf('onAck 에 rustle 연결 (밤 정보 누설)');
}
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
