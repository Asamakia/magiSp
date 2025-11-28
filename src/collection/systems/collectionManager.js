/**
 * カードコレクションシステム - コレクション管理
 *
 * プレイヤーの所持カードを管理する
 */

import { RARITIES } from '../data/constants';
import { raritySystem } from './raritySystem';

// ========================================
// カード追加・削除
// ========================================

/**
 * カードを追加
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @param {string} rarity - レアリティ
 * @param {number} [quantity=1] - 追加枚数
 * @returns {Object} 更新されたプレイヤーデータ
 */
export const addCard = (playerData, cardId, rarity, quantity = 1) => {
  const collection = [...playerData.collection];
  const existing = collection.find(
    c => c.cardId === cardId && c.rarity === rarity
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    collection.push({ cardId, rarity, quantity });
  }

  return {
    ...playerData,
    collection,
    updatedAt: Date.now(),
  };
};

/**
 * カードを削除
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @param {string} rarity - レアリティ
 * @param {number} [quantity=1] - 削除枚数
 * @returns {Object} 更新されたプレイヤーデータ
 */
export const removeCard = (playerData, cardId, rarity, quantity = 1) => {
  const collection = [...playerData.collection];
  const index = collection.findIndex(
    c => c.cardId === cardId && c.rarity === rarity
  );

  if (index === -1) {
    return playerData; // 存在しない
  }

  collection[index] = {
    ...collection[index],
    quantity: collection[index].quantity - quantity,
  };

  // 枚数が0以下になったら削除
  if (collection[index].quantity <= 0) {
    collection.splice(index, 1);
  }

  return {
    ...playerData,
    collection,
    updatedAt: Date.now(),
  };
};

/**
 * 複数カードを一括追加
 * @param {Object} playerData - プレイヤーデータ
 * @param {Array<{cardId: string, rarity: string, quantity?: number}>} cards - カードリスト
 * @returns {Object} 更新されたプレイヤーデータ
 */
export const addCards = (playerData, cards) => {
  let data = playerData;
  for (const { cardId, rarity, quantity = 1 } of cards) {
    data = addCard(data, cardId, rarity, quantity);
  }
  return data;
};

// ========================================
// 所持確認
// ========================================

/**
 * 指定カード・レアリティを所持しているか
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @param {string} [rarity] - レアリティ（省略時はいずれかを所持）
 * @returns {boolean}
 */
export const hasCard = (playerData, cardId, rarity = null) => {
  if (rarity) {
    return playerData.collection.some(
      c => c.cardId === cardId && c.rarity === rarity && c.quantity > 0
    );
  }
  return playerData.collection.some(
    c => c.cardId === cardId && c.quantity > 0
  );
};

/**
 * 指定カード・レアリティの所持枚数を取得
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @param {string} rarity - レアリティ
 * @returns {number} 所持枚数
 */
export const getQuantity = (playerData, cardId, rarity) => {
  const entry = playerData.collection.find(
    c => c.cardId === cardId && c.rarity === rarity
  );
  return entry ? entry.quantity : 0;
};

/**
 * 指定カードの全レアリティ合計枚数を取得
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @returns {number} 合計枚数
 */
export const getTotalQuantity = (playerData, cardId) => {
  return playerData.collection
    .filter(c => c.cardId === cardId)
    .reduce((sum, c) => sum + c.quantity, 0);
};

// ========================================
// レアリティ関連
// ========================================

/**
 * 指定カードの所持レアリティ一覧を取得
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @returns {string[]} レアリティ配列
 */
export const getOwnedRarities = (playerData, cardId) => {
  return playerData.collection
    .filter(c => c.cardId === cardId && c.quantity > 0)
    .map(c => c.rarity);
};

/**
 * 指定カードの最高レアリティを取得（プリセットデッキ用）
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} cardId - カードID
 * @returns {string} 最高レアリティ（未所持の場合は'C'）
 */
export const getHighestRarity = (playerData, cardId) => {
  const owned = getOwnedRarities(playerData, cardId);

  if (owned.length === 0) {
    return 'C'; // 未所持はC扱い
  }

  // 最高レアリティを見つける
  let highest = 'C';
  for (const rarity of owned) {
    highest = raritySystem.getHigherRarity(highest, rarity);
  }
  return highest;
};

// ========================================
// 統計
// ========================================

/**
 * 総所持カード枚数を取得
 * @param {Object} playerData - プレイヤーデータ
 * @returns {number}
 */
export const getTotalCards = (playerData) => {
  return playerData.collection.reduce((sum, c) => sum + c.quantity, 0);
};

/**
 * ユニークカード数を取得（レアリティ問わず）
 * @param {Object} playerData - プレイヤーデータ
 * @returns {number}
 */
export const getUniqueCardCount = (playerData) => {
  const uniqueIds = new Set(playerData.collection.map(c => c.cardId));
  return uniqueIds.size;
};

/**
 * レアリティ別のカード枚数を取得
 * @param {Object} playerData - プレイヤーデータ
 * @returns {Object} { C: 10, UC: 5, R: 3, ... }
 */
export const getCardCountByRarity = (playerData) => {
  const counts = {};
  for (const rarity of RARITIES) {
    counts[rarity] = 0;
  }
  for (const entry of playerData.collection) {
    if (counts[entry.rarity] !== undefined) {
      counts[entry.rarity] += entry.quantity;
    }
  }
  return counts;
};

/**
 * コレクション完成度を計算
 * @param {Object} playerData - プレイヤーデータ
 * @param {number} totalCardTypes - 全カード種類数
 * @returns {number} 完成度（0-1）
 */
export const getCollectionProgress = (playerData, totalCardTypes) => {
  const uniqueCount = getUniqueCardCount(playerData);
  return totalCardTypes > 0 ? uniqueCount / totalCardTypes : 0;
};

// ========================================
// フィルタリング
// ========================================

/**
 * コレクションを条件でフィルタ
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object} filter - フィルタ条件
 * @param {string[]} [filter.rarities] - レアリティ
 * @param {string[]} [filter.cardIds] - カードID
 * @returns {Array} フィルタされたコレクション
 */
export const filterCollection = (playerData, filter = {}) => {
  let result = [...playerData.collection];

  if (filter.rarities && filter.rarities.length > 0) {
    result = result.filter(c => filter.rarities.includes(c.rarity));
  }

  if (filter.cardIds && filter.cardIds.length > 0) {
    result = result.filter(c => filter.cardIds.includes(c.cardId));
  }

  return result;
};

// ========================================
// エクスポート
// ========================================

export const collectionManager = {
  addCard,
  removeCard,
  addCards,
  hasCard,
  getQuantity,
  getTotalQuantity,
  getOwnedRarities,
  getHighestRarity,
  getTotalCards,
  getUniqueCardCount,
  getCardCountByRarity,
  getCollectionProgress,
  filterCollection,
};

export default collectionManager;
