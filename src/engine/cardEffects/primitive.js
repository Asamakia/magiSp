// ========================================
// 原始属性カードの固有効果
// ========================================

import {
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  modifyAttack,
} from '../effectHelpers';

/**
 * 原始属性カードの固有効果
 */
export const primitiveCardEffects = {
  /**
   * C0000004: ゴミあさり粘液獣
   * 【召喚時】墓地の《粘液獣》モンスター1体を攻撃力半減して場に戻す
   */
  C0000004: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return reviveFromGraveyard(context, (card) => {
        return card.name && card.name.includes('粘液獣');
      }, true);
    }
    return false;
  },

  /**
   * C0000006: 新・超覚醒粘液獣ハイパー
   * 【召喚時】場にいる粘液獣1体につき、自身の攻撃力を1000アップ
   */
  C0000006: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      monsterIndex,
      p1Field, p2Field,
      setP1Field, setP2Field,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;

      const slimeCount = currentField.filter(m =>
        m && m.name && m.name.includes('粘液獣')
      ).length;

      if (slimeCount > 0) {
        const atkBoost = slimeCount * 1000;
        setField(prev => prev.map((m, idx) => {
          if (idx === monsterIndex && m) {
            addLog(`${m.name}の攻撃力が${atkBoost}アップ！`, 'info');
            return { ...m, attack: m.attack + atkBoost };
          }
          return m;
        }));
        return true;
      }
      return false;
    }
    return false;
  },

  /**
   * C0000008: 粘液獣・胞子
   * 【召喚時】デッキから《粘液獣》と名の付くカード1枚を手札に加える
   */
  C0000008: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.name && card.name.includes('粘液獣');
      }) !== null;
    }
    return false;
  },

  /**
   * C0000010: 粘液獣・融合体
   * 【召喚時】このカードと場の他の《粘液獣》1体を融合し、このカードの攻撃力を融合素材の合計に変更する
   */
  C0000010: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      monsterIndex,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

      const slimes = currentField.filter((m, idx) =>
        m && idx !== monsterIndex && m.name && m.name.includes('粘液獣')
      );

      if (slimes.length > 0) {
        const target = slimes[0];
        const fusionMonster = currentField[monsterIndex];
        const newAtk = fusionMonster.attack + target.attack;

        // 融合素材を墓地に送る
        setField(prev => prev.map((m, idx) => {
          if (m && m.uniqueId === target.uniqueId) {
            return null;
          }
          if (idx === monsterIndex && m) {
            return { ...m, attack: newAtk };
          }
          return m;
        }));
        setGraveyard(prev => [...prev, target]);

        addLog(`${target.name}を融合！攻撃力が${newAtk}に変更`, 'info');
        return true;
      } else {
        addLog('融合する粘液獣がいません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000011: 粘液獣・暴走体
   * 【召喚時】場にいる《粘液獣》1体を破壊し、そのコスト×300ダメージを相手プレイヤーに与える
   */
  C0000011: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

      const slimes = currentField.filter(m =>
        m && m.name && m.name.includes('粘液獣')
      );

      if (slimes.length > 0) {
        const target = slimes[0];
        const damage = target.cost * 300;

        // モンスターを破壊
        setField(prev => prev.map(m => {
          if (m && m.uniqueId === target.uniqueId) {
            return null;
          }
          return m;
        }));
        setGraveyard(prev => [...prev, target]);

        addLog(`${target.name}を破壊`, 'damage');
        conditionalDamage(context, damage, 'opponent');
        return true;
      } else {
        addLog('粘液獣がいません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000127: ゴシック・ローズ
   * 【召喚時】デッキから《ゴシック》または《鎖》魔法カード1枚を手札に加える
   */
  C0000127: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.type === 'magic' &&
               card.name && (card.name.includes('ゴシック') || card.name.includes('鎖'));
      }) !== null;
    }
    return false;
  },

  /**
   * C0000128: 鎖縛のメイド
   * 【召喚時】相手モンスター1体の攻撃力をターン終了時まで0にする
   */
  C0000128: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const opponentField = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

      const monsters = opponentField.filter(m => m !== null);
      if (monsters.length === 0) {
        addLog('相手モンスターがいません', 'info');
        return true;
      }

      const target = monsters[0];
      setOpponentField(prev => prev.map(m => {
        if (m && m.uniqueId === target.uniqueId) {
          addLog(`${m.name}の攻撃力を0にした`, 'info');
          return { ...m, attack: 0 };
        }
        return m;
      }));

      return true;
    }
    return false;
  },

  // 他の原始属性カードを追加...
};
