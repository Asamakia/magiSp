/**
 * GameState - ゲーム状態の型定義と初期化
 *
 * ゲームロジックに必要な状態をプレーンオブジェクトで管理。
 * React hooksに依存しない純粋なデータ構造。
 */

import {
  INITIAL_LIFE,
  INITIAL_SP,
  MAX_SP,
  INITIAL_HAND_SIZE,
} from '../../utils/constants';
import { createMonsterInstance } from '../../utils/helpers';

// ========================================
// 定数
// ========================================

export const GAME_STATUS = {
  PLAYING: 'playing',
  GAME_OVER: 'gameOver',
};

export const PHASES = {
  TURN_START: 0,    // ターン開始
  DRAW: 1,          // ドロー
  MAIN: 2,          // メイン
  BATTLE: 3,        // バトル
  END: 4,           // エンド
};

export const PHASE_NAMES = ['ターン開始', 'ドロー', 'メイン', 'バトル', 'エンド'];

// ========================================
// プレイヤー状態の初期化
// ========================================

/**
 * プレイヤー状態を初期化
 * @param {Array} deck - シャッフル済みデッキ（40枚）
 * @returns {Object} プレイヤー状態
 */
export function createPlayerState(deck) {
  const hand = deck.slice(0, INITIAL_HAND_SIZE);
  const remainingDeck = deck.slice(INITIAL_HAND_SIZE);

  return {
    life: INITIAL_LIFE,
    deck: remainingDeck,
    hand: hand,
    field: [null, null, null, null, null],
    graveyard: [],
    activeSP: INITIAL_SP,
    restedSP: 0,
    fieldCard: null,
    phaseCard: null,
    statusEffects: [],        // プレイヤー自身の状態異常（毒など）
    nextTurnSPBonus: 0,       // 次ターンSP増加ボーナス
    magicBlocked: false,      // 魔法カード使用制限
    spReduction: 0,           // 次ターンSP増加減少
  };
}

/**
 * ターンフラグを初期化
 * @returns {Object} ターンフラグ
 */
export function createTurnFlags() {
  return {
    chargeUsedThisTurn: false,
    // AIの攻撃済みモンスター追跡はUIレイヤーで管理
  };
}

// ========================================
// ゲーム状態の初期化
// ========================================

/**
 * 初期ゲーム状態を生成
 * @param {Object} config - 設定
 * @param {Array} config.deck1 - P1のデッキ（シャッフル済み40枚）
 * @param {Array} config.deck2 - P2のデッキ（シャッフル済み40枚）
 * @param {number} [config.firstPlayer] - 先攻プレイヤー（省略時ランダム）
 * @returns {Object} GameState
 */
export function createInitialState(config) {
  const { deck1, deck2, firstPlayer } = config;

  // 先攻決定（指定がなければランダム）
  const first = firstPlayer ?? (Math.random() < 0.5 ? 1 : 2);

  return {
    // ゲーム進行
    turn: 1,
    currentPlayer: first,
    phase: PHASES.TURN_START,
    isFirstTurn: true,
    winner: null,
    gameStatus: GAME_STATUS.PLAYING,

    // プレイヤー状態
    p1: createPlayerState(deck1),
    p2: createPlayerState(deck2),

    // ターン内フラグ
    turnFlags: createTurnFlags(),

    // ログ
    logs: [{ message: `🎲 P${first} が先行！`, type: 'info' }],
  };
}

// ========================================
// 状態アクセスヘルパー
// ========================================

/**
 * 指定プレイヤーの状態を取得
 * @param {Object} state - GameState
 * @param {number} player - プレイヤー番号 (1 or 2)
 * @returns {Object} プレイヤー状態
 */
export function getPlayer(state, player) {
  return player === 1 ? state.p1 : state.p2;
}

/**
 * 相手プレイヤーの状態を取得
 * @param {Object} state - GameState
 * @param {number} player - プレイヤー番号 (1 or 2)
 * @returns {Object} 相手プレイヤー状態
 */
export function getOpponent(state, player) {
  return player === 1 ? state.p2 : state.p1;
}

/**
 * 現在のプレイヤー状態を取得
 * @param {Object} state - GameState
 * @returns {Object} 現在のプレイヤー状態
 */
export function getCurrentPlayer(state) {
  return getPlayer(state, state.currentPlayer);
}

/**
 * 現在の相手プレイヤー状態を取得
 * @param {Object} state - GameState
 * @returns {Object} 相手プレイヤー状態
 */
export function getCurrentOpponent(state) {
  return getOpponent(state, state.currentPlayer);
}

/**
 * 相手プレイヤー番号を取得
 * @param {number} player - プレイヤー番号 (1 or 2)
 * @returns {number} 相手プレイヤー番号
 */
export function getOpponentNumber(player) {
  return player === 1 ? 2 : 1;
}

// ========================================
// 状態更新ヘルパー（イミュータブル）
// ========================================

/**
 * プレイヤー状態を更新
 * @param {Object} state - GameState
 * @param {number} player - プレイヤー番号 (1 or 2)
 * @param {Object} updates - 更新内容（部分的でOK）
 * @returns {Object} 新しいGameState
 */
export function updatePlayer(state, player, updates) {
  const key = player === 1 ? 'p1' : 'p2';
  return {
    ...state,
    [key]: {
      ...state[key],
      ...updates,
    },
  };
}

/**
 * ログを追加
 * @param {Object} state - GameState
 * @param {string} message - ログメッセージ
 * @param {string} [type='info'] - ログタイプ ('info', 'damage', 'heal')
 * @returns {Object} 新しいGameState
 */
export function addLog(state, message, type = 'info') {
  const newLogs = [...state.logs, { message, type }];
  // 最大100件保持
  if (newLogs.length > 100) {
    newLogs.shift();
  }
  return {
    ...state,
    logs: newLogs,
  };
}

/**
 * ターンフラグを更新
 * @param {Object} state - GameState
 * @param {Object} updates - 更新内容
 * @returns {Object} 新しいGameState
 */
export function updateTurnFlags(state, updates) {
  return {
    ...state,
    turnFlags: {
      ...state.turnFlags,
      ...updates,
    },
  };
}

/**
 * ゲーム進行状態を更新
 * @param {Object} state - GameState
 * @param {Object} updates - 更新内容
 * @returns {Object} 新しいGameState
 */
export function updateGameProgress(state, updates) {
  return {
    ...state,
    ...updates,
  };
}

// ========================================
// 判定ヘルパー
// ========================================

/**
 * ゲームが終了しているか
 * @param {Object} state - GameState
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameStatus === GAME_STATUS.GAME_OVER || state.winner !== null;
}

/**
 * 勝者を判定（ライフ0チェック）
 * @param {Object} state - GameState
 * @returns {number|null} 勝者のプレイヤー番号 or null
 */
export function checkWinner(state) {
  if (state.p1.life <= 0) return 2;
  if (state.p2.life <= 0) return 1;
  return null;
}

/**
 * カードが召喚可能か
 * @param {Object} state - GameState
 * @param {Object} card - カード
 * @param {number} slotIndex - スロット番号
 * @returns {boolean}
 */
export function canSummonCard(state, card, slotIndex) {
  const player = getCurrentPlayer(state);

  // モンスターカードのみ
  if (card.type !== 'monster') return false;

  // SPチェック
  if (card.cost > player.activeSP) return false;

  // スロットが空いているか
  if (player.field[slotIndex] !== null) return false;

  // メインフェイズか
  if (state.phase !== PHASES.MAIN) return false;

  return true;
}

/**
 * 魔法カードが使用可能か
 * @param {Object} state - GameState
 * @param {Object} card - カード
 * @returns {boolean}
 */
export function canUseMagic(state, card) {
  const player = getCurrentPlayer(state);

  // 魔法カードのみ
  if (card.type !== 'magic') return false;

  // SPチェック
  if (card.cost > player.activeSP) return false;

  // 魔法ブロック中か
  if (player.magicBlocked) return false;

  // メインフェイズか
  if (state.phase !== PHASES.MAIN) return false;

  return true;
}

/**
 * モンスターが攻撃可能か
 * @param {Object} monster - モンスター
 * @returns {boolean}
 */
export function canMonsterAttack(monster) {
  if (!monster) return false;
  if (!monster.canAttack) return false;
  return true;
}

/**
 * フィールドにモンスターがいるか
 * @param {Array} field - フィールド配列
 * @returns {boolean}
 */
export function hasMonsterOnField(field) {
  return field.some(slot => slot !== null);
}

/**
 * フィールドの空きスロット数
 * @param {Array} field - フィールド配列
 * @returns {number}
 */
export function getEmptySlotCount(field) {
  return field.filter(slot => slot === null).length;
}

/**
 * フィールドの最初の空きスロットインデックス
 * @param {Array} field - フィールド配列
 * @returns {number} スロットインデックス (-1 if full)
 */
export function getFirstEmptySlot(field) {
  return field.findIndex(slot => slot === null);
}

// ========================================
// デバッグ用
// ========================================

/**
 * ゲーム状態のサマリーを取得
 * @param {Object} state - GameState
 * @returns {Object} サマリー
 */
export function getStateSummary(state) {
  return {
    turn: state.turn,
    currentPlayer: state.currentPlayer,
    phase: PHASE_NAMES[state.phase],
    p1: {
      life: state.p1.life,
      hand: state.p1.hand.length,
      deck: state.p1.deck.length,
      field: state.p1.field.filter(m => m !== null).length,
      graveyard: state.p1.graveyard.length,
      sp: `${state.p1.activeSP}/${state.p1.activeSP + state.p1.restedSP}`,
    },
    p2: {
      life: state.p2.life,
      hand: state.p2.hand.length,
      deck: state.p2.deck.length,
      field: state.p2.field.filter(m => m !== null).length,
      graveyard: state.p2.graveyard.length,
      sp: `${state.p2.activeSP}/${state.p2.activeSP + state.p2.restedSP}`,
    },
    winner: state.winner,
  };
}
