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

  // word + 조사. 라틴 등 판정 불가면 괄호 병기: 이(가), 을(를), 은(는), 과(와), (으)로.
  const PAREN = { '이/가': '이(가)', '을/를': '을(를)', '은/는': '은(는)', '과/와': '과(와)', '으로/로': '(으)로' };
  function josa(word, pair) {
    const w = String(word == null ? '' : word);
    const k = endKind(w);
    if (k === 'other') return w + (PAREN[pair] || '');
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
      if (typeof v === 'object') return '<span class="nw">' + html + out.slice(plain.length) + '</span>';
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
      open: '방 만들기',
      join: '참가하기',
      otherTown: '새 방 만들기',
      law: '규칙 보기',
      or: '또는',
      copyCode: '링크 복사하기',
      kick: '강퇴하기',
      unfold: '탁자 보기',
      start: '게임 시작하기',
      seen: '확인하기',
      noLook: '보지 않기',
      stealFace: '역할 복사하기',
      look: '카드 보기',
      lookAltar: '가운데 카드 보기',
      steal: '카드 훔치기',
      noSteal: '훔치지 않기',
      swap: '카드 바꾸기',
      noSwap: '바꾸지 않기',
      execute: '투표하기',
      ready: '투표 준비하기',
      unready: '준비 취소하기',
      judgeNow: '투표 시작하기',
      again: '다시 하기',
      skip: '건너뛰기',
      pause: '멈추기',
      resume: '계속하기',
      restart: '처음부터 보기',
      leave: '나가기',
      leaveTown: '방 나가기',
      voiceOn: '음성 켜기',
      voiceOff: '음성 끄기',
      asleep: '대기 중',
      close: '닫기',
      replay: '리플레이 보기',
      deck: '카드 구성 보기',
      fast: '×2',
      normal: '×1',
    },

    head: {
      law: '게임 규칙',
      lawOrder: '깨어나는 순서',
      whisper: '채팅',
      sign: '방 코드',
      deck: '카드 구성',
      arrange: '자동 구성하기',
      dayLen: '토론 시간',
      altar: '가운데 카드',
      seen: '밤에 확인한 정보',
      records: '전체 기록',
      happened: '밤에 일어난 일',
      believed: '알고 있던 카드',
      ending: '결과',
      judge: '투표 시간입니다.',
      name: '이름',
      yourCard: '당신의 카드입니다.',
      deckCount: '선택한 카드 ${total} / ${need}',
    },

    phase: {
      lobby: '대기실',
      check: '카드 확인',
      night: '밤',
      dawn: '새벽',
      day: '낮',
      vote: '투표',
      result: '결과',
      prologue: '시작',
      verdict: '결과',
      awake: '눈을 뜨세요',
      nightFalls: '밤이 되었습니다.',
      dayBreaks: '아침이 되었습니다.',
      closeEyes: '눈을 감으세요.',
    },

    verdict: {
      wolf: '늑대인간 팀 승리',
      minion: '늑대인간 팀 승리',
      village: '마을 팀 승리',
      villageNoWolf: '마을 팀 승리',
      tanner: '무두장이 승리',
      none: '승자 없음',
    },

    stamp: {
      win: '승리',
      lose: '패배',
      you: '내 차례',
      yours: '내 카드',
      changed: '바뀜',
      dead: '처형',
    },

    // ========== 비디스플레이 그룹 ==========
    body: {
      minutes: '분', dec: '한 장 빼기', inc: '한 장 더하기', markPack: '동료', markOwner: '늑대인간', markBro: '동료',
      // 홈
      namePh: '닉네임',
      codePh: '방 코드',
      joinCode: '${code} 방 참가하기',
      needName: '닉네임을 입력해 주세요.',
      needCode: '방 코드 4자리를 입력해 주세요.',
      coldWake: '서버 연결 중… ${s}초',
      coldNote: '서버를 준비하고 있습니다. 최대 1분 정도 걸릴 수 있습니다.',
      // 대기실
      signLabel: '방 코드',
      signTop: '방 코드 ${code}',
      copied: '초대 링크를 복사했습니다.',
      copyTitle: '초대 링크',
      copyHint: '이 링크를 공유하면 바로 참가할 수 있습니다.',
      fire: '참가자 ${n}/10',
      waitMore: '${need}명이 더 필요합니다.',
      chief: '방장',
      me: '나',
      away: '연결 끊김',
      kickAsk: '${n:을/를} 강퇴할까요?',
      kicked: '방에서 강퇴되었습니다.',
      deckNote: '카드는 인원수보다 3장 많아야 합니다. 남는 3장은 가운데 카드가 됩니다.',
      deckCount: '선택한 카드 ${total} / ${need}',
      arrangeNote: '인원수에 맞춰 자동으로 구성됩니다.',
      masonWarn: '프리메이슨은 2장을 함께 넣어야 서로를 확인할 수 있습니다.',
      noWolfWarn: '늑대인간 카드가 없습니다.',
      lack: '${need}명 더 필요',
      deckLack: '카드 ${total}/${need}',
      waitChief: '방장 대기 중',
      // 카드 확인
      yourCard: '당신의 카드입니다.',
      yourCardIs: '당신의 카드는 ${r}입니다.',
      holdHint: '카드를 길게 눌러 확인하세요.',
      keepAwake: '화면이 꺼지지 않도록 해 주세요.',
      peekFirst: '처음 받은 카드',
      peekLast: '마지막으로 확인한 카드',
      dockHint: '내 카드 보기',
      dockCoach: '왼쪽 아래 카드를 누르면 밤에 확인한 정보를 다시 볼 수 있습니다.',
      heroDead: '${n} · 처형',
      heroKey: '${n}의 카드',
      holdShort: '길게 눌러 확정하세요.',
      holdCap: '길게 눌러 확정',
      holdNm: '${n} · 길게 눌러 확정',
      voted: '투표함: ${n}',
      // 밤
      nightFalls: '밤이 되었습니다. 모두 눈을 감으세요.',
      closeEyes: '눈을 감고 차례를 기다려 주세요.',
      wake: '${role}의 차례입니다.',
      doneClose: '행동을 마쳤습니다. 눈을 감으세요.',
      lone: '늑대인간은 당신 혼자입니다.',
      loneSub: '가운데 카드 한 장을 볼 수 있습니다.',
      doppel: '도플갱어의 차례입니다.',
      doppelSub: '플레이어 한 명을 선택하세요. 그 사람의 역할을 복사합니다.',
      asDoppel: '도플갱어:',
      seer: '예언자의 차례입니다.',
      seerSub: '플레이어 한 명 또는 가운데 카드 두 장을 선택하세요.',
      robber: '강도의 차례입니다.',
      robberSub: '카드를 훔칠 플레이어를 선택하세요. 훔친 카드는 바로 확인합니다.',
      troublemaker: '말썽쟁이의 차례입니다.',
      troublemakerSub: '카드를 바꿀 플레이어 두 명을 선택하세요. 바꾼 카드는 볼 수 없습니다.',
      drunk: '주정뱅이의 차례입니다.',
      drunkSub: '가운데 카드 한 장을 선택하세요. 내 카드와 바뀌며 새 카드는 볼 수 없습니다.',
      insomniac: '불면증환자의 차례입니다.',
      insomniacSub: '자신의 카드를 다시 확인하세요.',
      pickStealBtn: '역할 복사하기 ${n}',
      lookCount: '${n}/2',
      seenNothing: '밤에 확인한 정보가 없습니다.',
      sleeping: '눈을 감고 차례를 기다리는 중입니다.',
      blurHint: '눌러서 확인하세요.',
      coverHint: '누르면 카드를 덮습니다.',
      awakeTab: '● 당신의 차례',
      ackFail: '전송하지 못했습니다. 다시 시도해 주세요.',
      autoPicked: '(시간 초과로 자동 선택)',
      // 낮
      dawn: '아침이 되었습니다.',
      dayAsk: '토론하세요.',
      readyNote: '모두 준비하면 바로 투표가 시작됩니다.',
      firstCard: '처음 받은 카드',
      deckAll: '카드 구성 (가운데 카드 3장 포함)',
      raised: '투표 준비 ${r}/${n} · 모두 준비하면 바로 투표합니다.',
      raisedBadge: '준비 완료',
      // 투표
      pickExec: '처형할 사람을 누른 뒤 아래 버튼을 길게 눌러 투표하세요. 끝나기 전까지 바꿀 수 있습니다.',
      myVote: '내 투표: ${n}',
      noVote: '아직 투표하지 않았습니다.',
      voteCount: '투표 ${n}/${t}',
      voteRule: '2표 이상 받은 사람이 없으면 아무도 처형되지 않습니다. 동점이면 모두 처형됩니다.',
      execLine: '${names:이/가} 처형되었습니다.',
      noBlood: '아무도 처형되지 않았습니다.',
      hunterLine: '사냥꾼 ${a}의 능력으로 ${b}도 함께 죽었습니다.',
      doppelArrow: '도플갱어(${r})',
      votedFor: '${n}에게 투표했습니다. 다른 사람을 눌러 바꿀 수 있습니다.',
      votedBtn: '투표 완료',
      checkBand: '다른 사람에게 보이지 않게 확인하세요.',
      execCard: '${n}의 카드는 ${r} 카드였습니다.',
      // 결과
      cols: { name: '이름', first: '처음 카드', last: '최종 카드', vote: '투표', votes: '득표', end: '결과' },
      altarWord: '가운데 카드',
      altarFirst: '처음: ${r}',
      noNight: '이번 밤에는 아무도 행동하지 않았습니다.',
      journeyStay: '밤새 바뀌지 않았습니다.',
      waitChiefNext: '방장 대기 중',
      // 시스템
      error: '오류가 발생했습니다. 다시 시도해 주세요.',
      reconnecting: '다시 연결하는 중… ${n}초',
      reconnected: '다시 연결되었습니다.',
      roomLost: '방이 사라졌습니다. 서버가 다시 시작되었을 수 있습니다.',
      voiceOnToast: '음성 안내를 켰습니다.',
      voiceOffToast: '음성 안내를 껐습니다.',
      nightNoChat: '밤에는 채팅할 수 없습니다.',
      newVersion: '새 버전으로 업데이트합니다.',
      // 규칙 모달
      law: [
        { h: '카드', t: '모든 플레이어가 카드를 한 장씩 받습니다. 남은 3장은 가운데에 뒷면으로 놓습니다.' },
        { h: '밤', t: '역할마다 정해진 순서대로 눈을 뜨고 능력을 사용합니다. 밤사이 카드가 바뀔 수 있으므로 처음 받은 카드가 지금의 역할이라는 보장은 없습니다.' },
        { h: '낮', t: '정해진 시간 동안 자유롭게 토론합니다. 자신의 역할을 거짓으로 말해도 됩니다.' },
        { h: '투표', t: '모두 동시에 한 명에게 투표합니다. 가장 많은 표를 받은 사람이 처형됩니다. 2표 이상 받은 사람이 없으면 아무도 처형되지 않으며, 동점이면 모두 처형됩니다.' },
        { h: '승패', t: '게임이 끝났을 때 마지막에 가진 카드로 소속 팀이 정해집니다.' },
      ],
      lawEnd: [
        { h: '마을 팀', t: '늑대인간을 한 명 이상 처형하면 승리합니다. 플레이어 중 늑대인간이 없다면 아무도 처형되지 않아야 승리합니다.' },
        { h: '늑대인간 팀', t: '늑대인간이 한 명도 처형되지 않으면 승리합니다. 하수인만 처형되어도 승리합니다.' },
        { h: '무두장이', t: '자신이 처형되면 승리합니다. 이 경우 늑대인간 팀은 승리할 수 없습니다.' },
      ],
      // index.html 전역
      docTitle: '한밤의 늑대인간',
      docDesc: '3~10명이 함께하는 온라인 한밤의 늑대인간입니다. 단 한 번의 투표로 늑대인간을 찾아내세요.',
      // aria
      ariaSend: '보내기',
      ariaClose: '닫기',
      ariaMenu: '메뉴',
      ariaPrev: '이전 장면 보기',
      ariaNext: '다음 장면 보기',
      ariaFast: '2배속으로 보기',
      ariaNormal: '1배속으로 보기',
      ariaRuler: '재생 위치',
    },

    narr: {
      close: '눈을 감으세요.',
      night: '밤이 되었습니다. 모두 눈을 감으세요.',
      dawn: '아침이 되었습니다. 모두 눈을 뜨세요.',
    },

    chat: {
      log: '기록',
      title: '채팅',
      placeholder: '메시지를 입력하세요',
      send: '보내기',
      locked: '밤에는 채팅할 수 없습니다.',
    },

    // 서버 메시지 (§10.7). 이름은 평문. 이름 뒤 조사는 ${n:이/가} 형태.
    msg: {
      newChief: '${n:이/가} 방장이 되었습니다.',
      left: '${n:이/가} 방을 나갔습니다.',
      needPlayers: '3~10명이 모여야 시작할 수 있습니다.',
      needCards: '카드를 ${n}장 선택해야 합니다.',
      nightStart: '밤이 되었습니다. 지금부터 채팅할 수 없습니다.',
      pack: '다른 늑대인간: ${names}',
      packAlone: '늑대인간은 당신 혼자입니다.',
      owners: '늑대인간: ${names}',
      noWolfInPlay: '플레이어 중에 늑대인간이 없습니다.',
      brothers: '다른 프리메이슨: ${names}',
      noBrothers: '다른 프리메이슨이 없습니다.',
      nowCard: '당신의 현재 카드는 ${r}입니다.',
      notNow: '지금은 행동할 수 없습니다.',
      autoPicked: '(시간 초과로 자동 선택)',
      pickAltar: '가운데 카드를 한 장 선택하세요.',
      altarSeen: '${pos}: ${r}',
      pickOther: '다른 플레이어를 선택하세요.',
      copied: '${t}의 카드는 ${r}입니다. 이제 당신은 ${r}입니다.',
      rewake: '${r} 차례에 다시 눈을 뜹니다.',
      seerSaw: '${t}의 카드는 ${r}입니다.',
      pickTwoAltar: '가운데 카드 두 장을 선택하세요.',
      altarTwo: '${pos}: ${r}',
      altarTwoHead: '${list}',
      noTouch: '아무 행동도 하지 않았습니다.',
      stole: '${t}의 카드를 훔쳤습니다. 당신의 새 카드는 ${r}입니다.',
      pickTwoOthers: '자신을 제외한 플레이어 두 명을 선택하세요.',
      swapped: '${a:과/와} ${b}의 카드를 서로 바꿨습니다.',
      drunkSwapped: '${pos:과/와} 당신의 카드를 바꿨습니다. 새 카드는 확인할 수 없습니다.',
      timedOut: '시간이 초과되어 아무 행동도 하지 않았습니다.',
      dawn: '아침이 되었습니다. 토론을 시작하세요.',
      voteStart: '투표 시간입니다.',
      endLine: '결과: ${verdict}',
      needName: '닉네임을 입력해 주세요.',
      badRequest: '잘못된 요청입니다.',
      townOpened: '${name:이/가} 방을 만들었습니다.',
      noTown: '존재하지 않는 방입니다. 방 코드를 확인해 주세요.',
      cannotReturn: '이 방에는 다시 참가할 수 없습니다.',
      alreadyStarted: '이미 게임이 진행 중입니다. 게임이 끝난 뒤 다시 시도해 주세요.',
      townFull: '방이 가득 찼습니다(최대 10명).',
      sat: '${n:이/가} 입장했습니다.',
      cannotStart: '아직 게임을 시작할 수 없습니다.',
      noGame: '진행 중인 게임이 없습니다.',
      notVoteTime: '지금은 투표 시간이 아닙니다.',
      noSelfVote: '자신에게는 투표할 수 없습니다.',
    },

    // 가운데 카드 이름 (슬롯 n, n+1, n+2)
    altar: ['가운데 카드 1', '가운데 카드 2', '가운데 카드 3'],

    // ========== 리플레이 「밤의 기록」 (§10.13) ==========
    // top = 위 줄(행위), bot = 아래 줄(드러난 것). 변수는 아래 규칙.
    //  ${a} ${b} ${c} ${t} = 이름(클라이언트가 {t,h} 객체로 넘김), ${P} ${Q} = T.altar 값,
    //  ${r} ${r2} ${rb} ${rc} ${f} = 역할명(effRole), ${team} = TEAM_NAME, ${list} = 클라이언트가 합친 나열, ${n} = 수.
    replay: {
      hunt_rule_join: ' ', // 아래 줄 끝에 이어 붙일 때의 구분
      sep: ', ',           // 이름·역할 나열
      dot: ' · ',          // 득표 등 나열
      you: '당신',
      doppel: '도플갱어',
      doppelOf: '도플갱어 ${a}',   // 나열 시 이름 앞 칭호
      copyOf: '도플갱어(${r})',

      pro:   { top: '게임 시작 시 카드 배치입니다.', bot: '당신의 시작 카드는 ${r}입니다. 가운데 카드: ${list}' },
      quiet: { top: '이번 밤에는 아무도 행동하지 않았습니다.', bot: '밤에 깨어나는 카드가 모두 가운데에 있었습니다.' },
      idle: {
        one:   { top: '${r:은/는} 깨어나지 않았습니다.', bot: '이 카드는 처음부터 가운데에 있었습니다.' },
        many:  { top: '${list:은/는} 깨어나지 않았습니다.', bot: '이 카드들은 처음부터 가운데에 있었습니다.' },
        moved: { bot: '처음에 이 카드를 받은 사람이 없었습니다.' },
      },
      copy:       { top: '도플갱어 ${a:이/가} ${t}의 카드를 확인했습니다.', bot: '${a:은/는} ${r:이/가} 되었습니다.' },
      copyWake:   { top: '도플갱어 ${a:이/가} ${t}의 카드를 확인했습니다.', bot: '${a:은/는} ${r:이/가} 되었습니다. ${r} 차례에 다시 깨어납니다.' },
      copySleep:  { top: '도플갱어 ${a:이/가} ${t}의 카드를 확인했습니다.', bot: '${a:은/는} ${r:이/가} 되었습니다. 밤에 다시 깨어나지 않습니다.' },
      know: {
        werewolf: { top: '늑대인간이 눈을 뜨고 서로를 확인했습니다.', bot: '늑대인간: ${list}' },
        minion:   { top: '하수인 ${a:이/가} 늑대인간을 확인했습니다.', bot: '늑대인간: ${list}. 늑대인간은 하수인을 모릅니다.' },
        minion0:  { top: '하수인 ${a:이/가} 눈을 떴습니다.', bot: '처음에 늑대인간 카드를 받은 사람이 없었습니다.', botNoDeck: '이번 게임에는 늑대인간 카드가 없었습니다.' },
        mason:    { top: '프리메이슨이 서로를 확인했습니다.', bot: '프리메이슨: ${list}' },
        mason1:   { top: '프리메이슨 ${a:은/는} 혼자 깨어났습니다.', bot: '다른 프리메이슨은 없었습니다.' },
      },
      peek: {
        werewolf:  { top: '늑대인간 ${a:은/는} 혼자 깨어나 ${P:을/를} 확인했습니다.', bot: '${r}입니다.' },
        werewolfD: { top: '도플갱어 늑대인간 ${a:은/는} 혼자 깨어나 ${P:을/를} 확인했습니다.', bot: '${r}입니다.' },
        seer:      { top: '${role} ${a:이/가} ${t}의 카드를 확인했습니다.', bot: '${r}입니다.' },
        seer2:     { top: '${role} ${a:이/가} 가운데 카드 두 장을 확인했습니다.', bot: '${P}: ${r} · ${Q}: ${r2}' },
        insomniac: { top: '${role} ${a:이/가} 자신의 카드를 다시 확인했습니다.', same: '카드는 그대로 ${r}입니다.', changed: '카드가 ${r:으로/로} 바뀌어 있었습니다.' },
        insomniacMany: { top: '불면증환자 ${a:과/와} 도플갱어 ${b:이/가} 자신의 카드를 다시 확인했습니다.', bot: '${a}: ${r} · ${b}: ${r2}' },
      },
      skip: {
        werewolf: { top: '늑대인간 ${a:은/는} 혼자 깨어났지만 카드를 보지 않았습니다.', topD: '도플갱어 늑대인간 ${a:은/는} 혼자 깨어났지만 카드를 보지 않았습니다.' },
        self:  { top: '${role} ${a:은/는} 아무 행동도 하지 않았습니다.' },
        seer:  { top: '${role} ${a:은/는} 아무 카드도 보지 않았습니다.' },
        auto:  { top: '${role} ${a:은/는} 제한 시간 안에 행동하지 않았습니다.' },
      },
      other: {
        at:   '남은 늑대인간 카드는 ${where}에 있었습니다.',
        hand: '${t}의 자리',
        none: '늑대인간 카드는 이 한 장뿐이었습니다.',
      },
      swap: {
        robber:       { top: '${role} ${a:이/가} ${t}의 카드를 훔쳤습니다.', bot: '${a:은/는} ${t}의 ${r} 카드를 가져갔고, ${t:은/는} ${a}의 ${r2} 카드를 받았습니다.' },
        troublemaker: { top: '${role} ${a:이/가} ${b:과/와} ${c}의 카드를 서로 바꿨습니다.', bot: '이제 ${b:은/는} ${rc} 카드를, ${c:은/는} ${rb} 카드를 가지고 있습니다.' },
        drunk:        { top: '${role} ${a:이/가} 자신의 카드를 ${P:과/와} 바꿨습니다.', bot: '받은 카드는 ${r}입니다. ${a:은/는} 확인하지 못했습니다.' },
      },
      auto: '(시간 초과)',  // 위 줄 끝에 ' ' 로 이어 붙인다
      note: { wake: '카드가 바뀌어도 처음 받은 역할로 깨어납니다.' },
      dawn: {
        top: '아침이 되었습니다. 최종 카드 배치입니다.',
        bot: '바뀐 카드: ${n}장',
        botNone: '바뀐 카드가 없습니다.',
        seat: { top: '${a:은/는} 이제 ${to} 카드를 가지고 있습니다.', bot: '처음 카드는 ${from} 카드였습니다. 팀이 ${team:으로/로} 바뀌었습니다.', botSame: '처음 카드는 ${from} 카드였습니다. 팀은 그대로 ${team}입니다.' },
      },
      vote: {
        top: '모두 동시에 투표했습니다.',
        bot: '${list}',
        item: '${t} ${n}표',
        abstain: '미투표 ${n}명',
        one: '2표 이상 받은 사람이 없어 아무도 처형되지 않았습니다.',
        none: '${a:은/는} 투표하지 않았습니다.',
      },
      exec: { card: '${t}의 카드는 ${r} 카드였습니다.', top: '${list:이/가} 처형되었습니다.', bot: '카드: ${r}', botMany: '${list}', item: '${t}: ${r}' },
      nodeath: { top: '아무도 처형되지 않았습니다.' },
      hunt: {
        top: '${h}의 능력으로 ${t}도 함께 죽었습니다.',
        bot: '${t}의 카드: ${r}',
        top0: '${h}의 투표 대상인 ${t:은/는} 이미 처형되었습니다.',
        topNone: '${h}의 투표 대상이 없었습니다.',
        rule: '사냥꾼이 죽으면 그가 투표한 사람도 함께 죽습니다.',
        title: { both: '사냥꾼 ${a}', last: '사냥꾼 카드를 가진 ${a}', copy: '도플갱어(사냥꾼) ${a}' },
      },
      why: {
        wolf_died: '${list:은/는} 늑대인간이었습니다.',
        tanner_too: '무두장이 ${t}도 처형되어 함께 승리했습니다.',
        wolf_lived: '늑대인간 ${list:은/는} 처형되지 않았습니다.',
        tanner_blocked: '무두장이 ${t:이/가} 처형되어 늑대인간 팀은 승리하지 못했습니다.',
        wolf_center: '늑대인간 카드가 모두 가운데에 있었습니다.',
        wolf_none: '이번 게임에는 늑대인간 카드가 없었습니다.',
        no_death: '아무도 처형되지 않아 마을 팀이 승리했습니다.',
        no_wolf_tanner: '무두장이 ${t:이/가} 처형되어 무두장이만 승리했습니다.',
        minion_only_died: '처형된 사람은 하수인 ${t}뿐입니다.',
        minion_lived: '하수인이 아닌 사람이 처형되어 늑대인간 팀이 승리했습니다.',
        innocent_died: '처형된 사람이 있어 마을 팀이 패배했습니다.',
      },
      self: {
        same: '당신의 카드는 끝까지 ${f} 카드였습니다.',
        diff: '당신은 ${b} 카드인 줄 알았지만, 마지막 카드는 ${f} 카드였습니다.',
        blind: '당신은 바뀐 카드를 확인하지 못했습니다. 마지막 카드는 ${f} 카드였습니다.',
        doppel: '당신의 도플갱어 카드는 ${r:을/를} 복사했습니다.',
        win: '${team:으로/로} 승리했습니다.',
        lose: '${team:으로/로} 패배했습니다.',
      },
      cause: {
        robbed: '${role} ${a:이/가} 당신의 카드를 가져갔습니다. 당신은 이제 ${r}입니다.',
        swapped: '${role} ${a:이/가} 당신의 카드를 ${t}의 카드와 바꿨습니다. 당신은 이제 ${r}입니다.',
        rob: '당신은 ${t}의 카드를 가져왔습니다. 당신은 이제 ${r}입니다.',
        drunk: '당신은 자신의 카드를 ${P:과/와} 바꿨습니다. 당신은 이제 ${r}입니다.',
      },
      ui: {
        hop: { start: '처음', robSelf: '${a:이/가} 훔쳐 옴', robTarget: '${a:이/가} 가져감', swap: '${a:이/가} 바꿈', drunkSelf: '${a:이/가} 가운데 카드와 바꿈', drunkCenter: '${a:이/가} 자기 카드와 바꿈' },
        journeySep: ' · ',
        hudCenter: '밤의 기록',
        altarShort: ['가운데 1', '가운데 2', '가운데 3'],
        hudSkip: '건너뛰기',
        pause: '멈추기',
        resume: '계속하기',
        restart: '처음부터 보기',
        tapResume: '눌러서 계속하기',
        pos: '${act} ${i}/${n}',
        prev: '이전 장면 보기',
        next: '다음 장면 보기',
        fast: '2배속으로 보기',
        normal: '1배속으로 보기',
        x1: '×1',
        x2: '×2',
        acts: { pro: '시작', night: '밤', dawn: '새벽', vote: '투표', verdict: '결과' },
        ruler: '재생 위치',
        board: '전체 기록',
        happened: '밤에 일어난 일',
        link: '리플레이 보기',
        journey: '알고 있던 카드',
        stayed: '밤새 바뀌지 않았습니다.',
        unknown: '알 수 없음',
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
