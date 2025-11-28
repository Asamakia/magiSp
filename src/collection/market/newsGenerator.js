/**
 * 動的市場システム - ニュース生成（全8パターン対応）
 *
 * 8パターン:
 * 1. 基本型: カテゴリ + 理由 + 方向
 * 2. 人物型: 人物 + 行動 + 対象
 * 3. 場所型: 場所 + 出来事 + 対象
 * 4. 噂型: 噂種類 + 対象
 * 5. 比較型: A vs B（Aは下落、Bは上昇）
 * 6. 需要供給型: 対象 + 需要/供給変化
 * 7. 時事ネタ型: 季節/時間 + 属性
 * 8. ストーリー型: キャラ + 動向 + 対象
 */

import { DIRECTIONS, ALL_DIRECTIONS, UP_DIRECTIONS, DOWN_DIRECTIONS, CONNECTORS, ATTRIBUTES } from './constants';
import { CATEGORIES, getAttributeForCategory } from './data/categories';
import { REASONS, getRandomReason, getReasonTendency } from './data/reasons';
import { PERSONS, ACTION_TENDENCY, PERSON_TEMPLATES } from './data/persons';
import { LOCATIONS, LOCATION_TEMPLATES } from './data/locations';
import { RUMORS, RUMOR_ATTRIBUTES, CATEGORIES_LIST, RUMOR_PREFIXES } from './data/rumors';
import { COMPARISONS, COMPARISON_TEMPLATES, COMPARISON_MODIFIERS } from './data/comparisons';
import { SUPPLY_DEMAND_TARGETS, SUPPLY_DEMAND_TYPES, SUPPLY_DEMAND_TEMPLATES } from './data/supplyDemand';
import { SEASONS, SEASONAL_MODIFIERS, getCurrentSeason, getCurrentTimeOfDay } from './data/seasonal';
import { CHARACTERS, CHARACTER_TEMPLATES, CHARACTER_MODIFIERS } from './data/characters';

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

/**
 * 傾向から方向キーを決定
 */
const getDirectionKeyFromTendency = (tendency) => {
  if (tendency === 'up') {
    return randomChoice(UP_DIRECTIONS);
  } else if (tendency === 'down') {
    return randomChoice(DOWN_DIRECTIONS);
  }
  return randomChoice(ALL_DIRECTIONS);
};

// ========================================
// パターン1: 基本型
// ========================================

/**
 * 基本型ニュースを生成
 */
const generateBasicNews = () => {
  const category = randomChoice(CATEGORIES);
  let attribute = getAttributeForCategory(category);
  if (attribute === null) {
    attribute = randomChoice(ATTRIBUTES.filter(a => a !== 'なし'));
  }

  const reason = getRandomReason();
  const tendency = getReasonTendency(reason);
  const directionKey = getDirectionKeyFromTendency(tendency);
  const connector = randomChoice(CONNECTORS);
  const directionLabel = getDirectionLabel(directionKey);
  const modifier = getModifierFromDirection(directionKey);
  const text = `${attribute}属性の${category}が${reason}${connector}${directionLabel}！`;

  return {
    type: 'basic',
    text,
    target: { attribute, category },
    modifier,
    reason,
    direction: directionKey,
  };
};

/**
 * 属性全体ニュースを生成
 */
const generateAttributeNews = () => {
  const attribute = randomChoice(ATTRIBUTES.filter(a => a !== 'なし'));
  const reason = getRandomReason();
  const tendency = getReasonTendency(reason);
  const directionKey = getDirectionKeyFromTendency(tendency);
  const connector = randomChoice(CONNECTORS);
  const directionLabel = getDirectionLabel(directionKey);
  const modifier = getModifierFromDirection(directionKey);
  const text = `${attribute}属性全体が${reason}${connector}${directionLabel}！`;

  return {
    type: 'attribute',
    text,
    target: { attribute },
    modifier,
    reason,
    direction: directionKey,
  };
};

// ========================================
// パターン2: 人物型
// ========================================

/**
 * 人物型ニュースを生成
 */
const generatePersonNews = () => {
  const personNames = Object.keys(PERSONS);
  const personName = randomChoice(personNames);
  const person = PERSONS[personName];

  const action = randomChoice(person.actions);
  const category = randomChoice(CATEGORIES);
  let attribute = getAttributeForCategory(category);
  if (attribute === null) {
    attribute = randomChoice(ATTRIBUTES.filter(a => a !== 'なし'));
  }

  const tendency = ACTION_TENDENCY[action] || 'neutral';
  const directionKey = getDirectionKeyFromTendency(tendency);
  const modifier = getModifierFromDirection(directionKey);
  const directionLabel = getDirectionLabel(directionKey);

  const template = randomChoice(PERSON_TEMPLATES);
  const text = template
    .replace('${person}', personName)
    .replace('${category}', category)
    .replace('${action}', action)
    .replace('${direction}', directionLabel);

  return {
    type: 'person',
    text,
    target: { attribute, category },
    modifier,
    person: personName,
    action,
    direction: directionKey,
  };
};

// ========================================
// パターン3: 場所型
// ========================================

/**
 * 場所型ニュースを生成
 */
const generateLocationNews = () => {
  const locationNames = Object.keys(LOCATIONS);
  const locationName = randomChoice(locationNames);
  const location = LOCATIONS[locationName];

  const event = randomChoice(location.events);
  const targetObj = randomChoice(location.targets);
  const tendency = location.eventTendency[event] || 'neutral';
  const directionKey = getDirectionKeyFromTendency(tendency);
  const modifier = getModifierFromDirection(directionKey);

  // ターゲットラベルを生成
  let targetLabel;
  if (targetObj.all) {
    targetLabel = '市場全体';
  } else if (targetObj.attribute) {
    targetLabel = `${targetObj.attribute}属性`;
  } else if (targetObj.category) {
    targetLabel = targetObj.category;
  } else if (targetObj.keyword) {
    targetLabel = `${targetObj.keyword}カード`;
  } else {
    targetLabel = '関連カード';
  }

  const template = randomChoice(LOCATION_TEMPLATES);
  const text = template
    .replace('${location}', locationName)
    .replace('${event}', event)
    .replace('${target}', targetLabel);

  return {
    type: 'location',
    text,
    target: targetObj,
    modifier,
    location: locationName,
    event,
    direction: directionKey,
  };
};

// ========================================
// パターン4: 噂型
// ========================================

/**
 * 噂型ニュースを生成
 */
const generateRumorNews = () => {
  const rumorTypes = Object.keys(RUMORS);
  const rumorType = randomChoice(rumorTypes);
  const rumor = RUMORS[rumorType];

  // ターゲットを決定
  let target;
  let targetLabel;

  if (rumor.targets === 'random_attribute') {
    const attr = randomChoice(RUMOR_ATTRIBUTES);
    target = { attribute: attr };
    targetLabel = `${attr}属性`;
  } else if (rumor.targets === 'random_category') {
    const cat = randomChoice(CATEGORIES_LIST);
    target = { category: cat };
    targetLabel = cat;
  } else if (rumor.targets === 'random_attribute_or_category') {
    if (Math.random() < 0.5) {
      const attr = randomChoice(RUMOR_ATTRIBUTES);
      target = { attribute: attr };
      targetLabel = `${attr}属性`;
    } else {
      const cat = randomChoice(CATEGORIES_LIST);
      target = { category: cat };
      targetLabel = cat;
    }
  } else {
    target = randomChoice(rumor.targets);
    if (target.keyword) {
      targetLabel = `${target.keyword}カード`;
    } else if (target.minRarity) {
      targetLabel = `${target.minRarity}以上`;
    } else {
      targetLabel = '対象カード';
    }
  }

  const directionKey = getDirectionKeyFromTendency(rumor.direction);
  const modifier = getModifierFromDirection(directionKey);

  const prefix = randomChoice(RUMOR_PREFIXES);
  const template = randomChoice(rumor.templates);
  const rumorText = template.replace('${target}', targetLabel);
  const text = `${prefix} ${rumorText}`;

  return {
    type: 'rumor',
    text,
    target,
    modifier,
    rumorType,
    direction: directionKey,
  };
};

// ========================================
// パターン5: 比較型
// ========================================

/**
 * 比較型ニュースを生成（2つの効果を返す）
 */
const generateComparisonNews = () => {
  const comparison = randomChoice(COMPARISONS);

  const modifierDown = randomBetween(COMPARISON_MODIFIERS.down.min, COMPARISON_MODIFIERS.down.max);
  const modifierUp = randomBetween(COMPARISON_MODIFIERS.up.min, COMPARISON_MODIFIERS.up.max);

  const template = randomChoice(COMPARISON_TEMPLATES);
  const text = template
    .replace('${targetA}', comparison.a.label)
    .replace('${targetB}', comparison.b.label);

  // 比較型は2つのターゲットに影響
  return {
    type: 'comparison',
    text,
    targets: [
      { target: comparison.a, modifier: modifierDown },
      { target: comparison.b, modifier: modifierUp },
    ],
    // メインのmodifierは上昇側を表示
    modifier: modifierUp,
    direction: 'up_small',
  };
};

// ========================================
// パターン6: 需要供給型
// ========================================

/**
 * 需要供給型ニュースを生成
 */
const generateSupplyDemandNews = () => {
  const targetInfo = randomChoice(SUPPLY_DEMAND_TARGETS);
  const typeInfo = randomChoice(SUPPLY_DEMAND_TYPES);

  const modifier = randomBetween(typeInfo.min, typeInfo.max);

  const template = randomChoice(SUPPLY_DEMAND_TEMPLATES);
  const text = template
    .replace('${label}', targetInfo.label)
    .replace('${type}', typeInfo.type)
    .replace('${change}', typeInfo.change);

  return {
    type: 'supply_demand',
    text,
    target: targetInfo.target,
    modifier,
    supplyDemandType: typeInfo.type,
    change: typeInfo.change,
    direction: typeInfo.direction,
  };
};

// ========================================
// パターン7: 時事ネタ型
// ========================================

/**
 * 時事ネタ型ニュースを生成
 */
const generateSeasonalNews = (currentDay = 0) => {
  // 季節か時間帯をランダムに選択
  const seasonKeys = Object.keys(SEASONS);
  const seasonKey = randomChoice(seasonKeys);
  const season = SEASONS[seasonKey];

  const attribute = randomChoice(season.attributes);
  const template = randomChoice(season.templates);
  const text = template.replace('${attribute}', attribute);

  const modifier = randomBetween(SEASONAL_MODIFIERS.up.min, SEASONAL_MODIFIERS.up.max);

  return {
    type: 'seasonal',
    text,
    target: { attribute },
    modifier,
    season: seasonKey,
    reason: season.reason,
    direction: 'up_small',
  };
};

// ========================================
// パターン8: ストーリー型
// ========================================

/**
 * ストーリー型ニュースを生成
 */
const generateCharacterNews = () => {
  const characterNames = Object.keys(CHARACTERS);
  const characterName = randomChoice(characterNames);
  const character = CHARACTERS[characterName];

  const action = randomChoice(character.actions);
  const targetObj = randomChoice(character.targets);
  const tendency = character.actionTendency[action] || 'neutral';

  const modifierRange = CHARACTER_MODIFIERS[tendency];
  const modifier = randomBetween(modifierRange.min, modifierRange.max);

  // ターゲットラベルを生成
  let targetLabel;
  if (targetObj.attribute) {
    targetLabel = `${targetObj.attribute}属性`;
  } else if (targetObj.category) {
    targetLabel = targetObj.category;
  } else if (targetObj.keyword) {
    targetLabel = `${targetObj.keyword}カード`;
  } else {
    targetLabel = '関連カード';
  }

  const template = randomChoice(CHARACTER_TEMPLATES);
  const text = template
    .replace('${character}', characterName)
    .replace('${action}', action)
    .replace('${target}', targetLabel);

  return {
    type: 'character',
    text,
    target: targetObj,
    modifier,
    character: characterName,
    action,
    direction: tendency === 'up' ? 'up_small' : tendency === 'down' ? 'down_small' : 'stable',
  };
};

// ========================================
// メイン生成関数
// ========================================

/**
 * パターン選択の重み付け
 * 基本型と人物型は頻度高め、比較型は低め
 */
const PATTERN_WEIGHTS = {
  basic: 20,
  attribute: 10,
  person: 15,
  location: 12,
  rumor: 10,
  comparison: 5,
  supply_demand: 10,
  seasonal: 8,
  character: 10,
};

/**
 * 重み付きランダム選択
 */
const weightedRandomChoice = (weights) => {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * total;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) return key;
  }

  return entries[0][0]; // フォールバック
};

/**
 * デイリーニュースを生成
 *
 * @param {Object[]} [recentNews=[]] - 直近のニュース（重複回避用）
 * @param {number} [currentDay=0] - 現在のゲーム日数（季節計算用）
 * @returns {Object} ニュースオブジェクト
 */
export const generateDailyNews = (recentNews = [], currentDay = 0) => {
  let news;
  let attempts = 0;
  const maxAttempts = 15;

  do {
    const pattern = weightedRandomChoice(PATTERN_WEIGHTS);

    switch (pattern) {
      case 'basic':
        news = generateBasicNews();
        break;
      case 'attribute':
        news = generateAttributeNews();
        break;
      case 'person':
        news = generatePersonNews();
        break;
      case 'location':
        news = generateLocationNews();
        break;
      case 'rumor':
        news = generateRumorNews();
        break;
      case 'comparison':
        news = generateComparisonNews();
        break;
      case 'supply_demand':
        news = generateSupplyDemandNews();
        break;
      case 'seasonal':
        news = generateSeasonalNews(currentDay);
        break;
      case 'character':
        news = generateCharacterNews();
        break;
      default:
        news = generateBasicNews();
    }

    attempts++;

    // 重複チェック（同じタイプ+似た対象は避ける）
    const isDuplicate = recentNews.some(r => {
      // 同じタイプで同じターゲット
      if (r.type === news.type) {
        // 属性が同じ
        if (r.target?.attribute && news.target?.attribute &&
            r.target.attribute === news.target.attribute) {
          return true;
        }
        // カテゴリが同じ
        if (r.target?.category && news.target?.category &&
            r.target.category === news.target.category) {
          return true;
        }
        // 人物型で同じ人物
        if (r.person && news.person && r.person === news.person) {
          return true;
        }
        // 場所型で同じ場所
        if (r.location && news.location && r.location === news.location) {
          return true;
        }
        // キャラクター型で同じキャラクター
        if (r.character && news.character && r.character === news.character) {
          return true;
        }
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

export {
  generateBasicNews,
  generateAttributeNews,
  generatePersonNews,
  generateLocationNews,
  generateRumorNews,
  generateComparisonNews,
  generateSupplyDemandNews,
  generateSeasonalNews,
  generateCharacterNews,
};

export default {
  generateDailyNews,
  generateBasicNews,
  generateAttributeNews,
  generatePersonNews,
  generateLocationNews,
  generateRumorNews,
  generateComparisonNews,
  generateSupplyDemandNews,
  generateSeasonalNews,
  generateCharacterNews,
};
