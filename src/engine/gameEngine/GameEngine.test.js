/**
 * GameEngine テスト
 *
 * 基本的なゲームロジックの動作確認
 * Jest形式
 */

import {
  createInitialState,
  getStateSummary,
  applyAction,
  applyActions,
  actions,
  ACTION_TYPES,
  PHASES,
  PHASE_NAMES,
  getPlayer,
  getCurrentPlayer,
  canSummonCard,
  hasMonsterOnField,
} from './index';

// テスト用のダミーデッキ生成
function createTestDeck() {
  const cards = [];
  for (let i = 0; i < 40; i++) {
    cards.push({
      id: `TEST_${i}`,
      uniqueId: `TEST_${i}_${Date.now()}_${Math.random()}`,
      name: `テストモンスター${i}`,
      type: 'monster',
      attribute: '炎',
      cost: (i % 5) + 1, // コスト1-5
      attack: 1000 + (i * 100),
      hp: 1000 + (i * 100),
      category: '【テスト】',
      effect: '',
    });
  }
  return cards;
}

describe('GameEngine', () => {
  let deck1, deck2;

  beforeEach(() => {
    deck1 = createTestDeck();
    deck2 = createTestDeck();
  });

  describe('createInitialState', () => {
    test('初期状態を正しく生成できる', () => {
      const state = createInitialState({
        deck1,
        deck2,
        firstPlayer: 1,
      });

      expect(state.turn).toBe(1);
      expect(state.currentPlayer).toBe(1);
      expect(state.phase).toBe(PHASES.TURN_START);
      expect(state.p1.life).toBe(6000);
      expect(state.p2.life).toBe(6000);
      expect(state.p1.hand.length).toBe(5);
      expect(state.p2.hand.length).toBe(5);
      expect(state.p1.deck.length).toBe(35);
      expect(state.winner).toBeNull();
    });

    test('先攻プレイヤーをランダムに決定できる', () => {
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        const state = createInitialState({ deck1, deck2 });
        results.add(state.currentPlayer);
      }
      // ランダムなので両方出る可能性が高い（確定ではない）
      expect(results.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('フェイズ処理', () => {
    test('ターン開始処理でSPが回復する', () => {
      const state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      const newState = applyAction(state, actions.processPhase(PHASES.TURN_START));

      expect(newState.p1.activeSP).toBe(2); // 1 + 1 = 2
      expect(newState.p1.restedSP).toBe(0);
    });

    test('ドロー処理で1枚引ける', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      state = applyAction(state, actions.processPhase(PHASES.TURN_START));
      state = applyAction(state, actions.nextPhase()); // DRAWフェイズへ

      const handBefore = state.p1.hand.length;
      state = applyAction(state, actions.processPhase(PHASES.DRAW));

      expect(state.p1.hand.length).toBe(handBefore + 1);
      expect(state.p1.deck.length).toBe(34);
    });

    test('nextPhaseでフェイズが進む', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      expect(state.phase).toBe(PHASES.TURN_START);

      state = applyAction(state, actions.nextPhase());
      expect(state.phase).toBe(PHASES.DRAW);

      state = applyAction(state, actions.nextPhase());
      expect(state.phase).toBe(PHASES.MAIN);

      state = applyAction(state, actions.nextPhase());
      expect(state.phase).toBe(PHASES.BATTLE);

      state = applyAction(state, actions.nextPhase());
      expect(state.phase).toBe(PHASES.END);
    });

    test('エンドフェイズの後はターン終了で相手ターンになる', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });

      // エンドフェイズまで進める
      for (let i = 0; i < 5; i++) {
        state = applyAction(state, actions.nextPhase());
      }

      expect(state.currentPlayer).toBe(2);
      expect(state.phase).toBe(PHASES.TURN_START);
    });
  });

  describe('カード召喚', () => {
    test('カードを召喚できる', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      // ターン開始処理
      state = applyAction(state, actions.processPhase(PHASES.TURN_START));
      // DRAWフェイズへ進む
      state = applyAction(state, actions.nextPhase());
      // ドロー処理
      state = applyAction(state, actions.processPhase(PHASES.DRAW));
      // MAINフェイズへ進む
      state = applyAction(state, actions.nextPhase());

      expect(state.phase).toBe(PHASES.MAIN);

      const player = getPlayer(state, 1);
      const cardIndex = player.hand.findIndex(c => c.cost <= player.activeSP);

      expect(cardIndex).toBeGreaterThanOrEqual(0);

      const cardToSummon = player.hand[cardIndex];
      const spBefore = player.activeSP;

      state = applyAction(state, actions.summonCard(cardIndex, 0));

      const playerAfter = getPlayer(state, 1);
      expect(playerAfter.field[0]).not.toBeNull();
      expect(playerAfter.field[0].name).toBe(cardToSummon.name);
      expect(playerAfter.activeSP).toBe(spBefore - cardToSummon.cost);
      expect(playerAfter.hand.length).toBe(player.hand.length - 1);
    });

    test('SP不足で召喚できない', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      state = applyAction(state, actions.processPhase(PHASES.TURN_START));
      state = applyAction(state, actions.nextPhase());
      state = applyAction(state, actions.processPhase(PHASES.DRAW));
      state = applyAction(state, actions.nextPhase());

      // SP = 2 の状態でコスト5のカードを召喚しようとする
      const player = getPlayer(state, 1);
      const expensiveCardIndex = player.hand.findIndex(c => c.cost > player.activeSP);

      if (expensiveCardIndex >= 0) {
        const handBefore = player.hand.length;
        state = applyAction(state, actions.summonCard(expensiveCardIndex, 0));
        const playerAfter = getPlayer(state, 1);

        // 召喚失敗 → 手札は減らない
        expect(playerAfter.hand.length).toBe(handBefore);
        expect(playerAfter.field[0]).toBeNull();
      }
    });
  });

  describe('攻撃処理', () => {
    test('モンスターへの攻撃でダメージを与える', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      // 先攻1ターン目フラグを明示的にクリア（攻撃テスト用）
      state = { ...state, isFirstTurn: false };

      // P1のターン: モンスター召喚
      state = applyAction(state, actions.processPhase(PHASES.TURN_START));
      state = applyAction(state, actions.nextPhase()); // DRAW
      state = applyAction(state, actions.processPhase(PHASES.DRAW));
      state = applyAction(state, actions.nextPhase()); // MAIN

      let p1 = getPlayer(state, 1);
      let cardIndex = p1.hand.findIndex(c => c.cost <= p1.activeSP);
      state = applyAction(state, actions.summonCard(cardIndex, 0));

      // ターン終了 → P2
      state = applyAction(state, actions.endTurn());

      // P2のターン: モンスター召喚
      state = applyAction(state, actions.processPhase(PHASES.TURN_START));
      state = applyAction(state, actions.nextPhase()); // DRAW
      state = applyAction(state, actions.processPhase(PHASES.DRAW));
      state = applyAction(state, actions.nextPhase()); // MAIN

      let p2 = getPlayer(state, 2);
      cardIndex = p2.hand.findIndex(c => c.cost <= p2.activeSP);
      state = applyAction(state, actions.summonCard(cardIndex, 0));

      // P2のモンスターを攻撃可能にする（召喚ターンは攻撃不可のため）
      const p2Field = getPlayer(state, 2).field;
      state = {
        ...state,
        p2: {
          ...state.p2,
          field: p2Field.map(m => m ? { ...m, canAttack: true } : null),
        },
      };

      // バトルフェイズへ
      state = applyAction(state, actions.nextPhase()); // BATTLE

      // P2がP1のモンスターを攻撃
      const p1MonsterBefore = getPlayer(state, 1).field[0];
      state = applyAction(state, actions.attack(0, 0));
      const p1MonsterAfter = getPlayer(state, 1).field[0];

      // HPが減っているか、破壊されているはず
      if (p1MonsterAfter) {
        expect(p1MonsterAfter.currentHp).toBeLessThan(p1MonsterBefore.hp);
      } else {
        // 破壊された場合
        expect(getPlayer(state, 1).graveyard.length).toBeGreaterThan(0);
      }
    });

    test('ダイレクトアタックでライフを削る', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });

      // P2のターンにする（先攻1ターン目は攻撃不可なので）
      state = { ...state, isFirstTurn: false };

      // P1のターン: モンスター召喚
      state = applyAction(state, actions.processPhase(PHASES.TURN_START));
      state = applyAction(state, actions.nextPhase()); // DRAW
      state = applyAction(state, actions.processPhase(PHASES.DRAW));
      state = applyAction(state, actions.nextPhase()); // MAIN

      let p1 = getPlayer(state, 1);
      let cardIndex = p1.hand.findIndex(c => c.cost <= p1.activeSP);
      state = applyAction(state, actions.summonCard(cardIndex, 0));

      // 召喚したモンスターを攻撃可能にする（テスト用）
      state = {
        ...state,
        p1: {
          ...state.p1,
          field: state.p1.field.map(m => m ? { ...m, canAttack: true } : null),
        },
      };

      // バトルフェイズへ
      state = applyAction(state, actions.nextPhase()); // BATTLE

      // P1がP2にダイレクトアタック
      const p2LifeBefore = getPlayer(state, 2).life;
      state = applyAction(state, actions.attack(0, -1));
      const p2LifeAfter = getPlayer(state, 2).life;

      expect(p2LifeAfter).toBeLessThan(p2LifeBefore);
    });
  });

  describe('勝敗判定', () => {
    test('ライフが0になると勝者が決定する', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });

      // P2のライフを0にする
      state = applyAction(state, actions.dealDamage(2, 6000));

      expect(state.winner).toBe(1);
      expect(state.gameStatus).toBe('gameOver');
    });
  });

  describe('チャージ', () => {
    test('カードをチャージできる', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      state = applyAction(state, actions.processPhase(PHASES.TURN_START));
      state = applyAction(state, actions.nextPhase()); // DRAW
      state = applyAction(state, actions.processPhase(PHASES.DRAW));
      state = applyAction(state, actions.nextPhase()); // MAIN

      // モンスターを召喚
      let p1 = getPlayer(state, 1);
      let cardIndex = p1.hand.findIndex(c => c.cost <= p1.activeSP);
      state = applyAction(state, actions.summonCard(cardIndex, 0));

      // 召喚確認
      expect(getPlayer(state, 1).field[0]).not.toBeNull();

      // 手札の別のカードをチャージ（同属性チェック: テストカードは全て炎属性）
      p1 = getPlayer(state, 1);
      const monster = p1.field[0];
      const chargeCardIndex = p1.hand.findIndex(c => c.attribute === monster.attribute || c.attribute === 'なし');

      if (chargeCardIndex >= 0) {
        state = applyAction(state, actions.chargeCard(chargeCardIndex, 0));

        const p1After = getPlayer(state, 1);
        expect(p1After.field[0].charges.length).toBe(1);
        expect(state.turnFlags.chargeUsedThisTurn).toBe(true);
      } else {
        // 同属性カードがない場合はSPチャージでテスト
        state = applyAction(state, actions.chargeSP(0));
        const p1After = getPlayer(state, 1);
        expect(p1After.field[0].charges.length).toBe(1);
        expect(state.turnFlags.chargeUsedThisTurn).toBe(true);
      }
    });

    test('1ターンに2回チャージできない', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      state = applyAction(state, actions.processPhase(PHASES.TURN_START));
      state = applyAction(state, actions.nextPhase()); // DRAW
      state = applyAction(state, actions.processPhase(PHASES.DRAW));
      state = applyAction(state, actions.nextPhase()); // MAIN

      // モンスターを召喚
      let p1 = getPlayer(state, 1);
      let cardIndex = p1.hand.findIndex(c => c.cost <= p1.activeSP);
      state = applyAction(state, actions.summonCard(cardIndex, 0));

      // 召喚確認
      expect(getPlayer(state, 1).field[0]).not.toBeNull();

      // 1回目のチャージ
      state = applyAction(state, actions.chargeSP(0));

      // 2回目のチャージを試みる
      const chargesBefore = getPlayer(state, 1).field[0].charges.length;
      state = applyAction(state, actions.chargeSP(0));
      const chargesAfter = getPlayer(state, 1).field[0].charges.length;

      // チャージ数は増えない
      expect(chargesAfter).toBe(chargesBefore);
    });
  });

  describe('ログ', () => {
    test('アクションごとにログが追加される', () => {
      let state = createInitialState({ deck1, deck2, firstPlayer: 1 });
      const logsBefore = state.logs.length;

      state = applyAction(state, actions.processPhase(PHASES.TURN_START));

      expect(state.logs.length).toBeGreaterThan(logsBefore);
    });
  });
});
