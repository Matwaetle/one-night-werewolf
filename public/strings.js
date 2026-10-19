// 한밤의 늑대인간 — 카피 덱 (DESIGN_SPEC §10). 서버(Node require)와 브라우저(window.T) 공용 UMD.
// 템플릿 문법: ${key} 치환, ${key:이/가} 치환 + 조사. T.fmt(tpl, vars)로 쓴다.
//   vars 값이 {t:'민수', h:'<b class="nm">민수</b>'} 형태면 조사 판정은 t, 출력은 h를 쓴다.
// 디스플레이 그룹(폰트 서브셋 대상): title btn head phase verdict stamp — 문자열 값만 둔다(중첩 금지).
// 비디스플레이: body narr chat msg altar replay.
(function (root) {
  'use strict';

  // ---------- 조사 ----------
  // 끝 글자 판정: 'none' 받침 없음, 'jong' 받침 있음, 'rieul' ㄹ받침, 'other' 판정 불가(라틴 등)
  const DIGIT_JONG = { 0: 'jong', 1: 'rieul', 2: 'none', 3: 'jong', 4: 'none', 5: 'none', 6: 'jong', 7: 'rieul', 8: 'rieul', 9: 'none' };

  function endKind(word) {
    const s = String(word == null ? '' : word);
    for (let i = s.length - 1; i >= 0; i--) {
      const ch = s[i];
      const c = ch.charCodeAt(0);
      if (c >= 0xAC00 && c <= 0xD7A3) {
        const j = (c - 0xAC00) % 28;
        return j === 0 ? 'none' : (j === 8 ? 'rieul' : 'jong');
      }
      if (ch >= '0' && ch <= '9') return DIGIT_JONG[ch];
      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) return 'other';
      if (/\s/.test(ch) || /[.,!?~"'`)\]}>\-_:;·…]/.test(ch)) continue; // 꼬리 문장부호·공백은 건너뛴다
      return 'other';
    }
    return 'other';
  }

  const JOSA = {
    '이/가': ['이', '가'],
    '을/를': ['을', '를'],
    '과/와': ['과', '와'],
    '은/는': ['은', '는'],
    '이다/다': ['이다', '다'],
    '이었다/였다': ['이었다', '였다'],
    '이라/라': ['이라', '라'],
  };

  // word + 조사. 라틴 등 판정 불가면 조사 대신 `${word} —`.
  function josa(word, pair) {
    const w = String(word == null ? '' : word);
    const k = endKind(w);
    if (k === 'other') return w + ' —';
    if (pair === '으로/로') return w + ((k === 'none' || k === 'rieul') ? '로' : '으로');
    const p = JOSA[pair];
    if (!p) return w;
    return w + (k === 'none' ? p[1] : p[0]);
  }

  // ---------- 템플릿 ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function fmt(tpl, vars) {
    vars = vars || {};
    return String(tpl).replace(/\$?\{(\w+)(?::([^}]+))?\}/g, (m, key, pair) => {
      const v = vars[key];
      if (v == null) return '';
      let plain, html;
      if (typeof v === 'object') { plain = String(v.t == null ? '' : v.t); html = v.h == null ? plain : String(v.h); }
      else { plain = html = String(v); }
      if (!pair) return html;
      const out = josa(plain, pair); // plain + 조사 (또는 plain + ' —')
      return html + out.slice(plain.length);
    });
  }

  // 읽기 시간용 음절 수: 한글 음절 + 숫자 1자씩 + 라틴 두 글자당 1. HTML 태그·${...}는 뺀다.
  function syl(str) {
    const s = String(str == null ? '' : str).replace(/<[^>]*>/g, '').replace(/\$?\{[^}]*\}/g, '');
    let n = 0, latin = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) n++;
      else if (c >= 48 && c <= 57) n++;
      else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) latin++;
    }
    return n + Math.ceil(latin / 2);
  }

  const T = {
    // ========== 디스플레이 그룹 (Hanbam 서브셋 대상) ==========
    title: {
      game: '한밤의 늑대인간',
    },

    btn: {
      open: '마을을 연다',
      join: '들어간다',
      otherTown: '다른 마을을 연다',
      law: '법도',
      or: '혹은',
      copyCode: '표식 베끼기',
      kick: '내쫓는다',
      start: '밤을 부른다',
      seen: '봤다',
      noLook: '보지 않는다',
      stealFace: '얼굴을 훔친다',
      look: '본다',
      lookAltar: '제단을 본다',
      steal: '훔친다',
      noSteal: '훔치지 않는다',
      swap: '바꾼다',
      noSwap: '손대지 않는다',
      execute: '처형',
      ready: '심판하자',
      unready: '손을 내린다',
      judgeNow: '지금 심판한다',
      again: '다시, 밤으로',
      skip: '건너뛴다',
      pause: '멈춘다',
      resume: '잇는다',
      restart: '처음부터',
      leave: '떠난다',
      leaveTown: '마을을 떠난다',
      voiceOn: '목소리를 켠다',
      voiceOff: '목소리를 끈다',
      asleep: '잠들어 있다',
      close: '닫는다',
      replay: '그 밤을 다시 본다',
      fast: '×2',
      normal: '×1',
    },

    head: {
      law: '법도',
      lawOrder: '깨어나는 순서',
      whisper: '속삭임',
      sign: '표식',
      deck: '이번 밤의 패',
      arrange: '촌장의 배치',
      dayLen: '낮의 길이',
      altar: '제단',
      seen: '네가 본 것',
      records: '모든 기록',
      happened: '그 밤에 일어난 일',
      believed: '믿은 패',
      ending: '결말',
      judge: '지목하라.',
      name: '이름',
    },

    phase: {
      lobby: '모닥불',
      check: '패',
      night: '밤',
      dawn: '새벽',
      day: '낮',
      vote: '심판',
      result: '결말',
      prologue: '서막',
      verdict: '판결',
      awake: '눈을 떠라',
      nightFalls: '밤이 왔다.',
      dayBreaks: '날이 밝았다.',
      closeEyes: '눈을 감아라.',
    },

    verdict: {
      wolf: '늑대가 마을을 삼켰다.',
      minion: '하수인이 웃었다.',
      village: '늑대가 목매달렸다.',
      villageNoWolf: '늑대는 없었다.',
      tanner: '무두장이는 바라던 대로 죽었다.',
      none: '승자는 없다.',
    },

    stamp: {
      win: '이겼다',
      lose: '졌다',
      you: '너였다',
      yours: '네 패였다',
      changed: '바뀌었다',
    },

    // ========== 비디스플레이 그룹 ==========
    body: {
      minutes: '분', dec: '빼기', inc: '더하기', markPack: '무리', markOwner: '주인', markBro: '형제',
      // 홈
      namePh: '이름',
      codePh: '표식',
      joinCode: '${code} 마을로 들어간다',
      needName: '이름을 대라.',
      needCode: '표식은 네 글자다.',
      coldWake: '마을을 깨운다 · ${s}',
      coldNote: '깊이 잠든 마을이다. 1분은 걸린다.',
      // 모닥불
      signLabel: '표식',
      signTop: '표식 ${code}',
      copied: '표식을 베꼈다. 부를 자에게 넘겨라.',
      copyTitle: '표식',
      copyHint: '이 주소를 넘겨라.',
      fire: '불가에 ${n}/10',
      waitMore: '아직 ${need}명이 오지 않았다.',
      chief: '촌장',
      me: '너',
      away: '자리를 비움',
      kickAsk: '${n:을/를} 내쫓는다',
      kicked: '너는 마을에서 쫓겨났다.',
      deckNote: '패는 인원보다 셋 많다. 남은 셋은 제단에 엎는다.',
      deckCount: '이번 밤 ${total} / ${need}',
      arrangeNote: '인원에 맞춰 배치된다.',
      masonWarn: '프리메이슨은 둘이어야 서로를 안다.',
      noWolfWarn: '늑대 없는 밤이다.',
      lack: '${need}명 부족',
      deckLack: '패 ${total}/${need}',
      waitChief: '촌장을 기다린다',
      // 카드 확인
      yourCard: '네 패다.',
      holdHint: '누르고 있어라.',
      keepAwake: '화면을 끄지 마라.',
      peekFirst: '처음 받은 패',
      peekLast: '마지막으로 본 패',
      dockHint: '눌러 본다',
      // 밤
      nightFalls: '밤이 왔다. 눈을 감아라.',
      closeEyes: '눈을 감아라.',
      wake: '${role}.',
      doneClose: '끝났다. 눈을 감아라.',
      lone: '늑대인간.',
      loneSub: '너 혼자다. 제단의 패 하나를 봐라.',
      doppel: '도플갱어.',
      doppelSub: '하나를 골라라. 너는 그가 된다.',
      asDoppel: '도플갱어로서',
      seer: '예언자.',
      seerSub: '한 명의 패, 혹은 제단의 두 장.',
      robber: '강도.',
      robberSub: '훔칠 자를 골라라. 훔친 패는 네 것이다.',
      troublemaker: '말썽쟁이.',
      troublemakerSub: '둘을 골라라. 둘의 패를 맞바꾼다. 너는 보지 못한다.',
      drunk: '주정뱅이.',
      drunkSub: '제단의 패 하나를 골라라. 너는 보지 못한다.',
      insomniac: '불면증환자.',
      insomniacSub: '네 패를 다시 봐라.',
      pickStealBtn: '얼굴을 훔친다 ${n}',
      lookCount: '${n}/2',
      seenNothing: '너는 아무것도 보지 못했다.',
      sleeping: '잠들어 있다',
      blurHint: '눌러야 보인다.',
      coverHint: '탭하면 덮는다.',
      awakeTab: '● 눈을 떠라',
      ackFail: '전해지지 않았다. 다시.',
      autoPicked: '— 밤이 대신 골랐다',
      // 낮
      dawn: '날이 밝았다.',
      dayAsk: '너는 아직 너인가.',
      firstCard: '처음 받은 패',
      deckAll: '이번 밤의 패 — 셋은 제단에',
      raised: '손 든 자 ${r}/${n}',
      raisedBadge: '손 든 자',
      // 심판
      pickExec: '처형할 자를 골라라. 끝나기 전엔 바꿀 수 있다.',
      myVote: '지목: ${n}',
      noVote: '아직 지목하지 않았다.',
      voteCount: '지목 ${n}/${t}',
      voteRule: '모두 한 표씩이면 아무도 죽지 않는다. 동표면 모두 죽는다.',
      execLine: '${names} 처형.',
      noBlood: '피는 흐르지 않았다.',
      hunterLine: '사냥꾼 ${a}의 마지막 화살이 ${b:을/를} 꿰뚫었다.',
      doppelArrow: '도플갱어 → ${r}',
      // 결말
      cols: { name: '이름', first: '처음', last: '마지막', vote: '지목', votes: '표', end: '결말' },
      altarWord: '제단',
      altarFirst: '처음 ${r}',
      noNight: '그 밤, 아무도 움직이지 않았다.',
      journeyStay: '밤새 그대로였다.',
      waitChiefNext: '촌장을 기다린다',
      // 시스템
      error: '무언가 어긋났다.',
      reconnecting: '횃불이 꺼졌다. 다시 지핀다 · ${n}',
      reconnected: '돌아왔다.',
      voiceOnToast: '촌장의 목소리가 밤을 읽는다.',
      voiceOffToast: '촌장이 입을 다문다.',
      nightNoChat: '밤에는 입을 다물어라.',
      newVersion: '새 법도가 내려왔다.',
      // 법도 모달
      law: [
        { h: '패', t: '모두 한 장. 남은 셋은 제단에 엎는다.' },
        { h: '밤', t: '정해진 순서대로 깨어난다. 패는 바뀐다. 네가 누구인지 장담하지 마라.' },
        { h: '낮', t: '말하라. 거짓말도 무기다.' },
        { h: '심판', t: '동시에 하나를 지목한다. 가장 많이 지목된 자가 처형된다. 모두 한 표씩이면 아무도 죽지 않고, 동표면 모두 죽는다.' },
        { h: '결말', t: '마지막에 쥔 패가 네 편을 정한다.' },
      ],
      lawEnd: [
        { h: '마을', t: '늑대를 하나라도 처형하면 이긴다. 늑대가 없다면 아무도 죽지 않아야 이긴다.' },
        { h: '늑대', t: '늑대가 아무도 처형되지 않으면 이긴다.' },
        { h: '무두장이', t: '처형되면 홀로 이긴다.' },
      ],
      // index.html 전역
      docTitle: '한밤의 늑대인간',
      docDesc: '하룻밤. 한 번의 심판. 늑대를 찾아 처형하라.',
      // aria
      ariaSend: '보낸다',
      ariaClose: '닫는다',
      ariaMenu: '메뉴',
      ariaPrev: '앞 박자',
      ariaNext: '다음 박자',
      ariaFast: '빠르게 본다',
      ariaNormal: '제 속도로 본다',
      ariaRuler: '그 밤의 박자',
    },

    narr: {
      close: '눈을 감아라.',
      night: '밤이 왔다. 눈을 감아라.',
      dawn: '날이 밝았다.',
    },

    chat: {
      log: '기록',
      title: '속삭임',
      placeholder: '말하라',
      send: '보낸다',
      locked: '밤에는 입을 다물어라.',
    },

    // 서버 메시지 (§10.7). 이름은 평문. 이름 뒤 조사는 ${n:이/가} 형태.
    msg: {
      newChief: '${n:이/가} 촌장이 되었다.',
      left: '${n:이/가} 마을을 떠났다.',
      needPlayers: '셋에서 열이 모여야 밤이 온다.',
      needCards: '패는 ${n}장이어야 한다.',
      nightStart: '밤이 왔다. 입을 다물어라.',
      pack: '무리: ${names}',
      packAlone: '무리는 없다. 너 혼자다.',
      owners: '네 주인: ${names}',
      noWolfInPlay: '늑대는 모두 제단에 잠들어 있다.',
      brothers: '형제: ${names}',
      noBrothers: '형제는 이 마을에 없다.',
      nowCard: '네 패는 지금 ${r:이다/다}.',
      notNow: '지금은 아니다.',
      autoPicked: '— 밤이 대신 골랐다',
      pickAltar: '제단의 패를 골라라.',
      altarSeen: '${pos}: ${r}',
      pickOther: '다른 이를 골라라.',
      copied: '${t}의 패는 ${r}. 너는 이제 ${r:이다/다}.',
      rewake: '${r}의 차례에 다시 깨어난다.',
      seerSaw: '${t}의 패: ${r}',
      pickTwoAltar: '제단의 두 장을 골라라.',
      altarTwo: '${pos} ${r}',
      altarTwoHead: '제단: ${list}',
      noTouch: '손대지 않았다.',
      stole: '${t}의 패를 훔쳤다. 이제 너는 ${r:이다/다}.',
      pickTwoOthers: '너를 뺀 둘을 골라라.',
      swapped: '${a:과/와} ${b}의 패를 뒤바꿨다.',
      drunkSwapped: '${pos}의 패와 맞바꿨다. 무엇인지는 모른다.',
      timedOut: '밤이 지났다. 너는 아무것도 하지 않았다.',
      dawn: '날이 밝았다. 누군가는 거짓말을 하고 있다.',
      voteStart: '심판의 시간이다.',
      endLine: '결말: ${verdict}',
      needName: '이름을 대라.',
      badRequest: '지금은 아니다.',
      townOpened: '${name:이/가} 마을을 열었다.',
      noTown: '그런 마을은 없다.',
      cannotReturn: '그 마을로는 돌아갈 수 없다.',
      alreadyStarted: '이미 밤이 시작됐다. 다음 밤을 기다려라.',
      townFull: '자리가 없다. 열 명이 이미 앉았다.',
      sat: '${n:이/가} 불가에 앉았다.',
      cannotStart: '아직 밤을 부를 수 없다.',
      noGame: '진행 중인 밤이 없다.',
      notVoteTime: '지금은 심판의 시간이 아니다.',
      noSelfVote: '너는 너를 지목할 수 없다.',
    },

    // 제단 위치 이름 (슬롯 n, n+1, n+2)
    altar: ['왼쪽 제단', '가운데 제단', '오른쪽 제단'],

    // ========== 리플레이 「밤의 기록」 (§10.13) ==========
    // top = 위 줄(행위), bot = 아래 줄(드러난 것). 변수는 아래 규칙.
    //  ${a} ${b} ${c} ${t} = 이름(클라이언트가 {t,h} 객체로 넘김), ${P} ${Q} = T.altar 값,
    //  ${r} ${r2} ${rb} ${rc} ${f} = 역할명(effRole), ${team} = TEAM_NAME, ${list} = 클라이언트가 합친 나열, ${n} = 수.
    replay: {
      hunt_rule_join: ' ', // 아래 줄 끝에 이어 붙일 때의 구분
      sep: ', ',           // 이름·역할 나열
      dot: ' · ',          // 득표 등 나열
      you: '너',
      doppel: '도플갱어',
      doppelOf: '도플갱어 ${a}',   // 나열 시 이름 앞 칭호
      copyOf: '도플갱어 → ${r}',

      pro:   { top: '그 밤, 패는 이렇게 놓였다.', bot: '너는 ${r:으로/로} 시작했다. 제단: ${list}.' },
      quiet: { top: '그 밤, 아무도 움직이지 않았다.', bot: '깨어날 패는 모두 처음부터 제단에 있었다.' },
      idle: {
        one:   { top: '${r:은/는} 깨지 않았다.', bot: '그 패는 처음부터 제단에 있었다.' },
        many:  { top: '${list:은/는} 깨지 않았다.', bot: '그 패들은 처음부터 제단에 있었다.' },
        moved: { bot: '처음 그 패를 받은 자가 없었다.' },
      },
      copy:       { top: '도플갱어 ${a}, ${t}의 얼굴을 훔쳤다.', bot: '이제 ${r:이다/다}.' },
      copyWake:   { top: '도플갱어 ${a}, ${t}의 얼굴을 훔쳤다.', bot: '이제 ${r:이다/다}. ${r}의 차례에 다시 깬다.' },
      copySleep:  { top: '도플갱어 ${a}, ${t}의 얼굴을 훔쳤다.', bot: '이제 ${r:이다/다}. 다시 깨지 않는다.' },
      know: {
        werewolf: { top: '늑대들이 눈을 떴다. 서로를 알아봤다.', bot: '무리: ${list}' },
        minion:   { top: '하수인 ${a}, 주인을 우러렀다.', bot: '주인: ${list}. 주인은 그를 모른다.' },
        minion0:  { top: '하수인 ${a}, 주인을 찾았다.', bot: '늑대 패를 처음 받은 자는 없었다.', botNoDeck: '이 밤의 패에는 늑대가 없었다.' },
        mason:    { top: '프리메이슨들이 서로의 손을 쥐었다.', bot: '형제: ${list}' },
        mason1:   { top: '프리메이슨 ${a}, 홀로 깼다.', bot: '형제는 없었다.' },
      },
      peek: {
        werewolf:  { top: '늑대 ${a}, 홀로 깼다. ${P}의 패를 들췄다.', bot: '${r}.' },
        werewolfD: { top: '도플갱어 ${a}, 늑대가 되어 홀로 깼다. ${P}의 패를 들췄다.', bot: '${r}.' },
        seer:      { top: '${role} ${a}, ${t}의 패를 들췄다.', bot: '${r}' },
        seer2:     { top: '${role} ${a}, 제단의 두 장을 들췄다.', bot: '${P} ${r} · ${Q} ${r2}' },
        insomniac: { top: '${role} ${a}, 새벽에 제 패를 다시 봤다.', same: '${r}. 그대로였다.', changed: '패가 바뀌어 있었다. ${r}.' },
        insomniacMany: { top: '불면증환자 ${a:과/와} 도플갱어 ${b}, 새벽에 제 패를 다시 봤다.', bot: '${a} ${r} · ${b} ${r2}' },
      },
      skip: {
        werewolf: { top: '늑대 ${a}, 홀로 깼다. 제단에 손대지 않았다.', topD: '도플갱어 ${a}, 늑대가 되어 홀로 깼다. 제단에 손대지 않았다.' },
        self:  { top: '${role} ${a}, 손대지 않았다.' },
        seer:  { top: '${role} ${a}, 눈을 감은 채였다.' },
        auto:  { top: '${role} ${a}, 망설이다 때를 놓쳤다.' },
      },
      other: {
        at:   '다른 늑대 패는 ${where}에 있었다.',
        hand: '${t}의 손',
        none: '늑대 패는 그 한 장뿐이었다.',
      },
      swap: {
        robber:       { top: '${role} ${a}, ${t}의 패를 훔쳤다.', bot: '빼앗은 패: ${r}. ${t}에게는 ${r2:이/가} 남았다.' },
        troublemaker: { top: '${role} ${a}, ${b:과/와} ${c}의 패를 뒤바꿨다.', bot: '${b} ${rc} · ${c} ${rb}. 아무도 보지 못했다.' },
        drunk:        { top: '${role} ${a}, ${P}의 패와 제 패를 맞바꿨다.', bot: '받은 패: ${r}. 그는 끝내 몰랐다.' },
      },
      auto: '밤이 대신 골랐다.',  // 위 줄 끝에 ' ' 로 이어 붙인다
      note: { wake: '패가 바뀌었어도, 처음 받은 패대로 깨어난다.' },
      dawn: {
        top: '날이 밝았다. 패는 이렇게 남았다.',
        bot: '바뀐 패 ${n}장.',
        botNone: '바뀐 패는 없다.',
        seat: { top: '${a}: ${from} → ${to}.', bot: '이제 ${team}.' },
      },
      vote: {
        top: '모두가 동시에 지목했다.',
        bot: '${list}',
        item: '${t} ${n}표',
        abstain: '지목 없음 ${n}',
        one: '모두 한 표 이하. 아무도 죽지 않는다.',
        none: '${a}, 지목하지 않았다.',
      },
      exec: { top: '${list} 처형.', bot: '그의 패는 ${r:이었다/였다}.', botMany: '${list}', item: '${t} ${r}' },
      nodeath: { top: '피는 흐르지 않았다.' },
      hunt: {
        top: '${h}의 마지막 화살이 ${t:을/를} 꿰뚫었다.',
        bot: '${t}의 패는 ${r:이었다/였다}.',
        top0: '${h}의 화살이 겨눈 ${t:은/는} 이미 쓰러져 있었다.',
        topNone: '${h}, 아무도 겨누지 않았다.',
        rule: '사냥꾼은 죽으며 제가 지목한 자를 데려간다.',
        title: { both: '사냥꾼 ${a}', last: '사냥꾼 패를 쥔 ${a}', copy: '사냥꾼을 베낀 패를 쥔 ${a}' },
      },
      why: {
        wolf_died: '늑대 ${list:이/가} 처형됐다.',
        tanner_too: '무두장이 ${t}도 바라던 대로 죽었다.',
        wolf_lived: '늑대 ${list:은/는} 살아남았다.',
        tanner_blocked: '무두장이 ${t:이/가} 죽었다. 늑대도 이기지 못한다.',
        wolf_center: '새벽에 늑대 패는 모두 제단에 있었다.',
        wolf_none: '이 밤의 패에는 늑대가 없었다.',
        no_death: '피도 흐르지 않았다.',
        no_wolf_tanner: '무두장이 ${t}만 바라던 죽음을 얻었다.',
        minion_only_died: '죽은 자는 하수인 ${t}뿐이었다.',
        minion_lived: '무고한 피가 흘렀다. 하수인 ${a:이/가} 웃는다.',
        innocent_died: '무고한 피만 흘렀다.',
      },
      self: {
        same: '너는 끝까지 ${f:이었다/였다}.',
        diff: '너는 ${b:이라/라} 믿었다. 너는 ${f:이었다/였다}.',
        blind: '너는 제 패를 몰랐다. 너는 ${f:이었다/였다}.',
        doppel: '네가 쥔 도플갱어 패는 ${r:을/를} 베낀 패였다.',
        team: '그래서 ${team:이었다/였다}.',
        win: '이겼다.',
        lose: '졌다.',
      },
      ui: {
        hudCenter: '결말',
        hudSkip: '건너뛴다',
        pause: '멈춘다',
        resume: '잇는다',
        restart: '처음부터',
        tapResume: '눌러서 잇는다',
        pos: '${act} ${i}/${n}',
        prev: '앞 박자',
        next: '다음 박자',
        fast: '빠르게 본다',
        normal: '제 속도로 본다',
        x1: '×1',
        x2: '×2',
        acts: { pro: '서막', night: '밤', dawn: '새벽', vote: '심판', verdict: '판결' },
        ruler: '그 밤의 박자',
        board: '모든 기록',
        happened: '그 밤에 일어난 일',
        link: '그 밤을 다시 본다',
        journey: '믿은 패',
        stayed: '밤새 그대로였다.',
      },
    },

    // ---------- 도구 ----------
    fmt: fmt,
    josa: josa,
    syl: syl,
    esc: esc,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  else root.T = T;
})(typeof window !== 'undefined' ? window : globalThis);
