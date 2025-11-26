/**
 * 常時効果システム: 効果定義集約
 *
 * このファイルは全属性/タイプの効果定義を集約してエクスポートします。
 * 新しい属性ファイルを追加した場合は、ここでインポートしてマージしてください。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

// 各属性/タイプの効果定義をインポート
// ファイルが作成されたらコメントを解除してください

// import { fieldCardEffects } from './fieldCards';
// import { phaseCardEffects } from './phaseCards';
// import { fireCardEffects } from './fireCards';
// import { waterCardEffects } from './waterCards';
// import { lightCardEffects } from './lightCards';
// import { darkCardEffects } from './darkCards';
// import { primitiveCardEffects } from './primitiveCards';
// import { futureCardEffects } from './futureCards';
// import { neutralCardEffects } from './neutralCards';

/**
 * 全効果定義を集約したオブジェクト
 * カードID => 効果定義配列
 */
export const allEffectDefinitions = {
  // フィールドカード
  // ...fieldCardEffects,

  // フェイズカード
  // ...phaseCardEffects,

  // 炎属性モンスター
  // ...fireCardEffects,

  // 水属性モンスター
  // ...waterCardEffects,

  // 光属性モンスター
  // ...lightCardEffects,

  // 闇属性モンスター
  // ...darkCardEffects,

  // 原始属性モンスター
  // ...primitiveCardEffects,

  // 未来属性モンスター
  // ...futureCardEffects,

  // なし属性モンスター
  // ...neutralCardEffects,
};

/**
 * 特定カードの効果定義を取得
 * @param {string} cardId - カードID
 * @returns {Array|null} 効果定義配列 または null
 */
export const getEffectDefinition = (cardId) => {
  return allEffectDefinitions[cardId] || null;
};

/**
 * 効果定義が存在するかチェック
 * @param {string} cardId - カードID
 * @returns {boolean}
 */
export const hasEffectDefinition = (cardId) => {
  return cardId in allEffectDefinitions;
};

/**
 * 登録されている効果定義の数を取得
 * @returns {number}
 */
export const getEffectDefinitionCount = () => {
  return Object.keys(allEffectDefinitions).length;
};

/**
 * 全カードIDを取得
 * @returns {string[]}
 */
export const getAllDefinedCardIds = () => {
  return Object.keys(allEffectDefinitions);
};
