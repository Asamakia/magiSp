/**
 * 常時効果システム: 効果定義集約
 *
 * このファイルは全属性/タイプの効果定義を集約してエクスポートします。
 * 新しい属性ファイルを追加した場合は、ここでインポートしてマージしてください。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

// 各属性/タイプの効果定義をインポート
import { fieldCardEffects } from './fieldCards';
import { monsterCardEffects } from './monsterCards';

// フェイズカード（段階別効果）
import {
  phaseCardEffectsByStage,
  getPhaseCardEffectsForStage,
  hasPhaseCardContinuousEffects,
  getAllPhaseCardEffects,
  getPhaseCardCount,
} from './phaseCards';

/**
 * 全効果定義を集約したオブジェクト
 * カードID => 効果定義配列
 * Note: フェイズカードは段階別なので別管理
 */
export const allEffectDefinitions = {
  // フィールドカード（23枚）
  ...fieldCardEffects,

  // モンスターカード（22枚）
  ...monsterCardEffects,
};

// フェイズカード関連をエクスポート
export {
  phaseCardEffectsByStage,
  getPhaseCardEffectsForStage,
  hasPhaseCardContinuousEffects,
  getAllPhaseCardEffects,
  getPhaseCardCount,
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
