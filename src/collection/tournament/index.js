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

// TODO: Phase 1-3で追加予定
// export { tournamentManager } from './systems/tournamentManager';
// export { oddsCalculator } from './systems/oddsCalculator';
// export { bettingSystem } from './systems/bettingSystem';
