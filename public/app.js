/* global io, WW */
(function () {
  'use strict';
  const { ROLES, ROLE_ORDER, NIGHT_TEXT, TEAM_NAME, MIN_PLAYERS, MAX_PLAYERS } = WW;
  const socket = io();
  const $ = (s) => document.querySelector(s);
  const main = $('#main');

  let S = null;          // 서버에서 받은 내 상태
  let offset = 0;        // 서버 시간 - 내 시간
  let lastPhase = null;
  let lastStep = null;
  const ui = { promptKey: null, seerMode: null, sel: [] };

  // ---------- 저장소 ----------
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* 무시 */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* 무시 */ } },
  };
  function playerId() {
    let id = LS.get('ww_pid');
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      LS.set('ww_pid', id);
    }
    return id;
  }
  let voiceOn = LS.get('ww_voice') === '1';

  // ---------- 헬퍼 ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isHost = () => S && S.hostId === S.me;
  const pname = (id) => S.players.find((p) => p.id === id)?.name ?? '?';
  const others = () => S.players.filter((p) => p.id !== S.me);

  function card(role, opts = {}) {
    if (!role) return `<div class="rcard back ${opts.size || ''}"><div class="rc-frame"><div class="rc-sigil">☾</div></div></div>`;
    const r = ROLES[role];
    return `<div class="rcard team-${r.team} ${opts.size || ''}" title="${esc(r.desc)}"><div class="rc-frame">
      <div class="rc-medal"><span class="emo">${r.emoji}</span></div>
      <div class="nm">${esc(r.name)}</div>
      <div class="rc-team">${esc(TEAM_NAME[r.team])}</div>
      ${opts.sub ? `<div class="sub">${esc(opts.sub)}</div>` : ''}</div></div>`;
  }

  function skyFor(s) {
    if (!s) return 'night';
    if (s.phase === 'night') return 'deep';
    if (s.phase === 'day') return 'day';
    if (s.phase === 'vote') return 'blood';
    if (s.phase === 'result') return s.result && s.result.winners.includes('wolf') ? 'blood' : 'day';
    return 'night';
  }

  function timerHTML(deadline, cls = '') {
    if (!deadline) return '';
    return `<span class="timer ${cls}" data-deadline="${deadline}">--:--</span>`;
  }

  function toast(msg, ms = 2500) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, ms);
  }

  function emit(ev, data) {
    return new Promise((res) => socket.emit(ev, data, (r) => res(r || { ok: true })));
  }
  async function act(ev, data) {
    const r = await emit(ev, data);
    if (r && r.ok === false) toast(r.error || '오류가 발생했습니다.');
    return r;
  }

  function speak(text) {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch { /* 무시 */ }
  }

  // ---------- 소켓 ----------
  socket.on('connect', () => {
    const code = LS.get('ww_room');
    if (code) {
      socket.emit('join', { code, playerId: playerId(), rejoin: true }, (r) => {
        if (!r || !r.ok) { LS.del('ww_room'); S = null; render(); }
      });
    } else if (!S) render();
  });
  socket.on('disconnect', () => toast('서버와 연결이 끊겼습니다. 다시 연결하는 중…', 4000));

  socket.on('state', (s) => {
    S = s;
    offset = s.now - Date.now();
    LS.set('ww_room', s.code);
    if (S.phase !== lastPhase) onPhaseChange(lastPhase, S.phase);
    if (S.phase === 'night' && S.stepRole !== lastStep) {
      lastStep = S.stepRole;
      if (S.stepRole) speak(NIGHT_TEXT[S.stepRole]);
    }
    lastPhase = S.phase;
    render();
  });

  socket.on('chatHistory', (msgs) => {
    $('#chatLog').innerHTML = '';
    msgs.forEach(addChat);
  });
  socket.on('chat', addChat);
  socket.on('kicked', () => {
    LS.del('ww_room');
    S = null;
    render();
    toast('방장에 의해 방에서 나가게 되었습니다.', 4000);
  });

  function onPhaseChange(from, to) {
    if (to === 'night') { lastStep = null; speak('밤이 되었습니다. 모두 눈을 감으세요.'); }
    if (to === 'day') speak('아침이 밝았습니다. 모두 눈을 뜨세요.');
    if (to === 'vote') speak('투표 시간입니다.');
    if (from && to !== from) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addChat(m) {
    const log = $('#chatLog');
    const el = document.createElement('div');
    if (m.system) {
      el.className = 'msg sys';
      el.textContent = m.text;
    } else {
      el.className = 'msg' + (S && m.id === S.me ? ' mine' : '');
      el.innerHTML = `<b>${esc(m.name)}</b><span>${esc(m.text)}</span>`;
    }
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    log.appendChild(el);
    if (atBottom || (S && m.id === S.me)) log.scrollTop = log.scrollHeight;
  }

  $('#chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#chatInput');
    const text = inp.value.trim();
    if (!text) return;
    socket.emit('chat', { text });
    inp.value = '';
  });

  // ---------- 렌더 ----------
  function render() {
    const inRoom = !!S;
    $('#topbar').hidden = !inRoom;
    $('#chat').hidden = !inRoom;
    $('#chatFab').hidden = !inRoom;
    document.body.dataset.phase = inRoom ? S.phase : 'home';
    document.body.dataset.sky = skyFor(S);
    $('#voiceBtn').textContent = voiceOn ? '🔊' : '🔈';
    if (!inRoom) return renderHome();

    $('#roomTag').textContent = `방 ${S.code}`;
    const night = S.phase === 'night';
    $('#chatInput').disabled = night;
    $('#chatInput').placeholder = night ? '밤에는 대화할 수 없습니다 🤫' : '메시지 입력…';

    switch (S.phase) {
      case 'lobby': return renderLobby();
      case 'night': return renderNight();
      case 'day': return renderDay();
      case 'vote': return renderVote();
      case 'result': return renderResult();
    }
  }

  // 화면이 실제로 바뀔 때만 다시 그림 (애니메이션 깜빡임 방지)
  let lastHTML = '';
  function setMain(html) {
    if (html === lastHTML) return;
    lastHTML = html;
    main.innerHTML = html;
  }

  function renderHome() {
    if (main.querySelector('.home')) return;
    lastHTML = '';
    const params = new URLSearchParams(location.search);
    const code = (params.get('room') || '').toUpperCase();
    main.innerHTML = `
      <section class="home">
        <div class="eyebrow">ONE NIGHT · WEREWOLF</div>
        <h1>한밤의 늑대인간</h1>
        <div class="ornament">✦</div>
        <p class="tagline">단 하룻밤, 단 한 번의 투표.<br>마을에 숨어든 늑대인간을 찾아라.</p>
        <div class="panel home-box">
          <label for="nameInput">닉네임</label>
          <input id="nameInput" maxlength="12" placeholder="닉네임 (최대 12자)" value="${esc(LS.get('ww_name') || '')}">
          ${code ? `
            <button class="btn primary big" data-act="join">방 ${esc(code)} 참가하기</button>
            <input id="codeInput" type="hidden" value="${esc(code)}">
            <button class="btn ghost" data-act="create">대신 새 방 만들기</button>
          ` : `
            <button class="btn primary big" data-act="create">새 방 만들기</button>
            <div class="divider"><span>또는 코드로 참가</span></div>
            <div class="row">
              <input id="codeInput" maxlength="4" placeholder="방 코드 4자리" style="text-transform:uppercase">
              <button class="btn" data-act="join">참가</button>
            </div>
          `}
        </div>
        <button class="btn link" data-act="guide">📖 게임 방법 · 역할 설명</button>
        <p class="foot">${MIN_PLAYERS}~${MAX_PLAYERS}명 · 한 판 약 10분 · 음성 통화와 함께하면 더 재밌어요</p>
      </section>`;
    const ni = $('#nameInput');
    ni.addEventListener('keydown', (e) => { if (e.key === 'Enter') handlers[code ? 'join' : 'create'](); });
    const ci = $('#codeInput');
    if (ci && ci.type !== 'hidden') ci.addEventListener('keydown', (e) => { if (e.key === 'Enter') handlers.join(); });
  }

  function playerList(opts = {}) {
    return `<ul class="players">${S.players.map((p) => {
      const badges = [];
      if (p.id === S.hostId) badges.push('<span class="badge host">👑 방장</span>');
      if (p.id === S.me) badges.push('<span class="badge me">나</span>');
      if (!p.connected) badges.push('<span class="badge off">연결 끊김</span>');
      if (opts.ready && p.ready) badges.push('<span class="badge ok">✋ 투표 준비</span>');
      if (opts.voted) badges.push(p.voted ? '<span class="badge ok">✔ 투표함</span>' : '<span class="badge wait">고민 중…</span>');
      const kick = opts.kick && isHost() && p.id !== S.me ? `<button class="mini" data-act="kick" data-id="${p.id}" title="내보내기">✕</button>` : '';
      return `<li class="${p.connected ? '' : 'dim'}"><span class="pn">${esc(p.name)}</span>${badges.join('')}${kick}</li>`;
    }).join('')}</ul>`;
  }

  function renderLobby() {
    const n = S.players.length;
    const total = ROLE_ORDER.reduce((s, r) => s + (S.deck[r] || 0), 0);
    const need = n + 3;
    const okCount = n >= MIN_PLAYERS && n <= MAX_PLAYERS;
    const okDeck = total === need;
    const host = isHost();
    const link = `${location.origin}${location.pathname}?room=${S.code}`;
    const masonWarn = S.deck.mason === 1 ? '<p class="warn">⚠ 프리메이슨은 보통 2장을 함께 넣습니다.</p>' : '';
    const wolfWarn = !S.deck.werewolf ? '<p class="warn">⚠ 늑대인간이 없습니다. 괜찮나요?</p>' : '';

    setMain(`
      <section class="lobby">
        <div class="panel invite">
          <div>
            <div class="muted">방 코드</div>
            <div class="code">${esc(S.code)}</div>
          </div>
          <div class="invite-actions">
            <button class="btn" data-act="copyLink" data-link="${esc(link)}">🔗 초대 링크 복사</button>
          </div>
        </div>

        <div class="grid2">
          <div class="panel">
            <h2>플레이어 <span class="muted">${n}/${MAX_PLAYERS}</span></h2>
            ${playerList({ kick: true })}
            ${n < MIN_PLAYERS ? `<p class="muted">최소 ${MIN_PLAYERS}명이 필요합니다. 친구를 초대하세요!</p>` : ''}
          </div>

          <div class="panel">
            <h2>게임 설정</h2>
            <label class="field">낮 토론 시간
              <select id="dayTime" ${host ? '' : 'disabled'}>
                ${[60, 120, 180, 240, 300, 420, 600].map((s) => `<option value="${s}" ${S.settings.dayTime === s ? 'selected' : ''}>${s / 60}분</option>`).join('')}
              </select>
            </label>
            <p class="muted small">카드는 <b>인원 + 3장</b>을 사용합니다. 남는 3장은 가운데에 놓입니다.</p>
          </div>
        </div>

        <div class="panel">
          <div class="deck-head">
            <h2>사용할 카드</h2>
            <div class="count ${okDeck ? 'ok' : 'bad'}">${total} / ${need}장</div>
            ${host ? `<button class="btn small" data-act="preset">✨ 추천 구성</button>` : ''}
          </div>
          ${!S.deckCustom ? '<p class="muted small">인원에 맞는 추천 구성이 자동으로 적용되고 있습니다.</p>' : ''}
          <div class="deck">
            ${ROLE_ORDER.map((r) => {
              const c = S.deck[r] || 0;
              const R = ROLES[r];
              return `<div class="deck-item ${c ? 'on' : ''} team-${R.team}">
                <div class="di-top"><span class="emo">${R.emoji}</span><span class="nm">${R.name}</span></div>
                <div class="di-desc">${esc(R.desc)}</div>
                <div class="di-ctl">
                  ${host ? `<button class="mini" data-act="deck" data-role="${r}" data-d="-1" ${c <= 0 ? 'disabled' : ''}>−</button>` : ''}
                  <span class="cnt">${c}</span>
                  ${host ? `<button class="mini" data-act="deck" data-role="${r}" data-d="1" ${c >= R.max ? 'disabled' : ''}>+</button>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
          ${masonWarn}${wolfWarn}
        </div>

        <div class="start-bar">
          ${host
            ? `<button class="btn primary big" data-act="start" ${okCount && okDeck ? '' : 'disabled'}>🌙 게임 시작</button>
               ${!okCount ? `<p class="muted">${MIN_PLAYERS}~${MAX_PLAYERS}명이 필요합니다.</p>` : !okDeck ? `<p class="muted">카드를 정확히 ${need}장으로 맞춰주세요.</p>` : ''}`
            : '<p class="muted">방장이 게임을 시작하기를 기다리는 중…</p>'}
        </div>
      </section>`);

  }

  function stepTrack() {
    return `<div class="steps">${S.steps.map((r, i) => {
      const cls = i < S.stepIdx ? 'past' : i === S.stepIdx ? 'now' : '';
      const emo = r === '_check' ? '🃏' : ROLES[r].emoji;
      const nm = r === '_check' ? '카드 확인' : ROLES[r].name;
      return `<div class="step ${cls}" title="${nm}"><span>${emo}</span><small>${nm}</small></div>`;
    }).join('')}</div>`;
  }

  function myLogHTML(title = '🌙 밤에 알게 된 정보') {
    const items = S.myLog || [];
    return `<div class="panel log">
      <h3>${title}</h3>
      ${items.length ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="muted small">밤 동안 알게 된 정보가 없습니다.</p>'}
    </div>`;
  }

  function promptHTML(p) {
    if (p.key !== ui.promptKey) {
      ui.promptKey = p.key;
      ui.seerMode = null;
      ui.sel = [];
    }
    const playerBtns = (actName, selected = []) => `<div class="choices">${others().map((o) =>
      `<button class="choice ${selected.includes(o.id) ? 'sel' : ''}" data-act="${actName}" data-id="${o.id}">👤 ${esc(o.name)}</button>`).join('')}</div>`;
    const centerBtns = (actName, selected = []) => `<div class="choices center">${[0, 1, 2].map((i) =>
      `<button class="choice ccard ${selected.includes(i) ? 'sel' : ''}" data-act="${actName}" data-c="${i}">${card(null, { size: 'sm' })}<small>가운데 ${i + 1}</small></button>`).join('')}</div>`;
    const timer = timerHTML(S.stepEndsAt);
    const prefix = p.fromDoppel ? '🎭 도플갱어로서 ' : '';

    if (p.done) return `<div class="panel sleeping"><div class="closed-eyes"><i></i><i></i></div><p>행동을 마쳤습니다. 다시 눈을 감으세요…</p></div>`;

    switch (p.type) {
      case 'info':
        return `<div class="panel prompt">
          <h3>${esc(p.title)} — 눈을 뜨세요 ${timer}</h3>
          <p class="info-text">${esc(p.text)}</p>
          <button class="btn primary" data-act="ack">확인했습니다</button></div>`;
      case 'lonewolf':
        return `<div class="panel prompt">
          <h3>🐺 혼자인 늑대인간 ${timer}</h3>
          <p>동료가 없습니다. 가운데 카드 1장을 볼 수 있습니다.</p>
          ${centerBtns('lone')}
          <button class="btn ghost" data-act="skip">보지 않기</button></div>`;
      case 'doppelganger':
        return `<div class="panel prompt">
          <h3>🎭 도플갱어 ${timer}</h3>
          <p>다른 플레이어 1명의 카드를 보고 그 역할이 됩니다.</p>
          ${playerBtns('doppel')}</div>`;
      case 'seer': {
        const mode = ui.seerMode;
        return `<div class="panel prompt">
          <h3>${prefix}🔮 예언자 ${timer}</h3>
          <p>플레이어 1명의 카드 <b>또는</b> 가운데 카드 2장을 볼 수 있습니다.</p>
          <h4>플레이어 1명 보기</h4>
          ${playerBtns('seerPlayer')}
          <h4>가운데 카드 2장 보기 ${mode === 'center' ? `<span class="muted">(${ui.sel.length}/2)</span>` : ''}</h4>
          ${centerBtns('seerCenter', mode === 'center' ? ui.sel : [])}
          <button class="btn ghost" data-act="skip">보지 않기</button></div>`;
      }
      case 'robber':
        return `<div class="panel prompt">
          <h3>${prefix}🗡️ 강도 ${timer}</h3>
          <p>카드를 훔칠 플레이어를 고르세요. 바꾼 뒤 새 카드를 확인합니다.</p>
          ${playerBtns('robber')}
          <button class="btn ghost" data-act="skip">훔치지 않기</button></div>`;
      case 'troublemaker':
        return `<div class="panel prompt">
          <h3>${prefix}🃏 말썽쟁이 ${timer}</h3>
          <p>카드를 서로 바꿀 두 명을 고르세요. <span class="muted">(${ui.sel.length}/2)</span></p>
          ${playerBtns('tmPick', ui.sel)}
          <div class="row">
            <button class="btn primary" data-act="tmGo" ${ui.sel.length === 2 ? '' : 'disabled'}>바꾸기</button>
            <button class="btn ghost" data-act="skip">바꾸지 않기</button>
          </div></div>`;
      case 'drunk':
        return `<div class="panel prompt">
          <h3>${prefix}🍺 주정뱅이 ${timer}</h3>
          <p>가운데 카드 1장과 자신의 카드를 바꿉니다. (새 카드는 볼 수 없습니다)</p>
          ${centerBtns('drunk')}</div>`;
    }
    return '';
  }

  function renderNight() {
    const role = S.stepRole;
    const isCheck = role === '_check';
    const p = S.prompt;
    const narr = role ? NIGHT_TEXT[role] : '';
    const emo = isCheck ? '🃏' : role ? ROLES[role].emoji : '🌙';

    let body;
    if (isCheck) {
      body = `<div class="panel reveal">
        <p class="lead">당신이 받은 카드는…</p>
        <div class="flip"><div class="flip-inner">
          <div class="face back">${card(null, { size: 'xl' })}</div>
          <div class="face front">${card(S.myCard, { size: 'xl' })}</div>
        </div></div>
        <p class="desc">${esc(ROLES[S.myCard].desc)}</p>
        <p class="muted small">잠시 후 밤이 찾아옵니다 ${timerHTML(S.stepEndsAt)}</p>
      </div>`;
    } else if (p) {
      body = promptHTML(p);
    } else {
      body = `<div class="panel sleeping"><div class="closed-eyes"><i></i><i></i></div><p>눈을 감고 기다리세요…</p></div>`;
    }
    const sub = isCheck ? '밤이 오기 전' : `${S.stepIdx} / ${S.steps.length - 1}번째 차례`;

    setMain(`
      <section class="night">
        ${stepTrack()}
        <div class="narration" data-k="${esc(role)}"><span class="n-emo">${emo}</span>${esc(narr)}<span class="n-sub">${sub}</span></div>
        ${body}
        ${!isCheck ? `<div class="grid2">
          <div class="panel mine"><h3>내가 처음 받은 카드</h3>${card(S.myCard)}</div>
          ${myLogHTML()}
        </div>` : ''}
      </section>`);
  }

  function deckInPlay() {
    const d = S.gameDeck || S.deck;
    return `<div class="panel">
      <h3>이번 게임의 카드 <span class="muted small">(이 중 3장은 가운데에)</span></h3>
      <div class="mini-deck">${ROLE_ORDER.filter((r) => d[r]).map((r) =>
        `<span class="chip team-${ROLES[r].team}" title="${esc(ROLES[r].desc)}">${ROLES[r].emoji} ${ROLES[r].name}${d[r] > 1 ? ` ×${d[r]}` : ''}</span>`).join('')}</div>
    </div>`;
  }

  function renderDay() {
    const me = S.players.find((p) => p.id === S.me);
    const readyCount = S.players.filter((p) => p.ready && p.connected).length;
    const conn = S.players.filter((p) => p.connected).length;
    setMain(`
      <section class="day">
        <div class="phase-head sun">
          <div><h1>☀ 아침이 밝았습니다</h1><p>누가 늑대인간일까요? 밤사이 카드가 바뀌었을 수도 있습니다.</p></div>
          ${timerHTML(S.dayEndsAt, 'big')}
        </div>
        <div class="grid2">
          <div class="panel mine"><h3>내가 처음 받은 카드</h3>${card(S.myCard)}
            <p class="muted small">지금도 이 카드인지는 알 수 없습니다.</p></div>
          ${myLogHTML()}
        </div>
        <div class="panel">
          <h3>플레이어 <span class="muted small">투표 준비 ${readyCount}/${conn}</span></h3>
          ${playerList({ ready: true })}
          <div class="row">
            <button class="btn ${me.ready ? '' : 'primary'}" data-act="ready" data-v="${me.ready ? 0 : 1}">${me.ready ? '✋ 준비 취소' : '✋ 투표 준비 완료'}</button>
            ${isHost() ? '<button class="btn ghost" data-act="forceVote">⏩ 바로 투표 시작 (방장)</button>' : ''}
          </div>
          <p class="muted small">모두 준비하거나 시간이 끝나면 투표가 시작됩니다.</p>
        </div>
        ${deckInPlay()}
      </section>`);
  }

  function renderVote() {
    const votedCount = S.players.filter((p) => p.voted).length;
    setMain(`
      <section class="vote">
        <div class="phase-head dusk">
          <div><h1>붉은 달이 떴습니다</h1><p>처형할 사람을 고르세요. 결과가 나오기 전까지 바꿀 수 있습니다.</p></div>
          ${timerHTML(S.voteEndsAt, 'big')}
        </div>
        <div class="panel">
          <div class="choices vote-choices">${others().map((o) =>
            `<button class="choice ${S.myVote === o.id ? 'sel' : ''}" data-act="vote" data-id="${o.id}">👉 ${esc(o.name)}</button>`).join('')}</div>
          ${S.myVote ? `<p>내 투표: <b>${esc(pname(S.myVote))}</b></p>` : '<p class="muted">아직 투표하지 않았습니다.</p>'}
        </div>
        <div class="grid2">
          <div class="panel"><h3>투표 현황 <span class="muted small">${votedCount}/${S.players.length}</span></h3>${playerList({ voted: true })}</div>
          ${myLogHTML()}
        </div>
        <p class="muted small center">한 표씩만 받은 경우(모두 1표) 아무도 죽지 않습니다. 동점이면 모두 죽습니다.</p>
      </section>`);
  }

  function renderResult() {
    const R = S.result;
    const me = R.players.find((p) => p.id === S.me);
    const winText = R.winners.length ? R.winners.map((w) => TEAM_NAME[w]).join(' + ') + ' 승리!' : '아무도 이기지 못했습니다';
    const winEmo = R.winners.includes('wolf') ? '🐺' : R.winners.includes('tanner') ? '🪓' : R.winners.includes('village') ? '🏘️' : '💀';
    const deadNames = R.players.filter((p) => p.dead).map((p) => p.name);
    const deathLine = R.noDeath ? '아무도 죽지 않았습니다.' : `죽은 사람: ${deadNames.join(', ')}`;
    const roleLabel = (role) => role === 'doppelganger' && R.doppelCopy ? `도플갱어 → ${ROLES[R.doppelCopy].name}` : null;

    setMain(`
      <section class="result">
        <div class="panel banner ${me ? (me.win ? 'win' : 'lose') : ''}">
          <div class="big-emo">${winEmo}</div>
          <h1>${esc(winText)}</h1>
          <p>${esc(deathLine)}</p>
          ${R.hunterKills.map((h) => `<p>🏹 사냥꾼 ${esc(pname(h.hunter))}이(가) ${esc(pname(h.target))}을(를) 데려갔습니다.</p>`).join('')}
          ${me ? `<p class="you">${me.win ? '🎉 당신은 이겼습니다!' : '😢 당신은 졌습니다.'}</p>` : ''}
        </div>

        <div class="panel">
          <h3>모든 카드 공개</h3>
          <div class="table-wrap"><table class="res">
            <thead><tr><th>플레이어</th><th>처음 카드</th><th>최종 카드</th><th>투표</th><th>받은 표</th><th>결과</th></tr></thead>
            <tbody>${R.players.map((p) => `
              <tr class="${p.dead ? 'dead' : ''} ${p.id === S.me ? 'me' : ''}">
                <td>${p.dead ? '💀 ' : ''}${esc(p.name)}</td>
                <td>${card(p.original, { size: 'sm', sub: roleLabel(p.original) })}</td>
                <td>${card(p.final, { size: 'sm', sub: roleLabel(p.final) })}</td>
                <td>${p.vote ? esc(pname(p.vote)) : '—'}</td>
                <td>${p.votes}</td>
                <td><span class="badge ${p.win ? 'ok' : 'off'}">${p.win ? '승리' : '패배'}</span></td>
              </tr>`).join('')}</tbody>
          </table></div>
          <h4>가운데 카드</h4>
          <div class="center-cards">${R.center.final.map((c, i) => `<div>
            <small class="muted">가운데 ${i + 1}</small>
            ${card(c, { size: 'sm', sub: R.center.original[i] !== c ? `처음: ${ROLES[R.center.original[i]].name}` : null })}
          </div>`).join('')}</div>
        </div>

        <div class="grid2">
          <div class="panel log">
            <h3>🌙 밤에 일어난 일</h3>
            ${R.timeline.length ? `<ol>${R.timeline.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : '<p class="muted">밤에 아무 일도 일어나지 않았습니다.</p>'}
          </div>
          ${myLogHTML('🔎 내가 알았던 정보')}
        </div>

        <div class="start-bar">
          ${isHost() ? '<button class="btn primary big" data-act="playAgain">🔁 대기실로 (한 판 더)</button>' : '<p class="muted">방장이 다음 게임을 준비하기를 기다리는 중…</p>'}
        </div>
      </section>`);
  }

  // ---------- 모달 (게임 방법) ----------
  function openGuide() {
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box">
      <button class="icon-btn close" data-act="closeModal">✕</button>
      <h2>📖 게임 방법</h2>
      <ol class="rules">
        <li><b>카드 받기</b> — 각자 카드 1장을 받고, 남는 3장은 가운데에 엎어 둡니다.</li>
        <li><b>밤</b> — 역할 순서대로 한 명씩 깨어나 능력을 씁니다. 밤사이 카드가 바뀔 수 있어서 <b>지금 내가 무슨 역할인지 확신할 수 없습니다.</b></li>
        <li><b>낮</b> — 모두 토론합니다. 거짓말도, 블러핑도 자유!</li>
        <li><b>투표</b> — 동시에 한 명을 지목합니다. 가장 많은 표를 받은 사람이 죽습니다. (모두 1표씩이면 아무도 안 죽고, 동점이면 모두 죽음)</li>
        <li><b>승리</b> — 게임이 끝날 때 <b>최종 카드</b>로 팀이 정해집니다.
          <ul>
            <li>🏘️ 마을 팀: 늑대인간을 한 명이라도 죽이면 승리 (늑대인간이 아무도 없다면, 아무도 죽지 않아야 승리)</li>
            <li>🐺 늑대인간 팀: 늑대인간이 아무도 죽지 않으면 승리</li>
            <li>🪓 무두장이: 자신이 죽으면 승리</li>
          </ul>
        </li>
      </ol>
      <h2>역할 (밤에 깨어나는 순서)</h2>
      <div class="guide-roles">${ROLE_ORDER.map((r) => `<div class="g-role team-${ROLES[r].team}">
        <div class="g-head">${ROLES[r].emoji} <b>${ROLES[r].name}</b> <span class="muted small">${TEAM_NAME[ROLES[r].team] || ''}</span></div>
        <p>${esc(ROLES[r].desc)}</p></div>`).join('')}</div>
    </div>`;
    m.hidden = false;
  }

  // ---------- 클릭 처리 ----------
  const handlers = {
    async create() {
      const name = $('#nameInput').value.trim();
      if (!name) return toast('닉네임을 입력하세요.');
      LS.set('ww_name', name);
      const r = await act('create', { name, playerId: playerId() });
      if (r.ok) history.replaceState(null, '', location.pathname);
    },
    async join() {
      const name = $('#nameInput').value.trim();
      const code = ($('#codeInput')?.value || '').trim().toUpperCase();
      if (!name) return toast('닉네임을 입력하세요.');
      if (code.length !== 4) return toast('4자리 방 코드를 입력하세요.');
      LS.set('ww_name', name);
      const r = await act('join', { code, name, playerId: playerId() });
      if (r.ok) history.replaceState(null, '', location.pathname);
    },
    async leave() {
      if (!confirm('방에서 나가시겠습니까?')) return;
      await emit('leave');
      LS.del('ww_room');
      S = null;
      lastPhase = null;
      $('#chatLog').innerHTML = '';
      render();
    },
    copyLink(d) {
      const done = () => toast('초대 링크를 복사했습니다!');
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(d.link).then(done, () => prompt('초대 링크', d.link));
      else prompt('아래 링크를 복사해서 친구에게 보내세요', d.link);
    },
    kick(d) {
      if (confirm(`${pname(d.id)}님을 내보낼까요?`)) socket.emit('kick', { id: d.id });
    },
    deck(d) { socket.emit('setDeck', { role: d.role, count: (S.deck[d.role] || 0) + Number(d.d) }); },
    preset() { socket.emit('preset'); },
    start() { act('start'); },
    guide: openGuide,
    toChat() {
      $('#chat').scrollIntoView({ behavior: 'smooth', block: 'end' });
      if (!$('#chatInput').disabled) setTimeout(() => $('#chatInput').focus({ preventScroll: true }), 400);
    },
    closeModal() { $('#modal').hidden = true; },
    toggleVoice() {
      voiceOn = !voiceOn;
      LS.set('ww_voice', voiceOn ? '1' : '0');
      toast(voiceOn ? '🔊 밤 나레이션을 음성으로 읽어줍니다.' : '🔈 음성 나레이션을 껐습니다.');
      if (voiceOn) speak('음성 나레이션을 켰습니다.');
      render();
    },

    // 밤 행동
    ack() { act('nightAction', {}); },
    skip() { act('nightAction', { skip: true }); },
    lone(d) { act('nightAction', { center: Number(d.c) }); },
    doppel(d) { act('nightAction', { player: d.id }); },
    seerPlayer(d) {
      if (confirm(`${pname(d.id)}의 카드를 볼까요?`)) act('nightAction', { player: d.id });
    },
    seerCenter(d) {
      const c = Number(d.c);
      if (ui.seerMode !== 'center') { ui.seerMode = 'center'; ui.sel = []; }
      ui.sel = ui.sel.includes(c) ? ui.sel.filter((x) => x !== c) : [...ui.sel, c];
      if (ui.sel.length === 2) act('nightAction', { centers: ui.sel });
      else render();
    },
    robber(d) {
      if (confirm(`${pname(d.id)}의 카드를 훔칠까요?`)) act('nightAction', { player: d.id });
    },
    tmPick(d) {
      ui.sel = ui.sel.includes(d.id) ? ui.sel.filter((x) => x !== d.id) : [...ui.sel, d.id].slice(-2);
      render();
    },
    tmGo() { if (ui.sel.length === 2) act('nightAction', { players: ui.sel }); },
    drunk(d) { act('nightAction', { center: Number(d.c) }); },

    // 낮/투표/결과
    ready(d) { socket.emit('ready', { ready: d.v === '1' }); },
    forceVote() { if (confirm('토론을 끝내고 바로 투표를 시작할까요?')) socket.emit('forceVote'); },
    vote(d) { act('vote', { target: d.id }); },
    playAgain() { socket.emit('playAgain'); },
  };

  document.addEventListener('click', (e) => {
    if (e.target.id === 'modal') { $('#modal').hidden = true; return; }
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = handlers[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el.dataset); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#modal').hidden = true; });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'dayTime') socket.emit('setSettings', { dayTime: Number(e.target.value) });
  });

  // ---------- 타이머 ----------
  setInterval(() => {
    const now = Date.now() + offset;
    document.querySelectorAll('[data-deadline]').forEach((el) => {
      const left = Math.max(0, Math.ceil((Number(el.dataset.deadline) - now) / 1000));
      const m = Math.floor(left / 60);
      const s = left % 60;
      el.textContent = `${m}:${String(s).padStart(2, '0')}`;
      el.classList.toggle('urgent', left <= 10);
    });
  }, 250);

  render();
})();
