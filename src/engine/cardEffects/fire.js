// ========================================
// 炎属性カードの固有効果
// ========================================

import {
  millDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  drawCards,
  modifyAttack,
} from '../effectHelpers';
import { hasCategory } from '../../utils/helpers';

/**
 * 炎属性カードの固有効果
 */
export const fireCardEffects = {
  /**
   * C0000028: 炎竜母フレイマ
   * 【召喚時】墓地の［ドラゴン］モンスター1体を攻撃力半減で場に戻す
   */
  C0000028: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return reviveFromGraveyard(context, (card) => {
        return hasCategory(card, '【ドラゴン】');
      }, true); // 攻撃力半減
    }
    return false;
  },

  /**
   * C0000161: 灯魔龍ランプデビル
   * 【召喚時】場にいる全ての炎属性モンスターに3000ダメージを与え、破壊したモンスター×600のダメージを相手プレイヤーに与える
   */
  C0000161: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('【召喚時】')) {
      let destroyedCount = 0;

      // 両プレイヤーのフィールドの炎属性モンスターにダメージ
      [1, 2].forEach(player => {
        const field = player === 1 ? p1Field : p2Field;
        const setField = player === 1 ? setP1Field : setP2Field;
        const setGraveyard = player === 1 ? setP1Graveyard : setP2Graveyard;

        const fireMonsters = field.filter(m => m && m.attribute === '炎');
        const destroyedMonsters = [];

        setField(prev => prev.map(m => {
          if (m && m.attribute === '炎') {
            const newHp = m.currentHp - 3000;
            if (newHp <= 0) {
              destroyedMonsters.push(m);
              destroyedCount++;
              return null;
            }
            return { ...m, currentHp: newHp };
          }
          return m;
        }));

        if (destroyedMonsters.length > 0) {
          setGraveyard(prev => [...prev, ...destroyedMonsters]);
        }
      });

      addLog(`炎属性モンスターに3000ダメージ！${destroyedCount}体破壊`, 'damage');

      // 破壊したモンスター×600ダメージを相手に
      if (destroyedCount > 0) {
        const damage = destroyedCount * 600;
        conditionalDamage(context, damage, 'opponent');
      }

      return true;
    }
    return false;
  },

  /**
   * C0000163: 岩狸・石ころ丸
   * 基本技：チャージを消費してデッキから【ビースト・狸】モンスター1体を手札に加える
   */
  C0000163: (skillText, context) => {
    if (skillText.includes('基本技')) {
      return searchCard(context, (card) => {
        return hasCategory(card, '【ビースト・狸】');
      }) !== null;
    }
    return false;
  },

  /**
   * C0000165: 岩狸・熔岩守
   * 【召喚時】相手モンスター1体の攻撃力をターン終了時まで500ダウン
   */
  C0000165: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return modifyAttack(context, -500, 0, true, false);
    }
    return false;
  },

  /**
   * C0000167: 岩狸・剛石権蔵
   * 【召喚時】墓地の［マグマフォージ］モンスター1体を場に戻す（攻撃力半分）
   */
  C0000167: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return reviveFromGraveyard(context, (card) => {
        return hasCategory(card, '【マグマフォージ】');
      }, true);
    }
    return false;
  },

  /**
   * C0000169: 岩狸・火山頭
   * 【召喚時】自分のSPを1減らすことで相手の場にいるモンスター1体に2000ダメージ
   */
  C0000169: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1ActiveSP, p2ActiveSP,
      setP1ActiveSP, setP2ActiveSP,
      setP1RestedSP, setP2RestedSP,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;

      if (activeSP >= 1) {
        // SP消費
        if (currentPlayer === 1) {
          setP1ActiveSP(prev => prev - 1);
          setP1RestedSP(prev => prev + 1);
        } else {
          setP2ActiveSP(prev => prev - 1);
          setP2RestedSP(prev => prev + 1);
        }

        conditionalDamage(context, 2000, 'opponent_monster', 0);
        return true;
      } else {
        addLog('SPが足りません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000171: 岩狸・熔岩権蔵・極
   * 【召喚時】自分の場にいる《岩狸》モンスター1体を破壊し、その攻撃力の半分のダメージを相手プレイヤーに与える
   */
  C0000171: (skillText, context) => {
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

      const tanukiMonsters = currentField.filter(m => m && m.name && m.name.includes('岩狸'));

      if (tanukiMonsters.length > 0) {
        const target = tanukiMonsters[0];
        const damage = Math.floor(target.attack / 2);

        // モンスターを破壊
        setField(prev => prev.map(m => {
          if (m && m.uniqueId === target.uniqueId) {
            return null;
          }
          return m;
        }));
        setGraveyard(prev => [...prev, target]);

        addLog(`${target.name}を破壊`, 'damage');

        // ダメージを与える
        conditionalDamage(context, damage, 'opponent');
        return true;
      } else {
        addLog('岩狸モンスターがいません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000369: 炎翼の鳥民・イグニス
   * 【召喚時】自分の手札1枚を墓地に送り、相手プレイヤーに600ダメージを与える
   */
  C0000369: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentHand = currentPlayer === 1 ? p1Hand : p2Hand;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

      if (currentHand.length > 0) {
        const discardedCard = currentHand[0];
        setHand(prev => prev.slice(1));
        setGraveyard(prev => [...prev, discardedCard]);
        addLog(`手札から「${discardedCard.name}」を墓地に送った`, 'info');

        conditionalDamage(context, 600, 'opponent');
        return true;
      } else {
        addLog('手札がありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000377: 虹羽密林の赤花蔓・カルティノス
   * 【召喚時】自分のデッキの上から2枚を墓地に送り、その中に《虹羽密林》モンスターが含まれていた場合、相手プレイヤーに300ダメージを与える
   */
  C0000377: (skillText, context) => {
    const { addLog } = context;

    if (skillText.includes('【召喚時】')) {
      const milledCards = millDeck(context, 2);

      if (milledCards.length > 0) {
        const hasRainbowMonster = milledCards.some(card =>
          card.name && card.name.includes('虹羽密林')
        );

        if (hasRainbowMonster) {
          conditionalDamage(context, 300, 'opponent');
          addLog('虹羽密林モンスターが含まれていた！', 'info');
        }
        return true;
      }
      return false;
    }
    return false;
  },

  /**
   * C0000398: 呪術狩りの呪焔術師ガルドリック
   * 【召喚時】自分の墓地のコスト3の魔法カード1枚を手札に戻す
   */
  C0000398: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Graveyard, p2Graveyard,
      setP1Graveyard, setP2Graveyard,
      setP1Hand, setP2Hand,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

      const targetCard = currentGraveyard.find(card =>
        card.type === 'magic' && card.cost === 3
      );

      if (targetCard) {
        setGraveyard(prev => prev.filter(c => c.uniqueId !== targetCard.uniqueId));
        setHand(prev => [...prev, targetCard]);
        addLog(`墓地から「${targetCard.name}」を手札に戻した`, 'info');
        return true;
      } else {
        addLog('墓地にコスト3の魔法カードがありません', 'info');
        return false;
      }
    }
    return false;
  },

  // 他の炎属性カードを追加...
};
