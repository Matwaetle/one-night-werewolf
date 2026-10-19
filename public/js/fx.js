/* fx.js — 연출 레이어 (DESIGN_SPEC §7.3, §8). 전역 FX 하나. transform/opacity만 움직인다.
   game.css와 함께 지연 로드된다. 로드 전 호출은 window.FX.q 큐에 쌓였다가 여기서 재생된다:
     window.FX = {q:[]}  또는  Proxy가 q.push([이름, [인자…]])  (또는 {n:이름, a:[인자…]}) */
(function () {
  'use strict';
  var d = document, de = d.documentElement, played = {}, live = [], timers = [];
  var rm = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var canAnim = typeof Element !== 'undefined' && !!Element.prototype.animate;

  var TT = { tap: 60, ui: 180, enter: 360, flip: 520, lid: 500, phase: 1100, gap: 90, deal: 360, stamp: 140, line: 250, trem: 120 };
  var E = { press: 'cubic-bezier(.7,0,.3,1)', out: 'cubic-bezier(.2,.7,.1,1)', ink: 'steps(5,end)', cut: 'steps(6,end)' };
  var dealEnd = null;
  function $(s) { return d.querySelector(s); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function rect(e) { var r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }
  function lite() { return de.getAttribute('data-perf') === 'lite'; }
  function calm() { return rm.matches; }            // 흔들림·섬광·맥동 끔, 페이드만
  function isNight() { return d.body && d.body.dataset.phase === 'night'; }
  function later(fn, ms) { var t = setTimeout(function () { var i = timers.indexOf(t); if (i > -1) timers.splice(i, 1); fn(); }, ms); timers.push(t); return t; }
  function track(a, done) {                          // WAAPI 추적. skip()이 끝 상태로 보낸다
    live.push(a);
    var fin = function () { var i = live.indexOf(a); if (i > -1) live.splice(i, 1); if (done) done(); };
    a.onfinish = fin; a.oncancel = fin;
    return a;
  }
  function run(el, kf, o, done) {                    // animate 없으면 끝 상태만 적용하고 done 호출
    if (!canAnim || !el || live.length >= 6) {          // 동시 6개 초과면 끝 상태만
      if (el && kf && o && (o.fill === 'forwards' || o.fill === 'both')) { var k = kf[kf.length - 1]; for (var p in k) if (p === 'transform' || p === 'opacity') el.style[p] = k[p]; }
      if (done) later(done, 0); return null;
    }
    el.style.willChange = 'transform,opacity';
    var a = track(el.animate(kf, o), function () { el.style.willChange = ''; if (done) done(); });
    return a;
  }
  function wait(ms) { return new Promise(function (r) { later(r, ms); }); }

  var FX = {
    speak: function (text, snd) {
      if (!('speechSynthesis' in window)) return;
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.95; u.onstart = function () { snd('duck', 'tts', -8); }; u.onend = u.onerror = function () { snd('duck', 'tts', 0); }; speechSynthesis.speak(u); } catch (e) { /* 무시 */ }
    },
    resFb: function (R) {   // 결말 모듈을 끝내 못 받았을 때: 승패와 각자의 최종 카드만 평문으로 보인다
      var T = window.T, esc = T.esc, W = window.WW, bd = $('.board');
      var t = (R.winners || []).map(function (x) { return W.TEAM_NAME[x]; }).join(', '), dead = R.players.filter(function (p) { return p.dead; }).map(function (p) { return p.name; }).join(', ');
      bd.innerHTML = '<p>' + esc(T.body.resFallback) + '</p><p>' + esc(t + ' / ' + dead) + '</p>' +
        R.players.map(function (p) { return '<p><b class="nm">' + esc(p.name) + '</b> ' + esc(W.ROLES[p.final].name) + '</p>'; }).join('') +
        '<button class="btn-sub" type="button" data-act="resRetry"><span class="lbl">' + esc(T.body.resRetry) + '</span></button>';
      bd.hidden = false;
    },
    kick: function (pid, nm, open) {
      var T = window.T, esc = T.esc;
      open('<p class="modal-title">' + T.fmt(T.body.kickAsk, { n: nm }) + '</p><button class="btn-main hold" type="button" data-act="kick" data-pid="' + esc(pid) +
        '" data-hold="1200"><span class="hold-fill"></span><span class="lbl">' + esc(T.btn.kick) + '</span></button>', 'kick', T.btn.kick);
    },
    copy: function (link, open, toast) {
      var T = window.T, TB = T.body, esc = T.esc;
      function fb() {
        open('<h2 class="modal-title">' + esc(TB.copyTitle) + '</h2><p>' + esc(TB.copyHint) + '</p><input class="in" readonly value="' + esc(link) + '" aria-label="' + esc(TB.copyTitle) + '">', 'copy', TB.copyTitle);
        var i = $('#modal input'); if (i) i.select();
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link).then(function () { toast(TB.copied); }, fb); else fb();
    },
    menu: function (c) {   // 메뉴 모달 HTML (app.js 에서 옮겨 옴)
      var T = window.T, TB = T.body, TBT = T.btn, esc = T.esc, h, seg = window.SND && window.SND.segHTML;
      function item(act, t) { return '<button class="menu-item" type="button" data-act="' + act + '">' + esc(t) + '</button>'; }
      function hold(act, t) { return '<button class="menu-item is-danger hold" type="button" data-act="' + act + '" data-hold="1200" style="position:relative;overflow:hidden"><span class="hold-fill"></span><span class="lbl" style="position:relative">' + esc(t) + '</span></button>'; }
      h = '<div class="menu">' + item('voice', c.v ? TBT.voiceOff : TBT.voiceOn) + item('chatTog', c.c ? TBT.chatOn : TBT.chatOff) + item('bgm', c.b ? TBT.bgmOff : TBT.bgmOn) + (c.b && seg ? seg() : '') + item('law', TBT.law) + item('deck', TBT.deck);
      if (c.p === 'lobby' && c.h) h += '<div class="seg" role="group" aria-label="' + esc(T.head.dayLen) + '">' + [180, 300, 420].map(function (v) {
        return '<button type="button" class="seg-btn" data-act="dayLen" data-v="' + v + '" aria-pressed="' + (c.d === v) + '">' + (v / 60) + TB.minutes + '</button>'; }).join('') + '</div>';
      if (c.p === 'day' && c.h) h += hold('judge', TBT.judgeNow);
      c.o(h + hold('leave', TBT.leave) + '</div>', 'menu-box', TB.ariaMenu);
    },
    probe: function (k) {   // 로비 · 첫 밤 4초 동안 긴 작업과 프레임을 재서 느린 기기는 lite 로 내린다
      var n = 0, l = 0, mx = 0, po, fr = [], t0 = performance.now(), key = 'p' + k;
      if (de.dataset[key] || de.dataset.perf === 'lite' && !de.dataset.pf) return; de.dataset[key] = 1;
      try { po = new PerformanceObserver(function (o) { o.getEntries().forEach(function (e) { n += e.duration; if (e.duration > mx) mx = e.duration; }); }); po.observe({ type: 'longtask' }); } catch (e) { /* 무시 */ }
      requestAnimationFrame(function lap(t) {
        if (d.hidden) l = 0; else { if (l) fr.push(t - l); l = t; }
        if (t - t0 < 4000) return requestAnimationFrame(lap);
        fr.sort(function (x, y) { return x - y; }); if (po) po.disconnect();
        if (n > 180 || mx > 150 || fr[fr.length * 0.9 | 0] > 34) { de.dataset.perf = 'lite'; if (!de.dataset.pf) { de.dataset.pf = 1; return; } try { localStorage.setItem('ww_perf', JSON.stringify({ v: 'lite', t: Date.now() })); } catch (e) { /* 무시 */ } }
      });
    },
    /* ---------- 눈꺼풀 ---------- */
    lidsClose: function (ms) { return lids(1, ms == null ? 500 : ms); },
    lidsOpen: function (ms) { return lids(0, ms == null ? 500 : ms); },

    /* ---------- 섬광: kind 'blood'|'paper', peak 기본 blood .18 / paper .08 ---------- */
    flash: function (kind, ms, peak) {
      var el = $('#fx .flash'); ms = ms || 120;
      if (!el || calm()) return Promise.resolve();
      kind = kind === 'paper' ? 'paper' : 'blood';
      if (kind === 'paper') el.setAttribute('data-c', 'paper'); else el.removeAttribute('data-c');
      var p = peak == null ? (kind === 'paper' ? 0.08 : 0.18) : peak;
      return new Promise(function (res) {
        if (!canAnim) { el.style.opacity = p; later(function () { el.style.opacity = ''; res(); }, ms); return; }
        run(el, [{ opacity: 0 }, { opacity: p, offset: 0.35 }, { opacity: 0 }], { duration: ms, easing: 'linear' }, res);
      });
    },

    /* ---------- 흔들림: #main 전용. px 진폭, n 횟수(회당 60ms). 낮은 사양·reduced면 없음 ---------- */
    shake: function (px, n) {
      var el = $('#main'); px = px == null ? 4 : px; n = n || 3;
      if (!el || lite() || calm() || !canAnim) return Promise.resolve();
      var kf = [{ transform: 'translateX(0)' }], i;
      for (i = 0; i < n; i++) { kf.push({ transform: 'translateX(' + (i % 2 ? -px : px) + 'px)' }); }
      kf.push({ transform: 'translateX(0)' });
      return new Promise(function (res) { run(el, kf, { duration: 60 * n, easing: 'linear' }, res); });
    },

    /* ---------- 심박: 0 끔, 1 72bpm, 2 144bpm. 비네트 ::after opacity (CSS가 애니메이션) ---------- */
    heartbeat: function (level) {
      var v = $('.vignette'); if (!v) return;
      if (level) v.setAttribute('data-hb', level); else v.removeAttribute('data-hb');
    },

    /* ---------- 밤 "누군가 움직인다": 행동 단계와 빈 단계에 동일하게 부른다 ---------- */
    rustle: function () {
      var v = $('.vignette'), ms = 400 + Math.random() * 2100;
      later(function () {
        FX.shake(1, 2);
        if (v) { v.classList.add('fx-dark'); later(function () { v.classList.remove('fx-dark'); }, 700); }
      }, ms);
    },

    /* ---------- 글자 지연 출력(내레이션 전용). 취소 함수를 돌려준다 ---------- */
    typeLine: function (el, text) {
      if (!el) return function () {};
      if (el._fxStop) el._fxStop();
      text = text == null ? '' : String(text);
      var step = lite() ? 25 : 40, stopped = false, raf, t0;
      if (calm() || d.hidden || !text) { el.textContent = text; return function () {}; }
      el.textContent = '';
      // 절(공백·문장부호 단위)별로 180ms 페이드. 단어가 반쯤 보이는 순간이 없고, DOM은 절이 바뀔 때만 건드린다
      var parts = text.match(/[^\s,.!?…·]+[\s,.!?…·]*|[\s,.!?…·]+/g) || [text], at = [], c = 0, k = 0, fr = d.createDocumentFragment();
      parts.forEach(function (p) {
        var s = d.createElement('span'); s.textContent = p; s.style.cssText = 'opacity:0;transition:opacity 180ms linear';
        at.push(c * step); c += p.length; fr.appendChild(s);
      });
      el.appendChild(fr);
      function tick(now) {
        if (stopped) return;
        if (t0 == null) t0 = now;
        while (k < parts.length && at[k] <= now - t0) el.children[k++].style.opacity = '1';
        if (k < parts.length) raf = requestAnimationFrame(tick); else el._fxStop = null;
      }
      raf = requestAnimationFrame(tick);
      el._fxStop = function () {
        stopped = true; cancelAnimationFrame(raf); el._fxStop = null;
        el.textContent = text;
      };
      return el._fxStop;
    },

    /* ---------- 1회 재생 보장 ---------- */
    play: function (key, fn) {
      if (played[key]) return Promise.resolve(false);
      played[key] = 1;
      return Promise.resolve().then(fn).then(function () { return true; }, function () { return false; });
    },
    played: function (key) { return !!played[key]; },
    forget: function (prefix) { for (var k in played) if (!prefix || k.indexOf(prefix) === 0) delete played[k]; },

    /* ---------- 누르고 보기: #fx .peek 에 xl 앞면. roleId null이면 뒷면 ---------- */
    peek: function (roleId, label) {
      var el = $('#fx .peek'); if (!el || typeof ART === 'undefined') return;
      var key = (roleId || '') + '|' + (label || '');
      if (el._k !== key) {
        el.innerHTML = ART.card(roleId || null, { size: 'xl', face: roleId ? 1 : 0, cls: 'fx-peekcard' }) +
          (label ? '<p class="peek-label">' + (typeof label === 'object' ? '<b class="peek-who">' + esc(label[0]) + '</b>' + (label[1] ? '<span>' + esc(label[1]) + '</span>' : '') : esc(label)) + '</p>' : '');
        el._k = key;
        if (ART.mark) ART.mark(el);
      }
      if (roleId && ART.want) ART.want([roleId]);
      el.classList.add('is-on');
      var fx = $('#fx'); if (fx) fx.classList.add('fx-peeking');
      var sr = $('#sr'), r = roleId && typeof ROLES !== 'undefined' && ROLES[roleId];
      if (sr && r) sr.textContent = r.name + '.';
    },
    unpeek: function () {
      var el = $('#fx .peek'), fx = $('#fx'), sr = $('#sr');
      if (el) el.classList.remove('is-on');
      if (fx) fx.classList.remove('fx-peeking');
      if (sr) sr.textContent = '';
    },

    /* ---------- 두 카드 교차 이동. 복제본이 #fx 위에서 움직이고 원본은 숨는다. Promise ---------- */
    swap: function (elA, elB) {
      if (!elA || !elB) return Promise.resolve();
      if (!lite() && !calm() && canAnim && !d.hidden && !elA._tr) { elA._tr = 1; return FX.tremble([elA, elB]).then(function () { return FX.swap(elA, elB); }).then(function () { elA._tr = 0; }); }   // 내 화면 두 카드만 떨고 난 뒤 교차
      var fx = $('#fx'), ra = elA.getBoundingClientRect(), rb = elB.getBoundingClientRect();
      if (!fx || !canAnim || lite() || calm()) {       // lite·reduced: 이동 없이 바뀐 두 카드만 opacity .3→1
        return Promise.all([elA, elB].map(function (e) {
          return new Promise(function (res) { run(e, [{ opacity: 0.3 }, { opacity: 1 }], { duration: 160 }, res); });
        }));
      }
      function ghost(src, from, to) {
        var c = src.cloneNode(true), sc = to.width / (from.width || 1);
        c.classList.add('fx-ghost'); c.removeAttribute('id');
        c.style.setProperty('--cw', from.width + 'px');
        c.style.left = from.left + 'px'; c.style.top = from.top + 'px';
        fx.appendChild(c); src.style.visibility = 'hidden';
        return { c: c, src: src, kf: [
          { transform: 'translate(0,0) scale(1)' },
          { transform: 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + sc + ')' }
        ] };
      }
      var g = [ghost(elA, ra, rb), ghost(elB, rb, ra)];
      return Promise.all(g.map(function (o) {
        return new Promise(function (res) {
          run(o.c, o.kf, { duration: 360, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }, function () {
            o.src.style.visibility = ''; if (o.c.parentNode) o.c.parentNode.removeChild(o.c); res();
          });
        });
      }));
    },

    /* ---------- 떨림: translateX(±2px) 회당 60ms. 규칙: 밤에 다른 사람 좌석에는 절대 부르지 않는다
       (잠든 사람 화면에서 좌석이 흔들리면 교환 위치가 드러난다). 밤의 정보 없는 흔들림은 rustle만 쓴다.
       내 화면의 두 카드(swap)와 결과 리플레이에서만 쓴다. ---------- */
    tremble: function (els, n) {
      els = [].concat(els || []).filter(Boolean); n = n || 2;
      if (!els.length || lite() || calm() || !canAnim || d.hidden) return Promise.resolve();
      var kf = [{ translate: '0 0' }], i;
      for (i = 0; i < n * 2; i++) kf.push({ translate: (i % 2 ? -2 : 2) + 'px 0' });
      kf.push({ translate: '0 0' });
      return Promise.all(els.map(function (e) {
        return new Promise(function (res) { run(e, kf, { duration: TT.trem * n, easing: 'linear' }, res); });
      }));
    },

    /* ---------- 도장: host 안에 <i class="fx-stamp">. 끝 상태(도장이 찍혀 있음)는 어느 등급에서나 남는다 ---------- */
    stamp: function (host, text, kind) {
      if (!host) return Promise.resolve();
      var old = host.querySelector('.fx-stamp'); if (old) old.remove();
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      var el = d.createElement('i'); el.className = 'fx-stamp'; el.setAttribute('data-k', kind === 'paper' ? 'paper' : 'blood'); el.textContent = text;
      host.appendChild(el);
      if (calm() || !canAnim || d.hidden) return Promise.resolve();
      var soft = lite();
      return new Promise(function (res) {
        run(el, soft ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1 }], { duration: soft ? 120 : TT.stamp, easing: soft ? 'linear' : E.cut }, res);
      });
    },

    /* ---------- 처형: card scaleX 1→0 → mid()로 앞면(처형 상태) 교체 → 0→1 → 도장 + 흔들림 + 섬광 + 진동.
       quiet이면 도장만(여러 명 처형 시 두 번째부터) ---------- */
    execute: function (card, slot, mid, quiet) {
      var fin = function () { if (mid) { try { mid(); } catch (e) {} } return slot ? FX.stamp(slot, (window.T && T.stamp && T.stamp.dead) || '', 'blood') : Promise.resolve(); };
      var hit = function () { if (quiet) return; FX.shake(6, 4); FX.flash('blood', 120); if (!calm()) FX.buzz(12); };
      if (!card || !canAnim || calm() || d.hidden) { var p = fin(); hit(); return p; }
      if (lite()) {
        return new Promise(function (res) { if (mid) { try { mid(); } catch (e) {} } run(card, [{ opacity: 0.3 }, { opacity: 1 }], { duration: 160 }, res); })
          .then(function () { var p = slot ? FX.stamp(slot, (window.T && T.stamp && T.stamp.dead) || '', 'blood') : 0; hit(); return p; });
      }
      return new Promise(function (res) { run(card, [{ scale: '1 1' }, { scale: '0 1' }], { duration: 130, easing: E.press, fill: 'forwards' }, res); })
        .then(function () {
          if (mid) { try { mid(); } catch (e) {} }
          return new Promise(function (res) { run(card, [{ scale: '0 1' }, { scale: '1 1' }], { duration: 130, easing: E.out }, res); });
        }).then(function () { var p = slot ? FX.stamp(slot, (window.T && T.stamp && T.stamp.dead) || '', 'blood') : 0; hit(); return p; });
    },

    /* ---------- 배분: 덱 팬을 접고, 뒷면 복제본을 좌석 토큰 옆 → 제단 3자리로 날린다. 복제본은 끝에 지운다 ---------- */
    deal: function (o) {
      var fan = $('.fan'), fl = $('#fx'), key = o && o.id != null ? 'deal:' + o.id : 0;
      if (key && played[key]) return Promise.resolve();
      if (key) played[key] = 1;
      if (!fan || d.hidden || !canAnim) return Promise.resolve();
      var soft = lite() || calm(), ms = lite() ? 180 : calm() ? 160 : 240;
      if (soft || !fl) { fan.classList.add('fx-fold'); return wait(ms); }   // 모든 rect 를 읽은 뒤에 접는다
      var seats = [].slice.call(d.querySelectorAll('#stage .seat')), N = seats.length, me = Math.max(0, seats.findIndex(function (e) { return e.classList.contains('is-me'); })), tg = [], i;
      for (i = 1; i <= N; i++) { var st = seats[(me + i) % N], tk = st.querySelector('.seat-token'), c = st.querySelector(':scope>.card'), r = tk.getBoundingClientRect(), side = st.dataset.side || (r.left + r.width / 2 < d.documentElement.clientWidth / 2 ? 'l' : 'r'), w = c ? c.getBoundingClientRect().width : (innerWidth < 600 ? 26 : 40); tg.push({ x: r.left + r.width / 2 + (side === 'r' ? -1 : 1) * (r.width / 2 + 6 + w / 2), y: r.top + r.height / 2, w: w }); }
      [].slice.call(d.querySelectorAll('.altar .card')).forEach(function (c) { tg.push(rect(c)); });
      var f0 = rect(fan), ghosts = [], t0 = TT.deal - 120;
      fan.classList.add('fx-fold');
      var tpl = d.createElement('div'); tpl.innerHTML = typeof ART !== 'undefined' ? ART.card(null, { size: 'xs', face: 0, cls: 'fx-ghost' }) : ''; tpl = tpl.firstChild; if (tpl) tpl.insertAdjacentHTML('beforeend', '<i class="fx-ink"></i>');
      dealEnd = function () { ghosts.forEach(function (g) { if (g.parentNode) g.parentNode.removeChild(g); }); ghosts = []; dealEnd = null; };
      var flights = tg.map(function (t, k) {
        return new Promise(function (res) {
          later(function () {
            var g = tpl && tpl.cloneNode(true); if (!g) return res();
            g.style.setProperty('--cw', t.w + 'px'); g.style.left = (f0.x - t.w / 2) + 'px'; g.style.top = (f0.y - t.w * .7) + 'px';
            fl.appendChild(g); ghosts.push(g);
            var rot = (k % 2 ? 4 : -4);
            var kf = [{ transform: 'translate(0,0) rotate(' + rot + 'deg)' }, { transform: 'translate(' + (t.x - f0.x) + 'px,' + (t.y - f0.y) + 'px) rotate(0deg)' }],
              ink = function (ok) { if (ok) run(g.lastChild, [{ opacity: 0.5 }, { opacity: 0 }], { duration: 60 }, res); else res(); };
            if (canAnim) track(g.animate(kf, { duration: TT.deal, easing: E.press, fill: 'forwards' }), function () { ink(1); });   // 전역 6개 상한을 우회
            else { g.style.transform = kf[1].transform; ink(0); }
          }, ms + k * TT.gap);
        });
      });
      return Promise.all(flights).then(function () { if (dealEnd) dealEnd(); });
    },

    /* ---------- 진동: 밤엔 무시. navigator.vibrate는 여기서만 부른다 ---------- */
    buzz: function (pattern) {
      if (isNight()) return;
      try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
    },

    /* ---------- 진행 중 시퀀스 즉시 종료 ---------- */
    skip: function () {
      timers.splice(0).forEach(clearTimeout);
      live.slice().forEach(function (a) { try { a.finish(); } catch (e) { try { a.cancel(); } catch (e2) {} } });
      live.length = 0;
      FX.unpeek(); if (dealEnd) dealEnd();
      var l = d.querySelectorAll('#fx .lid'), i;
      for (i = 0; i < l.length; i++) l[i].style.transition = '';
    },

    wait: wait
  };

  /* 눈꺼풀: 전체 화면 오버레이 한 장(CSS 마스크 가장자리). opacity만 바꾼다. 끝나면 열림은 opacity 0 으로 남는다 */
  function lids(closed, ms) {
    var ls = d.querySelectorAll('#fx .lid');
    if (!ls.length) return Promise.resolve();
    var t = calm() || lite() || !canAnim ? 160 : ms;
    return new Promise(function (res) {
      var i, e;
      for (i = 0; i < ls.length; i++) {
        e = ls[i];
        e.style.willChange = 'opacity';
        e.style.transition = 'opacity ' + t + 'ms ' + (closed ? 'cubic-bezier(.7,0,.3,1)' : 'cubic-bezier(.2,.7,.1,1)');
        e.style.opacity = closed ? 1 : 0;
      }
      later(function () {
        for (i = 0; i < ls.length; i++) { ls[i].style.willChange = ''; ls[i].style.transition = ''; }
        res();
      }, t);
    });
  }

  // 로드 전 큐 재생
  var old = window.FX, q = old && (old.q || old._q);
  window.FX = FX;
  if (q && q.length) {
    q.splice(0).forEach(function (c) {
      var n = c.n || c[0], a = c.a || c[1] || [];
      if (typeof FX[n] === 'function') { try { FX[n].apply(FX, a); } catch (e) {} }
    });
  }
  // 탭이 가려지면 진행 중 애니메이션을 멈춘다(body.paused와 짝)
  d.addEventListener('visibilitychange', function () {
    live.forEach(function (a) { try { d.hidden ? a.pause() : a.play(); } catch (e) {} });
    if (d.body) d.body.classList.toggle('paused', d.hidden);
  });
})();
