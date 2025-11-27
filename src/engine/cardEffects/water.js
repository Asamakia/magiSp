// ========================================
// 水属性カードの固有効果
// ========================================

import {
  millDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  modifyAttack,
  applyStatusToOpponentMonster,
} from '../effectHelpers';
import { STATUS_EFFECT_TYPES } from '../statusEffects';

/**
 * 水属性カードの固有効果
 */
export const waterCardEffects = {
  /**
   * C0000142: ブリザードマスター
   * 【召喚時】デッキから《ブリザード》または《猫》魔法カード1枚を手札に加える
   */
  C0000142: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.type === 'magic' &&
               (card.name.includes('ブリザード') || card.name.includes('猫'));
      }) !== null;
    }
    return false;
  },

  /**
   * C0000147: ブリザードキャット・シャード
   * 【召喚時】相手モンスター1体に、場にいる《ブリザードキャット》×500ダメージを与える
   */
  C0000147: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const blizzardCatCount = currentField.filter(m =>
        m && m.name && m.name.includes('ブリザードキャット')
      ).length;

      if (blizzardCatCount > 0) {
        const damage = blizzardCatCount * 500;
        addLog(`ブリザードキャット×${blizzardCatCount}`, 'info');
        return conditionalDamage(context, damage, 'opponent_monster', 0);
      } else {
        addLog('ブリザードキャットがいません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000148: 氷の双尾猫
   * 基本技：1度のみ使用可能、手札を1枚捨て自分の墓地の《ブリザードキャット》1体を場に戻す（HP半分）
   */
  C0000148: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('基本技')) {
      const currentHand = currentPlayer === 1 ? p1Hand : p2Hand;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

      if (currentHand.length > 0) {
        // 手札を1枚捨てる
        const discardedCard = currentHand[0];
        setHand(prev => prev.slice(1));
        setGraveyard(prev => [...prev, discardedCard]);
        addLog(`手札から「${discardedCard.name}」を墓地に送った`, 'info');

        // 墓地からブリザードキャットを蘇生
        return reviveFromGraveyard(context, (card) => {
          return card.name && card.name.includes('ブリザードキャット');
        }, true); // HP半分
      } else {
        addLog('手札がありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000313: アクア・リヴァイアサン
   * 【召喚時】相手の場にいるモンスター全ての攻撃力をターン終了時まで500下げる
   */
  C0000313: (skillText, context) => {
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

      setOpponentField(prev => prev.map(m => {
        if (m) {
          const newAtk = Math.max(0, m.attack - 500);
          return { ...m, attack: newAtk };
        }
        return m;
      }));

      addLog('相手モンスター全体の攻撃力を500ダウン', 'info');
      return true;
    }
    return false;
  },

  /**
   * C0000330: アクアレギナの漂流漁師
   * 【召喚時】墓地の『アクアレギア』と名の付くモンスター1体をデッキに戻すと、レスト状態のSPトークンをアクティブにする
   */
  C0000330: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Graveyard, p2Graveyard,
      setP1Graveyard, setP2Graveyard,
      setP1Deck, setP2Deck,
      p1RestedSP, p2RestedSP,
      setP1ActiveSP, setP2ActiveSP,
      setP1RestedSP, setP2RestedSP,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
      const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;

      const aquaCard = currentGraveyard.find(card =>
        card.name && card.name.includes('アクアレギア')
      );

      if (aquaCard) {
        // デッキに戻す
        setGraveyard(prev => prev.filter(c => c.uniqueId !== aquaCard.uniqueId));
        setDeck(prev => [...prev, aquaCard]);
        addLog(`墓地から「${aquaCard.name}」をデッキに戻した`, 'info');

        // SPをアクティブに
        if (restedSP > 0) {
          if (currentPlayer === 1) {
            setP1ActiveSP(prev => prev + 1);
            setP1RestedSP(prev => prev - 1);
          } else {
            setP2ActiveSP(prev => prev + 1);
            setP2RestedSP(prev => prev - 1);
          }
          addLog('レストSPを1個アクティブにした', 'info');
        }
        return true;
      } else {
        addLog('墓地にアクアレギアモンスターがありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000150: 氷の吐息
   * 相手モンスター1体の攻撃力を800下げ、ターン終了時まで「凍結（攻撃力半減＋行動不能）」にする
   * 相手はターン開始時にSP1支払いで解除可能
   */
  C0000150: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setPendingTargetSelection,
    } = context;

    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

    // 対象となる相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return false;
    }

    // 1体のみの場合は自動選択
    if (validTargets.length === 1) {
      const targetIndex = validTargets[0].index;
      const targetMonster = validTargets[0].monster;

      // ATK-800を適用
      setOpponentField(prev => {
        const newField = [...prev];
        if (newField[targetIndex]) {
          const newAtk = Math.max(0, newField[targetIndex].currentAttack - 800);
          newField[targetIndex] = {
            ...newField[targetIndex],
            currentAttack: newAtk,
          };
        }
        return newField;
      });
      addLog(`${targetMonster.name}の攻撃力を800ダウン`, 'damage');

      // 凍結を付与（duration: 0 = ターン終了時まで、sp1Remove: SP1で解除可能）
      applyStatusToOpponentMonster(context, targetIndex, STATUS_EFFECT_TYPES.FREEZE, {
        duration: 0, // ターン終了時に自動解除
        removeChance: 0, // 確率解除なし
        sp1Remove: true, // SP1支払いで解除可能フラグ
      }, '氷の吐息');

      return true;
    }

    // 複数体の場合は選択UI表示
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: '凍結を与える相手モンスターを選択してください',
        targetType: 'opponent_monster',
        callback: (selectedIndex) => {
          const targetMonster = opponentField[selectedIndex];
          if (!targetMonster) return;

          // ATK-800を適用
          setOpponentField(prev => {
            const newField = [...prev];
            if (newField[selectedIndex]) {
              const newAtk = Math.max(0, newField[selectedIndex].currentAttack - 800);
              newField[selectedIndex] = {
                ...newField[selectedIndex],
                currentAttack: newAtk,
              };
            }
            return newField;
          });
          addLog(`${targetMonster.name}の攻撃力を800ダウン`, 'damage');

          // 凍結を付与
          applyStatusToOpponentMonster(context, selectedIndex, STATUS_EFFECT_TYPES.FREEZE, {
            duration: 0,
            removeChance: 0,
            sp1Remove: true,
          }, '氷の吐息');
        },
      });
      return true;
    }

    // setPendingTargetSelectionがない場合は最初の対象を選択
    const targetIndex = validTargets[0].index;
    const targetMonster = validTargets[0].monster;

    setOpponentField(prev => {
      const newField = [...prev];
      if (newField[targetIndex]) {
        const newAtk = Math.max(0, newField[targetIndex].currentAttack - 800);
        newField[targetIndex] = {
          ...newField[targetIndex],
          currentAttack: newAtk,
        };
      }
      return newField;
    });
    addLog(`${targetMonster.name}の攻撃力を800ダウン`, 'damage');

    applyStatusToOpponentMonster(context, targetIndex, STATUS_EFFECT_TYPES.FREEZE, {
      duration: 0,
      removeChance: 0,
      sp1Remove: true,
    }, '氷の吐息');

    return true;
  },

  // 他の水属性カードを追加...
};
