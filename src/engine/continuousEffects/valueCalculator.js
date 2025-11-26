/**
 * 常時効果システム: 値計算ユーティリティ
 *
 * このファイルは常時効果の値を計算する関数を提供します。
 * 固定値、数量依存、条件付きなど様々な計算パターンに対応します。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

import { checkCondition, countMonstersMatchingCondition } from './conditionChecker';

/**
 * 値計算タイプの定義
 */
export const VALUE_CALCULATOR_TYPES = {
  /**
   * 固定値
   * 例: value: 500 → 常に500を返す
   */
  FIXED: 'fixed',

  /**
   * 数量×基本値
   * 例: 場の粘液獣の数 × 1500
   */
  COUNT_MULTIPLY: 'count_multiply',

  /**
   * 条件付き値
   * 例: ドラゴンがいれば400、いなければ0
   */
  CONDITIONAL: 'conditional',

  /**
   * カスタム計算
   * 例: customCalculator 関数で計算
   */
  CUSTOM: 'custom',
};

/**
 * 効果の値を計算
 *
 * @param {Object} effect - 効果定義オブジェクト
 * @param {Object} context - ゲームコンテキスト
 * @returns {number} 計算された値
 */
export const calculateValue = (effect, context) => {
  // カスタム計算関数がある場合はそれを使用
  if (effect.customCalculator && typeof effect.customCalculator === 'function') {
    return effect.customCalculator(context);
  }

  // 値計算タイプに基づいて計算
  const calculatorType = effect.valueCalculator || VALUE_CALCULATOR_TYPES.FIXED;

  switch (calculatorType) {
    case VALUE_CALCULATOR_TYPES.FIXED:
      return calculateFixedValue(effect);

    case VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY:
      return calculateCountMultiplyValue(effect, context);

    case VALUE_CALCULATOR_TYPES.CONDITIONAL:
      return calculateConditionalValue(effect, context);

    case VALUE_CALCULATOR_TYPES.CUSTOM:
      // カスタムの場合は customCalculator を使用（上で処理済み）
      console.warn('CUSTOM calculator type requires customCalculator function');
      return 0;

    default:
      // デフォルトは固定値として処理
      return calculateFixedValue(effect);
  }
};

/**
 * 固定値を返す
 *
 * @param {Object} effect - 効果定義オブジェクト
 * @returns {number}
 */
const calculateFixedValue = (effect) => {
  return effect.value || 0;
};

/**
 * 数量×基本値を計算
 * 例: 場の粘液獣1体につき1500アップ → 粘液獣数 × 1500
 *
 * @param {Object} effect - 効果定義オブジェクト
 * @param {Object} context - ゲームコンテキスト
 * @returns {number}
 */
const calculateCountMultiplyValue = (effect, context) => {
  const { baseValue = 0, countCondition = {} } = effect;

  // 除外するカードのuniqueId（自身を除く場合）
  const excludeUniqueId = countCondition.excludeSelf ? effect.uniqueId : null;

  // 条件を満たすモンスター数をカウント
  const count = countMonstersMatchingCondition(context, countCondition, excludeUniqueId);

  return count * baseValue;
};

/**
 * 条件付き値を計算
 * 例: ドラゴンがいる場合のみ400
 *
 * @param {Object} effect - 効果定義オブジェクト
 * @param {Object} context - ゲームコンテキスト
 * @returns {number}
 */
const calculateConditionalValue = (effect, context) => {
  const { value = 0, ifCondition = {} } = effect;

  // 条件が満たされているかチェック
  // ifCondition は場の状態などをチェックする特殊な条件
  if (checkIfCondition(ifCondition, context)) {
    return value;
  }

  return 0;
};

/**
 * if条件をチェック（場の状態など）
 *
 * @param {Object} ifCondition - if条件オブジェクト
 * @param {Object} context - ゲームコンテキスト
 * @returns {boolean}
 */
const checkIfCondition = (ifCondition, context) => {
  if (!ifCondition || Object.keys(ifCondition).length === 0) {
    return true;
  }

  const { effectOwner, p1Field, p2Field, p1Life, p2Life } = context;
  const field = effectOwner === 1 ? p1Field : p2Field;
  const life = effectOwner === 1 ? p1Life : p2Life;

  for (const [key, value] of Object.entries(ifCondition)) {
    switch (key) {
      case 'hasCategoryOnField':
        // 特定カテゴリが場にあるか
        if (!field.some((m) => m && m.category && m.category.includes(value))) {
          return false;
        }
        break;

      case 'hasCardOnField':
        // 特定カードが場にあるか
        if (!field.some((m) => m && m.id === value)) {
          return false;
        }
        break;

      case 'hasNameOnField':
        // 特定名前のカードが場にあるか
        if (!field.some((m) => m && m.name && m.name.includes(value))) {
          return false;
        }
        break;

      case 'hasAttributeOnField':
        // 特定属性が場にあるか
        if (!field.some((m) => m && m.attribute === value)) {
          return false;
        }
        break;

      case 'minMonstersOnField':
        // 場のモンスター数が指定数以上か
        if (field.filter((m) => m !== null).length < value) {
          return false;
        }
        break;

      case 'maxLife':
        // ライフが指定値以下か
        if (life > value) {
          return false;
        }
        break;

      case 'minLife':
        // ライフが指定値以上か
        if (life < value) {
          return false;
        }
        break;

      default:
        console.warn(`Unknown ifCondition key: ${key}`);
    }
  }

  return true;
};

/**
 * 効果にuniqueIdを設定するヘルパー
 * COUNT_MULTIPLY で excludeSelf を使う場合に必要
 *
 * @param {Object} effect - 効果定義オブジェクト
 * @param {string} uniqueId - カードのuniqueId
 * @returns {Object} uniqueIdが設定された効果オブジェクト
 */
export const setEffectUniqueId = (effect, uniqueId) => {
  return {
    ...effect,
    uniqueId,
  };
};
