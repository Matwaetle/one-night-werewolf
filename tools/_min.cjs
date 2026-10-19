// stdin 의 JS 를 terser 로 줄여 stdout 에 쓴다 (stamp.js 가 동기 호출용으로 부른다). 최상위 이름은 건드리지 않는다.
'use strict';
let src = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { src += c; });
process.stdin.on('end', async () => {
  try {
    const { minify } = require('terser');
    const r = await minify(src, { compress: { ecma: 2020, passes: 3, unsafe: true, unsafe_arrows: true, unsafe_methods: true, hoist_funs: true, pure_getters: true }, mangle: { toplevel: false }, format: { comments: false, ascii_only: false } });
    process.stdout.write(r.code);
  } catch (e) { process.stderr.write(String(e && e.message || e)); process.exit(2); }
});
