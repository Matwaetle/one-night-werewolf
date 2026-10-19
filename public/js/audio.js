/* audio.js — F3 배경음악 합성 엔진 (FEATURES_SPEC 5). 소리 파일 0바이트: 오실레이터·Biquad·2초 노이즈 버퍼만 쓴다.
   OWNER 결정: 첫 제스처 뒤 기본 켜짐(작게, 음량 1), 메뉴에서 끄기/음량(localStorage ww_bgm, ww_bgm_vol), 탭이 숨으면 일시정지.
   지연 모듈. 모든 공개 메서드는 try 로 감싸 실패해도 조용히 무시한다. */
(function () {
  'use strict';
  var W = window, D = document, S = W.SND = W.SND || { q: [] }, T = W.T, R = Math.random;
  var ctx, mst, dk, bt, ech, nb, cur, tm, want, dkv = {};
  var Pr = function (p) { if (p && p.catch) p.catch(function () {}); };
  var ls = function (k, v) { try { if (v == null) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* 무시 */ } };
  var en = ls('ww_bgm') !== '0';                       // 기본 켜짐(OWNER). 첫 제스처가 있어야 소리가 난다.
  var vl = Math.min(3, Math.max(1, +ls('ww_bgm_vol') || 1));
  var gv = function () { return Math.pow([0.35, 0.6, 1][vl - 1], 2) * 0.5; };
  var L = function () { return D.documentElement.dataset.perf === 'lite'; };
  var P = [[0.5, 0.35], [1, 0.5], [1.19, 0.3], [1.5, 0.2], [2, 0.25], [2.74, 0.12], [3.76, 0.08], [5.4, 0.05]];   // 종 부분음 [비율, 이득]

  function g(v, d) { var n = ctx.createGain(); n.gain.value = v; if (d) n.connect(d); return n; }
  function fl(t, fr, q, d) { var n = ctx.createBiquadFilter(); n.type = t; n.frequency.value = fr; n.Q.value = q || 1; if (d) n.connect(d); return n; }
  function lf(hz, dp, prm, n) { var o = ctx.createOscillator(), d = g(dp, prm); o.frequency.value = hz; o.connect(d); o.start(); n.push(o); }
  // 지속 층: [종류('n'=노이즈), 주파수, 필터, 필터Hz, Q, 이득, LFO대상('f'|'g'), LFO Hz, LFO 깊이, detune] -> [소스, 이득노드]
  function ly(b, a, n) {
    var s, v = g(a[5], b), f;
    if (a[0] === 'n') { s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; }
    else { s = ctx.createOscillator(); s.type = a[0]; s.frequency.value = a[1]; if (a[9]) s.detune.value = a[9]; }
    if (a[2]) { f = fl(a[2], a[3], a[4], v); s.connect(f); } else s.connect(v);
    s.start(); n.push(s);
    if (a[6]) lf(a[7], a[8], a[6] === 'f' ? f.frequency : v.gain, n);
    return [s, v];
  }
  // 한 번 울리는 톤: attack 뒤 지수 감쇠. fr2 가 있으면 gd 초 동안 글라이드. e 면 에코로도 보낸다.
  function tn(type, fr, t, pk, dc, d, at, fr2, gd, e) {
    var o = ctx.createOscillator(), a = g(0, d);
    o.type = type; o.frequency.setValueAtTime(fr, t);
    if (fr2) o.frequency.exponentialRampToValueAtTime(fr2, t + (gd || 0.12));
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk, t + (at || 0.005)); a.gain.exponentialRampToValueAtTime(0.0001, t + dc);
    o.connect(a); if (e && ech) a.connect(ech);
    o.start(t); o.stop(t + dc + 0.1); o.onended = function () { a.disconnect(); };
  }
  // 노이즈 한 번: 필터 -> at 까지 상승 -> du 에 소멸
  function bn(t, du, ft, ff, q, pk, at) {
    var s = ctx.createBufferSource(), a = g(0, bt);
    s.buffer = nb; s.loop = true; s.connect(fl(ft, ff, q, a));
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(pk, t + at); a.gain.exponentialRampToValueAtTime(0.0001, t + du + 0.02);
    s.start(t, R()); s.stop(t + du + 0.1); s.onended = function () { a.disconnect(); };
  }
  function ev(s, t, f) { s.e.push({ t: t, f: f }); }
  function pn(s, t, a, lo, hi) {                           // 드문 퉁김(화음 한 음 + 한 옥타브 위)
    var k = L() ? 1.5 : 1;
    ev(s, t + 3, function (x) {
      var f = a[R() * a.length | 0];
      tn('sine', f, x, 0.04, 2.5, s.b, 0.005, 0, 0, 1); tn('triangle', f * 2, x, 0.02, 2.5, s.b, 0.005, 0, 0, 1);
      return (lo + R() * (hi - lo)) * k;
    });
  }
  function build(nm, o, s) {
    var b = s.b, n = s.n, t = ctx.currentTime, w, x;
    if (nm === 'lobby') {
      ly(b, ['sine', 55, 0, 0, 0, 0.05], n); ly(b, ['sine', 82.4, 0, 0, 0, 0.05, 0, 0, 0, 3], n);
      ly(b, ['triangle', 110, 'lowpass', 400, 1, 0.04, 'f', 0.07, 150], n);
      pn(s, t, [220, 261.6, 329.6, 392], 7, 13);
    } else if (nm === 'night') {
      w = ly(b, ['n', 0, 'bandpass', 500, 0.8, 0.04, 'f', 0.11, 300], n); lf(0.023, 0.02, w[1].gain, n);
      ly(b, ['sawtooth', 36.7, 'lowpass', 140, 2, 0.06], n); ly(b, ['sine', 73.4, 0, 0, 0, 0.03], n);
      if (!L()) ev(s, t + 8, function (z) { tn('sine', 77.8, z, 0.015, 12, b, 6); return 20; });
    } else if (nm === 'day') {
      ly(b, ['n', 0, 'bandpass', 1200, 1, 0.015], n);
      ly(b, ['sine', 110, 0, 0, 0, 0.03, 'g', 0.2, 0.009], n); ly(b, ['sine', 164.8, 0, 0, 0, 0.02, 'g', 0.2, 0.006], n);
      pn(s, t, [293.7, 349.2, 440, 493.9], 9, 15);
      ev(s, t, function (z) {                              // ends 30초 전부터 1초마다 맥박
        var l = (s.o.ends || 0) - Date.now();
        if (l > 0 && l < 30000) tn('sine', 55, z, 0.03 + 0.09 * (1 - l / 30000), 0.12, b, 0.002);
        return 1;
      });
    } else if (nm === 'vote') {
      ly(b, ['sawtooth', 41.2, 'lowpass', 90, 1, 0.07], n); ly(b, ['n', 0, 'lowpass', 120, 1, 0.01], n);
      ev(s, t, function (z) {                              // 심장: lub + 0.28초 뒤 dub, ends 가 가까울수록 빨라진다
        tn('sine', 90, z, 0.25, 0.18, b, 0.004, 45, 0.08); tn('sine', 50, z + 0.28, 0.18, 0.15, b, 0.004);
        var l = (s.o.ends || 0) - Date.now();
        return l > 0 ? 0.7 + 0.3 * Math.min(1, l / 30000) : (s.o.ends ? 0.7 : 1);
      });
    } else if (nm === 'result') {
      ev(s, t + 3.6, function (z) {                        // 3초 페이드아웃 + 0.6초 침묵 뒤
        if (!o.replay) S.toll(o.dead > 0);
        if (o.win === true) {                              // 승리: 종이 잦아든 뒤 따뜻한 화음 3초 페이드인
          x = g(0, b); x.gain.setTargetAtTime(1, z + 4, 1);
          ly(x, ['triangle', 110, 'lowpass', 900, 1, 0.03], n); ly(x, ['triangle', 165, 'lowpass', 900, 1, 0.02], n); ly(x, ['sine', 277.2, 0, 0, 0, 0.008], n);
        } else if (o.win === false) {                      // 패배: D1 이 8초 동안 -30센트, Eb2 충돌, 바람 재진입
          w = ly(b, ['sawtooth', 36.7, 'lowpass', 120, 1, 0.06], n); w[0].detune.linearRampToValueAtTime(-30, z + 8);
          ly(b, ['sine', 77.8, 0, 0, 0, 0.03], n); ly(b, ['n', 0, 'bandpass', 500, 0.8, 0.03], n);
        }
        return 1e9;
      });
    }
  }
  function tick() {
    if (!cur || ctx.state !== 'running') return;
    var n = ctx.currentTime;
    cur.e.forEach(function (e) { if (e.t < n) e.t = n; while (e.t < n + 0.5) e.t += Math.max(0.05, e.f(e.t)); });
  }
  function kill(s) { s.n.forEach(function (x) { try { x.stop(); } catch (e) { /* 무시 */ } }); s.b.disconnect(); }
  function mk() {
    if (mst) return;
    ctx = S.ctx;
    ctx.onstatechange = function () { var z = ctx.state; if (z === 'running') gl(0); else if (en && (z === 'suspended' || z === 'interrupted')) gl(1); };
    if (ctx.state === 'running') gl(0);
    var c, i, d, fb;
    if (L()) c = g(0.8, ctx.destination);                  // lite: 컴프레서 생략
    else { c = ctx.createDynamicsCompressor(); c.threshold.value = -24; c.knee.value = 12; c.ratio.value = 4; c.attack.value = 0.01; c.release.value = 0.3; c.connect(ctx.destination); }
    mst = g(0, c); dk = g(1, mst); bt = g(1, dk);
    if (!L()) {                                            // 에코: Delay 0.38s -> 피드백 0.35 -> lowpass 1800Hz
      d = ctx.createDelay(1); d.delayTime.value = 0.38;
      fb = g(0.35, d); d.connect(fb); d.connect(fl('lowpass', 1800, 1, dk)); ech = g(1, d);
    }
    nb = ctx.createBuffer(1, 22050, 22050); d = nb.getChannelData(0);
    for (i = 0; i < d.length; i++) d[i] = R() * 2 - 1;
  }
  function go() {                                          // 켜져 있고 컨텍스트가 있을 때 시작
    if (!en || !S.ctx) return;
    mk();
    try { Pr(S.ctx.resume()); } catch (e) { /* 무시 */ }
    mst.gain.setTargetAtTime(gv(), ctx.currentTime, 0.3);
    if (!tm) tm = setInterval(tick, 250);
    if (want) S.scene(want[0], want[1]);
  }
  function wrap(f) { return function () { try { return f.apply(S, arguments); } catch (e) { /* 소리 실패는 무시 */ } }; }

  S.on = wrap(function () { en = true; if (S.ctx) go(); });
  S.off = wrap(function () {
    en = false; clearInterval(tm); tm = 0;
    if (mst) { mst.gain.setTargetAtTime(0, ctx.currentTime, 0.1); setTimeout(function () { if (!en) try { Pr(ctx.suspend()); } catch (e) { /* 무시 */ } }, 400); }
  });
  S.vol = wrap(function (n) {
    vl = Math.min(3, Math.max(1, +n || 1)); ls('ww_bgm_vol', String(vl));
    if (mst && en) mst.gain.setTargetAtTime(gv(), ctx.currentTime, 0.1);
    D.querySelectorAll('[data-snd-vol]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.sndVol === vl)); });
  });
  S.scene = wrap(function (nm, o) {
    o = o || {}; want = [nm, o];
    if (!en || !mst) return;
    if (cur && cur.nm === nm) { cur.o = o; return; }
    var t = ctx.currentTime, s = { nm: nm, o: o, b: g(0, dk), n: [], e: [] }, old = cur;
    s.b.gain.setTargetAtTime(1, t, 0.8);
    if (old) { old.b.gain.setTargetAtTime(0, t, nm === 'result' ? 1 : 0.8); setTimeout(function () { kill(old); }, 4000); }
    cur = s; build(nm, o, s);
  });
  S.toll = wrap(function (dead) {
    if (!en || !mst) return;
    var t = ctx.currentTime + 0.02, h = g(0.15, dead ? bt : fl('lowpass', 600, 0.7, bt));
    P.slice(0, L() ? 5 : 8).forEach(function (p) { tn('sine', 110 * p[0], t, p[1], 6 / Math.pow(p[0], 0.6), h, 0.003); });
    bn(t, 0.02, 'highpass', 3000, 1, 0.1, 0.002);
  });
  S.sting = wrap(function (nm) {
    if (!en || !mst) return;
    var t = ctx.currentTime, b = cur && cur.b;
    if (nm === 'wake') {
      if (b) { b.gain.setTargetAtTime(0.5, t, 0.1); b.gain.setTargetAtTime(1, t + 2, 0.4); }     // 바람 2초간 -6dB
      bn(t, 0.6, 'highpass', 2000, 1, 0.05, 0.6);
      tn('sine', 90, t + 0.6, 0.2, 0.8, bt, 0.005, 49, 0.12);
      tn('sine', 587, t + 0.6, 0.03, 1.8, bt, 0.03, 0, 0, 1); tn('sine', 877.6, t + 0.6, 0.03, 1.8, bt, 0.03, 0, 0, 1);
    } else if (nm === 'close') tn('sine', 220, t, 0.02, 0.5, bt, 0.01, 110, 0.4);
    else if (nm === 'carve') bn(t, 0.06, 'bandpass', 3000, 6, 0.05, 0.005);
  });
  S.duck = wrap(function (key, db) {
    dkv[key] = db || 0;
    if (!dk) return;
    var m = 0; for (var k in dkv) m = Math.min(m, dkv[k]);
    dk.gain.setTargetAtTime(Math.pow(10, m / 20), ctx.currentTime, 0.15);
  });
  S.pause = wrap(function () { if (S.ctx) Pr(S.ctx.suspend()); });
  S.resume = wrap(function () { if (S.ctx && en) Pr(S.ctx.resume()); });
  S.segHTML = function () {
    var B = T.body, h = '<div class="seg" role="group" aria-label="' + T.esc(B.bgmVol) + '">';
    B.bgmLv.forEach(function (l, i) { h += '<button type="button" class="seg-btn" data-snd-vol="' + (i + 1) + '" aria-pressed="' + (vl === i + 1) + '">' + T.esc(l) + '</button>'; });
    return h + '</div>';
  };

  // ---- 생명주기 ----
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { /* 무시 */ }
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-snd-vol]'); if (b) S.vol(+b.dataset.sndVol); });
  D.addEventListener('visibilitychange', function () {     // 탭이 숨으면 멈추고 보이면 잇는다
    try { if (!S.ctx) return; if (D.hidden) { Pr(S.ctx.suspend()); clearInterval(tm); tm = 0; } else if (en) { Pr(S.ctx.resume()); if (mst && !tm) tm = setInterval(tick, 250); } } catch (e) { /* 무시 */ }
  });
  function gx() {                                          // 첫 제스처(또는 iOS 'interrupted' 뒤 다음 제스처)에서 만들고 잇는다
    try {
      if (!en) return;
      if (!S.ctx) { var C = W.AudioContext || W.webkitAudioContext; if (C) try { S.ctx = new C({ latencyHint: 'playback' }); } catch (e) { S.ctx = new C(); } go(); }
      else if (!mst) go();
      else if (S.ctx.state !== 'running' && !D.hidden) Pr(S.ctx.resume());
    } catch (e) { /* 무시 */ }
  }
  var GK = ['pointerup', 'keydown', 'touchend', 'click'], ga = 0;
  function gl(on) {                                        // 재생 중엔 제스처 리스너를 떼고, 멈추면 다시 단다
    if (!!on === !!ga) return; ga = on ? 1 : 0;
    GK.forEach(function (k) { D[on ? 'addEventListener' : 'removeEventListener'](k, gx, { capture: true, passive: true }); });
  }
  gl(1);

  // 로드 전에 쌓인 호출을 넘겨받는다. 스팅·종은 늦었으므로 버리고, 장면은 마지막 것만 쓴다.
  var last = null;
  S.q.splice(0).forEach(function (x) {
    if (x[0] === 'scene') last = x[1];
    else if (x[0] === 'on' || x[0] === 'off' || x[0] === 'vol' || x[0] === 'duck') S[x[0]].apply(S, x[1]);
  });
  if (last) want = [last[0], last[1]];
  if (S.ctx && en) go();
})();
