'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { Server } = require('socket.io');
const WW = require('./public/roles.js');
const TX = require('./public/strings.js');

const { ROLES, ROLE_ORDER, NIGHT_ORDER, MIN_PLAYERS, MAX_PLAYERS } = WW;

// 테스트할 때 TIME_SCALE=0.02 처럼 줄여서 빠르게 돌릴 수 있다.
const SCALE = Number(process.env.TIME_SCALE || 1);
const TM = {
  CARD_CHECK: 13000,   // 처음 패 확인 시간 (spec 9.5)
  ACT: 45000,          // 역할별 밤 행동 제한 시간 (카드를 보는 행동이 있어 30초에서 +50%)
  DOPPEL: 68000,       // 도플갱어 (두 단계라 더 길게)
  MIN_STEP: 8000,      // 행동이 빨리 끝나도 최소 이만큼은 기다림 (정보 노출 방지)
  VIEW_HOLD: 10000,    // 카드를 본 행동 뒤, 단계가 끝나기까지 최소로 기다리는 시간 (펼친 카드를 읽을 시간)
  IDLE_MIN: 8000,      // 아무도 없는 역할 차례에 기다리는 시간 (무작위)
  IDLE_MAX: 16000,
  VOTE: 60000,
  VOTE_GRACE: 1500,    // 모두 투표한 뒤 결말까지
  DROP_GRACE: 15000,   // 낮·투표 중 연결이 잠깐 끊긴 사람을 집계에서 빼기 전 기다리는 시간
};
for (const k of Object.keys(TM)) TM[k] = Math.max(50, Math.round(TM[k] * SCALE));
const LOBBY_GRACE = 180000;       // 대기실에서 연결이 끊긴 플레이어를 내보내기까지
const ROOM_TTL = 10 * 60000;      // 모두 나간 방을 지우기까지
const HOST_GRACE = 20000;         // 방장 연결이 끊긴 뒤 방장을 넘기기까지
const NET_SIM_MS = Number(process.env.NET_SIM_MS) || 0;   // 측정용: 응답·연결을 인위로 늦춘다 (기본 꺼짐)
const DEV = process.env.NODE_ENV !== 'production';

// 도플갱어가 따라 했을 때, 원래 역할 차례에 함께 깨어나는 역할
const WAKE_WITH = ['werewolf', 'minion', 'mason', 'insomniac'];
// 도플갱어가 따라 했을 때, 그 자리에서 바로 능력을 쓰는 역할
const ACT_NOW = ['seer', 'robber', 'troublemaker', 'drunk'];

// 테스트 전용 훅: 방장 id -> 정해진 배분(역할 배열). 소켓으로는 닿지 않는다.
const _test = { deals: new Map() };

const sidOf = (pid) => crypto.createHash('sha256').update(pid).digest('base64url').slice(0, 12);
const obj = (d) => (d && typeof d === 'object' && !Array.isArray(d) ? d : {});
process.on('uncaughtException', (e) => console.error('[uncaught]', e));
process.on('unhandledRejection', (e) => console.error('[unhandled]', e));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  serveClient: false,
  cors: { origin: [process.env.STATIC_ORIGIN].filter(Boolean) },
  pingInterval: 10000,   // 끊긴 소켓을 18초 안에 알아챈다 (모바일 셀 전환)
  pingTimeout: 8000,
  perMessageDeflate: { threshold: 1024 },
  maxHttpBufferSize: 16 * 1024,
  connectionStateRecovery: { maxDisconnectionDuration: 120000 },
});

// ---------- 정적 서빙 (같은 출처 폴백, spec 9.0) ----------
// tools/stamp.js 가 있으면 메모리에 빌드한 결과를 시작 시 1회 미리 압축해 서빙한다.
// 없거나 던지면 public/ 을 그대로 정적 서빙한다 (서버는 언제나 뜬다).
const MIME = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8', map: 'application/json; charset=utf-8', xml: 'application/xml; charset=utf-8',
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', ico: 'image/x-icon',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', webmanifest: 'application/manifest+json',
};
const TEXT_EXT = new Set(['html', 'js', 'mjs', 'css', 'json', 'svg', 'txt', 'map', 'xml', 'webmanifest']);
let DEPLOY_VER = '';
let ASSETS = null; // Map<string path, {type, raw, br, gz, etag, immutable}>

function installAssets(out) {
  if (!out) return false;
  let entries;
  if (out instanceof Map) entries = [...out.entries()];
  else if (out.files instanceof Map) entries = [...out.files.entries()];
  else if (out.files && typeof out.files === 'object') entries = Object.entries(out.files);
  else if (typeof out === 'object') entries = Object.entries(out);
  else return false;
  const map = new Map();
  for (let [p, v] of entries) {
    if (v && typeof v === 'object' && !Buffer.isBuffer(v)) v = v.body ?? v.content ?? v.data ?? v.buf;
    if (typeof v !== 'string' && !Buffer.isBuffer(v)) continue;
    p = String(p).replace(/\\/g, '/').replace(/^\.?\/*/, '').replace(/^dist\//, '');
    const ext = (p.split('.').pop() || '').toLowerCase();
    const raw = Buffer.isBuffer(v) ? v : Buffer.from(v, 'utf8');
    const e = {
      type: MIME[ext] || 'application/octet-stream', raw, br: null, gz: null,
      etag: '"' + crypto.createHash('sha1').update(raw).digest('base64url').slice(0, 20) + '"',
      immutable: p.startsWith('a/'),
    };
    if (TEXT_EXT.has(ext) && raw.length > 256) {
      e.br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
      e.gz = zlib.gzipSync(raw, { level: 9 });
    }
    map.set(p, e);
  }
  if (!map.has('index.html')) return false;
  ASSETS = map;
  if (typeof out.ver === 'string') DEPLOY_VER = out.ver;
  return true;
}

function loadStamp() {
  let mod;
  try { mod = require('./tools/stamp.js'); } catch (e) {
    if (e && e.code !== 'MODULE_NOT_FOUND') console.warn('[static] tools/stamp.js load failed:', e.message);
    return;
  }
  try {
    const out = mod.build({ memory: true });
    if (out && typeof out.then === 'function') {
      out.then((r) => { if (!installAssets(r)) console.warn('[static] stamp result unusable, serving public/'); })
        .catch((e) => console.warn('[static] stamp build failed, serving public/:', e.message));
    } else if (!installAssets(out)) console.warn('[static] stamp result unusable, serving public/');
  } catch (e) {
    console.warn('[static] stamp build failed, serving public/:', e.message);
  }
}

if (NET_SIM_MS > 0) {
  app.use((q, s, n) => setTimeout(n, NET_SIM_MS));
  io.use((sock, next) => setTimeout(next, NET_SIM_MS));
}

app.get('/healthz', (_req, res) => {
  res.set('Access-Control-Allow-Origin', process.env.STATIC_ORIGIN || '*');
  res.send('ok');
});
app.use((req, res, next) => {
  if (!ASSETS || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
  let p;
  try { p = decodeURIComponent(req.path); } catch { return next(); }
  p = p.replace(/^\/+/, '') || 'index.html';
  const e = ASSETS.get(p);
  if (!e) return next();
  res.set('Cache-Control', e.immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
  res.set('ETag', e.etag);
  res.set('Content-Type', e.type);
  if (req.headers['if-none-match'] === e.etag) return res.status(304).end();
  let body = e.raw;
  if (e.br) {
    res.set('Vary', 'Accept-Encoding');
    const ae = String(req.headers['accept-encoding'] || '');
    if (/\bbr\b/.test(ae)) { res.set('Content-Encoding', 'br'); body = e.br; }
    else if (/\bgzip\b/.test(ae)) { res.set('Content-Encoding', 'gzip'); body = e.gz; }
  }
  res.set('Content-Length', String(body.length));
  res.end(req.method === 'HEAD' ? undefined : body);
});
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, file) {
    res.setHeader('Cache-Control', /[\\/]a[\\/]/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache');
  },
}));

/** @type {Map<string, any>} */
const rooms = new Map();

// ---------- 유틸 ----------
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const INVIS = /[\u0000-\u001f\u007f-\u009f\u00ad\u115f\u1160\u3164\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;
const clean = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').replace(INVIS, '').replace(/\s+/g, ' ').trim();
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < 50; i++) {
    const code = Array.from({ length: 4 }, () => pick(chars)).join('');
    if (!rooms.has(code)) return code;
  }
  return null;
}
function cleanName(name) {
  const s = Array.from(clean(name)).slice(0, 12).join('');
  return s || null;
}
const rn = (r) => ROLES[r].name;
const M = (key, vars) => TX.fmt(TX.msg[key], vars);
const deckTotal = (deck) => ROLE_ORDER.reduce((s, r) => s + (deck[r] || 0), 0);

// ---------- 방 ----------
function createRoom() {
  const code = genCode();
  if (!code) return null;
  const room = {
    code,
    hostId: null,
    players: new Map(),
    order: [],
    deck: WW.presetFor(MIN_PLAYERS),
    deckCustom: false,
    settings: { dayTime: 300 },
    phase: 'lobby',
    game: null,
    result: null,
    chat: [],
    chatSeq: 0,
    cleanupTimer: null,
    createdAt: Date.now(),
  };
  rooms.set(room.code, room);
  return room;
}

const pn = (room, id) => room.players.get(id)?.name ?? '?';

function connectedIds(room) {
  return room.order.filter((id) => room.players.get(id)?.connected);
}
// 낮·투표의 집계용: 방금 끊긴 사람(DROP_GRACE 안)은 아직 있는 것으로 센다
function liveIds(room) {
  const now = Date.now();
  return room.order.filter((id) => {
    const p = room.players.get(id);
    return p && (p.connected || (p.offAt && now - p.offAt < TM.DROP_GRACE));
  });
}

function ensureHost(room) {
  const host = room.players.get(room.hostId);
  if (host && host.connected) return;
  const next = connectedIds(room)[0] || room.order[0] || null;
  if (next && next !== room.hostId) {
    room.hostId = next;
    sysChat(room, M('newChief', { n: pn(room, next) }));
  }
}

function autoDeck(room) {
  if (room.phase === 'lobby' && !room.deckCustom) room.deck = WW.presetFor(room.order.length);
}

function removePlayer(room, id) {
  const p = room.players.get(id);
  if (!p) return;
  room.players.delete(id);
  room.order = room.order.filter((x) => x !== id);
  sysChat(room, M('left', { n: p.name }));
  if (room.order.length === 0) {
    clearTimeout(room.bcT);
    rooms.delete(room.code);
    return;
  }
  ensureHost(room);
  autoDeck(room);
}

function armLeave(room, pid) {
  const p = room.players.get(pid);
  if (!p) return;
  clearTimeout(p.leaveTimer);
  p.leaveTimer = setTimeout(() => {
    const q = room.players.get(pid);
    if (rooms.get(room.code) === room && room.phase === 'lobby' && q && !q.connected) {
      removePlayer(room, pid);
      if (rooms.has(room.code)) broadcast(room);
    }
  }, LOBBY_GRACE);
}

function scheduleCleanup(room) {
  if (connectedIds(room).length > 0) return;
  clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => {
    if (connectedIds(room).length === 0) {
      clearGameTimers(room);
      clearTimeout(room.bcT);
      rooms.delete(room.code);
    }
  }, ROOM_TTL);
}

function sysChat(room, text, extra) {
  pushChat(room, Object.assign({ system: true, text, ts: Date.now() }, extra || null));
}
function pushChat(room, msg) {
  msg.mid = ++room.chatSeq;
  room.chat.push(msg);
  if (room.chat.length > 150) room.chat.shift();
  io.to(room.code).emit('chat', msg);
}

// ---------- 상태 전송 (플레이어마다 자기가 알아도 되는 것만) ----------
function view(room, pid) {
  const g = room.game;
  const v = {
    now: Date.now(),
    code: room.code,
    gameId: g ? g.id : null,
    phase: room.phase,
    hostId: room.hostId,
    me: pid,
    players: room.order.map((id) => {
      const p = room.players.get(id);
      // ready / voted 는 참일 때만 키를 둔다 (상태 크기, 6KB 예산). 없으면 거짓으로 읽는다.
      const o = { id, name: p.name, connected: p.connected };
      if (p.ready) o.ready = true;
      if (g && room.phase === 'vote' && g.votes[id] !== undefined) o.voted = true;
      return o;
    }),
    deck: room.deck,
    deckCustom: room.deckCustom,
    settings: room.settings,
    result: room.result,
  };
  if (g) {
    v.gameDeck = g.deck;
    v.myCard = g.original[pid] ?? null;
    v.myLog = g.nightLog[pid] || [];
    v.steps = g.steps;
    v.stepIdx = g.stepIdx;
    v.stepRole = g.stepRole;
    const pr = g.prompts[pid];
    v.prompt = pr ? publicPrompt(pr) : null;
    // 남은 시간은 행동하는 사람과 패 확인 단계에만 알려줌 (누가 있는지 시간으로 짐작 못 하게)
    v.stepEndsAt = (pr && !pr.done) || g.stepRole === '_check' ? g.stepEndsAt : null;
    v.dayEndsAt = g.dayEndsAt;
    v.voteEndsAt = g.voteEndsAt;
    v.myVote = g.votes[pid] ?? null;
  }
  return v;
}

// 서버 내부 필드(ack)는 내보내지 않는다.
function publicPrompt(p) {
  const { ack, ...rest } = p; // eslint-disable-line no-unused-vars
  return rest;
}

function broadcast(room) {
  room.bcDirty = 1;
  if (room.bcT) return;
  room.bcT = setTimeout(() => {
    room.bcT = null;
    if (room.bcDirty) { room.bcDirty = 0; sendNow(room); }
  }, 50);
}

function sendNow(room) {
  clearTimeout(room.bcT);
  room.bcT = null;
  room.bcDirty = 0;
  for (const id of room.order) {
    const p = room.players.get(id);
    if (p.connected && p.socketId) io.to(p.socketId).emit('state', view(room, id));
  }
}

// ---------- 게임 진행 ----------
function clearGameTimers(room) {
  const g = room.game;
  if (!g) return;
  clearTimeout(g.timer);
  g.timer = null;
  g.token++;
}

function setGameTimer(room, ms, fn) {
  const g = room.game;
  clearTimeout(g.timer);
  const token = ++g.token;
  g.timer = setTimeout(() => {
    if (room.game === g && g.token === token) fn();
  }, ms);
}

// ----- 밤의 기록 (spec 13.2) -----
// 슬롯: 0..n-1 = 좌석(g.seats), n..n+2 = 제단. 슬롯 계산은 g.seats만 쓴다 (room.order 금지).
const slotOf = (g, pid) => {
  const s = g.seats.indexOf(pid);
  if (s < 0) throw new Error('slotOf ' + pid);
  return s;
};

function checkInvariant(g) {
  const n = g.seats.length;
  for (let s = 0; s < n + 3; s++) {
    const want = s < n ? g.cards[g.seats[s]] : g.center[s - n];
    if (g.deal[g.pos[s]] !== want) throw new Error(`invariant broken at slot ${s}`);
  }
}

function rec(g, e) {                       // 모든 기록은 여기를 지난다
  const dop = e.by.filter((s) => g.original[g.seats[s]] === 'doppelganger');
  if (dop.length) e.dop = dop;             // 비면 키를 넣지 않는다
  if (e.r === e.st) delete e.r;            // r이 없으면 r = st
  g.ev.push(e);
}
// st = 기록 순간의 g.stepRole (행마다 리터럴로 쓰지 않는다)
const recStep = (g, e) => rec(g, { st: g.stepRole, ...e });

function swapSlots(room, a, b) {           // a, b = 슬롯. 카드 교환은 반드시 이 함수 하나로만 한다
  const g = room.game, n = g.seats.length, ca = g.pos[a], cb = g.pos[b];
  g.pos[a] = cb; g.pos[b] = ca;
  const put = (s, c) => { if (s < n) g.cards[g.seats[s]] = g.deal[c]; else g.center[s - n] = g.deal[c]; };
  put(a, cb); put(b, ca);
  if (DEV) checkInvariant(g);              // 깨뜨린 단계에서 바로 실패
  return [[ca, b], [cb, a]];               // mv 항목: [cardId, to]
}

function startGame(room) {
  // 연결이 끊긴 사람은 빼고 시작
  for (const id of [...room.order]) if (!room.players.get(id).connected) removePlayer(room, id);
  const n = room.order.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) return M('needPlayers');
  if (deckTotal(room.deck) !== n + 3) return M('needCards', { n: n + 3 });

  let cards = [];
  for (const r of ROLE_ORDER) for (let i = 0; i < (room.deck[r] || 0); i++) cards.push(r);
  const forced = _test.deals.get(room.order[0]);
  if (forced && forced.length === cards.length) cards = forced.slice();
  else shuffle(cards);

  const g = {
    id: crypto.randomBytes(4).toString('hex'),     // 판마다 새로 (spec 7.4)
    startedAt: Date.now(),
    seats: [...room.order],                         // 좌석 고정
    deal: cards.slice(),                            // cardId -> role (좌석 n + 제단 3)
    pos: cards.map((_, i) => i),                    // slot -> cardId
    ev: [],
    deck: { ...room.deck },
    original: {}, cards: {},
    originalCenter: [], center: [],
    doppelCopy: null, doppelId: null,
    nightLog: {}, acks: {},
    prompts: {}, promptSeq: 0,
    steps: ['_check', ...NIGHT_ORDER.filter((r) => room.deck[r] > 0)],
    stepIdx: -1, stepRole: null, stepStartedAt: 0, stepEndsAt: 0,
    votes: {}, dayEndsAt: null, voteEndsAt: null,
    timer: null, token: 0, viewAt: 0,
  };
  g.seats.forEach((id, i) => {
    g.original[id] = g.cards[id] = cards[i];
    g.nightLog[id] = [];
    if (cards[i] === 'doppelganger') g.doppelId = id;
  });
  g.originalCenter = cards.slice(n);
  g.center = cards.slice(n);

  room.game = g;
  room.result = null;
  room.phase = 'night';
  for (const id of room.order) room.players.get(id).ready = false;
  sysChat(room, M('nightStart'));
  runStep(room, 0);
  return null;
}

// 도플갱어 카드를 쥔 사람은 도플갱어가 복사한 역할이다 (spec 13.1)
function eff(g, card) {
  return card === 'doppelganger' ? (g.doppelCopy || 'doppelganger') : card;
}

// 이번 역할 차례에 깨어나는 사람. 깨는 규칙은 처음 받은 패(g.original)만으로 정해진다.
function actorsFor(room, role) {
  const g = room.game;
  return g.seats.filter((pid) => {
    const o = g.original[pid];
    if (o === role) return true;
    return o === 'doppelganger' && g.doppelCopy === role && WAKE_WITH.includes(role);
  });
}

function log(room, pid, text, reveal = []) {
  room.game.nightLog[pid].push({ text, reveal });
}

function setPrompt(room, pid, p) {
  const g = room.game;
  g.prompts[pid] = { ...p, key: ++g.promptSeq, done: false };
}

function runStep(room, idx) {
  const g = room.game;
  if (idx >= g.steps.length) return startDay(room);
  const role = g.steps[idx];
  g.stepIdx = idx;
  g.stepRole = role;
  g.prompts = {};
  const now = Date.now();
  g.stepStartedAt = now;
  g.viewAt = 0;

  if (role === '_check') {
    g.stepEndsAt = now + TM.CARD_CHECK;
    setGameTimer(room, TM.CARD_CHECK, () => runStep(room, idx + 1));
    return sendNow(room);
  }

  const actors = actorsFor(room, role);
  for (const pid of actors) makePrompt(room, pid, role, actors);
  recordStep(room, role, actors);

  const dur = actors.length ? (role === 'doppelganger' ? TM.DOPPEL : TM.ACT) : rand(TM.IDLE_MIN, TM.IDLE_MAX);
  g.stepEndsAt = now + dur;
  setGameTimer(room, dur, () => holdEnd(room));
  sendNow(room);
}

// 차례 시작 때 한 번 남기는 기록 (spec 13.2 기록 지점 표)
function recordStep(room, role, actors) {
  const g = room.game;
  const S = (ids) => ids.map((i) => slotOf(g, i));
  if (!actors.length) return recStep(g, { k: 'idle', by: [] });
  const by = S(actors);
  if (role === 'werewolf' && actors.length > 1) recStep(g, { k: 'know', by });
  else if (role === 'minion') recStep(g, { k: 'know', by, know: S(actorsFor(room, 'werewolf')) });
  else if (role === 'mason') recStep(g, { k: 'know', by });
  else if (role === 'insomniac') recStep(g, { k: 'peek', by, see: by.map((s) => [g.pos[s], s]) });
}

function makePrompt(room, pid, role, actors) {
  const g = room.game;
  const others = actors.filter((x) => x !== pid);
  const names = (ids) => ids.map((x) => pn(room, x)).join(', ');
  switch (role) {
    case 'doppelganger':
      return setPrompt(room, pid, { type: 'doppelganger' });
    case 'werewolf':
      if (actors.length > 1) {
        const text = M('pack', { names: names(others) });
        log(room, pid, text);
        return setPrompt(room, pid, { type: 'info', title: rn('werewolf'), text, ids: others });
      }
      log(room, pid, M('packAlone'));
      return setPrompt(room, pid, { type: 'lonewolf' });
    case 'minion': {
      const wolves = actorsFor(room, 'werewolf');
      const text = wolves.length ? M('owners', { names: names(wolves) }) : M('noWolfInPlay');
      log(room, pid, text);
      return setPrompt(room, pid, { type: 'info', title: rn('minion'), text, ids: wolves });
    }
    case 'mason': {
      const text = others.length ? M('brothers', { names: names(others) }) : M('noBrothers');
      log(room, pid, text);
      return setPrompt(room, pid, { type: 'info', title: rn('mason'), text, ids: others });
    }
    case 'insomniac': {
      const now = g.cards[pid];
      const text = M('nowCard', { r: rn(now) });
      log(room, pid, text, [{ at: 'p', id: pid, role: now }]);
      return setPrompt(room, pid, { type: 'info', title: rn('insomniac'), text, reveal: [{ at: 'p', id: pid, role: now }] });
    }
    default: // seer, robber, troublemaker, drunk
      return setPrompt(room, pid, { type: role });
  }
}

const isPlayer = (room, id) => (room.game ? room.game.seats : room.order).includes(id);
const validCenter = (c) => Number.isInteger(c) && c >= 0 && c <= 2;
const okAck = (text = '', reveal = []) => ({ ok: true, text, reveal });
const failAck = (error) => ({ ok: false, error });

// 밤 행동 처리. 항상 ack 객체 {ok, text, reveal} 또는 {ok:false, error}를 돌려준다.
// 같은 행동을 다시 보내면(재시도) 같은 ack를 돌려준다 (멱등).
function doAction(room, pid, data, auto = false) {
  const g = room.game;
  data = data || {};
  let p = g.prompts[pid];
  // 이미 끝난 프롬프트(도플갱어 복사, 단계·밤이 막 끝난 뒤 등)에 대한 재전송: 키로 같은 ack를 찾는다
  if (data.key !== undefined && (!p || data.key !== p.key || room.phase !== 'night')) {
    const old = g.acks[pid]?.get(data.key);
    if (old) return old;
  }
  if (room.phase !== 'night') return failAck(M('notNow'));
  if (!p) return failAck(M('notNow'));
  if (p.done) return p.ack || okAck();
  const n = g.seats.length;
  const s = slotOf(g, pid);
  const tag = auto ? ' ' + M('autoPicked') : '';
  const done = (ack) => {
    p.done = true;
    p.ack = ack;
    (g.acks[pid] ||= new Map()).set(p.key, ack);
    return ack;
  };
  const seeAt = (slot) => [g.pos[slot], slot];

  switch (p.type) {
    case 'info':
      return done(okAck());

    case 'lonewolf': {
      if (data.skip) {
        recStep(g, { r: 'werewolf', k: 'skip', by: [s] });
        return done(okAck());
      }
      if (!validCenter(data.center)) return failAck(M('pickAltar'));
      const c = g.center[data.center];
      const text = M('altarSeen', { pos: TX.altar[data.center], r: rn(c) });
      const reveal = [{ at: 'c', idx: data.center, role: c }];
      log(room, pid, text, reveal);
      recStep(g, { r: 'werewolf', k: 'peek', by: [s], tg: [n + data.center], see: [seeAt(n + data.center)] });
      return done(okAck(text, reveal));
    }

    case 'doppelganger': {
      const t = data.player;
      if (!isPlayer(room, t) || t === pid) return failAck(M('pickOther'));
      const ts = slotOf(g, t);
      const copy = g.cards[t];
      g.doppelCopy = copy;
      const text = M('copied', { t: pn(room, t), r: rn(copy) }) + tag;
      const reveal = [{ at: 'p', id: t, role: copy }];
      recStep(g, { r: 'doppelganger', k: 'copy', by: [s], tg: [ts], see: [seeAt(ts)], ...(auto ? { auto: 1 } : {}) });
      log(room, pid, text, reveal);
      if (!ACT_NOW.includes(copy) && WAKE_WITH.includes(copy)) log(room, pid, M('rewake', { r: rn(copy) }));
      const ack = done(okAck(text, reveal));
      if (ACT_NOW.includes(copy)) setPrompt(room, pid, { type: copy, fromDoppel: true });
      return ack;
    }

    case 'seer': {
      if (data.skip) {
        recStep(g, { r: 'seer', k: 'skip', by: [s] });
        return done(okAck());
      }
      if (data.player !== undefined) {
        const t = data.player;
        if (!isPlayer(room, t) || t === pid) return failAck(M('pickOther'));
        const ts = slotOf(g, t);
        const text = M('seerSaw', { t: pn(room, t), r: rn(g.cards[t]) });
        const reveal = [{ at: 'p', id: t, role: g.cards[t] }];
        log(room, pid, text, reveal);
        recStep(g, { r: 'seer', k: 'peek', by: [s], tg: [ts], see: [seeAt(ts)] });
        return done(okAck(text, reveal));
      }
      const cs = data.centers;
      if (!Array.isArray(cs) || cs.length !== 2 || !cs.every(validCenter) || cs[0] === cs[1]) return failAck(M('pickTwoAltar'));
      const list = cs.map((c) => M('altarTwo', { pos: TX.altar[c], r: rn(g.center[c]) })).join(', ');
      const text = M('altarTwoHead', { list });
      const reveal = cs.map((c) => ({ at: 'c', idx: c, role: g.center[c] }));
      log(room, pid, text, reveal);
      recStep(g, { r: 'seer', k: 'peek', by: [s], tg: cs.map((c) => n + c), see: cs.map((c) => seeAt(n + c)) });
      return done(okAck(text, reveal));
    }

    case 'robber': {
      if (data.skip) {
        const text = M('noTouch');
        log(room, pid, text);
        recStep(g, { r: 'robber', k: 'skip', by: [s] });
        return done(okAck(text));
      }
      const t = data.player;
      if (!isPlayer(room, t) || t === pid) return failAck(M('pickOther'));
      const ts = slotOf(g, t);
      const mv = swapSlots(room, s, ts);
      const text = M('stole', { t: pn(room, t), r: rn(g.cards[pid]) });
      // 훔친 패는 이제 강도의 좌석에 놓여 있다
      const reveal = [{ at: 'p', id: pid, role: g.cards[pid], from: t }];
      log(room, pid, text, reveal);
      recStep(g, { r: 'robber', k: 'swap', by: [s], tg: [ts], mv, see: [seeAt(s)] });
      return done(okAck(text, reveal));
    }

    case 'troublemaker': {
      if (data.skip) {
        const text = M('noTouch');
        log(room, pid, text);
        recStep(g, { r: 'troublemaker', k: 'skip', by: [s] });
        return done(okAck(text));
      }
      const ps = data.players;
      if (!Array.isArray(ps) || ps.length !== 2 || ps[0] === ps[1] || !ps.every((x) => isPlayer(room, x) && x !== pid)) {
        return failAck(M('pickTwoOthers'));
      }
      const [a, b] = ps;
      const as = slotOf(g, a), bs = slotOf(g, b);
      const mv = swapSlots(room, as, bs);
      const text = M('swapped', { a: pn(room, a), b: pn(room, b) });
      log(room, pid, text);
      recStep(g, { r: 'troublemaker', k: 'swap', by: [s], tg: [as, bs], mv });
      return done(okAck(text));
    }

    case 'drunk': {
      if (!validCenter(data.center)) return failAck(M('pickAltar'));
      const c = data.center;
      const mv = swapSlots(room, s, n + c);
      const text = M('drunkSwapped', { pos: TX.altar[c] }) + tag;
      log(room, pid, text);
      recStep(g, { r: 'drunk', k: 'swap', by: [s], tg: [n + c], mv, ...(auto ? { auto: 1 } : {}) });
      return done(okAck(text));
    }

    default:
      return failAck(M('notNow'));
  }
}

function finishPending(room) {
  const g = room.game;
  for (const pid of Object.keys(g.prompts)) {
    for (let guard = 0; guard < 5; guard++) {
      const p = g.prompts[pid];
      if (!p || p.done) break;
      if (p.type === 'doppelganger') {
        doAction(room, pid, { player: pick(g.seats.filter((x) => x !== pid)) }, true);
      } else if (p.type === 'drunk') {
        doAction(room, pid, { center: rand(0, 2) }, true);
      } else {
        if (p.type !== 'info') {
          log(room, pid, M('timedOut'));
          recStep(g, { r: p.type === 'lonewolf' ? 'werewolf' : p.type, k: 'skip', by: [slotOf(g, pid)], auto: 1 });
        }
        p.done = true;
        p.ack = okAck();
        (g.acks[pid] ||= new Map()).set(p.key, p.ack);
      }
    }
  }
}

function endStep(room) {
  finishPending(room);
  runStep(room, room.game.stepIdx + 1);
}

// 카드를 본 행동 뒤 VIEW_HOLD가 지나기 전에는 단계를 끝내지 않는다
function holdEnd(room) {
  const w = room.game.viewAt + TM.VIEW_HOLD - Date.now();
  if (w > 0) setGameTimer(room, w, () => endStep(room));
  else endStep(room);
}

function checkStepDone(room) {
  const g = room.game;
  const all = Object.values(g.prompts);
  if (!all.length || all.some((p) => !p.done)) return;
  const wait = Math.max(0, g.stepStartedAt + TM.MIN_STEP - Date.now(), g.viewAt + TM.VIEW_HOLD - Date.now());
  setGameTimer(room, wait, () => endStep(room));
}

function startDay(room) {
  const g = room.game;
  g.prompts = {};
  g.stepRole = null;
  room.phase = 'day';
  g.dayEndsAt = Date.now() + Math.round(room.settings.dayTime * 1000 * SCALE);
  for (const id of room.order) room.players.get(id).ready = false;
  sysChat(room, M('dawn'));
  setGameTimer(room, g.dayEndsAt - Date.now(), () => startVote(room));
  sendNow(room);
}

function startVote(room) {
  const g = room.game;
  room.phase = 'vote';
  g.votes = {};
  g.voteEndsAt = Date.now() + TM.VOTE;
  sysChat(room, M('voteStart'));
  setGameTimer(room, TM.VOTE, () => resolve(room));
  sendNow(room);
}

function checkAllReady(room) {
  const ids = liveIds(room);
  if (ids.length && ids.every((id) => room.players.get(id).ready)) startVote(room);
}

function checkAllVoted(room) {
  const g = room.game;
  const ids = liveIds(room);
  if (ids.length && ids.every((id) => g.votes[id] !== undefined)) {
    setGameTimer(room, TM.VOTE_GRACE, () => resolve(room));
  }
}

function resolve(room) {
  const g = room.game;
  clearGameTimers(room);
  const ids = g.seats, n = ids.length;

  // 정합성 단언: 개발에서는 던지고, 운영에서는 기록만 버리고(night 생략) 결말은 진행한다
  let nightOk = true;
  try {
    checkInvariant(g);
    if (g.ev.length > 20) throw new Error('too many events: ' + g.ev.length);
  } catch (e) {
    if (DEV) throw e;
    nightOk = false;
    console.error('[night record dropped]', e.message);
  }

  const counts = Object.fromEntries(ids.map((i) => [i, 0]));
  for (const t of Object.values(g.votes)) if (t in counts) counts[t]++;
  const max = Math.max(...Object.values(counts));
  const dead = max > 1 ? ids.filter((i) => counts[i] === max) : [];

  const final = Object.fromEntries(ids.map((i) => [i, eff(g, g.cards[i])]));
  const team = (role) => ROLES[role].team;

  // 사냥꾼 연쇄 큐를 돌면서 deaths를 만든다 (순서 = 연출 순서)
  const deaths = dead.map((i) => ({ s: slotOf(g, i), by: 'vote' }));
  const hunterKills = [];
  const queue = [...dead];
  while (queue.length) {
    const d = queue.shift();
    if (final[d] !== 'hunter') continue;
    const t = g.votes[d] ?? null;
    if (t && !dead.includes(t)) {
      dead.push(t);
      queue.push(t);
      hunterKills.push({ hunter: d, target: t });
      deaths.push({ s: slotOf(g, t), by: 'hunter', h: slotOf(g, d) });
    } else {
      deaths.push({ s: t ? slotOf(g, t) : -1, by: 'miss', h: slotOf(g, d) });  // 죽음이 아니다
    }
  }

  const wolves = ids.filter((i) => final[i] === 'werewolf');
  const minions = ids.filter((i) => final[i] === 'minion');
  const deadWolf = dead.some((i) => final[i] === 'werewolf');
  const tannerDied = dead.some((i) => final[i] === 'tanner');

  let villageWin, wolfWin;
  if (wolves.length > 0) {
    villageWin = deadWolf;
    wolfWin = !deadWolf && !tannerDied;
  } else if (dead.length === 0) {
    villageWin = true;
    wolfWin = false;
  } else {
    // 플레이어 중에 늑대인간이 없을 때: 하수인만 죽었으면 마을 승리, 다른 사람이 죽으면 하수인 승리
    villageWin = minions.length > 0 && dead.every((i) => final[i] === 'minion');
    wolfWin = minions.length > 0 && !tannerDied && dead.some((i) => final[i] !== 'minion');
  }

  // 판결 이유 (spec 13.2): [코드, 좌석?][], 표시 순서 그대로. 승패 계산과 같은 분기를 글로 옮긴 것.
  const Sl = (a) => a.map((i) => slotOf(g, i));
  const dw = Sl(dead.filter((i) => final[i] === 'werewolf'));
  const dt = Sl(dead.filter((i) => final[i] === 'tanner'));
  let why;
  if (wolves.length) {
    why = dw.length ? [['wolf_died', dw], ...(dt.length ? [['tanner_too', dt]] : [])]
      : dt.length ? [['tanner_blocked', dt]] : [['wolf_lived', Sl(wolves)]];
  } else {
    why = [[g.deal.includes('werewolf') ? 'wolf_center' : 'wolf_none']];
    if (!dead.length) why.push(['no_death']);
    else if (dt.length) why.push(['no_wolf_tanner', dt]);
    else if (minions.length) why.push(dead.every((i) => final[i] === 'minion') ? ['minion_only_died', Sl(dead)] : ['minion_lived', Sl(minions)]);
    else why.push(['innocent_died']);
  }

  const players = ids.map((i) => {
    const t = team(final[i]);
    const isDead = dead.includes(i);
    const win = t === 'village' ? villageWin : t === 'wolf' ? wolfWin : isDead;
    return {
      id: i, name: pn(room, i),
      original: g.original[i], final: g.cards[i], effective: final[i], team: t,
      vote: g.votes[i] ?? null, votes: counts[i], dead: isDead, win,
    };
  });

  const winners = [];
  if (villageWin) winners.push('village');
  if (wolfWin) winners.push('wolf');
  if (players.some((p) => p.team === 'tanner' && p.win)) winners.push('tanner');

  room.result = {
    gameId: g.id,
    players, winners,
    noDeath: dead.length === 0,
    wolvesInPlay: wolves.length,
    center: { original: g.originalCenter, final: g.center },
    doppelCopy: g.doppelCopy,
    deaths, why,
    // 한 릴리스 동안만 호환 (spec 13.3): 다음 릴리스에서 지운다
    hunterKills,
    timeline: [],
  };
  if (nightOk) room.result.night = { deal: g.deal, ev: g.ev, end: g.pos.slice() };
  room.phase = 'result';
  sysChat(room, M('endLine', { verdict: verdictLine(winners, wolves.length) }), { kind: 'end' });
  sendNow(room);
}

function verdictLine(winners, wolfCount) {
  const V = TX.verdict;
  if (winners.includes('village')) return wolfCount ? V.village : V.villageNoWolf;
  if (winners.includes('wolf')) return wolfCount ? V.wolf : V.minion;
  if (winners.includes('tanner')) return V.tanner;
  return V.none;
}

function backToLobby(room) {
  clearGameTimers(room);
  room.game = null;
  room.result = null;
  room.phase = 'lobby';
  for (const id of [...room.order]) {
    const p = room.players.get(id);
    p.ready = false;
    if (!p.connected) removePlayer(room, id);
  }
  if (!rooms.has(room.code)) return;
  autoDeck(room);
  sendNow(room);
}

// ---------- 소켓 ----------
io.on('connection', (socket) => {
  { const v = socket.handshake && socket.handshake.auth && socket.handshake.auth.v; if (DEPLOY_VER && typeof v === 'string' && v && v !== DEPLOY_VER) socket.emit('outdated'); }
  const ctx = () => {
    const room = rooms.get(socket.data.code);
    const pid = socket.data.pid;
    if (!room || !room.players.has(pid)) return {};
    return { room, pid, isHost: room.hostId === pid };
  };
  const reply = (cb, v) => typeof cb === 'function' && cb(v);
  const cbOf = (a, b) => (typeof a === 'function' ? a : b);   // 데이터 없이 ack 만 보내는 클라이언트도 허용
  let tok = 20, tokAt = Date.now();
  const on = (ev, fn) => socket.on(ev, (...a) => {
    const t = Date.now();
    tok = Math.min(20, tok + (t - tokAt) * 0.008);
    tokAt = t;
    if (tok < 1) {
      const cb = a[a.length - 1];
      if (typeof cb === 'function') { try { cb({ ok: false, error: M(ev === 'chat' ? 'chatFast' : 'slowDown') }); } catch (e) { /* ignore */ } }
      return;
    }
    tok -= 1;
    try { fn(...a); } catch (e) { console.error('[sock]', ev, e); }
  });

  function leaveCurrent(sock) {
    const room = rooms.get(sock.data.code);
    const pid = sock.data.pid;
    if (!room || !room.players.has(pid)) { sock.data.code = null; return null; }
    sock.leave(room.code);
    sock.data.code = null;
    if (room.phase === 'lobby' || room.phase === 'result') {
      removePlayer(room, pid);
    } else {
      const p = room.players.get(pid);
      p.connected = false;
      p.offAt = 0;
      p.socketId = null;
      sysChat(room, M('left', { n: p.name }));
      ensureHost(room);
      if (room.phase === 'day') checkAllReady(room);
      if (room.phase === 'vote') checkAllVoted(room);
      scheduleCleanup(room);
    }
    if (rooms.has(room.code)) broadcast(room);
    return room;
  }

  function attach(room, pid) {
    const p = room.players.get(pid);
    if (p.socketId && p.socketId !== socket.id) {
      const old = io.sockets.sockets.get(p.socketId);
      if (old) { try { old.emit('replaced'); } catch (e) { /* ignore */ } old.disconnect(true); }
    }
    p.socketId = socket.id;
    p.connected = true;
    p.offAt = 0;
    socket.data.code = room.code;
    socket.data.pid = pid;
    socket.join(room.code);
    clearTimeout(p.leaveTimer);
    clearTimeout(room.cleanupTimer);
    socket.emit('chatHistory', room.chat, room.code);
    const g = room.game;
    if (room.phase === 'vote' && g && g.votes[pid] === undefined) {   // 투표 전 복귀: 모두 투표했다고 잡힌 결말 예약을 되돌린다
      setGameTimer(room, Math.max(TM.VOTE_GRACE, g.voteEndsAt - Date.now()), () => resolve(room));
    }
  }

  on('create', (d, cb) => {
    let { name, playerId } = obj(d);
    if (typeof name !== 'string') return reply(cb, { ok: false, error: M('badRequest') });
    name = cleanName(name);
    if (!name) return reply(cb, { ok: false, error: M('needName') });
    if (typeof playerId !== 'string' || !playerId || playerId.length > 64) return reply(cb, { ok: false, error: M('badRequest') });
    playerId = sidOf(playerId); // 이후 모든 id 는 공개용 sid (원본 playerId 는 보관·전송하지 않는다)
    // 재시도 멱등: 방금 이 사람이 만든 방이 있으면 같은 방을 돌려준다
    const prev = rooms.get(socket.data.code);
    if (prev && socket.data.pid === playerId && prev.hostId === playerId && prev.phase === 'lobby'
      && prev.order.length === 1 && Date.now() - prev.createdAt < 10000) {
      reply(cb, { ok: true, code: prev.code });
      return sendNow(prev);
    }
    const nowT = Date.now();
    if (socket.data.lastCreate && nowT - socket.data.lastCreate < 3000) return reply(cb, { ok: false, error: M('busy') });
    if (rooms.size >= 5000) return reply(cb, { ok: false, error: M('busy') });
    if (socket.data.code) leaveCurrent(socket);
    const room = createRoom();
    if (!room) return reply(cb, { ok: false, error: M('busy') });
    socket.data.lastCreate = nowT;
    room.players.set(playerId, { id: playerId, name, connected: true, socketId: null, ready: false });
    room.order.push(playerId);
    room.hostId = playerId;
    sysChat(room, M('townOpened', { name }));
    attach(room, playerId);
    reply(cb, { ok: true, code: room.code });
    sendNow(room);
  });

  on('join', (d, cb) => {
    let { code, name, playerId, rejoin } = obj(d);
    const room = typeof code === 'string' ? rooms.get(code.toUpperCase().trim()) : null;
    if (!room) return reply(cb, { ok: false, code: 'noTown', error: M('noTown') });
    if (typeof playerId !== 'string' || !playerId || playerId.length > 64) return reply(cb, { ok: false, error: M('badRequest') });
    playerId = sidOf(playerId); // 이후 모든 id 는 공개용 sid (원본 playerId 는 보관·전송하지 않는다)

    if (room.players.has(playerId)) {
      // 재접속
      if (socket.data.code && socket.data.code !== room.code) leaveCurrent(socket);
      attach(room, playerId);
      ensureHost(room);
      reply(cb, { ok: true, code: room.code });
      return sendNow(room);
    }
    if (rejoin && !(room.phase === 'lobby' && typeof name === 'string' && name)) return reply(cb, { ok: false, code: 'cannotReturn', error: M('cannotReturn') });
    if (typeof name !== 'string') return reply(cb, { ok: false, error: M('badRequest') });
    name = cleanName(name);
    if (!name) return reply(cb, { ok: false, error: M('needName') });
    if (room.phase !== 'lobby') return reply(cb, { ok: false, error: M('alreadyStarted') });
    if (room.order.length >= MAX_PLAYERS) return reply(cb, { ok: false, error: M('townFull') });

    const k = (x) => x.normalize('NFKC').toLowerCase();
    const names = new Set(room.order.map((id) => k(room.players.get(id).name)));
    let final = name;
    for (let i = 2; names.has(k(final)); i++) final = `${Array.from(name).slice(0, 10).join('')}${i}`;
    if (socket.data.code && socket.data.code !== room.code) leaveCurrent(socket);
    room.players.set(playerId, { id: playerId, name: final, connected: true, socketId: null, ready: false });
    room.order.push(playerId);
    sysChat(room, M('sat', { n: final }));
    attach(room, playerId);
    if (!room.players.has(room.hostId)) ensureHost(room);
    autoDeck(room);
    reply(cb, { ok: true, code: room.code });
    sendNow(room);
  });

  on('leave', (_, cb) => {
    leaveCurrent(socket);
    reply(cb, { ok: true });
  });

  on('kick', (d, cb0) => {
    const cb = cbOf(d, cb0);
    const { id } = obj(d);
    const { room, pid, isHost } = ctx();
    if (typeof id !== 'string' || !room || !isHost || room.phase !== 'lobby' || id === pid || !room.players.has(id)) return reply(cb, { ok: false, error: M('badRequest') });
    const p = room.players.get(id);
    if (p.socketId) {
      const s = io.sockets.sockets.get(p.socketId);
      if (s) { s.emit('kicked'); s.leave(room.code); s.data.code = null; }
    }
    removePlayer(room, id);
    broadcast(room);
    reply(cb, { ok: true });
  });

  on('setDeck', (d, cb0) => {
    const cb = cbOf(d, cb0);
    const { role, count } = obj(d);
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'lobby' || typeof role !== 'string' || !Object.prototype.hasOwnProperty.call(ROLES, role)) return reply(cb, { ok: false, error: M('badRequest') });
    const c = Math.max(0, Math.min(ROLES[role].max, Number(count) | 0));
    room.deck[role] = c;
    room.deckCustom = true;
    broadcast(room);
    reply(cb, { ok: true });
  });

  on('preset', (d, cb0) => {
    const cb = cbOf(d, cb0);
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'lobby') return reply(cb, { ok: false, error: M('badRequest') });
    room.deckCustom = false;
    autoDeck(room);
    broadcast(room);
    reply(cb, { ok: true });
  });

  on('setSettings', (d0, cb0) => {
    const cb = cbOf(d0, cb0);
    const { dayTime } = obj(d0);
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'lobby') return reply(cb, { ok: false, error: M('badRequest') });
    const d = Number(dayTime);
    if ([60, 120, 180, 240, 300, 420, 600].includes(d)) room.settings.dayTime = d;
    broadcast(room);
    reply(cb, { ok: true });
  });

  on('start', (_, cb) => {
    const { room, isHost } = ctx();
    if (!room || !isHost) return reply(cb, { ok: false, error: M('cannotStart') });
    // 재시도 멱등: 방금 시작된 판이면 같은 ack
    if (room.phase !== 'lobby') {
      if (room.game && Date.now() - room.game.startedAt < 10000) return reply(cb, { ok: true });
      return reply(cb, { ok: false, error: M('cannotStart') });
    }
    const err = startGame(room);
    if (err) {
      reply(cb, { ok: false, error: err });
      return broadcast(room);
    }
    reply(cb, { ok: true });
  });

  on('nightAction', (data, cb) => {
    const { room, pid } = ctx();
    if (!room || !room.game) return reply(cb, { ok: false, error: M('noGame') });
    const before = room.game.prompts[pid];
    const wasDone = !!(before && before.done);
    const ack = doAction(room, pid, obj(data));
    reply(cb, ack);
    if (!ack.ok || (wasDone && before === room.game.prompts[pid])) return;   // 재전송이면 상태를 다시 흔들지 않는다
    if (before && (before.type === 'info' || (ack.reveal && ack.reveal.length))) room.game.viewAt = Date.now();
    checkStepDone(room);
    broadcast(room);
  });

  on('ready', (d, cb0) => {
    const cb = cbOf(d, cb0);
    const { ready } = obj(d);
    const { room, pid } = ctx();
    if (!room || room.phase !== 'day') return reply(cb, { ok: false, error: M('badRequest') });
    if (room.players.get(pid).ready === !!ready) return reply(cb, { ok: true });
    room.players.get(pid).ready = !!ready;
    reply(cb, { ok: true });
    broadcast(room);
    checkAllReady(room);
  });

  on('forceVote', (d, cb0) => {
    const cb = cbOf(d, cb0);
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'day') return reply(cb, { ok: false, error: M('badRequest') });
    reply(cb, { ok: true });
    startVote(room);
  });

  on('vote', (d, cb) => {
    const { target } = obj(d);
    const { room, pid } = ctx();
    if (room && room.phase === 'result' && room.game && target && room.game.votes[pid] === target) return reply(cb, { ok: true });   // 멱등(결과 직후 재전송)
    if (!room || room.phase !== 'vote') return reply(cb, { ok: false, error: M('notVoteTime') });
    if (!isPlayer(room, target) || target === pid) return reply(cb, { ok: false, error: M('noSelfVote') });
    if (room.game.votes[pid] === target) return reply(cb, { ok: true });   // 멱등
    room.game.votes[pid] = target;
    reply(cb, { ok: true });
    broadcast(room);
    checkAllVoted(room);
  });

  on('playAgain', (d, cb0) => {
    const cb = cbOf(d, cb0);
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'result') return reply(cb, { ok: false, error: M('badRequest') });
    backToLobby(room);
    reply(cb, { ok: true });
  });

  on('chat', (d, cb) => {
    const { text, re, cid } = obj(d);
    const { room, pid } = ctx();
    if (!room) return reply(cb, { ok: false, error: M('noGame') });
    if (room.phase === 'night') return reply(cb, { ok: false, error: M('chatNight') });
    if (typeof text !== 'string') return reply(cb, { ok: false, error: M('badRequest') });
    const t = Array.from(clean(text)).slice(0, 300).join('');
    if (!t) return reply(cb, { ok: false, error: M('badRequest') });
    const p = room.players.get(pid);
    const cidOk = typeof cid === 'string' && cid.length <= 24;
    if (cidOk && p && p.cids && p.cids.has(cid)) return reply(cb, { ok: true });
    const now = Date.now();
    if (p && p.lastChat && now - p.lastChat < 400) return reply(cb, { ok: false, error: M('chatFast') });
    if (p) p.lastChat = now;
    if (p && cidOk) {
      if (!p.cids) p.cids = new Set();
      p.cids.add(cid);
      while (p.cids.size > 8) p.cids.delete(p.cids.values().next().value);
    }
    const msg = { id: pid, name: pn(room, pid), text: t, ts: now };
    if (cidOk) msg.cid = cid;
    const o = Number.isInteger(re) && re > 0 ? room.chat.find((m) => m.mid === re && !m.system) : null;
    if (o) {
      const s = String(o.text).replace(/\s+/g, ' '), cp = Array.from(s);
      msg.re = { mid: o.mid, name: o.name, t: cp.length > 40 ? cp.slice(0, 40).join('') + '…' : s };
    }
    const reDropped = re != null && re !== 0 && !o;
    pushChat(room, msg);
    reply(cb, reDropped ? { ok: true, reDropped: true } : { ok: true });
  });

  // 속도 제한(on)을 거치면 연타 뒤의 disconnect 가 삼켜져 접속 상태가 남으므로 직접 등록한다.
  socket.on('disconnect', () => { try {
    const { room, pid } = ctx();
    if (!room) return;
    const p = room.players.get(pid);
    if (p.socketId !== socket.id) return; // 이미 다른 탭/기기로 재접속함
    p.connected = false;
    p.offAt = Date.now();
    p.socketId = null;
    // 새로고침 정도로 방장이 바뀌지 않도록 잠시 기다렸다가 넘김
    if (room.hostId === pid) {
      clearTimeout(p.hostTimer);
      p.hostTimer = setTimeout(() => {
        if (rooms.get(room.code) === room && room.players.get(pid) && !room.players.get(pid).connected) {
          ensureHost(room);
          const old = room.players.get(pid);
          if (room.hostId !== pid && room.phase === 'lobby' && old && !old.connected) armLeave(room, pid);
          broadcast(room);
        }
      }, HOST_GRACE);
    }
    if (room.phase === 'lobby') {
      if (pid !== room.hostId && connectedIds(room).length > 0) armLeave(room, pid);
    } else if (room.phase === 'day' || room.phase === 'vote') {
      // 유예 안에는 그대로 센다. 유예가 지나도 안 돌아오면 그때 다시 집계한다.
      const ph = room.phase;
      setTimeout(() => {
        if (rooms.get(room.code) !== room || room.phase !== ph) return;
        if (ph === 'vote') checkAllVoted(room); else checkAllReady(room);
      }, TM.DROP_GRACE + 50);
    }
    scheduleCleanup(room);
    broadcast(room);
  } catch (e) { console.error('[sock] disconnect', e); } });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`한밤의 늑대인간 서버 실행 중: http://localhost:${PORT}`);
  // 정적 사이트가 따로 있으면(STATIC_ORIGIN) 이 서버는 페이지를 서빙하지 않으므로 빌드를 건너뛴다.
  // 그 외에는 먼저 listen 한 뒤 빌드한다. 끝나기 전에는 public/ 폴백이 응답한다.
  if (!process.env.STATIC_ORIGIN) setImmediate(loadStamp);
});

module.exports = { server, rooms, _test };
