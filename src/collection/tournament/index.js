/**
 * Tournament Module
 * 大会システムのエクスポート
 *
 * Created: 2025-11-29
 */

// データ
export {
  COMPETITORS,
  DECKS,
  getCompetitorDeckNames,
  getDeck,
  getRandomDeckForCompetitor,
  expandDeckToCardIds,
  getBaseCompetitorIds,
  getAllCompetitorIds,
  getActiveCompetitorIds,
  getCompetitorDisplayName,
  getCompetitorPortrait,
} from './data/competitors';

// 試合シミュレーション
export {
  loadCardCache,
  getCardById,
  convertDeckToCards,
  getCompetitorDeckCards,
  simulateMatch,
  simulateMatchMultiple,
  simulateTournament,
} from './systems/matchSimulator';

// オッズ計算
export {
  PAYOUT_RATES,
  SIM_COUNTS,
  MIN_ODDS,
  calculateOddsFromProbability,
  calculateTournamentOdds,
  sortOddsByPopularity,
  getTopExactaOdds,
  calculatePayout,
  judgeBetResult,
  judgeBetsResults,
} from './systems/oddsCalculator';

// 大会管理
export {
  TOURNAMENT_TYPES,
  TOURNAMENT_CONFIG,
  TOURNAMENT_STATUS,
  selectParticipants,
  generateBracket,
  createTournament,
  runTournament,
  updateTournamentStatus,
  calculateNextSchedule,
  checkTournamentTrigger,
  updateCompetitorStats,
  initializeCompetitorStats,
  getTournamentConfig,
  getCompetitorInfo,
  getRoundName,
} from './systems/tournamentManager';

// 賭けシステム
export {
  BET_TYPES,
  BET_TYPE_NAMES,
  validateBet,
  createBet,
  addBet,
  removeBet,
  clearBets,
  calculatePayouts,
  createHistoryEntry,
  updateTotalStats,
  getTotalBetAmount,
  getOdds,
  getRemainingBetLimit,
  getBetTypeDescription,
} from './systems/bettingSystem';

// デッキ情報購入システム
export {
  INFO_TYPES,
  INFO_TYPE_NAMES,
  INFO_PRICES,
  getInfoPrice,
  validateInfoPurchase,
  purchaseInfo,
  getPurchasedInfo,
  hasInfo,
  getDeckType,
  getKeyCards,
  getFullList,
  getCompetitorName,
  getAnalysisComment,
} from './systems/deckInfoSystem';

// コンポーネント
export { default as TournamentViewer } from './components/TournamentViewer';
export { default as TournamentTab } from './components/TournamentTab';
