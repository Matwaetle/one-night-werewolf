// 서버(Node)와 브라우저가 함께 쓰는 역할 데이터 (DESIGN_SPEC §10.5, §10.12)
// sigil = SVG 스프라이트 <symbol> id (index.html). ord = 밤 차례 로마 숫자(차례 없는 역할은 '—').
(function (root) {
  const ROLES = {
    doppelganger: {
      name: '도플갱어', team: 'village', max: 1, ord: 'I', sigil: 'sg-doppelganger',
      line: '남의 얼굴로 산다.',
      desc: '누군가의 패를 보고 그가 된다. 예언자·강도·말썽쟁이·주정뱅이가 되면 그 자리에서 행동하고, 늑대인간·하수인·프리메이슨·불면증환자가 되면 그 차례에 함께 깬다. 그 편에 선다.',
    },
    werewolf: {
      name: '늑대인간', team: 'wolf', max: 2, ord: 'II', sigil: 'sg-werewolf',
      line: '무리를 알아본다.',
      desc: '다른 늑대를 본다. 혼자라면 제단의 패 하나를 본다. 늑대가 아무도 처형되지 않으면 이긴다.',
    },
    minion: {
      name: '하수인', team: 'wolf', max: 1, ord: 'III', sigil: 'sg-minion',
      line: '주인을 섬긴다.',
      desc: '누가 늑대인지 안다. 늑대는 너를 모른다. 네가 처형되어도 늑대가 살면 이긴다.',
    },
    mason: {
      name: '프리메이슨', team: 'village', max: 2, ord: 'IV', sigil: 'sg-mason',
      line: '형제를 안다.',
      desc: '다른 프리메이슨을 본다.',
    },
    seer: {
      name: '예언자', team: 'village', max: 1, ord: 'V', sigil: 'sg-seer',
      line: '남의 패를 엿본다.',
      desc: '한 명의 패, 혹은 제단의 두 장을 본다.',
    },
    robber: {
      name: '강도', team: 'village', max: 1, ord: 'VI', sigil: 'sg-robber',
      line: '빼앗고, 그가 된다.',
      desc: '누군가와 패를 바꾸고 새 패를 본다. 그 편에 서되, 능력은 쓰지 못한다.',
    },
    troublemaker: {
      name: '말썽쟁이', team: 'village', max: 1, ord: 'VII', sigil: 'sg-troublemaker',
      line: '남의 패를 뒤바꾼다.',
      desc: '다른 둘의 패를 바꾼다. 보지 않는다.',
    },
    drunk: {
      name: '주정뱅이', team: 'village', max: 1, ord: 'VIII', sigil: 'sg-drunk',
      line: '제가 누군지 모른다.',
      desc: '제단의 패 하나와 제 패를 반드시 바꾼다. 새 패는 보지 못한다.',
    },
    insomniac: {
      name: '불면증환자', team: 'village', max: 1, ord: 'IX', sigil: 'sg-insomniac',
      line: '잠들지 못한다.',
      desc: '밤의 끝에 제 패를 다시 본다.',
    },
    villager: {
      name: '마을주민', team: 'village', max: 3, ord: '—', sigil: 'sg-villager',
      line: '아무것도 모른다.',
      desc: '능력이 없다. 말로 살아남아라.',
    },
    hunter: {
      name: '사냥꾼', team: 'village', max: 1, ord: '—', sigil: 'sg-hunter',
      line: '홀로 죽지 않는다.',
      desc: '처형되면, 제가 지목한 자도 함께 죽는다.',
    },
    tanner: {
      name: '무두장이', team: 'tanner', max: 1, ord: '—', sigil: 'sg-tanner',
      line: '죽음을 원한다.',
      desc: '처형되면 홀로 이긴다. 그 경우 늑대는 이길 수 없다.',
    },
  };

  const ROLE_ORDER = ['doppelganger', 'werewolf', 'minion', 'mason', 'seer', 'robber',
    'troublemaker', 'drunk', 'insomniac', 'villager', 'hunter', 'tanner'];

  // 밤에 깨어나는 순서
  const NIGHT_ORDER = ['doppelganger', 'werewolf', 'minion', 'mason', 'seer', 'robber',
    'troublemaker', 'drunk', 'insomniac'];

  // TTS 겸용: 쉼표 대신 마침표. 단계 종료 시 '눈을 감아라.'를 붙여 읽는다(T.narr.close).
  const NIGHT_TEXT = {
    _check: '각자 패를 봐라. 누구에게도 보이지 마라.',
    doppelganger: '도플갱어. 눈을 떠라. 누군가의 얼굴을 훔쳐라.',
    werewolf: '늑대인간. 눈을 떠라. 서로를 알아봐라.',
    minion: '하수인. 눈을 떠라. 네 주인을 봐라.',
    mason: '프리메이슨. 눈을 떠라. 형제를 찾아라.',
    seer: '예언자. 눈을 떠라. 한 명의 패를 봐라. 아니면 제단의 두 장을.',
    robber: '강도. 눈을 떠라. 누군가의 패를 훔쳐라.',
    troublemaker: '말썽쟁이. 눈을 떠라. 둘의 패를 뒤바꿔라.',
    drunk: '주정뱅이. 눈을 떠라. 제단의 패와 네 패를 바꿔라. 보지는 마라.',
    insomniac: '불면증환자. 눈을 떠라. 네 패를 다시 봐라.',
  };

  const TEAM_NAME = { village: '마을 편', wolf: '늑대 편', tanner: '홀로' };

  // 인원별 추천 구성 (항상 인원 + 3장)
  const PRESETS = {
    3: { werewolf: 2, seer: 1, robber: 1, troublemaker: 1, villager: 1 },
    4: { werewolf: 2, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1 },
    5: { werewolf: 2, minion: 1, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1 },
    6: { werewolf: 2, minion: 1, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1, villager: 1 },
    7: { werewolf: 2, minion: 1, mason: 2, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1 },
    8: { werewolf: 2, minion: 1, mason: 2, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1, hunter: 1 },
    9: { werewolf: 2, minion: 1, mason: 2, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1, hunter: 1, tanner: 1 },
    10: { doppelganger: 1, werewolf: 2, minion: 1, mason: 2, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1, hunter: 1, tanner: 1 },
  };

  function presetFor(n) {
    const p = PRESETS[Math.min(10, Math.max(3, n))];
    const deck = {};
    for (const r of ROLE_ORDER) deck[r] = p[r] || 0;
    return deck;
  }

  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 10;

  const api = { ROLES, ROLE_ORDER, NIGHT_ORDER, NIGHT_TEXT, TEAM_NAME, PRESETS, presetFor, MIN_PLAYERS, MAX_PLAYERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.WW = api; root.ROLES = ROLES; }
})(typeof window !== 'undefined' ? window : globalThis);
