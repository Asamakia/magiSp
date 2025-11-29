/**
 * GameEngine - ゲームエンジンのメインエクスポート
 *
 * ヘッドレス（UIなし）でゲームを実行可能な純粋JavaScriptエンジン。
 * React hooksに依存せず、状態をプレーンオブジェクトで管理。
 */

// GameState - 状態管理
export {
  // 定数
  GAME_STATUS,
  PHASES,
  PHASE_NAMES,

  // 初期化
  createInitialState,
  createPlayerState,
  createTurnFlags,

  // 状態アクセス
  getPlayer,
  getOpponent,
  getCurrentPlayer,
  getCurrentOpponent,
  getOpponentNumber,

  // 状態更新
  updatePlayer,
  updateTurnFlags,
  updateGameProgress,
  addLog,

  // 判定
  isGameOver,
  checkWinner,
  canSummonCard,
  canUseMagic,
  canMonsterAttack,
  hasMonsterOnField,
  getEmptySlotCount,
  getFirstEmptySlot,

  // デバッグ
  getStateSummary,
} from './GameState';

// GameActions - アクション管理
export {
  // アクションタイプ
  ACTION_TYPES,

  // アクション作成
  createAction,
  actions,

  // アクション適用
  applyAction,
  applyActions,
} from './GameActions';

// Simulator - ヘッドレス対戦シミュレーター
export {
  SIMULATION_CONFIG,
  simulateGame,
  simulateMultiple,
  calculateOdds,
} from './Simulator';

// Tournament - トーナメントシステム
export {
  TOURNAMENT_TYPES,
  NPC_PARTICIPANTS,
  winRateToOdds,
  calculateNPCOdds,
  selectParticipants,
  generateBracket,
  simulateMatch,
  simulateTournament,
  createTournament,
  runTournament,
  calculatePayout,
  precalculateOdds,
} from './Tournament';

// Pure Effect Helpers - 状態ベース版効果ヘルパー
export {
  getPlayerContextPure,
  millDeckPure,
  drawCardsPure,
  dealDamagePure,
  healLifePure,
  modifyAttackPure,
  modifyHPPure,
  destroyMonsterPure,
  searchCardPure,
  reviveFromGraveyardPure,
  addSPPure,
  reduceSPPure,
} from './effectHelpersPure';

// Pure Trigger Engine - 状態ベース版トリガーエンジン
export {
  parseCardTriggers,
  registerCardTriggersPure,
  unregisterCardTriggersPure,
  clearAllTriggersPure,
  fireTriggerPure,
  resetTurnFlagsPure,
  getCardTriggersPure,
  getTriggerStatsPure,
} from './triggerEnginePure';
