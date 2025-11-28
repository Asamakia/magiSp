/**
 * トリガーシステム: トリガータイプ定義
 *
 * このファイルは汎用的なトリガータイプを定義します。
 * カテゴリ/属性特定のトリガーはcondition関数で柔軟に対応します。
 *
 * 設計方針:
 * - 51種類の特定トリガーを約20種類の汎用トリガーに削減
 * - カテゴリ/属性はハードコーディングせず、条件関数で指定
 * - 自動発動と任意発動を明確に区別
 *
 * @see src/ルール/trigger-revision-plan.md - 修正方針の詳細
 */

/**
 * トリガータイプの定義（汎用版）
 *
 * 命名規則:
 * - ON_[EVENT]_[SCOPE]
 * - SCOPE: SELF (自分), OPPONENT (相手), なし (両方)
 */
export const TRIGGER_TYPES = {
  // ========================================
  // 召喚時トリガー (Summon Triggers)
  // ========================================

  /**
   * モンスター召喚時
   * 【召喚時】【このカードの召喚時】
   */
  ON_SUMMON: 'on_summon',

  /**
   * 相手モンスター召喚時
   * 【相手モンスター召喚時】
   */
  ON_OPPONENT_SUMMON: 'on_opponent_summon',

  /**
   * 自分の特定属性モンスター召喚時
   * 【自分光属性モンスター召喚時】など
   * condition: (context) => context.card.attribute === '光'
   */
  ON_ATTRIBUTE_SUMMON_SELF: 'on_attribute_summon_self',

  /**
   * 自分の特定カテゴリモンスター召喚時
   * 【自分［ドラゴン］モンスター召喚時】など
   * condition: (context) => context.card.category?.includes('【ドラゴン】')
   */
  ON_CATEGORY_SUMMON_SELF: 'on_category_summon_self',

  /**
   * 自分の特定コスト以下のモンスター召喚時
   * 【コスト3以下のモンスター召喚時】など
   * condition: (context) => context.card.cost <= 3
   */
  ON_COST_SUMMON_SELF: 'on_cost_summon_self',

  // ========================================
  // 破壊時トリガー (Destroy Triggers)
  // ========================================

  /**
   * このカードが破壊された時
   * 【破壊時】【自壊時】
   */
  ON_DESTROY_SELF: 'on_destroy_self',

  /**
   * 特定カテゴリのモンスターが破壊された時
   * 【［ドラゴン］モンスターが破壊された時】など
   * condition: (context) => context.destroyedCard.category?.includes('【ドラゴン】')
   */
  ON_CATEGORY_MONSTER_DESTROYED: 'on_category_monster_destroyed',

  /**
   * 特定属性のモンスターが破壊される前
   * 【光属性モンスターが破壊される時】など
   * condition: (context) => context.destroyedCard.attribute === '光'
   */
  ON_ATTRIBUTE_BEFORE_DESTROY: 'on_attribute_before_destroy',

  /**
   * 自分のモンスターが破壊された時
   * 【自分のモンスターが破壊された時】
   */
  ON_SELF_MONSTER_DESTROYED: 'on_self_monster_destroyed',

  /**
   * 相手のモンスターが破壊された時
   * 【相手のモンスターが破壊された時】
   */
  ON_OPPONENT_MONSTER_DESTROYED: 'on_opponent_monster_destroyed',

  /**
   * このカードが場を離れる時
   * 【場を離れる時】
   * 破壊、手札戻し、デッキ戻し、除外など全てで発動
   */
  ON_LEAVE_FIELD: 'on_leave_field',

  // ========================================
  // フェイズトリガー (Phase Triggers)
  // ========================================

  /**
   * 自分のターン開始時
   * 【ターン開始時】【自分ターン開始時】
   */
  ON_TURN_START_SELF: 'on_turn_start_self',

  /**
   * 自分のドローフェイズ時
   * 【自分ドローフェイズ時】
   */
  ON_DRAW_PHASE_SELF: 'on_draw_phase_self',

  /**
   * 自分のメインフェイズ時（任意発動）
   * 【自分メインフェイズ時】
   * Note: カード選択時に基本技/上級技と同じUIエリアに表示
   */
  ON_MAIN_PHASE_SELF: 'on_main_phase_self',

  /**
   * バトルフェイズ開始時
   * 【バトルフェイズ開始時】【自分バトルフェイズ開始時】
   */
  ON_BATTLE_PHASE_START: 'on_battle_phase_start',

  /**
   * 自分のエンドフェイズ時
   * 【エンドフェイズ時】【自分エンドフェイズ時】
   */
  ON_END_PHASE_SELF: 'on_end_phase_self',

  /**
   * 相手のエンドフェイズ時
   * 【相手エンドフェイズ時】
   */
  ON_OPPONENT_END_PHASE: 'on_opponent_end_phase',

  /**
   * エンドフェイズ時（両プレイヤー）
   * 【エンドフェイズ時】
   */
  ON_END_PHASE: 'on_end_phase',

  // ========================================
  // 攻撃関連トリガー (Attack Triggers)
  // ========================================

  /**
   * 攻撃時
   * 【攻撃時】【このカードの攻撃時】
   */
  ON_ATTACK: 'on_attack',

  /**
   * 攻撃された時
   * 【攻撃された時】
   */
  ON_ATTACKED: 'on_attacked',

  /**
   * 攻撃が成功した時
   * 【攻撃が成功した時】
   */
  ON_ATTACK_SUCCESS: 'on_attack_success',

  /**
   * 相手モンスターが攻撃した時
   * 【相手モンスター攻撃時】
   */
  ON_OPPONENT_ATTACK: 'on_opponent_attack',

  // ========================================
  // 墓地発動トリガー (Graveyard Triggers)
  // ========================================

  /**
   * メインフェイズ時、墓地で発動（任意発動）
   * 【自分メインフェイズ時、墓地で発動】
   * Note: 墓地UI（モーダル/パネル）でカード選択時に表示
   */
  ON_MAIN_PHASE_FROM_GRAVEYARD: 'on_main_phase_from_graveyard',

  /**
   * エンドフェイズ時、墓地で発動
   * 【エンドフェイズ時、墓地で発動】
   */
  ON_END_PHASE_FROM_GRAVEYARD: 'on_end_phase_from_graveyard',

  // ========================================
  // 常時効果 (Continuous Effects)
  // ========================================

  /**
   * 常時効果
   * 【常時】【場にいる限り】
   * Note: 常時効果は別の仕組みで管理する可能性あり
   */
  CONTINUOUS: 'continuous',

  // ========================================
  // 条件発動トリガー (Conditional Triggers)
  // ========================================

  /**
   * ライフ条件トリガー
   * 【ライフが3000以下の時】など
   * condition: (context) => context.playerLife <= 3000
   */
  ON_LIFE_CONDITION: 'on_life_condition',

  /**
   * 場に特定のカードがある時
   * 【場に炎属性が3体以上いる場合】など
   * condition: (context) => { return customCheck; }
   */
  ON_FIELD_CONDITION: 'on_field_condition',

  // ========================================
  // ダメージ関連トリガー (Damage Triggers)
  // ========================================

  /**
   * ダメージを受けた時
   * 【ダメージを受けた時】
   */
  ON_DAMAGE_RECEIVED: 'on_damage_received',

  /**
   * ダメージを与えた時
   * 【ダメージを与えた時】
   */
  ON_DAMAGE_DEALT: 'on_damage_dealt',

  // ========================================
  // カードアクショントリガー (Card Action Triggers)
  // ========================================

  /**
   * 相手が魔法カードを発動した時
   * 【相手が魔法カードを発動時】
   */
  ON_OPPONENT_MAGIC_ACTIVATED: 'on_opponent_magic_activated',

  /**
   * フェイズカード発動時
   * 【フェイズカード発動時】【初期効果】
   */
  ON_PHASE_CARD_ACTIVATE: 'on_phase_card_activate',
};

/**
 * 発動タイプ（自動 vs 任意）
 */
export const ACTIVATION_TYPES = {
  /**
   * 自動・強制発動
   * トリガー条件が満たされた時、自動的に発動する
   * 例: 【召喚時】【破壊時】【ターン開始時】など
   */
  AUTOMATIC: 'automatic',

  /**
   * 任意発動
   * プレイヤーがUIボタンで発動を選択する
   * 例: 【自分メインフェイズ時】【墓地で発動】など
   *
   * Note: UIで表示される際:
   * - フィールドカード: 基本技/上級技と同じエリアに表示
   * - 墓地カード: 墓地UIで選択時に表示
   */
  OPTIONAL: 'optional',
};

/**
 * トリガーの優先度
 * 複数のトリガーが同時に発動する場合の処理順序
 */
export const TRIGGER_PRIORITIES = {
  /**
   * 最高優先度
   * 必ず最初に処理されるべきトリガー
   */
  HIGHEST: 100,

  /**
   * 高優先度
   * 通常より優先的に処理される
   */
  HIGH: 50,

  /**
   * 通常優先度
   * デフォルトの優先度
   */
  NORMAL: 0,

  /**
   * 低優先度
   * 他のトリガーの後に処理される
   */
  LOW: -50,

  /**
   * 最低優先度
   * 最後に処理されるべきトリガー
   */
  LOWEST: -100,
};

/**
 * トリガータイプのメタ情報
 * UI表示や実装の参考用
 */
export const TRIGGER_TYPE_METADATA = {
  // 召喚系
  [TRIGGER_TYPES.ON_SUMMON]: {
    displayName: '召喚時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'summon',
  },
  [TRIGGER_TYPES.ON_OPPONENT_SUMMON]: {
    displayName: '相手召喚時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'summon',
  },
  [TRIGGER_TYPES.ON_ATTRIBUTE_SUMMON_SELF]: {
    displayName: '属性召喚時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'summon',
  },
  [TRIGGER_TYPES.ON_CATEGORY_SUMMON_SELF]: {
    displayName: 'カテゴリ召喚時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'summon',
  },
  [TRIGGER_TYPES.ON_COST_SUMMON_SELF]: {
    displayName: 'コスト条件召喚時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'summon',
  },

  // 破壊系
  [TRIGGER_TYPES.ON_DESTROY_SELF]: {
    displayName: '破壊時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'destroy',
  },
  [TRIGGER_TYPES.ON_CATEGORY_MONSTER_DESTROYED]: {
    displayName: 'カテゴリ破壊時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'destroy',
  },
  [TRIGGER_TYPES.ON_ATTRIBUTE_BEFORE_DESTROY]: {
    displayName: '属性破壊前',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'destroy',
  },
  [TRIGGER_TYPES.ON_SELF_MONSTER_DESTROYED]: {
    displayName: '自分モンスター破壊時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'destroy',
  },
  [TRIGGER_TYPES.ON_OPPONENT_MONSTER_DESTROYED]: {
    displayName: '相手モンスター破壊時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'destroy',
  },
  [TRIGGER_TYPES.ON_LEAVE_FIELD]: {
    displayName: '場を離れる時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'destroy',
  },

  // フェイズ系
  [TRIGGER_TYPES.ON_TURN_START_SELF]: {
    displayName: 'ターン開始時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'phase',
  },
  [TRIGGER_TYPES.ON_DRAW_PHASE_SELF]: {
    displayName: '自分ドローフェイズ時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'phase',
  },
  [TRIGGER_TYPES.ON_MAIN_PHASE_SELF]: {
    displayName: '自分メインフェイズ時',
    defaultActivation: ACTIVATION_TYPES.OPTIONAL,
    category: 'phase',
    note: '基本技/上級技と同じUIエリアに表示',
  },
  [TRIGGER_TYPES.ON_BATTLE_PHASE_START]: {
    displayName: 'バトルフェイズ開始時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'phase',
  },
  [TRIGGER_TYPES.ON_END_PHASE_SELF]: {
    displayName: '自分エンドフェイズ時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'phase',
  },
  [TRIGGER_TYPES.ON_OPPONENT_END_PHASE]: {
    displayName: '相手エンドフェイズ時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'phase',
  },
  [TRIGGER_TYPES.ON_END_PHASE]: {
    displayName: 'エンドフェイズ時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'phase',
  },

  // 攻撃系
  [TRIGGER_TYPES.ON_ATTACK]: {
    displayName: '攻撃時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'attack',
  },
  [TRIGGER_TYPES.ON_ATTACKED]: {
    displayName: '被攻撃時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'attack',
  },
  [TRIGGER_TYPES.ON_ATTACK_SUCCESS]: {
    displayName: '攻撃成功時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'attack',
  },
  [TRIGGER_TYPES.ON_OPPONENT_ATTACK]: {
    displayName: '相手攻撃時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'attack',
  },

  // 墓地発動系
  [TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD]: {
    displayName: 'メインフェイズ時（墓地）',
    defaultActivation: ACTIVATION_TYPES.OPTIONAL,
    category: 'graveyard',
    note: '墓地UIでカード選択時に表示',
  },
  [TRIGGER_TYPES.ON_END_PHASE_FROM_GRAVEYARD]: {
    displayName: 'エンドフェイズ時（墓地）',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'graveyard',
  },

  // 常時効果
  [TRIGGER_TYPES.CONTINUOUS]: {
    displayName: '常時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'continuous',
  },

  // 条件系
  [TRIGGER_TYPES.ON_LIFE_CONDITION]: {
    displayName: 'ライフ条件時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'condition',
  },
  [TRIGGER_TYPES.ON_FIELD_CONDITION]: {
    displayName: 'フィールド条件時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'condition',
  },

  // ダメージ系
  [TRIGGER_TYPES.ON_DAMAGE_RECEIVED]: {
    displayName: 'ダメージを受けた時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'damage',
  },
  [TRIGGER_TYPES.ON_DAMAGE_DEALT]: {
    displayName: 'ダメージを与えた時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'damage',
  },

  // カードアクション系
  [TRIGGER_TYPES.ON_OPPONENT_MAGIC_ACTIVATED]: {
    displayName: '相手魔法発動時',
    defaultActivation: ACTIVATION_TYPES.AUTOMATIC,
    category: 'action',
  },
};

/**
 * トリガータイプが任意発動かどうかを判定
 * @param {string} triggerType - トリガータイプ
 * @returns {boolean} 任意発動の場合true
 */
export const isOptionalTrigger = (triggerType) => {
  const metadata = TRIGGER_TYPE_METADATA[triggerType];
  return metadata?.defaultActivation === ACTIVATION_TYPES.OPTIONAL;
};

/**
 * トリガータイプのカテゴリを取得
 * @param {string} triggerType - トリガータイプ
 * @returns {string} カテゴリ名
 */
export const getTriggerCategory = (triggerType) => {
  const metadata = TRIGGER_TYPE_METADATA[triggerType];
  return metadata?.category || 'other';
};

/**
 * トリガータイプの表示名を取得
 * @param {string} triggerType - トリガータイプ
 * @returns {string} 表示名
 */
export const getTriggerDisplayName = (triggerType) => {
  const metadata = TRIGGER_TYPE_METADATA[triggerType];
  return metadata?.displayName || triggerType;
};
