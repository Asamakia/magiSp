// ========================================
// 炎属性カードの固有効果
// ========================================

import {
  getPlayerContext,
  millDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  modifyAttack,
} from '../effectHelpers';
import { hasCategory } from '../../utils/helpers';

/**
 * 炎属性カードの固有効果
 */
export const fireCardEffects = {
  /**
   * C0000021: フレア・ドラゴン
   * 基本技：自身の攻撃力の半分のダメージを相手モンスター1体に与える
   */
  C0000021: (skillText, context) => {
    const { addLog, monsterIndex, setPendingTargetSelection } = context;
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

      // フォールバック: 最初のターゲットを選択
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
   * C0000022: 火竜の吐息
   * 【刹那詠唱】相手のモンスター1体に1000ダメージを与える。相手プレイヤーに500ダメージを与える。
   */
  C0000022: (skillText, context) => {
    const { addLog, setPendingMonsterTarget } = context;
    const { opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    // 相手フィールドのモンスターをチェック
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(t => t.monster !== null);

    // 相手プレイヤーに500ダメージは必ず与える
    conditionalDamage(context, 500, 'opponent');

    if (validTargets.length === 0) {
      addLog('相手フィールドにモンスターがいないため、モンスターへのダメージはなし', 'info');
      return true;
    }

    // 1体のみの場合は自動選択
    if (validTargets.length === 1) {
      const target = validTargets[0];
      setOpponentField(prev => {
        const newField = [...prev];
        const m = newField[target.index];
        if (m) {
          const newHp = m.currentHp - 1000;
          addLog(`火竜の吐息: ${m.name}に1000ダメージ！`, 'damage');
          if (newHp <= 0) {
            addLog(`${m.name}は破壊された！`, 'damage');
            setOpponentGraveyard(prev => [...prev, m]);
            newField[target.index] = null;
          } else {
            newField[target.index] = { ...m, currentHp: newHp };
          }
        }
        return newField;
      });
      return true;
    }

    // 複数の場合はターゲット選択UI
    if (setPendingMonsterTarget) {
      setPendingMonsterTarget({
        message: '1000ダメージを与える相手モンスターを選択',
        validTargets: validTargets.map(t => t.index),
        isOpponent: true,
        callback: (targetIndex) => {
          setOpponentField(prev => {
            const newField = [...prev];
            const m = newField[targetIndex];
            if (m) {
              const newHp = m.currentHp - 1000;
              addLog(`火竜の吐息: ${m.name}に1000ダメージ！`, 'damage');
              if (newHp <= 0) {
                addLog(`${m.name}は破壊された！`, 'damage');
                setOpponentGraveyard(prev => [...prev, m]);
                newField[targetIndex] = null;
              } else {
                newField[targetIndex] = { ...m, currentHp: newHp };
              }
            }
            return newField;
          });
        },
      });
      return true;
    }

    // フォールバック: 最初のターゲットを選択
    const target = validTargets[0];
    setOpponentField(prev => {
      const newField = [...prev];
      const m = newField[target.index];
      if (m) {
        const newHp = m.currentHp - 1000;
        addLog(`火竜の吐息: ${m.name}に1000ダメージ！`, 'damage');
        if (newHp <= 0) {
          addLog(`${m.name}は破壊された！`, 'damage');
          setOpponentGraveyard(prev => [...prev, m]);
          newField[target.index] = null;
        } else {
          newField[target.index] = { ...m, currentHp: newHp };
        }
      }
      return newField;
    });
    return true;
  },

  /**
   * C0000024: 紅蓮爆発
   * 手札を全て捨てる。自分の場にいるモンスターの攻撃力を倍にする。
   */
  C0000024: (skillText, context) => {
    const { addLog } = context;
    const { myHand, setMyHand, setMyGraveyard, myField, setMyField } = getPlayerContext(context);

    // 手札を全て墓地に送る
    if (myHand.length > 0) {
      const discardedCards = [...myHand];
      setMyGraveyard(prev => [...prev, ...discardedCards]);
      setMyHand([]);
      addLog(`紅蓮爆発: 手札${discardedCards.length}枚を全て捨てた！`, 'info');
    } else {
      addLog('紅蓮爆発: 手札がない状態で発動', 'info');
    }

    // 自分の場の全モンスターの攻撃力を倍にする
    let buffedCount = 0;
    setMyField(prev => prev.map(m => {
      if (m) {
        const newAttack = m.attack * 2;
        const newCurrentAttack = (m.currentAttack || m.attack) * 2;
        buffedCount++;
        return { ...m, attack: newAttack, currentAttack: newCurrentAttack };
      }
      return m;
    }));

    if (buffedCount > 0) {
      addLog(`紅蓮爆発: 自分のモンスター${buffedCount}体の攻撃力が倍になった！`, 'damage');
    }

    return true;
  },

  /**
   * C0000028: 炎竜母フレイマ
   * 【召喚時】墓地の［ドラゴン］モンスター1体を攻撃力半減で場に戻す
   * ※召喚時効果はtriggerで処理、常時効果はcontinuousEffectsで処理
   */
  C0000028: (skillText, context) => {
    // 召喚時効果はfireCards.jsのtriggerで処理されるため、ここでは何もしない
    // 常時効果はcontinuousEffects/monsterCards.jsで処理
    return false;
  },

  /**
   * C0000161: 灯魔龍ランプデビル
   * 【召喚時】場にいる全ての炎属性モンスターに3000ダメージを与え、破壊したモンスター×600のダメージを相手プレイヤーに与える
   */
  C0000161: (skillText, context) => {
    const { addLog } = context;
    const {
      setP1Field, setP2Field,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('【召喚時】')) {
      let destroyedCount = 0;

      // 両プレイヤーのフィールドの炎属性モンスターにダメージ
      [1, 2].forEach(player => {
        const setField = player === 1 ? setP1Field : setP2Field;
        const setGraveyard = player === 1 ? setP1Graveyard : setP2Graveyard;

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
    if (context.skillType === 'basic') {
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
    const { addLog } = context;
    const { myActiveSP, setMyActiveSP, setMyRestedSP } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      if (myActiveSP >= 1) {
        // SP消費
        setMyActiveSP(prev => prev - 1);
        setMyRestedSP(prev => prev + 1);

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
    const { addLog } = context;
    const { myField, setMyField, setMyGraveyard } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      const tanukiMonsters = myField.filter(m => m && m.name && m.name.includes('岩狸'));

      if (tanukiMonsters.length > 0) {
        const target = tanukiMonsters[0];
        const damage = Math.floor(target.attack / 2);

        // モンスターを破壊
        setMyField(prev => prev.map(m => {
          if (m && m.uniqueId === target.uniqueId) {
            return null;
          }
          return m;
        }));
        setMyGraveyard(prev => [...prev, target]);

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
    const { addLog } = context;
    const { myHand, setMyHand, setMyGraveyard } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      if (myHand.length > 0) {
        const discardedCard = myHand[0];
        setMyHand(prev => prev.slice(1));
        setMyGraveyard(prev => [...prev, discardedCard]);
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
    const { addLog } = context;
    const { myGraveyard, setMyGraveyard, setMyHand } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      const targetCard = myGraveyard.find(card =>
        card.type === 'magic' && card.cost === 3
      );

      if (targetCard) {
        setMyGraveyard(prev => prev.filter(c => c.uniqueId !== targetCard.uniqueId));
        setMyHand(prev => [...prev, targetCard]);
        addLog(`墓地から「${targetCard.name}」を手札に戻した`, 'info');
        return true;
      } else {
        addLog('墓地にコスト3の魔法カードがありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000023: レッドバーストドラゴン
   * 基本技：自分の手札を1枚捨てて、このカードの攻撃力をターン終了時まで1000アップ
   */
  C0000023: (skillText, context) => {
    const { addLog, monsterIndex, setPendingHandSelection } = context;
    const { myHand, setMyHand, myField, setMyField, setMyGraveyard } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      const monster = myField[monsterIndex];
      if (!monster) {
        addLog('モンスターが存在しません', 'damage');
        return false;
      }

      // 手札がない場合は失敗
      if (myHand.length === 0) {
        addLog('レッドバーストドラゴンの基本技: 手札がありません', 'info');
        return false;
      }

      // 1枚のみの場合は自動選択
      if (myHand.length === 1) {
        const discardedCard = myHand[0];
        setMyHand([]);
        setMyGraveyard(prev => [...prev, discardedCard]);
        setMyField(prev => prev.map((m, idx) => {
          if (idx === monsterIndex && m) {
            const newAttack = m.attack + 1000;
            return { ...m, attack: newAttack };
          }
          return m;
        }));
        addLog(`レッドバーストドラゴンの基本技: 「${discardedCard.name}」を捨てて攻撃力+1000！`, 'heal');
        return true;
      }

      // 複数の場合は選択UI
      if (setPendingHandSelection) {
        setPendingHandSelection({
          message: '捨てる手札を1枚選択してください',
          filter: () => true, // 全ての手札が対象
          callback: (selectedCard) => {
            setMyHand(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));
            setMyGraveyard(prev => [...prev, selectedCard]);
            setMyField(prev => prev.map((m, idx) => {
              if (idx === monsterIndex && m) {
                const newAttack = m.attack + 1000;
                return { ...m, attack: newAttack };
              }
              return m;
            }));
            addLog(`レッドバーストドラゴンの基本技: 「${selectedCard.name}」を捨てて攻撃力+1000！`, 'heal');
          },
        });
        return true;
      }

      // フォールバック: 最初の手札を選択
      const discardedCard = myHand[0];
      setMyHand(prev => prev.slice(1));
      setMyGraveyard(prev => [...prev, discardedCard]);
      setMyField(prev => prev.map((m, idx) => {
        if (idx === monsterIndex && m) {
          const newAttack = m.attack + 1000;
          return { ...m, attack: newAttack };
        }
        return m;
      }));
      addLog(`レッドバーストドラゴンの基本技: 「${discardedCard.name}」を捨てて攻撃力+1000！`, 'heal');
      return true;
    }
    return false;
  },

  /**
   * C0000025: ブレイズ・ドラゴン
   * 基本技：自身の攻撃力の半分のダメージを相手モンスター1体に与える
   */
  C0000025: (skillText, context) => {
    const { addLog, monsterIndex, setPendingTargetSelection } = context;
    const { myField, opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

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

      // ダメージを与えてHP0なら破壊する関数
      const applyDamage = (targetIndex) => {
        const targetMonster = opponentField[targetIndex];
        if (!targetMonster) return;

        const newHp = targetMonster.currentHp - damage;
        addLog(`${monster.name}の基本技: ${targetMonster.name}に${damage}ダメージ！`, 'damage');

        if (newHp <= 0) {
          addLog(`${targetMonster.name}は破壊された！`, 'damage');
          setOpponentField(prev => prev.map((m, idx) => idx === targetIndex ? null : m));
          setOpponentGraveyard(prev => [...prev, targetMonster]);
        } else {
          setOpponentField(prev => prev.map((m, idx) => {
            if (idx === targetIndex && m) {
              return { ...m, currentHp: newHp };
            }
            return m;
          }));
        }
      };

      // 1体のみの場合は自動選択
      if (validTargets.length === 1) {
        applyDamage(validTargets[0].index);
        return true;
      }

      // 複数の場合はターゲット選択UI
      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: `${damage}ダメージを与える相手モンスターを選択`,
          validTargets: validTargets.map(t => t.index),
          isOpponent: true,
          callback: (targetIndex) => {
            const targetMonster = opponentField[targetIndex];
            if (!targetMonster) return;

            const newHp = targetMonster.currentHp - damage;
            addLog(`${monster.name}の基本技: ${targetMonster.name}に${damage}ダメージ！`, 'damage');

            if (newHp <= 0) {
              addLog(`${targetMonster.name}は破壊された！`, 'damage');
              setOpponentField(prev => prev.map((m, idx) => idx === targetIndex ? null : m));
              setOpponentGraveyard(prev => [...prev, targetMonster]);
            } else {
              setOpponentField(prev => prev.map((m, idx) => {
                if (idx === targetIndex && m) {
                  return { ...m, currentHp: newHp };
                }
                return m;
              }));
            }
          },
        });
        return true;
      }

      // フォールバック: 最初のターゲットを選択
      applyDamage(validTargets[0].index);
      return true;
    }
    return false;
  },

  /**
   * C0000170: 岩狸・大岩王
   * 上級技：チャージを2消費して、デッキから「岩狸」モンスター1体を場に召喚する。
   */
  C0000170: (skillText, context) => {
    const { addLog, currentPlayer } = context;
    const { myDeck, setMyDeck, myField, setMyField } = getPlayerContext(context);

    if (context.skillType === 'advanced') {
      // デッキから岩狸モンスターを探す
      const tanukiIndex = myDeck.findIndex(card =>
        card.type === 'monster' && card.name && card.name.includes('岩狸')
      );

      if (tanukiIndex === -1) {
        addLog('岩狸・大岩王の上級技: デッキに岩狸モンスターがいません', 'info');
        return false;
      }

      // 空きスロットを探す
      const emptySlotIndex = myField.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog('岩狸・大岩王の上級技: フィールドに空きがありません', 'info');
        return false;
      }

      const targetCard = myDeck[tanukiIndex];

      // モンスターインスタンスを作成
      const monsterInstance = {
        ...targetCard,
        uniqueId: `${targetCard.id}_${Date.now()}_${Math.random()}`,
        currentHp: targetCard.hp,
        currentAttack: targetCard.attack,
        canAttack: false,
        usedSkillThisTurn: false,
        owner: currentPlayer,
        charges: [],
        statusEffects: [],
      };

      // デッキから除去
      const newDeck = [...myDeck];
      newDeck.splice(tanukiIndex, 1);
      setMyDeck(newDeck);

      // フィールドに召喚
      setMyField(prev => {
        const newField = [...prev];
        newField[emptySlotIndex] = monsterInstance;
        return newField;
      });

      addLog(`岩狸・大岩王の上級技: デッキから「${targetCard.name}」を召喚！`, 'info');
      return true;
    }
    return false;
  },

  // ========================================
  // 魔法カード
  // ========================================

  /**
   * C0000173: 熔岩の呼び声
   * デッキからコスト3以下の【マグマフォージ】モンスター1体を場に召喚（コスト不要）
   */
  C0000173: (skillText, context) => {
    const { addLog, currentPlayer } = context;
    const { myDeck, setMyDeck, myField, setMyField } = getPlayerContext(context);

    // デッキからコスト3以下のマグマフォージモンスターを探す
    const targetIndex = myDeck.findIndex(card =>
      card.type === 'monster' &&
      card.cost <= 3 &&
      hasCategory(card, '【マグマフォージ】')
    );

    if (targetIndex === -1) {
      addLog('熔岩の呼び声: デッキにコスト3以下の【マグマフォージ】モンスターがいません', 'info');
      return false;
    }

    // 空きスロットを探す
    const emptySlotIndex = myField.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
      addLog('熔岩の呼び声: フィールドに空きがありません', 'info');
      return false;
    }

    const targetCard = myDeck[targetIndex];

    // モンスターインスタンスを作成
    const monsterInstance = {
      ...targetCard,
      uniqueId: `${targetCard.id}_${Date.now()}_${Math.random()}`,
      currentHp: targetCard.hp,
      currentAttack: targetCard.attack,
      canAttack: false,
      usedSkillThisTurn: false,
      owner: currentPlayer,
      charges: [],
      statusEffects: [],
    };

    // デッキから除去
    const newDeck = [...myDeck];
    newDeck.splice(targetIndex, 1);
    setMyDeck(newDeck);

    // フィールドに召喚
    setMyField(prev => {
      const newField = [...prev];
      newField[emptySlotIndex] = monsterInstance;
      return newField;
    });

    addLog(`熔岩の呼び声: デッキから「${targetCard.name}」を召喚！`, 'info');
    return true;
  },

  /**
   * C0000174: 岩狸の咆哮
   * 場にいる【ビースト・狸】モンスター1体の攻撃力をターン終了時まで800アップし、相手モンスター1体の攻撃力を600ダウン
   */
  C0000174: (skillText, context) => {
    const { addLog } = context;
    const { myField, setMyField, opponentField, setOpponentField } = getPlayerContext(context);

    // 【ビースト・狸】モンスターを探す
    const tanukiIndex = myField.findIndex(m =>
      m && hasCategory(m, '【ビースト・狸】')
    );

    if (tanukiIndex === -1) {
      addLog('岩狸の咆哮: 【ビースト・狸】モンスターがいません', 'info');
      return false;
    }

    // 攻撃力800アップ
    setMyField(prev => {
      const newField = [...prev];
      if (newField[tanukiIndex]) {
        const newAttack = (newField[tanukiIndex].currentAttack || newField[tanukiIndex].attack) + 800;
        newField[tanukiIndex] = {
          ...newField[tanukiIndex],
          attack: newField[tanukiIndex].attack + 800,
          currentAttack: newAttack,
        };
        addLog(`岩狸の咆哮: ${newField[tanukiIndex].name}の攻撃力+800！`, 'heal');
      }
      return newField;
    });

    // 相手モンスター1体の攻撃力を600ダウン
    const opponentMonsterIndex = opponentField.findIndex(m => m !== null);
    if (opponentMonsterIndex !== -1) {
      setOpponentField(prev => {
        const newField = [...prev];
        if (newField[opponentMonsterIndex]) {
          const newAttack = Math.max(0, (newField[opponentMonsterIndex].currentAttack || newField[opponentMonsterIndex].attack) - 600);
          newField[opponentMonsterIndex] = {
            ...newField[opponentMonsterIndex],
            attack: Math.max(0, newField[opponentMonsterIndex].attack - 600),
            currentAttack: newAttack,
          };
          addLog(`岩狸の咆哮: ${newField[opponentMonsterIndex].name}の攻撃力-600！`, 'damage');
        }
        return newField;
      });
    }

    return true;
  },

  /**
   * C0000179: 熔岩再生
   * 墓地のコスト4以下の《岩狸》モンスター2体を場に戻す（攻撃力は半分、HPは半分）
   */
  C0000179: (skillText, context) => {
    const { addLog, currentPlayer } = context;
    const { myGraveyard, setMyGraveyard, myField, setMyField } = getPlayerContext(context);

    // 墓地からコスト4以下の岩狸モンスターを探す
    const tanukiCards = myGraveyard.filter(card =>
      card.type === 'monster' &&
      card.cost <= 4 &&
      card.name && card.name.includes('岩狸')
    );

    if (tanukiCards.length === 0) {
      addLog('熔岩再生: 墓地にコスト4以下の岩狸モンスターがいません', 'info');
      return false;
    }

    // 空きスロットを確認
    const emptySlots = myField.reduce((acc, slot, idx) => {
      if (slot === null) acc.push(idx);
      return acc;
    }, []);

    if (emptySlots.length === 0) {
      addLog('熔岩再生: フィールドに空きがありません', 'info');
      return false;
    }

    // 最大2体まで蘇生
    const reviveCount = Math.min(tanukiCards.length, emptySlots.length, 2);
    const toRevive = tanukiCards.slice(0, reviveCount);
    const revivedIds = toRevive.map(c => c.uniqueId || c.id);

    // 墓地から除去
    setMyGraveyard(prev => prev.filter(c => !revivedIds.includes(c.uniqueId || c.id)));

    // フィールドに蘇生
    setMyField(prev => {
      const newField = [...prev];
      toRevive.forEach((card, i) => {
        const slotIndex = emptySlots[i];
        newField[slotIndex] = {
          ...card,
          uniqueId: `${card.id}_revive_${Date.now()}_${Math.random()}_${i}`,
          attack: Math.floor(card.attack / 2),
          currentAttack: Math.floor(card.attack / 2),
          hp: Math.floor(card.hp / 2),
          currentHp: Math.floor(card.hp / 2),
          canAttack: false,
          usedSkillThisTurn: false,
          owner: currentPlayer,
          charges: [],
          statusEffects: [],
        };
        addLog(`熔岩再生: 「${card.name}」を蘇生！（攻撃力${Math.floor(card.attack / 2)}、HP${Math.floor(card.hp / 2)}）`, 'info');
      });
      return newField;
    });

    return true;
  },

  /**
   * C0000181: 岩狸の覚醒
   * 場にいる炎属性モンスター1体の攻撃力をターン終了時まで倍にする
   */
  C0000181: (skillText, context) => {
    const { addLog } = context;
    const { myField, setMyField } = getPlayerContext(context);

    // 炎属性モンスターを探す
    const fireMonsterIndex = myField.findIndex(m => m && m.attribute === '炎');

    if (fireMonsterIndex === -1) {
      addLog('岩狸の覚醒: 炎属性モンスターがいません', 'info');
      return false;
    }

    // 攻撃力を倍にする
    setMyField(prev => {
      const newField = [...prev];
      if (newField[fireMonsterIndex]) {
        const currentAtk = newField[fireMonsterIndex].currentAttack || newField[fireMonsterIndex].attack;
        const doubledAtk = currentAtk * 2;
        newField[fireMonsterIndex] = {
          ...newField[fireMonsterIndex],
          attack: doubledAtk,
          currentAttack: doubledAtk,
        };
        addLog(`岩狸の覚醒: ${newField[fireMonsterIndex].name}の攻撃力が${currentAtk}→${doubledAtk}に倍化！`, 'heal');
      }
      return newField;
    });

    return true;
  },

  /**
   * C0000184: 狸の業火
   * 自分の場にいる《岩狸》モンスター1体を破壊し、その攻撃力分のダメージを相手に与える
   */
  C0000184: (skillText, context) => {
    const { addLog } = context;
    const { myField, setMyField, setMyGraveyard, setOpponentLife } = getPlayerContext(context);

    // 岩狸モンスターを探す
    const tanukiIndex = myField.findIndex(m => m && m.name && m.name.includes('岩狸'));

    if (tanukiIndex === -1) {
      addLog('狸の業火: 岩狸モンスターがいません', 'info');
      return false;
    }

    const targetMonster = myField[tanukiIndex];
    const damage = targetMonster.currentAttack || targetMonster.attack;

    // モンスターを破壊
    setMyField(prev => {
      const newField = [...prev];
      newField[tanukiIndex] = null;
      return newField;
    });

    // 墓地に送る
    setMyGraveyard(prev => [...prev, targetMonster]);

    // 相手にダメージ
    setOpponentLife(prev => prev - damage);

    addLog(`狸の業火: ${targetMonster.name}を破壊！`, 'damage');
    addLog(`狸の業火: 相手プレイヤーに${damage}ダメージ！`, 'damage');

    return true;
  },

  // 他の炎属性カードを追加...
};
