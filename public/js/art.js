// art.js — 카드 마크업 생성 + 이미지 로더 (DESIGN_SPEC §4.5, §7.3, §9.4). 전역 하나: ART.
// 의존: ROLES / WW (roles.js, 먼저 로드). 이미지가 하나도 없어도 ART.card()는 완성된 카드를 돌려준다.
//
// manifest 모양 (window.ART_MANIFEST, 값은 파일명 또는 경로. 파일명이면 ART.base 붙임):
//   { art:{seer:'seer.1a2b.webp',…}, lite:{seer:'seer-l.x.webp',…}, atlas:'atlas.x.webp',
//     back:'back.x.webp', grain:'grain.x.webp', horizon:'horizon.x.webp', home:'home.x.webp', homeM:'home-m.x.webp' }
(function (root) {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;
  var docEl = doc && doc.documentElement;

  var FALLBACK_ORDER = ['doppelganger', 'werewolf', 'minion', 'mason', 'seer', 'robber',
    'troublemaker', 'drunk', 'insomniac', 'villager', 'hunter', 'tanner'];
  function roles() { return root.ROLES || (root.WW && root.WW.ROLES) || {}; }
  function order() { return (root.WW && root.WW.ROLE_ORDER) || FALLBACK_ORDER; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ART = {
    manifest: root.ART_MANIFEST || {},
    base: '/a/',
    CONCURRENCY: 2,
    TEAM_SYMBOL: { wolf: 'tm-wolf', village: 'tm-village', tanner: 'tm-tanner' },
  };

  // ---------- 경로 ----------
  function url(v) {
    if (!v) return '';
    return /^(\/|https?:|data:|blob:)/.test(v) ? v : ART.base + v;
  }
  function attr(k) { return docEl && docEl.getAttribute(k); }
  function isSmall() { return attr('data-perf') === 'lite' || attr('data-net') === 'slow'; }
  function isSlow() { return attr('data-net') === 'slow'; }

  // 역할 큰 아트 URL (lite/slow면 360px 판 우선)
  // lite=true(선로딩)만 작은 아트를 쓴다. 내 카드·공개 카드는 느린 망에서도 큰 아트(약 28KB)
  function roleUrl(id, lite) {
    var m = ART.manifest || {};
    var bg = m.art || m.big, big = bg && bg[id], sm = m.lite && m.lite[id];
    return url(lite && isSmall() ? (sm || big) : (big || sm));
  }
  function rurl(id) { return urls['r:' + id] || roleUrl(id); }   // 실제로 받은 주소 우선
  function staticUrl(name) {
    var m = ART.manifest || {};
    var v = m[name];
    if (name === 'home') {                       // home:{d,m} (optimize-images) 또는 home + homeM
      var h = m.home, mob = isSlow() || (root.matchMedia && root.matchMedia('(max-width:700px)').matches);
      v = (h && typeof h === 'object') ? (mob && h.m ? h.m : h.d || h.m) : (mob && m.homeM ? m.homeM : h);
    } else if (name.indexOf('verdict-') === 0) v = m.verdict && m.verdict[name.slice(8)];
    return url(v);
  }
  function roleIndex(id) { return order().indexOf(id); }

  // ---------- 로더 (동시 2, 우선순위 큐, decode) ----------
  var done = {};        // key -> true(성공). 실패는 저장하지 않고 fails로 센다
  var fails = {};       // key -> 실패 횟수 (3회면 포기, 온라인 복귀 때 초기화)
  var urls = {};        // key -> 실제 로드한 주소
  var pending = {};     // key -> Promise
  var keep = {};        // key -> Image (디코드된 비트맵 유지)
  var queue = [];       // {key,url,front,resolve}
  var active = 0, xtra = 0;
  var asked = {};       // 요청한 URL 집합 (같은 주소·같은 역할을 두 크기로 받지 않는다)
  var roleU = {};       // 'r:id' -> 처음 요청한 주소
  var late = {};        // key -> 12초 넘겼지만 아직 받는 중 (끊지 않는다)
  function is404(u) {
    try { var e = performance.getEntriesByName(u, 'resource'); e = e[e.length - 1]; return !!e && e.responseStatus === 404; } catch (x) { return false; }
  }

  function pump() {
    var j;
    // 앞순위 역할 아트(r:)는 슬롯이 다 찼어도 한 개 더 받는다
    while ((j = queue[0]) && (active < ART.CONCURRENCY || (j.front && !xtra && j.key.charAt(0) === 'r'))) {
      queue.shift();
      if (active >= ART.CONCURRENCY) { j.x = 1; xtra = 1; }
      start(j);
    }
  }
  function start(job) {
    active++;
    var img = new Image();
    img.decoding = 'async';
    var fin = false, rel = false;
    var release = function () { if (rel) return; rel = true; active--; if (job.x) xtra = 0; };
    // 시간 초과: 받던 이미지는 끊지 않는다. 슬롯만 돌려주고 기다리는 쪽에는 실패로 알린다(pending-late)
    var to = setTimeout(function () { if (fin) return; late[job.key] = 1; release(); job.resolve(false); pump(); }, 12000);
    var finish = function (ok) {
      if (fin) return;
      fin = true; clearTimeout(to); release(); delete late[job.key];
      if (ok) { done[job.key] = true; urls[job.key] = job.url; }
      else fails[job.key] = is404(job.url) ? 3 : (fails[job.key] || 0) + 1;
      if (ok) keep[job.key] = img;
      delete pending[job.key];
      job.resolve(ok);
      if (ok) onLoaded(job.key);
      pump();
    };
    img.onerror = function () { finish(false); };
    // decode()는 그려지지 않는 탭·백그라운드에서 끝나지 않을 수 있다 → 받기만 끝나면 잠시 뒤 성공으로 본다
    img.onload = function () { setTimeout(function () { finish(true); }, 300); };
    asked[job.url] = 1;
    img.src = job.url;
    if (img.decode) img.decode().then(function () { finish(true); }, function () {
      // decode() 거부는 오류일 수도, 일부 브라우저의 미지원 거부일 수도 있다
      if (img.complete && img.naturalWidth) finish(true); else finish(false);
    });
    else img.onload = function () { finish(true); };
  }
  function load(key, u, front) {
    if (!u || !doc) return Promise.resolve(false);
    if (key in done) return Promise.resolve(true);
    if ((fails[key] || 0) >= 3) return Promise.resolve(false);
    if (key.charAt(0) === 'r') { if (roleU[key]) u = roleU[key]; else roleU[key] = u; }   // 한 역할은 한 가지 크기만
    if (pending[key]) {
      if (front) {   // 이미 대기 중이면 앞으로
        for (var i = 0; i < queue.length; i++) if (queue[i].key === key) { queue.unshift(queue.splice(i, 1)[0]); queue[0].front = true; break; }
      }
      return pending[key];
    }
    var p = new Promise(function (resolve) {
      var job = { key: key, url: u, resolve: resolve, front: front };
      if (front) queue.unshift(job); else queue.push(job);
    });
    pending[key] = p;
    pump();
    return p;
  }

  // 로드 성공 후: 정적 이미지는 CSS 변수를 설정(그 전엔 CSS가 URL을 요청하지 않는다), 카드에 data-art 부여
  // 같은 프레임에 몰린 로드는 rAF 한 번에 모아서 쓴다 (스타일 무효화 1회)
  var got = {}, tick = 0;
  function onLoaded(key) {
    if (!doc) return;
    got[key] = 1;
    if (tick) return;
    tick = 1;
    // rAF는 숨김·가려진 탭에서 멈출 수 있으므로 타이머를 항상 함께 건다 (먼저 도착한 쪽이 flush, 나머지는 무시)
    var t = setTimeout(flush, doc.hidden ? 50 : 120);
    if (!doc.hidden && root.requestAnimationFrame) root.requestAnimationFrame(function () { clearTimeout(t); flush(); });
  }
  // 정적 이미지 URL은 :root 변수 대신 <style id=art-urls> 에 소비자별 규칙으로 덧붙인다 (루트 변수 변경 = 문서 전체 스타일 무효화).
  // 규칙 선택자는 base.css/card.css 소비자와 같다: 같은 명시도 + 나중 순서로 이긴다.
  var RULES = {
    grain: function (u) { return '.grain{background:url(' + u + ') 0 0/128px 128px repeat}html[data-img~=grain]:not([data-perf=lite]) #modal .modal-box:is(.law,.paper)::after{background:url(' + u + ') 0 0/128px 128px repeat}'; },
    home: function (u) { return '.bg-art::before{background:url(' + u + ') center top/cover no-repeat}'; },
    horizon: function (u) { return 'body:not([data-phase=home]) .bg-art::before{background:url(' + u + ') center bottom/cover no-repeat}'; },
    back: function (u) { return '.card:is([data-size=md],[data-size=xl]) .card-back::after{background-image:url(' + u + ')}'; },
    backS: function (u) { return '.card:is([data-size=xs],[data-size=sm]) .card-back::after{background-image:url(' + u + ')}'; },
    atlas: function (u) { return '.card[data-size=xs] .card-art,.card[data-size=sm] .card-art{background-image:url(' + u + ')}'; }
  };
  function sheet() {
    var el = doc.getElementById('art-urls');
    if (!el) { el = doc.createElement('style'); el.id = 'art-urls'; doc.head.appendChild(el); }
    return el;
  }
  function flush() {
    if (!tick) return;
    tick = 0;
    var keys = Object.keys(got), have = (attr('data-img') || '').split(' ').filter(Boolean), n = have.length, css = '';
    got = {};
    keys.forEach(function (k) {
      var name = k.slice(2);
      if (k.charAt(0) === 's') {
        var u = staticUrl(name);
        css += RULES[name] ? RULES[name](JSON.stringify(u)) : name.indexOf('verdict-') === 0 ? '.verdict[data-team=' + name.slice(8) + ']::before{background-image:url(' + JSON.stringify(u) + ')}' : '';
        if (have.indexOf(name) < 0) have.push(name);
        if (name === 'home') docEl.setAttribute('data-home-art', '1');
      }
    });
    if (css) sheet().appendChild(doc.createTextNode(css));
    if (have.length !== n) docEl.setAttribute('data-img', have.join(' '));
    keys.forEach(function (k) {
      if (k.charAt(0) === 'r') ART.mark(doc, '.card[data-role="' + k.slice(2) + '"][data-art="0"]');
      else if (k === 's:atlas') ART.mark(doc, '.card[data-art="0"][data-size="xs"],.card[data-art="0"][data-size="sm"]');
    });
  }

  // ---------- 공개 API ----------
  // 모닥불 진입 때 W6이 호출: ART.warm() = back, atlas, horizon, grain (slow면 horizon 생략)
  ART.warm = function (names) {
    names = names || ['backS', 'atlas', 'back', 'horizon', 'grain'];
    var out = [];
    names.forEach(function (n) {
      if (isSlow() && (n === 'horizon' || n === 'back')) return;
      var u = staticUrl(n);
      if (u) out.push(load('s:' + n, u, false));
    });
    return Promise.all(out).then(function () {});
  };
  ART.has = function (id) { return done['r:' + id] === true; };

  // 큰 아트 로드 요청(동시 2개, 이미 있으면 무시). 가장 먼저 부른 것이 아니라 가장 최근 호출이 앞선다(최우선).
  // opts.low: 앞순위가 아닌 보통 순위로 줄 세운다. 이미 작은 판을 받은 역할은 느린 망이 아니면 큰 판으로만 올린다(md/xl 카드용).
  ART.want = function (ids, opts) {
    if (!ids) return;
    var front = !(opts && opts.low);
    (Array.isArray(ids) ? ids : [ids]).slice().reverse().forEach(function (id) {
      var u = roleUrl(id), k = 'r:' + id;
      if (!u) return;
      if (done[k] === true && urls[k] && urls[k] !== u && !asked[u] && !isSlow()) {
        load('u:' + id, u, front).then(function (ok) {
          if (!ok) return;
          urls[k] = u;
          var cs = doc.querySelectorAll('.card[data-role="' + id + '"][data-art="1"]');
          for (var i = 0; i < cs.length; i++) {
            var sz = cs[i].getAttribute('data-size'), a = cs[i].querySelector('.card-art');
            if ((sz === 'md' || sz === 'xl') && a) a.style.setProperty('--art', 'url("' + u + '")');
          }
        });
        return;
      }
      load(k, u, front);
    });
  };
  ART.cancel = function () { queue.forEach(function (j) { delete pending[j.key]; j.resolve(false); }); queue = []; };

  // 덱 확정 뒤 idle 선로딩. deck = {role:count} 또는 [role…]
  ART.prefetchDeck = function (deck) {
    if (isSlow() || !deck) return;
    var ids = Array.isArray(deck) ? deck : Object.keys(deck).filter(function (r) { return deck[r] > 0; });
    var seen = {}, list = ids.filter(function (r) { if (seen[r]) return false; seen[r] = 1; return true; });
    var run = function () {
      list.forEach(function (id) { var u = roleUrl(id, true); if (u) load('r:' + id, u, false); });
    };
    if (root.requestIdleCallback) root.requestIdleCallback(run, { timeout: 3000 }); else setTimeout(run, 200);
  };

  // decode 완료 또는 1500ms. 아트가 없는 역할은 즉시 resolve
  ART.ready = function (id) {
    var u = roleUrl(id);
    if (!u) return Promise.resolve();
    var p = load('r:' + id, u, true).then(function () {});
    return Promise.race([p, new Promise(function (r) { setTimeout(r, 1500); })]);
  };

  // root 안의 .card에 로드된 아트면 data-art="1" 즉시 부여 (md/xl은 --art도 설정)
  ART.mark = function (scope, sel) {
    if (!doc) return;
    scope = scope || doc;
    var atlasOk = done['s:atlas'] === true;
    var cards = scope.querySelectorAll ? scope.querySelectorAll(sel || '.card[data-role][data-art="0"]') : [];
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i], role = c.getAttribute('data-role'), size = c.getAttribute('data-size');
      if (size === 'xs' || size === 'sm') {
        if (atlasOk) c.setAttribute('data-art', '1');
      } else if (done['r:' + role] === true) {
        var art = c.querySelector('.card-art');
        if (art) art.style.setProperty('--art', 'url("' + rurl(role) + '")');
        c.setAttribute('data-art', '1');
      }
    }
  };

  // 카드 뒤집기 (3D 플립 + 90° 섬광). 화면 코드는 data-face를 직접 바꿔도 되지만 이쪽이 will-change 정리까지 한다.
  ART.flip = function (card, face) {
    if (!card) return;
    face = face ? 1 : 0;
    if (card.getAttribute('data-face') === String(face)) return;
    var inner = card.firstElementChild;
    var calm = attr('data-perf') === 'lite' ||
      (root.matchMedia && root.matchMedia('(prefers-reduced-motion:reduce)').matches);
    if (!calm && inner) {
      inner.style.willChange = 'transform';
      var off = function () { inner.style.willChange = ''; inner.removeEventListener('transitionend', off); };
      inner.addEventListener('transitionend', off);
      setTimeout(off, 700);
      card.classList.add('is-flip');
      setTimeout(function () { card.classList.remove('is-flip'); }, 560);
    }
    card.setAttribute('data-face', String(face));
    if (!card.hasAttribute('data-lbl')) {
      var r = roles()[card.getAttribute('data-role')];
      card.setAttribute('aria-label', face && r ? r.name + ' 카드' : '엎어진 카드');
    }
  };

  // ---------- 카드 마크업 (§4.5) ----------
  // ART.card(roleId|null, {size:'xs|sm|md|xl', face:0|1, cls, label, flat})
  ART.card = function (roleId, o) {
    o = o || {};
    var size = o.size || 'sm';
    var r = roleId ? roles()[roleId] : null;
    if (roleId && !r) roleId = null;
    var flat = !!o.flat;
    var face = r ? (flat ? 1 : (o.face ? 1 : 0)) : 0;
    var label = o.label || (r && face ? r.name + ' 카드' : '엎어진 카드');
    var small = size === 'xs' || size === 'sm';

    // 아트 상태: 이미 로드된 것만 즉시 반영 (그렇지 않으면 0 — 도착하면 ART.mark가 올린다)
    var artOn = 0, artStyle = '';
    if (r) {
      if (small) {
        var idx = roleIndex(roleId);
        artStyle = '--col:' + (idx % 6) + ';--row:' + Math.floor(idx / 6);
        if (done['s:atlas'] === true) artOn = 1;
      } else if (done['r:' + roleId] === true) {
        artOn = 1;
        artStyle = '--art:url("' + rurl(roleId) + '")';
      }
    }

    var h = '<div class="card' + (o.cls ? ' ' + esc(o.cls) : '') + '" data-size="' + size + '"';
    if (r) h += ' data-role="' + roleId + '" data-team="' + r.team + '"';
    h += ' data-face="' + face + '" data-art="' + artOn + '"' + (flat ? ' data-flat="1"' : '') +
      (o.label ? ' data-lbl="1"' : '') + (r && Array.from(r.name || '').length >= 5 ? ' data-long="1"' : '') + ' role="img" aria-label="' + esc(label) + '"><div class="card-in">';

    if (r) {
      h += '<div class="card-front"><div class="card-plate">' +
        '<div class="card-art"' + (artStyle ? ' style="' + esc(artStyle) + '"' : '') + '></div>';
      if (size !== 'xs' && size !== 'sm') h += '<span class="card-ord">' + esc(r.ord || '') + '</span>';
      if (size !== 'xs') h += '<svg class="card-tm" aria-hidden="true"><use href="#' + (ART.TEAM_SYMBOL[r.team] || 'tm-village') + '"/></svg>';
      h += '<span class="card-sg" aria-hidden="true"><svg><use href="#' + (r.sigil || 'sg-' + roleId) + '"/></svg></span>';
      if (!small) h += '<svg class="card-sw" aria-hidden="true"><use href="#rp-turn"/></svg>';
      h += '<div class="card-name">' + esc(r.name) + '</div>';
      if (size === 'xl') h += '<div class="card-line">' + esc(r.line || '') + '</div>';
      h += '</div></div>';
    }
    if (!r || !flat) {
      h += '<div class="card-back"><svg class="card-bm" aria-hidden="true"><use href="#back-mark"/></svg></div>';
    }
    return h + '</div></div>';
  };

  if (root.addEventListener) root.addEventListener('online', function () { fails = {}; });

  // ---------- 시작 ----------
  // CSS 이미지 URL(back atlas grain horizon home verdict-*)은 이미지가 로드·디코드된 뒤 <style id=art-urls> 에 덧붙인다.
  // (시작 시 설정하면 CSS가 곧바로 요청해 slow/차단 정책과 우선순위를 무시한다 — 보고서 참조.)
  // 로드된 정적 이미지는 <html data-img="back atlas …">로 표시된다.

  if (typeof module !== 'undefined' && module.exports) module.exports = ART;
  else root.ART = ART;
})(typeof window !== 'undefined' ? window : globalThis);
