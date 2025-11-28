/**
 * 動的市場システム - 価格履歴
 *
 * 過去の価格変動を記録し、チャート表示用のデータを提供
 */

import { ATTRIBUTES } from './constants';
import { CATEGORIES } from './data/categories';

// ========================================
// 定数
// ========================================

/** 履歴保持数（30戦分） */
export const HISTORY_LENGTH = 30;

/** ティアリスト */
const TIERS = ['S', 'A', 'B', 'C', 'D'];

// ========================================
// 初期化
// ========================================

/**
 * 価格履歴の初期状態を作成
 *
 * @returns {Object} 価格履歴オブジェクト
 */
export const createInitialPriceHistory = () => {
  return {
    // 個別カード履歴（カードID → 基礎価値配列）
    cards: {},

    // 属性別平均履歴
    attributes: Object.fromEntries(ATTRIBUTES.map(a => [a, []])),

    // カテゴリ別平均履歴
    categories: Object.fromEntries(CATEGORIES.map(c => [c, []])),

    // ティア別平均履歴
    tiers: Object.fromEntries(TIERS.map(t => [t, []])),

    // 全体指数（MSI: Magic Spirit Index）
    marketIndex: [],

    // イベント履歴（マーカー用）
    events: [],
  };
};

// ========================================
// 履歴記録
// ========================================

/**
 * 価格履歴を記録
 *
 * @param {Object} priceHistory - 現在の価格履歴
 * @param {Object} marketState - 市場状態
 * @param {Object[]} allCards - 全カードデータ
 * @param {Function} getBaseValue - カードの基礎価値を取得する関数
 * @param {Function} getTier - カードのティアを取得する関数
 * @returns {Object} 更新された価格履歴
 */
export const recordPriceHistory = (priceHistory, marketState, allCards, getBaseValue, getTier) => {
  const newHistory = JSON.parse(JSON.stringify(priceHistory));
  const currentDay = marketState.currentDay;

  // 属性別・カテゴリ別・ティア別の集計用
  const attributeTotals = Object.fromEntries(ATTRIBUTES.map(a => [a, { sum: 0, count: 0 }]));
  const categoryTotals = Object.fromEntries(CATEGORIES.map(c => [c, { sum: 0, count: 0 }]));
  const tierTotals = Object.fromEntries(TIERS.map(t => [t, { sum: 0, count: 0 }]));
  let marketTotal = 0;
  let marketCount = 0;

  // 各カードの価格を記録
  for (const card of allCards) {
    const baseValue = getBaseValue ? getBaseValue(card) : (card.baseValue || 100);
    const tier = getTier ? getTier(card) : 'B';
    const attribute = card.attribute || 'なし';
    const category = card.category && typeof card.category === 'string'
      ? card.category.replace(/【|】/g, '').split('】')[0]
      : null;

    // 個別カード履歴
    if (!newHistory.cards[card.id]) {
      newHistory.cards[card.id] = [];
    }
    newHistory.cards[card.id].push(baseValue);
    if (newHistory.cards[card.id].length > HISTORY_LENGTH) {
      newHistory.cards[card.id].shift();
    }

    // 属性別集計
    if (attributeTotals[attribute]) {
      attributeTotals[attribute].sum += baseValue;
      attributeTotals[attribute].count++;
    }

    // カテゴリ別集計
    if (category && categoryTotals[category]) {
      categoryTotals[category].sum += baseValue;
      categoryTotals[category].count++;
    }

    // ティア別集計
    if (tierTotals[tier]) {
      tierTotals[tier].sum += baseValue;
      tierTotals[tier].count++;
    }

    // 全体集計
    marketTotal += baseValue;
    marketCount++;
  }

  // 属性別平均を記録
  for (const attr of ATTRIBUTES) {
    const avg = attributeTotals[attr].count > 0
      ? Math.round(attributeTotals[attr].sum / attributeTotals[attr].count)
      : 0;
    newHistory.attributes[attr].push(avg);
    if (newHistory.attributes[attr].length > HISTORY_LENGTH) {
      newHistory.attributes[attr].shift();
    }
  }

  // カテゴリ別平均を記録
  for (const cat of CATEGORIES) {
    const avg = categoryTotals[cat].count > 0
      ? Math.round(categoryTotals[cat].sum / categoryTotals[cat].count)
      : 0;
    newHistory.categories[cat].push(avg);
    if (newHistory.categories[cat].length > HISTORY_LENGTH) {
      newHistory.categories[cat].shift();
    }
  }

  // ティア別平均を記録
  for (const tier of TIERS) {
    const avg = tierTotals[tier].count > 0
      ? Math.round(tierTotals[tier].sum / tierTotals[tier].count)
      : 0;
    newHistory.tiers[tier].push(avg);
    if (newHistory.tiers[tier].length > HISTORY_LENGTH) {
      newHistory.tiers[tier].shift();
    }
  }

  // 全体指数（MSI）を記録
  const marketIndex = marketCount > 0 ? Math.round(marketTotal / marketCount * 100) : 10000;
  newHistory.marketIndex.push(marketIndex);
  if (newHistory.marketIndex.length > HISTORY_LENGTH) {
    newHistory.marketIndex.shift();
  }

  // イベント履歴を記録
  if (marketState.dailyNews) {
    newHistory.events.push({
      day: currentDay,
      type: 'daily',
      text: marketState.dailyNews.text.substring(0, 30) + '...',
    });
  }
  if (marketState.suddenEvent) {
    newHistory.events.push({
      day: currentDay,
      type: 'sudden',
      text: marketState.suddenEvent.name,
    });
  }

  // イベント履歴の長さを制限
  if (newHistory.events.length > HISTORY_LENGTH * 2) {
    newHistory.events = newHistory.events.slice(-HISTORY_LENGTH * 2);
  }

  return newHistory;
};

// ========================================
// チャートデータ取得
// ========================================

/**
 * 個別カードのチャートデータを取得
 *
 * @param {Object} priceHistory - 価格履歴
 * @param {string} cardId - カードID
 * @param {number} rarityMultiplier - レアリティ倍率
 * @returns {Object} チャートデータ
 */
export const getCardChartData = (priceHistory, cardId, rarityMultiplier = 1) => {
  const history = priceHistory.cards[cardId] || [];
  const prices = history.map(baseValue => Math.round(baseValue * rarityMultiplier));

  if (prices.length === 0) {
    return {
      prices: [],
      currentPrice: 0,
      highPrice: 0,
      lowPrice: 0,
      changePercent: 0,
      events: [],
    };
  }

  const currentPrice = prices[prices.length - 1];
  const highPrice = Math.max(...prices);
  const lowPrice = Math.min(...prices);
  const startPrice = prices[0];
  const changePercent = startPrice > 0 ? Math.round((currentPrice - startPrice) / startPrice * 100) : 0;

  // 関連イベントを取得
  const recentDay = priceHistory.events.length > 0
    ? Math.max(...priceHistory.events.map(e => e.day))
    : 0;
  const events = priceHistory.events.filter(e => e.day >= recentDay - HISTORY_LENGTH);

  return {
    prices,
    currentPrice,
    highPrice,
    lowPrice,
    changePercent,
    events,
  };
};

/**
 * 属性別チャートデータを取得
 *
 * @param {Object} priceHistory - 価格履歴
 * @param {string} attribute - 属性名
 * @returns {Object} チャートデータ
 */
export const getAttributeChartData = (priceHistory, attribute) => {
  const prices = priceHistory.attributes[attribute] || [];
  return generateChartStats(prices);
};

/**
 * カテゴリ別チャートデータを取得
 *
 * @param {Object} priceHistory - 価格履歴
 * @param {string} category - カテゴリ名
 * @returns {Object} チャートデータ
 */
export const getCategoryChartData = (priceHistory, category) => {
  const prices = priceHistory.categories[category] || [];
  return generateChartStats(prices);
};

/**
 * ティア別チャートデータを取得
 *
 * @param {Object} priceHistory - 価格履歴
 * @param {string} tier - ティア
 * @returns {Object} チャートデータ
 */
export const getTierChartData = (priceHistory, tier) => {
  const prices = priceHistory.tiers[tier] || [];
  return generateChartStats(prices);
};

/**
 * 全体指数（MSI）チャートデータを取得
 *
 * @param {Object} priceHistory - 価格履歴
 * @returns {Object} チャートデータ
 */
export const getMarketIndexChartData = (priceHistory) => {
  const prices = priceHistory.marketIndex || [];
  const stats = generateChartStats(prices);

  // 市場状態の判定
  let marketCondition = '安定';
  if (stats.changePercent > 10) marketCondition = '好況';
  else if (stats.changePercent > 5) marketCondition = 'やや好況';
  else if (stats.changePercent < -10) marketCondition = '不況';
  else if (stats.changePercent < -5) marketCondition = 'やや不況';

  return {
    ...stats,
    marketCondition,
    events: priceHistory.events || [],
  };
};

/**
 * チャート統計を生成
 */
const generateChartStats = (prices) => {
  if (prices.length === 0) {
    return {
      prices: [],
      currentPrice: 0,
      highPrice: 0,
      lowPrice: 0,
      changePercent: 0,
    };
  }

  const currentPrice = prices[prices.length - 1];
  const highPrice = Math.max(...prices);
  const lowPrice = Math.min(...prices);
  const startPrice = prices[0];
  const changePercent = startPrice > 0 ? Math.round((currentPrice - startPrice) / startPrice * 100) : 0;

  return {
    prices,
    currentPrice,
    highPrice,
    lowPrice,
    changePercent,
  };
};

// ========================================
// ミニチャート用（簡易表示）
// ========================================

/**
 * ミニチャート用のトレンドアイコンを取得
 *
 * @param {number} changePercent - 変動率
 * @returns {string} アイコン
 */
export const getTrendIcon = (changePercent) => {
  if (changePercent > 20) return '📈';
  if (changePercent > 5) return '↗️';
  if (changePercent > -5) return '➡️';
  if (changePercent > -20) return '↘️';
  return '📉';
};

/**
 * ミニチャート用のトレンド色を取得
 *
 * @param {number} changePercent - 変動率
 * @returns {string} 色コード
 */
export const getTrendColor = (changePercent) => {
  if (changePercent > 10) return '#4CAF50'; // 緑
  if (changePercent > 0) return '#8BC34A'; // 薄緑
  if (changePercent > -10) return '#FFC107'; // 黄色
  if (changePercent > -20) return '#FF9800'; // オレンジ
  return '#F44336'; // 赤
};

/**
 * スパークラインデータを生成（最近7点のみ）
 *
 * @param {number[]} prices - 価格配列
 * @returns {number[]} 正規化された値（0-100）
 */
export const generateSparklineData = (prices) => {
  const recent = prices.slice(-7);
  if (recent.length === 0) return [];

  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const range = max - min || 1;

  return recent.map(p => Math.round((p - min) / range * 100));
};

// ========================================
// エクスポート
// ========================================

export default {
  HISTORY_LENGTH,
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
};
