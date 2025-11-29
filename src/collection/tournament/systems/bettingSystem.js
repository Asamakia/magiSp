/**
 * Betting System - 賭けシステム
 *
 * 大会への賭けの購入、管理、払い戻しを担当。
 *
 * Created: 2025-11-29
 */

import { TOURNAMENT_CONFIG, TOURNAMENT_STATUS } from './tournamentManager';
import { judgeBetsResults } from './oddsCalculator';

// ========================================
// 賭け種類
// ========================================

export const BET_TYPES = {
  WIN: 'win',       // 単勝: 優勝者を当てる
  PLACE: 'place',   // 複勝: 決勝進出を当てる
  EXACTA: 'exacta', // 2連単: 1位-2位を順番通りに当てる
};

export const BET_TYPE_NAMES = {
  [BET_TYPES.WIN]: '単勝',
  [BET_TYPES.PLACE]: '複勝',
  [BET_TYPES.EXACTA]: '2連単',
};

// ========================================
// 賭けバリデーション
// ========================================

/**
 * 賭けが有効かチェック
 * @param {Object} bet - 賭け情報
 * @param {Object} tournament - 大会データ
 * @param {Array} currentBets - 現在の賭けリスト
 * @param {number} playerGold - プレイヤーの所持金
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateBet(bet, tournament, currentBets, playerGold) {
  const { type, target, amount } = bet;
  const config = TOURNAMENT_CONFIG[tournament.type];

  if (!config) {
    return { valid: false, error: '不明な大会タイプです' };
  }

  // 大会ステータスチェック
  if (tournament.status !== TOURNAMENT_STATUS.BETTING) {
    return { valid: false, error: '賭け受付期間外です' };
  }

  // 賭け種類チェック
  if (!Object.values(BET_TYPES).includes(type)) {
    return { valid: false, error: '不明な賭け種類です' };
  }

  // 対象チェック
  if (type === BET_TYPES.WIN || type === BET_TYPES.PLACE) {
    if (!tournament.participants.includes(target)) {
      return { valid: false, error: '対象が参加者に含まれていません' };
    }
  } else if (type === BET_TYPES.EXACTA) {
    const [first, second] = target.split('-');
    if (!tournament.participants.includes(first) ||
        !tournament.participants.includes(second) ||
        first === second) {
      return { valid: false, error: '無効な2連単の組み合わせです' };
    }
  }

  // 金額チェック
  if (typeof amount !== 'number' || amount <= 0) {
    return { valid: false, error: '無効な金額です' };
  }

  if (amount < config.minBet) {
    return { valid: false, error: `最低賭け金は${config.minBet.toLocaleString()}Gです` };
  }

  if (amount > config.maxBet) {
    return { valid: false, error: `最大賭け金は${config.maxBet.toLocaleString()}Gです` };
  }

  // 合計金額チェック
  const currentTotal = currentBets.reduce((sum, b) => sum + b.amount, 0);
  if (currentTotal + amount > config.totalMaxBet) {
    const remaining = config.totalMaxBet - currentTotal;
    return {
      valid: false,
      error: `合計賭け金上限を超えます（残り${remaining.toLocaleString()}G）`,
    };
  }

  // 所持金チェック
  if (amount > playerGold) {
    return { valid: false, error: '所持金が不足しています' };
  }

  return { valid: true };
}

// ========================================
// 賭け操作
// ========================================

/**
 * 新しい賭けを作成
 * @param {string} type - 賭け種類
 * @param {string} target - 対象（NPC ID or "id1-id2"）
 * @param {number} amount - 賭け金
 * @param {number} odds - オッズ
 * @returns {Object} 賭けオブジェクト
 */
export function createBet(type, target, amount, odds) {
  return {
    id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    target,
    amount,
    odds,
    createdAt: Date.now(),
  };
}

/**
 * 賭けを追加
 * @param {Array} currentBets - 現在の賭けリスト
 * @param {Object} bet - 追加する賭け
 * @returns {Array} 更新された賭けリスト
 */
export function addBet(currentBets, bet) {
  return [...currentBets, bet];
}

/**
 * 賭けを削除
 * @param {Array} currentBets - 現在の賭けリスト
 * @param {string} betId - 削除する賭けのID
 * @returns {Array} 更新された賭けリスト
 */
export function removeBet(currentBets, betId) {
  return currentBets.filter(b => b.id !== betId);
}

/**
 * 全ての賭けをクリア
 * @returns {Array} 空の賭けリスト
 */
export function clearBets() {
  return [];
}

// ========================================
// 払い戻し処理
// ========================================

/**
 * 大会結果から払い戻しを計算
 * @param {Array} bets - 賭けリスト
 * @param {Object} tournament - 終了した大会
 * @returns {Object} 払い戻し結果
 */
export function calculatePayouts(bets, tournament) {
  // PENDING_REWARD (報酬受け取り待ち) と FINISHED (終了) の両方で計算を許可
  if (tournament.status !== TOURNAMENT_STATUS.FINISHED &&
      tournament.status !== TOURNAMENT_STATUS.PENDING_REWARD) {
    return {
      bets: [],
      totalBet: 0,
      totalPayout: 0,
      totalProfit: 0,
      wonCount: 0,
      totalCount: 0,
    };
  }

  const result = {
    finalWinner: tournament.finalWinner,
    finalSecond: tournament.finalSecond,
  };

  return judgeBetsResults(bets, result);
}

/**
 * 払い戻し結果を大会履歴に記録
 * @param {Object} tournament - 大会データ
 * @param {Array} bets - 賭けリスト
 * @param {Object} payoutResult - 払い戻し結果
 * @returns {Object} 履歴エントリ
 */
export function createHistoryEntry(tournament, bets, payoutResult) {
  return {
    id: tournament.id,
    type: tournament.type,
    name: tournament.name,
    date: tournament.finishedAt || Date.now(),
    participants: tournament.participants,
    results: tournament.results,
    finalWinner: tournament.finalWinner,
    finalSecond: tournament.finalSecond,
    bets: payoutResult.bets,
    totalBet: payoutResult.totalBet,
    totalPayout: payoutResult.totalPayout,
    totalProfit: payoutResult.totalProfit,
    wonCount: payoutResult.wonCount,
  };
}

// ========================================
// 統計更新
// ========================================

/**
 * 通算成績を更新
 * @param {Object} totalStats - 現在の通算成績
 * @param {Object} payoutResult - 払い戻し結果
 * @returns {Object} 更新された通算成績
 */
export function updateTotalStats(totalStats, payoutResult) {
  return {
    totalBets: totalStats.totalBets + payoutResult.totalCount,
    totalWins: totalStats.totalWins + payoutResult.wonCount,
    totalBetAmount: totalStats.totalBetAmount + payoutResult.totalBet,
    totalPayout: totalStats.totalPayout + payoutResult.totalPayout,
    totalProfit: totalStats.totalProfit + payoutResult.totalProfit,
  };
}

// ========================================
// ヘルパー
// ========================================

/**
 * 賭け金額の合計を取得
 * @param {Array} bets - 賭けリスト
 * @returns {number} 合計金額
 */
export function getTotalBetAmount(bets) {
  return bets.reduce((sum, b) => sum + b.amount, 0);
}

/**
 * オッズを取得
 * @param {Object} tournament - 大会データ
 * @param {string} type - 賭け種類
 * @param {string} target - 対象
 * @returns {number|null} オッズ
 */
export function getOdds(tournament, type, target) {
  if (!tournament.odds) return null;

  switch (type) {
    case BET_TYPES.WIN:
      return tournament.odds.win?.[target] || null;
    case BET_TYPES.PLACE:
      return tournament.odds.place?.[target] || null;
    case BET_TYPES.EXACTA:
      return tournament.odds.exacta?.[target] || null;
    default:
      return null;
  }
}

/**
 * 残り賭け可能金額を取得
 * @param {Object} tournament - 大会データ
 * @param {Array} currentBets - 現在の賭けリスト
 * @returns {number} 残り金額
 */
export function getRemainingBetLimit(tournament, currentBets) {
  const config = TOURNAMENT_CONFIG[tournament.type];
  if (!config) return 0;

  const currentTotal = getTotalBetAmount(currentBets);
  return Math.max(0, config.totalMaxBet - currentTotal);
}

/**
 * 賭け種類の説明を取得
 * @param {string} type - 賭け種類
 * @returns {string} 説明
 */
export function getBetTypeDescription(type) {
  switch (type) {
    case BET_TYPES.WIN:
      return '優勝者を当てる';
    case BET_TYPES.PLACE:
      return '決勝進出（優勝or準優勝）を当てる';
    case BET_TYPES.EXACTA:
      return '1位と2位を順番通りに当てる';
    default:
      return '';
  }
}
