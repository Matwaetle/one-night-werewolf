/* 한밤의 늑대인간 — 화면 렌더 엔진 (SPEC §5~§7, §13.9). 번들: strings -> roles -> art -> app. 전역 없음(IIFE). */
(function () {
  'use strict';
  const W = window, D = document, T = W.T, ART = W.ART, A = W.ASSETS || {};
  const { ROLES, ROLE_ORDER, NIGHT_TEXT, TEAM_NAME } = W.WW;
  const body = D.body, root = D.documentElement, TB = T.body, TH = T.head, TBT = T.btn;
  const $ = (s, r) => (r || D).querySelector(s);
  const $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
  const esc = T.esc, fmt = T.fmt;
  const nmh = (n) => '<b class="nm">' + esc(n) + '</b>';
  const NM = (n) => ({ t: n, h: nmh(n) });
  const names = (a) => ({ t: a.join(', '), h: a.map(nmh).join(', ') });
  const mq = (q) => !!(W.matchMedia && W.matchMedia(q).matches);
  const desk = () => mq('(min-width:1024px)');
  const NOSEL = 'touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none';
  const MARK = { werewolf: ['wolf', TB.markPack], minion: ['minion', TB.markOwner], mason: ['mason', TB.markBro] };

  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 무시 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 무시 */ } },
  };
  let memPid = null;
  function playerId() {
    let id = LS.get('ww_pid') || memPid;
    if (!id) {
      id = (W.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      LS.set('ww_pid', id);
    }
    return (memPid = id);
  }

  // ---------- 상태 ----------
  let S = null, R = null, cssOk = 1, resState = 0, skew = 0, raf = 0, press = null, replayState = 0, voiceOn = LS.get('ww_voice') === '1', chatOff = LS.get('ww_chat') === '0', bgmOn = LS.get('ww_bgm') !== '0', cxState = 0, hs = 0, skipPop = 0, scNow = '', scO = null;
  const ui = {
    shell: 0, sel: [], selC: [], busy: 0, reveals: [], fin: {}, dn: {}, last: null, unk: 0, vsel: null, rule: 0,
    ra: 0, tab: 'chat', h: 0, unread: 0, logNew: 0, intro: 0, out: 0, wait: 0, hb: -1, wk: null, dl: 0, tmax: 1,
    seatKey: '', ids: [], pts: [], seats: {}, me: 0, descRole: '', warn: 0, off: 0, pending: null, bootT0: Date.now(), fan: {}, stick: 1, ck: '', chatTop: 0,
  };
  const timers = [];
  const later = (ms, fn) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clearLater = () => timers.splice(0).forEach(clearTimeout);
  const nowS = () => Date.now() + skew, dayEl = () => S.settings.dayTime * 1000 - (S.dayEndsAt - nowS());
  const isHost = () => !!S && S.hostId === S.me;
  const others = () => S.players.filter((p) => p.id !== S.me);
  const short = (n) => { const a = Array.from(n); return a.length > 6 ? a.slice(0, 6).join('') + '…' : n; };
  const pname = (id) => { const p = (S && S.players.find((x) => x.id === id)) || (R && R.players.find((x) => x.id === id)); return p ? p.name : '?'; };
  const sum = (o) => ROLE_ORDER.reduce((s, r) => s + ((o && o[r]) || 0), 0);
  const sr = (t) => { const e = $('#sr'); if (e) e.textContent = t || ''; };
  const idle = (fn, t) => (W.requestIdleCallback ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, 300));
  function patch(el, h) { if (el._h === h) return false; el._h = h; el.innerHTML = h; ART.mark(el); return true; }
  function set(el, k, v) { if (el[k] !== v) el[k] = v; }

  // ---------- FX (fx.js 는 지연 로드: 로드 전 호출은 FX.q 에 쌓이고 fx.js 가 재생한다) ----------
  W.FX = W.FX || { q: [] }; W.SND = W.SND || { q: [] };
  function qcall(o, n, a, max) {   // 지연 모듈 호출: 로드 전에는 큐에 쌓고, 로드되면 모듈이 큐를 재생한다
    if (typeof o[n] === 'function') { try { return o[n].apply(o, a); } catch (e) { /* 연출 실패는 무시 */ } }
    else if (o.q && o.q.length < max) o.q.push([n, a]);
  }
  const fx = (n, ...a) => qcall(W.FX, n, a, 16);
  const snd = (n, ...a) => { if (bgmOn) qcall(W.SND, n, a, 8); };
  function addScript(src, cb) {
    if (!/\.js$/.test(src || '')) return cb(false);
    const s = D.createElement('script'); s.src = src; s.async = true;
    s.onload = () => cb(true); s.onerror = () => { s.remove(); cb(false); };
    D.head.appendChild(s);
  }
  const ldA = () => { if (!W.SND.ld) { W.SND.ld = 1; addScript(A.audio, () => {}); } };
  function loadAssets() {
    if (/\.css$/.test(A.css || '')) { const l = D.createElement('link'); l.rel = 'stylesheet'; l.href = A.css; cssOk = 0; l.onload = l.onerror = () => { cssOk = 1; sched(); }; D.head.appendChild(l); }
    addScript(A.fx, () => {});
    idle(() => { if (bgmOn) ldA(); }, 7000);
    idle(() => { try { D.fonts.load('400 18px Hanbam', TH.sign); } catch (e) { /* 무시 */ } }, 3000);
  }
  function loadChatx() {   // 채팅 보조 모듈(답글): 채팅을 껐으면 불러오지 않는다
    if (chatOff || cxState) return; cxState = 1;
    addScript(A.chatx, (ok) => { cxState = ok && W.CHATX ? 2 : 0; if (cxState) W.CHATX.init({ toast }); });
  }
  const dvh = !!(W.CSS && CSS.supports && CSS.supports('height', '1dvh'));
  const vp = () => { if (!dvh) root.style.setProperty('--app-h', W.innerHeight + 'px'); };   // 모바일 주소창이 나타나고 사라질 때 화면 높이를 따라간다 (dvh 미지원 브라우저용 --app-h. 지원하면 CSS 100dvh 가 따라간다)
  function loadReplay() {
    if (replayState === 1 || replayState === 2) return;
    if (W.REPLAY) { replayState = 2; return onReplay(); }
    replayState = 1;
    addScript(A.replay, (ok) => {
      replayState = ok && W.REPLAY ? 2 : 0;
      if (replayState === 2) return onReplay();
      timeUp(); if ((ui.rpTry = (ui.rpTry || 0) + 1) < 4) setTimeout(loadReplay, ui.rpTry * 3000);
    });
  }

  function loadResult() {
    if (resState) return;
    resState = 1;
    addScript(A.result, (ok) => {
      resState = ok && W.RESULT ? 2 : 0;
      const q = ui.rq; ui.rq = 0; if (resState === 2) { W.RESULT.init(X); sched(); }
      if (resState === 2) { if (q) q.forEach((f) => f()); } else if ((ui.rsTry = (ui.rsTry || 0) + 1) < 4) { ui.rq = q; setTimeout(loadResult, ui.rsTry * 3000); } else if (S && S.phase === 'result') resFallback();
    });
  }
  const resFallback = () => { if ($('.board') && R) fx('resFb', R); };
  const withRes = (fn) => { if (resState === 2) fn(); else { (ui.rq = ui.rq || []).push(fn); loadResult(); } };

  // ---------- 토스트 · TTS · 화면 깨우기 ----------
  let toastT;
  function toast(msg, kind) {
    const t = $('#toast');
    t.hidden = true; t.textContent = msg;
    if (kind) t.dataset.kind = kind; else delete t.dataset.kind;
    void t.offsetWidth; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 1800);
  }
  const fail = (msg) => { toast(msg, 'danger'); fx('buzz', [10, 40, 10]); };
  const speak = (text) => { if (voiceOn) fx('speak', text, snd); };
  let wl = null, wlWant = false;
  async function wake(on) {
    wlWant = on;
    try {
      if (on && !wl && navigator.wakeLock && !D.hidden) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
      else if (!on && wl) { const w = wl; wl = null; await w.release(); }
    } catch (e) { /* 지원 안 함 */ }
  }

  // ---------- 소켓 ----------
  if (typeof W.io !== 'function') {   // socket.io 묶음을 못 받았다: 안내와 새로고침 버튼만 보인다
    const b = $('#homeBoot'); $('#home').dataset.boot = '1'; b.hidden = false; b.textContent = TB.loadFail + ' ';
    const r = D.createElement('button'); r.type = 'button'; r.className = 'btn-sub'; r.innerHTML = '<span class="lbl">' + esc(TBT.reload) + '</span>'; r.onclick = () => location.reload(); b.appendChild(r);
    return;
  }
  const sock = W.io(W.SOCKET_URL || '', { transports: ['websocket', 'polling'], tryAllTransports: true, auth: { v: A.ver } });
  const online = () => sock.connected && !ui.off;
  function send(ev, data, cb) {
    let tries = 0;
    const t0 = Date.now(), go = () => {
      if (!sock.connected) { if (Date.now() - t0 > 8000) { fail(TB.ackFail); return cb && cb(null); } return setTimeout(go, 250); }   // 재접속 중이면 최대 8초 기다린다
      sock.timeout(5000).emit(ev, data, (err, r) => {
        if (err) { if (tries++ < 1) return go(); fail(TB.ackFail); return cb && cb(null); }
        if (r && r.ok === false) fail(r.error || TB.error);
        if (cb) cb(r || { ok: true });
      });
    };
    go();
  }
  let lp = Date.now();
  sock.io.on('ping', () => { lp = Date.now(); });
  const stale = () => { const e = sock.io.engine; if (sock.connected && e && Date.now() - lp > (e.pingInterval || 20000) + 3000) e.close(); };   // 조용히 끊긴 연결을 바로 재접속
  sock.on('connect', () => {
    lp = Date.now();
    setBoot(false);
    if (resState === 0) loadResult(); if (replayState === 0 && S && S.phase !== 'lobby') loadReplay();
    const code = LS.get('ww_room'), run = () => { const f = ui.pending; ui.pending = null; if (f) f(); };
    const back = () => {   // 방에 다시 들어간 응답을 받은 뒤에야 연결이 돌아왔다고 알린다
      if (!ui.off) return;
      ui.off = 0; clearTimeout(ui.connT); body.removeAttribute('data-conn');
      const c = $('#conn'); c.hidden = true; c.innerHTML = ''; delete c.dataset.state; toast(TB.reconnected);
    };
    const retry = () => { ui.rjN = (ui.rjN || 0) + 1; sock.disconnect(); setTimeout(() => { if (!ui.replaced) sock.connect(); }, Math.min(30000, 1000 * 2 ** ui.rjN)); };
    if (code) {
      sock.timeout(5000).emit('join', { code, playerId: playerId(), rejoin: true, name: LS.get('ww_name') || undefined }, (err, r) => {
        if (err) return retry();
        ui.rjN = 0;
        if (r && r.ok) { back(); run(); } else if (r && (r.code === 'noTown' || r.code === 'cannotReturn')) { back(); LS.del('ww_room'); toHome(); toast(r.code === 'noTown' ? TB.roomLost : TB.leftAway, 'danger'); run(); } else retry();
      });
    } else { back(); run(); }
  });
  function connBar(k) {   // 연결 띠: 재접속 초 세기 · 다른 창(1) · 새 버전(2). 지연 모듈에 기대지 않는다
    const c = $('#conn'), b = (a, l) => ' <button class="btn-sub" type="button" data-act="' + a + '"><span class="lbl">' + esc(l) + '</span></button>';
    clearTimeout(ui.connT); delete c.dataset.state;
    if (k) { c.innerHTML = esc(k < 2 ? TB.otherTab : TB.newVersion) + (k < 2 ? b('here', TBT.continueHere) : b('reload', TBT.reload)); c.hidden = false; return; }
    if (!ui.off) return;
    const n = Math.max(1, Math.floor((Date.now() - ui.off) / 1000)), j = n >= 120 ? 2 : n >= 20 ? 1 : 0;
    c.hidden = false;
    if (c._k !== j || !$('.conn-t', c)) { c._k = j; c.innerHTML = '<span class="conn-t"></span>' + (j ? ' ' + esc(TB.reconnectSlow) + b('reload', TBT.reload) : '') + (j > 1 ? b('goHome', TB.goHome) : ''); }
    $('.conn-t', c).textContent = fmt(TB.reconnecting, { n });
    ui.connT = setTimeout(connBar, 1000);
  }
  sock.on('disconnect', (reason) => {
    if (S) { ui.off = Date.now(); body.dataset.conn = 'off'; if (reason !== 'io server disconnect') connBar(); } else setBoot(true);
    sched();
  });
  sock.on('outdated', () => {   // 서버가 더 새 버전이다: 홈이면 바로 새로 고치고(한 번만), 판 중이면 띠에 버튼을 둔다
    const t = +LS.get('ww_out') || 0;
    if (!S && Date.now() - t > 60000) { LS.set('ww_out', Date.now()); Promise.resolve(swReg && swReg.update()).catch(() => {}).then(() => location.reload()); return; }
    connBar(2);
  });
  sock.on('replaced', () => { ui.replaced = 1; connBar(1); });   // 같은 자리에 다른 창이 접속했다: 자동 재접속을 멈추고 이 창에서 계속할지 묻는다
  sock.on('state', (s) => {
    if (!s || typeof s !== 'object' || !s.phase) return;
    try {
      const p = S; S = s; if (typeof s.now === 'number') skew = s.now - Date.now();
      LS.set('ww_room', s.code);
      if (s.result) R = s.result;
      ensureShell();
      if (!p) { idle(loadResult, 3000); idle(loadChatx, 5000); }   // 방에 들어온 첫 상태에서 지연 모듈을 부른다
      if (!p || p.gameId !== s.gameId) newGame();
      if (!p || p.phase !== s.phase) onPhase(p && p.phase, s.phase, !p);
      else if (s.phase === 'night' && p.stepIdx !== s.stepIdx) onStep();
      resend();
      if (s.prompt && (!p || !p.prompt || p.prompt.key !== s.prompt.key)) { ui.sel = []; ui.selC = []; ui.busy = 0; }
      const pr = s.prompt;   // 불면증환자: 지금 카드를 큰 카드로 한 번만 보여 준다
      if (pr && pr.type === 'info' && pr.reveal && !pr.done && !ui.dn['rv' + pr.key]) { ui.dn['rv' + pr.key] = 1; ui.reveals.push(...pr.reveal.map((r) => ({ k: 'p', id: r.id, self: 'now', role: r.role }))); ART.want(pr.reveal.map((r) => r.role)); }
    } catch (e) { console.error(e); } finally { sched(); }
  });
  sock.on('chatHistory', (m, code) => {
    try {
      const l = $('#chatLog'), same = code && ui.chatCode === code; if (!Array.isArray(m)) return; ui.chatCode = code; { const lm = m.length ? m[m.length - 1].mid : 0; ui.chatBuf = m.concat((ui.chatBuf || []).filter((x) => x.mid > lm && m.indexOf(x) < 0)); } if (!l) return;
      const keep = !same && $('.msg[data-cid]', l);   // 방이 바뀌면 아직 확인 못 받은 내 글은 입력창으로 돌려놓는다 (같은 방이면 줄이 그대로 남는다)
      if (!same) { l.innerHTML = ''; ui.lastMid = 0; ui.stick = 1; const cf = $('.chat-form'); if (cf) delete cf.dataset.re; } m.forEach((x) => { if (!same || x.mid > ui.lastMid) addChat(x, 1); }); if (keep) { const i = $('#chatInput'); if (i && !i.value) i.value = keep.dataset.t; }
      if (ui.stick) toEnd();
    } catch (e) { console.error(e); }
  });
  sock.on('chat', (m) => { try { if (!$('#chatLog')) { (ui.chatBuf = ui.chatBuf || []).push(m); return; } addChat(m); } catch (e) { console.error(e); } });
  sock.on('kicked', () => { LS.del('ww_room'); toHome(); toast(TB.kicked, 'danger'); });

  const rclose = () => { try { W.REPLAY && REPLAY.close(); } catch (e) { /* 무시 */ } $$('.msg[data-kind=end][hidden]').forEach((e) => { e.hidden = false; }); };
  const rbad = (t) => { if (body.dataset.replay && /\/replay\./.test(t)) { rclose(); body.removeAttribute('data-replay'); sched(); } };
  W.addEventListener('unhandledrejection', (e) => rbad(String(e.reason && e.reason.stack || '')));
  W.addEventListener('error', (e) => rbad(e.filename || ''));
  function toHome() {
    S = null; R = null; ui.seatKey = ''; closeModal(); if (ui.shell) closeSheet();
    rclose();
    body.removeAttribute('data-replay'); body.removeAttribute('data-ns'); wake(false); fx('heartbeat', 0); fx('lidsOpen', 0);
    clearLater(); D.title = TB.docTitle; applyUpdate(); sched();
  }
  function newGame() {
    Object.assign(ui, { sel: [], selC: [], reveals: [], fin: {}, dn: {}, last: null, unk: 0, vsel: null, rule: 0, busy: 0, logNew: 0, wk: null, ra: 0, rerr: 0 });
  }
  function onPhase(from, to, first) {
    clearLater(); coverAll(); ui.hb = -1; ui.intro = 0; ui.wait = 0;
    if (first && to !== 'lobby') ART.warm();   // 게임 도중 재접속: 대기실 warm을 건너뛰었으므로 여기서 받는다
    if (to !== 'result') { body.removeAttribute('data-replay'); }
    if (to !== 'night') D.title = TB.docTitle;
    if (to === 'lobby') {
      rclose();
      if (LS.get('hb.awakeTip') !== '1') { LS.set('hb.awakeTip', '1'); later(600, () => toast(TB.keepAwake)); }
      wake(false); ART.want([S.myCard]); ART.warm(); fx('probe', 'pl'); fx('heartbeat', 0); fx('lidsOpen', 200);
    } else if (to === 'night') {
      wake(true); ART.want([S.myCard]); closeSheet(); closeModal();
      if (/^(seer|robber|drunk|insomniac|doppelganger)$/.test(S.myCard)) idle(() => ART.prefetchDeck(S.gameDeck), 4000);
      if (first) fx('lidsOpen', 0);
      let dl = 0; const n = S.players.length;
      if (!first && from === 'lobby') {   // 카드 배분 뒤 좌석 불빛이 하나씩 꺼지고 0.8초 암전
        ui.intro = 1; ui.out = 0;
        dl = D.hidden ? 0 : root.dataset.perf === 'lite' ? 200 : mq('(prefers-reduced-motion:reduce)') ? 160 : 600 + 90 * (n + 3);
        if (dl) fx('deal', { n });
        for (let i = 0; i < n; i++) later(dl + 80 * i, () => { ui.out = i + 1; sched(); });
        later(dl + 80 * n, () => fx('lidsClose', 400));
        later(dl + 80 * n + 800, () => { ui.intro = 0; fx('lidsOpen', 500); sched(); });
      }
      later(dl ? dl + 80 * n + 1300 : 1500, () => fx('probe', 'pn'));   // 배분 연출이 끝난 뒤에 불빛 측정
      later(first ? 0 : 1200 + dl, () => speak(NIGHT_TEXT._check));
    } else if (to === 'day') {
      ui.swapHint = LS.get('hb.swap') !== '1'; LS.set('hb.swap', '1');
      fx('heartbeat', 0); idle(() => loadResult(), 6000); idle(() => loadReplay(), 15000); speak(T.narr.dawn); idle(() => ART.prefetchDeck(S.gameDeck), 4000); later(Math.max(0, 8000 - dayEl()), sched);
      if (desk()) { ui.tab = 'chat'; ui.stick = 1; }
      if (TB.dockCoach && !isPeeked() && !ui.dn['coach' + S.gameId]) { ui.dn['coach' + S.gameId] = 1; later(first ? 600 : 3400, () => toast(TB.dockCoach)); }
      if (!first) { fx('lidsClose', 0); later(600, () => { fx('lidsOpen', 700); banner('day', T.phase.dayBreaks, '', 3200); }); }
    } else if (to === 'vote') {
      fx('heartbeat', 0); idle(() => { loadResult(); loadReplay(); }, 2500);
      if (!first) { fx('flash', 'blood', 80); banner('vote', TH.judge, '', 2000); }
    } else if (to === 'result') {
      fx('heartbeat', 0); wake(false); startResult(first);
    }
  }
  function onStep() {
    coverAll();
    const r = S.stepRole; if (!r || r === '_check') return;
    speak(NIGHT_TEXT[r] + ' ' + T.narr.close);
    if (!S.prompt) fx('rustle');
  }
  function banner(k, a, b, ms) {
    const h = D.createElement('div'); h.className = 'fx-head'; h.dataset.k = k;
    h.innerHTML = '<p class="fx-head-1">' + esc(a) + '</p>' + (b ? '<p class="fx-head-2">' + esc(b) + '</p>' : '');
    $('#main').appendChild(h);
    h.addEventListener('animationend', (e) => { if (e.target === h.lastElementChild) h.remove(); });   // 머리글 연출이 끝나면 바로 치워 탁자 카드를 다시 보인다
    setTimeout(() => h.remove(), ms);
  }
  function ticker(text) {
    $$('#main .ticker').forEach((e) => e.remove());
    const p = D.createElement('p'); p.className = 'ticker'; p.textContent = text; p.style.bottom = (geo.seen ? geo.seen + 12 : 8) + 'px';   // 밤에 본 것 한 줄이 있으면 그 위로, 없으면 행동 띠 바로 위
    const bd = $('#main'); if (!bd || $('#main .fx-head')) return; bd.appendChild(p); setTimeout(() => p.remove(), 2600);
  }

  // ---------- 렌더 배치 ----------
  function sched() {   // rAF 한 번에 배치. 숨겨진 탭처럼 rAF 가 멈춘 곳에서도 밀리지 않게 타이머를 곁들인다
    if (raf) return;
    raf = 1;
    const go = () => { if (raf) render(); };
    requestAnimationFrame(go); setTimeout(go, 120);
  }
  function modeOf() {
    if (!S) return 'home';
    if (S.phase !== 'night') return S.phase;
    if (ui.intro) return 'lobby';
    if (S.stepRole === '_check') return 'check';
    const p = S.prompt;
    return p && !ui.fin[p.key] ? 'awake' : 'sleep';
  }
  function render() {
    try { draw(); } catch (e) { console.error(e); if (!ui.rerr) { ui.rerr = 1; toast(TB.error, 'danger'); } }
  }
  function draw() {
    raf = 0;
    const ph = S ? S.phase : 'home';
    if (S && !cssOk) { if (!ui.cssT) ui.cssT = setTimeout(() => { cssOk = 1; sched(); }, 1500); return; }   // game.css 가 오기 전에는 홈을 그대로 둔다 (최대 1.5초)
    if (body.dataset.phase !== ph) body.dataset.phase = ph;
    $('#home').hidden = !!S;
    if (!S) {
      $('#hud').hidden = $('#dock').hidden = true; const b = $('.band'); if (b) b.hidden = true;
      return homeSync();
    }
    ensureShell();
    $('#hud').hidden = $('#dock').hidden = false;
    const V = view(modeOf());
    checkFin();
    paintHud(V); if (!body.dataset.replay) paintStage(V); else $('#stage').dataset.mode = V.mode;
    if (!body.dataset.replay) { paintBand(V); paintDock(V); }
    paintSheet();
    const awk = V.mode === 'awake' ? S.prompt.key : null;   // 눈을 뜬 차례의 시작/끝
    if (awk && ui.wk !== awk) { ui.wk = awk; fx('lidsClose', 0); fx('lidsOpen', 500); D.title = TB.awakeTab; snd('sting', 'wake'); }
    else if (!awk && ui.wk) { ui.wk = null; D.title = TB.docTitle; snd('sting', 'close'); }
    const sc = /^(check|sleep|awake)$/.test(V.mode) ? 'night' : V.mode;
    if (sc !== scNow) { scNow = sc; scO = sc === 'result' ? scO : { ends: deadline(V.mode) - skew }; if (sc !== 'result') snd('scene', sc, scO); }
    tick();
  }

  // ---------- 셸 ----------
  function ensureShell() {
    if (ui.shell) return;
    ui.shell = 1;
    $('#hud').innerHTML = '<button class="hud-sign" data-act="copy" type="button"></button>' +
      '<div class="hud-mid"><span class="hud-phase"></span><span class="hud-timer" hidden></span></div>' +
      '<div class="hud-r"><button class="hud-more" data-act="menu" type="button" aria-label="' + esc(TB.ariaMenu) + '"><svg class="ic" aria-hidden="true"><use href="#ic-menu"/></svg></button></div><i class="hud-bar" hidden></i>';
    $('#main').insertAdjacentHTML('beforeend',
      '<div class="stage" id="stage" data-r="stage" data-mode=""><div class="altar" hidden></div><i class="ln"></i>' +
      '<div class="lm" style="display:contents"></div><div class="rv" style="display:contents"></div><button class="stage-bar" type="button" data-act="unfold"><span class="lbl">' + esc(TBT.unfold) + '</span><svg class="ic" aria-hidden="true"><use href="#ic-chev"/></svg></button></div>' +
      '<div class="nl" data-r="prompt" style="display:contents"></div><section class="board" data-r="log" hidden></section>');
    const band = D.createElement('div');
    band.className = 'band'; band.dataset.r = 'prompt'; band.setAttribute('role', 'status'); band.setAttribute('aria-live', 'polite');
    band.innerHTML = '<p class="band-text"></p><button class="band-q" type="button" data-act="rule" aria-label="' + esc(TB.voteRule) + '" aria-expanded="false" hidden>?</button><p class="band-rule" hidden>' + esc(TB.voteRule) + '</p><div class="band-bar" hidden></div><p class="day-seen" role="button" tabindex="0" data-act="seenLog" hidden></p><a class="dock-alt" href="#" role="button" hidden></a>';
    $('#app').insertBefore(band, $('#dock'));
    buildDock();
    $('.altar').innerHTML = [0, 1, 2].map((i) => ART.card(null, { size: 'sm', cls: 'altar-card', label: T.altar[i], tag: T.replay.ui.altarShort[i] })).join('');
    $$('.altar .card').forEach((c, i) => { c.dataset.i = i; });
    buildSheet();
    const st = $('#stage');
    st.addEventListener('click', (e) => { if (st.classList.contains('is-fold') && !e.target.closest('[data-act]')) { st.classList.remove('is-fold'); sched(); } });
    if (W.ResizeObserver) { const ro = new ResizeObserver(remeasure); ro.observe(st); ro.observe($('#main')); }
    W.addEventListener('resize', remeasure);
    if (W.visualViewport) { visualViewport.addEventListener('resize', kb); visualViewport.addEventListener('scroll', kb); }
  }
  function buildDock() {
    $('#dock').innerHTML = '<div class="dock-card" role="button" tabindex="0" data-peek="dock"></div>' +
      '<div class="dock-act">' +
      '<button class="btn-main hold" type="button"><span class="hold-fill"></span><span class="lbl"></span><b class="nm"></b></button><p class="dock-status" hidden></p></div>' +
      '<button class="dock-badge" type="button" data-act="sheet"><svg class="ic" aria-hidden="true"><use href="#ic-chat"/></svg><i class="dot"></i><span class="bd"></span></button>';
  }

  // ---------- 뷰 모델 ----------
  function view(mode) {
    const V = { mode, band: '', sel: null, selC: false, marks: {}, target: [], targetC: [], btn: {}, alt: null, card: -1, rule: 0 };
    const ph = S.phase;
    V.hudPhase = ph === 'lobby' ? T.phase.lobby : mode === 'check' ? T.phase.check : T.phase[ph];
    const NW = TB.nightWait || TB.sleeping || '';   // 밤에 잠든 동안 띠를 비워 두지 않는다 (서버 문구가 없으면 기존 '잠든 중' 문구)
    if (mode === 'lobby') {
      const n = S.players.length, need = n + 3, total = sum(S.deck);
      V.band = n < 3 ? fmt(TB.waitMore, { need: 3 - n }) : fmt(TB.deckCount, { total, need });
      V.btn = !isHost() ? { lbl: TB.waitChief, dis: 1 } : n < 3 || total !== need ? { lbl: TBT.start, dis: 1 } : { lbl: TBT.start, act: 'start' };
      if (ph === 'night') V.band = NW;   // 밤 도입 연출 중
    } else if (mode === 'check') {
      V.band = ''; V.btn = { hide: 1 };
    } else if (mode === 'sleep') {
      V.btn = { hide: 1 }; V.card = 0; V.band = NW;
    } else if (mode === 'awake') {
      nightView(V);
    } else if (mode === 'day') {
      const conn = S.players.filter((p) => p.connected), mine = S.players.find((p) => p.id === S.me);
      V.band = (mine && mine.ready ? TB.dayReadyWait : dayEl() < 8000 ? TB.dayAsk : TB.dayTalk) + '\n' + fmt(TB.raised, { r: conn.filter((p) => p.ready).length, n: conn.length }); V.card = 0;
      V.btn = { lbl: mine && mine.ready ? TBT.unready : TBT.ready, act: 'ready' };
    } else if (mode === 'vote') {
      V.rule = 1; V.card = 0; V.band = TB.pickExec; V.sel = others().map((p) => p.id);
      const t = ui.vsel || S.myVote; if (t) V.target = [t];
      V.btn = ui.vsel && ui.vsel !== S.myVote ? { lbl: TBT.execute, nm: pname(ui.vsel), hold: 600, act: 'vote' } : { lbl: TBT.execute, nm: S.myVote ? pname(S.myVote) : '', dis: 1 };
      if (S.myVote && (!ui.vsel || ui.vsel === S.myVote)) { V.band = fmt(TB.votedFor, { n: pname(S.myVote) }); V.btn = { lbl: TB.votedBtn, nm: '', dis: 1 }; }
    } else if (mode === 'result') {
      V.btn = isHost() ? { lbl: TBT.again, act: 'again' } : { lbl: TB.waitChief, dis: 1 };
    }
    return V;
  }
  function nightView(V) {
    const p = S.prompt, t = p.type, st = S.stepRole, sel = ui.sel, selC = ui.selC, nm = sel.map(pname).join(', ');
    const pre = p.fromDoppel ? TB.asDoppel + ' ' : '', pickP = () => { V.sel = others().map((x) => x.id); };
    V.card = 0; V.btn = { hide: 1 }; V.status = '';
    if (ui.reveals.length) {   // 카드를 보는 동안 출처 좌석 · 가운데 카드에 테두리
      V.band = TB.coverHint;
      V.target = ui.reveals.filter((r) => r.k === 'p').map((r) => (r.id === S.me ? r.from : r.id)).filter(Boolean);
      V.targetC = ui.reveals.filter((r) => r.k === 'c').map((r) => r.idx);
      return;
    }
    if (p.done) { V.band = TB.doneClose; V.status = TB.sleeping; return; }
    V.target = sel; V.targetC = selC;
    if (t === 'info') {
      const ids = p.ids || [], mk = MARK[st];
      V.band = st === 'insomniac' ? TB.insomniac + ' ' + TB.insomniacSub : (NIGHT_TEXT[st] || '') + (ids.length || !p.text ? '' : ' ' + p.text);
      if (mk) ids.forEach((id) => { V.marks[id] = mk; });
      V.btn = { lbl: TBT.seen, act: 'ack' };
    } else if (t === 'lonewolf') {
      V.band = TB.lone + ' ' + TB.loneSub; V.selC = true; V.btn = { lbl: TBT.lookAltar, dis: 1 }; V.alt = { t: TBT.noLook, act: 'skip' };
    } else if (t === 'doppelganger') {
      V.band = TB.doppel + ' ' + TB.doppelSub; pickP();
      V.btn = { lbl: TBT.stealFace, nm, hold: 600, act: 'go', dis: !sel.length };
    } else if (t === 'seer') {
      V.band = pre + TB.seer + ' ' + TB.seerSub; V.alt = { t: TBT.noLook, act: 'skip' };
      if (!selC.length) pickP();
      if (!sel.length) V.selC = true;
      V.btn = sel.length ? { lbl: TBT.look, nm, hold: 600, act: 'go' } : selC.length === 2 ? { lbl: TBT.lookAltar, nm: fmt(TB.lookCount, { n: 2 }), hold: 600, act: 'go' } : { lbl: selC.length ? fmt(TB.altarPick, { n: selC.length }) : TB.pickTarget, hold: 600, act: 'go', dis: 1 };
    } else if (t === 'robber') {
      V.band = pre + TB.robber + ' ' + TB.robberSub; pickP(); V.alt = { t: TBT.noSteal, act: 'skip' };
      V.btn = { lbl: TBT.steal, nm, hold: 600, act: 'go', dis: !sel.length };
    } else if (t === 'troublemaker') {
      V.band = pre + TB.troublemaker + ' ' + TB.troublemakerSub; pickP(); V.alt = { t: TBT.noSwap, act: 'skip' };
      V.btn = { lbl: TBT.swap, nm, hold: 600, act: 'go', dis: sel.length !== 2 };
    } else if (t === 'drunk') {
      V.band = pre + TB.drunk + ' ' + TB.drunkSub; V.selC = true;
      V.btn = { lbl: TBT.swap, nm: selC.length ? T.altar[selC[0]] : '', hold: 600, act: 'go', dis: !selC.length };
    }
    if (ui.busy) { V.btn = { lbl: '…', dis: 1 }; V.alt = null; }
  }
  // 행동을 마쳤고 공개 카드가 모두 덮이면 0.6초 뒤 눈을 감는다
  function checkFin() {
    const p = S.phase === 'night' && S.prompt;
    if (!p || !p.done || ui.fin[p.key] || ui.reveals.length || ui.dn[p.key]) return;
    ui.dn[p.key] = 1;
    later(600, () => fx('lidsClose', 300));
    later(900, () => { ui.fin[p.key] = 1; fx('lidsOpen', 400); sched(); });
  }

  // ---------- HUD · 타이머 ----------
  function paintHud(V) {
    const sg = $('.hud-sign');
    if (sg._c !== S.code) { sg._c = S.code; sg.textContent = S.code; sg.setAttribute('aria-label', TH.sign + ' ' + S.code); }
    set($('.hud-phase'), 'textContent', body.dataset.replay ? T.replay.ui.hudCenter : V.hudPhase);
  }
  function deadline(mode) {
    // 밤: 차례 시간이 모두 같으므로 잠든 사람에게도 이번 차례가 끝나기까지 남은 시간을 보여 준다
    return S.phase === 'day' ? S.dayEndsAt : S.phase === 'vote' ? S.voteEndsAt : S.phase === 'night' ? S.stepEndsAt : 0;
  }
  let tickT = 0;
  function tick() {
    clearTimeout(tickT);
    if (!S) return;
    const mode = modeOf(), dl = deadline(mode), tm = $('.hud-timer'), bar = $('.hud-bar'), bb = $('.band-bar');
    let hb = mode === 'check' ? 1 : 0;
    if (!dl) { tm.hidden = bar.hidden = bb.hidden = true; ui.dl = 0; }
    else {
      const ch = dl !== ui.dl;
      if (ch) { ui.dl = dl; ui.tmax = Math.max(1000, dl - nowS()); }
      const bOn = mode === 'awake' || S.phase === 'night';   // 밤에는 잠든 사람에게도 차례 남은 시간 바를 보여 준다
      if (ch || (bb.hidden && bOn)) {   // 마감이 바뀌면(또는 띠가 다시 보이면) 남은 시간만큼 CSS 애니메이션 하나를 다시 시작한다. 매초 쓰지 않는다
        const ms0 = Math.max(0, dl - nowS());
        [bar, bb].forEach((e) => { e.style.animation = 'none'; e.style.setProperty('--ms', ms0 + 'ms'); e.style.setProperty('--f0', Math.min(1, ms0 / ui.tmax).toFixed(3)); void e.offsetWidth; e.style.animation = ''; });
      }
      const left = Math.max(0, dl - nowS()), secs = Math.ceil(left / 1000);
      const txt = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      tm.hidden = bar.hidden = false;
      if (tm._v !== txt) {
        if (tm.childNodes.length !== txt.length) tm.innerHTML = Array.from(txt).map((c) => (c === ':' ? c : '<b></b>')).join('');
        Array.from(txt).forEach((c, i) => { const e = tm.childNodes[i]; if (c !== ':' && e.textContent !== c) e.textContent = c; });
        tm._v = txt;
        if (S.phase === 'vote' && secs <= 10 && tm.animate) tm.animate([{ transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 300 });
      }
      tm.classList.toggle('is-urgent', secs <= 10);
      bar.classList.toggle('is-low', secs < 60 && S.phase !== 'night');
      bb.hidden = !bOn;
      if (S.phase === 'day') hb = secs <= 10 ? 2 : secs <= 30 ? 1 : 0;
    }
    if (hb !== ui.hb) { ui.hb = hb; fx('heartbeat', hb); }
    tickT = setTimeout(tick, 1020 - (nowS() % 1000));
  }

  // ---------- 좌석 · 탁자 ----------
  function relayout() { if (S && ui.ids.length) { placeSeats(); lines(); if (body.dataset.replay && W.REPLAY && REPLAY.relayout) REPLAY.relayout(); } }
  // 기하(크기)는 measure() 에서만 읽는다: ResizeObserver · 창 크기 · 좌석/탁자 카드가 바뀐 다음 프레임. placeSeats 는 캐시만 읽고 쓰기만 한다 (강제 레이아웃 없음)
  const geo = { w: 0, h: 0, mh: 0, tk: 48, sh: 64, cw: 40, ah: 0, aw: 0, cap: 0, seen: 0, q: 0 }, gk = () => [geo.w, geo.h, geo.tk, geo.sh, geo.cw, geo.ah, geo.aw, geo.cap, geo.seen].join();
  function measure() {
    const st = $('#stage'); if (!st) return;
    const loose = st.dataset.tight !== '1' || !geo.ah, al = $('.altar', st), c = $('.seat>.card:not(.is-original)', st), tkn = $('.seat-token', st);   // 탁자 크기는 촘촘 모드가 아닐 때 잰 값을 쓴다 (모드가 서로 되먹임하지 않게)
    geo.w = st.clientWidth; geo.h = st.clientHeight; geo.mh = $('#main').clientHeight;
    const cp = body.dataset.replay ? $('.rp-cap') : null, ds = $('.day-seen');   // 자막 띠 · 낮 한 줄의 높이도 여기서만 잰다
    geo.cap = cp ? cp.offsetHeight : 0; geo.seen = ds && !ds.hidden ? ds.offsetHeight : 0;
    geo.tk = parseFloat(getComputedStyle(st).getPropertyValue('--tk')) || (tkn && tkn.offsetWidth) || 48;
    if (loose) {
      geo.sh = Math.max(64, ...ui.ids.map((id) => (ui.seats[id] ? ui.seats[id].offsetHeight : 0)));
      if (c && c.offsetWidth) geo.cw = c.offsetWidth;
      if (al && al.offsetHeight) { geo.ah = al.offsetHeight; geo.aw = al.offsetWidth; }
    }
  }
  function remeasure() {
    if (geo.q) return;
    geo.q = requestAnimationFrame(() => { geo.q = 0; const o = gk(), m = geo.mh; measure(); if (o !== gk()) relayout(); if (m !== geo.mh && S && S.phase === 'result') sched(); });
  }
  function placeSeats() {
    const st = $('#stage'), N = ui.ids.length, rp = body.dataset.replay ? (geo.cap ? geo.cap + 24 : desk() ? 40 : 96) : 0;   // 리플레이 자막 띠(실측)만큼 탁자를 위로 올린다
    if (!geo.h) measure();
    const ds = $('.day-seen'), bot = ds && !ds.hidden && geo.seen ? geo.seen + 4 : 0;   // 낮 한 줄이 아래 좌석 이름을 덮지 않게 그만큼 탁자를 올린다
    const H = geo.h - rp - bot, tk = geo.tk, sh = geo.sh, al = $('.altar'), on = !!al && !al.hidden;
    const rx = Math.max(60, geo.w / 2 - Math.max(40, tk / 2 + 24)), ry = Math.max(60, Math.min(H / 2 - 64, H / 2 - (sh - tk / 2) - 12, H / 2 - tk / 2 - 28));   // 토큰 중심이 기준점. 위 28px 는 .night-track 자리
    const ang = (i) => Math.PI / 2 + 2 * Math.PI * ((i - ui.me + N) % N) / N, aw = geo.aw / 2, ah = geo.ah / 2;
    let hit = 0;
    if (on && geo.ah) for (let i = 0; i < N && !hit; i++) { const x = rx * Math.cos(ang(i)), y = ry * Math.sin(ang(i)); hit = x - 42 < aw && x + 42 > -aw && y + sh > -ah && y - tk / 2 < ah; }   // 좌석 칸이 탁자 가운데 카드와 실제로 겹치면 촘촘 모드
    if (on && geo.ah && !hit) for (let i = 0; i < N && !hit; i++) { const x = rx * Math.cos(ang(i)), y = ry * Math.sin(ang(i)); if (Math.abs(y) - tk / 2 < ah + sh) hit = aw > Math.abs(x) - tk / 2 - 6 - geo.cw - 8 - 12; }   // 실제 좌석 x 로 가운데 카드와 가로로 겹치는지
    const seatIn = rx - tk / 2 - 6 - geo.cw - 8, tight = on && !!geo.ah && (desk() ? !!hit : (hit || ry < geo.ah / 2 + sh / 2 + 8 || geo.aw / 2 > seatIn));   // 세로 · 가로로 탁자 가운데 카드가 좌석 카드를 덮으면 촘촘 모드
    st.style.setProperty('--cy', (-(rp + bot) / 2) + 'px');
    if (tight !== (st.dataset.tight === '1')) { if (tight) st.dataset.tight = '1'; else delete st.dataset.tight; }
    ui.pts = ui.ids.map((id, i) => {
      const th = ang(i);
      return { x: Math.round(rx * Math.cos(th)), y: Math.round(ry * Math.sin(th)) - (rp + bot) / 2 };
    });
    ui.ids.forEach((id, i) => { const s = ui.seats[id]; if (s) { s.style.setProperty('--x', ui.pts[i].x + 'px'); s.style.setProperty('--y', ui.pts[i].y + 'px'); s.dataset.side = ui.pts[i].x > 8 ? 'r' : 'l'; } });
  }
  function buildSeats(list) {
    const st = $('#stage'), old = ui.seats, fresh = ui.seatKey !== '';
    $$('.seat', st).forEach((e) => e.remove());
    ui.seats = {}; ui.ids = list.map((p) => p.id); ui.me = Math.max(0, ui.ids.indexOf(S.me));
    list.forEach((p) => {
      const el = D.createElement('div');
      el.className = 'seat' + (fresh && !old[p.id] ? ' fx-join' : ''); el.dataset.pid = p.id;
      el.innerHTML = '<button class="seat-token" type="button" aria-pressed="false" data-act="seat" data-pid="' + esc(p.id) + '" aria-label="' + esc(p.name) + '">' + esc(Array.from(p.name)[0] || '') + '</button>' +
        '<span class="seat-name"></span><i class="seat-mark" aria-hidden="true"></i>';
      st.appendChild(el); ui.seats[p.id] = el;
    });
    ui.seatKey = ui.ids.join(','); st.dataset.n = list.length;
    placeSeats(); remeasure();
  }
  function seatCard(p, mode) {   // 좌석 위 카드 키
    if (mode === 'lobby' || (p.id === S.me && mode !== 'result')) return '';
    return mode === 'result' ? p.final + '|' + p.original + '|' + (p.dead ? 1 : 0) : 'b';
  }
  function paintSeats(V, list) {
    const mode = V.mode, res = mode === 'result', ctx = !!V.sel || V.selC;
    let changed = 0;
    list.forEach((p, i) => {
      const el = ui.seats[p.id]; if (!el) return;
      const live = S.players.find((x) => x.id === p.id), gone = res && !live, mk = V.marks[p.id], can = !!V.sel && V.sel.indexOf(p.id) >= 0;
      const f = {
        'is-me': p.id === S.me, 'is-host': !gone && p.id === S.hostId, 'is-off': !gone && !!live && !live.connected && !res,
        'is-ready': mode === 'day' && !!live && !!live.ready, 'is-voted': mode === 'vote' && !!live && !!live.voted,
        'is-target': V.target.indexOf(p.id) >= 0, 'is-dead': res && p.dead, 'is-gone': gone,
        'is-selectable': can, 'is-dim': ctx && !can && p.id !== S.me && mk === undefined, 'fx-lightout': ui.intro && i < ui.out,
        'fx-ring-wolf': !!mk && mk[0] !== 'mason', 'fx-ring-mason': !!mk && mk[0] === 'mason',
      };
      for (const k in f) el.classList.toggle(k, !!f[k]);
      const tok = $('.seat-token', el);
      tok.setAttribute('aria-pressed', !!f['is-target']);
      if (isHost() && S.phase === 'lobby' && p.id !== S.me) tok.dataset.lp = '1'; else delete tok.dataset.lp;
      { const sn = $('.seat-name', el), nm = f['is-off'] ? TB.away : short(p.name), eff = p.final === 'doppelganger' && R && R.doppelCopy ? R.doppelCopy : p.final;
        if (body.dataset.phase === 'result' && ROLES[eff]) set(sn, 'innerHTML', esc(nm) + '<i class="seat-role">' + esc(ROLES[eff].name) + '</i>'); else set(sn, 'textContent', nm); }
      const m = $('.seat-mark', el);
      if (mk) { m.dataset.k = mk[0]; set(m, 'textContent', mk[1]); }
      else if (res && p.votes > 0) { m.dataset.k = 'votes'; set(m, 'textContent', TB.cols.votes + ' ' + p.votes); }
      else if (f['is-ready']) { m.dataset.k = 'ready'; set(m, 'textContent', TB.readyMark); }
      else { delete m.dataset.k; set(m, 'textContent', ''); }
      const ck = seatCard(p, mode);
      if (el._ck !== ck) {
        el._ck = ck; changed = 1; $$('.card', el).forEach((c) => c.remove());
        if (ck === 'b') el.insertAdjacentHTML('beforeend', ART.card(null, { size: 'xs' }));
        else if (ck) {
          const sw = p.final !== p.original;
          el.insertAdjacentHTML('beforeend', ART.card(p.final, { size: desk() ? 'sm' : 'xs', face: 1, cls: (p.dead ? 'is-dead ' : '') + (sw ? 'is-swapped' : '') }));
        }
        ART.mark(el);
      }
    });
    if (changed) { relayout(); remeasure(); }
  }
  function paintAltar(V) {
    const al = $('.altar'), res = V.mode === 'result' && R, ctx = !!V.sel || V.selC;
    const hid = V.mode === 'lobby' || V.mode === 'check';
    if (al.hidden !== hid) { al.hidden = hid; remeasure(); }
    $$('.card', al).forEach((c, i) => {
      const role = res ? R.center.final[i] : null, sw = res && R.center.original[i] !== R.center.final[i], key = role ? role + (sw ? '*' : '') : '';
      if (c._k !== key) {
        const t = D.createElement('template');
        t.innerHTML = ART.card(role, { size: 'sm', cls: 'altar-card' + (sw ? ' is-swapped' : ''), label: T.altar[i], tag: T.replay.ui.altarShort[i], face: role ? 1 : 0 });
        const n = t.content.firstChild; n.dataset.i = i; n._k = key; c.replaceWith(n); c = n; ART.mark(n);
      }
      const can = V.selC && V.mode === 'awake';
      c.classList.toggle('is-selectable', can); c.classList.toggle('is-dim', ctx && !can && V.mode === 'awake'); c.classList.toggle('is-selected', V.targetC.indexOf(i) >= 0);
      if (can) { c.setAttribute('role', 'button'); c.tabIndex = 0; c.dataset.act = 'altar'; } else { c.setAttribute('role', 'img'); c.removeAttribute('tabindex'); delete c.dataset.act; }
    });
  }
  function lines() {   // .ln: 투표선 · 말썽쟁이 예고선
    const ln = $('.ln'); if (!ln) return;
    let a = -1, b = -1, k = '';
    if (S.phase === 'vote') { const t = ui.vsel || S.myVote; if (t) { a = ui.me; b = ui.ids.indexOf(t); k = 'is-blood is-fast' + (S.myVote === t ? ' is-lock' : ''); } }
    else if (modeOf() === 'awake' && S.prompt.type === 'troublemaker' && ui.sel.length === 2) { a = ui.ids.indexOf(ui.sel[0]); b = ui.ids.indexOf(ui.sel[1]); k = 'is-faint'; }
    cancelAnimationFrame(ln._r);
    if (a < 0 || b < 0 || !ui.pts[a] || !ui.pts[b]) { ln._k = ''; return ln.classList.remove('is-on'); }
    const p = ui.pts[a], q = ui.pts[b], dx = q.x - p.x, dy = q.y - p.y, key = a + '>' + b;
    const draw = () => {
      ln.className = 'ln ' + k + ' is-on';
      ln.style.cssText = '--x:' + p.x + 'px;--y:' + p.y + 'px;--len:' + Math.round(Math.hypot(dx, dy)) + 'px;--ang:' + Math.round(Math.atan2(dy, dx) * 180 / Math.PI) + 'deg';
    };
    if (ln._k && ln._k !== key && ln.classList.contains('is-on')) { ln.classList.remove('is-on'); ln._k = key; ln._r = requestAnimationFrame(draw); }   // 대상이 바뀌면 옛 선을 한 프레임 지우고 새로 긋는다
    else { ln._k = key; draw(); }
  }

  function paintStage(V) {
    const st = $('#stage'), list = V.mode === 'result' && R ? R.players : S.players, mode = V.mode;
    st.dataset.mode = mode;
    if (mode !== 'result') st.classList.remove('is-fold');
    if (S.phase === 'night' && mode !== 'lobby') body.dataset.ns = mode; else body.removeAttribute('data-ns');
    if (ui.seatKey !== list.map((p) => p.id).join(',')) buildSeats(list);
    paintSeats(V, list); paintAltar(V); lines();
    patch($('.lm', st), mode === 'lobby' ? lobbyHTML() : '');
    patch($('.rv', st), revealHTML());
    if (patch($('.nl'), nightHTML(V))) afterNight(V);
    const bd = $('.board');
    if (mode !== 'result') bd.hidden = true; else if (bd.hidden && !body.dataset.replay && !ui.wait) bd.hidden = false;
    if (!geo.mh) measure();
    const hh = mode === 'result' && !st.classList.contains('is-fold') && !desk() ? Math.round(Math.min(geo.mh * 0.55, 380)) + 'px' : '';
    if (st.style.height !== hh) { st.style.height = hh; geo.h = hh ? parseInt(hh, 10) : 0; if (ui.ids.length) placeSeats(); }   // 높이를 우리가 정했으니 읽지 않고 안다. 풀었으면 placeSeats 가 한 번 잰다
  }
  function lobbyHTML() {
    const d = S.phase === 'night' ? S.gameDeck : S.deck, cards = [], prev = ui.fan, seen = {};
    ROLE_ORDER.forEach((r) => { for (let i = 0; i < (d[r] || 0); i++) cards.push(r); });
    const all = cards.length, extra = Math.max(0, all - 7); cards.length = Math.min(all, 7);
    const c = cards.length, h = cards.map((r, i) => {
      seen[r] = (seen[r] || 0) + 1;
      const o = i - (c - 1) / 2, drop = prev[r] !== undefined && seen[r] > prev[r];
      return ART.card(r, { size: 'sm', face: 1, cls: drop ? 'fx-drop' : '' }).replace('class="card', 'style="--r:' + (o * Math.min(6, 60 / c)).toFixed(1) + 'deg;--i:' + Math.abs(o) + '" class="card');
    }).join('') + (extra ? '<span class="fan-more"' + (TB.centerMore ? ' role="img" aria-label="' + esc(fmt(TB.centerMore, { n: extra })) + '"' : '') + '>+' + extra + '</span>' : '');
    ui.fan = seen;
    return '<div class="lobby-mid"><p class="lobby-sign" aria-label="' + esc(TH.sign + ' ' + S.code) + '">' + esc(S.code) + '</p>' +
      '<button class="btn-sub" type="button" data-act="copy"><span class="lbl">' + esc(TBT.copyCode) + '</span></button><p class="lobby-count">' + esc(fmt(TB.fire, { n: S.players.length })) + '</p>' +
      '<div class="fan" role="button" tabindex="0" data-act="deck" aria-label="' + esc(TBT.deck) + '">' + h + '</div></div>';
  }
  function whoOf(r, h) {   // 큰 카드 캡션: 누구의 카드인지 (h: HTML, 아니면 평문)
    const s = r.k === 'c' ? T.altar[r.idx] : r.id === S.me ? (r.self === 'now' ? TB.whoNow : TB.whoNew) : 0, n = pname(r.id);
    return s ? (h ? esc(s) : s) : fmt(TB.whoCard, { n: h ? { t: n, h: '<b class="rv-n">' + esc(n) + '</b>' } : n });
  }
  function revealHTML() {
    if (!ui.reveals.length) return '';   // 이름 판(FEATURES_SPEC 4.3)은 예산 컷 1순위로 뺐다: 늑대인간 · 하수인 · 프리메이슨은 좌석 표식과 띠 문구로 알린다
    return '<div class="reveal" data-act="cover" role="button" tabindex="0"><div class="reveal-row">' + ui.reveals.map((r) => {
      const sub = r.copy ? TB.whoCopy : r.from ? fmt(TB.whoFrom, { n: NM(pname(r.from)) }) : '';
      return '<figure class="rv-it"><figcaption class="rv-who">' + whoOf(r, 1) + '</figcaption>' + ART.card(r.role, { size: 'md', face: 1, label: whoOf(r) + ': ' + ROLES[r.role].name }) + (sub ? '<p class="rv-sub">' + sub + '</p>' : '') + '</figure>';
    }).join('') + '</div></div>';
  }
  function nightHTML(V) {
    const m = V.mode;
    if (S.phase !== 'night' || m === 'lobby') return '';
    if (m === 'check') {
      return '<div class="check"><div class="check-card" data-peek="check" style="' + NOSEL + '">' + ART.card(S.myCard, { size: 'xl', face: 0 }) + '</div>' +
        '<p class="check-t1">' + esc(TB.yourCard) + '</p><p class="check-team" hidden></p><p class="check-desc" hidden></p><p class="check-t2">' + esc(TB.holdHint) + '</p><p class="check-t2 check-priv">' + esc(TB.checkBand) + '</p><i class="check-bar"></i></div>';
    }
    const n = S.steps.length - 1, rn = ROLES[S.stepRole] ? ROLES[S.stepRole].name : '';
    const dots = '<div class="night-track">' + Array.from({ length: n }, (_, i) => '<i class="night-dot' + (i + 1 === S.stepIdx ? ' is-now" role="img" aria-label="' + esc(rn) + '"' : i + 1 < S.stepIdx ? ' is-past"' : '"') + '></i>').join('') + (rn ? '<span class="night-pos">' + S.stepIdx + ' / ' + n + ' · ' + esc(rn) + '</span>' : '') + '</div>';
    return m === 'sleep' ? dots + '<p class="night-nar" data-t="' + esc(fmt(TB.wake, { role: rn })) + '"></p><p class="night-msg">' + esc(T.phase.closeEyes || TB.closeEyes) + '</p>' : dots;
  }
  function afterNight(V) {
    const nl = $('.nl');
    if (V.mode === 'check') {
      const left = Math.max(0, S.stepEndsAt - nowS()), bar = $('.check-bar', nl), cc = $('.check-card', nl);
      bar.style.setProperty('--ms', left + 'ms'); void bar.offsetWidth; bar.classList.add('is-run');
      ui.pressed = 0;
      later(Math.max(0, 7000 - (13000 - left)), () => { const k = $('.check-t2'); if (k && !ui.pressed) k.classList.add('is-blink'); });
      const rel = (fn) => { const g = () => { if (press && press.el === cc) later(250, g); else fn(); }; g(); };   // 카드를 잡고 있는 동안은 얼굴과 이름표를 그대로 두고, 놓은 뒤에야 어두워진다
      later(Math.max(0, left - 1200), () => rel(() => { if (cc) cc.classList.add('is-sink'); }));
      later(Math.max(0, left - 700), () => rel(() => fx('lidsClose', 500)));
      later(Math.max(0, left) + 300, () => fx('lidsOpen', 900));
    } else if (V.mode === 'sleep') {
      later(150, () => fx('lidsOpen', 400));   // 암전은 탁자를 어둡게 하는 것으로 충분하다. 눈꺼풀을 열어 안내문을 보인다
      const n = $('.night-nar', nl);
      if (n) { if (W.FX && W.FX.typeLine) W.FX.typeLine(n, n.dataset.t); else n.textContent = n.dataset.t; }
    }
  }
  function coverAll() { if (ui.reveals.length) { ui.reveals = []; ui.logNew = 1; sched(); } }

  // ---------- 띠 · 독 ----------
  function paintBand(V) {
    const b = $('.band'), q = $('.band-q', b), r = $('.band-rule', b);
    set($('.band-text', b), 'textContent', V.band);
    q.hidden = !V.rule; q.setAttribute('aria-expanded', !!ui.rule); r.hidden = !(V.rule && ui.rule);
    const bh = V.mode === 'result', bc = b.hidden !== bh; b.hidden = bh;
    const day = V.mode === 'day' && !unknown(), l = day ? lastSeen() : null, sn = $('.day-seen', b), oth = [];   // 낮: 밤에 본 것 한 줄 (내 카드 · 다른 사람/가운데 카드, 첫 판에는 바뀌었을 수 있다는 안내를 덧붙인다)
    if (day) (S.myLog || []).forEach((it) => (it.reveal || []).forEach((r) => {
      if (!ROLES[r.role] || (r.at === 'p' && r.id === S.me) || (l && l.who === 1 && r.at === 'p' && r.id === l.id)) return;
      oth.push(fmt(TB.seenOther, { w: whoOf({ k: r.at, id: r.id, idx: r.idx }), r: ROLES[r.role].name }));
    }));
    const lt = l && ROLES[l.role].name, lk = !l ? '' : fmt(TB.seenLine, { t: lt }) + (l.sub ? ' · ' + l.sub : '');
    const tx = [lk].concat(oth.slice(0, 2), oth.length > 2 ? fmt(TB.seenMore, { n: oth.length - 2 }) : []).filter(Boolean).join(' · ');
    const hint = V.mode === 'day' && ui.swapHint && !(l && l.who === 0 && S.myCard === 'insomniac') && TB.daySwapHint, h = esc(tx) + (hint ? '<span class="ds-h">' + esc(hint) + '</span>' : '');   // 밤에 본 것은 그대로, 안내문은 따로 한 줄 (잘리면 안내문이 잘린다)
    const was = sn.hidden, ch = (sn._h || '') !== h; if (ch) { sn._h = h; sn.innerHTML = h; } sn.hidden = !h;
    if (ch || bc || was !== sn.hidden) remeasure();
  }
  const unknown = () => !!(ui.unk || (S.myCard === 'drunk' && (S.myLog || []).length));
  const isPeeked = () => LS.get('hb.peeked') === '1';
  const seen = (role, who, id) => ({ who, id, role, lbl: who === 1 ? TB.whoNew : who ? TB.whoMine : TB.whoNow, sub: who === 1 ? fmt(TB.whoFrom, { n: pname(id) }) : who ? fmt(TB.whoCopied, { n: pname(id) }) : TB.whoWoke });   // who: 1 강도(from=id) · 2 도플갱어(id) · 0 불면증환자
  function lastSeen() {   // { role, lbl, sub }: 마지막으로 확인한 카드와 그 출처
    let l = null; const lg = S.myLog || [];
    lg.forEach((it) => (it.reveal || []).forEach((r) => { if (r.at === 'p' && r.id === S.me) l = seen(r.role, r.from ? 1 : 0, r.from); }));
    const f = lg[0] && lg[0].reveal && lg[0].reveal[0];
    if (!l && S.myCard === 'doppelganger' && f && f.at === 'p') l = seen(f.role, 2, f.id);
    return l || ui.last;
  }
  function peekInfo() {
    if (!S.myCard) return null;
    const l = lastSeen();
    return l ? { role: l.role, label: [l.lbl, l.sub] } : { role: S.myCard, label: [TB.whoMine, TB.peekFirst] };
  }
  function paintDock(V) {
    const d = $('#dock'), card = $('.dock-card', d), alt = $('.dock-alt'), btn = $('.btn-main', d), bdg = $('.dock-badge', d), off = !!ui.off;
    const cr = (S.phase === 'day' || S.phase === 'vote') && !(S.myCard === 'insomniac' && (lastSeen() || {}).who === 0), ck = V.card === 0 && S.myCard ? (unknown() ? 'u' : 'b') + (cr ? 'c' : '') + (isPeeked() ? '' : 'h') : 'v';
    if (card._k !== ck && !press) {
      card._k = ck; card.style.visibility = ck === 'v' ? 'hidden' : '';
      card.setAttribute('aria-label', ck === 'v' ? '' : cr ? TB.daySwapHint : TB.yourCard + ' ' + TB.holdHint);
      card.innerHTML = ck === 'v' ? '' : ART.card(null, { size: 'xs', cls: unknown() ? 'is-unknown' : '' }) +
        (cr ? '<svg class="crack" aria-hidden="true"><use href="#ic-crack"/></svg>' : '') + (isPeeked() ? '' : '<span class="dock-hint">' + esc(cr ? TB.dockMaybe : TB.dockHint) + '</span>');
      ART.mark(card);
    }
    alt.hidden = !V.alt; set(alt, 'textContent', V.alt ? V.alt.t : ''); alt.dataset.act = V.alt ? V.alt.act : '';
    alt.setAttribute('aria-disabled', off);
    const b = V.btn;
    const stt = $('.dock-status', d); if (stt) { set(stt, 'textContent', V.status || ''); stt.hidden = !V.status; }
    btn.hidden = !!b.hide; set($('.lbl', btn), 'textContent', b.lbl || '');
    const nm = $('.nm', btn); set(nm, 'textContent', b.nm || ''); nm.hidden = !b.nm;
    btn.dataset.act = b.act || '';
    delete btn.dataset.cap; if (b.hold) { btn.dataset.hold = b.hold; if (V.mode !== 'vote') btn.dataset.cap = $('#hold-hint').textContent; btn.setAttribute('aria-describedby', 'hold-hint'); } else { delete btn.dataset.hold; btn.removeAttribute('aria-describedby'); }
    btn.setAttribute('aria-disabled', !!(b.dis || off));
    if (!press || press.el !== btn) btn.classList.remove('is-holding');
    set($('.bd', bdg), 'textContent', ui.unread > 0 ? String(ui.unread) : '');
    bdg.classList.toggle('is-new', !ui.unread && !!ui.logNew);
    const nt = S.phase === 'night'; bdg.setAttribute('aria-label', nt ? T.chat.locked : chatOff ? T.chat.log : T.chat.log + ' / ' + T.chat.title); bdg.setAttribute('aria-disabled', nt);
  }

  // ---------- 시트 (속삭임 · 기록 · 이번 밤의 패) ----------
  function buildSheet() {
    const sh = $('#sheet');
    const sb = $('.sheet-body', sh);
    sb.innerHTML = '<div class="pane" data-p="chat"><p class="chat-offnote">' + esc(T.chat.offNote) + '</p><div id="chatLog"></div></div><div class="pane" data-p="log" hidden></div><div class="pane" data-p="deck" hidden></div>';
    sb.addEventListener('scroll', () => {   // 위로 올려 읽는 중이면 그 자리를 기억한다. 맨 아래 근처면 최신 메시지를 따라간다
      if (ui.tab !== 'chat' || !(ui.h || desk())) return;
      ui.stick = sb.scrollHeight - sb.scrollTop - sb.clientHeight < 40; if (!ui.stick) ui.chatTop = sb.scrollTop;
    }, { passive: true });
    const grip = D.createElement('div'); grip.className = 'sheet-grip'; sh.insertBefore(grip, sh.firstChild);   // 아래로 끌어 닫는 손잡이
    const bd = D.createElement('div'); bd.id = 'sheet-bd'; sh.parentNode.insertBefore(bd, sh);   // 바깥을 누르면 닫는 막
    bd.addEventListener('click', () => setSheet(0));
    const f = D.createElement('form'); f.className = 'chat-form'; f.autocomplete = 'off';
    f.innerHTML = '<input class="in" id="chatInput" maxlength="300" autocomplete="off" aria-label="' + esc(T.chat.title) + '" placeholder="' + esc(T.chat.placeholder) + '">' +
      '<button class="chat-send" type="submit" aria-label="' + esc(T.chat.send) + '"><svg class="ic" aria-hidden="true"><use href="#ic-send"/></svg></button>';
    sh.appendChild(f);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const i = $('#chatInput'), t = i.value.trim(); if (!t || i.disabled) return;
      const re = +f.dataset.re || 0, cid = Math.random().toString(36).slice(2);
      i.value = ''; delete f.dataset.re; ui.stick = 1;
      chatSend(t, re, cid);
    });
    const head = $('.sheet-head', sh); let y0 = null;
    head.addEventListener('click', (e) => {
      const b = e.target.closest('.sheet-tab'); if (!b) return;
      if (b.dataset.tab === ui.tab && ui.h > 0) setSheet(ui.h === 1 ? 2 : 1); else { ui.tab = b.dataset.tab; ui.deckTop = 1; if (!ui.h) setSheet(1); sched(); }
    });
    [head, grip].forEach((el) => {   // 위로 밀면 펼치고, 아래로 밀면 줄인다. 손잡이는 한 번에 닫는다
      // 탭 줄(head)은 붙잡지 않는다: 붙잡으면 click 대상이 head가 되어 탭 버튼을 못 찾는다
      el.addEventListener('pointerdown', (e) => { y0 = e.clientY; if (el === grip) try { el.setPointerCapture(e.pointerId); } catch (x) { /* 무시 */ } });
      el.addEventListener('pointerup', (e) => {
        if (y0 === null) return; const dy = e.clientY - y0; y0 = null;
        if (dy < -24) setSheet(2); else if (dy > 24) setSheet(el === grip ? 0 : Math.max(0, ui.h - 1));
      });
      el.addEventListener('pointercancel', () => { y0 = null; });
    });
    if (ui.chatBuf) ui.chatBuf.forEach((m) => addChat(m, 1));
  }
  const push = (k) => { try { history.pushState({ ww: k }, ''); return k; } catch (e) { return 0; } }, back = () => { skipPop++; try { history.back(); } catch (e) { skipPop--; } };
  function setSheet(h) {
    if (S && S.phase === 'night' && !desk()) h = 0;
    if (h > 0 && !ui.h) { ui.deckTop = 1; ui.shT = Date.now(); }
    ui.h = h; $('#sheet').dataset.h = String(h);
    if (h > 0) { ui.unread = 0; if (ui.tab === 'log') ui.logNew = 0; if (!ui.opener) ui.opener = D.activeElement; loadChatx(); } else if (ui.opener) { try { ui.opener.focus(); } catch (e) { /* 무시 */ } ui.opener = null; }
    if (h > 0 && !desk()) body.dataset.sheet = '1'; else delete body.dataset.sheet;
    // 안드로이드 뒤로 가기 버튼: 열 때 기록을 하나 쌓고, 닫으면 그 기록을 되돌린다
    if (h > 0 && !hs && !skipPop && !desk()) hs = push(1);
    else if (!h && hs === 1) { hs = 0; back(); }
    sched();
  }
  const closeSheet = () => { if (ui.h) setSheet(0); };
  W.addEventListener('popstate', () => {
    if (skipPop) { skipPop--; return; }
    if (hs) { const m = hs === 2; hs = 0; closeModal(); if (!m && ui.h) setSheet(0); }
  });
  function kb() {
    const v = W.visualViewport; if (!v) return;
    const s = $('#sheet').style; s.setProperty('--kb', Math.max(0, Math.round(innerHeight - v.height - v.offsetTop)) + 'px'); s.setProperty('--vvh', Math.round(v.height) + 'px');
    if (chatShown() && ui.stick) toEnd();
  }
  const chatShown = () => ui.tab === 'chat' && !!(ui.h || desk());
  function toEnd() {   // 가장 최신 메시지로: 시트가 올라오는 동안 높이가 바뀌므로 몇 번 더 맞춘다
    const go = () => { const sb = $('.sheet-body'); if (sb && chatShown() && ui.stick) sb.scrollTop = sb.scrollHeight; };
    if (!toEnd.f) toEnd.f = requestAnimationFrame(() => { toEnd.f = 0; go(); });
    if (Date.now() - ui.shT < 400) { clearTimeout(toEnd.t); toEnd.t = setTimeout(go, 380); }
  }
  const cq = (c) => '.msg[data-cid="' + CSS.escape(c) + '"]';
  function chatSend(t, re, cid) {   // 보낸 즉시 흐린 줄로 보이고, 서버가 되돌려 준 같은 글이 오면 바뀐다. 실패하면 다시 보내기 버튼 (입력창은 건드리지 않는다)
    const log = $('#chatLog'); if (!log || !S) return;
    let p = $(cq(cid), log);
    if (!p) {
      p = D.createElement('p'); Object.assign(p.dataset, { cid, t, sys: '0' }); if (re) p.dataset.re = re;
      p.innerHTML = '<b class="msg-n nm">' + esc(pname(S.me)) + '</b><span class="msg-t">' + esc(t) + '</span>'; log.appendChild(p); ui.stick = 1; toEnd();
    }
    p.className = 'msg is-pending'; $$('.msg-rs', p).forEach((b) => b.remove());
    send('chat', re ? { text: t, re, cid } : { text: t, cid }, (r) => {
      if (!p.isConnected) return;
      if (r && r.ok !== false) { p.className = 'msg'; if (r.reDropped) toast(T.chat.reGone); return; }
      if (r && (r.code === 'night' || S.phase === 'night')) { const i = $('#chatInput'), f = $('.chat-form'); p.remove(); if (i && !i.value) { i.value = t; if (re && f) f.dataset.re = re; } return; }
      p.className = 'msg is-failed'; p.insertAdjacentHTML('beforeend', '<button class="msg-rs" type="button" data-act="resend">' + esc(TBT.resend) + '</button>');
    });
  }
  function addChat(m, quiet) {
    const log = $('#chatLog'); if (!log || !m || typeof m.text !== 'string') return;
    if (m.mid) { if (m.mid <= (ui.lastMid || 0)) return; ui.lastMid = m.mid; }
    const p = D.createElement('p'); p.className = 'msg'; p.dataset.sys = m.system ? '1' : '0'; if (m.mid) p.dataset.mid = m.mid;
    const q = m.re ? '<span class="msg-q" data-re="' + (+m.re.mid || 0) + '" role="button" tabindex="0" aria-label="' + esc(fmt(T.chat.jump, { n: m.re.name })) + '"><b class="nm">' + esc(m.re.name) + '</b> ' + esc(m.re.t) + '</span>' : '';
    p.innerHTML = m.system ? '<span class="msg-t">' + esc(m.text) + '</span>' : '<b class="msg-n nm">' + esc(m.name) + '</b>' + q + '<span class="msg-t">' + esc(m.text) + '</span>';
    const mine = S && m.id === S.me;
    if (m.kind === 'end') { p.dataset.kind = 'end'; if (body.dataset.replay || (S && S.phase === 'result' && R && R.night && !LS.get('result:' + R.gameId))) p.hidden = true; }   // 결말 줄은 리플레이가 끝날 때까지 가린다 (스포일러). 아직 보지 않은 자동 재생 직전도 포함
    if (mine && !m.system) {
      const q = m.cid && $(cq(m.cid), log); if (q) q.remove();
    }   // 내가 보낸 글이 돌아왔다: 임시 줄을 걷는다
    if (!chatShown() || mine) ui.stick = 1;   // 닫혀 있는 동안 온 메시지 · 내가 쓴 메시지는 항상 맨 아래로
    log.appendChild(p);
    while (log.children.length > 150) log.firstChild.remove();
    if (!quiet) toEnd();
    if (quiet || p.hidden || m.system || mine || chatShown() || chatOff) return;
    ui.unread++;
    if (S && S.phase === 'day') ticker(m.name + ': ' + m.text);
    sched();
  }
  function paintSheet() {
    const sh = $('#sheet'), night = S.phase === 'night', lobby = S.phase === 'lobby' || ui.intro;
    const tabs = lobby ? [['chat', T.chat.title], ['deck', TH.deck]] : [['chat', T.chat.title], ['log', T.chat.log], ['deck', TH.deck]];
    if (!tabs.some((t) => t[0] === ui.tab)) ui.tab = 'chat';
    const head = $('.sheet-head', sh), hk = tabs.map((t) => t[0]).join() + ui.tab;
    if (head._k !== hk) {
      head._k = hk;
      head.innerHTML = tabs.map((t) => '<button class="sheet-tab" type="button" data-tab="' + t[0] + '" aria-selected="' + (t[0] === ui.tab) + '">' + esc(t[1]) + '</button>').join('') +
        '<button class="sheet-x" type="button" data-act="sheetClose" aria-label="' + esc(TB.ariaClose) + '"><svg class="ic" aria-hidden="true"><use href="#ic-x"/></svg></button>';
    }
    if (chatShown()) ui.unread = 0;
    const ct = $('.sheet-tab[data-tab=chat]', head); if (ct) ct.classList.toggle('is-new', ui.unread > 0 && ui.tab !== 'chat');
    $$('.pane', sh).forEach((p) => { p.hidden = p.dataset.p !== ui.tab; });
    const cf = $('.chat-form', sh); cf.hidden = ui.tab !== 'chat';
    const inp = $('#chatInput');
    if (inp.disabled !== night) { inp.disabled = night; inp.placeholder = night ? T.chat.locked : T.chat.placeholder; }
    if (night && !inp.value) delete cf.dataset.re;
    const ck = chatShown() ? 'chat' : '';   // 채팅이 보이게 된 순간: 최신 메시지로 (위로 올려 읽던 중이면 그 자리로)
    if (ck !== ui.ck) { ui.ck = ck; if (ck) { if (ui.stick) toEnd(); else $('.sheet-body').scrollTop = ui.chatTop; } }
    if (night && ui.h && !desk()) setSheet(0);
    sh.setAttribute('aria-hidden', !(ui.h || desk()));
    if (ui.h || desk()) { if (ui.tab === 'log') rr('log'); else if (ui.tab === 'deck') { if (resState === 2) W.RESULT.deck(); else loadResult(); } }
  }
  // ---------- 모달 · 메뉴 · 법도 ----------
  function openModal(inner, cls, label) {
    const m = $('#modal'); if (m.hidden) ui.mopen = D.activeElement;
    m.innerHTML = '<div class="modal-box ' + (cls || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(label || '') + '"><button class="modal-x" type="button" data-act="closeModal" aria-label="' + esc(TB.ariaClose) + '"><svg class="ic" aria-hidden="true"><use href="#ic-x"/></svg></button>' + (/\b(law|paper)\b/.test(cls || '') ? '<div class="modal-in">' + inner + '</div>' : inner) + '</div>';
    if (!hs && !desk()) hs = push(2);
    m.hidden = false; ART.mark(m);
    const f = $('input,button:not(.modal-x),[role=button]', m) || $('.modal-x', m); if (f) f.focus();
  }
  function closeModal() {
    const m = $('#modal'); if (m.hidden) return;
    m.hidden = true; m.innerHTML = '';
    if (hs === 2) { hs = 0; back(); }
    if (ui.mopen) { try { ui.mopen.focus(); } catch (e) { /* 무시 */ } ui.mopen = null; }
  }
  function openMenu() { fx('menu', { v: voiceOn, c: chatOff, b: bgmOn, h: isHost(), p: S.phase, d: S.settings.dayTime, o: openModal }); }
  function openKick(pid) { fx('kick', pid, NM(pname(pid)), openModal); }
  function copyLink() { fx('copy', location.origin + location.pathname + '?room=' + S.code, openModal, toast); }

  // ---------- 홈 ----------
  const invite = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  let inviteOn = invite.length === 4;
  function homeInit() {
    const ni = $('#nameInput'), ci = $('#codeInput');
    ni.value = LS.get('ww_name') || '';
    try { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('result:') === 0) ks.push(k); } ks.sort((x, y) => x.length - y.length || (x < y ? -1 : 1)); ks.slice(0, Math.max(0, ks.length - 20)).forEach((k) => LS.del(k)); } catch (e) { /* 무시 */ }   // 결말 기록은 최근 20판만 남긴다
    [['#createBtn', 'primary'], ['#joinBtn', 'join'], ['#otherLink', 'other'], ['#lawLink', 'law']].forEach((x) => { $(x[0]).dataset.act = x[1]; });
    ni.addEventListener('focus', ping, { once: true });
    ci.addEventListener('input', () => { const v = ci.value.toUpperCase().replace(/[^A-Z]/g, ''); if (v !== ci.value) ci.value = v; });
    $('#homeForm').addEventListener('submit', (e) => { e.preventDefault(); primary(); });
    $('#homeForm').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (e.target === ci && ci.value.length === 4) ACT.join(); else primary(); } });
  }
  function homeSync() {
    set($('.lbl', $('#createBtn')), 'textContent', inviteOn ? fmt(TB.joinCode, { code: invite }) : TBT.open);
    $('#otherLink').hidden = !inviteOn;
    if (inviteOn) $('#home').dataset.invite = '1'; else delete $('#home').dataset.invite;
    setBoot(!sock.connected);
  }
  const primary = () => (inviteOn ? joinWith(invite) : ACT.create());
  function setBoot(on) {
    const h = $('#home'), b = $('#homeBoot');
    if (on) h.dataset.boot = '1'; else { delete h.dataset.boot; $('#homeBootSub').hidden = true; }
    b.hidden = !on;
    if (on && !ui.bootOn) { ui.bootOn = 1; ui.bootT0 = Date.now(); bootTick(); poll(0); }
  }
  function bootTick() {
    if (sock.connected) { ui.bootOn = 0; return; }
    const s = Math.floor((Date.now() - ui.bootT0) / 1000);
    $('#homeBoot').textContent = fmt(TB.coldWake, { s }); $('#homeBootSub').hidden = s < 3;
    setTimeout(bootTick, 1000);
  }
  function ping() { try { fetch((W.SOCKET_URL || '') + '/healthz', { mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (e) { /* 무시 */ } }
  function poll(i) {
    if (sock.connected) return;
    if (!i) return setTimeout(() => poll(1), 1000);   // 첫 깨우기는 index.html 이 이미 보냈다
    ping();
    setTimeout(() => poll(i + 1), [1, 2, 4, 5][Math.min(i, 3)] * 1000);
  }
  const whenOnline = (fn) => { if (sock.connected) fn(); else ui.pending = fn; };
  const cleanUrl = () => { try { history.replaceState(null, '', location.pathname); } catch (e) { /* 무시 */ } inviteOn = false; };
  function joinWith(code) {
    const name = $('#nameInput').value.trim();
    if (!name) return fail(TB.needName);
    if (code.length !== 4) return fail(TB.needCode);
    LS.set('ww_name', name);
    whenOnline(() => send('join', { code, name, playerId: playerId() }, (r) => { if (r && r.ok) cleanUrl(); }));
  }

  // ---------- 결말 ----------
  // 결말 · 규칙 모달 · 리플레이 진입/종료는 지연 모듈(result.js)에 있다. 여기에는 입구만 둔다.
  const X = { ui, geo, fx, snd, later, idle, sched, placeSeats, relayout, rclose, LS, loadReplay, openModal, patch, sum, isHost,
    get S() { return S; }, get R() { return R; }, get rs() { return replayState; }, scO: () => scO, scene(a, b) { scNow = a; scO = b; } };
  const rr = (n, ...a) => withRes(() => W.RESULT[n](...a));
  const startResult = (first) => rr('start', first), timeUp = () => rr('timeUp'), onReplay = () => rr('rep');

  // ---------- 누르기: 길게 누르기 · 엿보기 ----------
  function pressEnd() {
    const p = press; if (!p) return; press = null; clearTimeout(p.t);
    if (p.kind === 'hold') { p.el.classList.remove('is-holding'); toast($('#hold-hint').textContent); p.el.classList.remove('is-nudge'); void p.el.offsetWidth; p.el.classList.add('is-nudge'); } else if (p.end) p.end();
    try { p.el.releasePointerCapture(p.id); } catch (e) { /* 무시 */ }
  }
  function holdStart(el, id) {
    const act = el.dataset.act;
    if (!online() && !/^(go|ack|skip|vote)$/.test(act)) return toast(TB.ackFail, 'danger');
    if (el.getAttribute('aria-disabled') === 'true') return;
    el.classList.add('is-holding');
    press = { kind: 'hold', el, id, t: setTimeout(() => {
      press = null; el.classList.remove('is-holding'); el.classList.add('is-full');
      fx('buzz', 12); if (!el.isConnected || el.hidden || el.getAttribute('aria-disabled') === 'true') return; runAct(el); setTimeout(() => el.classList.remove('is-full'), 300);
    }, +el.dataset.hold) };
  }
  function showPeek(i) {
    fx('peek', i.role, i.label); sr(ROLES[i.role].name + '.');
  }
  function hidePeek() {
    fx('unpeek'); sr('');
  }
  function peekStart(el, id) {
    const k = el.dataset.peek;
    if (k === 'dock') {
      const i = peekInfo(); if (!i || S.phase === 'lobby') return;
      showPeek(i); LS.set('hb.peeked', '1'); const h = $('.dock-hint', el); if (h) h.remove();
      press = { kind: 'peek', el, id, end: hidePeek };
    } else if (k === 'check') {
      const c = $('.card', el); if (!c) return;
      if (!ui.pressed) fx('flash', ROLES[S.myCard].team === 'wolf' ? 'blood' : 'paper', 120);
      ui.pressed = 1; ART.flip(c, 1); el.style.setProperty('--hold', '600ms'); el.classList.add('is-hold'); const b = $('.check-t2'); if (b) b.classList.remove('is-blink');
      sr(ROLES[S.myCard].name + '.');
      const ro = ROLES[S.myCard], t1 = $('.check-t1'), tm = $('.check-team'), ds = $('.check-desc'), t0 = t1.textContent;   // 잡고 있는 동안만 역할 · 팀 · 능력을 보인다
      t1.textContent = fmt(TB.yourCardIs, { r: ro.name });
      tm.textContent = TEAM_NAME[ro.team]; tm.dataset.team = ro.team; ds.textContent = ro.desc; tm.hidden = ds.hidden = false;
      press = { kind: 'peek', el, id, end: () => { ART.flip(c, 0); el.classList.remove('is-hold'); sr(''); t1.textContent = t0; tm.hidden = ds.hidden = true; } };
    } else if (k === 'log') {
      el.classList.add('is-on'); press = { kind: 'peek', el, id, end: () => el.classList.remove('is-on') };
    }
  }
  D.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || press) return;
    const h = e.target.closest('[data-hold]'), k = e.target.closest('[data-peek]'), lp = e.target.closest('[data-lp]'), el = h || k || lp;
    if (!el) return;
    try { el.setPointerCapture(e.pointerId); } catch (x) { /* 무시 */ }
    if (h && +h.dataset.hold > 0) holdStart(h, e.pointerId);
    else if (k) peekStart(k, e.pointerId);
    else { const pid = lp.dataset.pid; press = { kind: 'lp', el: lp, id: e.pointerId, t: setTimeout(() => { press = null; ui.lpDone = 1; openKick(pid); }, 600) }; }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => D.addEventListener(n, (e) => { if (press && e.pointerId === press.id) pressEnd(); }));
  W.addEventListener('blur', pressEnd);
  D.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-peek],[data-hold],.peek')) e.preventDefault(); });
  D.addEventListener('keydown', (e) => {
    const el = e.target, k = e.key;
    if (k === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (ui.h && !desk()) setSheet(0); return; }
    if (k === 'Tab') return trap(e);
    if ((k !== 'Enter' && k !== ' ') || e.repeat || !el.matches) return;
    if (press) return;
    if (el.matches('[data-hold]') && +el.dataset.hold > 0) { e.preventDefault(); holdStart(el, 'kb'); }
    else if (el.matches('.dock-card')) { e.preventDefault(); peekStart(el, 'kb'); }
    else if (el.matches('[role=button][data-act]:not(button)')) { e.preventDefault(); runAct(el); }
  });
  D.addEventListener('keyup', (e) => { if (press && press.id === 'kb' && (e.key === 'Enter' || e.key === ' ')) pressEnd(); });
  function trap(e) {
    const box = !$('#modal').hidden ? $('#modal') : (ui.h && !desk() ? $('#sheet') : null); if (!box) return;
    const f = $$('button,input,a[href],[tabindex="0"]', box).filter((x) => !x.hidden && !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && D.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && D.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  D.addEventListener('visibilitychange', () => {
    body.classList.toggle('paused', D.hidden);
    if (D.hidden) { pressEnd(); fx('heartbeat', 0); } else { ui.hb = -1; if (!sock.connected) { if (!ui.replaced) sock.connect(); } else stale(); if (wlWant) wake(true); vp(); if (chatShown() && ui.stick) toEnd(); sched(); }
  });
  W.addEventListener('online', () => { if (resState === 0) loadResult(); if (replayState === 0 && S && S.phase !== 'lobby') loadReplay(); if (!sock.connected) { if (!ui.replaced) sock.connect(); } else stale(); });

  // ---------- 행동 ----------
  const runAct = (el) => { const f = ACT[el.dataset.act]; if (f) f(el.dataset, el); };
  const guard = (wait) => { if (S && !online() && !wait) { fail(TB.ackFail); return false; } return true; };
  const ACT = {
    primary,
    create() {
      const name = $('#nameInput').value.trim();
      if (!name) return fail(TB.needName);
      LS.set('ww_name', name);
      whenOnline(() => send('create', { name, playerId: playerId() }, (r) => { if (r && r.ok) cleanUrl(); }));
    },
    join() { joinWith($('#codeInput').value); },
    other() { inviteOn = false; cleanUrl(); sched(); },
    law() { closeModal(); rr('law'); },
    copy: copyLink,
    menu: openMenu,
    closeModal,
    voice() {
      voiceOn = !voiceOn; LS.set('ww_voice', voiceOn ? '1' : '0'); closeModal(); toast(voiceOn ? TB.voiceOnToast : TB.voiceOffToast);
      if (!voiceOn) { try { speechSynthesis.cancel(); } catch (e) { /* 무시 */ } }
    },
    chatTog() {
      chatOff = !chatOff; LS.set('ww_chat', chatOff ? '0' : '1'); body.dataset.chat = chatOff ? 'off' : '';
      const f = $('.chat-form'); if (f) delete f.dataset.re;
      ui.unread = 0; closeModal(); toast(chatOff ? TB.chatOffToast : TB.chatOnToast); if (!chatOff) loadChatx(); sched();
    },
    bgm() {
      bgmOn = !bgmOn; LS.set('ww_bgm', bgmOn ? '1' : '0');
      if (bgmOn) {   // 소리를 내려면 이 클릭 안에서 동기적으로 컨텍스트를 만들어야 한다 (iOS 자동재생 규칙)
        try { const C = W.AudioContext || W.webkitAudioContext; if (!W.SND.ctx && C) { try { W.SND.ctx = new C({ latencyHint: 'playback' }); } catch (e) { W.SND.ctx = new C(); } } W.SND.ctx.resume().catch(() => {}); } catch (e) { /* 무시 */ }
        if (W.SND.on) W.SND.on(); else { W.SND.q = W.SND.q.filter((x) => x[0] !== 'on' && x[0] !== 'off'); W.SND.q.unshift(['on', []]); ldA(); }
        if (scNow) snd('scene', scNow, scO);
      } else if (W.SND.off) W.SND.off(); else (W.SND.q = W.SND.q.filter((x) => x[0] !== 'on')).push(['off', []]);
      closeModal(); toast(bgmOn ? TB.bgmOnToast : TB.bgmOffToast);
    },
    sheetClose() { setSheet(0); },
    deck() { closeModal(); ui.tab = 'deck'; setSheet(2); },
    role(d) { ui.descRole = ui.descRole === d.role ? '' : d.role; sched(); },
    warn() { ui.warn = ui.warn ? 0 : 1; sched(); },
    deckEdit(d, el) { if (el.getAttribute('aria-disabled') !== 'true' && guard()) sock.emit('setDeck', { role: d.role, count: (S.deck[d.role] || 0) + Number(d.d) }); },
    preset() { if (guard()) sock.emit('preset'); },
    dayLen(d) { if (guard()) sock.emit('setSettings', { dayTime: Number(d.v) }); closeModal(); },
    start() { if (guard()) send('start', {}); },
    judge() { closeModal(); if (guard()) sock.emit('forceVote'); },
    kick(d) { closeModal(); if (guard()) sock.emit('kick', { id: d.pid }); },
    leave() { closeModal(); send('leave', {}, () => { LS.del('ww_room'); toHome(); }); },
    sheet() {
      if (!S || S.phase === 'night') return;
      if (ui.h) return setSheet(0);
      ui.tab = ui.logNew && !ui.unread && S.phase !== 'lobby' ? 'log' : 'chat'; setSheet(1);
    },
    rule() { ui.rule = ui.rule ? 0 : 1; sched(); },
    unfold() { $('#stage').classList.remove('is-fold'); sched(); },
    resRetry() { ui.rsTry = 0; loadResult(); },
    reload() { location.reload(); },
    goHome() { ui.off = 0; clearTimeout(ui.connT); body.removeAttribute('data-conn'); const c = $('#conn'); c.hidden = true; c.innerHTML = ''; LS.del('ww_room'); toHome(); },
    seenLog() { ui.tab = 'log'; setSheet(1); sched(); },
    here() { ui.replaced = 0; const c = $('#conn'); c.hidden = true; c.textContent = ''; sock.connect(); },
    resend(d, el) { const p = el.closest('.msg'); if (p) chatSend(p.dataset.t, +p.dataset.re || 0, p.dataset.cid); },
    ready() {
      if (!guard()) return;
      const me = S.players.find((p) => p.id === S.me);
      if (me) { const v = me.ready = !me.ready; sched(); send('ready', { ready: v }, (r) => { if (r && r.ok !== false) return; const m = S && S.players.find((p) => p.id === S.me); if (m && m.ready === v) { m.ready = !v; sched(); } }); }
    },
    again() { if (guard()) sock.emit('playAgain'); },
    replay() { rr('play', false); },
    cover() { coverAll(); },
    seat(d) {
      if (ui.lpDone) { ui.lpDone = 0; return; }
      const id = d.pid, m = modeOf();
      if (!S || id === S.me) return;
      if (S.phase === 'vote') { ui.vsel = ui.vsel === id ? null : id; return sched(); }
      if (m !== 'awake' || ui.busy) return;
      const p = S.prompt; if (!p) return;
      const t = p.type;
      if (['doppelganger', 'seer', 'robber', 'troublemaker'].indexOf(t) < 0) return;
      ui.sel = ui.sel.indexOf(id) >= 0 ? ui.sel.filter((x) => x !== id) : ui.sel.concat(id).slice(t === 'troublemaker' ? -2 : -1);
      if (t === 'seer') ui.selC = [];
      sched();
    },
    altar(d) {
      const i = +d.i, t = S && S.prompt && S.prompt.type;
      if (modeOf() !== 'awake' || ui.busy) return;
      if (t === 'lonewolf') return nightSend({ center: i }, { type: t });
      if (t === 'drunk') ui.selC = ui.selC[0] === i ? [] : [i];
      else if (t === 'seer') { ui.sel = []; ui.selC = ui.selC.indexOf(i) >= 0 ? ui.selC.filter((x) => x !== i) : ui.selC.concat(i).slice(-2); }
      sched();
    },
    ack() { nightSend({}, { type: 'info' }); },
    skip() { nightSend({ skip: true }, { type: 'skip' }); },
    go() {
      const p = S && S.prompt; if (!p || p.done || modeOf() !== 'awake') return;
      const t = p.type, d = {};
      if (t === 'doppelganger' || t === 'robber') d.player = ui.sel[0];
      else if (t === 'seer') { if (ui.sel.length) d.player = ui.sel[0]; else d.centers = ui.selC.slice(); }
      else if (t === 'troublemaker') d.players = ui.sel.slice();
      else if (t === 'drunk') d.center = ui.selC[0];
      nightSend(d, { type: t, sel: ui.sel.slice(), selC: ui.selC.slice() });
    },
    vote() {
      if (!ui.vsel || !guard(1)) return;
      send('vote', { target: ui.vsel }, () => sched());
    },
  };
  const cardOf = (pid) => { const s = ui.seats[pid]; return s && $('.card:not(.is-original)', s); };
  function nightSend(d, sn) {
    const p = S && S.prompt; if (!p || p.done || ui.busy || !guard(1)) return;
    ui.busy = 1; ui.ra = { k: p.key, d, sn }; sched();
    send('nightAction', Object.assign({}, d, { key: p.key }), (r) => { ui.busy = 0; if (r && r.ok) { ui.ra = 0; onAck(sn, r); } else { resend(); sched(); } });
  }
  // 답이 유실돼도 서버는 행동을 이미 처리했을 수 있다: 같은 키로 다시 보내 서버에 남은 답(공개 카드)을 받는다
  function resend() {
    const o = ui.ra, p = S && S.prompt; if (!o || ui.busy || !S) return;
    if (p ? !(p.key === o.k && p.done) || ui.fin[o.k] : S.phase === 'night' || S.phase === 'lobby') return;
    ui.ra = 0;
    sock.emit('nightAction', Object.assign({}, o.d, { key: o.k }), (r) => { if (r && r.ok) onAck(o.sn, r); });
  }
  function onAck(sn, r) {
    const t = sn.type, dock = $('.dock-card .card'), sw = (a, b) => { if (a && b) fx('swap', a, b); };
    if (t === 'robber') sw(cardOf(sn.sel[0]), dock);
    else if (t === 'troublemaker') sw(cardOf(sn.sel[0]), cardOf(sn.sel[1]));
    else if (t === 'drunk') { sw($$('.altar .card')[sn.selC[0]], dock); ui.unk = 1; }
    const rv = r.reveal || [];
    ART.want(rv.map((v) => v.role));
    rv.forEach((v) => {
      const mine = v.at === 'p' && v.id === S.me, from = v.from || (t === 'robber' && sn.sel[0]);
      if (mine) ui.last = seen(v.role, from ? 1 : 0, from);
      if (!mine || t === 'robber') ui.reveals.push({ k: v.at, id: v.id, idx: v.idx, role: v.role, self: mine ? 'new' : 0, from: mine ? from : 0, copy: t === 'doppelganger' ? 1 : 0 });
      if (!mine && t === 'doppelganger') ui.last = seen(v.role, 2, v.id);
    });
    if (rv.length && r.text) sr(r.text);
    ui.sel = []; ui.selC = []; sched();
  }
  D.addEventListener('click', (e) => {
    if (e.target === $('#modal')) return closeModal();
    const el = e.target.closest('[data-act]');
    if (!el || !el.dataset.act) { if (e.target.closest('a[href="#"]')) e.preventDefault(); return; }
    if (el.getAttribute('aria-disabled') === 'true' || +el.dataset.hold > 0) return;   // 길게 누르는 버튼은 클릭으로 동작하지 않는다
    e.preventDefault(); runAct(el);
  });

  // ---------- 서비스 워커 ----------
  let swReg = null;
  function applyUpdate() { if (ui.upd && !S && swReg && swReg.waiting) swReg.waiting.postMessage('skip'); }
  function initSW() {
    if (!('serviceWorker' in navigator)) return;
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.t === 'hb-update') { ui.upd = 1; if (!S || S.phase === 'lobby' || S.phase === 'result') toast(TB.newVersion); applyUpdate(); }
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !S && !ui.reloading) { ui.reloading = 1; location.reload(); } });
    const reg = () => navigator.serviceWorker.register('/sw.js').then((r) => { swReg = r; applyUpdate(); return navigator.serviceWorker.ready; }).then((r) => { const w = r && r.active, slow = root.dataset.net === 'slow' || (navigator.connection || {}).saveData; if (w) w.postMessage({ slow: slow ? 1 : 0 }); }).catch(() => {});   // 느린 망이면 보조 모듈(replay · chatx)은 미리 담지 않는다
    if (D.readyState === 'complete') idle(reg, 3000); else W.addEventListener('load', () => idle(reg, 3000));
  }

    body.dataset.chat = chatOff ? 'off' : '';
    vp(); ['resize', 'orientationchange'].forEach((n) => W.addEventListener(n, vp)); if (W.visualViewport) visualViewport.addEventListener('resize', vp);
    homeInit(); setBoot(true); homeSync(); loadAssets(); initSW(); render();
    if (W.ART && ART.warm) ART.warm(['home']);
})();
