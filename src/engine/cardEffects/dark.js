// ========================================
// 闇属性カードの固有効果
// ========================================

import {
  millOpponentDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  modifyAttack,
} from '../effectHelpers';

/**
 * 闇属性カードの固有効果
 */
export const darkCardEffects = {
  /**
   * C0000078: 禁忌の傀儡師マレウス
   * 基本技：墓地の闇属性モンスター1体を自分の場に戻す（攻撃力300、HP800、効果無効）
   */
  C0000078: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Graveyard, p2Graveyard,
      setP1Graveyard, setP2Graveyard,
      p1Field, p2Field,
      setP1Field, setP2Field,
    } = context;

    if (context.skillType === 'basic') {
      const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;

      const darkMonster = currentGraveyard.find(card =>
        card.type === 'monster' && card.attribute === '闇'
      );

      if (!darkMonster) {
        addLog('墓地に闇属性モンスターがありません', 'info');
        return false;
      }

      const emptySlotIndex = currentField.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog('場が満杯です', 'info');
        return false;
      }

      // 墓地から蘇生（攻撃力300、HP800固定）
      setGraveyard(prev => prev.filter(c => c.uniqueId !== darkMonster.uniqueId));
      setField(prev => {
        const newField = [...prev];
        newField[emptySlotIndex] = {
          ...darkMonster,
          attack: 300,
          hp: 800,
          currentHp: 800,
          canAttack: false,
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
    const {
      addLog,
      currentPlayer,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const opponentHand = currentPlayer === 1 ? p2Hand : p1Hand;
      const setOpponentHand = currentPlayer === 1 ? setP2Hand : setP1Hand;
      const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

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
    const {
      addLog,
      currentPlayer,
      p1RestedSP, p2RestedSP,
      setP1ActiveSP, setP2ActiveSP,
      setP1RestedSP, setP2RestedSP,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;

      if (restedSP > 0) {
        if (currentPlayer === 1) {
          setP1ActiveSP(prev => prev + 1);
          setP1RestedSP(prev => prev - 1);
        } else {
          setP2ActiveSP(prev => prev + 1);
          setP2RestedSP(prev => prev - 1);
        }
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
    const {
      addLog,
      currentPlayer,
      p1Graveyard,
      p2Graveyard,
      setP1Graveyard,
      setP2Graveyard,
      setP1Hand,
      setP2Hand,
      setPendingGraveyardSelection,
    } = context;

    if (context.skillType === 'basic') {
      const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

      // 墓地から《黒呪》魔法カードを検索
      const blackCurseMagics = graveyard.filter(
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
            setGraveyard((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
            // 手札に追加
            setHand((prev) => [...prev, selectedCard]);
            addLog(`${selectedCard.name}を手札に戻した`, 'info');
          },
        });
        return true;
      }

      // 1枚だけの場合は自動選択
      const targetCard = blackCurseMagics[0];
      setGraveyard((prev) => prev.filter((c) => c.uniqueId !== targetCard.uniqueId));
      setHand((prev) => [...prev, targetCard]);
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
    const {
      addLog,
      currentPlayer,
      setP1Life,
      setP2Life,
      p1Field,
      p2Field,
      setP1Field,
      setP2Field,
      setP1Graveyard,
      setP2Graveyard,
      setPendingMonsterTarget,
    } = context;

    if (context.skillType === 'basic') {
      const setCurrentLife = currentPlayer === 1 ? setP1Life : setP2Life;
      const opponentField = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
      const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

      // 相手モンスターがいるか確認
      const opponentMonsters = opponentField
        .map((m, idx) => ({ monster: m, index: idx }))
        .filter(({ monster }) => monster !== null);

      if (opponentMonsters.length === 0) {
        addLog('相手フィールドにモンスターがいません', 'info');
        return false;
      }

      // ライフが足りるか確認（0以下にはなれるが、自滅するかどうかはゲームルール次第）
      // ライフコストとして600減らす
      setCurrentLife((prev) => prev - 600);
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
   * C0000393: 黒呪・カルヴェリオンの灰嵐
   * 相手フィールド全体に1500ダメージを与え、次のターン終了時まで相手モンスターの攻撃力を500下げる。
   * 場に《呪縛の塔・ヴェルナクール》がある場合、このカードのダメージを2000に変更。
   */
  C0000393: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field,
      p2Field,
      setP1Field,
      setP2Field,
      p1FieldCard,
      p2FieldCard,
      p1Graveyard,
      p2Graveyard,
      setP1Graveyard,
      setP2Graveyard,
    } = context;

    // ステータス効果エンジンをインポート
    const { statusEffectEngine, STATUS_EFFECT_TYPES } = require('../statusEffects');

    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
    const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;
    const myFieldCard = currentPlayer === 1 ? p1FieldCard : p2FieldCard;

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

  // 他の闇属性カードを追加...
};
