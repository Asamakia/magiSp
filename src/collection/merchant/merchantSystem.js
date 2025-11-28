/**
 * 商人システム - コアロジック
 *
 * 価格計算、品揃え生成、出現判定など
 */

import {
  MERCHANT_TYPES,
  FAVORABILITY_LEVELS,
  SELL_PRICE_MULTIPLIERS,
  BUY_PRICE_MULTIPLIERS,
  PRICE_LAG,
  STOCK_RARITY,
  APPEARANCE_CHANCE,
  WEEKDAY_MERCHANTS,
  COLLECTOR_APPEARANCE_THRESHOLD,
  INVENTORY,
  TICKETS,
} from './constants';
import { MERCHANTS, COLLECTORS } from './merchantData';

// ========================================
// 好感度システム
// ========================================

/**
 * 取引回数から好感度レベルを計算
 * @param {number} transactions - 取引回数
 * @returns {number} レベル (1-5)
 */
export const getFavorabilityLevel = (transactions) => {
  for (let level = 5; level >= 1; level--) {
    if (transactions >= FAVORABILITY_LEVELS[level].required) {
      return level;
    }
  }
  return 1;
};

/**
 * 好感度レベルの情報を取得
 * @param {number} level - レベル
 * @returns {Object} レベル情報
 */
export const getFavorabilityInfo = (level) => {
  return FAVORABILITY_LEVELS[level] || FAVORABILITY_LEVELS[1];
};

/**
 * 次のレベルまでの必要取引回数を取得
 * @param {number} currentTransactions - 現在の取引回数
 * @returns {{ nextLevel: number, required: number, remaining: number } | null}
 */
export const getNextLevelProgress = (currentTransactions) => {
  const currentLevel = getFavorabilityLevel(currentTransactions);
  if (currentLevel >= 5) return null;

  const nextLevel = currentLevel + 1;
  const required = FAVORABILITY_LEVELS[nextLevel].required;
  return {
    nextLevel,
    required,
    remaining: required - currentTransactions,
  };
};

// ========================================
// 価格計算
// ========================================

/**
 * 商人がカードの専門かどうか判定
 * @param {Object} merchant - 商人データ
 * @param {Object} card - カードデータ
 * @returns {boolean}
 */
export const isSpecialty = (merchant, card) => {
  if (!merchant.specialty) return false;

  const { type, value } = merchant.specialty;

  switch (type) {
    case 'attribute':
      return card.attribute === value;

    case 'category':
      // カテゴリは部分一致でチェック
      if (!card.category) return false;
      return value.some(cat => card.category.includes(cat));

    case 'rarity':
      // レアリティは配列でチェック
      return value.includes(card.rarity);

    default:
      return false;
  }
};

/**
 * カードが禁忌かどうか判定
 * @param {Object} card - カードデータ
 * @returns {boolean}
 */
export const isForbidden = (card) => {
  return card.forbidden === true || card.forbidden === 'true';
};

/**
 * 販売価格を計算（プレイヤーが買う）
 * @param {Object} merchant - 商人データ
 * @param {Object} card - カードデータ
 * @param {number} marketPrice - 市場価格
 * @param {number} favorabilityLevel - 好感度レベル
 * @returns {number} 販売価格
 */
export const calculateSellPrice = (merchant, card, marketPrice, favorabilityLevel = 1) => {
  const multipliers = SELL_PRICE_MULTIPLIERS[merchant.type];
  if (!multipliers) return marketPrice;

  let baseMultiplier;

  // 旅商人は特殊（ランダム割引）
  if (merchant.type === MERCHANT_TYPES.TRAVELER) {
    baseMultiplier = multipliers.min + Math.random() * (multipliers.max - multipliers.min);
  } else if (merchant.type === MERCHANT_TYPES.DARK && isForbidden(card)) {
    baseMultiplier = multipliers.forbidden;
  } else if (isSpecialty(merchant, card)) {
    baseMultiplier = multipliers.specialty;
  } else {
    baseMultiplier = multipliers.base;
  }

  // 好感度割引を適用
  const favInfo = getFavorabilityInfo(favorabilityLevel);
  const discountMultiplier = 1 - favInfo.sellDiscount;

  return Math.floor(marketPrice * baseMultiplier * discountMultiplier);
};

/**
 * 買取価格を計算（プレイヤーが売る）
 * @param {Object} merchant - 商人データ
 * @param {Object} card - カードデータ
 * @param {number} marketPrice - 市場価格
 * @param {number} favorabilityLevel - 好感度レベル
 * @returns {number | null} 買取価格（nullは買取不可）
 */
export const calculateBuyPrice = (merchant, card, marketPrice, favorabilityLevel = 1) => {
  const multipliers = BUY_PRICE_MULTIPLIERS[merchant.type];
  if (!multipliers) return null; // 旅商人は買取なし

  let baseMultiplier;

  if (merchant.type === MERCHANT_TYPES.DARK && isForbidden(card)) {
    baseMultiplier = multipliers.forbidden;
  } else if (isSpecialty(merchant, card)) {
    baseMultiplier = multipliers.specialty;
  } else {
    baseMultiplier = multipliers.base;
  }

  // 好感度ボーナスを適用
  const favInfo = getFavorabilityInfo(favorabilityLevel);
  const bonusMultiplier = 1 + favInfo.buyBonus;

  return Math.floor(marketPrice * baseMultiplier * bonusMultiplier);
};

// ========================================
// 相場認識ラグ
// ========================================

/**
 * 商人の相場認識ラグを取得
 * @param {Object} merchant - 商人データ
 * @param {Object} card - カードデータ（コレクターの専門判定用）
 * @returns {number} ラグ日数
 */
export const getPriceLag = (merchant, card = null) => {
  const lag = PRICE_LAG[merchant.type];

  if (typeof lag === 'number') {
    return lag;
  }

  // コレクターの場合
  if (typeof lag === 'object' && card) {
    return isSpecialty(merchant, card) ? lag.specialty : lag.other;
  }

  return 0;
};

// ========================================
// 出現判定
// ========================================

/**
 * 曜日に基づいて出現する属性商人を取得
 * @param {number} dayId - 日数（ゲーム内の日）
 * @returns {string[]} 出現する商人名の配列
 */
export const getAvailableAttributeMerchants = (dayId) => {
  const weekday = dayId % 7;
  const merchant = WEEKDAY_MERCHANTS[weekday];

  if (merchant === 'all') {
    // 日曜は全員
    return Object.values(MERCHANTS)
      .filter(m => m.type === MERCHANT_TYPES.ATTRIBUTE)
      .map(m => m.name);
  }

  return [merchant];
};

/**
 * 闇商人の出現判定
 * @param {number} forbiddenCount - 禁忌カード所持数
 * @param {boolean} hasTicket - 招待状使用
 * @returns {boolean}
 */
export const checkDarkMerchantAppearance = (forbiddenCount = 0, hasTicket = false) => {
  if (hasTicket) return true;

  const chance = forbiddenCount >= 3
    ? APPEARANCE_CHANCE.darkWithForbidden
    : APPEARANCE_CHANCE.dark;

  return Math.random() < chance;
};

/**
 * 旅商人の出現判定
 * @param {number} totalAssets - 総資産
 * @param {boolean} hasTicket - 風笛使用
 * @returns {boolean}
 */
export const checkTravelerAppearance = (totalAssets = 0, hasTicket = false) => {
  if (hasTicket) return true;

  const chance = totalAssets >= 100000
    ? APPEARANCE_CHANCE.travelerRich
    : APPEARANCE_CHANCE.traveler;

  return Math.random() < chance;
};

/**
 * 今日出現するコレクターを決定
 * @param {Object} categorySoldCount - カテゴリ別売却カウント
 * @param {number} seed - ランダムシード（dayIdなど）
 * @returns {string[]} 出現するコレクター名の配列
 */
export const getTodayCollectors = (categorySoldCount = {}, seed = 0) => {
  const result = [];

  // 確定出現チェック（カテゴリ売却による）
  for (const collector of COLLECTORS) {
    const { value: categories } = collector.specialty;
    for (const category of categories) {
      if ((categorySoldCount[category] || 0) >= COLLECTOR_APPEARANCE_THRESHOLD) {
        if (!result.includes(collector.name)) {
          result.push(collector.name);
        }
      }
    }
  }

  // ランダム出現（1-2人）
  const { min, max } = APPEARANCE_CHANCE.collectorPerDay;
  const randomCount = min + Math.floor((seed % 100) / 100 * (max - min + 1));
  const remainingCount = Math.max(0, randomCount - result.length);

  if (remainingCount > 0) {
    // シードを使った擬似ランダム
    const availableCollectors = COLLECTORS
      .filter(c => !result.includes(c.name))
      .sort((a, b) => {
        const hashA = (seed * 31 + a.id.charCodeAt(0)) % 1000;
        const hashB = (seed * 31 + b.id.charCodeAt(0)) % 1000;
        return hashA - hashB;
      });

    for (let i = 0; i < remainingCount && i < availableCollectors.length; i++) {
      result.push(availableCollectors[i].name);
    }
  }

  return result;
};

// ========================================
// 品揃え生成
// ========================================

/**
 * レアリティを抽選
 * @param {Object} rates - レアリティ別確率
 * @returns {string} 抽選されたレアリティ
 */
const drawRarity = (rates) => {
  const rand = Math.random();
  let cumulative = 0;

  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (rand < cumulative) {
      return rarity;
    }
  }

  // フォールバック
  return Object.keys(rates)[0];
};

/**
 * レアリティの順序（比較用）
 */
const RARITY_ORDER = ['C', 'UC', 'R', 'SR', 'UR', 'HR', 'SEC', 'ALT', 'SP', 'GR'];

/**
 * レアリティが指定以上かチェック
 * @param {string} rarity - チェックするレアリティ
 * @param {string} minRarity - 最低レアリティ
 * @returns {boolean}
 */
const isRarityAtLeast = (rarity, minRarity) => {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(minRarity);
};

/**
 * 商人の品揃えを生成
 * @param {Object} merchant - 商人データ
 * @param {Array} cardPool - カードプール
 * @param {number} dayId - 日数
 * @param {Object} options - オプション
 * @returns {Array<{ cardId: string, rarity: string, price: number }>}
 */
export const generateStock = (merchant, cardPool, dayId, options = {}) => {
  const {
    favorabilityLevel = 1,
    getMarketPrice = () => 100,
    playerInventory = [],
  } = options;

  const stockConfig = STOCK_RARITY[merchant.type];
  if (!stockConfig) return [];

  // 好感度による追加枠
  const favInfo = getFavorabilityInfo(favorabilityLevel);
  const extraSlots = favInfo.extraSlots || 0;
  const totalCount = stockConfig.count + extraSlots;

  // フィルタリング: 専門のみ or 全体
  let filteredPool = cardPool;
  if (merchant.specialty) {
    filteredPool = cardPool.filter(card => isSpecialty(merchant, card));
  }

  if (filteredPool.length === 0) {
    return [];
  }

  const stock = [];
  const usedCardIds = new Set();

  // プレイヤー売却品を優先的に追加
  for (const item of playerInventory) {
    if (usedCardIds.size >= totalCount) break;
    if (item.merchant !== merchant.name) continue;
    if (item.availableAt > dayId) continue;

    const card = cardPool.find(c => c.id === item.cardId);
    if (!card) continue;

    const marketPrice = getMarketPrice(card, item.rarity);
    const price = calculateSellPrice(merchant, card, marketPrice, favorabilityLevel);

    stock.push({
      cardId: item.cardId,
      rarity: item.rarity,
      price,
      isPlayerSold: true,
    });
    usedCardIds.add(item.cardId);
  }

  // ランダム生成
  const remainingCount = totalCount - stock.length;
  const shuffledPool = [...filteredPool].sort(() => Math.random() - 0.5);

  for (let i = 0; i < remainingCount && shuffledPool.length > 0; i++) {
    // 重複を避ける
    let card;
    let attempts = 0;
    do {
      card = shuffledPool[Math.floor(Math.random() * shuffledPool.length)];
      attempts++;
    } while (usedCardIds.has(card.id) && attempts < 50);

    if (usedCardIds.has(card.id)) continue;

    const rarity = drawRarity(stockConfig.rates);
    const marketPrice = getMarketPrice(card, rarity);
    const price = calculateSellPrice(merchant, card, marketPrice, favorabilityLevel);

    stock.push({
      cardId: card.id,
      rarity,
      price,
      isPlayerSold: false,
    });
    usedCardIds.add(card.id);
  }

  // 確定枠の適用
  if (stockConfig.guaranteed) {
    const { minRarity, count, minUR, bargain } = stockConfig.guaranteed;

    // 最低レアリティ保証
    if (minRarity && count) {
      let guaranteedCount = 0;
      for (const item of stock) {
        if (isRarityAtLeast(item.rarity, minRarity)) {
          guaranteedCount++;
        }
      }

      // 不足分を補填
      while (guaranteedCount < count && stock.length > 0) {
        const lowRarityIndex = stock.findIndex(
          item => !isRarityAtLeast(item.rarity, minRarity)
        );
        if (lowRarityIndex === -1) break;

        stock[lowRarityIndex].rarity = minRarity;
        // 価格再計算
        const card = cardPool.find(c => c.id === stock[lowRarityIndex].cardId);
        if (card) {
          const marketPrice = getMarketPrice(card, minRarity);
          stock[lowRarityIndex].price = calculateSellPrice(
            merchant, card, marketPrice, favorabilityLevel
          );
        }
        guaranteedCount++;
      }
    }

    // UR以上保証（闇商人用）
    if (minUR) {
      let urCount = 0;
      for (const item of stock) {
        if (isRarityAtLeast(item.rarity, 'UR')) {
          urCount++;
        }
      }

      while (urCount < minUR && stock.length > 0) {
        const lowIndex = stock.findIndex(item => !isRarityAtLeast(item.rarity, 'UR'));
        if (lowIndex === -1) break;

        stock[lowIndex].rarity = 'UR';
        const card = cardPool.find(c => c.id === stock[lowIndex].cardId);
        if (card) {
          const marketPrice = getMarketPrice(card, 'UR');
          stock[lowIndex].price = calculateSellPrice(
            merchant, card, marketPrice, favorabilityLevel
          );
        }
        urCount++;
      }
    }

    // 掘り出し物保証（旅商人用）
    if (bargain && stock.length > 0) {
      const bargainIndex = Math.floor(Math.random() * stock.length);
      stock[bargainIndex].price = Math.floor(stock[bargainIndex].price * 0.5);
      stock[bargainIndex].isBargain = true;
    }
  }

  return stock;
};

// ========================================
// 初期merchantData作成
// ========================================

/**
 * 初期merchantDataを作成
 * @returns {Object}
 */
export const createInitialMerchantData = () => {
  const favorability = {};
  for (const name of Object.keys(MERCHANTS)) {
    favorability[name] = { level: 1, transactions: 0 };
  }

  return {
    favorability,
    inventory: {},
    pendingStock: [],
    todayStock: {
      dayId: -1,
      stocks: {},
    },
    todayAppearances: {
      dayId: -1,
      attribute: [],
      collector: [],
      dark: false,
      traveler: false,
      usedTickets: { dark: false, traveler: false },
    },
    tickets: {
      attribute: 0,
      dark: 0,
      traveler: 0,
    },
    wishlist: [],
    rumors: {
      dayId: -1,
      list: [],
    },
    categorySoldCount: {},
  };
};

// ========================================
// 日次出現判定（キャッシュ付き）
// ========================================

/**
 * 今日の商人出現を取得（キャッシュがあれば使用）
 * @param {Object} merchantData - 商人データ
 * @param {number} dayId - 現在の日
 * @param {Object} options - オプション
 * @returns {{ appearances: Object, updated: boolean, newMerchantData: Object | null }}
 */
export const getTodayAppearances = (merchantData, dayId, options = {}) => {
  const {
    forbiddenCount = 0,  // 禁忌カード所持数
    totalAssets = 0,     // 総資産
  } = options;

  // キャッシュが有効ならそのまま返す
  if (merchantData.todayAppearances?.dayId === dayId) {
    return {
      appearances: merchantData.todayAppearances,
      updated: false,
      newMerchantData: null,
    };
  }

  // 新規計算
  const tickets = merchantData.tickets || { attribute: 0, dark: 0, traveler: 0 };

  // 属性商人（曜日判定）
  const attribute = getAvailableAttributeMerchants(dayId);

  // コレクター（日替わり）
  const collector = getTodayCollectors(merchantData.categorySoldCount || {}, dayId);

  // 闇商人（確率判定）
  const darkTicketUsed = tickets.dark > 0;
  const dark = checkDarkMerchantAppearance(forbiddenCount, darkTicketUsed);

  // 旅商人（確率判定）
  const travelerTicketUsed = tickets.traveler > 0;
  const traveler = checkTravelerAppearance(totalAssets, travelerTicketUsed);

  const newAppearances = {
    dayId,
    attribute,
    collector,
    dark,
    traveler,
    usedTickets: {
      dark: dark && darkTicketUsed,
      traveler: traveler && travelerTicketUsed,
    },
  };

  // チケット消費を反映した新しいmerchantDataを作成
  const newMerchantData = {
    ...merchantData,
    todayAppearances: newAppearances,
    tickets: {
      ...tickets,
      dark: newAppearances.usedTickets.dark ? tickets.dark - 1 : tickets.dark,
      traveler: newAppearances.usedTickets.traveler ? tickets.traveler - 1 : tickets.traveler,
    },
  };

  return {
    appearances: newAppearances,
    updated: true,
    newMerchantData,
  };
};

// ========================================
// 取引処理
// ========================================

/**
 * 商人から購入
 * @param {Object} merchantData - 商人データ状態
 * @param {string} merchantName - 商人名
 * @param {string} cardId - カードID
 * @param {string} rarity - レアリティ
 * @param {number} price - 価格
 * @returns {Object} 更新されたmerchantData
 */
export const purchaseFromMerchant = (merchantData, merchantName, cardId, rarity, price) => {
  const newData = { ...merchantData };

  // 好感度更新
  const fav = { ...newData.favorability[merchantName] };
  fav.transactions += 1;
  fav.level = getFavorabilityLevel(fav.transactions);
  newData.favorability = { ...newData.favorability, [merchantName]: fav };

  // 品揃えから削除
  if (newData.todayStock.stocks[merchantName]) {
    newData.todayStock = {
      ...newData.todayStock,
      stocks: {
        ...newData.todayStock.stocks,
        [merchantName]: newData.todayStock.stocks[merchantName].filter(
          item => !(item.cardId === cardId && item.rarity === rarity)
        ),
      },
    };
  }

  // pendingStock（プレイヤー売却品）からも削除
  if (newData.pendingStock) {
    const pendingIndex = newData.pendingStock.findIndex(
      item => item.merchant === merchantName && item.cardId === cardId && item.rarity === rarity
    );
    if (pendingIndex >= 0) {
      newData.pendingStock = [
        ...newData.pendingStock.slice(0, pendingIndex),
        ...newData.pendingStock.slice(pendingIndex + 1),
      ];
    }
  }

  return newData;
};

/**
 * 商人に売却
 * @param {Object} merchantData - 商人データ状態
 * @param {string} merchantName - 商人名
 * @param {Object} card - カードデータ
 * @param {string} rarity - レアリティ
 * @param {number} dayId - 現在の日
 * @returns {Object} 更新されたmerchantData
 */
export const sellToMerchant = (merchantData, merchantName, card, rarity, dayId) => {
  const newData = { ...merchantData };
  const merchant = MERCHANTS[merchantName];

  // 好感度更新
  const fav = { ...newData.favorability[merchantName] };
  fav.transactions += 1;
  fav.level = getFavorabilityLevel(fav.transactions);
  newData.favorability = { ...newData.favorability, [merchantName]: fav };

  // カテゴリ売却カウント更新
  if (card.category) {
    const categories = card.category.match(/【([^】]+)】/g) || [];
    const newCategorySoldCount = { ...newData.categorySoldCount };
    for (const cat of categories) {
      const catName = cat.replace(/[【】]/g, '');
      newCategorySoldCount[catName] = (newCategorySoldCount[catName] || 0) + 1;
    }
    newData.categorySoldCount = newCategorySoldCount;
  }

  // 在庫化判定
  if (merchant) {
    // 旅商人は在庫化しない（その場でトレードのみ）
    if (merchant.type === MERCHANT_TYPES.TRAVELER) {
      return newData;
    }

    // コレクターは専門のみ在庫化
    if (merchant.type === MERCHANT_TYPES.COLLECTOR && !isSpecialty(merchant, card)) {
      return newData;
    }

    // 在庫化確率判定
    const stockChance = INVENTORY.stockChance[merchant.type] || 0;
    if (Math.random() < stockChance) {
      // 出現遅延を計算
      let delay = 1;
      const delayConfig = INVENTORY.appearDelay[merchant.type];
      if (delayConfig) {
        if (typeof delayConfig === 'number') {
          delay = delayConfig;
        } else {
          // min〜max の範囲でランダム
          delay = delayConfig.min + Math.floor(Math.random() * (delayConfig.max - delayConfig.min + 1));
        }
      }
      // 闇商人・旅商人は出現時に在庫化判定するため、遅延なし扱い
      if (merchant.type === MERCHANT_TYPES.DARK || merchant.type === MERCHANT_TYPES.TRAVELER) {
        delay = 0;
      }

      // pendingStockに追加
      const newPendingStock = [...(newData.pendingStock || [])];
      newPendingStock.push({
        merchant: merchantName,
        cardId: card.id,
        rarity,
        addedAt: dayId,
        availableAt: dayId + delay,
        fromPlayer: true,
      });

      // 商人ごとの在庫上限をチェック
      const merchantStock = newPendingStock.filter(item => item.merchant === merchantName);
      if (merchantStock.length > INVENTORY.maxPerMerchant) {
        // 古いものから削除
        const oldestIndex = newPendingStock.findIndex(
          item => item.merchant === merchantName
        );
        if (oldestIndex >= 0) {
          newPendingStock.splice(oldestIndex, 1);
        }
      }

      newData.pendingStock = newPendingStock;
    }
  }

  return newData;
};

// ========================================
// チケット操作
// ========================================

/**
 * チケットを購入
 * @param {Object} merchantData - 商人データ状態
 * @param {string} ticketType - チケットタイプ ('attribute', 'dark', 'traveler')
 * @param {number} currentGold - 現在の所持金
 * @returns {{ success: boolean, newMerchantData: Object, newGold: number, message: string }}
 */
export const purchaseTicket = (merchantData, ticketType, currentGold) => {
  const ticketInfo = TICKETS[ticketType];
  if (!ticketInfo) {
    return { success: false, newMerchantData: merchantData, newGold: currentGold, message: '無効なチケットタイプです' };
  }

  if (currentGold < ticketInfo.price) {
    return { success: false, newMerchantData: merchantData, newGold: currentGold, message: '所持金が足りません' };
  }

  const newTickets = { ...merchantData.tickets };
  newTickets[ticketType] = (newTickets[ticketType] || 0) + 1;

  return {
    success: true,
    newMerchantData: {
      ...merchantData,
      tickets: newTickets,
    },
    newGold: currentGold - ticketInfo.price,
    message: `${ticketInfo.name}を購入しました`,
  };
};

/**
 * 属性商人呼び出しチケットを使用
 * @param {Object} merchantData - 商人データ状態
 * @param {string} merchantName - 呼び出す商人名
 * @param {number} dayId - 現在の日
 * @returns {{ success: boolean, newMerchantData: Object, message: string }}
 */
export const callAttributeMerchant = (merchantData, merchantName, dayId) => {
  const tickets = merchantData.tickets || {};
  if (!tickets.attribute || tickets.attribute <= 0) {
    return { success: false, newMerchantData: merchantData, message: '属性商人呼び出し券を所持していません' };
  }

  const merchant = MERCHANTS[merchantName];
  if (!merchant || merchant.type !== MERCHANT_TYPES.ATTRIBUTE) {
    return { success: false, newMerchantData: merchantData, message: '無効な属性商人です' };
  }

  // 既に今日出現している場合は不要
  const currentAppearances = merchantData.todayAppearances?.attribute || [];
  if (currentAppearances.includes(merchantName)) {
    return { success: false, newMerchantData: merchantData, message: `${merchantName}は既に出現しています` };
  }

  // チケット消費 & 出現リストに追加
  const newTickets = { ...tickets };
  newTickets.attribute -= 1;

  const newAppearances = {
    ...merchantData.todayAppearances,
    attribute: [...currentAppearances, merchantName],
  };

  return {
    success: true,
    newMerchantData: {
      ...merchantData,
      tickets: newTickets,
      todayAppearances: newAppearances,
    },
    message: `${merchantName}を呼び出しました`,
  };
};

/**
 * pendingStockの古いアイテムをクリーンアップ
 * @param {Object} merchantData - 商人データ状態
 * @param {number} dayId - 現在の日
 * @returns {Object} 更新されたmerchantData
 */
export const cleanupPendingStock = (merchantData, dayId) => {
  if (!merchantData.pendingStock || merchantData.pendingStock.length === 0) {
    return merchantData;
  }

  const maxAge = INVENTORY.maxAge || 7;
  const newPendingStock = merchantData.pendingStock.filter(item => {
    // availableAtからmaxAge日以上経過したアイテムを削除
    const age = dayId - item.availableAt;
    return age < maxAge;
  });

  if (newPendingStock.length === merchantData.pendingStock.length) {
    return merchantData;
  }

  return {
    ...merchantData,
    pendingStock: newPendingStock,
  };
};

// ========================================
// ウィッシュリスト
// ========================================

/**
 * ウィッシュリストにカードを追加
 * @param {Object} merchantData - 商人データ状態
 * @param {string} cardId - カードID
 * @returns {Object} 更新されたmerchantData
 */
export const addToWishlist = (merchantData, cardId) => {
  const wishlist = merchantData.wishlist || [];

  // 既に追加済み
  if (wishlist.includes(cardId)) {
    return merchantData;
  }

  // 最大10枚まで
  if (wishlist.length >= 10) {
    return merchantData;
  }

  return {
    ...merchantData,
    wishlist: [...wishlist, cardId],
  };
};

/**
 * ウィッシュリストからカードを削除
 * @param {Object} merchantData - 商人データ状態
 * @param {string} cardId - カードID
 * @returns {Object} 更新されたmerchantData
 */
export const removeFromWishlist = (merchantData, cardId) => {
  const wishlist = merchantData.wishlist || [];

  if (!wishlist.includes(cardId)) {
    return merchantData;
  }

  return {
    ...merchantData,
    wishlist: wishlist.filter(id => id !== cardId),
  };
};

/**
 * カードがウィッシュリストに含まれているか
 * @param {Object} merchantData - 商人データ状態
 * @param {string} cardId - カードID
 * @returns {boolean}
 */
export const isInWishlist = (merchantData, cardId) => {
  const wishlist = merchantData.wishlist || [];
  return wishlist.includes(cardId);
};

/**
 * 商人の品揃えにウィッシュリストのカードがあるかチェック
 * @param {Array} stock - 商人の品揃え
 * @param {Array} wishlist - ウィッシュリスト
 * @returns {Array} マッチしたカードIDリスト
 */
export const getWishlistMatches = (stock, wishlist) => {
  if (!stock || !wishlist || wishlist.length === 0) return [];
  return stock
    .filter(item => wishlist.includes(item.cardId))
    .map(item => item.cardId);
};

export default {
  getFavorabilityLevel,
  getFavorabilityInfo,
  getNextLevelProgress,
  isSpecialty,
  isForbidden,
  calculateSellPrice,
  calculateBuyPrice,
  getPriceLag,
  getAvailableAttributeMerchants,
  checkDarkMerchantAppearance,
  checkTravelerAppearance,
  getTodayCollectors,
  getTodayAppearances,
  generateStock,
  createInitialMerchantData,
  purchaseFromMerchant,
  sellToMerchant,
  cleanupPendingStock,
  purchaseTicket,
  callAttributeMerchant,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  getWishlistMatches,
};
