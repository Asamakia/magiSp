/**
 * 状態異常システム: タイプ定義
 *
 * このファイルは状態異常の全タイプとメタデータを定義します。
 *
 * @see src/ルール/status-effect-system-design.md
 */

/**
 * 状態異常タイプの定義
 */
export const STATUS_EFFECT_TYPES = {
  // ========================================
  // 行動制限系（モンスター）
  // ========================================

  /**
   * 眠り
   * - 攻撃不可
   * - 効果発動不可（基本技、上級技、トリガー）
   * - ターン開始時50%で解除、または次ターン終了時に解除
   */
  SLEEP: 'sleep',

  /**
   * 凍結
   * - 攻撃力50%ダウン
   * - 攻撃不可
   * - 次ターン開始時50%で解除
   */
  FREEZE: 'freeze',

  /**
   * 雷撃
   * - 攻撃力-500
   * - 技不能（基本技、上級技使用不可）
   * - 次のターン終了時に解除
   */
  THUNDER: 'thunder',

  /**
   * 行動不能（スタン）
   * - 攻撃不可
   * - 効果発動不可
   * - 指定ターン後に解除
   */
  STUN: 'stun',

  // ========================================
  // 効果制限系（モンスター）
  // ========================================

  /**
   * 効果無効（サイレンス）
   * - 効果発動不可
   * - 攻撃は可能
   * - 指定ターン後に解除
   */
  SILENCE: 'silence',

  // ========================================
  // 被ダメージ増加系（モンスター）
  // ========================================

  /**
   * 濡れ
   * - 受けるダメージ2倍
   * - 次のターン終了時に解除
   */
  WET: 'wet',

  // ========================================
  // 防御系（モンスター）
  // ========================================

  /**
   * 守護
   * - 1度だけダメージを半減
   * - ダメージを受けた時に消費
   */
  GUARD: 'guard',

  /**
   * 無敵（免疫）
   * - ダメージを受けない
   * - 指定ターン後に解除
   */
  INVINCIBLE: 'invincible',

  // ========================================
  // 継続ダメージ/デバフ系（モンスター）
  // ========================================

  /**
   * 深蝕
   * - エンドフェイズに攻撃力減少
   * - 解除されるまで継続（永続）
   */
  CORRODE: 'corrode',

  // ========================================
  // バフ系（モンスター - 正の状態異常）
  // ========================================

  /**
   * 覚醒
   * - 攻撃力が上昇（カードにより効果値異なる）
   * - ターン終了時に解除
   */
  AWAKENED: 'awakened',

  /**
   * 攻撃力上昇（一時的）
   * - 攻撃力が上昇
   * - 指定ターン後に解除
   */
  ATK_UP: 'atk_up',

  /**
   * HP上昇（一時的）
   * - HPが上昇
   * - 指定ターン後に解除
   */
  HP_UP: 'hp_up',

  /**
   * 攻撃力低下（一時的）
   * - 攻撃力が低下
   * - エンドフェイズ回数で解除（expiresAfterEndPhases）
   */
  ATK_DOWN: 'atk_down',

  // ========================================
  // プレイヤー状態異常
  // ========================================

  /**
   * 毒（プレイヤー）
   * - 毎ターン終了時に固定ダメージ（100）
   * - 解除されるまで継続（永続）
   */
  POISON: 'poison',
};

/**
 * 状態異常の対象を判定
 */
export const STATUS_EFFECT_TARGETS = {
  MONSTER: 'monster',
  PLAYER: 'player',
};

/**
 * 状態異常がどの対象に付与されるか
 */
export const getStatusEffectTarget = (statusType) => {
  switch (statusType) {
    case STATUS_EFFECT_TYPES.POISON:
      return STATUS_EFFECT_TARGETS.PLAYER;
    default:
      return STATUS_EFFECT_TARGETS.MONSTER;
  }
};

/**
 * 状態異常メタデータ
 */
export const STATUS_EFFECT_METADATA = {
  // ========================================
  // モンスター状態異常
  // ========================================

  [STATUS_EFFECT_TYPES.SLEEP]: {
    displayName: '眠り',
    icon: '💤',
    color: '#9966cc',
    category: 'debuff',
    target: 'monster',
    effects: {
      canAttack: false,
      canUseSkill: false,
      canUseTrigger: false,
    },
    defaultDuration: 1,
    defaultRemoveChance: 0.5,
  },
  [STATUS_EFFECT_TYPES.FREEZE]: {
    displayName: '凍結',
    icon: '❄️',
    color: '#00bfff',
    category: 'debuff',
    target: 'monster',
    effects: {
      canAttack: false,
      attackMultiplier: 0.5, // 攻撃力50%
    },
    defaultDuration: 1,
    defaultRemoveChance: 0.5,
  },
  [STATUS_EFFECT_TYPES.THUNDER]: {
    displayName: '雷撃',
    icon: '⚡',
    color: '#ffd700',
    category: 'debuff',
    target: 'monster',
    effects: {
      attackFlatModifier: -500, // 攻撃力-500（固定値）
      canUseSkill: false,
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.WET]: {
    displayName: '濡れ',
    icon: '💧',
    color: '#1e90ff',
    category: 'debuff',
    target: 'monster',
    effects: {
      damageMultiplier: 2.0, // 受けるダメージ2倍
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.STUN]: {
    displayName: '行動不能',
    icon: '🚫',
    color: '#ff6347',
    category: 'debuff',
    target: 'monster',
    effects: {
      canAttack: false,
      canUseSkill: false,
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.SILENCE]: {
    displayName: '効果無効',
    icon: '🔇',
    color: '#888888',
    category: 'debuff',
    target: 'monster',
    effects: {
      canUseSkill: false,
      canUseTrigger: false,
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.GUARD]: {
    displayName: '守護',
    icon: '🛡️',
    color: '#4a90d9',
    category: 'buff',
    target: 'monster',
    effects: {
      damageReduction: 0.5, // 50%軽減
    },
    maxUsage: 1,
    removeOnUse: true,
  },
  [STATUS_EFFECT_TYPES.INVINCIBLE]: {
    displayName: '無敵',
    icon: '✨',
    color: '#ffd700',
    category: 'buff',
    target: 'monster',
    effects: {
      damageImmunity: true,
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.CORRODE]: {
    displayName: '深蝕',
    icon: '🦠',
    color: '#556b2f',
    category: 'debuff',
    target: 'monster',
    effects: {
      endPhaseAtkDown: true,
    },
    defaultDuration: -1, // 永続
  },
  [STATUS_EFFECT_TYPES.AWAKENED]: {
    displayName: '覚醒',
    icon: '🔥',
    color: '#ff4500',
    category: 'buff',
    target: 'monster',
    effects: {
      attackFlatModifier: 0, // カードにより異なる、valueで指定
    },
    defaultDuration: 0, // ターン終了時まで
  },
  [STATUS_EFFECT_TYPES.ATK_UP]: {
    displayName: '攻撃力上昇',
    icon: '⬆️',
    color: '#32cd32',
    category: 'buff',
    target: 'monster',
    effects: {
      attackFlatModifier: 0, // valueで指定
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.HP_UP]: {
    displayName: 'HP上昇',
    icon: '💚',
    color: '#32cd32',
    category: 'buff',
    target: 'monster',
    effects: {
      hpFlatModifier: 0, // valueで指定
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.ATK_DOWN]: {
    displayName: '攻撃力低下',
    icon: '⬇️',
    color: '#ff6666',
    category: 'debuff',
    target: 'monster',
    effects: {
      attackFlatModifier: 0, // valueで指定（負の値）
    },
    // expiresAfterEndPhasesで管理（durationは使用しない）
    defaultDuration: -1,
  },

  // ========================================
  // プレイヤー状態異常
  // ========================================

  [STATUS_EFFECT_TYPES.POISON]: {
    displayName: '毒',
    icon: '☠️',
    color: '#9932cc',
    category: 'debuff',
    target: 'player',
    effects: {
      endPhaseDamage: 100, // 毎ターン100ダメージ
    },
    defaultDuration: -1, // 永続
  },
};

/**
 * 状態異常の表示名を取得
 * @param {string} statusType - 状態異常タイプ
 * @returns {string} 表示名
 */
export const getStatusDisplayName = (statusType) => {
  return STATUS_EFFECT_METADATA[statusType]?.displayName || statusType;
};

/**
 * 状態異常のアイコンを取得
 * @param {string} statusType - 状態異常タイプ
 * @returns {string} アイコン
 */
export const getStatusIcon = (statusType) => {
  return STATUS_EFFECT_METADATA[statusType]?.icon || '❓';
};

/**
 * 状態異常がデバフかどうか
 * @param {string} statusType - 状態異常タイプ
 * @returns {boolean}
 */
export const isDebuff = (statusType) => {
  return STATUS_EFFECT_METADATA[statusType]?.category === 'debuff';
};

/**
 * 状態異常がバフかどうか
 * @param {string} statusType - 状態異常タイプ
 * @returns {boolean}
 */
export const isBuff = (statusType) => {
  return STATUS_EFFECT_METADATA[statusType]?.category === 'buff';
};
