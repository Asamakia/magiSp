/**
 * triggerEnginePure - 純粋関数版トリガーエンジン
 *
 * GameEngine用の状態ベース実装。
 * グローバルレジストリを使わず、state.triggers で管理。
 * React setterを使わず、新しい状態オブジェクトを返す。
 */

import {
  TRIGGER_TYPES,
  ACTIVATION_TYPES,
  TRIGGER_PRIORITIES,
} from '../triggerTypes';
import { getFutureCardTriggers, hasFutureCardTrigger } from '../cardTriggers/futureCards';
import { getFireCardTriggers, hasFireCardTrigger } from '../cardTriggers/fireCards';
import { getWaterCardTriggers, hasWaterCardTrigger } from '../cardTriggers/waterCards';
import { getLightCardTriggers, hasLightCardTrigger } from '../cardTriggers/lightCards';
import { getDarkCardTriggers, hasDarkCardTrigger } from '../cardTriggers/darkCards';
import { getPrimitiveCardTriggers, hasPrimitiveCardTrigger } from '../cardTriggers/primitiveCards';
import { getNeutralCardTriggers, hasNeutralCardTrigger } from '../cardTriggers/neutralCards';
import { addLog, getPlayer, getOpponentNumber } from './GameState';

// ========================================
// トリガー解析
// ========================================

/**
 * カードの効果テキストからトリガーを解析
 * @param {Object} card - カードオブジェクト
 * @returns {Array} トリガー定義の配列
 */
export function parseCardTriggers(card) {
  const triggers = [];

  if (!card || !card.effect) {
    return triggers;
  }

  // カード固有のトリガー実装をチェック（属性ごと）
  const attributeChecks = [
    { has: hasFutureCardTrigger, get: getFutureCardTriggers },
    { has: hasFireCardTrigger, get: getFireCardTriggers },
    { has: hasWaterCardTrigger, get: getWaterCardTriggers },
    { has: hasLightCardTrigger, get: getLightCardTriggers },
    { has: hasDarkCardTrigger, get: getDarkCardTriggers },
    { has: hasPrimitiveCardTrigger, get: getPrimitiveCardTriggers },
    { has: hasNeutralCardTrigger, get: getNeutralCardTriggers },
  ];

  for (const check of attributeChecks) {
    if (card.id && check.has(card.id)) {
      const cardSpecificTriggers = check.get(card.id);
      if (cardSpecificTriggers) {
        return cardSpecificTriggers;
      }
    }
  }

  // カード固有の実装がない場合、汎用パターンマッチング
  const effectText = card.effect;

  // 【召喚時】パターン
  if (effectText.includes('【召喚時】') || effectText.includes('【このカードの召喚時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時効果',
      effect: null, // 汎用パターンでは効果未定義
    });
  }

  // 【破壊時】【自壊時】パターン
  if (effectText.includes('【破壊時】') || effectText.includes('【自壊時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時効果',
      effect: null,
    });
  }

  // 【自分エンドフェイズ時】パターン
  if (effectText.includes('【自分エンドフェイズ時】') || effectText.includes('【エンドフェイズ時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時効果',
      effect: null,
    });
  }

  return triggers;
}

// ========================================
// トリガー登録・解除（純粋関数版）
// ========================================

/**
 * カードのトリガーを解析して登録
 * @param {Object} state - GameState
 * @param {Object} card - カードオブジェクト
 * @param {number} owner - オーナープレイヤー (1 or 2)
 * @param {number|null} slotIndex - フィールドスロット
 * @returns {Object} 新しいGameState
 */
export function registerCardTriggersPure(state, card, owner, slotIndex = null) {
  if (!card || !card.uniqueId) {
    return state;
  }

  const triggers = parseCardTriggers(card);

  if (triggers.length === 0) {
    return state;
  }

  let newTriggers = { ...state.triggers };

  triggers.forEach((trigger) => {
    const triggerType = trigger.type;

    // トリガータイプの配列を取得または作成
    const typeArray = newTriggers[triggerType] ? [...newTriggers[triggerType]] : [];

    // 重複チェック
    const existingIndex = typeArray.findIndex((t) => t.cardId === card.uniqueId);

    const triggerEntry = {
      cardId: card.uniqueId,
      cardName: card.name,
      triggerType,
      owner,
      slotIndex,
      priority: trigger.priority || TRIGGER_PRIORITIES.NORMAL,
      activationType: trigger.activationType || ACTIVATION_TYPES.AUTOMATIC,
      condition: trigger.condition,
      effect: trigger.effect,
      description: trigger.description,
      usedThisTurn: false,
    };

    if (existingIndex !== -1) {
      typeArray[existingIndex] = triggerEntry;
    } else {
      typeArray.push(triggerEntry);
    }

    newTriggers[triggerType] = typeArray;
  });

  return {
    ...state,
    triggers: newTriggers,
  };
}

/**
 * カードのトリガーをすべて解除
 * @param {Object} state - GameState
 * @param {string} cardId - カードの一意なID
 * @returns {Object} 新しいGameState
 */
export function unregisterCardTriggersPure(state, cardId) {
  const newTriggers = {};

  Object.keys(state.triggers).forEach((triggerType) => {
    const filtered = state.triggers[triggerType].filter((t) => t.cardId !== cardId);
    if (filtered.length > 0) {
      newTriggers[triggerType] = filtered;
    }
  });

  return {
    ...state,
    triggers: newTriggers,
  };
}

/**
 * すべてのトリガーをクリア
 * @param {Object} state - GameState
 * @returns {Object} 新しいGameState
 */
export function clearAllTriggersPure(state) {
  return {
    ...state,
    triggers: {},
  };
}

// ========================================
// トリガー発火（純粋関数版）
// ========================================

/**
 * 特定のトリガータイプを発火（自動発動のみ）
 * @param {Object} state - GameState
 * @param {string} triggerType - トリガータイプ
 * @param {Object} context - 追加コンテキスト（card, destroyedCardなど）
 * @returns {Object} 新しいGameState
 */
export function fireTriggerPure(state, triggerType, context = {}) {
  const triggers = state.triggers[triggerType];

  if (!triggers || triggers.length === 0) {
    return state;
  }

  // 自動発動のみをフィルター
  let automaticTriggers = triggers.filter((trigger) => {
    return trigger.activationType === ACTIVATION_TYPES.AUTOMATIC;
  });

  // ON_SUMMONトリガーは召喚されたカード自身のトリガーのみ発火
  if (triggerType === TRIGGER_TYPES.ON_SUMMON && context.card) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.cardId === context.card.uniqueId;
    });
  }

  // ON_DESTROY_SELFトリガーは破壊されたカード自身のトリガーのみ発火
  if (triggerType === TRIGGER_TYPES.ON_DESTROY_SELF && context.destroyedCard) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.cardId === context.destroyedCard.uniqueId;
    });
  }

  // フェイズ関連の「_SELF」トリガーはオーナーがターンプレイヤーの場合のみ発動
  const phaseSelfTriggers = [
    TRIGGER_TYPES.ON_TURN_START_SELF,
    TRIGGER_TYPES.ON_DRAW_PHASE_SELF,
    TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
    TRIGGER_TYPES.ON_END_PHASE_SELF,
  ];

  if (phaseSelfTriggers.includes(triggerType)) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.owner === state.currentPlayer;
    });
  }

  // フェイズ関連の「_OPPONENT」トリガー
  if (triggerType === TRIGGER_TYPES.ON_OPPONENT_END_PHASE) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.owner !== state.currentPlayer;
    });
  }

  if (automaticTriggers.length === 0) {
    return state;
  }

  // 優先度順にソート
  const sortedTriggers = sortTriggersByPriority(automaticTriggers, state.currentPlayer);

  // 各トリガーを実行
  let newState = state;

  sortedTriggers.forEach((trigger) => {
    try {
      // トリガーを所有するカードをフィールドから検索
      const ownerField = trigger.owner === 1 ? newState.p1.field : newState.p2.field;
      const triggerCard = ownerField
        ? ownerField.find((m) => m && m.uniqueId === trigger.cardId)
        : null;

      // トリガー実行用のコンテキスト
      const triggerContext = {
        ...context,
        card: triggerCard || context.card || context.destroyedCard,
        slotIndex: trigger.slotIndex ?? context.slotIndex,
        currentPlayer: newState.currentPlayer,
      };

      // 条件チェック
      if (trigger.condition && !trigger.condition(triggerContext)) {
        return;
      }

      // 効果実行（純粋関数版）
      // effectが関数として定義されている場合は実行
      // 汎用パターンでeffect: nullの場合もログは出力
      newState = executeTriggerEffectPure(newState, trigger, triggerContext);
    } catch (error) {
      console.error(`トリガー実行エラー: ${trigger.cardName}`, error);
      newState = addLog(newState, `${trigger.cardName}の効果実行中にエラーが発生しました`, 'damage');
    }
  });

  return newState;
}

/**
 * トリガー効果を純粋関数として実行
 * contextアダプターを使用してtrigger.effectを実行
 * @param {Object} state - GameState
 * @param {Object} trigger - トリガーオブジェクト
 * @param {Object} triggerContext - トリガーコンテキスト
 * @returns {Object} 新しいGameState
 */
function executeTriggerEffectPure(state, trigger, triggerContext) {
  let newState = addLog(state, `${trigger.cardName || 'カード'}の${trigger.description || '効果'}を発動！`, 'info');

  // trigger.effectが関数として定義されている場合
  if (typeof trigger.effect === 'function') {
    try {
      const { createPureContext } = require('./contextAdapter');

      // contextアダプターを作成
      const context = createPureContext(newState, {
        card: triggerContext.card,
        slotIndex: triggerContext.slotIndex,
        destroyedCard: triggerContext.destroyedCard,
        monsterIndex: triggerContext.slotIndex,
      });

      // トリガー効果を実行
      trigger.effect(context);

      // 更新されたstateを取得
      newState = context.getState();
    } catch (error) {
      console.warn('Trigger effect execution error:', error);
      newState = addLog(newState, '(トリガー効果実行エラー)', 'info');
    }
  }

  return newState;
}

/**
 * トリガーを優先度順にソート
 * @param {Array} triggers - トリガー配列
 * @param {number} currentPlayer - 現在のプレイヤー
 * @returns {Array} ソート済み配列
 */
function sortTriggersByPriority(triggers, currentPlayer) {
  return [...triggers].sort((a, b) => {
    // 優先度が高い順
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    // オーナーがターンプレイヤーを先に
    if (a.owner === currentPlayer && b.owner !== currentPlayer) {
      return -1;
    }
    if (b.owner === currentPlayer && a.owner !== currentPlayer) {
      return 1;
    }

    return 0;
  });
}

// ========================================
// ターン管理（純粋関数版）
// ========================================

/**
 * ターン終了時に使用済みフラグをリセット
 * @param {Object} state - GameState
 * @returns {Object} 新しいGameState
 */
export function resetTurnFlagsPure(state) {
  const newTriggers = {};

  Object.keys(state.triggers).forEach((triggerType) => {
    newTriggers[triggerType] = state.triggers[triggerType].map((trigger) => ({
      ...trigger,
      usedThisTurn: false,
    }));
  });

  return {
    ...state,
    triggers: newTriggers,
  };
}

// ========================================
// ユーティリティ
// ========================================

/**
 * カードの登録済みトリガーを取得
 * @param {Object} state - GameState
 * @param {string} cardId - カードID
 * @returns {Array} トリガーエントリーの配列
 */
export function getCardTriggersPure(state, cardId) {
  const result = [];

  Object.keys(state.triggers).forEach((triggerType) => {
    state.triggers[triggerType].forEach((trigger) => {
      if (trigger.cardId === cardId) {
        result.push(trigger);
      }
    });
  });

  return result;
}

/**
 * トリガー統計を取得
 * @param {Object} state - GameState
 * @returns {Object} トリガータイプごとの登録数
 */
export function getTriggerStatsPure(state) {
  const stats = {};

  Object.keys(state.triggers).forEach((triggerType) => {
    if (state.triggers[triggerType].length > 0) {
      stats[triggerType] = state.triggers[triggerType].length;
    }
  });

  return stats;
}
