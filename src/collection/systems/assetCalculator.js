/**
 * カードコレクションシステム - 資産計算エンジン
 *
 * プレイヤーの総資産を計算・記録・分析
 * - 所持金（G）
 * - カード価値（基礎価格ベース）
 * - カード価値（市場価格ベース）
 * - 将来の拡張用資産
 */

import { RARITY_MULTIPLIERS } from '../data/constants';
import { calculateBaseValue } from './valueCalculator';
import { getCardMarketPrice } from '../market/marketEngine';

// ========================================
// 定数
// ========================================

/**
 * 資産履歴の保持戦数
 */
export const ASSET_HISTORY_LENGTH = 30;

// ========================================
// 資産計算
// ========================================

/**
 * 所持カードの基礎価格合計を計算
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードマスターデータ
 * @returns {number} 基礎価格合計
 */
export const calculateCardValueBase = (playerData, allCards) => {
  if (!playerData?.collection || !allCards) {
    return 0;
  }

  // カードIDからカードデータへのマップを作成
  const cardMap = new Map();
  for (const card of allCards) {
    if (card.id) {
      cardMap.set(card.id, card);
    }
  }

  let totalValue = 0;

  for (const entry of playerData.collection) {
    const card = cardMap.get(entry.cardId);
    if (!card) continue;

    // 基礎価値を計算
    const baseValue = calculateBaseValue(card);

    // レアリティ倍率を適用
    const multiplier = RARITY_MULTIPLIERS[entry.rarity] || 1.0;
    const cardValue = Math.round(baseValue * multiplier);

    // 所持枚数分を加算
    totalValue += cardValue * (entry.quantity || 1);
  }

  return totalValue;
};

/**
 * 所持カードの市場価格合計を計算
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードマスターデータ
 * @param {Object} marketState - 市場状態
 * @returns {number} 市場価格合計
 */
export const calculateCardValueMarket = (playerData, allCards, marketState) => {
  if (!playerData?.collection || !allCards) {
    return 0;
  }

  // カードIDからカードデータへのマップを作成
  const cardMap = new Map();
  for (const card of allCards) {
    if (card.id) {
      cardMap.set(card.id, card);
    }
  }

  // カードIDからティアへのマップ
  const tierMap = new Map();
  for (const card of allCards) {
    if (card.id) {
      const baseValue = calculateBaseValue(card);
      const tier = baseValue >= 700 ? 'S' :
                   baseValue >= 500 ? 'A' :
                   baseValue >= 350 ? 'B' :
                   baseValue >= 200 ? 'C' : 'D';
      tierMap.set(card.id, tier);
    }
  }

  let totalValue = 0;

  for (const entry of playerData.collection) {
    const card = cardMap.get(entry.cardId);
    if (!card) continue;

    // 基礎価値を計算
    const baseValue = calculateBaseValue(card);

    // レアリティ倍率を適用
    const multiplier = RARITY_MULTIPLIERS[entry.rarity] || 1.0;
    const baseWithRarity = Math.round(baseValue * multiplier);

    // 市場価格を計算
    const tier = tierMap.get(entry.cardId) || 'D';
    const { price } = getCardMarketPrice(
      card,
      baseWithRarity,
      marketState,
      entry.rarity,
      tier
    );

    // 所持枚数分を加算
    totalValue += price * (entry.quantity || 1);
  }

  return totalValue;
};

/**
 * 総資産を計算
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードマスターデータ
 * @param {Object} marketState - 市場状態（オプション、市場価格計算用）
 * @returns {Object} { gold, cardValueBase, cardValueMarket, totalBase, totalMarket }
 */
export const calculateTotalAssets = (playerData, allCards, marketState) => {
  const gold = playerData?.gold || 0;
  const cardValueBase = calculateCardValueBase(playerData, allCards);
  const cardValueMarket = marketState
    ? calculateCardValueMarket(playerData, allCards, marketState)
    : cardValueBase; // 市場状態がない場合は基礎価格を使用

  return {
    gold,
    cardValueBase,
    cardValueMarket,
    totalBase: gold + cardValueBase,
    totalMarket: gold + cardValueMarket,
  };
};

// ========================================
// 資産履歴管理
// ========================================

/**
 * 資産履歴の初期状態を作成
 * @returns {Object} 初期資産履歴
 */
export const createInitialAssetHistory = () => {
  return {
    history: [],
  };
};

/**
 * 資産スナップショットを記録
 * @param {Object} playerData - プレイヤーデータ
 * @param {Object[]} allCards - 全カードマスターデータ
 * @param {Object} marketState - 市場状態
 * @param {number} day - ゲーム内日数
 * @returns {Object} 更新されたプレイヤーデータ
 */
export const recordAssetSnapshot = (playerData, allCards, marketState, day) => {
  const assets = calculateTotalAssets(playerData, allCards, marketState);

  const snapshot = {
    day,
    gold: assets.gold,
    cardValueBase: assets.cardValueBase,
    cardValueMarket: assets.cardValueMarket,
    totalBase: assets.totalBase,
    totalMarket: assets.totalMarket,
    timestamp: Date.now(),
  };

  // 既存の履歴を取得（なければ初期化）
  const currentHistory = playerData.assetHistory?.history || [];

  // 新しい履歴を追加（最大ASSET_HISTORY_LENGTH件を保持）
  const newHistory = [...currentHistory, snapshot].slice(-ASSET_HISTORY_LENGTH);

  return {
    ...playerData,
    assetHistory: {
      ...playerData.assetHistory,
      history: newHistory,
    },
  };
};

// ========================================
// チャートデータ生成
// ========================================

/**
 * 資産履歴からチャートデータを生成
 * @param {Object} assetHistory - 資産履歴
 * @param {string} mode - 表示モード
 *   'totalMarket' | 'totalBase' | 'gold' | 'cardMarket' | 'cardBase'
 * @returns {Object} チャートデータ
 */
export const getAssetChartData = (assetHistory, mode = 'totalMarket') => {
  const history = assetHistory?.history || [];

  if (history.length === 0) {
    return {
      prices: [],
      days: [],
      currentPrice: 0,
      highPrice: 0,
      lowPrice: 0,
      changePercent: 0,
      changeAmount: 0,
    };
  }

  // モードに応じた値を抽出
  const getValue = (snapshot) => {
    switch (mode) {
      case 'totalMarket':
        return snapshot.totalMarket;
      case 'totalBase':
        return snapshot.totalBase;
      case 'gold':
        return snapshot.gold;
      case 'cardMarket':
        return snapshot.cardValueMarket;
      case 'cardBase':
        return snapshot.cardValueBase;
      default:
        return snapshot.totalMarket;
    }
  };

  const prices = history.map(getValue);
  const days = history.map((s) => s.day);

  const currentPrice = prices[prices.length - 1];
  const highPrice = Math.max(...prices);
  const lowPrice = Math.min(...prices);

  // 変動率計算
  let changePercent = 0;
  let changeAmount = 0;
  if (prices.length >= 2) {
    const startPrice = prices[0];
    if (startPrice > 0) {
      changeAmount = currentPrice - startPrice;
      changePercent = Math.round((changeAmount / startPrice) * 1000) / 10;
    }
  }

  return {
    prices,
    days,
    currentPrice,
    highPrice,
    lowPrice,
    changePercent,
    changeAmount,
  };
};

/**
 * 資産内訳データを生成
 * @param {Object} assetHistory - 資産履歴
 * @returns {Object} 内訳データ（現在の状態）
 */
export const getAssetBreakdown = (assetHistory) => {
  const history = assetHistory?.history || [];

  if (history.length === 0) {
    return {
      gold: 0,
      cardValueBase: 0,
      cardValueMarket: 0,
      totalBase: 0,
      totalMarket: 0,
      goldPercent: 0,
      cardPercent: 0,
    };
  }

  const latest = history[history.length - 1];
  const totalMarket = latest.totalMarket || 0;

  return {
    gold: latest.gold,
    cardValueBase: latest.cardValueBase,
    cardValueMarket: latest.cardValueMarket,
    totalBase: latest.totalBase,
    totalMarket: latest.totalMarket,
    goldPercent: totalMarket > 0 ? Math.round((latest.gold / totalMarket) * 100) : 0,
    cardPercent: totalMarket > 0 ? Math.round((latest.cardValueMarket / totalMarket) * 100) : 0,
  };
};

/**
 * 表示モードのラベルを取得
 * @param {string} mode - 表示モード
 * @returns {string} ラベル
 */
export const getAssetModeLabel = (mode) => {
  const labels = {
    totalMarket: '総資産（市場）',
    totalBase: '総資産（基礎）',
    gold: '所持金',
    cardMarket: 'カード価値（市場）',
    cardBase: 'カード価値（基礎）',
  };
  return labels[mode] || mode;
};

// ========================================
// エクスポート
// ========================================

export const assetCalculator = {
  calculateCardValueBase,
  calculateCardValueMarket,
  calculateTotalAssets,
  createInitialAssetHistory,
  recordAssetSnapshot,
  getAssetChartData,
  getAssetBreakdown,
  getAssetModeLabel,
  ASSET_HISTORY_LENGTH,
};

export default assetCalculator;
