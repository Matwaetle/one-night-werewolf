#!/usr/bin/env node
'use strict';
/*
 * stamp.js — 한밤의 늑대인간 배포 빌드 (DESIGN_SPEC §9.0).  CJS, 의존성 0.
 * 번들러·트랜스파일 없음: 이어 붙이기, CSS 공백 제거, 토큰 치환, 내용 해시 파일명만 한다.
 *
 * CLI : node tools/stamp.js [--out dist] [--socket-url https://...]   (환경변수 SOCKET_URL 도 가능)
 * API : require('./tools/stamp.js').build({ memory:true })
 *         -> { ver, files: Map<urlPath, {body:Buffer, type:String, cache:'immutable'|'no-cache'}>, warnings:[] }
 *       memory:false(기본)면 outDir(기본 <root>/dist)에 쓰고 같은 객체를 돌려준다.
 *       urlPath 는 '/', '/index.html', '/sw.js', '/a/<이름>' 형태. '/' 와 '/index.html' 은 같은 본문.
 *
 * 입력(public/ 기준):
 *   strings.js roles.js js/art.js js/app.js  -> a/game.<h>.js
 *   css/card.css css/screens.css             -> a/game.<h>.css
 *   js/result.js (+ css/result.css 를 __RESULT_CSS__ 에, strings.js 의 @client:result 구간을 T.body 로 앞에 합친다) -> a/result.<h>.js
 *   js/fx.js                                 -> a/fx.<h>.js
 *   js/replay.js (+ css/replay.css 를 __REPLAY_CSS__ 에 JSON 문자열로) -> a/replay.<h>.js
 *   vendor/socket.io.<ver>.min.js            -> a/sio.<h>.js
 *   fonts/hanbam-t.*.woff2, hanbam-d.*.woff2, img/*.webp -> a/ (이미 해시 파일명이면 그대로)
 *   index.html (템플릿), css/base.css, art-manifest.json, ../art-src/lqip.json, sw.js
 * 토큰 규약: 파일 토큰(__GAME_JS__ 등)은 값이 파일명이고, 템플릿에 '/a/' 가 앞에 붙어 있으면 이름만,
 *           없으면 '/a/<이름>' 으로 치환한다. 둘 다 안전하다.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

const sha = (buf, n = 8) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, n);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
};

/* ---------- CSS 공백 제거 (문자열·url() 보존) ---------- */
function minCss(src) {
  let out = '';
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; out += ' '; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(src.slice(i, i + 4))) {
      let j = i + 4;
      if (src[j] === '"' || src[j] === "'") {
        const q = src[j]; j++;
        while (j < n && src[j] !== q) j += src[j] === '\\' ? 2 : 1;
        j = src.indexOf(')', j);
      } else j = src.indexOf(')', j);
      if (j < 0) j = n - 1;
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  // 문자열이 이미 out 에 들어 있으므로 공백 정리는 문자열 밖에서만 하도록 다시 분할
  const parts = out.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|url\([^)]*\))/i);
  for (let k = 0; k < parts.length; k += 2) {
    parts[k] = parts[k]
      .replace(/\s+/g, ' ')
      .replace(/ ?([{};,>~]) ?/g, '$1')
      .replace(/: /g, ':')
      .replace(/;}/g, '}');
  }
  return parts.join('').trim();
}

// fs.rmSync(recursive) 가 일부 Windows 환경에서 프로세스를 죽여서 직접 지운다
function rmTree(p) {
  let st;
  try { st = fs.lstatSync(p); } catch { return; }
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) rmTree(path.join(p, f)); fs.rmdirSync(p); } else fs.unlinkSync(p);
}

function build(opts = {}) {
  const root = opts.root ? path.resolve(opts.root) : ROOT;
  const pub = path.join(root, 'public');
  const memory = !!opts.memory;
  const outDir = path.resolve(opts.outDir || path.join(root, 'dist'));
  const socketUrl = (opts.socketUrl != null ? opts.socketUrl : process.env.SOCKET_URL || '').replace(/\/+$/, '');
  const warnings = [];
  const warn = (m) => { warnings.push(m); if (!opts.quiet) console.warn('stamp: ' + m); };

  const rdRaw = (p) => fs.readFileSync(p);
  const rd = (rel, required) => {
    const p = path.join(pub, rel);
    if (!fs.existsSync(p)) {
      if (required) throw new Error(`필수 입력이 없다: public/${rel}`);
      warn(`없음(건너뜀): public/${rel}`);
      return null;
    }
    return fs.readFileSync(p, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  };

  const files = new Map();                 // urlPath -> {body,type,cache}
  const put = (url, body, cache) => {
    if (typeof body === 'string') body = Buffer.from(body, 'utf8');
    files.set(url, { body, type: MIME[path.extname(url)] || 'application/octet-stream', cache });
  };
  const hashed = (stem, ext, body) => {     // /a/<stem>.<hash><ext>
    if (typeof body === 'string') body = Buffer.from(body, 'utf8');
    const name = `${stem}.${sha(body)}${ext}`;
    put('/a/' + name, body, 'immutable');
    return name;
  };

  /* JS 최소화: terser(devDependency)가 있으면 쓰고, 없으면 이어붙이기만 한다. 최상위 이름은 그대로 둔다. */
  let minWarned = false;
  const minJs = (code, label) => {
    if (process.env.NO_MINIFY) return code;
    const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, '_min.cjs'), label], { input: code, encoding: 'utf8', maxBuffer: 64 << 20 });
    if (r.status !== 0 || !r.stdout) {
      // 배포 빌드(CLI + CI/RENDER)에서는 원본이 조용히 나가지 않게 실패시킨다. 서버가 부팅 중 메모리 빌드할 때는 해당 없음.
      if (process.env.STAMP_STRICT) throw new Error(`JS 최소화 실패(${label}): terser 가 없다 — npm ci --include=dev`);
      if (!minWarned) { minWarned = true; warn(`JS 최소화 실패(${label}) — 원본을 쓴다 (npm i 로 terser 설치): ${(r.stderr || '').slice(0, 120)}`); } return code; }
    return r.stdout;
  };

  /* 1. game.js */
  const joinJs = (list) => list.filter((s) => s != null).map((s) => s.replace(/\s+$/, '') + '\n').join(';\n');
  // strings.js 표식 처리 (FEATURES_SPEC 0.2). 표식이 없으면 아무것도 하지 않는다.
  const stripClient = (src) => {
    const keep = [], rp = [], cx = [], rs = [];
    let mode = '';
    for (const ln of src.split('\n')) {
      const m = ln.match(/^\s*\/\/ @client:(drop|replay|chatx|result)-(start|end)\s*$/);
      if (m) {
        if (m[2] === 'start') { if (mode) throw new Error('strings.js 표식 중첩: ' + ln.trim()); mode = m[1]; }
        else { if (mode !== m[1]) throw new Error('strings.js 표식 짝 불일치: ' + ln.trim()); mode = ''; }
        continue;
      }
      if (mode === 'drop') continue;
      if (mode === 'replay') { rp.push(ln); continue; }
      if (mode === 'chatx') { cx.push(ln); continue; }
      if (mode === 'result') { rs.push(ln); continue; }
      keep.push(ln);
    }
    if (mode) throw new Error('strings.js 표식이 닫히지 않았다: ' + mode);
    return { game: keep.join('\n'), replay: rp.join('\n').trim(), result: rs.join(String.fromCharCode(10)).trim(), chatx: cx.join('\n').trim() };
  };
  const strRaw = rd('strings.js', true), sc = stripClient(strRaw);
  // result.js (A1 지연 청크) — game.js 보다 먼저 만들어 URL 을 game.js 안의 __RESULT_JS__ 에 넣는다
  let RESULT_JS = '';
  const resSrc = rd('js/result.js');
  if (resSrc != null) {
    const rcss = rd('css/result.css');
    const rlit = rcss != null ? JSON.stringify(minCss(rcss)) : '""';
    let rjs = resSrc.replace(/(['"`])__RESULT_CSS__\1|__RESULT_CSS__/g, () => rlit);
    if (sc.result) rjs = 'Object.assign(window.T.body,{' + sc.result + '\n});\n' + rjs;
    try { new Function(rjs); } catch (e) { throw new Error('result.js 구문 오류: ' + e.message); }
    RESULT_JS = hashed('result', '.js', minJs(rjs, 'result'));
  }
  const gameJs0 = joinJs([sc.game, rd('roles.js', true), rd('js/art.js'), rd('js/app.js')]);
  const gameJs = gameJs0.replace(/(["'`])__RESULT_JS__\1|__RESULT_JS__/g, () => JSON.stringify(RESULT_JS ? '/a/' + RESULT_JS : ''));
  if (sc.game !== strRaw) { try { new Function(gameJs); } catch (e) { throw new Error('game.js 구문 오류(strings.js 표식 처리 뒤): ' + e.message); } }
  const GAME_JS = hashed('game', '.js', minJs(gameJs, 'game'));

  /* 2. game.css */
  const cardCss = rd('css/card.css'), scrCss = rd('css/screens.css');
  const GAME_CSS = hashed('game', '.css', minCss([cardCss, scrCss].filter((s) => s != null).join('\n')));

  /* 3. fx / replay / sio */
  const fxSrc = rd('js/fx.js');
  const FX_JS = fxSrc != null ? hashed('fx', '.js', minJs(fxSrc, 'fx')) : '';
  let REPLAY_JS = '';
  const rpSrc = rd('js/replay.js');
  if (rpSrc != null) {
    const css = rd('css/replay.css');
    const lit = JSON.stringify(css != null ? minCss(css) : '');
    // '__REPLAY_CSS__' / "__REPLAY_CSS__" 는 따옴표째, 맨몸 토큰은 그대로 치환
    let js = rpSrc.replace(/(["'`])__REPLAY_CSS__\1|__REPLAY_CSS__/g, () => lit);
    // game.js 에서 옮겨 온 T.replay 문자열(@client:replay 구간)을 맨 앞에서 합친다. 소스(Node 테스트)는 건드리지 않는다.
    if (sc.replay) js = 'Object.assign(window.T.replay,{' + sc.replay + '\n});\n' + js;
    // 템플릿 문자열 안의 ${...} 와 충돌하지 않도록 JSON 리터럴만 넣는다
    REPLAY_JS = hashed('replay', '.js', minJs(js, 'replay'));
  }
  // chatx.js(+css) — replay 와 같은 방식
  let CHATX_JS = '', AUDIO_JS = '';
  const cxSrc = rd('js/chatx.js');
  if (cxSrc != null) {
    const css = rd('css/chatx.css');
    const lit = JSON.stringify(css != null ? minCss(css) : '');
    let cjs = cxSrc.replace(/(["'`])__CHATX_CSS__\1|__CHATX_CSS__/g, () => lit);
    if (sc.chatx) cjs = 'Object.assign(window.T.chat,{' + sc.chatx + '\n});\n' + cjs;
    CHATX_JS = hashed('chatx', '.js', minJs(cjs, 'chatx'));
  }
  const auSrc = rd('js/audio.js');
  if (auSrc != null) AUDIO_JS = hashed('audio', '.js', minJs(auSrc, 'audio'));
  let SIO = '';
  const vdir = path.join(pub, 'vendor');
  const sioFile = fs.existsSync(vdir) ? fs.readdirSync(vdir).filter((f) => /^socket\.io\.[\d.]+\.min\.js$/.test(f)).sort().pop() : null;
  if (sioFile) SIO = hashed('sio', '.js', rdRaw(path.join(vdir, sioFile)));
  else warn('public/vendor/socket.io.<ver>.min.js 없음 — node tools/vendor.mjs');

  /* 폰트 / 이미지: 이미 내용 해시 이름이면 그대로 복사 */
  const copyDir = (sub, re) => {
    const d = path.join(pub, sub);
    const names = [];
    if (!fs.existsSync(d)) return names;
    for (const f of fs.readdirSync(d)) {
      if (!re.test(f)) continue;
      put('/a/' + f, rdRaw(path.join(d, f)), 'immutable');
      names.push(f);
    }
    return names;
  };
  const fontNames = copyDir('fonts', /\.woff2$/);
  const imgNames = copyDir('img', /\.webp$/);
  const newest = (list, prefix) => {
    const c = list.filter((f) => f.startsWith(prefix));
    if (c.length > 1) warn(`${prefix}* 가 ${c.length}개 — 가장 최근 파일을 쓴다 (public/fonts 의 오래된 것을 지워라)`);
    return c.map((f) => [f, fs.statSync(path.join(pub, 'fonts', f)).mtimeMs]).sort((a, b) => a[1] - b[1]).map((x) => x[0]).pop() || '';
  };
  const FONT_T = newest(fontNames, 'hanbam-t.');
  const FONT_D = newest(fontNames, 'hanbam-d.');
  const FONT_S = newest(fontNames, 'hanbam-s.');
  // 쓰지 않는 폰트는 dist 에서 뺀다
  for (const f of fontNames) if (f !== FONT_T && f !== FONT_D && f !== FONT_S) files.delete('/a/' + f);

  /* 4. manifest: 파일명 -> /a/<파일명>, 실제 있는 파일만 */
  let manifest = {};
  const mText = rd('art-manifest.json');
  if (mText) { try { manifest = JSON.parse(mText); } catch (e) { warn('art-manifest.json 파싱 실패: ' + e.message); } }
  const fix = (v) => {
    if (typeof v === 'string') {
      if (!/\.webp$/.test(v)) return v;
      if (!imgNames.includes(v)) { warn(`manifest 가 없는 이미지를 가리킨다: ${v}`); return undefined; }
      return '/a/' + v;
    }
    if (Array.isArray(v)) return v.map(fix).filter((x) => x !== undefined);
    if (v && typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v)) { const r = fix(v[k]); if (r !== undefined) o[k] = r; }
      return o;
    }
    return v;
  };
  manifest = fix(manifest) || {};
  const manifestJson = JSON.stringify(manifest);
  if (manifestJson.length > 1500) warn(`manifest ${manifestJson.length}B > 1.5KB`);

  /* LQIP (art-src/lqip.json, 커밋됨) */
  let lqip = null;
  const lp = path.join(root, 'art-src', 'lqip.json');
  if (fs.existsSync(lp)) { try { lqip = JSON.parse(fs.readFileSync(lp, 'utf8')); } catch (e) { warn('lqip.json 파싱 실패'); } }
  const lqipDecl = lqip ? Object.keys(lqip).filter((k) => /^data:/.test(lqip[k])).map((k) => `--lqip-${k}:url(${lqip[k]})`).join(';') : '';

  /* 폰트 대체 메트릭 */
  let fm = null;
  const fmp = path.join(root, 'tools', 'font-metrics.json');
  if (fs.existsSync(fmp)) { try { fm = JSON.parse(fs.readFileSync(fmp, 'utf8')); } catch (e) { warn('font-metrics.json 파싱 실패'); } }

  /* ver = a/* 내용 + 템플릿 */
  const tplRaw = rd('index.html', true);
  const swRaw = rd('sw.js');
  const verH = crypto.createHash('sha1');
  for (const k of [...files.keys()].sort()) verH.update(k).update(files.get(k).body);
  verH.update(tplRaw).update(socketUrl).update(swRaw || '').update(manifestJson);
  const ver = verH.digest('hex').slice(0, 8);

  /* index.html */
  let html = tplRaw;
  const fileTok = (tok, name) => {
    const re = new RegExp('(/a/)?' + tok, 'g');
    html = html.replace(re, (m, pre) => (!name ? '' : pre ? pre + name : '/a/' + name));
  };
  const rawTok = (tok, val) => { html = html.split(tok).join(val); };

  if (!FONT_T) {
    warn('hanbam-t 폰트 없음 — @font-face·preload 를 뺀다 (node tools/subset-font.mjs)');
    html = html.replace(/<link\b[^>]*__FONT_T__[^>]*>\s*/g, '').replace(/@font-face\s*\{[^}]*__FONT_T__[^}]*\}\s*/g, '');
  }
  if (!FONT_D) {
    warn('hanbam-d 폰트 없음 — @font-face 를 뺀다');
    html = html.replace(/<link\b[^>]*__FONT_D__[^>]*>\s*/g, '').replace(/@font-face\s*\{[^}]*__FONT_D__[^}]*\}\s*/g, '');
  }
  if (!FONT_S) html = html.replace(/<link\b[^>]*__FONT_S__[^>]*>\s*/g, '').replace(/@font-face\s*\{[^}]*__FONT_S__[^}]*\}\s*/g, '');
  fileTok('__FONT_T__', FONT_T); fileTok('__FONT_D__', FONT_D); fileTok('__FONT_S__', FONT_S);
  fileTok('__RESULT_JS__', RESULT_JS);
  fileTok('__GAME_JS__', GAME_JS); fileTok('__GAME_CSS__', GAME_CSS);
  fileTok('__FX_JS__', FX_JS); fileTok('__REPLAY_JS__', REPLAY_JS); fileTok('__SIO__', SIO);
  fileTok('__CHATX_JS__', CHATX_JS); fileTok('__AUDIO_JS__', AUDIO_JS);

  const baseCss = rd('css/base.css');
  rawTok('__BASE_CSS__', baseCss != null ? minCss(baseCss) : '');

  // __MANIFEST__ : 'ART_MANIFEST=__MANIFEST__' 이면 JSON 만, 아니면 'window.ART_MANIFEST=…;' 문장
  html = html.replace(/(ART_MANIFEST\s*=\s*)__MANIFEST__/g, (m, a) => a + manifestJson);
  html = html.split('__MANIFEST__').join(`window.ART_MANIFEST=${manifestJson};`);

  // __LQIP__ : 선언 블록 안이면 선언만, 아니면 :root{…} 규칙
  html = html.replace(/__LQIP__/g, (m, off, whole) => {
    if (!lqipDecl) return '';
    const before = whole.slice(0, off);
    const inBlock = before.lastIndexOf('{') > before.lastIndexOf('}') || /=\s*["']\s*$/.test(before);
    return inBlock ? lqipDecl + ';' : `:root{${lqipDecl}}`;
  });

  if (fm) {
    rawTok('__SA__', String(fm.sa)); rawTok('__AO__', String(fm.ao)); rawTok('__DO__', String(fm.do));
  } else {
    warn('tools/font-metrics.json 없음 — size-adjust/ascent/descent-override 를 뺀다');
    html = html.replace(/(size-adjust|ascent-override|descent-override)\s*:\s*__(SA|AO|DO)__%\s*;?/g, '');
  }
  {
    const hm = manifest.home || {};
    const pl = (u, mq) => (typeof u === 'string' ? `<link rel="preload" as="image" fetchpriority="high" href="${u}" media="${mq}">` : '');
    const m = pl(hm.m, '(max-width:700px)'), d = pl(hm.d, '(min-width:701px)');
    rawTok('__PRELOAD_KEY_M__', m); rawTok('__PRELOAD_KEY_D__', d); rawTok('__PRELOAD_KEY__', m + d);
  }
  rawTok('__SOCKET_URL__', socketUrl);
  if (!socketUrl) html = html.replace(/<link\b[^>]*rel=["']?preconnect["']?[^>]*href=["']{2}[^>]*>\s*|<link\b[^>]*href=["']{2}[^>]*rel=["']?preconnect["']?[^>]*>\s*/g, '');
  rawTok('__VER__', ver);
  const left = html.match(/__[A-Z][A-Z0-9_]*__/g);
  if (left) warn('치환되지 않은 토큰: ' + [...new Set(left)].join(', '));
  put('/index.html', html, 'no-cache');
  put('/', html, 'no-cache');

  /* 5. sw.js */
  if (swRaw != null) {
    const pre = [];
    // audio.js 는 precache 하지 않는다 (FEATURES_SPEC 0.3)
    for (const n of [GAME_JS, GAME_CSS, FX_JS, SIO, FONT_T, FONT_D, FONT_S, REPLAY_JS, CHATX_JS, RESULT_JS]) if (n) pre.push('/a/' + n);
    // 이미지(back, atlas, grain, horizon, verdict...)는 precache 하지 않는다 - /a/ cache-first 가 런타임에 채운다
    const sw = swRaw.split('__VER__').join(ver).split('__PRECACHE__').join(JSON.stringify(pre));
    put('/sw.js', sw, 'no-cache');
  }

  if (!memory) {
    const rel = path.relative(root, outDir);
    if (rel.startsWith('..') || path.isAbsolute(rel) || rel === '') throw new Error('outDir 은 저장소 안의 하위 폴더여야 한다: ' + outDir);
    // 이전 빌드의 /a/ 파일 중 옛 셸(index.html·sw.js·game.js)이 가리키는 것만 남긴다 — 캐시된 옛 셸이 지연 파일에서 404 나지 않게
    const carry = [];
    try {
      const pa = path.join(outDir, 'a');
      if (fs.existsSync(pa)) {
        const re = /[A-Za-z0-9_-]+\.[0-9a-f]{8}\.(?:js|css|webp|woff2)/g, ref = new Set(), onDisk = new Set(fs.readdirSync(pa));
        const scan = (f) => { try { for (const m of fs.readFileSync(f, 'utf8').matchAll(re)) ref.add(m[0]); } catch { /* 무시 */ } };
        scan(path.join(outDir, 'index.html')); scan(path.join(outDir, 'sw.js'));
        for (const n of [...ref]) if (/^game\..*\.js$/.test(n) && onDisk.has(n)) scan(path.join(pa, n));
        for (const n of ref) if (onDisk.has(n) && !files.has('/a/' + n)) carry.push([n, fs.readFileSync(path.join(pa, n))]);
      }
    } catch { /* 이전 빌드 없음 */ }
    rmTree(outDir);
    for (const [n, b] of carry) { fs.mkdirSync(path.join(outDir, 'a'), { recursive: true }); fs.writeFileSync(path.join(outDir, 'a', n), b); }
    if (carry.length) fs.writeFileSync(path.join(outDir, 'a-prev.json'), JSON.stringify(carry.map((c) => c[0])));
    for (const [url, f] of files) {
      if (url === '/') continue;
      const p = path.join(outDir, url);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, f.body);
    }
  }
  return { ver, files, warnings, outDir, names: { GAME_JS, GAME_CSS, FX_JS, REPLAY_JS, CHATX_JS, AUDIO_JS, RESULT_JS, SIO, FONT_T, FONT_D, FONT_S } };
}

module.exports = { build, minCss };

if (require.main === module) {
  const a = process.argv.slice(2);
  if ((process.env.CI || process.env.RENDER) && !process.env.NO_MINIFY) process.env.STAMP_STRICT = '1';
  const arg = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const r = build({ outDir: arg('--out'), socketUrl: arg('--socket-url') });
  let total = 0;
  for (const [u, f] of r.files) if (u !== '/') total += f.body.length;
  console.log(`stamp: ver ${r.ver}, ${r.files.size - 1} files, ${(total / 1024).toFixed(1)}KB raw -> ${path.relative(process.cwd(), r.outDir) || '.'}`);
}
