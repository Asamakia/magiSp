/**
 * Simulator テスト
 *
 * ヘッドレス対戦シミュレーションの動作確認
 */

import {
  simulateGame,
  simulateMultiple,
  calculateOdds,
} from './Simulator';

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
      cost: (i % 3) + 1, // コスト1-3
      attack: 1000 + (i * 50),
      hp: 1000 + (i * 50),
      category: '【テスト】',
      effect: '',
    });
  }
  return cards;
}

describe('Simulator', () => {
  let deck1, deck2;

  beforeEach(() => {
    deck1 = createTestDeck();
    deck2 = createTestDeck();
  });

  describe('simulateGame', () => {
    test('ゲームをシミュレートして結果を返す', () => {
      const result = simulateGame({ deck1, deck2 });

      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('turns');
      expect(result).toHaveProperty('p1Life');
      expect(result).toHaveProperty('p2Life');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('logs');

      // 勝者は1, 2, または 0（引き分け）
      expect([0, 1, 2]).toContain(result.winner);

      // ターン数は1以上
      expect(result.turns).toBeGreaterThanOrEqual(1);

      // 実行時間は0以上（高速なので数ミリ秒のはず）
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('先攻プレイヤーを指定できる', () => {
      const result1 = simulateGame({ deck1, deck2, firstPlayer: 1 });
      const result2 = simulateGame({ deck1, deck2, firstPlayer: 2 });

      // 結果は異なる可能性があるが、両方とも有効な結果
      expect([0, 1, 2]).toContain(result1.winner);
      expect([0, 1, 2]).toContain(result2.winner);
    });

    test('最大ターン数を超えたらライフで勝敗判定', () => {
      const result = simulateGame({ deck1, deck2, maxTurns: 1 });

      // 1ターンで終了
      expect(result.turns).toBeLessThanOrEqual(2);
      expect([0, 1, 2]).toContain(result.winner);
    });
  });

  describe('simulateMultiple', () => {
    test('複数回シミュレートして統計を返す', () => {
      const stats = simulateMultiple({ deck1, deck2, count: 5 });

      expect(stats).toHaveProperty('p1Wins');
      expect(stats).toHaveProperty('p2Wins');
      expect(stats).toHaveProperty('draws');
      expect(stats).toHaveProperty('avgTurns');
      expect(stats).toHaveProperty('avgDuration');
      expect(stats).toHaveProperty('p1WinRate');
      expect(stats).toHaveProperty('p2WinRate');
      expect(stats).toHaveProperty('games');

      // 合計は count と一致
      expect(stats.p1Wins + stats.p2Wins + stats.draws).toBe(5);

      // ゲーム結果の配列
      expect(stats.games).toHaveLength(5);
    });

    test('デフォルト回数は10回', () => {
      const stats = simulateMultiple({ deck1, deck2 });

      expect(stats.p1Wins + stats.p2Wins + stats.draws).toBe(10);
      expect(stats.games).toHaveLength(10);
    });
  });

  describe('calculateOdds', () => {
    test('勝率からオッズを計算', () => {
      const mockStats = {
        p1Wins: 7,
        p2Wins: 3,
        draws: 0,
      };

      const odds = calculateOdds(mockStats);

      expect(odds).toHaveProperty('p1Odds');
      expect(odds).toHaveProperty('p2Odds');
      expect(odds).toHaveProperty('p1WinRate');
      expect(odds).toHaveProperty('p2WinRate');

      // P1の勝率70% → オッズ約1.43
      expect(odds.p1Odds).toBeCloseTo(1.43, 1);

      // P2の勝率30% → オッズ約3.33
      expect(odds.p2Odds).toBeCloseTo(3.33, 1);

      // 勝率（%）
      expect(odds.p1WinRate).toBe(70);
      expect(odds.p2WinRate).toBe(30);
    });

    test('オッズの最小値は1.01', () => {
      const mockStats = {
        p1Wins: 10,
        p2Wins: 0,
        draws: 0,
      };

      const odds = calculateOdds(mockStats);

      // P1は100%勝利 → オッズ1.00だが最小1.01
      expect(odds.p1Odds).toBeGreaterThanOrEqual(1.01);

      // P2は0%勝利 → オッズ計算不能だが最小1.01（実際は高オッズになるべき）
      // この実装では勝率0を0.01として扱う
      expect(odds.p2Odds).toBeGreaterThanOrEqual(1.01);
    });
  });

  describe('パフォーマンス', () => {
    test('10回のシミュレーションが1秒以内に完了', () => {
      const startTime = Date.now();
      const stats = simulateMultiple({ deck1, deck2, count: 10 });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      console.log(`10 games completed in ${duration}ms (avg: ${stats.avgDuration.toFixed(2)}ms per game)`);
    });
  });
});
