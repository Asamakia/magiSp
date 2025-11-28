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
