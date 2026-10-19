// socket.io 클라이언트 사본을 public/vendor/ 에 복사한다 (DESIGN_SPEC §9.5).
// 버전은 package-lock.json · node_modules 와 일치해야 한다. 파일명: socket.io.<버전>.min.js
// 사용: node tools/vendor.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const lock = JSON.parse(rd('package-lock.json'));
const lockVer = lock.packages?.['node_modules/socket.io']?.version;
const instVer = JSON.parse(rd('node_modules/socket.io/package.json')).version;
if (!lockVer) throw new Error('package-lock.json 에서 socket.io 버전을 찾지 못했다.');
if (lockVer !== instVer) {
  console.error(`버전 불일치: package-lock=${lockVer}, node_modules=${instVer}. npm ci 후 다시 실행.`);
  process.exit(1);
}

const src = path.join(ROOT, 'node_modules/socket.io/client-dist/socket.io.min.js');
let js = fs.readFileSync(src, 'utf8').replace(/\n?\/\/# sourceMappingURL=.*\s*$/, '\n');
const dir = path.join(ROOT, 'public/vendor');
fs.mkdirSync(dir, { recursive: true });
for (const f of fs.readdirSync(dir)) if (/^socket\.io\.[\d.]+\.min\.js$/.test(f)) fs.unlinkSync(path.join(dir, f));
const out = path.join(dir, `socket.io.${lockVer}.min.js`);
fs.writeFileSync(out, js);
console.log(`vendor: ${path.relative(ROOT, out)} (${js.length} bytes, socket.io ${lockVer})`);
