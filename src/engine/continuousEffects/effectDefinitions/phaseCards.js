/**
 * 常時効果システム: フェイズカードの効果定義
 *
 * フェイズカードの【常時】効果を定義します。
 * フェイズカードは段階(stage)によって効果が変わるため、
 * 各段階ごとに効果を定義しています。
 *
 * 段階の定義:
 * - stage 0: 初期効果
 * - stage 1: 1枚重ね効果
 * - stage 2: 2枚重ね効果
 * - stage 3: 3枚重ね効果（最終）
 *
 * Note: 効果は上書き方式です。新しい段階の効果が発動すると、
 * 前の段階の効果は無効になります。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

import { CONTINUOUS_EFFECT_TYPES } from '../effectTypes';
import { TARGET_TYPES } from '../targetTypes';

/**
 * フェイズカードの段階別常時効果定義
 *
 * 構造:
 * {
 *   [cardId]: {
 *     [stage]: [effects...]
 *   }
 * }
 */
export const phaseCardEffectsByStage = {
  // ========================================
  // 炎属性フェイズカード
  // ========================================

  /**
   * C0000185: 岩狸の山里
   * 初期効果: 【常時】場にいる《岩狸》モンスターの攻撃力を300アップ。
   * 2枚重ね: 【常時】場にいる《岩狸》モンスターの攻撃力を800アップ。（上書き）
   */
  C0000185: {
    0: [
      {
        type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
        value: 300,
        target: TARGET_TYPES.SELF_MONSTERS,
        condition: { nameIncludes: '岩狸' },
      },
    ],
    1: [], // 1枚重ねには常時効果なし
    2: [
      {
        type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
        value: 800,
        target: TARGET_TYPES.SELF_MONSTERS,
        condition: { nameIncludes: '岩狸' },
      },
    ],
    3: [], // 3枚重ねには常時効果なし（発動効果のみ）
  },

  // ========================================
  // 未来属性フェイズカード
  // ========================================

  /**
   * C0000266: エクラシアの時空炉
   * 1枚重ね: 【常時】「未来属性」モンスターの攻撃力を400アップ。
   * 2枚重ね: 【常時】［エクラシア］モンスターの召喚コストを1軽減。
   */
  C0000266: {
    0: [], // 初期効果は発動時効果のみ
    1: [
      {
        type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
        value: 400,
        target: TARGET_TYPES.SELF_MONSTERS,
        condition: { attribute: '未来' },
      },
    ],
    2: [
      {
        type: CONTINUOUS_EFFECT_TYPES.SUMMON_COST_MODIFIER,
        value: -1,
        target: TARGET_TYPES.SELF_SUMMON,
        condition: { category: '【エクラシア】' },
      },
    ],
    3: [], // 3枚重ねは発動効果のみ
  },

  // ========================================
  // 水属性フェイズカード
  // ========================================

  /**
   * C0000339: アクアレギナの動力-エテルノス・コア
   * 初期効果: 【常時】『アクアレギナ』または『ヴェルゼファール』モンスターの攻撃力を400アップ。
   */
  C0000339: {
    0: [
      {
        type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
        value: 400,
        target: TARGET_TYPES.SELF_MONSTERS,
        condition: { nameIncludes: 'アクアレギナ' },
      },
      {
        type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
        value: 400,
        target: TARGET_TYPES.SELF_MONSTERS,
        condition: { nameIncludes: 'ヴェルゼファール' },
      },
    ],
    1: [], // 1枚重ねはエンドフェイズ効果のみ
    2: [], // 2枚重ねは召喚時効果のみ
    3: [], // 3枚重ねは発動効果のみ
  },

  // ========================================
  // 光属性フェイズカード
  // ========================================

  /**
   * C0000352: アヴィクルスの試練
   * 初期効果: 【常時】《ヴォランティス》モンスターの攻撃力を400アップ。
   */
  C0000352: {
    0: [
      {
        type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
        value: 400,
        target: TARGET_TYPES.SELF_MONSTERS,
        condition: { nameIncludes: 'ヴォランティス' },
      },
    ],
    1: [], // 1枚重ねはエンドフェイズ効果のみ
    2: [], // 2枚重ねは召喚時効果のみ
    3: [], // 3枚重ねは発動効果のみ
  },
};

/**
 * フェイズカードの指定段階の常時効果を取得
 * @param {string} cardId - カードID
 * @param {number} stage - 段階（0-3）
 * @returns {Array} 効果定義配列
 */
export const getPhaseCardEffectsForStage = (cardId, stage) => {
  const cardEffects = phaseCardEffectsByStage[cardId];
  if (!cardEffects) {
    return [];
  }
  return cardEffects[stage] || [];
};

/**
 * フェイズカードが常時効果を持つかチェック
 * @param {string} cardId - カードID
 * @returns {boolean}
 */
export const hasPhaseCardContinuousEffects = (cardId) => {
  return cardId in phaseCardEffectsByStage;
};

/**
 * フェイズカードの全段階の効果を取得
 * @param {string} cardId - カードID
 * @returns {Object|null} 全段階の効果 { 0: [], 1: [], 2: [], 3: [] }
 */
export const getAllPhaseCardEffects = (cardId) => {
  return phaseCardEffectsByStage[cardId] || null;
};

/**
 * 登録されているフェイズカード数を取得
 * @returns {number}
 */
export const getPhaseCardCount = () => {
  return Object.keys(phaseCardEffectsByStage).length;
};
