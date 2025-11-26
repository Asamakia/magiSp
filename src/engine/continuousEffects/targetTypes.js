/**
 * 常時効果システム: ターゲットタイプ定義
 *
 * このファイルは常時効果の適用対象（ターゲット）を定義します。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

/**
 * ターゲットタイプの定義
 */
export const TARGET_TYPES = {
  // ========================================
  // モンスター対象
  // ========================================

  /**
   * このカード自身
   * 例: 「場にいる粘液獣1体につき自身の攻撃力を1500アップ」
   * 例: 「このカードは攻撃できない」
   */
  SELF_CARD: 'self_card',

  /**
   * 自分のモンスター全体
   * 例: 「光属性モンスターの攻撃力を500アップ」
   * 例: 「自分の［ドラゴン］モンスターは効果ダメージを受けない」
   */
  SELF_MONSTERS: 'self_monsters',

  /**
   * 相手のモンスター全体
   * 例: 「相手モンスター全体の攻撃力をダウン」
   * 例: 「相手の闇属性モンスターの攻撃力を300ダウン」
   */
  OPPONENT_MONSTERS: 'opponent_monsters',

  /**
   * 全モンスター（自分・相手両方）
   * 例: 「場のすべてのモンスターの攻撃力をダウン」
   */
  ALL_MONSTERS: 'all_monsters',

  // ========================================
  // コスト対象
  // ========================================

  /**
   * 自分の召喚
   * 例: 「水属性モンスターの召喚コストを1軽減」
   * 例: 「闇属性モンスターの召喚コストを1軽減」
   */
  SELF_SUMMON: 'self_summon',

  /**
   * 相手の召喚
   * 例: 「相手のモンスター召喚コストを1増加」
   */
  OPPONENT_SUMMON: 'opponent_summon',

  /**
   * 自分の魔法カード
   * 例: 「《黒呪》魔法カードのコストを1軽減」
   */
  SELF_MAGIC: 'self_magic',

  /**
   * 相手の魔法カード
   * 例: 「相手の魔法カードのコストを1増加」
   */
  OPPONENT_MAGIC: 'opponent_magic',

  // ========================================
  // ダメージ対象（相手視点）
  // ========================================

  /**
   * 自分のモンスターが与えるダメージ
   * 例: 「未来属性モンスターが与えるダメージを500アップ」
   */
  SELF_DAMAGE_DEALT: 'self_damage_dealt',

  /**
   * 相手のモンスターが受けるダメージ
   * 例: 「相手の闇属性が受けるダメージを400アップ」
   */
  OPPONENT_DAMAGE_RECEIVED: 'opponent_damage_received',
};

/**
 * ターゲットタイプのメタ情報
 */
export const TARGET_TYPE_METADATA = {
  [TARGET_TYPES.SELF_CARD]: {
    displayName: '自身',
    scope: 'self',
    description: 'このカード自身が対象',
  },
  [TARGET_TYPES.SELF_MONSTERS]: {
    displayName: '自分のモンスター',
    scope: 'self',
    description: '自分の場のモンスター全体が対象',
  },
  [TARGET_TYPES.OPPONENT_MONSTERS]: {
    displayName: '相手のモンスター',
    scope: 'opponent',
    description: '相手の場のモンスター全体が対象',
  },
  [TARGET_TYPES.ALL_MONSTERS]: {
    displayName: '全モンスター',
    scope: 'all',
    description: '場の全モンスターが対象',
  },
  [TARGET_TYPES.SELF_SUMMON]: {
    displayName: '自分の召喚',
    scope: 'self',
    description: '自分のモンスター召喚が対象',
  },
  [TARGET_TYPES.OPPONENT_SUMMON]: {
    displayName: '相手の召喚',
    scope: 'opponent',
    description: '相手のモンスター召喚が対象',
  },
  [TARGET_TYPES.SELF_MAGIC]: {
    displayName: '自分の魔法',
    scope: 'self',
    description: '自分の魔法カードが対象',
  },
  [TARGET_TYPES.OPPONENT_MAGIC]: {
    displayName: '相手の魔法',
    scope: 'opponent',
    description: '相手の魔法カードが対象',
  },
  [TARGET_TYPES.SELF_DAMAGE_DEALT]: {
    displayName: '自分の与ダメージ',
    scope: 'self',
    description: '自分のモンスターが与えるダメージが対象',
  },
  [TARGET_TYPES.OPPONENT_DAMAGE_RECEIVED]: {
    displayName: '相手の被ダメージ',
    scope: 'opponent',
    description: '相手のモンスターが受けるダメージが対象',
  },
};

/**
 * ターゲットタイプの表示名を取得
 * @param {string} targetType - ターゲットタイプ
 * @returns {string} 表示名
 */
export const getTargetTypeDisplayName = (targetType) => {
  return TARGET_TYPE_METADATA[targetType]?.displayName || targetType;
};

/**
 * ターゲットタイプのスコープを取得
 * @param {string} targetType - ターゲットタイプ
 * @returns {string} スコープ ('self' | 'opponent' | 'all')
 */
export const getTargetTypeScope = (targetType) => {
  return TARGET_TYPE_METADATA[targetType]?.scope || 'unknown';
};

/**
 * ターゲットが自分のものかどうか判定
 * @param {string} targetType - ターゲットタイプ
 * @returns {boolean}
 */
export const isSelfTarget = (targetType) => {
  const scope = getTargetTypeScope(targetType);
  return scope === 'self' || scope === 'all';
};

/**
 * ターゲットが相手のものかどうか判定
 * @param {string} targetType - ターゲットタイプ
 * @returns {boolean}
 */
export const isOpponentTarget = (targetType) => {
  const scope = getTargetTypeScope(targetType);
  return scope === 'opponent' || scope === 'all';
};
