/**
 * Simulator - ヘッドレス対戦シミュレーター
 *
 * UIなしでゲームを実行し、AI vs AI対戦をシミュレートする。
 * トーナメント賭けシステムのオッズ計算に使用。
 */

import {
  createInitialState,
  getPlayer,
  getCurrentPlayer,
  hasMonsterOnField,
  getFirstEmptySlot,
  canSummonCard,
  PHASES,
  GAME_STATUS,
} from './GameState';

import {
  applyAction,
  actions,
} from './GameActions';

// ========================================
// シミュレーション設定
// ========================================

export const SIMULATION_CONFIG = {
  MAX_TURNS: 100,           // 最大ターン数（無限ループ防止）
  VERBOSE: false,           // ログ出力
  AI_DELAY: 0,              // AIの思考遅延（ヘッドレスでは0）
};

// ========================================
// シンプルAI（高速シミュレーション用）
// ========================================

/**
 * シンプルなAI判断（メインフェイズ）
 * @param {Object} state - GameState
 * @returns {Object|null} アクション
 */
function getAIMainPhaseAction(state) {
  const player = getCurrentPlayer(state);
  const playerNum = state.currentPlayer;

  // 1. 召喚可能なカードがあれば召喚
  const emptySlot = getFirstEmptySlot(player.field);
  if (emptySlot !== -1) {
    for (let i = 0; i < player.hand.length; i++) {
      const card = player.hand[i];
      if (card.type === 'monster' && canSummonCard(state, card, emptySlot)) {
        return actions.summonCard(i, emptySlot);
      }
    }
  }

  // 2. アクションなし → 次のフェイズへ
  return null;
}

/**
 * シンプルなAI判断（バトルフェイズ）
 * @param {Object} state - GameState
 * @returns {Object|null} アクション
 */
function getAIBattlePhaseAction(state) {
  const player = getCurrentPlayer(state);
  const opponent = getPlayer(state, state.currentPlayer === 1 ? 2 : 1);

  // 攻撃可能なモンスターを探す
  for (let i = 0; i < player.field.length; i++) {
    const monster = player.field[i];
    if (monster && monster.canAttack) {
      // 相手フィールドにモンスターがいれば攻撃
      const targetIndex = opponent.field.findIndex(m => m !== null);
      if (targetIndex !== -1) {
        return actions.attack(i, targetIndex);
      } else {
        // ダイレクトアタック
        return actions.attack(i, -1);
      }
    }
  }

  return null;
}

// ========================================
// シミュレーション実行
// ========================================

/**
 * 1ターンを実行
 * @param {Object} state - GameState
 * @returns {Object} 新しいGameState
 */
function executeTurn(state) {
  let newState = state;

  // ターン開始
  newState = applyAction(newState, actions.processPhase(PHASES.TURN_START));
  newState = applyAction(newState, actions.nextPhase());

  // ドロー
  newState = applyAction(newState, actions.processPhase(PHASES.DRAW));
  newState = applyAction(newState, actions.nextPhase());

  // メインフェイズ
  let mainPhaseActions = 0;
  const maxMainActions = 10; // 無限ループ防止
  while (mainPhaseActions < maxMainActions) {
    const action = getAIMainPhaseAction(newState);
    if (!action) break;
    newState = applyAction(newState, action);
    mainPhaseActions++;
  }
  newState = applyAction(newState, actions.nextPhase());

  // バトルフェイズ
  let battlePhaseActions = 0;
  const maxBattleActions = 10; // 無限ループ防止
  while (battlePhaseActions < maxBattleActions && newState.gameStatus !== GAME_STATUS.GAME_OVER) {
    const action = getAIBattlePhaseAction(newState);
    if (!action) break;
    newState = applyAction(newState, action);
    battlePhaseActions++;
  }
  newState = applyAction(newState, actions.nextPhase());

  // エンドフェイズ
  newState = applyAction(newState, actions.processPhase(PHASES.END));
  newState = applyAction(newState, actions.nextPhase()); // ターン終了

  return newState;
}

/**
 * ゲーム全体をシミュレート
 * @param {Object} config - シミュレーション設定
 * @param {Array} config.deck1 - P1のデッキ
 * @param {Array} config.deck2 - P2のデッキ
 * @param {number} [config.firstPlayer] - 先攻（省略時ランダム）
 * @param {number} [config.maxTurns] - 最大ターン数
 * @returns {Object} シミュレーション結果
 */
export function simulateGame(config) {
  const { deck1, deck2, firstPlayer, maxTurns = SIMULATION_CONFIG.MAX_TURNS } = config;

  let state = createInitialState({ deck1, deck2, firstPlayer });
  const startTime = Date.now();

  // ゲーム実行
  while (state.gameStatus !== GAME_STATUS.GAME_OVER && state.turn <= maxTurns) {
    state = executeTurn(state);

    // P1のターンが終わったら次
    if (state.currentPlayer === 1) {
      state = executeTurn(state);
    }
  }

  const endTime = Date.now();

  // 最大ターン到達時の判定
  let winner = state.winner;
  if (!winner && state.turn > maxTurns) {
    // ライフが多い方が勝ち
    if (state.p1.life > state.p2.life) {
      winner = 1;
    } else if (state.p2.life > state.p1.life) {
      winner = 2;
    } else {
      winner = 0; // 引き分け
    }
  }

  return {
    winner,
    turns: state.turn,
    p1Life: state.p1.life,
    p2Life: state.p2.life,
    p1Graveyard: state.p1.graveyard.length,
    p2Graveyard: state.p2.graveyard.length,
    duration: endTime - startTime,
    logs: state.logs,
  };
}

/**
 * 複数回シミュレートして統計を取得
 * @param {Object} config - シミュレーション設定
 * @param {Array} config.deck1 - P1のデッキ
 * @param {Array} config.deck2 - P2のデッキ
 * @param {number} [config.count=10] - シミュレーション回数
 * @returns {Object} 統計結果
 */
export function simulateMultiple(config) {
  const { deck1, deck2, count = 10 } = config;

  const results = {
    p1Wins: 0,
    p2Wins: 0,
    draws: 0,
    totalTurns: 0,
    totalDuration: 0,
    games: [],
  };

  for (let i = 0; i < count; i++) {
    // デッキをシャッフル
    const shuffledDeck1 = shuffleArray([...deck1]);
    const shuffledDeck2 = shuffleArray([...deck2]);

    const result = simulateGame({
      deck1: shuffledDeck1,
      deck2: shuffledDeck2,
    });

    if (result.winner === 1) {
      results.p1Wins++;
    } else if (result.winner === 2) {
      results.p2Wins++;
    } else {
      results.draws++;
    }

    results.totalTurns += result.turns;
    results.totalDuration += result.duration;
    results.games.push(result);
  }

  results.avgTurns = results.totalTurns / count;
  results.avgDuration = results.totalDuration / count;
  results.p1WinRate = results.p1Wins / count;
  results.p2WinRate = results.p2Wins / count;

  return results;
}

/**
 * オッズを計算
 * @param {Object} stats - simulateMultipleの結果
 * @returns {Object} オッズ
 */
export function calculateOdds(stats) {
  const total = stats.p1Wins + stats.p2Wins + stats.draws;

  // 勝率からオッズを計算（簡易版）
  // オッズ = 1 / 勝率
  const p1WinRate = stats.p1Wins / total || 0.01;
  const p2WinRate = stats.p2Wins / total || 0.01;

  return {
    p1Odds: Math.max(1.01, Math.round((1 / p1WinRate) * 100) / 100),
    p2Odds: Math.max(1.01, Math.round((1 / p2WinRate) * 100) / 100),
    p1WinRate: Math.round(p1WinRate * 1000) / 10,
    p2WinRate: Math.round(p2WinRate * 1000) / 10,
  };
}

// ========================================
// ヘルパー
// ========================================

/**
 * 配列をシャッフル（Fisher-Yates）
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
