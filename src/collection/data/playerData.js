/**
 * カードコレクションシステム - プレイヤーデータ構造
 *
 * プレイヤーデータの構造定義と初期化
 */

import { ECONOMY } from './constants';
import { createInitialMarketState } from '../market/marketEngine';

// ========================================
// スターターデッキ定義
// ========================================

/**
 * 新規プレイヤーに付与するスターターデッキのカードIDリスト
 * これらのカードはすべてC（コモン）版として付与される
 *
 * スターターデッキ「紅蓮の咆哮」- 炎ドラゴン入門（40枚）
 * ドラゴンと岩狸のシンプルなシナジーを学べる初心者向け構成
 */
export const STARTER_DECK_CARDS = [
  // ================================================================================
  // モンスター（26枚）
  // ================================================================================

  // 【コスト1】バニラ・サーチ役（6枚）
  'C0000292', 'C0000292', 'C0000292', // 炎のソルジャー x3 ATK500/HP500 【効果なし】
  'C0000163', 'C0000163', 'C0000163', // 岩狸・石ころ丸 x3 ATK400/HP400 ★サーチ

  // 【コスト2】低コストアタッカー（11枚）
  'C0000293', 'C0000293', 'C0000293', // 炎のソルジャーII x3 ATK900/HP1000 【効果なし】
  'C0000025', 'C0000025', 'C0000025', // ブレイズ・ドラゴン x3 ATK1200/HP1200 ★破壊時サーチ
  'C0000305', 'C0000305', 'C0000305', // フレア・リザード x3 ATK500/HP500 【変幻身】
  'C0000164', 'C0000164',             // 岩狸・岩太 x2 ATK800/HP1000 ★自壊時200ダメージ

  // 【コスト3】主力モンスター（6枚）
  'C0000021', 'C0000021',             // フレア・ドラゴン x2 ATK1800/HP1500 ★召喚時300バーン
  'C0000029', 'C0000029',             // クリムゾン・ワイバーン x2 ATK1400/HP1400 ★ドラゴン時ATK+400
  'C0000026', 'C0000026',             // インフェルノ・ドラゴン x2 ATK1600/HP1800 ★攻撃時ATK-300

  // 【コスト4】中堅モンスター（3枚）
  'C0000027', 'C0000027',             // マグマ・ドラゴン x2 ATK2000/HP2400 ★魔法使用時200ダメージ
  'C0000030',                          // バースト・ドラゴン・ナイト x1 ATK1800/HP2000 ★ドラゴン撃破で追加攻撃

  // ================================================================================
  // 魔法（11枚）
  // ================================================================================

  // 【コスト1】軽量魔法（2枚）
  'C0000033', 'C0000033',             // 紅蓮の覚醒 x2 ★ドラゴン覚醒+ATK700

  // 【コスト2】基本魔法（5枚）
  'C0000031', 'C0000031',             // 炎の咆哮 x2 ★ドラゴンATK+500 + 300ダメージ
  'C0000022', 'C0000022', 'C0000022', // 火竜の吐息 x3 ★1000ダメージ【刹那詠唱】

  // 【コスト3】中堅魔法（4枚）
  'C0000034', 'C0000034',             // 炎の嵐 x2 ★ドラゴン数×200ダメージ
  'C0000032', 'C0000032',             // ドラゴンの炎息 x2 ★800+全体300【刹那詠唱】

  // ================================================================================
  // フィールド（3枚）
  // ================================================================================
  'C0000037', 'C0000037',             // ドラゴンの火山 x2 ★ドラゴンATK+400 + 毎ターン300ダメージ
  'C0000187',                          // 狸の熔岩郷 x1 ★毎ターン岩狸蘇生 + 300回復
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

    // 未開封パック数
    unopenedPacks: 0,

    // 所持カード
    collection: Array.from(collectionMap.values()),

    // ユーザー作成デッキ
    userDecks: [],

    // 動的市場状態
    market: createInitialMarketState(),

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
  if (!data || typeof data !== 'object') return { valid: false };
  if (typeof data.gold !== 'number' || data.gold < 0) return { valid: false };
  if (!Array.isArray(data.collection)) return { valid: false };
  if (!Array.isArray(data.userDecks)) return { valid: false };
  if (!data.stats || typeof data.stats !== 'object') return { valid: false };
  // unopenedPacksが存在しない場合は修復が必要
  if (typeof data.unopenedPacks !== 'number') return { valid: false, needsRepair: true };
  return { valid: true };
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
    unopenedPacks: typeof data.unopenedPacks === 'number' ? data.unopenedPacks : 0,
    collection: Array.isArray(data.collection) ? data.collection : [],
    userDecks: Array.isArray(data.userDecks) ? data.userDecks : [],
    market: data.market || createInitialMarketState(),
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
