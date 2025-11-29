/**
 * 動的市場システム - 市場エンジン
 *
 * 価格変動の計算を行うコアロジック
 */

import {
  MAX_MODIFIER_UP,
  MAX_MODIFIER_DOWN,
  DAYS_PER_WEEK,
  SUDDEN_EVENT_CHANCE,
  SPOTLIGHT_EVENT_CHANCE,
  SPOTLIGHT_MULTIPLIER,
  PERSISTENT_ACCUMULATION_RATE,
  REGRESSION_THRESHOLDS,
  ATTRIBUTES,
} from './constants';
import { createWeeklyTrend } from './weeklyTrend';
import { generateDailyNews } from './newsGenerator';
import { generateSuddenEvent, generateSpotlightEvent } from './suddenEvents';
import { createInitialPriceHistory } from './priceHistory';
import { CATEGORIES } from './data/categories';

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
    // card.categoryは文字列または配列の可能性がある
    const cardCategory = Array.isArray(card.category)
      ? card.category.join(' ')
      : (card.category || '');
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

  // レアリティチェック（最大）
  if (target.maxRarity && rarity) {
    const rarityOrder = ['C', 'UC', 'R', 'SR', 'UR', 'HR', 'SEC', 'ALT', 'SP', 'GR'];
    const maxIndex = rarityOrder.indexOf(target.maxRarity);
    const cardIndex = rarityOrder.indexOf(rarity);
    if (cardIndex > maxIndex) {
      return false;
    }
  }

  // カードタイプチェック
  if (target.type && card.type !== target.type) {
    return false;
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
 * カードに適用される永続変動を計算
 *
 * @param {Object} card - カードデータ
 * @param {Object} persistentModifiers - 永続変動データ
 * @returns {number} 永続変動率（%）
 */
export const calculatePersistentModifier = (card, persistentModifiers) => {
  if (!persistentModifiers) return 0;

  let totalPersistent = 0;

  // 属性の永続変動
  const rawAttribute = card.attribute?.trim?.() || card.attribute;
  const attribute = (rawAttribute && rawAttribute !== '') ? rawAttribute : 'なし';
  if (persistentModifiers.attributes && persistentModifiers.attributes[attribute]) {
    totalPersistent += persistentModifiers.attributes[attribute];
  }

  // カテゴリの永続変動
  let category = null;
  if (Array.isArray(card.category) && card.category.length > 0) {
    category = card.category[0];
  } else if (card.category && typeof card.category === 'string') {
    const match = card.category.match(/【([^】]+)】/);
    category = match ? match[1] : null;
  }
  if (category && persistentModifiers.categories && persistentModifiers.categories[category]) {
    totalPersistent += persistentModifiers.categories[category];
  }

  return totalPersistent;
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
  // スポットライト対象カードは特別扱い（10倍 = +900%）
  if (marketState.spotlightEvent && marketState.spotlightEvent.cardId === card.id) {
    return SPOTLIGHT_MULTIPLIER;
  }

  let totalModifier = 0;

  // 0. 永続変動の効果（上限なしで適用）
  const persistentModifier = calculatePersistentModifier(card, marketState.persistentModifiers);
  totalModifier += persistentModifier;

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
    // 比較型ニュース（複数ターゲット）
    if (marketState.dailyNews.type === 'comparison' && marketState.dailyNews.targets) {
      for (const targetInfo of marketState.dailyNews.targets) {
        if (isCardAffected(card, targetInfo.target, rarity, tier)) {
          totalModifier += targetInfo.modifier;
        }
      }
    }
    // 通常ニュース（単一ターゲット）
    else if (marketState.dailyNews.target) {
      if (isCardAffected(card, marketState.dailyNews.target, rarity, tier)) {
        totalModifier += marketState.dailyNews.modifier;
      }
    }
  }

  // 3. 突発イベントの効果
  if (marketState.suddenEvent && marketState.suddenEvent.effects) {
    for (const effect of marketState.suddenEvent.effects) {
      if (isCardAffected(card, effect.target, rarity, tier)) {
        // 乱高下イベント: 全カードに±30%のランダム変動
        if (effect.wildFluctuation) {
          totalModifier += Math.floor(Math.random() * 61) - 30; // -30 ~ +30
        }
        // 安定期イベント: 変動を±5%に収束
        else if (effect.stabilize) {
          // 既存の変動を抑制（このループ後に適用）
          totalModifier = Math.max(-5, Math.min(5, totalModifier));
        }
        else {
          totalModifier += effect.modifier;
        }
      }
    }
  }

  // 4. 上限・下限の適用（永続変動は上限を超えていても、一時的変動との合計に適用）
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

  // スポットライト対象カード
  if (marketState.spotlightEvent && marketState.spotlightEvent.cardId === card.id) {
    breakdown.push({
      source: `🌟 ${marketState.spotlightEvent.title}`,
      modifier: '+900%（10倍）',
    });
    return {
      price,
      modifier,
      breakdown,
      isSpotlight: true,
    };
  }

  // 永続変動の内訳
  const persistentMod = calculatePersistentModifier(card, marketState.persistentModifiers);
  if (persistentMod !== 0) {
    breakdown.push({
      source: '永続トレンド',
      modifier: `${persistentMod > 0 ? '+' : ''}${Math.round(persistentMod * 10) / 10}%`,
    });
  }

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

  if (marketState.dailyNews) {
    // 比較型ニュース（複数ターゲット）
    if (marketState.dailyNews.type === 'comparison' && marketState.dailyNews.targets) {
      for (const targetInfo of marketState.dailyNews.targets) {
        if (isCardAffected(card, targetInfo.target, rarity, tier)) {
          const label = targetInfo.target.label || (targetInfo.target.attribute ? `${targetInfo.target.attribute}属性` : '対象');
          breakdown.push({
            source: `デイリー: ${label}`,
            modifier: `${targetInfo.modifier > 0 ? '+' : ''}${targetInfo.modifier}%`,
          });
        }
      }
    }
    // 通常ニュース（単一ターゲット）
    else if (marketState.dailyNews.target && isCardAffected(card, marketState.dailyNews.target, rarity, tier)) {
      breakdown.push({
        source: 'デイリー',
        modifier: `${marketState.dailyNews.modifier > 0 ? '+' : ''}${marketState.dailyNews.modifier}%`,
      });
    }
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
 * 初期永続変動データを作成
 *
 * @returns {Object} 永続変動データ
 */
export const createInitialPersistentModifiers = () => {
  return {
    // 属性別永続変動
    attributes: Object.fromEntries(ATTRIBUTES.map(a => [a, 0])),
    // カテゴリ別永続変動
    categories: Object.fromEntries(CATEGORIES.map(c => [c, 0])),
  };
};

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
    spotlightEvent: null,           // スポットライト（単体カード10倍）
    recentNews: [dailyNews],
    recentSuddenEvents: [],
    recentSpotlightCardIds: [],     // 直近スポットライトカードID（重複回避用）
    priceHistory: createInitialPriceHistory(),
    persistentModifiers: createInitialPersistentModifiers(),
  };
};

/**
 * 回帰圧力を適用
 * 永続変動が大きいほど0に戻ろうとする力が働く
 *
 * @param {number} currentValue - 現在の永続変動値
 * @returns {number} 回帰後の値
 */
const applyRegressionPressure = (currentValue) => {
  const absValue = Math.abs(currentValue);

  // 閾値は大きい順にチェック
  for (const { threshold, chance, amount } of REGRESSION_THRESHOLDS) {
    if (absValue > threshold) {
      if (Math.random() < chance) {
        // 0に向かって回帰
        const regression = currentValue > 0 ? -amount : amount;
        return currentValue + regression;
      }
      break; // 最初にマッチした閾値のみ適用
    }
  }

  return currentValue;
};

/**
 * デイリーニュースから永続変動を蓄積
 *
 * @param {Object} persistentModifiers - 現在の永続変動
 * @param {Object} dailyNews - 当日のデイリーニュース
 * @returns {Object} 更新された永続変動
 */
const accumulatePersistentModifiers = (persistentModifiers, dailyNews) => {
  if (!dailyNews) return persistentModifiers;

  const newModifiers = JSON.parse(JSON.stringify(persistentModifiers));

  // デイリーニュースのターゲットから永続変動を蓄積
  const processTarget = (target, modifier) => {
    const accumulation = modifier * PERSISTENT_ACCUMULATION_RATE;

    // 属性ターゲット
    if (target.attribute && newModifiers.attributes[target.attribute] !== undefined) {
      newModifiers.attributes[target.attribute] += accumulation;
    }

    // カテゴリターゲット
    if (target.category) {
      // 【】を除去してカテゴリ名を取得
      const categoryName = target.category.replace(/【|】/g, '');
      if (newModifiers.categories[categoryName] !== undefined) {
        newModifiers.categories[categoryName] += accumulation;
      }
    }
  };

  // 比較型ニュース
  if (dailyNews.type === 'comparison' && dailyNews.targets) {
    for (const targetInfo of dailyNews.targets) {
      processTarget(targetInfo.target, targetInfo.modifier);
    }
  }
  // 通常ニュース
  else if (dailyNews.target && dailyNews.modifier) {
    processTarget(dailyNews.target, dailyNews.modifier);
  }

  return newModifiers;
};

/**
 * 全永続変動に回帰圧力を適用
 *
 * @param {Object} persistentModifiers - 永続変動データ
 * @returns {Object} 回帰後の永続変動データ
 */
const applyAllRegressionPressure = (persistentModifiers) => {
  const newModifiers = JSON.parse(JSON.stringify(persistentModifiers));

  // 属性の回帰
  for (const attr of Object.keys(newModifiers.attributes)) {
    newModifiers.attributes[attr] = applyRegressionPressure(newModifiers.attributes[attr]);
  }

  // カテゴリの回帰
  for (const cat of Object.keys(newModifiers.categories)) {
    newModifiers.categories[cat] = applyRegressionPressure(newModifiers.categories[cat]);
  }

  return newModifiers;
};

/**
 * 1日進める（対戦終了時に呼び出し）
 *
 * @param {Object} marketState - 現在の市場状態
 * @param {Object[]} [allCards=[]] - 全カードリスト（スポットライト生成用）
 * @returns {Object} 新しい市場状態
 */
export const advanceDay = (marketState, allCards = []) => {
  const newDay = marketState.currentDay + 1;
  const newState = { ...marketState, currentDay: newDay };

  // priceHistoryがない場合は初期化
  if (!newState.priceHistory) {
    newState.priceHistory = createInitialPriceHistory();
  }

  // persistentModifiersがない場合は初期化（マイグレーション対応）
  if (!newState.persistentModifiers) {
    newState.persistentModifiers = createInitialPersistentModifiers();
  }

  // recentSpotlightCardIdsがない場合は初期化（マイグレーション対応）
  if (!newState.recentSpotlightCardIds) {
    newState.recentSpotlightCardIds = [];
  }

  // === 永続変動の更新（日をまたぐ前の処理） ===
  // 1. 前日のデイリーニュースから永続変動を蓄積
  const accumulatedModifiers = accumulatePersistentModifiers(
    newState.persistentModifiers,
    marketState.dailyNews
  );

  // 2. 回帰圧力を適用
  newState.persistentModifiers = applyAllRegressionPressure(accumulatedModifiers);

  // 週間トレンドの更新チェック（7戦ごと）
  const daysSinceTrendStart = newDay - marketState.weeklyTrend.startDay;
  if (daysSinceTrendStart >= DAYS_PER_WEEK) {
    newState.weeklyTrend = createWeeklyTrend(newDay, marketState.weeklyTrend.id);
  }

  // デイリーニュースの更新
  const recentNews = marketState.recentNews || [];
  const newNews = generateDailyNews(recentNews.slice(-10), newDay);
  newState.dailyNews = newNews;

  // 直近ニュース履歴を更新
  newState.recentNews = [...recentNews.slice(-29), newNews];

  // 突発イベントの判定（10%の確率）
  const recentSuddenEvents = marketState.recentSuddenEvents || [];
  if (Math.random() < SUDDEN_EVENT_CHANCE) {
    const newEvent = generateSuddenEvent(recentSuddenEvents);
    newState.suddenEvent = newEvent;
    // 直近イベント履歴を更新（最大5件保持）
    newState.recentSuddenEvents = [...recentSuddenEvents.slice(-4), newEvent];
  } else {
    newState.suddenEvent = null;
    newState.recentSuddenEvents = recentSuddenEvents;
  }

  // スポットライトイベントの判定（20%の確率）
  const recentSpotlightCardIds = marketState.recentSpotlightCardIds || [];
  if (allCards.length > 0 && Math.random() < SPOTLIGHT_EVENT_CHANCE) {
    const spotlight = generateSpotlightEvent(allCards, recentSpotlightCardIds);
    newState.spotlightEvent = spotlight;
    if (spotlight) {
      // 直近スポットライト履歴を更新（最大10件保持）
      newState.recentSpotlightCardIds = [...recentSpotlightCardIds.slice(-9), spotlight.cardId];
    }
  } else {
    newState.spotlightEvent = null;
    newState.recentSpotlightCardIds = recentSpotlightCardIds;
  }

  return newState;
};

// ========================================
// エクスポート
// ========================================

export default {
  isCardAffected,
  calculatePersistentModifier,
  calculateMarketModifier,
  calculateMarketPrice,
  getCardMarketPrice,
  createInitialPersistentModifiers,
  createInitialMarketState,
  advanceDay,
};
