import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  INITIAL_LIFE,
  INITIAL_SP,
  MAX_SP,
  INITIAL_HAND_SIZE,
  COUNTER_ATTACK_RATE,
  PHASES,
  RULE_LONE_WARRIOR,
  RULE_PIERCING_DAMAGE,
  PIERCING_DAMAGE_RATE,
  LONE_WARRIOR_BONUS,
} from './utils/constants';
import { createDeck, createMonsterInstance, createDeckFromPrebuilt, createDeckFromUserDeck } from './utils/helpers';
import { getDeckOptions } from './decks/prebuiltDecks';
import { loadCardsFromCSV, SAMPLE_CARDS } from './utils/cardManager';
import { executeSkillEffects } from './engine/effectEngine';
import {
  registerCardTriggers,
  unregisterCardTriggers,
  fireTrigger,
  fireLeaveFieldTrigger,
  clearAllTriggers,
  resetTurnFlags,
  getCardMainPhaseTriggers,
  getCardGraveyardTriggers,
  hasCardTrigger,
  parseCardTriggers,
} from './engine/triggerEngine';
import { TRIGGER_TYPES, ACTIVATION_TYPES, getTriggerDisplayName } from './engine/triggerTypes';
import {
  getPhaseCardStageText,
  getStageName,
  getStageShortName,
  getCurrentStageDescription,
  getNextStageDescription,
} from './engine/phaseCardEffects';
import { continuousEffectEngine } from './engine/continuousEffects';
import { statusEffectEngine, STATUS_EFFECT_TYPES, getStatusDisplayName, getStatusIcon, STATUS_EFFECT_METADATA } from './engine/statusEffects';
import { processStatusEffectsTurnStart, processStatusEffectsEndPhase } from './engine/effectHelpers';
import {
  isSetsunaMagic,
  getSetsunaCost,
  getActivatableSetsunaMagics,
  CHAIN_POINTS,
  CHAIN_POINT_NAMES,
  processLinkEndPhaseDamage,
  handleLinkBreak,
  shouldApplyShishoku,
  shouldApplyDokushin,
  canActivateSourei,
  getSoureiEffect,
  findSameNameCardInHand,
  canActivateGigen,
  calculateGigenReduction,
} from './engine/keywordAbilities';
import {
  getStrategy,
  createAIGameState,
  executeAIMainPhaseAction,
  executeAIBattlePhaseAction,
  handleAIHandSelection,
  handleAIMonsterTarget,
  handleAIGraveyardSelection,
  handleAIDeckReview,
  handleAIChainConfirmation,
  getSummonableCards as aiGetSummonableCards,
  getUsableMagicCards as aiGetUsableMagicCards,
  AI_DELAY,
  AI_SPEED_SETTINGS,
  getAIThinkingSpeed,
  setAIThinkingSpeed,
  getScaledDelay,
} from './engine/ai';

// GameEngine (ヘッドレス対戦用)
import {
  useGameEngine,
  actions as gameActions, // Phase B: dispatch用アクションクリエイター
} from './engine/gameEngine';
import styles from './styles/gameStyles';
import Card from './components/Card';
import FieldMonster from './components/FieldMonster';
import SPTokens from './components/SPTokens';
import GameLog from './components/GameLog';
import DeckReviewModal from './components/DeckReviewModal';

// コレクションシステム
import {
  storage,
  createInitialPlayerData,
  validatePlayerData,
  repairPlayerData,
  currencyManager,
  valueCalculator,
  CollectionScreen,
  ShopScreen,
  PackOpening,
  DeckBuilder,
  DeckList,
  MarketAnalysis,
  MerchantGuild,
  MerchantShop,
  advanceDay,
  recordPriceHistory,
  calculateMarketModifier,
  recordAssetSnapshot,
  // 大会システム
  validateBet,
  addBet,
  removeBet,
  checkTournamentTrigger,
  createTournament,
  runTournament,
  updateTournamentStatus,
  calculatePayouts,
  createHistoryEntry,
  updateTotalStats,
  TOURNAMENT_STATUS,
  TournamentViewer,
} from './collection';

import {
  purchaseInfo,
  validateInfoPurchase,
  getInfoPrice,
} from './collection/tournament';

// ========================================
// 効果テキストから基本技・上級技を除外するヘルパー関数
// （情報パネルでの重複表示を防ぐため）
// ========================================
const getEffectWithoutSkills = (effectText) => {
  if (!effectText) return effectText;
  // 基本技と上級技の記述を削除（句点または文末まで）
  return effectText
    .replace(/基本技[：:][^。\n]+[。]?/g, '')
    .replace(/上級技[：:][^。\n]+[。]?/g, '')
    .trim();
};

// メインゲームコンポーネント
// ========================================
export default function MagicSpiritGame() {
  // ========================================
  // GameEngine (ヘッドレス対戦シミュレーション用)
  // 段階的移行: 現在は初期化のみ、将来的に状態管理を統合
  // ========================================
  const {
    state: engineState,
    dispatch,
    initGame: engineInitGame,
    resetGame: engineResetGame,
  } = useGameEngine();

  // ========================================
  // Phase D-4完了: ゲーム状態はengineStateが唯一の状態源泉
  // セッターはdispatch経由でengineStateを更新
  // ========================================

  // ゲーム進行状態（6個）- engineState直接参照
  const turn = engineState?.turn ?? 1;
  const currentPlayer = engineState?.currentPlayer ?? 1;
  const phase = engineState?.phase ?? 0;
  const isFirstTurn = engineState?.isFirstTurn ?? true;
  const winner = engineState?.winner ?? null;
  const logs = engineState?.logs ?? [];

  // カードデータ管理
  const [allCards, setAllCards] = useState(SAMPLE_CARDS);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // ゲーム状態
  const [gameState, setGameState] = useState('title'); // title, playing, gameOver, collection, shop, packOpening, deckList, deckEdit, merchantGuild, merchantShop
  // Phase D-3: turn, currentPlayer, phase, isFirstTurn, winner, logs のuseStateは削除
  // これらは engineState から直接参照（上部の互換レイヤー変数を使用）

  // コレクションシステム状態
  const [playerData, setPlayerData] = useState(null); // プレイヤーデータ（コレクション、G等）
  const [cardValueMap, setCardValueMap] = useState(null); // カード価値マップ
  const [pendingPackCards, setPendingPackCards] = useState(null); // 開封待ちパックカード
  const [battleReward, setBattleReward] = useState(null); // 対戦報酬 { goldReward, packReward, isWin }
  const [editingDeck, setEditingDeck] = useState(null); // デッキ編集中のデッキ（nullなら新規）
  const [showMarketAnalysis, setShowMarketAnalysis] = useState(false); // 市場分析画面表示
  const [currentMerchant, setCurrentMerchant] = useState(null); // 現在訪問中の商人名
  const [showTournamentViewer, setShowTournamentViewer] = useState(false); // 大会観戦ダイアログ表示
  const [pendingTournamentResult, setPendingTournamentResult] = useState(null); // 報酬受け取り待ち大会結果

  // ========================================
  // Phase D-4: プレイヤー状態（engineStateから直接参照）
  // ========================================

  // プレイヤー1の状態
  const p1Life = engineState?.p1?.life ?? INITIAL_LIFE;
  const p1Deck = engineState?.p1?.deck ?? [];
  const p1Hand = engineState?.p1?.hand ?? [];
  const p1Field = engineState?.p1?.field ?? [null, null, null, null, null];
  const p1Graveyard = engineState?.p1?.graveyard ?? [];
  const p1ActiveSP = engineState?.p1?.activeSP ?? INITIAL_SP;
  const p1RestedSP = engineState?.p1?.restedSP ?? 0;
  const p1FieldCard = engineState?.p1?.fieldCard ?? null;
  const p1PhaseCard = engineState?.p1?.phaseCard ?? null;
  const p1StatusEffects = engineState?.p1?.statusEffects ?? [];
  const p1NextTurnSPBonus = engineState?.p1?.nextTurnSPBonus ?? 0;
  const p1MagicBlocked = engineState?.p1?.magicBlocked ?? false;
  const p1SpReduction = engineState?.p1?.spReduction ?? 0;

  // プレイヤー2の状態
  const p2Life = engineState?.p2?.life ?? INITIAL_LIFE;
  const p2Deck = engineState?.p2?.deck ?? [];
  const p2Hand = engineState?.p2?.hand ?? [];
  const p2Field = engineState?.p2?.field ?? [null, null, null, null, null];
  const p2Graveyard = engineState?.p2?.graveyard ?? [];
  const p2ActiveSP = engineState?.p2?.activeSP ?? INITIAL_SP;
  const p2RestedSP = engineState?.p2?.restedSP ?? 0;
  const p2FieldCard = engineState?.p2?.fieldCard ?? null;
  const p2PhaseCard = engineState?.p2?.phaseCard ?? null;
  const p2StatusEffects = engineState?.p2?.statusEffects ?? [];
  const p2NextTurnSPBonus = engineState?.p2?.nextTurnSPBonus ?? 0;
  const p2MagicBlocked = engineState?.p2?.magicBlocked ?? false;
  const p2SpReduction = engineState?.p2?.spReduction ?? 0;

  // Phase D-4: ターンフラグ（engineStateから直接参照）
  const chargeUsedThisTurn = engineState?.turnFlags?.chargeUsedThisTurn ?? false;

  // UI状態
  const [selectedHandCard, setSelectedHandCard] = useState(null);
  const [selectedFieldMonster, setSelectedFieldMonster] = useState(null);
  const [attackingMonster, setAttackingMonster] = useState(null);
  const [selectedFieldCardInfo, setSelectedFieldCardInfo] = useState(null); // フィールド/フェイズカード情報表示用
  const [pendingHandSelection, setPendingHandSelection] = useState(null); // 手札選択待ち状態 { message, callback, filter? }
  const [pendingSelectedCard, setPendingSelectedCard] = useState(null); // 手札選択モード中の選択カード
  const [hoveredCard, setHoveredCard] = useState(null); // ホバー中のカード情報表示用
  const [showGraveyardViewer, setShowGraveyardViewer] = useState(null); // 墓地閲覧モーダル { player: 1|2 }
  const [pendingGraveyardSelection, setPendingGraveyardSelection] = useState(null); // 墓地選択待ち { message, callback, filter? }
  const [pendingGraveyardSelectedCard, setPendingGraveyardSelectedCard] = useState(null); // 墓地選択中のカード
  const [pendingDeckReview, setPendingDeckReview] = useState(null); // デッキトップ確認モーダル { cards, title, message, allowReorder, onConfirm, onCancel, selectMode, onSelect }
  const [pendingMonsterTarget, setPendingMonsterTarget] = useState(null); // モンスターターゲット選択 { message, callback, targetPlayer: 'opponent'|'self'|'both' }
  const [pendingSelectedMonsterIndex, setPendingSelectedMonsterIndex] = useState(null); // 選択中のモンスタースロット

  // 刹那詠唱状態
  const [setsunaPendingActivation, setSetsunaPendingActivation] = useState(false); // 刹那詠唱カード選択モード
  const [setsunaPendingCard, setSetsunaPendingCard] = useState(null); // 選択された刹那詠唱カード

  // チェーンポイントシステム状態（刹那詠唱の発動タイミング制御）
  const [chainConfirmation, setChainConfirmation] = useState(null);
  // chainConfirmation = {
  //   chainPoint: CHAIN_POINTS.ATTACK_DECLARATION | CHAIN_POINTS.BATTLE_START,
  //   askingPlayer: 1 | 2,  // 確認中のプレイヤー
  //   pendingAction: { type: 'attack', attackerIndex, targetIndex } | { type: 'battleStart' },
  //   context: {},  // 追加コンテキスト（攻撃者情報など）
  // }

  // 刹那詠唱効果完了後に実行するアクション（効果の選択UIが完了するまで待機）
  const [pendingSetsunaAction, setPendingSetsunaAction] = useState(null);
  // pendingSetsunaAction = { type: 'attack', attackerIndex, targetIndex } | { type: 'battleStart' }

  // 【犠現】状態
  const [pendingGigenActivation, setPendingGigenActivation] = useState(null);
  // pendingGigenActivation = { card, slotIndex } - 召喚するカードとスロット

  // デッキ選択状態
  const [p1SelectedDeck, setP1SelectedDeck] = useState('starter'); // スターターデッキ「紅蓮の咆哮」をデフォルトに
  const [p2SelectedDeck, setP2SelectedDeck] = useState('random');

  // AIプレイヤー設定
  const [p1PlayerType, setP1PlayerType] = useState('human'); // 'human' | 'ai'
  const [p2PlayerType, setP2PlayerType] = useState('ai'); // 'human' | 'ai' (デフォルトAI)
  const [p1AIDifficulty, setP1AIDifficulty] = useState('normal'); // 'easy' | 'normal' | 'hard'
  const [p2AIDifficulty, setP2AIDifficulty] = useState('normal'); // 'easy' | 'normal' | 'hard'
  const [aiThinkingSpeed, setAiThinkingSpeedState] = useState(() => getAIThinkingSpeed()); // 'normal' | 'fast' | 'veryFast'
  const [aiAttackedMonsters, setAiAttackedMonsters] = useState(new Set()); // AIが攻撃済みのモンスター
  const [aiActionCounter, setAiActionCounter] = useState(0); // AIアクション用カウンター（空振り時もuseEffect再トリガー用）
  const prevPhaseRef = useRef(phase); // 前回のフェイズを追跡

  // AI思考速度変更ハンドラー（localStorageに保存）
  const handleAiThinkingSpeedChange = useCallback((speed) => {
    setAiThinkingSpeedState(speed);
    setAIThinkingSpeed(speed);
  }, []);

  // ログ追加関数（Phase D-3: dispatch経由）
  const addLog = useCallback((message, type = 'info') => {
    dispatch(gameActions.addLog(message, type));
  }, [dispatch]);

  // ========================================
  // Phase D-4-2: コンテキストアダプター
  // effectHelpers/cardEffects/cardTriggersからのset*呼び出しをdispatch経由に変換
  // ========================================

  // Phase D-4: useState削除後のセッター（dispatch経由）
  // 関数形式はreducer（applyUpdatePlayerState）で解決される

  // ライフ
  const setP1Life = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { life: value }));
  }, [dispatch]);
  const setP2Life = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { life: value }));
  }, [dispatch]);

  // デッキ
  const setP1Deck = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { deck: value }));
  }, [dispatch]);
  const setP2Deck = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { deck: value }));
  }, [dispatch]);

  // 手札
  const setP1Hand = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { hand: value }));
  }, [dispatch]);
  const setP2Hand = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { hand: value }));
  }, [dispatch]);

  // フィールド
  const setP1Field = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { field: value }));
  }, [dispatch]);
  const setP2Field = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { field: value }));
  }, [dispatch]);

  // 墓地
  const setP1Graveyard = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { graveyard: value }));
  }, [dispatch]);
  const setP2Graveyard = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { graveyard: value }));
  }, [dispatch]);

  // SP
  const setP1ActiveSP = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { activeSP: value }));
  }, [dispatch]);
  const setP2ActiveSP = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { activeSP: value }));
  }, [dispatch]);
  const setP1RestedSP = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { restedSP: value }));
  }, [dispatch]);
  const setP2RestedSP = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { restedSP: value }));
  }, [dispatch]);

  // フィールドカード・フェイズカード
  const setP1FieldCard = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { fieldCard: value }));
  }, [dispatch]);
  const setP2FieldCard = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { fieldCard: value }));
  }, [dispatch]);
  const setP1PhaseCard = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { phaseCard: value }));
  }, [dispatch]);
  const setP2PhaseCard = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { phaseCard: value }));
  }, [dispatch]);

  // 状態異常
  const setP1StatusEffects = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { statusEffects: value }));
  }, [dispatch]);
  const setP2StatusEffects = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { statusEffects: value }));
  }, [dispatch]);

  // SPボーナス
  const setP1NextTurnSPBonus = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { nextTurnSPBonus: value }));
  }, [dispatch]);
  const setP2NextTurnSPBonus = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { nextTurnSPBonus: value }));
  }, [dispatch]);

  // 魔法ブロック
  const setP1MagicBlocked = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { magicBlocked: value }));
  }, [dispatch]);
  const setP2MagicBlocked = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { magicBlocked: value }));
  }, [dispatch]);

  // SP減少
  const setP1SpReduction = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(1, { spReduction: value }));
  }, [dispatch]);
  const setP2SpReduction = useCallback((value) => {
    dispatch(gameActions.updatePlayerState(2, { spReduction: value }));
  }, [dispatch]);

  // ターンフラグ
  const setChargeUsedThisTurn = useCallback((value) => {
    dispatch(gameActions.setGameFlags({ chargeUsedThisTurn: value }));
  }, [dispatch]);

  // 効果コンテキスト作成（dispatch経由のセッターを含む）
  const createEffectContext = useCallback((overrides = {}) => {
    // 読み取り専用データ
    const readonlyContext = {
      currentPlayer,
      p1Life, p2Life,
      p1Field, p2Field,
      p1Hand, p2Hand,
      p1Deck, p2Deck,
      p1Graveyard, p2Graveyard,
      p1ActiveSP, p2ActiveSP,
      p1RestedSP, p2RestedSP,
      p1FieldCard, p2FieldCard,
      p1PhaseCard, p2PhaseCard,
      p1StatusEffects, p2StatusEffects,
      p1NextTurnSPBonus, p2NextTurnSPBonus,
      p1MagicBlocked, p2MagicBlocked,
      p1SpReduction, p2SpReduction,
    };

    // dispatch経由のセッター（上で定義したuseCallback版を使用）
    const dispatchSetters = {
      setP1Life, setP2Life,
      setP1Field, setP2Field,
      setP1Hand, setP2Hand,
      setP1Deck, setP2Deck,
      setP1Graveyard, setP2Graveyard,
      setP1ActiveSP, setP2ActiveSP,
      setP1RestedSP, setP2RestedSP,
      setP1FieldCard, setP2FieldCard,
      setP1PhaseCard, setP2PhaseCard,
      setP1StatusEffects, setP2StatusEffects,
      setP1NextTurnSPBonus, setP2NextTurnSPBonus,
      setP1MagicBlocked, setP2MagicBlocked,
      setP1SpReduction, setP2SpReduction,
      // ログ（既にdispatch経由）
      addLog,
      // UI制御（これらはuseStateのまま - 純粋にUI関連）
      setPendingMonsterTarget,
      setPendingHandSelection,
    };

    return { ...readonlyContext, ...dispatchSetters, ...overrides };
  }, [
    addLog,
    setP1Life, setP2Life, setP1Field, setP2Field, setP1Hand, setP2Hand,
    setP1Deck, setP2Deck, setP1Graveyard, setP2Graveyard,
    setP1ActiveSP, setP2ActiveSP, setP1RestedSP, setP2RestedSP,
    setP1FieldCard, setP2FieldCard, setP1PhaseCard, setP2PhaseCard,
    setP1StatusEffects, setP2StatusEffects, setP1NextTurnSPBonus, setP2NextTurnSPBonus,
    setP1MagicBlocked, setP2MagicBlocked, setP1SpReduction, setP2SpReduction,
    currentPlayer,
    p1Life, p2Life, p1Field, p2Field, p1Hand, p2Hand, p1Deck, p2Deck,
    p1Graveyard, p2Graveyard, p1ActiveSP, p2ActiveSP, p1RestedSP, p2RestedSP,
    p1FieldCard, p2FieldCard, p1PhaseCard, p2PhaseCard,
    p1StatusEffects, p2StatusEffects, p1NextTurnSPBonus, p2NextTurnSPBonus,
    p1MagicBlocked, p2MagicBlocked, p1SpReduction, p2SpReduction,
    setPendingMonsterTarget, setPendingHandSelection,
  ]);

  // カードのコスト修正情報を取得（手札表示用）
  const getModifiedCostInfo = useCallback((card, player) => {
    // モンスターカードのみコスト軽減対象
    if (card.type !== 'monster') {
      return { modifiedCost: undefined, costModifierSource: undefined };
    }

    const context = {
      currentPlayer: player,
      effectOwner: player,
      p1Field,
      p2Field,
      p1Life,
      p2Life,
    };

    // 常時効果からのコスト修正
    const { modifier, sources } = continuousEffectEngine.getSummonCostModifierDetails(card, player, context);

    // カード固有の一時的コスト修正（潮の乙女など）
    const tempModifier = card.tempCostModifier || 0;
    const tempSource = card.tempCostModifierSource || null;

    const totalModifier = modifier + tempModifier;

    if (totalModifier === 0) {
      return { modifiedCost: undefined, costModifierSource: undefined };
    }

    const actualCost = Math.max(0, card.cost + totalModifier);
    const allSources = [...sources];
    if (tempSource) {
      allSources.push(tempSource);
    }
    const sourceText = allSources.length > 0 ? allSources.join(', ') : '効果';

    return { modifiedCost: actualCost, costModifierSource: sourceText };
  }, [p1Field, p2Field, p1Life, p2Life]);

  // ========================================
  // Phase D-4: useState→engineState同期は不要になった
  // 全プレイヤー状態はengineStateから直接参照
  // セッターはdispatch経由で更新
  // ========================================


  // CSVファイルの読み込み & プレイヤーデータ初期化
  useEffect(() => {
    const loadCards = async () => {
      setIsLoadingCards(true);
      const cards = await loadCardsFromCSV();
      setAllCards(cards);

      // カード価値マップを計算
      const valueMap = valueCalculator.calculateAllCardValues(cards);
      setCardValueMap(valueMap);

      // プレイヤーデータをロード or 新規作成
      let data = storage.load();
      if (!data) {
        // 新規プレイヤー: 初期データを作成
        data = createInitialPlayerData();
        storage.save(data);
      } else {
        // 既存データの検証・修復
        const validation = validatePlayerData(data);
        if (!validation.valid) {
          data = repairPlayerData(data);
          storage.save(data);
        }
      }
      setPlayerData(data);

      setIsLoadingCards(false);
    };

    loadCards();
  }, []);

  // ========================================
  // コレクションシステム ハンドラ
  // ========================================

  // プレイヤーデータを更新して保存
  const updatePlayerData = useCallback((newData) => {
    setPlayerData(newData);
    storage.save(newData);
  }, []);

  // 対戦報酬を付与
  const awardBattleRewards = useCallback((isWin) => {
    if (!playerData) return;

    const result = currencyManager.awardBattleReward(playerData, isWin);
    let updatedPlayerData = result.playerData;

    // 市場データを更新（対戦ごとに1日進める）
    if (updatedPlayerData.market) {
      // 市場日を進める
      const newMarketState = advanceDay(updatedPlayerData.market);

      // 価格履歴を記録
      const getBaseValue = (card) => {
        // cardValueMapはMapオブジェクトなので.get()を使用
        const cardValue = cardValueMap?.get?.(card.id);
        if (cardValue) {
          return cardValue.baseValue;
        }
        return valueCalculator.calculateBaseValue(card);
      };
      const getTier = (card) => {
        // cardValueMapはMapオブジェクトなので.get()を使用
        const cardValue = cardValueMap?.get?.(card.id);
        if (cardValue) {
          return cardValue.tier;
        }
        // determineTierはbaseValueを受け取る
        const baseValue = valueCalculator.calculateBaseValue(card);
        return valueCalculator.determineTier(baseValue);
      };

      // 市場変動率を取得するコールバック
      const getMarketModifier = (card, tier) => {
        return calculateMarketModifier(card, newMarketState, null, tier);
      };

      const newPriceHistory = recordPriceHistory(
        newMarketState.priceHistory,
        newMarketState,
        allCards || [],
        getBaseValue,
        getTier,
        getMarketModifier
      );

      updatedPlayerData = {
        ...updatedPlayerData,
        market: {
          ...newMarketState,
          priceHistory: newPriceHistory,
        },
      };

      // 資産スナップショットを記録
      updatedPlayerData = recordAssetSnapshot(
        updatedPlayerData,
        allCards || [],
        newMarketState,
        newMarketState.currentDay
      );

      // 大会システム処理（非同期で実行）
      const currentDay = newMarketState.currentDay;
      let existingTournament = updatedPlayerData.tournamentData?.currentTournament;

      // 1. 既存大会のステータス更新（締切チェック）
      if (existingTournament && existingTournament.status === TOURNAMENT_STATUS.BETTING) {
        existingTournament = updateTournamentStatus(existingTournament, currentDay);
        updatedPlayerData = {
          ...updatedPlayerData,
          tournamentData: {
            ...updatedPlayerData.tournamentData,
            currentTournament: existingTournament,
          },
        };
      }

      // 2. CLOSED状態の大会を実行
      if (existingTournament && existingTournament.status === TOURNAMENT_STATUS.CLOSED) {
        runTournament(existingTournament).then((finishedTournament) => {
          if (finishedTournament) {
            console.log(`[Tournament] ${finishedTournament.name} 終了: 優勝 ${finishedTournament.finalWinner}`);

            // 大会結果を保存（報酬受け取り待ち状態）
            updatePlayerData((prev) => ({
              ...prev,
              tournamentData: {
                ...prev.tournamentData,
                currentTournament: finishedTournament, // PENDING_REWARD状態で保存
              },
            }));

            // 観戦ダイアログを表示
            setPendingTournamentResult(finishedTournament);
            setShowTournamentViewer(true);
          }
        }).catch((err) => {
          console.error('[Tournament] 大会実行エラー:', err);
        });
      } else {
        // 既存大会がない or FINISHED の場合、新規大会チェック
        const triggerType = checkTournamentTrigger(currentDay, existingTournament);
        if (triggerType) {
          createTournament(triggerType, currentDay).then((newTournament) => {
            if (newTournament) {
              updatePlayerData((prev) => ({
                ...prev,
                tournamentData: {
                  ...prev.tournamentData,
                  currentTournament: newTournament,
                },
              }));
              console.log(`[Tournament] ${newTournament.name} が開催されました`);
            }
          }).catch((err) => {
            console.error('[Tournament] 大会作成エラー:', err);
          });
        }
      }
    }

    updatePlayerData(updatedPlayerData);
    setBattleReward({
      goldReward: result.goldReward,
      packReward: result.packReward,
      isWin,
    });
  }, [playerData, updatePlayerData, cardValueMap, allCards]);

  // パック開封画面へ遷移
  const handleOpenPack = useCallback((cards, packCount = 1) => {
    setPendingPackCards({ cards, packCount });
    setGameState('packOpening');
  }, []);

  // パック開封完了
  const handlePackOpeningClose = useCallback(() => {
    setPendingPackCards(null);
    // 報酬パックの場合はゲームオーバー画面に戻る、ショップからの場合はショップに戻る
    if (battleReward) {
      setGameState('gameOver');
    } else {
      setGameState('shop');
    }
  }, [battleReward]);

  // 大会報酬受け取り
  const handleClaimTournamentReward = useCallback((payoutResults) => {
    const tournament = pendingTournamentResult || playerData?.tournamentData?.currentTournament;
    if (!tournament) return;

    const currentBets = playerData?.tournamentData?.currentBets || [];
    const totalPayout = payoutResults?.totalPayout || 0;

    // 履歴エントリ作成
    const historyEntry = createHistoryEntry(tournament, currentBets, payoutResults);

    // 統計更新
    const newTotalStats = updateTotalStats(
      playerData?.tournamentData?.totalStats || {},
      payoutResults
    );

    // プレイヤーデータ更新（報酬付与 + 大会終了）
    updatePlayerData((prev) => ({
      ...prev,
      gold: prev.gold + totalPayout,
      tournamentData: {
        ...prev.tournamentData,
        currentTournament: null, // 大会終了
        currentBets: [], // 賭けクリア
        purchasedInfo: {}, // 購入情報クリア
        history: [historyEntry, ...(prev.tournamentData?.history || [])].slice(0, 30),
        totalStats: newTotalStats,
      },
    }));

    if (totalPayout > 0) {
      console.log(`[Tournament] 払戻: ${totalPayout.toLocaleString()}G`);
    }

    // ダイアログを閉じる
    setShowTournamentViewer(false);
    setPendingTournamentResult(null);

    // 新規大会作成チェック
    const currentDay = playerData?.market?.currentDay || 1;
    const triggerType = checkTournamentTrigger(currentDay, null);
    if (triggerType) {
      createTournament(triggerType, currentDay).then((newTournament) => {
        if (newTournament) {
          updatePlayerData((prev) => ({
            ...prev,
            tournamentData: {
              ...prev.tournamentData,
              currentTournament: newTournament,
            },
          }));
          console.log(`[Tournament] ${newTournament.name} が開催されました`);
        }
      }).catch((err) => {
        console.error('[Tournament] 大会作成エラー:', err);
      });
    }
  }, [pendingTournamentResult, playerData, updatePlayerData]);

  // カード売却
  const handleSellCard = useCallback((cardId, rarity, quantity, card) => {
    if (!playerData || !cardValueMap) return;

    const { shopSystem } = require('./collection');
    const result = shopSystem.sellCard(playerData, cardId, rarity, quantity, card, cardValueMap);

    if (result.success) {
      updatePlayerData(result.playerData);
    }
  }, [playerData, cardValueMap, updatePlayerData]);

  // デッキ保存
  const handleSaveDeck = useCallback((deck) => {
    if (!playerData) return;

    const userDecks = playerData.userDecks || [];
    const existingIndex = userDecks.findIndex(d => d.id === deck.id);

    let newUserDecks;
    if (existingIndex >= 0) {
      // 既存デッキの更新
      newUserDecks = [...userDecks];
      newUserDecks[existingIndex] = deck;
    } else {
      // 新規デッキの追加
      newUserDecks = [...userDecks, deck];
    }

    const newPlayerData = {
      ...playerData,
      userDecks: newUserDecks,
      updatedAt: Date.now(),
    };

    updatePlayerData(newPlayerData);
    setEditingDeck(null);
    setGameState('deckList');
  }, [playerData, updatePlayerData]);

  // デッキ削除
  const handleDeleteDeck = useCallback((deckId) => {
    if (!playerData) return;

    const userDecks = playerData.userDecks || [];
    const newUserDecks = userDecks.filter(d => d.id !== deckId);

    const newPlayerData = {
      ...playerData,
      userDecks: newUserDecks,
      updatedAt: Date.now(),
    };

    updatePlayerData(newPlayerData);
  }, [playerData, updatePlayerData]);

  // ========================================
  // ゲーム初期化
  const initGame = useCallback(() => {
    // 報酬状態をクリア
    setBattleReward(null);

    // デッキ生成ヘルパー: ユーザーデッキかプリビルトか判断
    const createDeckFromSelection = (deckId) => {
      if (deckId.startsWith('user_')) {
        // ユーザーデッキの場合
        const userDeckId = deckId.replace('user_', '');
        const userDeck = playerData?.userDecks?.find(d => d.id === userDeckId);
        if (userDeck) {
          return createDeckFromUserDeck(userDeck, allCards);
        }
        console.warn(`ユーザーデッキが見つかりません: ${userDeckId}`);
        return createDeck(allCards); // フォールバック
      }
      // プリビルトデッキの場合
      return createDeckFromPrebuilt(deckId, allCards);
    };

    // 選択されたデッキからカードを生成
    const deck1 = createDeckFromSelection(p1SelectedDeck);
    const deck2 = createDeckFromSelection(p2SelectedDeck);

    // 先行・後攻をランダムに決定（GameEngineと共有）
    const firstPlayer = Math.random() < 0.5 ? 1 : 2;

    // ========================================
    // GameEngine初期化（ヘッドレス対戦シミュレーション用）
    // 現在はUI状態と並行して管理、将来的に統合予定
    // ========================================
    engineInitGame({ deck1, deck2, firstPlayer });

    // 既存のuseState初期化（互換性維持）
    setP1Deck(deck1.slice(INITIAL_HAND_SIZE));
    setP1Hand(deck1.slice(0, INITIAL_HAND_SIZE));
    setP2Deck(deck2.slice(INITIAL_HAND_SIZE));
    setP2Hand(deck2.slice(0, INITIAL_HAND_SIZE));

    setP1Life(INITIAL_LIFE);
    setP2Life(INITIAL_LIFE);
    setP1ActiveSP(INITIAL_SP);
    setP2ActiveSP(INITIAL_SP);
    setP1RestedSP(0);
    setP2RestedSP(0);
    setP1NextTurnSPBonus(0);
    setP2NextTurnSPBonus(0);
    setP1MagicBlocked(false);
    setP2MagicBlocked(false);
    setP1Field([null, null, null, null, null]);
    setP2Field([null, null, null, null, null]);
    setP1FieldCard(null);
    setP2FieldCard(null);
    setP1PhaseCard(null);
    setP2PhaseCard(null);
    setP1Graveyard([]);
    setP2Graveyard([]);

    // Phase D-3: turn, currentPlayer, phase, isFirstTurn, winner, logs は engineInitGame() で設定済み
    // 初期ログはengineInitGame内で追加されるため、ここでのset*呼び出しは不要

    setSelectedHandCard(null);
    setSelectedFieldMonster(null);
    setAttackingMonster(null);
    setChargeUsedThisTurn(false);
    setSelectedFieldCardInfo(null);
    setPendingHandSelection(null);
    setPendingSelectedCard(null);
    setPendingDeckReview(null);
    setPendingMonsterTarget(null);
    setPendingSelectedMonsterIndex(null);
    setPendingGraveyardSelection(null);
    setPendingGraveyardSelectedCard(null);

    // 刹那詠唱状態をリセット
    setSetsunaPendingActivation(false);
    setSetsunaPendingCard(null);
    setChainConfirmation(null);
    setPendingSetsunaAction(null);

    // AIシステムをリセット
    setAiAttackedMonsters(new Set());
    setAiActionCounter(0);

    // トリガーシステムをクリア
    clearAllTriggers();

    // 常時効果システムをクリア
    continuousEffectEngine.clear();

    // 状態異常システムをクリア
    statusEffectEngine.clear();
    setP1StatusEffects([]);
    setP2StatusEffects([]);

    setGameState('playing');
    addLog('ゲーム開始！先攻プレイヤー1のターン', 'info');
  }, [addLog, allCards, p1SelectedDeck, p2SelectedDeck, playerData, engineInitGame]);

  // 現在のプレイヤーのデータを取得
  const getCurrentPlayerData = () => {
    if (currentPlayer === 1) {
      return {
        life: p1Life, setLife: setP1Life,
        deck: p1Deck, setDeck: setP1Deck,
        hand: p1Hand, setHand: setP1Hand,
        field: p1Field, setField: setP1Field,
        graveyard: p1Graveyard, setGraveyard: setP1Graveyard,
        activeSP: p1ActiveSP, setActiveSP: setP1ActiveSP,
        restedSP: p1RestedSP, setRestedSP: setP1RestedSP,
        fieldCard: p1FieldCard, setFieldCard: setP1FieldCard,
        phaseCard: p1PhaseCard, setPhaseCard: setP1PhaseCard,
        spBonus: p1NextTurnSPBonus, setSpBonus: setP1NextTurnSPBonus,
        spReduction: p1SpReduction, setSpReduction: setP1SpReduction,
      };
    }
    return {
      life: p2Life, setLife: setP2Life,
      deck: p2Deck, setDeck: setP2Deck,
      hand: p2Hand, setHand: setP2Hand,
      field: p2Field, setField: setP2Field,
      graveyard: p2Graveyard, setGraveyard: setP2Graveyard,
      activeSP: p2ActiveSP, setActiveSP: setP2ActiveSP,
      restedSP: p2RestedSP, setRestedSP: setP2RestedSP,
      fieldCard: p2FieldCard, setFieldCard: setP2FieldCard,
      phaseCard: p2PhaseCard, setPhaseCard: setP2PhaseCard,
      spBonus: p2NextTurnSPBonus, setSpBonus: setP2NextTurnSPBonus,
      spReduction: p2SpReduction, setSpReduction: setP2SpReduction,
    };
  };

  const getOpponentData = () => {
    if (currentPlayer === 1) {
      return {
        life: p2Life, setLife: setP2Life,
        field: p2Field, setField: setP2Field,
        graveyard: p2Graveyard, setGraveyard: setP2Graveyard,
        fieldCard: p2FieldCard,
        phaseCard: p2PhaseCard,
      };
    }
    return {
      life: p1Life, setLife: setP1Life,
      field: p1Field, setField: setP1Field,
      graveyard: p1Graveyard, setGraveyard: setP1Graveyard,
      fieldCard: p1FieldCard,
      phaseCard: p1PhaseCard,
    };
  };

  // フェイズ処理
  const processPhase = useCallback((phaseIndex) => {
    const player = getCurrentPlayerData();
    const opponent = getOpponentData();

    // トリガー用コンテキスト
    const triggerContext = {
      currentPlayer,
      setP1Life,
      setP2Life,
      setP1Field,
      setP2Field,
      setP1Hand,
      setP2Hand,
      setP1Deck,
      setP2Deck,
      setP1Graveyard,
      setP2Graveyard,
      setP1ActiveSP,
      setP2ActiveSP,
      setP1RestedSP,
      setP2RestedSP,
      p1Field,
      p2Field,
      p1Hand,
      p2Hand,
      p1Deck,
      p2Deck,
      p1Graveyard,
      p2Graveyard,
      p1Life,
      p2Life,
      p1ActiveSP,
      p2ActiveSP,
      p1RestedSP,
      p2RestedSP,
      addLog,
      setPendingHandSelection,
      setPendingGraveyardSelection,
      setShowGraveyardViewer,
      setPendingDeckReview,
    };

    switch (phaseIndex) {
      case 0: // ターン開始フェイズ
        // SPトークン追加（最大10）+ ボーナス - 減少
        const totalSP = player.activeSP + player.restedSP;
        const spBonus = player.spBonus || 0;
        const spReduction = player.spReduction || 0;
        const netSpGain = Math.max(0, 1 + spBonus - spReduction); // 通常1 + ボーナス - 減少（最小0）
        if (totalSP < MAX_SP && netSpGain > 0) {
          const actualGain = Math.min(netSpGain, MAX_SP - totalSP);
          player.setActiveSP(prev => Math.min(prev + actualGain, MAX_SP));
          if (spBonus > 0 || spReduction > 0) {
            const modifiers = [];
            if (spBonus > 0) modifiers.push(`ボーナス+${spBonus}`);
            if (spReduction > 0) modifiers.push(`減少-${spReduction}`);
            addLog(`プレイヤー${currentPlayer}: SPトークン+${actualGain}（${modifiers.join('、')}）`, spReduction > 0 ? 'damage' : 'heal');
          } else {
            addLog(`プレイヤー${currentPlayer}: SPトークン+1`, 'info');
          }
        } else if (netSpGain === 0) {
          addLog(`プレイヤー${currentPlayer}: SP増加なし（【壮麗】効果）`, 'damage');
        }
        // SPボーナスとSP減少をリセット
        if (player.spBonus > 0) {
          player.setSpBonus(0);
        }
        if (player.spReduction > 0) {
          player.setSpReduction(0);
        }
        // レスト状態のSPをアクティブに
        player.setActiveSP(prev => prev + player.restedSP);
        player.setRestedSP(0);

        // モンスターの攻撃可能フラグと技発動フラグをリセット
        player.setField(prev => prev.map(m => m ? { ...m, canAttack: true, usedSkillThisTurn: false } : null));
        setChargeUsedThisTurn(false);

        // 状態異常のターン開始時処理（眠り・凍結の解除判定、寄生ATK減少）
        processStatusEffectsTurnStart({ setP1Field, setP2Field, addLog });

        // ターン開始時トリガーを発火
        fireTrigger(TRIGGER_TYPES.ON_TURN_START_SELF, triggerContext);

        // Phase D-1: dispatchのみで状態更新
        dispatch(gameActions.setPhase(1));
        break;

      case 1: // ドローフェイズ
        if (player.deck.length > 0) {
          const drawnCard = player.deck[0];
          player.setDeck(prev => prev.slice(1));
          player.setHand(prev => [...prev, drawnCard]);
          addLog(`プレイヤー${currentPlayer}: 1枚ドロー`, 'info');
        } else {
          addLog(`プレイヤー${currentPlayer}: デッキ切れ！`, 'damage');
        }

        // ドローフェイズトリガーを発火
        fireTrigger(TRIGGER_TYPES.ON_DRAW_PHASE_SELF, triggerContext);

        // Phase D-1: dispatchのみで状態更新
        dispatch(gameActions.setPhase(2));
        break;

      case 2: // メインフェイズ
        // プレイヤーの操作待ち（自動進行なし）
        // メインフェイズトリガーは任意発動のため、ここでは発火しない
        // カード選択時にUIに表示される
        break;

      case 3: // バトルフェイズ
        // 先攻1ターン目は攻撃不可（Phase C-2: engineState参照）
        if (isFirstTurn && currentPlayer === 1) {
          addLog('先攻1ターン目は攻撃できません', 'info');
          // Phase D-1: dispatchのみで状態更新
          dispatch(gameActions.setPhase(4));
        }

        // バトルフェイズ開始時トリガーを発火
        fireTrigger(TRIGGER_TYPES.ON_BATTLE_PHASE_START, triggerContext);
        break;

      case 4: // エンドフェイズ
        // エンドフェイズトリガーを発火
        fireTrigger(TRIGGER_TYPES.ON_END_PHASE_SELF, triggerContext);
        fireTrigger(TRIGGER_TYPES.ON_END_PHASE, triggerContext);

        // 墓地カードのエンドフェイズトリガーを発火
        {
          const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
          graveyard.forEach((card) => {
            const graveyardTriggers = getCardGraveyardTriggers(card, triggerContext);
            graveyardTriggers.forEach((trigger) => {
              if (trigger.type === TRIGGER_TYPES.ON_END_PHASE_FROM_GRAVEYARD &&
                  trigger.activationType === 'automatic' &&
                  trigger.canActivate) {
                try {
                  if (typeof trigger.effect === 'function') {
                    trigger.effect({ ...triggerContext, card });
                  }
                } catch (error) {
                  console.error(`墓地トリガー発動エラー: ${card.name}`, error);
                }
              }
            });
          });
        }

        // 【魂結】リンクダメージ処理（自分のターン終了時に相手にダメージ）
        {
          const myField = currentPlayer === 1 ? p1Field : p2Field;
          const setOpponentLife = currentPlayer === 1 ? setP2Life : setP1Life;
          processLinkEndPhaseDamage(myField, setOpponentLife, addLog);
        }

        // 状態異常のエンドフェイズ処理（深蝕による攻撃力減少、持続時間減少）
        // 両プレイヤーのモンスターを処理（expiresAfterEndPhasesのカウントダウンのため）
        const processFieldEndPhase = (setField, fieldOwner) => {
          setField(prev => prev.map(m => {
            if (!m) return null;
            const result = statusEffectEngine.processEndPhase(m);
            // 深蝕による攻撃力減少ログ（モンスターオーナーのエンドフェイズでのみ表示）
            if (result.atkReduction > 0 && fieldOwner === currentPlayer) {
              addLog(`${m.name}は深蝕により攻撃力が${result.atkReduction}減少！`, 'damage');
            }
            // 持続時間終了で解除されたエフェクトのログ
            if (result.removedEffects.length > 0) {
              result.removedEffects.forEach(effect => {
                addLog(`${m.name}の${getStatusDisplayName(effect.type)}が解除された！`, 'info');
              });
            }
            return result.monster;
          }));
        };
        // 両プレイヤーのフィールドを処理
        processFieldEndPhase(setP1Field, 1);
        processFieldEndPhase(setP2Field, 2);

        // プレイヤー状態異常のエンドフェイズ処理（毒ダメージ等）
        const playerStatusEffects = currentPlayer === 1 ? p1StatusEffects : p2StatusEffects;
        const poisonResult = statusEffectEngine.processPlayerEndPhase(playerStatusEffects);
        if (poisonResult.damage > 0) {
          player.setLife(prev => Math.max(0, prev - poisonResult.damage));
          addLog(`プレイヤー${currentPlayer}は毒により${poisonResult.damage}ダメージ！`, 'damage');
        }
        // プレイヤー状態異常の更新（持続時間減少）
        if (currentPlayer === 1) {
          setP1StatusEffects(poisonResult.effects);
        } else {
          setP2StatusEffects(poisonResult.effects);
        }

        // ターン終了時に使用済みフラグをリセット
        resetTurnFlags();
        continuousEffectEngine.resetTurnFlags();

        // 魔法カード使用制限の解除（触覚持ち粘液獣の効果は相手エンドフェイズで終了）
        if (currentPlayer === 1 && p1MagicBlocked) {
          setP1MagicBlocked(false);
          addLog('プレイヤー1: 魔法カード使用制限が解除された', 'info');
        } else if (currentPlayer === 2 && p2MagicBlocked) {
          setP2MagicBlocked(false);
          addLog('プレイヤー2: 魔法カード使用制限が解除された', 'info');
        }

        // 寄生効果の無効化解除（相手エンドフェイズで効果無効化が終了）
        processStatusEffectsEndPhase({ setP1Field, setP2Field, addLog }, currentPlayer);

        // ターン終了時までの効果をリセット（攻撃力バフ、破壊耐性等）
        const clearEndOfTurnEffects = (setField) => {
          setField(prev => prev.map(m => {
            if (!m) return m;
            let updated = m;

            // 攻撃力バフをリセット
            if (m.attackBuffUntilEndOfTurn) {
              const newAttack = Math.max(0, (m.currentAttack || m.attack) - m.attackBuffUntilEndOfTurn);
              addLog(`${m.name}の攻撃力バフが終了（${newAttack}）`, 'info');
              const { attackBuffUntilEndOfTurn, ...rest } = updated;
              updated = { ...rest, currentAttack: newAttack };
            }

            // 破壊耐性をリセット
            if (m.indestructibleUntilEndOfTurn) {
              addLog(`${m.name}の破壊耐性が終了`, 'info');
              const { indestructibleUntilEndOfTurn, ...rest } = updated;
              updated = rest;
            }

            return updated;
          }));
        };
        // 現在のプレイヤーのフィールドのみ処理（自分のターン終了時）
        if (currentPlayer === 1) {
          clearEndOfTurnEffects(setP1Field);
        } else {
          clearEndOfTurnEffects(setP2Field);
        }

        // エンドフェイズまでの一時的コスト軽減をクリア（水晶のマーメイド等）
        const clearTempCostModifier = (hand) => hand.map(c => {
          if (c.tempCostModifierUntilEndPhase) {
            const { tempCostModifier, tempCostModifierSource, tempCostModifierUntilEndPhase, ...rest } = c;
            return rest;
          }
          return c;
        });
        setP1Hand(prev => clearTempCostModifier(prev));
        setP2Hand(prev => clearTempCostModifier(prev));

        // Phase D-1: dispatchのみでターン終了（phase, currentPlayer, turn, isFirstTurnを更新）
        dispatch(gameActions.endTurn());
        addLog(`プレイヤー${currentPlayer}のターン終了`, 'info');
        break;
    }
  }, [currentPlayer, isFirstTurn, p1Field, p2Field, p1Hand, p2Hand, p1Deck, p2Deck,
      p1Graveyard, p2Graveyard, p1Life, p2Life, p1StatusEffects, p2StatusEffects, addLog, dispatch]);

  // チャージ処理
  const chargeCard = useCallback((card, monsterIndex) => {
    if (chargeUsedThisTurn) {
      addLog('このターンは既にチャージを使用しました', 'damage');
      return false;
    }

    const field = currentPlayer === 1 ? p1Field : p2Field;
    const monster = field[monsterIndex];

    if (!monster) {
      addLog('モンスターが存在しません', 'damage');
      return false;
    }

    if (monster.charges && monster.charges.length >= 2) {
      addLog('このモンスターは既に2枚チャージされています', 'damage');
      return false;
    }

    // 属性チャージ（モンスター、魔法、フィールドカード）
    if (card.type === 'monster' || card.type === 'magic' || card.type === 'field') {
      const newCharge = {
        card: card,
        attribute: card.attribute,
      };

      if (currentPlayer === 1) {
        setP1Field(prev => {
          const newField = [...prev];
          newField[monsterIndex] = {
            ...monster,
            charges: [...(monster.charges || []), newCharge],
          };
          return newField;
        });
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      } else {
        setP2Field(prev => {
          const newField = [...prev];
          newField[monsterIndex] = {
            ...monster,
            charges: [...(monster.charges || []), newCharge],
          };
          return newField;
        });
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      }

      setChargeUsedThisTurn(true);
      addLog(`${monster.name}に${card.name}をチャージしました`, 'info');

      return true;
    }

    addLog('チャージできるのは属性カードのみです', 'damage');
    return false;
  }, [currentPlayer, p1Field, p2Field, p1Hand, p2Hand, chargeUsedThisTurn, addLog, dispatch]);

  // SPチャージ処理（SPトークンをモンスターにチャージ）
  const chargeSP = useCallback((monsterIndex) => {
    if (chargeUsedThisTurn) {
      addLog('このターンは既にチャージを使用しました', 'damage');
      return false;
    }

    const field = currentPlayer === 1 ? p1Field : p2Field;
    const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
    const monster = field[monsterIndex];

    if (!monster) {
      addLog('モンスターが存在しません', 'damage');
      return false;
    }

    if (monster.charges && monster.charges.length >= 2) {
      addLog('このモンスターは既に2枚チャージされています', 'damage');
      return false;
    }

    if (activeSP < 1) {
      addLog('SPが足りません', 'damage');
      return false;
    }

    // SPチャージを追加
    const spCharge = {
      card: null,
      attribute: 'any',
      isSPCharge: true,
    };

    const setField = currentPlayer === 1 ? setP1Field : setP2Field;
    const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;

    setField(prev => {
      const newField = [...prev];
      newField[monsterIndex] = {
        ...monster,
        charges: [...(monster.charges || []), spCharge],
      };
      return newField;
    });

    // SP総数を減らす（restedSPには加算しない = 永久消費）
    setActiveSP(prev => prev - 1);
    setChargeUsedThisTurn(true);

    addLog(`${monster.name}にSPトークンをチャージ`, 'info');

    return true;
  }, [currentPlayer, p1Field, p2Field, p1ActiveSP, p2ActiveSP, chargeUsedThisTurn, addLog, dispatch]);

  // フェイズカードへのチャージ処理
  const chargePhaseCard = useCallback((card) => {
    if (chargeUsedThisTurn) {
      addLog('このターンは既にチャージを使用しました', 'damage');
      return false;
    }

    const phaseCard = currentPlayer === 1 ? p1PhaseCard : p2PhaseCard;
    const setPhaseCard = currentPlayer === 1 ? setP1PhaseCard : setP2PhaseCard;
    const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
    const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

    if (!phaseCard || phaseCard.type !== 'phasecard') {
      addLog('フェイズカードが設置されていません', 'damage');
      return false;
    }

    // 現在の段階を取得（chargesの数、または stageフィールド）
    const currentStage = phaseCard.stage !== undefined ? phaseCard.stage : (phaseCard.charges?.length || 0);

    // 最大段階チェック（3枚チャージで最終段階）
    if (currentStage >= 3) {
      addLog('フェイズカードは既に最終段階です', 'damage');
      return false;
    }

    // 属性チェック（同属性のみ、または「なし」属性のカードも可）
    if (card.attribute !== phaseCard.attribute && card.attribute !== 'なし' && phaseCard.attribute !== 'なし') {
      addLog(`フェイズカードと同じ属性のカードのみチャージできます（フェイズカード: ${phaseCard.attribute}）`, 'damage');
      return false;
    }

    // 属性カードのみチャージ可能（フェイズカードも含む）
    if (card.type !== 'monster' && card.type !== 'magic' && card.type !== 'field' && card.type !== 'phasecard') {
      addLog('チャージできるのは属性カード（モンスター、魔法、フィールド、フェイズ）のみです', 'damage');
      return false;
    }

    // 新しいチャージを追加
    const newCharge = {
      card: card,
      attribute: card.attribute,
    };

    const newStage = currentStage + 1;
    const updatedPhaseCard = {
      ...phaseCard,
      stage: newStage,
      charges: [...(phaseCard.charges || []), newCharge],
    };

    // 手札から削除
    setHand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));

    // 段階名を取得（新しい関数を使用）
    const stageName = getStageName(newStage);
    addLog(`フェイズカード【${phaseCard.name}】に${card.name}をチャージ → 【${stageName}】（${newStage}/3）`, 'info');

    // CSVの効果テキストから段階効果を取得
    const stageEffectText = getPhaseCardStageText(phaseCard, newStage);

    if (stageEffectText) {
      // 段階効果のテキストをログに表示
      addLog(`【${stageName}効果】: ${stageEffectText}`, 'info');

      // コンテキストを作成して効果を実行
      const context = {
        currentPlayer,
        monsterIndex: null,
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        setP1Hand,
        setP2Hand,
        setP1Deck,
        setP2Deck,
        setP1Graveyard,
        setP2Graveyard,
        p1Field,
        p2Field,
        p1Hand,
        p2Hand,
        p1Deck,
        p2Deck,
        p1Graveyard,
        p2Graveyard,
        p1ActiveSP,
        p2ActiveSP,
        setP1ActiveSP,
        setP2ActiveSP,
        p1RestedSP,
        p2RestedSP,
        setP1RestedSP,
        setP2RestedSP,
        addLog,
      };

      // 効果テキストを解析して実行（現状はトリガーシステムで処理される効果も多いため、ログ表示のみ）
      // TODO: 即時効果（ダメージ、回復など）は executeSkillEffects で処理可能
      // executeSkillEffects(stageEffectText, context, phaseCard.id);
    }

    // 最終段階（3枚チャージ）の場合は墓地へ送る
    if (newStage >= 3) {
      addLog(`フェイズカード【${phaseCard.name}】は最終段階の効果を発動し、墓地へ送られます`, 'info');

      // フェイズカードの常時効果を解除
      continuousEffectEngine.unregister(phaseCard.uniqueId);

      // フェイズカードとチャージされたカードを全て墓地へ
      const cardsToGraveyard = [
        { ...updatedPhaseCard, charges: [] }, // フェイズカード本体（chargesは分離）
        ...updatedPhaseCard.charges.map(c => c.card), // チャージされたカード
      ];

      setGraveyard(prev => [...prev, ...cardsToGraveyard]);
      setPhaseCard(null);
    } else {
      // フェイズカードの常時効果を新しい段階に更新
      continuousEffectEngine.updatePhaseCardStage(updatedPhaseCard, currentPlayer, newStage);

      setPhaseCard(updatedPhaseCard);
    }

    setChargeUsedThisTurn(true);
    return true;
  }, [currentPlayer, p1PhaseCard, p2PhaseCard, p1Field, p2Field, p1Hand, p2Hand,
      p1Deck, p2Deck, p1Graveyard, p2Graveyard, p1ActiveSP, p2ActiveSP,
      p1RestedSP, p2RestedSP, chargeUsedThisTurn, addLog,
      setP1Life, setP2Life, setP1Field, setP2Field, setP1Hand, setP2Hand,
      setP1Deck, setP2Deck, setP1Graveyard, setP2Graveyard,
      setP1ActiveSP, setP2ActiveSP, setP1RestedSP, setP2RestedSP,
      setP1PhaseCard, setP2PhaseCard]);

  // 技発動処理
  const executeSkill = useCallback((monsterIndex, skillType) => {
    const field = currentPlayer === 1 ? p1Field : p2Field;
    const monster = field[monsterIndex];

    if (!monster) {
      addLog('モンスターが存在しません', 'damage');
      return false;
    }

    // 状態異常による技使用制限をチェック（眠り、雷撃、効果無効）
    if (!statusEffectEngine.canUseSkill(monster)) {
      const statusName = statusEffectEngine.getBlockingStatusName(monster, 'skill');
      addLog(`${monster.name}は${statusName}により技を使用できません！`, 'damage');
      return false;
    }

    // 1ターン1回制限チェック
    if (monster.usedSkillThisTurn) {
      addLog(`${monster.name}はこのターン既に技を発動しています`, 'damage');
      return false;
    }

    const skill = skillType === 'basic' ? monster.basicSkill : monster.advancedSkill;
    const skillName = skillType === 'basic' ? '基本技' : '上級技';

    if (!skill) {
      addLog(`このモンスターには${skillName}がありません`, 'damage');
      return false;
    }

    const requiredCharges = skill.cost;
    const currentCharges = monster.charges ? monster.charges.length : 0;

    if (currentCharges < requiredCharges) {
      addLog(`${skillName}を発動するには${requiredCharges}枚のチャージが必要です（現在: ${currentCharges}枚）`, 'damage');
      return false;
    }

    // 有効なチャージを判定（優先順位: 同属性 > なし属性 > SPチャージ）
    // SPチャージは任意属性扱いで、技発動時に消費される
    const getValidChargesForSkill = (charges, monsterAttr, required) => {
      const sameAttr = charges.filter(c => !c.isSPCharge && c.attribute === monsterAttr);
      const noneAttr = charges.filter(c => !c.isSPCharge && c.attribute === 'なし');
      const spCharges = charges.filter(c => c.isSPCharge);

      // 優先順位順に結合して必要数だけ取得
      const orderedCharges = [...sameAttr, ...noneAttr, ...spCharges];
      const usedCharges = orderedCharges.slice(0, required);
      const spUsedCount = usedCharges.filter(c => c.isSPCharge).length;

      return {
        isValid: usedCharges.length >= required,
        usedCharges,
        spUsedCount,
      };
    };

    const chargeResult = getValidChargesForSkill(
      monster.charges || [],
      monster.attribute,
      requiredCharges
    );

    if (!chargeResult.isValid) {
      addLog(`${skillName}を発動するには有効なチャージが必要です（同属性、なし属性、またはSPチャージ）`, 'damage');
      return false;
    }

    // 技発動
    addLog(`${monster.name}の${skillName}を発動！`, 'info');
    addLog(`効果: ${skill.text}`, 'info');

    // 効果実行エンジンを使用
    const context = {
      currentPlayer,
      monsterIndex,
      skillType, // 'basic' or 'advanced'
      setP1Life,
      setP2Life,
      setP1Field,
      setP2Field,
      setP1Hand,
      setP2Hand,
      setP1Deck,
      setP2Deck,
      setP1Graveyard,
      setP2Graveyard,
      setP1ActiveSP,
      setP2ActiveSP,
      setP1RestedSP,
      setP2RestedSP,
      p1Field,
      p2Field,
      p1Hand,
      p2Hand,
      p1Deck,
      p2Deck,
      p1Graveyard,
      p2Graveyard,
      p1ActiveSP,
      p2ActiveSP,
      p1RestedSP,
      p2RestedSP,
      addLog,
      setPendingMonsterTarget,
      setPendingHandSelection,
      // 魔法ブロック設定（触覚持ち粘液獣等）
      setP1MagicBlocked,
      setP2MagicBlocked,
    };

    // カードIDを渡して効果を実行（カード固有処理がある場合は優先）
    const success = executeSkillEffects(skill.text, context, monster.id);

    // 技発動成功時、1ターン1回制限フラグを設定 + SPチャージを消費
    if (success !== false) {
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;
      setField(prev => {
        const newField = [...prev];
        if (newField[monsterIndex]) {
          const currentMonster = newField[monsterIndex];

          // SPチャージを消費（使用した分のみ削除、属性チャージは残す）
          // chargeResult.usedChargesに含まれるSPチャージを削除
          let spRemoved = 0;
          const remainingCharges = (currentMonster.charges || []).filter(charge => {
            if (charge.isSPCharge && spRemoved < chargeResult.spUsedCount) {
              spRemoved++;
              return false; // 削除
            }
            return true; // 属性チャージは残す
          });

          newField[monsterIndex] = {
            ...currentMonster,
            usedSkillThisTurn: true,
            charges: remainingCharges,
          };
        }
        return newField;
      });

      // SPチャージ消費ログ
      if (chargeResult.spUsedCount > 0) {
        addLog(`SPチャージ${chargeResult.spUsedCount}個を消費`, 'info');
      }
    }

    return success;
  }, [currentPlayer, p1Field, p2Field, p1Hand, p2Hand, p1Deck, p2Deck, p1Graveyard, p2Graveyard,
      p1ActiveSP, p2ActiveSP, p1RestedSP, p2RestedSP,
      addLog, setP1Life, setP2Life, setP1Field, setP2Field, setP1Hand, setP2Hand,
      setP1Deck, setP2Deck, setP1Graveyard, setP2Graveyard,
      setP1ActiveSP, setP2ActiveSP, setP1RestedSP, setP2RestedSP, setPendingMonsterTarget,
      setPendingHandSelection, setP1MagicBlocked, setP2MagicBlocked, dispatch]);

  // 【壮麗】発動
  const activateSourei = useCallback((monsterIndex) => {
    const myHand = currentPlayer === 1 ? p1Hand : p2Hand;
    const myField = currentPlayer === 1 ? p1Field : p2Field;
    const setMyHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
    const setMyField = currentPlayer === 1 ? setP1Field : setP2Field;
    const setMyGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
    const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

    const monster = myField[monsterIndex];
    if (!monster) return;

    // 同名カードを手札から探す
    const sameNameCard = findSameNameCardInHand(myHand, monster.name, monster.uniqueId);
    if (!sameNameCard) {
      addLog(`【壮麗】${monster.name}: 手札に同名カードがありません`, 'info');
      return;
    }

    // 手札から捨てる
    setMyHand(prev => prev.filter(c => c.uniqueId !== sameNameCard.uniqueId));
    setMyGraveyard(prev => [...prev, sameNameCard]);
    addLog(`【壮麗】${monster.name}: 手札から同名カードを捨てて効果発動！`, 'info');

    // 効果を適用
    const effect = getSoureiEffect(monster.id);
    if (!effect) return;

    switch (effect.effectType) {
      case 'negate_effect':
        // 相手モンスター1体の効果を無効化
        setPendingMonsterTarget({
          message: '効果を無効化するモンスターを選択',
          isOpponent: true,
          callback: (targetIndex) => {
            setOpponentField(prev => {
              const newField = [...prev];
              if (newField[targetIndex]) {
                newField[targetIndex] = { ...newField[targetIndex], effectNegated: true };
              }
              return newField;
            });
            addLog(`${monster.name}の【壮麗】効果: 相手モンスターの効果を無効化`, 'info');
          }
        });
        break;

      case 'grant_zankon':
        // 自分モンスター1体に【残魂】を付与
        setPendingMonsterTarget({
          message: '【残魂】を付与するモンスターを選択',
          isOpponent: false,
          callback: (targetIndex) => {
            setMyField(prev => {
              const newField = [...prev];
              if (newField[targetIndex]) {
                newField[targetIndex] = {
                  ...newField[targetIndex],
                  keyword: (newField[targetIndex].keyword || '') + '【残魂】',
                  grantedZankon: true
                };
              }
              return newField;
            });
            addLog(`${monster.name}の【壮麗】効果: 【残魂】を付与`, 'info');
          }
        });
        break;

      case 'double_attack':
        // このターン2回攻撃可能
        setMyField(prev => {
          const newField = [...prev];
          if (newField[monsterIndex]) {
            newField[monsterIndex] = { ...newField[monsterIndex], canDoubleAttack: true, attackCount: 0 };
          }
          return newField;
        });
        addLog(`${monster.name}の【壮麗】効果: このターン2回攻撃可能`, 'info');
        break;

      case 'damage_boost':
        // 次の戦闘ダメージ1.5倍
        setMyField(prev => {
          const newField = [...prev];
          if (newField[monsterIndex]) {
            newField[monsterIndex] = { ...newField[monsterIndex], damageBoost: 1.5 };
          }
          return newField;
        });
        addLog(`${monster.name}の【壮麗】効果: 次の戦闘ダメージ1.5倍`, 'info');
        break;

      case 'sp_reduce':
        // 相手の次ターンSP増加を-1（状態として記録）
        if (currentPlayer === 1) {
          setP2SpReduction(prev => prev + 1);
        } else {
          setP1SpReduction(prev => prev + 1);
        }
        addLog(`${monster.name}の【壮麗】効果: 相手の次ターンSP増加-1`, 'info');
        break;

      case 'halve_attack':
        // 相手モンスター全体の攻撃力を半減
        setOpponentField(prev => {
          return prev.map(m => {
            if (m) {
              const newAtk = Math.floor((m.currentAttack || m.attack) / 2);
              return { ...m, currentAttack: newAtk };
            }
            return m;
          });
        });
        addLog(`${monster.name}の【壮麗】効果: 相手モンスター全体の攻撃力半減`, 'info');
        break;

      default:
        addLog(`${monster.name}の【壮麗】効果: 未実装の効果タイプ`, 'info');
    }

    // 壮麗使用済みフラグを設定
    setMyField(prev => {
      const newField = [...prev];
      if (newField[monsterIndex]) {
        newField[monsterIndex] = { ...newField[monsterIndex], soureiUsedThisTurn: true };
      }
      return newField;
    });
  }, [currentPlayer, p1Hand, p2Hand, p1Field, p2Field, addLog,
      setP1Hand, setP2Hand, setP1Field, setP2Field, setP1Graveyard, setP2Graveyard,
      setPendingMonsterTarget, setP1SpReduction, setP2SpReduction]);

  // 【犠現】発動開始（生贄選択UIを表示）
  const startGigenActivation = useCallback((card, slotIndex) => {
    const myField = currentPlayer === 1 ? p1Field : p2Field;

    // フィールドにモンスターがいるか確認
    const validTargets = myField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('【犠現】フィールドに生贄にできるモンスターがいません', 'damage');
      return;
    }

    // 生贄選択待ち状態を設定
    setPendingGigenActivation({ card, slotIndex });
    setPendingMonsterTarget({
      message: '【犠現】生贄にするモンスターを選択',
      isOpponent: false,
      callback: (sacrificeIndex) => {
        completeGigenSummon(card, slotIndex, sacrificeIndex);
      }
    });
  }, [currentPlayer, p1Field, p2Field, addLog, setPendingGigenActivation, setPendingMonsterTarget]);

  // 【犠現】召喚完了（生贄選択後）
  const completeGigenSummon = useCallback((card, slotIndex, sacrificeIndex) => {
    const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
    const myField = currentPlayer === 1 ? p1Field : p2Field;
    const setMyField = currentPlayer === 1 ? setP1Field : setP2Field;
    const setMyHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
    const setMyGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
    const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
    const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;

    const sacrifice = myField[sacrificeIndex];
    if (!sacrifice) {
      addLog('【犠現】生贄対象が見つかりません', 'damage');
      setPendingGigenActivation(null);
      return;
    }

    // コスト軽減を計算
    const reduction = calculateGigenReduction(sacrifice);
    const reducedCost = Math.max(0, card.cost - reduction);

    if (activeSP < reducedCost) {
      addLog(`【犠現】SPが足りません（必要: ${reducedCost}, 現在: ${activeSP}）`, 'damage');
      setPendingGigenActivation(null);
      return;
    }

    // スロットが使用中でないか確認
    if (myField[slotIndex] !== null && slotIndex !== sacrificeIndex) {
      addLog('そのスロットは使用中です', 'damage');
      setPendingGigenActivation(null);
      return;
    }

    // 生贄モンスターを墓地へ
    setMyGraveyard(prev => [...prev, sacrifice]);
    addLog(`【犠現】${sacrifice.name}を生贄に捧げた（コスト-${reduction}）`, 'info');

    // モンスターを召喚
    const monsterInstance = createMonsterInstance(card);
    monsterInstance.canAttack = false;
    monsterInstance.owner = currentPlayer;

    // 召喚先スロット（生贄スロットでも可）
    const targetSlot = slotIndex !== sacrificeIndex ? slotIndex : sacrificeIndex;

    setMyField(prev => {
      const newField = [...prev];
      // 生贄スロットを空にする（別スロットに召喚する場合）
      if (slotIndex !== sacrificeIndex) {
        newField[sacrificeIndex] = null;
      }
      newField[targetSlot] = monsterInstance;
      return newField;
    });

    // 手札から削除
    setMyHand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));

    // SPを消費
    if (reducedCost > 0) {
      setActiveSP(prev => Math.max(0, prev - reducedCost));
      setRestedSP(prev => prev + reducedCost);
    }

    addLog(`${card.name}を召喚！（【犠現】コスト: ${reducedCost}）`, 'info');

    // トリガー登録
    registerCardTriggers(monsterInstance, currentPlayer, targetSlot);

    // 召喚時トリガーを発火
    fireTrigger(TRIGGER_TYPES.ON_SUMMON, {
      currentPlayer,
      card: monsterInstance,
      slotIndex: targetSlot,
      setP1Life, setP2Life,
      setP1Field, setP2Field,
      setP1Hand, setP2Hand,
      setP1Deck, setP2Deck,
      setP1Graveyard, setP2Graveyard,
      p1Field: currentPlayer === 1 ? [...myField.slice(0, sacrificeIndex), null, ...myField.slice(sacrificeIndex + 1)] : p1Field,
      p2Field: currentPlayer === 2 ? [...myField.slice(0, sacrificeIndex), null, ...myField.slice(sacrificeIndex + 1)] : p2Field,
      p1Hand, p2Hand,
      p1Deck, p2Deck,
      p1Graveyard, p2Graveyard,
      p1Life, p2Life,
      addLog,
      setPendingHandSelection,
      setPendingGraveyardSelection,
      setShowGraveyardViewer,
      setPendingDeckReview,
    });

    setPendingGigenActivation(null);
    setSelectedHandCard(null);
  }, [currentPlayer, p1ActiveSP, p2ActiveSP, p1Field, p2Field, p1Hand, p2Hand,
      p1Deck, p2Deck, p1Graveyard, p2Graveyard, p1Life, p2Life, addLog,
      setP1Field, setP2Field, setP1Hand, setP2Hand, setP1Graveyard, setP2Graveyard,
      setP1ActiveSP, setP2ActiveSP, setP1RestedSP, setP2RestedSP,
      setP1Life, setP2Life, setP1Deck, setP2Deck,
      setPendingHandSelection, setPendingGraveyardSelection, setShowGraveyardViewer, setPendingDeckReview,
      setSelectedHandCard, setPendingGigenActivation]);

  // カード召喚
  const summonCard = useCallback((card, slotIndex) => {
    // 現在のプレイヤーのSPを直接取得
    const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
    const field = currentPlayer === 1 ? p1Field : p2Field;

    // モンスターカードの場合、コスト軽減を計算
    let actualCost = card.cost;
    let costModifierSource = null;
    if (card.type === 'monster') {
      const context = {
        currentPlayer,
        effectOwner: currentPlayer,
        p1Field,
        p2Field,
        p1Life,
        p2Life,
      };
      // 常時効果からのコスト修正
      const { modifier, sources } = continuousEffectEngine.getSummonCostModifierDetails(card, currentPlayer, context);
      // カード固有の一時的コスト修正（潮の乙女など）
      const tempModifier = card.tempCostModifier || 0;
      const tempSource = card.tempCostModifierSource || null;

      const totalModifier = modifier + tempModifier;
      actualCost = Math.max(0, card.cost + totalModifier);

      const allSources = [...sources];
      if (tempSource) {
        allSources.push(tempSource);
      }
      if (totalModifier !== 0 && allSources.length > 0) {
        costModifierSource = allSources.join(', ');
      }
    }

    if (activeSP < actualCost) {
      addLog(`SPが足りません！（必要: ${actualCost}, 現在: ${activeSP}）`, 'damage');
      return false;
    }

    if (card.type === 'monster') {
      if (field[slotIndex] !== null) {
        addLog('そのスロットは使用中です', 'damage');
        return false;
      }

      const monsterInstance = createMonsterInstance(card);
      monsterInstance.canAttack = false; // 召喚ターンは攻撃不可
      monsterInstance.owner = currentPlayer; // 常時効果のターゲット判定用

      // フィールドにモンスターを配置
      // 「次の1体のみ」のコスト軽減を使用した場合、他のカードからリセット
      const usedOneTimeModifier = card.tempCostModifierOneTime && card.tempCostModifier;
      const oneTimeSource = usedOneTimeModifier ? card.tempCostModifierSource : null;

      if (currentPlayer === 1) {
        setP1Field(prev => {
          const newField = [...prev];
          newField[slotIndex] = monsterInstance;
          return newField;
        });
        // 手札からカードを削除し、同じソースの「次の1体のみ」軽減をリセット
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId).map(c => {
          if (oneTimeSource && c.tempCostModifierOneTime && c.tempCostModifierSource === oneTimeSource) {
            const { tempCostModifier, tempCostModifierSource, tempCostModifierOneTime, ...rest } = c;
            return rest;
          }
          return c;
        }));
        setP1ActiveSP(prev => prev - actualCost);
        setP1RestedSP(prev => prev + actualCost);
      } else {
        setP2Field(prev => {
          const newField = [...prev];
          newField[slotIndex] = monsterInstance;
          return newField;
        });
        // 手札からカードを削除し、同じソースの「次の1体のみ」軽減をリセット
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId).map(c => {
          if (oneTimeSource && c.tempCostModifierOneTime && c.tempCostModifierSource === oneTimeSource) {
            const { tempCostModifier, tempCostModifierSource, tempCostModifierOneTime, ...rest } = c;
            return rest;
          }
          return c;
        }));
        setP2ActiveSP(prev => prev - actualCost);
        setP2RestedSP(prev => prev + actualCost);
      }

      // コスト軽減があった場合はログに表示
      if (costModifierSource && actualCost < card.cost) {
        addLog(`プレイヤー${currentPlayer}: ${card.name}を召喚！（${costModifierSource}により召喚コスト${card.cost}→${actualCost}）`, 'info');
      } else {
        addLog(`プレイヤー${currentPlayer}: ${card.name}を召喚！`, 'info');
      }

      // トリガーを登録
      registerCardTriggers(monsterInstance, currentPlayer, slotIndex);

      // 常時効果を登録
      continuousEffectEngine.register(monsterInstance, currentPlayer);

      // 召喚時バフを適用（他のカードの常時効果による）
      const summonBuffContext = {
        currentPlayer,
        effectOwner: currentPlayer,
        p1Field: currentPlayer === 1 ? [...p1Field.slice(0, slotIndex), monsterInstance, ...p1Field.slice(slotIndex + 1)] : p1Field,
        p2Field: currentPlayer === 2 ? [...p2Field.slice(0, slotIndex), monsterInstance, ...p2Field.slice(slotIndex + 1)] : p2Field,
        p1Life,
        p2Life,
      };
      const summonBuffs = continuousEffectEngine.getSummonBuffs(monsterInstance, currentPlayer, summonBuffContext);
      if (summonBuffs.hpBuff > 0) {
        monsterInstance.currentHp += summonBuffs.hpBuff;
        monsterInstance.maxHp += summonBuffs.hpBuff;
        addLog(`${monsterInstance.name}のHPが${summonBuffs.hpBuff}アップ！（常時効果）`, 'info');
      }
      if (summonBuffs.atkBuff > 0) {
        monsterInstance.currentAttack += summonBuffs.atkBuff;
        addLog(`${monsterInstance.name}の攻撃力が${summonBuffs.atkBuff}アップ！（常時効果）`, 'info');
      }

      // 召喚時効果を実行（新表記【召喚時】と旧表記「召喚時」に対応）
      // ただし、トリガーシステムに実装済みの場合はスキップ（二重実行を防ぐ）
      const hasTriggerImplementation = hasCardTrigger(card.id, TRIGGER_TYPES.ON_SUMMON);

      if (card.effect && (card.effect.includes('召喚時') || card.effect.includes('【召喚時】')) && !hasTriggerImplementation) {
        addLog(`${card.name}の召喚時効果発動！`, 'info');

        // 召喚時効果を含む全テキストを渡す（カード固有処理で判定）
        const context = {
          currentPlayer,
          monsterIndex: slotIndex,
          card: monsterInstance,
          setP1Life,
          setP2Life,
          setP1Field,
          setP2Field,
          setP1Hand,
          setP2Hand,
          setP1Deck,
          setP2Deck,
          setP1Graveyard,
          setP2Graveyard,
          setP1ActiveSP,
          setP2ActiveSP,
          setP1RestedSP,
          setP2RestedSP,
          p1Field,
          p2Field,
          p1Hand,
          p2Hand,
          p1Deck,
          p2Deck,
          p1Graveyard,
          p2Graveyard,
          p1ActiveSP,
          p2ActiveSP,
          p1RestedSP,
          p2RestedSP,
          addLog,
          setPendingMonsterTarget,
        };
        // カードIDを渡して効果を実行
        executeSkillEffects(card.effect, context, card.id);
      }

      // 召喚時トリガーを発火（トリガーシステムに登録された効果を実行）
      const triggerContext = {
        currentPlayer,
        card: monsterInstance,
        slotIndex,
        monsterIndex: slotIndex, // トリガー効果で使用
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        setP1Hand,
        setP2Hand,
        setP1Deck,
        setP2Deck,
        setP1Graveyard,
        setP2Graveyard,
        setP1ActiveSP,
        setP2ActiveSP,
        setP1RestedSP,
        setP2RestedSP,
        p1Field,
        p2Field,
        p1Hand,
        p2Hand,
        p1Deck,
        p2Deck,
        p1Graveyard,
        p2Graveyard,
        p1Life,
        p2Life,
        p1ActiveSP,
        p2ActiveSP,
        p1RestedSP,
        p2RestedSP,
        addLog,
        setPendingHandSelection,
        setPendingGraveyardSelection,
        setShowGraveyardViewer,
        setPendingDeckReview,
      };
      fireTrigger(TRIGGER_TYPES.ON_SUMMON, triggerContext);

      return true;
    }

    if (card.type === 'magic') {
      // 魔法カード使用制限チェック（触覚持ち粘液獣等）
      const isMagicBlocked = currentPlayer === 1 ? p1MagicBlocked : p2MagicBlocked;
      if (isMagicBlocked) {
        addLog('魔法カードを使用できません！（触覚持ち粘液獣の効果）', 'damage');
        return false;
      }

      // 魔法カードのコスト軽減を計算
      const magicCostContext = {
        currentPlayer,
        effectOwner: currentPlayer,
        p1Field,
        p2Field,
        p1Life,
        p2Life,
      };
      const magicCostModifier = continuousEffectEngine.calculateMagicCostModifier(card, currentPlayer, magicCostContext);
      const actualMagicCost = Math.max(0, card.cost + magicCostModifier);

      if (activeSP < actualMagicCost) {
        addLog(`SPが足りません！（必要: ${actualMagicCost}, 現在: ${activeSP}）`, 'damage');
        return false;
      }

      if (currentPlayer === 1) {
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - actualMagicCost);
        setP1RestedSP(prev => prev + actualMagicCost);
        setP1Graveyard(prev => [...prev, card]);
      } else {
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - actualMagicCost);
        setP2RestedSP(prev => prev + actualMagicCost);
        setP2Graveyard(prev => [...prev, card]);
      }

      if (magicCostModifier !== 0) {
        addLog(`プレイヤー${currentPlayer}: ${card.name}を発動！（コスト${card.cost}→${actualMagicCost}）`, 'info');
      } else {
        addLog(`プレイヤー${currentPlayer}: ${card.name}を発動！`, 'info');
      }

      // 魔法効果を実行
      if (card.effect) {
        const context = {
          currentPlayer,
          monsterIndex: null, // 魔法カードはモンスターではない
          setP1Life,
          setP2Life,
          setP1Field,
          setP2Field,
          setP1Hand,
          setP2Hand,
          setP1Deck,
          setP2Deck,
          setP1Graveyard,
          setP2Graveyard,
          p1Field,
          p2Field,
          p1Hand,
          p2Hand,
          p1Deck,
          p2Deck,
          p1Graveyard,
          p2Graveyard,
          addLog,
          setPendingDeckReview,
          setPendingMonsterTarget,
          // 墓地選択（クラーケンの呼び声等）
          setPendingGraveyardSelection,
          setShowGraveyardViewer,
          // SPボーナス設定（マーメイドの恵み等）
          setP1NextTurnSPBonus,
          setP2NextTurnSPBonus,
        };
        executeSkillEffects(card.effect, context, card.id);
      }

      // 相手のON_OPPONENT_MAGIC_ACTIVATEDトリガーを発火（マグマ・ドラゴン等）
      const opponentPlayer = currentPlayer === 1 ? 2 : 1;
      const opponentMagicTriggerContext = {
        currentPlayer: opponentPlayer, // トリガー発動者は相手
        magicCard: card,               // 発動された魔法カード
        p1Field,
        p2Field,
        p1Life,
        p2Life,
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        p1ActiveSP,
        p2ActiveSP,
        addLog,
      };
      fireTrigger(TRIGGER_TYPES.ON_OPPONENT_MAGIC_ACTIVATED, opponentMagicTriggerContext);

      return true;
    }

    if (card.type === 'field') {
      // フィールドカードにowner情報を追加
      const fieldCardInstance = { ...card, owner: currentPlayer };

      if (currentPlayer === 1) {
        setP1FieldCard(fieldCardInstance);
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
      } else {
        setP2FieldCard(fieldCardInstance);
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
      }

      // トリガーを登録
      registerCardTriggers(fieldCardInstance, currentPlayer, null);

      // 常時効果を登録
      continuousEffectEngine.register(fieldCardInstance, currentPlayer);

      addLog(`プレイヤー${currentPlayer}: ${card.name}を設置！`, 'info');

      return true;
    }

    if (card.type === 'phasecard') {
      // フェイズカードに段階情報とチャージ配列とowner情報を追加
      const initializedPhaseCard = {
        ...card,
        stage: 0,           // 初期段階
        charges: [],        // チャージされたカード
        owner: currentPlayer, // 常時効果のターゲット判定用
      };

      if (currentPlayer === 1) {
        setP1PhaseCard(initializedPhaseCard);
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
      } else {
        setP2PhaseCard(initializedPhaseCard);
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
      }

      addLog(`プレイヤー${currentPlayer}: フェイズカード【${card.name}】を設置！【初期段階】`, 'info');

      // フェイズカードの初期効果を実行
      const context = {
        currentPlayer,
        card: initializedPhaseCard, // 発動元のフェイズカード（トリガーフィルタリング用）
        monsterIndex: null,
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        setP1Hand,
        setP2Hand,
        setP1Deck,
        setP2Deck,
        setP1Graveyard,
        setP2Graveyard,
        p1Field,
        p2Field,
        p1Hand,
        p2Hand,
        p1Deck,
        p2Deck,
        p1Graveyard,
        p2Graveyard,
        p1ActiveSP,
        p2ActiveSP,
        setP1ActiveSP,
        setP2ActiveSP,
        p1RestedSP,
        p2RestedSP,
        setP1RestedSP,
        setP2RestedSP,
        addLog,
      };

      // CSVの効果テキストから初期効果を取得して表示
      const initialEffectText = getPhaseCardStageText(card, 0);
      if (initialEffectText) {
        addLog(`【初期効果】: ${initialEffectText}`, 'info');
      }

      // フェイズカードのトリガーを登録
      registerCardTriggers(initializedPhaseCard, currentPlayer, null);

      // フェイズカードの常時効果を登録（初期段階 stage=0）
      continuousEffectEngine.registerPhaseCard(initializedPhaseCard, currentPlayer, 0);

      // 【発動時】トリガーを発火
      fireTrigger(TRIGGER_TYPES.ON_PHASE_CARD_ACTIVATE, context);

      return true;
    }

    return false;
  }, [currentPlayer, p1ActiveSP, p2ActiveSP, p1Field, p2Field, p1Hand, p2Hand,
      p1Deck, p2Deck, p1Graveyard, p2Graveyard, p1Life, p2Life, addLog,
      setP1Life, setP2Life, setP1Field, setP2Field, setP1Hand, setP2Hand,
      setP1Deck, setP2Deck, setP1Graveyard, setP2Graveyard,
      setP1ActiveSP, setP1RestedSP, setP2ActiveSP, setP2RestedSP, setP1FieldCard, setP2FieldCard,
      setP1PhaseCard, setP2PhaseCard, dispatch]); // Phase B: dispatch追加

  // =============================================================================
  // チェーンポイントシステム（刹那詠唱の発動タイミング）
  // =============================================================================

  // 非アクティブプレイヤーが刹那詠唱可能かチェック
  const canNonActivePlayerUseSetsuna = useCallback(() => {
    const nonActivePlayer = currentPlayer === 1 ? 2 : 1;
    const hand = nonActivePlayer === 1 ? p1Hand : p2Hand;
    const activeSP = nonActivePlayer === 1 ? p1ActiveSP : p2ActiveSP;
    return getActivatableSetsunaMagics(hand, activeSP).length > 0;
  }, [currentPlayer, p1Hand, p2Hand, p1ActiveSP, p2ActiveSP]);

  // チェーンポイントで確認を開始
  const startChainConfirmation = useCallback((chainPoint, pendingAction, context = {}) => {
    const nonActivePlayer = currentPlayer === 1 ? 2 : 1;

    // 刹那詠唱可能なカードがなければスキップ
    if (!canNonActivePlayerUseSetsuna()) {
      return false; // 確認不要、すぐに実行可能
    }

    // チェーン確認状態を設定
    setChainConfirmation({
      chainPoint,
      askingPlayer: nonActivePlayer,
      pendingAction,
      context,
    });

    const pointName = CHAIN_POINT_NAMES[chainPoint] || chainPoint;
    addLog(`【${pointName}】プレイヤー${nonActivePlayer}、刹那詠唱を発動しますか？`, 'info');

    return true; // 確認中
  }, [currentPlayer, canNonActivePlayerUseSetsuna, addLog]);

  // =============================================================================
  // 攻撃処理（チェーン確認後に実行される内部関数）
  // =============================================================================

  const executeAttack = useCallback((attackerIndex, targetIndex) => {
    // 現在のプレイヤーと相手のフィールドを直接取得
    const playerField = currentPlayer === 1 ? p1Field : p2Field;
    const opponentField = currentPlayer === 1 ? p2Field : p1Field;

    const attacker = playerField[attackerIndex];
    if (!attacker || !attacker.canAttack) {
      addLog('このモンスターは攻撃できません', 'damage');
      return;
    }

    // 常時効果による攻撃制限をチェック
    const effectContext = {
      currentPlayer,
      effectOwner: currentPlayer,
      p1Field,
      p2Field,
      p1Life,
      p2Life,
    };
    if (!continuousEffectEngine.canAttack(attacker, effectContext)) {
      addLog(`${attacker.name}は常時効果により攻撃できません！`, 'damage');
      return;
    }

    // 状態異常による攻撃制限をチェック（眠り、凍結、行動不能）
    if (!statusEffectEngine.canAttack(attacker)) {
      const statusName = statusEffectEngine.getBlockingStatusName(attacker, 'attack');
      addLog(`${attacker.name}は${statusName}により攻撃できません！`, 'damage');
      return;
    }

    const target = opponentField[targetIndex];

    // 常時効果による攻撃力修正を計算
    const attackerAtkMod = continuousEffectEngine.calculateAttackModifier(attacker, effectContext);
    // 状態異常による攻撃力修正を計算（凍結-50%、雷撃-500）
    const attackerStatusMod = statusEffectEngine.getAttackModifier(attacker);
    let effectiveAttackerAtk = Math.max(0, attacker.currentAttack + attackerAtkMod + attackerStatusMod);

    // 【孤軍奮闘】自分のモンスターが相手より少ない場合の補正
    let loneWarriorAtkBonus = 0;
    let loneWarriorDamageReduction = 0;
    if (RULE_LONE_WARRIOR) {
      const myMonsterCount = playerField.filter(m => m !== null).length;
      const opponentMonsterCount = opponentField.filter(m => m !== null).length;
      const countDiff = opponentMonsterCount - myMonsterCount;

      if (countDiff > 0) {
        const bonusLevel = Math.min(countDiff, 3); // 最大3体差
        const bonus = LONE_WARRIOR_BONUS[bonusLevel];
        loneWarriorAtkBonus = bonus.atkBonus;
        loneWarriorDamageReduction = bonus.damageReduction;

        const atkIncrease = Math.floor(effectiveAttackerAtk * loneWarriorAtkBonus);
        effectiveAttackerAtk += atkIncrease;
        addLog(`【孤軍奮闘】${countDiff}体差！ATK+${Math.floor(loneWarriorAtkBonus * 100)}%（+${atkIncrease}）`, 'info');
      }
    }

    if (target) {
      // モンスター攻撃
      const targetAtkMod = continuousEffectEngine.calculateAttackModifier(target, { ...effectContext, effectOwner: currentPlayer === 1 ? 2 : 1 });
      const targetStatusMod = statusEffectEngine.getAttackModifier(target);
      const effectiveTargetAtk = Math.max(0, target.currentAttack + targetAtkMod + targetStatusMod);

      let damage = effectiveAttackerAtk;
      // 状態異常による被ダメージ倍率（濡れ: 2倍）
      const damageMultiplier = statusEffectEngine.getDamageMultiplier(target);
      damage = Math.floor(damage * damageMultiplier);
      // 状態異常による軽減（守護: 50%）
      const { reduction, usedGuard, updatedMonster: targetAfterGuard } = statusEffectEngine.calculateDamageReduction(target, damage);
      damage = Math.max(0, damage - reduction);

      let counterDamage = Math.floor(effectiveTargetAtk * COUNTER_ATTACK_RATE);

      // 【孤軍奮闘】被ダメージ軽減を反撃に適用
      if (RULE_LONE_WARRIOR && loneWarriorDamageReduction > 0) {
        const reduction = Math.floor(counterDamage * loneWarriorDamageReduction);
        counterDamage -= reduction;
        addLog(`【孤軍奮闘】被ダメ-${Math.floor(loneWarriorDamageReduction * 100)}%（-${reduction}）`, 'info');
      }

      addLog(`${attacker.name}が${target.name}を攻撃！`, 'info');

      // ダメージ処理（新しいオブジェクトを作成）
      // 守護を使用した場合、更新されたモンスターを使用
      const targetForDamage = usedGuard ? targetAfterGuard : target;
      let newTargetHp = targetForDamage.currentHp - damage;
      let newAttackerHp = attacker.currentHp - counterDamage;

      // 破壊耐性チェック: HP0以下になる場合はHP1で止まる
      const targetHasIndestructible = targetForDamage.indestructibleUntilEndOfTurn;
      const attackerHasIndestructible = attacker.indestructibleUntilEndOfTurn;

      if (targetHasIndestructible && newTargetHp <= 0) {
        newTargetHp = 1;
      }
      if (attackerHasIndestructible && newAttackerHp <= 0) {
        newAttackerHp = 1;
      }

      if (damageMultiplier > 1) {
        addLog(`${target.name}は濡れ状態でダメージ増加！`, 'info');
      }
      if (usedGuard) {
        addLog(`${target.name}の守護でダメージ軽減！`, 'info');
      }
      addLog(`${target.name}に${damage}ダメージ！`, 'damage');

      // 【死触】チェック: ダメージが1以上であれば、HPに関係なく相手モンスターを破壊
      const shishokuTriggered = shouldApplyShishoku(attacker, damage);
      if (shishokuTriggered) {
        addLog(`【死触】${attacker.name}のダメージにより${target.name}は即座に破壊される！`, 'damage');
      }

      // 破壊耐性による救済（【死触】含む）
      const targetShouldBeDestroyed = newTargetHp <= 0 || shishokuTriggered;
      if (targetHasIndestructible && targetShouldBeDestroyed) {
        addLog(`${target.name}は破壊されない！（HP: 1）`, 'info');
      }
      addLog(`反撃で${attacker.name}に${counterDamage}ダメージ！`, 'damage');
      if (attackerHasIndestructible && attacker.currentHp - counterDamage <= 0) {
        addLog(`${attacker.name}は破壊されない！（HP: 1）`, 'info');
      }

      // 【貫通ダメージ】モンスター破壊時に余剰ダメージの50%を相手ライフに与える
      // 【死触】による破壊は貫通ダメージなし（余剰ダメージがないため）
      let piercingDamage = 0;
      const targetWillBeDestroyedByDamage = newTargetHp <= 0 && !targetHasIndestructible;
      if (RULE_PIERCING_DAMAGE && targetWillBeDestroyedByDamage) {
        const excessDamage = damage - targetForDamage.currentHp;
        piercingDamage = Math.floor(excessDamage * PIERCING_DAMAGE_RATE);
        if (piercingDamage > 0) {
          addLog(`【貫通ダメージ】余剰${excessDamage}の${Math.floor(PIERCING_DAMAGE_RATE * 100)}%→${piercingDamage}ダメージ！`, 'damage');
        }
      }

      // 相手フィールドの更新
      // 【死触】による破壊も含む（破壊耐性がない場合）
      const targetDestroyed = targetShouldBeDestroyed && !targetHasIndestructible;
      if (currentPlayer === 1) {
        // プレイヤー1が攻撃 → 相手はプレイヤー2
        if (targetDestroyed) {
          // 破壊時トリガーを発火（破壊される前）
          const destroyContext = {
            currentPlayer: 2, // 破壊されるモンスターのオーナー
            destroyedCard: target,
            destroyedSlotIndex: targetIndex,
            setP1Life,
            setP2Life,
            setP1Field,
            setP2Field,
            setP1Hand,
            setP2Hand,
            setP1Deck,
            setP2Deck,
            setP1Graveyard,
            setP2Graveyard,
            setP1FieldCard,
            setP2FieldCard,
            p1Field,
            p2Field,
            p1Hand,
            p2Hand,
            p1Deck,
            p2Deck,
            p1Graveyard,
            p2Graveyard,
            p1FieldCard,
            p2FieldCard,
            p1Life,
            p2Life,
            addLog,
            registerCardTriggers,
            continuousEffectEngine,
          };
          fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);
          // 場を離れる時トリガーを発火
          fireLeaveFieldTrigger(target, destroyContext, 'destroy');

          // 【魂結】リンク解除処理
          handleLinkBreak(target, setP2Field, addLog);

          // トリガー登録を解除
          unregisterCardTriggers(target.uniqueId);
          // 常時効果を解除
          continuousEffectEngine.unregister(target.uniqueId);

          setP2Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = null;
            return newField;
          });
          setP2Graveyard(prev => [...prev, target]);
          addLog(`${target.name}は破壊された！`, 'damage');

          // 【貫通ダメージ】相手ライフに適用
          if (piercingDamage > 0) {
            setP2Life(prev => Math.max(0, prev - piercingDamage));
          }
        } else {
          setP2Field(prev => {
            const newField = [...prev];
            // 守護使用後のモンスター状態を反映
            newField[targetIndex] = { ...targetForDamage, currentHp: newTargetHp };
            return newField;
          });
        }

        // 自分のフィールドの更新
        if (newAttackerHp <= 0) {
          // 破壊時トリガーを発火（破壊される前）
          const destroyContext = {
            currentPlayer: 1, // 破壊されるモンスターのオーナー
            destroyedCard: attacker,
            destroyedSlotIndex: attackerIndex,
            setP1Life,
            setP2Life,
            setP1Field,
            setP2Field,
            setP1Hand,
            setP2Hand,
            setP1Deck,
            setP2Deck,
            setP1Graveyard,
            setP2Graveyard,
            setP1FieldCard,
            setP2FieldCard,
            p1Field,
            p2Field,
            p1Hand,
            p2Hand,
            p1Deck,
            p2Deck,
            p1Graveyard,
            p2Graveyard,
            p1FieldCard,
            p2FieldCard,
            p1Life,
            p2Life,
            addLog,
            registerCardTriggers,
            continuousEffectEngine,
          };
          fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);
          // 場を離れる時トリガーを発火
          fireLeaveFieldTrigger(attacker, destroyContext, 'destroy');

          // 【魂結】リンク解除処理
          handleLinkBreak(attacker, setP1Field, addLog);

          // トリガー登録を解除
          unregisterCardTriggers(attacker.uniqueId);
          // 常時効果を解除
          continuousEffectEngine.unregister(attacker.uniqueId);

          setP1Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = null;
            return newField;
          });
          setP1Graveyard(prev => [...prev, attacker]);
          addLog(`${attacker.name}は破壊された！`, 'damage');
        } else {
          setP1Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = { ...attacker, currentHp: newAttackerHp, canAttack: false };
            return newField;
          });
        }
      } else {
        // プレイヤー2が攻撃 → 相手はプレイヤー1
        if (targetDestroyed) {
          // 破壊時トリガーを発火（破壊される前）
          const destroyContext = {
            currentPlayer: 1, // 破壊されるモンスターのオーナー
            destroyedCard: target,
            destroyedSlotIndex: targetIndex,
            setP1Life,
            setP2Life,
            setP1Field,
            setP2Field,
            setP1Hand,
            setP2Hand,
            setP1Deck,
            setP2Deck,
            setP1Graveyard,
            setP2Graveyard,
            setP1FieldCard,
            setP2FieldCard,
            p1Field,
            p2Field,
            p1Hand,
            p2Hand,
            p1Deck,
            p2Deck,
            p1Graveyard,
            p2Graveyard,
            p1FieldCard,
            p2FieldCard,
            p1Life,
            p2Life,
            addLog,
            registerCardTriggers,
            continuousEffectEngine,
          };
          fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);
          // 場を離れる時トリガーを発火
          fireLeaveFieldTrigger(target, destroyContext, 'destroy');

          // 【魂結】リンク解除処理
          handleLinkBreak(target, setP1Field, addLog);

          // トリガー登録を解除
          unregisterCardTriggers(target.uniqueId);
          // 常時効果を解除
          continuousEffectEngine.unregister(target.uniqueId);

          setP1Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = null;
            return newField;
          });
          setP1Graveyard(prev => [...prev, target]);
          addLog(`${target.name}は破壊された！`, 'damage');

          // 【貫通ダメージ】相手ライフに適用
          if (piercingDamage > 0) {
            setP1Life(prev => Math.max(0, prev - piercingDamage));
          }
        } else {
          setP1Field(prev => {
            const newField = [...prev];
            // 守護使用後のモンスター状態を反映
            newField[targetIndex] = { ...targetForDamage, currentHp: newTargetHp };
            return newField;
          });
        }

        // 自分のフィールドの更新
        if (newAttackerHp <= 0) {
          // 破壊時トリガーを発火（破壊される前）
          const destroyContext = {
            currentPlayer: 2, // 破壊されるモンスターのオーナー
            destroyedCard: attacker,
            destroyedSlotIndex: attackerIndex,
            setP1Life,
            setP2Life,
            setP1Field,
            setP2Field,
            setP1Hand,
            setP2Hand,
            setP1Deck,
            setP2Deck,
            setP1Graveyard,
            setP2Graveyard,
            setP1FieldCard,
            setP2FieldCard,
            p1Field,
            p2Field,
            p1Hand,
            p2Hand,
            p1Deck,
            p2Deck,
            p1Graveyard,
            p2Graveyard,
            p1FieldCard,
            p2FieldCard,
            p1Life,
            p2Life,
            addLog,
            registerCardTriggers,
            continuousEffectEngine,
          };
          fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);
          // 場を離れる時トリガーを発火
          fireLeaveFieldTrigger(attacker, destroyContext, 'destroy');

          // 【魂結】リンク解除処理
          handleLinkBreak(attacker, setP2Field, addLog);

          // トリガー登録を解除
          unregisterCardTriggers(attacker.uniqueId);
          // 常時効果を解除
          continuousEffectEngine.unregister(attacker.uniqueId);

          setP2Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = null;
            return newField;
          });
          setP2Graveyard(prev => [...prev, attacker]);
          addLog(`${attacker.name}は破壊された！`, 'damage');
        } else {
          setP2Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = { ...attacker, currentHp: newAttackerHp, canAttack: false };
            return newField;
          });
        }
      }
    } else {
      // ダイレクトアタック判定
      const hasOpponentMonster = opponentField.some(m => m !== null);
      let damage = effectiveAttackerAtk; // 常時効果による修正を適用
      const opponentFieldCard = currentPlayer === 1 ? p2FieldCard : p1FieldCard;

      if (hasOpponentMonster) {
        damage = Math.floor(damage * 0.5);
        addLog(`相手の場にモンスターがいるためダメージ半減`, 'info');
      }

      if (opponentFieldCard) {
        damage = Math.floor(damage * 0.75);
        addLog(`フィールドカードによりダメージ75%`, 'info');
      }

      addLog(`${attacker.name}がダイレクトアタック！${damage}ダメージ！`, 'damage');

      if (currentPlayer === 1) {
        setP2Life(prev => Math.max(0, prev - damage));
        setP1Field(prev => {
          const newField = [...prev];
          newField[attackerIndex] = { ...attacker, canAttack: false };
          return newField;
        });
      } else {
        setP1Life(prev => Math.max(0, prev - damage));
        setP2Field(prev => {
          const newField = [...prev];
          newField[attackerIndex] = { ...attacker, canAttack: false };
          return newField;
        });
      }

      // 【毒侵】判定: ダイレクトアタック成功時に相手プレイヤーを毒状態にする
      if (shouldApplyDokushin(attacker, damage)) {
        const setOpponentStatusEffects = currentPlayer === 1 ? setP2StatusEffects : setP1StatusEffects;
        setOpponentStatusEffects(prev => [
          ...prev,
          { type: 'poison', value: 100, source: attacker.id, sourceName: attacker.name }
        ]);
        addLog(`【毒侵】${attacker.name}により相手プレイヤーが毒状態に！（毎ターン100ダメージ）`, 'damage');
      }
    }

    setAttackingMonster(null);
    setSelectedFieldMonster(null);
  }, [currentPlayer, p1Field, p2Field, p1FieldCard, p2FieldCard, p1Life, p2Life, p1Hand, p2Hand, p1Deck, p2Deck, p1Graveyard, p2Graveyard, p1StatusEffects, p2StatusEffects, addLog]);

  // チェーン確認をスキップ（発動しない）
  const skipChainConfirmation = useCallback(() => {
    if (!chainConfirmation) return;

    const { pendingAction } = chainConfirmation;
    setChainConfirmation(null);

    // 保留中のアクションを実行
    if (pendingAction.type === 'attack') {
      executeAttack(pendingAction.attackerIndex, pendingAction.targetIndex);
    } else if (pendingAction.type === 'battleStart') {
      // バトルフェイズへ進行
      dispatch(gameActions.setPhase(3));
      setSelectedHandCard(null);
    }
  }, [chainConfirmation, executeAttack, dispatch]);

  // チェーン確認で刹那詠唱を発動する
  const activateSetsunaInChain = useCallback((card) => {
    if (!chainConfirmation || !card) return;

    const { pendingAction, askingPlayer } = chainConfirmation;

    // 刹那詠唱を発動（currentPlayerを一時的にaskingPlayerに変更して処理）
    const setsunaCost = getSetsunaCost(card);
    const activeSP = askingPlayer === 1 ? p1ActiveSP : p2ActiveSP;

    if (activeSP < setsunaCost) {
      addLog(`SPが足りません！（刹那詠唱コスト: ${setsunaCost}, 現在: ${activeSP}）`, 'damage');
      return;
    }

    // SPを消費
    if (askingPlayer === 1) {
      setP1ActiveSP(prev => prev - setsunaCost);
      setP1RestedSP(prev => prev + setsunaCost);
      setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      setP1Graveyard(prev => [...prev, card]);
    } else {
      setP2ActiveSP(prev => prev - setsunaCost);
      setP2RestedSP(prev => prev + setsunaCost);
      setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      setP2Graveyard(prev => [...prev, card]);
    }

    addLog(`プレイヤー${askingPlayer}: 【刹那詠唱】${card.name}を発動！（コスト${card.cost}+1=${setsunaCost}）`, 'info');

    // 魔法効果を実行
    if (card.effect) {
      // 攻撃宣言時の場合、攻撃者情報をコンテキストに追加
      const attackerInfo = {};
      if (pendingAction.type === 'attack') {
        const attackerField = currentPlayer === 1 ? p1Field : p2Field;
        attackerInfo.attacker = attackerField[pendingAction.attackerIndex];
        attackerInfo.attackerIndex = pendingAction.attackerIndex;
        attackerInfo.targetIndex = pendingAction.targetIndex;
      }

      const context = {
        currentPlayer: askingPlayer,
        monsterIndex: null,
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        setP1Hand,
        setP2Hand,
        setP1Deck,
        setP2Deck,
        setP1Graveyard,
        setP2Graveyard,
        p1Field,
        p2Field,
        p1Hand,
        p2Hand,
        p1Deck,
        p2Deck,
        p1Graveyard,
        p2Graveyard,
        addLog,
        setPendingDeckReview,
        setPendingMonsterTarget,
        setPendingHandSelection,
        // 刹那詠唱用: 攻撃宣言時の攻撃モンスター情報
        ...attackerInfo,
        chainContext: chainConfirmation.context,
      };
      executeSkillEffects(card.effect, context, card.id);
    }

    // Phase A: 1回のみなので確認終了
    setChainConfirmation(null);
    setSetsunaPendingCard(null);

    // 保留中のアクションを設定（pending系の処理が完了するまで待機）
    // useEffectでpendingMonsterTarget/pendingHandSelectionがクリアされたら実行
    setPendingSetsunaAction(pendingAction);
  }, [chainConfirmation, p1ActiveSP, p2ActiveSP, p1Field, p2Field, p1Hand, p2Hand,
      p1Deck, p2Deck, p1Graveyard, p2Graveyard, addLog]);

  // チェーン確認をキャンセル（攻撃自体をキャンセル）
  const cancelChainAndAction = useCallback(() => {
    setChainConfirmation(null);
    setSetsunaPendingCard(null);
    setAttackingMonster(null);
    addLog('行動がキャンセルされました', 'info');
  }, [addLog]);

  // =============================================================================
  // 攻撃開始（チェーン確認を挟む公開API）
  // =============================================================================

  const attack = useCallback((attackerIndex, targetIndex) => {
    // チェーン確認中の場合は無視
    if (chainConfirmation) {
      addLog('チェーン確認中です', 'info');
      return;
    }

    // 基本的なバリデーション
    const playerField = currentPlayer === 1 ? p1Field : p2Field;
    const attacker = playerField[attackerIndex];
    if (!attacker || !attacker.canAttack) {
      addLog('このモンスターは攻撃できません', 'damage');
      return;
    }

    // 状態異常による攻撃制限をチェック（チェーン確認前に判定）
    if (!statusEffectEngine.canAttack(attacker)) {
      const statusName = statusEffectEngine.getBlockingStatusName(attacker, 'attack');
      addLog(`${attacker.name}は${statusName}により攻撃できません！`, 'damage');
      return;
    }

    // 攻撃宣言時のチェーンポイントを開始
    const needsConfirmation = startChainConfirmation(
      CHAIN_POINTS.ATTACK_DECLARATION,
      { type: 'attack', attackerIndex, targetIndex },
      { attacker }
    );

    if (!needsConfirmation) {
      // チェーン確認不要（相手が刹那詠唱を持っていない）→ 直接攻撃実行
      executeAttack(attackerIndex, targetIndex);
    }
    // needsConfirmation === true の場合、確認UIが表示される
  }, [chainConfirmation, currentPlayer, p1Field, p2Field, startChainConfirmation, executeAttack, addLog]);

  // 勝敗判定
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (p1Life <= 0) {
      dispatch(gameActions.setWinner(2));
      setGameState('gameOver');
      // ログはsetWinnerで追加される
    } else if (p2Life <= 0) {
      dispatch(gameActions.setWinner(1));
      setGameState('gameOver');
      // ログはsetWinnerで追加される
    }
  }, [p1Life, p2Life, gameState, dispatch]);

  // フェイズ自動進行
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (phase === 0 || phase === 1) {
      const timer = setTimeout(() => processPhase(phase), getScaledDelay(500));
      return () => clearTimeout(timer);
    }
  }, [phase, gameState, processPhase]);

  // バトルフェイズ開始時にAI攻撃済みモンスターをリセット（別useEffectで管理）
  useEffect(() => {
    // フェイズが3（バトルフェイズ）に変わったときのみリセット
    if (phase === 3 && prevPhaseRef.current !== 3) {
      setAiAttackedMonsters(new Set());
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // 刹那詠唱効果完了後のアクション実行
  // pendingMonsterTarget/pendingHandSelectionがクリアされたらpendingSetsunaActionを実行
  useEffect(() => {
    if (!pendingSetsunaAction) return;
    // pending系の処理がまだある場合は待機
    if (pendingMonsterTarget || pendingHandSelection || pendingGraveyardSelection || pendingDeckReview) {
      return;
    }

    // 少し遅延してアクションを実行（状態更新の反映を待つ）
    const timeoutId = setTimeout(() => {
      if (pendingSetsunaAction.type === 'attack') {
        executeAttack(pendingSetsunaAction.attackerIndex, pendingSetsunaAction.targetIndex);
      } else if (pendingSetsunaAction.type === 'battleStart') {
        dispatch(gameActions.setPhase(3));
        setSelectedHandCard(null);
      }
      setPendingSetsunaAction(null);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pendingSetsunaAction, pendingMonsterTarget, pendingHandSelection, pendingGraveyardSelection, pendingDeckReview, executeAttack, dispatch]);

  // AIターン実行
  useEffect(() => {
    if (gameState !== 'playing') return;

    // AIプレイヤー判定用ヘルパー
    const isPlayerAI = (player) =>
      (player === 1 && p1PlayerType === 'ai') ||
      (player === 2 && p2PlayerType === 'ai');

    // 特殊ケース: チェーン確認（相手ターンでも発生するため最優先でチェック）
    if (chainConfirmation) {
      const askingPlayer = chainConfirmation.askingPlayer;
      if (isPlayerAI(askingPlayer)) {
        const difficulty = askingPlayer === 1 ? p1AIDifficulty : p2AIDifficulty;
        const strategy = getStrategy(difficulty);

        const gameStateData = {
          phase, turn, isFirstTurn, // Phase D-3: engineState直接参照
          p1Life, p2Life,
          p1Hand, p2Hand,
          p1Field, p2Field,
          p1Graveyard, p2Graveyard,
          p1Deck, p2Deck,
          p1ActiveSP, p2ActiveSP,
          p1RestedSP, p2RestedSP,
          p1FieldCard, p2FieldCard,
          p1PhaseCard, p2PhaseCard,
        };
        const aiGameState = createAIGameState(askingPlayer, gameStateData);

        const availableSetsunaCards = getActivatableSetsunaMagics(
          askingPlayer === 1 ? p1Hand : p2Hand,
          askingPlayer === 1 ? p1ActiveSP : p2ActiveSP
        );

        const timeoutId = setTimeout(() => {
          handleAIChainConfirmation(
            chainConfirmation,
            availableSetsunaCards,
            aiGameState,
            strategy,
            { skipChainConfirmation, activateSetsunaInChain }
          );
        }, getScaledDelay(AI_DELAY.LONG));
        return () => clearTimeout(timeoutId);
      }
      return; // 人間プレイヤーがチェーン確認中
    }

    // 通常ターン: 現在のプレイヤーがAIか判定
    if (!isPlayerAI(currentPlayer)) return;

    const difficulty = currentPlayer === 1 ? p1AIDifficulty : p2AIDifficulty;
    const strategy = getStrategy(difficulty);

    const gameStateData = {
      phase, turn, isFirstTurn, // Phase D-3: engineState直接参照
      p1Life, p2Life,
      p1Hand, p2Hand,
      p1Field, p2Field,
      p1Graveyard, p2Graveyard,
      p1Deck, p2Deck,
      p1ActiveSP, p2ActiveSP,
      p1RestedSP, p2RestedSP,
      p1FieldCard, p2FieldCard,
      p1PhaseCard, p2PhaseCard,
    };
    const aiGameState = createAIGameState(currentPlayer, gameStateData);

    // 特殊ケース: 手札選択
    if (pendingHandSelection) {
      const timeoutId = setTimeout(() => {
        handleAIHandSelection(pendingHandSelection, aiGameState, strategy);
        setPendingHandSelection(null);
        setPendingSelectedCard(null);
      }, getScaledDelay(AI_DELAY.MEDIUM));
      return () => clearTimeout(timeoutId);
    }

    // 特殊ケース: モンスターターゲット選択
    if (pendingMonsterTarget) {
      const timeoutId = setTimeout(() => {
        handleAIMonsterTarget(pendingMonsterTarget, aiGameState, strategy);
        setPendingMonsterTarget(null);
        setPendingSelectedMonsterIndex(null);
      }, getScaledDelay(AI_DELAY.MEDIUM));
      return () => clearTimeout(timeoutId);
    }

    // 特殊ケース: 墓地選択
    if (pendingGraveyardSelection) {
      const timeoutId = setTimeout(() => {
        handleAIGraveyardSelection(pendingGraveyardSelection, aiGameState, strategy);
        setPendingGraveyardSelection(null);
        setPendingGraveyardSelectedCard(null);
      }, getScaledDelay(AI_DELAY.MEDIUM));
      return () => clearTimeout(timeoutId);
    }

    // 特殊ケース: デッキ確認
    if (pendingDeckReview) {
      const timeoutId = setTimeout(() => {
        handleAIDeckReview(pendingDeckReview, aiGameState, strategy);
        setPendingDeckReview(null);
      }, getScaledDelay(AI_DELAY.MEDIUM));
      return () => clearTimeout(timeoutId);
    }

    // メインフェイズ
    if (phase === 2) {
      const timeoutId = setTimeout(() => {
        const actions = {
          summonCard: (card, slot) => summonCard(card, slot),
          executeSkill: (monsterIndex, skillType) => executeSkill(monsterIndex, skillType),
          activateMagicCard: (card) => {
            // 魔法カードの発動処理を直接実行
            if (card && card.type === 'magic') {
              summonCard(card, 0);
            }
          },
          activateTrigger: (trigger) => {
            // トリガー発動ロジック（簡易実装）
            addLog(`AI: トリガー発動`, 'info');
          },
          chargeCard: (card, monsterIndex) => chargeCard(card, monsterIndex),
          placeFieldCard: (card) => {
            // フィールドカードの配置（summonCardがfieldタイプを処理）
            if (card && card.type === 'field') {
              summonCard(card, 0);
            }
          },
          placePhaseCard: (card) => {
            // フェイズカードの配置（summonCardがphasecardタイプを処理）
            if (card && card.type === 'phasecard') {
              summonCard(card, 0);
            }
          },
          nextPhase: () => nextPhase(),
        };

        executeAIMainPhaseAction(aiGameState, actions, strategy, {
          chargeUsedThisTurn,
        });
        // アクション実行後にカウンターをインクリメント（空振り時もuseEffect再トリガー用）
        setAiActionCounter(prev => prev + 1);
      }, getScaledDelay(AI_DELAY.MEDIUM));
      return () => clearTimeout(timeoutId);
    }

    // バトルフェイズ
    if (phase === 3) {
      const timeoutId = setTimeout(() => {
        const actions = {
          attack: (attackerIndex, targetIndex) => attack(attackerIndex, targetIndex),
          nextPhase: () => nextPhase(),
        };

        const result = executeAIBattlePhaseAction(aiGameState, actions, strategy, aiAttackedMonsters);
        setAiAttackedMonsters(result.attackedMonsters);
        // アクション実行後にカウンターをインクリメント（空振り時もuseEffect再トリガー用）
        setAiActionCounter(prev => prev + 1);
      }, getScaledDelay(AI_DELAY.MEDIUM));
      return () => clearTimeout(timeoutId);
    }
  }, [
    gameState, phase, currentPlayer, turn, isFirstTurn,
    p1PlayerType, p2PlayerType, p1AIDifficulty, p2AIDifficulty,
    p1Life, p2Life, p1Hand, p2Hand, p1Field, p2Field,
    p1Graveyard, p2Graveyard, p1Deck, p2Deck,
    p1ActiveSP, p2ActiveSP, p1RestedSP, p2RestedSP,
    p1FieldCard, p2FieldCard, p1PhaseCard, p2PhaseCard,
    pendingHandSelection, pendingMonsterTarget, pendingGraveyardSelection, pendingDeckReview,
    chainConfirmation, aiAttackedMonsters, chargeUsedThisTurn,
    aiActionCounter, // AIアクション空振り時も再トリガーするため
  ]);

  // ハンドカードクリック
  const handleHandCardClick = (card) => {
    if (phase !== 2) return;
    // 現在のプレイヤーの手札かどうかチェック
    const currentHand = currentPlayer === 1 ? p1Hand : p2Hand;
    if (!currentHand.find(c => c.uniqueId === card.uniqueId)) return;

    // 手札選択待ち状態の場合：pendingSelectedCardを使用（通常のアクションを無効化）
    if (pendingHandSelection) {
      // フィルターがある場合はチェック
      if (pendingHandSelection.filter && !pendingHandSelection.filter(card)) {
        addLog('そのカードは選択できません', 'damage');
        return;
      }
      // 選択状態を切り替え（同じカードをクリックで選択解除）
      setPendingSelectedCard(pendingSelectedCard?.uniqueId === card.uniqueId ? null : card);
      return;
    }

    setSelectedHandCard(selectedHandCard?.uniqueId === card.uniqueId ? null : card);
    setSelectedFieldMonster(null);
    setAttackingMonster(null);
  };

  // 手札選択を確定
  const confirmHandSelection = () => {
    if (!pendingHandSelection || !pendingSelectedCard) return;

    try {
      // コールバックを実行
      pendingHandSelection.callback(pendingSelectedCard);
    } catch (error) {
      console.error('手札選択コールバックエラー:', error);
      addLog('手札選択処理でエラーが発生しました', 'damage');
    }
    // エラーが発生してもUIをクリア
    setPendingHandSelection(null);
    setPendingSelectedCard(null);
  };

  // フィールドスロットクリック
  const handleFieldSlotClick = (slotIndex, playerNum) => {
    // 手札選択待ち中は操作不可
    if (pendingHandSelection) return;

    // モンスターターゲット選択モード
    if (pendingMonsterTarget) {
      const isMyField = playerNum === currentPlayer;
      const targetField = pendingMonsterTarget.targetPlayer === 'opponent'
        ? (currentPlayer === 1 ? p2Field : p1Field)
        : (currentPlayer === 1 ? p1Field : p2Field);
      const isValidField = pendingMonsterTarget.targetPlayer === 'opponent' ? !isMyField : isMyField;

      if (isValidField && targetField[slotIndex]) {
        setPendingSelectedMonsterIndex(slotIndex);
      }
      return;
    }

    // 現在のプレイヤーの場か相手の場かを判定
    const isMyField = playerNum === currentPlayer;

    if (phase === 2 && isMyField) {
      const field = currentPlayer === 1 ? p1Field : p2Field;
      const monster = field[slotIndex];

      if (selectedHandCard) {
        // チャージモード（モンスターが存在する場合）
        if (monster && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field')) {
          if (chargeCard(selectedHandCard, slotIndex)) {
            setSelectedHandCard(null);
          }
        }
        // 召喚モード（空きスロットの場合）
        else if (!monster && selectedHandCard.type === 'monster') {
          if (summonCard(selectedHandCard, slotIndex)) {
            setSelectedHandCard(null);
          }
        }
      } else {
        // モンスター選択（技発動用）
        if (monster) {
          setSelectedFieldMonster(selectedFieldMonster === slotIndex ? null : slotIndex);
          setSelectedHandCard(null);
        }
      }
    } else if (phase === 3 && isMyField) {
      // 攻撃者選択
      const field = currentPlayer === 1 ? p1Field : p2Field;
      const monster = field[slotIndex];
      if (monster && monster.canAttack) {
        setAttackingMonster(slotIndex);
        setSelectedFieldMonster(slotIndex);
      }
    } else if (phase === 3 && !isMyField && attackingMonster !== null) {
      // 攻撃対象選択
      attack(attackingMonster, slotIndex);
    }
  };

  // ダイレクトアタック
  const handleDirectAttack = () => {
    if (attackingMonster === null) return;
    const currentField = currentPlayer === 1 ? p1Field : p2Field;
    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const attacker = currentField[attackingMonster];
    const hasTarget = opponentField.some(m => m !== null);

    // 相手にモンスターがいない場合、または攻撃者がダイレクトアタック可能フラグを持つ場合
    if (!hasTarget || (attacker && attacker.canDirectAttackThisTurn)) {
      attack(attackingMonster, -1);
    } else {
      addLog('相手の場にモンスターがいます。対象を選択してください。', 'info');
    }
  };

  // フィールドカードゾーンクリック
  const handleFieldCardZoneClick = () => {
    if (phase !== 2) return;

    const currentFieldCard = currentPlayer === 1 ? p1FieldCard : p2FieldCard;

    // クリックして情報表示
    if (currentFieldCard && !selectedHandCard) {
      setSelectedFieldCardInfo({ card: currentFieldCard, type: 'field', player: currentPlayer });
      return;
    }

    // 手札からフィールドカードを設置
    if (selectedHandCard) {
      // 既にフィールドカードが設置されている場合
      if (currentFieldCard) {
        addLog('既にフィールドカードが設置されています', 'damage');
        return;
      }

      // フィールドカードを設置
      if (selectedHandCard.type === 'field') {
        if (summonCard(selectedHandCard, 0)) {
          setSelectedHandCard(null);
        }
      } else {
        addLog('フィールドゾーンに設置できるのはフィールドカードのみです', 'damage');
      }
    }
  };

  // フェイズカードゾーンクリック
  const handlePhaseCardZoneClick = () => {
    if (phase !== 2) return;

    const currentPhaseCard = currentPlayer === 1 ? p1PhaseCard : p2PhaseCard;

    // クリックして情報表示
    if (currentPhaseCard && !selectedHandCard) {
      setSelectedFieldCardInfo({ card: currentPhaseCard, type: 'phasecard', player: currentPlayer });
      return;
    }

    // 手札からカードを選択している場合
    if (selectedHandCard) {
      // フェイズカードが設置されている場合 → チャージモード
      if (currentPhaseCard) {
        // 属性カード（モンスター、魔法、フィールド、フェイズカード）をチャージ
        if (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') {
          if (chargePhaseCard(selectedHandCard)) {
            setSelectedHandCard(null);
          }
        } else {
          addLog('フェイズカードにチャージできるのは属性カード（モンスター、魔法、フィールド、フェイズ）のみです', 'damage');
        }
        return;
      }

      // フェイズカードを設置
      if (selectedHandCard.type === 'phasecard') {
        if (summonCard(selectedHandCard, 0)) {
          setSelectedHandCard(null);
        }
      } else {
        addLog('フェイズカードゾーンに設置できるのはフェイズカードのみです', 'damage');
      }
    }
  };

  // 次のフェイズへ（Phase B: dispatch経由）
  const nextPhase = () => {
    // 手札選択待ち中はフェイズ進行不可
    if (pendingHandSelection) {
      addLog('手札を選択してください', 'damage');
      return;
    }
    // チェーン確認中はフェイズ進行不可
    if (chainConfirmation) {
      addLog('チェーン確認中です', 'info');
      return;
    }
    if (phase === 2) {
      // バトルフェイズ開始時のチェーンポイント
      const needsConfirmation = startChainConfirmation(
        CHAIN_POINTS.BATTLE_START,
        { type: 'battleStart' },
        {}
      );

      if (!needsConfirmation) {
        // チェーン確認不要 → 直接バトルフェイズへ
        // Phase D-1: dispatchのみで状態更新
        dispatch(gameActions.setPhase(3));
        setSelectedHandCard(null);
      }
      // needsConfirmation === true の場合、確認後にproceedToBattlePhaseが呼ばれる
    } else if (phase === 3) {
      // Phase D-1: dispatchのみで状態更新
      dispatch(gameActions.setPhase(4));
      processPhase(4);
    }
  };

  // バトルフェイズへ進行（チェーン確認完了後に呼ばれる）
  const proceedToBattlePhase = useCallback(() => {
    // Phase D-1: dispatchのみで状態更新
    dispatch(gameActions.setPhase(3));
    setSelectedHandCard(null);
  }, [dispatch]);

  // 魔法カード発動
  const useMagicCard = () => {
    if (selectedHandCard && selectedHandCard.type === 'magic') {
      summonCard(selectedHandCard, 0);
      setSelectedHandCard(null);
    }
  };

  // ========================================
  // 刹那詠唱システム
  // ========================================

  // 相手ターン中に刹那詠唱を発動可能か判定
  const canUseSetsunaMagic = useCallback(() => {
    // 非アクティブプレイヤー（相手ターン中の自分）の手札とSPをチェック
    const nonActivePlayer = currentPlayer === 1 ? 2 : 1;

    // 魔法カード使用制限チェック（触覚持ち粘液獣等）
    const isMagicBlocked = nonActivePlayer === 1 ? p1MagicBlocked : p2MagicBlocked;
    if (isMagicBlocked) {
      return false;
    }

    const hand = nonActivePlayer === 1 ? p1Hand : p2Hand;
    const activeSP = nonActivePlayer === 1 ? p1ActiveSP : p2ActiveSP;

    const activatableCards = getActivatableSetsunaMagics(hand, activeSP);
    return activatableCards.length > 0;
  }, [currentPlayer, p1Hand, p2Hand, p1ActiveSP, p2ActiveSP, p1MagicBlocked, p2MagicBlocked]);

  // 刹那詠唱発動可能カード一覧を取得
  const getSetsunaMagicsForNonActivePlayer = useCallback(() => {
    const nonActivePlayer = currentPlayer === 1 ? 2 : 1;

    // 魔法カード使用制限チェック（触覚持ち粘液獣等）
    const isMagicBlocked = nonActivePlayer === 1 ? p1MagicBlocked : p2MagicBlocked;
    if (isMagicBlocked) {
      return [];
    }

    const hand = nonActivePlayer === 1 ? p1Hand : p2Hand;
    const activeSP = nonActivePlayer === 1 ? p1ActiveSP : p2ActiveSP;

    return getActivatableSetsunaMagics(hand, activeSP);
  }, [currentPlayer, p1Hand, p2Hand, p1ActiveSP, p2ActiveSP, p1MagicBlocked, p2MagicBlocked]);

  // 刹那詠唱カードを発動
  const activateSetsunaMagic = useCallback((card) => {
    if (!card || !isSetsunaMagic(card)) {
      addLog('刹那詠唱カードではありません', 'damage');
      return false;
    }

    // 発動するプレイヤーは非アクティブプレイヤー
    const castingPlayer = currentPlayer === 1 ? 2 : 1;

    // 魔法カード使用制限チェック（触覚持ち粘液獣等）
    const isMagicBlocked = castingPlayer === 1 ? p1MagicBlocked : p2MagicBlocked;
    if (isMagicBlocked) {
      addLog('魔法カードを使用できません！（触覚持ち粘液獣の効果）', 'damage');
      return false;
    }

    const setsunaCost = getSetsunaCost(card);
    const activeSP = castingPlayer === 1 ? p1ActiveSP : p2ActiveSP;

    if (activeSP < setsunaCost) {
      addLog(`SPが足りません！（刹那詠唱コスト: ${setsunaCost}, 現在: ${activeSP}）`, 'damage');
      return false;
    }

    // SPを消費
    if (castingPlayer === 1) {
      setP1ActiveSP(prev => prev - setsunaCost);
      setP1RestedSP(prev => prev + setsunaCost);
      setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      setP1Graveyard(prev => [...prev, card]);
    } else {
      setP2ActiveSP(prev => prev - setsunaCost);
      setP2RestedSP(prev => prev + setsunaCost);
      setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      setP2Graveyard(prev => [...prev, card]);
    }

    addLog(`プレイヤー${castingPlayer}: 【刹那詠唱】${card.name}を発動！（コスト${card.cost}+1=${setsunaCost}）`, 'info');

    // 魔法効果を実行（castingPlayer を currentPlayer として渡す）
    if (card.effect) {
      const context = {
        currentPlayer: castingPlayer, // 発動者を currentPlayer として設定
        monsterIndex: null,
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        setP1Hand,
        setP2Hand,
        setP1Deck,
        setP2Deck,
        setP1Graveyard,
        setP2Graveyard,
        p1Field,
        p2Field,
        p1Hand,
        p2Hand,
        p1Deck,
        p2Deck,
        p1Graveyard,
        p2Graveyard,
        addLog,
        setPendingDeckReview,
        setPendingMonsterTarget,
      };
      executeSkillEffects(card.effect, context, card.id);
    }

    // UI状態をリセット
    setSetsunaPendingActivation(false);
    setSetsunaPendingCard(null);

    return true;
  }, [currentPlayer, p1ActiveSP, p2ActiveSP, p1Field, p2Field, p1Hand, p2Hand,
      p1Deck, p2Deck, p1Graveyard, p2Graveyard, addLog, setPendingMonsterTarget]);

  // 刹那詠唱モードを開始
  const startSetsunaMagicMode = useCallback(() => {
    setSetsunaPendingActivation(true);
    setSetsunaPendingCard(null);
    addLog('刹那詠唱カードを選択してください', 'info');
  }, [addLog]);

  // 刹那詠唱モードをキャンセル
  const cancelSetsunaMagicMode = useCallback(() => {
    setSetsunaPendingActivation(false);
    setSetsunaPendingCard(null);
  }, []);

  // 刹那詠唱カードを選択
  const selectSetsunaMagicCard = useCallback((card) => {
    if (setsunaPendingCard && setsunaPendingCard.uniqueId === card.uniqueId) {
      // 同じカードをクリックしたら発動
      activateSetsunaMagic(card);
    } else {
      // カードを選択状態に
      setSetsunaPendingCard(card);
    }
  }, [setsunaPendingCard, activateSetsunaMagic]);

  // 墓地発動可能なカードを取得
  const getActivatableGraveyardCards = () => {
    const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
    const field = currentPlayer === 1 ? p1Field : p2Field;
    const hasEmptySlot = field.some((slot) => slot === null);

    return graveyard.filter((card) => {
      const triggers = parseCardTriggers(card);
      return triggers.some((trigger) => {
        if (trigger.type !== TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD) {
          return false;
        }
        // コストチェック（深海のクラーケンはSP4必要）
        if (trigger.costCheck) {
          const context = { currentPlayer, p1ActiveSP, p2ActiveSP };
          if (!trigger.costCheck(context)) {
            return false;
          }
        }
        // フィールド空きチェック（蘇生カードの場合）
        if (card.type === 'monster' && !hasEmptySlot) {
          return false;
        }
        return true;
      });
    });
  };

  // 墓地発動を実行
  const activateGraveyardCard = (card) => {
    const triggers = parseCardTriggers(card);
    const graveyardTrigger = triggers.find(
      (t) => t.type === TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD
    );

    if (!graveyardTrigger) {
      addLog('墓地発動できません', 'damage');
      return;
    }

    const triggerContext = {
      currentPlayer,
      p1ActiveSP, p2ActiveSP,
      setP1ActiveSP, setP2ActiveSP,
      p1RestedSP, p2RestedSP,
      setP1RestedSP, setP2RestedSP,
      p1Field, p2Field,
      setP1Field, setP2Field,
      p1Graveyard, p2Graveyard,
      setP1Graveyard, setP2Graveyard,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      p1Deck, p2Deck,
      setP1Deck, setP2Deck,
      p1Life, p2Life,
      setP1Life, setP2Life,
      card,
      addLog,
      setPendingHandSelection,
      setPendingGraveyardSelection,
      setShowGraveyardViewer,
      setPendingDeckReview,
    };

    try {
      if (typeof graveyardTrigger.effect === 'function') {
        graveyardTrigger.effect(triggerContext);
      }
    } catch (error) {
      console.error('墓地発動エラー:', error);
      addLog(`${card.name}の墓地発動に失敗しました`, 'damage');
    }
  };

  // ========================================
  // レンダリング
  // ========================================

  // 墓地発動可能カードを事前計算（パフォーマンス最適化）
  const activatableGraveyardCards = getActivatableGraveyardCards();

  // タイトル画面
  if (gameState === 'title') {
    return (
      <div style={{...styles.container, overflow: 'auto'}}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '32px',
          padding: '32px 0',
          boxSizing: 'border-box',
        }}>
          <h1 style={{
            ...styles.title,
            fontSize: '48px',
            textAlign: 'center',
          }}>
            ✨ Magic Spirit ✨
          </h1>
          <p style={{ color: '#a0a0a0', fontSize: '18px' }}>
            スピリットウェイヴァーよ、戦いの時だ
          </p>

          {/* 所持G表示 */}
          {playerData && (
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ffd700',
              padding: '8px 24px',
              background: 'rgba(255,215,0,0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255,215,0,0.3)',
            }}>
              💰 {currencyManager.formatGold(playerData.gold)}
            </div>
          )}

          {isLoadingCards ? (
            <div style={{ color: '#a0a0a0', fontSize: '16px' }}>
              カードデータを読み込み中...
            </div>
          ) : (
            <>
              {/* デッキ選択UI */}
              <div style={{
                display: 'flex',
                gap: '40px',
                marginBottom: '16px',
              }}>
                {/* プレイヤー1のデッキ選択 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <label style={{ color: '#6b9eff', fontSize: '14px', fontWeight: 'bold' }}>
                    プレイヤー1 デッキ
                  </label>
                  <select
                    value={p1SelectedDeck}
                    onChange={(e) => setP1SelectedDeck(e.target.value)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '2px solid #6b9eff',
                      background: '#1a1a2e',
                      color: '#fff',
                      cursor: 'pointer',
                      minWidth: '160px',
                    }}
                  >
                    <optgroup label="プリセットデッキ">
                      {getDeckOptions().map(deck => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </optgroup>
                    {playerData?.userDecks?.length > 0 && (
                      <optgroup label="所持デッキ">
                        {playerData.userDecks.map(deck => (
                          <option key={deck.id} value={`user_${deck.id}`}>
                            📦 {deck.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <span style={{ color: '#888', fontSize: '11px', maxWidth: '180px', textAlign: 'center' }}>
                    {p1SelectedDeck.startsWith('user_')
                      ? `所持デッキ (${playerData?.userDecks?.find(d => d.id === p1SelectedDeck.replace('user_', ''))?.cards?.length || 0}枚)`
                      : getDeckOptions().find(d => d.id === p1SelectedDeck)?.description
                    }
                  </span>
                </div>

                {/* プレイヤー2のデッキ選択 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <label style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: 'bold' }}>
                    プレイヤー2 デッキ
                  </label>
                  <select
                    value={p2SelectedDeck}
                    onChange={(e) => setP2SelectedDeck(e.target.value)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '2px solid #ff6b6b',
                      background: '#1a1a2e',
                      color: '#fff',
                      cursor: 'pointer',
                      minWidth: '160px',
                    }}
                  >
                    <optgroup label="プリセットデッキ">
                      {getDeckOptions().map(deck => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </optgroup>
                    {playerData?.userDecks?.length > 0 && (
                      <optgroup label="所持デッキ">
                        {playerData.userDecks.map(deck => (
                          <option key={deck.id} value={`user_${deck.id}`}>
                            📦 {deck.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <span style={{ color: '#888', fontSize: '11px', maxWidth: '180px', textAlign: 'center' }}>
                    {p2SelectedDeck.startsWith('user_')
                      ? `所持デッキ (${playerData?.userDecks?.find(d => d.id === p2SelectedDeck.replace('user_', ''))?.cards?.length || 0}枚)`
                      : getDeckOptions().find(d => d.id === p2SelectedDeck)?.description
                    }
                  </span>
                </div>
              </div>

              {/* AIプレイヤー設定UI */}
              <div style={{
                display: 'flex',
                gap: '40px',
                marginBottom: '16px',
              }}>
                {/* プレイヤー1のAI設定 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(107, 158, 255, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(107, 158, 255, 0.3)',
                  minWidth: '160px',
                }}>
                  <label style={{ color: '#6b9eff', fontSize: '14px', fontWeight: 'bold' }}>
                    プレイヤー1 操作
                  </label>
                  <select
                    value={p1PlayerType}
                    onChange={(e) => setP1PlayerType(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: '2px solid #6b9eff',
                      background: '#1a1a2e',
                      color: '#fff',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <option value="human">人間</option>
                    <option value="ai">AI</option>
                  </select>
                  {p1PlayerType === 'ai' && (
                    <select
                      value={p1AIDifficulty}
                      onChange={(e) => setP1AIDifficulty(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #6b9eff',
                        background: '#1a1a2e',
                        color: '#fff',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <option value="easy">かんたん</option>
                      <option value="normal">ふつう</option>
                      <option value="hard">むずかしい</option>
                    </select>
                  )}
                </div>

                {/* プレイヤー2のAI設定 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(255, 107, 107, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 107, 107, 0.3)',
                  minWidth: '160px',
                }}>
                  <label style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: 'bold' }}>
                    プレイヤー2 操作
                  </label>
                  <select
                    value={p2PlayerType}
                    onChange={(e) => setP2PlayerType(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: '2px solid #ff6b6b',
                      background: '#1a1a2e',
                      color: '#fff',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <option value="human">人間</option>
                    <option value="ai">AI</option>
                  </select>
                  {p2PlayerType === 'ai' && (
                    <select
                      value={p2AIDifficulty}
                      onChange={(e) => setP2AIDifficulty(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #ff6b6b',
                        background: '#1a1a2e',
                        color: '#fff',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <option value="easy">かんたん</option>
                      <option value="normal">ふつう</option>
                      <option value="hard">むずかしい</option>
                    </select>
                  )}
                </div>
              </div>

              {/* AI思考速度設定（どちらかがAIの場合のみ表示） */}
              {(p1PlayerType === 'ai' || p2PlayerType === 'ai') && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  padding: '12px 20px',
                  background: 'rgba(255, 215, 0, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                }}>
                  <label style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold' }}>
                    ⚡ AI思考速度
                  </label>
                  <select
                    value={aiThinkingSpeed}
                    onChange={(e) => handleAiThinkingSpeedChange(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: '2px solid #ffd700',
                      background: '#1a1a2e',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {Object.entries(AI_SPEED_SETTINGS).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={initGame}
                style={{
                  ...styles.actionButton,
                  fontSize: '20px',
                  padding: '16px 48px',
                }}
              >
                ゲーム開始
              </button>

              {/* コレクション・ショップ・デッキ編集ボタン */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '8px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                <button
                  onClick={() => setGameState('collection')}
                  style={{
                    ...styles.actionButton,
                    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
                    fontSize: '14px',
                    padding: '10px 20px',
                  }}
                >
                  📚 コレクション
                </button>
                <button
                  onClick={() => setGameState('shop')}
                  style={{
                    ...styles.actionButton,
                    background: 'linear-gradient(135deg, #ffd700 0%, #ff9500 100%)',
                    color: '#1a1a2e',
                    fontSize: '14px',
                    padding: '10px 20px',
                  }}
                >
                  🛒 ショップ
                </button>
                <button
                  onClick={() => setGameState('merchantGuild')}
                  style={{
                    ...styles.actionButton,
                    background: 'linear-gradient(135deg, #8b4513 0%, #d2691e 100%)',
                    fontSize: '14px',
                    padding: '10px 20px',
                  }}
                >
                  🏪 商人ギルド
                </button>
                <button
                  onClick={() => setGameState('deckList')}
                  style={{
                    ...styles.actionButton,
                    background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                    fontSize: '14px',
                    padding: '10px 20px',
                  }}
                >
                  🃏 マイデッキ
                </button>
              </div>

              <div style={{ color: '#888', fontSize: '13px' }}>
                {allCards.length}枚のカードを読み込み完了
              </div>
            </>
          )}
          <div style={{ color: '#666', fontSize: '12px', marginTop: '32px' }}>
            プロトタイプ版 - 2人対戦
          </div>
        </div>
      </div>
    );
  }

  // コレクション画面
  if (gameState === 'collection') {
    return (
      <CollectionScreen
        playerData={playerData}
        allCards={allCards}
        cardValueMap={cardValueMap}
        onBack={() => setGameState('title')}
        onSellCard={handleSellCard}
        onSettingsChange={(newSettings) => {
          updatePlayerData({
            ...playerData,
            settings: newSettings,
          });
        }}
      />
    );
  }

  // ショップ画面
  if (gameState === 'shop') {
    return (
      <>
        <ShopScreen
          playerData={playerData}
          allCards={allCards}
          cardValueMap={cardValueMap}
          onBack={() => setGameState('title')}
          onOpenPack={handleOpenPack}
          onGoToCollection={() => setGameState('collection')}
          onPlayerDataUpdate={updatePlayerData}
          onOpenMarketAnalysis={() => setShowMarketAnalysis(true)}
        />
        {showMarketAnalysis && (
          <MarketAnalysis
            marketState={playerData?.market}
            allCards={allCards}
            assetHistory={playerData?.assetHistory}
            onClose={() => setShowMarketAnalysis(false)}
          />
        )}
      </>
    );
  }

  // 商人ギルド画面
  if (gameState === 'merchantGuild') {
    return (
      <MerchantGuild
        playerData={playerData}
        allCards={allCards}
        onBack={() => setGameState('title')}
        onEnterShop={(merchantName) => {
          setCurrentMerchant(merchantName);
          setGameState('merchantShop');
        }}
        onPlayerDataUpdate={updatePlayerData}
        onPlaceBet={(bet) => {
          const tournament = playerData?.tournamentData?.currentTournament;
          const currentBets = playerData?.tournamentData?.currentBets || [];
          const validation = validateBet(bet, tournament, currentBets, playerData?.gold || 0);
          if (!validation.valid) {
            alert(validation.error);
            return false;
          }
          const newBets = addBet(currentBets, bet);
          updatePlayerData({
            ...playerData,
            gold: playerData.gold - bet.amount,
            tournamentData: {
              ...playerData.tournamentData,
              currentBets: newBets,
            },
          });
          return true;
        }}
        onCancelBet={(betId) => {
          const currentBets = playerData?.tournamentData?.currentBets || [];
          const bet = currentBets.find(b => b.id === betId);
          if (!bet) return false;
          const newBets = removeBet(currentBets, betId);
          updatePlayerData({
            ...playerData,
            gold: playerData.gold + bet.amount,
            tournamentData: {
              ...playerData.tournamentData,
              currentBets: newBets,
            },
          });
          return true;
        }}
        onPurchaseInfo={(competitorId, infoType, tournament) => {
          const validation = validateInfoPurchase({
            competitorId,
            infoType,
            tournament,
            purchasedInfo: playerData?.tournamentData?.purchasedInfo,
            playerGold: playerData?.gold || 0,
          });
          if (!validation.valid) {
            alert(validation.error);
            return false;
          }
          const price = getInfoPrice(tournament.type, infoType);
          const result = purchaseInfo(playerData.tournamentData, {
            competitorId,
            infoType,
            tournament,
          });
          if (result.success) {
            updatePlayerData({
              ...playerData,
              gold: playerData.gold - price,
              tournamentData: result.tournamentData,
            });
            return true;
          } else {
            alert(result.error);
            return false;
          }
        }}
        onClaimTournamentReward={handleClaimTournamentReward}
      />
    );
  }

  // 商人店内画面
  if (gameState === 'merchantShop' && currentMerchant) {
    return (
      <MerchantShop
        merchantName={currentMerchant}
        playerData={playerData}
        allCards={allCards}
        cardValueMap={cardValueMap}
        onBack={() => {
          setCurrentMerchant(null);
          setGameState('merchantGuild');
        }}
        onPlayerDataUpdate={updatePlayerData}
      />
    );
  }

  // パック開封画面
  if (gameState === 'packOpening' && pendingPackCards) {
    return (
      <PackOpening
        cards={pendingPackCards.cards}
        packCount={pendingPackCards.packCount}
        onClose={handlePackOpeningClose}
        existingCollection={playerData?.collection || []}
        effectLevel={playerData?.settings?.rarityEffectLevel}
      />
    );
  }

  // デッキ一覧画面
  if (gameState === 'deckList') {
    return (
      <DeckList
        playerData={playerData}
        allCards={allCards}
        onBack={() => setGameState('title')}
        onCreateNew={() => {
          setEditingDeck(null);
          setGameState('deckEdit');
        }}
        onEditDeck={(deck) => {
          setEditingDeck(deck);
          setGameState('deckEdit');
        }}
        onDeleteDeck={handleDeleteDeck}
      />
    );
  }

  // デッキ編集画面
  if (gameState === 'deckEdit') {
    return (
      <DeckBuilder
        playerData={playerData}
        allCards={allCards}
        cardValueMap={cardValueMap}
        editingDeck={editingDeck}
        onBack={() => {
          setEditingDeck(null);
          setGameState('deckList');
        }}
        onSave={handleSaveDeck}
      />
    );
  }

  // ゲームオーバー画面
  if (gameState === 'gameOver') {
    // 報酬が未付与なら付与する
    if (!battleReward && playerData) {
      // Phase D-3: engineState直接参照
      // winner === 1 は P1 勝利、winner === 2 は P2 勝利
      // ここでは P1 視点で報酬付与（将来的にマルチプレイヤー対応時に調整）
      awardBattleRewards(winner === 1);
    }

    return (
      <div style={styles.container}>
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#ffd700' }}>
              🏆 ゲーム終了 🏆
            </h2>
            <p style={{ textAlign: 'center', fontSize: '24px', marginBottom: '16px' }}>
              プレイヤー{winner}の勝利！ {/* Phase D-3: engineState直接参照 */}
            </p>

            {/* 報酬表示 */}
            {battleReward && (
              <div style={{
                background: 'rgba(255,215,0,0.1)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '16px', color: '#ffd700', marginBottom: '12px', fontWeight: 'bold' }}>
                  ───── 報酬 ─────
                </div>
                <div style={{ fontSize: '18px', color: '#ffd700', marginBottom: '8px' }}>
                  💰 {currencyManager.formatGold(battleReward.goldReward)}
                </div>
                {battleReward.packReward > 0 && (
                  <div style={{ fontSize: '16px', color: '#ff9500' }}>
                    🎴 パック ×{battleReward.packReward}（勝利ボーナス）
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {/* 未開封パック開封ボタン */}
              {playerData?.unopenedPacks > 0 && (
                <button
                  onClick={() => {
                    // 未開封パックを開封
                    const { packSystem } = require('./collection');
                    const result = packSystem.openUnopenedPack(playerData, allCards, cardValueMap);
                    if (result.success) {
                      updatePlayerData(result.playerData);
                      handleOpenPack(result.cards);
                    }
                  }}
                  style={{
                    ...styles.actionButton,
                    background: 'linear-gradient(135deg, #ff9500 0%, #ffd700 100%)',
                    color: '#1a1a2e',
                    fontSize: '16px',
                    padding: '12px 32px',
                  }}
                >
                  🎴 パックを開ける ({playerData.unopenedPacks}個)
                </button>
              )}

              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={initGame} style={styles.actionButton}>
                  もう一度プレイ
                </button>
                <button
                  onClick={() => {
                    setBattleReward(null);
                    setGameState('title');
                  }}
                  style={{ ...styles.actionButton, background: '#444' }}
                >
                  タイトルへ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 大会観戦ダイアログ（ゲームオーバー画面でも表示） */}
        {showTournamentViewer && pendingTournamentResult && (
          <TournamentViewer
            tournament={pendingTournamentResult}
            currentBets={playerData?.tournamentData?.currentBets || []}
            onClaimReward={handleClaimTournamentReward}
            onClose={() => {
              setShowTournamentViewer(false);
              setPendingTournamentResult(null);
            }}
          />
        )}
      </div>
    );
  }

  // ゲーム画面
  const player = getCurrentPlayerData();
  const opponent = getOpponentData();

  return (
    <div style={styles.container}>
      {/* CSSアニメーション */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 10px currentColor; }
          50% { box-shadow: 0 0 25px currentColor, 0 0 40px currentColor; }
        }
      `}</style>

      {/* ヘッダー */}
      <header style={styles.header}>
        <h1 style={styles.title}>✨ Magic Spirit</h1>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span>ターン {turn}</span>
          <span style={{
            background: currentPlayer === 1 ? '#4da6ff' : '#ff6b6b',
            padding: '4px 12px',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}>
            プレイヤー{currentPlayer}
          </span>
        </div>
      </header>

      {/* メインエリア（左サイドパネル + ゲームボード） */}
      <div style={styles.mainArea}>
        {/* 左サイドパネル（カード情報表示） */}
        <div style={styles.leftSidePanel}>
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(107,76,230,0.3)' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#a78bfa' }}>
              📋 カード情報
            </div>
          </div>
          <div style={styles.cardInfoPanel}>
            {/* ホバー中のカード（最優先表示） */}
            {hoveredCard && (
              <div>
                <div style={{ fontSize: '10px', color: '#a78bfa', marginBottom: '6px', padding: '4px', background: 'rgba(167,139,250,0.2)', borderRadius: '4px' }}>
                  👁️ プレビュー
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: hoveredCard.owner === 1 ? '#4da6ff' : '#ff8a8a' }}>
                  {hoveredCard.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                  属性: {hoveredCard.attribute} | コスト: {hoveredCard.cost} SP
                </div>
                {/* キーワード能力 */}
                {hoveredCard.keywordText && (
                  <div style={{ fontSize: '10px', color: '#ff8e53', marginBottom: '6px', padding: '4px', background: 'rgba(255,142,83,0.15)', borderRadius: '4px' }}>
                    {hoveredCard.keywordText}
                  </div>
                )}
                {/* 禁忌カード警告 */}
                {hoveredCard.isForbidden && (
                  <div style={{ fontSize: '10px', color: '#ff4444', marginBottom: '6px', padding: '4px', background: 'rgba(255,68,68,0.15)', borderRadius: '4px' }}>
                    ⚠️ 禁忌カード - デッキに1枚まで
                  </div>
                )}
                {hoveredCard.categoryText && (
                  <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '6px' }}>
                    カテゴリ: {hoveredCard.categoryText}
                  </div>
                )}
                {(hoveredCard.type === 'monster' || hoveredCard.currentHp !== undefined) && (() => {
                  // 常時効果による修正値を計算
                  const effectContext = {
                    currentPlayer,
                    effectOwner: hoveredCard.owner || currentPlayer,
                    p1Field,
                    p2Field,
                    p1Life,
                    p2Life,
                  };
                  const { modifier: atkMod, sources: atkSources } = hoveredCard.currentAttack !== undefined
                    ? continuousEffectEngine.getAttackModifierDetails(hoveredCard, effectContext)
                    : { modifier: 0, sources: [] };
                  const { modifier: hpMod, sources: hpSources } = hoveredCard.currentHp !== undefined
                    ? continuousEffectEngine.getHPModifierDetails(hoveredCard, effectContext)
                    : { modifier: 0, sources: [] };
                  const baseAtk = hoveredCard.currentAttack || hoveredCard.attack;
                  const effectiveAtk = baseAtk + atkMod;
                  const allSources = [...atkSources, ...hpSources].filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i);

                  return (
                    <>
                      <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                        <span style={{
                          color: atkMod > 0 ? '#4cff4c' : atkMod < 0 ? '#ff4c4c' : '#ccc',
                        }}>
                          ⚔️ {effectiveAtk}
                          {atkMod !== 0 && ` (${atkMod > 0 ? '+' : ''}${atkMod})`}
                        </span>
                        {' | '}
                        <span style={{
                          color: hpMod > 0 ? '#4cff4c' : hpMod < 0 ? '#ff4c4c' : '#ccc',
                        }}>
                          ❤️ {hoveredCard.currentHp !== undefined ? `${hoveredCard.currentHp}/${hoveredCard.maxHP || hoveredCard.hp}` : hoveredCard.hp}
                          {hpMod !== 0 && ` (${hpMod > 0 ? '+' : ''}${hpMod})`}
                        </span>
                      </div>
                      {/* 常時効果ソース表示 */}
                      {allSources.length > 0 && (
                        <div style={{ fontSize: '9px', color: '#888', marginBottom: '8px', paddingLeft: '8px' }}>
                          {atkSources.map((s, i) => (
                            <div key={`atk-${i}`} style={{ color: s.value > 0 ? '#4cff4c' : '#ff4c4c' }}>
                              └ {s.name}: ATK {s.value > 0 ? '+' : ''}{s.value}
                            </div>
                          ))}
                          {hpSources.map((s, i) => (
                            <div key={`hp-${i}`} style={{ color: s.value > 0 ? '#4cff4c' : '#ff4c4c' }}>
                              └ {s.name}: HP {s.value > 0 ? '+' : ''}{s.value}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 状態異常表示 */}
                      {hoveredCard.statusEffects && hoveredCard.statusEffects.length > 0 && (
                        <div style={{ fontSize: '10px', marginBottom: '8px', padding: '4px', background: 'rgba(255,99,71,0.15)', borderRadius: '4px' }}>
                          <div style={{ color: '#ff6347', fontWeight: 'bold', marginBottom: '2px' }}>状態異常:</div>
                          {hoveredCard.statusEffects.map((effect, i) => {
                            const meta = STATUS_EFFECT_METADATA[effect.type] || {};
                            return (
                              <div key={i} style={{ color: meta.color || '#ccc', fontSize: '9px' }}>
                                {meta.icon || '?'} {meta.displayName || effect.type}
                                {effect.duration > 0 && ` (残${effect.duration}ターン)`}
                                {effect.removeChance && ` [${Math.round(effect.removeChance * 100)}%解除]`}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
                <div style={{
                  fontSize: '11px',
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px',
                  borderRadius: '6px',
                  lineHeight: '1.5',
                  marginBottom: '8px',
                }}>
                  {getEffectWithoutSkills(hoveredCard.effect) || 'なし'}
                </div>
                {/* トリガー情報 */}
                {(() => {
                  const triggers = parseCardTriggers(hoveredCard);
                  if (triggers.length === 0) return null;
                  return (
                    <div style={{ fontSize: '10px', marginBottom: '8px', padding: '6px', background: 'rgba(157,76,230,0.15)', borderRadius: '4px' }}>
                      <div style={{ color: '#9d4ce6', fontWeight: 'bold', marginBottom: '6px' }}>📍 発動タイミング</div>
                      {triggers.map((trigger, i) => (
                        <div key={i}>
                          {i > 0 && <div style={{ borderTop: '1px solid rgba(157,76,230,0.3)', margin: '6px 0' }} />}
                          <div style={{ color: '#c9a0ff', fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>
                            【{trigger.displayDescription || getTriggerDisplayName(trigger.type)}】
                            {trigger.activationType === ACTIVATION_TYPES.OPTIONAL && <span style={{ color: '#ff8e53', fontWeight: 'normal', marginLeft: '4px' }}>(任意)</span>}
                          </div>
                          {trigger.description && (
                            <div style={{ color: '#ccc', fontSize: '9px', paddingLeft: '8px' }}>
                              {trigger.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {(hoveredCard.basicSkill || hoveredCard.advancedSkill) && (
                  <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                    {hoveredCard.basicSkill && (
                      <div style={{ padding: '6px', background: 'rgba(76,175,80,0.2)', borderRadius: '4px', marginBottom: '4px' }}>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技:</span><br/>
                        {hoveredCard.basicSkill.text}
                      </div>
                    )}
                    {hoveredCard.advancedSkill && (
                      <div style={{ padding: '6px', background: 'rgba(255,152,0,0.2)', borderRadius: '4px' }}>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技:</span><br/>
                        {hoveredCard.advancedSkill.text}
                      </div>
                    )}
                  </div>
                )}
                {/* フレーバーテキスト */}
                {hoveredCard.flavor && (
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', fontStyle: 'italic', borderTop: '1px solid rgba(107,76,230,0.2)', paddingTop: '6px' }}>
                    📖 {hoveredCard.flavor}
                  </div>
                )}
              </div>
            )}
            {/* 選択中の手札カード（通常モードまたは手札選択モード） */}
            {!hoveredCard && (selectedHandCard || pendingSelectedCard) && (
              (() => {
                const displayCard = pendingSelectedCard || selectedHandCard;
                const isPendingMode = !!pendingSelectedCard;
                return (
                  <div>
                    {isPendingMode && (
                      <div style={{ fontSize: '10px', color: '#ff8e53', marginBottom: '6px', padding: '4px', background: 'rgba(255,142,83,0.2)', borderRadius: '4px' }}>
                        🔍 選択確認中
                      </div>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: currentPlayer === 1 ? '#4da6ff' : '#ff8a8a' }}>
                      {displayCard.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                      属性: {displayCard.attribute} | コスト: {displayCard.cost} SP
                    </div>
                    {/* キーワード能力 */}
                    {displayCard.keywordText && (
                      <div style={{ fontSize: '10px', color: '#ff8e53', marginBottom: '6px', padding: '4px', background: 'rgba(255,142,83,0.15)', borderRadius: '4px' }}>
                        {displayCard.keywordText}
                      </div>
                    )}
                    {/* 禁忌カード警告 */}
                    {displayCard.isForbidden && (
                      <div style={{ fontSize: '10px', color: '#ff4444', marginBottom: '6px', padding: '4px', background: 'rgba(255,68,68,0.15)', borderRadius: '4px' }}>
                        ⚠️ 禁忌カード - デッキに1枚まで
                      </div>
                    )}
                    {displayCard.categoryText && (
                      <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '6px' }}>
                        カテゴリ: {displayCard.categoryText}
                      </div>
                    )}
                    {displayCard.type === 'monster' && (
                      <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                        ⚔️ {displayCard.attack} | ❤️ {displayCard.hp}
                      </div>
                    )}
                    <div style={{
                      fontSize: '11px',
                      color: '#e0e0e0',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '8px',
                      borderRadius: '6px',
                      lineHeight: '1.5',
                      marginBottom: '8px',
                    }}>
                      {getEffectWithoutSkills(displayCard.effect) || 'なし'}
                    </div>
                    {/* トリガー情報 */}
                    {(() => {
                      const triggers = parseCardTriggers(displayCard);
                      if (triggers.length === 0) return null;
                      return (
                        <div style={{ fontSize: '10px', marginBottom: '8px', padding: '6px', background: 'rgba(157,76,230,0.15)', borderRadius: '4px' }}>
                          <div style={{ color: '#9d4ce6', fontWeight: 'bold', marginBottom: '6px' }}>📍 発動タイミング</div>
                          {triggers.map((trigger, i) => (
                            <div key={i}>
                              {i > 0 && <div style={{ borderTop: '1px solid rgba(157,76,230,0.3)', margin: '6px 0' }} />}
                              <div style={{ color: '#c9a0ff', fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>
                                【{trigger.displayDescription || getTriggerDisplayName(trigger.type)}】
                                {trigger.activationType === ACTIVATION_TYPES.OPTIONAL && <span style={{ color: '#ff8e53', fontWeight: 'normal', marginLeft: '4px' }}>(任意)</span>}
                              </div>
                              {trigger.description && (
                                <div style={{ color: '#ccc', fontSize: '9px', paddingLeft: '8px' }}>
                                  {trigger.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {displayCard.type === 'monster' && (displayCard.basicSkill || displayCard.advancedSkill) && (
                      <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                        {displayCard.basicSkill && (
                          <div style={{ padding: '6px', background: 'rgba(76,175,80,0.2)', borderRadius: '4px', marginBottom: '4px' }}>
                            <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技:</span><br/>
                            {displayCard.basicSkill.text}
                          </div>
                        )}
                        {displayCard.advancedSkill && (
                          <div style={{ padding: '6px', background: 'rgba(255,152,0,0.2)', borderRadius: '4px' }}>
                            <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技:</span><br/>
                            {displayCard.advancedSkill.text}
                          </div>
                        )}
                      </div>
                    )}
                    {/* フレーバーテキスト */}
                    {displayCard.flavor && (
                      <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', fontStyle: 'italic', borderTop: '1px solid rgba(107,76,230,0.2)', paddingTop: '6px' }}>
                        📖 {displayCard.flavor}
                      </div>
                    )}
                    {/* 操作ガイドは通常モードのみ表示 */}
                    {!isPendingMode && (
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '8px', padding: '6px', background: 'rgba(107,76,230,0.1)', borderRadius: '4px' }}>
                        {displayCard.type === 'monster' && '👆 空きスロットをクリックして召喚'}
                        {displayCard.type === 'magic' && '👆 「魔法カード発動」ボタンで発動'}
                        {displayCard.type === 'field' && '👆 フィールドゾーンをクリックして配置'}
                        {displayCard.type === 'phasecard' && '👆 フェイズゾーンをクリックして配置'}
                      </div>
                    )}
                  </div>
                );
              })()
            )}
            {/* 選択中のフィールドモンスター */}
            {!hoveredCard && !selectedHandCard && !pendingSelectedCard && selectedFieldMonster !== null && (() => {
              const field = currentPlayer === 1 ? p1Field : p2Field;
              const monster = field[selectedFieldMonster];
              if (!monster) return null;

              // 常時効果による修正値を計算
              const effectContext = {
                currentPlayer,
                effectOwner: currentPlayer,
                p1Field,
                p2Field,
                p1Life,
                p2Life,
              };
              const { modifier: atkMod, sources: atkSources } = continuousEffectEngine.getAttackModifierDetails(monster, effectContext);
              const { modifier: hpMod, sources: hpSources } = continuousEffectEngine.getHPModifierDetails(monster, effectContext);
              const baseAtk = monster.currentAttack || monster.attack;
              const effectiveAtk = baseAtk + atkMod;

              return (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: currentPlayer === 1 ? '#4da6ff' : '#ff8a8a' }}>
                    🎯 {monster.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                    属性: {monster.attribute}
                  </div>
                  {/* キーワード能力 */}
                  {monster.keywordText && (
                    <div style={{ fontSize: '10px', color: '#ff8e53', marginBottom: '6px', padding: '4px', background: 'rgba(255,142,83,0.15)', borderRadius: '4px' }}>
                      {monster.keywordText}
                    </div>
                  )}
                  {/* 禁忌カード警告 */}
                  {monster.isForbidden && (
                    <div style={{ fontSize: '10px', color: '#ff4444', marginBottom: '6px', padding: '4px', background: 'rgba(255,68,68,0.15)', borderRadius: '4px' }}>
                      ⚠️ 禁忌カード - デッキに1枚まで
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '4px' }}>
                    <span style={{
                      color: atkMod > 0 ? '#4cff4c' : atkMod < 0 ? '#ff4c4c' : '#ccc',
                    }}>
                      ⚔️ {effectiveAtk}
                      {atkMod !== 0 && ` (${atkMod > 0 ? '+' : ''}${atkMod})`}
                    </span>
                    {' | '}
                    <span style={{
                      color: hpMod > 0 ? '#4cff4c' : hpMod < 0 ? '#ff4c4c' : '#ccc',
                    }}>
                      ❤️ {monster.currentHP}/{monster.maxHP || monster.hp}
                      {hpMod !== 0 && ` (${hpMod > 0 ? '+' : ''}${hpMod})`}
                    </span>
                    {monster.charges && monster.charges.length > 0 && (
                      <span style={{ marginLeft: '8px', color: '#4caf50' }}>
                        ⚡ チャージ: {monster.charges.length}
                      </span>
                    )}
                  </div>
                  {/* 常時効果ソース表示 */}
                  {(atkSources.length > 0 || hpSources.length > 0) && (
                    <div style={{ fontSize: '9px', color: '#888', marginBottom: '8px', paddingLeft: '8px' }}>
                      {atkSources.map((s, i) => (
                        <div key={`atk-${i}`} style={{ color: s.value > 0 ? '#4cff4c' : '#ff4c4c' }}>
                          └ {s.name}: ATK {s.value > 0 ? '+' : ''}{s.value}
                        </div>
                      ))}
                      {hpSources.map((s, i) => (
                        <div key={`hp-${i}`} style={{ color: s.value > 0 ? '#4cff4c' : '#ff4c4c' }}>
                          └ {s.name}: HP {s.value > 0 ? '+' : ''}{s.value}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 状態異常表示 */}
                  {monster.statusEffects && monster.statusEffects.length > 0 && (
                    <div style={{ fontSize: '10px', marginBottom: '8px', padding: '4px', background: 'rgba(255,99,71,0.15)', borderRadius: '4px' }}>
                      <div style={{ color: '#ff6347', fontWeight: 'bold', marginBottom: '2px' }}>状態異常:</div>
                      {monster.statusEffects.map((effect, i) => {
                        const meta = STATUS_EFFECT_METADATA[effect.type] || {};
                        return (
                          <div key={i} style={{ color: meta.color || '#ccc', fontSize: '9px' }}>
                            {meta.icon || '?'} {meta.displayName || effect.type}
                            {effect.duration > 0 && ` (残${effect.duration}ターン)`}
                            {effect.removeChance && ` [${Math.round(effect.removeChance * 100)}%解除]`}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {monster.categoryText && (
                    <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '6px' }}>
                      カテゴリ: {monster.categoryText}
                    </div>
                  )}
                  <div style={{
                    fontSize: '11px',
                    color: '#e0e0e0',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px',
                    borderRadius: '6px',
                    lineHeight: '1.5',
                    marginBottom: '8px',
                  }}>
                    {getEffectWithoutSkills(monster.effect) || 'なし'}
                  </div>
                  {/* トリガー情報 */}
                  {(() => {
                    const triggers = parseCardTriggers(monster);
                    if (triggers.length === 0) return null;
                    return (
                      <div style={{ fontSize: '10px', marginBottom: '8px', padding: '6px', background: 'rgba(157,76,230,0.15)', borderRadius: '4px' }}>
                        <div style={{ color: '#9d4ce6', fontWeight: 'bold', marginBottom: '6px' }}>📍 発動タイミング</div>
                        {triggers.map((trigger, i) => (
                          <div key={i}>
                            {i > 0 && <div style={{ borderTop: '1px solid rgba(157,76,230,0.3)', margin: '6px 0' }} />}
                            <div style={{ color: '#c9a0ff', fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>
                              【{trigger.displayDescription || getTriggerDisplayName(trigger.type)}】
                              {trigger.activationType === ACTIVATION_TYPES.OPTIONAL && <span style={{ color: '#ff8e53', fontWeight: 'normal', marginLeft: '4px' }}>(任意)</span>}
                            </div>
                            {trigger.description && (
                              <div style={{ color: '#ccc', fontSize: '9px', paddingLeft: '8px' }}>
                                {trigger.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {(monster.basicSkill || monster.advancedSkill) && (
                    <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                      {monster.basicSkill && (
                        <div style={{ padding: '6px', background: 'rgba(76,175,80,0.2)', borderRadius: '4px', marginBottom: '4px' }}>
                          <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技(1):</span><br/>
                          {monster.basicSkill.text}
                        </div>
                      )}
                      {monster.advancedSkill && (
                        <div style={{ padding: '6px', background: 'rgba(255,152,0,0.2)', borderRadius: '4px' }}>
                          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技(2):</span><br/>
                          {monster.advancedSkill.text}
                        </div>
                      )}
                    </div>
                  )}
                  {/* フレーバーテキスト */}
                  {monster.flavor && (
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '8px', fontStyle: 'italic', borderTop: '1px solid rgba(107,76,230,0.2)', paddingTop: '6px' }}>
                      📖 {monster.flavor}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* 選択中のフィールド/フェイズカード */}
            {!hoveredCard && !selectedHandCard && selectedFieldMonster === null && selectedFieldCardInfo && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: selectedFieldCardInfo.player === 1 ? '#4da6ff' : '#ff8a8a' }}>
                  {selectedFieldCardInfo.type === 'field' ? '🌍 フィールド' : '⚡ フェイズ'}: {selectedFieldCardInfo.card.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                  属性: {selectedFieldCardInfo.card.attribute} | コスト: {selectedFieldCardInfo.card.cost} SP
                </div>
                {/* キーワード能力 */}
                {selectedFieldCardInfo.card.keywordText && (
                  <div style={{ fontSize: '10px', color: '#ff8e53', marginBottom: '6px', padding: '4px', background: 'rgba(255,142,83,0.15)', borderRadius: '4px' }}>
                    {selectedFieldCardInfo.card.keywordText}
                  </div>
                )}
                {selectedFieldCardInfo.type === 'phasecard' && (
                  <>
                    <div style={{ fontSize: '12px', color: '#4caf50', marginBottom: '8px' }}>
                      ⚡ {getStageShortName(selectedFieldCardInfo.card.stage || 0)}段階 ({selectedFieldCardInfo.card.charges?.length || 0}/3)
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#ffd700',
                      background: 'rgba(255,215,0,0.1)',
                      padding: '8px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      lineHeight: '1.5',
                    }}>
                      <strong>【現在の効果】</strong><br/>
                      {getCurrentStageDescription(selectedFieldCardInfo.card) || '効果なし'}
                    </div>
                    {(selectedFieldCardInfo.card.stage || 0) < 3 && getNextStageDescription(selectedFieldCardInfo.card) && (
                      <div style={{
                        fontSize: '11px',
                        color: '#4da6ff',
                        background: 'rgba(77,166,255,0.1)',
                        padding: '8px',
                        borderRadius: '6px',
                        lineHeight: '1.5',
                      }}>
                        <strong>【次の段階】</strong><br/>
                        {getNextStageDescription(selectedFieldCardInfo.card)}
                      </div>
                    )}
                  </>
                )}
                {selectedFieldCardInfo.type === 'field' && (
                  <div style={{
                    fontSize: '11px',
                    color: '#e0e0e0',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px',
                    borderRadius: '6px',
                    lineHeight: '1.5',
                    marginBottom: '8px',
                  }}>
                    {getEffectWithoutSkills(selectedFieldCardInfo.card.effect) || 'なし'}
                  </div>
                )}
                {/* トリガー情報 */}
                {(() => {
                  const triggers = parseCardTriggers(selectedFieldCardInfo.card);
                  if (triggers.length === 0) return null;
                  return (
                    <div style={{ fontSize: '10px', marginBottom: '8px', padding: '6px', background: 'rgba(157,76,230,0.15)', borderRadius: '4px' }}>
                      <div style={{ color: '#9d4ce6', fontWeight: 'bold', marginBottom: '6px' }}>📍 発動タイミング</div>
                      {triggers.map((trigger, i) => (
                        <div key={i}>
                          {i > 0 && <div style={{ borderTop: '1px solid rgba(157,76,230,0.3)', margin: '6px 0' }} />}
                          <div style={{ color: '#c9a0ff', fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>
                            【{trigger.displayDescription || getTriggerDisplayName(trigger.type)}】
                            {trigger.activationType === ACTIVATION_TYPES.OPTIONAL && <span style={{ color: '#ff8e53', fontWeight: 'normal', marginLeft: '4px' }}>(任意)</span>}
                          </div>
                          {trigger.description && (
                            <div style={{ color: '#ccc', fontSize: '9px', paddingLeft: '8px' }}>
                              {trigger.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {/* フレーバーテキスト */}
                {selectedFieldCardInfo.card.flavor && (
                  <div style={{ fontSize: '9px', color: '#666', marginBottom: '8px', fontStyle: 'italic', borderTop: '1px solid rgba(107,76,230,0.2)', paddingTop: '6px' }}>
                    📖 {selectedFieldCardInfo.card.flavor}
                  </div>
                )}
                <button
                  onClick={() => setSelectedFieldCardInfo(null)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 12px',
                    background: 'rgba(107,76,230,0.5)',
                    border: '1px solid #6b4ce6',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  閉じる
                </button>
              </div>
            )}
            {/* 何も選択されていない時 */}
            {!selectedHandCard && selectedFieldMonster === null && !selectedFieldCardInfo && (
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', padding: '40px 10px' }}>
                カードを選択すると<br/>情報が表示されます
              </div>
            )}
          </div>
          {/* ログ */}
          <div style={{ padding: '12px', borderTop: '1px solid rgba(107,76,230,0.3)' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
              📜 ログ
            </div>
            <GameLog logs={logs} /> {/* Phase D-3: engineState直接参照 */}
          </div>
        </div>

        {/* ゲームボード */}
        <div style={styles.gameBoard}>
        {/* プレイヤー2エリア（上） */}
        <div style={{ ...styles.playerArea, background: currentPlayer === 2 ? 'rgba(255,107,107,0.1)' : 'transparent' }}>
          {/* 情報パネル */}
          <div style={styles.infoPanel}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ff6b6b' }}>
              プレイヤー2
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>LP: {p2Life}</div>
              <div style={styles.lifeBar}>
                <div style={{
                  ...styles.lifeBarFill,
                  width: `${(p2Life / INITIAL_LIFE) * 100}%`,
                  background: 'linear-gradient(90deg, #ff6b6b, #ff8533)',
                }} />
              </div>
            </div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>SP: {p2ActiveSP}/{p2ActiveSP + p2RestedSP}</div>
            <SPTokens active={p2ActiveSP} rested={p2RestedSP} max={MAX_SP} />
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#888', display: 'flex', gap: '8px' }}>
              <span>デッキ: {p2Deck.length}</span>
              <span
                onClick={() => p2Graveyard.length > 0 && setShowGraveyardViewer({ player: 2 })}
                style={{
                  cursor: p2Graveyard.length > 0 ? 'pointer' : 'default',
                  color: p2Graveyard.length > 0 ? '#9c6bff' : '#888',
                  textDecoration: p2Graveyard.length > 0 ? 'underline' : 'none',
                }}
                title={p2Graveyard.length > 0 ? 'クリックして墓地を閲覧' : '墓地にカードがありません'}
              >
                墓地: {p2Graveyard.length}
              </span>
            </div>
          </div>

          {/* フィールド */}
          <div style={styles.fieldArea}>
            {/* 刹那詠唱UI（プレイヤー2が相手ターン中に使用） */}
            {currentPlayer === 1 && setsunaPendingActivation && (
              <div style={{
                background: 'linear-gradient(135deg, #1a1a3a 0%, #2a1a4a 100%)',
                border: '2px solid #9c6bff',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                boxShadow: '0 0 15px rgba(156, 107, 255, 0.4)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#9c6bff', fontWeight: 'bold' }}>⚡ 刹那詠唱カードを選択</span>
                  <button
                    onClick={cancelSetsunaMagicMode}
                    style={{
                      background: '#444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    キャンセル
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getSetsunaMagicsForNonActivePlayer().map(card => (
                    <Card
                      key={card.uniqueId}
                      card={card}
                      onClick={() => selectSetsunaMagicCard(card)}
                      selected={setsunaPendingCard?.uniqueId === card.uniqueId}
                      inHand
                      small
                    />
                  ))}
                </div>
                {setsunaPendingCard && (
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <button
                      onClick={() => activateSetsunaMagic(setsunaPendingCard)}
                      style={{
                        background: 'linear-gradient(135deg, #9c6bff 0%, #7b4fd9 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 0 10px rgba(156, 107, 255, 0.5)',
                      }}
                    >
                      {setsunaPendingCard.name} を発動（コスト{getSetsunaCost(setsunaPendingCard)}）
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* 刹那詠唱ボタン（プレイヤー2用、プレイヤー1のターン中） */}
            {currentPlayer === 1 && !setsunaPendingActivation && canUseSetsunaMagic() && (
              <div style={{ marginBottom: '8px', textAlign: 'center' }}>
                <button
                  onClick={startSetsunaMagicMode}
                  style={{
                    background: 'linear-gradient(135deg, #9c6bff 0%, #7b4fd9 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(156, 107, 255, 0.5)',
                    animation: 'pulse 2s infinite',
                  }}
                >
                  ⚡ 刹那詠唱
                </button>
              </div>
            )}
            {/* 手札（プレイヤー2のターンなら表示、それ以外は裏向き） */}
            <div style={{ ...styles.handArea, minHeight: '80px' }}>
              {p2Hand.map((card, i) => {
                const costInfo = currentPlayer === 2 ? getModifiedCostInfo(card, 2) : {};
                // P2が人間でP2のターンの場合のみ手札を表示、AIの場合は常に裏向き
                return (currentPlayer === 2 && p2PlayerType === 'human') ? (
                  <Card
                    key={card.uniqueId}
                    card={card}
                    onClick={() => handleHandCardClick(card)}
                    selected={selectedHandCard?.uniqueId === card.uniqueId || pendingSelectedCard?.uniqueId === card.uniqueId}
                    inHand
                    small
                    disabled={phase !== 2}
                    modifiedCost={costInfo.modifiedCost}
                    costModifierSource={costInfo.costModifierSource}
                    onMouseEnter={() => setHoveredCard({ ...card, owner: 2 })}
                    onMouseLeave={() => setHoveredCard(null)}
                  />
                ) : (
                  <Card key={card.uniqueId} card={card} faceDown small />
                );
              })}
            </div>
            {/* モンスターゾーン */}
            <div style={styles.monsterZone}>
              {p2Field.map((monster, i) => {
                // 常時効果による修正値を計算
                const effectContext = {
                  currentPlayer,
                  effectOwner: 2,
                  p1Field,
                  p2Field,
                  p1Life,
                  p2Life,
                };
                const atkMod = monster ? continuousEffectEngine.calculateAttackModifier(monster, effectContext) : 0;
                const hpMod = monster ? continuousEffectEngine.calculateHPModifier(monster, effectContext) : 0;

                return (
                  <FieldMonster
                    key={i}
                    monster={monster}
                    onClick={() => handleFieldSlotClick(i, 2)}
                    selected={selectedFieldMonster === i && currentPlayer === 2}
                    canAttack={currentPlayer === 2 && phase === 3 && monster?.canAttack}
                    isTarget={currentPlayer === 1 && phase === 3 && attackingMonster !== null}
                    isValidTarget={currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'monster' && !monster}
                    isTargetSelectable={pendingMonsterTarget && ((pendingMonsterTarget.targetPlayer === 'opponent' && currentPlayer === 1) || (pendingMonsterTarget.targetPlayer === 'self' && currentPlayer === 2)) && monster}
                    isTargetSelected={pendingMonsterTarget && ((pendingMonsterTarget.targetPlayer === 'opponent' && currentPlayer === 1) || (pendingMonsterTarget.targetPlayer === 'self' && currentPlayer === 2)) && pendingSelectedMonsterIndex === i}
                    onMouseEnter={monster ? () => setHoveredCard({ ...monster, owner: 2 }) : undefined}
                    onMouseLeave={monster ? () => setHoveredCard(null) : undefined}
                    atkModifier={atkMod}
                    hpModifier={hpMod}
                  />
                );
              })}
            </div>
          </div>

          {/* フィールドカード・フェイズカード */}
          <div style={styles.infoPanel}>
            <div style={styles.cardZoneContainer}>
              {/* フィールドカード */}
              <div style={styles.cardZoneItem}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>フィールド</div>
                {p2FieldCard ? (
                  <div
                    style={{
                      cursor: currentPlayer === 2 && phase === 2 ? 'pointer' : 'default',
                      border: selectedFieldCardInfo?.card === p2FieldCard ? '2px solid #ff6b6b' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 2 ? handleFieldCardZoneClick : undefined}
                    onMouseEnter={() => setSelectedFieldCardInfo({ card: p2FieldCard, type: 'field', player: 2 })}
                    onMouseLeave={() => setSelectedFieldCardInfo(null)}
                  >
                    <Card card={p2FieldCard} small />
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.cardSlot,
                      width: '80px',
                      height: '100px',
                      cursor: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? 'pointer' : 'default',
                      border: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? '2px solid #ff6b6b' : '1px dashed #444',
                      background: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? 'rgba(255,107,107,0.1)' : 'rgba(30,30,40,0.5)',
                    }}
                    onClick={currentPlayer === 2 ? handleFieldCardZoneClick : undefined}
                  >
                    なし
                  </div>
                )}
              </div>

              {/* フェイズカード */}
              <div style={styles.cardZoneItem}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>フェイズ</div>
                {p2PhaseCard ? (
                  <div
                    style={{
                      cursor: currentPlayer === 2 && phase === 2 ? 'pointer' : 'default',
                      border: currentPlayer === 2 && phase === 2 && selectedHandCard && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') ? '2px solid #ff6b6b' : selectedFieldCardInfo?.card === p2PhaseCard ? '2px solid #ff6b6b' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 2 ? handlePhaseCardZoneClick : undefined}
                    onMouseEnter={() => setSelectedFieldCardInfo({ card: p2PhaseCard, type: 'phasecard', player: 2 })}
                    onMouseLeave={() => setSelectedFieldCardInfo(null)}
                  >
                    <Card card={p2PhaseCard} small />
                    <div style={{ fontSize: '10px', color: '#ffd700', textAlign: 'center', marginTop: '4px' }}>
                      ⚡ {getStageShortName(p2PhaseCard.stage || 0)}段階 ({p2PhaseCard.charges?.length || 0}/3)
                    </div>
                    {currentPlayer === 2 && phase === 2 && selectedHandCard &&
                      (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') &&
                      (selectedHandCard.attribute === p2PhaseCard.attribute || selectedHandCard.attribute === 'なし' || p2PhaseCard.attribute === 'なし') &&
                      (p2PhaseCard.stage || 0) < 3 && (
                      <div style={{ fontSize: '9px', color: '#4da6ff', textAlign: 'center', marginTop: '2px' }}>
                        クリックでチャージ
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.cardSlot,
                      width: '80px',
                      height: '100px',
                      cursor: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? 'pointer' : 'default',
                      border: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? '2px solid #ff6b6b' : '1px dashed #444',
                      background: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? 'rgba(255,107,107,0.1)' : 'rgba(30,30,40,0.5)',
                    }}
                    onClick={currentPlayer === 2 ? handlePhaseCardZoneClick : undefined}
                  >
                    フェイズ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* センターゾーン */}
        <div style={styles.centerZone}>
          {/* フェイズ表示 */}
          <div style={styles.phaseIndicator}>
            {PHASES.map((p, i) => (
              <div
                key={i}
                style={{
                  ...styles.phaseButton,
                  background: phase === i 
                    ? 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)' 
                    : 'rgba(40,40,60,0.8)',
                  color: phase === i ? '#fff' : '#888',
                  boxShadow: phase === i ? '0 0 15px rgba(107,76,230,0.5)' : 'none',
                }}
              >
                {p}
              </div>
            ))}
          </div>

          {/* 手札選択モード */}
          {pendingHandSelection && (
            <div
              onClick={pendingSelectedCard ? confirmHandSelection : undefined}
              style={{
                background: pendingSelectedCard
                  ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                  : 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: pendingSelectedCard
                  ? '0 4px 20px rgba(76,175,80,0.4)'
                  : '0 4px 20px rgba(255,107,107,0.4)',
                marginBottom: '12px',
                cursor: pendingSelectedCard ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                {pendingHandSelection.message}
              </div>
              {pendingSelectedCard ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#fff' }}>
                    選択中: <strong>{pendingSelectedCard.name}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#e0ffe0' }}>
                    👆 クリックで決定
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#ffe0e0' }}>
                  手札からカードをクリックして選択してください
                </div>
              )}
            </div>
          )}

          {/* モンスターターゲット選択モード */}
          {pendingMonsterTarget && (
            <div
              onClick={pendingSelectedMonsterIndex !== null ? () => {
                pendingMonsterTarget.callback(pendingSelectedMonsterIndex);
                setPendingMonsterTarget(null);
                setPendingSelectedMonsterIndex(null);
              } : undefined}
              style={{
                background: pendingSelectedMonsterIndex !== null
                  ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                  : 'linear-gradient(135deg, #e91e63 0%, #f06292 100%)',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: pendingSelectedMonsterIndex !== null
                  ? '0 4px 20px rgba(76,175,80,0.4)'
                  : '0 4px 20px rgba(233,30,99,0.4)',
                marginBottom: '12px',
                cursor: pendingSelectedMonsterIndex !== null ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                {pendingMonsterTarget.message}
              </div>
              {pendingSelectedMonsterIndex !== null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#fff' }}>
                    選択中: <strong>{
                      (pendingMonsterTarget.targetPlayer === 'opponent'
                        ? (currentPlayer === 1 ? p2Field : p1Field)
                        : (currentPlayer === 1 ? p1Field : p2Field)
                      )[pendingSelectedMonsterIndex]?.name
                    }</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#e0ffe0' }}>
                    👆 クリックで決定
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#ffe0e0' }}>
                  {pendingMonsterTarget.targetPlayer === 'opponent' ? '相手' : '自分'}のフィールドからモンスターを選択
                </div>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 技発動ボタン（メインフェイズ） */}
            {phase === 2 && selectedFieldMonster !== null && currentPlayer === 1 && (
              (() => {
                const monster = p1Field[selectedFieldMonster];
                if (!monster) return null;
                // 技を持たないモンスターは技発動セクションを表示しない
                if (!monster.basicSkill && !monster.advancedSkill) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#ffd700', textAlign: 'center' }}>
                      {monster.name} - 技発動
                    </div>
                    {monster.basicSkill && (
                      <button
                        onClick={() => executeSkill(selectedFieldMonster, 'basic')}
                        style={{
                          ...styles.actionButton,
                          background: monster.usedSkillThisTurn
                            ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                            : 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 1 || monster.usedSkillThisTurn}
                      >
                        基本技 (チャージ{monster.charges?.length || 0}/1){monster.usedSkillThisTurn && ' [発動済]'}
                      </button>
                    )}
                    {monster.advancedSkill && (
                      <button
                        onClick={() => executeSkill(selectedFieldMonster, 'advanced')}
                        style={{
                          ...styles.actionButton,
                          background: monster.usedSkillThisTurn
                            ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                            : 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 2 || monster.usedSkillThisTurn}
                      >
                        上級技 (チャージ{monster.charges?.length || 0}/2){monster.usedSkillThisTurn && ' [発動済]'}
                      </button>
                    )}
                    {/* SPチャージボタン */}
                    {(monster.basicSkill || monster.advancedSkill) && (
                      <button
                        onClick={() => chargeSP(selectedFieldMonster)}
                        style={{
                          ...styles.actionButton,
                          background: (chargeUsedThisTurn || monster.charges?.length >= 2 || p1ActiveSP < 1)
                            ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                            : 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={chargeUsedThisTurn || monster.charges?.length >= 2 || p1ActiveSP < 1}
                      >
                        💠 SPチャージ (残SP: {p1ActiveSP})
                      </button>
                    )}
                    {/* 【壮麗】ボタン（P1用） */}
                    {canActivateSourei(monster, p1Hand) && !monster.soureiUsedThisTurn && (
                      <button
                        onClick={() => activateSourei(selectedFieldMonster)}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #e91e63 0%, #f48fb1 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                      >
                        ✨ 【壮麗】発動 ({getSoureiEffect(monster.id)?.description || '追加効果'})
                      </button>
                    )}
                    {/* メインフェイズトリガー */}
                    {(() => {
                      const triggers = getCardMainPhaseTriggers(monster, currentPlayer);
                      return triggers.map((trigger, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const triggerContext = {
                              currentPlayer,
                              card: monster,
                              slotIndex: selectedFieldMonster,
                              setP1Life,
                              setP2Life,
                              setP1Field,
                              setP2Field,
                              setP1Hand,
                              setP2Hand,
                              setP1Deck,
                              setP2Deck,
                              setP1Graveyard,
                              setP2Graveyard,
                              p1Field,
                              p2Field,
                              p1Hand,
                              p2Hand,
                              p1Deck,
                              p2Deck,
                              p1Graveyard,
                              p2Graveyard,
                              p1Life,
                              p2Life,
                              addLog,
                              setPendingHandSelection,
                              setPendingGraveyardSelection,
                              setShowGraveyardViewer,
                              setPendingDeckReview,
                            };
                            const { activateTrigger } = require('./engine/triggerEngine');
                            activateTrigger(trigger, triggerContext);
                          }}
                          style={{
                            ...styles.actionButton,
                            background: trigger.usedThisTurn
                              ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                              : 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                            fontSize: '12px',
                            padding: '8px 16px',
                          }}
                          disabled={!trigger.canActivate}
                        >
                          🌟 {trigger.description} {trigger.usedThisTurn && '(使用済み)'}
                        </button>
                      ));
                    })()}
                  </div>
                );
              })()
            )}
            {phase === 2 && selectedFieldMonster !== null && currentPlayer === 2 && (
              (() => {
                const monster = p2Field[selectedFieldMonster];
                if (!monster) return null;
                // 技を持たないモンスターは技発動セクションを表示しない
                if (!monster.basicSkill && !monster.advancedSkill) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#ffd700', textAlign: 'center' }}>
                      {monster.name} - 技発動
                    </div>
                    {monster.basicSkill && (
                      <button
                        onClick={() => executeSkill(selectedFieldMonster, 'basic')}
                        style={{
                          ...styles.actionButton,
                          background: monster.usedSkillThisTurn
                            ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                            : 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 1 || monster.usedSkillThisTurn}
                      >
                        基本技 (チャージ{monster.charges?.length || 0}/1){monster.usedSkillThisTurn && ' [発動済]'}
                      </button>
                    )}
                    {monster.advancedSkill && (
                      <button
                        onClick={() => executeSkill(selectedFieldMonster, 'advanced')}
                        style={{
                          ...styles.actionButton,
                          background: monster.usedSkillThisTurn
                            ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                            : 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 2 || monster.usedSkillThisTurn}
                      >
                        上級技 (チャージ{monster.charges?.length || 0}/2){monster.usedSkillThisTurn && ' [発動済]'}
                      </button>
                    )}
                    {/* SPチャージボタン */}
                    {(monster.basicSkill || monster.advancedSkill) && (
                      <button
                        onClick={() => chargeSP(selectedFieldMonster)}
                        style={{
                          ...styles.actionButton,
                          background: (chargeUsedThisTurn || monster.charges?.length >= 2 || p2ActiveSP < 1)
                            ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                            : 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={chargeUsedThisTurn || monster.charges?.length >= 2 || p2ActiveSP < 1}
                      >
                        💠 SPチャージ (残SP: {p2ActiveSP})
                      </button>
                    )}
                    {/* 【壮麗】ボタン（P2用） */}
                    {canActivateSourei(monster, p2Hand) && !monster.soureiUsedThisTurn && (
                      <button
                        onClick={() => activateSourei(selectedFieldMonster)}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #e91e63 0%, #f48fb1 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                      >
                        ✨ 【壮麗】発動 ({getSoureiEffect(monster.id)?.description || '追加効果'})
                      </button>
                    )}
                    {/* メインフェイズトリガー */}
                    {(() => {
                      const triggers = getCardMainPhaseTriggers(monster, currentPlayer);
                      return triggers.map((trigger, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const triggerContext = {
                              currentPlayer,
                              card: monster,
                              slotIndex: selectedFieldMonster,
                              setP1Life,
                              setP2Life,
                              setP1Field,
                              setP2Field,
                              setP1Hand,
                              setP2Hand,
                              setP1Deck,
                              setP2Deck,
                              setP1Graveyard,
                              setP2Graveyard,
                              p1Field,
                              p2Field,
                              p1Hand,
                              p2Hand,
                              p1Deck,
                              p2Deck,
                              p1Graveyard,
                              p2Graveyard,
                              p1Life,
                              p2Life,
                              addLog,
                              setPendingHandSelection,
                              setPendingGraveyardSelection,
                              setShowGraveyardViewer,
                              setPendingDeckReview,
                            };
                            const { activateTrigger } = require('./engine/triggerEngine');
                            activateTrigger(trigger, triggerContext);
                          }}
                          style={{
                            ...styles.actionButton,
                            background: trigger.usedThisTurn
                              ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                              : 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                            fontSize: '12px',
                            padding: '8px 16px',
                          }}
                          disabled={!trigger.canActivate}
                        >
                          🌟 {trigger.description} {trigger.usedThisTurn && '(使用済み)'}
                        </button>
                      ));
                    })()}
                  </div>
                );
              })()
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {phase === 2 && selectedHandCard && selectedHandCard.type === 'magic' && (
                <button
                  onClick={useMagicCard}
                  style={{
                    ...styles.actionButton,
                    background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                    fontSize: '14px',
                    padding: '10px 20px',
                  }}
                >
                  ✨ 魔法カード発動
                </button>
              )}
              {/* 【犠現】発動ボタン */}
              {phase === 2 && selectedHandCard && selectedHandCard.type === 'monster' &&
               canActivateGigen(selectedHandCard, currentPlayer === 1 ? p1Field : p2Field) && (
                <button
                  onClick={() => {
                    // 空きスロットを探す
                    const field = currentPlayer === 1 ? p1Field : p2Field;
                    const emptySlot = field.findIndex(m => m === null);
                    if (emptySlot !== -1) {
                      startGigenActivation(selectedHandCard, emptySlot);
                    } else {
                      // 空きがない場合は生贄スロットに召喚
                      startGigenActivation(selectedHandCard, 0);
                    }
                  }}
                  style={{
                    ...styles.actionButton,
                    background: 'linear-gradient(135deg, #ff6f00 0%, #ffa726 100%)',
                    fontSize: '14px',
                    padding: '10px 20px',
                  }}
                >
                  🔥 【犠現】発動（生贄でコスト軽減）
                </button>
              )}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {phase === 2 && activatableGraveyardCards.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>
                      墓地発動可能
                    </div>
                    {activatableGraveyardCards.map((card) => (
                      <button
                        key={card.uniqueId}
                        onClick={() => activateGraveyardCard(card)}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #6b4e9e, #8b6bb8)',
                          fontSize: '12px',
                          padding: '6px 12px',
                        }}
                      >
                        💀 {card.name}
                      </button>
                    ))}
                  </div>
                )}
                {phase === 2 && (
                  <button onClick={nextPhase} style={styles.actionButton}>
                    バトルフェイズへ →
                  </button>
                )}
                {phase === 3 && (
                  <>
                    {attackingMonster !== null && (
                      <button onClick={handleDirectAttack} style={{ ...styles.actionButton, background: '#ff4444' }}>
                        ダイレクトアタック
                      </button>
                    )}
                    <button onClick={nextPhase} style={styles.actionButton}>
                      ターン終了 →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* プレイヤー1エリア（下） */}
        <div style={{ ...styles.playerArea, background: currentPlayer === 1 ? 'rgba(77,166,255,0.1)' : 'transparent' }}>
          {/* 情報パネル */}
          <div style={styles.infoPanel}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#4da6ff' }}>
              プレイヤー1
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>LP: {p1Life}</div>
              <div style={styles.lifeBar}>
                <div style={{
                  ...styles.lifeBarFill,
                  width: `${(p1Life / INITIAL_LIFE) * 100}%`,
                  background: 'linear-gradient(90deg, #4da6ff, #66d9ff)',
                }} />
              </div>
            </div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>SP: {p1ActiveSP}/{p1ActiveSP + p1RestedSP}</div>
            <SPTokens active={p1ActiveSP} rested={p1RestedSP} max={MAX_SP} />
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#888', display: 'flex', gap: '8px' }}>
              <span>デッキ: {p1Deck.length}</span>
              <span
                onClick={() => p1Graveyard.length > 0 && setShowGraveyardViewer({ player: 1 })}
                style={{
                  cursor: p1Graveyard.length > 0 ? 'pointer' : 'default',
                  color: p1Graveyard.length > 0 ? '#6b9eff' : '#888',
                  textDecoration: p1Graveyard.length > 0 ? 'underline' : 'none',
                }}
                title={p1Graveyard.length > 0 ? 'クリックして墓地を閲覧' : '墓地にカードがありません'}
              >
                墓地: {p1Graveyard.length}
              </span>
            </div>
          </div>

          {/* フィールド */}
          <div style={styles.fieldArea}>
            {/* モンスターゾーン */}
            <div style={styles.monsterZone}>
              {p1Field.map((monster, i) => {
                // 常時効果による修正値を計算
                const effectContext = {
                  currentPlayer,
                  effectOwner: 1,
                  p1Field,
                  p2Field,
                  p1Life,
                  p2Life,
                };
                const atkMod = monster ? continuousEffectEngine.calculateAttackModifier(monster, effectContext) : 0;
                const hpMod = monster ? continuousEffectEngine.calculateHPModifier(monster, effectContext) : 0;

                return (
                  <FieldMonster
                    key={i}
                    monster={monster}
                    onClick={() => handleFieldSlotClick(i, 1)}
                    selected={selectedFieldMonster === i && currentPlayer === 1}
                    canAttack={currentPlayer === 1 && phase === 3 && monster?.canAttack}
                    isTarget={currentPlayer === 2 && phase === 3 && attackingMonster !== null}
                    isValidTarget={currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'monster' && !monster}
                    isTargetSelectable={pendingMonsterTarget && ((pendingMonsterTarget.targetPlayer === 'opponent' && currentPlayer === 2) || (pendingMonsterTarget.targetPlayer === 'self' && currentPlayer === 1)) && monster}
                    isTargetSelected={pendingMonsterTarget && ((pendingMonsterTarget.targetPlayer === 'opponent' && currentPlayer === 2) || (pendingMonsterTarget.targetPlayer === 'self' && currentPlayer === 1)) && pendingSelectedMonsterIndex === i}
                    onMouseEnter={monster ? () => setHoveredCard({ ...monster, owner: 1 }) : undefined}
                    onMouseLeave={monster ? () => setHoveredCard(null) : undefined}
                    atkModifier={atkMod}
                    hpModifier={hpMod}
                  />
                );
              })}
            </div>
            {/* 手札 */}
            <div style={styles.handArea}>
              {p1Hand.map((card) => {
                const costInfo = currentPlayer === 1 ? getModifiedCostInfo(card, 1) : {};
                // P1がAIでP2が人間の場合は裏向き
                const shouldHideP1Hand = p1PlayerType === 'ai' && p2PlayerType === 'human';
                return shouldHideP1Hand ? (
                  <Card key={card.uniqueId} card={card} faceDown />
                ) : (
                  <Card
                    key={card.uniqueId}
                    card={card}
                    onClick={() => handleHandCardClick(card)}
                    selected={selectedHandCard?.uniqueId === card.uniqueId || pendingSelectedCard?.uniqueId === card.uniqueId}
                    inHand
                    disabled={currentPlayer !== 1 || phase !== 2}
                    modifiedCost={costInfo.modifiedCost}
                    costModifierSource={costInfo.costModifierSource}
                    onMouseEnter={() => setHoveredCard({ ...card, owner: 1 })}
                    onMouseLeave={() => setHoveredCard(null)}
                  />
                );
              })}
            </div>
            {/* 刹那詠唱ボタン（プレイヤー1用、プレイヤー2のターン中） */}
            {currentPlayer === 2 && !setsunaPendingActivation && canUseSetsunaMagic() && (
              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                <button
                  onClick={startSetsunaMagicMode}
                  style={{
                    background: 'linear-gradient(135deg, #4da6ff 0%, #3d8bdb 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(77, 166, 255, 0.5)',
                    animation: 'pulse 2s infinite',
                  }}
                >
                  ⚡ 刹那詠唱
                </button>
              </div>
            )}
            {/* 刹那詠唱UI（プレイヤー1が相手ターン中に使用） */}
            {currentPlayer === 2 && setsunaPendingActivation && (
              <div style={{
                background: 'linear-gradient(135deg, #1a2a3a 0%, #1a3a4a 100%)',
                border: '2px solid #4da6ff',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '8px',
                boxShadow: '0 0 15px rgba(77, 166, 255, 0.4)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#4da6ff', fontWeight: 'bold' }}>⚡ 刹那詠唱カードを選択</span>
                  <button
                    onClick={cancelSetsunaMagicMode}
                    style={{
                      background: '#444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    キャンセル
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getSetsunaMagicsForNonActivePlayer().map(card => (
                    <Card
                      key={card.uniqueId}
                      card={card}
                      onClick={() => selectSetsunaMagicCard(card)}
                      selected={setsunaPendingCard?.uniqueId === card.uniqueId}
                      inHand
                      small
                    />
                  ))}
                </div>
                {setsunaPendingCard && (
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <button
                      onClick={() => activateSetsunaMagic(setsunaPendingCard)}
                      style={{
                        background: 'linear-gradient(135deg, #4da6ff 0%, #3d8bdb 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 0 10px rgba(77, 166, 255, 0.5)',
                      }}
                    >
                      {setsunaPendingCard.name} を発動（コスト{getSetsunaCost(setsunaPendingCard)}）
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* フィールドカード・フェイズカード */}
          <div style={styles.infoPanel}>
            <div style={styles.cardZoneContainer}>
              {/* フィールドカード */}
              <div style={styles.cardZoneItem}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>フィールド</div>
                {p1FieldCard ? (
                  <div
                    style={{
                      cursor: currentPlayer === 1 && phase === 2 ? 'pointer' : 'default',
                      border: selectedFieldCardInfo?.card === p1FieldCard ? '2px solid #4da6ff' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 1 ? handleFieldCardZoneClick : undefined}
                    onMouseEnter={() => setSelectedFieldCardInfo({ card: p1FieldCard, type: 'field', player: 1 })}
                    onMouseLeave={() => setSelectedFieldCardInfo(null)}
                  >
                    <Card card={p1FieldCard} small />
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.cardSlot,
                      width: '80px',
                      height: '100px',
                      cursor: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? 'pointer' : 'default',
                      border: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? '2px solid #4da6ff' : '1px dashed #444',
                      background: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? 'rgba(77,166,255,0.1)' : 'rgba(30,30,40,0.5)',
                    }}
                    onClick={currentPlayer === 1 ? handleFieldCardZoneClick : undefined}
                  >
                    なし
                  </div>
                )}
              </div>

              {/* フェイズカード */}
              <div style={styles.cardZoneItem}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>フェイズ</div>
                {p1PhaseCard ? (
                  <div
                    style={{
                      cursor: currentPlayer === 1 && phase === 2 ? 'pointer' : 'default',
                      border: currentPlayer === 1 && phase === 2 && selectedHandCard && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') ? '2px solid #4da6ff' : selectedFieldCardInfo?.card === p1PhaseCard ? '2px solid #4da6ff' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 1 ? handlePhaseCardZoneClick : undefined}
                    onMouseEnter={() => setSelectedFieldCardInfo({ card: p1PhaseCard, type: 'phasecard', player: 1 })}
                    onMouseLeave={() => setSelectedFieldCardInfo(null)}
                  >
                    <Card card={p1PhaseCard} small />
                    <div style={{ fontSize: '10px', color: '#ffd700', textAlign: 'center', marginTop: '4px' }}>
                      ⚡ {getStageShortName(p1PhaseCard.stage || 0)}段階 ({p1PhaseCard.charges?.length || 0}/3)
                    </div>
                    {currentPlayer === 1 && phase === 2 && selectedHandCard &&
                      (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') &&
                      (selectedHandCard.attribute === p1PhaseCard.attribute || selectedHandCard.attribute === 'なし' || p1PhaseCard.attribute === 'なし') &&
                      (p1PhaseCard.stage || 0) < 3 && (
                      <div style={{ fontSize: '9px', color: '#4da6ff', textAlign: 'center', marginTop: '2px' }}>
                        クリックでチャージ
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.cardSlot,
                      width: '80px',
                      height: '100px',
                      cursor: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? 'pointer' : 'default',
                      border: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? '2px solid #4da6ff' : '1px dashed #444',
                      background: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? 'rgba(77,166,255,0.1)' : 'rgba(30,30,40,0.5)',
                    }}
                    onClick={currentPlayer === 1 ? handlePhaseCardZoneClick : undefined}
                  >
                    フェイズ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* 墓地閲覧モーダル */}
      {showGraveyardViewer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowGraveyardViewer(null);
            setPendingGraveyardSelectedCard(null);
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '2px solid #444',
              boxShadow: '0 0 30px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: showGraveyardViewer.player === 1 ? '#4da6ff' : '#ff6b6b' }}>
                💀 {showGraveyardViewer.player === 1 ? 'プレイヤー1' : 'プレイヤー2'}の墓地
                ({(showGraveyardViewer.player === 1 ? p1Graveyard : p2Graveyard).length}枚)
              </h3>
              <button
                onClick={() => {
                  setShowGraveyardViewer(null);
                  setPendingGraveyardSelectedCard(null);
                }}
                style={{
                  background: '#ff4444',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✕ 閉じる
              </button>
            </div>

            {/* 墓地選択モード中のメッセージ */}
            {pendingGraveyardSelection && (
              <div style={{
                background: 'rgba(156, 107, 255, 0.2)',
                border: '1px solid #9c6bff',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                <div style={{ color: '#9c6bff', fontWeight: 'bold', marginBottom: '4px' }}>
                  {pendingGraveyardSelection.message}
                </div>
                {pendingGraveyardSelectedCard && (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        if (pendingGraveyardSelection.callback) {
                          pendingGraveyardSelection.callback(pendingGraveyardSelectedCard);
                        }
                        setPendingGraveyardSelection(null);
                        setPendingGraveyardSelectedCard(null);
                        setShowGraveyardViewer(null);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓ 【{pendingGraveyardSelectedCard.name}】を選択
                    </button>
                    <button
                      onClick={() => setPendingGraveyardSelectedCard(null)}
                      style={{
                        background: 'linear-gradient(135deg, #666, #888)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        padding: '8px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      選択解除
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* カード一覧 */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              overflowY: 'auto',
              maxHeight: '60vh',
              padding: '8px',
              justifyContent: 'center',
            }}>
              {(showGraveyardViewer.player === 1 ? p1Graveyard : p2Graveyard).length === 0 ? (
                <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>
                  墓地にカードがありません
                </div>
              ) : (
                (showGraveyardViewer.player === 1 ? p1Graveyard : p2Graveyard).map((card, index) => {
                  const isSelectable = pendingGraveyardSelection
                    ? (!pendingGraveyardSelection.filter || pendingGraveyardSelection.filter(card))
                    : false;
                  const isSelected = pendingGraveyardSelectedCard?.uniqueId === card.uniqueId;

                  // この墓地カードに発動可能なトリガーがあるか確認
                  const graveyardTriggers = (() => {
                    if (showGraveyardViewer.player !== currentPlayer) return [];
                    if (phase !== 2) return []; // メインフェイズのみ
                    const triggers = parseCardTriggers(card);
                    return triggers.filter((t) => {
                      if (t.type !== TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD) return false;
                      if (t.costCheck) {
                        const context = { currentPlayer, p1ActiveSP, p2ActiveSP };
                        if (!t.costCheck(context)) return false;
                      }
                      // モンスターの場合、場に空きがあるか確認
                      if (card.type === 'monster') {
                        const field = currentPlayer === 1 ? p1Field : p2Field;
                        if (!field.some((slot) => slot === null)) return false;
                      }
                      return true;
                    });
                  })();
                  const hasActivatableTrigger = graveyardTriggers.length > 0;

                  return (
                    <div
                      key={card.uniqueId || index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <div
                        onClick={() => {
                          if (pendingGraveyardSelection && isSelectable) {
                            setPendingGraveyardSelectedCard(isSelected ? null : card);
                          }
                        }}
                        style={{
                          cursor: (pendingGraveyardSelection && isSelectable) ? 'pointer' : 'default',
                          border: isSelected ? '3px solid #9c6bff' :
                                  hasActivatableTrigger ? '2px solid #ffd700' :
                                  (pendingGraveyardSelection && !isSelectable) ? '2px solid #444' : 'none',
                          borderRadius: '8px',
                          padding: '2px',
                          opacity: (pendingGraveyardSelection && !isSelectable) ? 0.5 : 1,
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Card card={card} small />
                      </div>
                      {/* 墓地発動ボタン */}
                      {hasActivatableTrigger && !pendingGraveyardSelection && (
                        <button
                          onClick={() => {
                            activateGraveyardCard(card);
                            setShowGraveyardViewer(null);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #6b4e9e, #8b6bb8)',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          💀 発動
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* デッキトップ確認モーダル */}
      {pendingDeckReview && (
        <DeckReviewModal
          cards={pendingDeckReview.cards}
          title={pendingDeckReview.title}
          message={pendingDeckReview.message}
          allowReorder={pendingDeckReview.allowReorder}
          onConfirm={pendingDeckReview.onConfirm ? (reorderedCards) => {
            pendingDeckReview.onConfirm(reorderedCards);
            setPendingDeckReview(null);
          } : () => setPendingDeckReview(null)}
          onCancel={pendingDeckReview.onCancel ? () => {
            pendingDeckReview.onCancel();
            setPendingDeckReview(null);
          } : null}
          selectMode={pendingDeckReview.selectMode}
          onSelect={pendingDeckReview.onSelect ? (selectedCards, remainingCards) => {
            pendingDeckReview.onSelect(selectedCards, remainingCards);
            setPendingDeckReview(null);
          } : null}
        />
      )}

      {/* チェーン確認ダイアログ（刹那詠唱の発動タイミング） */}
      {chainConfirmation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '90vw',
              border: '3px solid #9c6bff',
              boxShadow: '0 0 40px rgba(156, 107, 255, 0.5)',
            }}
          >
            {/* ヘッダー */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{
                margin: 0,
                color: '#9c6bff',
                fontSize: '1.5rem',
                textShadow: '0 0 10px rgba(156, 107, 255, 0.5)',
              }}>
                ⚡ 【刹那詠唱】チェーン確認
              </h2>
              <p style={{
                margin: '8px 0 0 0',
                color: '#aaa',
                fontSize: '0.9rem'
              }}>
                {CHAIN_POINT_NAMES[chainConfirmation.chainPoint]}時
              </p>
            </div>

            {/* 対象プレイヤー表示 */}
            <div style={{
              textAlign: 'center',
              marginBottom: '16px',
              color: chainConfirmation.askingPlayer === 1 ? '#4da6ff' : '#ff6b6b',
              fontWeight: 'bold',
              fontSize: '1.2rem',
            }}>
              プレイヤー{chainConfirmation.askingPlayer}、刹那詠唱を発動しますか？
            </div>

            {/* 攻撃情報表示（攻撃宣言時の場合） */}
            {chainConfirmation.context?.attacker && (
              <div style={{
                background: 'rgba(255,100,100,0.15)',
                border: '1px solid rgba(255,100,100,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                <span style={{ color: '#ff6b6b' }}>⚔️ 攻撃宣言: </span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>
                  {chainConfirmation.context.attacker.name}
                </span>
              </div>
            )}

            {/* 発動可能なカード一覧 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '8px' }}>
                発動可能な刹那詠唱カード:
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '4px',
              }}>
                {getActivatableSetsunaMagics(
                  chainConfirmation.askingPlayer === 1 ? p1Hand : p2Hand,
                  chainConfirmation.askingPlayer === 1 ? p1ActiveSP : p2ActiveSP
                ).map(card => (
                  <div
                    key={card.uniqueId}
                    onClick={() => setSetsunaPendingCard(
                      setsunaPendingCard?.uniqueId === card.uniqueId ? null : card
                    )}
                    style={{
                      background: setsunaPendingCard?.uniqueId === card.uniqueId
                        ? 'linear-gradient(135deg, #9c6bff, #7b4bd4)'
                        : 'linear-gradient(135deg, #2a2a4a, #1a1a3a)',
                      border: setsunaPendingCard?.uniqueId === card.uniqueId
                        ? '2px solid #fff'
                        : '1px solid #555',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minWidth: '120px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      marginBottom: '4px',
                    }}>
                      {card.name}
                    </div>
                    <div style={{
                      color: '#ffd700',
                      fontSize: '0.75rem',
                    }}>
                      コスト: {getSetsunaCost(card)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 選択中のカード詳細 */}
            {setsunaPendingCard && (
              <div style={{
                background: 'rgba(156, 107, 255, 0.15)',
                border: '1px solid rgba(156, 107, 255, 0.4)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  color: '#9c6bff',
                  fontWeight: 'bold',
                  marginBottom: '6px',
                }}>
                  選択中: {setsunaPendingCard.name}
                </div>
                <div style={{
                  color: '#ccc',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                }}>
                  {setsunaPendingCard.effect}
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '20px',
            }}>
              {setsunaPendingCard && (
                <button
                  onClick={() => activateSetsunaInChain(setsunaPendingCard)}
                  style={{
                    background: 'linear-gradient(135deg, #9c6bff, #7b4bd4)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    boxShadow: '0 0 15px rgba(156, 107, 255, 0.4)',
                  }}
                >
                  ⚡ {setsunaPendingCard.name}を発動
                </button>
              )}
              <button
                onClick={skipChainConfirmation}
                style={{
                  background: 'linear-gradient(135deg, #555, #333)',
                  border: '1px solid #666',
                  borderRadius: '8px',
                  color: '#ccc',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                発動しない
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 大会観戦ダイアログ */}
      {showTournamentViewer && pendingTournamentResult && (
        <TournamentViewer
          tournament={pendingTournamentResult}
          currentBets={playerData?.tournamentData?.currentBets || []}
          onClaimReward={handleClaimTournamentReward}
          onClose={() => {
            setShowTournamentViewer(false);
            setPendingTournamentResult(null);
          }}
        />
      )}
    </div>
  );
}
