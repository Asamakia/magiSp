/**
 * 動的市場システム - ニュース生成（MVP版：基本型パターンのみ）
 *
 * 将来的に8パターン全てを実装予定
 */

import { DIRECTIONS, ALL_DIRECTIONS, UP_DIRECTIONS, DOWN_DIRECTIONS, CONNECTORS } from './constants';
import { CATEGORIES, getAttributeForCategory, ATTRIBUTES } from './data/categories';
import { REASONS, getRandomReason, getReasonTendency } from './data/reasons';

// ========================================
// ユーティリティ
// ========================================

/**
 * 配列からランダムに1つ選択
 */
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 範囲内のランダムな整数を取得
 */
const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 方向から変動値を生成
 */
const getModifierFromDirection = (directionKey) => {
  const direction = DIRECTIONS[directionKey];
  return randomBetween(direction.min, direction.max);
};

/**
 * 方向のラベルを取得（バリエーション付き）
 */
const getDirectionLabel = (directionKey) => {
  const direction = DIRECTIONS[directionKey];
  return randomChoice(direction.labels);
};

// ========================================
// 基本型パターン
// ========================================

/**
 * 基本型ニュースを生成
 * 「【属性】属性の【カテゴリ】が【理由】により【方向】！」
 *
 * @returns {Object} ニュースオブジェクト
 */
const generateBasicNews = () => {
  // 1. カテゴリを選択
  const category = randomChoice(CATEGORIES);

  // 2. 属性を自動決定（紐づけ）
  let attribute = getAttributeForCategory(category);

  // 複数属性の場合はランダムに選択
  if (attribute === null) {
    attribute = randomChoice(ATTRIBUTES.filter(a => a !== 'なし'));
  }

  // 3. 理由を選択
  const reason = getRandomReason();

  // 4. 理由の傾向から方向を決定
  const tendency = getReasonTendency(reason);
  let directionKey;

  if (tendency === 'up') {
    directionKey = randomChoice(UP_DIRECTIONS);
  } else if (tendency === 'down') {
    directionKey = randomChoice(DOWN_DIRECTIONS);
  } else {
    directionKey = randomChoice(ALL_DIRECTIONS);
  }

  // 5. 接続詞を選択
  const connector = randomChoice(CONNECTORS);

  // 6. 方向ラベルを取得
  const directionLabel = getDirectionLabel(directionKey);

  // 7. 変動値を計算
  const modifier = getModifierFromDirection(directionKey);

  // 8. ニューステキストを生成
  const text = `${attribute}属性の${category}が${reason}${connector}${directionLabel}！`;

  return {
    type: 'basic',
    text,
    target: {
      attribute,
      category,
    },
    modifier,
    reason,
    direction: directionKey,
  };
};

// ========================================
// 属性ニュース（シンプル版）
// ========================================

/**
 * 属性全体に影響するニュースを生成
 *
 * @returns {Object} ニュースオブジェクト
 */
const generateAttributeNews = () => {
  // 1. 属性を選択
  const attribute = randomChoice(ATTRIBUTES.filter(a => a !== 'なし'));

  // 2. 理由を選択
  const reason = getRandomReason();

  // 3. 理由の傾向から方向を決定
  const tendency = getReasonTendency(reason);
  let directionKey;

  if (tendency === 'up') {
    directionKey = randomChoice(UP_DIRECTIONS);
  } else if (tendency === 'down') {
    directionKey = randomChoice(DOWN_DIRECTIONS);
  } else {
    directionKey = randomChoice(ALL_DIRECTIONS);
  }

  // 4. 接続詞を選択
  const connector = randomChoice(CONNECTORS);

  // 5. 方向ラベルを取得
  const directionLabel = getDirectionLabel(directionKey);

  // 6. 変動値を計算
  const modifier = getModifierFromDirection(directionKey);

  // 7. ニューステキストを生成
  const text = `${attribute}属性全体が${reason}${connector}${directionLabel}！`;

  return {
    type: 'attribute',
    text,
    target: {
      attribute,
    },
    modifier,
    reason,
    direction: directionKey,
  };
};

// ========================================
// メイン生成関数
// ========================================

/**
 * デイリーニュースを生成
 *
 * @param {Object[]} [recentNews=[]] - 直近のニュース（重複回避用）
 * @returns {Object} ニュースオブジェクト
 */
export const generateDailyNews = (recentNews = []) => {
  let news;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    // 基本型とカテゴリ型を50:50で
    if (Math.random() < 0.5) {
      news = generateBasicNews();
    } else {
      news = generateAttributeNews();
    }

    attempts++;

    // 重複チェック（同じカテゴリ+同じ方向は避ける）
    const isDuplicate = recentNews.some(r => {
      if (r.target.category && news.target.category) {
        return r.target.category === news.target.category &&
               Math.sign(r.modifier) === Math.sign(news.modifier);
      }
      if (r.target.attribute && news.target.attribute && !r.target.category && !news.target.category) {
        return r.target.attribute === news.target.attribute &&
               Math.sign(r.modifier) === Math.sign(news.modifier);
      }
      return false;
    });

    if (!isDuplicate) {
      break;
    }
  } while (attempts < maxAttempts);

  return news;
};

// ========================================
// エクスポート
// ========================================

export default {
  generateDailyNews,
  generateBasicNews,
  generateAttributeNews,
};
