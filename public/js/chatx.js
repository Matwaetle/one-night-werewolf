/* chatx.js — F1 채팅 답글 동작 (FEATURES_SPEC 3.3). 지연 모듈, 위임 리스너만 쓴다. window.CHATX.init({toast}) 는 한 번만 동작.
   사용자 문자열은 모두 T.chat.*, 서버에서 온 값은 textContent/속성으로만 넣는다(innerHTML 사용 안 함). */
(function () {
  'use strict';
  var W = window, D = document, T = W.T, C = T.chat;
  if (!D.getElementById('cx-css')) { var st = D.createElement('style'); st.id = 'cx-css'; st.textContent = '__CHATX_CSS__'; D.head.appendChild(st); }
  var inited = 0, toast, btn, selEl, selT, hitT;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var reduce = function () { return W.matchMedia('(prefers-reduced-motion:reduce)').matches || D.documentElement.dataset.perf === 'lite'; };
  var off = function () { var i = $('#chatInput'); return D.body.dataset.chat === 'off' || !i || i.disabled; };
  var cut = function (s) { var a = Array.from(s.replace(/\s+/g, ' ').trim()); return a.length > 40 ? a.slice(0, 40).join('') + '…' : a.join(''); };
  var okMsg = function (m) { return m && m.dataset.sys === '0' && m.dataset.mid; };

  function ensureBar() {
    var f = $('.chat-form');
    if (!f) return null;
    if (!$('.chat-re', f)) {
      var bar = D.createElement('div'); bar.className = 'chat-re'; bar.setAttribute('role', 'status');
      var t = D.createElement('span'); t.className = 'chat-re-t';
      var x = D.createElement('button'); x.type = 'button'; x.className = 'chat-re-x'; x.textContent = C.replyCancel;
      bar.appendChild(t); bar.appendChild(x); f.insertBefore(bar, f.firstChild);
    }
    return f;
  }
  function hideBtn() {
    clearTimeout(selT);
    if (btn) btn.hidden = true;
    if (selEl) selEl.classList.remove('is-sel');
    selEl = null;
  }
  function attach(m, timed) {
    if (selEl && !selEl.isConnected) hideBtn();
    if (off() || !okMsg(m)) return hideBtn();
    if (selEl === m && !btn.hidden) return;
    hideBtn();
    if (!btn) { btn = D.createElement('button'); btn.type = 'button'; btn.className = 'msg-act'; btn.textContent = C.reply; }
    var n = $('.msg-n', m); n = n ? n.textContent : '';
    btn.setAttribute('aria-label', T.fmt(C.replyAria, { n: n }));
    btn.hidden = false; m.appendChild(btn); m.classList.add('is-sel'); selEl = m;
    if (timed) selT = setTimeout(hideBtn, 3000);
  }
  function startReply(m) {
    if (!m || !m.isConnected) return hideBtn();
    var f = ensureBar();
    if (!f || off() || !okMsg(m)) return;
    var n = $('.msg-n', m), t = $('.msg-t', m), bar = $('.chat-re-t', f);
    n = n ? n.textContent : '';
    bar.textContent = '';
    var b = D.createElement('b'); b.className = 'nm'; b.textContent = n;
    bar.appendChild(b); bar.appendChild(D.createTextNode(cut(t ? t.textContent : '')));
    f.dataset.re = m.dataset.mid;
    var sr = $('#sr'); if (sr) sr.textContent = T.fmt(C.replyBar, { n: n });
    hideBtn();
    var i = $('#chatInput'); if (i) i.focus();
  }
  function cancelReply() {
    var f = $('.chat-form'); if (f) delete f.dataset.re;
    var i = $('#chatInput'); if (i) i.focus();
  }
  function jump(q) {
    var log = $('#chatLog'), re = parseInt(q.dataset.re, 10);
    var tg = re > 0 && log && log.querySelector('.msg[data-mid="' + re + '"]');
    if (!tg) return toast && toast(C.gone);
    var lite = reduce();
    tg.scrollIntoView({ block: 'center', behavior: lite ? 'auto' : 'smooth' });
    clearTimeout(hitT);
    D.querySelectorAll('#chatLog .is-hit').forEach(function (e) { e.classList.remove('is-hit'); });
    void tg.offsetWidth; tg.classList.add('is-hit');
    hitT = setTimeout(function () { tg.classList.remove('is-hit'); }, lite ? 600 : 1200);
  }

  function init(o) {
    if (inited) return; inited = 1;
    toast = o && o.toast;
    var hover = W.matchMedia('(hover:hover)').matches;
    // 키보드로 로그에 들어갈 수 있게 한다. 로그는 시트를 처음 열 때 만들어지므로 나타날 때까지 기다린다.
    var tab = function () { var l = $('#chatLog'); if (l && !l.hasAttribute('tabindex')) l.tabIndex = 0; return l; };
    if (!tab() && W.MutationObserver) { var mo = new MutationObserver(function () { if (tab()) mo.disconnect(); }); mo.observe(D.body, { childList: true, subtree: true }); }
    D.addEventListener('click', function (e) {
      var tg = e.target;
      if (!tg.closest) return;
      if (tg.closest('.msg-act')) { startReply(selEl); return; }
      if (tg.closest('.chat-re-x')) { cancelReply(); return; }
      var q = tg.closest('#chatLog .msg-q');
      if (q) { jump(q); return; }
      var m = tg.closest('#chatLog .msg');
      if (m && okMsg(m)) attach(m, 1); else hideBtn();
    });
    if (hover) {
      D.addEventListener('mouseover', function (e) {
        var m = e.target.closest && e.target.closest('#chatLog .msg');
        if (m && m !== selEl && okMsg(m)) attach(m, 0);
      });
    }
    D.addEventListener('keydown', function (e) {
      var tg = e.target, k = e.key;
      if (tg.id === 'chatInput') { if (k === 'Escape') { var f = tg.closest('.chat-form'); if (f && f.dataset.re) { e.preventDefault(); cancelReply(); } } return; }
      var q = tg.closest && tg.closest('#chatLog .msg-q');
      if (q && (k === 'Enter' || k === ' ')) { e.preventDefault(); jump(q); return; }
      var log = $('#chatLog');
      if (!log || !(tg === log || log.contains(tg))) return;
      var list = Array.prototype.filter.call(log.querySelectorAll('.msg'), okMsg), m = tg.closest('.msg');
      if (k === 'Enter' && m && tg === m) { e.preventDefault(); startReply(m); return; }
      if (k !== 'ArrowUp' && k !== 'ArrowDown') return;
      var at = list.indexOf(m), nx = list[at < 0 ? (k === 'ArrowUp' ? list.length - 1 : 0) : at + (k === 'ArrowUp' ? -1 : 1)];
      if (!nx) return;
      e.preventDefault(); nx.tabIndex = -1; nx.focus();
      attach(nx, 0);
    });
  }
  W.CHATX = { init: init };
})();
