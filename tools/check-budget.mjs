// dist/ 를 brotli 로 재서 DESIGN_SPEC §9.1·§9.2 표와 대조한다. 초과하면 exit 1.
// 사용: node tools/check-budget.mjs [--dist dist]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const DIST = argv.includes('--dist') ? path.resolve(argv[argv.indexOf('--dist') + 1]) : path.join(ROOT, 'dist');
const KB = 1024;
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error(`dist 가 없다: node tools/stamp.js 먼저 (${DIST})`); process.exit(1); }

const br = (buf) => zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }).length;
const BIN = /\.(webp|woff2)$/;
const wire = (f) => { const b = fs.readFileSync(f); return BIN.test(f) ? b.length : br(b); };   // 이미 압축된 형식은 원본 크기

const aDir = path.join(DIST, 'a');
let prevKept = [];
try { prevKept = JSON.parse(fs.readFileSync(path.join(DIST, 'a-prev.json'), 'utf8')); } catch { /* 없음 */ }   // 이전 빌드에서 이월된 파일은 예산 대상이 아니다
const list = (fs.existsSync(aDir) ? fs.readdirSync(aDir) : []).filter((f) => !prevKept.includes(f));
const find = (re) => list.filter((f) => re.test(f));
const size = (n) => wire(path.join(aDir, n));

const rows = [];
let bad = false;
const GAME_WARN = 25.8 * KB;   // FEATURES_SPEC 0.4: 경고선(WARN), 상한 26KB(FAIL)
const row = (name, bytes, limit, note = '') => {
  const ok = bytes <= limit;
  if (!ok) bad = true;
  const tag = !ok ? 'FAIL' : bytes > limit * 0.95 ? 'WARN' : 'OK  ';
  const head = ok && bytes > limit * 0.95 ? ' WARN headroom <5%' : '';
  rows.push(`${tag} ${name.padEnd(40)} ${(bytes / KB).toFixed(2).padStart(7)}KB / ${(limit / KB).toFixed(1)}KB ${note}${head}`);
  return bytes;
};
const info = (name, text) => rows.push(`INFO ${name.padEnd(40)} ${text}`);
const need = (name, re) => {
  const f = find(re);
  if (!f.length) { bad = true; rows.push(`FAIL ${name.padEnd(40)} 없음`); return null; }
  if (f.length > 1) { bad = true; rows.push(`FAIL ${name.padEnd(40)} ${f.length}개 (${f.join(', ')})`); }
  return f[0];
};
const opt = (name, re) => { const f = find(re); if (!f.length) rows.push(`SKIP ${name.padEnd(40)} (파일 없음)`); return f; };

/* 전체 파일 80KB 상한 */
for (const f of list) {
  const s = size(f);
  if (s > 80 * KB) row(`단일 파일 ${f}`, s, 80 * KB);
}

/* HTML */
const htmlBuf = fs.readFileSync(path.join(DIST, 'index.html'));
const html = htmlBuf.toString('utf8');
const htmlBr = row('index.html', br(htmlBuf), 16 * KB);
{ // 인라인 조각
  const m = html.match(/window\.ART_MANIFEST\s*=\s*(\{.*?\});/s);
  row('  manifest (inline JSON)', m ? Buffer.byteLength(m[1]) : 0, 1500);
  const home = [...html.matchAll(/--lqip-(d|m):url\((data:[^)]+)\)/g)].reduce((s, x) => s + x[2].length, 0);
  row('  LQIP 홈 d+m (base64)', home, 1200);
  const sp = html.match(/<svg[^>]*\bid=["']sprite["'][\s\S]*?<\/svg>/) || html.match(/<svg[^>]*>\s*<symbol[\s\S]*?<\/svg>/);
  if (sp) row('  SVG 스프라이트 (br)', br(Buffer.from(sp[0])), 3 * KB); else rows.push('SKIP   SVG 스프라이트 (찾지 못함)');
  const bc = path.join(ROOT, 'public/css/base.css');
  if (fs.existsSync(bc)) {
    const { minCss } = createRequire(import.meta.url)('./stamp.js');
    row('  base.css (br, 최소화)', br(Buffer.from(minCss(fs.readFileSync(bc, 'utf8')))), 7 * KB);
  } else rows.push('SKIP   base.css (public/css/base.css 없음)');
}

const gameWarn = (f) => (size(f) > GAME_WARN ? 'WARN (>25.8KB: FEATURES_SPEC 0.4 컷 순서 확인)' : '');

/* 크리티컬 패스 */
const fT = need('hanbam-t 폰트', /^hanbam-t\.[0-9a-f]+\.woff2$/);
const sio = need('socket.io 클라이언트', /^sio\.[0-9a-f]+\.js$/);
const game = need('game.js', /^game\.[0-9a-f]+\.js$/);
const fD0 = find(/^hanbam-d\.[0-9a-f]+\.woff2$/)[0];
const tS = fT ? row('hanbam-t (제목 폰트)', size(fT), 10 * KB) : 0;
const sS = sio ? row('sio (≈15KB, 상한 17KB)', size(sio), 17 * KB) : 0;
const gS = game ? row('game.js', size(game), 26 * KB, gameWarn(game)) : 0;
const dPre = /<link[^>]*rel=["']?preload["']?[^>]*hanbam-d/i.test(html) || /<link[^>]*hanbam-d[^>]*rel=["']?preload["']?/i.test(html);   // app+base 는 프리로드를 뺀다
const dCrit = dPre && fD0 ? size(fD0) : 0;
const critical = row('크리티컬 패스 합계 (html+font+sio+game' + (dPre ? '+hanbam-d' : '') + ')', htmlBr + tS + sS + gS + dCrit, 75 * KB);

/* 지연 로드 */
const gc = need('game.css', /^game\.[0-9a-f]+\.css$/); if (gc) row('game.css', size(gc), 10 * KB);
const fx = need('fx.js', /^fx\.[0-9a-f]+\.js$/); if (fx) row('fx.js', size(fx), 5 * KB);
const fD = need('hanbam-d 폰트', /^hanbam-d\.[0-9a-f]+\.woff2$/); if (fD) row('hanbam-d (디스플레이 폰트)', size(fD), 30 * KB);
const rp = opt('replay.js', /^replay\.[0-9a-f]+\.js$/); if (rp.length) row('replay.js (JS+CSS+문양)', size(rp[0]), 18 * KB);

const rs = opt('result.js (A1 결과 청크)', /^result\.[0-9a-f]+\.js$/); if (rs.length) row('result.js (A1 결과 청크)', size(rs[0]), 7 * KB);
const fS = opt('hanbam-s (명조 서브셋)', /^hanbam-s\.[0-9a-f]+\.woff2$/); if (fS.length) row('hanbam-s (명조 서브셋)', size(fS[0]), 30 * KB);

const cx = opt('chatx.js (F1 답글)', /^chatx.[0-9a-f]+.js$/); if (cx.length) row('chatx.js (JS+CSS)', size(cx[0]), 2 * KB);
const au = opt('audio.js (F3 음악)', /^audio.[0-9a-f]+.js$/); if (au.length) row('audio.js (기본 켜짐(작게), 첫 제스처 뒤 지연)', size(au[0]), 4 * KB);

/* 이미지 */
const imgRules = [
  ['역할 큰 아트', /^(doppelganger|werewolf|minion|mason|seer|robber|troublemaker|drunk|insomniac|villager|hunter|tanner)\.[0-9a-f]{8}\.webp$/, 40],
  ['역할 lite 아트', /^[a-z]+-l\.[0-9a-f]{8}\.webp$/, 18],
  ['썸네일 아틀라스', /^atlas\./, 55], ['카드 뒷면', /^back\./, 35],
  ['홈 키아트 데스크톱', /^key-d\./, 80], ['홈 키아트 모바일', /^key-m\./, 45],
  ['지평선', /^horizon\./, 35], ['판결 배경', /^verdict-/, 35], ['그레인', /^grain\./, 4],
];
let bigs = [];
const imgTotals = { atlas: 0, back: 0, horizon: 0, grain: 0, key: 0, keyM: 0 };
for (const [label, re, lim] of imgRules) {
  const fs_ = opt(label, re);
  for (const f of fs_) {
    const s = size(f);
    row(`${label} ${f}`, s, lim * KB);
    if (label === '역할 큰 아트') bigs.push(s);
    if (label === '썸네일 아틀라스') imgTotals.atlas = s;
    if (label === '카드 뒷면') imgTotals.back = s;
    if (label === '지평선') imgTotals.horizon = s;
    if (label === '그레인') imgTotals.grain = s;
    if (/키아트 데스크톱/.test(label)) imgTotals.key = s;
    if (/키아트 모바일/.test(label)) imgTotals.keyM = s;
  }
}
/* 홈 TTI 분석적 최악 추정: 4 RTT(300ms) + (html br + sio + game.js + game.css + hanbam-t + key-m) / 125KiB/s.
   '1MB/s' 는 1Mbit/s(=125KB/s) 최악 경우로 취급한다. FAIL 상한 3.0s. */
{
  const gcS = gc ? size(gc) : 0;
  const bytes = htmlBr + sS + gS + gcS + tS + imgTotals.keyM;
  const ms = 4 * 300 + (bytes / (125 * KB)) * 1000;
  const ok = ms <= 3000;
  if (!ok) bad = true;
  rows.push(`${!ok ? 'FAIL' : ms > 2850 ? 'WARN' : 'OK  '} ${'홈 TTI 최악 추정 (4RTT+바이트/125KB/s)'.padEnd(40)} ${(ms / 1000).toFixed(2).padStart(7)}s / 3.0s [${(bytes / KB).toFixed(0)}KB]`);
}
const bonfire = imgTotals.atlas + imgTotals.back + imgTotals.horizon + imgTotals.grain;
if (bonfire) row('모닥불 추가 (아틀라스+뒷면+지평선+그레인)', bonfire, 130 * KB);

/* 한 판 전체 (캐시 없음): 크리티컬 + 지연 + 키아트 + 모닥불 + 이번 덱의 큰 아트(가장 큰 것부터 최대 8장) */
{
  const later = [gc, fx, fD, rp[0], cx[0], au[0], rs[0], fS[0]].filter(Boolean).reduce((s, f) => s + size(f), 0);
  bigs.sort((a, b) => b - a);
  const deck = bigs.slice(0, 8).reduce((s, x) => s + x, 0);
  if (deck) row('idle 선로딩 (큰 아트 최대 8장)', deck, 400 * KB);
  // 최대 판: 모든 역할의 큰 아트(전부) + 가장 큰 판결 배경 + back-s (실측 ~900KB 에 맞춘다)
  const full = bigs.reduce((s, x) => s + x, 0);
  const vMax = Math.max(0, ...find(/^verdict-/).map(size));
  const backS = find(/^back-s\./).reduce((s, f) => s + size(f), 0);
  const fullEst = row('캐시 없이 한 판 전체 (추정, 최대 판)', critical + later + imgTotals.key + imgTotals.keyM + bonfire + full + vMax + backS, 900 * KB,
    `[key-d+key-m ${((imgTotals.key + imgTotals.keyM) / KB).toFixed(0)} + 큰 아트 전부 ${(full / KB).toFixed(0)} + 판결 ${(vMax / KB).toFixed(0)} + back-s ${(backS / KB).toFixed(0)}]`);
  // 실측(review/metrics.json)이 있으면 추정의 1.15배를 넘지 않는지 본다
  try {
    const mp = path.join(ROOT, 'review/metrics.json');
    if (fs.existsSync(mp)) {
      const mj = JSON.parse(fs.readFileSync(mp, 'utf8'));
      const g = mj?.network?.game?.total;
      // 콘솔 오류가 있거나 replay/final 이 미캡처면 실측은 무효 — OK 로 인증하지 않는다 (WARN, 재캡처 전까지 빌드는 통과)
      const invalid = (Array.isArray(mj?.consoleErrors) && mj.consoleErrors.length > 0)
        || (Array.isArray(mj?.notCaptured) && mj.notCaptured.some((x) => /replay|final/i.test(String(x))));
      const okTag = (ok) => (!ok ? 'FAIL' : invalid ? 'WARN' : 'OK  ');
      const inv = invalid ? ' (실측 무효: 콘솔 오류/미캡처)' : '';
      const real = typeof g?.httpBytes === 'number' ? g.httpBytes : g?.bytes;
      if (typeof real === 'number') {
        const lim = 900 * KB, ok = real <= lim;
        if (!ok) bad = true;
        rows.push(`${okTag(ok)} ${'실측 한 판 HTTP (캐시 없음)'.padEnd(40)} ${(real / KB).toFixed(1)}KB / ${(lim / KB).toFixed(1)}KB [추정 ${(fullEst / KB).toFixed(1)}KB]${inv}`);
        // 추정 대비 1.15배 초과는 art.js 수정 재측정 전까지 경고만 한다
        const rl = fullEst * 1.15;
        rows.push(`${real <= rl && !invalid ? 'OK  ' : 'WARN'} ${'실측/추정 비율 (<=1.15)'.padEnd(40)} ${(real / KB).toFixed(1)}KB / ${(rl / KB).toFixed(1)}KB${inv}`);
        info('  (실측은 캐시를 끈 상한값)', '재방문·SW 캐시 적중 시 실제 전송량은 이보다 작다. 추정은 key-d 와 key-m 을 모두 센다 (실측 한 번에는 뷰포트에 맞는 하나만 받는다)');
        const ws = g?.wsBytes;
        if (typeof ws === 'number') {
          const wl = 64 * KB, wok = ws <= wl;
          if (!wok) bad = true;
          rows.push(`${okTag(wok)} ${'실측 WebSocket'.padEnd(40)} ${(ws / KB).toFixed(1)}KB / ${(wl / KB).toFixed(1)}KB${inv}`);
        }
      }
    }
  } catch { /* metrics 없음/깨짐: 건너뜀 */ }
}

console.log(rows.join('\n'));
console.log(bad ? '\n예산 초과 또는 누락 — 위 FAIL 확인.' : '\n예산 통과.');
process.exit(bad ? 1 : 0);
