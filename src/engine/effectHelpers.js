// ========================================
// 効果ヘルパー関数
// カード固有処理で使用する共通処理
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

    case 'self_monster':
      const selfField = currentPlayer === 1 ? p1Field : p2Field;
      const setSelfField = currentPlayer === 1 ? setP1Field : setP2Field;
      const selfIndex = targetIndex !== null ? targetIndex : monsterIndex;

      if (selfIndex === null || selfIndex === undefined) {
        addLog('対象のモンスターが指定されていません', 'info');
        return false;
      }

      setSelfField(prev => prev.map((m, idx) => {
        if (idx === selfIndex && m) {
          const newHp = Math.max(0, m.currentHp - damage);
          addLog(`${m.name}に${damage}ダメージ（残りHP: ${newHp}）`, 'damage');
          return { ...m, currentHp: newHp };
        }
        return m;
      }));
      return true;

    case 'opponent_monster':
      const opponentField = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
      const monsters = opponentField.filter(m => m !== null);

      if (monsters.length > 0) {
        const targetMonster = targetIndex !== null ? monsters[targetIndex] : monsters[0];
        setOpponentField(prev => prev.map(m => {
          if (m && m.uniqueId === targetMonster.uniqueId) {
            const newHp = Math.max(0, m.currentHp - damage);
            addLog(`${m.name}に${damage}ダメージ（残りHP: ${newHp}）`, 'damage');
            return { ...m, currentHp: newHp };
          }
          return m;
        }));
        return true;
      } else {
        addLog('対象のモンスターがいません', 'info');
        return false;
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
 * @param {boolean} weakened - 弱体化するか（攻撃力半減）
 * @returns {boolean} 成功したかどうか
 */
export const reviveFromGraveyard = (context, condition, weakened = false) => {
  const {
    currentPlayer,
    p1Graveyard, p2Graveyard,
    setP1Graveyard, setP2Graveyard,
    p1Field, p2Field,
    setP1Field, setP2Field,
    addLog,
  } = context;

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

  // 蘇生（弱体化オプション付き）
  setCurrentGraveyard(prev => prev.filter(c => c.uniqueId !== reviveCard.uniqueId));
  setCurrentField(prev => {
    const newField = [...prev];
    const revivedMonster = {
      ...reviveCard,
      attack: weakened ? Math.floor(reviveCard.attack / 2) : reviveCard.attack,
      hp: weakened ? Math.floor(reviveCard.hp / 2) : reviveCard.hp,
      currentHp: weakened ? Math.floor(reviveCard.hp / 2) : reviveCard.hp,
      canAttack: false,
    };
    newField[emptySlotIndex] = revivedMonster;
    return newField;
  });
  addLog(`${reviveCard.name}を墓地から蘇生！${weakened ? '（攻撃力半減）' : ''}`, 'heal');
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
      const newAttack = Math.max(0, m.attack + amount);
      const actionText = amount > 0 ? 'アップ' : 'ダウン';
      addLog(`${m.name}の攻撃力が${Math.abs(amount)}${actionText}！（攻撃力: ${newAttack}）`, amount > 0 ? 'heal' : 'damage');
      return { ...m, attack: newAttack };
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
