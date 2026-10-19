// 폰트 서브셋에 들어갈 글자 목록. subset-font.mjs 와 check-budget.mjs 가 같이 쓴다.
// 문구(strings.js / roles.js)를 바꾸면 npm run subset 을 다시 돌려야 한다. check-budget 이 어긋남을 잡는다.
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const strip = (s) => String(s).replace(/\$\{[^}]*\}/g, '').replace(/\{[A-Za-z_][\w.]*(?::[^}]*)?\}/g, '').replace(/<[^>]+>/g, '');
const collect = (v, out) => {
  if (typeof v === 'string') out.push(strip(v));
  else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collect(x, out));
};
const gather = (...vals) => { const o = []; vals.forEach((v) => collect(v, o)); return o.join(''); };
const uniq = (s) => [...new Set([...s].filter((c) => c.codePointAt(0) >= 0x20 && !/[\u0000-\u001f]/.test(c)))].sort().join('');

export function charsets() {
  for (const p of ['../public/strings.js', '../public/roles.js']) delete require.cache[require.resolve(p)];
  const T = require('../public/strings.js');
  const R = require('../public/roles.js');
  const B = T.body || {};
  const ASCII_T = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'IVX—·.,?()/:×' + ' ';
  // 홈 화면 버튼 라벨(.home-form .lbl)과 방 코드 입력칸 placeholder(#codeInput)는 --f-title 이므로 제목 서브셋에 넣는다.
  const HOME_BTN = ['open', 'join', 'otherTown', 'law', 'or'];
  const textT = gather(T.title, HOME_BTN.map((k) => T.btn[k]), B.codePh) + ASCII_T;
  // 본문 문장이지만 디스플레이 폰트로 그려지는 것들(.night-msg .check-t1 .deck-count 카드 위 도장 등)
  const bodyInDisplay = gather(B.closeEyes, B.yourCard, B.yourCardIs, B.deckCount, B.deckHint);
  const display = gather(T.title, T.btn, T.head, T.phase, T.verdict, T.stamp);
  const roleNames = Object.values(R.ROLES).map((r) => r.name).join('');
  const textD = display + bodyInDisplay + '처형' + roleNames + gather(R.TEAM_NAME) + ASCII_T;
  const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
  const t = uniq(textT), d = uniq(textD);
  return { t, d, hash: { t: sha(t), d: sha(d) } };
}
