/**
 * useGameEngine - GameEngine用Reactアダプター
 *
 * GameEngineの純粋関数をReactコンポーネントから使用するためのカスタムフック。
 * 既存のmagic-spirit.jsxとの互換性を保ちながら段階的に移行可能。
 */

import { useState, useCallback, useMemo } from 'react';
import {
  createInitialState,
  applyAction,
  actions,
  PHASES,
  GAME_STATUS,
  getPlayer,
  getStateSummary,
} from './index';

/**
 * GameEngineカスタムフック
 *
 * @returns {Object} GameEngine API
 */
export function useGameEngine() {
  // GameStateを1つのuseStateで管理
  const [engineState, setEngineState] = useState(null);

  /**
   * アクションをディスパッチして状態を更新
   */
  const dispatch = useCallback((action) => {
    setEngineState((prevState) => {
      if (!prevState) return prevState;
      return applyAction(prevState, action);
    });
  }, []);

  /**
   * 複数アクションを順次適用
   */
  const dispatchMultiple = useCallback((actionList) => {
    setEngineState((prevState) => {
      if (!prevState) return prevState;
      let newState = prevState;
      for (const action of actionList) {
        newState = applyAction(newState, action);
      }
      return newState;
    });
  }, []);

  /**
   * ゲーム初期化
   */
  const initGame = useCallback((config) => {
    const { deck1, deck2, firstPlayer } = config;
    const initialState = createInitialState({ deck1, deck2, firstPlayer });
    setEngineState(initialState);
    return initialState;
  }, []);

  /**
   * ゲームリセット
   */
  const resetGame = useCallback(() => {
    setEngineState(null);
  }, []);

  /**
   * 既存のuseStateからエンジン状態を同期
   * Phase A-3: 段階的移行用 - useStateの値をengineStateに反映
   * @param {Object} legacyState - 既存形式の状態オブジェクト
   */
  const syncFromLegacy = useCallback((legacyState) => {
    if (!legacyState) return;
    const newState = fromLegacyState(legacyState);
    setEngineState(newState);
  }, []);

  // ========================================
  // 便利なアクションラッパー
  // ========================================

  const summonCard = useCallback((cardIndex, slotIndex) => {
    dispatch(actions.summonCard(cardIndex, slotIndex));
  }, [dispatch]);

  const attack = useCallback((attackerIndex, targetIndex) => {
    dispatch(actions.attack(attackerIndex, targetIndex));
  }, [dispatch]);

  const chargeCard = useCallback((handCardIndex, targetSlotIndex) => {
    dispatch(actions.chargeCard(handCardIndex, targetSlotIndex));
  }, [dispatch]);

  const chargeSP = useCallback((targetSlotIndex) => {
    dispatch(actions.chargeSP(targetSlotIndex));
  }, [dispatch]);

  const executeSkill = useCallback((monsterIndex, skillType) => {
    dispatch(actions.executeSkill(monsterIndex, skillType));
  }, [dispatch]);

  const useMagic = useCallback((cardIndex) => {
    dispatch(actions.useMagic(cardIndex));
  }, [dispatch]);

  const processPhase = useCallback((phaseIndex) => {
    dispatch(actions.processPhase(phaseIndex));
  }, [dispatch]);

  const nextPhase = useCallback(() => {
    dispatch(actions.nextPhase());
  }, [dispatch]);

  const endTurn = useCallback(() => {
    dispatch(actions.endTurn());
  }, [dispatch]);

  // ========================================
  // 状態アクセサ（既存コードとの互換用）
  // ========================================

  const state = engineState;

  // プレイヤー状態を個別に取得（互換性用）
  const p1 = state?.p1 ?? null;
  const p2 = state?.p2 ?? null;

  // 現在のプレイヤー状態
  const currentPlayerData = state ? getPlayer(state, state.currentPlayer) : null;
  const opponentData = state ? getPlayer(state, state.currentPlayer === 1 ? 2 : 1) : null;

  // ゲーム進行状態
  const turn = state?.turn ?? 1;
  const currentPlayer = state?.currentPlayer ?? 1;
  const phase = state?.phase ?? 0;
  const isFirstTurn = state?.isFirstTurn ?? true;
  const winner = state?.winner ?? null;
  const gameStatus = state?.gameStatus ?? GAME_STATUS.PLAYING;
  const logs = state?.logs ?? [];

  // デバッグ用サマリー
  const summary = useMemo(() => {
    return state ? getStateSummary(state) : null;
  }, [state]);

  return {
    // 状態
    state: engineState,
    isInitialized: engineState !== null,

    // ゲーム進行
    turn,
    currentPlayer,
    phase,
    isFirstTurn,
    winner,
    gameStatus,
    logs,

    // プレイヤー状態
    p1,
    p2,
    currentPlayerData,
    opponentData,

    // アクション
    dispatch,
    dispatchMultiple,
    initGame,
    resetGame,
    syncFromLegacy,

    // アクションラッパー
    summonCard,
    attack,
    chargeCard,
    chargeSP,
    executeSkill,
    useMagic,
    processPhase,
    nextPhase,
    endTurn,

    // ユーティリティ
    summary,
    actions, // アクションクリエイター直接アクセス
    PHASES,
    GAME_STATUS,
  };
}

/**
 * GameStateから既存形式の状態オブジェクトを生成
 * magic-spirit.jsxの既存コードとの互換用
 *
 * @param {Object} state - GameState
 * @returns {Object} 既存形式の状態オブジェクト
 */
export function toLegacyState(state) {
  if (!state) return null;

  return {
    // ゲーム進行
    turn: state.turn,
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    isFirstTurn: state.isFirstTurn,
    winner: state.winner,
    logs: state.logs,

    // P1
    p1Life: state.p1.life,
    p1Deck: state.p1.deck,
    p1Hand: state.p1.hand,
    p1Field: state.p1.field,
    p1Graveyard: state.p1.graveyard,
    p1ActiveSP: state.p1.activeSP,
    p1RestedSP: state.p1.restedSP,
    p1FieldCard: state.p1.fieldCard,
    p1PhaseCard: state.p1.phaseCard,
    p1StatusEffects: state.p1.statusEffects,
    p1NextTurnSPBonus: state.p1.nextTurnSPBonus,
    p1MagicBlocked: state.p1.magicBlocked,
    p1SpReduction: state.p1.spReduction,

    // P2
    p2Life: state.p2.life,
    p2Deck: state.p2.deck,
    p2Hand: state.p2.hand,
    p2Field: state.p2.field,
    p2Graveyard: state.p2.graveyard,
    p2ActiveSP: state.p2.activeSP,
    p2RestedSP: state.p2.restedSP,
    p2FieldCard: state.p2.fieldCard,
    p2PhaseCard: state.p2.phaseCard,
    p2StatusEffects: state.p2.statusEffects,
    p2NextTurnSPBonus: state.p2.nextTurnSPBonus,
    p2MagicBlocked: state.p2.magicBlocked,
    p2SpReduction: state.p2.spReduction,

    // ターンフラグ
    chargeUsedThisTurn: state.turnFlags.chargeUsedThisTurn,
  };
}

/**
 * 既存形式の状態からGameStateを生成
 * 既存コードからの移行用
 *
 * @param {Object} legacyState - 既存形式の状態
 * @returns {Object} GameState
 */
export function fromLegacyState(legacyState) {
  return {
    turn: legacyState.turn,
    currentPlayer: legacyState.currentPlayer,
    phase: legacyState.phase,
    isFirstTurn: legacyState.isFirstTurn,
    winner: legacyState.winner,
    gameStatus: legacyState.winner ? GAME_STATUS.GAME_OVER : GAME_STATUS.PLAYING,

    p1: {
      life: legacyState.p1Life,
      deck: legacyState.p1Deck,
      hand: legacyState.p1Hand,
      field: legacyState.p1Field,
      graveyard: legacyState.p1Graveyard,
      activeSP: legacyState.p1ActiveSP,
      restedSP: legacyState.p1RestedSP,
      fieldCard: legacyState.p1FieldCard,
      phaseCard: legacyState.p1PhaseCard,
      statusEffects: legacyState.p1StatusEffects || [],
      nextTurnSPBonus: legacyState.p1NextTurnSPBonus || 0,
      magicBlocked: legacyState.p1MagicBlocked || false,
      spReduction: legacyState.p1SpReduction || 0,
    },

    p2: {
      life: legacyState.p2Life,
      deck: legacyState.p2Deck,
      hand: legacyState.p2Hand,
      field: legacyState.p2Field,
      graveyard: legacyState.p2Graveyard,
      activeSP: legacyState.p2ActiveSP,
      restedSP: legacyState.p2RestedSP,
      fieldCard: legacyState.p2FieldCard,
      phaseCard: legacyState.p2PhaseCard,
      statusEffects: legacyState.p2StatusEffects || [],
      nextTurnSPBonus: legacyState.p2NextTurnSPBonus || 0,
      magicBlocked: legacyState.p2MagicBlocked || false,
      spReduction: legacyState.p2SpReduction || 0,
    },

    turnFlags: {
      chargeUsedThisTurn: legacyState.chargeUsedThisTurn || false,
    },

    triggers: {},
    logs: legacyState.logs || [],
  };
}

export default useGameEngine;
