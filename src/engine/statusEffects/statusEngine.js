/**
 * 状態異常システム: メインエンジン
 *
 * 状態異常の付与、解除、効果計算を管理するエンジン。
 *
 * @see src/ルール/status-effect-system-design.md
 */

import {
  STATUS_EFFECT_TYPES,
  STATUS_EFFECT_METADATA,
  getStatusDisplayName,
} from './statusTypes';

/**
 * 状態異常エンジンクラス
 */
class StatusEffectEngine {
  /**
   * システムをクリア（ゲーム初期化時）
   */
  clear() {
    // ステートレスなエンジンなので特に何もしない
    // モンスターの状態異常はモンスターオブジェクト内で管理
  }

  // ========================================
  // モンスター状態異常: ライフサイクル管理
  // ========================================

  /**
   * モンスターに状態異常を付与
   * @param {Object} monster - 対象モンスター
   * @param {string} statusType - 状態異常タイプ
   * @param {Object} options - オプション
   * @returns {Object} { success: boolean, reason?: string }
   */
  applyStatus(monster, statusType, options = {}) {
    if (!monster) {
      return { success: false, reason: '対象が存在しません' };
    }

    // statusEffects配列がなければ初期化
    if (!monster.statusEffects) {
      monster.statusEffects = [];
    }

    const meta = STATUS_EFFECT_METADATA[statusType];
    if (!meta) {
      return { success: false, reason: '不明な状態異常タイプです' };
    }

    // 重複チェック（同じ状態異常は上書き）
    const existingIndex = monster.statusEffects.findIndex(s => s.type === statusType);
    if (existingIndex !== -1) {
      // 上書き
      monster.statusEffects.splice(existingIndex, 1);
    }

    // 状態異常オブジェクトを作成
    const statusEffect = {
      id: `${statusType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: statusType,
      source: options.source || null,
      sourceName: options.sourceName || null,
      appliedTurn: options.currentTurn || 0,
      duration: options.duration !== undefined ? options.duration : (meta.defaultDuration || 1),
      removeChance: options.removeChance !== undefined ? options.removeChance : (meta.defaultRemoveChance || 0),
      removeOnDamage: options.removeOnDamage || false,
      usageCount: 0,
      maxUsage: options.maxUsage || meta.maxUsage || -1, // -1 = 無制限
      value: options.value || 0,
      stackable: options.stackable || false,
      // エンドフェイズ回数ベースの解除（「次のターン終了時まで」= 2）
      expiresAfterEndPhases: options.expiresAfterEndPhases !== undefined ? options.expiresAfterEndPhases : null,
    };

    monster.statusEffects.push(statusEffect);

    return { success: true, statusEffect };
  }

  /**
   * モンスターから状態異常を解除
   * @param {Object} monster - 対象モンスター
   * @param {string} statusType - 状態異常タイプ（省略で全解除）
   * @returns {Array} 解除された状態異常
   */
  removeStatus(monster, statusType = null) {
    if (!monster || !monster.statusEffects) {
      return [];
    }

    let removed = [];

    if (statusType) {
      // 特定の状態異常を解除
      const index = monster.statusEffects.findIndex(s => s.type === statusType);
      if (index !== -1) {
        removed = monster.statusEffects.splice(index, 1);
      }
    } else {
      // 全状態異常を解除
      removed = [...monster.statusEffects];
      monster.statusEffects = [];
    }

    return removed;
  }

  /**
   * ターン開始時の処理
   * - 確率解除判定（眠り、凍結など）
   * @param {Object} monster - 対象モンスター
   * @returns {Object} { monster: Object, removedEffects: Array }
   */
  processTurnStart(monster) {
    if (!monster || !monster.statusEffects || monster.statusEffects.length === 0) {
      return { monster, removedEffects: [] };
    }

    const removedEffects = [];
    const remainingEffects = [];

    monster.statusEffects.forEach(status => {
      // 確率解除判定
      if (status.removeChance > 0 && Math.random() < status.removeChance) {
        removedEffects.push(status);
      } else {
        remainingEffects.push(status);
      }
    });

    // イミュータブルに更新
    const updatedMonster = {
      ...monster,
      statusEffects: remainingEffects,
    };

    return { monster: updatedMonster, removedEffects };
  }

  /**
   * エンドフェイズ時の処理
   * - 持続ターン減少
   * - エンドフェイズ回数カウントダウン（expiresAfterEndPhases）
   * - 期限切れ解除
   * - 深蝕の攻撃力減少
   * @param {Object} monster - 対象モンスター
   * @returns {Object} { monster: Object, removedEffects: Array, atkReduction: number }
   */
  processEndPhase(monster) {
    if (!monster || !monster.statusEffects || monster.statusEffects.length === 0) {
      return { monster, removedEffects: [], atkReduction: 0 };
    }

    const removedEffects = [];
    const remainingEffects = [];
    let atkReduction = 0;
    let newAttack = monster.currentAttack;

    monster.statusEffects.forEach(status => {
      // 深蝕の処理
      if (status.type === STATUS_EFFECT_TYPES.CORRODE) {
        const atkDown = status.value || 100;
        newAttack = Math.max(0, newAttack - atkDown);
        atkReduction += atkDown;
      }

      // エンドフェイズ回数ベースの解除判定
      if (status.expiresAfterEndPhases !== null && status.expiresAfterEndPhases !== undefined) {
        const newEndPhases = status.expiresAfterEndPhases - 1;
        if (newEndPhases <= 0) {
          // 期限切れ
          removedEffects.push(status);
        } else {
          remainingEffects.push({ ...status, expiresAfterEndPhases: newEndPhases });
        }
        return; // expiresAfterEndPhasesが設定されている場合はdurationは無視
      }

      // 持続ターン減少（duration > 0 の場合のみ）
      if (status.duration > 0) {
        const newDuration = status.duration - 1;
        if (newDuration <= 0) {
          // 期限切れ
          removedEffects.push(status);
        } else {
          remainingEffects.push({ ...status, duration: newDuration });
        }
      }
      // duration === 0 はターン終了時まで（このターンで解除）
      else if (status.duration === 0) {
        removedEffects.push(status);
      }
      // duration === -1 は永続（解除しない）
      else {
        remainingEffects.push(status);
      }
    });

    // イミュータブルに更新
    const updatedMonster = {
      ...monster,
      currentAttack: newAttack,
      statusEffects: remainingEffects,
    };

    return { monster: updatedMonster, removedEffects, atkReduction };
  }

  // ========================================
  // 状態チェック
  // ========================================

  /**
   * 特定の状態異常を持っているか
   * @param {Object} monster - 対象モンスター
   * @param {string} statusType - 状態異常タイプ
   * @returns {boolean}
   */
  hasStatus(monster, statusType) {
    return monster?.statusEffects?.some(s => s.type === statusType) || false;
  }

  /**
   * 状態異常一覧を取得
   * @param {Object} monster - 対象モンスター
   * @returns {Array} 状態異常配列
   */
  getActiveStatuses(monster) {
    return monster?.statusEffects || [];
  }

  /**
   * 攻撃可能かチェック
   * @param {Object} monster - 対象モンスター
   * @returns {boolean}
   */
  canAttack(monster) {
    if (!monster) return false;

    // 眠り、凍結、行動不能
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SLEEP)) return false;
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.FREEZE)) return false;
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.STUN)) return false;

    return true;
  }

  /**
   * 技使用可能かチェック
   * @param {Object} monster - 対象モンスター
   * @returns {boolean}
   */
  canUseSkill(monster) {
    if (!monster) return false;

    // 眠り、行動不能、効果無効、雷撃
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SLEEP)) return false;
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.STUN)) return false;
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SILENCE)) return false;
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.THUNDER)) return false;

    return true;
  }

  /**
   * トリガー発動可能かチェック
   * @param {Object} monster - 対象モンスター
   * @returns {boolean}
   */
  canUseTrigger(monster) {
    if (!monster) return false;

    // 眠り、効果無効
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SLEEP)) return false;
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SILENCE)) return false;

    return true;
  }

  /**
   * 行動をブロックしている状態異常名を取得
   * @param {Object} monster - 対象モンスター
   * @param {string} actionType - 'attack' または 'skill'
   * @returns {string} 状態異常の表示名
   */
  getBlockingStatusName(monster, actionType) {
    if (!monster) return '不明な状態';

    if (actionType === 'attack') {
      if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SLEEP)) return getStatusDisplayName(STATUS_EFFECT_TYPES.SLEEP);
      if (this.hasStatus(monster, STATUS_EFFECT_TYPES.FREEZE)) return getStatusDisplayName(STATUS_EFFECT_TYPES.FREEZE);
      if (this.hasStatus(monster, STATUS_EFFECT_TYPES.STUN)) return getStatusDisplayName(STATUS_EFFECT_TYPES.STUN);
    } else if (actionType === 'skill') {
      if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SLEEP)) return getStatusDisplayName(STATUS_EFFECT_TYPES.SLEEP);
      if (this.hasStatus(monster, STATUS_EFFECT_TYPES.STUN)) return getStatusDisplayName(STATUS_EFFECT_TYPES.STUN);
      if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SILENCE)) return getStatusDisplayName(STATUS_EFFECT_TYPES.SILENCE);
      if (this.hasStatus(monster, STATUS_EFFECT_TYPES.THUNDER)) return getStatusDisplayName(STATUS_EFFECT_TYPES.THUNDER);
    }

    return '不明な状態';
  }

  // 後方互換性のための古い形式のメソッド（オブジェクト形式を返す）
  canAttackWithReason(monster) {
    if (!monster) return { canAttack: false, reason: '対象が存在しません' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SLEEP)) return { canAttack: false, reason: '眠り状態' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.FREEZE)) return { canAttack: false, reason: '凍結状態' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.STUN)) return { canAttack: false, reason: '行動不能状態' };
    return { canAttack: true };
  }

  canUseSkillWithReason(monster) {
    if (!monster) return { canUseSkill: false, reason: '対象が存在しません' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SLEEP)) return { canUseSkill: false, reason: '眠り状態' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.STUN)) return { canUseSkill: false, reason: '行動不能状態' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SILENCE)) return { canUseSkill: false, reason: '効果無効状態' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.THUNDER)) return { canUseSkill: false, reason: '雷撃状態' };
    return { canUseSkill: true };
  }

  canUseTriggerWithReason(monster) {
    if (!monster) return { canUseTrigger: false, reason: '対象が存在しません' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SLEEP)) return { canUseTrigger: false, reason: '眠り状態' };
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.SILENCE)) return { canUseTrigger: false, reason: '効果無効状態' };
    return { canUseTrigger: true };
  }

  // ========================================
  // ステータス修正
  // ========================================

  /**
   * 攻撃力修正を計算（単純な数値を返す）
   * @param {Object} monster - 対象モンスター
   * @returns {number} 攻撃力修正値（加算値、倍率は currentAttack に適用済みと想定）
   */
  getAttackModifier(monster) {
    if (!monster?.statusEffects) {
      return 0;
    }

    let modifier = 0;
    let baseAtk = monster.currentAttack || 0;

    // 凍結: 50%（攻撃力を半減させる分を減算として計算）
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.FREEZE)) {
      modifier -= Math.floor(baseAtk * 0.5);
    }

    // 雷撃: -500（固定値）
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.THUNDER)) {
      modifier -= 500;
    }

    // 覚醒: 効果値分上昇
    const awakened = monster.statusEffects.find(s => s.type === STATUS_EFFECT_TYPES.AWAKENED);
    if (awakened) {
      modifier += awakened.value;
    }

    // ATK_UP: バフ値を加算
    const atkUp = monster.statusEffects.find(s => s.type === STATUS_EFFECT_TYPES.ATK_UP);
    if (atkUp) {
      modifier += atkUp.value;
    }

    // ATK_DOWN: デバフ値を減算
    const atkDown = monster.statusEffects.find(s => s.type === STATUS_EFFECT_TYPES.ATK_DOWN);
    if (atkDown) {
      modifier -= atkDown.value;
    }

    return modifier;
  }

  /**
   * 攻撃力修正を計算（詳細オブジェクトを返す）
   * @param {Object} monster - 対象モンスター
   * @returns {Object} { multiplier: number, flatModifier: number }
   */
  getAttackModifierDetails(monster) {
    let multiplier = 1.0;
    let flatModifier = 0;

    if (!monster?.statusEffects) {
      return { multiplier, flatModifier };
    }

    // 凍結: 50%
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.FREEZE)) {
      multiplier *= 0.5;
    }

    // 雷撃: -500（固定値）
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.THUNDER)) {
      flatModifier -= 500;
    }

    // 覚醒: 効果値分上昇
    const awakened = monster.statusEffects.find(s => s.type === STATUS_EFFECT_TYPES.AWAKENED);
    if (awakened) {
      flatModifier += awakened.value;
    }

    // ATK_UP: バフ値を加算
    const atkUp = monster.statusEffects.find(s => s.type === STATUS_EFFECT_TYPES.ATK_UP);
    if (atkUp) {
      flatModifier += atkUp.value;
    }

    // ATK_DOWN: デバフ値を減算
    const atkDown = monster.statusEffects.find(s => s.type === STATUS_EFFECT_TYPES.ATK_DOWN);
    if (atkDown) {
      flatModifier -= atkDown.value;
    }

    return { multiplier, flatModifier };
  }

  /**
   * 被ダメージ倍率を計算
   * @param {Object} monster - 対象モンスター
   * @returns {number} ダメージ倍率（1.0 = 変化なし）
   */
  getDamageMultiplier(monster) {
    let multiplier = 1.0;

    if (!monster?.statusEffects) {
      return multiplier;
    }

    // 濡れ: ダメージ2倍
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.WET)) {
      multiplier *= 2.0;
    }

    return multiplier;
  }

  /**
   * ダメージ軽減を計算（守護など）
   * @param {Object} monster - 対象モンスター
   * @param {number} damage - 元ダメージ
   * @returns {Object} { reduction: number, usedGuard: boolean, updatedMonster: Object }
   */
  calculateDamageReduction(monster, damage) {
    if (!monster?.statusEffects || monster.statusEffects.length === 0) {
      return { reduction: 0, usedGuard: false, updatedMonster: monster };
    }

    // 無敵チェック
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.INVINCIBLE)) {
      return { reduction: damage, usedGuard: false, updatedMonster: monster };
    }

    // 守護チェック
    const guardIndex = monster.statusEffects.findIndex(s => s.type === STATUS_EFFECT_TYPES.GUARD);
    if (guardIndex !== -1) {
      const guard = monster.statusEffects[guardIndex];
      const reductionRate = STATUS_EFFECT_METADATA[STATUS_EFFECT_TYPES.GUARD].effects.damageReduction;
      const reduction = Math.floor(damage * reductionRate);

      // 使用回数上限に達したら解除（イミュータブルに更新）
      const newUsageCount = (guard.usageCount || 0) + 1;
      const shouldRemove = guard.maxUsage > 0 && newUsageCount >= guard.maxUsage;

      let newStatusEffects;
      if (shouldRemove) {
        // 守護を解除
        newStatusEffects = monster.statusEffects.filter((_, idx) => idx !== guardIndex);
      } else {
        // 使用回数を更新
        newStatusEffects = monster.statusEffects.map((s, idx) =>
          idx === guardIndex ? { ...s, usageCount: newUsageCount } : s
        );
      }

      const updatedMonster = {
        ...monster,
        statusEffects: newStatusEffects,
      };

      return { reduction, usedGuard: true, updatedMonster };
    }

    return { reduction: 0, usedGuard: false, updatedMonster: monster };
  }

  // ========================================
  // プレイヤー状態異常
  // ========================================

  /**
   * プレイヤーに状態異常を付与
   * @param {Array} playerStatusEffects - プレイヤーの状態異常配列
   * @param {string} statusType - 状態異常タイプ
   * @param {Object} options - オプション
   * @returns {Object} { success: boolean, statusEffect?: Object }
   */
  applyPlayerStatus(playerStatusEffects, statusType, options = {}) {
    const meta = STATUS_EFFECT_METADATA[statusType];
    if (!meta || meta.target !== 'player') {
      return { success: false, reason: 'プレイヤー状態異常ではありません' };
    }

    // 既に同じ状態異常がある場合はスタック（毒は重複可能）
    const statusEffect = {
      id: `${statusType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: statusType,
      source: options.source || null,
      sourceName: options.sourceName || null,
      appliedTurn: options.currentTurn || 0,
      value: options.value || meta.effects?.endPhaseDamage || 0,
    };

    playerStatusEffects.push(statusEffect);

    return { success: true, statusEffect };
  }

  /**
   * プレイヤーの状態異常を処理（エンドフェイズ）
   * @param {Array} playerStatusEffects - プレイヤーの状態異常配列
   * @returns {Object} { damage: number, effects: Array }
   */
  processPlayerEndPhase(playerStatusEffects) {
    if (!playerStatusEffects || playerStatusEffects.length === 0) {
      return { damage: 0, effects: [] };
    }

    let totalDamage = 0;

    playerStatusEffects.forEach(status => {
      if (status.type === STATUS_EFFECT_TYPES.POISON) {
        totalDamage += status.value;
      }
    });

    // 状態異常配列はそのまま返す（毒は永続なので解除しない）
    return { damage: totalDamage, effects: [...playerStatusEffects] };
  }

  /**
   * プレイヤーの状態異常を解除
   * @param {Array} playerStatusEffects - プレイヤーの状態異常配列
   * @param {string} statusType - 状態異常タイプ（省略で全解除）
   * @returns {Array} 解除された状態異常
   */
  removePlayerStatus(playerStatusEffects, statusType = null) {
    if (!playerStatusEffects) {
      return [];
    }

    let removed = [];

    if (statusType) {
      const index = playerStatusEffects.findIndex(s => s.type === statusType);
      if (index !== -1) {
        removed = playerStatusEffects.splice(index, 1);
      }
    } else {
      removed = [...playerStatusEffects];
      playerStatusEffects.length = 0;
    }

    return removed;
  }

  /**
   * プレイヤーが特定の状態異常を持っているか
   * @param {Array} playerStatusEffects - プレイヤーの状態異常配列
   * @param {string} statusType - 状態異常タイプ
   * @returns {boolean}
   */
  hasPlayerStatus(playerStatusEffects, statusType) {
    return playerStatusEffects?.some(s => s.type === statusType) || false;
  }
}

// シングルトンインスタンス
export const statusEffectEngine = new StatusEffectEngine();
