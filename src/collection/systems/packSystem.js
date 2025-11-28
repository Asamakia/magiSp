/**
 * カードコレクションシステム - パック開封
 *
 * パックの開封ロジックを管理
 */

import { ECONOMY } from '../data/constants';
import { raritySystem } from './raritySystem';
import { collectionManager } from './collectionManager';
import { currencyManager } from './currencyManager';
import { valueCalculator } from './valueCalculator';

// ========================================
// パック開封
// ========================================

/**
 * パックを開封（5枚抽選）
 * @param {Object[]} allCards - 全カードデータ
 * @param {Map} cardValueMap - カードID -> 価値情報のマップ
 * @returns {Array<{cardId: string, rarity: string, card: Object}>}
 */
export const openPack = (allCards, cardValueMap) => {
  const results = [];

  // 枠1-2: C確定
  results.push(drawCard(allCards, cardValueMap, 'C_ONLY'));
  results.push(drawCard(allCards, cardValueMap, 'C_ONLY'));

  // 枠3-4: C/UC（UC 30%）
  results.push(drawCard(allCards, cardValueMap, 'C_UC'));
  results.push(drawCard(allCards, cardValueMap, 'C_UC'));

  // 枠5: R以上確定
  results.push(drawCard(allCards, cardValueMap, 'R_PLUS'));

  return results;
};

/**
 * 単一カードを抽選
 * @param {Object[]} allCards - 全カードデータ
 * @param {Map} cardValueMap - カードID -> 価値情報のマップ
 * @param {string} slotType - 'C_ONLY' | 'C_UC' | 'R_PLUS'
 * @returns {{cardId: string, rarity: string, card: Object}}
 */
const drawCard = (allCards, cardValueMap, slotType) => {
  // 1. レアリティを決定
  const rarity = raritySystem.drawRarity(slotType);

  // 2. そのレアリティで出現可能なカードを絞り込み
  const eligibleCards = allCards.filter(card => {
    const valueInfo = cardValueMap.get(card.id);
    if (!valueInfo) return true; // 価値情報がない場合は許可

    const tier = valueInfo.tier || 'D';

    // GRは禁忌カードのみ
    if (rarity === 'GR') {
      return card.keyword && card.keyword.includes('禁忌');
    }

    return raritySystem.canAppearAtRarity(tier, rarity);
  });

  // カードがない場合のフォールバック
  if (eligibleCards.length === 0) {
    // 全カードから選択（通常は起きない）
    const fallbackCard = allCards[Math.floor(Math.random() * allCards.length)];
    return {
      cardId: fallbackCard.id,
      rarity: 'C', // Cにフォールバック
      card: fallbackCard,
    };
  }

  // 3. ランダムに1枚選択
  const card = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];

  return {
    cardId: card.id,
    rarity,
    card,
  };
};

// ========================================
// パック購入・開封統合
// ========================================

/**
 * パックを購入して開封
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードデータ
 * @param {Map} [cardValueMap] - カードID -> 価値情報のマップ（省略時は計算）
 * @returns {Object} { success, error?, cards?, playerData? }
 */
export const buyAndOpenPack = (playerData, allCards, cardValueMap = null) => {
  // ゴールドチェック
  if (!currencyManager.canBuyPack(playerData)) {
    return {
      success: false,
      error: 'ゴールドが足りません',
    };
  }

  // 価値マップがない場合は計算
  const valueMap = cardValueMap || valueCalculator.calculateAllCardValues(allCards);

  // ゴールドを消費
  let newData = currencyManager.payForPack(playerData);
  if (!newData) {
    return {
      success: false,
      error: 'ゴールドの消費に失敗しました',
    };
  }

  // パック開封
  const cards = openPack(allCards, valueMap);

  // 各カードをコレクションに追加
  for (const { cardId, rarity } of cards) {
    newData = collectionManager.addCard(newData, cardId, rarity);
  }

  return {
    success: true,
    cards,
    playerData: newData,
  };
};

/**
 * 無料パックを開封（勝利報酬等）
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードデータ
 * @param {Map} [cardValueMap] - カードID -> 価値情報のマップ
 * @returns {Object} { cards, playerData }
 */
export const openFreePack = (playerData, allCards, cardValueMap = null) => {
  // 価値マップがない場合は計算
  const valueMap = cardValueMap || valueCalculator.calculateAllCardValues(allCards);

  // パック開封
  const cards = openPack(allCards, valueMap);

  // 各カードをコレクションに追加
  let newData = {
    ...playerData,
    stats: {
      ...playerData.stats,
      packsOpened: (playerData.stats.packsOpened || 0) + 1,
    },
  };

  for (const { cardId, rarity } of cards) {
    newData = collectionManager.addCard(newData, cardId, rarity);
  }

  return {
    cards,
    playerData: newData,
  };
};

/**
 * 未開封パックを1つ開封
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードデータ
 * @param {Map} [cardValueMap] - カードID -> 価値情報のマップ
 * @returns {Object} { success, error?, cards?, playerData? }
 */
export const openUnopenedPack = (playerData, allCards, cardValueMap = null) => {
  // 未開封パックの確認
  if (!playerData.unopenedPacks || playerData.unopenedPacks <= 0) {
    return {
      success: false,
      error: '未開封パックがありません',
    };
  }

  // 価値マップがない場合は計算
  const valueMap = cardValueMap || valueCalculator.calculateAllCardValues(allCards);

  // パック開封
  const cards = openPack(allCards, valueMap);

  // 各カードをコレクションに追加 & 未開封パック数を減らす
  let newData = {
    ...playerData,
    unopenedPacks: playerData.unopenedPacks - 1,
    stats: {
      ...playerData.stats,
      packsOpened: (playerData.stats.packsOpened || 0) + 1,
    },
  };

  for (const { cardId, rarity } of cards) {
    newData = collectionManager.addCard(newData, cardId, rarity);
  }

  return {
    success: true,
    cards,
    playerData: newData,
  };
};

// ========================================
// パック情報
// ========================================

/**
 * パック情報を取得
 * @returns {Object}
 */
export const getPackInfo = () => {
  return {
    price: ECONOMY.PACK_PRICE,
    cardsPerPack: ECONOMY.CARDS_PER_PACK,
    priceFormatted: currencyManager.formatGold(ECONOMY.PACK_PRICE),
  };
};

// ========================================
// まとめ買い・まとめ開封
// ========================================

/**
 * 複数パックを購入して開封
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードデータ
 * @param {number} packCount - 購入パック数
 * @param {Map} [cardValueMap] - カードID -> 価値情報のマップ（省略時は計算）
 * @returns {Object} { success, error?, cards?, playerData?, packCount? }
 */
export const buyAndOpenMultiplePacks = (playerData, allCards, packCount, cardValueMap = null) => {
  const totalCost = ECONOMY.PACK_PRICE * packCount;

  // ゴールドチェック
  if (!currencyManager.canAfford(playerData, totalCost)) {
    return {
      success: false,
      error: 'ゴールドが足りません',
    };
  }

  // 価値マップがない場合は計算
  const valueMap = cardValueMap || valueCalculator.calculateAllCardValues(allCards);

  // ゴールドを消費
  let newData = currencyManager.spendGold(playerData, totalCost, 'pack_multi');
  if (!newData) {
    return {
      success: false,
      error: 'ゴールドの消費に失敗しました',
    };
  }

  // パック開封統計を更新
  newData = {
    ...newData,
    stats: {
      ...newData.stats,
      packsOpened: (newData.stats.packsOpened || 0) + packCount,
    },
  };

  // 全パックを開封してカードを統合
  const allOpenedCards = [];
  for (let i = 0; i < packCount; i++) {
    const packCards = openPack(allCards, valueMap);
    allOpenedCards.push(...packCards);
  }

  // 各カードをコレクションに追加
  for (const { cardId, rarity } of allOpenedCards) {
    newData = collectionManager.addCard(newData, cardId, rarity);
  }

  return {
    success: true,
    cards: allOpenedCards,
    playerData: newData,
    packCount,
  };
};

/**
 * 複数の未開封パックを開封
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードデータ
 * @param {number} packCount - 開封パック数
 * @param {Map} [cardValueMap] - カードID -> 価値情報のマップ
 * @returns {Object} { success, error?, cards?, playerData?, packCount? }
 */
export const openMultipleUnopenedPacks = (playerData, allCards, packCount, cardValueMap = null) => {
  // 未開封パックの確認
  const availablePacks = playerData.unopenedPacks || 0;
  if (availablePacks < packCount) {
    return {
      success: false,
      error: `未開封パックが足りません（${availablePacks}個しかありません）`,
    };
  }

  // 価値マップがない場合は計算
  const valueMap = cardValueMap || valueCalculator.calculateAllCardValues(allCards);

  // 全パックを開封してカードを統合
  const allOpenedCards = [];
  for (let i = 0; i < packCount; i++) {
    const packCards = openPack(allCards, valueMap);
    allOpenedCards.push(...packCards);
  }

  // 各カードをコレクションに追加 & 未開封パック数を減らす
  let newData = {
    ...playerData,
    unopenedPacks: playerData.unopenedPacks - packCount,
    stats: {
      ...playerData.stats,
      packsOpened: (playerData.stats.packsOpened || 0) + packCount,
    },
  };

  for (const { cardId, rarity } of allOpenedCards) {
    newData = collectionManager.addCard(newData, cardId, rarity);
  }

  return {
    success: true,
    cards: allOpenedCards,
    playerData: newData,
    packCount,
  };
};

/**
 * まとめ買いオプションを取得
 * @returns {Array<{count: number, totalPrice: number, discountRate: number}>}
 */
export const getBulkBuyOptions = () => {
  return [
    { count: 3, totalPrice: ECONOMY.PACK_PRICE * 3, discountRate: 0 },
    { count: 5, totalPrice: ECONOMY.PACK_PRICE * 5, discountRate: 0 },
    { count: 10, totalPrice: ECONOMY.PACK_PRICE * 10, discountRate: 0 },
  ];
};

// ========================================
// エクスポート
// ========================================

export const packSystem = {
  openPack,
  buyAndOpenPack,
  openFreePack,
  openUnopenedPack,
  getPackInfo,
  // まとめ買い・まとめ開封
  buyAndOpenMultiplePacks,
  openMultipleUnopenedPacks,
  getBulkBuyOptions,
};

export default packSystem;
