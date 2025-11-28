/**
 * カードコレクションシステム - 通貨管理
 *
 * ゴールド（G）の入出金を管理
 */

import { ECONOMY } from '../data/constants';

// ========================================
// 基本操作
// ========================================

/**
 * ゴールドを追加
 * @param {Object} playerData - プレイヤーデータ
 * @param {number} amount - 追加額
 * @param {string} [source] - 獲得元（統計用）
 * @returns {Object} 更新されたプレイヤーデータ
 */
export const addGold = (playerData, amount, source = 'unknown') => {
  if (amount <= 0) return playerData;

  return {
    ...playerData,
    gold: playerData.gold + amount,
    stats: {
      ...playerData.stats,
      totalGoldEarned: (playerData.stats.totalGoldEarned || 0) + amount,
    },
    updatedAt: Date.now(),
  };
};

/**
 * ゴールドを消費
 * @param {Object} playerData - プレイヤーデータ
 * @param {number} amount - 消費額
 * @param {string} [purpose] - 使用目的（統計用）
 * @returns {Object|null} 更新されたプレイヤーデータ（残高不足時はnull）
 */
export const spendGold = (playerData, amount, purpose = 'unknown') => {
  if (amount <= 0) return playerData;
  if (playerData.gold < amount) return null; // 残高不足

  return {
    ...playerData,
    gold: playerData.gold - amount,
    stats: {
      ...playerData.stats,
      totalGoldSpent: (playerData.stats.totalGoldSpent || 0) + amount,
    },
    updatedAt: Date.now(),
  };
};

/**
 * ゴールドが足りるか確認
 * @param {Object} playerData - プレイヤーデータ
 * @param {number} amount - 必要額
 * @returns {boolean}
 */
export const canAfford = (playerData, amount) => {
  return playerData.gold >= amount;
};

// ========================================
// 対戦報酬
// ========================================

/**
 * 対戦完了報酬を付与
 * @param {Object} playerData - プレイヤーデータ
 * @param {boolean} isWin - 勝利したか
 * @returns {Object} { playerData, goldReward, packReward }
 */
export const awardBattleReward = (playerData, isWin) => {
  let data = { ...playerData };

  // 基本報酬（勝敗問わず）
  const goldReward = ECONOMY.BATTLE_REWARD_GOLD;
  data = addGold(data, goldReward, 'battle');

  // 勝利ボーナス
  const packReward = isWin ? ECONOMY.BATTLE_WIN_BONUS_PACKS : 0;

  // 統計更新
  data = {
    ...data,
    stats: {
      ...data.stats,
      totalBattles: (data.stats.totalBattles || 0) + 1,
      wins: isWin ? (data.stats.wins || 0) + 1 : data.stats.wins || 0,
      losses: !isWin ? (data.stats.losses || 0) + 1 : data.stats.losses || 0,
    },
  };

  return {
    playerData: data,
    goldReward,
    packReward,
  };
};

// ========================================
// パック購入
// ========================================

/**
 * パックを購入できるか確認
 * @param {Object} playerData - プレイヤーデータ
 * @param {number} [count=1] - 購入パック数
 * @returns {boolean}
 */
export const canBuyPack = (playerData, count = 1) => {
  return canAfford(playerData, ECONOMY.PACK_PRICE * count);
};

/**
 * パック購入のゴールドを消費
 * @param {Object} playerData - プレイヤーデータ
 * @param {number} [count=1] - 購入パック数
 * @returns {Object|null} 更新されたプレイヤーデータ（残高不足時はnull）
 */
export const payForPack = (playerData, count = 1) => {
  const cost = ECONOMY.PACK_PRICE * count;
  const result = spendGold(playerData, cost, 'pack');

  if (!result) return null;

  return {
    ...result,
    stats: {
      ...result.stats,
      packsOpened: (result.stats.packsOpened || 0) + count,
    },
  };
};

// ========================================
// 表示ヘルパー
// ========================================

/**
 * ゴールドをフォーマット表示
 * @param {number} amount - 金額
 * @returns {string} フォーマットされた文字列
 */
export const formatGold = (amount) => {
  return amount.toLocaleString() + 'G';
};

/**
 * 現在のゴールドを取得
 * @param {Object} playerData - プレイヤーデータ
 * @returns {number}
 */
export const getGold = (playerData) => {
  return playerData.gold || 0;
};

// ========================================
// エクスポート
// ========================================

export const currencyManager = {
  addGold,
  spendGold,
  canAfford,
  awardBattleReward,
  canBuyPack,
  payForPack,
  formatGold,
  getGold,
};

export default currencyManager;
