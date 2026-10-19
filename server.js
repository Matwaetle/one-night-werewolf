'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const WW = require('./public/roles.js');

const { ROLES, ROLE_ORDER, NIGHT_ORDER, MIN_PLAYERS, MAX_PLAYERS } = WW;

// 테스트할 때 TIME_SCALE=0.02 처럼 줄여서 빠르게 돌릴 수 있습니다.
const SCALE = Number(process.env.TIME_SCALE || 1);
const T = {
  CARD_CHECK: 10000,   // 처음 카드 확인 시간
  ACT: 30000,          // 역할별 밤 행동 제한 시간
  DOPPEL: 45000,       // 도플갱어 (두 단계라 더 길게)
  MIN_STEP: 8000,      // 행동이 빨리 끝나도 최소 이만큼은 기다림 (정보 노출 방지)
  IDLE_MIN: 8000,      // 아무도 없는 역할 차례에 기다리는 시간 (무작위)
  IDLE_MAX: 16000,
  VOTE: 60000,
};
for (const k of Object.keys(T)) T[k] = Math.max(50, Math.round(T[k] * SCALE));
const LOBBY_GRACE = 30000;        // 대기실에서 연결이 끊긴 플레이어를 내보내기까지
const ROOM_TTL = 10 * 60000;      // 모두 나간 방을 지우기까지
const HOST_GRACE = 20000;         // 방장 연결이 끊긴 뒤 방장을 넘기기까지

// 도플갱어가 따라 했을 때, 원래 역할 차례에 함께 깨어나는 역할
const WAKE_WITH = ['werewolf', 'minion', 'mason', 'insomniac'];
// 도플갱어가 따라 했을 때, 그 자리에서 바로 능력을 쓰는 역할
const ACT_NOW = ['seer', 'robber', 'troublemaker', 'drunk'];

const app = express();
const server = http.createServer(app);
const io = new Server(server);
// 호스팅 서비스가 서버 상태를 확인하는 주소
app.get('/healthz', (_req, res) => res.json({ ok: true, rooms: rooms.size }));
app.use(express.static(path.join(__dirname, 'public')));

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
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do code = Array.from({ length: 4 }, () => pick(chars)).join('');
  while (rooms.has(code));
  return code;
}
function cleanName(name) {
  const s = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 12);
  return s || null;
}
const rn = (r) => `${ROLES[r].emoji} ${ROLES[r].name}`;

// 마지막 글자에 받침이 있는지 보고 조사(이/가, 와/과)를 고름
function hasBatchim(s) {
  const t = String(s).replace(/[)\]\s]+$/, '');
  const ch = t[t.length - 1] || '';
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[013678]/.test(ch)) return true;
  if (/[lmnr]/i.test(ch)) return true;
  return false;
}
const ga = (s) => s + (hasBatchim(s) ? '이' : '가');
const wa = (s) => s + (hasBatchim(s) ? '과' : '와');
const deckTotal = (deck) => ROLE_ORDER.reduce((s, r) => s + (deck[r] || 0), 0);

// ---------- 방 ----------
function createRoom() {
  const room = {
    code: genCode(),
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
    cleanupTimer: null,
  };
  rooms.set(room.code, room);
  return room;
}

const pn = (room, id) => room.players.get(id)?.name ?? '?';

function connectedIds(room) {
  return room.order.filter((id) => room.players.get(id)?.connected);
}

function ensureHost(room) {
  const host = room.players.get(room.hostId);
  if (host && host.connected) return;
  const next = connectedIds(room)[0] || room.order[0] || null;
  if (next && next !== room.hostId) {
    room.hostId = next;
    sysChat(room, `${pn(room, next)}님이 방장이 되었습니다.`);
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
  sysChat(room, `${p.name}님이 나갔습니다.`);
  if (room.order.length === 0) {
    rooms.delete(room.code);
    return;
  }
  ensureHost(room);
  autoDeck(room);
}

function scheduleCleanup(room) {
  if (connectedIds(room).length > 0) return;
  clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => {
    if (connectedIds(room).length === 0) {
      clearGameTimers(room);
      rooms.delete(room.code);
    }
  }, ROOM_TTL);
}

function sysChat(room, text) {
  pushChat(room, { system: true, text, ts: Date.now() });
}
function pushChat(room, msg) {
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
    phase: room.phase,
    hostId: room.hostId,
    me: pid,
    players: room.order.map((id) => {
      const p = room.players.get(id);
      return {
        id, name: p.name, connected: p.connected,
        ready: !!p.ready,
        voted: !!(g && room.phase === 'vote' && g.votes[id] !== undefined),
      };
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
    v.prompt = pr ? { ...pr } : null;
    // 남은 시간은 행동하는 사람과 카드 확인 단계에만 알려줌 (누가 있는지 시간으로 짐작 못 하게)
    v.stepEndsAt = (pr && !pr.done) || g.stepRole === '_check' ? g.stepEndsAt : null;
    v.dayEndsAt = g.dayEndsAt;
    v.voteEndsAt = g.voteEndsAt;
    v.myVote = g.votes[pid] ?? null;
  }
  return v;
}

function broadcast(room) {
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

function startGame(room) {
  // 연결이 끊긴 사람은 빼고 시작
  for (const id of [...room.order]) if (!room.players.get(id).connected) removePlayer(room, id);
  const n = room.order.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) return `${MIN_PLAYERS}~${MAX_PLAYERS}명이 필요합니다.`;
  if (deckTotal(room.deck) !== n + 3) return `카드는 인원 + 3장(${n + 3}장)이어야 합니다.`;

  const cards = [];
  for (const r of ROLE_ORDER) for (let i = 0; i < (room.deck[r] || 0); i++) cards.push(r);
  shuffle(cards);

  const g = {
    deck: { ...room.deck },
    original: {}, cards: {},
    originalCenter: [], center: [],
    doppelCopy: null, doppelId: null,
    nightLog: {}, timeline: [],
    prompts: {}, promptSeq: 0,
    steps: ['_check', ...NIGHT_ORDER.filter((r) => room.deck[r] > 0)],
    stepIdx: -1, stepRole: null, stepStartedAt: 0, stepEndsAt: 0,
    votes: {}, dayEndsAt: null, voteEndsAt: null,
    timer: null, token: 0,
  };
  room.order.forEach((id, i) => {
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
  sysChat(room, '🌙 밤이 되었습니다. 채팅이 잠깁니다.');
  runStep(room, 0);
  return null;
}

function eff(g, card) {
  return card === 'doppelganger' ? (g.doppelCopy || 'doppelganger') : card;
}

// 이번 역할 차례에 깨어나는 사람
function actorsFor(room, role) {
  const g = room.game;
  return room.order.filter((pid) => {
    const o = g.original[pid];
    if (o === role) return true;
    return o === 'doppelganger' && g.doppelCopy === role && WAKE_WITH.includes(role);
  });
}

function label(room, pid) {
  const g = room.game;
  const o = g.original[pid];
  const r = o === 'doppelganger' && g.doppelCopy ? `도플갱어-${ROLES[g.doppelCopy].name}` : ROLES[o].name;
  return `${pn(room, pid)}(${r})`;
}

function log(room, pid, text) {
  room.game.nightLog[pid].push(text);
}
function timeline(room, text) {
  room.game.timeline.push(text);
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

  if (role === '_check') {
    g.stepEndsAt = now + T.CARD_CHECK;
    setGameTimer(room, T.CARD_CHECK, () => runStep(room, idx + 1));
    return broadcast(room);
  }

  const actors = actorsFor(room, role);
  for (const pid of actors) makePrompt(room, pid, role, actors);

  const dur = actors.length ? (role === 'doppelganger' ? T.DOPPEL : T.ACT) : rand(T.IDLE_MIN, T.IDLE_MAX);
  g.stepEndsAt = now + dur;
  setGameTimer(room, dur, () => endStep(room));
  broadcast(room);
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
        const text = `동료 늑대인간: ${names(others)}`;
        log(room, pid, `🐺 ${text}`);
        return setPrompt(room, pid, { type: 'info', title: '늑대인간', text });
      }
      log(room, pid, '🐺 늑대인간은 당신 혼자입니다.');
      return setPrompt(room, pid, { type: 'lonewolf' });
    case 'minion': {
      const wolves = actorsFor(room, 'werewolf');
      const text = wolves.length ? `늑대인간: ${names(wolves)}` : '플레이어 중에 늑대인간이 없습니다. (모두 가운데에 있습니다)';
      log(room, pid, `🦹 ${text}`);
      return setPrompt(room, pid, { type: 'info', title: '하수인', text });
    }
    case 'mason': {
      const text = others.length ? `다른 프리메이슨: ${names(others)}` : '다른 프리메이슨은 플레이어 중에 없습니다.';
      log(room, pid, `🔨 ${text}`);
      return setPrompt(room, pid, { type: 'info', title: '프리메이슨', text });
    }
    case 'insomniac': {
      const now = g.cards[pid];
      const text = `당신의 현재 카드: ${rn(now)}`;
      log(room, pid, `🥱 ${text}`);
      timeline(room, `🥱 ${ga(label(room, pid))} 자신의 카드를 확인했습니다 → ${rn(now)}`);
      return setPrompt(room, pid, { type: 'info', title: '불면증환자', text });
    }
    default: // seer, robber, troublemaker, drunk
      return setPrompt(room, pid, { type: role });
  }
}

const isPlayer = (room, id) => room.order.includes(id);
const validCenter = (c) => Number.isInteger(c) && c >= 0 && c <= 2;

// 밤 행동 처리. 오류가 있으면 문자열을 돌려줍니다.
function doAction(room, pid, data, auto = false) {
  const g = room.game;
  const p = g.prompts[pid];
  if (room.phase !== 'night' || !p || p.done) return '지금은 행동할 수 없습니다.';
  data = data || {};
  const tag = auto ? ' (시간 초과로 자동 선택)' : '';

  switch (p.type) {
    case 'info':
      p.done = true;
      break;

    case 'lonewolf': {
      if (data.skip) { p.done = true; break; }
      if (!validCenter(data.center)) return '가운데 카드를 고르세요.';
      const c = g.center[data.center];
      log(room, pid, `🐺 가운데 ${data.center + 1}번 카드: ${rn(c)}`);
      timeline(room, `🐺 ${ga(label(room, pid))} 가운데 ${data.center + 1}번 카드를 봤습니다 → ${rn(c)}`);
      p.done = true;
      break;
    }

    case 'doppelganger': {
      const t = data.player;
      if (!isPlayer(room, t) || t === pid) return '다른 플레이어를 고르세요.';
      const copy = g.cards[t];
      g.doppelCopy = copy;
      log(room, pid, `🎭 ${pn(room, t)}의 카드는 ${rn(copy)}입니다. 당신은 이제 ${ROLES[copy].name}입니다.${tag}`);
      timeline(room, `🎭 ${pn(room, pid)}(도플갱어)가 ${pn(room, t)}의 카드를 보고 ${ga(rn(copy))} 되었습니다`);
      if (ACT_NOW.includes(copy)) {
        setPrompt(room, pid, { type: copy, fromDoppel: true });
      } else {
        if (WAKE_WITH.includes(copy)) log(room, pid, `🎭 ${ROLES[copy].name}의 차례에 다시 깨어납니다.`);
        p.done = true;
      }
      break;
    }

    case 'seer': {
      if (data.skip) { p.done = true; break; }
      if (data.player !== undefined) {
        const t = data.player;
        if (!isPlayer(room, t) || t === pid) return '다른 플레이어를 고르세요.';
        log(room, pid, `🔮 ${pn(room, t)}의 카드: ${rn(g.cards[t])}`);
        timeline(room, `🔮 ${ga(label(room, pid))} ${pn(room, t)}의 카드를 봤습니다 → ${rn(g.cards[t])}`);
      } else {
        const cs = data.centers;
        if (!Array.isArray(cs) || cs.length !== 2 || !cs.every(validCenter) || cs[0] === cs[1]) return '가운데 카드 2장을 고르세요.';
        const txt = cs.map((c) => `${c + 1}번 ${rn(g.center[c])}`).join(', ');
        log(room, pid, `🔮 가운데 카드: ${txt}`);
        timeline(room, `🔮 ${ga(label(room, pid))} 가운데 카드를 봤습니다 → ${txt}`);
      }
      p.done = true;
      break;
    }

    case 'robber': {
      if (data.skip) {
        log(room, pid, '🗡️ 카드를 훔치지 않았습니다.');
        p.done = true;
        break;
      }
      const t = data.player;
      if (!isPlayer(room, t) || t === pid) return '다른 플레이어를 고르세요.';
      [g.cards[pid], g.cards[t]] = [g.cards[t], g.cards[pid]];
      log(room, pid, `🗡️ ${wa(pn(room, t))} 카드를 바꿨습니다. 당신의 새 카드: ${rn(g.cards[pid])}`);
      timeline(room, `🗡️ ${ga(label(room, pid))} ${pn(room, t)}의 카드를 훔쳤습니다 → ${rn(g.cards[pid])}`);
      p.done = true;
      break;
    }

    case 'troublemaker': {
      if (data.skip) {
        log(room, pid, '🃏 카드를 바꾸지 않았습니다.');
        p.done = true;
        break;
      }
      const ps = data.players;
      if (!Array.isArray(ps) || ps.length !== 2 || ps[0] === ps[1] || !ps.every((x) => isPlayer(room, x) && x !== pid)) {
        return '자신을 제외한 두 명을 고르세요.';
      }
      const [a, b] = ps;
      [g.cards[a], g.cards[b]] = [g.cards[b], g.cards[a]];
      log(room, pid, `🃏 ${wa(pn(room, a))} ${pn(room, b)}의 카드를 바꿨습니다.`);
      timeline(room, `🃏 ${ga(label(room, pid))} ${wa(pn(room, a))} ${pn(room, b)}의 카드를 바꿨습니다`);
      p.done = true;
      break;
    }

    case 'drunk': {
      if (!validCenter(data.center)) return '가운데 카드를 고르세요.';
      const c = data.center;
      [g.cards[pid], g.center[c]] = [g.center[c], g.cards[pid]];
      log(room, pid, `🍺 가운데 ${c + 1}번 카드와 바꿨습니다. (새 카드는 모릅니다)${tag}`);
      timeline(room, `🍺 ${ga(label(room, pid))} 가운데 ${c + 1}번 카드와 바꿨습니다 → ${rn(g.cards[pid])}`);
      p.done = true;
      break;
    }

    default:
      return '알 수 없는 행동입니다.';
  }
  return null;
}

function finishPending(room) {
  const g = room.game;
  for (const pid of Object.keys(g.prompts)) {
    for (let guard = 0; guard < 5; guard++) {
      const p = g.prompts[pid];
      if (!p || p.done) break;
      if (p.type === 'doppelganger') {
        doAction(room, pid, { player: pick(room.order.filter((x) => x !== pid)) }, true);
      } else if (p.type === 'drunk') {
        doAction(room, pid, { center: rand(0, 2) }, true);
      } else {
        if (p.type !== 'info') log(room, pid, '⏰ 시간이 지나 아무 행동도 하지 않았습니다.');
        p.done = true;
      }
    }
  }
}

function endStep(room) {
  finishPending(room);
  runStep(room, room.game.stepIdx + 1);
}

function checkStepDone(room) {
  const g = room.game;
  const all = Object.values(g.prompts);
  if (!all.length || all.some((p) => !p.done)) return;
  const wait = Math.max(0, g.stepStartedAt + T.MIN_STEP - Date.now());
  setGameTimer(room, wait, () => endStep(room));
}

function startDay(room) {
  const g = room.game;
  g.prompts = {};
  g.stepRole = null;
  room.phase = 'day';
  g.dayEndsAt = Date.now() + Math.round(room.settings.dayTime * 1000 * SCALE);
  for (const id of room.order) room.players.get(id).ready = false;
  sysChat(room, '☀️ 아침이 밝았습니다! 토론을 시작하세요.');
  setGameTimer(room, g.dayEndsAt - Date.now(), () => startVote(room));
  broadcast(room);
}

function startVote(room) {
  const g = room.game;
  room.phase = 'vote';
  g.votes = {};
  g.voteEndsAt = Date.now() + T.VOTE;
  sysChat(room, '🗳️ 투표 시간입니다! 죽일 사람을 고르세요.');
  setGameTimer(room, T.VOTE, () => resolve(room));
  broadcast(room);
}

function checkAllReady(room) {
  const ids = connectedIds(room);
  if (ids.length && ids.every((id) => room.players.get(id).ready)) startVote(room);
}

function checkAllVoted(room) {
  const g = room.game;
  const ids = connectedIds(room);
  if (ids.length && ids.every((id) => g.votes[id] !== undefined)) {
    setGameTimer(room, 1500, () => resolve(room));
  }
}

function resolve(room) {
  const g = room.game;
  clearGameTimers(room);
  const ids = room.order;
  const counts = Object.fromEntries(ids.map((i) => [i, 0]));
  for (const t of Object.values(g.votes)) if (t in counts) counts[t]++;
  const max = Math.max(...Object.values(counts));
  const dead = max > 1 ? ids.filter((i) => counts[i] === max) : [];

  const final = Object.fromEntries(ids.map((i) => [i, eff(g, g.cards[i])]));
  const team = (role) => ROLES[role].team;

  // 사냥꾼: 죽으면 자기가 투표한 사람도 데려감
  const hunterKills = [];
  const queue = [...dead];
  while (queue.length) {
    const d = queue.shift();
    const t = g.votes[d];
    if (final[d] === 'hunter' && t && !dead.includes(t)) {
      dead.push(t);
      queue.push(t);
      hunterKills.push({ hunter: d, target: t });
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
    players, winners, hunterKills,
    noDeath: dead.length === 0,
    wolvesInPlay: wolves.length,
    center: { original: g.originalCenter, final: g.center },
    doppelCopy: g.doppelCopy,
    timeline: g.timeline,
  };
  room.phase = 'result';
  const wn = winners.length ? winners.map((w) => WW.TEAM_NAME[w]).join(', ') + ' 승리!' : '아무도 이기지 못했습니다.';
  sysChat(room, `🏁 게임 종료 — ${wn}`);
  broadcast(room);
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
  broadcast(room);
}

// ---------- 소켓 ----------
io.on('connection', (socket) => {
  const ctx = () => {
    const room = rooms.get(socket.data.code);
    const pid = socket.data.pid;
    if (!room || !room.players.has(pid)) return {};
    return { room, pid, isHost: room.hostId === pid };
  };
  const reply = (cb, v) => typeof cb === 'function' && cb(v);

  function attach(room, pid) {
    const p = room.players.get(pid);
    if (p.socketId && p.socketId !== socket.id) io.sockets.sockets.get(p.socketId)?.disconnect(true);
    p.socketId = socket.id;
    p.connected = true;
    socket.data.code = room.code;
    socket.data.pid = pid;
    socket.join(room.code);
    clearTimeout(p.leaveTimer);
    clearTimeout(room.cleanupTimer);
    socket.emit('chatHistory', room.chat);
  }

  socket.on('create', ({ name, playerId } = {}, cb) => {
    name = cleanName(name);
    if (!name) return reply(cb, { ok: false, error: '닉네임을 입력하세요.' });
    if (!playerId || typeof playerId !== 'string') return reply(cb, { ok: false, error: '잘못된 요청입니다.' });
    const room = createRoom();
    room.players.set(playerId, { id: playerId, name, connected: true, socketId: null, ready: false });
    room.order.push(playerId);
    room.hostId = playerId;
    attach(room, playerId);
    sysChat(room, `${name}님이 방을 만들었습니다.`);
    reply(cb, { ok: true, code: room.code });
    broadcast(room);
  });

  socket.on('join', ({ code, name, playerId, rejoin } = {}, cb) => {
    const room = rooms.get(String(code || '').toUpperCase().trim());
    if (!room) return reply(cb, { ok: false, error: '방을 찾을 수 없습니다.' });
    if (!playerId || typeof playerId !== 'string') return reply(cb, { ok: false, error: '잘못된 요청입니다.' });

    if (room.players.has(playerId)) {
      // 재접속
      attach(room, playerId);
      ensureHost(room);
      reply(cb, { ok: true, code: room.code });
      return broadcast(room);
    }
    if (rejoin) return reply(cb, { ok: false, error: '이전 방에 다시 들어갈 수 없습니다.' });
    name = cleanName(name);
    if (!name) return reply(cb, { ok: false, error: '닉네임을 입력하세요.' });
    if (room.phase !== 'lobby') return reply(cb, { ok: false, error: '이미 게임이 진행 중입니다. 게임이 끝나면 다시 시도하세요.' });
    if (room.order.length >= MAX_PLAYERS) return reply(cb, { ok: false, error: `방이 가득 찼습니다. (최대 ${MAX_PLAYERS}명)` });

    const names = new Set(room.order.map((id) => room.players.get(id).name));
    let final = name;
    for (let i = 2; names.has(final); i++) final = `${name.slice(0, 10)}${i}`;
    room.players.set(playerId, { id: playerId, name: final, connected: true, socketId: null, ready: false });
    room.order.push(playerId);
    attach(room, playerId);
    if (!room.players.has(room.hostId)) ensureHost(room);
    autoDeck(room);
    sysChat(room, `${final}님이 들어왔습니다.`);
    reply(cb, { ok: true, code: room.code });
    broadcast(room);
  });

  socket.on('leave', (_, cb) => {
    const { room, pid } = ctx();
    if (!room) return reply(cb, { ok: true });
    socket.leave(room.code);
    socket.data.code = null;
    if (room.phase === 'lobby' || room.phase === 'result') {
      removePlayer(room, pid);
    } else {
      const p = room.players.get(pid);
      p.connected = false;
      p.socketId = null;
      sysChat(room, `${p.name}님이 게임을 떠났습니다.`);
      ensureHost(room);
      if (room.phase === 'day') checkAllReady(room);
      if (room.phase === 'vote') checkAllVoted(room);
      scheduleCleanup(room);
    }
    reply(cb, { ok: true });
    if (rooms.has(room.code)) broadcast(room);
  });

  socket.on('kick', ({ id } = {}) => {
    const { room, pid, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'lobby' || id === pid || !room.players.has(id)) return;
    const p = room.players.get(id);
    if (p.socketId) {
      const s = io.sockets.sockets.get(p.socketId);
      if (s) { s.emit('kicked'); s.leave(room.code); s.data.code = null; }
    }
    removePlayer(room, id);
    broadcast(room);
  });

  socket.on('setDeck', ({ role, count } = {}) => {
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'lobby' || !ROLES[role]) return;
    const c = Math.max(0, Math.min(ROLES[role].max, Number(count) | 0));
    room.deck[role] = c;
    room.deckCustom = true;
    broadcast(room);
  });

  socket.on('preset', () => {
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'lobby') return;
    room.deckCustom = false;
    autoDeck(room);
    broadcast(room);
  });

  socket.on('setSettings', ({ dayTime } = {}) => {
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'lobby') return;
    const d = Number(dayTime);
    if ([60, 120, 180, 240, 300, 420, 600].includes(d)) room.settings.dayTime = d;
    broadcast(room);
  });

  socket.on('start', (_, cb) => {
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'lobby') return reply(cb, { ok: false, error: '시작할 수 없습니다.' });
    const err = startGame(room);
    if (err) {
      reply(cb, { ok: false, error: err });
      return broadcast(room);
    }
    reply(cb, { ok: true });
  });

  socket.on('nightAction', (data, cb) => {
    const { room, pid } = ctx();
    if (!room || !room.game) return reply(cb, { ok: false, error: '게임이 없습니다.' });
    const err = doAction(room, pid, data);
    if (err) return reply(cb, { ok: false, error: err });
    reply(cb, { ok: true });
    checkStepDone(room);
    broadcast(room);
  });

  socket.on('ready', ({ ready } = {}) => {
    const { room, pid } = ctx();
    if (!room || room.phase !== 'day') return;
    room.players.get(pid).ready = !!ready;
    broadcast(room);
    checkAllReady(room);
  });

  socket.on('forceVote', () => {
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'day') return;
    startVote(room);
  });

  socket.on('vote', ({ target } = {}, cb) => {
    const { room, pid } = ctx();
    if (!room || room.phase !== 'vote') return reply(cb, { ok: false, error: '지금은 투표할 수 없습니다.' });
    if (!isPlayer(room, target) || target === pid) return reply(cb, { ok: false, error: '자신이 아닌 플레이어를 고르세요.' });
    room.game.votes[pid] = target;
    reply(cb, { ok: true });
    broadcast(room);
    checkAllVoted(room);
  });

  socket.on('playAgain', () => {
    const { room, isHost } = ctx();
    if (!room || !isHost || room.phase !== 'result') return;
    backToLobby(room);
  });

  socket.on('chat', ({ text } = {}) => {
    const { room, pid } = ctx();
    if (!room) return;
    if (room.phase === 'night') return;
    const t = String(text || '').trim().slice(0, 300);
    if (!t) return;
    const now = Date.now();
    if (socket.data.lastChat && now - socket.data.lastChat < 400) return;
    socket.data.lastChat = now;
    pushChat(room, { id: pid, name: pn(room, pid), text: t, ts: now });
  });

  socket.on('disconnect', () => {
    const { room, pid } = ctx();
    if (!room) return;
    const p = room.players.get(pid);
    if (p.socketId !== socket.id) return; // 이미 다른 탭/기기로 재접속함
    p.connected = false;
    p.socketId = null;
    // 새로고침 정도로 방장이 바뀌지 않도록 잠시 기다렸다가 넘김
    if (room.hostId === pid) {
      clearTimeout(p.hostTimer);
      p.hostTimer = setTimeout(() => {
        if (rooms.get(room.code) === room && room.players.get(pid) && !room.players.get(pid).connected) {
          ensureHost(room);
          broadcast(room);
        }
      }, HOST_GRACE);
    }
    if (room.phase === 'lobby') {
      p.leaveTimer = setTimeout(() => {
        if (rooms.get(room.code) === room && room.phase === 'lobby' && room.players.get(pid) && !room.players.get(pid).connected) {
          removePlayer(room, pid);
          if (rooms.has(room.code)) broadcast(room);
        }
      }, LOBBY_GRACE);
    } else if (room.phase === 'day') {
      checkAllReady(room);
    } else if (room.phase === 'vote') {
      checkAllVoted(room);
    }
    scheduleCleanup(room);
    broadcast(room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🐺 한밤의 늑대인간 서버 실행 중: http://localhost:${PORT}`);
});

module.exports = { server, rooms };
