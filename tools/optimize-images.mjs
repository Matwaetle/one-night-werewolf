// 오너 PNG -> 3색 재인쇄(duotone) WebP 파이프라인 (DESIGN_SPEC §9.2, §9.3).  오프라인 도구, devDependency: sharp
//
// 입력  art-src/ : card-<role>.png ×12, card-back.png, key-home.png, bg-horizon.png, verdict-{wolf,village,tanner}.png
//                  (있는 것만 처리한다. 일부만 다시 돌려도 기존 manifest 와 합쳐진다)
// 출력  public/img/<이름>.<해시8>.webp,  public/art-manifest.json,  art-src/lqip.json,  public/img/grain.<해시>.webp
//
// 사용: node tools/optimize-images.mjs [--src art-src] [--out public/img] [--manifest public/art-manifest.json] [--lqip art-src/lqip.json]
//
// manifest 모양 (파일명만, '/a/' 접두는 stamp 가 붙인다):
//   { back, atlas, grain, horizon, home:{d,m}, big:{<role>:파일}, lite:{<role>:파일}, verdict:{wolf,village,tanner} }
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { need } from './_load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => path.resolve(ROOT, argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const SRC = opt('--src', 'art-src');
const OUT = opt('--out', 'public/img');
const MANIFEST = opt('--manifest', 'public/art-manifest.json');
const LQIP = opt('--lqip', 'art-src/lqip.json');

const sharp = await need('sharp');
const require = createRequire(import.meta.url);
const { ROLE_ORDER } = require('../public/roles.js');

// 팔레트 (§2) — duotone 출력과 CSS 가 같은 값
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const INK = hex('#0d0b09'), VOID = hex('#070606'), BONE = hex('#d9cbb0'), BLOOD = hex('#8e0f0f');
const KB = 1024;
const WEBP = { effort: 6, smartSubsample: true, preset: 'drawing' };

const log = [];
let failed = false;
const report = (name, buf, limit, note = '') => {
  const ok = buf.length <= limit;
  if (!ok) failed = true;
  log.push(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(34)} ${String(buf.length).padStart(6)}B / ${limit}B ${note}${ok ? '' : '  <- 선이 너무 촘촘하다 — 재생성'}`);
};

/* ---------- 입력: 크롭(+뒷면 좌우 대칭) -> RGB raw ---------- */
async function loadRgb(file, { crop, mirror }) {
  let img = sharp(file).flatten({ background: '#000000' }).removeAlpha();
  const meta = await sharp(file).metadata();
  const W = meta.width, H = meta.height;
  const box = crop ? crop(W, H) : { left: 0, top: 0, width: W, height: H };
  img = img.extract(box);
  let { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  if (mirror) {                         // 왼쪽 절반을 좌우 반전해 오른쪽에 덮어쓴다
    const w = info.width, h = info.height, hw = w >> 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < hw; x++) {
      const a = (y * w + x) * 3, b = (y * w + (w - 1 - x)) * 3;
      data[b] = data[a]; data[b + 1] = data[a + 1]; data[b + 2] = data[a + 2];
    }
  }
  return { data, w: info.width, h: info.height };
}

/* ---------- 3색 재인쇄 ---------- */
// ① 피 마스크 R - max(G,B) > 50  ② 나머지는 회색 -> normalise(1,99) -> median(3) -> 선형 LUT(검정->black, 흰->BONE)  ③ 피를 평탄한 BLOOD 로
async function duotone({ data, w, h }, black) {
  const n = w * h;
  let mask = Buffer.alloc(n);
  for (let i = 0, p = 0; i < n; i++, p += 3) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    mask[i] = r - (g > b ? g : b) > 50 ? 255 : 0;
  }
  // 마스크의 홑점 잡티 제거 (원본 해상도)
  mask = await sharp(mask, { raw: { width: w, height: h, channels: 1 } }).median(3).raw().toBuffer();
  const g = await sharp(data, { raw: { width: w, height: h, channels: 3 } })
    .grayscale().normalise({ lower: 1, upper: 99 }).median(3).raw().toBuffer({ resolveWithObject: true });
  const gray = g.data, gc = g.info.channels;
  const out = Buffer.alloc(n * 3);
  for (let i = 0, p = 0; i < n; i++, p += 3) {
    if (mask[i] > 127) { out[p] = BLOOD[0]; out[p + 1] = BLOOD[1]; out[p + 2] = BLOOD[2]; continue; }
    const t = gray[i * gc] / 255;
    out[p] = Math.round(black[0] + (BONE[0] - black[0]) * t);
    out[p + 1] = Math.round(black[1] + (BONE[1] - black[1]) * t);
    out[p + 2] = Math.round(black[2] + (BONE[2] - black[2]) * t);
  }
  return { data: out, w, h };
}

/* ---------- 인코딩 + 용량 사다리 ---------- */
const enc = (im, step, extra = {}) => {
  let s = sharp(im.data, { raw: { width: im.w, height: im.h, channels: im.ch || 3 } });
  if (step.w) s = s.resize(step.w, step.h, { kernel: 'lanczos3', fit: 'fill' });
  if (step.blur) s = s.blur(step.blur);                // 리사이즈 후 약한 가우시안 — 촘촘한 해칭 선을 뭉개 용량을 줄인다
  return s.webp({ quality: step.q, ...WEBP, ...extra }).toBuffer();
};
async function ladder(im, steps, limit) {
  let last, lastStep;
  for (const st of steps) {
    last = await enc(im, st); lastStep = st;
    if (last.length <= limit) break;
  }
  return { buf: last, step: lastStep };
}

// 용량 사다리 단계 생성: 규격 크기·품질은 유지한 채 블러를 점점 키우고(0 -> 2.5), 그래도 넘으면 q 를 낮추고, 마지막에 작은 크기.
// (§9.3-3 의 "q56 -> 작은 크기" 앞에 블러 단계를 끼워 규격 크기를 지킨다)
const steps = (w, h, q, small) => {
  const out = [];
  for (const blur of [0, 0.5, 0.8, 1.1, 1.5, 2, 2.6]) out.push({ q, w, h, blur });
  for (const blur of [1.5, 2.6]) out.push({ q: q - 6, w, h, blur });
  if (small) out.push({ q: q - 6, w: small[0], h: small[1], blur: 1.5 });
  return out;
};

const hash8 = (b) => crypto.createHash('sha1').update(b).digest('hex').slice(0, 8);
fs.mkdirSync(OUT, { recursive: true });
const writeImg = (stem, buf) => {
  const name = `${stem}.${hash8(buf)}.webp`;
  for (const f of fs.readdirSync(OUT)) {            // 같은 stem 의 이전 해시는 지운다
    const m = f.match(/^(.+)\.[0-9a-f]{8}\.webp$/);
    if (m && m[1] === stem && f !== name) fs.unlinkSync(path.join(OUT, f));
  }
  fs.writeFileSync(path.join(OUT, name), buf);
  return name;
};

let manifest = {};
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { /* 새로 */ }
manifest.big = manifest.big || {}; manifest.lite = manifest.lite || {}; manifest.verdict = manifest.verdict || {}; manifest.home = manifest.home || {};
let lqip = {};
try { lqip = JSON.parse(fs.readFileSync(LQIP, 'utf8')); } catch { /* 새로 */ }
const dataUri = (buf) => 'data:image/webp;base64,' + buf.toString('base64');
const tiny = async (im, w, h) => dataUri(await enc(im, { q: 40, w, h }, { preset: 'default', effort: 4 }));

const vcrop = (W, H) => ({ left: 0, top: Math.round(H * 51 / 1536), width: W, height: H - 2 * Math.round(H * 51 / 1536) }); // 위아래 51px (1536 기준)
const src = (n) => path.join(SRC, n);
const has = (n) => fs.existsSync(src(n));

/* ---------- 역할 카드 ×12 ---------- */
let did = 0;
for (const role of ROLE_ORDER) {
  const f = `card-${role}.png`;
  if (!has(f)) continue;
  did++;
  const im = await duotone(await loadRgb(src(f), { crop: vcrop }), INK);
  const big = await ladder(im, steps(560, 784, 62, [480, 672]), 40 * KB);
  manifest.big[role] = writeImg(role, big.buf);
  report(`${role} (big ${big.step.w}x${big.step.h} q${big.step.q} b${big.step.blur})`, big.buf, 40 * KB);
  const lite = await ladder(im, steps(360, 504, 58, [320, 448]), 18 * KB);
  manifest.lite[role] = writeImg(role + '-l', lite.buf);
  report(`${role} (lite ${lite.step.w}x${lite.step.h} q${lite.step.q} b${lite.step.blur})`, lite.buf, 18 * KB);
}

/* ---------- 썸네일 아틀라스: 176x246 타일, 2행 x 6열 = 1056x492 (ROLE_ORDER 순), 없는 칸은 투명 ---------- */
if (did || !manifest.atlas) {
  const tiles = [];
  for (let i = 0; i < ROLE_ORDER.length; i++) {
    const role = ROLE_ORDER[i], f = manifest.big[role];
    if (!f || !fs.existsSync(path.join(OUT, f))) continue;
    const buf = await sharp(path.join(OUT, f)).resize(176, 246, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer();
    tiles.push({ input: buf, left: (i % 6) * 176, top: Math.floor(i / 6) * 246 });
  }
  if (tiles.length) {
    const canvas = sharp({ create: { width: 1056, height: 492, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(tiles);
    let buf;
    for (const [q, blur] of [[60, 0], [60, 0.5], [60, 0.8], [56, 0.8], [56, 1.1], [52, 1.1], [52, 1.5]]) {
      const c = blur ? sharp(await canvas.clone().png().toBuffer()).blur(blur) : canvas.clone();
      buf = await c.webp({ quality: q, ...WEBP, alphaQuality: 80 }).toBuffer();
      if (buf.length <= 55 * KB) break;
    }
    manifest.atlas = writeImg('atlas', buf);
    report(`atlas (${tiles.length}/12 tiles)`, buf, 55 * KB);
  }
}

/* ---------- 카드 뒷면 ---------- */
if (has('card-back.png')) {
  const im = await duotone(await loadRgb(src('card-back.png'), { crop: vcrop, mirror: true }), VOID);
  const r = await ladder(im, steps(560, 784, 60, [480, 672]), 35 * KB);
  manifest.back = writeImg('back', r.buf);
  report(`card-back (q${r.step.q} b${r.step.blur})`, r.buf, 35 * KB);
  lqip.back = await tiny(im, 20, 28);
  // xs·sm 뒷면은 216x302 로 충분하다 (전체 크기를 40~88px 카드에 줄여 그리지 않는다)
  const rs = await ladder(im, steps(216, 302, 60, [180]), 10 * KB);
  manifest.backS = writeImg('back-s', rs.buf);
  report('card-back-s', rs.buf, 10 * KB);
}

/* ---------- 홈 키아트 ---------- */
if (has('key-home.png')) {
  // 데스크톱: 위 10%·아래 15% 크롭 -> 1280x640
  const d = await duotone(await loadRgb(src('key-home.png'), {
    crop: (W, H) => { const t = Math.round(H * 0.10), b = Math.round(H * 0.15); return { left: 0, top: t, width: W, height: H - t - b }; },
  }), VOID);
  const rd = await ladder(d, steps(1280, 640, 55, [1024, 512]), 80 * KB);
  manifest.home.d = writeImg('key-d', rd.buf);
  report(`key-home desktop 1280x640 (q${rd.step.q} b${rd.step.blur})`, rd.buf, 80 * KB);
  lqip.d = await tiny(d, 24, 12);
  // 모바일: 가운데 세로 크롭 -> 540x864
  const m = await duotone(await loadRgb(src('key-home.png'), {
    crop: (W, H) => { const w = Math.min(W, Math.round(H * 640 / 1024)); return { left: Math.round((W - w) / 2), top: 0, width: w, height: H }; },
  }), VOID);
  const rm = await ladder(m, steps(540, 864, 55, [432, 691]), 45 * KB);
  manifest.home.m = writeImg('key-m', rm.buf);
  report(`key-home mobile 540x864 (q${rm.step.q} b${rm.step.blur})`, rm.buf, 45 * KB);
  lqip.m = await tiny(m, 12, 20);
  const total = lqip.d.length + lqip.m.length;
  if (total > 1200) { failed = true; log.push(`FAIL LQIP 합계 ${total}B > 1.2KB`); } else log.push(`OK   LQIP d+m ${total}B / 1200B`);
}

/* ---------- 지평선 · 판결 ---------- */
if (has('bg-horizon.png')) {
  const im = await duotone(await loadRgb(src('bg-horizon.png'), {
    crop: (W, H) => { const h = Math.round(H * 480 / 1024); return { left: 0, top: H - h, width: W, height: h }; },
  }), VOID);
  const r = await ladder(im, steps(1280, 400, 55, [960, 300]), 35 * KB);
  manifest.horizon = writeImg('horizon', r.buf);
  report(`bg-horizon 1280x400 (q${r.step.q} b${r.step.blur})`, r.buf, 35 * KB);
}
for (const v of ['wolf', 'village', 'tanner']) {
  const f = `verdict-${v}.png`;
  if (!has(f)) continue;
  const im = await duotone(await loadRgb(src(f), {}), VOID);
  const r = await ladder(im, steps(960, 640, 55, [720, 480]), 35 * KB);
  manifest.verdict[v] = writeImg('verdict-' + v, r.buf);
  report(`verdict-${v} 960x640 (q${r.step.q} b${r.step.blur})`, r.buf, 35 * KB);
}

/* ---------- 그레인 타일 128x128 (스크립트 생성, 결정적) ---------- */
{
  let s = 0x9e3779b9;
  const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const z = new Float32Array(128 * 128);               // 표준정규 (Box-Muller), 한 번만 뽑고 sigma 만 바꿔 쓴다
  for (let i = 0; i < z.length; i += 2) {
    const a = Math.sqrt(-2 * Math.log(rnd() || 1e-9)), b = 2 * Math.PI * rnd();
    z[i] = a * Math.cos(b); z[i + 1] = a * Math.sin(b);
  }
  let buf;
  for (const [q, sigma] of [[50, 38], [50, 28], [50, 20], [40, 20], [40, 14]]) {   // 용량 사다리: 대비를 낮춰 압축한다 (그레인은 opacity .07 로만 쓴다)
    const px = Buffer.alloc(z.length);
    for (let i = 0; i < z.length; i++) px[i] = Math.max(0, Math.min(255, Math.round(128 + sigma * z[i])));
    buf = await sharp(px, { raw: { width: 128, height: 128, channels: 1 } }).webp({ quality: q, effort: 6 }).toBuffer();
    if (buf.length <= 4 * KB) break;
  }
  manifest.grain = writeImg('grain', buf);
  report('grain 128x128', buf, 4 * KB);
}

/* ---------- 기록 ---------- */
const clean = (o) => { for (const k of Object.keys(o)) { if (o[k] && typeof o[k] === 'object') { clean(o[k]); if (!Object.keys(o[k]).length) delete o[k]; } } return o; };
const out = clean(JSON.parse(JSON.stringify(manifest)));
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify(out) + '\n');
fs.mkdirSync(path.dirname(LQIP), { recursive: true });
fs.writeFileSync(LQIP, JSON.stringify(lqip) + '\n');
console.log(log.join('\n'));
console.log(`manifest ${JSON.stringify(out).length}B (인라인 시 '/a/' 접두 포함 약 ${JSON.stringify(out).length + (JSON.stringify(out).match(/\.webp/g) || []).length * 3}B, 상한 1500B)`);
if (!did && !has('card-back.png') && !has('key-home.png')) console.log('(art-src/ 에 처리할 PNG 가 없다 — 그레인만 갱신)');
process.exit(failed ? 1 : 0);
