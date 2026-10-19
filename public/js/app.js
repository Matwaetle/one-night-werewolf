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
  let S = null, R = null, skew = 0, raf = 0, press = null, replayState = 0, voiceOn = LS.get('ww_voice') === '1', chatOff = LS.get('ww_chat') === '0', bgmOn = LS.get('ww_bgm') !== '0', cxState = 0, hs = 0, skipPop = 0, scNow = '', scO = null;
  const ui = {
    shell: 0, sel: [], selC: [], busy: 0, reveals: [], fin: {}, dn: {}, last: null, unk: 0, vsel: null, rule: 0,
    ra: 0, tab: 'chat', h: 0, unread: 0, logNew: 0, intro: 0, out: 0, wait: 0, hb: -1, wk: null, dl: 0, tmax: 1,
    seatKey: '', ids: [], pts: [], seats: {}, me: 0, descRole: '', warn: 0, off: 0, pending: null, bootT0: Date.now(), fan: {}, stick: 1, ck: '', chatTop: 0,
  };
  const timers = [];
  const later = (ms, fn) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clearLater = () => timers.splice(0).forEach(clearTimeout);
  const nowS = () => Date.now() + skew;
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
    if (/\.css$/.test(A.css || '')) { const l = D.createElement('link'); l.rel = 'stylesheet'; l.href = A.css; D.head.appendChild(l); }
    addScript(A.fx, () => {});
    idle(() => { loadChatx(); if (bgmOn) ldA(); }, 3000);
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
  function speak(text) {
    if (!voiceOn || !('speechSynthesis' in W)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.95; u.onstart = () => snd('duck', 'tts', -8); u.onend = u.onerror = () => snd('duck', 'tts', 0); speechSynthesis.speak(u); } catch (e) { /* 무시 */ }
  }
  let wl = null, wlWant = false;
  async function wake(on) {
    wlWant = on;
    try {
      if (on && !wl && navigator.wakeLock && !D.hidden) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
      else if (!on && wl) { const w = wl; wl = null; await w.release(); }
    } catch (e) { /* 지원 안 함 */ }
  }

  // ---------- 소켓 ----------
  const sock = W.io(W.SOCKET_URL || '', { transports: ['websocket', 'polling'], tryAllTransports: true });
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
    if (ui.off) {
      ui.off = 0; body.removeAttribute('data-conn');
      const c = $('#conn'); c.dataset.state = 'back'; c.textContent = TB.reconnected; c.hidden = false;
      setTimeout(() => { c.hidden = true; delete c.dataset.state; }, 1000);
    }
    setBoot(false);
    const code = LS.get('ww_room'), run = () => { const f = ui.pending; ui.pending = null; if (f) f(); };
    if (code) {
      sock.emit('join', { code, playerId: playerId(), rejoin: true }, (r) => {
        if (!r || !r.ok) { LS.del('ww_room'); toHome(); toast(TB.roomLost, 'danger'); run(); } else ui.pending = null;
      });
    } else run();
  });
  sock.on('disconnect', () => {
    if (S) { ui.off = Date.now(); body.dataset.conn = 'off'; const c = $('#conn'); delete c.dataset.state; c.hidden = false; connTick(); } else setBoot(true);
    sched();
  });
  function connTick() {
    if (!ui.off) return;
    $('#conn').textContent = fmt(TB.reconnecting, { n: Math.max(1, Math.floor((Date.now() - ui.off) / 1000)) });
    setTimeout(connTick, 1000);
  }
  sock.on('state', (s) => {
    const p = S; S = s; skew = s.now - Date.now();
    LS.set('ww_room', s.code);
    if (s.result) R = s.result;
    ensureShell();
    if (!p || p.gameId !== s.gameId) newGame();
    if (!p || p.phase !== s.phase) onPhase(p && p.phase, s.phase, !p);
    else if (s.phase === 'night' && p.stepIdx !== s.stepIdx) onStep();
    resend();
    if (s.prompt && (!p || !p.prompt || p.prompt.key !== s.prompt.key)) { ui.sel = []; ui.selC = []; ui.busy = 0; }
    const pr = s.prompt;   // 불면증환자: 지금 카드를 큰 카드로 한 번만 보여 준다
    if (pr && pr.type === 'info' && pr.reveal && !pr.done && !ui.dn['rv' + pr.key]) { ui.dn['rv' + pr.key] = 1; pr.reveal.forEach((r) => ui.reveals.push({ k: 'p', id: r.id, self: 'now', role: r.role })); ART.want(pr.reveal.map((r) => r.role)); }
    sched();
  });
  sock.on('chatHistory', (m, code) => { const l = $('#chatLog'), same = code && ui.chatCode === code; ui.chatCode = code; ui.chatBuf = m; if (!l) return; if (!same) { l.innerHTML = ''; ui.lastMid = 0; ui.stick = 1; } m.forEach((x) => { if (!same || x.mid > ui.lastMid) addChat(x, 1); }); if (ui.stick) toEnd(); });
  sock.on('chat', (m) => addChat(m));
  sock.on('kicked', () => { LS.del('ww_room'); toHome(); toast(TB.kicked, 'danger'); });

  const rclose = () => { try { W.REPLAY && REPLAY.close(); } catch (e) { /* 무시 */ } };
  function toHome() {
    S = null; R = null; ui.seatKey = ''; closeModal(); if (ui.shell) closeSheet();
    rclose();
    body.removeAttribute('data-replay'); body.removeAttribute('data-ns'); wake(false); fx('heartbeat', 0); fx('lidsOpen', 0);
    clearLater(); D.title = TB.docTitle; applyUpdate(); sched();
  }
  function newGame() {
    Object.assign(ui, { sel: [], selC: [], reveals: [], fin: {}, dn: {}, last: null, unk: 0, vsel: null, rule: 0, busy: 0, logNew: 0, wk: null, ra: 0 });
  }
  function onPhase(from, to, first) {
    clearLater(); coverAll(); ui.hb = -1; ui.intro = 0; ui.wait = 0;
    if (to !== 'result') { body.removeAttribute('data-replay'); }
    if (to !== 'night') D.title = TB.docTitle;
    if (to === 'lobby') {
      rclose();
      if (LS.get('hb.awakeTip') !== '1') { LS.set('hb.awakeTip', '1'); later(600, () => toast(TB.keepAwake)); }
      wake(false); ART.warm(); fx('heartbeat', 0); fx('lidsOpen', 200);
    } else if (to === 'night') {
      wake(true); ART.want([S.myCard]); closeSheet(); closeModal();
      if (/^(seer|robber|drunk|insomniac|doppelganger)$/.test(S.myCard)) ART.prefetchDeck(S.gameDeck);
      if (first) fx('lidsOpen', 0);
      let dl = 0;
      if (!first && from === 'lobby') {   // 카드 배분 뒤 좌석 불빛이 하나씩 꺼지고 0.8초 암전
        const n = S.players.length; ui.intro = 1; ui.out = 0;
        dl = D.hidden ? 0 : root.dataset.perf === 'lite' ? 200 : mq('(prefers-reduced-motion:reduce)') ? 160 : 600 + 90 * (n + 3);
        if (dl) fx('deal', { n });
        for (let i = 0; i < n; i++) later(dl + 80 * i, () => { ui.out = i + 1; sched(); });
        later(dl + 80 * n, () => fx('lidsClose', 400));
        later(dl + 80 * n + 800, () => { ui.intro = 0; fx('lidsOpen', 500); sched(); });
      }
      later(first ? 0 : 1200 + dl, () => speak(NIGHT_TEXT._check));
    } else if (to === 'day') {
      fx('heartbeat', 0); speak(T.narr.dawn); idle(() => ART.prefetchDeck(S.gameDeck), 4000);
      if (!first) { fx('lidsClose', 0); later(600, () => { fx('lidsOpen', 700); banner('day', T.phase.dayBreaks, '', 3200); }); }
    } else if (to === 'vote') {
      fx('heartbeat', 0); idle(loadReplay, 2000);
      if (!first) { fx('flash', 'blood', 80); banner('vote', TH.judge, '', 2000); }
      if (root.dataset.net !== 'slow') ART.want(Object.keys(S.gameDeck || {}).filter((r) => S.gameDeck[r] > 0));
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
    $('#main').appendChild(h); setTimeout(() => h.remove(), ms);
  }
  function ticker(text) {
    $$('#main .ticker').forEach((e) => e.remove());
    const p = D.createElement('p'); p.className = 'ticker'; p.textContent = text;
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
    raf = 0;
    const ph = S ? S.phase : 'home';
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
      '<div class="lm" style="display:contents"></div><div class="rv" style="display:contents"></div><div class="stage-bar" role="button" tabindex="0">' + esc(TBT.unfold) + '</div></div>' +
      '<div class="nl" data-r="prompt" style="display:contents"></div><section class="board" data-r="log" hidden></section>');
    const band = D.createElement('div');
    band.className = 'band'; band.dataset.r = 'prompt'; band.setAttribute('role', 'status'); band.setAttribute('aria-live', 'polite');
    band.innerHTML = '<p class="band-text"></p><button class="band-q" type="button" data-act="rule" aria-expanded="false" hidden>?</button><p class="band-rule" hidden>' + esc(TB.voteRule) + '</p><div class="band-bar" hidden></div><a class="dock-alt" href="#" role="button" hidden></a>';
    $('#app').insertBefore(band, $('#dock'));
    buildDock();
    $('.altar').innerHTML = [0, 1, 2].map((i) => ART.card(null, { size: 'sm', cls: 'altar-card', label: T.altar[i] })).join('');
    $$('.altar .card').forEach((c, i) => { c.dataset.i = i; });
    buildSheet();
    const st = $('#stage');
    st.addEventListener('click', (e) => { if (st.classList.contains('is-fold') && !e.target.closest('[data-act]')) { st.classList.remove('is-fold'); sched(); } });
    if (W.ResizeObserver) new ResizeObserver(relayout).observe(st);
    W.addEventListener('resize', relayout);
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
    const V = { mode, band: '', sel: null, selC: false, marks: {}, target: [], targetC: [], btn: {}, alt: null, card: -1, badge: '', rule: 0 };
    const ph = S.phase;
    V.hudPhase = ph === 'lobby' ? T.phase.lobby : mode === 'check' ? T.phase.check : T.phase[ph];
    if (mode === 'lobby') {
      const n = S.players.length, need = n + 3, total = sum(S.deck);
      V.band = n < 3 ? fmt(TB.waitMore, { need: 3 - n }) : TB.deckNote;
      V.btn = !isHost() ? { lbl: TB.waitChief, dis: 1 } : n < 3 ? { lbl: fmt(TB.lack, { need: 3 - n }), dis: 1 }
        : total !== need ? { lbl: fmt(TB.deckLack, { total, need }), dis: 1 } : { lbl: TBT.start, act: 'start' };
    } else if (mode === 'check') {
      V.band = TB.checkBand; V.btn = { hide: 1 };
    } else if (mode === 'sleep') {
      V.btn = { hide: 1 }; V.status = TB.sleeping; V.card = 0; V.badge = T.phase.night;
    } else if (mode === 'awake') {
      nightView(V);
    } else if (mode === 'day') {
      const conn = S.players.filter((p) => p.connected), mine = S.players.find((p) => p.id === S.me);
      V.band = TB.dayAsk + '\n' + fmt(TB.raised, { r: conn.filter((p) => p.ready).length, n: conn.length }); V.card = 0;
      V.btn = { lbl: mine && mine.ready ? TBT.unready : TBT.ready, act: 'ready' };
    } else if (mode === 'vote') {
      V.rule = 1; V.band = TB.pickExec; V.sel = others().map((p) => p.id);
      const t = ui.vsel || S.myVote; if (t) V.target = [t];
      V.btn = ui.vsel && ui.vsel !== S.myVote ? { lbl: TBT.execute, nm: pname(ui.vsel), hold: 600, act: 'vote' } : { lbl: TBT.execute, nm: S.myVote ? pname(S.myVote) : '', dis: 1 };
      if (S.myVote && (!ui.vsel || ui.vsel === S.myVote)) { V.band = fmt(TB.votedFor, { n: pname(S.myVote) }); V.btn = { lbl: TB.votedBtn, nm: '', dis: 1 }; }
    } else if (mode === 'result') {
      V.btn = isHost() ? { lbl: TBT.again, act: 'again' } : { lbl: TB.waitChiefNext, dis: 1 };
    }
    return V;
  }
  function nightView(V) {
    const p = S.prompt, t = p.type, st = S.stepRole, sel = ui.sel, selC = ui.selC, nm = sel.map(pname).join(', ');
    const pre = p.fromDoppel ? TB.asDoppel + ' ' : '', pickP = () => { V.sel = others().map((x) => x.id); };
    V.card = 0; V.badge = T.phase.night; V.btn = { hide: 1 }; V.status = TB.sleeping;
    if (p.done) { V.band = TB.doneClose; return; }
    if (ui.reveals.length) {   // 카드를 보는 동안 출처 좌석 · 가운데 카드에 테두리
      V.band = TB.coverHint;
      V.target = ui.reveals.filter((r) => r.k === 'p').map((r) => (r.id === S.me ? r.from : r.id)).filter(Boolean);
      V.targetC = ui.reveals.filter((r) => r.k === 'c').map((r) => r.idx);
      return;
    }
    V.status = '';
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
      V.btn = sel.length ? { lbl: TBT.look, nm, hold: 600, act: 'go' } : { lbl: TBT.lookAltar, nm: selC.length ? fmt(TB.lookCount, { n: selC.length }) : '', hold: 600, act: 'go', dis: selC.length !== 2 };
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
    return S.phase === 'day' ? S.dayEndsAt : S.phase === 'vote' ? S.voteEndsAt : mode === 'awake' ? S.stepEndsAt : 0;
  }
  let tickT = 0;
  function tick() {
    clearTimeout(tickT);
    if (!S) return;
    const mode = modeOf(), dl = deadline(mode), tm = $('.hud-timer'), bar = $('.hud-bar'), bb = $('.band-bar');
    let hb = mode === 'check' ? 1 : 0;
    if (!dl) { tm.hidden = bar.hidden = bb.hidden = true; ui.dl = 0; }
    else {
      if (dl !== ui.dl) { ui.dl = dl; ui.tmax = Math.max(1000, dl - nowS()); }
      const left = Math.max(0, dl - nowS()), secs = Math.ceil(left / 1000), f = Math.max(0, (left - 1000) / ui.tmax);
      const txt = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      tm.hidden = bar.hidden = false;
      if (tm._v !== txt) {
        tm._v = txt; tm.innerHTML = Array.from(txt).map((c) => (c === ':' ? c : '<b>' + c + '</b>')).join('');
        if (S.phase === 'vote' && secs <= 10) { tm.classList.remove('tick'); void tm.offsetWidth; tm.classList.add('tick'); }
      }
      tm.classList.toggle('is-urgent', secs <= 10);
      bar.style.transform = bb.style.transform = 'scaleX(' + f + ')';
      bar.classList.toggle('is-low', secs < 60 && S.phase !== 'night');
      bb.hidden = mode !== 'awake';
      if (S.phase === 'day') hb = secs <= 10 ? 2 : secs <= 30 ? 1 : 0;
    }
    if (hb !== ui.hb) { ui.hb = hb; fx('heartbeat', hb); }
    tickT = setTimeout(tick, 1020 - (nowS() % 1000));
  }

  // ---------- 좌석 · 탁자 ----------
  function relayout() { if (S && ui.ids.length) { placeSeats(); lines(); if (body.dataset.replay && W.REPLAY && REPLAY.relayout) REPLAY.relayout(); } }
  function placeSeats() {
    const st = $('#stage'), N = ui.ids.length, rp = body.dataset.replay ? 96 : 0, H = st.clientHeight - rp, sh = Math.max(64, ...ui.ids.map((id) => (ui.seats[id] ? ui.seats[id].offsetHeight : 0)));   // 리플레이 자막 띠만큼 탁자를 위로 올린다
    st.style.setProperty('--cy', (-rp / 2) + 'px');
    const tk = parseFloat(getComputedStyle(st).getPropertyValue('--tk')) || 48;
    const rx = Math.max(60, st.clientWidth / 2 - 40), ry = Math.max(60, Math.min(H / 2 - 64, H / 2 - (sh - tk / 2) - 12, H / 2 - tk / 2 - 28));   // 토큰 중심이 기준점. 위 28px 는 .night-track 자리
    const al = $('.altar'), ah = al && !al.hidden ? al.offsetHeight : 0, tight = !!(ah && ry < ah / 2 + sh / 2 + 8);
    if (tight !== (st.dataset.tight === '1')) { if (tight) st.dataset.tight = '1'; else delete st.dataset.tight; if (!placeSeats.re) { placeSeats.re = 1; try { return placeSeats(); } finally { placeSeats.re = 0; } } }
    ui.pts = ui.ids.map((id, i) => {
      const th = Math.PI / 2 + 2 * Math.PI * ((i - ui.me + N) % N) / N;
      return { x: Math.round(rx * Math.cos(th)), y: Math.round(ry * Math.sin(th)) - rp / 2 };
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
    placeSeats();
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
      tok.setAttribute('aria-pressed', f['is-target'] ? 'true' : 'false');
      if (isHost() && S.phase === 'lobby' && p.id !== S.me) tok.dataset.lp = '1'; else delete tok.dataset.lp;
      set($('.seat-name', el), 'textContent', f['is-off'] ? TB.away : short(p.name));
      const m = $('.seat-mark', el);
      if (mk) { m.dataset.k = mk[0]; set(m, 'textContent', mk[1]); }
      else if (res && p.votes > 0) { m.dataset.k = 'votes'; set(m, 'textContent', TB.cols.votes + ' ' + p.votes); }
      else { delete m.dataset.k; set(m, 'textContent', ''); }
      const ck = seatCard(p, mode);
      if (el._ck !== ck) {
        el._ck = ck; changed = 1; $$('.card', el).forEach((c) => c.remove());
        if (ck === 'b') el.insertAdjacentHTML('beforeend', ART.card(null, { size: 'xs' }));
        else if (ck) {
          const sw = p.final !== p.original;
          el.insertAdjacentHTML('beforeend', ART.card(p.final, { size: desk() ? 'sm' : 'xs', face: 1, cls: (p.dead ? 'is-dead ' : '') + (sw ? 'is-swapped' : '') }) + (sw ? ART.card(p.original, { size: desk() ? 'sm' : 'xs', face: 1, cls: 'is-original' }) : ''));
        }
        ART.mark(el);
      }
    });
    if (changed) { placeSeats(); lines(); if (body.dataset.replay && W.REPLAY && REPLAY.relayout) REPLAY.relayout(); }
  }
  function paintAltar(V) {
    const al = $('.altar'), res = V.mode === 'result' && R, ctx = !!V.sel || V.selC;
    al.hidden = V.mode === 'lobby' || V.mode === 'check';
    $$('.card', al).forEach((c, i) => {
      const role = res ? R.center.final[i] : null, sw = res && R.center.original[i] !== R.center.final[i], key = role ? role + (sw ? '*' : '') : '';
      if (c._k !== key) {
        const t = D.createElement('template');
        t.innerHTML = ART.card(role, { size: 'sm', cls: 'altar-card' + (sw ? ' is-swapped' : ''), label: T.altar[i], face: role ? 1 : 0 });
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
    const mh = $('#main').clientHeight;
    const hh = mode === 'result' && !st.classList.contains('is-fold') && !desk() ? Math.round(Math.min(mh * 0.55, 380)) + 'px' : '';
    if (st.style.height !== hh) { st.style.height = hh; if (ui.ids.length) placeSeats(); }
  }
  function lobbyHTML() {
    const d = S.phase === 'night' ? S.gameDeck : S.deck, cards = [], prev = ui.fan, seen = {};
    ROLE_ORDER.forEach((r) => { for (let i = 0; i < (d[r] || 0); i++) cards.push(r); });
    const all = cards.length, extra = Math.max(0, all - 7); cards.length = Math.min(all, 7);
    const c = cards.length, h = cards.map((r, i) => {
      seen[r] = (seen[r] || 0) + 1;
      const o = i - (c - 1) / 2, drop = prev[r] !== undefined && seen[r] > prev[r];
      return ART.card(r, { size: 'sm', face: 1, cls: drop ? 'fx-drop' : '' }).replace('class="card', 'style="--r:' + (o * Math.min(6, 60 / c)).toFixed(1) + 'deg;--i:' + Math.abs(o) + '" class="card');
    }).join('') + (extra ? '<span class="fan-more">+' + extra + '</span>' : '');
    ui.fan = seen;
    return '<div class="lobby-mid"><p class="lobby-sign" aria-label="' + esc(TH.sign + ' ' + S.code) + '">' + esc(S.code) + '</p>' +
      '<button class="lobby-copy" type="button" data-act="copy">' + esc(TBT.copyCode) + '</button><p class="lobby-count">' + esc(fmt(TB.fire, { n: S.players.length })) + '</p>' +
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
    }).join('') + '</div><p class="reveal-hint">' + esc(TB.coverHint) + '</p></div>';
  }
  function nightHTML(V) {
    const m = V.mode;
    if (S.phase !== 'night' || m === 'lobby') return '';
    if (m === 'check') {
      return '<div class="check"><div class="check-card" data-peek="check" style="' + NOSEL + '">' + ART.card(S.myCard, { size: 'xl', face: 0 }) + '</div>' +
        '<p class="check-t1">' + esc(TB.yourCard) + '</p><p class="check-team" hidden></p><p class="check-desc" hidden></p><p class="check-t2">' + esc(TB.holdHint) + '</p><i class="check-bar"></i></div>';
    }
    const n = S.steps.length - 1;
    const dots = '<div class="night-track" aria-hidden="true">' + Array.from({ length: n }, (_, i) => '<i class="night-dot' + (i + 1 < S.stepIdx ? ' is-past' : i + 1 === S.stepIdx ? ' is-now' : '') + '"></i>').join('') + '</div>';
    return m === 'sleep' ? dots + '<p class="night-nar" data-t="' + esc(fmt(TB.wake, { role: ROLES[S.stepRole] ? ROLES[S.stepRole].name : '' })) + '"></p><p class="night-msg">' + esc(T.phase.closeEyes || TB.closeEyes) + '</p>' : dots;
  }
  function afterNight(V) {
    const nl = $('.nl');
    if (V.mode === 'check') {
      const left = Math.max(0, S.stepEndsAt - nowS()), bar = $('.check-bar', nl), cc = $('.check-card', nl);
      bar.style.setProperty('--ms', left + 'ms'); void bar.offsetWidth; bar.classList.add('is-run');
      ui.pressed = 0;
      later(Math.max(0, 7000 - (13000 - left)), () => { const k = $('.check-t2'); if (k && !ui.pressed) k.classList.add('is-blink'); });
      later(Math.max(0, left - 1200), () => { if (cc) cc.classList.add('is-sink'); });
      later(Math.max(0, left - 700), () => fx('lidsClose', 500));
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
    set($('.band-text', b), 'textContent', V.band + (V.mode === 'day' && !isPeeked() && TB.dockCoach ? '\n' + TB.dockCoach : ''));
    q.hidden = !V.rule; q.setAttribute('aria-expanded', ui.rule ? 'true' : 'false'); r.hidden = !(V.rule && ui.rule);
    b.hidden = V.mode === 'result';
  }
  const unknown = () => !!(ui.unk || (S.myCard === 'drunk' && (S.myLog || []).length));
  const isPeeked = () => LS.get('hb.peeked') === '1';
  const seen = (role, who, id) => ({ role, lbl: who === 1 ? TB.whoNew : who ? TB.whoMine : TB.whoNow, sub: who === 1 ? fmt(TB.whoFrom, { n: pname(id) }) : who ? fmt(TB.whoCopied, { n: pname(id) }) : TB.whoWoke });   // who: 1 강도(from=id) · 2 도플갱어(id) · 0 불면증환자
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
    const ck = V.card === 0 && S.myCard ? (unknown() ? 'u' : 'b') + (S.phase === 'day' ? 'c' : '') + (isPeeked() ? '' : 'h') : 'v';
    if (card._k !== ck && !press) {
      card._k = ck; card.style.visibility = ck === 'v' ? 'hidden' : '';
      card.setAttribute('aria-label', ck === 'v' ? '' : TB.yourCard + ' ' + TB.holdHint);
      card.innerHTML = ck === 'v' ? '' : ART.card(null, { size: 'xs', cls: unknown() ? 'is-unknown' : '' }) +
        (S.phase === 'day' ? '<svg class="crack" aria-hidden="true"><use href="#ic-crack"/></svg>' : '') + (isPeeked() ? '' : '<span class="dock-hint">' + esc(TB.dockHint) + '</span>');
      ART.mark(card);
    }
    alt.hidden = !V.alt; set(alt, 'textContent', V.alt ? V.alt.t : ''); alt.dataset.act = V.alt ? V.alt.act : '';
    alt.setAttribute('aria-disabled', off ? 'true' : 'false');
    const b = V.btn;
    const stt = $('.dock-status', d); if (stt) { set(stt, 'textContent', V.status || ''); stt.hidden = !V.status; }
    btn.hidden = !!b.hide; set($('.lbl', btn), 'textContent', b.lbl || '');
    const nm = $('.nm', btn); set(nm, 'textContent', b.nm || ''); nm.hidden = !b.nm;
    btn.dataset.act = b.act || '';
    if (b.hold) { btn.dataset.hold = b.hold; if (V.mode !== 'vote') btn.dataset.cap = $('#hold-hint').textContent; else delete btn.dataset.cap; btn.setAttribute('aria-describedby', 'hold-hint'); } else { delete btn.dataset.hold; delete btn.dataset.cap; btn.removeAttribute('aria-describedby'); }
    btn.setAttribute('aria-disabled', b.dis || off ? 'true' : 'false');
    if (!press || press.el !== btn) btn.classList.remove('is-holding');
    set($('.bd', bdg), 'textContent', V.badge || (ui.unread > 0 ? String(ui.unread) : ''));
    bdg.classList.toggle('is-new', !ui.unread && !!ui.logNew);
    bdg.setAttribute('aria-label', chatOff ? T.chat.log : T.chat.log + ' / ' + T.chat.title); bdg.setAttribute('aria-disabled', S.phase === 'night' ? 'true' : 'false');
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
      send('chat', re ? { text: t, re, cid } : { text: t, cid }, (r) => { if (!r || r.ok === false) { if (!i.value) { i.value = t; if (re) f.dataset.re = re; } } else if (r.reDropped) toast(T.chat.reGone); });
    });
    const head = $('.sheet-head', sh); let y0 = null;
    head.addEventListener('click', (e) => {
      const b = e.target.closest('.sheet-tab'); if (!b) return;
      if (b.dataset.tab === ui.tab && ui.h > 0) setSheet(ui.h === 1 ? 2 : 1); else { ui.tab = b.dataset.tab; ui.deckTop = 1; if (!ui.h) setSheet(1); sched(); }
    });
    [head, grip].forEach((el) => {   // 위로 밀면 펼치고, 아래로 밀면 줄인다. 손잡이는 한 번에 닫는다
      el.addEventListener('pointerdown', (e) => { y0 = e.clientY; try { el.setPointerCapture(e.pointerId); } catch (x) { /* 무시 */ } });
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
    if (h > 0 && !ui.h) ui.deckTop = 1;
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
    const sb = $('.sheet-body'), go = () => { if (sb && chatShown() && ui.stick) sb.scrollTop = sb.scrollHeight; };
    go(); requestAnimationFrame(go); clearTimeout(toEnd.t); toEnd.t = setTimeout(go, 380);
  }
  function addChat(m, quiet) {
    const log = $('#chatLog'); if (!log) return;
    if (m.mid) { if (m.mid <= (ui.lastMid || 0)) return; ui.lastMid = m.mid; }
    const p = D.createElement('p'); p.className = 'msg'; p.dataset.sys = m.system ? '1' : '0'; if (m.mid) p.dataset.mid = m.mid;
    const q = m.re ? '<span class="msg-q" data-re="' + (+m.re.mid || 0) + '" role="button" tabindex="0" aria-label="' + esc(fmt(T.chat.jump, { n: m.re.name })) + '"><b class="nm">' + esc(m.re.name) + '</b> ' + esc(m.re.t) + '</span>' : '';
    p.innerHTML = m.system ? '<span class="msg-t">' + esc(m.text) + '</span>' : '<b class="msg-n nm">' + esc(m.name) + '</b>' + q + '<span class="msg-t">' + esc(m.text) + '</span>';
    const mine = S && m.id === S.me;
    if (!chatShown() || mine) ui.stick = 1;   // 닫혀 있는 동안 온 메시지 · 내가 쓴 메시지는 항상 맨 아래로
    log.appendChild(p);
    while (log.children.length > 150) log.firstChild.remove();
    if (!quiet) toEnd();
    if (quiet || m.system || mine || ui.h || desk() || chatOff) return;
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
    $$('.pane', sh).forEach((p) => { p.hidden = p.dataset.p !== ui.tab; });
    const cf = $('.chat-form', sh); cf.hidden = ui.tab !== 'chat';
    const inp = $('#chatInput');
    if (inp.disabled !== night) { inp.disabled = night; inp.placeholder = night ? T.chat.locked : T.chat.placeholder; }
    if (night) delete cf.dataset.re;
    const ck = chatShown() ? 'chat' : '';   // 채팅이 보이게 된 순간: 최신 메시지로 (위로 올려 읽던 중이면 그 자리로)
    if (ck !== ui.ck) { ui.ck = ck; if (ck) { if (ui.stick) toEnd(); else $('.sheet-body').scrollTop = ui.chatTop; } }
    if (night && ui.h && !desk()) setSheet(0);
    sh.setAttribute('aria-hidden', ui.h || desk() ? 'false' : 'true');
    if (ui.h || desk()) { if (ui.tab === 'log') paintLog(); else if (ui.tab === 'deck') paintDeck(); }
  }
  function paintLog() {
    const p = $('.pane[data-p=log]'), items = S.myLog || [];
    patch(p, items.length ? '<ul class="log-list" style="list-style:none;margin:0;padding:0">' + items.map((it) => '<li class="log-item"><div class="secret" data-peek="log"><div class="secret-in">' +
      (it.reveal || []).map((r) => '<span class="log-c">' + ART.card(r.role, { size: 'xs', face: 1 }) + '</span>').join('') + '<span class="log-t">' + esc(it.text) + '</span></div><span class="secret-lbl">' + esc(TB.blurHint) + '</span></div></li>').join('') + '</ul>'
      : '<p class="log-none">' + esc(TB.seenNothing) + '</p>');
  }
  function paintDeck() {
    const p = $('.pane[data-p=deck]'), lobby = S.phase === 'lobby', edit = lobby && isHost();
    const d = lobby ? S.deck : (S.gameDeck || S.deck), n = S.players.length, need = n + 3, total = sum(d);
    const warns = lobby ? [d.mason === 1 && TB.masonWarn, !d.werewolf && TB.noWolfWarn].filter(Boolean) : [];
    let h = '<div class="deck-bar">';
    if (lobby) {
      h += '<output class="deck-count' + (total === need ? ' is-ok' : '') + '">' + esc(fmt(TB.deckCount, { total, need })) + '</output>';
      if (warns.length) h += '<button class="deck-warn" type="button" data-act="warn" aria-expanded="' + !!ui.warn + '">!</button>';
      if (edit) h += '<button class="deck-arrange" type="button" data-act="preset">' + esc(TH.arrange) + '</button>';
    } else h += '<p class="deck-note">' + esc(TB.deckAll) + '</p>';
    h += '</div>';
    if (lobby) h += (ui.warn && warns.length ? '<p class="deck-warn-t">' + esc(warns.join(' ')) + '</p>' : '') + '<p class="deck-note">' + esc(!S.deckCustom ? TB.arrangeNote : TB.deckNote) + '</p>';
    h += '<p class="deck-desc" aria-live="polite">' + (ui.descRole ? esc(ROLES[ui.descRole].desc) : '') + '</p><div class="deck-grid">';
    ROLE_ORDER.forEach((r) => {
      const c = d[r] || 0, nme = ROLES[r].name; if (!lobby && !c) return;
      h += '<div class="deck-cell' + (c ? '' : ' is-zero') + '" data-role="' + r + '"><span data-act="role" data-role="' + r + '" role="button" tabindex="0">' + ART.card(r, { size: 'sm', face: 1, cls: c ? '' : 'is-zero' }) + '</span><div class="deck-ctl">' +
        (edit ? '<button class="deck-dec" type="button" data-act="deckEdit" data-role="' + r + '" data-d="-1" aria-label="' + esc(nme + ' ' + TB.dec) + '"' + (c <= 0 ? ' aria-disabled="true"' : '') + '>−</button>' : '') + '<output>' + c + '</output>' +
        (edit ? '<button class="deck-inc" type="button" data-act="deckEdit" data-role="' + r + '" data-d="1" aria-label="' + esc(nme + ' ' + TB.inc) + '"' + (c >= ROLES[r].max ? ' aria-disabled="true"' : '') + '>+</button>' : '') + '</div></div>';
    });
    patch(p, h + '</div>');
    if (ui.deckTop) { ui.deckTop = 0; const sb = $('.sheet-body'); if (sb) sb.scrollTop = 0; }
  }

  // ---------- 모달 · 메뉴 · 법도 ----------
  function openModal(inner, cls, label) {
    const m = $('#modal'); if (m.hidden) ui.mopen = D.activeElement;
    m.innerHTML = '<div class="modal-box ' + (cls || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(label || '') + '"><button class="modal-x" type="button" data-act="closeModal" aria-label="' + esc(TB.ariaClose) + '"><svg class="ic" aria-hidden="true"><use href="#ic-x"/></svg></button>' + inner + '</div>';
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
  function openLaw() {
    const end = '<ul>' + TB.lawEnd.map((x) => '<li><b>' + esc(x.h) + '</b> ' + esc(x.t) + '</li>').join('') + '</ul>';
    openModal('<h2 class="modal-title">' + esc(TH.law) + '</h2><div class="law-grid"><ol class="law-list">' +
      TB.law.map((x, i) => '<li class="law-row"><b>' + esc(x.h) + '</b>' + esc(x.t) + (i === TB.law.length - 1 ? end : '') + '</li>').join('') +
      '</ol><div><h3 class="law-sub">' + esc(TH.lawOrder) + '</h3><div class="law-roles">' +
      ROLE_ORDER.map((r) => '<div class="law-role">' + ART.card(r, { size: 'sm', face: 1 }) + '<div><b>' + esc(ROLES[r].name) + '</b><span>' + esc(ROLES[r].desc) + '</span></div></div>').join('') + '</div></div></div>', 'law', TH.law);
  }
  function openMenu() {
    const item = (act, t) => '<button class="menu-item" type="button" data-act="' + act + '">' + esc(t) + '</button>';
    const hold = (act, t) => '<button class="menu-item is-danger hold" type="button" data-act="' + act + '" data-hold="1200" style="position:relative;overflow:hidden"><span class="hold-fill"></span><span class="lbl" style="position:relative">' + esc(t) + '</span></button>';
    let h = '<div class="menu">' + item('voice', voiceOn ? TBT.voiceOff : TBT.voiceOn) + item('chatTog', chatOff ? TBT.chatOn : TBT.chatOff) + item('bgm', bgmOn ? TBT.bgmOff : TBT.bgmOn) + (bgmOn && W.SND.segHTML ? W.SND.segHTML() : '') + item('law', TBT.law) + item('deck', TBT.deck);
    if (S.phase === 'lobby' && isHost()) {
      h += '<div class="seg" role="group" aria-label="' + esc(TH.dayLen) + '">' + [180, 300, 420].map((v) =>
        '<button type="button" class="seg-btn" data-act="dayLen" data-v="' + v + '" aria-pressed="' + (S.settings.dayTime === v) + '">' + (v / 60) + TB.minutes + '</button>').join('') + '</div>';
    }
    if (S.phase === 'day' && isHost()) h += hold('judge', TBT.judgeNow);
    openModal(h + hold('leave', TBT.leave) + '</div>', 'menu-box', TB.ariaMenu);
  }
  function openKick(pid) {
    openModal('<p class="modal-title">' + fmt(TB.kickAsk, { n: NM(pname(pid)) }) + '</p><button class="btn-main hold" type="button" data-act="kick" data-pid="' + esc(pid) +
      '" data-hold="1200"><span class="hold-fill"></span><span class="lbl">' + esc(TBT.kick) + '</span></button>', 'kick', TBT.kick);
  }
  function copyLink() {
    const link = location.origin + location.pathname + '?room=' + S.code;
    const fb = () => {
      openModal('<h2 class="modal-title">' + esc(TB.copyTitle) + '</h2><p>' + esc(TB.copyHint) + '</p><input class="in" readonly value="' + esc(link) + '" aria-label="' + esc(TB.copyTitle) + '">', 'copy', TB.copyTitle);
      const i = $('#modal input'); if (i) i.select();
    };
    if (navigator.clipboard && W.isSecureContext) navigator.clipboard.writeText(link).then(() => toast(TB.copied), fb); else fb();
  }

  // ---------- 홈 ----------
  const invite = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  let inviteOn = invite.length === 4;
  function homeInit() {
    const ni = $('#nameInput'), ci = $('#codeInput');
    ni.value = LS.get('ww_name') || '';
    [['#createBtn', 'primary'], ['#joinBtn', 'join'], ['#otherLink', 'other'], ['#lawLink', 'law']].forEach((x) => { $(x[0]).dataset.act = x[1]; });
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
    $('#homeBoot').textContent = fmt(TB.coldWake, { s }); $('#homeBootSub').hidden = s < 15;
    setTimeout(bootTick, 1000);
  }
  function poll(i) {
    if (sock.connected) return;
    if (!i) return setTimeout(() => poll(1), 1000);   // 첫 깨우기는 index.html 이 이미 보냈다
    try { fetch((W.SOCKET_URL || '') + '/healthz', { mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (e) { /* 무시 */ }
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
  function belief(s) {   // 믿은 패 (SPEC 13.8): r 기준
    const N = R.night; if (!N) return null;
    const ce = N.ev.find((e) => e.k === 'copy'), cp = ce ? N.deal[ce.see[0][0]] : null;
    const eff = (c) => (N.deal[c] === 'doppelganger' && cp ? cp : N.deal[c]);
    let b = R.players[s].original;
    N.ev.forEach((e) => {
      const i = e.by.indexOf(s); if (i < 0) return;
      const r = e.r || e.st, see = e.see && (e.see.length === e.by.length ? e.see[i] : e.see[0]);
      if (e.k === 'copy' || (see && (r === 'robber' || r === 'insomniac'))) b = eff(see[0]);
      else if (r === 'drunk') b = 'blind';
    });
    return b;
  }
  function selfLine() {
    const s = R.players.findIndex((p) => p.id === S.me); if (s < 0) return '';
    const p = R.players[s], SF = T.replay.self, f = ROLES[p.effective].name;
    let b = null; try { b = belief(s); } catch (e) { /* 무시 */ }
    b = b || p.original;
    const o = [b === 'blind' ? fmt(SF.blind, { f }) : b === p.effective ? fmt(SF.same, { f }) : fmt(SF.diff, { b: ROLES[b].name, f })];
    if (p.final === 'doppelganger' && R.doppelCopy) o.push(fmt(SF.doppel, { r: ROLES[R.doppelCopy].name }));
    o.push(fmt(p.win ? SF.win : SF.lose, { team: TEAM_NAME[p.team] }));
    return o.join(' ');
  }
  function verdictKey() {
    const w = R.winners;
    if (w.indexOf('village') >= 0) return [R.wolvesInPlay ? 'village' : 'villageNoWolf', 'village'];
    if (w.indexOf('wolf') >= 0) return [R.wolvesInPlay ? 'wolf' : 'minion', 'wolf'];
    return w.indexOf('tanner') >= 0 ? ['tanner', 'tanner'] : ['none', 'none'];
  }
  function ensureBoard() { if (R && !$('.board')._d) drawBoard(); }
  function drawBoard() {
    const bd = $('.board'), vk = verdictKey(), RP = T.replay, me = R.players.some((p) => p.id === S.me);
    if (W.ART && ART.warm && vk[1] !== 'none') ART.warm(['verdict-' + vk[1]]);
    const vdeaths = R.deaths.filter((d) => d.by === 'vote'), vote = vdeaths.map((d) => R.players[d.s].name);
    const execSet = {}, execCards = vdeaths.map((d) => { const q = R.players[d.s]; execSet[d.s] = 1; return fmt(TB.execCard, { n: NM(q.name), r: ROLES[q.final === 'doppelganger' && R.doppelCopy ? R.doppelCopy : q.effective].name }); });
    const used = {}, whyL = [];
    execCards.forEach((l) => { used[l] = 1; });
    R.why.forEach((w) => {
      if (w[0] === 'wolf_died' && (w[1] || []).some((i) => execSet[i])) return;
      const v = names((w[1] || []).map((i) => R.players[i].name)), l = fmt(RP.why[w[0]] || '', { list: v, t: v, a: v });
      if (!l || used[l]) return; used[l] = 1; whyL.push(l);
    });
    const hunts = R.deaths.filter((d) => d.by === 'hunter');
    const chip = (id, cp) => { const r = ROLES[id]; return '<svg aria-hidden="true"><use href="#' + r.sigil + '"/></svg>' + esc(id === 'doppelganger' && cp ? fmt(TB.doppelArrow, { r: ROLES[cp].name }) : r.name); };
    const row = (p, i, alt) => '<li class="rec-row' + (p.id === S.me ? ' is-me' : '') + (p.dead ? ' is-dead' : '') + (p.win ? ' is-win' : '') + (alt ? ' is-altar' : '') + (!alt && !S.players.some((x) => x.id === p.id) ? ' is-gone' : '') + '" data-slot="' + i + '">' +
      '<div class="rec-top"><b class="rec-n nm">' + esc(alt || p.name) + '</b>' +
      (alt ? '' : '<span class="rec-stamp' + (p.win ? ' is-win' : '') + '">' + esc(p.win ? T.stamp.win : T.stamp.lose) + '</span>') +
      '<span class="rec-chg"><span class="rec-from">' + chip(p.original) + '</span><span class="rec-arrow">→</span><span class="rec-to">' + chip(p.final, R.doppelCopy) + '</span></span>' +
      (alt ? '' : '<span class="rec-meta"><span class="rec-vote">' + esc(TB.cols.vote) + ' ' + (p.vote ? nmh(pname(p.vote)) : '—') + '</span> · <span class="rec-got">' + esc(TB.cols.votes) + ' ' + p.votes + '</span></span>' +
        (hunts.some((d) => d.s === i) ? '<svg class="rec-hunt" aria-hidden="true"><use href="#sg-hunter"/></svg>' : '')) + '</div></li>';
    const rank = (p) => (p.id === S.me ? 0 : p.dead ? 1 : 2);
    const rows = R.players.map((p, i) => [p, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]);
    const n = R.players.length, mob = mq('(max-width:599px)');
    const effOf = (q) => (q.final === 'doppelganger' && R.doppelCopy ? R.doppelCopy : q.effective), heroes = [];
    vdeaths.forEach((d) => { const q = R.players[d.s]; if (heroes.length < 2) heroes.push([effOf(q), 'is-dead', q.id === S.me ? TB.heroDeadMe : TB.heroDead, q.name]); });
    const keyW = R.why.find((w) => /^(wolf_lived|tanner_blocked|minion_|tanner_too)/.test(w[0]) && (w[1] || []).some((i) => !execSet[i]));
    if (keyW && heroes.length < 2) { const i = keyW[1].find((x) => !execSet[x]), q = R.players[i]; heroes.push([effOf(q), '', q.id === S.me ? TB.whoMine : TB.heroKey, q.name]); }
    if (W.ART && ART.want && heroes.length) ART.want(heroes.map((h) => h[0]));
    const heroH = heroes.length ? '<div class="verdict-cards">' + heroes.map((h) => '<figure>' + ART.card(h[0], { size: 'md', face: 1, cls: h[1] }) + '<figcaption>' + fmt(h[2] || '', { n: NM(h[3]) }) + '</figcaption></figure>').join('') + '</div>' : '';
    bd.innerHTML = '<div class="verdict" data-team="' + vk[1] + '"><p class="verdict-line">' + esc(T.verdict[vk[0]]) + '</p>' + heroH +
      (vote.length || !R.why.some((w) => w[0] === 'no_death') ? '<p class="verdict-why">' + (vote.length ? fmt(TB.execLine, { names: names(vote) }) : TB.noBlood) + '</p>' : '') +
      execCards.map((l) => '<p class="verdict-why">' + l + '</p>').join('') +
      whyL.map((l) => '<p class="verdict-why">' + l + '</p>').join('') +
      hunts.map((d) => '<p class="verdict-why">' + fmt(TB.hunterLine, { a: NM(R.players[d.h].name), b: NM(R.players[d.s].name) }) + '</p>').join('') +
      (me ? '<p class="verdict-self"><b class="verdict-you">나</b> <span class="vs-t">' + esc(selfLine()) + '</span></p>' : '') + '</div>' +
      (R.night ? '<button class="btn-sub rp-again" data-act="replay" type="button" hidden>' + esc(TBT.replay) + '</button>' : '') +
      (R.night ? '<details class="tl-sec" open hidden><summary class="tl-head">' + esc(TH.happened) + '</summary><ol class="tl-list"></ol></details>' : '') +
      '<details class="rec-sec" open><summary class="rec-head">' + esc(TH.records) + '</summary><ul class="rec-list">' + rows.map((x) => row(x[0], x[1])).join('') +
      [0, 1, 2].map((i) => row({ original: R.center.original[i], final: R.center.final[i] }, n + i, T.altar[i])).join('') + '</ul></details>';
    ART.mark(bd); bd._d = 1;
    if (mob && !body.dataset.replay) $('#stage').classList.add('is-fold');
    enhanceBoard();
  }
  function enhanceBoard() {
    if (replayState !== 2 || !R || !R.night) return;
    try { $('.rp-again').hidden = false; REPLAY.enhanceBoard($('.board'), R, S.me); $('.tl-sec').hidden = false; } catch (e) { console.error(e); }
  }
  function startResult(first) {
    ART.want(R.players.filter((p) => p.dead).map((p) => p.final));
    const st = $('#stage'); st.classList.remove('is-fold');
    const seen = LS.get('result:' + R.gameId), auto = R.night && !seen && !first, me = R.players.find((p) => p.id === S.me);
    scNow = 'result'; scO = { win: me ? !!me.win : null, dead: R.players.filter((p) => p.dead).length, replay: !!auto }; snd('scene', 'result', scO);
    $('.board')._d = 0;
    if (!auto) { drawBoard(); $('.board').hidden = false; if (R.night) LS.set('result:' + R.gameId, '1'); if (ui.ids.length) placeSeats(); return; }
    idle(() => { if (S && S.phase === 'result') ensureBoard(); }, 1500);   // 자동 재생 중에는 보드를 바로 그리지 않는다 (메인 스레드 정지 방지)
    if (replayState === 2) return playReplay(true);
    ui.wait = 1; $('.board').hidden = true; fx('lidsClose', 200); loadReplay();   // 늦으면 암전으로 최대 2초
    later(2000, timeUp);
  }
  function timeUp() {
    if (!ui.wait) return;
    ui.wait = 0; if (R) LS.set('result:' + R.gameId, '1');
    ensureBoard(); $('.board').hidden = false; fx('lidsOpen', 400); sched();
  }
  function onReplay() {
    sched();
    if (!S || S.phase !== 'result' || !R) return;
    if (ui.wait) { ui.wait = 0; playReplay(true); } else enhanceBoard();
  }
  function playReplay(auto, start) {
    if (!R || !R.night || !W.REPLAY) return;
    ui.wait = 0; LS.set('result:' + R.gameId, '1');
    $('#stage').classList.remove('is-fold');
    body.dataset.replay = '1'; sched(); $('.board').hidden = true; $('.band').hidden = true;
    $('#stage').style.height = '';
    $$('.seat').forEach((e) => { e.classList.remove('is-dead'); const m = $('.seat-mark', e); if (m.dataset.k === 'votes') { delete m.dataset.k; m.textContent = ''; } });
    $('.ln').classList.remove('is-on');
    if (ui.ids.length) placeSeats();   // 자막 띠를 비운 채 좌석을 다시 놓은 뒤 리플레이가 토큰 위치를 읽는다
    try {
      REPLAY.open(R, S.me, { autoplay: auto, start: start || 0, mount: { main: $('#main'), dock: $('#dock'), hud: $('#hud') }, onDone: endReplay });
      fx('lidsOpen', 400);
    } catch (e) { console.error(e); endReplay(); }
  }
  function endReplay() {
    rclose();
    body.removeAttribute('data-replay');
    relayout();
    if (S && S.phase === 'result') { ensureBoard(); $('.board').hidden = false; if (mq('(max-width:599px)')) $('#stage').classList.add('is-fold'); enhanceBoard(); if (ui.ids.length) placeSeats(); }
    fx('lidsOpen', 200); sched();
  }
  D.addEventListener('rp-jump', (e) => playReplay(false, e.detail && e.detail.beat));

  // ---------- 누르기: 길게 누르기 · 엿보기 ----------
  function pressEnd() {
    const p = press; if (!p) return; press = null; clearTimeout(p.t);
    if (p.kind === 'hold') { p.el.classList.remove('is-holding'); toast($('#hold-hint').textContent); p.el.classList.remove('is-nudge'); void p.el.offsetWidth; p.el.classList.add('is-nudge'); } else if (p.end) p.end();
    try { p.el.releasePointerCapture(p.id); } catch (e) { /* 무시 */ }
  }
  function holdStart(el, id) {
    if (el.getAttribute('aria-disabled') === 'true' || !online()) return;
    el.classList.add('is-holding');
    press = { kind: 'hold', el, id, t: setTimeout(() => {
      press = null; el.classList.remove('is-holding'); el.classList.add('is-full');
      fx('buzz', 12); runAct(el); setTimeout(() => el.classList.remove('is-full'), 300);
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
      const i = peekInfo(); if (!i || S.phase === 'vote' || S.phase === 'lobby') return;
      showPeek(i); LS.set('hb.peeked', '1'); const h = $('.dock-hint', el); if (h) h.remove();
      press = { kind: 'peek', el, id, end: hidePeek };
    } else if (k === 'check') {
      const c = $('.card', el); if (!c) return;
      if (!ui.pressed) fx('flash', ROLES[S.myCard].team === 'wolf' ? 'blood' : 'paper', 120);
      ui.pressed = 1; ART.flip(c, 1); const b = $('.check-t2'); if (b) b.classList.remove('is-blink');
      sr(ROLES[S.myCard].name + '.');
      const ro = ROLES[S.myCard], t1 = $('.check-t1'), tm = $('.check-team'), ds = $('.check-desc'), t0 = t1.textContent;   // 잡고 있는 동안만 역할 · 팀 · 능력을 보인다
      t1.textContent = fmt(TB.yourCardIs, { r: ro.name });
      tm.textContent = TEAM_NAME[ro.team]; tm.dataset.team = ro.team; ds.textContent = ro.desc; tm.hidden = ds.hidden = false;
      press = { kind: 'peek', el, id, end: () => { ART.flip(c, 0); sr(''); t1.textContent = t0; tm.hidden = ds.hidden = true; } };
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
    if (D.hidden) pressEnd(); else { if (!sock.connected) sock.connect(); else stale(); if (wlWant) wake(true); vp(); if (chatShown() && ui.stick) toEnd(); sched(); }
  });
  W.addEventListener('online', () => { if (!sock.connected) sock.connect(); else stale(); });

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
    law() { closeModal(); openLaw(); },
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
        try { const C = W.AudioContext || W.webkitAudioContext; if (!W.SND.ctx && C) W.SND.ctx = new C(); W.SND.ctx.resume(); } catch (e) { /* 무시 */ }
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
    ready() {
      if (!guard()) return;
      const me = S.players.find((p) => p.id === S.me);
      if (me) { me.ready = !me.ready; sched(); sock.emit('ready', { ready: !!me.ready }); }
    },
    again() { if (guard()) sock.emit('playAgain'); },
    replay() { playReplay(false); },
    cover() { coverAll(); },
    seat(d) {
      if (ui.lpDone) { ui.lpDone = 0; return; }
      const id = d.pid, m = modeOf();
      if (!S || id === S.me) return;
      if (S.phase === 'vote') { ui.vsel = ui.vsel === id ? null : id; return sched(); }
      if (m !== 'awake' || ui.busy) return;
      const t = S.prompt.type;
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
      const t = S.prompt.type, d = {};
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
    const reg = () => navigator.serviceWorker.register('/sw.js').then((r) => { swReg = r; applyUpdate(); }).catch(() => {});
    if (D.readyState === 'complete') idle(reg, 3000); else W.addEventListener('load', () => idle(reg, 3000));
  }

    body.dataset.chat = chatOff ? 'off' : '';
    vp(); ['resize', 'orientationchange'].forEach((n) => W.addEventListener(n, vp)); if (W.visualViewport) visualViewport.addEventListener('resize', vp);
    homeInit(); setBoot(true); homeSync(); loadAssets(); initSW(); render();
    if (W.ART && ART.warm) ART.warm(['home']);
})();
