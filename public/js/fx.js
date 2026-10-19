/* fx.js — 연출 레이어 (DESIGN_SPEC §7.3, §8). 전역 FX 하나. transform/opacity만 움직인다.
   game.css와 함께 지연 로드된다. 로드 전 호출은 window.FX.q 큐에 쌓였다가 여기서 재생된다:
     window.FX = {q:[]}  또는  Proxy가 q.push([이름, [인자…]])  (또는 {n:이름, a:[인자…]}) */
(function () {
  'use strict';
  var d = document, de = d.documentElement, played = {}, live = [], timers = [];
  var rm = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var canAnim = typeof Element !== 'undefined' && !!Element.prototype.animate;

  function $(s) { return d.querySelector(s); }
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
    if (!canAnim || !el) { if (done) later(done, 0); return null; }
    el.style.willChange = 'transform,opacity';
    var a = track(el.animate(kf, o), function () { el.style.willChange = ''; if (done) done(); });
    return a;
  }
  function wait(ms) { return new Promise(function (r) { later(r, ms); }); }

  var FX = {
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
      var a = d.createTextNode(''), rest = d.createElement('span'), rt = d.createTextNode(text);
      rest.style.opacity = '0'; rest.appendChild(rt); el.appendChild(a); el.appendChild(rest);
      function tick(now) {
        if (stopped) return;
        if (t0 == null) t0 = now;
        var k = Math.min(text.length, Math.floor((now - t0) / step) + 1);
        a.data = text.slice(0, k); rt.data = text.slice(k);
        if (k < text.length) raf = requestAnimationFrame(tick); else el._fxStop = null;
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
          (label ? '<p class="peek-label">' + String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>' : '');
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
      FX.unpeek();
      var l = d.querySelectorAll('#fx .lid'), i;
      for (i = 0; i < l.length; i++) l[i].style.transition = '';
    },

    wait: wait
  };

  function lids(closed, ms) {
    var ls = d.querySelectorAll('#fx .lid');
    if (!ls.length) return Promise.resolve();
    var soft = calm() || lite() || !canAnim;
    return new Promise(function (res) {
      var i, e;
      for (i = 0; i < ls.length; i++) {
        e = ls[i];
        e.style.willChange = soft ? 'opacity' : 'transform';
        e.style.transition = (soft ? 'opacity ' : 'transform ') + (soft ? 160 : ms) + 'ms ' + (closed ? 'cubic-bezier(.7,0,.3,1)' : 'cubic-bezier(.2,.7,.1,1)');
        // 닫힘은 완전한 암전이 아니라 가운데에 틈(20vh)을 남긴다: 차례 안내(.night-msg/.night-nar)가 틈으로 보인다
        if (soft) { e.style.transform = closed ? 'scaleY(.8)' : 'scaleY(1)'; e.style.opacity = closed ? 1 : 0; }
        else { e.style.opacity = ''; e.style.transform = closed ? 'scaleY(.8)' : 'scaleY(0)'; }
      }
      later(function () {
        for (i = 0; i < ls.length; i++) { ls[i].style.willChange = ''; ls[i].style.transition = ''; }
        res();
      }, soft ? 160 : ms);
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
