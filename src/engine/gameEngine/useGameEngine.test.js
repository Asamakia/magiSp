/**
 * useGameEngine テスト
 *
 * Reactアダプターの動作確認
 */

import { renderHook, act } from '@testing-library/react';
import { useGameEngine, toLegacyState, fromLegacyState } from './useGameEngine';
import { PHASES, GAME_STATUS } from './GameState';

// テスト用デッキ生成
function createTestDeck() {
  const cards = [];
  for (let i = 0; i < 40; i++) {
    cards.push({
      id: `TEST_${i}`,
      uniqueId: `TEST_${i}_${Date.now()}_${Math.random()}`,
      name: `テストモンスター${i}`,
      type: 'monster',
      attribute: '炎',
      cost: (i % 3) + 1,
      attack: 1000 + (i * 50),
      hp: 1000 + (i * 50),
      category: '【テスト】',
      effect: '',
    });
  }
  return cards;
}

describe('useGameEngine', () => {
  let deck1, deck2;

  beforeEach(() => {
    deck1 = createTestDeck();
    deck2 = createTestDeck();
  });

  describe('初期化', () => {
    test('初期状態はnull', () => {
      const { result } = renderHook(() => useGameEngine());

      expect(result.current.state).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    test('initGameで初期化できる', () => {
      const { result } = renderHook(() => useGameEngine());

      act(() => {
        result.current.initGame({ deck1, deck2, firstPlayer: 1 });
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.turn).toBe(1);
      expect(result.current.currentPlayer).toBe(1);
      expect(result.current.phase).toBe(PHASES.TURN_START);
      expect(result.current.p1).not.toBeNull();
      expect(result.current.p2).not.toBeNull();
    });

    test('resetGameで状態をクリアできる', () => {
      const { result } = renderHook(() => useGameEngine());

      act(() => {
        result.current.initGame({ deck1, deck2 });
      });

      expect(result.current.isInitialized).toBe(true);

      act(() => {
        result.current.resetGame();
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.state).toBeNull();
    });
  });

  describe('アクション', () => {
    test('nextPhaseでフェイズを進められる', () => {
      const { result } = renderHook(() => useGameEngine());

      act(() => {
        result.current.initGame({ deck1, deck2, firstPlayer: 1 });
      });

      expect(result.current.phase).toBe(PHASES.TURN_START);

      act(() => {
        result.current.nextPhase();
      });

      expect(result.current.phase).toBe(PHASES.DRAW);
    });

    test('dispatchでアクションを適用できる', () => {
      const { result } = renderHook(() => useGameEngine());

      act(() => {
        result.current.initGame({ deck1, deck2, firstPlayer: 1 });
      });

      act(() => {
        result.current.dispatch(result.current.actions.nextPhase());
      });

      expect(result.current.phase).toBe(PHASES.DRAW);
    });
  });

  describe('状態アクセサ', () => {
    test('プレイヤー状態にアクセスできる', () => {
      const { result } = renderHook(() => useGameEngine());

      act(() => {
        result.current.initGame({ deck1, deck2, firstPlayer: 1 });
      });

      // P1状態
      expect(result.current.p1.life).toBe(6000);
      expect(result.current.p1.hand.length).toBe(5);
      expect(result.current.p1.deck.length).toBe(35);

      // P2状態
      expect(result.current.p2.life).toBe(6000);
      expect(result.current.p2.hand.length).toBe(5);
    });

    test('summaryでデバッグ情報を取得できる', () => {
      const { result } = renderHook(() => useGameEngine());

      act(() => {
        result.current.initGame({ deck1, deck2, firstPlayer: 1 });
      });

      expect(result.current.summary).not.toBeNull();
      expect(result.current.summary.turn).toBe(1);
      expect(result.current.summary.p1.life).toBe(6000);
      expect(result.current.summary.p2.life).toBe(6000);
    });
  });
});

describe('toLegacyState', () => {
  test('GameStateを既存形式に変換できる', () => {
    const { result } = renderHook(() => useGameEngine());
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();

    act(() => {
      result.current.initGame({ deck1, deck2, firstPlayer: 1 });
    });

    const legacy = toLegacyState(result.current.state);

    expect(legacy.turn).toBe(1);
    expect(legacy.currentPlayer).toBe(1);
    expect(legacy.p1Life).toBe(6000);
    expect(legacy.p2Life).toBe(6000);
    expect(legacy.p1Hand.length).toBe(5);
    expect(legacy.p2Hand.length).toBe(5);
  });

  test('nullを渡すとnullを返す', () => {
    expect(toLegacyState(null)).toBeNull();
  });
});

describe('fromLegacyState', () => {
  test('既存形式からGameStateを生成できる', () => {
    const legacyState = {
      turn: 3,
      currentPlayer: 2,
      phase: 2,
      isFirstTurn: false,
      winner: null,
      logs: [{ message: 'test', type: 'info' }],

      p1Life: 5000,
      p1Deck: [],
      p1Hand: [],
      p1Field: [null, null, null, null, null],
      p1Graveyard: [],
      p1ActiveSP: 3,
      p1RestedSP: 0,
      p1FieldCard: null,
      p1PhaseCard: null,
      p1StatusEffects: [],
      p1NextTurnSPBonus: 0,
      p1MagicBlocked: false,
      p1SpReduction: 0,

      p2Life: 4500,
      p2Deck: [],
      p2Hand: [],
      p2Field: [null, null, null, null, null],
      p2Graveyard: [],
      p2ActiveSP: 4,
      p2RestedSP: 1,
      p2FieldCard: null,
      p2PhaseCard: null,
      p2StatusEffects: [],
      p2NextTurnSPBonus: 0,
      p2MagicBlocked: false,
      p2SpReduction: 0,

      chargeUsedThisTurn: true,
    };

    const gameState = fromLegacyState(legacyState);

    expect(gameState.turn).toBe(3);
    expect(gameState.currentPlayer).toBe(2);
    expect(gameState.p1.life).toBe(5000);
    expect(gameState.p2.life).toBe(4500);
    expect(gameState.turnFlags.chargeUsedThisTurn).toBe(true);
    expect(gameState.gameStatus).toBe(GAME_STATUS.PLAYING);
  });
});
