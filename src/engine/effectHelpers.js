// ========================================
// 効果ヘルパー関数
// カード固有処理で使用する共通処理
// ========================================

import { statusEffectEngine, getStatusDisplayName } from './statusEffects';
import { TRIGGER_TYPES } from './triggerTypes';
import {
  fireTrigger,
  unregisterCardTriggers,
  fireLeaveFieldTrigger,
} from './triggerEngine';
import { continuousEffectEngine } from './continuousEffects';

// ========================================
// プレイヤーコンテキスト抽象化
// currentPlayer判定を一元化し、「自分/相手」で扱えるようにする
// ========================================

/**
 * currentPlayerに基づいて「自分/相手」に抽象化したプロパティを返す
 * @param {Object} context - ゲームコンテキスト
 * @returns {Object} プレイヤー抽象化されたプロパティ
 *
 * @example
 * // Before（旧パターン）:
 * const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field } = context;
 * const myField = currentPlayer === 1 ? p1Field : p2Field;
 * const opponentField = currentPlayer === 1 ? p2Field : p1Field;
 *
 * // After（新パターン）:
 * const { myField, opponentField, setMyField } = getPlayerContext(context);
 */
export const getPlayerContext = (context) => {
  const { currentPlayer } = context;
  const isP1 = currentPlayer === 1;

  return {
    // === フィールド ===
    myField: isP1 ? context.p1Field : context.p2Field,
    opponentField: isP1 ? context.p2Field : context.p1Field,
    setMyField: isP1 ? context.setP1Field : context.setP2Field,
    setOpponentField: isP1 ? context.setP2Field : context.setP1Field,

    // === 手札 ===
    myHand: isP1 ? context.p1Hand : context.p2Hand,
    opponentHand: isP1 ? context.p2Hand : context.p1Hand,
    setMyHand: isP1 ? context.setP1Hand : context.setP2Hand,
    setOpponentHand: isP1 ? context.setP2Hand : context.setP1Hand,

    // === デッキ ===
    myDeck: isP1 ? context.p1Deck : context.p2Deck,
    opponentDeck: isP1 ? context.p2Deck : context.p1Deck,
    setMyDeck: isP1 ? context.setP1Deck : context.setP2Deck,
    setOpponentDeck: isP1 ? context.setP2Deck : context.setP1Deck,

    // === 墓地 ===
    myGraveyard: isP1 ? context.p1Graveyard : context.p2Graveyard,
    opponentGraveyard: isP1 ? context.p2Graveyard : context.p1Graveyard,
    setMyGraveyard: isP1 ? context.setP1Graveyard : context.setP2Graveyard,
    setOpponentGraveyard: isP1 ? context.setP2Graveyard : context.setP1Graveyard,

    // === ライフ ===
    myLife: isP1 ? context.p1Life : context.p2Life,
    opponentLife: isP1 ? context.p2Life : context.p1Life,
    setMyLife: isP1 ? context.setP1Life : context.setP2Life,
    setOpponentLife: isP1 ? context.setP2Life : context.setP1Life,

    // === SP（アクティブ） ===
    myActiveSP: isP1 ? context.p1ActiveSP : context.p2ActiveSP,
    opponentActiveSP: isP1 ? context.p2ActiveSP : context.p1ActiveSP,
    setMyActiveSP: isP1 ? context.setP1ActiveSP : context.setP2ActiveSP,
    setOpponentActiveSP: isP1 ? context.setP2ActiveSP : context.setP1ActiveSP,

    // === SP（レスト） ===
    myRestedSP: isP1 ? context.p1RestedSP : context.p2RestedSP,
    opponentRestedSP: isP1 ? context.p2RestedSP : context.p1RestedSP,
    setMyRestedSP: isP1 ? context.setP1RestedSP : context.setP2RestedSP,
    setOpponentRestedSP: isP1 ? context.setP2RestedSP : context.setP1RestedSP,

    // === フィールドカード ===
    myFieldCard: isP1 ? context.p1FieldCard : context.p2FieldCard,
    opponentFieldCard: isP1 ? context.p2FieldCard : context.p1FieldCard,
    setMyFieldCard: isP1 ? context.setP1FieldCard : context.setP2FieldCard,
    setOpponentFieldCard: isP1 ? context.setP2FieldCard : context.setP1FieldCard,

    // === フェイズカード ===
    myPhaseCard: isP1 ? context.p1PhaseCard : context.p2PhaseCard,
    opponentPhaseCard: isP1 ? context.p2PhaseCard : context.p1PhaseCard,
    setMyPhaseCard: isP1 ? context.setP1PhaseCard : context.setP2PhaseCard,
    setOpponentPhaseCard: isP1 ? context.setP2PhaseCard : context.setP1PhaseCard,

    // === ユーティリティ ===
    isP1,                 // currentPlayer === 1
    currentPlayer,        // 元の値（1 or 2）
  };
};

// ========================================
// カード効果ヘルパー関数
// ========================================

/**
 * デッキの上からカードを墓地に送る（ミル）
 * @param {Object} context - ゲームコンテキスト
 * @param {number} count - 枚数
 * @returns {Array} 墓地に送ったカード配列
 */
export const millDeck = (context, count = 1) => {
  const {
    currentPlayer,
    p1Deck, p2Deck,
    setP1Deck, setP2Deck,
    setP1Graveyard, setP2Graveyard,
    addLog,
  } = context;

  const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
  const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
  const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

  if (currentDeck.length < count) {
    addLog(`デッキが足りません（残り${currentDeck.length}枚）`, 'info');
    return [];
  }

  const milledCards = currentDeck.slice(0, count);
  setDeck(prev => prev.slice(count));
  setGraveyard(prev => [...prev, ...milledCards]);

  milledCards.forEach(card => {
    addLog(`デッキから「${card.name}」を墓地に送った`, 'info');
  });

  return milledCards;
};

/**
 * 相手のデッキの上からカードを墓地に送る
 * @param {Object} context - ゲームコンテキスト
 * @param {number} count - 枚数
 * @returns {Array} 墓地に送ったカード配列
 */
export const millOpponentDeck = (context, count = 1) => {
  const {
    currentPlayer,
    p1Deck, p2Deck,
    setP1Deck, setP2Deck,
    setP1Graveyard, setP2Graveyard,
    addLog,
  } = context;

  const opponentDeck = currentPlayer === 1 ? p2Deck : p1Deck;
  const setOpponentDeck = currentPlayer === 1 ? setP2Deck : setP1Deck;
  const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

  if (opponentDeck.length < count) {
    addLog(`相手のデッキが足りません（残り${opponentDeck.length}枚）`, 'info');
    return [];
  }

  const milledCards = opponentDeck.slice(0, count);
  setOpponentDeck(prev => prev.slice(count));
  setOpponentGraveyard(prev => [...prev, ...milledCards]);

  milledCards.forEach(card => {
    addLog(`相手のデッキから「${card.name}」を墓地に送った`, 'info');
  });

  return milledCards;
};

/**
 * 属性をチェック
 * @param {Object} card - カードオブジェクト
 * @param {string} attribute - チェックする属性
 * @returns {boolean}
 */
export const checkAttribute = (card, attribute) => {
  return card.attribute === attribute;
};

/**
 * モンスター破壊処理（トリガー発火、登録解除、墓地送り）
 * @param {Object} context - ゲームコンテキスト
 * @param {Object} monster - 破壊されるモンスター
 * @param {number} slotIndex - フィールド上のスロットインデックス
 * @param {number} ownerPlayer - モンスターのオーナー (1 or 2)
 */
const handleMonsterDestruction = (context, monster, slotIndex, ownerPlayer) => {
  const {
    setP1Life, setP2Life,
    setP1Field, setP2Field,
    setP1Hand, setP2Hand,
    setP1Deck, setP2Deck,
    setP1Graveyard, setP2Graveyard,
    p1Field, p2Field,
    p1Hand, p2Hand,
    p1Deck, p2Deck,
    p1Graveyard, p2Graveyard,
    p1Life, p2Life,
    addLog,
  } = context;

  // 破壊時トリガーを発火（破壊される前）
  const destroyContext = {
    currentPlayer: ownerPlayer,
    destroyedCard: monster,
    destroyedSlotIndex: slotIndex,
    setP1Life,
    setP2Life,
    setP1Field,
    setP2Field,
    setP1Hand,
    setP2Hand,
    setP1Deck,
    setP2Deck,
    setP1Graveyard,
    setP2Graveyard,
    p1Field,
    p2Field,
    p1Hand,
    p2Hand,
    p1Deck,
    p2Deck,
    p1Graveyard,
    p2Graveyard,
    p1Life,
    p2Life,
    addLog,
  };

  fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);
  fireLeaveFieldTrigger(monster, destroyContext, 'destroy');

  // トリガー登録を解除
  unregisterCardTriggers(monster.uniqueId);
  // 常時効果を解除
  continuousEffectEngine.unregister(monster.uniqueId);

  // フィールドから除去して墓地に送る
  const setField = ownerPlayer === 1 ? setP1Field : setP2Field;
  const setGraveyard = ownerPlayer === 1 ? setP1Graveyard : setP2Graveyard;

  setField(prev => {
    const newField = [...prev];
    newField[slotIndex] = null;
    return newField;
  });
  setGraveyard(prev => [...prev, monster]);
  addLog(`${monster.name}は破壊された！`, 'damage');

  // 寄生状態異常があれば寄生カードを寄生者の墓地に送る
  const parasiteInfo = statusEffectEngine.getParasiteInfo(monster);
  if (parasiteInfo) {
    const setParasiteGraveyard = parasiteInfo.parasiteOwner === 1 ? setP1Graveyard : setP2Graveyard;
    setParasiteGraveyard(prev => [...prev, parasiteInfo.parasiteCard]);
    addLog(`${parasiteInfo.parasiteCard.name}も墓地に送られた`, 'info');
  }
};

/**
 * 条件付きダメージ
 * @param {Object} context - ゲームコンテキスト
 * @param {number} damage - ダメージ量
 * @param {string} target - 'opponent', 'self', 'opponent_monster', 'self_monster'
 * @param {number} targetIndex - モンスターのインデックス（オプション）
 * @returns {boolean} 成功したかどうか
 */
export const conditionalDamage = (context, damage, target, targetIndex = null) => {
  const {
    currentPlayer,
    setP1Life, setP2Life,
    setP1Field, setP2Field,
    p1Field, p2Field,
    monsterIndex,
    addLog,
  } = context;

  switch (target) {
    case 'opponent':
      if (currentPlayer === 1) {
        setP2Life(prev => Math.max(0, prev - damage));
      } else {
        setP1Life(prev => Math.max(0, prev - damage));
      }
      addLog(`相手に${damage}ダメージ！`, 'damage');
      return true;

    case 'self':
      if (currentPlayer === 1) {
        setP1Life(prev => Math.max(0, prev - damage));
      } else {
        setP2Life(prev => Math.max(0, prev - damage));
      }
      addLog(`自分に${damage}ダメージ`, 'damage');
      return true;

    case 'self_monster': {
      const selfField = currentPlayer === 1 ? p1Field : p2Field;
      const setSelfField = currentPlayer === 1 ? setP1Field : setP2Field;
      const selfIndex = targetIndex !== null ? targetIndex : monsterIndex;

      if (selfIndex === null || selfIndex === undefined) {
        addLog('対象のモンスターが指定されていません', 'info');
        return false;
      }

      const targetMonster = selfField[selfIndex];
      if (!targetMonster) {
        addLog('対象のモンスターが存在しません', 'info');
        return false;
      }

      let newHp = Math.max(0, targetMonster.currentHp - damage);

      // 破壊耐性チェック: HP0になる場合はHP1で止まる
      if (targetMonster.indestructibleUntilEndOfTurn && newHp <= 0) {
        newHp = 1;
        addLog(`${targetMonster.name}に${damage}ダメージ！しかし破壊されない！（HP: ${newHp}）`, 'damage');
        setSelfField(prev => prev.map((m, idx) => {
          if (idx === selfIndex && m) {
            return { ...m, currentHp: newHp };
          }
          return m;
        }));
        return true;
      }

      addLog(`${targetMonster.name}に${damage}ダメージ（残りHP: ${newHp}）`, 'damage');

      if (newHp <= 0) {
        // HP 0 以下なら破壊処理
        handleMonsterDestruction(context, targetMonster, selfIndex, currentPlayer);
      } else {
        // HP が残っているなら更新のみ
        setSelfField(prev => prev.map((m, idx) => {
          if (idx === selfIndex && m) {
            return { ...m, currentHp: newHp };
          }
          return m;
        }));
      }
      return true;
    }

    case 'opponent_monster': {
      const opponentPlayer = currentPlayer === 1 ? 2 : 1;
      const opponentField = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

      // targetIndex がスロットインデックスかモンスターインデックスかを判断
      // targetIndex が null の場合は最初のモンスターを対象
      let targetMonster = null;
      let slotIndex = null;

      if (targetIndex !== null) {
        // targetIndex をスロットインデックスとして扱う
        if (opponentField[targetIndex]) {
          targetMonster = opponentField[targetIndex];
          slotIndex = targetIndex;
        } else {
          // スロットが空の場合、モンスターインデックスとして扱う
          const monsters = opponentField.map((m, idx) => m ? { monster: m, idx } : null).filter(x => x);
          if (targetIndex < monsters.length) {
            targetMonster = monsters[targetIndex].monster;
            slotIndex = monsters[targetIndex].idx;
          }
        }
      } else {
        // 最初のモンスターを対象
        for (let i = 0; i < opponentField.length; i++) {
          if (opponentField[i]) {
            targetMonster = opponentField[i];
            slotIndex = i;
            break;
          }
        }
      }

      if (!targetMonster) {
        addLog('対象のモンスターがいません', 'info');
        return false;
      }

      let newHp = Math.max(0, targetMonster.currentHp - damage);

      // 破壊耐性チェック: HP0になる場合はHP1で止まる
      if (targetMonster.indestructibleUntilEndOfTurn && newHp <= 0) {
        newHp = 1;
        addLog(`${targetMonster.name}に${damage}ダメージ！しかし破壊されない！（HP: ${newHp}）`, 'damage');
        setOpponentField(prev => prev.map((m, idx) => {
          if (idx === slotIndex && m) {
            return { ...m, currentHp: newHp };
          }
          return m;
        }));
        return true;
      }

      addLog(`${targetMonster.name}に${damage}ダメージ（残りHP: ${newHp}）`, 'damage');

      if (newHp <= 0) {
        // HP 0 以下なら破壊処理
        handleMonsterDestruction(context, targetMonster, slotIndex, opponentPlayer);
      } else {
        // HP が残っているなら更新のみ
        setOpponentField(prev => prev.map((m, idx) => {
          if (idx === slotIndex && m) {
            return { ...m, currentHp: newHp };
          }
          return m;
        }));
      }
      return true;
    }

    default:
      addLog('不明な対象です', 'info');
      return false;
  }
};

/**
 * デッキからカードをサーチ
 * @param {Object} context - ゲームコンテキスト
 * @param {Function} condition - 条件関数 (card) => boolean
 * @returns {Object|null} 見つかったカード
 */
export const searchCard = (context, condition) => {
  const {
    currentPlayer,
    p1Deck, p2Deck,
    setP1Deck, setP2Deck,
    setP1Hand, setP2Hand,
    addLog,
  } = context;

  const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
  const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
  const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

  const foundCard = currentDeck.find(condition);

  if (foundCard) {
    setDeck(prev => prev.filter(c => c.uniqueId !== foundCard.uniqueId));
    setHand(prev => [...prev, foundCard]);
    addLog(`デッキから「${foundCard.name}」を手札に加えた`, 'info');
    return foundCard;
  } else {
    addLog('条件に合うカードが見つかりません', 'info');
    return null;
  }
};

/**
 * 墓地からカードを蘇生
 * @param {Object} context - ゲームコンテキスト
 * @param {Function} condition - 条件関数 (card) => boolean
 * @param {boolean|Object} options - 蘇生オプション
 *   - boolean: true = 攻撃力半減（後方互換性）
 *   - Object: {
 *       attackHalf: boolean,   // 攻撃力を半減するか
 *       hpHalf: boolean,       // HPを半減するか
 *       fixedAttack: number,   // 固定攻撃力（指定時は半減より優先）
 *       fixedHp: number,       // 固定HP（指定時は半減より優先）
 *       indestructible: boolean, // ターン終了時まで破壊されない
 *     }
 * @returns {boolean} 成功したかどうか
 */
export const reviveFromGraveyard = (context, condition, options = false) => {
  const {
    currentPlayer,
    p1Graveyard, p2Graveyard,
    setP1Graveyard, setP2Graveyard,
    p1Field, p2Field,
    setP1Field, setP2Field,
    addLog,
  } = context;

  // オプションを正規化（後方互換性: booleanの場合は攻撃力半減として扱う）
  const normalizedOptions = typeof options === 'boolean'
    ? { attackHalf: options, hpHalf: false, indestructible: false }
    : { attackHalf: false, hpHalf: false, indestructible: false, ...options };

  const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
  const setCurrentGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
  const currentField = currentPlayer === 1 ? p1Field : p2Field;
  const setCurrentField = currentPlayer === 1 ? setP1Field : setP2Field;

  // 墓地から蘇生対象を検索
  const reviveCard = currentGraveyard.find(card => {
    return card.type === 'monster' && condition(card);
  });

  if (!reviveCard) {
    addLog('墓地に条件に合うモンスターが見つかりません', 'info');
    return false;
  }

  // 空きスロットを探す
  const emptySlotIndex = currentField.findIndex(slot => slot === null);
  if (emptySlotIndex === -1) {
    addLog('場が満杯で蘇生できません', 'info');
    return false;
  }

  // 蘇生（オプションに応じてステータス調整）
  setCurrentGraveyard(prev => prev.filter(c => c.uniqueId !== reviveCard.uniqueId));
  setCurrentField(prev => {
    const newField = [...prev];
    // 元のステータスを取得（墓地にある時点では元の値を保持）
    const originalAttack = reviveCard.attack;
    const originalHp = reviveCard.hp;

    // 攻撃力計算: 固定値 > 半減 > 元の値
    let finalAttack = originalAttack;
    if (normalizedOptions.fixedAttack !== undefined && normalizedOptions.fixedAttack !== null) {
      finalAttack = normalizedOptions.fixedAttack;
    } else if (normalizedOptions.attackHalf) {
      finalAttack = Math.floor(originalAttack / 2);
    }

    // HP計算: 固定値 > 半減 > 元の値
    let finalHp = originalHp;
    if (normalizedOptions.fixedHp !== undefined && normalizedOptions.fixedHp !== null) {
      finalHp = normalizedOptions.fixedHp;
    } else if (normalizedOptions.hpHalf) {
      finalHp = Math.floor(originalHp / 2);
    }

    const revivedMonster = {
      ...reviveCard,
      attack: finalAttack,
      currentAttack: finalAttack, // 戦闘計算用の現在攻撃力
      hp: finalHp,
      currentHp: finalHp,
      canAttack: false,
      owner: currentPlayer, // 常時効果のターゲット判定用
      charges: [], // チャージカードをリセット
      statusEffects: [], // 状態異常をリセット
      usedSkillThisTurn: false, // 技発動フラグをリセット
      ...(normalizedOptions.indestructible && { indestructibleUntilEndOfTurn: true }),
    };
    newField[emptySlotIndex] = revivedMonster;
    return newField;
  });

  // ログメッセージ生成
  const modifiers = [];
  if (normalizedOptions.fixedAttack !== undefined && normalizedOptions.fixedAttack !== null) {
    modifiers.push(`攻撃力${normalizedOptions.fixedAttack}`);
  } else if (normalizedOptions.attackHalf) {
    modifiers.push('攻撃力半減');
  }
  if (normalizedOptions.fixedHp !== undefined && normalizedOptions.fixedHp !== null) {
    modifiers.push(`HP${normalizedOptions.fixedHp}`);
  } else if (normalizedOptions.hpHalf) {
    modifiers.push('HP半減');
  }
  if (normalizedOptions.indestructible) {
    modifiers.push('ターン終了時まで破壊されない');
  }
  const modifierText = modifiers.length > 0 ? `（${modifiers.join('、')}）` : '';
  addLog(`${reviveCard.name}を墓地から蘇生！${modifierText}`, 'heal');
  return true;
};

/**
 * モンスターを破壊
 * @param {Object} context - ゲームコンテキスト
 * @param {number} targetIndex - 対象のモンスターインデックス（opponent_monster用）
 * @param {boolean} isOpponent - 相手のモンスターか
 * @returns {boolean} 成功したかどうか
 */
export const destroyMonster = (context, targetIndex, isOpponent = true) => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    setP1Graveyard, setP2Graveyard,
    addLog,
  } = context;

  const targetField = isOpponent ? (currentPlayer === 1 ? p2Field : p1Field) : (currentPlayer === 1 ? p1Field : p2Field);
  const setTargetField = isOpponent ? (currentPlayer === 1 ? setP2Field : setP1Field) : (currentPlayer === 1 ? setP1Field : setP2Field);
  const setTargetGraveyard = isOpponent ? (currentPlayer === 1 ? setP2Graveyard : setP1Graveyard) : (currentPlayer === 1 ? setP1Graveyard : setP2Graveyard);

  const monsters = targetField.filter(m => m !== null);

  if (monsters.length === 0) {
    addLog('破壊する対象がいません', 'info');
    return false;
  }

  const targetMonster = targetIndex !== null && targetIndex < monsters.length ? monsters[targetIndex] : monsters[0];

  // 破壊耐性チェック
  if (targetMonster.indestructibleUntilEndOfTurn) {
    addLog(`${targetMonster.name}は破壊されない！`, 'info');
    return false;
  }

  setTargetField(prev => prev.map(m => {
    if (m && m.uniqueId === targetMonster.uniqueId) {
      return null;
    }
    return m;
  }));
  setTargetGraveyard(prev => [...prev, targetMonster]);
  addLog(`${targetMonster.name}を破壊！`, 'damage');
  return true;
};

/**
 * カードをドロー
 * @param {Object} context - ゲームコンテキスト
 * @param {number} count - ドロー枚数
 * @returns {Array} ドローしたカード配列
 */
export const drawCards = (context, count = 1) => {
  const {
    currentPlayer,
    p1Deck, p2Deck,
    setP1Deck, setP2Deck,
    setP1Hand, setP2Hand,
    addLog,
  } = context;

  const deck = currentPlayer === 1 ? p1Deck : p2Deck;
  const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
  const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

  if (deck.length < count) {
    addLog(`デッキが足りません（残り${deck.length}枚）`, 'info');
    return [];
  }

  const drawnCards = deck.slice(0, count);
  setDeck(prev => prev.slice(count));
  setHand(prev => [...prev, ...drawnCards]);
  addLog(`${count}枚ドロー！`, 'info');
  return drawnCards;
};

/**
 * ライフを回復
 * @param {Object} context - ゲームコンテキスト
 * @param {number} amount - 回復量
 * @param {boolean} isSelf - 自分か相手か
 * @returns {boolean} 成功したかどうか
 */
export const healLife = (context, amount, isSelf = true) => {
  const {
    currentPlayer,
    setP1Life,
    setP2Life,
    addLog,
  } = context;

  if (isSelf) {
    if (currentPlayer === 1) {
      setP1Life(prev => prev + amount);
    } else {
      setP2Life(prev => prev + amount);
    }
    addLog(`ライフを${amount}回復！`, 'heal');
  } else {
    if (currentPlayer === 1) {
      setP2Life(prev => prev + amount);
    } else {
      setP1Life(prev => prev + amount);
    }
    addLog(`相手のライフを${amount}回復`, 'heal');
  }
  return true;
};

/**
 * モンスターの攻撃力を変更
 * @param {Object} context - ゲームコンテキスト
 * @param {number} amount - 変更量（正の値でバフ、負の値でデバフ）
 * @param {number} targetIndex - 対象のモンスターインデックス
 * @param {boolean} isOpponent - 相手のモンスターか
 * @param {boolean} permanent - 永続か一時的か
 * @returns {boolean} 成功したかどうか
 */
export const modifyAttack = (context, amount, targetIndex = null, isOpponent = false, permanent = true) => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    monsterIndex,
    addLog,
  } = context;

  const targetField = isOpponent ? (currentPlayer === 1 ? p2Field : p1Field) : (currentPlayer === 1 ? p1Field : p2Field);
  const setTargetField = isOpponent ? (currentPlayer === 1 ? setP2Field : setP1Field) : (currentPlayer === 1 ? setP1Field : setP2Field);

  const useIndex = targetIndex !== null ? targetIndex : monsterIndex;

  if (useIndex === null || useIndex === undefined) {
    addLog('対象のモンスターが指定されていません', 'info');
    return false;
  }

  setTargetField(prev => prev.map((m, idx) => {
    if (idx === useIndex && m) {
      const baseAttack = m.attack;
      const currentAtk = m.currentAttack !== undefined ? m.currentAttack : m.attack;
      const newAttack = Math.max(0, baseAttack + amount);
      const newCurrentAttack = Math.max(0, currentAtk + amount);
      const actionText = amount > 0 ? 'アップ' : 'ダウン';
      addLog(`${m.name}の攻撃力が${Math.abs(amount)}${actionText}！（攻撃力: ${newCurrentAttack}）`, amount > 0 ? 'heal' : 'damage');
      return { ...m, attack: newAttack, currentAttack: newCurrentAttack };
    }
    return m;
  }));
  return true;
};

/**
 * モンスターのHPを変更
 * @param {Object} context - ゲームコンテキスト
 * @param {number} amount - 変更量（正の値で増加、負の値で減少）
 * @param {number} targetIndex - 対象のモンスターインデックス
 * @param {boolean} isOpponent - 相手のモンスターか
 * @returns {boolean} 成功したかどうか
 */
export const modifyHP = (context, amount, targetIndex = null, isOpponent = false) => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    monsterIndex,
    addLog,
  } = context;

  const targetField = isOpponent ? (currentPlayer === 1 ? p2Field : p1Field) : (currentPlayer === 1 ? p1Field : p2Field);
  const setTargetField = isOpponent ? (currentPlayer === 1 ? setP2Field : setP1Field) : (currentPlayer === 1 ? setP1Field : setP2Field);

  const useIndex = targetIndex !== null ? targetIndex : monsterIndex;

  if (useIndex === null || useIndex === undefined) {
    addLog('対象のモンスターが指定されていません', 'info');
    return false;
  }

  setTargetField(prev => prev.map((m, idx) => {
    if (idx === useIndex && m) {
      const newMaxHP = Math.max(1, m.hp + amount);
      const newCurrentHP = Math.max(0, m.currentHp + amount);
      const actionText = amount > 0 ? 'アップ' : 'ダウン';
      addLog(`${m.name}のHPが${Math.abs(amount)}${actionText}！（HP: ${newCurrentHP}/${newMaxHP}）`, amount > 0 ? 'heal' : 'damage');
      return {
        ...m,
        hp: newMaxHP,
        currentHp: newCurrentHP
      };
    }
    return m;
  }));
  return true;
};

/**
 * 墓地からカードを選択させる（モーダルUI表示）
 * @param {Object} context - ゲームコンテキスト
 * @param {string} message - 選択を促すメッセージ
 * @param {Function} filter - カードをフィルタリングする条件関数 (card) => boolean
 * @param {Function} callback - 選択完了時のコールバック (selectedCard) => void
 * @param {boolean} ownGraveyard - 自分の墓地か（デフォルトtrue、falseで相手の墓地）
 * @returns {boolean} 選択UIを開始したかどうか
 */
export const selectFromGraveyard = (context, message, filter, callback, ownGraveyard = true) => {
  const {
    currentPlayer,
    p1Graveyard, p2Graveyard,
    setPendingGraveyardSelection,
    setShowGraveyardViewer,
    addLog,
  } = context;

  // 墓地選択機能がコンテキストに含まれていない場合
  if (!setPendingGraveyardSelection || !setShowGraveyardViewer) {
    addLog('墓地選択機能が利用できません', 'info');
    return false;
  }

  const targetPlayer = ownGraveyard ? currentPlayer : (currentPlayer === 1 ? 2 : 1);
  const graveyard = targetPlayer === 1 ? p1Graveyard : p2Graveyard;

  // 条件を満たすカードがあるか確認
  const selectableCards = filter ? graveyard.filter(filter) : graveyard;
  if (selectableCards.length === 0) {
    addLog('選択可能なカードが墓地にありません', 'info');
    return false;
  }

  // 墓地選択UIを開始
  setPendingGraveyardSelection({
    message,
    filter,
    callback,
  });
  setShowGraveyardViewer({ player: targetPlayer });

  return true;
};

/**
 * 墓地からモンスターを蘇生（選択UI付き）
 * @param {Object} context - ゲームコンテキスト
 * @param {Function} filter - カードをフィルタリングする条件関数
 * @param {boolean} weakened - 弱体化状態で蘇生するか（攻撃力/HP半減）
 * @returns {boolean} 蘇生UIを開始したかどうか
 */
export const selectAndReviveFromGraveyard = (context, filter = null, weakened = false) => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    setP1Graveyard, setP2Graveyard,
    addLog,
  } = context;

  const field = currentPlayer === 1 ? p1Field : p2Field;
  const setField = currentPlayer === 1 ? setP1Field : setP2Field;
  const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

  // 空きスロットを確認
  const emptySlotIndex = field.findIndex(slot => slot === null);
  if (emptySlotIndex === -1) {
    addLog('フィールドに空きがありません', 'info');
    return false;
  }

  // モンスターカードのみ、かつ追加フィルター
  const monsterFilter = (card) => {
    if (card.type !== 'monster') return false;
    if (filter && !filter(card)) return false;
    return true;
  };

  return selectFromGraveyard(
    context,
    '蘇生するモンスターを選択してください',
    monsterFilter,
    (selectedCard) => {
      // 墓地から取り除く
      setGraveyard(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));

      // フィールドに配置
      const revivedMonster = {
        ...selectedCard,
        attack: weakened ? Math.floor(selectedCard.attack / 2) : selectedCard.attack,
        hp: weakened ? Math.floor(selectedCard.hp / 2) : selectedCard.hp,
        currentHp: weakened ? Math.floor(selectedCard.hp / 2) : selectedCard.hp,
        canAttack: false,
        charges: [],
        owner: currentPlayer, // 常時効果のターゲット判定用
      };

      setField(prev => {
        const newField = [...prev];
        const slot = newField.findIndex(s => s === null);
        if (slot !== -1) {
          newField[slot] = revivedMonster;
        }
        return newField;
      });

      const weakenedText = weakened ? '（弱体化状態）' : '';
      addLog(`墓地から「${selectedCard.name}」を蘇生！${weakenedText}`, 'info');
    },
    true // 自分の墓地
  );
};

/**
 * 墓地からカードを手札に回収（選択UI付き）
 * @param {Object} context - ゲームコンテキスト
 * @param {Function} filter - カードをフィルタリングする条件関数
 * @returns {boolean} 回収UIを開始したかどうか
 */
export const selectAndRecoverFromGraveyard = (context, filter = null) => {
  const {
    currentPlayer,
    setP1Hand, setP2Hand,
    setP1Graveyard, setP2Graveyard,
    addLog,
  } = context;

  const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
  const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

  return selectFromGraveyard(
    context,
    '手札に加えるカードを選択してください',
    filter,
    (selectedCard) => {
      // 墓地から取り除く
      setGraveyard(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));

      // 手札に加える
      setHand(prev => [...prev, selectedCard]);

      addLog(`墓地から「${selectedCard.name}」を手札に加えた`, 'info');
    },
    true // 自分の墓地
  );
};

// ========================================
// 状態異常関連ヘルパー
// ========================================

/**
 * 相手モンスター1体に状態異常を付与（選択UI）
 * @param {Object} context - ゲームコンテキスト
 * @param {string} statusType - 状態異常タイプ（STATUS_EFFECT_TYPES）
 * @param {Object} options - オプション（duration, removeChance, value等）
 * @param {string} sourceName - 発動源の名前（ログ用）
 * @returns {boolean} 成功したかどうか
 */
export const selectAndApplyStatusToOpponent = (context, statusType, options = {}, sourceName = '') => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    addLog,
  } = context;

  const opponentField = currentPlayer === 1 ? p2Field : p1Field;
  const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

  // 相手モンスターがいるスロットを取得
  const validTargets = opponentField
    .map((m, idx) => m ? idx : -1)
    .filter(idx => idx !== -1);

  if (validTargets.length === 0) {
    addLog('相手の場にモンスターがいません', 'info');
    return false;
  }

  // 1体しかいない場合は自動選択
  if (validTargets.length === 1) {
    const targetIdx = validTargets[0];
    setOpponentField(prev => prev.map((m, idx) => {
      if (idx === targetIdx && m) {
        const result = statusEffectEngine.applyStatus(m, statusType, {
          ...options,
          source: sourceName,
          sourceName: sourceName,
        });
        if (result.success) {
          addLog(`${m.name}を${getStatusDisplayName(statusType)}にした！`, 'damage');
        }
        return { ...m };
      }
      return m;
    }));
    return true;
  }

  // 複数いる場合は最初のモンスターを選択（TODO: 選択UI実装）
  // 現時点では最初の相手モンスターに付与
  const targetIdx = validTargets[0];
  setOpponentField(prev => prev.map((m, idx) => {
    if (idx === targetIdx && m) {
      const result = statusEffectEngine.applyStatus(m, statusType, {
        ...options,
        source: sourceName,
        sourceName: sourceName,
      });
      if (result.success) {
        addLog(`${m.name}を${getStatusDisplayName(statusType)}にした！`, 'damage');
      }
      return { ...m };
    }
    return m;
  }));
  return true;
};

/**
 * 指定したインデックスの相手モンスターに状態異常を付与
 * @param {Object} context - ゲームコンテキスト
 * @param {number} targetIndex - 対象のモンスターインデックス
 * @param {string} statusType - 状態異常タイプ
 * @param {Object} options - オプション
 * @param {string} sourceName - 発動源の名前
 * @returns {boolean} 成功したかどうか
 */
export const applyStatusToOpponentMonster = (context, targetIndex, statusType, options = {}, sourceName = '') => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    addLog,
  } = context;

  const opponentField = currentPlayer === 1 ? p2Field : p1Field;
  const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

  const target = opponentField[targetIndex];
  if (!target) {
    addLog('対象のモンスターが存在しません', 'info');
    return false;
  }

  setOpponentField(prev => prev.map((m, idx) => {
    if (idx === targetIndex && m) {
      const result = statusEffectEngine.applyStatus(m, statusType, {
        ...options,
        source: sourceName,
        sourceName: sourceName,
      });
      if (result.success) {
        addLog(`${m.name}を${getStatusDisplayName(statusType)}にした！`, 'damage');
      }
      return { ...m };
    }
    return m;
  }));
  return true;
};

/**
 * 相手の全モンスターに状態異常を付与
 * @param {Object} context - ゲームコンテキスト
 * @param {string} statusType - 状態異常タイプ
 * @param {Object} options - オプション
 * @param {string} sourceName - 発動源の名前
 * @returns {number} 付与したモンスター数
 */
export const applyStatusToAllOpponentMonsters = (context, statusType, options = {}, sourceName = '') => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    addLog,
  } = context;

  const opponentField = currentPlayer === 1 ? p2Field : p1Field;
  const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

  let count = 0;

  setOpponentField(prev => prev.map(m => {
    if (m) {
      const result = statusEffectEngine.applyStatus(m, statusType, {
        ...options,
        source: sourceName,
        sourceName: sourceName,
      });
      if (result.success) {
        count++;
        addLog(`${m.name}を${getStatusDisplayName(statusType)}にした！`, 'damage');
      }
      return { ...m };
    }
    return m;
  }));

  return count;
};

/**
 * 自分のモンスターに状態異常を付与
 * @param {Object} context - ゲームコンテキスト
 * @param {number} targetIndex - 対象のモンスターインデックス
 * @param {string} statusType - 状態異常タイプ
 * @param {Object} options - オプション
 * @param {string} sourceName - 発動源の名前
 * @returns {boolean} 成功したかどうか
 */
export const applyStatusToOwnMonster = (context, targetIndex, statusType, options = {}, sourceName = '') => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    addLog,
  } = context;

  const ownField = currentPlayer === 1 ? p1Field : p2Field;
  const setOwnField = currentPlayer === 1 ? setP1Field : setP2Field;

  const target = ownField[targetIndex];
  if (!target) {
    addLog('対象のモンスターが存在しません', 'info');
    return false;
  }

  setOwnField(prev => prev.map((m, idx) => {
    if (idx === targetIndex && m) {
      const result = statusEffectEngine.applyStatus(m, statusType, {
        ...options,
        source: sourceName,
        sourceName: sourceName,
      });
      if (result.success) {
        addLog(`${m.name}を${getStatusDisplayName(statusType)}にした！`, 'info');
      }
      return { ...m };
    }
    return m;
  }));
  return true;
};

/**
 * 相手フィールドの全モンスターに一時的な攻撃力ダウンを付与
 * エンドフェイズ回数で解除される（「次のターン終了時まで」= 2）
 * @param {Object} context - ゲームコンテキスト
 * @param {number} value - 攻撃力ダウン値（正の値で指定）
 * @param {number} endPhases - 何回のエンドフェイズ後に解除されるか（「次のターン終了時まで」= 2）
 * @param {string} sourceName - 発動源の名前
 * @returns {number} 付与に成功したモンスター数
 */
export const applyTemporaryAtkDownToAllOpponents = (context, value, endPhases, sourceName = '') => {
  const {
    currentPlayer,
    p1Field, p2Field,
    setP1Field, setP2Field,
    addLog,
  } = context;

  // ステータスタイプをインポート
  const { STATUS_EFFECT_TYPES } = require('./statusEffects');

  const opponentField = currentPlayer === 1 ? p2Field : p1Field;
  const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

  let count = 0;

  setOpponentField(prev => prev.map(m => {
    if (m) {
      const result = statusEffectEngine.applyStatus(m, STATUS_EFFECT_TYPES.ATK_DOWN, {
        value: value,
        expiresAfterEndPhases: endPhases,
        source: sourceName,
        sourceName: sourceName,
      });
      if (result.success) {
        count++;
        addLog(`${m.name}の攻撃力が${value}下がった！（${endPhases === 2 ? '次のターン終了時まで' : `${endPhases}エンドフェイズ後まで`}）`, 'info');
      }
      return { ...m };
    }
    return m;
  }));

  return count;
};

// ========================================
// 状態異常の一括処理（ターン開始・エンドフェイズ）
// ========================================

/**
 * 両プレイヤーのフィールドに対して状態異常のターン開始時処理を実行
 * - 確率解除判定（眠り、凍結など）
 * - 寄生のATK減少
 * @param {Object} context - ゲームコンテキスト
 */
export const processStatusEffectsTurnStart = (context) => {
  const {
    setP1Field, setP2Field,
    addLog,
  } = context;

  const processField = (setField) => {
    setField(prev => prev.map(m => {
      if (!m) return null;
      const result = statusEffectEngine.processTurnStart(m);

      // 状態異常解除をログ出力
      if (result.removedEffects.length > 0) {
        result.removedEffects.forEach(effect => {
          addLog(`${m.name}の${getStatusDisplayName(effect.type)}が解除された！`, 'info');
        });
      }

      // 寄生によるATK減少をログ出力
      if (result.parasiteAtkReduction > 0) {
        addLog(`${m.name}は寄生により攻撃力-${result.parasiteAtkReduction}！（${result.monster.currentAttack}）`, 'damage');
      }

      return result.monster;
    }));
  };

  processField(setP1Field);
  processField(setP2Field);
};

/**
 * 両プレイヤーのフィールドに対して状態異常のエンドフェイズ時処理を実行
 * - 寄生の効果無効解除（相手エンドフェイズで解除）
 * @param {Object} context - ゲームコンテキスト
 * @param {number} currentPlayer - 現在のターンプレイヤー
 */
export const processStatusEffectsEndPhase = (context, currentPlayer) => {
  const {
    setP1Field, setP2Field,
    addLog,
  } = context;

  const processField = (setField) => {
    setField(prev => prev.map(m => {
      if (!m) return m;
      const result = statusEffectEngine.processOpponentEndPhase(m, currentPlayer);

      // 寄生の効果無効解除をログ出力
      if (result.parasiteEffectNegationRemoved) {
        addLog(`${m.name}の効果無効化が解除された（寄生効果）`, 'info');
      }

      return result.monster;
    }));
  };

  processField(setP1Field);
  processField(setP2Field);
};
