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
