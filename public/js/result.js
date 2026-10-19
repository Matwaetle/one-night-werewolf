/* 한밤의 늑대인간 — 결말 보드 (지연 로드 모듈). app.js 가 투표가 시작될 때 불러 두고, 결과 화면에서 RESULT.draw(ctx) 로 그린다. */
(function () {
  'use strict';
  const W = window, { ROLES, TEAM_NAME } = W.WW;
  W.RESULT = {
    draw(c) {
      const { S, R, T, TB, TH, TBT, fmt, esc, names, NM, nmh, pname, mq, ART, $, body, enhance } = c;
      const RP = T.replay, SF = RP.self;
      const me = R.players.some((p) => p.id === S.me), mi = R.players.findIndex((p) => p.id === S.me);

      function belief(s) {   // 믿은 패 (SPEC 13.8): r 기준
        const N = R.night; if (!N) return null;
        const ce = N.ev.find((e) => e.k === 'copy'), cp = ce ? N.deal[ce.see[0][0]] : null;
        const eff = (x) => (N.deal[x] === 'doppelganger' && cp ? cp : N.deal[x]);
        let b = R.players[s].original;
        N.ev.forEach((e) => {
          const i = e.by.indexOf(s); if (i < 0) return;
          const r = e.r || e.st, see = e.see && (e.see.length === e.by.length ? e.see[i] : e.see[0]);
          if (e.k === 'copy' || (see && (r === 'robber' || r === 'insomniac'))) b = eff(see[0]);
          else if (r === 'drunk') b = 'blind';
        });
        return b;
      }
      function selfLine() {
        const p = R.players[mi], f = ROLES[p.effective].name;
        let b = null; try { b = belief(mi); } catch (e) { /* 무시 */ }
        b = b || p.original;
        const o = [b === 'blind' ? fmt(SF.blind, { f }) : b === p.effective ? fmt(SF.same, { f }) : fmt(SF.diff, { b: ROLES[b].name, f })];
        if (SF.end && p.effective !== p.original) o.push(fmt(SF.end, { f, o: ROLES[p.original].name }));
        if (p.final === 'doppelganger' && R.doppelCopy) o.push(fmt(SF.doppel, { r: ROLES[R.doppelCopy].name }));
        o.push(fmt(p.win ? SF.win : SF.lose, { team: TEAM_NAME[p.team] }));
        return o.join(' ');
      }
      function verdictKey() {
        const w = R.winners;
        if (w.indexOf('village') >= 0) return [R.wolvesInPlay ? 'village' : 'villageNoWolf', 'village'];
        if (w.indexOf('wolf') >= 0) return [R.wolvesInPlay ? 'wolf' : 'minion', 'wolf'];
        return w.indexOf('tanner') >= 0 ? ['tanner', 'tanner'] : ['none', 'none'];
      }

      const bd = $('.board'), vk = verdictKey();
      if (ART.warm && vk[1] !== 'none') ART.warm(['verdict-' + vk[1]]);
      const vdeaths = R.deaths.filter((d) => d.by === 'vote'), vote = vdeaths.map((d) => R.players[d.s].name);
      const execSet = {}, execCards = vdeaths.map((d) => { const q = R.players[d.s]; execSet[d.s] = 1; return fmt(TB.execCard, { n: NM(q.name), r: ROLES[q.final === 'doppelganger' && R.doppelCopy ? R.doppelCopy : q.effective].name }); });
      const used = {}, whyL = [];
      execCards.forEach((l) => { used[l] = 1; });
      R.why.forEach((w) => {
        const ix = w[1] || [];
        if (w[0] === 'wolf_died' && ix.some((i) => execSet[i])) return;
        const you = ix.indexOf(mi) >= 0 && RP.why[w[0] + '_you'];   // 내가 목록에 있으면 2인칭 문장, 없으면 이름 대신 '당신'
        const v = { t: ix.map((i) => (i === mi ? RP.you : R.players[i].name)).join(', '), h: ix.map((i) => (i === mi ? esc(RP.you) : nmh(R.players[i].name))).join(', ') };
        const l = fmt(you || RP.why[w[0]] || '', { list: v, t: v, a: v });
        if (!l || used[l]) return; used[l] = 1; whyL.push(l);
      });
      const hunts = R.deaths.filter((d) => d.by === 'hunter');
      const chip = (id, cp) => { const r = ROLES[id]; return '<svg aria-hidden="true"><use href="#' + r.sigil + '"/></svg>' + esc(id === 'doppelganger' && cp ? fmt(TB.doppelArrow, { r: ROLES[cp].name }) : r.name); };
      const row = (p, i, alt) => '<li class="rec-row' + (p.id === S.me ? ' is-me' : '') + (p.dead ? ' is-dead' : '') + (p.win ? ' is-win' : '') + (alt ? ' is-altar' : '') + (!alt && !S.players.some((x) => x.id === p.id) ? ' is-gone' : '') + '" data-slot="' + i + '">' +
        '<div class="rec-top"><b class="rec-n nm">' + esc(alt || p.name) + '</b>' + (p.dead && !alt ? '<i class="rec-x">' + esc(T.stamp.exec || T.stamp.dead) + '</i>' : '') +
        (alt ? '' : '<span class="rec-stamp' + (p.win ? ' is-win' : '') + '">' + esc(p.win ? T.stamp.win : T.stamp.lose) + '</span>') +
        '<span class="rec-chg"><span class="rec-from">' + chip(p.original) + '</span><span class="rec-arrow">→</span><span class="rec-to">' + chip(p.final, R.doppelCopy) + '</span></span>' +
        (alt ? '' : '<span class="rec-meta"><span class="rec-vote">' + esc(TB.cols.vote) + ' ' + (p.vote ? nmh(pname(p.vote)) : '—') + '</span> · <span class="rec-got">' + esc(TB.cols.votes) + ' ' + p.votes + '</span></span>' +
          (hunts.some((d) => d.s === i) ? '<svg class="rec-hunt" aria-hidden="true"><use href="#sg-hunter"/></svg>' : '')) + '</div></li>';
      const rank = (p) => (p.id === S.me ? 0 : p.dead ? 1 : 2);
      const rows = R.players.map((p, i) => [p, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]);
      const n = R.players.length, mob = mq('(max-width:599px)');
      const effOf = (q) => (q.final === 'doppelganger' && R.doppelCopy ? R.doppelCopy : q.effective), heroes = [];
      vdeaths.forEach((d) => { const q = R.players[d.s]; if (heroes.length < 2) heroes.push([effOf(q), 'is-dead', q.id === S.me ? TB.heroDeadMe : TB.heroDead, q.name]); });
      const keyW = R.why.find((w) => /^(wolf_lived|tanner_blocked|minion_|tanner_too)/.test(w[0]) && (w[1] || []).some((i) => !execSet[i]));
      if (keyW && heroes.length < 2) { const i = keyW[1].find((x) => !execSet[x]), q = R.players[i]; heroes.push([effOf(q), '', q.id === S.me ? TB.whoMine : TB.heroKey, q.name]); }
      if (ART.want && heroes.length) ART.want(heroes.map((h) => h[0]));
      const heroH = heroes.length ? '<div class="verdict-cards">' + heroes.map((h) => '<figure>' + ART.card(h[0], { size: 'md', face: 1, cls: h[1] }) + '<figcaption>' + fmt(h[2] || '', { n: NM(h[3]) }) + '</figcaption></figure>').join('') + '</div>' : '';
      bd.innerHTML = '<div class="verdict" data-team="' + vk[1] + '"><p class="verdict-line">' + esc(T.verdict[vk[0]]) + '</p>' + heroH +
        (vote.length || !R.why.some((w) => w[0] === 'no_death') ? '<p class="verdict-why">' + (vote.length ? fmt(TB.execLine, { names: names(vote) }) : TB.noBlood) + '</p>' : '') +
        execCards.map((l) => '<p class="verdict-why">' + l + '</p>').join('') +
        whyL.map((l) => '<p class="verdict-why">' + l + '</p>').join('') +
        hunts.map((d) => '<p class="verdict-why">' + fmt(TB.hunterLine, { a: NM(R.players[d.h].name), b: NM(R.players[d.s].name) }) + '</p>').join('') +
        (me ? '<p class="verdict-self"><b class="verdict-you">' + esc(TB.me) + '</b> <span class="vs-t">' + esc(selfLine()) + '</span></p>' : '') + '</div>' +
        (R.night ? '<button class="btn-sub rp-again" data-act="replay" type="button" hidden>' + esc(TBT.replay) + '</button>' : '') +
        (R.night ? '<details class="tl-sec" open hidden><summary class="tl-head">' + esc(TH.happened) + '</summary><ol class="tl-list"></ol></details>' : '') +
        '<details class="rec-sec" open><summary class="rec-head">' + esc(TH.records) + '</summary><ul class="rec-list">' + rows.map((x) => row(x[0], x[1])).join('') +
        [0, 1, 2].map((i) => row({ original: R.center.original[i], final: R.center.final[i] }, n + i, T.altar[i])).join('') + '</ul></details>';
      ART.mark(bd); bd._d = 1;
      if (mob && !body.dataset.replay) $('#stage').classList.add('is-fold');
      enhance();
    },
  };
})();
