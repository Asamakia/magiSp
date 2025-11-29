/**
 * Odds Calculator - オッズ計算システム
 *
 * シミュレーションベースでオッズを計算する。
 * 競馬方式のペイアウト率を適用。
 *
 * Created: 2025-11-29
 */

import { simulateTournament, loadCardCache } from './matchSimulator';

// ========================================
// 定数
// ========================================

/**
 * ペイアウト率（控除率を考慮）
 */
export const PAYOUT_RATES = {
  win: 0.80,      // 単勝: 80%払い戻し
  place: 0.75,    // 複勝: 75%払い戻し
  exacta: 0.72,   // 2連単: 72%払い戻し
};

/**
 * シミュレーション回数（大会タイプ別）
 */
export const SIM_COUNTS = {
  daily: 60,      // デイリー: 少なめ → 揺らぎ大
  weekly: 80,     // ウィークリー: 中程度
  major: 120,     // グランド: 多め → 安定
};

/**
 * 最低オッズ
 */
export const MIN_ODDS = 1.1;

// ========================================
// オッズ計算
// ========================================

/**
 * 確率からオッズを計算
 * @param {number} probability - 確率（0-1）
 * @param {string} betType - 賭け種類（'win', 'place', 'exacta'）
 * @returns {number} オッズ（最低1.1倍）
 */
export function calculateOddsFromProbability(probability, betType) {
  if (probability <= 0) return 99.9; // 最大オッズ

  const payoutRate = PAYOUT_RATES[betType] || 0.80;
  const rawOdds = (1 / probability) * payoutRate;

  // 小数第1位で切り捨て、最低1.1倍
  return Math.max(MIN_ODDS, Math.floor(rawOdds * 10) / 10);
}

/**
 * トーナメントをN回シミュレートしてオッズを計算
 * @param {Array<string>} participantIds - 参加者IDの配列
 * @param {Object} options - オプション
 * @param {number} [options.simCount] - シミュレーション回数
 * @param {string} [options.tournamentType='daily'] - 大会タイプ
 * @returns {Promise<Object>} オッズデータ
 */
export async function calculateTournamentOdds(participantIds, options = {}) {
  await loadCardCache();

  const { tournamentType = 'daily' } = options;
  const simCount = options.simCount || SIM_COUNTS[tournamentType] || 60;

  // 結果カウンター初期化
  const winCounts = {};        // 優勝回数
  const placeCounts = {};      // 決勝進出回数
  const exactaCounts = {};     // 1位-2位組み合わせ回数

  for (const id of participantIds) {
    winCounts[id] = 0;
    placeCounts[id] = 0;
  }

  // シミュレーション実行
  console.log(`[OddsCalculator] ${simCount}回シミュレーション開始...`);
  const startTime = Date.now();

  for (let i = 0; i < simCount; i++) {
    const result = await simulateTournament(participantIds);
    if (!result) continue;

    // 優勝者カウント
    if (result.finalWinner) {
      winCounts[result.finalWinner]++;
    }

    // 決勝進出者カウント（優勝者と準優勝者）
    if (result.finalWinner) {
      placeCounts[result.finalWinner]++;
    }
    if (result.finalSecond) {
      placeCounts[result.finalSecond]++;
    }

    // 2連単（1位-2位順番）
    if (result.finalWinner && result.finalSecond) {
      const key = `${result.finalWinner}-${result.finalSecond}`;
      exactaCounts[key] = (exactaCounts[key] || 0) + 1;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[OddsCalculator] シミュレーション完了: ${duration}ms`);

  // オッズ計算
  const winOdds = {};
  const placeOdds = {};
  const exactaOdds = {};

  // 単勝オッズ
  for (const id of participantIds) {
    const probability = winCounts[id] / simCount;
    winOdds[id] = calculateOddsFromProbability(probability, 'win');
  }

  // 複勝オッズ
  for (const id of participantIds) {
    const probability = placeCounts[id] / simCount;
    placeOdds[id] = calculateOddsFromProbability(probability, 'place');
  }

  // 2連単オッズ（全組み合わせ）
  for (const id1 of participantIds) {
    for (const id2 of participantIds) {
      if (id1 === id2) continue;
      const key = `${id1}-${id2}`;
      const probability = (exactaCounts[key] || 0) / simCount;
      exactaOdds[key] = calculateOddsFromProbability(probability, 'exacta');
    }
  }

  return {
    participants: participantIds,
    simCount,
    duration,
    win: winOdds,
    place: placeOdds,
    exacta: exactaOdds,
    // デバッグ用
    _winCounts: winCounts,
    _placeCounts: placeCounts,
    _exactaCounts: exactaCounts,
  };
}

/**
 * オッズを人気順にソート
 * @param {Object} odds - オッズオブジェクト（{id: odds}）
 * @returns {Array<{id: string, odds: number}>} ソート済み配列
 */
export function sortOddsByPopularity(odds) {
  return Object.entries(odds)
    .map(([id, oddsValue]) => ({ id, odds: oddsValue }))
    .sort((a, b) => a.odds - b.odds);
}

/**
 * 2連単オッズを人気順に取得（上位N件）
 * @param {Object} exactaOdds - 2連単オッズ
 * @param {number} limit - 取得件数
 * @returns {Array<{key: string, odds: number, first: string, second: string}>}
 */
export function getTopExactaOdds(exactaOdds, limit = 5) {
  return Object.entries(exactaOdds)
    .map(([key, odds]) => {
      const [first, second] = key.split('-');
      return { key, odds, first, second };
    })
    .sort((a, b) => a.odds - b.odds)
    .slice(0, limit);
}

// ========================================
// 払い戻し計算
// ========================================

/**
 * 払い戻し金額を計算
 * @param {number} betAmount - 賭け金
 * @param {number} odds - オッズ
 * @returns {number} 払い戻し金額
 */
export function calculatePayout(betAmount, odds) {
  return Math.floor(betAmount * odds);
}

/**
 * 賭け結果を判定
 * @param {Object} bet - 賭け情報
 * @param {string} bet.type - 賭け種類（'win', 'place', 'exacta'）
 * @param {string} bet.target - 対象ID（単勝・複勝）or "id1-id2"（2連単）
 * @param {number} bet.amount - 賭け金
 * @param {number} bet.odds - 賭けた時のオッズ
 * @param {Object} result - 大会結果
 * @param {string} result.finalWinner - 優勝者ID
 * @param {string} result.finalSecond - 準優勝者ID
 * @returns {Object} 判定結果
 */
export function judgeBetResult(bet, result) {
  let won = false;
  let payout = 0;

  switch (bet.type) {
    case 'win':
      // 単勝: 優勝者を当てる
      won = bet.target === result.finalWinner;
      break;

    case 'place':
      // 複勝: 決勝進出（優勝or準優勝）を当てる
      won = bet.target === result.finalWinner || bet.target === result.finalSecond;
      break;

    case 'exacta':
      // 2連単: 1位-2位を順番通りに当てる
      const expectedKey = bet.target;
      const actualKey = `${result.finalWinner}-${result.finalSecond}`;
      won = expectedKey === actualKey;
      break;
  }

  if (won) {
    payout = calculatePayout(bet.amount, bet.odds);
  }

  return {
    ...bet,
    won,
    payout,
    profit: won ? payout - bet.amount : -bet.amount,
  };
}

/**
 * 複数の賭け結果をまとめて判定
 * @param {Array<Object>} bets - 賭け配列
 * @param {Object} result - 大会結果
 * @returns {Object} まとめた判定結果
 */
export function judgeBetsResults(bets, result) {
  const judgedBets = bets.map(bet => judgeBetResult(bet, result));

  const totalBet = judgedBets.reduce((sum, b) => sum + b.amount, 0);
  const totalPayout = judgedBets.reduce((sum, b) => sum + b.payout, 0);
  const totalProfit = judgedBets.reduce((sum, b) => sum + b.profit, 0);
  const wonCount = judgedBets.filter(b => b.won).length;

  return {
    bets: judgedBets,
    totalBet,
    totalPayout,
    totalProfit,
    wonCount,
    totalCount: judgedBets.length,
  };
}
