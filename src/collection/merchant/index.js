/**
 * 商人システム - メインエクスポート
 */

// 定数
export {
  MERCHANT_TYPES,
  FAVORABILITY_LEVELS,
  SELL_PRICE_MULTIPLIERS,
  BUY_PRICE_MULTIPLIERS,
  PRICE_LAG,
  STOCK_RARITY,
  APPEARANCE_CHANCE,
  INVENTORY,
  TICKETS,
  WEEKDAY_MERCHANTS,
  COLLECTOR_APPEARANCE_THRESHOLD,
} from './constants';

// 商人データ
export {
  MERCHANTS,
  MERCHANT_IDS,
  getMerchantsByType,
  ATTRIBUTE_MERCHANTS,
  COLLECTORS,
} from './merchantData';

// システムロジック
export {
  // 好感度
  getFavorabilityLevel,
  getFavorabilityInfo,
  getNextLevelProgress,
  // 価格計算
  isSpecialty,
  isForbidden,
  calculateSellPrice,
  calculateBuyPrice,
  getPriceLag,
  // 出現判定
  getAvailableAttributeMerchants,
  checkDarkMerchantAppearance,
  checkTravelerAppearance,
  getTodayCollectors,
  getTodayAppearances,
  // 品揃え生成
  generateStock,
  // データ初期化
  createInitialMerchantData,
  // 取引処理
  purchaseFromMerchant,
  sellToMerchant,
  // 在庫管理
  cleanupPendingStock,
  // チケット操作
  purchaseTicket,
  callAttributeMerchant,
} from './merchantSystem';

export { default as merchantSystem } from './merchantSystem';
