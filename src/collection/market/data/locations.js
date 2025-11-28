/**
 * 動的市場システム - 場所型パターンデータ
 * パターン3: 場所 → 出来事、場所 → 対象の紐づけ
 */

/**
 * 場所データ
 * 各場所には発生しうる出来事と影響を受ける対象がある
 */
export const LOCATIONS = {
  '炎の火山': {
    events: ['噴火', '地震', '発掘', '活動活発化', '沈静化'],
    targets: [
      { attribute: '炎' },
      { category: '岩狸' },
      { category: 'ドラゴン' },
    ],
    eventTendency: {
      '噴火': 'up',
      '地震': 'down',
      '発掘': 'up',
      '活動活発化': 'up',
      '沈静化': 'down',
    },
  },
  '深海': {
    events: ['海流変化', '発見', '沈没', '調査開始', '異変'],
    targets: [
      { attribute: '水' },
      { category: 'ヴェルゼファール' },
      { category: 'リヴァイアサン' },
    ],
    eventTendency: {
      '海流変化': 'neutral',
      '発見': 'up',
      '沈没': 'down',
      '調査開始': 'up',
      '異変': 'neutral',
    },
  },
  '氷結宮殿': {
    events: ['吹雪', '凍結', '解凍', '氷祭り', '崩壊'],
    targets: [
      { attribute: '水' },
      { category: 'ブリザードキャット' },
    ],
    eventTendency: {
      '吹雪': 'up',
      '凍結': 'up',
      '解凍': 'down',
      '氷祭り': 'up',
      '崩壊': 'down',
    },
  },
  '魔女の森': {
    events: ['異変', '呪い', '儀式', '浄化', '封印'],
    targets: [
      { attribute: '闇' },
      { category: '魔女' },
      { category: 'ゴシック' },
    ],
    eventTendency: {
      '異変': 'neutral',
      '呪い': 'up',
      '儀式': 'up',
      '浄化': 'down',
      '封印': 'down',
    },
  },
  '闇市場': {
    events: ['摘発', '取引活発化', '密輸', '規制強化', '解放'],
    targets: [
      { attribute: '闇' },
      { category: 'シャドウ' },
      { category: '黒呪' },
    ],
    eventTendency: {
      '摘発': 'down',
      '取引活発化': 'up',
      '密輸': 'neutral',
      '規制強化': 'down',
      '解放': 'up',
    },
  },
  '時空の狭間': {
    events: ['時空歪み', '出現', '消失', '安定化', '拡大'],
    targets: [
      { attribute: '未来' },
      { category: 'ゴーレム' },
      { category: '未来鴉' },
    ],
    eventTendency: {
      '時空歪み': 'neutral',
      '出現': 'up',
      '消失': 'down',
      '安定化': 'down',
      '拡大': 'up',
    },
  },
  '粘液の沼地': {
    events: ['繁殖', '変異', '発見', '枯渇', '浄化'],
    targets: [
      { attribute: '原始' },
      { category: '粘液獣' },
    ],
    eventTendency: {
      '繁殖': 'up',
      '変異': 'up',
      '発見': 'up',
      '枯渇': 'down',
      '浄化': 'down',
    },
  },
  '鳥民の島': {
    events: ['祭典', '移住', '嵐', '豊作', '飢饉'],
    targets: [
      { attribute: '光' },
      { category: '鳥民' },
    ],
    eventTendency: {
      '祭典': 'up',
      '移住': 'neutral',
      '嵐': 'down',
      '豊作': 'up',
      '飢饉': 'down',
    },
  },
  '古代遺跡': {
    events: ['発掘', '封印', '崩壊', '発見', '調査'],
    targets: [
      { attribute: '原始' },
      { attribute: '闇' },
      { category: 'ゴシック' },
      { keyword: '禁忌' },
    ],
    eventTendency: {
      '発掘': 'up',
      '封印': 'down',
      '崩壊': 'down',
      '発見': 'up',
      '調査': 'up',
    },
  },
  '王都': {
    events: ['布告', '祭典', '事件', '規制', '開放'],
    targets: [
      { all: true },
    ],
    eventTendency: {
      '布告': 'neutral',
      '祭典': 'up',
      '事件': 'down',
      '規制': 'down',
      '開放': 'up',
    },
  },
  '学術都市': {
    events: ['研究発表', '発明', '論争', '新理論', '撤回'],
    targets: [
      { attribute: '未来' },
      { attribute: '光' },
      { category: 'ゴーレム' },
    ],
    eventTendency: {
      '研究発表': 'up',
      '発明': 'up',
      '論争': 'neutral',
      '新理論': 'up',
      '撤回': 'down',
    },
  },
  '辺境の村': {
    events: ['目撃', '被害', '救援', '発見', '襲撃'],
    targets: [
      { attribute: '原始' },
      { category: '粘液獣' },
      { category: '鎖縛' },
    ],
    eventTendency: {
      '目撃': 'up',
      '被害': 'down',
      '救援': 'neutral',
      '発見': 'up',
      '襲撃': 'down',
    },
  },
  '海賊の港': {
    events: ['密輸', '嵐', '沈没', '取引', '摘発'],
    targets: [
      { attribute: '水' },
      { category: 'リヴァイアサン' },
    ],
    eventTendency: {
      '密輸': 'neutral',
      '嵐': 'down',
      '沈没': 'down',
      '取引': 'up',
      '摘発': 'down',
    },
  },
  '商人ギルド': {
    events: ['相場操作', '規制', '開放', '新ルール', '混乱'],
    targets: [
      { all: true },
    ],
    eventTendency: {
      '相場操作': 'neutral',
      '規制': 'down',
      '開放': 'up',
      '新ルール': 'neutral',
      '混乱': 'down',
    },
  },
  '禁忌の塔': {
    events: ['封印解除', '異変', '調査', '崩壊', '発見'],
    targets: [
      { attribute: '闇' },
      { keyword: '禁忌' },
    ],
    eventTendency: {
      '封印解除': 'up',
      '異変': 'up',
      '調査': 'up',
      '崩壊': 'down',
      '発見': 'up',
    },
  },
};

/**
 * テンプレート
 */
export const LOCATION_TEMPLATES = [
  '${location}で${event}発生、${target}に影響',
  '速報：${location}にて${event}',
  '${location}の${event}が市場に波紋',
  '${location}${event}で${target}に注目集まる',
];
