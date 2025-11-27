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
  applyStatusToAllOpponentMonsters,
  selectAndApplyStatusToOpponent,
} from '../effectHelpers';
import { STATUS_EFFECT_TYPES } from '../statusEffects';

/**
 * 水属性カードの固有効果
 */
export const waterCardEffects = {
  // C0000142 (ブリザードマスター) と C0000147 (ブリザードキャット・シャード) は
  // cardTriggers/waterCards.js に実装済み（召喚時トリガーとして）

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

    if (context.skillType === 'basic') {
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

  /**
   * C0000051: リヴァイアサンの奔流
   * 相手モンスター全体に、場にいる水属性モンスターの数×400ダメージを与える
   */
  C0000051: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
    } = context;

    const currentField = currentPlayer === 1 ? p1Field : p2Field;
    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

    // 水属性モンスターの数をカウント
    const waterCount = currentField.filter(m =>
      m && m.attribute === '水'
    ).length;

    if (waterCount === 0) {
      addLog('水属性モンスターがいないためダメージなし', 'info');
      return true;
    }

    const damage = waterCount * 400;
    addLog(`水属性モンスター×${waterCount}で${damage}ダメージ！`, 'damage');

    // 相手モンスター全体にダメージ
    const opponentMonsters = opponentField.filter(m => m !== null);
    if (opponentMonsters.length === 0) {
      addLog('相手モンスターがいません', 'info');
      return true;
    }

    // ダメージ計算とログ出力を先に実行
    const damageResults = opponentField.map(m => {
      if (m) {
        const newHp = Math.max(0, m.currentHp - damage);
        addLog(`${m.name}に${damage}ダメージ（残りHP: ${newHp}）`, 'damage');
        return { monster: m, newHp };
      }
      return null;
    });

    setOpponentField(prev => prev.map((m, idx) => {
      if (m && damageResults[idx]) {
        return { ...m, currentHp: damageResults[idx].newHp };
      }
      return m;
    }));

    return true;
  },

  /**
   * C0000151: ブリザードの呼び声
   * デッキからコスト3以下の《ブリザードキャット》モンスター1体を場に召喚（コスト不要）
   */
  C0000151: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Deck, p2Deck,
      setP1Deck, setP2Deck,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setPendingDeckReview,
    } = context;

    const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
    const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
    const currentField = currentPlayer === 1 ? p1Field : p2Field;
    const setField = currentPlayer === 1 ? setP1Field : setP2Field;

    // 空きスロットを確認
    const emptySlotIndex = currentField.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
      addLog('場が満杯で召喚できません', 'info');
      return false;
    }

    // デッキからブリザードキャットを検索（条件に合うもの全て）
    const targetFilter = (card) =>
      card.type === 'monster' &&
      card.cost <= 3 &&
      card.name && card.name.includes('ブリザードキャット');

    const matchingCards = currentDeck.filter(targetFilter);

    if (matchingCards.length === 0) {
      addLog('条件に合うブリザードキャットがデッキにいません', 'info');
      return false;
    }

    // 召喚処理を共通化
    const summonMonster = (target) => {
      setDeck(prev => prev.filter(c => c.uniqueId !== target.uniqueId));
      setField(prev => {
        const newField = [...prev];
        // 最新の空きスロットを再確認
        const slotIndex = newField.findIndex(slot => slot === null);
        if (slotIndex === -1) {
          addLog('場が満杯で召喚できません', 'info');
          return prev;
        }
        newField[slotIndex] = {
          ...target,
          currentHp: target.hp,
          currentAttack: target.attack,
          canAttack: false, // 召喚酔い
          charges: [],
          owner: currentPlayer,
        };
        return newField;
      });
      addLog(`ブリザードの呼び声: デッキから「${target.name}」を特殊召喚！`, 'heal');
    };

    // 1枚のみの場合は自動選択
    if (matchingCards.length === 1) {
      summonMonster(matchingCards[0]);
      return true;
    }

    // 複数ある場合はデッキ選択UIを表示
    if (setPendingDeckReview) {
      setPendingDeckReview({
        cards: matchingCards,
        title: 'ブリザードの呼び声',
        message: '場に召喚するコスト3以下の《ブリザードキャット》を1体選択してください',
        allowReorder: false,
        selectMode: {
          enabled: true,
          count: 1,
        },
        onSelect: (selectedCards) => {
          if (selectedCards.length > 0) {
            summonMonster(selectedCards[0]);
          }
        },
        onCancel: () => {
          addLog('ブリザードの呼び声: キャンセルしました', 'info');
        },
      });
      return true;
    }

    // フォールバック: 最初の1枚を選択
    summonMonster(matchingCards[0]);
    return true;
  },

  /**
   * C0000154: ブリザードの覚醒
   * 場にいる《ブリザードキャット》モンスター1体の攻撃力をターン終了時まで倍にし、
   * 相手モンスターへの攻撃を2回行えるようにする
   */
  C0000154: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setPendingTargetSelection,
    } = context;

    const currentField = currentPlayer === 1 ? p1Field : p2Field;
    const setField = currentPlayer === 1 ? setP1Field : setP2Field;

    // ブリザードキャットを取得
    const blizzardCats = currentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster && monster.name && monster.name.includes('ブリザードキャット'));

    if (blizzardCats.length === 0) {
      addLog('場にブリザードキャットがいません', 'info');
      return false;
    }

    const applyAwakening = (targetIndex) => {
      setField(prev => prev.map((m, idx) => {
        if (idx === targetIndex && m) {
          const newAtk = m.currentAttack * 2;
          addLog(`${m.name}の攻撃力が${newAtk}に倍増！`, 'heal');
          addLog(`${m.name}は2回攻撃可能！`, 'heal');
          return {
            ...m,
            currentAttack: newAtk,
            attacksRemaining: 2, // 2回攻撃可能
            doubleAttack: true,  // 2回攻撃フラグ
          };
        }
        return m;
      }));
    };

    // 1体のみの場合は自動選択
    if (blizzardCats.length === 1) {
      applyAwakening(blizzardCats[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: '覚醒させるブリザードキャットを選択してください',
        targetType: 'self_monster',
        callback: (selectedIndex) => {
          applyAwakening(selectedIndex);
        },
      });
      return true;
    }

    // フォールバック：最初のブリザードキャットを選択
    applyAwakening(blizzardCats[0].index);
    return true;
  },

  /**
   * C0000288: 酸の霧
   * 相手モンスター1体の攻撃力をターン終了時まで0にする
   * 【刹那詠唱】
   */
  C0000288: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setPendingTargetSelection,
    } = context;

    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

    // 相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return false;
    }

    const applyAcidFog = (targetIndex) => {
      setOpponentField(prev => prev.map((m, idx) => {
        if (idx === targetIndex && m) {
          addLog(`${m.name}の攻撃力を0にした！`, 'damage');
          return {
            ...m,
            currentAttack: 0,
            atkZeroUntilEndOfTurn: true, // ターン終了時までATK0
          };
        }
        return m;
      }));
    };

    // 1体のみの場合は自動選択
    if (validTargets.length === 1) {
      applyAcidFog(validTargets[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: '攻撃力を0にする相手モンスターを選択してください',
        targetType: 'opponent_monster',
        callback: (selectedIndex) => {
          applyAcidFog(selectedIndex);
        },
      });
      return true;
    }

    // フォールバック
    applyAcidFog(validTargets[0].index);
    return true;
  },

  /**
   * C0000344: シスラゴンの汚染
   * 相手モンスター1体の攻撃力を1000下げ、次のターン終了時まで行動不能にする
   * 場に『ヴェルゼファール』モンスターがいる場合、この効果をターン終了時まで全体に変更
   */
  C0000344: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setPendingTargetSelection,
    } = context;

    const currentField = currentPlayer === 1 ? p1Field : p2Field;
    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

    // ヴェルゼファールがいるかチェック
    const hasVerzefaal = currentField.some(m =>
      m && m.name && m.name.includes('ヴェルゼファール')
    );

    // 相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return false;
    }

    if (hasVerzefaal) {
      // 全体効果（ターン終了時まで）
      addLog('ヴェルゼファールの力で全体に効果！', 'info');
      setOpponentField(prev => prev.map(m => {
        if (m) {
          const newAtk = Math.max(0, m.currentAttack - 1000);
          addLog(`${m.name}の攻撃力を1000ダウン！`, 'damage');
          return { ...m, currentAttack: newAtk };
        }
        return m;
      }));
      // 全体にスタン（ターン終了時まで = duration: 0）
      applyStatusToAllOpponentMonsters(context, STATUS_EFFECT_TYPES.STUN, {
        duration: 0, // ターン終了時まで
      }, 'シスラゴンの汚染');
      return true;
    }

    // 単体効果（次のターン終了時まで）
    const applySislagonPollution = (targetIndex) => {
      setOpponentField(prev => prev.map((m, idx) => {
        if (idx === targetIndex && m) {
          const newAtk = Math.max(0, m.currentAttack - 1000);
          addLog(`${m.name}の攻撃力を1000ダウン！`, 'damage');
          return { ...m, currentAttack: newAtk };
        }
        return m;
      }));
      // スタン付与（次のターン終了時まで = duration: 1）
      applyStatusToOpponentMonster(context, targetIndex, STATUS_EFFECT_TYPES.STUN, {
        duration: 1, // 次のターン終了時まで
      }, 'シスラゴンの汚染');
    };

    // 1体のみの場合は自動選択
    if (validTargets.length === 1) {
      applySislagonPollution(validTargets[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: '汚染する相手モンスターを選択してください',
        targetType: 'opponent_monster',
        callback: (selectedIndex) => {
          applySislagonPollution(selectedIndex);
        },
      });
      return true;
    }

    // フォールバック
    applySislagonPollution(validTargets[0].index);
    return true;
  },

  /**
   * C0000402: 呪術狩りの封印鎖
   * 相手のモンスター1体をターン終了時まで行動不能にする
   * 闇属性モンスターの場合、次のターン終了時まで行動不能にして、攻撃力を0にする
   * 【刹那詠唱】
   */
  C0000402: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setPendingTargetSelection,
    } = context;

    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

    // 相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return false;
    }

    const applySealingChain = (targetIndex) => {
      const targetMonster = opponentField[targetIndex];
      if (!targetMonster) return;

      const isDark = targetMonster.attribute === '闇';

      if (isDark) {
        // 闇属性：次のターン終了時まで行動不能 + ATK0
        setOpponentField(prev => prev.map((m, idx) => {
          if (idx === targetIndex && m) {
            addLog(`${m.name}（闇属性）の攻撃力を0にした！`, 'damage');
            return {
              ...m,
              currentAttack: 0,
            };
          }
          return m;
        }));
        applyStatusToOpponentMonster(context, targetIndex, STATUS_EFFECT_TYPES.STUN, {
          duration: 1, // 次のターン終了時まで
        }, '呪術狩りの封印鎖');
      } else {
        // 通常：ターン終了時まで行動不能
        applyStatusToOpponentMonster(context, targetIndex, STATUS_EFFECT_TYPES.STUN, {
          duration: 0, // ターン終了時まで
        }, '呪術狩りの封印鎖');
      }
    };

    // 1体のみの場合は自動選択
    if (validTargets.length === 1) {
      applySealingChain(validTargets[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: '封印する相手モンスターを選択してください',
        targetType: 'opponent_monster',
        callback: (selectedIndex) => {
          applySealingChain(selectedIndex);
        },
      });
      return true;
    }

    // フォールバック
    applySealingChain(validTargets[0].index);
    return true;
  },

  /**
   * C0000046: 泡沫の精霊
   * 基本技：このカードをリリースすると、次の水属性モンスターの召喚コストを2軽減する
   */
  C0000046: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setP1Graveyard, setP2Graveyard,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      monsterIndex,
    } = context;

    if (context.skillType === 'basic') {
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const hand = currentPlayer === 1 ? p1Hand : p2Hand;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

      const monster = currentField[monsterIndex];
      if (!monster) {
        addLog('対象のモンスターが存在しません', 'info');
        return false;
      }

      // 手札に水属性モンスターがいるかチェック
      const waterMonsters = hand.filter(c => c.type === 'monster' && c.attribute === '水');
      if (waterMonsters.length === 0) {
        addLog('手札に水属性モンスターがいないため発動できません', 'info');
        return false;
      }

      // 自身を墓地に送る
      setField(prev => {
        const newField = [...prev];
        newField[monsterIndex] = null;
        return newField;
      });
      setGraveyard(prev => [...prev, monster]);
      addLog(`${monster.name}をリリース！`, 'info');

      // 手札のすべての水属性モンスターにコスト軽減を付与（次の1体のみ使用）
      setHand(prev => prev.map(c => {
        if (c.type === 'monster' && c.attribute === '水') {
          return {
            ...c,
            tempCostModifier: (c.tempCostModifier || 0) - 2,
            tempCostModifierSource: '泡沫の精霊',
            tempCostModifierOneTime: true, // 次の1体のみフラグ
          };
        }
        return c;
      }));
      addLog('次の水属性モンスターの召喚コストが2軽減！', 'heal');

      return true;
    }
    return false;
  },

  /**
   * C0000145: ブリザードキャット・スノウ
   * 基本技：相手の場にいるモンスター1体を指定し、その効果をターン終了時まで無効化。
   */
  C0000145: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP2Field, setP1Field,
      setPendingTargetSelection,
    } = context;

    if (context.skillType === 'basic') {
      const opponentField = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

      // 相手フィールドのモンスターをチェック
      const validTargets = opponentField
        .map((m, idx) => ({ monster: m, index: idx }))
        .filter(t => t.monster !== null);

      if (validTargets.length === 0) {
        addLog('相手フィールドにモンスターがいません', 'info');
        return false;
      }

      const applySilence = (targetIndex) => {
        const targetMonster = opponentField[targetIndex];
        if (!targetMonster) return;

        // SILENCE（効果無効）を付与（ターン終了時まで = duration: 0）
        applyStatusToOpponentMonster(context, targetIndex, STATUS_EFFECT_TYPES.SILENCE, {
          duration: 0, // ターン終了時まで
        }, 'ブリザードキャット・スノウ');
        addLog(`${targetMonster.name}の効果をターン終了時まで無効化！`, 'info');
      };

      // 1体のみの場合は自動選択
      if (validTargets.length === 1) {
        applySilence(validTargets[0].index);
        return true;
      }

      // 複数の場合はターゲット選択UI
      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: '効果を無効化する相手モンスターを選択',
          validTargets: validTargets.map(t => t.index),
          isOpponent: true,
          callback: (targetIndex) => {
            applySilence(targetIndex);
          },
        });
        return true;
      }

      // フォールバック: 最初のターゲット
      applySilence(validTargets[0].index);
      return true;
    }
    return false;
  },

  /**
   * C0000144: ブリザードキャット・フロスト
   * 基本技：自身の攻撃力の半分のダメージを相手モンスター1体に与える。
   */
  C0000144: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      monsterIndex,
      p1Field, p2Field,
      setP1Field, setP2Field,
      setPendingTargetSelection,
    } = context;

    if (context.skillType === 'basic') {
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const opponentField = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

      const monster = currentField[monsterIndex];
      if (!monster) {
        addLog('モンスターが存在しません', 'damage');
        return false;
      }

      // ダメージ量 = 攻撃力の半分
      const damage = Math.floor(monster.attack / 2);

      // 相手フィールドのモンスターをチェック
      const validTargets = opponentField
        .map((m, idx) => ({ monster: m, index: idx }))
        .filter(t => t.monster !== null);

      if (validTargets.length === 0) {
        addLog('相手フィールドにモンスターがいません', 'info');
        return false;
      }

      // 1体のみの場合は自動選択
      if (validTargets.length === 1) {
        const target = validTargets[0];
        setOpponentField(prev => prev.map((m, idx) => {
          if (idx === target.index && m) {
            const newHp = m.currentHp - damage;
            addLog(`${monster.name}の基本技: ${m.name}に${damage}ダメージ！`, 'damage');
            if (newHp <= 0) {
              addLog(`${m.name}は破壊された！`, 'damage');
              return null;
            }
            return { ...m, currentHp: newHp };
          }
          return m;
        }));
        return true;
      }

      // 複数の場合はターゲット選択UI
      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: `${damage}ダメージを与える相手モンスターを選択`,
          validTargets: validTargets.map(t => t.index),
          isOpponent: true,
          callback: (targetIndex) => {
            setOpponentField(prev => prev.map((m, idx) => {
              if (idx === targetIndex && m) {
                const newHp = m.currentHp - damage;
                addLog(`${monster.name}の基本技: ${m.name}に${damage}ダメージ！`, 'damage');
                if (newHp <= 0) {
                  addLog(`${m.name}は破壊された！`, 'damage');
                  return null;
                }
                return { ...m, currentHp: newHp };
              }
              return m;
            }));
          },
        });
        return true;
      }

      // フォールバック: 最初のターゲット
      const target = validTargets[0];
      setOpponentField(prev => prev.map((m, idx) => {
        if (idx === target.index && m) {
          const newHp = m.currentHp - damage;
          addLog(`${monster.name}の基本技: ${m.name}に${damage}ダメージ！`, 'damage');
          if (newHp <= 0) {
            addLog(`${m.name}は破壊された！`, 'damage');
            return null;
          }
          return { ...m, currentHp: newHp };
        }
        return m;
      }));
      return true;
    }
    return false;
  },

  // 他の水属性カードを追加...
};
