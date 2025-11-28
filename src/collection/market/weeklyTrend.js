/**
 * 動的市場システム - 週間トレンド
 *
 * 7戦ごとに切り替わる緩やかなトレンド（15種）
 */

// ========================================
// 週間トレンド定義（15種）
// ========================================

export const WEEKLY_TRENDS = [
  {
    id: 1,
    name: '炎属性の時代',
    description: '炎属性カードの需要が高まっている',
    effects: [
      { target: { attribute: '炎' }, modifier: 20 },
      { target: { attribute: '水' }, modifier: -10 },
    ],
  },
  {
    id: 2,
    name: '水属性の時代',
    description: '水属性カードの需要が高まっている',
    effects: [
      { target: { attribute: '水' }, modifier: 20 },
      { target: { attribute: '炎' }, modifier: -10 },
    ],
  },
  {
    id: 3,
    name: '光属性の時代',
    description: '光属性カードの需要が高まっている',
    effects: [
      { target: { attribute: '光' }, modifier: 20 },
      { target: { attribute: '闇' }, modifier: -10 },
    ],
  },
  {
    id: 4,
    name: '闇属性の時代',
    description: '闇属性カードの需要が高まっている',
    effects: [
      { target: { attribute: '闇' }, modifier: 20 },
      { target: { attribute: '光' }, modifier: -10 },
    ],
  },
  {
    id: 5,
    name: '原始属性の時代',
    description: '原始属性カードの需要が高まっている',
    effects: [
      { target: { attribute: '原始' }, modifier: 20 },
    ],
  },
  {
    id: 6,
    name: '未来属性の時代',
    description: '未来属性カードの需要が高まっている',
    effects: [
      { target: { attribute: '未来' }, modifier: 20 },
    ],
  },
  {
    id: 7,
    name: '無属性の時代',
    description: '無属性カードの需要が高まっている',
    effects: [
      { target: { attribute: 'なし' }, modifier: 25 },
    ],
  },
  {
    id: 8,
    name: '低コスト環境',
    description: '低コストカードの需要が高まっている',
    effects: [
      { target: { maxCost: 3 }, modifier: 15 },
    ],
  },
  {
    id: 9,
    name: '高コスト環境',
    description: '高コストカードの需要が高まっている',
    effects: [
      { target: { minCost: 6 }, modifier: 15 },
    ],
  },
  {
    id: 10,
    name: 'レア志向',
    description: '高レアリティカードの需要が高まっている',
    effects: [
      { target: { minRarity: 'SR' }, modifier: 20 },
    ],
  },
  {
    id: 11,
    name: '堅実志向',
    description: '安定したカードの需要が高まっている',
    effects: [
      { target: { tiers: ['B', 'C'] }, modifier: 15 },
    ],
  },
  {
    id: 12,
    name: '禁忌ブーム',
    description: '禁忌カードの需要が急上昇している',
    effects: [
      { target: { keyword: '禁忌' }, modifier: 25 },
    ],
  },
  {
    id: 13,
    name: '好況',
    description: '市場全体が活況を呈している',
    effects: [
      { target: { all: true }, modifier: 10 },
    ],
  },
  {
    id: 14,
    name: '不況',
    description: '市場全体が低迷している',
    effects: [
      { target: { all: true }, modifier: -10 },
    ],
  },
  {
    id: 15,
    name: '混沌',
    description: '市場が不安定で予測困難',
    effects: [
      { target: { chaos: true }, modifier: 0 }, // 特殊：ランダム変動
    ],
  },
];

// ========================================
// ヘルパー関数
// ========================================

/**
 * ランダムな週間トレンドを取得
 * @param {number} [excludeId] - 除外するトレンドID（連続回避用）
 * @returns {Object} 週間トレンド
 */
export const getRandomTrend = (excludeId = null) => {
  let candidates = WEEKLY_TRENDS;

  if (excludeId !== null) {
    candidates = WEEKLY_TRENDS.filter(t => t.id !== excludeId);
  }

  const index = Math.floor(Math.random() * candidates.length);
  return { ...candidates[index] };
};

/**
 * IDで週間トレンドを取得
 * @param {number} id - トレンドID
 * @returns {Object|null} 週間トレンド
 */
export const getTrendById = (id) => {
  return WEEKLY_TRENDS.find(t => t.id === id) || null;
};

/**
 * 新しい週間トレンドを生成
 * @param {number} startDay - 開始日
 * @param {number} [excludeId] - 除外するトレンドID
 * @returns {Object} 週間トレンド状態
 */
export const createWeeklyTrend = (startDay, excludeId = null) => {
  const trend = getRandomTrend(excludeId);
  return {
    ...trend,
    startDay,
  };
};

// ========================================
// エクスポート
// ========================================

export default {
  WEEKLY_TRENDS,
  getRandomTrend,
  getTrendById,
  createWeeklyTrend,
};
