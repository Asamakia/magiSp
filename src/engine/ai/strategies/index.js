/**
 * AIストラテジー - インデックス
 *
 * 難易度に応じたストラテジーを取得する
 */

import { baseStrategy, randomPick, shuffleArray } from './base';
import { easyStrategy } from './easy';
import { normalStrategy } from './normal';
import { hardStrategy } from './hard';

const difficultyStrategies = {
  easy: easyStrategy,
  normal: normalStrategy,
  hard: hardStrategy,
};

/**
 * 難易度からストラテジーを取得
 * @param {string} difficulty - 難易度 ('easy' | 'normal' | 'hard')
 * @param {string|null} deckStrategyId - デッキ専用ストラテジーID（将来拡張用）
 * @returns {Object} ストラテジーオブジェクト
 */
export function getStrategy(difficulty, deckStrategyId = null) {
  const difficultyStrategy = difficultyStrategies[difficulty] || baseStrategy;

  // 将来拡張: デッキ専用ストラテジー
  // if (deckStrategyId) {
  //   const deckStrategy = getDeckStrategy(deckStrategyId);
  //   return mergeStrategies(difficultyStrategy, deckStrategy);
  // }

  return difficultyStrategy;
}

/**
 * ストラテジーをマージ（将来拡張用）
 * デッキ専用ストラテジーがnullを返した場合は難易度ストラテジーを使用
 */
// function mergeStrategies(baseStrat, deckStrat) {
//   const merged = {};
//   for (const key of Object.keys(baseStrategy)) {
//     merged[key] = (...args) => {
//       if (deckStrat[key]) {
//         const result = deckStrat[key](...args);
//         if (result !== null && result !== undefined) return result;
//       }
//       return baseStrat[key](...args);
//     };
//   }
//   return merged;
// }

export {
  baseStrategy,
  easyStrategy,
  normalStrategy,
  hardStrategy,
  randomPick,
  shuffleArray,
};
