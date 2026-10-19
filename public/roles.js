// 서버(Node)와 브라우저가 함께 쓰는 역할 데이터
(function (root) {
  const ROLES = {
    doppelganger: {
      name: '도플갱어', emoji: '🎭', team: 'village', max: 1,
      desc: '밤에 다른 플레이어 한 명의 카드를 보고 그 역할이 됩니다. 예언자·강도·말썽쟁이·주정뱅이를 따라 하면 즉시 그 능력을 쓰고, 늑대인간·하수인·프리메이슨·불면증환자를 따라 하면 그 역할의 차례에 함께 깨어납니다. 따라 한 역할의 팀이 됩니다.',
    },
    werewolf: {
      name: '늑대인간', emoji: '🐺', team: 'wolf', max: 2,
      desc: '다른 늑대인간을 확인합니다. 혼자라면 가운데 카드 1장을 볼 수 있습니다. 늑대인간이 아무도 죽지 않으면 승리합니다.',
    },
    minion: {
      name: '하수인', emoji: '🦹', team: 'wolf', max: 1,
      desc: '누가 늑대인간인지 알 수 있습니다(늑대인간은 하수인을 모릅니다). 늑대인간 팀이며, 자신이 죽어도 늑대인간이 살아남으면 승리합니다.',
    },
    mason: {
      name: '프리메이슨', emoji: '🔨', team: 'village', max: 2,
      desc: '다른 프리메이슨을 확인합니다.',
    },
    seer: {
      name: '예언자', emoji: '🔮', team: 'village', max: 1,
      desc: '다른 플레이어 1명의 카드 또는 가운데 카드 2장을 봅니다.',
    },
    robber: {
      name: '강도', emoji: '🗡️', team: 'village', max: 1,
      desc: '다른 플레이어와 카드를 바꾸고 새 카드를 확인할 수 있습니다. 새 역할의 팀이 되지만 그 능력은 쓰지 않습니다.',
    },
    troublemaker: {
      name: '말썽쟁이', emoji: '🃏', team: 'village', max: 1,
      desc: '다른 두 플레이어의 카드를 서로 바꿀 수 있습니다. 바꾼 카드는 보지 않습니다.',
    },
    drunk: {
      name: '주정뱅이', emoji: '🍺', team: 'village', max: 1,
      desc: '가운데 카드 1장과 자신의 카드를 반드시 바꿉니다. 새 카드는 보지 못합니다.',
    },
    insomniac: {
      name: '불면증환자', emoji: '🥱', team: 'village', max: 1,
      desc: '밤의 마지막에 자신의 카드를 다시 확인합니다.',
    },
    villager: {
      name: '마을주민', emoji: '🧑‍🌾', team: 'village', max: 3,
      desc: '특별한 능력이 없습니다.',
    },
    hunter: {
      name: '사냥꾼', emoji: '🏹', team: 'village', max: 1,
      desc: '투표로 죽으면, 자신이 투표한 사람도 함께 죽습니다.',
    },
    tanner: {
      name: '무두장이', emoji: '🪓', team: 'tanner', max: 1,
      desc: '삶이 지긋지긋합니다. 자신이 죽으면 승리합니다. 무두장이가 죽으면 늑대인간 팀은 승리할 수 없습니다.',
    },
  };

  const ROLE_ORDER = ['doppelganger', 'werewolf', 'minion', 'mason', 'seer', 'robber',
    'troublemaker', 'drunk', 'insomniac', 'villager', 'hunter', 'tanner'];

  // 밤에 깨어나는 순서
  const NIGHT_ORDER = ['doppelganger', 'werewolf', 'minion', 'mason', 'seer', 'robber',
    'troublemaker', 'drunk', 'insomniac'];

  const NIGHT_TEXT = {
    _check: '모두 자신의 카드를 확인하세요',
    doppelganger: '도플갱어가 깨어나 다른 사람의 카드를 봅니다',
    werewolf: '늑대인간들이 깨어나 서로를 확인합니다',
    minion: '하수인이 깨어나 늑대인간을 확인합니다',
    mason: '프리메이슨들이 깨어나 서로를 확인합니다',
    seer: '예언자가 깨어나 카드를 봅니다',
    robber: '강도가 깨어나 카드를 훔칩니다',
    troublemaker: '말썽쟁이가 깨어나 두 사람의 카드를 바꿉니다',
    drunk: '주정뱅이가 깨어나 가운데 카드와 바꿉니다',
    insomniac: '불면증환자가 깨어나 자신의 카드를 확인합니다',
  };

  const TEAM_NAME = { village: '마을 팀', wolf: '늑대인간 팀', tanner: '무두장이' };

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
  else root.WW = api;
})(typeof window !== 'undefined' ? window : globalThis);
