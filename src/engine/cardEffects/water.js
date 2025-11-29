// ========================================
// 水属性カードの固有効果
// ========================================

import {
  getPlayerContext,
  millDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  modifyAttack,
  healLife,
  applyStatusToOpponentMonster,
  applyStatusToAllOpponentMonsters,
  selectAndApplyStatusToOpponent,
} from '../effectHelpers';
import { STATUS_EFFECT_TYPES } from '../statusEffects';

/**
 * 水属性カードの固有効果
 */
export const waterCardEffects = {
  /**
   * C0000142: ブリザードマスター
   * 基本技：相手モンスターの攻撃力を300下げ、600ダメージを与える。
   * 上級技：相手モンスター1体を「凍結（攻撃力半減＋行動不能）」にする、次のターン開始時に50%で解除。
   * 召喚時効果は cardTriggers/waterCards.js に実装済み
   */
  C0000142: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    // 相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    // 基本技：攻撃力300ダウン + 600ダメージ
    if (context.skillType === 'basic') {
      if (validTargets.length === 0) {
        addLog('相手フィールドにモンスターがいません', 'info');
        return true; // 汎用パーサーにフォールバックしない
      }

      const applyBasicSkill = (targetIndex) => {
        const targetMonster = opponentField[targetIndex];
        if (!targetMonster) return;

        setOpponentField(prev => prev.map((m, idx) => {
          if (idx === targetIndex && m) {
            const newAtk = Math.max(0, m.currentAttack - 300);
            const newHp = m.currentHp - 600;
            addLog(`${m.name}の攻撃力を300ダウン、600ダメージ！`, 'damage');
            if (newHp <= 0) {
              addLog(`${m.name}は破壊された！`, 'damage');
              return null;
            }
            return { ...m, currentAttack: newAtk, currentHp: newHp };
          }
          return m;
        }));
      };

      // 1体のみの場合は自動選択
      if (validTargets.length === 1) {
        applyBasicSkill(validTargets[0].index);
        return true;
      }

      // 複数いる場合は選択UI
      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: '攻撃力ダウン+ダメージを与える相手モンスターを選択',
          targetType: 'opponent_monster',
          callback: (selectedIndex) => {
            applyBasicSkill(selectedIndex);
          },
        });
        return true;
      }

      // フォールバック: 最初のターゲット
      applyBasicSkill(validTargets[0].index);
      return true;
    }

    // 上級技：凍結付与（攻撃力半減＋行動不能、50%解除）
    if (context.skillType === 'advanced') {
      if (validTargets.length === 0) {
        addLog('相手フィールドにモンスターがいません', 'info');
        return true; // 汎用パーサーにフォールバックしない
      }

      const applyFreeze = (targetIndex) => {
        const targetMonster = opponentField[targetIndex];
        if (!targetMonster) return;

        // 凍結付与（攻撃力半減＋行動不能、次のターン開始時50%解除）
        applyStatusToOpponentMonster(context, targetIndex, STATUS_EFFECT_TYPES.FREEZE, {
          duration: -1, // 永続（解除されるまで）
          removeChance: 0.5, // 50%でターン開始時に解除
        }, 'ブリザードマスター');
        addLog(`${targetMonster.name}を凍結させた！`, 'damage');
      };

      // 1体のみの場合は自動選択
      if (validTargets.length === 1) {
        applyFreeze(validTargets[0].index);
        return true;
      }

      // 複数いる場合は選択UI
      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: '凍結させる相手モンスターを選択',
          targetType: 'opponent_monster',
          callback: (selectedIndex) => {
            applyFreeze(selectedIndex);
          },
        });
        return true;
      }

      // フォールバック: 最初のターゲット
      applyFreeze(validTargets[0].index);
      return true;
    }

    return false;
  },

  // C0000147 (ブリザードキャット・シャード) は
  // cardTriggers/waterCards.js に実装済み（召喚時トリガーとして）

  /**
   * C0000039: アクア・メイデン
   * 基本技：相手モンスター1体を「眠り」状態にする。
   * 召喚時効果は waterCards.js のトリガーとして実装済み
   */
  C0000039: (skillText, context) => {
    if (context.skillType === 'basic') {
      // 眠り: 次のターン終了時まで行動不能＋効果無効、ターン開始時50%解除
      selectAndApplyStatusToOpponent(
        context,
        STATUS_EFFECT_TYPES.SLEEP,
        {
          duration: 2, // 次のターン終了時まで
          removeChance: 0.5, // 50%で解除
        },
        'アクア・メイデン'
      );
      return true;
    }
    return false;
  },

  /**
   * C0000045: 海流の守護者
   * 基本技：自分の水属性モンスター1体の状態異常を回復する。
   */
  C0000045: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { myField, setMyField } = getPlayerContext(context);

    if (context.skillType === 'basic') {

      // 自分の水属性モンスターを取得
      const waterMonsters = myField
        .map((m, idx) => ({ monster: m, index: idx }))
        .filter(({ monster }) => monster !== null && monster.attribute === '水');

      if (waterMonsters.length === 0) {
        addLog('自分のフィールドに水属性モンスターがいません', 'info');
        return true; // 技は発動したが効果なし（汎用パーサーへのフォールバック防止）
      }

      // 状態異常を持つ水属性モンスターをフィルタ
      const afflictedMonsters = waterMonsters.filter(
        ({ monster }) => monster.statusEffects && monster.statusEffects.length > 0
      );

      if (afflictedMonsters.length === 0) {
        addLog('状態異常を持つ水属性モンスターがいません', 'info');
        return true; // 技は発動したが効果なし（汎用パーサーへのフォールバック防止）
      }

      const clearStatusEffects = (targetIndex) => {
        setMyField(prev => {
          const newField = [...prev];
          const target = newField[targetIndex];
          if (target && target.statusEffects && target.statusEffects.length > 0) {
            addLog(`${target.name}の状態異常を全て回復！`, 'heal');
            newField[targetIndex] = {
              ...target,
              statusEffects: [],
            };
          }
          return newField;
        });
      };

      // 1体のみの場合は自動選択
      if (afflictedMonsters.length === 1) {
        clearStatusEffects(afflictedMonsters[0].index);
        return true;
      }

      // 複数いる場合は選択UI
      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: '状態異常を回復する水属性モンスターを選択',
          validTargets: afflictedMonsters.map(t => t.index),
          isOpponent: false,
          callback: (selectedIndex) => {
            clearStatusEffects(selectedIndex);
          },
        });
        return true;
      }

      // フォールバック: 最初のターゲット
      clearStatusEffects(afflictedMonsters[0].index);
      return true;
    }
    return false;
  },

  /**
   * C0000148: 氷の双尾猫
   * 基本技：1度のみ使用可能、手札を1枚捨て自分の墓地の《ブリザードキャット》1体を場に戻す（HP半分）
   */
  C0000148: (skillText, context) => {
    const { addLog } = context;
    const { myHand, setMyHand, setMyGraveyard } = getPlayerContext(context);

    if (context.skillType === 'basic') {

      if (myHand.length > 0) {
        // 手札を1枚捨てる
        const discardedCard = myHand[0];
        setMyHand(prev => prev.slice(1));
        setMyGraveyard(prev => [...prev, discardedCard]);
        addLog(`手札から「${discardedCard.name}」を墓地に送った`, 'info');

        // 墓地からブリザードキャットを蘇生（HP半減）
        return reviveFromGraveyard(context, (card) => {
          return card.name && card.name.includes('ブリザードキャット');
        }, { hpHalf: true }); // HP半分、攻撃力は元のまま
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
    const { addLog } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {

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
    const { addLog } = context;
    const { myGraveyard, setMyGraveyard, setMyDeck, myRestedSP, setMyActiveSP, setMyRestedSP } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {

      const aquaCard = myGraveyard.find(card =>
        card.name && card.name.includes('アクアレギア')
      );

      if (aquaCard) {
        // デッキに戻す
        setMyGraveyard(prev => prev.filter(c => c.uniqueId !== aquaCard.uniqueId));
        setMyDeck(prev => [...prev, aquaCard]);
        addLog(`墓地から「${aquaCard.name}」をデッキに戻した`, 'info');

        // SPをアクティブに
        if (myRestedSP > 0) {
          setMyActiveSP(prev => prev + 1);
          setMyRestedSP(prev => prev - 1);
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
    const { addLog, setPendingTargetSelection } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    // 対象となる相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return true; // 対象がいなくても魔法発動自体は成功として扱う
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
    const { addLog } = context;
    const { myField, opponentField, setOpponentField } = getPlayerContext(context);

    // 水属性モンスターの数をカウント
    const waterCount = myField.filter(m =>
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
    const { addLog, setPendingDeckReview } = context;
    const { myDeck, setMyDeck, myField, setMyField, currentPlayer } = getPlayerContext(context);

    // 空きスロットを確認
    const emptySlotIndex = myField.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
      addLog('場が満杯で召喚できません', 'info');
      return false;
    }

    // デッキからブリザードキャットを検索（条件に合うもの全て）
    const targetFilter = (card) =>
      card.type === 'monster' &&
      card.cost <= 3 &&
      card.name && card.name.includes('ブリザードキャット');

    const matchingCards = myDeck.filter(targetFilter);

    if (matchingCards.length === 0) {
      addLog('条件に合うブリザードキャットがデッキにいません', 'info');
      return false;
    }

    // 召喚処理を共通化
    const summonMonster = (target) => {
      setMyDeck(prev => prev.filter(c => c.uniqueId !== target.uniqueId));
      setMyField(prev => {
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
          statusEffects: [],
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
    const { addLog, setPendingTargetSelection } = context;
    const { myField, setMyField } = getPlayerContext(context);

    // ブリザードキャットを取得
    const blizzardCats = myField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster && monster.name && monster.name.includes('ブリザードキャット'));

    if (blizzardCats.length === 0) {
      addLog('場にブリザードキャットがいません', 'info');
      return false;
    }

    const applyAwakening = (targetIndex) => {
      setMyField(prev => prev.map((m, idx) => {
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
    const { addLog, setPendingTargetSelection } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    // 相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return true; // 対象がいなくても魔法発動自体は成功として扱う
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
    const { addLog, setPendingTargetSelection } = context;
    const { myField, opponentField, setOpponentField } = getPlayerContext(context);

    // ヴェルゼファールがいるかチェック
    const hasVerzefaal = myField.some(m =>
      m && m.name && m.name.includes('ヴェルゼファール')
    );

    // 相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return true; // 対象がいなくても魔法発動自体は成功として扱う
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
    const { addLog, setPendingTargetSelection } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    // 相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return true; // 対象がいなくても魔法発動自体は成功として扱う
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
    const { addLog, monsterIndex } = context;
    const { myField, setMyField, setMyGraveyard, myHand, setMyHand } = getPlayerContext(context);

    if (context.skillType === 'basic') {

      const monster = myField[monsterIndex];
      if (!monster) {
        addLog('対象のモンスターが存在しません', 'info');
        return false;
      }

      // 手札に水属性モンスターがいるかチェック
      const waterMonsters = myHand.filter(c => c.type === 'monster' && c.attribute === '水');
      if (waterMonsters.length === 0) {
        addLog('手札に水属性モンスターがいないため発動できません', 'info');
        return false;
      }

      // 自身を墓地に送る
      setMyField(prev => {
        const newField = [...prev];
        newField[monsterIndex] = null;
        return newField;
      });
      setMyGraveyard(prev => [...prev, monster]);
      addLog(`${monster.name}をリリース！`, 'info');

      // 手札のすべての水属性モンスターにコスト軽減を付与（次の1体のみ使用）
      setMyHand(prev => prev.map(c => {
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
    const { addLog, setPendingMonsterTarget } = context;
    const { opponentField } = getPlayerContext(context);

    if (context.skillType === 'basic') {

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
      if (setPendingMonsterTarget) {
        setPendingMonsterTarget({
          message: '効果を無効化する相手モンスターを選択',
          targetPlayer: 'opponent',
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
    const { addLog, monsterIndex, setPendingMonsterTarget } = context;
    const { myField, opponentField, setOpponentField } = getPlayerContext(context);

    if (context.skillType === 'basic') {

      const monster = myField[monsterIndex];
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
        return true; // 対象がいなくても技の発動自体は成功として扱う
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
      if (setPendingMonsterTarget) {
        setPendingMonsterTarget({
          message: `${damage}ダメージを与える相手モンスターを選択`,
          targetPlayer: 'opponent',
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

  /**
   * C0000049: タイダルシフト
   * 場にいる水属性モンスター1体をデッキに戻し、デッキから同じコスト以下の別の水属性モンスターを場に出す（コスト不要）
   */
  C0000049: (skillText, context) => {
    const { addLog, setPendingTargetSelection, setPendingDeckReview } = context;
    const { myField, setMyField, myDeck, setMyDeck, currentPlayer } = getPlayerContext(context);

    // 自分の場の水属性モンスターを取得
    const waterMonsters = myField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null && monster.attribute === '水');

    if (waterMonsters.length === 0) {
      addLog('場に水属性モンスターがいません', 'info');
      return false;
    }

    // モンスターを選択してシフトする処理
    const performTidalShift = (selectedIndex) => {
      const selectedMonster = myField[selectedIndex];
      if (!selectedMonster) return;

      const targetCost = selectedMonster.cost;

      // デッキから同コスト以下の別の水属性モンスターを検索
      const eligibleMonsters = myDeck.filter(card =>
        card.type === 'monster' &&
        card.attribute === '水' &&
        card.cost <= targetCost &&
        card.id !== selectedMonster.id // 別のモンスター
      );

      if (eligibleMonsters.length === 0) {
        addLog(`コスト${targetCost}以下の別の水属性モンスターがデッキにいません`, 'info');
        // モンスターは戻さず効果失敗
        return;
      }

      // 選択したモンスターをデッキに戻す
      setMyField(prev => {
        const newField = [...prev];
        newField[selectedIndex] = null;
        return newField;
      });
      setMyDeck(prev => [...prev, selectedMonster]);
      addLog(`${selectedMonster.name}をデッキに戻した`, 'info');

      // 召喚処理
      const summonReplacement = (newMonster) => {
        setMyDeck(prev => prev.filter(c => c.uniqueId !== newMonster.uniqueId));
        setMyField(prev => {
          const newField = [...prev];
          newField[selectedIndex] = {
            ...newMonster,
            currentHp: newMonster.hp,
            currentAttack: newMonster.attack,
            canAttack: false, // 召喚酔い
            charges: [],
            statusEffects: [],
            owner: currentPlayer,
          };
          return newField;
        });
        addLog(`タイダルシフト: デッキから「${newMonster.name}」を特殊召喚！`, 'heal');
      };

      // 1体のみの場合は自動選択
      if (eligibleMonsters.length === 1) {
        summonReplacement(eligibleMonsters[0]);
        return;
      }

      // 複数ある場合はデッキ選択UIを表示
      if (setPendingDeckReview) {
        setPendingDeckReview({
          cards: eligibleMonsters,
          title: 'タイダルシフト',
          message: `コスト${targetCost}以下の水属性モンスターを1体選択して召喚`,
          allowReorder: false,
          selectMode: {
            enabled: true,
            count: 1,
          },
          onSelect: (selectedCards) => {
            if (selectedCards.length > 0) {
              summonReplacement(selectedCards[0]);
            }
          },
          onCancel: () => {
            addLog('タイダルシフト: 召喚をキャンセルしました', 'info');
          },
        });
      } else {
        // フォールバック: 最初の1体を召喚
        summonReplacement(eligibleMonsters[0]);
      }
    };

    // 水属性モンスターが1体のみの場合は自動選択
    if (waterMonsters.length === 1) {
      performTidalShift(waterMonsters[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: 'デッキに戻す水属性モンスターを選択',
        targetType: 'self_monster',
        validTargets: waterMonsters.map(t => t.index),
        isOpponent: false,
        callback: (selectedIndex) => {
          performTidalShift(selectedIndex);
        },
      });
      return true;
    }

    // フォールバック: 最初の水属性モンスター
    performTidalShift(waterMonsters[0].index);
    return true;
  },

  /**
   * C0000047: マーメイドの恵み
   * 次の自分のターンのSPトークン増加量を1増加させる（1ターンに1度のみ）
   */
  C0000047: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      setP1NextTurnSPBonus,
      setP2NextTurnSPBonus,
    } = context;

    // 次のターンのSP増加ボーナスを+1
    if (currentPlayer === 1) {
      setP1NextTurnSPBonus(prev => prev + 1);
    } else {
      setP2NextTurnSPBonus(prev => prev + 1);
    }

    addLog('マーメイドの恵み: 次のターンのSP増加量+1！', 'heal');
    return true;
  },

  /**
   * C0000050: クラーケンの呼び声
   * 墓地の水属性モンスター1体を手札に戻し、そのカードの召喚コストを1軽減
   * 【刹那詠唱】
   */
  C0000050: (skillText, context) => {
    const { addLog, setPendingGraveyardSelection, setShowGraveyardViewer } = context;
    const { myGraveyard, setMyGraveyard, setMyHand, currentPlayer } = getPlayerContext(context);

    // 墓地の水属性モンスターを検索
    const waterMonsters = myGraveyard.filter(card =>
      card.type === 'monster' && card.attribute === '水'
    );

    if (waterMonsters.length === 0) {
      addLog('墓地に水属性モンスターがいません', 'info');
      return false;
    }

    // カードを手札に加える処理（コスト-1付き）
    const returnToHand = (targetCard) => {
      // 墓地から除去
      setMyGraveyard(prev => prev.filter(c => c.uniqueId !== targetCard.uniqueId));
      // 手札に加える（コスト-1を付与）
      const cardWithCostReduction = {
        ...targetCard,
        tempCostModifier: (targetCard.tempCostModifier || 0) - 1,
        tempCostModifierSource: 'クラーケンの呼び声',
      };
      setMyHand(prev => [...prev, cardWithCostReduction]);
      addLog(`クラーケンの呼び声: ${targetCard.name}を手札に戻した（召喚コスト-1）`, 'heal');
    };

    // 1体のみの場合は自動選択
    if (waterMonsters.length === 1) {
      returnToHand(waterMonsters[0]);
      return true;
    }

    // 複数いる場合は墓地選択UIを表示
    if (setPendingGraveyardSelection && setShowGraveyardViewer) {
      setShowGraveyardViewer({ player: currentPlayer });
      setPendingGraveyardSelection({
        message: '手札に戻す水属性モンスターを選択',
        filter: (card) => card.type === 'monster' && card.attribute === '水',
        callback: (selectedCard) => {
          returnToHand(selectedCard);
        },
      });
      return true;
    }

    // フォールバック: 最初の1体を選択
    returnToHand(waterMonsters[0]);
    return true;
  },

  /**
   * C0000331: アクアレギナの漂流船乗り
   * 基本技: このカードをリリースし、デッキから『アクアレギア』モンスター1体を手札に加える。
   */
  C0000331: (skillText, context) => {
    const { addLog, monsterIndex, setPendingDeckReview } = context;
    const { myField, setMyField, myDeck, setMyDeck, setMyHand, setMyGraveyard } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      const monster = myField[monsterIndex];
      if (!monster) {
        addLog('対象のモンスターが存在しません', 'info');
        return false;
      }

      // デッキから『アクアレギア』モンスターを検索
      const targetFilter = (card) =>
        card.type === 'monster' && card.name && card.name.includes('アクアレギア');
      const matchingCards = myDeck.filter(targetFilter);

      if (matchingCards.length === 0) {
        addLog('アクアレギナの漂流船乗り: デッキに『アクアレギア』モンスターがいません', 'info');
        return false;
      }

      // 自身をリリース
      setMyField(prev => {
        const newField = [...prev];
        newField[monsterIndex] = null;
        return newField;
      });
      setMyGraveyard(prev => [...prev, monster]);
      addLog(`${monster.name}をリリース！`, 'info');

      // サーチ処理
      const addToHand = (targetCard) => {
        setMyDeck(prev => prev.filter(c => c.uniqueId !== targetCard.uniqueId));
        setMyHand(prev => [...prev, targetCard]);
        addLog(`アクアレギナの漂流船乗り: ${targetCard.name}を手札に加えた！`, 'heal');
      };

      // 1枚のみの場合は自動選択
      if (matchingCards.length === 1) {
        addToHand(matchingCards[0]);
        return true;
      }

      // 複数ある場合はデッキ選択UI
      if (setPendingDeckReview) {
        setPendingDeckReview({
          cards: matchingCards,
          title: 'アクアレギナの漂流船乗り',
          message: '手札に加える『アクアレギア』モンスターを1体選択',
          allowReorder: false,
          selectMode: { enabled: true, count: 1 },
          onSelect: (selectedCards) => {
            if (selectedCards.length > 0) addToHand(selectedCards[0]);
          },
          onCancel: () => addLog('サーチをキャンセルしました', 'info'),
        });
        return true;
      }

      addToHand(matchingCards[0]);
      return true;
    }
    return false;
  },

  /**
   * C0000332: アクアレギナの守護者
   * 基本技: 自分のライフを300回復。
   */
  C0000332: (skillText, context) => {
    if (context.skillType === 'basic') {
      healLife(context, 300, true);
      return true;
    }
    return false;
  },

  /**
   * C0000333: ヴェルゼファールの信徒・深みの儀式者
   * 基本技: 自分のライフを1000減らし、デッキから『ヴェルゼファール』モンスター1体を手札に加える。
   */
  C0000333: (skillText, context) => {
    const { addLog, setPendingDeckReview } = context;
    const { myDeck, setMyDeck, setMyHand, myLife, setMyLife } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // ライフコストチェック
      if (myLife <= 1000) {
        addLog('ライフが足りません（コスト: 1000）', 'info');
        return false;
      }

      // デッキから『ヴェルゼファール』モンスターを検索
      const targetFilter = (card) =>
        card.type === 'monster' && card.name && card.name.includes('ヴェルゼファール');
      const matchingCards = myDeck.filter(targetFilter);

      if (matchingCards.length === 0) {
        addLog('深みの儀式者: デッキに『ヴェルゼファール』モンスターがいません', 'info');
        return false;
      }

      // ライフコストを支払う
      setMyLife(prev => prev - 1000);
      addLog('深みの儀式者: ライフを1000消費', 'damage');

      // サーチ処理
      const addToHand = (targetCard) => {
        setMyDeck(prev => prev.filter(c => c.uniqueId !== targetCard.uniqueId));
        setMyHand(prev => [...prev, targetCard]);
        addLog(`深みの儀式者: ${targetCard.name}を手札に加えた！`, 'heal');
      };

      if (matchingCards.length === 1) {
        addToHand(matchingCards[0]);
        return true;
      }

      if (setPendingDeckReview) {
        setPendingDeckReview({
          cards: matchingCards,
          title: '深みの儀式者',
          message: '手札に加える『ヴェルゼファール』モンスターを1体選択',
          allowReorder: false,
          selectMode: { enabled: true, count: 1 },
          onSelect: (selectedCards) => {
            if (selectedCards.length > 0) addToHand(selectedCards[0]);
          },
          onCancel: () => addLog('サーチをキャンセルしました', 'info'),
        });
        return true;
      }

      addToHand(matchingCards[0]);
      return true;
    }
    return false;
  },

  /**
   * C0000334: ヴェルゼファールの眷属・クラディオム
   * 基本技：デッキからコスト4以下の《ヴェルゼファール》モンスターを手札に加える。
   */
  C0000334: (skillText, context) => {
    const { addLog, setPendingDeckReview } = context;
    const { myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // デッキからコスト4以下の『ヴェルゼファール』モンスターを検索
      const targetFilter = (card) =>
        card.type === 'monster' &&
        card.name && card.name.includes('ヴェルゼファール') &&
        card.cost <= 4;
      const matchingCards = myDeck.filter(targetFilter);

      if (matchingCards.length === 0) {
        addLog('クラディオム: デッキにコスト4以下の『ヴェルゼファール』モンスターがいません', 'info');
        return false;
      }

      const addToHand = (targetCard) => {
        setMyDeck(prev => prev.filter(c => c.uniqueId !== targetCard.uniqueId));
        setMyHand(prev => [...prev, targetCard]);
        addLog(`クラディオム: ${targetCard.name}を手札に加えた！`, 'heal');
      };

      if (matchingCards.length === 1) {
        addToHand(matchingCards[0]);
        return true;
      }

      if (setPendingDeckReview) {
        setPendingDeckReview({
          cards: matchingCards,
          title: 'クラディオム',
          message: '手札に加えるコスト4以下の『ヴェルゼファール』モンスターを選択',
          allowReorder: false,
          selectMode: { enabled: true, count: 1 },
          onSelect: (selectedCards) => {
            if (selectedCards.length > 0) addToHand(selectedCards[0]);
          },
          onCancel: () => addLog('サーチをキャンセルしました', 'info'),
        });
        return true;
      }

      addToHand(matchingCards[0]);
      return true;
    }
    return false;
  },

  /**
   * C0000335: ヴェルゼファールの眷属・シスラゴン
   * 基本技：このカードがリンク状態の時、デッキからコスト6以下の《ヴェルゼファール》モンスターを手札に加える。
   */
  C0000335: (skillText, context) => {
    const { addLog, monsterIndex, setPendingDeckReview } = context;
    const { myField, myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      const monster = myField[monsterIndex];
      if (!monster) {
        addLog('対象のモンスターが存在しません', 'info');
        return false;
      }

      // リンク状態チェック
      if (!monster.linkedTo) {
        addLog('シスラゴン: リンク状態ではないため発動できません', 'info');
        return false;
      }

      // デッキからコスト6以下の『ヴェルゼファール』モンスターを検索
      const targetFilter = (card) =>
        card.type === 'monster' &&
        card.name && card.name.includes('ヴェルゼファール') &&
        card.cost <= 6;
      const matchingCards = myDeck.filter(targetFilter);

      if (matchingCards.length === 0) {
        addLog('シスラゴン: デッキにコスト6以下の『ヴェルゼファール』モンスターがいません', 'info');
        return false;
      }

      const addToHand = (targetCard) => {
        setMyDeck(prev => prev.filter(c => c.uniqueId !== targetCard.uniqueId));
        setMyHand(prev => [...prev, targetCard]);
        addLog(`シスラゴン: ${targetCard.name}を手札に加えた！`, 'heal');
      };

      if (matchingCards.length === 1) {
        addToHand(matchingCards[0]);
        return true;
      }

      if (setPendingDeckReview) {
        setPendingDeckReview({
          cards: matchingCards,
          title: 'シスラゴン',
          message: '手札に加えるコスト6以下の『ヴェルゼファール』モンスターを選択',
          allowReorder: false,
          selectMode: { enabled: true, count: 1 },
          onSelect: (selectedCards) => {
            if (selectedCards.length > 0) addToHand(selectedCards[0]);
          },
          onCancel: () => addLog('サーチをキャンセルしました', 'info'),
        });
        return true;
      }

      addToHand(matchingCards[0]);
      return true;
    }
    return false;
  },

  /**
   * C0000336: ヴェルゼファールの眷属・ルミナクール
   * 基本技: 相手モンスター1体を次のターン終了まで行動不能にする。
   */
  C0000336: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { opponentField } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      const validTargets = opponentField
        .map((m, idx) => ({ monster: m, index: idx }))
        .filter(({ monster }) => monster !== null);

      if (validTargets.length === 0) {
        addLog('ルミナクール: 相手フィールドにモンスターがいません', 'info');
        return false;
      }

      const applyStun = (targetIndex) => {
        const targetMonster = opponentField[targetIndex];
        if (!targetMonster) return;

        // STUN（行動不能）を付与（次のターン終了時まで = duration: 1）
        applyStatusToOpponentMonster(context, targetIndex, STATUS_EFFECT_TYPES.STUN, {
          duration: 1, // 次のターン終了時まで
        }, 'ルミナクール');
        addLog(`ルミナクール: ${targetMonster.name}を次のターン終了まで行動不能に！`, 'damage');
      };

      if (validTargets.length === 1) {
        applyStun(validTargets[0].index);
        return true;
      }

      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: '行動不能にする相手モンスターを選択',
          targetType: 'opponent_monster',
          callback: (selectedIndex) => applyStun(selectedIndex),
        });
        return true;
      }

      applyStun(validTargets[0].index);
      return true;
    }
    return false;
  },

  /**
   * C0000337: ヴェルゼファールの眷属・タラッサロス
   * 基本技: このカードがリンク状態の時、相手フィールド全体に1500ダメージ。
   */
  C0000337: (skillText, context) => {
    const { addLog, monsterIndex } = context;
    const { myField, opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      const monster = myField[monsterIndex];
      if (!monster) {
        addLog('対象のモンスターが存在しません', 'info');
        return false;
      }

      // リンク状態チェック
      if (!monster.linkedTo) {
        addLog('タラッサロス: リンク状態ではないため発動できません', 'info');
        return false;
      }

      const opponentMonsters = opponentField.filter(m => m !== null);
      if (opponentMonsters.length === 0) {
        addLog('タラッサロス: 相手フィールドにモンスターがいません', 'info');
        return true;
      }

      // 全体に1500ダメージ
      const damage = 1500;
      addLog(`タラッサロス: 相手フィールド全体に${damage}ダメージ！`, 'damage');

      const destroyedMonsters = [];
      setOpponentField(prev => prev.map(m => {
        if (m) {
          const newHp = m.currentHp - damage;
          addLog(`${m.name}に${damage}ダメージ（残りHP: ${Math.max(0, newHp)}）`, 'damage');
          if (newHp <= 0) {
            destroyedMonsters.push(m);
            return null;
          }
          return { ...m, currentHp: newHp };
        }
        return m;
      }));

      if (destroyedMonsters.length > 0) {
        setOpponentGraveyard(prev => [...prev, ...destroyedMonsters]);
        destroyedMonsters.forEach(m => addLog(`${m.name}が破壊された！`, 'damage'));
      }

      return true;
    }
    return false;
  },

  /**
   * C0000340: 深海の支配者・ヴェルゼファール
   * 上級技: 自分のライフを2000減らし、相手フィールド全体に3000ダメージ。
   */
  C0000340: (skillText, context) => {
    const { addLog } = context;
    const { myLife, setMyLife, opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    if (context.skillType === 'advanced') {
      // ライフコストチェック
      if (myLife <= 2000) {
        addLog('ライフが足りません（コスト: 2000）', 'info');
        return false;
      }

      // ライフコストを支払う
      setMyLife(prev => prev - 2000);
      addLog('ヴェルゼファール: ライフを2000消費', 'damage');

      const opponentMonsters = opponentField.filter(m => m !== null);
      if (opponentMonsters.length === 0) {
        addLog('ヴェルゼファール: 相手フィールドにモンスターがいません', 'info');
        return true;
      }

      // 全体に3000ダメージ
      const damage = 3000;
      addLog(`ヴェルゼファール: 相手フィールド全体に${damage}ダメージ！`, 'damage');

      const destroyedMonsters = [];
      setOpponentField(prev => prev.map(m => {
        if (m) {
          const newHp = m.currentHp - damage;
          addLog(`${m.name}に${damage}ダメージ（残りHP: ${Math.max(0, newHp)}）`, 'damage');
          if (newHp <= 0) {
            destroyedMonsters.push(m);
            return null;
          }
          return { ...m, currentHp: newHp };
        }
        return m;
      }));

      if (destroyedMonsters.length > 0) {
        setOpponentGraveyard(prev => [...prev, ...destroyedMonsters]);
        destroyedMonsters.forEach(m => addLog(`${m.name}が破壊された！`, 'damage'));
      }

      return true;
    }
    return false;
  },

  /**
   * C0000341: ヴェルゼファール降臨の儀式
   * 【刹那詠唱】
   * 自分の場にいる『ヴェルゼファール』モンスター1体をリリースし、
   * デッキから『ヴェルゼファール』モンスター1体を場に召喚（コスト不要）。
   * 召喚するモンスターのコストはリリースしたモンスターのコスト＋3以下。
   * 場に『深みの儀式者』がいる場合、召喚したモンスターの攻撃力をターン終了時まで800アップ。
   */
  C0000341: (skillText, context) => {
    const { addLog, setPendingTargetSelection, setPendingDeckReview } = context;
    const { myField, setMyField, myDeck, setMyDeck, setMyGraveyard, currentPlayer } = getPlayerContext(context);

    // 場のヴェルゼファールモンスターを取得
    const verzefaalMonsters = myField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster && monster.name && monster.name.includes('ヴェルゼファール'));

    if (verzefaalMonsters.length === 0) {
      addLog('降臨の儀式: 場に『ヴェルゼファール』モンスターがいません', 'info');
      return false;
    }

    // リリース後の召喚処理
    const performRitual = (releaseIndex) => {
      const releasedMonster = myField[releaseIndex];
      if (!releasedMonster) return;

      const maxCost = releasedMonster.cost + 3;

      // デッキからコスト条件を満たすヴェルゼファールを検索
      const eligibleMonsters = myDeck.filter(card =>
        card.type === 'monster' &&
        card.name && card.name.includes('ヴェルゼファール') &&
        card.cost <= maxCost
      );

      if (eligibleMonsters.length === 0) {
        addLog(`降臨の儀式: デッキにコスト${maxCost}以下の『ヴェルゼファール』モンスターがいません`, 'info');
        return;
      }

      // リリース
      setMyField(prev => {
        const newField = [...prev];
        newField[releaseIndex] = null;
        return newField;
      });
      setMyGraveyard(prev => [...prev, releasedMonster]);
      addLog(`降臨の儀式: ${releasedMonster.name}をリリース`, 'info');

      // 深みの儀式者がいるかチェック
      const hasRitualist = myField.some(m =>
        m && m.name && m.name.includes('深みの儀式者')
      );

      // 召喚処理
      const summonMonster = (target) => {
        setMyDeck(prev => prev.filter(c => c.uniqueId !== target.uniqueId));
        setMyField(prev => {
          const newField = [...prev];
          // リリースしたスロットに召喚
          const atkBonus = hasRitualist ? 800 : 0;
          newField[releaseIndex] = {
            ...target,
            currentHp: target.hp,
            currentAttack: target.attack + atkBonus,
            canAttack: false, // 召喚酔い
            charges: [],
            statusEffects: [],
            owner: currentPlayer,
            atkBoostUntilEndOfTurn: hasRitualist ? 800 : 0, // ターン終了時リセット用
          };
          return newField;
        });
        if (hasRitualist) {
          addLog(`降臨の儀式: ${target.name}を召喚！（儀式者の力でATK+800）`, 'heal');
        } else {
          addLog(`降臨の儀式: ${target.name}を召喚！`, 'heal');
        }
      };

      if (eligibleMonsters.length === 1) {
        summonMonster(eligibleMonsters[0]);
        return;
      }

      if (setPendingDeckReview) {
        setPendingDeckReview({
          cards: eligibleMonsters,
          title: '降臨の儀式',
          message: `コスト${maxCost}以下の『ヴェルゼファール』モンスターを1体選択`,
          allowReorder: false,
          selectMode: { enabled: true, count: 1 },
          onSelect: (selectedCards) => {
            if (selectedCards.length > 0) summonMonster(selectedCards[0]);
          },
          onCancel: () => addLog('召喚をキャンセルしました', 'info'),
        });
      } else {
        summonMonster(eligibleMonsters[0]);
      }
    };

    // 1体のみの場合は自動選択
    if (verzefaalMonsters.length === 1) {
      performRitual(verzefaalMonsters[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: 'リリースする『ヴェルゼファール』モンスターを選択',
        targetType: 'self_monster',
        validTargets: verzefaalMonsters.map(v => v.index),
        isOpponent: false,
        callback: (selectedIndex) => performRitual(selectedIndex),
      });
      return true;
    }

    performRitual(verzefaalMonsters[0].index);
    return true;
  },

  /**
   * C0000342: 漂流民の抵抗
   * 自分の『アクアレギナ』モンスター1体のHPを1000アップ。
   * 場に『ヴェルゼファール』モンスターがいる場合、相手プレイヤーに500ダメージを与え、
   * ターン終了時までそのモンスターの基本技を封じる。
   */
  C0000342: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { myField, setMyField, setOpponentLife } = getPlayerContext(context);

    // 場のアクアレギナモンスターを取得
    const aquaReginaMonsters = myField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster && monster.name && monster.name.includes('アクアレギナ'));

    if (aquaReginaMonsters.length === 0) {
      addLog('漂流民の抵抗: 場に『アクアレギナ』モンスターがいません', 'info');
      return false;
    }

    // ヴェルゼファールがいるかチェック
    const hasVerzefaal = myField.some(m =>
      m && m.name && m.name.includes('ヴェルゼファール')
    );

    // HP増加処理
    const applyResistance = (targetIndex) => {
      setMyField(prev => prev.map((m, idx) => {
        if (idx === targetIndex && m) {
          addLog(`${m.name}のHPを1000アップ！`, 'heal');
          const newMonster = {
            ...m,
            hp: m.hp + 1000,
            currentHp: m.currentHp + 1000,
          };

          // ヴェルゼファールがいる場合、基本技封印
          if (hasVerzefaal) {
            addLog(`${m.name}の基本技をターン終了時まで封印`, 'info');
            newMonster.basicSkillSealedUntilEndOfTurn = true;
          }

          return newMonster;
        }
        return m;
      }));

      // ヴェルゼファールがいる場合、相手に500ダメージ
      if (hasVerzefaal) {
        setOpponentLife(prev => prev - 500);
        addLog('漂流民の抵抗: ヴェルゼファールの力で相手に500ダメージ！', 'damage');
      }
    };

    // 1体のみの場合は自動選択
    if (aquaReginaMonsters.length === 1) {
      applyResistance(aquaReginaMonsters[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: 'HPを1000アップする『アクアレギナ』モンスターを選択',
        targetType: 'self_monster',
        validTargets: aquaReginaMonsters.map(a => a.index),
        isOpponent: false,
        callback: (selectedIndex) => applyResistance(selectedIndex),
      });
      return true;
    }

    applyResistance(aquaReginaMonsters[0].index);
    return true;
  },

  /**
   * C0000343: アクアレギナの水晶術師の防壁
   * このターン、自分の『アクアレギナ』モンスターが受ける効果ダメージを0にし、HPを500アップ。
   * 場に『アクアレギナの動力-エテルノス・コア』がある場合、
   * 相手モンスター1体の攻撃力をターン終了時まで1000下げる。
   */
  C0000343: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { myField, setMyField, opponentField, setOpponentField, myFieldCard } = getPlayerContext(context);

    // 場のアクアレギナモンスターを取得
    const aquaReginaMonsters = myField.filter(m =>
      m && m.name && m.name.includes('アクアレギナ')
    );

    if (aquaReginaMonsters.length === 0) {
      addLog('水晶術師の防壁: 場に『アクアレギナ』モンスターがいません', 'info');
      return false;
    }

    // アクアレギナ全員にHP+500と効果ダメージ無効を付与
    setMyField(prev => prev.map(m => {
      if (m && m.name && m.name.includes('アクアレギナ')) {
        addLog(`${m.name}にHP+500と効果ダメージ無効を付与`, 'heal');
        return {
          ...m,
          hp: m.hp + 500,
          currentHp: m.currentHp + 500,
          effectDamageImmunityUntilEndOfTurn: true,
        };
      }
      return m;
    }));

    // エテルノス・コアがあるかチェック（フィールドカード）
    const hasEternosCore = myFieldCard &&
      myFieldCard.name && myFieldCard.name.includes('アクアレギナの動力-エテルノス・コア');

    if (hasEternosCore) {
      // 相手モンスターを取得
      const validTargets = opponentField
        .map((m, idx) => ({ monster: m, index: idx }))
        .filter(({ monster }) => monster !== null);

      if (validTargets.length === 0) {
        addLog('水晶術師の防壁: 相手フィールドにモンスターがいません（ATK減少スキップ）', 'info');
        return true;
      }

      const applyAtkReduction = (targetIndex) => {
        setOpponentField(prev => prev.map((m, idx) => {
          if (idx === targetIndex && m) {
            const newAtk = Math.max(0, m.currentAttack - 1000);
            addLog(`エテルノス・コアの力: ${m.name}の攻撃力を1000ダウン！`, 'damage');
            return {
              ...m,
              currentAttack: newAtk,
              atkReducedUntilEndOfTurn: 1000,
            };
          }
          return m;
        }));
      };

      // 1体のみの場合は自動選択
      if (validTargets.length === 1) {
        applyAtkReduction(validTargets[0].index);
        return true;
      }

      // 複数いる場合は選択UI
      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: '攻撃力を1000下げる相手モンスターを選択',
          targetType: 'opponent_monster',
          callback: (selectedIndex) => applyAtkReduction(selectedIndex),
        });
        return true;
      }

      applyAtkReduction(validTargets[0].index);
    }

    return true;
  },

  /**
   * C0000052: ネプチューンの加護
   * このターン、自分の水属性モンスター全ての攻撃力を600アップ。
   * 次のターン終了時まで、自分の水属性モンスター全てへの技のダメージが0になる。
   */
  C0000052: (skillText, context) => {
    const { addLog } = context;
    const { myField, setMyField } = getPlayerContext(context);

    // 場の水属性モンスターを取得
    const waterMonsters = myField.filter(m => m && m.attribute === '水');

    if (waterMonsters.length === 0) {
      addLog('ネプチューンの加護: 場に水属性モンスターがいません', 'info');
      return true; // 魔法発動自体は成功
    }

    // 水属性モンスター全体に効果を適用
    let buffedCount = 0;
    setMyField(prev => prev.map(m => {
      if (m && m.attribute === '水') {
        buffedCount++;
        return {
          ...m,
          currentAttack: m.currentAttack + 600,
          atkBoostUntilEndOfTurn: (m.atkBoostUntilEndOfTurn || 0) + 600,
          skillDamageImmunityUntilNextTurnEnd: true, // 次のターン終了時まで技ダメージ無効
        };
      }
      return m;
    }));

    addLog(`ネプチューンの加護: 水属性モンスター${buffedCount}体の攻撃力+600！`, 'heal');
    addLog('次のターン終了時まで水属性モンスターへの技ダメージが0になる！', 'heal');
    return true;
  },

  /**
   * C0000048: 人魚の波誘い
   * 【刹那詠唱】相手モンスター1体の攻撃先を別の相手モンスターに変更する。
   * ※攻撃リダイレクト効果として実装：相手モンスター2体を選び、前者が後者を攻撃する（同士討ち）
   */
  C0000048: (skillText, context) => {
    const { addLog, setPendingMonsterTarget } = context;
    const { opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    // 相手フィールドのモンスターを取得
    const validMonsters = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validMonsters.length < 2) {
      addLog('人魚の波誘い: 相手フィールドにモンスターが2体以上必要です', 'info');
      return false;
    }

    // 戦闘処理を行う関数
    const performCombat = (attackerIndex, targetIndex) => {
      const attacker = opponentField[attackerIndex];
      const target = opponentField[targetIndex];

      if (!attacker || !target) {
        addLog('人魚の波誘い: 対象モンスターが存在しません', 'info');
        return;
      }

      // 攻撃者の攻撃力でダメージを与える
      const damage = attacker.currentAttack || attacker.attack;
      const newTargetHp = target.currentHp - damage;

      addLog(`人魚の波誘い: ${attacker.name}が${target.name}を攻撃！${damage}ダメージ`, 'damage');

      setOpponentField((prev) => {
        const newField = [...prev];
        if (newTargetHp <= 0) {
          // 破壊
          addLog(`${target.name}が破壊された！`, 'damage');
          setOpponentGraveyard((g) => [...g, target]);
          newField[targetIndex] = null;
        } else {
          newField[targetIndex] = { ...target, currentHp: newTargetHp };
        }
        return newField;
      });
    };

    // ターゲット選択が使用可能な場合
    if (setPendingMonsterTarget) {
      // Step 1: 攻撃するモンスターを選択
      setPendingMonsterTarget({
        message: '攻撃させる相手モンスターを選択',
        targetPlayer: 'opponent',
        callback: (attackerIndex) => {
          // Step 2: 攻撃先モンスターを選択
          const remainingTargets = validMonsters.filter((t) => t.index !== attackerIndex);

          if (remainingTargets.length === 0) {
            addLog('人魚の波誘い: 攻撃先がありません', 'info');
            return;
          }

          if (remainingTargets.length === 1) {
            // 攻撃先が1体のみの場合は自動選択
            performCombat(attackerIndex, remainingTargets[0].index);
            return;
          }

          // 複数いる場合は選択
          setPendingMonsterTarget({
            message: '攻撃先の相手モンスターを選択',
            targetPlayer: 'opponent',
            callback: (targetIndex) => {
              performCombat(attackerIndex, targetIndex);
            },
          });
        },
      });
      return true;
    }

    // フォールバック: 最初の2体で自動戦闘
    const [first, second] = validMonsters;
    performCombat(first.index, second.index);
    return true;
  },
};
