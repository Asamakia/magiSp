/**
 * AIストラテジー - Hard（むずかしい）
 *
 * - Normal をベースに拡張
 * - シナジーを考慮した召喚（将来拡張）
 * - ダメージ期待値を最大化する攻撃
 * - トリガー・刹那詠唱を積極的に使用
 */

import { baseStrategy, randomPick } from './base';
import { normalStrategy } from './normal';

export const hardStrategy = {
  ...normalStrategy, // Normal をベースに拡張

  // コスト効率 + フィールド状況を考慮
  chooseSummon(summonableCards, gameState) {
    if (summonableCards.length === 0) return null;

    // フィールドにモンスターがいない場合は積極的に召喚
    const myMonsterCount = gameState.myField.filter(m => m).length;
    const opponentMonsterCount = gameState.opponentField.filter(m => m).length;

    // 相手より少ない場合は高コストカードも積極的に
    if (myMonsterCount < opponentMonsterCount) {
      // 攻撃力が高いカードを優先
      const sorted = [...summonableCards].sort((a, b) => {
        return (b.attack || 0) - (a.attack || 0);
      });
      return sorted[0];
    }

    // 通常はコスト効率で判断
    return normalStrategy.chooseSummon(summonableCards, gameState);
  },

  // ダメージ効率を最大化する攻撃対象選択
  chooseAttackTarget(validTargets, attacker, gameState) {
    if (validTargets.length === 0) return 'direct';

    const monsterTargets = validTargets.filter(t => t !== 'direct');
    const attackPower = attacker.currentAttack || attacker.attack || 0;

    // 相手フィールドにモンスターがいない場合は直接攻撃
    if (monsterTargets.length === 0) {
      return 'direct';
    }

    // 各ターゲットの評価
    const evaluatedTargets = monsterTargets.map(idx => {
      const target = gameState.opponentField[idx];
      if (!target) return { idx, score: -Infinity };

      const targetHp = target.currentHp || 0;
      const targetAttack = target.currentAttack || 0;
      const canKill = targetHp <= attackPower;

      // スコア計算
      let score = 0;
      if (canKill) {
        score += 1000; // 倒せるなら大きなボーナス
        score += targetAttack; // 脅威度の高いモンスターを優先
      } else {
        score += Math.min(attackPower, targetHp); // 与えられるダメージ
        score += targetAttack * 0.5; // 脅威度考慮
      }

      return { idx, score, canKill, targetAttack };
    });

    // スコア順にソート
    evaluatedTargets.sort((a, b) => b.score - a.score);

    // 直接攻撃との比較
    const bestTarget = evaluatedTargets[0];
    if (bestTarget && bestTarget.score > 0) {
      // 相手ライフが少なく、倒せるモンスターがいない場合は直接攻撃
      if (!bestTarget.canKill && gameState.opponentLife <= attackPower * 0.5) {
        return 'direct';
      }
      return bestTarget.idx;
    }

    return 'direct';
  },

  // スキルを積極的に使用
  chooseSkill(usableSkills, gameState) {
    if (usableSkills.length === 0) return null;

    // 上級技があれば必ず使用
    const advancedSkills = usableSkills.filter(s => s.skillType === 'advanced');
    if (advancedSkills.length > 0) {
      return advancedSkills[0];
    }

    // 基本技は60%の確率で使用
    if (Math.random() < 0.6) {
      return usableSkills[0];
    }

    return null;
  },

  // 戦略的なチャージ判断
  chooseCharge(chargeableCards, chargeableMonsters, gameState) {
    if (chargeableCards.length === 0 || chargeableMonsters.length === 0) return null;

    // チャージが0のモンスター
    const noChargeMonsters = chargeableMonsters.filter(m => m.currentCharges === 0);
    // チャージが1のモンスター
    const oneChargeMonsters = chargeableMonsters.filter(m => m.currentCharges === 1);

    let targetMonster = null;

    // 上級技を持つモンスターで、チャージが1のものを優先（すぐ上級技が使える）
    const oneChargeWithAdvanced = oneChargeMonsters.filter(m => m.monster.advancedSkill);
    if (oneChargeWithAdvanced.length > 0) {
      // 攻撃力が高いものを選択
      oneChargeWithAdvanced.sort((a, b) =>
        (b.monster.currentAttack || b.monster.attack || 0) - (a.monster.currentAttack || a.monster.attack || 0)
      );
      targetMonster = oneChargeWithAdvanced[0];
    } else if (noChargeMonsters.length > 0) {
      // チャージ0のモンスターから選択
      // 基本技を持つモンスターを優先
      const withBasic = noChargeMonsters.filter(m => m.monster.basicSkill);
      if (withBasic.length > 0) {
        // 攻撃力が高いものを選択
        withBasic.sort((a, b) =>
          (b.monster.currentAttack || b.monster.attack || 0) - (a.monster.currentAttack || a.monster.attack || 0)
        );
        targetMonster = withBasic[0];
      } else {
        // 上級技のみ持つモンスター（基本技なし）にもチャージ
        noChargeMonsters.sort((a, b) =>
          (b.monster.currentAttack || b.monster.attack || 0) - (a.monster.currentAttack || a.monster.attack || 0)
        );
        targetMonster = noChargeMonsters[0];
      }
    } else if (oneChargeMonsters.length > 0) {
      // チャージ1のモンスターに追加チャージ（上級技のため）
      oneChargeMonsters.sort((a, b) =>
        (b.monster.currentAttack || b.monster.attack || 0) - (a.monster.currentAttack || a.monster.attack || 0)
      );
      targetMonster = oneChargeMonsters[0];
    }

    if (!targetMonster) return null;

    // チャージに使うカードはモンスターと同じ属性のものを選択
    const targetAttribute = targetMonster.monster.attribute;
    const sameAttributeCards = chargeableCards.filter(card => card.attribute === targetAttribute);

    if (sameAttributeCards.length === 0) return null; // 同属性カードがなければチャージしない

    // コストが低いカードを優先するが、召喚に使いたいカードは温存
    const sortedCards = [...sameAttributeCards].sort((a, b) => {
      // 魔法カードやフィールドカードを優先（モンスターは温存）
      if (a.type !== 'monster' && b.type === 'monster') return -1;
      if (a.type === 'monster' && b.type !== 'monster') return 1;
      // 同じタイプならコストが低いものを優先
      return (a.cost || 0) - (b.cost || 0);
    });
    const cardToCharge = sortedCards[0];

    return {
      card: cardToCharge,
      monsterIndex: targetMonster.monsterIndex,
    };
  },

  // トリガーを積極的に発動
  chooseTrigger(activatableTriggers, gameState) {
    if (activatableTriggers.length === 0) return null;
    // 80%の確率で発動
    if (Math.random() < 0.8) {
      return activatableTriggers[0];
    }
    return null;
  },

  // 刹那詠唱を状況に応じて発動
  chooseSetsuna(availableSetsunaCards, chainContext, gameState) {
    if (availableSetsunaCards.length === 0) return null;

    // 攻撃宣言時
    if (chainContext.attacker) {
      const attackDamage = chainContext.attacker.currentAttack || 0;
      const myMonsters = gameState.myField.filter(m => m);

      // 自分のモンスターが倒されそうなら発動検討
      const endangered = myMonsters.some(m => (m.currentHp || 0) <= attackDamage);
      if (endangered) {
        // ダメージ系の刹那詠唱があれば使用
        const damageSetsuna = availableSetsunaCards.find(c =>
          c.effect?.includes('ダメージ') || c.effect?.includes('破壊')
        );
        if (damageSetsuna) return damageSetsuna;
      }
    }

    // バトル開始時は50%で発動
    if (chainContext.type === 'battleStart') {
      if (Math.random() < 0.5 && availableSetsunaCards.length > 0) {
        return availableSetsunaCards[0];
      }
    }

    return null;
  },

  // 魔法カードを状況に応じて使用
  chooseMagicCard(usableMagicCards, gameState) {
    if (usableMagicCards.length === 0) return null;

    // ダメージ系・回復系を優先
    const priorityCards = usableMagicCards.filter(c =>
      c.effect?.includes('ダメージ') ||
      c.effect?.includes('回復') ||
      c.effect?.includes('ドロー')
    );

    if (priorityCards.length > 0) {
      return priorityCards[0];
    }

    // それ以外は50%の確率で使用
    if (Math.random() < 0.5) {
      return usableMagicCards[0];
    }

    return null;
  },
};
