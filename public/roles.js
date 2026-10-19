// 서버(Node)와 브라우저가 함께 쓰는 역할 데이터 (DESIGN_SPEC §10.5, §10.12)
// sigil = SVG 스프라이트 <symbol> id (index.html). ord = 밤 차례 로마 숫자(차례 없는 역할은 '—').
(function (root) {
  const ROLES = {
    doppelganger: {
      name: '도플갱어', team: 'village', max: 1, ord: 'I', sigil: 'sg-doppelganger',
      line: '다른 사람의 역할을 복사합니다.',
      desc: '밤에 다른 플레이어의 카드 한 장을 보고 그 역할이 됩니다. 예언자·강도·말썽쟁이·주정뱅이를 복사하면 바로 그 능력을 사용하고, 늑대인간·하수인·프리메이슨·불면증환자를 복사하면 해당 역할의 차례에 함께 눈을 뜹니다. 복사한 역할의 팀이 됩니다.',
    },
    werewolf: {
      name: '늑대인간', team: 'wolf', max: 2, ord: 'II', sigil: 'sg-werewolf',
      line: '다른 늑대인간을 확인합니다.',
      desc: '밤에 다른 늑대인간을 확인합니다. 늑대인간이 혼자라면 가운데 카드 한 장을 볼 수 있습니다. 늑대인간이 한 명도 처형되지 않으면 승리합니다.',
    },
    minion: {
      name: '하수인', team: 'wolf', max: 1, ord: 'III', sigil: 'sg-minion',
      line: '늑대인간이 누구인지 압니다.',
      desc: '밤에 누가 늑대인간인지 확인합니다. 늑대인간은 하수인이 누구인지 모릅니다. 하수인이 처형되더라도 늑대인간이 처형되지 않으면 늑대인간 팀이 승리합니다.',
    },
    mason: {
      name: '프리메이슨', team: 'village', max: 2, ord: 'IV', sigil: 'sg-mason',
      line: '다른 프리메이슨을 압니다.',
      desc: '밤에 다른 프리메이슨을 확인합니다.',
    },
    seer: {
      name: '예언자', team: 'village', max: 1, ord: 'V', sigil: 'sg-seer',
      line: '다른 사람의 카드를 확인합니다.',
      desc: '밤에 다른 플레이어의 카드 한 장 또는 가운데 카드 두 장을 볼 수 있습니다.',
    },
    robber: {
      name: '강도', team: 'village', max: 1, ord: 'VI', sigil: 'sg-robber',
      line: '카드를 훔쳐 그 역할이 됩니다.',
      desc: '밤에 다른 플레이어의 카드를 훔쳐 자신의 카드와 바꾸고 새 카드를 확인할 수 있습니다. 새 역할의 팀이 되지만 그 능력은 사용하지 않습니다.',
    },
    troublemaker: {
      name: '말썽쟁이', team: 'village', max: 1, ord: 'VII', sigil: 'sg-troublemaker',
      line: '다른 두 사람의 카드를 바꿉니다.',
      desc: '밤에 다른 플레이어 두 명의 카드를 서로 바꿀 수 있습니다. 바꾼 카드는 확인하지 않습니다.',
    },
    drunk: {
      name: '주정뱅이', team: 'village', max: 1, ord: 'VIII', sigil: 'sg-drunk',
      line: '자신이 누구인지 모릅니다.',
      desc: '밤에 자신의 카드를 가운데 카드 한 장과 반드시 바꿉니다. 새 카드는 확인할 수 없습니다.',
    },
    insomniac: {
      name: '불면증환자', team: 'village', max: 1, ord: 'IX', sigil: 'sg-insomniac',
      line: '마지막에 자신의 카드를 확인합니다.',
      desc: '밤의 마지막에 자신의 카드를 다시 확인합니다.',
    },
    villager: {
      name: '마을주민', team: 'village', max: 3, ord: '—', sigil: 'sg-villager',
      line: '특별한 능력이 없습니다.',
      desc: '특별한 능력이 없습니다. 대화로 늑대인간을 찾아내세요.',
    },
    hunter: {
      name: '사냥꾼', team: 'village', max: 1, ord: '—', sigil: 'sg-hunter',
      line: '처형되면 자신이 투표한 사람도 함께 처형됩니다.',
      desc: '사냥꾼이 처형되면 사냥꾼이 투표한 사람도 함께 처형됩니다.',
    },
    tanner: {
      name: '무두장이', team: 'tanner', max: 1, ord: '—', sigil: 'sg-tanner',
      line: '처형되면 승리합니다.',
      desc: '무두장이가 처형되면 무두장이 혼자 승리합니다. 이 경우 늑대인간 팀은 승리할 수 없습니다.',
    },
  };

  const ROLE_ORDER = ['doppelganger', 'werewolf', 'minion', 'mason', 'seer', 'robber',
    'troublemaker', 'drunk', 'insomniac', 'villager', 'hunter', 'tanner'];

  // 밤에 깨어나는 순서
  const NIGHT_ORDER = ['doppelganger', 'werewolf', 'minion', 'mason', 'seer', 'robber',
    'troublemaker', 'drunk', 'insomniac'];

  // TTS 겸용: 쉼표 대신 마침표. 단계 종료 시 '눈을 감으세요.'를 붙여 읽습니다(T.narr.close).
  const NIGHT_TEXT = {
    _check: '자신의 카드를 확인하세요. 다른 사람에게 보이지 않게 하세요.',
    doppelganger: '도플갱어는 눈을 뜨고 다른 사람의 카드를 확인하세요.',
    werewolf: '늑대인간은 눈을 뜨고 서로를 확인하세요.',
    minion: '하수인은 눈을 뜨고 늑대인간을 확인하세요.',
    mason: '프리메이슨은 눈을 뜨고 서로를 확인하세요.',
    seer: '예언자는 눈을 뜨고 한 사람의 카드나 가운데 카드 두 장을 확인하세요.',
    robber: '강도는 눈을 뜨세요. 다른 사람과 카드를 바꾸고 새 카드를 확인할 수 있습니다.',
    troublemaker: '말썽쟁이는 눈을 뜨세요. 다른 두 사람의 카드를 바꿀 수 있습니다.',
    drunk: '주정뱅이는 눈을 뜨고 가운데 카드 한 장과 자신의 카드를 바꾸세요.',
    insomniac: '불면증환자는 눈을 뜨고 자신의 카드를 확인하세요.',
  };

  const TEAM_NAME = { village: '마을 팀', wolf: '늑대인간 팀', tanner: '무두장이 팀' };

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
