/**
 * 動的市場システム - 突発イベント
 *
 * 発生: 10%の確率（約10戦に1回）
 * 変動幅: ±30%〜60%
 * パターン: 固定25種
 */

import { CATEGORIES } from './data/categories';
import { ATTRIBUTES } from './constants';

// ========================================
// 突発イベント定義
// ========================================

/**
 * 高騰系イベント（10種）
 */
export const SURGE_EVENTS = [
  {
    id: 'collector_buying',
    name: 'コレクター大量買い',
    description: '著名なコレクターがURカードを大量購入！',
    effects: [
      { target: { minRarity: 'UR' }, modifier: 50 },
    ],
  },
  {
    id: 'meta_shift',
    name: '大会メタ激変',
    description: '大会環境が激変！注目属性が高騰！',
    effects: 'random_attribute_surge', // 特殊処理：ランダム属性 +60%
    modifier: 60,
  },
  {
    id: 'ancient_scroll',
    name: '古文書発見',
    description: '禁忌に関する古文書が発見された！',
    effects: [
      { target: { keyword: '禁忌' }, modifier: 40 },
    ],
  },
  {
    id: 'royal_collection',
    name: '王室コレクション公開',
    description: '王室秘蔵のカードコレクションが公開！Sティアに注目！',
    effects: [
      { target: { tiers: ['S'] }, modifier: 45 },
    ],
  },
  {
    id: 'counterfeit_crackdown',
    name: '偽物大量摘発',
    description: '偽物カードが大量摘発！本物の需要が急増！',
    effects: [
      { target: { all: true }, modifier: 15 },
    ],
  },
  {
    id: 'new_combo',
    name: '新コンボ発見',
    description: '強力な新コンボが発見された！',
    effects: 'random_category_surge', // 特殊処理：ランダムカテゴリ +55%
    modifier: 55,
  },
  {
    id: 'legendary_trader',
    name: '伝説のトレーダー参入',
    description: '伝説のトレーダーが市場に参入！高レアが急騰！',
    effects: [
      { target: { minRarity: 'SR' }, modifier: 35 },
    ],
  },
  {
    id: 'anniversary_sale',
    name: '記念日セール',
    description: '特別な記念日により市場が活性化！',
    effects: 'random_attribute_surge_medium', // 特殊処理：ランダム属性 +40%
    modifier: 40,
  },
  {
    id: 'museum_acquisition',
    name: '博物館買い付け',
    description: '博物館がAティア以上のカードを買い付け！',
    effects: [
      { target: { tiers: ['S', 'A'] }, modifier: 30 },
    ],
  },
  {
    id: 'adventurer_recommendation',
    name: '冒険者ギルド推奨',
    description: '冒険者ギルドが特定カテゴリを推奨！',
    effects: 'random_category_surge_high', // 特殊処理：ランダムカテゴリ +50%
    modifier: 50,
  },
];

/**
 * 暴落系イベント（8種）
 */
export const CRASH_EVENTS = [
  {
    id: 'counterfeit_scandal',
    name: '偽物騒動',
    description: '特定カテゴリで偽物騒動が発生！',
    effects: 'random_category_crash', // 特殊処理：ランダムカテゴリ -40%
    modifier: -40,
  },
  {
    id: 'inventory_dump',
    name: '大量在庫放出',
    description: 'Dティアカードが大量に市場に放出された！',
    effects: [
      { target: { tiers: ['D'] }, modifier: -35 },
    ],
  },
  {
    id: 'regulation_rumor',
    name: '規制の噂',
    description: '禁忌カードが規制されるとの噂が広まる！',
    effects: [
      { target: { keyword: '禁忌' }, modifier: -30 },
    ],
  },
  {
    id: 'trader_retirement',
    name: 'トレーダー引退売り',
    description: '大物トレーダーが引退、大量売却！',
    effects: 'random_attribute_crash', // 特殊処理：ランダム属性 -45%
    modifier: -45,
  },
  {
    id: 'ominous_prophecy',
    name: '不吉な予言',
    description: '占い師の不吉な予言が市場を恐怖に陥れる！',
    effects: [
      { target: { attribute: '炎' }, modifier: -20 },
      { target: { attribute: '水' }, modifier: -20 },
      { target: { attribute: '光' }, modifier: -20 },
      { target: { attribute: '原始' }, modifier: -20 },
      { target: { attribute: '未来' }, modifier: -20 },
      { target: { attribute: 'なし' }, modifier: -20 },
      // 闇属性以外 -20%
    ],
  },
  {
    id: 'market_panic',
    name: '市場パニック',
    description: '市場全体がパニック状態！全てが下落！',
    effects: [
      { target: { all: true }, modifier: -25 },
    ],
  },
  {
    id: 'smuggling_ship_sunk',
    name: '密輸船沈没',
    description: '密輸船が沈没、希少カードが失われた！',
    effects: 'random_attribute_crash_medium', // 特殊処理：ランダム属性 -35%
    modifier: -35,
  },
  {
    id: 'revaluation',
    name: '評価見直し',
    description: '専門家が高ティアカードの評価を見直し！',
    effects: [
      { target: { tiers: ['S', 'A'] }, modifier: -20 },
    ],
  },
];

/**
 * 特殊系イベント（7種）
 */
export const SPECIAL_EVENTS = [
  {
    id: 'attribute_shuffle',
    name: '属性シャッフル',
    description: '魔法的な異変により属性の価値が入れ替わる！',
    effects: 'attribute_shuffle', // 特殊処理
  },
  {
    id: 'tier_reversal',
    name: '逆転現象',
    description: '高ティアと低ティアの評価が逆転！',
    effects: [
      { target: { tiers: ['S', 'A'] }, modifier: -30 },
      { target: { tiers: ['C', 'D'] }, modifier: 30 },
    ],
  },
  {
    id: 'stability_period',
    name: '安定期',
    description: '市場が安定期に入り、変動が収束。',
    effects: 'stability', // 特殊処理：全変動を±5%に
  },
  {
    id: 'wild_fluctuation',
    name: '乱高下',
    description: '市場が混乱！全てのカードがランダムに変動！',
    effects: 'wild_fluctuation', // 特殊処理：全カード±30%ランダム
  },
  {
    id: 'black_market_open',
    name: '闇市場開放',
    description: '闇市場が開放！低レアが急騰、高レアが下落！',
    effects: [
      { target: { maxRarity: 'R' }, modifier: 40 },
      { target: { minRarity: 'SR' }, modifier: -20 },
    ],
  },
  {
    id: 'golden_age',
    name: '黄金時代',
    description: '市場は黄金時代を迎えた！全体が大幅上昇！',
    effects: [
      { target: { all: true }, modifier: 30 },
    ],
    rarity: 'rare', // 稀
  },
  {
    id: 'great_crash',
    name: '大暴落',
    description: '歴史的な大暴落が発生！',
    effects: [
      { target: { all: true }, modifier: -40 },
    ],
    rarity: 'rare', // 稀
  },
];

/**
 * 全イベントリスト
 */
export const ALL_SUDDEN_EVENTS = [
  ...SURGE_EVENTS,
  ...CRASH_EVENTS,
  ...SPECIAL_EVENTS,
];

// ========================================
// イベント生成ロジック
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
 * 特殊効果を解決してeffects配列を生成
 */
const resolveSpecialEffects = (event) => {
  if (Array.isArray(event.effects)) {
    return event.effects;
  }

  const effectType = event.effects;
  const nonNullAttributes = ATTRIBUTES.filter(a => a !== 'なし');

  switch (effectType) {
    case 'random_attribute_surge':
      // ランダム属性 +60%
      return [{ target: { attribute: randomChoice(nonNullAttributes) }, modifier: 60 }];

    case 'random_attribute_surge_medium':
      // ランダム属性 +40%
      return [{ target: { attribute: randomChoice(nonNullAttributes) }, modifier: 40 }];

    case 'random_category_surge':
      // ランダムカテゴリ +55%
      return [{ target: { category: randomChoice(CATEGORIES) }, modifier: 55 }];

    case 'random_category_surge_high':
      // ランダムカテゴリ +50%
      return [{ target: { category: randomChoice(CATEGORIES) }, modifier: 50 }];

    case 'random_category_crash':
      // ランダムカテゴリ -40%
      return [{ target: { category: randomChoice(CATEGORIES) }, modifier: -40 }];

    case 'random_attribute_crash':
      // ランダム属性 -45%
      return [{ target: { attribute: randomChoice(nonNullAttributes) }, modifier: -45 }];

    case 'random_attribute_crash_medium':
      // ランダム属性 -35%
      return [{ target: { attribute: randomChoice(nonNullAttributes) }, modifier: -35 }];

    case 'attribute_shuffle':
      // 属性シャッフル：各属性にランダムな変動
      return nonNullAttributes.map(attr => ({
        target: { attribute: attr },
        modifier: randomBetween(-40, 40),
      }));

    case 'stability':
      // 安定期：このイベントがある間、他の変動を抑制
      return [{ target: { all: true }, modifier: 0, stabilize: true }];

    case 'wild_fluctuation':
      // 乱高下：全体にランダム変動フラグ
      return [{ target: { all: true }, modifier: 0, wildFluctuation: true }];

    default:
      return [];
  }
};

/**
 * 突発イベントを生成
 *
 * @param {Object[]} [recentEvents=[]] - 直近のイベント（重複回避用）
 * @returns {Object|null} イベントオブジェクト or null
 */
export const generateSuddenEvent = (recentEvents = []) => {
  // レアイベントの確率調整
  const availableEvents = ALL_SUDDEN_EVENTS.filter(event => {
    // 直近で発生したイベントは除外
    if (recentEvents.some(r => r.id === event.id)) {
      return false;
    }
    // レアイベントは10%の確率でしか選ばれない
    if (event.rarity === 'rare' && Math.random() > 0.1) {
      return false;
    }
    return true;
  });

  if (availableEvents.length === 0) {
    // フォールバック：全イベントから選択
    const event = randomChoice(ALL_SUDDEN_EVENTS.filter(e => e.rarity !== 'rare'));
    return createEventInstance(event);
  }

  const event = randomChoice(availableEvents);
  return createEventInstance(event);
};

/**
 * イベントインスタンスを作成
 */
const createEventInstance = (event) => {
  const resolvedEffects = resolveSpecialEffects(event);

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    effects: resolvedEffects,
    // 表示用のターゲット説明を生成
    targetDescription: generateTargetDescription(resolvedEffects),
    // 表示用の変動説明
    modifierDescription: generateModifierDescription(resolvedEffects),
  };
};

/**
 * ターゲット説明を生成
 */
const generateTargetDescription = (effects) => {
  if (!effects || effects.length === 0) return '不明';

  const descriptions = effects.map(effect => {
    const t = effect.target;
    if (t.all) return '全体';
    if (t.attribute) return `${t.attribute}属性`;
    if (t.category) return t.category;
    if (t.minRarity) return `${t.minRarity}以上`;
    if (t.maxRarity) return `${t.maxRarity}以下`;
    if (t.tiers) return `${t.tiers.join('/')}ティア`;
    if (t.keyword) return `${t.keyword}カード`;
    return '対象';
  });

  // 重複を除去して結合
  return [...new Set(descriptions)].join(', ');
};

/**
 * 変動説明を生成
 */
const generateModifierDescription = (effects) => {
  if (!effects || effects.length === 0) return '';

  // 特殊効果
  if (effects.some(e => e.stabilize)) return '変動収束';
  if (effects.some(e => e.wildFluctuation)) return '±30%ランダム';

  // 通常効果：最大変動を表示
  const modifiers = effects.map(e => e.modifier).filter(m => m !== 0);
  if (modifiers.length === 0) return '';

  const max = Math.max(...modifiers.map(Math.abs));
  const sign = modifiers.find(m => Math.abs(m) === max) >= 0 ? '+' : '';
  return `${sign}${modifiers.find(m => Math.abs(m) === max)}%`;
};

// ========================================
// エクスポート
// ========================================

// ========================================
// スポットライトイベント（単体カード高騰）
// ========================================

/**
 * スポットライトイベント説明テンプレート
 * {cardName}はカード名に置換される
 */
const SPOTLIGHT_TEMPLATES = [
  {
    title: '本日の注目カード',
    descriptions: [
      '「{cardName}」が市場で話題沸騰！',
      '著名コレクターが「{cardName}」を指名買い！',
      '「{cardName}」の希少性に注目が集まる！',
    ],
  },
  {
    title: '緊急買取強化',
    descriptions: [
      '「{cardName}」の緊急買取を実施中！',
      '「{cardName}」を高額査定中！',
      '限定: 「{cardName}」買取10倍キャンペーン！',
    ],
  },
  {
    title: '幻のカード出現',
    descriptions: [
      '「{cardName}」が闇市場で高値取引！',
      '「{cardName}」を求めて商人が殺到！',
      '「{cardName}」に謎の需要が発生！',
    ],
  },
  {
    title: '伝説の一枚',
    descriptions: [
      '古文書に記された「{cardName}」の価値が判明！',
      '「{cardName}」が大会で大活躍の噂！',
      '「{cardName}」のレアバージョンが発見された！',
    ],
  },
];

/**
 * スポットライトイベントを生成
 *
 * @param {Object[]} allCards - 全カードリスト
 * @param {string[]} [recentCardIds=[]] - 直近でスポットライトになったカードID
 * @returns {Object|null} スポットライトイベント
 */
export const generateSpotlightEvent = (allCards, recentCardIds = []) => {
  if (!allCards || allCards.length === 0) {
    return null;
  }

  // 直近でスポットライトになったカードは除外
  const availableCards = allCards.filter(card => !recentCardIds.includes(card.id));

  if (availableCards.length === 0) {
    return null;
  }

  // ランダムにカードを選択
  const selectedCard = randomChoice(availableCards);

  // テンプレートをランダムに選択
  const template = randomChoice(SPOTLIGHT_TEMPLATES);
  const description = randomChoice(template.descriptions).replace('{cardName}', selectedCard.name);

  return {
    cardId: selectedCard.id,
    cardName: selectedCard.name,
    cardAttribute: selectedCard.attribute,
    title: template.title,
    description,
  };
};

// ========================================
// エクスポート
// ========================================

export default {
  SURGE_EVENTS,
  CRASH_EVENTS,
  SPECIAL_EVENTS,
  ALL_SUDDEN_EVENTS,
  generateSuddenEvent,
  generateSpotlightEvent,
  SPOTLIGHT_TEMPLATES,
};
