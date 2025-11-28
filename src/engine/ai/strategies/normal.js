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

  // チャージ判断（攻撃力が高いモンスターを優先）
  chooseCharge(chargeableCards, chargeableMonsters, gameState) {
    if (chargeableCards.length === 0 || chargeableMonsters.length === 0) return null;

    // チャージが0のモンスターを優先（基本技を使えるようにする）
    const noChargeMonsters = chargeableMonsters.filter(m => m.currentCharges === 0);
    // チャージが1のモンスターも考慮（上級技を使えるようにする）
    const oneChargeMonsters = chargeableMonsters.filter(m => m.currentCharges === 1);

    let targetMonster = null;

    // まずはチャージ0のモンスターから攻撃力が高いものを選択
    if (noChargeMonsters.length > 0) {
      noChargeMonsters.sort((a, b) => (b.monster.currentAttack || b.monster.attack || 0) - (a.monster.currentAttack || a.monster.attack || 0));
      targetMonster = noChargeMonsters[0];
    } else if (oneChargeMonsters.length > 0) {
      // チャージ1のモンスターから上級技を持つものを優先
      const withAdvanced = oneChargeMonsters.filter(m => m.monster.advancedSkill);
      if (withAdvanced.length > 0) {
        withAdvanced.sort((a, b) => (b.monster.currentAttack || b.monster.attack || 0) - (a.monster.currentAttack || a.monster.attack || 0));
        targetMonster = withAdvanced[0];
      }
    }

    if (!targetMonster) return null;

    // チャージに使うカードはモンスターと同じ属性のものを選択
    const targetAttribute = targetMonster.monster.attribute;
    const sameAttributeCards = chargeableCards.filter(card => card.attribute === targetAttribute);

    if (sameAttributeCards.length === 0) return null; // 同属性カードがなければチャージしない

    // コストが低いものを優先（貴重なカードを温存）
    const sortedCards = [...sameAttributeCards].sort((a, b) => (a.cost || 0) - (b.cost || 0));
    const cardToCharge = sortedCards[0];

    return {
      card: cardToCharge,
      monsterIndex: targetMonster.monsterIndex,
    };
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

  // フィールドカード配置（基本条件判断）
  chooseFieldCard(placeableFieldCards, gameState) {
    if (placeableFieldCards.length === 0) return null;

    // 30%の確率で配置しない（判断ミス）
    if (Math.random() < 0.3) return null;

    const myMonsters = gameState.myField.filter(m => m).length;
    const opponentMonsters = gameState.opponentField.filter(m => m).length;

    // 相手にモンスターがいて、こちらにいない → モンスター優先（配置しない）
    if (opponentMonsters > 0 && myMonsters === 0) return null;

    // 同属性モンスターが手札にあるフィールドカードを探す
    const matchingFieldCard = placeableFieldCards.find(fieldCard => {
      return gameState.myHand.some(card =>
        card.type === 'monster' && card.attribute === fieldCard.attribute
      );
    });

    // 手札に相性の良いモンスターがあれば配置
    if (matchingFieldCard) {
      return matchingFieldCard;
    }

    // フィールドに同属性モンスターがいれば配置
    const fieldMatchingCard = placeableFieldCards.find(fieldCard => {
      return gameState.myField.some(monster =>
        monster && monster.attribute === fieldCard.attribute
      );
    });

    if (fieldMatchingCard) {
      return fieldMatchingCard;
    }

    return null;
  },

  // フェイズカード配置（基本条件判断）
  choosePhaseCard(placeablePhaseCards, gameState) {
    if (placeablePhaseCards.length === 0) return null;

    // 30%の確率で配置しない
    if (Math.random() < 0.3) return null;

    const myMonsters = gameState.myField.filter(m => m).length;
    const opponentMonsters = gameState.opponentField.filter(m => m).length;

    // 相手にモンスターがいて、こちらにいない → モンスター優先
    if (opponentMonsters > 0 && myMonsters === 0) return null;

    // 同属性モンスターが手札またはフィールドにあれば配置
    const matchingPhaseCard = placeablePhaseCards.find(phaseCard => {
      const hasInHand = gameState.myHand.some(card =>
        card.type === 'monster' && card.attribute === phaseCard.attribute
      );
      const hasOnField = gameState.myField.some(monster =>
        monster && monster.attribute === phaseCard.attribute
      );
      return hasInHand || hasOnField;
    });

    if (matchingPhaseCard) {
      return matchingPhaseCard;
    }

    return null;
  },
};
