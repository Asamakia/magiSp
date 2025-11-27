/**
 * 常時効果システム: 条件チェックユーティリティ
 *
 * このファイルは常時効果の適用条件をチェックする関数を提供します。
 * 条件オブジェクトを受け取り、対象がその条件を満たすかを判定します。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

/**
 * カードが条件を満たすかチェック
 * 全ての条件はANDで結合される（全て満たす必要がある）
 *
 * @param {Object} condition - 条件オブジェクト
 * @param {Object} target - チェック対象（モンスター/カード）
 * @param {Object} context - ゲームコンテキスト
 * @returns {boolean} 条件を満たす場合true
 */
export const checkCondition = (condition, target, context) => {
  // 条件がない場合は常にtrue
  if (!condition) return true;
  if (Object.keys(condition).length === 0) return true;

  // 各条件をチェック（ANDで結合）
  for (const [key, value] of Object.entries(condition)) {
    if (!checkSingleCondition(key, value, target, context)) {
      return false;
    }
  }

  return true;
};

/**
 * 単一の条件をチェック
 *
 * @param {string} conditionKey - 条件のキー
 * @param {*} conditionValue - 条件の値
 * @param {Object} target - チェック対象
 * @param {Object} context - ゲームコンテキスト
 * @returns {boolean}
 */
const checkSingleCondition = (conditionKey, conditionValue, target, context) => {
  switch (conditionKey) {
    // ========================================
    // 属性条件
    // ========================================

    case 'attribute':
      // 単一属性: 「光属性モンスター」
      return target.attribute === conditionValue;

    case 'attributes':
      // 複数属性（OR）: 「光または闇属性」
      return Array.isArray(conditionValue) && conditionValue.includes(target.attribute);

    case 'notAttribute':
      // 属性除外: 「光属性以外」
      return target.attribute !== conditionValue;

    // ========================================
    // カテゴリ条件
    // ========================================

    case 'category':
      // 単一カテゴリ: 「【ドラゴン】モンスター」
      // conditionValueから【】を除去して比較（cardManager.jsで配列化される際に【】が削除されるため）
      if (!target.category) return false;
      const normalizedCategory = conditionValue.replace(/【|】/g, '');
      // target.categoryが配列の場合と文字列の場合の両方に対応
      if (Array.isArray(target.category)) {
        return target.category.includes(normalizedCategory);
      }
      return target.category.includes(conditionValue);

    case 'categories':
      // 複数カテゴリ（OR）: 「【ドラゴン】または【ワイバーン】」
      if (!target.category) return false;
      if (!Array.isArray(conditionValue)) return false;
      // 各条件値から【】を除去して比較
      const normalizedCategories = conditionValue.map((cat) => cat.replace(/【|】/g, ''));
      if (Array.isArray(target.category)) {
        return normalizedCategories.some((cat) => target.category.includes(cat));
      }
      return conditionValue.some((cat) => target.category.includes(cat));

    case 'notCategory':
      // カテゴリ除外
      if (!target.category) return true;
      const normalizedNotCategory = conditionValue.replace(/【|】/g, '');
      if (Array.isArray(target.category)) {
        return !target.category.includes(normalizedNotCategory);
      }
      return !target.category.includes(conditionValue);

    // ========================================
    // 名前条件
    // ========================================

    case 'nameIncludes':
      // 名前に含む: 「《粘液獣》と名のついた」
      return target.name && target.name.includes(conditionValue);

    case 'nameExact':
      // 名前が一致: 「《ブリザードマスター》」
      return target.name === conditionValue;

    case 'nameStartsWith':
      // 名前が〜で始まる
      return target.name && target.name.startsWith(conditionValue);

    // ========================================
    // コスト条件
    // ========================================

    case 'maxCost':
      // コスト以下: 「コスト3以下」
      return typeof target.cost === 'number' && target.cost <= conditionValue;

    case 'minCost':
      // コスト以上: 「コスト5以上」
      return typeof target.cost === 'number' && target.cost >= conditionValue;

    case 'exactCost':
      // コストが一致
      return target.cost === conditionValue;

    // ========================================
    // 場の状態条件
    // ========================================

    case 'minFieldMonsters':
      // 場のモンスター数以上
      return countMonstersOnField(context) >= conditionValue;

    case 'minAttributeOnField':
      // 特定属性の数以上: { attribute: '光', count: 2 }
      return countAttributeOnField(context, conditionValue.attribute) >= conditionValue.count;

    case 'hasCardOnField':
      // 特定カードが場にある
      return hasCardOnField(context, conditionValue);

    case 'hasCategoryOnField':
      // 特定カテゴリが場にある
      return hasCategoryOnField(context, conditionValue);

    case 'hasNameOnField':
      // 特定名前のカードが場にある
      return hasNameOnField(context, conditionValue);

    // ========================================
    // ライフ条件
    // ========================================

    case 'maxLife':
      // ライフ以下: 「ライフが2000以下」
      return getOwnerLife(context) <= conditionValue;

    case 'minLife':
      // ライフ以上: 「ライフが4000以上」
      return getOwnerLife(context) >= conditionValue;

    // ========================================
    // ターン条件
    // ========================================

    case 'isMyTurn':
      // 自分のターン中のみ
      return context.currentPlayer === context.effectOwner;

    case 'isOpponentTurn':
      // 相手のターン中のみ
      return context.currentPlayer !== context.effectOwner;

    // ========================================
    // 除外条件
    // ========================================

    case 'excludeSelf':
      // 自身を除外（カウント時に使用）
      // これは値計算時に使用されるので、ここではtrueを返す
      return true;

    // ========================================
    // カードタイプ条件
    // ========================================

    case 'cardType':
      // カードタイプ: 'monster', 'magic', 'field'
      return target.type === conditionValue;

    // ========================================
    // 特殊条件
    // ========================================

    case 'isFieldCard':
      // フィールドカードかどうか
      return target.type === 'field';

    case 'isPhaseCard':
      // フェイズカードかどうか
      return target.type === 'phasecard';

    default:
      // 未知の条件はtrueを返す（警告を出すことも検討）
      console.warn(`Unknown condition key: ${conditionKey}`);
      return true;
  }
};

// ========================================
// ヘルパー関数
// ========================================

/**
 * 場のモンスター数をカウント
 * @param {Object} context - ゲームコンテキスト
 * @returns {number}
 */
const countMonstersOnField = (context) => {
  const { effectOwner, p1Field, p2Field } = context;
  const field = effectOwner === 1 ? p1Field : p2Field;
  return field.filter((m) => m !== null).length;
};

/**
 * 場の特定属性モンスター数をカウント
 * @param {Object} context - ゲームコンテキスト
 * @param {string} attribute - 属性
 * @returns {number}
 */
const countAttributeOnField = (context, attribute) => {
  const { effectOwner, p1Field, p2Field } = context;
  const field = effectOwner === 1 ? p1Field : p2Field;
  return field.filter((m) => m && m.attribute === attribute).length;
};

/**
 * 特定カードが場にあるかチェック
 * @param {Object} context - ゲームコンテキスト
 * @param {string} cardId - カードID
 * @returns {boolean}
 */
const hasCardOnField = (context, cardId) => {
  const { effectOwner, p1Field, p2Field } = context;
  const field = effectOwner === 1 ? p1Field : p2Field;
  return field.some((m) => m && m.id === cardId);
};

/**
 * 特定カテゴリのカードが場にあるかチェック
 * @param {Object} context - ゲームコンテキスト
 * @param {string} category - カテゴリ
 * @returns {boolean}
 */
const hasCategoryOnField = (context, category) => {
  const { effectOwner, p1Field, p2Field } = context;
  const field = effectOwner === 1 ? p1Field : p2Field;
  // 【】を除去して比較
  const normalizedCategory = category.replace(/【|】/g, '');
  return field.some((m) => {
    if (!m || !m.category) return false;
    if (Array.isArray(m.category)) {
      return m.category.includes(normalizedCategory);
    }
    return m.category.includes(category);
  });
};

/**
 * 特定名前のカードが場にあるかチェック
 * @param {Object} context - ゲームコンテキスト
 * @param {string} name - 名前（部分一致）
 * @returns {boolean}
 */
const hasNameOnField = (context, name) => {
  const { effectOwner, p1Field, p2Field } = context;
  const field = effectOwner === 1 ? p1Field : p2Field;
  return field.some((m) => m && m.name && m.name.includes(name));
};

/**
 * 効果のオーナーのライフを取得
 * @param {Object} context - ゲームコンテキスト
 * @returns {number}
 */
const getOwnerLife = (context) => {
  const { effectOwner, p1Life, p2Life } = context;
  return effectOwner === 1 ? p1Life : p2Life;
};

// ========================================
// エクスポート用ヘルパー関数
// ========================================

/**
 * 場の特定条件を満たすモンスター数をカウント
 * @param {Object} context - ゲームコンテキスト
 * @param {Object} condition - 条件オブジェクト
 * @param {string|null} excludeUniqueId - 除外するカードのuniqueId
 * @returns {number}
 */
export const countMonstersMatchingCondition = (context, condition, excludeUniqueId = null) => {
  const { effectOwner, p1Field, p2Field } = context;
  const field = effectOwner === 1 ? p1Field : p2Field;

  return field.filter((m) => {
    if (!m) return false;
    if (excludeUniqueId && m.uniqueId === excludeUniqueId) return false;
    return checkCondition(condition, m, context);
  }).length;
};

/**
 * 相手の場で特定条件を満たすモンスター数をカウント
 * @param {Object} context - ゲームコンテキスト
 * @param {Object} condition - 条件オブジェクト
 * @returns {number}
 */
export const countOpponentMonstersMatchingCondition = (context, condition) => {
  const { effectOwner, p1Field, p2Field } = context;
  const opponentField = effectOwner === 1 ? p2Field : p1Field;

  return opponentField.filter((m) => {
    if (!m) return false;
    return checkCondition(condition, m, context);
  }).length;
};
