'use strict';
// capture.mjs 가 fork 로 띄우는 서버 래퍼. 테스트 훅(_test.deals)을 IPC 로 열어 준다.
const { _test } = require('../server.js');
process.on('message', (m) => {
  if (m && m.deal) _test.deals.set(m.deal[0], m.deal[1]);
});
if (process.send) process.send({ ready: true });
