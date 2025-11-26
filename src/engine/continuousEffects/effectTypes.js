/**
 * 常時効果システム: 効果タイプ定義
 *
 * このファイルは常時効果の全タイプを定義します。
 * 各タイプはContinuousEffectEngineで処理されます。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

/**
 * 常時効果タイプの定義
 */
export const CONTINUOUS_EFFECT_TYPES = {
  // ========================================
  // ステータス修正 (Stat Modifiers)
  // ========================================

  /**
   * 攻撃力修正
   * 例: 「光属性モンスターの攻撃力を500アップ」
   * 例: 「場にいる粘液獣1体につき攻撃力1500アップ」
   * 例: 「相手モンスター全体の攻撃力を200ダウン」
   */
  ATK_MODIFIER: 'atk_modifier',

  /**
   * HP修正
   * 例: 「『アクアレギナ』モンスターのHPを600アップ」
   * 例: 「《ヴォランティス》モンスターのHPを1000アップ」
   */
  HP_MODIFIER: 'hp_modifier',

  // ========================================
  // ダメージ関連 (Damage Effects)
  // ========================================

  /**
   * ダメージ軽減
   * 例: 「光属性が受けるダメージを200軽減」
   * 例: 「自分のモンスターが受けるダメージを100軽減」
   */
  DAMAGE_REDUCTION: 'damage_reduction',

  /**
   * ダメージ無効（完全無効化）
   * 例: 「［ドラゴン］は効果ダメージを受けない」
   */
  DAMAGE_IMMUNITY: 'damage_immunity',

  /**
   * 与ダメージ増加
   * 例: 「未来属性が与えるダメージを500アップ」
   * 例: 「他のモンスターが闇属性に与えるダメージを200アップ」
   */
  DAMAGE_DEALT_MODIFIER: 'damage_dealt_modifier',

  /**
   * 被ダメージ増加（相手に対して）
   * 例: 「相手の闘属性が受けるダメージを400アップ」
   */
  DAMAGE_RECEIVED_MODIFIER: 'damage_received_modifier',

  // ========================================
  // コスト関連 (Cost Modifiers)
  // ========================================

  /**
   * 召喚コスト修正
   * 例: 「水属性モンスターの召喚コストを1軽減」
   * 例: 「ライフが2000以下の場合、召喚コストを1軽減」
   */
  SUMMON_COST_MODIFIER: 'summon_cost_modifier',

  /**
   * 魔法カードコスト修正
   * 例: 「《黒呪》魔法カードのコストを1軽減」
   * 例: 「相手の魔法カードのコストを1増加」
   */
  MAGIC_COST_MODIFIER: 'magic_cost_modifier',

  // ========================================
  // 制限・禁止 (Restrictions)
  // ========================================

  /**
   * 攻撃制限
   * 例: 「このカードは攻撃できない」
   */
  ATTACK_RESTRICTION: 'attack_restriction',

  /**
   * SP制限
   * 例: 「自分のSPはすべてレスト状態になる」
   */
  SP_RESTRICTION: 'sp_restriction',

  /**
   * SP上限変更
   * 例: 「自分のSP上限が4になる」
   */
  SP_LIMIT_MODIFIER: 'sp_limit_modifier',

  // ========================================
  // 無効化 (Negation)
  // ========================================

  /**
   * 魔法カード無効化
   * 例: 「相手の魔法カードの発動をターンに1度無効化」
   */
  MAGIC_NEGATION: 'magic_negation',

  /**
   * 技無効化
   * 例: 「相手の基本技を1ターンに1度無効化」
   */
  SKILL_NEGATION: 'skill_negation',

  // ========================================
  // 召喚連動 (Summon-Linked)
  // ========================================

  /**
   * 召喚時バフ
   * 例: 「光属性が召喚されるたび、HPを200アップ」
   * 例: 「《虹羽密林》モンスターが召喚されるたび、攻撃力を400アップ」
   * Note: これは召喚イベント時に適用される特殊な常時効果
   */
  ON_SUMMON_BUFF: 'on_summon_buff',
};

/**
 * 効果タイプのメタ情報
 */
export const EFFECT_TYPE_METADATA = {
  [CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER]: {
    displayName: '攻撃力修正',
    category: 'stat',
    description: 'モンスターの攻撃力を増減させる',
  },
  [CONTINUOUS_EFFECT_TYPES.HP_MODIFIER]: {
    displayName: 'HP修正',
    category: 'stat',
    description: 'モンスターのHPを増減させる',
  },
  [CONTINUOUS_EFFECT_TYPES.DAMAGE_REDUCTION]: {
    displayName: 'ダメージ軽減',
    category: 'damage',
    description: '受けるダメージを軽減する',
  },
  [CONTINUOUS_EFFECT_TYPES.DAMAGE_IMMUNITY]: {
    displayName: 'ダメージ無効',
    category: 'damage',
    description: 'ダメージを完全に無効化する',
  },
  [CONTINUOUS_EFFECT_TYPES.DAMAGE_DEALT_MODIFIER]: {
    displayName: '与ダメージ修正',
    category: 'damage',
    description: '与えるダメージを増減させる',
  },
  [CONTINUOUS_EFFECT_TYPES.DAMAGE_RECEIVED_MODIFIER]: {
    displayName: '被ダメージ修正',
    category: 'damage',
    description: '相手が受けるダメージを増減させる',
  },
  [CONTINUOUS_EFFECT_TYPES.SUMMON_COST_MODIFIER]: {
    displayName: '召喚コスト修正',
    category: 'cost',
    description: 'モンスターの召喚コストを増減させる',
  },
  [CONTINUOUS_EFFECT_TYPES.MAGIC_COST_MODIFIER]: {
    displayName: '魔法コスト修正',
    category: 'cost',
    description: '魔法カードのコストを増減させる',
  },
  [CONTINUOUS_EFFECT_TYPES.ATTACK_RESTRICTION]: {
    displayName: '攻撃制限',
    category: 'restriction',
    description: '攻撃を制限する',
  },
  [CONTINUOUS_EFFECT_TYPES.SP_RESTRICTION]: {
    displayName: 'SP制限',
    category: 'restriction',
    description: 'SPの状態を制限する',
  },
  [CONTINUOUS_EFFECT_TYPES.SP_LIMIT_MODIFIER]: {
    displayName: 'SP上限変更',
    category: 'restriction',
    description: 'SP上限を変更する',
  },
  [CONTINUOUS_EFFECT_TYPES.MAGIC_NEGATION]: {
    displayName: '魔法無効',
    category: 'negation',
    description: '魔法カードの発動を無効化する',
  },
  [CONTINUOUS_EFFECT_TYPES.SKILL_NEGATION]: {
    displayName: '技無効',
    category: 'negation',
    description: '技の発動を無効化する',
  },
  [CONTINUOUS_EFFECT_TYPES.ON_SUMMON_BUFF]: {
    displayName: '召喚時バフ',
    category: 'summon',
    description: '召喚時にステータスを付与する',
  },
};

/**
 * 効果タイプの表示名を取得
 * @param {string} effectType - 効果タイプ
 * @returns {string} 表示名
 */
export const getEffectTypeDisplayName = (effectType) => {
  return EFFECT_TYPE_METADATA[effectType]?.displayName || effectType;
};

/**
 * 効果タイプのカテゴリを取得
 * @param {string} effectType - 効果タイプ
 * @returns {string} カテゴリ名
 */
export const getEffectTypeCategory = (effectType) => {
  return EFFECT_TYPE_METADATA[effectType]?.category || 'other';
};
