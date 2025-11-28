/**
 * 動的市場システム - 比較型パターンデータ
 * パターン5: 固定比較ペア
 */

/**
 * 比較ペアデータ
 * 効果: aは下落、bは上昇
 */
export const COMPARISONS = [
  // 属性 vs 属性（相克関係）
  {
    a: { attribute: '炎', label: '炎属性' },
    b: { attribute: '水', label: '水属性' },
  },
  {
    a: { attribute: '水', label: '水属性' },
    b: { attribute: '炎', label: '炎属性' },
  },
  {
    a: { attribute: '光', label: '光属性' },
    b: { attribute: '闇', label: '闇属性' },
  },
  {
    a: { attribute: '闇', label: '闇属性' },
    b: { attribute: '光', label: '光属性' },
  },
  {
    a: { attribute: '原始', label: '原始属性' },
    b: { attribute: '未来', label: '未来属性' },
  },
  {
    a: { attribute: '未来', label: '未来属性' },
    b: { attribute: '原始', label: '原始属性' },
  },

  // コスト比較
  {
    a: { maxCost: 3, label: '低コスト' },
    b: { minCost: 5, label: '高コスト' },
  },
  {
    a: { minCost: 5, label: '高コスト' },
    b: { maxCost: 3, label: '低コスト' },
  },

  // レアリティ比較
  {
    a: { minRarity: 'SR', label: '高レア' },
    b: { maxRarity: 'R', label: '低レア' },
  },
  {
    a: { maxRarity: 'R', label: '低レア' },
    b: { minRarity: 'SR', label: '高レア' },
  },

  // ティア比較
  {
    a: { tiers: ['S', 'A'], label: '高ティア' },
    b: { tiers: ['C', 'D'], label: '低ティア' },
  },
  {
    a: { tiers: ['C', 'D'], label: '低ティア' },
    b: { tiers: ['S', 'A'], label: '高ティア' },
  },

  // モンスター vs 魔法
  {
    a: { type: 'monster', label: 'モンスター' },
    b: { type: 'magic', label: '魔法' },
  },
  {
    a: { type: 'magic', label: '魔法' },
    b: { type: 'monster', label: 'モンスター' },
  },
];

/**
 * テンプレート
 */
export const COMPARISON_TEMPLATES = [
  '${targetA}より${targetB}が注目され、明暗分かれる',
  '${targetA}から${targetB}への乗り換え進む',
  '今は${targetA}より${targetB}の時代か',
  '${targetA}離れが進み${targetB}に人気集中',
];

/**
 * 比較効果の変動幅
 */
export const COMPARISON_MODIFIERS = {
  down: { min: -15, max: -25 }, // 下落側
  up: { min: 15, max: 25 },     // 上昇側
};
