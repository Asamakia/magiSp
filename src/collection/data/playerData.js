/**
 * カードコレクションシステム - プレイヤーデータ構造
 *
 * プレイヤーデータの構造定義と初期化
 */

import { ECONOMY } from './constants';

// ========================================
// スターターデッキ定義
// ========================================

/**
 * 新規プレイヤーに付与するスターターデッキのカードIDリスト
 * これらのカードはすべてC（コモン）版として付与される
 *
 * TODO: 実際のスターターデッキ内容を決定する
 * 現在は炎デッキをベースとした初心者向けデッキ
 */
export const STARTER_DECK_CARDS = [
  // モンスター（24枚）
  'C0000025', 'C0000025', 'C0000025', // ブレイズ・ドラゴン x3
  'C0000369', 'C0000369', 'C0000369', // 炎翼の鳥民・イグニス x3
  'C0000021', 'C0000021', 'C0000021', // フレア・ドラゴン x3
  'C0000026', 'C0000026', 'C0000026', // インフェルノ・ドラゴン x3
  'C0000029', 'C0000029', 'C0000029', // クリムゾン・ワイバーン x3
  'C0000027', 'C0000027',             // マグマ・ドラゴン x2
  'C0000030', 'C0000030',             // バースト・ドラゴン・ナイト x2
  'C0000312',                         // フレア・ワイバーン x1
  'C0000023', 'C0000023',             // レッドバーストドラゴン x2

  // 魔法（14枚）
  'C0000033', 'C0000033',             // 紅蓮の覚醒 x2
  'C0000022', 'C0000022', 'C0000022', // 火竜の吐息 x3
  'C0000031', 'C0000031', 'C0000031', // 炎の咆哮 x3
  'C0000032', 'C0000032',             // ドラゴンの炎息 x2
  'C0000034', 'C0000034',             // 炎の嵐 x2
  'C0000036', 'C0000036',             // 燃え尽きる業火 x2

  // フィールド（2枚）
  'C0000037', 'C0000037',             // ドラゴンの火山 x2
];

// ========================================
// データ構造
// ========================================

/**
 * 初期プレイヤーデータを作成
 * @param {string[]} [starterCards] - スターターデッキのカードIDリスト（省略時はデフォルト）
 * @returns {Object} 初期プレイヤーデータ
 */
export const createInitialPlayerData = (starterCards = STARTER_DECK_CARDS) => {
  // スターターカードをコレクションに変換（重複をまとめる）
  const collectionMap = new Map();
  for (const cardId of starterCards) {
    const key = `${cardId}_C`; // 全てC版
    if (collectionMap.has(key)) {
      collectionMap.get(key).quantity += 1;
    } else {
      collectionMap.set(key, { cardId, rarity: 'C', quantity: 1 });
    }
  }

  return {
    // 通貨
    gold: ECONOMY.INITIAL_GOLD,

    // 所持カード
    collection: Array.from(collectionMap.values()),

    // ユーザー作成デッキ
    userDecks: [],

    // 統計
    stats: {
      totalBattles: 0,
      wins: 0,
      losses: 0,
      packsOpened: 0,
      totalGoldEarned: 0,
      totalGoldSpent: 0,
    },

    // メタデータ
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// ========================================
// バリデーション
// ========================================

/**
 * プレイヤーデータの整合性を検証
 * @param {Object} data - プレイヤーデータ
 * @returns {boolean} 有効かどうか
 */
export const validatePlayerData = (data) => {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.gold !== 'number' || data.gold < 0) return false;
  if (!Array.isArray(data.collection)) return false;
  if (!Array.isArray(data.userDecks)) return false;
  if (!data.stats || typeof data.stats !== 'object') return false;
  return true;
};

/**
 * プレイヤーデータを修復（不足フィールドを補完）
 * @param {Object} data - プレイヤーデータ
 * @returns {Object} 修復されたデータ
 */
export const repairPlayerData = (data) => {
  const defaults = createInitialPlayerData([]);
  return {
    gold: typeof data.gold === 'number' ? data.gold : defaults.gold,
    collection: Array.isArray(data.collection) ? data.collection : [],
    userDecks: Array.isArray(data.userDecks) ? data.userDecks : [],
    stats: {
      ...defaults.stats,
      ...(data.stats || {}),
    },
    createdAt: data.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
};

// ========================================
// ユーザーデッキ操作
// ========================================

/**
 * 新しいユーザーデッキを作成
 * @param {string} name - デッキ名
 * @param {Array<{cardId: string, rarity: string}>} cards - カードリスト（40枚）
 * @returns {Object} デッキオブジェクト
 */
export const createUserDeck = (name, cards = []) => {
  return {
    id: `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    cards,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

export default {
  STARTER_DECK_CARDS,
  createInitialPlayerData,
  validatePlayerData,
  repairPlayerData,
  createUserDeck,
};
