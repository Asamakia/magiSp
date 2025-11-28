/**
 * カードコレクションシステム - メインエクスポート
 *
 * 対戦システムとは独立したモジュール
 * カードの収集・管理・売買を行う
 */

// ========================================
// データ層
// ========================================

export { storage } from './data/storage';
export {
  ECONOMY,
  RARITIES,
  RARITY_NAMES,
  RARITY_MULTIPLIERS,
  RARITY_COLORS,
  TIERS,
  TIER_THRESHOLDS,
  TIER_MIN_RARITY,
  SLOT_3_4_UC_RATE,
  SLOT_5_RATES,
  STORAGE,
  DECK,
} from './data/constants';
export {
  STARTER_DECK_CARDS,
  createInitialPlayerData,
  validatePlayerData,
  repairPlayerData,
  createUserDeck,
} from './data/playerData';
export { migrate } from './data/migration';

// ========================================
// システム層
// ========================================

export { valueCalculator } from './systems/valueCalculator';
export { raritySystem } from './systems/raritySystem';
export { collectionManager } from './systems/collectionManager';
export { currencyManager } from './systems/currencyManager';
export { packSystem } from './systems/packSystem';
export { shopSystem } from './systems/shopSystem';

// ========================================
// 動的市場システム
// ========================================

export {
  // 市場エンジン
  createInitialMarketState,
  advanceDay,
  getCardMarketPrice,
  calculateMarketModifier,
  isCardAffected,
  // 週間トレンド
  WEEKLY_TRENDS,
  getRandomTrend,
  createWeeklyTrend,
  // ニュース生成
  generateDailyNews,
  // 突発イベント
  generateSuddenEvent,
  SURGE_EVENTS,
  CRASH_EVENTS,
  SPECIAL_EVENTS,
  // 価格履歴
  createInitialPriceHistory,
  recordPriceHistory,
  getCardChartData,
  getAttributeChartData,
  getCategoryChartData,
  getTierChartData,
  getMarketIndexChartData,
  getTrendIcon,
  getTrendColor,
  generateSparklineData,
  HISTORY_LENGTH,
  // 定数
  DAYS_PER_WEEK,
  MAX_MODIFIER_UP,
  MAX_MODIFIER_DOWN,
  SUDDEN_EVENT_CHANCE,
  DIRECTIONS,
  ATTRIBUTES,
  // データ
  CATEGORIES,
  CATEGORY_ATTRIBUTES,
} from './market';

// ========================================
// コンポーネント層
// ========================================

// Phase 3: コレクションUI
export { default as CollectionScreen } from './components/CollectionScreen';
export { default as CardGrid } from './components/CardGrid';
export { default as CardDetail } from './components/CardDetail';

// Phase 4: ショップ・パック
export { default as ShopScreen } from './components/ShopScreen';
export { default as PackOpening } from './components/PackOpening';

// Phase 5: デッキ構築
export { default as DeckBuilder } from './components/DeckBuilder';
export { default as DeckList } from './components/DeckList';

// Phase 6: 価格チャート
export { PriceChart, MiniChart, MarketIndexDisplay, EventMarkers } from './components/PriceChart';
