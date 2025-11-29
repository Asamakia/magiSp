// ========================================
// 闇属性カードの固有効果
// ========================================

import {
  getPlayerContext,
  millOpponentDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  modifyAttack,
  selectAndApplyStatusToOpponent,
} from '../effectHelpers';
import { STATUS_EFFECT_TYPES } from '../statusEffects';

/**
 * 闇属性カードの固有効果
 */
export const darkCardEffects = {
  /**
   * C0000078: 禁忌の傀儡師マレウス
   * 基本技：墓地の闇属性モンスター1体を自分の場に戻す（攻撃力300、HP800、効果無効）
   */
  C0000078: (skillText, context) => {
    const { addLog } = context;
    const { myGraveyard, setMyGraveyard, myField, setMyField, currentPlayer } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      const darkMonster = myGraveyard.find(card =>
        card.type === 'monster' && card.attribute === '闇'
      );

      if (!darkMonster) {
        addLog('墓地に闇属性モンスターがありません', 'info');
        return false;
      }

      const emptySlotIndex = myField.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog('場が満杯です', 'info');
        return false;
      }

      // 墓地から蘇生（攻撃力300、HP800固定）
      setMyGraveyard(prev => prev.filter(c => c.uniqueId !== darkMonster.uniqueId));
      setMyField(prev => {
        const newField = [...prev];
        newField[emptySlotIndex] = {
          ...darkMonster,
          attack: 300,
          currentAttack: 300,
          hp: 800,
          currentHp: 800,
          canAttack: false,
          owner: currentPlayer,
          charges: [],
          statusEffects: [],
        };
        return newField;
      });

      addLog(`${darkMonster.name}を蘇生（攻撃力300、HP800）`, 'info');
      return true;
    }
    return false;
  },

  /**
   * C0000094: 闇鴉の斥候
   * 【召喚時】相手のデッキの上から1枚を墓地に送る
   */
  C0000094: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      millOpponentDeck(context, 1);
      return true;
    }
    return false;
  },

  /**
   * C0000096: 奈落の追跡者
   * 【召喚時】相手の手札を1枚選び、それがモンスターなら墓地に送る
   */
  C0000096: (skillText, context) => {
    const { addLog } = context;
    const { opponentHand, setOpponentHand, setOpponentGraveyard } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      if (opponentHand.length === 0) {
        addLog('相手の手札がありません', 'info');
        return true;
      }

      // ランダムに1枚選択
      const randomIndex = Math.floor(Math.random() * opponentHand.length);
      const selectedCard = opponentHand[randomIndex];

      if (selectedCard.type === 'monster') {
        setOpponentHand(prev => prev.filter((_, idx) => idx !== randomIndex));
        setOpponentGraveyard(prev => [...prev, selectedCard]);
        addLog(`相手の手札「${selectedCard.name}」を墓地に送った`, 'damage');
      } else {
        addLog(`選ばれたカードはモンスターではありませんでした`, 'info');
      }
      return true;
    }
    return false;
  },

  /**
   * C0000099: 虚蝕獣・爪刃の群れ
   * 【召喚時】相手モンスター1体に800ダメージを与える
   */
  C0000099: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return conditionalDamage(context, 800, 'opponent_monster', 0);
    }
    return false;
  },

  /**
   * C0000113: 咆哮の虚蝕獣
   * 【召喚時】相手のデッキの上から3枚を墓地に送る
   */
  C0000113: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      millOpponentDeck(context, 3);
      return true;
    }
    return false;
  },

  /**
   * C0000115: 禁断の使徒
   * 【召喚時】相手モンスター1体に300ダメージを与える
   */
  C0000115: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return conditionalDamage(context, 300, 'opponent_monster', 0);
    }
    return false;
  },

  /**
   * C0000126: ダーク・シャンデリア
   * 【召喚時】相手モンスター全体の攻撃力を300ダウン
   */
  C0000126: (skillText, context) => {
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
          const newAtk = Math.max(0, m.attack - 300);
          return { ...m, attack: newAtk };
        }
        return m;
      }));

      addLog('相手モンスター全体の攻撃力を300ダウン', 'info');
      return true;
    }
    return false;
  },

  /**
   * C0000231: 幼魔王女リリカ
   * 【召喚時】デッキから《ゴシック》または《鎖》魔法カード1枚を手札に加える
   */
  C0000231: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.type === 'magic' &&
               card.name && (card.name.includes('ゴシック') || card.name.includes('鎖'));
      }) !== null;
    }
    return false;
  },

  /**
   * C0000232: 奉仕のリリカ
   * 【召喚時】自分のSPトークンを１つアクティブにする
   */
  C0000232: (skillText, context) => {
    const { addLog } = context;
    const { myRestedSP, setMyActiveSP, setMyRestedSP } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      if (myRestedSP > 0) {
        setMyActiveSP(prev => prev + 1);
        setMyRestedSP(prev => prev - 1);
        addLog('レストSPを1個アクティブにした', 'info');
        return true;
      } else {
        addLog('レストSPがありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000384: 魔女エリザヴェット・ヴェイル
   * 基本技: 自分の墓地の《黒呪》魔法カード1枚を手札に戻す（ターンに1度）
   */
  C0000384: (skillText, context) => {
    const { addLog, setPendingGraveyardSelection } = context;
    const { myGraveyard, setMyGraveyard, setMyHand } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // 墓地から《黒呪》魔法カードを検索
      const blackCurseMagics = myGraveyard.filter(
        (card) => card.type === 'magic' && card.name && card.name.includes('黒呪')
      );

      if (blackCurseMagics.length === 0) {
        addLog('墓地に《黒呪》魔法カードがありません', 'info');
        return false;
      }

      // 複数ある場合は選択UIを表示
      if (blackCurseMagics.length > 1 && setPendingGraveyardSelection) {
        setPendingGraveyardSelection({
          message: '手札に戻す《黒呪》魔法カードを選択',
          cards: blackCurseMagics,
          callback: (selectedCard) => {
            // 墓地から除去
            setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
            // 手札に追加
            setMyHand((prev) => [...prev, selectedCard]);
            addLog(`${selectedCard.name}を手札に戻した`, 'info');
          },
        });
        return true;
      }

      // 1枚だけの場合は自動選択
      const targetCard = blackCurseMagics[0];
      setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== targetCard.uniqueId));
      setMyHand((prev) => [...prev, targetCard]);
      addLog(`${targetCard.name}を手札に戻した`, 'info');
      return true;
    }

    return false;
  },

  /**
   * C0000424: 呪灰の翼ダスクドラゴン
   * 基本技: 自分のライフを600減らし、相手モンスター1体のHPを1200減らす（ターンに1度）
   */
  C0000424: (skillText, context) => {
    const { addLog, setPendingMonsterTarget } = context;
    const { setMyLife, opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // 相手モンスターがいるか確認
      const opponentMonsters = opponentField
        .map((m, idx) => ({ monster: m, index: idx }))
        .filter(({ monster }) => monster !== null);

      if (opponentMonsters.length === 0) {
        addLog('相手フィールドにモンスターがいません', 'info');
        return true; // 対象がいなくても技の発動自体は成功として扱う
      }

      // ライフが足りるか確認（0以下にはなれるが、自滅するかどうかはゲームルール次第）
      // ライフコストとして600減らす
      setMyLife((prev) => prev - 600);
      addLog('呪灰の翼ダスクドラゴンの基本技！ライフを600支払った', 'damage');

      // 1体だけの場合は自動選択
      if (opponentMonsters.length === 1) {
        const target = opponentMonsters[0];
        const newHp = Math.max(0, target.monster.currentHp - 1200);
        addLog(`${target.monster.name}のHPを1200減少！（残りHP: ${newHp}）`, 'damage');

        if (newHp <= 0) {
          // モンスター破壊
          setOpponentField((prev) => {
            const newField = [...prev];
            newField[target.index] = null;
            return newField;
          });
          setOpponentGraveyard((prev) => [...prev, target.monster]);
          addLog(`${target.monster.name}は破壊された！`, 'damage');
        } else {
          setOpponentField((prev) =>
            prev.map((m, idx) => {
              if (idx === target.index && m) {
                return { ...m, currentHp: newHp };
              }
              return m;
            })
          );
        }
        return true;
      }

      // 複数モンスターがいる場合は選択UI
      if (setPendingMonsterTarget) {
        setPendingMonsterTarget({
          message: 'HPを1200減らすモンスターを選択',
          targetPlayer: 'opponent',
          callback: (selectedIndex) => {
            const selectedMonster = opponentField[selectedIndex];
            if (selectedMonster) {
              const newHp = Math.max(0, selectedMonster.currentHp - 1200);
              addLog(`${selectedMonster.name}のHPを1200減少！（残りHP: ${newHp}）`, 'damage');

              if (newHp <= 0) {
                // モンスター破壊
                setOpponentField((prev) => {
                  const newField = [...prev];
                  newField[selectedIndex] = null;
                  return newField;
                });
                setOpponentGraveyard((prev) => [...prev, selectedMonster]);
                addLog(`${selectedMonster.name}は破壊された！`, 'damage');
              } else {
                setOpponentField((prev) =>
                  prev.map((m, idx) => {
                    if (idx === selectedIndex && m) {
                      return { ...m, currentHp: newHp };
                    }
                    return m;
                  })
                );
              }
            }
          },
        });
      }
      return true;
    }

    return false;
  },

  /**
   * C0000396: 呪骸王エリザルヴェドン
   * 基本技: 自分の墓地の《黒呪》魔法カード1枚をデッキに戻し、このカードの攻撃力をターン終了時まで800アップ（ターンに1度）
   * 上級技: 自分の墓地の《黒呪》魔法カード1枚をデッキに戻し、そのカードの効果を発動する
   */
  C0000396: (skillText, context) => {
    const { addLog, monsterIndex, setPendingGraveyardSelection } = context;
    const { myGraveyard, setMyGraveyard, setMyDeck, setMyField } = getPlayerContext(context);

    // 墓地から《黒呪》魔法カードを検索
    const blackCurseMagics = myGraveyard.filter(
      (card) => card.type === 'magic' && card.name && card.name.includes('黒呪')
    );

    if (blackCurseMagics.length === 0) {
      addLog('墓地に《黒呪》魔法カードがありません', 'info');
      return false;
    }

    // 基本技: 墓地の黒呪魔法1枚をデッキに戻し、攻撃力800アップ
    if (context.skillType === 'basic') {
      const executeBasicEffect = (selectedCard) => {
        // 墓地から除去
        setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
        // デッキに戻す（シャッフル）
        setMyDeck((prev) => {
          const newDeck = [...prev, selectedCard];
          // シャッフル
          for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
          }
          return newDeck;
        });
        addLog(`${selectedCard.name}をデッキに戻した`, 'info');

        // 攻撃力800アップ
        if (monsterIndex !== undefined && monsterIndex !== null) {
          setMyField((prev) =>
            prev.map((m, idx) => {
              if (idx === monsterIndex && m) {
                const newAtk = m.currentAttack + 800;
                return { ...m, currentAttack: newAtk };
              }
              return m;
            })
          );
          addLog('呪骸王エリザルヴェドンの攻撃力が800アップ！（ターン終了時まで）', 'info');
        }
      };

      // 複数ある場合は選択UI
      if (blackCurseMagics.length > 1 && setPendingGraveyardSelection) {
        setPendingGraveyardSelection({
          message: 'デッキに戻す《黒呪》魔法カードを選択',
          cards: blackCurseMagics,
          callback: executeBasicEffect,
        });
        return true;
      }

      // 1枚だけの場合は自動選択
      executeBasicEffect(blackCurseMagics[0]);
      return true;
    }

    // 上級技: 墓地の黒呪魔法1枚をデッキに戻し、そのカードの効果を発動
    if (context.skillType === 'advanced') {
      const { executeSkillEffects } = require('../effectEngine');

      const executeAdvancedEffect = (selectedCard) => {
        // 墓地から除去
        setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
        // デッキに戻す（シャッフル）
        setMyDeck((prev) => {
          const newDeck = [...prev, selectedCard];
          // シャッフル
          for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
          }
          return newDeck;
        });
        addLog(`${selectedCard.name}をデッキに戻した`, 'info');
        addLog(`${selectedCard.name}の効果を発動！`, 'info');

        // 選択したカードの効果を発動
        const effectText = selectedCard.effect || '';
        executeSkillEffects(effectText, context, selectedCard.id);
      };

      // 複数ある場合は選択UI
      if (blackCurseMagics.length > 1 && setPendingGraveyardSelection) {
        setPendingGraveyardSelection({
          message: '効果を発動する《黒呪》魔法カードを選択',
          cards: blackCurseMagics,
          callback: executeAdvancedEffect,
        });
        return true;
      }

      // 1枚だけの場合は自動選択
      executeAdvancedEffect(blackCurseMagics[0]);
      return true;
    }

    return false;
  },

  /**
   * C0000393: 黒呪・カルヴェリオンの灰嵐
   * 相手フィールド全体に1500ダメージを与え、次のターン終了時まで相手モンスターの攻撃力を500下げる。
   * 場に《呪縛の塔・ヴェルナクール》がある場合、このカードのダメージを2000に変更。
   */
  C0000393: (skillText, context) => {
    const { addLog } = context;
    const { opponentField, setOpponentField, setOpponentGraveyard, myFieldCard } = getPlayerContext(context);

    // ステータス効果エンジンをインポート
    const { statusEffectEngine, STATUS_EFFECT_TYPES } = require('../statusEffects');

    // 《呪縛の塔・ヴェルナクール》があるかチェック
    const hasVernacool = myFieldCard && myFieldCard.id === 'C0000386';
    const damage = hasVernacool ? 2000 : 1500;

    if (hasVernacool) {
      addLog('《呪縛の塔・ヴェルナクール》の効果でダメージが2000に変更！', 'info');
    }

    const destroyedMonsters = [];

    // 相手フィールド全体にダメージ + 生き残ったモンスターにATK_DOWNステータスを付与
    const newOpponentField = opponentField.map((monster) => {
      if (!monster) return null;

      const newHp = monster.currentHp - damage;
      addLog(`${monster.name}に${damage}ダメージ！`, 'damage');

      if (newHp <= 0) {
        destroyedMonsters.push(monster);
        addLog(`${monster.name}は破壊された！`, 'damage');
        return null;
      } else {
        // 生き残ったモンスターに攻撃力ダウンのステータス効果を付与
        // 「次のターン終了時まで」= 2エンドフェイズ後
        const updatedMonster = { ...monster, currentHp: newHp };
        statusEffectEngine.applyStatus(updatedMonster, STATUS_EFFECT_TYPES.ATK_DOWN, {
          value: 500,
          expiresAfterEndPhases: 2, // 次のターン終了時まで
          source: 'C0000393',
          sourceName: '黒呪・カルヴェリオンの灰嵐',
        });
        addLog(`${monster.name}の攻撃力が500下がった！（次のターン終了時まで）`, 'info');
        return updatedMonster;
      }
    });

    // フィールド更新
    setOpponentField(newOpponentField);

    // 破壊されたモンスターを墓地に送る
    if (destroyedMonsters.length > 0) {
      setOpponentGraveyard((prev) => [...prev, ...destroyedMonsters]);
    }

    return true;
  },

  /**
   * C0000075: シャドウ・バインド
   * 【刹那詠唱】相手のモンスター1体を動けなくする（1ターン行動不能）。
   */
  C0000075: (skillText, context) => {
    const { addLog, setPendingMonsterTarget } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    // 相手モンスターがいるか確認
    const validTargets = opponentField
      .map((m, idx) => m ? idx : -1)
      .filter(idx => idx !== -1);

    if (validTargets.length === 0) {
      addLog('相手の場にモンスターがいません', 'info');
      return false;
    }

    // 1体しかいない場合は自動選択
    if (validTargets.length === 1) {
      return selectAndApplyStatusToOpponent(
        context,
        STATUS_EFFECT_TYPES.STUN,
        { duration: 1 },
        'シャドウ・バインド'
      );
    }

    // 複数いる場合は選択UI
    if (setPendingMonsterTarget) {
      setPendingMonsterTarget({
        message: '行動不能にするモンスターを選択',
        targetPlayer: 'opponent',
        validIndices: validTargets,
        callback: (selectedIndex) => {
          const { statusEffectEngine } = require('../statusEffects');
          setOpponentField(prev => prev.map((m, idx) => {
            if (idx === selectedIndex && m) {
              statusEffectEngine.applyStatus(m, STATUS_EFFECT_TYPES.STUN, {
                duration: 1,
                source: 'C0000075',
                sourceName: 'シャドウ・バインド',
              });
              addLog(`シャドウ・バインド: ${m.name}を行動不能にした！`, 'damage');
              return { ...m };
            }
            return m;
          }));
        },
      });
      return true;
    }

    // フォールバック：自動選択
    return selectAndApplyStatusToOpponent(
      context,
      STATUS_EFFECT_TYPES.STUN,
      { duration: 1 },
      'シャドウ・バインド'
    );
  },

  /**
   * C0000079: 深淵の騎士ガルム
   * 基本技：このターンこのカードは2回攻撃ができる。
   */
  C0000079: (skillText, context) => {
    const { addLog, monsterIndex } = context;
    const { myField, setMyField } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      if (monsterIndex === undefined || !myField[monsterIndex]) {
        addLog('対象のモンスターが見つかりません', 'info');
        return false;
      }

      // 2回攻撃フラグを設定
      setMyField(prev => {
        const newField = [...prev];
        newField[monsterIndex] = {
          ...newField[monsterIndex],
          canDoubleAttack: true,
          attacksRemaining: 2,
        };
        return newField;
      });

      addLog('深淵の騎士ガルム: このターン2回攻撃が可能になった！', 'info');
      return true;
    }
    return false;
  },

  // ========================================
  // ID80-89 魔法カード効果
  // ========================================

  /**
   * C0000083: 闇の契約
   * 自分のライフを500減らす。デッキからコスト4以下闇属性モンスター1体を手札に加える。
   */
  C0000083: (skillText, context) => {
    const { addLog } = context;
    const { setMyLife, myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

    // ライフコスト支払い
    setMyLife(prev => prev - 500);
    addLog('闇の契約: ライフを500支払った', 'damage');

    // デッキからコスト4以下の闇属性モンスターを検索
    const targetCards = myDeck.filter(card =>
      card.type === 'monster' &&
      card.attribute === '闇' &&
      card.cost <= 4
    );

    if (targetCards.length === 0) {
      addLog('デッキにコスト4以下の闇属性モンスターがありません', 'info');
      return true; // ライフは支払ったので成功扱い
    }

    // ランダムに1体選択（または最初の1体）
    const selectedCard = targetCards[0];

    // デッキから除去して手札に加える
    setMyDeck(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));
    setMyHand(prev => [...prev, selectedCard]);
    addLog(`闇の契約: ${selectedCard.name}を手札に加えた`, 'info');

    return true;
  },

  /**
   * C0000084: 腐食のコロード
   * 場にいるモンスター1体の攻撃力を800ダウン、0になると破壊。
   * このターン、自分の闇属性モンスターの攻撃力を300アップ。
   */
  C0000084: (skillText, context) => {
    const { addLog, setPendingMonsterTarget } = context;
    const { myField, setMyField, opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    // 対象選択用のリスト作成（自分・相手両方のモンスター）
    const allTargets = [];
    myField.forEach((m, idx) => {
      if (m) allTargets.push({ monster: m, index: idx, isOpponent: false });
    });
    opponentField.forEach((m, idx) => {
      if (m) allTargets.push({ monster: m, index: idx, isOpponent: true });
    });

    if (allTargets.length === 0) {
      addLog('場にモンスターがいません', 'info');
      return false;
    }

    // 攻撃力ダウン処理を行う関数
    const applyAttackDown = (targetIndex, isOpponent) => {
      const field = isOpponent ? opponentField : myField;
      const setField = isOpponent ? setOpponentField : setMyField;
      const monster = field[targetIndex];

      if (!monster) return;

      const newAtk = Math.max(0, (monster.currentAttack || monster.attack) - 800);
      addLog(`腐食のコロード: ${monster.name}の攻撃力を800ダウン！（残り${newAtk}）`, 'damage');

      if (newAtk <= 0) {
        // 破壊
        setField(prev => {
          const newField = [...prev];
          newField[targetIndex] = null;
          return newField;
        });
        if (isOpponent) {
          setOpponentGraveyard(prev => [...prev, monster]);
        }
        addLog(`${monster.name}は破壊された！`, 'damage');
      } else {
        setField(prev => prev.map((m, idx) => {
          if (idx === targetIndex && m) {
            return { ...m, currentAttack: newAtk };
          }
          return m;
        }));
      }

      // 自分の闇属性モンスターの攻撃力を300アップ
      setMyField(prev => prev.map(m => {
        if (m && m.attribute === '闇') {
          const boostedAtk = (m.currentAttack || m.attack) + 300;
          addLog(`${m.name}の攻撃力が300アップ！`, 'info');
          return { ...m, currentAttack: boostedAtk };
        }
        return m;
      }));
    };

    // 相手モンスターを優先選択（1体だけの場合は自動選択）
    const opponentTargets = allTargets.filter(t => t.isOpponent);
    if (opponentTargets.length === 1) {
      applyAttackDown(opponentTargets[0].index, true);
      return true;
    }

    // 複数ターゲットがある場合は選択UI
    if (setPendingMonsterTarget) {
      setPendingMonsterTarget({
        message: '攻撃力を800ダウンするモンスターを選択',
        targetPlayer: 'both',
        callback: (selectedIndex, isOpponent) => {
          applyAttackDown(selectedIndex, isOpponent);
        },
      });
      return true;
    }

    // フォールバック: 相手の最初のモンスターを選択
    if (opponentTargets.length > 0) {
      applyAttackDown(opponentTargets[0].index, true);
    } else if (allTargets.length > 0) {
      applyAttackDown(allTargets[0].index, allTargets[0].isOpponent);
    }
    return true;
  },

  /**
   * C0000086: 闇の波動
   * 相手プレイヤーに場にいる闇属性モンスターの数×400ダメージを与える。
   * 自分のライフを300減らす。
   */
  C0000086: (skillText, context) => {
    const { addLog } = context;
    const { myField, opponentField, setOpponentLife, setMyLife } = getPlayerContext(context);

    // 場にいる闘属性モンスターの数をカウント（自分・相手両方）
    const countDarkMonsters = (field) => field.filter(m => m && m.attribute === '闇').length;
    const darkCount = countDarkMonsters(myField) + countDarkMonsters(opponentField);

    const damage = darkCount * 400;
    addLog(`闇の波動: 場の闇属性モンスター${darkCount}体 × 400 = ${damage}ダメージ！`, 'damage');

    // 相手にダメージ
    if (damage > 0) {
      setOpponentLife(prev => prev - damage);
    }

    // 自分のライフを300減らす
    setMyLife(prev => prev - 300);
    addLog('闇の波動: 代償としてライフを300支払った', 'damage');

    return true;
  },

  /**
   * C0000087: シャドウ・チェインズ
   * 【刹那詠唱】相手モンスター1体の攻撃力をターン終了時まで0にし、
   * 相手モンスター1体に400ダメージを与える。
   */
  C0000087: (skillText, context) => {
    const { addLog, setPendingMonsterTarget } = context;
    const { opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    // 相手モンスターがいるか確認
    const validTargets = opponentField
      .map((m, idx) => m ? idx : -1)
      .filter(idx => idx !== -1);

    if (validTargets.length === 0) {
      addLog('相手の場にモンスターがいません', 'info');
      return false;
    }

    // 効果適用関数
    const applyEffect = (targetIndex) => {
      const targetMonster = opponentField[targetIndex];
      if (!targetMonster) return;

      // 攻撃力を0に
      addLog(`シャドウ・チェインズ: ${targetMonster.name}の攻撃力を0にした！（ターン終了時まで）`, 'damage');

      // 400ダメージ
      const newHp = targetMonster.currentHp - 400;
      addLog(`シャドウ・チェインズ: ${targetMonster.name}に400ダメージ！`, 'damage');

      if (newHp <= 0) {
        // 破壊
        setOpponentField(prev => {
          const newField = [...prev];
          newField[targetIndex] = null;
          return newField;
        });
        setOpponentGraveyard(prev => [...prev, targetMonster]);
        addLog(`${targetMonster.name}は破壊された！`, 'damage');
      } else {
        setOpponentField(prev => prev.map((m, idx) => {
          if (idx === targetIndex && m) {
            return {
              ...m,
              currentAttack: 0,
              currentHp: newHp,
              atkZeroUntilEndOfTurn: true, // ターン終了時に解除するフラグ
            };
          }
          return m;
        }));
      }
    };

    // 1体だけの場合は自動選択
    if (validTargets.length === 1) {
      applyEffect(validTargets[0]);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingMonsterTarget) {
      setPendingMonsterTarget({
        message: '攻撃力を0にし400ダメージを与えるモンスターを選択',
        targetPlayer: 'opponent',
        validIndices: validTargets,
        callback: applyEffect,
      });
      return true;
    }

    // フォールバック
    applyEffect(validTargets[0]);
    return true;
  },

  /**
   * C0000088: ネクロフィアの儀式
   * 自分の場にいるモンスター1体をリリースし、
   * デッキから《ダーク・ネクロフィア》を場に直接召喚（コスト不要）。
   */
  C0000088: (skillText, context) => {
    const { addLog, setPendingMonsterTarget } = context;
    const { myField, setMyField, myDeck, setMyDeck, setMyGraveyard, currentPlayer } = getPlayerContext(context);

    // 自分のフィールドにモンスターがいるか確認
    const myMonsters = myField
      .map((m, idx) => m ? idx : -1)
      .filter(idx => idx !== -1);

    if (myMonsters.length === 0) {
      addLog('リリースできるモンスターがいません', 'info');
      return false;
    }

    // デッキに《ダーク・ネクロフィア》があるか確認
    const necrophia = myDeck.find(card => card.name === 'ダーク・ネクロフィア');
    if (!necrophia) {
      addLog('デッキに《ダーク・ネクロフィア》がありません', 'info');
      return false;
    }

    // リリース処理とネクロフィア召喚を行う関数
    const performRitual = (releaseIndex) => {
      const releasedMonster = myField[releaseIndex];
      if (!releasedMonster) return;

      addLog(`ネクロフィアの儀式: ${releasedMonster.name}をリリース！`, 'info');

      // リリースしたモンスターを墓地に送る
      setMyGraveyard(prev => [...prev, releasedMonster]);

      // デッキからネクロフィアを除去
      setMyDeck(prev => prev.filter(c => c.uniqueId !== necrophia.uniqueId));

      // ネクロフィアを同じスロットに召喚
      setMyField(prev => {
        const newField = [...prev];
        newField[releaseIndex] = {
          ...necrophia,
          currentAttack: necrophia.attack,
          currentHp: necrophia.hp,
          canAttack: false, // 召喚ターンは攻撃不可
          owner: currentPlayer,
          charges: [],
          statusEffects: [],
        };
        return newField;
      });

      addLog(`ネクロフィアの儀式: 《ダーク・ネクロフィア》を特殊召喚！`, 'info');
    };

    // 1体だけの場合は自動選択
    if (myMonsters.length === 1) {
      performRitual(myMonsters[0]);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingMonsterTarget) {
      setPendingMonsterTarget({
        message: 'リリースするモンスターを選択',
        targetPlayer: 'self',
        validIndices: myMonsters,
        callback: performRitual,
      });
      return true;
    }

    // フォールバック
    performRitual(myMonsters[0]);
    return true;
  },

  // ========================================
  // ID90-99 追加カード
  // ========================================

  /**
   * C0000092: シャドウ・レイヴン
   * 基本技：相手の手札を1枚破棄させる。
   */
  C0000092: (skillText, context) => {
    const { addLog } = context;
    const { opponentHand, setOpponentHand, setOpponentGraveyard } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      if (opponentHand.length === 0) {
        addLog('相手の手札がありません', 'info');
        return true; // 効果は成功（対象なし）
      }

      // ランダムに1枚選択して墓地に送る
      const randomIndex = Math.floor(Math.random() * opponentHand.length);
      const discardedCard = opponentHand[randomIndex];

      setOpponentHand(prev => prev.filter((_, idx) => idx !== randomIndex));
      setOpponentGraveyard(prev => [...prev, discardedCard]);

      addLog(`シャドウ・レイヴンの基本技！相手の手札「${discardedCard.name}」を墓地に送った`, 'damage');
      return true;
    }

    return false;
  },

  /**
   * C0000093: ダーク・ヴォイド
   * 場にいるモンスター1体に1600ダメージを与える。
   */
  C0000093: (skillText, context) => {
    const { addLog, setPendingMonsterTarget } = context;
    const { myField, setMyField, setMyGraveyard, opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    // 対象選択用のリスト作成（自分・相手両方のモンスター）
    const allTargets = [];
    myField.forEach((m, idx) => {
      if (m) allTargets.push({ monster: m, index: idx, isOpponent: false });
    });
    opponentField.forEach((m, idx) => {
      if (m) allTargets.push({ monster: m, index: idx, isOpponent: true });
    });

    if (allTargets.length === 0) {
      addLog('場にモンスターがいません', 'info');
      return false;
    }

    // ダメージ処理を行う関数
    const applyDamage = (targetIndex, isOpponent) => {
      const field = isOpponent ? opponentField : myField;
      const setField = isOpponent ? setOpponentField : setMyField;
      const setGraveyard = isOpponent ? setOpponentGraveyard : setMyGraveyard;
      const monster = field[targetIndex];

      if (!monster) return;

      const newHp = monster.currentHp - 1600;
      addLog(`ダーク・ヴォイド: ${monster.name}に1600ダメージ！`, 'damage');

      if (newHp <= 0) {
        // 破壊
        setField(prev => {
          const newField = [...prev];
          newField[targetIndex] = null;
          return newField;
        });
        setGraveyard(prev => [...prev, monster]);
        addLog(`${monster.name}は破壊された！`, 'damage');
      } else {
        setField(prev => prev.map((m, idx) => {
          if (idx === targetIndex && m) {
            return { ...m, currentHp: newHp };
          }
          return m;
        }));
      }
    };

    // 相手モンスターを優先選択（1体だけの場合は自動選択）
    const opponentTargets = allTargets.filter(t => t.isOpponent);
    if (opponentTargets.length === 1 && opponentTargets.length === allTargets.length) {
      applyDamage(opponentTargets[0].index, true);
      return true;
    }

    // 複数ターゲットがある場合は選択UI
    if (setPendingMonsterTarget) {
      setPendingMonsterTarget({
        message: '1600ダメージを与えるモンスターを選択',
        targetPlayer: 'both',
        callback: (selectedIndex, isOpponent) => {
          applyDamage(selectedIndex, isOpponent);
        },
      });
      return true;
    }

    // フォールバック: 相手の最初のモンスターを選択
    if (opponentTargets.length > 0) {
      applyDamage(opponentTargets[0].index, true);
    } else if (allTargets.length > 0) {
      applyDamage(allTargets[0].index, allTargets[0].isOpponent);
    }
    return true;
  },

  /**
   * C0000097: 闇の女盗賊
   * 基本技：相手は1枚ドローする、魔法カードなら墓地に送り、自分のライフをそのコスト*200回復。
   * モンスターカードなら、相手のライフにそのコスト＊200ダメージを与える。
   */
  C0000097: (skillText, context) => {
    const { addLog } = context;
    const { setMyLife, setOpponentLife, opponentDeck, setOpponentDeck, opponentHand, setOpponentHand, setOpponentGraveyard } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      if (opponentDeck.length === 0) {
        addLog('相手のデッキがありません', 'info');
        return false;
      }

      // 相手にドローさせる
      const drawnCard = opponentDeck[0];
      setOpponentDeck(prev => prev.slice(1));
      addLog(`相手は${drawnCard.name}をドローした`, 'info');

      if (drawnCard.type === 'magic') {
        // 魔法カードの場合：墓地に送り、コスト*200回復
        setOpponentGraveyard(prev => [...prev, drawnCard]);
        const healAmount = (drawnCard.cost || 0) * 200;
        setMyLife(prev => prev + healAmount);
        addLog(`闇の女盗賊の基本技！魔法カード「${drawnCard.name}」を墓地に送り、ライフを${healAmount}回復！`, 'heal');
      } else if (drawnCard.type === 'monster') {
        // モンスターカードの場合：手札に加え、コスト*200ダメージ
        setOpponentHand(prev => [...prev, drawnCard]);
        const damage = (drawnCard.cost || 0) * 200;
        setOpponentLife(prev => prev - damage);
        addLog(`闇の女盗賊の基本技！モンスターカード「${drawnCard.name}」で相手に${damage}ダメージ！`, 'damage');
      } else {
        // その他のカード（フィールドカードなど）
        setOpponentHand(prev => [...prev, drawnCard]);
        addLog(`闇の女盗賊の基本技！${drawnCard.name}は魔法でもモンスターでもない`, 'info');
      }

      return true;
    }

    return false;
  },

  /**
   * C0000100: 闇の収集
   * 相手の墓地のカードを2枚除外し、デッキから闇属性モンスター1枚を手札に加える。
   */
  C0000100: (skillText, context) => {
    const { addLog } = context;
    const { opponentGraveyard, setOpponentGraveyard } = getPlayerContext(context);

    // 相手の墓地から2枚除外
    if (opponentGraveyard.length < 2) {
      addLog('相手の墓地にカードが2枚以上ありません', 'info');
      return false;
    }

    // 2枚を除外（ランダムに選択）
    const graveyardCopy = [...opponentGraveyard];
    const exiledCards = [];
    for (let i = 0; i < 2 && graveyardCopy.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * graveyardCopy.length);
      exiledCards.push(graveyardCopy.splice(randomIndex, 1)[0]);
    }

    setOpponentGraveyard(graveyardCopy);
    addLog(`相手の墓地から${exiledCards.map(c => c.name).join('、')}を除外`, 'info');

    // デッキから闇属性モンスターをサーチ
    const foundCard = searchCard(context, (card) => {
      return card.attribute === '闇' && card.type === 'monster';
    });

    if (foundCard) {
      addLog(`${foundCard.name}を手札に加えた`, 'info');
    } else {
      addLog('デッキに闇属性モンスターがありませんでした', 'info');
    }

    return true;
  },

  /**
   * C0000101: シャドウ・カース
   * 相手モンスター1体の攻撃力をターン終了時まで0にし、
   * そのモンスターの効果を次のターン終了時まで無効化。
   */
  C0000101: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    const monsters = opponentField.filter((m) => m !== null);
    if (monsters.length === 0) {
      addLog('相手フィールドにモンスターがいません', 'info');
      return false;
    }

    // 対象選択が必要
    if (monsters.length > 1 && setPendingTargetSelection) {
      setPendingTargetSelection({
        message: 'シャドウ・カースの対象を選択',
        validTargets: opponentField.map((m, i) => (m ? i : -1)).filter((i) => i >= 0),
        isOpponentField: true,
        callback: (targetIndex) => {
          setOpponentField((prev) => {
            const newField = [...prev];
            if (newField[targetIndex]) {
              const target = newField[targetIndex];
              addLog(`${target.name}の攻撃力が0に、効果が無効化された！`, 'info');
              newField[targetIndex] = {
                ...target,
                currentAttack: 0,
                effectNegatedUntilEndOfNextTurn: true,
              };
            }
            return newField;
          });
        },
      });
      return true;
    }

    // 1体のみの場合は自動選択
    const targetIndex = opponentField.findIndex((m) => m !== null);
    setOpponentField((prev) => {
      const newField = [...prev];
      if (newField[targetIndex]) {
        const target = newField[targetIndex];
        addLog(`${target.name}の攻撃力が0に、効果が無効化された！`, 'info');
        newField[targetIndex] = {
          ...target,
          currentAttack: 0,
          effectNegatedUntilEndOfNextTurn: true,
        };
      }
      return newField;
    });

    return true;
  },

  /**
   * C0000102: 暗黒の略奪
   * 手札を1枚捨てる。そのコスト以下の相手の場にいる禁忌カード以外のモンスター1体のコントロールを奪う。
   * エンドフェイズに、そのモンスターを破壊して自分に800ダメージ。
   */
  C0000102: (skillText, context) => {
    const { addLog, setPendingHandSelection, setPendingTargetSelection } = context;
    const { myHand, setMyHand, myField, setMyField, opponentField, setOpponentField, currentPlayer } =
      getPlayerContext(context);

    if (myHand.length === 0) {
      addLog('手札がありません', 'info');
      return false;
    }

    // 手札選択が必要
    if (setPendingHandSelection) {
      setPendingHandSelection({
        message: '捨てるカードを選択（そのコスト以下のモンスターを奪う）',
        callback: (selectedCard) => {
          // 手札から削除
          setMyHand((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
          addLog(`${selectedCard.name}を捨てた（コスト: ${selectedCard.cost || 0}）`, 'info');

          const discardedCost = selectedCard.cost || 0;

          // 対象となるモンスターを検索
          const validTargets = opponentField
            .map((m, i) => ({ monster: m, index: i }))
            .filter(
              ({ monster }) =>
                monster &&
                !monster.forbidden &&
                (monster.cost || 0) <= discardedCost
            );

          if (validTargets.length === 0) {
            addLog('コントロールを奪える対象がいません', 'info');
            return;
          }

          // 自分の場の空きスロットを確認
          const emptySlotIndex = myField.findIndex((slot) => slot === null);
          if (emptySlotIndex === -1) {
            addLog('自分の場が満杯です', 'info');
            return;
          }

          // 対象選択
          if (validTargets.length > 1 && setPendingTargetSelection) {
            setPendingTargetSelection({
              message: 'コントロールを奪うモンスターを選択',
              validTargets: validTargets.map((t) => t.index),
              isOpponentField: true,
              callback: (targetIndex) => {
                const stolenMonster = opponentField[targetIndex];
                // 相手の場から削除
                setOpponentField((prev) => {
                  const newField = [...prev];
                  newField[targetIndex] = null;
                  return newField;
                });
                // 自分の場に追加（エンドフェイズに破壊フラグ）
                setMyField((prev) => {
                  const newField = [...prev];
                  newField[emptySlotIndex] = {
                    ...stolenMonster,
                    owner: currentPlayer,
                    canAttack: false,
                    destroyAtEndPhase: true,
                    damageOwnerOnDestroy: 800,
                  };
                  return newField;
                });
                addLog(`${stolenMonster.name}のコントロールを奪った！`, 'info');
              },
            });
          } else {
            // 1体のみ
            const { monster: stolenMonster, index: targetIndex } = validTargets[0];
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = null;
              return newField;
            });
            setMyField((prev) => {
              const newField = [...prev];
              newField[emptySlotIndex] = {
                ...stolenMonster,
                owner: currentPlayer,
                canAttack: false,
                destroyAtEndPhase: true,
                damageOwnerOnDestroy: 800,
              };
              return newField;
            });
            addLog(`${stolenMonster.name}のコントロールを奪った！`, 'info');
          }
        },
      });
      return true;
    }

    return false;
  },

  /**
   * C0000103: 奈落の呼び声
   * 自分の墓地のコスト4以下闇属性モンスター1体を場に戻し、そのターン終了時まで攻撃力を600アップ。
   */
  C0000103: (skillText, context) => {
    const { addLog, setPendingGraveyardSelection } = context;
    const { myGraveyard, setMyGraveyard, myField, setMyField, currentPlayer } = getPlayerContext(context);

    // 対象となるモンスターを検索
    const validMonsters = myGraveyard.filter(
      (card) =>
        card.type === 'monster' &&
        card.attribute === '闇' &&
        (card.cost || 0) <= 4
    );

    if (validMonsters.length === 0) {
      addLog('墓地にコスト4以下の闇属性モンスターがいません', 'info');
      return false;
    }

    // 空きスロット確認
    const emptySlotIndex = myField.findIndex((slot) => slot === null);
    if (emptySlotIndex === -1) {
      addLog('場が満杯です', 'info');
      return false;
    }

    // 墓地選択が必要
    if (validMonsters.length > 1 && setPendingGraveyardSelection) {
      setPendingGraveyardSelection({
        message: '蘇生するコスト4以下の闇属性モンスターを選択',
        cards: validMonsters,
        callback: (selectedCard) => {
          // 墓地から削除
          setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
          // 場に蘇生（攻撃力+600）
          setMyField((prev) => {
            const newField = [...prev];
            const boostedAttack = (selectedCard.attack || 0) + 600;
            newField[emptySlotIndex] = {
              ...selectedCard,
              currentAttack: boostedAttack,
              currentHp: selectedCard.hp || selectedCard.currentHp,
              maxHp: selectedCard.hp,
              canAttack: false,
              owner: currentPlayer,
              charges: [],
              statusEffects: [],
              usedSkillThisTurn: false,
              attackBoostUntilEndOfTurn: 600,
            };
            return newField;
          });
          addLog(`${selectedCard.name}を蘇生！攻撃力が600アップ！`, 'info');
        },
      });
      return true;
    }

    // 1体のみの場合
    const targetCard = validMonsters[0];
    setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== targetCard.uniqueId));
    setMyField((prev) => {
      const newField = [...prev];
      const boostedAttack = (targetCard.attack || 0) + 600;
      newField[emptySlotIndex] = {
        ...targetCard,
        currentAttack: boostedAttack,
        currentHp: targetCard.hp || targetCard.currentHp,
        maxHp: targetCard.hp,
        canAttack: false,
        owner: currentPlayer,
        charges: [],
        statusEffects: [],
        usedSkillThisTurn: false,
        attackBoostUntilEndOfTurn: 600,
      };
      return newField;
    });
    addLog(`${targetCard.name}を蘇生！攻撃力が600アップ！`, 'info');

    return true;
  },

  /**
   * C0000104: 闇の崩壊
   * 場にいる全てのモンスターの攻撃力を半分にし、相手モンスター全体にその差分の合計ダメージを与える。
   */
  C0000104: (skillText, context) => {
    const { addLog } = context;
    const { myField, setMyField, opponentField, setOpponentField, setOpponentGraveyard } =
      getPlayerContext(context);

    let totalDamage = 0;

    // 自分のモンスターの攻撃力を半減し、差分を計算
    setMyField((prev) => {
      return prev.map((monster) => {
        if (monster) {
          const oldAttack = monster.currentAttack || monster.attack || 0;
          const newAttack = Math.floor(oldAttack / 2);
          const diff = oldAttack - newAttack;
          totalDamage += diff;
          addLog(`${monster.name}の攻撃力: ${oldAttack} → ${newAttack}`, 'info');
          return { ...monster, currentAttack: newAttack };
        }
        return monster;
      });
    });

    // 相手のモンスターの攻撃力を半減し、差分を計算
    const opponentDiffs = [];
    setOpponentField((prev) => {
      return prev.map((monster) => {
        if (monster) {
          const oldAttack = monster.currentAttack || monster.attack || 0;
          const newAttack = Math.floor(oldAttack / 2);
          const diff = oldAttack - newAttack;
          totalDamage += diff;
          opponentDiffs.push({ name: monster.name, oldAttack, newAttack });
          addLog(`${monster.name}の攻撃力: ${oldAttack} → ${newAttack}`, 'info');
          return { ...monster, currentAttack: newAttack };
        }
        return monster;
      });
    });

    addLog(`攻撃力差分の合計: ${totalDamage}`, 'info');

    // 相手モンスター全体に差分ダメージ
    if (totalDamage > 0) {
      const destroyedMonsters = [];
      setOpponentField((prev) => {
        return prev.map((monster) => {
          if (monster) {
            const newHp = monster.currentHp - totalDamage;
            addLog(`${monster.name}に${totalDamage}ダメージ！（残りHP: ${Math.max(0, newHp)}）`, 'damage');
            if (newHp <= 0) {
              destroyedMonsters.push(monster);
              return null;
            }
            return { ...monster, currentHp: newHp };
          }
          return monster;
        });
      });

      // 破壊されたモンスターを墓地に送る
      if (destroyedMonsters.length > 0) {
        setOpponentGraveyard((prev) => [...prev, ...destroyedMonsters]);
        destroyedMonsters.forEach((m) => addLog(`${m.name}は破壊された！`, 'damage'));
      }
    }

    return true;
  },

  // ========================================
  // ID110-119 追加カード
  // ========================================

  /**
   * C0000112: シャドウ・エンフォーサー
   * 基本技：相手の墓地のカードを2枚除外し、その中にモンスターがあれば相手プレイヤーに600ダメージを与える。
   */
  C0000112: (skillText, context) => {
    const { addLog } = context;
    const { opponentGraveyard, setOpponentGraveyard, setOpponentLife } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      if (opponentGraveyard.length < 2) {
        addLog('相手の墓地にカードが2枚以上ありません', 'info');
        return false;
      }

      // 2枚を除外（ランダムに選択）
      const graveyardCopy = [...opponentGraveyard];
      const exiledCards = [];
      for (let i = 0; i < 2 && graveyardCopy.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * graveyardCopy.length);
        exiledCards.push(graveyardCopy.splice(randomIndex, 1)[0]);
      }

      setOpponentGraveyard(graveyardCopy);
      addLog(`シャドウ・エンフォーサーの基本技！相手の墓地から${exiledCards.map(c => c.name).join('、')}を除外`, 'info');

      // モンスターが含まれていれば600ダメージ
      const hasMonster = exiledCards.some(c => c.type === 'monster');
      if (hasMonster) {
        setOpponentLife(prev => prev - 600);
        addLog('除外したカードにモンスターが含まれていた！相手に600ダメージ！', 'damage');
      }

      return true;
    }

    return false;
  },

  /**
   * C0000117: 禁忌の波動
   * 場にいる全てのモンスターの効果をターン終了時まで無効化し、
   * 相手モンスター全体に場の闇属性モンスター1体につき400ダメージを与える。
   */
  C0000117: (skillText, context) => {
    const { addLog } = context;
    const { myField, setMyField, opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    // 場にいる全てのモンスターの効果を無効化
    setMyField(prev => prev.map(m => {
      if (m) {
        return { ...m, effectNegatedUntilEndOfTurn: true };
      }
      return m;
    }));

    setOpponentField(prev => prev.map(m => {
      if (m) {
        return { ...m, effectNegatedUntilEndOfTurn: true };
      }
      return m;
    }));

    addLog('禁忌の波動: 場の全モンスターの効果を無効化！', 'info');

    // 場の闇属性モンスターをカウント（自分・相手両方）
    const countDarkMonsters = (field) => field.filter(m => m && m.attribute === '闇').length;
    const darkCount = countDarkMonsters(myField) + countDarkMonsters(opponentField);

    const damage = darkCount * 400;

    if (damage > 0) {
      addLog(`場の闇属性モンスター${darkCount}体 × 400 = ${damage}ダメージ！`, 'damage');

      // 相手モンスター全体にダメージ
      const destroyedMonsters = [];
      setOpponentField(prev => prev.map(monster => {
        if (monster) {
          const newHp = monster.currentHp - damage;
          addLog(`${monster.name}に${damage}ダメージ！`, 'damage');

          if (newHp <= 0) {
            destroyedMonsters.push(monster);
            return null;
          }
          return { ...monster, currentHp: newHp, effectNegatedUntilEndOfTurn: true };
        }
        return monster;
      }));

      // 破壊されたモンスターを墓地に送る
      if (destroyedMonsters.length > 0) {
        setOpponentGraveyard(prev => [...prev, ...destroyedMonsters]);
        destroyedMonsters.forEach(m => addLog(`${m.name}は破壊された！`, 'damage'));
      }
    } else {
      addLog('場に闇属性モンスターがいないためダメージなし', 'info');
    }

    return true;
  },

  /**
   * C0000118: シャドウ・ドミニオン
   * 手札からカード1枚と追加で闇属性カードを任意の枚数捨てる。
   * 追加で捨てたカード1枚につき1体、禁忌カード以外の相手の場にいるモンスターのコントロールをターン終了時まで奪う。
   * その後、奪ったモンスター1体につき、自分のライフを1000減らす。
   */
  C0000118: (skillText, context) => {
    const { addLog, setPendingHandSelection } = context;
    const { myHand, setMyHand, myField, setMyField, opponentField, setOpponentField, setMyLife, setMyGraveyard, currentPlayer } = getPlayerContext(context);

    if (myHand.length === 0) {
      addLog('手札がありません', 'info');
      return false;
    }

    // 簡易実装: 手札の闇属性カードを全て捨てて、その数だけモンスターを奪う
    // 複雑なUI選択が必要なため、自動選択で実装

    // 手札から闘属性カードを検索
    const darkCards = myHand.filter(c => c.attribute === '闇');
    const nonDarkCards = myHand.filter(c => c.attribute !== '闇');

    if (nonDarkCards.length === 0 && darkCards.length === 0) {
      addLog('手札がありません', 'info');
      return false;
    }

    // 最低1枚は捨てる必要がある
    let discardCount = 0;
    const discardedCards = [];

    // 非闇属性カードから1枚捨てる（なければ闇属性）
    if (nonDarkCards.length > 0) {
      discardedCards.push(nonDarkCards[0]);
      discardCount = 0; // 追加で捨てたカードは0
    } else if (darkCards.length > 0) {
      discardedCards.push(darkCards[0]);
      discardCount = 0;
    }

    // 追加で闇属性カードを捨てる（コントロール奪取対象数を決定）
    const remainingDarkCards = darkCards.filter(c => !discardedCards.includes(c));

    // 相手フィールドの奪える対象
    const stealableMonsters = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster && !monster.forbidden);

    // 奪えるモンスターの数と捨てられる闇属性カードの数の少ない方
    const maxSteal = Math.min(stealableMonsters.length, remainingDarkCards.length);

    // 空きスロットの確認
    const emptySlots = myField.map((m, idx) => m === null ? idx : -1).filter(idx => idx !== -1);
    const actualSteal = Math.min(maxSteal, emptySlots.length);

    // 追加で闇属性カードを捨てる
    for (let i = 0; i < actualSteal; i++) {
      discardedCards.push(remainingDarkCards[i]);
      discardCount++;
    }

    // 手札からカードを捨てる
    setMyHand(prev => prev.filter(c => !discardedCards.some(d => d.uniqueId === c.uniqueId)));
    setMyGraveyard(prev => [...prev, ...discardedCards]);
    addLog(`シャドウ・ドミニオン: ${discardedCards.map(c => c.name).join('、')}を捨てた`, 'info');

    if (actualSteal === 0) {
      addLog('コントロールを奪えるモンスターがいないか、空きスロットがありません', 'info');
      return true;
    }

    // コントロールを奪う
    let totalLifeLoss = 0;
    for (let i = 0; i < actualSteal; i++) {
      const { monster, index } = stealableMonsters[i];
      const emptySlot = emptySlots[i];

      // 相手の場から削除
      setOpponentField(prev => {
        const newField = [...prev];
        newField[index] = null;
        return newField;
      });

      // 自分の場に追加（ターン終了時に返す）
      setMyField(prev => {
        const newField = [...prev];
        newField[emptySlot] = {
          ...monster,
          owner: currentPlayer,
          canAttack: true,
          returnToOpponentAtEndOfTurn: true,
        };
        return newField;
      });

      addLog(`${monster.name}のコントロールを奪った！（ターン終了時まで）`, 'info');
      totalLifeLoss += 1000;
    }

    // ライフ減少
    if (totalLifeLoss > 0) {
      setMyLife(prev => prev - totalLifeLoss);
      addLog(`コントロール奪取の代償: ライフを${totalLifeLoss}支払った`, 'damage');
    }

    return true;
  },

  /**
   * C0000119: 闇の宣告
   * 相手の手札を全て公開し、その中から1枚を選んで墓地に送る。
   * このターン、自分の闇属性モンスターの攻撃力を400アップ。
   */
  C0000119: (skillText, context) => {
    const { addLog, setPendingHandSelection } = context;
    const { myField, setMyField, opponentHand, setOpponentHand, setOpponentGraveyard } = getPlayerContext(context);

    // 相手の手札を公開
    if (opponentHand.length === 0) {
      addLog('相手の手札がありません', 'info');
    } else {
      addLog(`闇の宣告: 相手の手札を公開！ ${opponentHand.map(c => c.name).join('、')}`, 'info');

      // ランダムに1枚選んで墓地に送る（簡易実装）
      // 本来は選択UIが必要だが、自動選択で実装
      const randomIndex = Math.floor(Math.random() * opponentHand.length);
      const discardedCard = opponentHand[randomIndex];

      setOpponentHand(prev => prev.filter((_, idx) => idx !== randomIndex));
      setOpponentGraveyard(prev => [...prev, discardedCard]);
      addLog(`${discardedCard.name}を墓地に送った！`, 'damage');
    }

    // 自分の闇属性モンスターの攻撃力を400アップ
    let buffedCount = 0;
    setMyField(prev => prev.map(monster => {
      if (monster && monster.attribute === '闇') {
        buffedCount++;
        const newAttack = (monster.currentAttack || monster.attack) + 400;
        return { ...monster, currentAttack: newAttack };
      }
      return monster;
    }));

    if (buffedCount > 0) {
      addLog(`自分の闇属性モンスター${buffedCount}体の攻撃力が400アップ！`, 'info');
    }

    return true;
  },

  // 他の闇属性カードを追加...
};
