#!/usr/bin/env node
/*
 * capture.mjs - 실제 UI 스크린샷 + 성능 지표 수집기 (브라우저를 못 쓰는 리뷰어용)
 *   npm run capture
 * 산출물: review/shots/<viewport>/NN-<label>.png , review/metrics.json
 * 브라우저는 로컬 Chrome/Edge 를 쓴다 (다운로드 안 함). 서버는 TIME_SCALE=0.35 자식 프로세스.
 * 환경변수: CAPTURE_ONLY=mobile,desktop,small,metrics  CAPTURE_BROWSER=<exe 경로>
 */
import { spawnSync, fork } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { io } from 'socket.io-client';

console.log = (...a) => fs.writeSync(1, a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + String.fromCharCode(10));
console.error = (...a) => fs.writeSync(2, a.map((x) => (x && x.stack) || (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + String.fromCharCode(10));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'review');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RUN = Date.now().toString(36);
const ONLY = (process.env.CAPTURE_ONLY || '').split(',').filter(Boolean);
const want = (k) => !ONLY.length || ONLY.includes(k);

const BROWSERS = [process.env.CAPTURE_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
const EXE = BROWSERS.find((p) => fs.existsSync(p));
if (!EXE) { console.error('Chrome/Edge 를 찾지 못했다.'); process.exit(1); }

const report = { notCaptured: [], consoleErrors: [], shots: [] };
const note = (m) => { console.log('  ! ' + m); report.notCaptured.push(m); };

// ---------------------------------------------------------------- 서버
async function freePort() {
  return new Promise((res, rej) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej); });
}
async function startServer() {
  const b = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'stamp.js')], { cwd: ROOT, encoding: 'utf8' });
  if (b.status !== 0) throw new Error('stamp 실패: ' + (b.stderr || b.stdout));
  const port = await freePort();
  const child = fork(path.join(ROOT, 'tools', '_capture-server.cjs'), [], {
    cwd: ROOT, silent: true, env: { ...process.env, PORT: String(port), TIME_SCALE: '0.35', NODE_ENV: 'development' },
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; }); child.stderr.on('data', (d) => { log += d; });
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url + '/'); if (r.ok) return { child, url, port, log: () => log }; } catch { /* 대기 */ }
    await sleep(100);
  }
  child.kill(); throw new Error('서버가 뜨지 않았다: ' + log);
}

// ---------------------------------------------------------------- 봇
const BOT_NAMES = ['철수', '영희', '민수', '지은', '도윤'];
function makeBot(url, i, ctl) {
  const pid = `cap-${RUN}-b${i + 1}`, name = BOT_NAMES[i];
  const s = io(url, { forceNew: true, transports: ['websocket'] });
  const b = { s, pid, name, st: null, done: new Set(), voted: false, chatted: false, readied: false };
  b.emit = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  s.on('state', (st) => { b.st = st; });
  const act = () => {
    const st = b.st; if (!st) return;
    const others = st.players.filter((p) => p.id !== st.me).map((p) => p.id);
    if (st.phase === 'night' && st.prompt && !st.prompt.done && !b.done.has(st.prompt.key)) {
      const p = st.prompt; b.done.add(p.key);
      let d = {};
      if (p.type === 'doppelganger' || p.type === 'robber' || p.type === 'seer') d = { player: others[(i + 1) % others.length] };
      else if (p.type === 'troublemaker') d = { players: [others[0], others[1]] };
      else if (p.type === 'drunk') d = { center: 1 };
      else if (p.type === 'lonewolf') d = { skip: true };
      setTimeout(() => b.emit('nightAction', { ...d, key: p.key }), 300 + Math.random() * 500);
    }
    if (st.phase === 'day') {
      if (i === 0 && ctl.chat && !b.chatted) {
        b.chatted = true;
        setTimeout(() => s.emit('chat', { text: '저는 밤새 아무것도 못 봤어요.' }), 300);
        setTimeout(() => s.emit('chat', { text: '철수 님이 제일 수상해요. 눈을 피했잖아요.' }), 1300);
      }
      if (i === 1 && ctl.chat && !b.chatted) { b.chatted = true; setTimeout(() => s.emit('chat', { text: '나는 강도였어요. 훔친 카드가 늑대인간이었어요.' }), 800); }
      if (ctl.readyDay && !b.readied) { b.readied = true; setTimeout(() => s.emit('ready', { ready: true }), 200 + i * 150); }
    } else b.readied = false;
    if (st.phase === 'vote' && ctl.voteGo && !b.voted) {
      b.voted = true;
      const target = i === 0 ? ctl.hostPid : ctl.wolfPid;
      setTimeout(() => b.emit('vote', { target: target === pid ? others[0] : target }), 200 + i * 150);
    }
  };
  b.timer = setInterval(act, 150);
  b.close = () => { clearInterval(b.timer); s.close(); };
  return b;
}

// ---------------------------------------------------------------- 페이지 계측(모든 문서에 주입)
const INSTRUMENT = (hostPid) => `
(() => {
  Object.defineProperty(document, 'hidden', { get: () => false }); Object.defineProperty(document, 'visibilityState', { get: () => 'visible' }); document.hasFocus = () => true;
  window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true); document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
  try { localStorage.setItem('ww_pid', ${JSON.stringify(hostPid)}); } catch (e) {}
  window.__lt = []; window.__marks = {}; window.__frames = []; window.__t = {};
  window.__mk = (k) => { window.__marks[k] = performance.now(); };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  const fr = (t) => { window.__frames.push(t); requestAnimationFrame(fr); }; requestAnimationFrame(fr);
  const chk = () => {
    const b = document.getElementById('createBtn'), h = document.getElementById('home'), n = document.getElementById('nameInput');
    if (b && b.dataset.act && n && n.getBoundingClientRect().height > 0 && window.__t.form == null) window.__t.form = performance.now();
    if (window.__t.form != null && h && !h.dataset.boot && window.__t.sock == null) window.__t.sock = performance.now();
    if (window.__t.sock == null) requestAnimationFrame(chk);
  }; requestAnimationFrame(chk);
})();`;

// ---------------------------------------------------------------- 페이지 도우미
const VIEWPORTS = {
  mobile: { dir: 'mobile-375x812', width: 375, height: 812, dsf: 2, mobile: true },
  desktop: { dir: 'desktop-1280x800', width: 1280, height: 800, dsf: 1, mobile: false },
  small: { dir: 'small-360x640', width: 360, height: 640, dsf: 2, mobile: true,
    only: new Set(['lobby', 'day', 'vote', 'vote-selected', 'final-top', 'final-bottom']) },
};
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

async function newPage(browser, vp, hostPid, errTag) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, isMobile: vp.mobile, hasTouch: vp.mobile });
  if (vp.mobile) await page.setUserAgent(MOBILE_UA);
  await page.bringToFront();
  try { const c = await page.createCDPSession(); await c.send('Emulation.setFocusEmulationEnabled', { enabled: true }); } catch { /* 무시 */ }
  await page.evaluateOnNewDocument(INSTRUMENT(hostPid));
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`[${errTag}] console.error: ${m.text()} ${m.location()?.url || ''}`); });
  page.on('pageerror', (e) => report.consoleErrors.push(`[${errTag}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!/ABORTED/.test(f)) report.consoleErrors.push(`[${errTag}] requestfailed: ${r.url()} ${f}`); });
  page.on('response', (r) => { if (r.status() >= 400) report.consoleErrors.push(`[${errTag}] HTTP ${r.status()}: ${r.url()}`); });
  return { ctx, page };
}

function ui(page, shotFn) {
  const U = { page, shot: shotFn };
  U.waitMode = (m, t = 60000) => page.waitForFunction((mm) => { const s = document.getElementById('stage'); return s && s.dataset.mode === mm; }, { timeout: t, polling: 100 }, m);
  U.mode = () => page.evaluate(() => (document.getElementById('stage') || {}).dataset?.mode || '');
  U.center = async (sel) => {
    const h = await page.waitForSelector(sel, { visible: true, timeout: 15000 });
    await h.evaluate((e) => e.scrollIntoView({ block: 'nearest' }));
    const b = await h.boundingBox(); if (!b) throw new Error('no box ' + sel);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  U.click = async (sel) => { const c = await U.center(sel); await page.mouse.move(c.x, c.y); await sleep(60); await page.mouse.down(); await sleep(70); await page.mouse.up(); };
  U.hold = async (sel, ms, mid, midAt = 0.55) => {
    const c = await U.center(sel); await page.mouse.move(c.x, c.y); await sleep(40); await page.mouse.down();
    const t0 = Date.now(); if (mid) { await sleep(Math.round(ms * midAt)); await mid(); } await sleep(Math.max(300, ms + 300 - (Date.now() - t0)));
    await page.mouse.up();
  };
  U.has = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().height > 0 && !e.hidden; }, sel);
  U.waitSel = (sel, t = 15000) => page.waitForFunction((s) => { const e = document.querySelector(s); return !!e && e.getBoundingClientRect().height > 0 && !e.hidden; }, { timeout: t, polling: 100 }, sel);
  return U;
}

// ---------------------------------------------------------------- 한 판 진행
// opts: { vp, hostRole, shots(bool), url, page, bots, marks(bool), tag }
async function playGame(U, o) {
  const { page, shot } = U;
  const T = async (name, fn) => {
    try { await fn(); } catch (e) {
      note(`${o.tag}: ${name} - ${String(e.message).split('\n')[0]}`);
      if (process.env.CAPTURE_DEBUG) {
        try {
          fs.mkdirSync(path.join(OUT, 'debug'), { recursive: true });
          await page.screenshot({ path: path.join(OUT, 'debug', `${o.tag}-${name}.png`) });
          console.log('    state:', await page.evaluate(() => JSON.stringify({ phase: document.body.dataset.phase, mode: (document.getElementById('stage') || {}).dataset?.mode, btn: (document.querySelector('.dock-act .btn-main') || {}).outerHTML, band: (document.querySelector('.band-text') || {}).textContent })));
        } catch (x) { /* 무시 */ }
      }
    }
  };
  const mk = (k) => page.evaluate((x) => window.__mk(x), k).catch(() => {});
  const ctl = o.ctl;

  // --- 홈
  await T('home', async () => {
    if (!o.preloaded) await page.goto(o.url, { waitUntil: 'load' });
    await U.waitSel('#nameInput'); await page.waitForFunction(() => !document.getElementById('home').dataset.boot, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await sleep(o.shots ? 2500 : 300);
    await shot('home');
  });
  if (o.homeHook) await o.homeHook();
  await T('rules-modal', async () => {
    if (!o.shots) return;
    await U.click('#lawLink'); await U.waitSel('#modal .law-grid'); await sleep(900); await shot('rules-modal');
    await U.click('#modal .modal-x'); await sleep(300);
  });
  await T('create', async () => {
    await U.click('#nameInput'); await page.keyboard.type('나그네', { delay: 40 });
    await shot('home-name');
    await U.click('#createBtn');
    await U.waitMode('lobby'); await U.waitSel('.lobby-sign'); await sleep(o.shots ? 1200 : 200);
    await shot('lobby-alone');
  });
  const code = await page.evaluate(() => (document.querySelector('.lobby-sign') || {}).textContent || '').catch(() => '');
  if (!/^[A-Z]{4}$/.test(code)) { note(`${o.tag}: 방 코드를 읽지 못함 "${code}"`); throw new Error('no room code'); }

  // 호스트 = seat 0. 역할 강제 (서버 테스트 훅)
  const seer = o.hostRole === 'seer';
  const fixed = seer ? ['seer', 'werewolf', 'doppelganger', 'robber', 'troublemaker', 'minion']
    : ['robber', 'werewolf', 'doppelganger', 'seer', 'troublemaker', 'minion'];
  o.deal([ctl.hostPid, [...fixed, 'werewolf', 'drunk', 'insomniac']]);
  o.bots.length = 0;
  for (let i = 0; i < 5; i++) {
    const b = makeBot(o.url, i, ctl); o.bots.push(b);
    const r = await b.emit('join', { code, name: b.name, playerId: b.pid });
    if (!r || !r.ok) note(`${o.tag}: 봇 입장 실패 ${JSON.stringify(r)}`);
  }
  ctl.wolfPid = o.bots[0].pid;   // seat1 = 늑대
  await T('lobby', async () => {
    await page.waitForFunction(() => /6/.test((document.querySelector('.lobby-count') || {}).textContent || ''), { timeout: 15000 }).catch(() => {});
    await sleep(o.shots ? 1500 : 200);
    await shot('lobby');
  });

  // --- 덱 편집 (호스트 UI): 마을주민 -1, 도플갱어 +1
  await T('deck', async () => {
    await U.click('.fan');
    await U.waitSel('.deck-cell'); await sleep(700);
    const cnt = (r) => page.evaluate((x) => +((document.querySelector(`.deck-cell[data-role="${x}"] output`) || {}).textContent || -1), r);
    if ((await cnt('villager')) > 0) { await U.click('.deck-dec[data-role="villager"]'); await sleep(500); }
    if ((await cnt('doppelganger')) < 1) { await U.click('.deck-inc[data-role="doppelganger"]'); await sleep(500); }
    await shot('deck-sheet');
    const ok = (await cnt('villager')) === 0 && (await cnt('doppelganger')) === 1;
    if (!ok) throw new Error('덱 편집 결과가 기대와 다르다');
    if (U.vp.mobile) { await page.keyboard.press('Escape'); await sleep(600); }   // 시트 닫기
  });
  await T('lobby-ready', async () => { await sleep(500); await shot('lobby-deck-set'); });

  // --- 시작 · 패 확인
  await T('start', async () => {
    await mk('startClick');
    await U.click('.dock-act .btn-main');
    await U.waitMode('check', 15000); await sleep(o.shots ? 700 : 100);
    await shot('card-check-before');
  });
  await T('card-check', async () => {
    const c = await U.center('.check-card'); await page.mouse.move(c.x, c.y); await sleep(50); await page.mouse.down();
    await sleep(900); await shot('card-check-pressing'); await sleep(500);
    await page.mouse.up(); await sleep(300);
  });

  // --- 밤
  await T('night-asleep', async () => {
    await page.waitForFunction(() => { const s = document.getElementById('stage'); return s && s.dataset.mode !== 'check'; }, { timeout: 20000, polling: 100 });
    await sleep(o.shots ? 1800 : 100);
    if ((await U.mode()) === 'sleep') await shot('night-asleep');
  });
  await T('night-awake', async () => {
    await U.waitMode('awake', 30000); await sleep(o.shots ? 200 : 60);
    await shot('night-awake');
    const target = o.bots[0].pid;   // 늑대 자리. 밤 단계가 8초(2.8s 최소)라 서두른다
    await U.click(`.seat-token[data-pid="${target}"]`);
    await U.hold('.dock-act .btn-main', 600, async () => { await shot('night-awake-selected-holding'); }, 0.2);
    if (o.hostRole === 'seer') {   // 강도는 자기 카드가 바뀌어 독에 반영될 뿐 공개 카드 오버레이가 없다
      await U.waitSel('.reveal', 8000); await shot('night-reveal');
      await U.click('.reveal'); await sleep(o.shots ? 700 : 100);
      await shot('night-after-cover');
    } else { await U.waitMode('sleep', 8000); await shot('night-robbed'); }
  });
  await T('night-asleep-2', async () => {
    await U.waitMode('sleep', 8000); await sleep(o.shots ? 1500 : 100); await shot('night-asleep-late');
  });

  // --- 낮
  await T('day', async () => {
    await U.waitMode('day', 40000);
    await mk('dayStart');
    await sleep(o.shots ? 2200 : 300);
    await shot('day');
  });
  await T('chat', async () => {
    if (!o.shots) return;   // 지표 패스는 채팅 시트를 열지 않는다 (시트가 열린 채 남으면 이후 단계를 가린다)
    if (await U.has('.dock-badge')) { await U.click('.dock-badge'); await sleep(900); }
    else { const t = await page.$('.sheet-tab[data-tab=chat], .sheet-tab'); if (t) { await t.click(); await sleep(400); } }
    await U.waitSel('#chatInput', 5000);
    await shot('chat-sheet');
    await U.click('#chatInput'); await page.keyboard.type('나는 예언자예요. 철수는 늑대인간이었어요.', { delay: 25 }); await page.keyboard.press('Enter');
    await sleep(700); await shot('chat-sheet-sent');
    if (U.vp.mobile) { await page.keyboard.press('Escape'); await sleep(600); }   // 닫기 (데스크톱은 상시 노출)
  });
  await T('menu', async () => {
    await U.click('.hud-more'); await U.waitSel('.menu'); await sleep(500); await shot('menu');
    await U.click('#modal .modal-x'); await sleep(300);
  });
  await T('ready', async () => {
    await U.click('.dock-act .btn-main'); await sleep(500); await shot('day-ready');
    ctl.readyDay = true;
  });

  // --- 투표
  await T('vote', async () => {
    await U.waitMode('vote', 40000); await sleep(o.shots ? 1500 : 200);
    await shot('vote');
    await U.click('.band-q'); await sleep(400); await shot('vote-rule'); await U.click('.band-q'); await sleep(300);
    await U.click(`.seat-token[data-pid="${ctl.wolfPid}"]`); await sleep(700);
    await shot('vote-selected');
    await U.hold('.dock-act .btn-main', 600, async () => { await shot('vote-holding'); });
    await sleep(500); await shot('vote-cast');
    ctl.voteGo = true;
  });

  // --- 결말 · 재현
  let replayShots = 0;
  await T('result', async () => {
    await U.waitMode('result', 40000);
    await mk('resultStart');
    const t0 = Date.now(); let started = false;
    // 재현이 시작될 때까지 (최대 6초)
    for (let i = 0; i < 60; i++) { if (await page.evaluate(() => !!document.body.dataset.replay)) { started = true; break; } await sleep(100); }
    if (!started) { note(`${o.tag}: 결말 재현이 자동 시작되지 않음 (replay 속성 없음)`); }
    else {
      await mk('replayStart');
      let n = 0, waited = 0;
      while (Date.now() - t0 < 200000) {
        const on = await page.evaluate(() => !!document.body.dataset.replay);
        if (!on) break;
        const t1 = Date.now();
        try { const w = await page.evaluate(() => { const b = document.querySelector('.rp-main .nm, .rp-main b'); return !!b && /눌러서/.test(b.textContent); }); if (w) await U.click('.rp-main'); } catch { /* 무시 */ }
        n++; if (o.shots && o.vp.dir !== VIEWPORTS.small.dir) { await shot('replay-' + String(n).padStart(2, '0')); replayShots++; }
        // 첫 재현은 카드 교환 장면에서 사람의 탭을 기다린다("눌러서 계속하기"). 찍은 뒤 눌러 이어 간다.
        const st = await page.evaluate(() => { const m = document.querySelector('.rp-main'); return m ? [m.firstChild.textContent, m.lastChild.textContent] : null; });
        if (st && /계속하기/.test(st[0])) { waited++; await U.click('.rp-main').catch(() => {}); }
        await sleep(Math.max(100, 2500 - (Date.now() - t1)));
      }
      await mk('replayEnd'); report.replayTaps = (report.replayTaps || 0) + waited;
    }
    await sleep(o.shots ? 1800 : 300);
    await shot('final-top');
    await page.evaluate(() => {
      const els = [document.scrollingElement, document.getElementById('main'), document.querySelector('.board'), document.getElementById('app'), document.body];
      for (const e of els) if (e && e.scrollHeight > e.clientHeight + 4) e.scrollTop = e.scrollHeight;
    });
    await sleep(700);
    await shot('final-bottom');
    // 맨 아래에서 한 번 더: 끝까지 안 내려갔을 수 있어 보드 내부도 스크롤
    await page.evaluate(() => { const all = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY)); all.forEach((e) => { e.scrollTop = e.scrollHeight; }); });
    await sleep(500); await shot('final-bottom-2');
  });
  await mk('end');
  return { replayShots };
}

// ---------------------------------------------------------------- 스크린샷 패스
async function shotPass(browser, S, key, hostRole) {
  console.log('shotPass enter');
  const vp = { ...VIEWPORTS[key] };
  if (process.env.CAPTURE_ALL) delete vp.only;
  const dir = path.join(OUT, 'shots', vp.dir);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.png')) fs.unlinkSync(path.join(dir, f));
  console.log(`\n== ${vp.dir} (host ${hostRole}) ==`);
  const ctl = { hostPid: `cap-${RUN}-${key}-host`, readyDay: false, voteGo: false, chat: true, wolfPid: null };
  const { ctx, page } = await newPage(browser, vp, ctl.hostPid, vp.dir);
  let n = 0;
  const shot = async (label) => {
    if (vp.only && !vp.only.has(label)) return;
    n++; const f = path.join(dir, `${String(n).padStart(3, '0')}-${label}.png`);
    await page.screenshot({ path: f, type: 'png' });
    report.shots.push(path.relative(ROOT, f).replace(/\\/g, '/'));
  };
  const U = ui(page, shot); U.vp = vp;
  const bots = [];
  try {
    await playGame(U, { vp, hostRole, shots: true, url: S.url, bots, ctl, tag: vp.dir, deal: (d) => S.child.send({ deal: d }) });
  } catch (e) { note(`${vp.dir}: 진행 중단 - ${e.message}`); }
  bots.forEach((b) => b.close());
  await ctx.close();
}

// ---------------------------------------------------------------- 지표
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

async function metricsPassNet(browser, S) {
  console.log('\n== metrics: network (latency 300ms, 1MB/s down, 0.5MB/s up, cache off) ==');
  const vp = VIEWPORTS.mobile;
  const ctl = { hostPid: `cap-${RUN}-mnet-host`, readyDay: false, voteGo: false, chat: false, wolfPid: null };
  const { ctx, page } = await newPage(browser, vp, ctl.hostPid, 'metrics-net');
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.setBypassServiceWorker', { bypass: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 1_000_000, uploadThroughput: 500_000 });
  const reqs = new Map(); let http = 0, ws = 0, wsFrames = 0;
  const kinds = {};
  cdp.on('Network.requestWillBeSent', (e) => { if (!e.request.url.startsWith('data:')) reqs.set(e.requestId, { url: e.request.url, type: e.type, bytes: 0, done: false }); });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.done = true; http += e.encodedDataLength; kinds[r.type] = (kinds[r.type] || 0) + e.encodedDataLength; } });
  cdp.on('Network.webSocketFrameReceived', (e) => { ws += (e.response.payloadData || '').length; wsFrames++; });
  cdp.on('Network.webSocketFrameSent', (e) => { ws += (e.response.payloadData || '').length; wsFrames++; });
  const snap = () => ({ requests: reqs.size, httpBytes: http, wsBytes: ws, bytes: http + ws });
  const U = ui(page, async () => {}); U.vp = vp;
  const bots = []; const out = {};
  try {
    const t0 = Date.now();
    await page.goto(S.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__t && window.__t.form != null, { timeout: 120000, polling: 50 });
    const form = snap();
    await page.waitForFunction(() => window.__t.sock != null, { timeout: 120000, polling: 50 });
    const sock = snap();
    const tm = await page.evaluate(() => ({ form: window.__t.form, sock: window.__t.sock, nav: (performance.getEntriesByType('navigation')[0] || {}).responseStart, fcp: (performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint') || {}).startTime }));
    await sleep(4000);
    const settled = snap();
    const topReq = [...reqs.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 8).map((r) => ({ url: r.url.replace(S.url, ''), bytes: r.bytes, type: r.type }));
    const netInfo = await page.evaluate(() => ({ dataNet: document.documentElement.dataset.net || null, effectiveType: (navigator.connection || {}).effectiveType || null }));
    const keyArtReq = [...reqs.values()].some((r) => /\/a\/key-/.test(r.url));
    if (!keyArtReq) note('metrics-net: 4초 안에 홈 키아트가 요청되지 않았다 (dataset.net=' + netInfo.dataNet + ')');
    out.home = {
      ...netInfo, keyArtRequestedWithin4s: keyArtReq,
      formInteractiveMs: Math.round(tm.form), socketReadyMs: Math.round(tm.sock), firstContentfulPaintMs: Math.round(tm.fcp || 0), responseStartMs: Math.round(tm.nav || 0),
      beforeFormInteractive: form, beforeSocketReady: sock, afterSettled4s: settled, heaviestRequests: topReq,
    };
    console.log('  home', JSON.stringify(out.home.beforeFormInteractive), out.home.formInteractiveMs + 'ms');
    // 홈 상태에서 이어서 한 판. playGame 은 goto 를 다시 하므로 여기서는 홈 훅으로 건너뛴다
    const pre = snap();
    const res = await playGame(U, { vp, hostRole: 'seer', shots: false, preloaded: true, url: S.url, bots, ctl, tag: 'metrics-net', deal: (d) => S.child.send({ deal: d }) });
    void res;
    const total = snap();
    out.game = { note: '홈 로드부터 결말 재현 종료까지 한 판 ', total, afterFirstHomeLoad: { requests: total.requests - pre.requests, bytes: total.bytes - pre.bytes }, byResourceType: kinds, wsFrames };
    out.game.durationSec = Math.round((Date.now() - t0) / 1000);
    out.websocketThrottleNote = 'Chrome CDP 네트워크 제한은 WebSocket 프레임에 적용되지 않는다. HTTP(문서/에셋/폴링)에만 지연·대역폭이 걸린다.';
  } catch (e) { note(`metrics-net: ${e.message}`); }
  bots.forEach((b) => b.close());
  await ctx.close();
  return out;
}

async function metricsPassCpu(browser, S) {
  console.log('\n== metrics: CPU throttle x6 ==');
  const vp = VIEWPORTS.mobile;
  const ctl = { hostPid: `cap-${RUN}-mcpu-host`, readyDay: false, voteGo: false, chat: true, wolfPid: null };
  const { ctx, page } = await newPage(browser, vp, ctl.hostPid, 'metrics-cpu');
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const U = ui(page, async () => {}); U.vp = vp;
  const bots = []; const out = {};
  try {
    await playGame(U, { vp, hostRole: 'seer', shots: false, url: S.url, bots, ctl, tag: 'metrics-cpu', deal: (d) => S.child.send({ deal: d }) });
    const d = await page.evaluate(() => ({ lt: window.__lt, marks: window.__marks, frames: window.__frames }));
    const M = d.marks;
    const seg = (a, b) => {
      if (M[a] == null || M[b] == null) return null;
      const lt = d.lt.filter(([s]) => s >= M[a] && s <= M[b]);
      const fr = d.frames.filter((t) => t >= M[a] && t <= M[b]);
      const dts = []; for (let i = 1; i < fr.length; i++) dts.push(fr[i] - fr[i - 1]);
      const sec = (M[b] - M[a]) / 1000;
      return {
        seconds: +sec.toFixed(1), longTasks: lt.length, longTaskTotalMs: Math.round(lt.reduce((s, x) => s + x[1], 0)),
        longTaskMaxMs: Math.round(Math.max(0, ...lt.map((x) => x[1]))), longTaskList: lt.map((x) => ({ atMs: Math.round(x[0] - M[a]), durMs: Math.round(x[1]) })).slice(0, 40),
        fpsAvg: +(fr.length / sec).toFixed(1), frameP95Ms: Math.round(pct(dts, 0.95)), framesOver50ms: dts.filter((x) => x > 50).length,
      };
    };
    out.cpuThrottle = 6;
    out.nightTransitions = seg('startClick', 'dayStart');
    out.replay = seg('replayStart', 'replayEnd');
    out.wholeGame = seg('startClick', 'end');
    if (!out.replay) note('metrics-cpu: replay 구간 표식이 없어 FPS 를 못 쟀다');
  } catch (e) { note(`metrics-cpu: ${e.message}`); }
  bots.forEach((b) => b.close());
  await ctx.close();
  return out;
}

// ---------------------------------------------------------------- main
(async () => {
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  let S = null, browser = null;
  const cleanup = async () => {
    try { if (browser) await browser.close(); } catch { /* 무시 */ }
    try { if (S) S.child.kill(); } catch { /* 무시 */ }
  };
  process.on('SIGINT', async () => { await cleanup(); process.exit(130); });
  try {
    S = await startServer();
    console.log(`서버 ${S.url} (TIME_SCALE=0.35), 브라우저 ${EXE}`);
    browser = await puppeteer.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb', '--lang=ko-KR', '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
    console.log('browser launched');
    if (want('mobile')) await shotPass(browser, S, 'mobile', 'seer');
    if (want('desktop')) await shotPass(browser, S, 'desktop', 'robber');
    if (want('small')) await shotPass(browser, S, 'small', 'seer');
    const metrics = { generatedAt: new Date().toISOString(), conditions: { serverTimeScale: 0.35, browser: await browser.version() } };
    if (want('metrics')) {
      metrics.network = await metricsPassNet(browser, S);
      metrics.cpu = await metricsPassCpu(browser, S);
    }
    metrics.consoleErrors = report.consoleErrors;
    metrics.notCaptured = report.notCaptured;
    metrics.shotCount = report.shots.length;
    fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
    console.log(`\n스크린샷 ${report.shots.length}장, review/metrics.json 기록. 콘솔 오류 ${report.consoleErrors.length}건, 못 찍은 것 ${report.notCaptured.length}건.`);
  } catch (e) {
    console.error('capture 실패:', e);
    process.exitCode = 1;
  } finally {
    await cleanup();
    process.exit(process.exitCode || 0);
  }
})();
