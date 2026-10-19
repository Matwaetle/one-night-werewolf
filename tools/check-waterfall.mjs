// 차가운 클라이언트처럼 `/` 를 받아 preload·script·link 를 따라가, "홈 입력 가능"까지의 요청을 단언한다 (DESIGN_SPEC §9.3-9).
//   요청 <= 5개, 전송량(br) <= 75KB, 제3자 호스트 0 (허용: 정적 출처, SOCKET_URL 출처), 모든 응답 200
//   /a/* 는 immutable, / 는 no-cache 헤더 확인
// 사용: node tools/check-waterfall.mjs [--dist dist] [--socket-url https://...]   dist 를 임시 서버로 띄워 검사한다(끝나면 종료)
//       node tools/check-waterfall.mjs --url https://정적사이트 [--socket-url ...]   이미 떠 있는 곳을 검사한다
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const MAX_REQ = 5, MAX_BYTES = 75 * 1024;
const socketOrigin = (() => {
  const s = arg('--socket-url', process.env.SOCKET_URL || '');
  try { return s ? new URL(s).origin : ''; } catch { return ''; }
})();

/* ---- 임시 정적 서버 (dist, 시작 시 1회가 아니라 첫 요청 때 1회 압축해 캐시) ---- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serveDist(dist) {
  const cache = new Map();
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel);
    const p = path.join(dist, rel);
    let v = null;
    if (p.startsWith(dist) && fs.existsSync(p) && fs.statSync(p).isFile()) {
      const raw = fs.readFileSync(p), ext = path.extname(p);
      v = { raw, type: MIME[ext] || 'application/octet-stream', br: /\.(js|css|html|json)$/.test(ext) ? zlib.brotliCompressSync(raw) : null };
    }
    cache.set(rel, v);
    return v;
  };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.slice(1));
    const f = load(rel);
    if (!f) { res.writeHead(404); return res.end('404'); }
    const h = { 'Content-Type': f.type, Vary: 'Accept-Encoding' };
    h['Cache-Control'] = u.pathname.startsWith('/a/') ? 'public, max-age=31536000, immutable' : 'no-cache';
    let body = f.raw;
    if (f.br && /\bbr\b/.test(req.headers['accept-encoding'] || '')) { h['Content-Encoding'] = 'br'; body = f.br; }
    h['Content-Length'] = body.length;
    res.writeHead(200, h);
    res.end(body);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}

/* ---- 요청: 전송된(압축된) 바이트를 센다 ---- */
function get(url) {
  return new Promise((ok, no) => {
    const lib = url.startsWith('https:') ? https : http;
    lib.get(url, { headers: { 'Accept-Encoding': 'br, gzip', 'User-Agent': 'check-waterfall' } }, (res) => {
      const ch = [];
      res.on('data', (c) => ch.push(c));
      res.on('end', () => {
        const wire = Buffer.concat(ch);
        const enc = res.headers['content-encoding'];
        let body = wire;
        try { body = enc === 'br' ? zlib.brotliDecompressSync(wire) : enc === 'gzip' ? zlib.gunzipSync(wire) : wire; } catch { /* 그대로 */ }
        ok({ status: res.statusCode, headers: res.headers, wire: wire.length, body });
      });
    }).on('error', no);
  });
}

let local = null;
let base = arg('--url', '');
if (!base) {
  const dist = path.resolve(arg('--dist', path.join(ROOT, 'dist')));
  if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('dist 가 없다: node tools/stamp.js 먼저'); process.exit(1); }
  local = await serveDist(dist);
  base = local.base;
}
base = base.replace(/\/+$/, '');
const baseOrigin = new URL(base).origin;

const fails = [], lines = [];
const fail = (m) => fails.push(m);
const reqs = [];

const root = await get(base + '/');
reqs.push({ url: base + '/', ...root });
if (root.status !== 200) fail(`/ -> ${root.status}`);
const html = root.body.toString('utf8');
if (!/no-cache|no-store|max-age=0/.test(root.headers['cache-control'] || '')) fail(`/ 의 Cache-Control 이 no-cache 가 아니다: ${root.headers['cache-control']}`);

/* ---- 크리티컬 리소스 수집 ---- */
const want = new Set();
const add = (u) => {
  if (!u || /^(data:|blob:|javascript:|#)/.test(u)) return;
  try { want.add(new URL(u, base + '/').href); } catch { /* 무시 */ }
};
for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
  const t = m[0];
  const rel = (t.match(/\brel=["']?([\w\s-]+)/i) || [])[1] || '';
  const href = (t.match(/\bhref=["']([^"']*)["']/i) || [])[1];
  if (/\b(preload|stylesheet|modulepreload)\b/i.test(rel)) add(href);
}
for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) add(m[1]);
for (const m of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) add(m[1]);
// 인라인 CSS 의 url(): preload 되지 않은 폰트(Hanbam 디스플레이 등)는 지연 로드이므로 세지 않는다
for (const st of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
  for (const m of st[1].matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const u = m[1];
    if (/\.woff2?(\?|$)/.test(u)) continue;      // 폰트는 preload 링크로만 센다
    add(u);
  }
}

for (const u of want) {
  const r = await get(u);
  reqs.push({ url: u, ...r });
  if (r.status !== 200) fail(`${u} -> ${r.status}`);
  const p = new URL(u).pathname;
  const cc = r.headers['cache-control'] || '';
  if (new URL(u).origin === baseOrigin && p.startsWith('/a/') && !/immutable/.test(cc)) fail(`${p}: Cache-Control immutable 이 아니다 (${cc})`);
}

/* ---- 단언 ---- */
const total = reqs.reduce((s, r) => s + r.wire, 0);
const hosts = new Set();
const allowed = new Set([baseOrigin, socketOrigin].filter(Boolean));
for (const r of reqs) {
  const o = new URL(r.url).origin;
  if (!allowed.has(o)) fail(`제3자 요청: ${r.url}`);
}
// 문서 안의 외부 URL (속성·인라인 CSS·인라인 JS 문자열). XML 네임스페이스는 요청이 아니므로 제외
const NS = /^https?:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink|1998\/Math\/MathML)$/;
for (const m of html.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi)) {
  let u = m[0];
  if (u.startsWith('//')) u = 'https:' + u;
  if (NS.test(u.replace(/[#?].*$/, ''))) continue;
  let o;
  try { o = new URL(u).origin; } catch { continue; }
  if (!allowed.has(o)) hosts.add(o);
}
if (hosts.size) fail(`HTML 에 허용되지 않은 호스트: ${[...hosts].join(', ')}`);
if (reqs.length > MAX_REQ) fail(`요청 ${reqs.length}개 > ${MAX_REQ}`);
if (total > MAX_BYTES) fail(`전송량 ${(total / 1024).toFixed(1)}KB > 75KB`);

for (const r of reqs) lines.push(`  ${String(r.status).padEnd(3)} ${(r.wire / 1024).toFixed(2).padStart(7)}KB  ${r.url.replace(base, '') || '/'}`);
console.log(`홈 입력 가능 전 요청 ${reqs.length}개 (<= ${MAX_REQ}), 전송 ${(total / 1024).toFixed(1)}KB (<= 75KB), 허용 출처: ${[...allowed].join(', ')}`);
console.log(lines.join('\n'));
if (local) await new Promise((ok) => { local.srv.closeAllConnections?.(); local.srv.close(ok); });
if (fails.length) { console.log('\nFAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('\nOK');
process.exit(0);
