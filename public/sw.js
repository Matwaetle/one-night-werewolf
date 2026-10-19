/* Service Worker 템플릿 (DESIGN_SPEC §9.6). tools/stamp.js 가 __VER__ 과 __PRECACHE__ 를 치환해 dist/sw.js 로 낸다.
   등록은 앱이 load 후 requestIdleCallback 에서 한다. 게임 중에는 절대 새로고침하지 않는다:
   새 SW 는 설치만 하고 기다린다(skipWaiting 자동 호출 없음). 앱이 홈에서 postMessage('skip') 하면 활성화한다. */
const VER = '__VER__';
const PRE = __PRECACHE__;   // CORE 만 (스크립트·CSS·폰트). 이미지(IMG)는 /a/ 런타임 캐시가 채운다
const SHELL = 'hb-' + VER;   // 버전별 셸 캐시
const RT = 'hb-rt';          // /a/ 런타임 캐시 (해시 파일명이라 버전이 달라도 공유한다)
const RT_MAX = 60;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // 하나가 실패해도 설치는 계속한다
    await Promise.allSettled(PRE.map((u) => c.add(u)));
    // 이미 제어 중인 페이지가 있으면(= 업데이트) 알린다. 앱은 홈·모닥불·결말에서만 토스트를 띄운다.
    const cl = await self.clients.matchAll({ type: 'window' });
    if (cl.length) cl.forEach((w) => w.postMessage({ t: 'hb-update', ver: VER }));
    else self.skipWaiting(); // 첫 설치는 기다릴 이유가 없다
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip' || (e.data && e.data.t === 'skip')) self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL && k !== RT) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function trim(c) {
  const ks = await c.keys();
  for (let i = 0; i < ks.length - RT_MAX; i++) await c.delete(ks[i]); // 오래된 것부터
}

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // 다른 출처(SOCKET_URL), 소켓, 헬스체크는 가로채지 않는다
  if (u.origin !== self.location.origin || u.pathname.startsWith('/socket.io/') || u.pathname === '/healthz') return;

  if (r.mode === 'navigate') {
    // network-first (2.5초 타임아웃): 느리거나 실패하면 캐시된 셸, 성공하면 캐시를 갱신
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      const net = fetch('/', { cache: 'no-cache' }).then((res) => { if (res.ok) c.put('/', res.clone()); return res; });
      const hit = () => c.match('/');
      try {
        const res = await Promise.race([net, new Promise((_, rej) => setTimeout(rej, 2500))]);
        return res;
      } catch (_) {
        const h = await hit();
        if (h) { e.waitUntil(net.catch(() => {})); return h; }
        return net;
      }
    })());
    return;
  }

  if (u.pathname.startsWith('/a/')) {
    // cache-first. 파일명에 내용 해시가 있어 영원히 유효하다
    e.respondWith((async () => {
      const hit = await caches.match(r);
      if (hit) return hit;
      let res;
      try { res = await fetch(r); } catch (e) { return new Response('', { status: 504 }); }
      if (res.ok && res.status === 200) {
        const c = await caches.open(RT);
        await c.put(r, res.clone());
        e.waitUntil(trim(c));
      }
      return res;
    })());
  }
});
