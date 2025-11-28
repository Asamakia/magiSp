/**
 * カードコレクションシステム - 価値計算エンジン
 *
 * カードの基礎価値とティアを計算する
 * 仕様: card_value_system_v2.1.md
 */

import { TIER_THRESHOLDS, RARITY_MULTIPLIERS } from '../data/constants';

// ========================================
// 効果キーワード価値定義
// ========================================

const EFFECT_KEYWORDS = {
  // 召喚系
  '直接召喚': 80,
  'コスト不要': 80,
  'コストなしで': 80,
  'コストなし': 80,
  'コストを払わず': 70,
  '場に召喚': 50,
  '場に戻す': 40,
  'サーチ': 40,
  '手札に戻す': 35,
  '手札に加える': 30,

  // 破壊・ダメージ系
  '全てのモンスター': 70,
  '全体に': 60,
  'フィールド全体': 60,
  '破壊する': 40,
  'ダメージを与え': 25,
  '相手プレイヤーに': 20,

  // ドロー・リソース系
  '2枚ドロー': 80,
  'ドロー': 50,
  '1枚ドロー': 50,
  'SPトークン': 30,
  'アクティブ': 25,

  // 無効化・妨害系
  '破壊されない': 70,
  '効果を受けない': 60,
  '無効化': 50,
  '無効にする': 50,
  '行動不能': 45,
  '攻撃不能': 40,

  // 蘇生・復活系
  '復活': 50,
  '蘇生': 50,
  '墓地から': 45,

  // 状態異常系
  '凍結': 35,
  '守護': 35,
  '眠り': 30,
  '毒': 25,

  // バフ・回復系
  // 正規表現パターンは別途処理

  // 技系
  '上級技': 60,
  '基本技': 30,

  // 条件系
  '1度だけ': 20,
  'ターンに1度': 15,
};

// 正規表現パターンのキーワード
const EFFECT_KEYWORDS_REGEX = [
  { pattern: /コスト.*軽減/, value: 40 },
  { pattern: /攻撃力.*アップ/, value: 30 },
  { pattern: /ライフ.*回復/, value: 30 },
  { pattern: /HP.*回復/, value: 25 },
  { pattern: /攻撃力.*ダウン/, value: 30 },
];

// ========================================
// キーワード能力倍率
// ========================================

const KEYWORD_ABILITY_MULTIPLIERS = {
  '禁忌': 1.8,
  '死触': 1.3,
  '覚醒': 1.25,
  '刹那詠唱': 1.15,
  '魔障壁': 1.1,
};

// ========================================
// 計算関数
// ========================================

/**
 * カードの基礎価値を計算
 * @param {Object} card - カードデータ
 * @returns {number} 基礎価値
 */
export const calculateBaseValue = (card) => {
  let value = 0;

  // 1. コストベース（コスト × 50）
  const cost = parseInt(card.cost) || 0;
  value += cost * 50;

  // 2. スタッツ効率（モンスターのみ）
  if (card.type === 'monster' && cost > 0) {
    const attack = parseInt(card.attack) || 0;
    const hp = parseInt(card.hp) || 0;
    const statTotal = attack + hp;
    const efficiency = (statTotal / cost) * 0.15;
    value += Math.min(efficiency, 300); // 上限300
  }

  // 3. 効果キーワード評価
  const effectText = card.effect || '';

  // 通常キーワード
  for (const [keyword, points] of Object.entries(EFFECT_KEYWORDS)) {
    const regex = new RegExp(keyword, 'g');
    const matches = effectText.match(regex);
    if (matches) {
      // 同じキーワードが複数回出現した場合は最大1.5倍
      value += points * Math.min(matches.length, 1.5);
    }
  }

  // 正規表現パターン
  for (const { pattern, value: points } of EFFECT_KEYWORDS_REGEX) {
    const matches = effectText.match(pattern);
    if (matches) {
      value += points * Math.min(matches.length, 1.5);
    }
  }

  // 4. カードタイプ補正
  if (card.type === 'field') {
    value += 50;
  } else if (card.type === 'phasecard') {
    value += 40;
  }

  // 5. キーワード能力倍率
  let keywordMult = 1.0;
  const keyword = card.keyword || '';

  for (const [ability, mult] of Object.entries(KEYWORD_ABILITY_MULTIPLIERS)) {
    if (keyword.includes(ability)) {
      keywordMult = Math.max(keywordMult, mult);
    }
  }

  // キーワード能力があるが上記に該当しない場合
  if (keyword && keywordMult === 1.0 && keyword !== 'なし') {
    keywordMult = 1.05;
  }

  return Math.round(value * keywordMult);
};

/**
 * 基礎価値からティアを判定
 * @param {number} baseValue - 基礎価値
 * @returns {string} ティア（S/A/B/C/D）
 */
export const determineTier = (baseValue) => {
  if (baseValue >= TIER_THRESHOLDS.S) return 'S';
  if (baseValue >= TIER_THRESHOLDS.A) return 'A';
  if (baseValue >= TIER_THRESHOLDS.B) return 'B';
  if (baseValue >= TIER_THRESHOLDS.C) return 'C';
  return 'D';
};

/**
 * レアリティ別の価値を計算
 * @param {number} baseValue - 基礎価値
 * @param {string} rarity - レアリティ
 * @returns {number} 最終価値
 */
export const calculateRarityValue = (baseValue, rarity) => {
  const multiplier = RARITY_MULTIPLIERS[rarity] || 1.0;
  return Math.round(baseValue * multiplier);
};

/**
 * カードの全情報を計算
 * @param {Object} card - カードデータ
 * @returns {Object} { baseValue, tier, rarityValues }
 */
export const calculateCardValue = (card) => {
  const baseValue = calculateBaseValue(card);
  const tier = determineTier(baseValue);

  // 各レアリティの価値を計算
  const rarityValues = {};
  for (const rarity of Object.keys(RARITY_MULTIPLIERS)) {
    rarityValues[rarity] = calculateRarityValue(baseValue, rarity);
  }

  return {
    cardId: card.id,
    baseValue,
    tier,
    rarityValues,
  };
};

/**
 * 複数カードの価値を一括計算
 * @param {Object[]} cards - カードデータの配列
 * @returns {Map<string, Object>} カードID -> 価値情報のマップ
 */
export const calculateAllCardValues = (cards) => {
  const valueMap = new Map();
  for (const card of cards) {
    if (card.id) {
      valueMap.set(card.id, calculateCardValue(card));
    }
  }
  return valueMap;
};

// ========================================
// エクスポート
// ========================================

export const valueCalculator = {
  calculateBaseValue,
  determineTier,
  calculateRarityValue,
  calculateCardValue,
  calculateAllCardValues,
};

export default valueCalculator;
