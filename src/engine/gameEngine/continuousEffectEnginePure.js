/**
 * continuousEffectEnginePure - 純粋関数版常時効果エンジン
 *
 * グローバル状態を持たず、フィールドから動的に常時効果を計算する。
 * シミュレーションで使用可能な純粋関数版。
 *
 * @see src/engine/continuousEffects/effectEngine.js - 元の実装
 * @see src/ルール/continuous-effect-system-design.md
 */

import { CONTINUOUS_EFFECT_TYPES } from '../continuousEffects/effectTypes';
import { TARGET_TYPES } from '../continuousEffects/targetTypes';
import { checkCondition } from '../continuousEffects/conditionChecker';
import { calculateValue, setEffectUniqueId } from '../continuousEffects/valueCalculator';

// 効果定義を動的にインポート
let effectDefinitions = null;
let phaseCardEffectsByStage = null;

/**
 * 効果定義を遅延読み込み
 */
function loadEffectDefinitions() {
  if (!effectDefinitions) {
    try {
      const defs = require('../continuousEffects/effectDefinitions');
      effectDefinitions = defs.effectDefinitions || {};
      phaseCardEffectsByStage = defs.phaseCardEffectsByStage || {};
    } catch (e) {
      console.warn('Failed to load effect definitions:', e);
      effectDefinitions = {};
      phaseCardEffectsByStage = {};
    }
  }
}

// ========================================
// フィールドから効果を収集
// ========================================

/**
 * フィールド上のカードから常時効果を収集
 * @param {Object} state - GameState
 * @returns {Array} 効果エントリーの配列 [{ card, owner, effects }]
 */
function collectActiveEffects(state) {
  loadEffectDefinitions();
  const entries = [];

  // P1のフィールドカード
  if (state.p1.fieldCard) {
    const effects = getCardEffects(state.p1.fieldCard, 1);
    if (effects.length > 0) {
      entries.push({ card: state.p1.fieldCard, owner: 1, effects });
    }
  }

  // P2のフィールドカード
  if (state.p2.fieldCard) {
    const effects = getCardEffects(state.p2.fieldCard, 2);
    if (effects.length > 0) {
      entries.push({ card: state.p2.fieldCard, owner: 2, effects });
    }
  }

  // P1のフィールドモンスター
  state.p1.field.forEach((monster, idx) => {
    if (monster) {
      const effects = getCardEffects(monster, 1);
      if (effects.length > 0) {
        entries.push({ card: monster, owner: 1, effects, slotIndex: idx });
      }
    }
  });

  // P2のフィールドモンスター
  state.p2.field.forEach((monster, idx) => {
    if (monster) {
      const effects = getCardEffects(monster, 2);
      if (effects.length > 0) {
        entries.push({ card: monster, owner: 2, effects, slotIndex: idx });
      }
    }
  });

  // P1のフェイズカード
  if (state.p1.phaseCard) {
    const stage = state.p1.phaseCard.chargeCount || 0;
    const effects = getPhaseCardEffects(state.p1.phaseCard, 1, stage);
    if (effects.length > 0) {
      entries.push({ card: state.p1.phaseCard, owner: 1, effects, stage });
    }
  }

  // P2のフェイズカード
  if (state.p2.phaseCard) {
    const stage = state.p2.phaseCard.chargeCount || 0;
    const effects = getPhaseCardEffects(state.p2.phaseCard, 2, stage);
    if (effects.length > 0) {
      entries.push({ card: state.p2.phaseCard, owner: 2, effects, stage });
    }
  }

  return entries;
}

/**
 * カードの常時効果定義を取得
 * @param {Object} card - カード
 * @param {number} owner - オーナー
 * @returns {Array} 効果定義配列
 */
function getCardEffects(card, owner) {
  if (!card || !card.id) return [];

  const definitions = effectDefinitions[card.id];
  if (!definitions) return [];

  return definitions.map((def) => ({
    ...def,
    uniqueId: card.uniqueId,
    cardId: card.id,
    owner,
  }));
}

/**
 * フェイズカードの段階別常時効果定義を取得
 * @param {Object} card - フェイズカード
 * @param {number} owner - オーナー
 * @param {number} stage - 段階
 * @returns {Array} 効果定義配列
 */
function getPhaseCardEffects(card, owner, stage) {
  if (!card || !card.id) return [];

  const stageEffects = phaseCardEffectsByStage[card.id];
  if (!stageEffects) return [];

  const definitions = stageEffects[stage];
  if (!definitions) return [];

  return definitions.map((def) => ({
    ...def,
    uniqueId: card.uniqueId,
    cardId: card.id,
    owner,
    stage,
  }));
}

// ========================================
// ターゲットチェック
// ========================================

/**
 * 効果のターゲットをチェック
 * @param {Object} effect - 効果定義
 * @param {Object} targetMonster - 対象モンスター
 * @param {number} effectOwner - 効果オーナー
 * @param {Object} state - GameState
 * @returns {boolean} ターゲットとして有効か
 */
function checkTarget(effect, targetMonster, effectOwner, state) {
  if (!effect.target) return true;
  if (!targetMonster) return false;

  const targetOwner = targetMonster.owner || (
    state.p1.field.some((m) => m && m.uniqueId === targetMonster.uniqueId) ? 1 : 2
  );
  const isOwnMonster = targetOwner === effectOwner;

  switch (effect.target) {
    case TARGET_TYPES.SELF_CARD:
      return targetMonster.uniqueId === effect.uniqueId;

    case TARGET_TYPES.SELF_MONSTERS:
      return isOwnMonster;

    case TARGET_TYPES.OPPONENT_MONSTERS:
      return !isOwnMonster;

    case TARGET_TYPES.ALL_MONSTERS:
      return true;

    case TARGET_TYPES.SELF_MONSTERS_EXCEPT_SELF:
      return isOwnMonster && targetMonster.uniqueId !== effect.uniqueId;

    default:
      return true;
  }
}

// ========================================
// 計算関数（純粋関数版）
// ========================================

/**
 * 攻撃力修正値を計算（純粋関数版）
 * @param {Object} state - GameState
 * @param {Object} monster - 対象モンスター
 * @returns {number} 修正値
 */
export function calculateAttackModifierPure(state, monster) {
  const entries = collectActiveEffects(state);
  let totalModifier = 0;

  const context = {
    currentPlayer: state.currentPlayer,
    p1Field: state.p1.field,
    p2Field: state.p2.field,
    p1Life: state.p1.life,
    p2Life: state.p2.life,
  };

  for (const { card, owner, effects } of entries) {
    const effectContext = { ...context, effectOwner: owner };

    for (const effect of effects) {
      if (effect.type !== CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER) continue;

      if (!checkTarget(effect, monster, owner, state)) continue;
      if (!checkCondition(effect.condition, monster, effectContext)) continue;

      const effectWithId = setEffectUniqueId(effect, card.uniqueId);
      totalModifier += calculateValue(effectWithId, effectContext);
    }
  }

  return totalModifier;
}

/**
 * HP修正値を計算（純粋関数版）
 * @param {Object} state - GameState
 * @param {Object} monster - 対象モンスター
 * @returns {number} 修正値
 */
export function calculateHPModifierPure(state, monster) {
  const entries = collectActiveEffects(state);
  let totalModifier = 0;

  const context = {
    currentPlayer: state.currentPlayer,
    p1Field: state.p1.field,
    p2Field: state.p2.field,
    p1Life: state.p1.life,
    p2Life: state.p2.life,
  };

  for (const { card, owner, effects } of entries) {
    const effectContext = { ...context, effectOwner: owner };

    for (const effect of effects) {
      if (effect.type !== CONTINUOUS_EFFECT_TYPES.HP_MODIFIER) continue;

      if (!checkTarget(effect, monster, owner, state)) continue;
      if (!checkCondition(effect.condition, monster, effectContext)) continue;

      const effectWithId = setEffectUniqueId(effect, card.uniqueId);
      totalModifier += calculateValue(effectWithId, effectContext);
    }
  }

  return totalModifier;
}

/**
 * 召喚コスト修正値を計算（純粋関数版）
 * @param {Object} state - GameState
 * @param {Object} cardToSummon - 召喚するカード
 * @param {number} summoner - 召喚者（1 or 2）
 * @returns {number} 修正値
 */
export function calculateSummonCostModifierPure(state, cardToSummon, summoner) {
  const entries = collectActiveEffects(state);
  let totalModifier = 0;

  const context = {
    currentPlayer: state.currentPlayer,
    p1Field: state.p1.field,
    p2Field: state.p2.field,
    p1Life: state.p1.life,
    p2Life: state.p2.life,
  };

  for (const { card, owner, effects } of entries) {
    // 自分のカードからのコスト修正のみ
    if (owner !== summoner) continue;

    const effectContext = { ...context, effectOwner: owner };

    for (const effect of effects) {
      if (effect.type !== CONTINUOUS_EFFECT_TYPES.SUMMON_COST_MODIFIER) continue;

      // 召喚するカードに対する条件チェック
      if (!checkCondition(effect.condition, cardToSummon, effectContext)) continue;

      const effectWithId = setEffectUniqueId(effect, card.uniqueId);
      totalModifier += calculateValue(effectWithId, effectContext);
    }
  }

  return totalModifier;
}

/**
 * ダメージ軽減値を計算（純粋関数版）
 * @param {Object} state - GameState
 * @param {Object} target - ダメージを受ける対象
 * @param {string} damageType - ダメージタイプ ('battle' | 'effect' | 'direct')
 * @returns {number} 軽減値（0-1の割合または固定値）
 */
export function calculateDamageReductionPure(state, target, damageType = 'battle') {
  const entries = collectActiveEffects(state);
  let totalReduction = 0;

  const context = {
    currentPlayer: state.currentPlayer,
    p1Field: state.p1.field,
    p2Field: state.p2.field,
    p1Life: state.p1.life,
    p2Life: state.p2.life,
  };

  for (const { card, owner, effects } of entries) {
    const effectContext = { ...context, effectOwner: owner };

    for (const effect of effects) {
      if (effect.type !== CONTINUOUS_EFFECT_TYPES.DAMAGE_REDUCTION) continue;

      // ダメージタイプチェック
      if (effect.damageType && effect.damageType !== damageType) continue;

      if (!checkTarget(effect, target, owner, state)) continue;
      if (!checkCondition(effect.condition, target, effectContext)) continue;

      const effectWithId = setEffectUniqueId(effect, card.uniqueId);
      totalReduction += calculateValue(effectWithId, effectContext);
    }
  }

  return totalReduction;
}

/**
 * 召喚時バフを取得（純粋関数版）
 * @param {Object} state - GameState
 * @param {Object} monster - 召喚されたモンスター
 * @param {number} summoner - 召喚者
 * @returns {Object} { atkBuff: number, hpBuff: number }
 */
export function getSummonBuffsPure(state, monster, summoner) {
  const entries = collectActiveEffects(state);
  let atkBuff = 0;
  let hpBuff = 0;

  const context = {
    currentPlayer: state.currentPlayer,
    p1Field: state.p1.field,
    p2Field: state.p2.field,
    p1Life: state.p1.life,
    p2Life: state.p2.life,
  };

  for (const { card, owner, effects } of entries) {
    // 自分のカードからのバフのみ
    if (owner !== summoner) continue;

    const effectContext = { ...context, effectOwner: owner };

    for (const effect of effects) {
      if (effect.type !== CONTINUOUS_EFFECT_TYPES.ON_SUMMON_BUFF) continue;

      if (!checkCondition(effect.condition, monster, effectContext)) continue;

      const effectWithId = setEffectUniqueId(effect, card.uniqueId);
      const buffValue = calculateValue(effectWithId, effectContext);

      if (effect.buffType === 'ATK') {
        atkBuff += buffValue;
      } else if (effect.buffType === 'HP') {
        hpBuff += buffValue;
      } else if (effect.buffType === 'BOTH') {
        atkBuff += buffValue;
        hpBuff += buffValue;
      }
    }
  }

  return { atkBuff, hpBuff };
}

/**
 * 攻撃可能かチェック（純粋関数版）
 * @param {Object} state - GameState
 * @param {Object} monster - 攻撃するモンスター
 * @returns {boolean} 攻撃可能か
 */
export function canAttackPure(state, monster) {
  const entries = collectActiveEffects(state);

  const context = {
    currentPlayer: state.currentPlayer,
    p1Field: state.p1.field,
    p2Field: state.p2.field,
    p1Life: state.p1.life,
    p2Life: state.p2.life,
  };

  for (const { card, owner, effects } of entries) {
    const effectContext = { ...context, effectOwner: owner };

    for (const effect of effects) {
      if (effect.type !== CONTINUOUS_EFFECT_TYPES.ATTACK_RESTRICTION) continue;

      if (!checkTarget(effect, monster, owner, state)) continue;
      if (!checkCondition(effect.condition, monster, effectContext)) continue;

      // 攻撃制限が適用される
      return false;
    }
  }

  return true;
}

/**
 * 魔法カードが無効化されるかチェック（純粋関数版）
 * @param {Object} state - GameState
 * @param {Object} magicCard - 使用する魔法カード
 * @param {number} caster - 使用者
 * @returns {boolean} 無効化されるか
 */
export function isMagicNegatedPure(state, magicCard, caster) {
  const entries = collectActiveEffects(state);

  const context = {
    currentPlayer: state.currentPlayer,
    p1Field: state.p1.field,
    p2Field: state.p2.field,
    p1Life: state.p1.life,
    p2Life: state.p2.life,
  };

  for (const { card, owner, effects } of entries) {
    // 相手の効果のみ
    if (owner === caster) continue;

    const effectContext = { ...context, effectOwner: owner };

    for (const effect of effects) {
      if (effect.type !== CONTINUOUS_EFFECT_TYPES.MAGIC_NEGATION) continue;

      if (!checkCondition(effect.condition, magicCard, effectContext)) continue;

      return true;
    }
  }

  return false;
}

// ========================================
// ユーティリティ
// ========================================

/**
 * 全効果エントリーを取得（デバッグ用）
 * @param {Object} state - GameState
 * @returns {Array} 効果エントリー配列
 */
export function getAllActiveEffectsPure(state) {
  return collectActiveEffects(state);
}

export default {
  calculateAttackModifierPure,
  calculateHPModifierPure,
  calculateSummonCostModifierPure,
  calculateDamageReductionPure,
  getSummonBuffsPure,
  canAttackPure,
  isMagicNegatedPure,
  getAllActiveEffectsPure,
};
