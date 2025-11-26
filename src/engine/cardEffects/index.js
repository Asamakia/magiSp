// ========================================
// カード固有効果レジストリ
// 各属性ファイルから効果をインポートして統合
// ========================================

// 属性別カード効果をインポート
import { fireCardEffects } from './fire';
import { waterCardEffects } from './water';
import { lightCardEffects } from './light';
import { darkCardEffects } from './dark';
import { primitiveCardEffects } from './primitive';
import { futureCardEffects } from './future';
import { neutralCardEffects } from './neutral';

/**
 * 全カード固有効果のレジストリ
 * 各属性のエフェクトを自動的にマージ
 */
export const CARD_SPECIFIC_EFFECTS = {
  ...fireCardEffects,
  ...waterCardEffects,
  ...lightCardEffects,
  ...darkCardEffects,
  ...primitiveCardEffects,
  ...futureCardEffects,
  ...neutralCardEffects,
};

/**
 * カードIDから固有効果を取得
 * @param {string} cardId - カードID (例: 'C0000279')
 * @returns {Function|null} 効果関数またはnull
 */
export const getCardEffect = (cardId) => {
  return CARD_SPECIFIC_EFFECTS[cardId] || null;
};

/**
 * カードに固有効果があるかチェック
 * @param {string} cardId - カードID
 * @returns {boolean}
 */
export const hasCardEffect = (cardId) => {
  return !!CARD_SPECIFIC_EFFECTS[cardId];
};

/**
 * 登録されているカード固有効果の数を取得
 * @returns {number}
 */
export const getRegisteredEffectCount = () => {
  return Object.keys(CARD_SPECIFIC_EFFECTS).length;
};
