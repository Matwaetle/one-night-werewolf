/* replay.js - Night record (SPEC 13). UMD; Node uses build() only. Terse on purpose: br budget 7KB incl. CSS. */
((root) => {
'use strict';
let T = root.T, RL = root.ROLES, TEAM = root.WW && root.WW.TEAM_NAME;
if (typeof window === 'undefined') { T = require('../strings.js'); const r = require('../roles.js'); RL = r.ROLES; TEAM = r.TEAM_NAME; }
const RP = T.replay, UI = Object.assign({}, RP.ui, RP.uiR), AL = T.altar, CSS = '__REPLAY_CSS__', fm = T.fmt, esc = T.esc;
const WAKE = { werewolf: 1, minion: 1, mason: 1, insomniac: 1 }, SLEEP = { villager: 1, hunter: 1, tanner: 1 };
const DAY = { dawn: 1, seat: 1, vote: 1, exec: 1, nodeath: 1, hunt: 1, verdict: 1 }, JUDGE = { vote: 1, exec: 1, nodeath: 1, hunt: 1, verdict: 1 };
const GA = { seat: 'dawn', exec: 'vote', nodeath: 'vote', hunt: 'vote' }, rn = (r) => RL[r].name;

/* ---------- build: pure ---------- */
function build(R, meId) {
  const N = R.night, P = R.players, n = P.length, D = N.deal, E = N.end, ev = N.ev, B = [], TR = [], pos = D.map((_, i) => i);
  const me = P.findIndex((p) => p.id === meId), ce = ev.find((e) => e.k === 'copy'), cA = ce ? D[ce.see[0][0]] : 0;
  const eff = (c) => D[c] === 'doppelganger' && cA ? cA : D[c];
  const cn = (c) => D[c] === 'doppelganger' && cA ? fm(RP.copyOf, { r: rn(cA) }) : rn(eff(c));
  const nm = (s) => ({ t: P[s].name, h: '<b class="nm">' + esc(P[s].name) + '</b>' });
  const chip = (r) => ({ t: rn(r), h: '<span class="rp-rc"><svg><use href="#' + RL[r].sigil + '"/></svg>' + esc(rn(r)) + '</span>' });
  const cc = (c) => ({ t: cn(c), h: '<span class="rp-rc"><svg><use href="#' + RL[D[c]].sigil + '"/></svg>' + esc(cn(c)) + '</span>' });
  const join = (a, sep = RP.sep) => ({ t: a.map((x) => x.t).join(sep), h: a.map((x, i) => '<span class="nw">' + x.h + (i < a.length - 1 ? sep.trimEnd() : '') + '</span>').join(' ') });
  const names = (a) => join(a.map(nm));
  const acts = (a) => join(a.map((s) => P[s].original === 'doppelganger' ? { t: fm(RP.doppelOf, { a: P[s].name }), h: fm(RP.doppelOf, { a: nm(s) }) } : nm(s)));
  const get = (p) => p.split('.').reduce((o, k) => o[k], RP);
  const add = (act, o) => { Object.assign(o, { act, i: B.length, pre: o.pre || pos.slice(), by: o.by || [], rel: o.rel || [], lit: o.lit || [], focus: o.focus || [], l1: o.l1 || '', l2: o.l2 || '', rn: o.rn || '', floor: o.floor || 900 }); o.post = o.post || o.pre; B.push(o); return o; };
  const tr = (o, a, c, x) => TR.push(Object.assign({ b: o.i, a, c, n: o.act === 'night' ? 1 : 0 }, x));
  const txt = (o, q, V, x) => { if (typeof q === 'string') q = get(q); o.l1 = fm(q.top || q, V) + (x || ''); o.l2 = q.bot ? fm(q.bot, V) : ''; };

  add('pro', { l1: RP.pro.top, floor: 1500, l2: me < 0 ? '' : fm(RP.pro.bot, { r: chip(D[me]), list: join([n, n + 1, n + 2].map((c) => chip(D[c]))) }) });
  let cur, noted = 0;
  const runs = [];
  if (ev.every((e) => e.k === 'idle')) add('night', { k: 'quiet', l1: RP.quiet.top, l2: RP.quiet.bot });
  else {
    ev.forEach((e) => { if (e.k === 'idle') { if (cur) cur.push(e); else runs.push(cur = [e]); } else { cur = 0; runs.push([e]); } });
    runs.forEach((run) => { const pre = pos.slice(); (run[0].mv || []).forEach((m) => { pos[m[1]] = m[0]; }); night(run, pre, pos.slice()); });
  }
  if (pos.join() !== E.join()) throw new Error('replay desync');

  function night(run, pre, post) {
    const e = run[0], k = e.k, by = e.by, tg = e.tg || [], see = e.see || [], s = by[0], st = e.st, r = e.r || st, kn = e.know || [], c0 = see[0] ? see[0][0] : 0, [t0, t1] = tg;
    const dop = s != null && P[s].original === 'doppelganger';
    const o = add('night', { k, e, st, r, by, tg, pre, post, rel: by.concat(tg, kn), mv: e.mv, floor: 1400, gl: s, rn: RL[st].ord + (r !== st ? ' → ' + RL[r].ord : '') });
    let V = { role: s != null && rn(P[s].original), a: s != null && nm(s), t: t0 < n && nm(t0), b: t0 < n && nm(t0), c: t1 < n && nm(t1), P: AL[t0 - n], Q: AL[t1 - n], r: see[0] ? cc(c0) : t0 != null && cc(pre[t0]), r2: see[1] ? cc(see[1][0]) : s != null && cc(pre[s]), rb: t0 != null && cc(pre[t0]), rc: t1 != null && cc(pre[t1]) };
    let key;
    const other = (seen) => {
      const w = [], l = seen == null ? [] : [seen];
      D.forEach((d, c) => { if (d === 'werewolf' && c !== s) { const x = pre.indexOf(c); if (l.indexOf(x) < 0) l.push(x); w.push(x >= n ? AL[x - n] : fm(RP.other.hand, { t: nm(x) })); } });
      o.lit = l; return w.length ? fm(RP.other.at, { where: w.join(RP.sep) }) : RP.other.none;
    };
    if (k === 'idle') {
      const rs = [], lit = [];
      run.forEach((x) => { if (rs.indexOf(x.st) < 0) rs.push(x.st); });
      rs.forEach((q) => D.forEach((d, c) => { if (c >= n && d === q) lit.push(pre.indexOf(c)); }));
      Object.assign(o, { rn: '', by: [], lit, rel: lit, gl: lit[0], mv: 0, r: rs[0], st: rs[0] });
      o.l1 = rs.length === 1 ? fm(RP.idle.one.top, { r: rn(rs[0]) }) : fm(RP.idle.many.top, { list: rs.map(rn).join(RP.sep) });
      o.l2 = lit.some((x) => x < n) ? RP.idle.moved.bot : rs.length > 1 || lit.length > 1 ? RP.idle.many.bot : RP.idle.one.bot;
      return;
    }
    if (k === 'copy') {
      key = WAKE[D[c0]] ? 'copyWake' : SLEEP[D[c0]] ? 'copySleep' : 'copy'; V.r = chip(D[c0]);
      o.copy = 1; o.focus = [{ slot: t0, role: eff(c0) }]; o.cd = pre[s]; tr(o, s, t0);
    } else if (k === 'know') {
      key = 'know.' + (st === 'werewolf' ? 'werewolf' : st === 'minion' ? (kn.length ? 'minion' : 'minion0') : by.length > 1 ? 'mason' : 'mason1');
      V.list = acts(st === 'minion' ? kn : by); V.a = acts(by); o.kk = st; o.dark = st === 'werewolf';
      if (st === 'minion') kn.forEach((y) => tr(o, s, y, { kn: 1 }));
      else by.forEach((x, j) => by.slice(j + 1).forEach((y) => tr(o, x, y, { kn: 1 })));
    } else if (k === 'peek') {
      o.focus = see.map((x) => ({ slot: x[1], role: eff(x[0]) }));
      if (st === 'werewolf') { key = 'peek.werewolf' + (dop ? 'D' : ''); tr(o, s, t0, { kn: 1 }); }
      else if (r === 'seer') { key = 'peek.seer' + (tg.length > 1 ? 2 : ''); tg.forEach((t) => tr(o, s, t)); }
      else {
        const who = {}, dp = by.filter((z) => P[z].original === 'doppelganger'); let ch = 0;
        see.forEach((x) => { who[x[1]] = x[0]; if (eff(x[0]) !== eff(x[1])) ch = 1; });
        o.focus = see.map((x) => ({ slot: x[1], role: eff(x[0]), ch: eff(x[0]) !== eff(x[1]) })); o.rel = by.slice();
        if (by.length > 1 && dp.length) { const rl = by.find((z) => dp.indexOf(z) < 0); key = RP.peek.insomniacMany; V = { a: nm(rl), b: nm(dp[0]), r: cc(who[rl]), r2: cc(who[dp[0]]) }; }
        else { key = RP.peek.insomniac; o.l1 = fm(key.top, V); o.l2 = fm(ch ? key.changed : key.same, V); key = 0; }
      }
    } else if (k === 'swap') {
      key = 'swap.' + r;
      if (r === 'robber') { o.focus = [{ slot: s, role: eff(c0) }]; tr(o, s, t0, { sw: 1 }); } else tr(o, r === 'drunk' ? s : t0, r === 'drunk' ? t0 : t1, { sw: 1 });
      o.mvs = e.mv.map((m) => ({ c: m[0], from: pre.indexOf(m[0]), to: m[1] }));
    } else {
      o.floor = e.auto ? 900 : 1100;
      if (r === 'werewolf' && !e.auto) { o.l1 = fm(RP.skip.werewolf[dop ? 'topD' : 'top'], V); o.l2 = other(null); }
      else o.l1 = fm(RP.skip[e.auto ? 'auto' : r === 'seer' ? 'seer' : 'self'].top, V);
    }
    if (key) {
      txt(o, key, V, e.auto ? ' ' + RP.auto : '');
      if (k === 'peek' && st === 'werewolf') o.l2 += ' ' + other(t0);
      if (key === 'know.minion0' && D.indexOf('werewolf') < 0) o.l2 = RP.know.minion0.botNoDeck;
    }
    if (me >= 0) {
      if (by.indexOf(me) >= 0) o.stamp = 'you';
      else if (tg.indexOf(me) >= 0 || (e.mv || []).some((x) => x[1] === me || pre[me] === x[0])) { o.stamp = 'yours'; if (o.mv) o.extra = 600; }
    }
    if (!noted && by.some((z) => pre[z] !== z)) { noted = 1; o.l2 += (o.l2 ? RP.dot : '') + RP.note.wake; }
  }

  const sw = []; for (let i = 0; i < n + 3; i++) if (E[i] !== i) sw.push(i);
  add('dawn', { pre: E, sw, l1: RP.dawn.top, l2: sw.length ? fm(RP.dawn.bot, { n: sw.length }) : RP.dawn.botNone, floor: 2000 });
  P.forEach((p, i) => { if (E[i] !== i || p.original !== p.effective) add('seat', { pre: E, s: i, rel: [i], l1: fm(RP.dawn.seat.top, { a: i === me ? RP.you : nm(i), to: cc(E[i]) }), l2: fm(RL[eff(i)].team === p.team ? RP.dawn.seat.botSame : RP.dawn.seat.bot, { from: cc(i), team: TEAM[p.team] }) }); });

  const vc = {}, ab = [];
  P.forEach((p, s) => { const t = P.findIndex((q) => q.id === p.vote); if (t < 0) ab.push(s); else (vc[t] = vc[t] || []).push(s); });
  const gs = Object.keys(vc).map(Number).sort((a, b) => vc[b].length - vc[a].length || a - b);
  const tail = ab.length ? RP.dot + fm(RP.vote.abstain, { n: ab.length }) : '', vb = add('vote', { pre: E, floor: 600, gs, abst: ab, l1: RP.vote.top });
  vb.l2 = !gs.length || vc[gs[0]].length <= 1 ? RP.vote.one + tail : gs.slice(0, 3).map((t) => fm(RP.vote.item, { t: nm(t), n: vc[t].length })).join(RP.dot) + tail;
  gs.forEach((t, g) => vc[t].forEach((v) => tr(vb, v, t, { v: 1, g, t })));
  const dv = R.deaths.filter((d) => d.by === 'vote').map((d) => d.s), ex = gs.filter((t) => dv.indexOf(t) >= 0);
  dv.forEach((t) => { if (ex.indexOf(t) < 0) ex.push(t); });
  if (ex.length) add('exec', { pre: E, dead: ex, ex: 1, focus: ex.map((t) => ({ slot: t, role: eff(E[t]), dead: 1 })), floor: 1500, l1: fm(RP.exec.top, { list: names(ex) }),
    l2: ex.length === 1 ? fm(RP.exec.bot, { r: cc(E[ex[0]]) }) : fm(RP.exec.botMany, { list: join(ex.map((t) => ({ t: '', h: fm(RP.exec.item, { t: nm(t), r: cc(E[t]) }) })), RP.dot) }) });
  else add('nodeath', { pre: E, l1: RP.nodeath.top, floor: 1200 });
  let ruled = 0;
  R.deaths.forEach((d) => {
    if (d.by === 'vote') return;
    const h = d.h, t = d.s, last = D[E[h]], o = add('hunt', { pre: E, h, floor: d.by === 'miss' ? 1000 : 1800, dead: d.by === 'hunter' ? [t] : 0 });
    const hh = fm(RP.hunt.title[last === 'doppelganger' ? 'copy' : P[h].original === 'hunter' && last === 'hunter' ? 'both' : 'last'], { a: nm(h) });
    if (d.by === 'hunter') { o.l1 = fm(RP.hunt.top, { h: hh, t: nm(t) }); o.l2 = fm(RP.hunt.bot, { t: nm(t), r: cc(E[t]) }); o.focus = [{ slot: t, role: eff(E[t]) }]; tr(o, h, t, { bl: 1, w: 1, s: 1 }); }
    else { o.l1 = t >= 0 ? fm(RP.hunt.top0, { h: hh, t: nm(t) }) : fm(RP.hunt.topNone, { h: hh }); if (t >= 0) tr(o, h, t, { s: 1 }); }
    if (!ruled) { ruled = 1; o.l2 = o.l2 ? o.l2 + RP.hunt_rule_join + RP.hunt.rule : RP.hunt.rule; }
  });

  const W = R.winners || [], vk = W.includes('village') ? (R.wolvesInPlay ? 'village' : 'villageNoWolf') : W.includes('wolf') ? (R.wolvesInPlay ? 'wolf' : 'minion') : W.includes('tanner') ? 'tanner' : 'none';
  const wy = (w) => { const l = w[1] ? names(w[1]) : ''; return fm(RP.why[w[0]], { list: l, t: l, a: l }); };
  const bel = P.map((p) => ({ role: p.original, blind: 0 }));
  ev.forEach((e) => {
    const r = e.r || e.st, c = e.see && e.see[0] ? e.see[0][0] : 0;
    e.by.forEach((s) => {
      if (e.k === 'copy') bel[s].role = D[c];
      else if (r === 'robber' && e.k === 'swap' && e.see) bel[s].role = eff(c);
      else if (r === 'insomniac' && e.see) e.see.forEach((x) => { if (x[1] === s) bel[s].role = eff(x[0]); });
      else if (r === 'drunk') bel[s].blind = 1;
    });
  });
  P.forEach((p, i) => { if (eff(E[i]) !== p.effective) throw new Error('replay desync'); });
  let self = '';
  if (me >= 0) {
    const cs = [];
    ev.forEach((e) => {
      const m = (e.mv || []).find((x) => x[1] === me); if (!m) return;
      const r = cc(m[0]), k = e.r || e.st, sd = e.by[0], tg = e.tg || [];
      if (e.by.includes(me)) { if (k === 'robber') cs.push(fm(RP.cause.rob, { t: nm(tg[0]), r })); else if (k === 'drunk') cs.push(fm(RP.cause.drunk, { P: AL[tg[0] - n], r })); }
      else if (k === 'robber') cs.push(fm(RP.cause.robbed, { role: rn(P[sd].original), a: nm(sd), r }));
      else if (k === 'troublemaker') cs.push(fm(RP.cause.swapped, { role: rn(P[sd].original), a: nm(sd), t: nm(tg.find((x) => x !== me)), r }));
    });
    const f = eff(E[me]), b = bel[me], sf = RP.self, p = P[me], kre = f === 'minion' ? /^(minion|wolf_)/ : f === 'tanner' ? /^(tanner|no_wolf_)/ : 0, w = kre && (R.why || []).slice().reverse().find((x) => kre.test(x[0]));
    self = [...cs, b.blind ? fm(sf.blind, { f: chip(f) }) : b.role === f ? fm(sf.same, { f: chip(f) }) : fm(sf.diff, { b: chip(b.role), f: chip(f) }),
      D[E[me]] === 'doppelganger' && cA ? fm(sf.doppel, { r: chip(cA) }) : '', w ? wy(w) : '', fm(p.win ? sf.win : sf.lose, { team: TEAM[p.team] })].filter(Boolean).join(' ');
  }
  const why = (R.why || []).filter((w) => !(w[0] === 'wolf_died' && (w[1] || []).length && w[1].every((x) => ex.includes(x))));
  const wf = [].concat(...(R.why || []).map((w) => w[1] || [])).find((x) => !ex.includes(x));
  const vfocus = ex.concat(wf == null ? [] : [wf]).slice(0, 2).map((x) => ({ slot: x, role: eff(E[x]), lbl: P[x].name, dead: ex.includes(x) }));
  const exl = ex.length ? fm(RP.exec.top, { list: names(ex) }) + ' ' + ex.map((t) => fm(RP.exec.card, { t: nm(t), r: cc(E[t]) })).join(' ') : RP.nodeath.top;
  add('verdict', { pre: E, vfocus, vteam: vk === 'wolf' || vk === 'minion' ? 'wolf' : vk === 'tanner' ? 'tanner' : 'village', l1: T.verdict[vk], l2: [exl].concat(why.map(wy)).join(' '), l3: self, win: me >= 0 ? !!P[me].win : null, floor: 1500 });

  const cnt = {}, seen = {};
  B.forEach((b) => { b.ga = GA[b.act] || b.act; cnt[b.ga] = (cnt[b.ga] || 0) + 1; });
  let total = 0;
  B.forEach((b) => { seen[b.ga] = (seen[b.ga] || 0) + 1; b.gi = seen[b.ga]; b.gn = cnt[b.ga]; b.read = Math.max(b.floor, 70 * T.syl(b.l1 + b.l2 + (b.l3 || ''))) + (b.extra || 0); total += b.read + 1500; });
  const jr = D.map((_, i) => [{ c: i }]), lines = [];
  ev.forEach((e) => (e.mv || []).forEach((m) => jr[m[1]].push({ c: m[0], st: e.r || e.st, by: e.by[0], self: m[1] === e.by[0] })));
  B.forEach((b) => {
    lines.push({ b: b.i, role: b.act === 'night' && b.r ? b.r : null, h: b.l1 + (b.l2 ? ' ' + b.l2 : '') + (b.l3 ? ' ' + b.l3 : '') });
    (b.abst || []).forEach((s) => lines.push({ b: b.i, role: null, h: fm(RP.vote.none, { a: nm(s) }) }));
  });
  return { beats: B, tr: TR, total, journey: jr, belief: bel, lines, self, effRole: eff, cardName: cn, me, n, copyAs: cA };
}

/* ---------- DOM ---------- */
let S;
const SYM = '<symbol id="rp-eye" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter"><path d="M1 12Q12 3 23 12Q12 21 1 12Z"/><path d="M6 7.4 4.4 5M12 5.4V2.6M18 7.4 19.6 5"/></g><path d="M12 7.6 13.5 12 12 16.4 10.5 12Z" fill="currentColor"/></symbol><symbol id="rp-swap" viewBox="0 0 24 24"><path d="M3 8H21M16 3l5 5-5 5M21 17H3M8 12l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"/></symbol><symbol id="rp-step" viewBox="0 0 24 24"><path d="M8 3 17 12 8 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"/></symbol>';
const $ = (id) => document.getElementById(id);
const mk = (t, c, h) => { const e = document.createElement(t); e.className = c; e.innerHTML = h || ''; return e; };
const ico = (id, c) => '<svg' + (c ? ' class="' + c + '"' : '') + '><use href="#' + id + '"/></svg>';
const card = (r, o) => root.ART ? root.ART.card(r, o) : '';
const cls = (e, c, on) => e.classList.toggle(c, !!on);
const wait = (ms) => new Promise((r) => S.tm.push(setTimeout(r, ms / S.rate)));
const nt = (f) => new Promise((res) => { const r = S.rp; r.classList.add('rp-nt'); f(); requestAnimationFrame(() => requestAnimationFrame(() => { r.classList.remove('rp-nt'); res(); })); });
const vset = (e, x, y, d) => { const c = '--tx:' + x + 'px;--ty:' + y + 'px' + (d ? ';width:' + d + 'px;height:' + d + 'px' : ''); if (e._c !== c) { e._c = c; e.style.cssText = c; } };

function layout() {
  const rc = S.rp.getBoundingClientRect(), W = rc.width, n = S.n, nar = innerWidth < 600, X = [], Y = [], SC = [], TX = [], TY = [], TG = [], SD = [];
  const seats = [...S.main.querySelectorAll('.seat[data-pid]')];
  S.fcw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw-md')) || 128;
  S.R.players.forEach((p, i) => {
    const se = seats.find((e) => e.getAttribute('data-pid') === p.id), r = se.querySelector('.seat-token').getBoundingClientRect(), d = r.width, cx = r.left + d / 2 - rc.left, cy = r.top + r.height / 2 - rc.top;
    const sc = se.querySelector(':scope>.card:not(.is-original)'), sr = sc && sc.getBoundingClientRect(), cs = sr && sr.width ? sr.width : nar ? 26 : 40, side = se.dataset.side || (cx < W / 2 ? 'l' : 'r');
    SD[i] = side; SC[i] = cs / S.cw; TX[i] = cx; TY[i] = cy; S.TD[i] = d;
    if (sr && sr.width) { X[i] = sr.left + sr.width / 2 - rc.left; Y[i] = sr.top + sr.height / 2 - rc.top; }
    else { X[i] = cx + (side === 'r' ? -1 : 1) * (d / 2 + 6 + cs / 2); Y[i] = cy; }
    TG[i] = cy + d / 2 + 2;
  });
  const al = S.main.querySelectorAll('.altar .card');
  for (let i = n; i < n + 3; i++) { const a = al[i - n].getBoundingClientRect(); X[i] = a.left + a.width / 2 - rc.left; Y[i] = a.top + a.height / 2 - rc.top; SC[i] = a.width / S.cw; TG[i] = Y[i] + a.height / 2 + 2; }
  Object.assign(S, { X, Y, SC, TX, TY, TG, SD, W, RH: rc.height }); S.rp.setAttribute('data-nw', W < 420 ? 1 : 0);
  for (let i = 0; i < n; i++) { vset(S.rings[i], TX[i], TY[i], S.TD[i] + 4); vset(S.vms[i], TX[i] + (SD[i] === 'r' ? 1 : -1) * S.TD[i] * .45, TY[i] - S.TD[i] * .45); }
  relabel();
  S.ln.forEach((l) => {
    const t = l.t, p = (s) => s < n ? [TX[s], TY[s]] : [X[s], Y[s]], a = p(t.a), c = p(t.c), L = Math.hypot(c[0] - a[0], c[1] - a[1]), o = t.a < n && L ? S.TD[t.a] / 2 + 2 : 0;
    if (o) { a[0] += (c[0] - a[0]) / L * o; a[1] += (c[1] - a[1]) / L * o; }
    if (l.m) vset(l.m, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
    l.e.style.cssText = '--x:' + (a[0] - W / 2) + 'px;--y:' + (a[1] - rc.height / 2) + 'px;--len:' + Math.max(0, L - o - (t.v && t.c < n ? S.TD[t.c] / 2 + 4 : 0)) + 'px;--ang:' + Math.atan2(c[1] - a[1], c[0] - a[0]) + 'rad;--g:' + (t.g || 0);
  });
}

/* capH-dependent labels only: reads the caption height, never seat/altar rects */
function relabel() {
  const n = S.n, oh = S.cap.el.offsetHeight, lim = S.RH - oh - 60, W = S.W;
  S.capOH = oh; S.H = lim;
  S.tags.forEach((e, i) => {
    let x = i < n ? S.TX[i] : S.X[i], y = S.TG[i], sd = 0;
    if (i < n && y + 32 > lim) {
      const d = S.TD[i], dir = S.SD[i] === 'r' ? 1 : -1, tx = S.TX[i] + dir * (d / 2 + 6), room = dir > 0 ? W - 8 - tx : tx - 8;
      if (room < 48) y = lim - 32; else { sd = dir; x = tx; y = S.TY[i]; }
    }
    cls(e, 'rp-sr', sd > 0); cls(e, 'rp-sl', sd < 0); vset(e, x, y);
  });
}

/* stage k: 0 start, 1 light cut, 2 action, 3 static end */
function scene(i, k) {
  const B = S.B.beats, b = B[i], a = b.act, n = S.n, act = k > 1, pos = S.pos = act ? b.post : b.pre, eff = S.B.effRole, dead = {}, ex = {}, sws = {}, inv = [], pv = B[i - 1];
  const night = a === 'night' && b.k !== 'quiet', cap = S.cap, ve = S.vd, dI = B.findIndex((x) => x.act === 'dawn');
  let rel = null, lit = [], ring = [], g = null, on = 0;
  pos.forEach((c, s) => { inv[c] = s; });
  B.forEach((x, j) => { if (x.dead && (j < i || j === i && act)) x.dead.forEach((d) => { dead[d] = 1; if (x.ex) ex[d] = 1; }); });
  if (a === 'dawn' ? k > 2 : i > dI) B[dI].sw.forEach((x) => { sws[pos[x]] = 1; });
  if (night) {
    const src = k > 0 ? b : pv && pv.act === 'night' && pv.k !== 'quiet' ? pv : 0;
    if (src) { rel = src.rel.concat(src.lit); g = src.gl; on = src.dark || g == null ? 0 : 1; if (k) { lit = b.lit; ring = b.by.concat(b.kk === 'minion' ? b.e.know || [] : []); } } else g = b.gl;
  } else if (a === 'seat') rel = [b.s];
  S.rp.setAttribute('data-act', a); S.gOn = on; cls(S.glow, 'is-on', on); if (g != null) vset(S.glow, S.X[g], S.Y[g]);
  const cp = S.B.copyAs && (S.cdone < i || S.cdone === i && act);
  S.cards.forEach((el, c) => {
    const q = inv[c], cd = el._cd, co = el._co;
    const css = '--tx:' + S.X[q] + 'px;--ty:' + S.Y[q] + 'px;--s:' + S.SC[q] + ';--inv:' + 1 / S.SC[q]; if (el._c !== css) { el._c = css; el.style.cssText = css; } const z = q < n ? 'seat' : 'altar'; if (el._z !== z) { el._z = z; el.setAttribute('data-z', z); }
    cls(el, 'is-f', a !== 'pro' || k); cls(el, 'rp-mv', 0); cls(el, 'rp-flip', 0); cls(el, 'rp-dim', rel && rel.indexOf(q) < 0); cls(el, 'rp-lit', lit.includes(q)); cls(el, 'rp-hunt', a === 'hunt' && k && c === pos[b.h]);
    cls(cd, 'is-swapped', sws[c]); cls(cd, 'is-dead', dead[q]); if (co) cls(co, 'is-on', cp);
  });
  const tagsOn = night || a === 'pro' || a === 'dawn' ? k : 1;
  S.tags.forEach((tg, q) => {
    const rv = tagsOn && (!night || rel.includes(q)), sh = q < n ? a !== 'pro' || k : rv, nx = q < n && S.R.players[q].name;
    cls(tg, 'is-on', sh); cls(tg, 'rp-dim', rel && rel.indexOf(q) < 0); cls(tg, 'is-dead', dead[q]);
    if (sh) { const h = q < n ? '<i>' + esc(nx) + '</i>' + (rv ? '<b>' + esc(i < S.cdone || i === S.cdone && !act ? rn(S.R.night.deal[pos[q]]) : S.B.cardName(pos[q])) + '</b>' : '') : '<i>' + esc(UI.altarShort[q - n]) + '</i>'; if (tg._h !== h) { tg._h = h; tg.innerHTML = h; } }
    if (q < n) { const rg = S.rings[q], ir = ring.includes(q); cls(rg, 'is-on', ir); cls(rg, 'is-eye', ir && b.dark); }
  });
  const votes = {};
  S.ln.forEach((l) => {
    const t = l.t, v = (i > t.b || i === t.b && k >= (t.s || 2)) && !(t.n && JUDGE[a]) && !(t.v && !DAY[a]) && a !== 'verdict', now = t.n && i === t.b && act, e = l.e;
    cls(e, 'is-on', v); cls(e, 'is-now', now); cls(e, 'is-trace', v && t.n && !now); cls(e, 'rp-lo', v && t.n && DAY[a]); cls(e, 'rp-hi', v && a === 'seat' && (t.a === b.s || t.c === b.s));
    cls(e, 'is-blood', v && (t.bl || t.v && ex[t.t])); cls(e, 'is-thick', v && t.w); cls(e, 'is-know', t.kn);
    if (l.m) { cls(l.m, 'is-on', v && (now || DAY[a])); cls(l.m, 'is-tr', !now); }
    if (t.v && v) votes[t.t] = (votes[t.t] || 0) + 1;
  });
  S.vms.forEach((m, q) => { m.textContent = votes[q] || ''; cls(m, 'is-on', votes[q]); });
  const fl = a === 'verdict' ? b.vfocus : b.focus;
  S.focus.forEach((f, j) => {
    const fo = act && fl[j]; cls(f, 'is-on', fo);
    if (fo) {
      const cw = S.fcw || 128, vd = a === 'verdict', key = fo.role + (fo.ch ? 1 : 0) + (fo.dead ? 'd' : '') + (fo.lbl || '') + (b.k || ''), q = fo.slot < n, sx = (q ? S.TX : S.X)[fo.slot], sy = (q ? S.TY : S.Y)[fo.slot], hc = S.H / 2, wc = S.W / 2;
      const x = q ? wc : sx, y = q ? S.Y[n + 1] : sy - S.SC[fo.slot] * S.cw * .7 - cw * .7 - 12;
      vset(f, Math.max(16 + cw / 2, Math.min(S.W - 16 - cw / 2, (vd ? wc : x) + (fl.length > 1 ? (j ? 1 : -1) * (cw / 2 + 8) : 0))), vd ? Math.max(8 + cw * .7, S.H * .26) : Math.max(8 + cw * .7, Math.min(S.H - 8 - cw * .7, y)));
      if (f.getAttribute('data-k') !== key) { f.setAttribute('data-k', key); f.innerHTML = card(fo.role, { size: 'md', face: 1, flat: 1 }) + (b.k === 'peek' || b.k === 'copy' ? ico('rp-eye', 'rp-ey2') : b.k === 'swap' ? ico('rp-swap', 'rp-ey2') : '') + (fo.ch ? '<i class="rp-fst">' + T.stamp.changed + '</i>' : '') + (fo.lbl ? '<i class="rp-fl">' + esc(fo.lbl) + '</i>' : ''); const fc = f.querySelector('.card'); if (fc) cls(fc, 'is-dead', fo.dead); }
    }
  });
  cls(S.ld, 'is-on', DAY[a] && (a !== 'dawn' || k)); cls(S.lv, 'is-on', JUDGE[a] && (a !== 'vote' || k));
  if (!k || k > 2) {
    cap.l1.firstChild.innerHTML = b.l1; cap.l2.firstChild.innerHTML = b.l2;
    cap.st.textContent = b.stamp ? T.stamp[b.stamp] : ''; cls(cap.st, 'is-on', k && b.stamp);
  }
  cls(cap.el, 'is-v', a === 'verdict'); cls(ve, 'is-on', a === 'verdict'); cls(ve, 'is-w', a === 'verdict' && act);
  if (a === 'verdict') { ve.setAttribute('data-team', b.vteam); ve.children[0].firstChild.textContent = b.l1; ve.children[1].innerHTML = b.l2; ve.children[2].innerHTML = b.l3; ve.children[3].textContent = b.win == null ? '' : b.win ? T.stamp.win : T.stamp.lose; ve.style.setProperty('--sd', b.l3 ? 1760 + 70 * T.syl(b.l3) : 960); }
}
function capGo(b) {
  cls(S.cap.l1, 'is-h', 0); cls(S.cap.l2, 'is-h', 0); cls(S.cap.st, 'is-on', b.stamp);
  const e = $('sr'); if (e) e.textContent = (b.l1 + ' ' + b.l2 + ' ' + (b.l3 || '')).replace(/<[^>]*>/g, '');
  if (S.first) S.tapAt = Date.now() + 1400;
}

/* ---------- playback ---------- */
const stop = () => { S.tm.forEach(clearTimeout); S.tm = []; };
const snd = (m, v) => { const N = root.SND; if (N && N.ctx && N[m]) { try { N[m](v === 1 ? true : v === 0 ? false : v); } catch (e) {} } };
const duck = (db) => { const N = root.SND; if (N && N.ctx && N.duck) { try { N.duck('rp', db); } catch (e) {} } };
async function play(i) {
  const my = ++S.tok, B = S.B.beats, b = B[i], a = b.act, F = root.FX;
  stop(); S.i = i; const p0 = nt(() => { scene(i, 0); cls(S.cap.l1, 'is-h', 1); cls(S.cap.l2, 'is-h', 1); }); ui(); if (a !== 'pro') capGo(b);
  await p0; if (!S || my !== S.tok) return;
  if (a === 'pro') {
    if (!S.lite) {
      await wait(600);
      S.wave.forEach((sl, j) => { const e = S.cards[sl]; e.style.setProperty('--k', j); e.classList.add('rp-flip'); });
      await wait(120 * S.wave.length + 400);
    }
    await nt(() => scene(i, 1)); if (!S || my !== S.tok) return;
    capGo(b);
  } else {
    if (b.mv || b.dark) await wait(400);
    if (S.gOn && b.gl != null) { cls(S.glow, 'is-on', 0); await wait(120); }
    scene(i, 1);
    if (a === 'dawn') {
      await wait(S.lite ? 160 : 1100);
      const sc = b.sw.map((s) => S.cards[b.pre[s]]._cd);
      if (S.lite || sc.length > 3) { await new Promise((r) => requestAnimationFrame(r)); if (!S || my !== S.tok) return; sc.forEach((c) => c.classList.add('is-swapped')); }
      else for (const c of sc) { c.classList.add('is-swapped'); await wait(120); }
    } else {
      await wait(a === 'exec' ? 800 : a === 'hunt' ? 480 : b.k === 'swap' ? (F && F.tremble && b.mvs && !S.lite ? 0 : 300) : 0);
      if (b.k === 'swap') { snd('sting', 'carve'); if (F && F.tremble && b.mvs && !S.lite) await F.tremble(b.mvs.map((m) => S.cards[m.c])); }
      if (my !== S.tok) return;
      if (b.dead && F && F.execute) {
        const ds = b.dead.map((q) => S.cards[b.pre[q]]), fi = b.dead.map((q, j) => S.focus[j]);
        snd('toll', 1); S.tolled = 1;
        const ex = ds.map((c, j) => F.execute(c, fi[j], j ? null : () => scene(i, 2), j > 0 || S.lite)); await Promise.all(ex);
        if (my !== S.tok) return;
      } else if (b.dead && F && !S.lite && F.shake) { F.shake(6, 4); if (F.flash) F.flash('blood', 120); }
      if (a === 'nodeath') { snd('toll', 0); S.tolled = 1; }
      scene(i, 2);
      if (b.mvs && !S.lite) b.mvs.forEach((m) => cls(S.cards[m.c], 'rp-mv', 1));
      await wait(a === 'verdict' ? (b.l3 ? 2060 + 70 * T.syl(b.l3) : 1260) : a === 'vote' ? 300 * b.gs.length + 300 : 900);
    }
  }
  if (a !== 'verdict') await wait(b.read);
  if (!S || my !== S.tok) return;
  nt(() => scene(i, 3)); ui();
  if (S.run !== 'play') return;
  if (i === B.length - 1) { S.run = 'end'; ui(); await wait(1200); if (S && my === S.tok) done(); return; }
  if (S.first && b.k === 'swap') { S.run = 'wait'; ui(); return; }
  play(i + 1);
}
function done() {
  if (!S || S.done) return; S.done = 1; S.tok++; stop();
  duck(0); const cb = S.o.onDone, s = S; s.rp.style.cssText += ';opacity:0;transition:opacity .3s';
  setTimeout(() => { if (S === s) { close(); if (cb) cb(); } }, 300);
}
function ui() {
  const b = S.B.beats[S.i], st = S.run, p = fm(UI.pos, { act: UI.acts[b.ga], i: b.gi, n: b.gn });
  S.mainBtn.firstChild.textContent = st === 'play' ? UI.pause : st === 'end' ? UI.restart : UI.resume;
  S.mainBtn.lastChild.textContent = st === 'wait' ? UI.tapResume : p;
  S.bar.setAttribute('aria-valuenow', S.i); S.bar.setAttribute('aria-valuetext', p);
  S.ticks.forEach((t, k) => { cls(t, 'is-past', k < S.i); cls(t, 'is-now', k === S.i); });
  S.prog.style.transform = 'scaleX(' + (S.i + 1) / S.ticks.length + ')';
}
const seek = (i) => { if (S) { if (S.run === 'end' || S.run === 'wait') S.run = 'pause'; play(Math.max(0, i)); } };
const prev = () => S && seek(S.i - 1);
function next() {
  if (!S || S.first && S.run === 'play' && Date.now() < (S.tapAt || 0)) return;
  if (S.i >= S.B.beats.length - 1) return done();
  if (S.run === 'wait') S.run = 'play'; else if (S.run === 'end') S.run = 'pause';
  play(S.i + 1);
}
function toggle() {
  if (!S) return;
  if (S.run === 'play') { S.tok++; stop(); S.run = 'pause'; nt(() => scene(S.i, 3)); ui(); }
  else { if (S.run === 'end') S.i = -1; S.run = 'play'; play(S.i + 1); }
}
function rate(r) {
  if (!S) return; S.rate = r === 2 ? 2 : 1; S.rp.style.setProperty('--u', S.rate === 2 ? '.5ms' : '1ms');
  S.rateBtn.textContent = S.rate === 2 ? UI.x2 : UI.x1; S.rateBtn.setAttribute('aria-label', S.rate === 2 ? UI.normal : UI.fast);
}
function skip() { if (S) { S.tok++; stop(); if (!S.tolled) snd('toll', S.B.beats.some((b) => b.dead) ? 1 : 0); S.tolled = 1; done(); } }

function open(R, meId, o) {
  o = o || {}; close();
  const B = build(R, meId), m = o.mount || {}, main = m.main || $('main'), n = R.players.length, D = R.night.deal, N = B.beats.length, dk = m.dock || $('dock'), hud = m.hud || $('hud');
  if (!$('rp-css')) { let d; if (CSS.charAt(0) !== '_') { d = mk('style'); d.textContent = CSS; } else { d = mk('link'); d.rel = 'stylesheet'; d.href = '/css/replay.css'; } d.id = 'rp-css'; document.head.appendChild(d); }
  const sp = $('sprite'); if (sp && !sp.querySelector('#rp-eye')) sp.insertAdjacentHTML('beforeend', SYM);
  const lite = document.documentElement.getAttribute('data-perf') === 'lite' || matchMedia('(prefers-reduced-motion:reduce)').matches;
  S = { R, B, o, n, me: B.me, main, i: 0, tok: 0, rate: 1, run: 'play', tm: [], pos: B.beats[0].pre, first: !!o.autoplay, cdone: 1e9, gOn: 0, on: [], TD: [], lite };
  const B0 = B.beats.find((b) => b.copy); if (B0) S.cdone = B0.i;
  main.scrollTop = 0;
  const rp = S.rp = mk('div', 'rp' + (lite ? ' rp-lt' : ''));
  let h = '<i class="rp-ld"></i><i class="rp-lv"></i><i class="rp-glow"></i>';
  rp.setAttribute('aria-hidden', 'true');
  B.tr.forEach((t) => { h += '<i class="ln rp-ln' + (t.v ? ' rp-v' : '') + '"></i>'; });
  B.tr.forEach((t) => { if (t.sw) h += '<svg class="rp-mk"><use href="#rp-swap"/></svg>'; });
  for (let i = 0; i < n; i++) h += '<i class="rp-ring"><u></u></i><b class="rp-vm"></b>';
  for (let i = 0; i < n + 3; i++) h += '<div class="rp-card"><span class="rp-back">' + card(null, { size: 'sm', flat: 1 }) + '</span><span class="rp-front">' + card(D[i], { size: 'sm', face: 1, flat: 1 }) + '</span>' + (D[i] === 'doppelganger' && B.copyAs ? ico(RL[B.copyAs].sigil, 'rp-co') : '') + '</div>';
  for (let i = 0; i < n + 3; i++) h += '<span class="rp-tag' + (i < n ? '' : ' rp-al') + '"></span>';
  h += '<div class="rp-focus"></div><div class="rp-focus"></div><div class="rp-vd"><p class="rp-vl"><span></span><u class="rp-cv"></u></p><p class="rp-vw"></p><p class="rp-vs"></p><i class="rp-vst"></i></div>';
  h += '<div class="rp-cap" role="status"><p class="rp-l1"><span></span><u class="rp-cv"></u></p><p class="rp-l2"><span></span><u class="rp-cv"></u></p></div><i class="rp-stamp"></i><div class="rp-bar" role="slider" tabindex="0">';
  B.beats.forEach((b, k) => { const f = !k || B.beats[k - 1].ga !== b.ga; h += '<i class="rp-tick' + (f ? ' is-first' : '') + (k === N - 1 ? ' is-end' : '') + (b.mv ? ' is-mv' : '') + (b.act === 'exec' || b.act === 'hunt' ? ' is-bl' : '') + '" style="--p:' + (k + .5) / N + '"' + (b.act === 'night' && b.rn ? ' data-r="' + b.rn.split(' ')[0] + '"' : '') + (f && b.ga !== 'pro' ? ' data-a="' + UI.acts[b.ga] + '"' : '') + '></i>'; });
  rp.innerHTML = h + '<i class="rp-prog"></i><button class="rp-rate"></button></div>'; main.appendChild(rp);
  const q = (c) => [...rp.querySelectorAll(c)], bar = S.bar = rp.querySelector('.rp-bar'), cp = rp.querySelector('.rp-cap'), ln = q('.rp-ln'), mks = q('.rp-mk');
  Object.assign(S, { glow: rp.querySelector('.rp-glow'), ld: rp.querySelector('.rp-ld'), lv: rp.querySelector('.rp-lv'), rings: q('.rp-ring'), vms: q('.rp-vm'), cards: q('.rp-card'), tags: q('.rp-tag'), focus: q('.rp-focus'), vd: rp.querySelector('.rp-vd'),
    cap: { el: cp, l1: cp.children[0], l2: cp.children[1], st: rp.querySelector('.rp-stamp') }, ticks: q('.rp-tick'), prog: rp.querySelector('.rp-prog'), rateBtn: rp.querySelector('.rp-rate'), ln: B.tr.map((t, k) => ({ t, e: ln[k], m: t.sw ? mks.shift() : 0 })) });
  bar.setAttribute('aria-label', UI.ruler); bar.setAttribute('aria-valuemin', 0); bar.setAttribute('aria-valuemax', N - 1);
  const vbt = B.beats.find((b) => b.act === 'vote'); S.vms.forEach((v, s) => v.style.setProperty('--g', Math.max(0, vbt.gs.indexOf(s))));
  const seats = [...main.querySelectorAll('.seat[data-pid]')]; S.seats = R.players.map((p) => seats.find((e) => e.getAttribute('data-pid') === p.id));
  S.cards.forEach((el) => { el._cd = el.querySelector('.rp-front .card'); el._co = el.querySelector('.rp-co'); });
  S.cw = S.cards[0]._cd.offsetWidth;
  document.body.setAttribute('data-replay', '1');
  S.dock = dk; S.dockHTML = dk.innerHTML; S.dockHid = dk.hidden; dk.hidden = false;
  dk.innerHTML = '<button class="btn-sub rp-prev" aria-label="' + UI.prev + '">' + ico('rp-step') + '</button><button class="btn-main rp-main"><span class="lbl"></span><b class="nm"></b></button><button class="btn-sub rp-nxt" aria-label="' + UI.next + '">' + ico('rp-step') + '</button>';
  S.mainBtn = dk.querySelector('.rp-main'); S.hud = hud;
  if (hud) {
    hud.querySelectorAll('.hud-skip').forEach((e) => e.classList.add('rp-hid'));
    const sk = S.skipBtn = mk('button', 'hud-skip rp-skip', UI.hudSkip), hr = hud.querySelector('.hud-r') || hud; hr.insertBefore(sk, hr.firstChild);
  }
  layout();
  if (typeof ResizeObserver !== 'undefined') { const s0 = S; let q = 0; S.ro = new ResizeObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; if (S === s0 && s0.cap.el.offsetHeight !== s0.capOH) relabel(); }); }); S.ro.observe(cp); }
  S.wave = []; for (let i = 0; i < n; i++) S.wave.push((Math.max(S.me, 0) + i) % n); S.wave.push(n, n + 1, n + 2);
  const on = (t, ev, f) => { if (t) { t.addEventListener(ev, f); S.on.push([t, ev, f]); } };
  on(rp, 'click', next); on(dk.querySelector('.rp-prev'), 'click', prev); on(dk.querySelector('.rp-nxt'), 'click', next); on(S.mainBtn, 'click', toggle); on(S.skipBtn, 'click', skip);
  on(S.rateBtn, 'click', (e) => { e.stopPropagation(); rate(S.rate === 1 ? 2 : 1); });
  on(bar, 'click', (e) => { e.stopPropagation(); if (e.target !== S.rateBtn) { const rc = bar.getBoundingClientRect(); seek(Math.max(0, Math.min(N - 1, Math.round((e.clientX - rc.left) / (rc.width - 44) * N - .5)))); } });
  on(document, 'keydown', (e) => {
    const g = e.target && e.target.tagName, k = e.key; if (g === 'INPUT' || g === 'TEXTAREA') return;
    const f = { ArrowRight: next, ArrowLeft: prev, ' ': toggle, Home: () => seek(0), End: () => seek(N - 1), Escape: skip }[k];
    if (f) { e.preventDefault(); f(); }
  });
  on(document, 'visibilitychange', () => { if (document.hidden && S.run === 'play') toggle(); });
  on(window, 'resize', () => { if (S.run === 'play') toggle(); layout(); nt(() => scene(S.i, 3)); });
  rate(1); duck(-9);
  const s1 = S, go = () => { if (S !== s1) return; if (o.paused) { S.run = 'pause'; S.i = o.start || 0; nt(() => scene(S.i, 3)); ui(); } else play(o.start || 0); };
  if (root.ART && root.ART.want && root.ART.ready) {
    const rl = [...new Set(D.concat(R.players.map((p) => p.final || p.effective), B.copyAs ? [B.copyAs] : []))].filter(Boolean);
    ART.want(rl); S.i = o.start || 0; nt(() => scene(S.i, 0));
    Promise.all(rl.map((r) => ART.ready(r))).then(go, go);
  } else go();
  return true;
}
function close() {
  const s = S; if (!s) return; S = null; s.tok++; duck(0);
  if (s.ro) s.ro.disconnect();
  s.tm.forEach(clearTimeout); s.on.forEach((x) => x[0].removeEventListener(x[1], x[2]));
  [s.rp, s.skipBtn].forEach((e) => e && e.remove());
  s.dock.innerHTML = s.dockHTML; s.dock.hidden = s.dockHid;
  if (s.hud) s.hud.querySelectorAll('.rp-hid').forEach((e) => e.classList.remove('rp-hid'));
  document.body.removeAttribute('data-replay');
}

/* ---------- end board (SPEC 13.8) ---------- */
function enhanceBoard(listEl, R, meId, onJump) {
  if (!R.night) return;
  const B = build(R, meId), n = B.n, P = R.players;
  let tl = listEl.querySelector('.tl-list'), up = listEl;
  while (!tl && up.parentElement && up !== document.body) tl = (up = up.parentElement).querySelector('.tl-list');
  const vs = listEl.querySelector('.verdict-self .vs-t') || document.querySelector('.verdict-self .vs-t'); if (vs && B.self) vs.innerHTML = B.self;
  const jump = (b, s) => {
    if (onJump) return onJump(b, s);
    if (S) { S.ticks.forEach((t, k) => cls(t, 'is-rel', s != null && B.beats[k].rel.includes(s))); seek(b); } else listEl.dispatchEvent(new CustomEvent('rp-jump', { bubbles: true, detail: { beat: b, slot: s } }));
  };
  listEl.querySelectorAll('.rec-row').forEach((row, k) => {
    const s = +(row.getAttribute('data-slot') || k), j = B.journey[s];
    if (!j || row.querySelector('.rec-path')) return;
    const path = mk('span', 'rec-path', j.length < 2 ? UI.stayed : j.map((x, q) => { const c = B.effRole(x.c), chip = '<span class="rp-rc">' + ico(RL[c].sigil) + esc(B.cardName(x.c)) + '</span>'; if (!q) return '<span class="rec-hop"><i>' + UI.hop.start + '</i> ' + chip + '</span>'; const dp = P[x.by].original === 'doppelganger', nb = '<b class="nm">' + esc(P[x.by].name) + '</b>', ac = dp ? { t: fm(RP.doppelOf, { a: P[x.by].name }), h: fm(RP.doppelOf, { a: { t: P[x.by].name, h: nb } }) } : { t: rn(x.st) + ' ' + P[x.by].name, h: esc(rn(x.st)) + ' ' + nb }, key = x.st === 'robber' ? (x.self ? 'robSelf' : 'robTarget') : x.st === 'drunk' ? (x.self ? 'drunkSelf' : 'drunkCenter') : 'swap'; return '<span class="rec-hop"><i>' + fm(UI.hop[key], { a: ac }) + '</i> → ' + chip + '</span>'; }).join(''));
    row.appendChild(path);
    if (s < n) { const b = B.belief[s], df = b.blind || b.role !== B.effRole(R.night.end[s]), bl = mk('span', 'rec-belief' + (df ? ' is-diff' : ''), UI.journey + UI.journeySep + '<i>' + (b.blind ? esc(UI.unknown) : esc(rn(b.role))) + '</i>'); bl.setAttribute('data-diff', df ? 1 : 0); row.appendChild(bl); }
    const fb = B.beats.find((x) => x.rel.includes(s));
    if (fb) { row.setAttribute('role', 'button'); row.tabIndex = 0; row.onclick = () => jump(fb.i, s); row.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(fb.i, s); } }; }
  });
  if (tl && !tl.children.length) {
    tl.innerHTML = B.lines.map((l) => '<li class="tl-row" data-beat="' + l.b + '" role="button" tabindex="0">' + (l.role ? card(l.role, { size: 'xs', face: 1, flat: 1 }) : '') + '<span class="tl-t">' + l.h + '</span></li>').join('');
    tl.onclick = tl.onkeydown = (e) => { const r = e.target.closest('.tl-row'); if (r && (e.type === 'click' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); jump(+r.getAttribute('data-beat'), null); } };
    if (root.ART) root.ART.mark(tl);
  }
}

const REPLAY = { build, open, seek, next, prev, toggle, rate, skip, close, enhanceBoard, relayout: () => { if (S) { layout(); nt(() => scene(S.i, 3)); } }, slotIds: (R) => R.players.map((p) => p.id) };
if (typeof module !== 'undefined' && module.exports) module.exports = REPLAY; else root.REPLAY = REPLAY;
})(typeof window !== 'undefined' ? window : globalThis);
