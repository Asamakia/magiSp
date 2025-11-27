/**
 * AIストラテジー - Easy（かんたん）
 *
 * - ランダムに1枚だけ召喚
 * - 攻撃は直接攻撃優先
 * - スキル・トリガーは使用しない
 */

import { baseStrategy, randomPick } from './base';

export const easyStrategy = {
  ...baseStrategy,

  // 1枚だけランダム召喚（50%の確率で召喚しない）
  chooseSummon(summonableCards, gameState) {
    if (summonableCards.length === 0) return null;
    // 50%の確率で召喚しない
    if (Math.random() < 0.3) return null;
    return randomPick(summonableCards);
  },

  // 直接攻撃を優先（70%）
  chooseAttackTarget(validTargets, attacker, gameState) {
    if (validTargets.length === 0) return 'direct';
    if (validTargets.includes('direct')) {
      return Math.random() < 0.7 ? 'direct' : randomPick(validTargets);
    }
    return randomPick(validTargets);
  },

  // スキルは使用しない
  chooseSkill(usableSkills, gameState) {
    return null;
  },

  // トリガーは発動しない
  chooseTrigger(activatableTriggers, gameState) {
    return null;
  },

  // 刹那詠唱は発動しない
  chooseSetsuna(availableSetsunaCards, chainContext, gameState) {
    return null;
  },

  // 魔法カードは使用しない
  chooseMagicCard(usableMagicCards, gameState) {
    return null;
  },
};
