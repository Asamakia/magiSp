/**
 * GameActions - ゲームアクションの定義と適用
 *
 * 全てのゲームアクションを純粋関数として実装。
 * applyAction(state, action) → newState の形式で状態を更新。
 */

import {
  getPlayer,
  getOpponent,
  getCurrentPlayer,
  getCurrentOpponent,
  getOpponentNumber,
  updatePlayer,
  updateTurnFlags,
  updateGameProgress,
  addLog,
  checkWinner,
  canSummonCard,
  canUseMagic,
  canMonsterAttack,
  hasMonsterOnField,
  PHASES,
  PHASE_NAMES,
  GAME_STATUS,
} from './GameState';

import { MAX_SP, COUNTER_ATTACK_RATE } from '../../utils/constants';
import { createMonsterInstance } from '../../utils/helpers';

// ========================================
// アクションタイプ定義
// ========================================

export const ACTION_TYPES = {
  // フェイズ進行
  PROCESS_PHASE: 'PROCESS_PHASE',
  NEXT_PHASE: 'NEXT_PHASE',
  END_TURN: 'END_TURN',
  SET_PHASE: 'SET_PHASE', // Phase B: 直接フェイズ設定用

  // カードアクション
  SUMMON_CARD: 'SUMMON_CARD',
  ATTACK: 'ATTACK',
  EXECUTE_SKILL: 'EXECUTE_SKILL',
  CHARGE_CARD: 'CHARGE_CARD',
  CHARGE_SP: 'CHARGE_SP',
  USE_MAGIC: 'USE_MAGIC',
  PLACE_FIELD_CARD: 'PLACE_FIELD_CARD',
  CHARGE_PHASE_CARD: 'CHARGE_PHASE_CARD',

  // トリガー
  ACTIVATE_TRIGGER: 'ACTIVATE_TRIGGER',

  // 特殊アクション
  DRAW_CARD: 'DRAW_CARD',
  DISCARD_CARD: 'DISCARD_CARD',
  DESTROY_MONSTER: 'DESTROY_MONSTER',
  DEAL_DAMAGE: 'DEAL_DAMAGE',
  HEAL_LIFE: 'HEAL_LIFE',
  MODIFY_MONSTER_STAT: 'MODIFY_MONSTER_STAT',

  // 勝敗判定
  CHECK_WINNER: 'CHECK_WINNER',
  SET_WINNER: 'SET_WINNER',

  // ログ
  ADD_LOG: 'ADD_LOG',
};

// ========================================
// アクション作成ヘルパー
// ========================================

/**
 * アクションオブジェクトを作成
 * @param {string} type - アクションタイプ
 * @param {Object} [payload={}] - ペイロード
 * @returns {Object} アクション
 */
export function createAction(type, payload = {}) {
  return { type, payload };
}

// よく使うアクションのショートカット
export const actions = {
  processPhase: (phase) => createAction(ACTION_TYPES.PROCESS_PHASE, { phase }),
  nextPhase: () => createAction(ACTION_TYPES.NEXT_PHASE),
  endTurn: () => createAction(ACTION_TYPES.END_TURN),
  setPhase: (phase) => createAction(ACTION_TYPES.SET_PHASE, { phase }), // Phase B: 直接設定

  summonCard: (cardIndex, slotIndex) =>
    createAction(ACTION_TYPES.SUMMON_CARD, { cardIndex, slotIndex }),

  attack: (attackerIndex, targetIndex) =>
    createAction(ACTION_TYPES.ATTACK, { attackerIndex, targetIndex }),

  executeSkill: (monsterIndex, skillType) =>
    createAction(ACTION_TYPES.EXECUTE_SKILL, { monsterIndex, skillType }),

  chargeCard: (handCardIndex, monsterIndex) =>
    createAction(ACTION_TYPES.CHARGE_CARD, { handCardIndex, monsterIndex }),

  chargeSP: (monsterIndex) =>
    createAction(ACTION_TYPES.CHARGE_SP, { monsterIndex }),

  useMagic: (cardIndex) =>
    createAction(ACTION_TYPES.USE_MAGIC, { cardIndex }),

  drawCard: (player, count = 1) =>
    createAction(ACTION_TYPES.DRAW_CARD, { player, count }),

  dealDamage: (target, amount) =>
    createAction(ACTION_TYPES.DEAL_DAMAGE, { target, amount }),

  healLife: (target, amount) =>
    createAction(ACTION_TYPES.HEAL_LIFE, { target, amount }),

  checkWinner: () => createAction(ACTION_TYPES.CHECK_WINNER),

  setWinner: (winner) => createAction(ACTION_TYPES.SET_WINNER, { winner }),

  // Phase B-5: フィールドカード・フェイズカード配置
  placeFieldCard: (cardIndex) =>
    createAction(ACTION_TYPES.PLACE_FIELD_CARD, { cardIndex }),

  placePhaseCard: (cardIndex) =>
    createAction(ACTION_TYPES.CHARGE_PHASE_CARD, { cardIndex }),

  // Phase D-3: ログ追加
  addLog: (message, type = 'info') =>
    createAction(ACTION_TYPES.ADD_LOG, { message, type }),
};

// ========================================
// メインのアクション適用関数
// ========================================

/**
 * アクションを適用して新しい状態を返す（純粋関数）
 * @param {Object} state - 現在のGameState
 * @param {Object} action - 適用するアクション
 * @returns {Object} 新しいGameState
 */
export function applyAction(state, action) {
  // ゲーム終了後はアクションを受け付けない
  if (state.gameStatus === GAME_STATUS.GAME_OVER) {
    return state;
  }

  switch (action.type) {
    case ACTION_TYPES.PROCESS_PHASE:
      return applyProcessPhase(state, action.payload);

    case ACTION_TYPES.NEXT_PHASE:
      return applyNextPhase(state);

    case ACTION_TYPES.END_TURN:
      return applyEndTurn(state);

    case ACTION_TYPES.SET_PHASE:
      return applySetPhase(state, action.payload);

    case ACTION_TYPES.SUMMON_CARD:
      return applySummonCard(state, action.payload);

    case ACTION_TYPES.ATTACK:
      return applyAttack(state, action.payload);

    case ACTION_TYPES.EXECUTE_SKILL:
      return applyExecuteSkill(state, action.payload);

    case ACTION_TYPES.CHARGE_CARD:
      return applyChargeCard(state, action.payload);

    case ACTION_TYPES.CHARGE_SP:
      return applyChargeSP(state, action.payload);

    case ACTION_TYPES.USE_MAGIC:
      return applyUseMagic(state, action.payload);

    case ACTION_TYPES.DRAW_CARD:
      return applyDrawCard(state, action.payload);

    case ACTION_TYPES.DEAL_DAMAGE:
      return applyDealDamage(state, action.payload);

    case ACTION_TYPES.HEAL_LIFE:
      return applyHealLife(state, action.payload);

    case ACTION_TYPES.DESTROY_MONSTER:
      return applyDestroyMonster(state, action.payload);

    case ACTION_TYPES.CHECK_WINNER:
      return applyCheckWinner(state);

    case ACTION_TYPES.SET_WINNER:
      return applySetWinner(state, action.payload);

    // Phase B-5: フィールドカード・フェイズカード配置
    case ACTION_TYPES.PLACE_FIELD_CARD:
      return applyPlaceFieldCard(state, action.payload);

    case ACTION_TYPES.CHARGE_PHASE_CARD:
      return applyPlacePhaseCard(state, action.payload);

    // Phase D-3: ログ追加
    case ACTION_TYPES.ADD_LOG:
      return addLog(state, action.payload.message, action.payload.type);

    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

/**
 * 複数のアクションを順次適用
 * @param {Object} state - 現在のGameState
 * @param {Array} actions - アクションの配列
 * @returns {Object} 新しいGameState
 */
export function applyActions(state, actions) {
  return actions.reduce((currentState, action) => {
    return applyAction(currentState, action);
  }, state);
}

// ========================================
// 個別アクション実装
// ========================================

/**
 * フェイズ処理
 */
function applyProcessPhase(state, { phase }) {
  switch (phase) {
    case PHASES.TURN_START:
      return processTurnStart(state);

    case PHASES.DRAW:
      return processDraw(state);

    case PHASES.MAIN:
      // メインフェイズは自動処理なし
      return state;

    case PHASES.BATTLE:
      // バトルフェイズは自動処理なし
      return state;

    case PHASES.END:
      return processEndPhase(state);

    default:
      return state;
  }
}

/**
 * ターン開始処理
 */
function processTurnStart(state) {
  const currentPlayer = state.currentPlayer;
  const player = getPlayer(state, currentPlayer);

  // SP回復（レスト→アクティブ）
  const totalSP = player.activeSP + player.restedSP;
  let newSP = Math.min(totalSP + 1, MAX_SP); // 1SP増加、最大10

  // SPボーナス適用
  if (player.nextTurnSPBonus > 0) {
    newSP = Math.min(newSP + player.nextTurnSPBonus, MAX_SP);
  }

  // SP減少適用（壮麗効果）
  if (player.spReduction > 0) {
    newSP = Math.max(1, newSP - player.spReduction);
  }

  // モンスターの攻撃可能フラグをON & 技発動済みフラグリセット
  const newField = player.field.map(monster => {
    if (monster === null) return null;
    return {
      ...monster,
      canAttack: true,
      usedSkillThisTurn: false,
    };
  });

  // プレイヤー状態更新
  let newState = updatePlayer(state, currentPlayer, {
    activeSP: newSP,
    restedSP: 0,
    nextTurnSPBonus: 0,
    spReduction: 0,
    magicBlocked: false, // 魔法ブロック解除
    field: newField,
  });

  // ターンフラグリセット
  newState = updateTurnFlags(newState, {
    chargeUsedThisTurn: false,
  });

  newState = addLog(newState, `ターン${state.turn}: P${currentPlayer}のターン開始`, 'info');

  return newState;
}

/**
 * ドローフェイズ処理
 */
function processDraw(state) {
  const currentPlayer = state.currentPlayer;
  const player = getPlayer(state, currentPlayer);

  // デッキが空ならドローしない
  if (player.deck.length === 0) {
    return addLog(state, 'デッキが空です', 'info');
  }

  // 1枚ドロー
  const [drawnCard, ...remainingDeck] = player.deck;
  const newHand = [...player.hand, drawnCard];

  let newState = updatePlayer(state, currentPlayer, {
    deck: remainingDeck,
    hand: newHand,
  });

  newState = addLog(newState, `${drawnCard.name}をドロー`, 'info');

  return newState;
}

/**
 * エンドフェイズ処理
 */
function processEndPhase(state) {
  // 先攻1ターン目フラグを解除
  let newState = state;

  if (state.isFirstTurn && state.turn === 1) {
    newState = updateGameProgress(newState, { isFirstTurn: false });
  }

  return newState;
}

/**
 * 次のフェイズへ進む
 */
function applyNextPhase(state) {
  const nextPhase = state.phase + 1;

  if (nextPhase > PHASES.END) {
    // ターン終了 → 相手ターンへ
    return applyEndTurn(state);
  }

  return updateGameProgress(state, { phase: nextPhase });
}

/**
 * フェイズを直接設定（Phase B: UI統合用）
 */
function applySetPhase(state, { phase }) {
  if (phase < PHASES.TURN_START || phase > PHASES.END) {
    console.warn(`Invalid phase: ${phase}`);
    return state;
  }
  return updateGameProgress(state, { phase });
}

/**
 * ターン終了
 */
function applyEndTurn(state) {
  const nextPlayer = getOpponentNumber(state.currentPlayer);
  const nextTurn = nextPlayer === 1 ? state.turn + 1 : state.turn;
  // isFirstTurnはプレイヤー2のターン終了時（次がプレイヤー1）に解除
  const nextIsFirstTurn = nextPlayer === 1 ? false : state.isFirstTurn;

  return updateGameProgress(state, {
    currentPlayer: nextPlayer,
    turn: nextTurn,
    phase: PHASES.TURN_START,
    isFirstTurn: nextIsFirstTurn,
  });
}

/**
 * カード召喚
 */
function applySummonCard(state, { cardIndex, slotIndex }) {
  const currentPlayer = state.currentPlayer;
  const player = getPlayer(state, currentPlayer);
  const card = player.hand[cardIndex];

  // バリデーション
  if (!card) {
    return addLog(state, 'カードが見つかりません', 'info');
  }

  if (!canSummonCard(state, card, slotIndex)) {
    return addLog(state, '召喚できません', 'info');
  }

  // モンスターインスタンス生成
  const monster = createMonsterInstance(card);
  monster.owner = currentPlayer;
  monster.canAttack = false; // 召喚ターンは攻撃不可

  // 手札からカードを削除
  const newHand = player.hand.filter((_, i) => i !== cardIndex);

  // フィールドにモンスターを配置
  const newField = [...player.field];
  newField[slotIndex] = monster;

  // SPを消費
  const newActiveSP = player.activeSP - card.cost;

  // 状態更新
  let newState = updatePlayer(state, currentPlayer, {
    hand: newHand,
    field: newField,
    activeSP: newActiveSP,
  });

  newState = addLog(newState, `${card.name}を召喚！ (コスト: ${card.cost}SP)`, 'info');

  // TODO: トリガー発火（ON_SUMMON等）
  // TODO: 常時効果登録

  return newState;
}

/**
 * 攻撃処理
 */
function applyAttack(state, { attackerIndex, targetIndex }) {
  const currentPlayer = state.currentPlayer;
  const opponentNumber = getOpponentNumber(currentPlayer);
  const player = getPlayer(state, currentPlayer);
  const opponent = getOpponent(state, currentPlayer);

  const attacker = player.field[attackerIndex];

  // バリデーション
  if (!attacker || !canMonsterAttack(attacker)) {
    return addLog(state, 'このモンスターは攻撃できません', 'damage');
  }

  // 先攻1ターン目は攻撃不可
  if (state.isFirstTurn) {
    return addLog(state, '先攻1ターン目は攻撃できません', 'info');
  }

  let newState = state;

  if (targetIndex === -1) {
    // ダイレクトアタック
    newState = executeDirectAttack(newState, attacker, attackerIndex, currentPlayer);
  } else {
    // モンスターへの攻撃
    const target = opponent.field[targetIndex];
    if (!target) {
      return addLog(state, '攻撃対象が存在しません', 'damage');
    }
    newState = executeMonsterAttack(newState, attacker, target, attackerIndex, targetIndex, currentPlayer);
  }

  // 攻撃済みフラグを設定
  const playerData = getPlayer(newState, currentPlayer);
  const updatedField = [...playerData.field];
  if (updatedField[attackerIndex]) {
    updatedField[attackerIndex] = {
      ...updatedField[attackerIndex],
      canAttack: false,
    };
  }
  newState = updatePlayer(newState, currentPlayer, { field: updatedField });

  // 勝敗判定
  newState = applyCheckWinner(newState);

  return newState;
}

/**
 * ダイレクトアタック実行
 */
function executeDirectAttack(state, attacker, attackerIndex, currentPlayer) {
  const opponentNumber = getOpponentNumber(currentPlayer);
  const opponent = getOpponent(state, currentPlayer);

  let damage = attacker.currentAttack || attacker.attack;

  // 相手フィールドにモンスターがいる場合は50%軽減
  if (hasMonsterOnField(opponent.field)) {
    damage = Math.floor(damage * 0.5);
  }

  // フィールドカードがある場合は75%に軽減
  if (opponent.fieldCard) {
    damage = Math.floor(damage * 0.75);
  }

  const newLife = Math.max(0, opponent.life - damage);

  let newState = updatePlayer(state, opponentNumber, { life: newLife });
  newState = addLog(newState, `${attacker.name}のダイレクトアタック！ ${damage}ダメージ！`, 'damage');

  return newState;
}

/**
 * モンスターへの攻撃実行
 */
function executeMonsterAttack(state, attacker, target, attackerIndex, targetIndex, currentPlayer) {
  const opponentNumber = getOpponentNumber(currentPlayer);
  const attackPower = attacker.currentAttack || attacker.attack;
  const targetHP = target.currentHp || target.hp;

  // ダメージ計算
  const damage = attackPower;
  const newTargetHP = targetHP - damage;

  // カウンターダメージ（30%）
  const counterDamage = Math.floor((target.currentAttack || target.attack) * COUNTER_ATTACK_RATE);
  const attackerHP = attacker.currentHp || attacker.hp;
  const newAttackerHP = attackerHP - counterDamage;

  let newState = state;

  // 攻撃側の更新
  const playerData = getPlayer(newState, currentPlayer);
  const updatedPlayerField = [...playerData.field];

  if (newAttackerHP <= 0) {
    // 攻撃側が破壊
    updatedPlayerField[attackerIndex] = null;
    const newGraveyard = [...playerData.graveyard, attacker];
    newState = updatePlayer(newState, currentPlayer, {
      field: updatedPlayerField,
      graveyard: newGraveyard,
    });
    newState = addLog(newState, `${attacker.name}は反撃で破壊された！`, 'damage');
  } else {
    // 攻撃側HP減少
    updatedPlayerField[attackerIndex] = {
      ...attacker,
      currentHp: newAttackerHP,
    };
    newState = updatePlayer(newState, currentPlayer, { field: updatedPlayerField });
  }

  // 防御側の更新
  const opponentData = getPlayer(newState, opponentNumber);
  const updatedOpponentField = [...opponentData.field];

  if (newTargetHP <= 0) {
    // 防御側が破壊
    updatedOpponentField[targetIndex] = null;
    const newGraveyard = [...opponentData.graveyard, target];
    newState = updatePlayer(newState, opponentNumber, {
      field: updatedOpponentField,
      graveyard: newGraveyard,
    });
    newState = addLog(newState, `${target.name}を破壊！`, 'damage');
  } else {
    // 防御側HP減少
    updatedOpponentField[targetIndex] = {
      ...target,
      currentHp: newTargetHP,
    };
    newState = updatePlayer(newState, opponentNumber, { field: updatedOpponentField });
  }

  newState = addLog(newState, `${attacker.name}が${target.name}に攻撃！ ${damage}ダメージ（反撃${counterDamage}）`, 'damage');

  return newState;
}

/**
 * 技発動（スタブ実装）
 * TODO: effectEngineとの統合
 */
function applyExecuteSkill(state, { monsterIndex, skillType }) {
  const player = getCurrentPlayer(state);
  const monster = player.field[monsterIndex];

  if (!monster) {
    return addLog(state, 'モンスターが見つかりません', 'info');
  }

  if (monster.usedSkillThisTurn) {
    return addLog(state, 'このモンスターは既に技を使用しています', 'info');
  }

  // TODO: 実際の技効果実行（effectEngineとの統合）

  // 技使用済みフラグを設定
  const newField = [...player.field];
  newField[monsterIndex] = {
    ...monster,
    usedSkillThisTurn: true,
  };

  let newState = updatePlayer(state, state.currentPlayer, { field: newField });
  newState = addLog(newState, `${monster.name}が${skillType === 'basic' ? '基本技' : '上級技'}を発動！`, 'info');

  return newState;
}

/**
 * カードをチャージ
 */
function applyChargeCard(state, { handCardIndex, monsterIndex }) {
  if (state.turnFlags.chargeUsedThisTurn) {
    return addLog(state, 'このターンは既にチャージしています', 'info');
  }

  const player = getCurrentPlayer(state);
  const card = player.hand[handCardIndex];
  const monster = player.field[monsterIndex];

  if (!card || !monster) {
    return addLog(state, 'カードまたはモンスターが見つかりません', 'info');
  }

  // 同属性または「なし」属性のみチャージ可能
  if (card.attribute !== monster.attribute && card.attribute !== 'なし') {
    return addLog(state, '属性が一致しないためチャージできません', 'info');
  }

  // 手札からカードを削除
  const newHand = player.hand.filter((_, i) => i !== handCardIndex);

  // モンスターにチャージを追加
  const charges = monster.charges || [];
  const newCharges = [...charges, { card, type: 'card' }];

  const newField = [...player.field];
  newField[monsterIndex] = {
    ...monster,
    charges: newCharges,
  };

  let newState = updatePlayer(state, state.currentPlayer, {
    hand: newHand,
    field: newField,
  });

  newState = updateTurnFlags(newState, { chargeUsedThisTurn: true });
  newState = addLog(newState, `${card.name}を${monster.name}にチャージ`, 'info');

  return newState;
}

/**
 * SPをチャージ
 */
function applyChargeSP(state, { monsterIndex }) {
  if (state.turnFlags.chargeUsedThisTurn) {
    return addLog(state, 'このターンは既にチャージしています', 'info');
  }

  const player = getCurrentPlayer(state);
  const monster = player.field[monsterIndex];

  if (!monster) {
    return addLog(state, 'モンスターが見つかりません', 'info');
  }

  if (player.activeSP < 1) {
    return addLog(state, 'SPが足りません', 'info');
  }

  // SPを消費
  const newActiveSP = player.activeSP - 1;

  // モンスターにSPチャージを追加
  const charges = monster.charges || [];
  const newCharges = [...charges, { type: 'sp' }];

  const newField = [...player.field];
  newField[monsterIndex] = {
    ...monster,
    charges: newCharges,
  };

  let newState = updatePlayer(state, state.currentPlayer, {
    activeSP: newActiveSP,
    field: newField,
  });

  newState = updateTurnFlags(newState, { chargeUsedThisTurn: true });
  newState = addLog(newState, `SPを${monster.name}にチャージ`, 'info');

  return newState;
}

/**
 * 魔法カード使用（スタブ実装）
 * TODO: effectEngineとの統合
 */
function applyUseMagic(state, { cardIndex }) {
  const player = getCurrentPlayer(state);
  const card = player.hand[cardIndex];

  if (!card || !canUseMagic(state, card)) {
    return addLog(state, '魔法カードを使用できません', 'info');
  }

  // 手札からカードを削除
  const newHand = player.hand.filter((_, i) => i !== cardIndex);

  // SPを消費
  const newActiveSP = player.activeSP - card.cost;

  // 墓地に送る
  const newGraveyard = [...player.graveyard, card];

  let newState = updatePlayer(state, state.currentPlayer, {
    hand: newHand,
    activeSP: newActiveSP,
    graveyard: newGraveyard,
  });

  newState = addLog(newState, `${card.name}を発動！`, 'info');

  // TODO: 実際の魔法効果実行（effectEngineとの統合）

  return newState;
}

/**
 * カードをドロー
 */
function applyDrawCard(state, { player, count = 1 }) {
  const playerData = getPlayer(state, player);

  if (playerData.deck.length === 0) {
    return addLog(state, 'デッキが空です', 'info');
  }

  const drawCount = Math.min(count, playerData.deck.length);
  const drawnCards = playerData.deck.slice(0, drawCount);
  const remainingDeck = playerData.deck.slice(drawCount);
  const newHand = [...playerData.hand, ...drawnCards];

  let newState = updatePlayer(state, player, {
    deck: remainingDeck,
    hand: newHand,
  });

  const cardNames = drawnCards.map(c => c.name).join(', ');
  newState = addLog(newState, `P${player}が${drawCount}枚ドロー: ${cardNames}`, 'info');

  return newState;
}

/**
 * ダメージを与える
 */
function applyDealDamage(state, { target, amount }) {
  // target: 'p1' | 'p2' | 1 | 2
  const player = typeof target === 'string' ? (target === 'p1' ? 1 : 2) : target;
  const playerData = getPlayer(state, player);

  const newLife = Math.max(0, playerData.life - amount);

  let newState = updatePlayer(state, player, { life: newLife });
  newState = addLog(newState, `P${player}に${amount}ダメージ！`, 'damage');

  return applyCheckWinner(newState);
}

/**
 * ライフを回復
 */
function applyHealLife(state, { target, amount }) {
  const player = typeof target === 'string' ? (target === 'p1' ? 1 : 2) : target;
  const playerData = getPlayer(state, player);

  const newLife = playerData.life + amount;

  let newState = updatePlayer(state, player, { life: newLife });
  newState = addLog(newState, `P${player}が${amount}回復！`, 'heal');

  return newState;
}

/**
 * モンスターを破壊
 */
function applyDestroyMonster(state, { player, slotIndex }) {
  const playerData = getPlayer(state, player);
  const monster = playerData.field[slotIndex];

  if (!monster) {
    return state;
  }

  const newField = [...playerData.field];
  newField[slotIndex] = null;

  const newGraveyard = [...playerData.graveyard, monster];

  let newState = updatePlayer(state, player, {
    field: newField,
    graveyard: newGraveyard,
  });

  newState = addLog(newState, `${monster.name}が破壊された！`, 'damage');

  // TODO: ON_DESTROY_SELFトリガー

  return newState;
}

/**
 * 勝敗判定
 */
function applyCheckWinner(state) {
  const winner = checkWinner(state);

  if (winner !== null) {
    return applySetWinner(state, { winner });
  }

  return state;
}

/**
 * 勝者を設定
 */
function applySetWinner(state, { winner }) {
  let newState = updateGameProgress(state, {
    winner,
    gameStatus: GAME_STATUS.GAME_OVER,
  });

  newState = addLog(newState, `🏆 P${winner}の勝利！`, 'info');

  return newState;
}

// ========================================
// Phase B-5: フィールドカード・フェイズカード
// ========================================

/**
 * フィールドカードを配置
 */
function applyPlaceFieldCard(state, { cardIndex }) {
  const player = getCurrentPlayer(state);
  const card = player.hand[cardIndex];

  if (!card || card.type !== 'field') {
    return addLog(state, 'フィールドカードが見つかりません', 'info');
  }

  if (card.cost > player.activeSP) {
    return addLog(state, 'SPが足りません', 'info');
  }

  // 手札からカードを削除
  const newHand = player.hand.filter((_, i) => i !== cardIndex);

  // フィールドカードを設定（owner追加）
  const fieldCardInstance = { ...card, owner: state.currentPlayer };

  // SP消費
  const newActiveSP = player.activeSP - card.cost;
  const newRestedSP = player.restedSP + card.cost;

  let newState = updatePlayer(state, state.currentPlayer, {
    hand: newHand,
    fieldCard: fieldCardInstance,
    activeSP: newActiveSP,
    restedSP: newRestedSP,
  });

  newState = addLog(newState, `P${state.currentPlayer}: ${card.name}を設置！`, 'info');

  return newState;
}

/**
 * フェイズカードを配置
 */
function applyPlacePhaseCard(state, { cardIndex }) {
  const player = getCurrentPlayer(state);
  const card = player.hand[cardIndex];

  if (!card || card.type !== 'phasecard') {
    return addLog(state, 'フェイズカードが見つかりません', 'info');
  }

  if (card.cost > player.activeSP) {
    return addLog(state, 'SPが足りません', 'info');
  }

  // 手札からカードを削除
  const newHand = player.hand.filter((_, i) => i !== cardIndex);

  // フェイズカードを設定（stage, charges, owner追加）
  const phaseCardInstance = {
    ...card,
    stage: 0,
    charges: [],
    owner: state.currentPlayer,
  };

  // SP消費
  const newActiveSP = player.activeSP - card.cost;
  const newRestedSP = player.restedSP + card.cost;

  let newState = updatePlayer(state, state.currentPlayer, {
    hand: newHand,
    phaseCard: phaseCardInstance,
    activeSP: newActiveSP,
    restedSP: newRestedSP,
  });

  newState = addLog(newState, `P${state.currentPlayer}: フェイズカード【${card.name}】を設置！【初期段階】`, 'info');

  return newState;
}
