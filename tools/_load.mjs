// 선택 의존성(sharp, subset-font) 로더. 저장소에 설치돼 있으면 그것을, 없으면
// 환경변수 TOOLS_NODE_MODULES(= node_modules 를 품은 폴더)에서 찾는다. 둘 다 없으면 안내하고 종료한다.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function need(name) {
  try { const m = await import(name); return m.default ?? m; } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  }
  const extra = process.env.TOOLS_NODE_MODULES;
  if (extra) {
    try {
      const req = createRequire(path.join(path.resolve(extra), 'package.json'));
      const m = await import(pathToFileURL(req.resolve(name)).href);
      return m.default ?? m;
    } catch { /* 아래 안내로 */ }
  }
  console.error(`'${name}' 가 설치돼 있지 않다.  npm i -D ${name}  (package.json 은 W1 소유 — devDependencies 에 sharp, subset-font 필요)`);
  process.exit(2);
}
