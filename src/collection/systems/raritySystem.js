/**
 * カードコレクションシステム - レアリティシステム
 *
 * レアリティ判定と排出率を管理
 */

import {
  RARITIES,
  RARITY_NAMES,
  RARITY_MULTIPLIERS,
  RARITY_COLORS,
  TIER_MIN_RARITY,
  SLOT_3_4_UC_RATE,
  SLOT_5_RATES,
} from '../data/constants';

// ========================================
// レアリティ順序（高い順）
// ========================================

const RARITY_ORDER = ['GR', 'SP', 'ALT', 'SEC', 'HR', 'UR', 'SR', 'R', 'UC', 'C'];

// ========================================
// レアリティ判定
// ========================================

/**
 * 指定ティアで出現可能なレアリティか判定
 * @param {string} tier - カードのティア（S/A/B/C/D）
 * @param {string} rarity - チェックするレアリティ
 * @returns {boolean}
 */
export const canAppearAtRarity = (tier, rarity) => {
  const minRarity = TIER_MIN_RARITY[tier] || 'C';
  const minIndex = RARITY_ORDER.indexOf(minRarity);
  const rarityIndex = RARITY_ORDER.indexOf(rarity);

  // GRは禁忌カード専用（ティアSかつ禁忌のみ）
  // ここでは単純にティア制限のみチェック
  if (rarity === 'GR' && tier !== 'S') {
    return false;
  }

  return rarityIndex <= minIndex;
};

/**
 * 指定ティアで出現可能なレアリティ一覧を取得
 * @param {string} tier - カードのティア
 * @returns {string[]} レアリティ配列
 */
export const getAvailableRarities = (tier) => {
  return RARITIES.filter(rarity => canAppearAtRarity(tier, rarity));
};

/**
 * レアリティの比較（高い方を返す）
 * @param {string} r1 - レアリティ1
 * @param {string} r2 - レアリティ2
 * @returns {string} より高いレアリティ
 */
export const getHigherRarity = (r1, r2) => {
  const i1 = RARITY_ORDER.indexOf(r1);
  const i2 = RARITY_ORDER.indexOf(r2);
  return i1 <= i2 ? r1 : r2;
};

/**
 * レアリティが有効か判定
 * @param {string} rarity
 * @returns {boolean}
 */
export const isValidRarity = (rarity) => {
  return RARITIES.includes(rarity);
};

// ========================================
// パック排出
// ========================================

/**
 * パック枠タイプに応じたレアリティを抽選
 * @param {string} slotType - 'C_ONLY' | 'C_UC' | 'R_PLUS'
 * @returns {string} 抽選されたレアリティ
 */
export const drawRarity = (slotType) => {
  switch (slotType) {
    case 'C_ONLY':
      return 'C';

    case 'C_UC':
      return Math.random() < SLOT_3_4_UC_RATE ? 'UC' : 'C';

    case 'R_PLUS':
      return drawRarePlus();

    default:
      return 'C';
  }
};

/**
 * R以上確定枠の抽選
 * @returns {string} 抽選されたレアリティ
 */
const drawRarePlus = () => {
  const rand = Math.random();
  let cumulative = 0;

  for (const [rarity, rate] of Object.entries(SLOT_5_RATES)) {
    cumulative += rate;
    if (rand < cumulative) {
      return rarity;
    }
  }

  // フォールバック（ほぼ起きない）
  return 'R';
};

// ========================================
// 表示ヘルパー
// ========================================

/**
 * レアリティの表示名を取得
 * @param {string} rarity
 * @returns {string}
 */
export const getRarityName = (rarity) => {
  return RARITY_NAMES[rarity] || rarity;
};

/**
 * レアリティの色を取得
 * @param {string} rarity
 * @returns {string}
 */
export const getRarityColor = (rarity) => {
  return RARITY_COLORS[rarity] || '#808080';
};

/**
 * レアリティの価値倍率を取得
 * @param {string} rarity
 * @returns {number}
 */
export const getRarityMultiplier = (rarity) => {
  return RARITY_MULTIPLIERS[rarity] || 1.0;
};

// ========================================
// エクスポート
// ========================================

export const raritySystem = {
  canAppearAtRarity,
  getAvailableRarities,
  getHigherRarity,
  isValidRarity,
  drawRarity,
  getRarityName,
  getRarityColor,
  getRarityMultiplier,
  RARITY_ORDER,
};

export default raritySystem;
