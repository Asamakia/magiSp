/**
 * 動的市場システム - ストーリー型パターンデータ
 * パターン8: キャラ → 動向、キャラ → 対象の紐づけ
 */

/**
 * キャラクターデータ
 */
export const CHARACTERS = {
  'ヴェルゼファール': {
    actions: ['目撃情報', '活動活発化', '沈黙', '領域拡大', '出現'],
    targets: [
      { attribute: '水' },
      { category: 'ヴェルゼファール' },
      { category: 'リヴァイアサン' },
    ],
    actionTendency: {
      '目撃情報': 'up',
      '活動活発化': 'up',
      '沈黙': 'down',
      '領域拡大': 'up',
      '出現': 'up',
    },
  },
  '魔女エリザヴェット': {
    actions: ['封印が緩み', '呪いが広がり', '儀式の噂で', '復活の兆候で', '沈黙'],
    targets: [
      { attribute: '闇' },
      { category: '魔女' },
      { category: '黒呪' },
      { category: 'ゴシック' },
    ],
    actionTendency: {
      '封印が緩み': 'up',
      '呪いが広がり': 'up',
      '儀式の噂で': 'up',
      '復活の兆候で': 'up',
      '沈黙': 'down',
    },
  },
  '岩狸一族': {
    actions: ['祭りで', '活動活発化', '冬眠入り', '縄張り拡大', '大移動'],
    targets: [
      { attribute: '炎' },
      { category: '岩狸' },
    ],
    actionTendency: {
      '祭りで': 'up',
      '活動活発化': 'up',
      '冬眠入り': 'down',
      '縄張り拡大': 'up',
      '大移動': 'neutral',
    },
  },
  'ブリザードマスター': {
    actions: ['降臨', '氷結拡大', '沈黙', '弟子募集', '大技披露'],
    targets: [
      { attribute: '水' },
      { category: 'ブリザードキャット' },
    ],
    actionTendency: {
      '降臨': 'up',
      '氷結拡大': 'up',
      '沈黙': 'down',
      '弟子募集': 'up',
      '大技披露': 'up',
    },
  },
  '鉄槍騎士団': {
    actions: ['出陣', '凱旋', '敗北', '新団員募集', '解散の噂'],
    targets: [
      { attribute: 'なし' },
      { category: '鉄槍騎士団' },
    ],
    actionTendency: {
      '出陣': 'up',
      '凱旋': 'up',
      '敗北': 'down',
      '新団員募集': 'up',
      '解散の噂': 'down',
    },
  },
  '鳥民の長老': {
    actions: ['予言', '祝福', '警告', '隠居', '帰還'],
    targets: [
      { attribute: '光' },
      { category: '鳥民' },
    ],
    actionTendency: {
      '予言': 'neutral',
      '祝福': 'up',
      '警告': 'down',
      '隠居': 'down',
      '帰還': 'up',
    },
  },
  '禁忌の鴉王ミラン': {
    actions: ['覚醒', '暗躍', '封印強化', '予言', '姿を消し'],
    targets: [
      { attribute: '未来' },
      { category: '未来鴉' },
      { keyword: '禁忌' },
    ],
    actionTendency: {
      '覚醒': 'up',
      '暗躍': 'up',
      '封印強化': 'down',
      '予言': 'neutral',
      '姿を消し': 'down',
    },
  },
  '幼魔王女リリカ': {
    actions: ['ご機嫌で', '不機嫌で', '新たな力に目覚め', 'お忍びで', '宣言'],
    targets: [
      { attribute: '光' },
      { attribute: '闇' },
      { category: 'リリカ' },
    ],
    actionTendency: {
      'ご機嫌で': 'up',
      '不機嫌で': 'down',
      '新たな力に目覚め': 'up',
      'お忍びで': 'neutral',
      '宣言': 'up',
    },
  },
  '粘液獣の女王': {
    actions: ['繁殖期で', '大移動', '進化', '沈黙', '新種誕生'],
    targets: [
      { attribute: '原始' },
      { category: '粘液獣' },
    ],
    actionTendency: {
      '繁殖期で': 'up',
      '大移動': 'neutral',
      '進化': 'up',
      '沈黙': 'down',
      '新種誕生': 'up',
    },
  },
  'ゴシック姫': {
    actions: ['目覚め', '支配拡大', '休眠', '祝宴', '怒り'],
    targets: [
      { attribute: '原始' },
      { category: 'ゴシック' },
      { category: '鎖縛' },
    ],
    actionTendency: {
      '目覚め': 'up',
      '支配拡大': 'up',
      '休眠': 'down',
      '祝宴': 'up',
      '怒り': 'up',
    },
  },
  'ヴォランティス': {
    actions: ['飛来', '去り', '巣作り', '狩り', '繁殖'],
    targets: [
      { category: 'ヴォランティス' },
    ],
    actionTendency: {
      '飛来': 'up',
      '去り': 'down',
      '巣作り': 'up',
      '狩り': 'neutral',
      '繁殖': 'up',
    },
  },
  '呪術狩りギルド': {
    actions: ['討伐成功', '新依頼', '壊滅', '再編', '休止'],
    targets: [
      { category: '呪術狩り' },
    ],
    actionTendency: {
      '討伐成功': 'up',
      '新依頼': 'up',
      '壊滅': 'down',
      '再編': 'neutral',
      '休止': 'down',
    },
  },
  '虹羽の守護者': {
    actions: ['姿を現し', '祝福', '警告', '姿を消し', '試練'],
    targets: [
      { category: '虹羽密林' },
    ],
    actionTendency: {
      '姿を現し': 'up',
      '祝福': 'up',
      '警告': 'down',
      '姿を消し': 'down',
      '試練': 'neutral',
    },
  },
  '時の賢者': {
    actions: ['予言', '発明', '隠居', '弟子選び', '時空実験'],
    targets: [
      { attribute: '未来' },
      { category: 'ゴーレム' },
      { category: '未来鴉' },
    ],
    actionTendency: {
      '予言': 'neutral',
      '発明': 'up',
      '隠居': 'down',
      '弟子選び': 'up',
      '時空実験': 'up',
    },
  },
  '炎竜母フレイマ': {
    actions: ['目覚め', '産卵', '怒り', '沈黙', '祝福'],
    targets: [
      { attribute: '炎' },
      { category: 'ドラゴン' },
      { category: 'フェニックス' },
    ],
    actionTendency: {
      '目覚め': 'up',
      '産卵': 'up',
      '怒り': 'up',
      '沈黙': 'down',
      '祝福': 'up',
    },
  },
};

/**
 * テンプレート
 */
export const CHARACTER_TEMPLATES = [
  '${character}の${action}${target}が注目',
  '速報：${character}${action}',
  '${character}の動向で${target}に影響',
  '${character}${action}${target}に関心集まる',
];

/**
 * キャラクター効果の変動幅
 */
export const CHARACTER_MODIFIERS = {
  up: { min: 15, max: 30 },
  down: { min: -15, max: -30 },
  neutral: { min: -5, max: 5 },
};
