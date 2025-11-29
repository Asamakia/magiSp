/**
 * contextAdapter - 純粋関数モード用のcontextアダプター
 *
 * React setterをエミュレートし、cardEffects/cardTriggersを変更せずに
 * シミュレーションで使用できるようにする。
 *
 * @see src/ルール/context-adapter-analysis.md
 * @see src/ルール/simulation-full-integration-plan.md
 */

import {
  getPlayer,
  getOpponentNumber,
  updatePlayer,
  addLog as addLogPure,
} from './GameState';

import {
  registerCardTriggersPure,
  unregisterCardTriggersPure,
} from './triggerEnginePure';

// ========================================
// メインアダプター
// ========================================

/**
 * 純粋関数モード用のcontextを作成
 *
 * cardEffects/*.js, cardTriggers/*.js が期待するcontextオブジェクトを生成。
 * React setterの代わりに内部でstateを更新し、getState()で最終stateを取得。
 *
 * @param {Object} initialState - GameState
 * @param {Object} options - 追加オプション
 * @param {number} [options.monsterIndex] - 技発動モンスターのインデックス
 * @param {string} [options.skillType] - 技タイプ ('basic' | 'advanced')
 * @param {Object} [options.card] - 対象カード
 * @param {number} [options.slotIndex] - スロットインデックス
 * @param {Object} [options.destroyedCard] - 破壊されたカード
 * @returns {Object} context + getState()
 */
export function createPureContext(initialState, options = {}) {
  let currentState = initialState;

  // 常時効果のアクティブ効果を管理（シミュレーション用）
  let activeEffects = new Map();

  // ========================================
  // ヘルパー関数
  // ========================================

  const getCurrentPlayer = () => currentState.currentPlayer;
  const isP1 = () => currentState.currentPlayer === 1;

  /**
   * プレイヤー状態を更新
   */
  const updatePlayerState = (playerNum, updates) => {
    currentState = updatePlayer(currentState, playerNum, updates);
  };

  /**
   * updater関数を解決
   */
  const resolveUpdater = (updater, currentValue) => {
    return typeof updater === 'function' ? updater(currentValue) : updater;
  };

  // ========================================
  // 基本プロパティ
  // ========================================

  const context = {
    // 現在のプレイヤー
    get currentPlayer() {
      return currentState.currentPlayer;
    },

    // オプションから渡されるプロパティ
    monsterIndex: options.monsterIndex,
    skillType: options.skillType,
    card: options.card,
    slotIndex: options.slotIndex,
    destroyedCard: options.destroyedCard,
    attackerIndex: options.attackerIndex,
    targetIndex: options.targetIndex,
    attacker: options.attacker,
    leavingCard: options.leavingCard,
    destroyedTarget: options.destroyedTarget,
    phaseCard: options.phaseCard,

    // ========================================
    // P1 読み取りプロパティ
    // ========================================

    get p1Life() {
      return currentState.p1.life;
    },
    get p1Field() {
      return currentState.p1.field;
    },
    get p1Hand() {
      return currentState.p1.hand;
    },
    get p1Deck() {
      return currentState.p1.deck;
    },
    get p1Graveyard() {
      return currentState.p1.graveyard;
    },
    get p1ActiveSP() {
      return currentState.p1.activeSP;
    },
    get p1RestedSP() {
      return currentState.p1.restedSP;
    },
    get p1FieldCard() {
      return currentState.p1.fieldCard;
    },
    get p1PhaseCard() {
      return currentState.p1.phaseCard;
    },

    // ========================================
    // P2 読み取りプロパティ
    // ========================================

    get p2Life() {
      return currentState.p2.life;
    },
    get p2Field() {
      return currentState.p2.field;
    },
    get p2Hand() {
      return currentState.p2.hand;
    },
    get p2Deck() {
      return currentState.p2.deck;
    },
    get p2Graveyard() {
      return currentState.p2.graveyard;
    },
    get p2ActiveSP() {
      return currentState.p2.activeSP;
    },
    get p2RestedSP() {
      return currentState.p2.restedSP;
    },
    get p2FieldCard() {
      return currentState.p2.fieldCard;
    },
    get p2PhaseCard() {
      return currentState.p2.phaseCard;
    },

    // ========================================
    // P1 Setter
    // ========================================

    setP1Life: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.life);
      updatePlayerState(1, { life: newValue });
    },

    setP1Field: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.field);
      updatePlayerState(1, { field: newValue });
    },

    setP1Hand: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.hand);
      updatePlayerState(1, { hand: newValue });
    },

    setP1Deck: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.deck);
      updatePlayerState(1, { deck: newValue });
    },

    setP1Graveyard: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.graveyard);
      updatePlayerState(1, { graveyard: newValue });
    },

    setP1ActiveSP: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.activeSP);
      updatePlayerState(1, { activeSP: newValue });
    },

    setP1RestedSP: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.restedSP);
      updatePlayerState(1, { restedSP: newValue });
    },

    setP1FieldCard: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.fieldCard);
      updatePlayerState(1, { fieldCard: newValue });
    },

    setP1PhaseCard: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p1.phaseCard);
      updatePlayerState(1, { phaseCard: newValue });
    },

    // ========================================
    // P2 Setter
    // ========================================

    setP2Life: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.life);
      updatePlayerState(2, { life: newValue });
    },

    setP2Field: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.field);
      updatePlayerState(2, { field: newValue });
    },

    setP2Hand: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.hand);
      updatePlayerState(2, { hand: newValue });
    },

    setP2Deck: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.deck);
      updatePlayerState(2, { deck: newValue });
    },

    setP2Graveyard: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.graveyard);
      updatePlayerState(2, { graveyard: newValue });
    },

    setP2ActiveSP: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.activeSP);
      updatePlayerState(2, { activeSP: newValue });
    },

    setP2RestedSP: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.restedSP);
      updatePlayerState(2, { restedSP: newValue });
    },

    setP2FieldCard: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.fieldCard);
      updatePlayerState(2, { fieldCard: newValue });
    },

    setP2PhaseCard: (updater) => {
      const newValue = resolveUpdater(updater, currentState.p2.phaseCard);
      updatePlayerState(2, { phaseCard: newValue });
    },

    // ========================================
    // ログ
    // ========================================

    addLog: (message, type = 'info') => {
      currentState = addLogPure(currentState, message, type);
    },

    // ========================================
    // UI選択系（自動選択）
    // ========================================

    /**
     * モンスターターゲット選択（自動選択）
     * 最もHPが低いターゲットを優先
     */
    setPendingTargetSelection: (options) => {
      const { validTargets, isOpponent, callback } = options;

      if (!validTargets || validTargets.length === 0) {
        return;
      }

      // ターゲットフィールドを取得
      const targetField = isOpponent
        ? (isP1() ? currentState.p2.field : currentState.p1.field)
        : (isP1() ? currentState.p1.field : currentState.p2.field);

      // 最もHPが低いターゲットを選択
      let bestTarget = validTargets[0];
      let lowestHP = Infinity;

      validTargets.forEach((idx) => {
        const monster = targetField[idx];
        if (monster && monster.currentHp < lowestHP) {
          lowestHP = monster.currentHp;
          bestTarget = idx;
        }
      });

      callback(bestTarget);
    },

    /**
     * デッキからカード選択（自動選択）
     * - selectMode.enabled: true → onSelect(selectedCards) で選択結果を返す
     * - allowReorder: true → onConfirm(cards) でそのまま返す（シミュレーションでは並び替えなし）
     * - callback → callback(bestCard) で最高コストのカードを返す（後方互換）
     */
    setPendingDeckReview: (options) => {
      const { cards, selectMode, allowReorder, onSelect, onConfirm, callback } = options;

      if (!cards || cards.length === 0) {
        // 空の場合
        if (onSelect) {
          onSelect([]);
        } else if (onConfirm) {
          onConfirm([]);
        } else if (callback) {
          callback(null);
        }
        return;
      }

      // 選択モード（selectMode.enabled）
      if (selectMode && selectMode.enabled && onSelect) {
        const count = selectMode.count || 1;
        const filter = selectMode.filter;

        // フィルター条件がある場合は適用
        let targetCards = cards;
        if (filter) {
          targetCards = cards.filter(filter);
        }

        // コストが最も高いカードをcount枚選択
        const sorted = [...targetCards].sort((a, b) => (b.cost || 0) - (a.cost || 0));
        const selected = sorted.slice(0, Math.min(count, sorted.length));

        // 残りのカード
        const selectedIds = new Set(selected.map(c => c.uniqueId || c.id));
        const remaining = cards.filter(c => !selectedIds.has(c.uniqueId || c.id));

        // onSelectコールバック（引数パターンは2種類ある）
        // パターン1: onSelect(selectedCards) - 配列のみ
        // パターン2: onSelect(selectedCard, remainingCards) - カードと残り
        if (count === 1 && selected.length > 0) {
          onSelect(selected[0], remaining);
        } else {
          onSelect(selected, remaining);
        }
        return;
      }

      // 並び替えモード（allowReorder）
      if (allowReorder && onConfirm) {
        // シミュレーションでは並び替えなしでそのまま返す
        onConfirm(cards);
        return;
      }

      // 後方互換: callback
      if (callback) {
        // コストが最も高いカードを選択
        let bestCard = cards[0];
        let highestCost = -1;

        cards.forEach((card) => {
          if (card.cost > highestCost) {
            highestCost = card.cost;
            bestCard = card;
          }
        });

        callback(bestCard);
        return;
      }

      // onSelectのみでselectModeなしの場合も対応
      if (onSelect) {
        const sorted = [...cards].sort((a, b) => (b.cost || 0) - (a.cost || 0));
        onSelect(sorted[0], sorted.slice(1));
      }
    },

    /**
     * 手札選択（自動選択）
     * 最もコストが低いカードを優先（捨てる場合）
     */
    setPendingHandSelection: (options) => {
      const { count = 1, callback, validCards } = options;

      const hand = isP1() ? currentState.p1.hand : currentState.p2.hand;
      const targetCards = validCards || hand;

      if (!targetCards || targetCards.length === 0) {
        callback([]);
        return;
      }

      // コストが低い順にソートしてN枚選択
      const sorted = [...targetCards]
        .map((card, idx) => ({ card, idx }))
        .sort((a, b) => (a.card.cost || 0) - (b.card.cost || 0));

      const selectedIndices = sorted.slice(0, count).map((item) => item.idx);
      callback(selectedIndices);
    },

    /**
     * モンスター対象選択（自動選択）
     */
    setPendingMonsterTarget: (options) => {
      const { validTargets, callback } = options;

      if (!validTargets || validTargets.length === 0) {
        callback(-1);
        return;
      }

      // 最初のターゲットを選択
      callback(validTargets[0]);
    },

    /**
     * 墓地からカード選択（自動選択）
     * コストが最も高いモンスターを優先
     */
    setPendingGraveyardSelection: (options) => {
      const { cards, callback, targetPlayer } = options;

      const graveyard = targetPlayer === 1
        ? currentState.p1.graveyard
        : currentState.p2.graveyard;

      const targetCards = cards || graveyard.filter((c) => c.type === 'monster');

      if (!targetCards || targetCards.length === 0) {
        callback(null);
        return;
      }

      // コストが最も高いモンスターを選択
      let bestCard = targetCards[0];
      let highestCost = -1;

      targetCards.forEach((card) => {
        if (card.cost > highestCost) {
          highestCost = card.cost;
          bestCard = card;
        }
      });

      callback(bestCard);
    },

    // ========================================
    // 特殊プロパティ
    // ========================================

    /**
     * 魔法ブロック（P1）
     */
    setP1MagicBlocked: (value) => {
      updatePlayerState(1, { magicBlocked: value });
    },

    /**
     * 魔法ブロック（P2）
     */
    setP2MagicBlocked: (value) => {
      updatePlayerState(2, { magicBlocked: value });
    },

    /**
     * 墓地ビューア表示（シミュレーションでは無視）
     */
    setShowGraveyardViewer: () => {
      // シミュレーションではUI不要、何もしない
    },

    /**
     * トリガー登録（Pure版へディスパッチ）
     */
    registerCardTriggers: (card, owner, slotIndex = null) => {
      currentState = registerCardTriggersPure(currentState, card, owner, slotIndex);
    },

    /**
     * 常時効果エンジン（簡易実装）
     */
    continuousEffectEngine: {
      register: (card, owner) => {
        if (card && card.uniqueId) {
          activeEffects.set(card.uniqueId, { card, owner });
        }
      },
      unregister: (uniqueId) => {
        activeEffects.delete(uniqueId);
      },
      clear: () => {
        activeEffects.clear();
      },
    },

    // ========================================
    // 状態取得
    // ========================================

    /**
     * 現在のstateを取得
     */
    getState: () => currentState,

    /**
     * アクティブ効果を取得
     */
    getActiveEffects: () => activeEffects,
  };

  return context;
}

// ========================================
// getPlayerContext互換関数
// ========================================

/**
 * getPlayerContext互換のプロパティを取得
 *
 * effectHelpers.jsのgetPlayerContext()と同じ構造を返す。
 * contextAdapter内で使用する場合は、context自体がこれらのプロパティを持つ。
 *
 * @param {Object} context - createPureContextで作成したcontext
 * @returns {Object} getPlayerContext互換オブジェクト
 */
export function getPlayerContextFromAdapter(context) {
  const currentPlayer = context.currentPlayer;
  const isP1 = currentPlayer === 1;

  return {
    // === フィールド ===
    myField: isP1 ? context.p1Field : context.p2Field,
    opponentField: isP1 ? context.p2Field : context.p1Field,
    setMyField: isP1 ? context.setP1Field : context.setP2Field,
    setOpponentField: isP1 ? context.setP2Field : context.setP1Field,

    // === 手札 ===
    myHand: isP1 ? context.p1Hand : context.p2Hand,
    opponentHand: isP1 ? context.p2Hand : context.p1Hand,
    setMyHand: isP1 ? context.setP1Hand : context.setP2Hand,
    setOpponentHand: isP1 ? context.setP2Hand : context.setP1Hand,

    // === デッキ ===
    myDeck: isP1 ? context.p1Deck : context.p2Deck,
    opponentDeck: isP1 ? context.p2Deck : context.p1Deck,
    setMyDeck: isP1 ? context.setP1Deck : context.setP2Deck,
    setOpponentDeck: isP1 ? context.setP2Deck : context.setP1Deck,

    // === 墓地 ===
    myGraveyard: isP1 ? context.p1Graveyard : context.p2Graveyard,
    opponentGraveyard: isP1 ? context.p2Graveyard : context.p1Graveyard,
    setMyGraveyard: isP1 ? context.setP1Graveyard : context.setP2Graveyard,
    setOpponentGraveyard: isP1 ? context.setP2Graveyard : context.setP1Graveyard,

    // === ライフ ===
    myLife: isP1 ? context.p1Life : context.p2Life,
    opponentLife: isP1 ? context.p2Life : context.p1Life,
    setMyLife: isP1 ? context.setP1Life : context.setP2Life,
    setOpponentLife: isP1 ? context.setP2Life : context.setP1Life,

    // === SP（アクティブ） ===
    myActiveSP: isP1 ? context.p1ActiveSP : context.p2ActiveSP,
    opponentActiveSP: isP1 ? context.p2ActiveSP : context.p1ActiveSP,
    setMyActiveSP: isP1 ? context.setP1ActiveSP : context.setP2ActiveSP,
    setOpponentActiveSP: isP1 ? context.setP2ActiveSP : context.setP1ActiveSP,

    // === SP（レスト） ===
    myRestedSP: isP1 ? context.p1RestedSP : context.p2RestedSP,
    opponentRestedSP: isP1 ? context.p2RestedSP : context.p1RestedSP,
    setMyRestedSP: isP1 ? context.setP1RestedSP : context.setP2RestedSP,
    setOpponentRestedSP: isP1 ? context.setP2RestedSP : context.setP1RestedSP,

    // === フィールドカード ===
    myFieldCard: isP1 ? context.p1FieldCard : context.p2FieldCard,
    opponentFieldCard: isP1 ? context.p2FieldCard : context.p1FieldCard,
    setMyFieldCard: isP1 ? context.setP1FieldCard : context.setP2FieldCard,
    setOpponentFieldCard: isP1 ? context.setP2FieldCard : context.setP1FieldCard,

    // === フェイズカード ===
    myPhaseCard: isP1 ? context.p1PhaseCard : context.p2PhaseCard,
    opponentPhaseCard: isP1 ? context.p2PhaseCard : context.p1PhaseCard,
    setMyPhaseCard: isP1 ? context.setP1PhaseCard : context.setP2PhaseCard,
    setOpponentPhaseCard: isP1 ? context.setP2PhaseCard : context.setP1PhaseCard,

    // === ユーティリティ ===
    isP1,
    currentPlayer,
  };
}

export default createPureContext;
