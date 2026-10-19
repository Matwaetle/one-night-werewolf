/* 한밤의 늑대인간 — 결말 · 규칙 (지연 로드 모듈). app.js 가 한가할 때 불러 두고 init(X) 로 연결한다.
   결말 보드 · 리플레이 진입/종료 · 규칙 모달이 여기 있다. app.js 에는 얇은 입구만 남는다. X = app.js 가 내주는 도구 상자 (S · R · rs 는 읽을 때마다 최신 값). */
(function () {
  'use strict';
  const W = window, D = document, { ROLES, ROLE_ORDER, TEAM_NAME } = W.WW, T = W.T, TB = T.body, TH = T.head, TBT = T.btn, fmt = T.fmt, esc = T.esc, ART = W.ART, body = D.body;
  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => Array.from((r || D).querySelectorAll(s)), mq = (q) => !!(W.matchMedia && W.matchMedia(q).matches);
  const nmh = (n) => '<b class="nm">' + esc(n) + '</b>', NM = (n) => ({ t: n, h: nmh(n) }), names = (a) => ({ t: a.join(', '), h: a.map(nmh).join(', ') });
  let X;
  const pname = (id) => { const p = (X.S && X.S.players.find((x) => x.id === id)) || (X.R && X.R.players.find((x) => x.id === id)); return p ? p.name : '?'; };
  const yieldTask = (fn) => { if (W.scheduler && scheduler.yield) scheduler.yield().then(fn); else setTimeout(fn, 0); };   // 긴 작업을 쪼개 프레임 사이에 그림이 나가게 한다
  const enh = () => X.idle(enhance, 500);
  function ensure() { const { S, R } = X; if (S && S.phase === 'result' && R && !$('.board')._d) { RESULT.draw(); X.sched(); } }
  function enhance() {
    const { S, R } = X;
    if (X.rs !== 2 || !R || !R.night || !$('.board')._d || $('.board .rec-path')) return;
    try { $('.rp-again').hidden = false; REPLAY.enhanceBoard($('.board'), R, S.me); $('.tl-sec').hidden = false; } catch (e) { console.error(e); }
  }
  function timeUp() {
    const { R, LS, ui, fx, sched } = X;
    if (!ui.wait) return;
    ui.wait = 0; if (R) LS.set('result:' + R.gameId, '1');
    X.rclose(); ensure(); $('.board').hidden = false; fx('lidsOpen', 400); sched();
  }
  function end() {
    const { S, ui, fx, sched, geo, relayout } = X;
    ui.rpk = (ui.rpk || 0) + 1;
    X.rclose(); body.removeAttribute('data-replay');
    if (S && S.phase === 'result') { ensure(); $('.board').hidden = false; if (mq('(max-width:599px)')) $('#stage').classList.add('is-fold'); }   // 닫기와 보드 공개는 한 프레임에
    fx('lidsOpen', 200); sched();
    requestAnimationFrame(() => setTimeout(() => { geo.h = 0; relayout(); X.idle(enhance, 300); }, 0));   // 좌석 다시 놓기는 다음 작업으로, 기록 보강은 한가할 때로 미룬다 (한 작업에 몰면 멈춘다)
  }
  function play(auto, start) {   // 세 작업으로 나눈다: 눈꺼풀 -> 좌석 자리 -> 리플레이 열기 (한 작업에 몰면 1초 넘게 멈춘다)
    const { R, LS, ui, fx, sched, geo, placeSeats } = X;
    if (!R || !R.night || !W.REPLAY) return;
    ui.wait = 0; LS.set('result:' + R.gameId, '1');
    const k = ui.rpk = (ui.rpk || 0) + 1, ok = () => k === ui.rpk && X.S && X.S.phase === 'result' && X.R;
    fx('lidsClose', 200);
    yieldTask(() => {
      if (!ok()) return;
      const st = $('#stage'); st.classList.remove('is-fold'); st.style.height = ''; geo.h = 0;
      body.dataset.replay = '1'; sched(); $('.board').hidden = true; $('.band').hidden = true;
      $$('.msg[data-kind=end]').forEach((e) => { e.hidden = true; });   // 결말 줄은 리플레이가 끝날 때까지 채팅에서도 가린다
      $$('.seat').forEach((e) => { e.classList.remove('is-dead', 'is-target'); const m = $('.seat-mark', e); if (m.dataset.k === 'votes') { delete m.dataset.k; m.textContent = ''; } });
      $('.ln').classList.remove('is-on');
      if (ui.ids.length) placeSeats();   // 자막 띠를 비운 채 좌석을 한 번만 다시 놓은 뒤 리플레이가 토큰 위치를 읽는다
      yieldTask(() => {
        if (!ok()) return;
        try {
          REPLAY.open(X.R, X.S.me, { autoplay: auto, start: start || 0, mount: { main: $('#main'), dock: $('#dock'), hud: $('#hud') }, onDone: end });
          fx('lidsOpen', 400);
        } catch (e) { console.error(e); end(); }
      });
    });
  }
  function start(first) {
    const { S, R, LS, ui, fx, snd, later } = X;
    const wn = R.winners, tm = ['village', 'wolf', 'tanner'].find((x) => wn.indexOf(x) >= 0), c = R.center, rl = [];   // 결말 뒷배경과, 리플레이가 보여 줄 역할 그림만 받는다 (덱 전체가 아니다)
    if (tm) ART.warm(['verdict-' + tm]);
    R.players.forEach((p) => rl.push(p.final, p.original));
    if (D.documentElement.dataset.net !== 'slow') ART.want(Array.from(new Set(rl.concat(c.final, c.original, R.doppelCopy || []))).filter((x) => x && !ART.has(x)), { low: 1 });
    $('#stage').classList.remove('is-fold');
    const seen = LS.get('result:' + R.gameId), auto = R.night && !seen && !first, me = R.players.find((p) => p.id === S.me);
    X.scene('result', { win: me ? !!me.win : null, dead: R.players.filter((p) => p.dead).length, replay: !!auto }); snd('scene', 'result', X.scO());
    $('.board')._d = 0;
    if (!auto) { if (S.phase !== 'result') return; X.rclose(); RESULT.draw(); $('.board').hidden = false; if (R.night) LS.set('result:' + R.gameId, '1'); if (ui.ids.length) X.placeSeats(); return; }
    ui.rpr = 1;   // 자동 재생: 첫 장면이 그려진 뒤(rp-ready)에 보드를 따로 그린다 (같은 작업에서 만들지 않는다)
    if (X.rs === 2) return play(true);
    ui.wait = 1; $('.board').hidden = true; fx('lidsClose', 200); X.loadReplay();   // 늦으면 암전으로 최대 2초
    later(2000, timeUp);
  }
  function law() {
    const end = '<ul>' + TB.lawEnd.map((x) => '<li><b>' + esc(x.h) + '</b> ' + esc(x.t) + '</li>').join('') + '</ul>';
    X.openModal('<h2 class="modal-title">' + esc(TH.law) + '</h2><div class="law-grid"><ol class="law-list">' +
      TB.law.map((x, i) => '<li class="law-row"><b>' + esc(x.h) + '</b>' + esc(x.t) + (i === TB.law.length - 1 ? end : '') + '</li>').join('') +
      '</ol><div><h3 class="law-sub">' + esc(TH.lawOrder) + '</h3><div class="law-roles">' +
      ROLE_ORDER.map((r) => '<div class="law-role">' + ART.card(r, { size: 'sm', face: 1 }) + '<div><b>' + esc(ROLES[r].name) + '</b><span>' + esc(ROLES[r].desc) + '</span></div></div>').join('') + '</div></div></div>', 'law', TH.law);
  }
  function deck() {
    const { S, ui, sum, isHost, patch } = X;
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
  const RESULT = W.RESULT = {
    init(x) {
      if (X) return; X = x;
      D.addEventListener('rp-jump', (e) => play(false, e.detail && e.detail.beat));
      D.addEventListener('rp-ready', () => { if (X.ui.rpr) { X.ui.rpr = 0; X.idle(() => { if (X.S && X.S.phase === 'result') ensure(); }, 1500); } }, true);
    },
    start, play, timeUp, law, deck,
    conn(k) {   // 연결 띠: 재접속 초 세기 · 다른 창(1) · 새 버전(2)
      const { ui } = X, c = $('#conn'), b = (a, l) => ' <button class="btn-sub" type="button" data-act="' + a + '"><span class="lbl">' + esc(l) + '</span></button>';
      clearTimeout(ui.connT); delete c.dataset.state;
      if (k) { c.innerHTML = esc(k < 2 ? TB.otherTab : TB.newVersion) + (k < 2 ? b('here', TBT.continueHere) : b('reload', TBT.reload)); c.hidden = false; return; }
      if (!ui.off) return;
      const n = Math.max(1, Math.floor((Date.now() - ui.off) / 1000)), j = n >= 120 ? 2 : n >= 20 ? 1 : 0;   // 20초 · 2분이 지나면 새로고침 · 처음으로 버튼을 한 번만 덧붙인다
      c.hidden = false;
      if (c._k !== j || !$('.conn-t', c)) { c._k = j; c.innerHTML = '<span class="conn-t"></span>' + (j ? ' ' + esc(TB.reconnectSlow) + b('reload', TBT.reload) : '') + (j > 1 ? b('goHome', TB.goHome) : ''); }
      $('.conn-t', c).textContent = fmt(TB.reconnecting, { n });
      ui.connT = setTimeout(RESULT.conn, 1000);
    },
  log() {   // 기록 탭 (낮 · 투표 · 결말)
    const p = $('.pane[data-p=log]'), items = X.S.myLog || [];
    X.patch(p, items.length ? '<ul class="log-list" style="list-style:none;margin:0;padding:0">' + items.map((it) => '<li class="log-item"><div class="secret" data-peek="log"><div class="secret-in">' +
      (it.reveal || []).map((r) => '<span class="log-c">' + ART.card(r.role, { size: 'xs', face: 1 }) + '</span>').join('') + '<span class="log-t">' + esc(it.text) + '</span></div><span class="secret-lbl">' + esc(TB.blurHint) + '</span></div></li>').join('') + '</ul>'
      : '<p class="log-none">' + esc(TB.seenNothing) + '</p>');
    },
    rep() {   // 리플레이 모듈이 도착했다
      X.sched();
      if (!X.S || X.S.phase !== 'result' || !X.R) return;
      if (X.ui.wait) { X.ui.wait = 0; play(true); } else enh();
    },
    draw() {
      if (!X.R) return;
      const { S, R } = X;
      const RP = T.replay, SF = RP.self;
      const me = R.players.some((p) => p.id === S.me), mi = R.players.findIndex((p) => p.id === S.me);

      function belief(s) {   // 믿은 패 (SPEC 13.8): r 기준
        const N = R.night; if (!N) return null;
        const ce = N.ev.find((e) => e.k === 'copy'), cp = ce ? N.deal[ce.see[0][0]] : null;
        const eff = (x) => (N.deal[x] === 'doppelganger' && cp ? cp : N.deal[x]);
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
        const p = R.players[mi], f = ROLES[p.effective].name;
        let b = null; try { b = belief(mi); } catch (e) { /* 무시 */ }
        b = b || p.original;
        const o = [b === 'blind' ? fmt(SF.blind, { f }) : b === p.effective ? fmt(SF.same, { f }) : fmt(SF.diff, { b: ROLES[b].name, f })];
        if (SF.end && p.effective !== p.original) o.push(fmt(SF.end, { f, o: ROLES[p.original].name }));
        if (p.final === 'doppelganger' && R.doppelCopy) o.push(fmt(SF.doppel, { r: ROLES[R.doppelCopy].name }));
        return o.join(' ');
      }
      function verdictKey() {
        const w = R.winners;
        if (w.indexOf('village') >= 0) return [R.wolvesInPlay ? 'village' : 'villageNoWolf', 'village'];
        if (w.indexOf('wolf') >= 0) return [R.wolvesInPlay ? 'wolf' : 'minion', 'wolf'];
        return w.indexOf('tanner') >= 0 ? ['tanner', 'tanner'] : ['none', 'none'];
      }

      const bd = $('.board'), vk = verdictKey();
      const mp = me ? R.players[mi] : null, fr = mp && (mp.final === 'doppelganger' && R.doppelCopy ? R.doppelCopy : mp.final), moved = mp && ROLES[mp.original].team !== ROLES[fr].team;
      if (ART.warm && vk[1] !== 'none') ART.warm(['verdict-' + vk[1]]);
      const vdeaths = R.deaths.filter((d) => d.by === 'vote'), vote = vdeaths.map((d) => R.players[d.s].name);
      const execSet = {}, execCards = vdeaths.map((d) => { const q = R.players[d.s]; execSet[d.s] = 1; return fmt(TB.execCard, { n: NM(q.name), r: ROLES[q.final === 'doppelganger' && R.doppelCopy ? R.doppelCopy : q.effective].name }); });
      const used = {}, whyL = [];
      execCards.forEach((l) => { used[l] = 1; });
      R.why.forEach((w) => {
        const ix = w[1] || [];
        if (w[0] === 'wolf_died' && ix.some((i) => execSet[i])) return;
        const you = ix.indexOf(mi) >= 0 && RP.why[w[0] + '_you'];   // 내가 목록에 있으면 2인칭 문장, 없으면 이름 대신 '당신'
        const v = { t: ix.map((i) => (i === mi ? RP.you : R.players[i].name)).join(', '), h: ix.map((i) => (i === mi ? esc(RP.you) : nmh(R.players[i].name))).join(', ') };
        const l = fmt(you || RP.why[w[0]] || '', { list: v, t: v, a: v });
        if (!l || used[l]) return; used[l] = 1; whyL.push(l);
      });
      const hunts = R.deaths.filter((d) => d.by === 'hunter');
      const chip = (id, cp) => { const r = ROLES[id]; return '<svg aria-hidden="true"><use href="#' + r.sigil + '"/></svg>' + esc(id === 'doppelganger' && cp ? fmt(TB.doppelArrow, { r: ROLES[cp].name }) : r.name); };
      const row = (p, i, alt, full) => '<li' + (full ? ' title="' + esc(full) + '" aria-label="' + esc(full) + '"' : '') + ' class="rec-row' + (p.id === S.me ? ' is-me' : '') + (p.dead ? ' is-dead' : '') + (p.win ? ' is-win' : '') + (alt ? ' is-altar' : '') + (!alt && !S.players.some((x) => x.id === p.id) ? ' is-gone' : '') + '" data-slot="' + i + '">' +
        '<div class="rec-top"><b class="rec-n nm">' + esc(alt || p.name) + (p.dead && !alt ? '<i class="rec-x">' + esc(T.stamp.exec || T.stamp.dead) + '</i>' : '') + '</b>' +
        (alt ? '' : '<span class="rec-stamp' + (p.win ? ' is-win' : '') + '">' + esc(p.win ? T.stamp.win : T.stamp.lose) + '</span>') +
        '<span class="rec-chg">' + (p.original === p.final ? '' : '<span class="rec-from">' + chip(p.original) + '</span><span class="rec-arrow">→</span>') + '<span class="rec-to">' + chip(p.final, R.doppelCopy) + '</span></span>' +
        (alt ? '' : '<span class="rec-meta"><span class="rec-vote">' + (p.vote ? '→ ' + nmh(pname(p.vote)) : '—') + '</span>' + (p.votes > 0 ? ' · <span class="rec-got">' + p.votes + '표</span>' : '') + '</span>' +
          (hunts.some((d) => d.s === i) ? '<svg class="rec-hunt" aria-hidden="true"><use href="#sg-hunter"/></svg>' : '')) + '</div></li>';
      const rank = (p) => (p.id === S.me ? 0 : p.dead ? 1 : 2);
      const rows = R.players.map((p, i) => [p, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]);
      const n = R.players.length, mob = mq('(max-width:599px)');
      const effOf = (q) => (q.final === 'doppelganger' && R.doppelCopy ? R.doppelCopy : q.effective), heroes = [];
      vdeaths.forEach((d) => { const q = R.players[d.s]; if (heroes.length < 2) heroes.push([effOf(q), 'is-dead', q.id === S.me ? TB.heroDeadMe : TB.heroDead, q.name]); });
      const keyW = R.why.find((w) => /^(wolf_lived|tanner_blocked|minion_|tanner_too)/.test(w[0]) && (w[1] || []).some((i) => !execSet[i]));
      if (keyW && heroes.length < 2) { const i = keyW[1].find((x) => !execSet[x]), q = R.players[i]; heroes.push([effOf(q), '', q.id === S.me ? TB.whoMine : TB.heroKey, q.name]); }
      if (ART.want && heroes.length) ART.want(heroes.map((h) => h[0]));
      const heroH = heroes.length ? '<div class="verdict-cards">' + heroes.map((h) => '<figure>' + ART.card(h[0], { size: 'md', face: 1, cls: h[1] }) + '<figcaption>' + fmt(h[2] || '', { n: NM(h[3]) }) + '</figcaption></figure>').join('') + '</div>' : '';
      bd.innerHTML = '<div class="verdict" data-team="' + vk[1] + '"><p class="verdict-line">' + esc(T.verdict[vk[0]]) + '</p>' +
        (mp ? '<p class="verdict-me"><span class="rec-stamp' + (mp.win ? ' is-win' : '') + '">' + esc(mp.win ? TB.youWin : TB.youLose) + '</span>' + (moved ? esc(fmt(TB.teamMoved, { from: ROLES[mp.original].name, team: TEAM_NAME[ROLES[fr].team] })) : '') + '</p>' : '') + heroH +
        (vote.length || !R.why.some((w) => w[0] === 'no_death') ? '<p class="verdict-why">' + (vote.length ? fmt(TB.execLine, { names: names(vote) }) : TB.noBlood) + '</p>' : '') +
        execCards.map((l) => '<p class="verdict-why">' + l + '</p>').join('') +
        whyL.map((l) => '<p class="verdict-why">' + l + '</p>').join('') +
        hunts.map((d) => '<p class="verdict-why">' + fmt(TB.hunterLine, { a: NM(R.players[d.h].name), b: NM(R.players[d.s].name) }) + '</p>').join('') +
        (me ? '<p class="verdict-self"><span class="vs-k">' + esc(TB.youHappened) + '</span><span class="vs-t">' + esc(selfLine()) + '</span></p>' : '') + '</div>' +
        (R.night ? '<button class="btn-sub rp-again" data-act="replay" type="button" hidden>' + esc(TBT.replay) + '</button>' : '') +
        (R.night ? '<details class="tl-sec" open hidden><summary class="tl-head">' + esc(TH.happened) + '</summary><ol class="tl-list"></ol></details>' : '') +
        '<details class="rec-sec" open><summary class="rec-head">' + esc(TH.records) + '</summary><ul class="rec-list">' + rows.map((x) => row(x[0], x[1])).join('') +
        [0, 1, 2].map((i) => row({ original: R.center.original[i], final: R.center.final[i] }, n + i, RP.ui.altarShort[i], T.altar[i])).join('') + '</ul></details>';
      ART.mark(bd); bd._d = 1;
      if (mob && !body.dataset.replay) $('#stage').classList.add('is-fold');
      enh();
    },
  };
})();
