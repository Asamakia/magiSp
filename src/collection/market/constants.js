/**
 * 動的市場システム - 定数定義
 *
 * 仕様: market_system.md
 */

// ========================================
// 時間の流れ
// ========================================

/** 1週間の戦闘数 */
export const DAYS_PER_WEEK = 7;

/** 価格履歴の保持数 */
export const PRICE_HISTORY_LENGTH = 30;

// ========================================
// 変動の上限
// ========================================

/** 上昇上限（+100% = 最大2倍） */
export const MAX_MODIFIER_UP = 100;

/** 下落上限（-50% = 最低半額） */
export const MAX_MODIFIER_DOWN = -50;

// ========================================
// 永続変動システム
// ========================================

/** デイリー変動から永続変動への蓄積率（10%） */
export const PERSISTENT_ACCUMULATION_RATE = 0.10;

/**
 * 回帰圧力の閾値と設定
 * 永続変動の絶対値がthresholdを超えると、chanceの確率でamountだけ0に向かう
 */
export const REGRESSION_THRESHOLDS = [
  { threshold: 100, chance: 0.50, amount: 15 },
  { threshold: 80, chance: 0.30, amount: 10 },
  { threshold: 50, chance: 0.10, amount: 5 },
];

// ========================================
// 突発イベント発生確率
// ========================================

/** 突発イベント発生確率（10%） */
export const SUDDEN_EVENT_CHANCE = 0.10;

// ========================================
// 変動幅定義
// ========================================

/**
 * 方向と変動幅の定義
 * label: 表示用テキスト
 * min/max: 変動幅（%）
 */
export const DIRECTIONS = {
  up_small: {
    label: '小幅上昇',
    labels: ['小幅上昇', 'やや上昇', '堅調', 'じわじわ上昇'],
    min: 10,
    max: 20,
  },
  up_medium: {
    label: '上昇',
    labels: ['上昇', '値上がり', '高騰気配', '買い優勢'],
    min: 20,
    max: 40,
  },
  up_large: {
    label: '急騰',
    labels: ['急騰', '暴騰', '爆上げ', '高騰'],
    min: 40,
    max: 60,
  },
  down_small: {
    label: '小幅下落',
    labels: ['小幅下落', 'やや下落', '軟調', 'じわじわ下落'],
    min: -20,
    max: -10,
  },
  down_medium: {
    label: '下落',
    labels: ['下落', '値下がり', '下落気配', '売り優勢'],
    min: -40,
    max: -20,
  },
  down_large: {
    label: '暴落',
    labels: ['暴落', '急落', '大暴落', '崩壊'],
    min: -60,
    max: -40,
  },
};

/** 上昇方向のキー */
export const UP_DIRECTIONS = ['up_small', 'up_medium', 'up_large'];

/** 下落方向のキー */
export const DOWN_DIRECTIONS = ['down_small', 'down_medium', 'down_large'];

/** 全方向のキー */
export const ALL_DIRECTIONS = [...UP_DIRECTIONS, ...DOWN_DIRECTIONS];

// ========================================
// 接続詞バリエーション
// ========================================

export const CONNECTORS = [
  'により',
  'を受けて',
  'の影響で',
  'がきっかけで',
  'に伴い',
];

// ========================================
// 属性定義
// ========================================

export const ATTRIBUTES = ['炎', '水', '光', '闇', '原始', '未来', 'なし'];

// ========================================
// エクスポート
// ========================================

export default {
  DAYS_PER_WEEK,
  PRICE_HISTORY_LENGTH,
  MAX_MODIFIER_UP,
  MAX_MODIFIER_DOWN,
  PERSISTENT_ACCUMULATION_RATE,
  REGRESSION_THRESHOLDS,
  SUDDEN_EVENT_CHANCE,
  DIRECTIONS,
  UP_DIRECTIONS,
  DOWN_DIRECTIONS,
  ALL_DIRECTIONS,
  CONNECTORS,
  ATTRIBUTES,
};
