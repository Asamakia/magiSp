/**
 * カードコレクションシステム - ショップ
 *
 * カードの売買を管理
 */

import { collectionManager } from './collectionManager';
import { currencyManager } from './currencyManager';
import { valueCalculator } from './valueCalculator';

// ========================================
// カード売却
// ========================================

/**
 * カードを売却
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @param {string} rarity - レアリティ
 * @param {number} [quantity=1] - 売却枚数
 * @param {Object} card - カードデータ（価値計算用）
 * @returns {Object} { success, error?, goldEarned?, playerData? }
 */
export const sellCard = (playerData, cardId, rarity, quantity = 1, card) => {
  // 所持確認
  const owned = collectionManager.getQuantity(playerData, cardId, rarity);
  if (owned < quantity) {
    return {
      success: false,
      error: '所持枚数が足りません',
    };
  }

  // 価値計算
  const valueInfo = valueCalculator.calculateCardValue(card);
  const sellValue = valueInfo.rarityValues[rarity] || valueInfo.baseValue;
  const goldEarned = sellValue * quantity;

  // カード削除
  let newData = collectionManager.removeCard(playerData, cardId, rarity, quantity);

  // ゴールド追加
  newData = currencyManager.addGold(newData, goldEarned, 'sell');

  return {
    success: true,
    goldEarned,
    playerData: newData,
  };
};

/**
 * 売却価格を取得
 * @param {Object} card - カードデータ
 * @param {string} rarity - レアリティ
 * @returns {number} 売却価格
 */
export const getSellPrice = (card, rarity) => {
  const valueInfo = valueCalculator.calculateCardValue(card);
  return valueInfo.rarityValues[rarity] || valueInfo.baseValue;
};

// ========================================
// シングル購入（将来拡張）
// ========================================

/**
 * シングルカードを購入
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @param {string} rarity - レアリティ
 * @param {Object} card - カードデータ（価値計算用）
 * @returns {Object} { success, error?, playerData? }
 */
export const buyCard = (playerData, cardId, rarity, card) => {
  // 価値計算
  const valueInfo = valueCalculator.calculateCardValue(card);
  const buyPrice = valueInfo.rarityValues[rarity] || valueInfo.baseValue;

  // ゴールドチェック
  if (!currencyManager.canAfford(playerData, buyPrice)) {
    return {
      success: false,
      error: 'ゴールドが足りません',
    };
  }

  // ゴールド消費
  let newData = currencyManager.spendGold(playerData, buyPrice, 'buy');
  if (!newData) {
    return {
      success: false,
      error: 'ゴールドの消費に失敗しました',
    };
  }

  // カード追加
  newData = collectionManager.addCard(newData, cardId, rarity);

  return {
    success: true,
    playerData: newData,
  };
};

/**
 * 購入価格を取得
 * @param {Object} card - カードデータ
 * @param {string} rarity - レアリティ
 * @returns {number} 購入価格
 */
export const getBuyPrice = (card, rarity) => {
  // 売却と同額（マージンなし）
  return getSellPrice(card, rarity);
};

// ========================================
// エクスポート
// ========================================

export const shopSystem = {
  sellCard,
  getSellPrice,
  buyCard,
  getBuyPrice,
};

export default shopSystem;
