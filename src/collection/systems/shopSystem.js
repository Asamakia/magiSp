/**
 * カードコレクションシステム - ショップ
 *
 * カードの売買を管理
 * 動的市場システム対応
 */

import { collectionManager } from './collectionManager';
import { currencyManager } from './currencyManager';
import { valueCalculator } from './valueCalculator';
import { getCardMarketPrice } from '../market/marketEngine';

// ========================================
// カード売却
// ========================================

/**
 * カードを売却（市場価格対応）
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @param {string} rarity - レアリティ
 * @param {number} [quantity=1] - 売却枚数
 * @param {Object} card - カードデータ（価値計算用）
 * @returns {Object} { success, error?, goldEarned?, modifier?, playerData? }
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

  // 価値計算（市場変動込み）
  const valueInfo = valueCalculator.calculateCardValue(card);
  const baseValue = valueInfo.rarityValues[rarity] || valueInfo.baseValue;

  // 市場価格を計算
  const marketState = playerData.market || {};
  const marketInfo = getCardMarketPrice(card, baseValue, marketState, rarity, valueInfo.tier);

  const goldEarned = marketInfo.price * quantity;

  // カード削除
  let newData = collectionManager.removeCard(playerData, cardId, rarity, quantity);

  // ゴールド追加
  newData = currencyManager.addGold(newData, goldEarned, 'sell');

  return {
    success: true,
    goldEarned,
    modifier: marketInfo.modifier,
    breakdown: marketInfo.breakdown,
    playerData: newData,
  };
};

/**
 * 売却価格を取得（市場価格対応）
 * @param {Object} card - カードデータ
 * @param {string} rarity - レアリティ
 * @param {Object} [marketState] - 市場状態（省略時は基礎価格）
 * @returns {Object} { price, basePrice, modifier, breakdown }
 */
export const getSellPrice = (card, rarity, marketState = null) => {
  const valueInfo = valueCalculator.calculateCardValue(card);
  const basePrice = valueInfo.rarityValues[rarity] || valueInfo.baseValue;

  if (!marketState) {
    return {
      price: basePrice,
      basePrice,
      modifier: 0,
      breakdown: [],
    };
  }

  const marketInfo = getCardMarketPrice(card, basePrice, marketState, rarity, valueInfo.tier);
  return {
    price: marketInfo.price,
    basePrice,
    modifier: marketInfo.modifier,
    breakdown: marketInfo.breakdown,
  };
};

// ========================================
// シングル購入（将来拡張）
// ========================================

/**
 * シングルカードを購入（市場価格対応）
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @param {string} rarity - レアリティ
 * @param {Object} card - カードデータ（価値計算用）
 * @returns {Object} { success, error?, goldSpent?, modifier?, playerData? }
 */
export const buyCard = (playerData, cardId, rarity, card) => {
  // 価値計算（市場変動込み）
  const valueInfo = valueCalculator.calculateCardValue(card);
  const basePrice = valueInfo.rarityValues[rarity] || valueInfo.baseValue;

  // 市場価格を計算
  const marketState = playerData.market || {};
  const marketInfo = getCardMarketPrice(card, basePrice, marketState, rarity, valueInfo.tier);
  const buyPrice = marketInfo.price;

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
    goldSpent: buyPrice,
    modifier: marketInfo.modifier,
    breakdown: marketInfo.breakdown,
    playerData: newData,
  };
};

/**
 * 購入価格を取得（市場価格対応）
 * @param {Object} card - カードデータ
 * @param {string} rarity - レアリティ
 * @param {Object} [marketState] - 市場状態（省略時は基礎価格）
 * @returns {Object} { price, basePrice, modifier, breakdown }
 */
export const getBuyPrice = (card, rarity, marketState = null) => {
  // 売却と同額（マージンなし）
  return getSellPrice(card, rarity, marketState);
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
