/**
 * 動的市場システム - 市場エンジン
 *
 * 価格変動の計算を行うコアロジック
 */

import { MAX_MODIFIER_UP, MAX_MODIFIER_DOWN, DAYS_PER_WEEK, SUDDEN_EVENT_CHANCE } from './constants';
import { createWeeklyTrend } from './weeklyTrend';
import { generateDailyNews } from './newsGenerator';

// ========================================
// 市場変動計算
// ========================================

/**
 * カードが効果の対象かどうかを判定
 *
 * @param {Object} card - カードデータ
 * @param {Object} target - 対象条件
 * @param {string} [rarity] - レアリティ
 * @param {string} [tier] - ティア
 * @returns {boolean} 対象かどうか
 */
export const isCardAffected = (card, target, rarity = null, tier = null) => {
  // 全体効果
  if (target.all) {
    return true;
  }

  // 混沌（特殊処理）
  if (target.chaos) {
    return true;
  }

  // 属性チェック
  if (target.attribute && card.attribute !== target.attribute) {
    return false;
  }

  // カテゴリチェック
  if (target.category) {
    const cardCategory = card.category || '';
    if (!cardCategory.includes(target.category) && !cardCategory.includes(`【${target.category}】`)) {
      return false;
    }
  }

  // コストチェック（最大）
  if (target.maxCost !== undefined) {
    const cost = parseInt(card.cost) || 0;
    if (cost > target.maxCost) {
      return false;
    }
  }

  // コストチェック（最小）
  if (target.minCost !== undefined) {
    const cost = parseInt(card.cost) || 0;
    if (cost < target.minCost) {
      return false;
    }
  }

  // レアリティチェック（最小）
  if (target.minRarity && rarity) {
    const rarityOrder = ['C', 'UC', 'R', 'SR', 'UR', 'HR', 'SEC', 'ALT', 'SP', 'GR'];
    const minIndex = rarityOrder.indexOf(target.minRarity);
    const cardIndex = rarityOrder.indexOf(rarity);
    if (cardIndex < minIndex) {
      return false;
    }
  }

  // ティアチェック
  if (target.tiers && tier) {
    if (!target.tiers.includes(tier)) {
      return false;
    }
  }

  // キーワードチェック
  if (target.keyword) {
    const cardKeyword = card.keyword || '';
    if (!cardKeyword.includes(target.keyword)) {
      return false;
    }
  }

  return true;
};

/**
 * 市場変動率を計算
 *
 * @param {Object} card - カードデータ
 * @param {Object} marketState - 市場状態
 * @param {string} [rarity] - レアリティ
 * @param {string} [tier] - ティア
 * @returns {number} 変動率（%）例: 35 = +35%
 */
export const calculateMarketModifier = (card, marketState, rarity = null, tier = null) => {
  let totalModifier = 0;

  // 1. 週間トレンドの効果
  if (marketState.weeklyTrend && marketState.weeklyTrend.effects) {
    for (const effect of marketState.weeklyTrend.effects) {
      if (isCardAffected(card, effect.target, rarity, tier)) {
        // 混沌の場合はランダム変動
        if (effect.target.chaos) {
          totalModifier += Math.floor(Math.random() * 41) - 20; // -20 ~ +20
        } else {
          totalModifier += effect.modifier;
        }
      }
    }
  }

  // 2. デイリーニュースの効果
  if (marketState.dailyNews) {
    if (isCardAffected(card, marketState.dailyNews.target, rarity, tier)) {
      totalModifier += marketState.dailyNews.modifier;
    }
  }

  // 3. 突発イベントの効果
  if (marketState.suddenEvent && marketState.suddenEvent.effects) {
    for (const effect of marketState.suddenEvent.effects) {
      if (isCardAffected(card, effect.target, rarity, tier)) {
        totalModifier += effect.modifier;
      }
    }
  }

  // 4. 上限・下限の適用
  totalModifier = Math.max(MAX_MODIFIER_DOWN, Math.min(MAX_MODIFIER_UP, totalModifier));

  return totalModifier;
};

/**
 * 市場価格を計算
 *
 * @param {number} baseValue - 基礎価値（レアリティ倍率適用後）
 * @param {number} modifier - 変動率（%）
 * @returns {number} 市場価格
 */
export const calculateMarketPrice = (baseValue, modifier) => {
  const multiplier = 1 + (modifier / 100);
  return Math.round(baseValue * multiplier);
};

/**
 * カードの市場価格を取得
 *
 * @param {Object} card - カードデータ
 * @param {number} baseValue - 基礎価値（レアリティ倍率適用後）
 * @param {Object} marketState - 市場状態
 * @param {string} [rarity] - レアリティ
 * @param {string} [tier] - ティア
 * @returns {Object} { price, modifier, breakdown }
 */
export const getCardMarketPrice = (card, baseValue, marketState, rarity = null, tier = null) => {
  const modifier = calculateMarketModifier(card, marketState, rarity, tier);
  const price = calculateMarketPrice(baseValue, modifier);

  // 内訳を生成
  const breakdown = [];

  if (marketState.weeklyTrend) {
    for (const effect of marketState.weeklyTrend.effects) {
      if (isCardAffected(card, effect.target, rarity, tier)) {
        breakdown.push({
          source: `週間: ${marketState.weeklyTrend.name}`,
          modifier: effect.target.chaos
            ? '±ランダム'
            : `${effect.modifier > 0 ? '+' : ''}${effect.modifier}%`,
        });
      }
    }
  }

  if (marketState.dailyNews && isCardAffected(card, marketState.dailyNews.target, rarity, tier)) {
    breakdown.push({
      source: 'デイリー',
      modifier: `${marketState.dailyNews.modifier > 0 ? '+' : ''}${marketState.dailyNews.modifier}%`,
    });
  }

  if (marketState.suddenEvent) {
    for (const effect of marketState.suddenEvent.effects) {
      if (isCardAffected(card, effect.target, rarity, tier)) {
        breakdown.push({
          source: `突発: ${marketState.suddenEvent.name}`,
          modifier: `${effect.modifier > 0 ? '+' : ''}${effect.modifier}%`,
        });
      }
    }
  }

  return {
    price,
    modifier,
    breakdown,
  };
};

// ========================================
// 市場状態管理
// ========================================

/**
 * 初期市場状態を作成
 *
 * @returns {Object} 初期市場状態
 */
export const createInitialMarketState = () => {
  const weeklyTrend = createWeeklyTrend(0);
  const dailyNews = generateDailyNews();

  return {
    currentDay: 0,
    weeklyTrend,
    dailyNews,
    suddenEvent: null,
    recentNews: [dailyNews],
    priceHistory: {
      cards: {},
      attributes: {},
      marketIndex: [],
      events: [],
    },
  };
};

/**
 * 1日進める（対戦終了時に呼び出し）
 *
 * @param {Object} marketState - 現在の市場状態
 * @returns {Object} 新しい市場状態
 */
export const advanceDay = (marketState) => {
  const newDay = marketState.currentDay + 1;
  const newState = { ...marketState, currentDay: newDay };

  // 週間トレンドの更新チェック（7戦ごと）
  const daysSinceTrendStart = newDay - marketState.weeklyTrend.startDay;
  if (daysSinceTrendStart >= DAYS_PER_WEEK) {
    newState.weeklyTrend = createWeeklyTrend(newDay, marketState.weeklyTrend.id);
  }

  // デイリーニュースの更新
  const recentNews = marketState.recentNews || [];
  const newNews = generateDailyNews(recentNews.slice(-10));
  newState.dailyNews = newNews;

  // 直近ニュース履歴を更新
  newState.recentNews = [...recentNews.slice(-29), newNews];

  // 突発イベントの判定
  if (Math.random() < SUDDEN_EVENT_CHANCE) {
    // TODO: 突発イベントの実装（Phase M-6）
    newState.suddenEvent = null;
  } else {
    newState.suddenEvent = null;
  }

  return newState;
};

// ========================================
// エクスポート
// ========================================

export default {
  isCardAffected,
  calculateMarketModifier,
  calculateMarketPrice,
  getCardMarketPrice,
  createInitialMarketState,
  advanceDay,
};
