/**
 * 常時効果システム: エフェクトエンジン
 *
 * このファイルは常時効果を管理・計算するメインエンジンを提供します。
 * カードの登録/解除、各種計算メソッドを実装しています。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

import { CONTINUOUS_EFFECT_TYPES } from './effectTypes';
import { TARGET_TYPES } from './targetTypes';
import { checkCondition } from './conditionChecker';
import { calculateValue, setEffectUniqueId } from './valueCalculator';

// 効果定義は後で effectDefinitions/index.js からインポート
// 循環参照を避けるため、動的にインポートする方式を採用
let effectDefinitions = {};

/**
 * 効果定義を設定（外部から注入）
 * @param {Object} definitions - 効果定義オブジェクト
 */
export const setEffectDefinitions = (definitions) => {
  effectDefinitions = definitions;
};

/**
 * 常時効果エンジンクラス
 */
class ContinuousEffectEngine {
  constructor() {
    /**
     * アクティブな効果を管理するMap
     * uniqueId => { card, owner, effects[] }
     */
    this.activeEffects = new Map();
  }

  // ========================================
  // ライフサイクル管理
  // ========================================

  /**
   * カードの常時効果を登録
   * @param {Object} card - カードオブジェクト
   * @param {number} owner - オーナー（1 or 2）
   */
  register(card, owner) {
    if (!card || !card.uniqueId) {
      console.warn('Cannot register card without uniqueId');
      return;
    }

    // 効果定義を取得
    const definitions = effectDefinitions[card.id];
    if (!definitions || definitions.length === 0) {
      // このカードには常時効果がない
      return;
    }

    // 効果にメタ情報を付与
    const effects = definitions.map((def) => ({
      ...def,
      uniqueId: card.uniqueId,
      cardId: card.id,
      owner,
      usedThisTurn: false,
    }));

    this.activeEffects.set(card.uniqueId, { card, owner, effects });
  }

  /**
   * カードの常時効果を解除
   * @param {string} uniqueId - カードのuniqueId
   */
  unregister(uniqueId) {
    this.activeEffects.delete(uniqueId);
  }

  /**
   * 全効果をクリア（ゲームリセット時）
   */
  clear() {
    this.activeEffects.clear();
  }

  /**
   * ターンごとの使用フラグをリセット
   */
  resetTurnFlags() {
    for (const [, { effects }] of this.activeEffects) {
      effects.forEach((effect) => {
        effect.usedThisTurn = false;
      });
    }
  }

  // ========================================
  // ステータス修正計算
  // ========================================

  /**
   * 攻撃力修正値を計算
   * @param {Object} monster - 対象モンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値（正: アップ, 負: ダウン）
   */
  calculateAttackModifier(monster, context) {
    let totalModifier = 0;

    for (const [uniqueId, { card, owner, effects }] of this.activeEffects) {
      // コンテキストにeffectOwnerを追加
      const effectContext = { ...context, effectOwner: owner };

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER) continue;

        // ターゲットチェック
        if (!this.checkTarget(effect, monster, owner, context)) continue;

        // 条件チェック
        if (!checkCondition(effect.condition, monster, effectContext)) continue;

        // 値計算
        const effectWithId = setEffectUniqueId(effect, uniqueId);
        totalModifier += calculateValue(effectWithId, effectContext);
      }
    }

    return totalModifier;
  }

  /**
   * HP修正値を計算
   * @param {Object} monster - 対象モンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値
   */
  calculateHPModifier(monster, context) {
    let totalModifier = 0;

    for (const [uniqueId, { owner, effects }] of this.activeEffects) {
      const effectContext = { ...context, effectOwner: owner };

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.HP_MODIFIER) continue;

        if (!this.checkTarget(effect, monster, owner, context)) continue;
        if (!checkCondition(effect.condition, monster, effectContext)) continue;

        const effectWithId = setEffectUniqueId(effect, uniqueId);
        totalModifier += calculateValue(effectWithId, effectContext);
      }
    }

    return totalModifier;
  }

  // ========================================
  // ダメージ関連計算
  // ========================================

  /**
   * ダメージ軽減値を計算
   * @param {Object} target - ダメージを受けるモンスター
   * @param {string} damageSource - ダメージ源 ('battle' | 'effect')
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 軽減値（Infinity = 完全無効）
   */
  calculateDamageReduction(target, damageSource, context) {
    let totalReduction = 0;

    for (const [uniqueId, { owner, effects }] of this.activeEffects) {
      const effectContext = { ...context, effectOwner: owner };

      for (const effect of effects) {
        // ダメージ無効チェック
        if (effect.type === CONTINUOUS_EFFECT_TYPES.DAMAGE_IMMUNITY) {
          if (!this.checkTarget(effect, target, owner, context)) continue;
          if (!checkCondition(effect.condition, target, effectContext)) continue;

          // ダメージ源のチェック
          if (effect.damageSource && effect.damageSource !== 'all') {
            if (effect.damageSource !== damageSource) continue;
          }

          // 完全無効
          return Infinity;
        }

        // ダメージ軽減チェック
        if (effect.type === CONTINUOUS_EFFECT_TYPES.DAMAGE_REDUCTION) {
          if (!this.checkTarget(effect, target, owner, context)) continue;
          if (!checkCondition(effect.condition, target, effectContext)) continue;

          // 使用回数制限チェック
          if (effect.usesPerTurn && effect.usedThisTurn) continue;

          totalReduction += effect.value || 0;

          // 使用フラグを立てる
          if (effect.usesPerTurn) {
            effect.usedThisTurn = true;
          }
        }
      }
    }

    return totalReduction;
  }

  /**
   * 与ダメージ修正値を計算
   * @param {Object} attacker - 攻撃モンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値
   */
  calculateDamageDealtModifier(attacker, context) {
    let totalModifier = 0;

    for (const [, { owner, effects }] of this.activeEffects) {
      const effectContext = { ...context, effectOwner: owner };

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.DAMAGE_DEALT_MODIFIER) continue;

        // 自分のモンスターの与ダメージのみ対象
        if (attacker.owner !== owner) continue;

        if (!checkCondition(effect.condition, attacker, effectContext)) continue;

        totalModifier += effect.value || 0;
      }
    }

    return totalModifier;
  }

  /**
   * 被ダメージ増加値を計算（相手に対して）
   * @param {Object} target - ダメージを受けるモンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 増加値
   */
  calculateDamageReceivedModifier(target, context) {
    let totalModifier = 0;

    for (const [, { owner, effects }] of this.activeEffects) {
      const effectContext = { ...context, effectOwner: owner };

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.DAMAGE_RECEIVED_MODIFIER) continue;

        // 相手のモンスターのみ対象
        if (target.owner === owner) continue;

        if (!checkCondition(effect.condition, target, effectContext)) continue;

        totalModifier += effect.value || 0;
      }
    }

    return totalModifier;
  }

  // ========================================
  // コスト修正計算
  // ========================================

  /**
   * 召喚コスト修正値を計算
   * @param {Object} card - 召喚するカード
   * @param {number} summoner - 召喚するプレイヤー（1 or 2）
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値（正: 増加, 負: 軽減）
   */
  calculateSummonCostModifier(card, summoner, context) {
    let totalModifier = 0;

    for (const [, { owner, effects }] of this.activeEffects) {
      const effectContext = { ...context, effectOwner: owner };

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.SUMMON_COST_MODIFIER) continue;

        // ターゲットチェック
        if (effect.target === TARGET_TYPES.SELF_SUMMON && owner !== summoner) continue;
        if (effect.target === TARGET_TYPES.OPPONENT_SUMMON && owner === summoner) continue;

        // 条件チェック（カードに対して）
        if (!checkCondition(effect.condition, card, effectContext)) continue;

        totalModifier += effect.value || 0;
      }
    }

    return totalModifier;
  }

  /**
   * 魔法カードコスト修正値を計算
   * @param {Object} magicCard - 発動する魔法カード
   * @param {number} caster - 発動するプレイヤー（1 or 2）
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値
   */
  calculateMagicCostModifier(magicCard, caster, context) {
    let totalModifier = 0;

    for (const [, { owner, effects }] of this.activeEffects) {
      const effectContext = { ...context, effectOwner: owner };

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.MAGIC_COST_MODIFIER) continue;

        // ターゲットチェック
        if (effect.target === TARGET_TYPES.SELF_MAGIC && owner !== caster) continue;
        if (effect.target === TARGET_TYPES.OPPONENT_MAGIC && owner === caster) continue;

        // 条件チェック（魔法カードに対して）
        if (!checkCondition(effect.condition, magicCard, effectContext)) continue;

        totalModifier += effect.value || 0;
      }
    }

    return totalModifier;
  }

  // ========================================
  // 制限チェック
  // ========================================

  /**
   * モンスターが攻撃可能かチェック
   * @param {Object} monster - チェック対象モンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {boolean} 攻撃可能ならtrue
   */
  canAttack(monster, context) {
    for (const [, { owner, effects }] of this.activeEffects) {
      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.ATTACK_RESTRICTION) continue;

        // SELF_CARD の場合、そのカード自身のみ
        if (effect.target === TARGET_TYPES.SELF_CARD) {
          if (monster.uniqueId === effect.uniqueId) {
            return false;
          }
        }

        // SELF_MONSTERS の場合、オーナーの全モンスター
        if (effect.target === TARGET_TYPES.SELF_MONSTERS) {
          if (monster.owner === owner) {
            const effectContext = { ...context, effectOwner: owner };
            if (checkCondition(effect.condition, monster, effectContext)) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * SP制限をチェック
   * @param {number} player - プレイヤー（1 or 2）
   * @param {Object} context - ゲームコンテキスト
   * @returns {Object|null} SP制限情報 または null
   */
  checkSPRestriction(player, context) {
    for (const [, { owner, effects }] of this.activeEffects) {
      if (owner !== player) continue;

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.SP_RESTRICTION) continue;

        return {
          restriction: effect.restriction || 'ALL_RESTED',
          cardId: effect.cardId,
        };
      }
    }

    return null;
  }

  // ========================================
  // 無効化チェック
  // ========================================

  /**
   * 魔法カードを無効化できるかチェック（無効化も実行）
   * @param {Object} magicCard - 発動された魔法カード
   * @param {number} caster - 発動したプレイヤー（1 or 2）
   * @param {Object} context - ゲームコンテキスト
   * @returns {boolean} 無効化されたらtrue
   */
  tryNegateMagic(magicCard, caster, context) {
    for (const [, { owner, effects }] of this.activeEffects) {
      // 相手の魔法のみ無効化
      if (owner === caster) continue;

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.MAGIC_NEGATION) continue;

        // 使用回数制限チェック
        if (effect.usesPerTurn && effect.usedThisTurn) continue;

        // 条件チェック
        const effectContext = { ...context, effectOwner: owner };
        if (!checkCondition(effect.condition, magicCard, effectContext)) continue;

        // 無効化成功
        if (effect.usesPerTurn) {
          effect.usedThisTurn = true;
        }

        return true;
      }
    }

    return false;
  }

  /**
   * 技を無効化できるかチェック（無効化も実行）
   * @param {string} skillType - 技タイプ ('basic' | 'advanced')
   * @param {number} skillUser - 技を使用したプレイヤー（1 or 2）
   * @param {Object} context - ゲームコンテキスト
   * @returns {boolean} 無効化されたらtrue
   */
  tryNegateSkill(skillType, skillUser, context) {
    for (const [, { owner, effects }] of this.activeEffects) {
      // 相手の技のみ無効化
      if (owner === skillUser) continue;

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.SKILL_NEGATION) continue;

        // 技タイプチェック
        if (effect.skillType && effect.skillType !== 'all') {
          if (effect.skillType !== skillType) continue;
        }

        // 使用回数制限チェック
        if (effect.usesPerTurn && effect.usedThisTurn) continue;

        // 条件チェック
        const effectContext = { ...context, effectOwner: owner };
        if (effect.condition && !checkCondition(effect.condition, {}, effectContext)) continue;

        // 無効化成功
        if (effect.usesPerTurn) {
          effect.usedThisTurn = true;
        }

        return true;
      }
    }

    return false;
  }

  // ========================================
  // 召喚連動効果
  // ========================================

  /**
   * 召喚時バフを取得
   * @param {Object} summonedMonster - 召喚されたモンスター
   * @param {number} summoner - 召喚したプレイヤー（1 or 2）
   * @param {Object} context - ゲームコンテキスト
   * @returns {Object} 適用されたバフ情報 { atkBuff, hpBuff }
   */
  getSummonBuffs(summonedMonster, summoner, context) {
    let atkBuff = 0;
    let hpBuff = 0;

    for (const [, { owner, effects }] of this.activeEffects) {
      // 自分のモンスター召喚時のみ
      if (owner !== summoner) continue;

      const effectContext = { ...context, effectOwner: owner };

      for (const effect of effects) {
        if (effect.type !== CONTINUOUS_EFFECT_TYPES.ON_SUMMON_BUFF) continue;

        // 条件チェック
        if (!checkCondition(effect.condition, summonedMonster, effectContext)) continue;

        // バフタイプに応じて加算
        if (effect.statType === 'atk' || effect.statType === 'attack') {
          atkBuff += effect.value || 0;
        } else if (effect.statType === 'hp') {
          hpBuff += effect.value || 0;
        }
      }
    }

    return { atkBuff, hpBuff };
  }

  // ========================================
  // ターゲットチェック
  // ========================================

  /**
   * ターゲットチェック
   * @param {Object} effect - 効果定義
   * @param {Object} target - チェック対象
   * @param {number} effectOwner - 効果のオーナー
   * @param {Object} context - ゲームコンテキスト
   * @returns {boolean}
   */
  checkTarget(effect, target, effectOwner, context) {
    const targetType = effect.target;

    switch (targetType) {
      case TARGET_TYPES.SELF_CARD:
        // このカード自身
        return target.uniqueId === effect.uniqueId;

      case TARGET_TYPES.SELF_MONSTERS:
        // 自分のモンスター
        return target.owner === effectOwner;

      case TARGET_TYPES.OPPONENT_MONSTERS:
        // 相手のモンスター
        return target.owner !== effectOwner;

      case TARGET_TYPES.ALL_MONSTERS:
        // 全モンスター
        return true;

      default:
        // 未知のターゲットタイプはtrueを返す
        return true;
    }
  }

  // ========================================
  // デバッグ・ユーティリティ
  // ========================================

  /**
   * 登録されている全効果を取得（デバッグ用）
   * @returns {Map}
   */
  getActiveEffects() {
    return this.activeEffects;
  }

  /**
   * 特定カードの効果を取得
   * @param {string} uniqueId - カードのuniqueId
   * @returns {Array} 効果配列
   */
  getEffectsForCard(uniqueId) {
    const entry = this.activeEffects.get(uniqueId);
    return entry ? entry.effects : [];
  }

  /**
   * 登録されているカード数を取得
   * @returns {number}
   */
  getRegisteredCount() {
    return this.activeEffects.size;
  }

  /**
   * デバッグ情報をログ出力
   */
  debugLog() {
    console.log('=== Continuous Effect Engine Debug ===');
    console.log(`Registered cards: ${this.activeEffects.size}`);
    for (const [uniqueId, { card, owner, effects }] of this.activeEffects) {
      console.log(`  ${card.name} (${card.id}) - Owner: P${owner}`);
      effects.forEach((e, i) => {
        console.log(`    [${i}] ${e.type} - usedThisTurn: ${e.usedThisTurn}`);
      });
    }
  }
}

// シングルトンインスタンスをエクスポート
export const continuousEffectEngine = new ContinuousEffectEngine();

// クラス自体もエクスポート（テスト用）
export { ContinuousEffectEngine };
