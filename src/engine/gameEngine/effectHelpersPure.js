/**
 * effectHelpersPure - 純粋関数版の効果ヘルパー
 *
 * GameEngine用の状態ベース実装。
 * React setterを使わず、新しい状態オブジェクトを返す。
 */

import {
  getPlayer,
  getOpponent,
  getCurrentPlayer,
  updatePlayer,
  addLog,
  getOpponentNumber,
} from './GameState';

// ========================================
// プレイヤーコンテキスト（状態ベース版）
// ========================================

/**
 * 状態から「自分/相手」に抽象化したプロパティを取得
 * @param {Object} state - GameState
 * @returns {Object} プレイヤー抽象化されたプロパティ
 */
export function getPlayerContextPure(state) {
  const currentPlayer = state.currentPlayer;
  const isP1 = currentPlayer === 1;

  return {
    myField: isP1 ? state.p1.field : state.p2.field,
    opponentField: isP1 ? state.p2.field : state.p1.field,
    myHand: isP1 ? state.p1.hand : state.p2.hand,
    opponentHand: isP1 ? state.p2.hand : state.p1.hand,
    myDeck: isP1 ? state.p1.deck : state.p2.deck,
    opponentDeck: isP1 ? state.p2.deck : state.p1.deck,
    myGraveyard: isP1 ? state.p1.graveyard : state.p2.graveyard,
    opponentGraveyard: isP1 ? state.p2.graveyard : state.p1.graveyard,
    myLife: isP1 ? state.p1.life : state.p2.life,
    opponentLife: isP1 ? state.p2.life : state.p1.life,
    myActiveSP: isP1 ? state.p1.activeSP : state.p2.activeSP,
    opponentActiveSP: isP1 ? state.p2.activeSP : state.p1.activeSP,
    isP1,
    currentPlayer,
    myPlayerKey: isP1 ? 'p1' : 'p2',
    opponentPlayerKey: isP1 ? 'p2' : 'p1',
  };
}

// ========================================
// デッキ操作
// ========================================

/**
 * デッキの上からカードを墓地に送る（ミル）
 * @param {Object} state - GameState
 * @param {number} count - 枚数
 * @param {boolean} isOpponent - 相手のデッキか
 * @returns {Object} { newState, milledCards }
 */
export function millDeckPure(state, count = 1, isOpponent = false) {
  const targetPlayer = isOpponent
    ? getOpponentNumber(state.currentPlayer)
    : state.currentPlayer;
  const player = getPlayer(state, targetPlayer);

  if (player.deck.length < count) {
    const newState = addLog(state, `デッキが足りません（残り${player.deck.length}枚）`, 'info');
    return { newState, milledCards: [] };
  }

  const milledCards = player.deck.slice(0, count);
  const newDeck = player.deck.slice(count);
  const newGraveyard = [...player.graveyard, ...milledCards];

  let newState = updatePlayer(state, targetPlayer, {
    deck: newDeck,
    graveyard: newGraveyard,
  });

  milledCards.forEach(card => {
    newState = addLog(newState, `デッキから「${card.name}」を墓地に送った`, 'info');
  });

  return { newState, milledCards };
}

// ========================================
// カードドロー
// ========================================

/**
 * カードをドロー
 * @param {Object} state - GameState
 * @param {number} count - 枚数
 * @param {number} [targetPlayer] - 対象プレイヤー（省略時は現在のプレイヤー）
 * @returns {Object} { newState, drawnCards }
 */
export function drawCardsPure(state, count = 1, targetPlayer = null) {
  const player = targetPlayer ?? state.currentPlayer;
  const playerData = getPlayer(state, player);

  const drawCount = Math.min(count, playerData.deck.length);
  if (drawCount === 0) {
    const newState = addLog(state, 'デッキが空です', 'info');
    return { newState, drawnCards: [] };
  }

  const drawnCards = playerData.deck.slice(0, drawCount);
  const newDeck = playerData.deck.slice(drawCount);
  const newHand = [...playerData.hand, ...drawnCards];

  let newState = updatePlayer(state, player, {
    deck: newDeck,
    hand: newHand,
  });

  const cardNames = drawnCards.map(c => c.name).join(', ');
  newState = addLog(newState, `${cardNames}をドロー`, 'info');

  return { newState, drawnCards };
}

// ========================================
// ダメージ・回復
// ========================================

/**
 * ダメージを与える
 * @param {Object} state - GameState
 * @param {number} damage - ダメージ量
 * @param {string} target - 'self' | 'opponent'
 * @returns {Object} newState
 */
export function dealDamagePure(state, damage, target = 'opponent') {
  const targetPlayer = target === 'self'
    ? state.currentPlayer
    : getOpponentNumber(state.currentPlayer);
  const player = getPlayer(state, targetPlayer);

  const newLife = Math.max(0, player.life - damage);

  let newState = updatePlayer(state, targetPlayer, { life: newLife });
  newState = addLog(newState, `P${targetPlayer}に${damage}ダメージ！`, 'damage');

  return newState;
}

/**
 * ライフを回復
 * @param {Object} state - GameState
 * @param {number} amount - 回復量
 * @param {string} target - 'self' | 'opponent'
 * @returns {Object} newState
 */
export function healLifePure(state, amount, target = 'self') {
  const targetPlayer = target === 'self'
    ? state.currentPlayer
    : getOpponentNumber(state.currentPlayer);
  const player = getPlayer(state, targetPlayer);

  const newLife = player.life + amount;

  let newState = updatePlayer(state, targetPlayer, { life: newLife });
  newState = addLog(newState, `P${targetPlayer}が${amount}回復！`, 'heal');

  return newState;
}

// ========================================
// モンスター操作
// ========================================

/**
 * モンスターの攻撃力を変更
 * @param {Object} state - GameState
 * @param {number} slotIndex - スロットインデックス
 * @param {number} amount - 変更量（正: バフ、負: デバフ）
 * @param {boolean} isOpponent - 相手のモンスターか
 * @returns {Object} newState
 */
export function modifyAttackPure(state, slotIndex, amount, isOpponent = false) {
  const targetPlayer = isOpponent
    ? getOpponentNumber(state.currentPlayer)
    : state.currentPlayer;
  const player = getPlayer(state, targetPlayer);
  const monster = player.field[slotIndex];

  if (!monster) return state;

  const newAttack = Math.max(0, (monster.currentAttack || monster.attack) + amount);
  const newField = [...player.field];
  newField[slotIndex] = {
    ...monster,
    currentAttack: newAttack,
  };

  let newState = updatePlayer(state, targetPlayer, { field: newField });
  const changeText = amount >= 0 ? `+${amount}` : `${amount}`;
  newState = addLog(newState, `${monster.name}の攻撃力${changeText}`, 'info');

  return newState;
}

/**
 * モンスターのHPを変更
 * @param {Object} state - GameState
 * @param {number} slotIndex - スロットインデックス
 * @param {number} amount - 変更量
 * @param {boolean} isOpponent - 相手のモンスターか
 * @returns {Object} newState
 */
export function modifyHPPure(state, slotIndex, amount, isOpponent = false) {
  const targetPlayer = isOpponent
    ? getOpponentNumber(state.currentPlayer)
    : state.currentPlayer;
  const player = getPlayer(state, targetPlayer);
  const monster = player.field[slotIndex];

  if (!monster) return state;

  const newHP = Math.max(1, (monster.currentHp || monster.hp) + amount);
  const newField = [...player.field];
  newField[slotIndex] = {
    ...monster,
    currentHp: newHP,
    hp: monster.hp + amount, // 最大HPも変更
  };

  let newState = updatePlayer(state, targetPlayer, { field: newField });
  const changeText = amount >= 0 ? `+${amount}` : `${amount}`;
  newState = addLog(newState, `${monster.name}のHP${changeText}`, 'info');

  return newState;
}

/**
 * モンスターを破壊
 * @param {Object} state - GameState
 * @param {number} slotIndex - スロットインデックス
 * @param {boolean} isOpponent - 相手のモンスターか
 * @returns {Object} newState
 */
export function destroyMonsterPure(state, slotIndex, isOpponent = false) {
  const targetPlayer = isOpponent
    ? getOpponentNumber(state.currentPlayer)
    : state.currentPlayer;
  const player = getPlayer(state, targetPlayer);
  const monster = player.field[slotIndex];

  if (!monster) return state;

  const newField = [...player.field];
  newField[slotIndex] = null;
  const newGraveyard = [...player.graveyard, monster];

  let newState = updatePlayer(state, targetPlayer, {
    field: newField,
    graveyard: newGraveyard,
  });

  newState = addLog(newState, `${monster.name}が破壊された！`, 'damage');

  return newState;
}

// ========================================
// カード検索
// ========================================

/**
 * デッキからカードを検索して手札に加える
 * @param {Object} state - GameState
 * @param {Function} condition - 検索条件関数 (card) => boolean
 * @returns {Object} { newState, foundCard }
 */
export function searchCardPure(state, condition) {
  const player = getCurrentPlayer(state);
  const foundIndex = player.deck.findIndex(condition);

  if (foundIndex === -1) {
    const newState = addLog(state, '条件に合うカードが見つかりませんでした', 'info');
    return { newState, foundCard: null };
  }

  const foundCard = player.deck[foundIndex];
  const newDeck = [...player.deck];
  newDeck.splice(foundIndex, 1);
  const newHand = [...player.hand, foundCard];

  let newState = updatePlayer(state, state.currentPlayer, {
    deck: newDeck,
    hand: newHand,
  });

  newState = addLog(newState, `デッキから「${foundCard.name}」を手札に加えた`, 'info');

  return { newState, foundCard };
}

// ========================================
// 蘇生
// ========================================

/**
 * 墓地からモンスターを蘇生
 * @param {Object} state - GameState
 * @param {Function} condition - 検索条件関数 (card) => boolean
 * @param {Object|boolean} options - オプション
 * @returns {Object} { newState, revivedMonster }
 */
export function reviveFromGraveyardPure(state, condition, options = {}) {
  const player = getCurrentPlayer(state);
  const foundIndex = player.graveyard.findIndex(c => c.type === 'monster' && condition(c));

  if (foundIndex === -1) {
    const newState = addLog(state, '条件に合うモンスターが墓地にいません', 'info');
    return { newState, revivedMonster: null };
  }

  // 空きスロットを探す
  const emptySlot = player.field.findIndex(slot => slot === null);
  if (emptySlot === -1) {
    const newState = addLog(state, 'フィールドに空きがありません', 'info');
    return { newState, revivedMonster: null };
  }

  const foundCard = player.graveyard[foundIndex];

  // オプション処理
  let attackValue = foundCard.attack;
  let hpValue = foundCard.hp;

  if (options === true || options.attackHalf) {
    attackValue = Math.floor(foundCard.attack / 2);
  }
  if (options === true || options.hpHalf) {
    hpValue = Math.floor(foundCard.hp / 2);
  }
  if (options.fixedAttack !== undefined) {
    attackValue = options.fixedAttack;
  }
  if (options.fixedHp !== undefined) {
    hpValue = options.fixedHp;
  }

  // モンスターインスタンス作成
  const monster = {
    ...foundCard,
    uniqueId: `${foundCard.id}_revive_${Date.now()}_${Math.random()}`,
    currentAttack: attackValue,
    currentHp: hpValue,
    hp: hpValue,
    attack: attackValue,
    canAttack: false,
    charges: [],
    statusEffects: [],
    usedSkillThisTurn: false,
    owner: state.currentPlayer,
  };

  // 墓地から削除、フィールドに配置
  const newGraveyard = [...player.graveyard];
  newGraveyard.splice(foundIndex, 1);

  const newField = [...player.field];
  newField[emptySlot] = monster;

  let newState = updatePlayer(state, state.currentPlayer, {
    graveyard: newGraveyard,
    field: newField,
  });

  newState = addLog(newState, `「${foundCard.name}」を蘇生！`, 'info');

  return { newState, revivedMonster: monster };
}

// ========================================
// SP操作
// ========================================

/**
 * SPを増加
 * @param {Object} state - GameState
 * @param {number} amount - 増加量
 * @param {boolean} isOpponent - 相手か
 * @returns {Object} newState
 */
export function addSPPure(state, amount, isOpponent = false) {
  const targetPlayer = isOpponent
    ? getOpponentNumber(state.currentPlayer)
    : state.currentPlayer;
  const player = getPlayer(state, targetPlayer);

  const newActiveSP = Math.min(10, player.activeSP + amount);

  let newState = updatePlayer(state, targetPlayer, { activeSP: newActiveSP });
  newState = addLog(newState, `P${targetPlayer}のSP+${amount}`, 'info');

  return newState;
}

/**
 * SPを減少
 * @param {Object} state - GameState
 * @param {number} amount - 減少量
 * @param {boolean} isOpponent - 相手か
 * @returns {Object} newState
 */
export function reduceSPPure(state, amount, isOpponent = false) {
  const targetPlayer = isOpponent
    ? getOpponentNumber(state.currentPlayer)
    : state.currentPlayer;
  const player = getPlayer(state, targetPlayer);

  const newActiveSP = Math.max(0, player.activeSP - amount);

  let newState = updatePlayer(state, targetPlayer, { activeSP: newActiveSP });
  newState = addLog(newState, `P${targetPlayer}のSP-${amount}`, 'info');

  return newState;
}
