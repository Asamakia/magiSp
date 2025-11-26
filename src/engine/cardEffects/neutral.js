// ========================================
// なし属性カードの固有効果
// ========================================

import {
  conditionalDamage,
  searchCard,
  drawCards,
} from '../effectHelpers';

/**
 * なし属性カードの固有効果
 *
 * 注意: なし属性は汎用的なカードが多いため、
 * 多くは汎用パーサーで処理できます。
 * 複雑な効果を持つカードのみここに実装します。
 */
export const neutralCardEffects = {
  // 現時点では実装するカードなし
  // 必要に応じて追加してください

  // 例：
  // C0000XXX: (skillText, context) => {
  //   // 効果の実装
  //   return false;
  // },
};
