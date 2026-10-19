// Song Myung 서브셋 2벌 생성 (DESIGN_SPEC §3).  오프라인 도구, devDependency: subset-font (wasm)
//   ① hanbam-t.<hash>.woff2 : T.title 전부 + 숫자·라틴 기호 (≤10KB, preload)
//   ② hanbam-d.<hash>.woff2 : 디스플레이 그룹(T.title T.btn T.head T.phase T.verdict T.stamp) + 역할명 + TEAM_NAME + ①의 ASCII (≤30KB)
// 글자 목록은 손으로 관리하지 않는다: strings.js / roles.js 를 순회해서 만든다. 문구를 바꾸면 다시 실행.
//
// 사용: node tools/subset-font.mjs [--font art-src/fonts/SongMyung-Regular.ttf] [--out public/fonts] [--fetch]
//   --fetch : 원본 TTF 가 없으면 Google Fonts 저장소(OFL)에서 art-src/fonts/ 로 내려받는다 (사람이 직접 실행할 때만)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { need } from './_load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const FONT = path.resolve(ROOT, opt('--font', 'art-src/fonts/SongMyung-Regular.ttf'));
const OUT = path.resolve(ROOT, opt('--out', 'public/fonts'));
const LIMIT_T = 10 * 1024, LIMIT_D = 30 * 1024;
const FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/songmyung/SongMyung-Regular.ttf';

if (!fs.existsSync(FONT)) {
  if (argv.includes('--fetch')) {
    console.log(`내려받는 중: ${FONT_URL}`);
    const res = await fetch(FONT_URL);
    if (!res.ok) { console.error('다운로드 실패 ' + res.status); process.exit(1); }
    fs.mkdirSync(path.dirname(FONT), { recursive: true });
    fs.writeFileSync(FONT, Buffer.from(await res.arrayBuffer()));
  } else {
    console.error(`원본 폰트가 없다: ${path.relative(ROOT, FONT)}\n` +
      `  node tools/subset-font.mjs --fetch   (또는)\n  curl -L -o "art-src/fonts/SongMyung-Regular.ttf" --create-dirs ${FONT_URL}`);
    process.exit(1);
  }
}

const require = createRequire(import.meta.url);
const T = require('../public/strings.js');
const R = require('../public/roles.js');
const subsetFont = await need('subset-font');

const strip = (s) => String(s).replace(/\$\{[^}]*\}/g, '').replace(/\{[A-Za-z_][\w.]*(?::[^}]*)?\}/g, '').replace(/<[^>]+>/g, '');
const collect = (v, out) => {
  if (typeof v === 'string') out.push(strip(v));
  else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collect(x, out));
};
const gather = (...vals) => { const o = []; vals.forEach((v) => collect(v, o)); return o.join(''); };

const ASCII_T = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'IVX—·.,?()/:×' + ' ';
// 홈 화면 버튼 라벨(.home-form .lbl 은 --f-title)은 제목 서브셋에 넣어 홈에서 디스플레이 폰트(30KB)를 끌어오지 않게 한다.
const HOME_BTN = ['open', 'join', 'otherTown', 'law', 'or'];
const textT = gather(T.title, HOME_BTN.map((k) => T.btn[k])) + ASCII_T;
const display = gather(T.title, T.btn, T.head, T.phase, T.verdict, T.stamp);
const roleNames = Object.values(R.ROLES).map((r) => r.name).join('');
const textD = display + roleNames + gather(R.TEAM_NAME) + ASCII_T;
const uniq = (s) => [...new Set([...s].filter((c) => c.codePointAt(0) >= 0x20 && !/[\u0000-\u001f]/.test(c)))].sort().join('');

const ttf = fs.readFileSync(FONT);
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/^hanbam-[td]\.[0-9a-f]+\.woff2$/.test(f)) fs.unlinkSync(path.join(OUT, f));

let bad = false;
for (const [stem, text, limit] of [['hanbam-t', uniq(textT), LIMIT_T], ['hanbam-d', uniq(textD), LIMIT_D]]) {
  const buf = Buffer.from(await subsetFont(ttf, text, { targetFormat: 'woff2', noHinting: true, noLayoutClosure: true, keepFeatures: [], dropTables: ['gasp', 'DSIG', 'kern'] }));
  const name = `${stem}.${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8)}.woff2`;
  fs.writeFileSync(path.join(OUT, name), buf);
  const ok = buf.length <= limit;
  if (!ok) bad = true;
  console.log(`${name}  ${[...text].length}자  ${buf.length}B (상한 ${limit}B) ${ok ? 'OK' : 'FAIL: 디스플레이 그룹의 문장을 T.body 로 옮겨라 (W2 결정)'}`);
}
process.exit(bad ? 1 : 0);
