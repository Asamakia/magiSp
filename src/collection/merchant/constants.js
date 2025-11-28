/**
 * 商人システム - 定数定義
 */

// ========================================
// 商人タイプ
// ========================================

export const MERCHANT_TYPES = {
  GENERAL: 'general',       // 一般商人（マルクス）
  ATTRIBUTE: 'attribute',   // 属性商人（6人）
  COLLECTOR: 'collector',   // コレクター（6人）
  DARK: 'dark',             // 闇商人（名無し）
  TRAVELER: 'traveler',     // 旅商人（ゼルヴァン）
};

// ========================================
// 好感度システム
// ========================================

export const FAVORABILITY_LEVELS = {
  1: { required: 0, sellDiscount: 0, buyBonus: 0 },
  2: { required: 5, sellDiscount: 0.05, buyBonus: 0 },
  3: { required: 15, sellDiscount: 0.10, buyBonus: 0.05 },
  4: { required: 30, sellDiscount: 0.15, buyBonus: 0.10, extraSlots: 2 },
  5: { required: 50, sellDiscount: 0.20, buyBonus: 0.15, rumorBonus: 0.10 },
};

// ========================================
// 価格倍率
// ========================================

// 販売価格（プレイヤーが買う）
export const SELL_PRICE_MULTIPLIERS = {
  [MERCHANT_TYPES.GENERAL]: { base: 1.00, specialty: 1.00 },
  [MERCHANT_TYPES.ATTRIBUTE]: { base: 1.05, specialty: 1.00 },
  [MERCHANT_TYPES.COLLECTOR]: { base: 1.05, specialty: 0.95 },
  [MERCHANT_TYPES.DARK]: { base: 1.30, forbidden: 1.50 },
  [MERCHANT_TYPES.TRAVELER]: { min: 0.50, max: 0.80 },
};

// 買取価格（プレイヤーが売る）
export const BUY_PRICE_MULTIPLIERS = {
  [MERCHANT_TYPES.GENERAL]: { base: 0.70, specialty: 0.70 },
  [MERCHANT_TYPES.ATTRIBUTE]: { base: 0.75, specialty: 0.85 },
  [MERCHANT_TYPES.COLLECTOR]: { base: 0.70, specialty: 1.00 },
  [MERCHANT_TYPES.DARK]: { base: 0.60, forbidden: 0.80 },
  [MERCHANT_TYPES.TRAVELER]: null, // 買取なし
};

// ========================================
// 相場認識ラグ（日数）
// ========================================

export const PRICE_LAG = {
  [MERCHANT_TYPES.GENERAL]: 0,
  [MERCHANT_TYPES.ATTRIBUTE]: 2,
  [MERCHANT_TYPES.COLLECTOR]: { specialty: 0, other: 5 },
  [MERCHANT_TYPES.DARK]: 1,
  [MERCHANT_TYPES.TRAVELER]: 3,
};

// ========================================
// 品揃えレアリティ設定
// ========================================

export const STOCK_RARITY = {
  [MERCHANT_TYPES.GENERAL]: {
    count: 10,
    rates: { C: 0.50, UC: 0.40, R: 0.10 },
    guaranteed: null,
  },
  [MERCHANT_TYPES.ATTRIBUTE]: {
    count: 5,
    rates: { UC: 0.40, R: 0.40, SR: 0.15, UR: 0.05 },
    guaranteed: { minRarity: 'R', count: 1 },
  },
  [MERCHANT_TYPES.COLLECTOR]: {
    count: 6,
    rates: { C: 0.25, UC: 0.30, R: 0.25, SR: 0.12, UR: 0.06, HR: 0.02 },
    guaranteed: null,
  },
  [MERCHANT_TYPES.DARK]: {
    count: 4,
    rates: { SR: 0.40, UR: 0.35, HR: 0.15, SEC: 0.04, ALT: 0.04, GR: 0.02 },
    guaranteed: { minRarity: 'SR', count: 4, minUR: 1 },
  },
  [MERCHANT_TYPES.TRAVELER]: {
    count: 5,
    rates: { C: 0.20, UC: 0.25, R: 0.30, SR: 0.18, UR: 0.05, HR: 0.02 },
    guaranteed: { minRarity: 'R', count: 1, bargain: 1 },
  },
};

// ========================================
// 出現確率
// ========================================

export const APPEARANCE_CHANCE = {
  dark: 0.10,         // 闇商人基本確率
  darkWithForbidden: 0.15, // 禁忌3枚以上所持時
  traveler: 0.05,     // 旅商人基本確率
  travelerRich: 0.10, // 総資産10万G以上時
  collectorPerDay: { min: 1, max: 2 }, // コレクター日替わり出現数
};

// ========================================
// 在庫システム
// ========================================

export const INVENTORY = {
  maxPerMerchant: 20,
  maxAge: 7,  // 在庫最大保持日数
  stockChance: {
    [MERCHANT_TYPES.GENERAL]: 0.80,
    [MERCHANT_TYPES.ATTRIBUTE]: 0.60,
    [MERCHANT_TYPES.COLLECTOR]: 1.00, // 専門のみ
    [MERCHANT_TYPES.DARK]: 0.30,
    [MERCHANT_TYPES.TRAVELER]: 0.50,
  },
  appearDelay: {
    [MERCHANT_TYPES.GENERAL]: 1,
    [MERCHANT_TYPES.ATTRIBUTE]: { min: 1, max: 2 },
    [MERCHANT_TYPES.COLLECTOR]: 1,
  },
};

// ========================================
// 呼び出しチケット
// ========================================

export const TICKETS = {
  attribute: { price: 500, name: '属性商人呼び出し券' },
  dark: { price: 2000, name: '闇商人の招待状' },
  traveler: { price: 1500, name: '旅商人の風笛' },
};

// ========================================
// 曜日対応（0=日曜, 1=月曜, ...）
// ========================================

export const WEEKDAY_MERCHANTS = {
  0: 'all',     // 日曜: 全員
  1: 'パスト神父',  // 月曜: 光
  2: 'ボルガン',    // 火曜: 炎
  3: 'クラディア',  // 水曜: 水
  4: 'ゴブス',      // 木曜: 原始
  5: 'ドクトル・ギア', // 金曜: 未来
  6: 'ダスカ',      // 土曜: 闇
};

// ========================================
// コレクター確定出現条件
// ========================================

export const COLLECTOR_APPEARANCE_THRESHOLD = 5; // 専門カテゴリ5枚売却で確定出現
