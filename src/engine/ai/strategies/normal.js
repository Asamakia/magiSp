/**
 * AIストラテジー - Normal（ふつう）
 *
 * - コスト効率の良いカードを優先召喚
 * - HPの低い敵を優先攻撃
 * - 有利な状況でスキル使用
 */

import { baseStrategy, randomPick, shuffleArray } from './base';

export const normalStrategy = {
  ...baseStrategy,

  // コスト効率でソートして召喚
  chooseSummon(summonableCards, gameState) {
    if (summonableCards.length === 0) return null;

    // 攻撃力/コスト比でソート（高い順）
    const sorted = [...summonableCards].sort((a, b) => {
      const ratioA = (a.attack || 0) / Math.max(1, a.cost);
      const ratioB = (b.attack || 0) / Math.max(1, b.cost);
      return ratioB - ratioA;
    });

    return sorted[0];
  },

  // HPが低い敵を優先攻撃
  chooseAttackTarget(validTargets, attacker, gameState) {
    if (validTargets.length === 0) return 'direct';

    const monsterTargets = validTargets.filter(t => t !== 'direct');

    // 相手フィールドにモンスターがいない場合は直接攻撃
    if (monsterTargets.length === 0) {
      return 'direct';
    }

    // HPが最も低いモンスターを選択
    const targetHPs = monsterTargets.map(idx => ({
      idx,
      hp: gameState.opponentField[idx]?.currentHp || Infinity,
      attack: gameState.opponentField[idx]?.currentAttack || 0,
    }));
    targetHPs.sort((a, b) => a.hp - b.hp);

    // 倒せる相手がいれば優先
    const attackPower = attacker.currentAttack || attacker.attack || 0;
    const killable = targetHPs.find(t => t.hp <= attackPower);
    if (killable) return killable.idx;

    // 相手のライフが少なければ直接攻撃
    if (gameState.opponentLife <= attackPower * 0.5) {
      return 'direct';
    }

    // 脅威度の高い（攻撃力が高い）モンスターを優先
    const highThreat = [...targetHPs].sort((a, b) => b.attack - a.attack);
    if (highThreat[0] && highThreat[0].attack >= attackPower) {
      return highThreat[0].idx;
    }

    return targetHPs[0].idx;
  },

  // 有利な状況でスキル使用
  chooseSkill(usableSkills, gameState) {
    if (usableSkills.length === 0) return null;

    // 上級技が使えれば優先
    const advancedSkills = usableSkills.filter(s => s.skillType === 'advanced');
    if (advancedSkills.length > 0) {
      return advancedSkills[0];
    }

    // 基本技は30%の確率で使用
    if (Math.random() < 0.3) {
      return usableSkills[0];
    }

    return null;
  },

  // トリガーは50%の確率で発動
  chooseTrigger(activatableTriggers, gameState) {
    if (activatableTriggers.length === 0) return null;
    if (Math.random() < 0.5) {
      return activatableTriggers[0];
    }
    return null;
  },

  // 攻撃力が高いモンスターから攻撃
  chooseAttackOrder(attackableIndices, gameState) {
    if (attackableIndices.length === 0) return [];

    // 攻撃力でソート（高い順）
    const sorted = [...attackableIndices].sort((a, b) => {
      const attackA = gameState.myField[a]?.currentAttack || 0;
      const attackB = gameState.myField[b]?.currentAttack || 0;
      return attackB - attackA;
    });

    return sorted;
  },

  // 魔法カードは30%の確率で使用
  chooseMagicCard(usableMagicCards, gameState) {
    if (usableMagicCards.length === 0) return null;
    if (Math.random() < 0.3) {
      return usableMagicCards[0];
    }
    return null;
  },
};
