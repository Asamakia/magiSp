/**
 * Tournament Manager - 大会管理システム
 *
 * 大会のスケジュール、進行、結果管理を担当。
 *
 * Created: 2025-11-29
 */

import { getBaseCompetitorIds, getActiveCompetitorIds, COMPETITORS, getCompetitorDeckNames } from '../data/competitors';
import { calculateTournamentOdds, SIM_COUNTS } from './oddsCalculator';
import { simulateTournament as simTournament, loadCardCache } from './matchSimulator';

// ========================================
// 定数
// ========================================

/**
 * 大会タイプ定義
 */
export const TOURNAMENT_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MAJOR: 'major',
};

/**
 * 大会設定
 */
export const TOURNAMENT_CONFIG = {
  [TOURNAMENT_TYPES.DAILY]: {
    name: 'デイリーカップ',
    participants: 4,
    frequency: 1,        // 毎戦後
    deadline: 3,         // 3戦前に締切
    minBet: 1000,
    maxBet: 10000,
    totalMaxBet: 30000,
  },
  [TOURNAMENT_TYPES.WEEKLY]: {
    name: 'ウィークリー杯',
    participants: 8,
    frequency: 7,        // 7戦ごと
    deadline: 3,         // 3戦前に締切
    minBet: 5000,
    maxBet: 50000,
    totalMaxBet: 150000,
  },
  [TOURNAMENT_TYPES.MAJOR]: {
    name: 'グランドカップ',
    participants: 16,
    frequency: 21,       // 21戦ごと
    deadline: 5,         // 5戦前に締切
    minBet: 20000,
    maxBet: 200000,
    totalMaxBet: 500000,
  },
};

/**
 * 大会ステータス
 */
export const TOURNAMENT_STATUS = {
  ANNOUNCED: 'announced',    // 発表済み（賭け受付前）
  BETTING: 'betting',        // 賭け受付中
  CLOSED: 'closed',          // 締切
  RUNNING: 'running',        // 大会実行中
  FINISHED: 'finished',      // 終了
};

// ========================================
// 大会生成
// ========================================

/**
 * 参加者をランダムに選出
 * @param {number} count - 人数
 * @param {Array<string>} [pool] - 選出元（省略時は有効なNPC全員）
 * @returns {Array<string>} 参加者IDの配列
 */
export function selectParticipants(count, pool = null) {
  const availablePool = pool || getActiveCompetitorIds();

  if (availablePool.length < count) {
    console.warn(`[TournamentManager] 参加者不足: ${availablePool.length} < ${count}`);
    return availablePool;
  }

  // シャッフルして先頭からcount人を選出
  const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * トーナメント表を生成
 * @param {Array<string>} participants - 参加者ID配列
 * @returns {Array<Object>} トーナメント表（試合配列）
 */
export function generateBracket(participants) {
  const numParticipants = participants.length;
  const numRounds = Math.log2(numParticipants);

  if (!Number.isInteger(numRounds)) {
    console.error(`[TournamentManager] 参加者数が2の累乗ではありません: ${numParticipants}`);
    return [];
  }

  const bracket = [];
  let matchId = 1;

  // 1回戦
  for (let i = 0; i < numParticipants; i += 2) {
    bracket.push({
      matchId: matchId++,
      round: 1,
      p1: participants[i],
      p2: participants[i + 1],
      winner: null,
    });
  }

  // 2回戦以降（勝者は後で決定）
  let matchesInRound = numParticipants / 4;
  for (let round = 2; round <= numRounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      bracket.push({
        matchId: matchId++,
        round,
        p1: null,
        p2: null,
        winner: null,
      });
    }
    matchesInRound /= 2;
  }

  return bracket;
}

/**
 * 新しい大会を生成
 * @param {string} type - 大会タイプ
 * @param {number} currentBattle - 現在の戦闘番号
 * @returns {Promise<Object>} 大会データ
 */
export async function createTournament(type, currentBattle) {
  await loadCardCache();

  const config = TOURNAMENT_CONFIG[type];
  if (!config) {
    console.error(`[TournamentManager] 不明な大会タイプ: ${type}`);
    return null;
  }

  // 参加者選出
  const participants = selectParticipants(config.participants);

  // 各参加者のデッキを決定
  const participantDecks = {};
  for (const competitorId of participants) {
    const deckNames = getCompetitorDeckNames(competitorId);
    if (deckNames.length > 0) {
      const randomIndex = Math.floor(Math.random() * deckNames.length);
      const deckKey = deckNames[randomIndex];
      participantDecks[competitorId] = { deckKey };
    }
  }

  // トーナメント表生成
  const bracket = generateBracket(participants);

  // オッズ計算
  console.log(`[TournamentManager] オッズ計算中...`);
  const odds = await calculateTournamentOdds(participants, {
    tournamentType: type,
  });

  const tournament = {
    id: `${type}_${currentBattle}_${Date.now()}`,
    type,
    name: config.name,
    participants,
    participantDecks,
    bracket,
    odds: {
      win: odds.win,
      place: odds.place,
      exacta: odds.exacta,
    },
    announcedAt: currentBattle,
    deadline: currentBattle + config.deadline,
    status: TOURNAMENT_STATUS.BETTING,
    results: null,
    finalWinner: null,
    finalSecond: null,
    createdAt: Date.now(),
  };

  console.log(`[TournamentManager] 大会生成完了: ${tournament.name}`);

  return tournament;
}

// ========================================
// 大会進行
// ========================================

/**
 * 大会を実行（全試合をシミュレート）
 * @param {Object} tournament - 大会データ
 * @returns {Promise<Object>} 更新された大会データ
 */
export async function runTournament(tournament) {
  await loadCardCache();

  console.log(`[TournamentManager] 大会実行: ${tournament.name}`);

  // シミュレーション実行
  const result = await simTournament(tournament.participants);

  if (!result) {
    console.error('[TournamentManager] 大会シミュレーション失敗');
    return tournament;
  }

  // 結果をブラケットに反映
  const updatedBracket = [...tournament.bracket];

  // 各ラウンドの結果を反映
  for (const round of result.rounds) {
    for (const match of round.matches) {
      // 対応する試合を見つけて更新
      const bracketMatch = updatedBracket.find(m =>
        m.round === round.roundNum &&
        ((m.p1 === match.p1 && m.p2 === match.p2) ||
          (m.p1 === null && m.p2 === null)) // 後のラウンドの試合
      );

      if (bracketMatch) {
        bracketMatch.p1 = match.p1;
        bracketMatch.p2 = match.p2;
        bracketMatch.winner = match.winner;
        bracketMatch.p1Life = match.p1Life;
        bracketMatch.p2Life = match.p2Life;
        bracketMatch.turns = match.turns;
      }
    }
  }

  return {
    ...tournament,
    bracket: updatedBracket,
    results: result.rounds,
    finalWinner: result.finalWinner,
    finalSecond: result.finalSecond,
    finalMatch: result.finalMatch,
    status: TOURNAMENT_STATUS.FINISHED,
    finishedAt: Date.now(),
  };
}

/**
 * 大会ステータスを更新
 * @param {Object} tournament - 大会データ
 * @param {number} currentBattle - 現在の戦闘番号
 * @returns {Object} 更新された大会データ
 */
export function updateTournamentStatus(tournament, currentBattle) {
  if (tournament.status === TOURNAMENT_STATUS.FINISHED) {
    return tournament;
  }

  // 締切判定
  if (tournament.status === TOURNAMENT_STATUS.BETTING &&
      currentBattle >= tournament.deadline) {
    return {
      ...tournament,
      status: TOURNAMENT_STATUS.CLOSED,
    };
  }

  return tournament;
}

// ========================================
// スケジュール管理
// ========================================

/**
 * 次回大会のスケジュールを計算
 * @param {number} currentBattle - 現在の戦闘番号
 * @returns {Object} 次回スケジュール
 */
export function calculateNextSchedule(currentBattle) {
  const schedule = {};

  for (const [type, config] of Object.entries(TOURNAMENT_CONFIG)) {
    // 次の開催戦闘番号を計算
    const nextBattle = Math.ceil((currentBattle + 1) / config.frequency) * config.frequency;
    schedule[type] = {
      next: nextBattle,
      deadline: nextBattle - config.deadline,
      battlesUntil: nextBattle - currentBattle,
    };
  }

  return schedule;
}

/**
 * 今開催すべき大会があるかチェック
 * @param {number} currentBattle - 現在の戦闘番号
 * @param {Object} existingTournament - 現在の大会（あれば）
 * @returns {string|null} 開催すべき大会タイプ（null = なし）
 */
export function checkTournamentTrigger(currentBattle, existingTournament = null) {
  // 既に進行中の大会があれば新規開催しない
  if (existingTournament &&
      existingTournament.status !== TOURNAMENT_STATUS.FINISHED) {
    return null;
  }

  // 各タイプをチェック（優先度: major > weekly > daily）
  const priorities = [
    TOURNAMENT_TYPES.MAJOR,
    TOURNAMENT_TYPES.WEEKLY,
    TOURNAMENT_TYPES.DAILY,
  ];

  for (const type of priorities) {
    const config = TOURNAMENT_CONFIG[type];
    if (currentBattle % config.frequency === 0) {
      return type;
    }
  }

  return null;
}

// ========================================
// NPC戦績管理
// ========================================

/**
 * 大会結果からNPC戦績を更新
 * @param {Object} stats - 現在の戦績
 * @param {Object} tournament - 終了した大会
 * @returns {Object} 更新された戦績
 */
export function updateCompetitorStats(stats, tournament) {
  if (tournament.status !== TOURNAMENT_STATUS.FINISHED) {
    return stats;
  }

  const newStats = { ...stats };

  // 各ラウンドの結果を集計
  for (const round of tournament.results || []) {
    for (const match of round.matches) {
      const winnerId = match.winner;
      const loserId = match.p1 === winnerId ? match.p2 : match.p1;

      if (!newStats[winnerId]) {
        newStats[winnerId] = { wins: 0, losses: 0 };
      }
      if (!newStats[loserId]) {
        newStats[loserId] = { wins: 0, losses: 0 };
      }

      newStats[winnerId].wins++;
      newStats[loserId].losses++;
    }
  }

  return newStats;
}

/**
 * NPC戦績を初期化
 * @returns {Object} 初期戦績
 */
export function initializeCompetitorStats() {
  const stats = {};
  for (const id of getActiveCompetitorIds()) {
    stats[id] = { wins: 0, losses: 0 };
  }
  return stats;
}

// ========================================
// ユーティリティ
// ========================================

/**
 * 大会設定を取得
 * @param {string} type - 大会タイプ
 * @returns {Object} 設定
 */
export function getTournamentConfig(type) {
  return TOURNAMENT_CONFIG[type] || null;
}

/**
 * NPC情報を取得
 * @param {string} id - NPC ID
 * @returns {Object} NPC情報
 */
export function getCompetitorInfo(id) {
  return COMPETITORS[id] || null;
}

/**
 * ラウンド名を取得
 * @param {number} round - ラウンド番号
 * @param {number} totalRounds - 総ラウンド数
 * @returns {string} ラウンド名
 */
export function getRoundName(round, totalRounds) {
  if (round === totalRounds) return '決勝';
  if (round === totalRounds - 1) return '準決勝';
  if (round === totalRounds - 2) return '準々決勝';
  return `${round}回戦`;
}
