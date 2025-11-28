/**
 * トリガーシステム: トリガーエンジン
 *
 * トリガーの登録、管理、発火を担当する中核システム
 *
 * 主要機能:
 * 1. グローバルトリガーレジストリの管理
 * 2. カードのトリガー登録・解除
 * 3. 自動発動トリガーの発火
 * 4. 任意発動トリガーの取得とUI表示サポート
 * 5. トリガー条件のチェックと優先度制御
 *
 * @see src/ルール/trigger-revision-plan.md - 設計詳細
 * @see src/engine/triggerTypes.js - トリガータイプ定義
 */

import {
  TRIGGER_TYPES,
  ACTIVATION_TYPES,
  TRIGGER_PRIORITIES,
  isOptionalTrigger,
} from './triggerTypes';
import { getFutureCardTriggers, hasFutureCardTrigger } from './cardTriggers/futureCards';
import { getFireCardTriggers, hasFireCardTrigger } from './cardTriggers/fireCards';
import { getWaterCardTriggers, hasWaterCardTrigger } from './cardTriggers/waterCards';
import { getLightCardTriggers, hasLightCardTrigger } from './cardTriggers/lightCards';
import { getDarkCardTriggers, hasDarkCardTrigger } from './cardTriggers/darkCards';
import { getPrimitiveCardTriggers, hasPrimitiveCardTrigger } from './cardTriggers/primitiveCards';
import { getNeutralCardTriggers, hasNeutralCardTrigger } from './cardTriggers/neutralCards';

/**
 * グローバルトリガーレジストリ
 * トリガータイプごとにトリガーエントリーを管理
 */
class TriggerRegistry {
  constructor() {
    // Map<triggerType, Array<TriggerEntry>>
    this.triggers = new Map();

    // 全トリガータイプを初期化
    Object.values(TRIGGER_TYPES).forEach((type) => {
      this.triggers.set(type, []);
    });
  }

  /**
   * トリガーを登録
   * @param {string} cardId - カードの一意なID
   * @param {string} triggerType - トリガータイプ
   * @param {object} triggerData - トリガーデータ
   */
  register(cardId, triggerType, triggerData) {
    if (!this.triggers.has(triggerType)) {
      console.warn(`Unknown trigger type: ${triggerType}`);
      return;
    }

    const triggerArray = this.triggers.get(triggerType);

    // 重複チェック（同じカードの同じトリガータイプは1つのみ）
    const existingIndex = triggerArray.findIndex((t) => t.cardId === cardId);
    if (existingIndex !== -1) {
      // 既存のトリガーを上書き
      triggerArray[existingIndex] = {
        cardId,
        triggerType,
        ...triggerData,
        usedThisTurn: false,
      };
    } else {
      // 新規登録
      triggerArray.push({
        cardId,
        triggerType,
        ...triggerData,
        usedThisTurn: false,
      });
    }
  }

  /**
   * 特定のカードのトリガーをすべて解除
   * @param {string} cardId - カードの一意なID
   */
  unregister(cardId) {
    this.triggers.forEach((triggerArray, triggerType) => {
      const filtered = triggerArray.filter((t) => t.cardId !== cardId);
      this.triggers.set(triggerType, filtered);
    });
  }

  /**
   * 特定のトリガータイプのトリガーをすべて取得
   * @param {string} triggerType - トリガータイプ
   * @returns {Array} トリガーエントリーの配列
   */
  get(triggerType) {
    return this.triggers.get(triggerType) || [];
  }

  /**
   * 特定のカードのトリガーを取得
   * @param {string} cardId - カードの一意なID
   * @returns {Array} トリガーエントリーの配列
   */
  getByCardId(cardId) {
    const result = [];
    this.triggers.forEach((triggerArray) => {
      triggerArray.forEach((trigger) => {
        if (trigger.cardId === cardId) {
          result.push(trigger);
        }
      });
    });
    return result;
  }

  /**
   * すべてのトリガーをクリア（ゲームリセット用）
   */
  clear() {
    this.triggers.forEach((_, triggerType) => {
      this.triggers.set(triggerType, []);
    });
  }

  /**
   * デバッグ用: 登録されているトリガーの統計
   */
  getStats() {
    const stats = {};
    this.triggers.forEach((triggerArray, triggerType) => {
      if (triggerArray.length > 0) {
        stats[triggerType] = triggerArray.length;
      }
    });
    return stats;
  }
}

// グローバルレジストリのインスタンス
export const globalRegistry = new TriggerRegistry();

// ========================================
// トリガー登録・解除
// ========================================

/**
 * カードのトリガーを解析して登録
 * @param {object} card - カードオブジェクト
 * @param {number} owner - オーナープレイヤー (1 or 2)
 * @param {number|null} slotIndex - フィールドスロット (null = 墓地)
 * @returns {number} 登録されたトリガーの数
 */
export const registerCardTriggers = (card, owner, slotIndex = null) => {
  if (!card || !card.uniqueId) {
    console.warn('Invalid card for trigger registration:', card);
    return 0;
  }

  // カード固有のトリガーを解析
  const triggers = parseCardTriggers(card);

  let registeredCount = 0;

  triggers.forEach((trigger) => {
    globalRegistry.register(card.uniqueId, trigger.type, {
      cardName: card.name,
      owner,
      slotIndex,
      priority: trigger.priority || TRIGGER_PRIORITIES.NORMAL,
      activationType: trigger.activationType || ACTIVATION_TYPES.AUTOMATIC,
      condition: trigger.condition,
      effect: trigger.effect,
      description: trigger.description,
      costCheck: trigger.costCheck,
    });

    registeredCount++;
  });

  return registeredCount;
};

/**
 * カードの効果テキストからトリガーを解析
 * @param {object} card - カードオブジェクト
 * @returns {Array} トリガー定義の配列
 */
export const parseCardTriggers = (card) => {
  const triggers = [];

  if (!card || !card.effect) {
    return triggers;
  }

  // カード固有のトリガー実装をチェック
  // 未来属性
  if (card.id && hasFutureCardTrigger(card.id)) {
    const cardSpecificTriggers = getFutureCardTriggers(card.id);
    if (cardSpecificTriggers) {
      return cardSpecificTriggers;
    }
  }

  // 炎属性
  if (card.id && hasFireCardTrigger(card.id)) {
    const cardSpecificTriggers = getFireCardTriggers(card.id);
    if (cardSpecificTriggers) {
      return cardSpecificTriggers;
    }
  }

  // 水属性
  if (card.id && hasWaterCardTrigger(card.id)) {
    const cardSpecificTriggers = getWaterCardTriggers(card.id);
    if (cardSpecificTriggers) {
      return cardSpecificTriggers;
    }
  }

  // 光属性
  if (card.id && hasLightCardTrigger(card.id)) {
    const cardSpecificTriggers = getLightCardTriggers(card.id);
    if (cardSpecificTriggers) {
      return cardSpecificTriggers;
    }
  }

  // 闇属性
  if (card.id && hasDarkCardTrigger(card.id)) {
    const cardSpecificTriggers = getDarkCardTriggers(card.id);
    if (cardSpecificTriggers) {
      return cardSpecificTriggers;
    }
  }

  // 原始属性
  if (card.id && hasPrimitiveCardTrigger(card.id)) {
    const cardSpecificTriggers = getPrimitiveCardTriggers(card.id);
    if (cardSpecificTriggers) {
      return cardSpecificTriggers;
    }
  }

  // 属性なし
  if (card.id && hasNeutralCardTrigger(card.id)) {
    const cardSpecificTriggers = getNeutralCardTriggers(card.id);
    if (cardSpecificTriggers) {
      return cardSpecificTriggers;
    }
  }

  // カード固有の実装がない場合、汎用パターンマッチングにフォールバック
  const effectText = card.effect;

  // 【召喚時】パターン
  if (effectText.includes('【召喚時】') || effectText.includes('【このカードの召喚時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時効果',
      effect: (context) => {
        context.addLog(`${card.name}の召喚時効果を発動！`, 'info');
      },
    });
  }

  // 【破壊時】【自壊時】パターン
  if (effectText.includes('【破壊時】') || effectText.includes('【自壊時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時効果',
      effect: (context) => {
        context.addLog(`${card.name}の破壊時効果を発動！`, 'info');
      },
    });
  }

  // 【場を離れる時】パターン
  if (effectText.includes('【場を離れる時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_LEAVE_FIELD,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '場を離れる時効果',
      effect: (context) => {
        context.addLog(`${card.name}の場を離れる時効果を発動！`, 'info');
      },
    });
  }

  // 【自分メインフェイズ時】パターン
  if (effectText.includes('【自分メインフェイズ時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
      activationType: ACTIVATION_TYPES.OPTIONAL, // 任意発動
      description: 'メインフェイズ時効果',
      effect: (context) => {
        context.addLog(`${card.name}のメインフェイズ効果を発動！`, 'info');
      },
    });
  }

  // 【自分エンドフェイズ時】パターン
  if (effectText.includes('【自分エンドフェイズ時】') || effectText.includes('【エンドフェイズ時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時効果',
      effect: (context) => {
        context.addLog(`${card.name}のエンドフェイズ効果を発動！`, 'info');
      },
    });
  }

  // 【常時】パターン
  if (effectText.includes('【常時】')) {
    triggers.push({
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時効果',
      effect: (context) => {
        // 常時効果は別の仕組みで処理する予定
        // context.addLog(`${card.name}の常時効果が有効！`, 'info');
      },
    });
  }

  // 【墓地発動】パターン - メインフェイズ時
  // 「墓地にある」「墓地で発動」などのパターンで、SPコストを払う場合はメインフェイズ
  if (effectText.includes('墓地にある') && effectText.includes('SP')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '墓地発動効果（メインフェイズ）',
      effect: (context) => {
        context.addLog(`${card.name}の墓地効果を発動！`, 'info');
      },
    });
  }

  // 【墓地発動】パターン - エンドフェイズ時
  // 「墓地にある」「ターン終了時」などのパターン
  if (effectText.includes('墓地にある') && effectText.includes('ターン終了時')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_END_PHASE_FROM_GRAVEYARD,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '墓地発動効果（エンドフェイズ）',
      effect: (context) => {
        context.addLog(`${card.name}の墓地効果を発動！`, 'info');
      },
    });
  }

  return triggers;
};

/**
 * カードのトリガーをすべて解除
 * @param {string} cardId - カードの一意なID
 */
export const unregisterCardTriggers = (cardId) => {
  globalRegistry.unregister(cardId);
};

/**
 * すべてのトリガーをクリア（ゲームリセット用）
 */
export const clearAllTriggers = () => {
  globalRegistry.clear();
};

// ========================================
// 自動発動トリガーの発火
// ========================================

/**
 * 「場を離れる時」トリガーを発火
 * 破壊、手札戻し、デッキ戻し、除外など全てで発動
 * @param {object} card - 場を離れるカード
 * @param {object} context - ゲームコンテキスト
 * @param {string} reason - 離れる理由 ('destroy', 'return_to_hand', 'return_to_deck', 'exile')
 */
export const fireLeaveFieldTrigger = (card, context, reason = 'destroy') => {
  if (!card || !card.uniqueId) {
    return;
  }

  const triggers = globalRegistry.get(TRIGGER_TYPES.ON_LEAVE_FIELD);

  if (!triggers || triggers.length === 0) {
    return;
  }

  // このカードのトリガーのみをフィルター
  const cardTriggers = triggers.filter((trigger) => {
    return trigger.cardId === card.uniqueId && trigger.activationType === ACTIVATION_TYPES.AUTOMATIC;
  });

  if (cardTriggers.length === 0) {
    return;
  }

  // コンテキストに離れる理由を追加
  const leaveContext = {
    ...context,
    leavingCard: card,
    leaveReason: reason,
  };

  // 各トリガーを実行
  cardTriggers.forEach((trigger) => {
    try {
      // 条件チェック
      if (trigger.condition && !trigger.condition(leaveContext)) {
        return;
      }

      // 効果実行
      if (typeof trigger.effect === 'function') {
        trigger.effect(leaveContext);
      }
    } catch (error) {
      console.error(`場を離れるトリガー実行エラー: ${trigger.cardName}`, error);
      context.addLog(`${trigger.cardName}の効果実行中にエラーが発生しました`, 'damage');
    }
  });
};

/**
 * 特定のトリガータイプを発火（自動発動のみ）
 * @param {string} triggerType - トリガータイプ
 * @param {object} context - ゲームコンテキスト
 */
export const fireTrigger = (triggerType, context) => {
  const triggers = globalRegistry.get(triggerType);

  if (!triggers || triggers.length === 0) {
    return;
  }

  // 自動発動のみをフィルター
  let automaticTriggers = triggers.filter((trigger) => {
    return trigger.activationType === ACTIVATION_TYPES.AUTOMATIC;
  });

  // ON_SUMMONトリガーは召喚されたカード自身のトリガーのみ発火
  // （「このカードが召喚された時」という意味のため）
  if (triggerType === TRIGGER_TYPES.ON_SUMMON && context.card) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.cardId === context.card.uniqueId;
    });
  }

  // ON_DESTROY_SELFトリガーは破壊されたカード自身のトリガーのみ発火
  // （「このカードが破壊された時」という意味のため）
  if (triggerType === TRIGGER_TYPES.ON_DESTROY_SELF && context.destroyedCard) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.cardId === context.destroyedCard.uniqueId;
    });
  }

  // ON_PHASE_CARD_ACTIVATEトリガーは設置されたカード自身のトリガーのみ発火
  // （「このフェイズカードの発動時」という意味のため）
  if (triggerType === TRIGGER_TYPES.ON_PHASE_CARD_ACTIVATE && context.card) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.cardId === context.card.uniqueId;
    });
  }

  // フェイズ関連の「_SELF」トリガーはオーナーがターンプレイヤーの場合のみ発動
  // （「自分のエンドフェイズ時」= カードオーナーのターンのエンドフェイズ時）
  const phaseSelfTriggers = [
    TRIGGER_TYPES.ON_TURN_START_SELF,
    TRIGGER_TYPES.ON_DRAW_PHASE_SELF,
    TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
    TRIGGER_TYPES.ON_END_PHASE_SELF,
  ];

  if (phaseSelfTriggers.includes(triggerType)) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.owner === context.currentPlayer;
    });
  }

  // フェイズ関連の「_OPPONENT」トリガーはオーナーがターンプレイヤーと異なる場合のみ発動
  // （「相手のエンドフェイズ時」= 相手ターンのエンドフェイズ時）
  const phaseOpponentTriggers = [
    TRIGGER_TYPES.ON_OPPONENT_END_PHASE,
  ];

  if (phaseOpponentTriggers.includes(triggerType)) {
    automaticTriggers = automaticTriggers.filter((trigger) => {
      return trigger.owner !== context.currentPlayer;
    });
  }

  if (automaticTriggers.length === 0) {
    return;
  }

  // 優先度順にソート
  const sortedTriggers = sortTriggersByPriority(automaticTriggers, context);

  // 各トリガーを実行
  sortedTriggers.forEach((trigger) => {
    try {
      // トリガーを所有するカードをフィールドから検索してコンテキストに追加
      const ownerField = trigger.owner === 1 ? context.p1Field : context.p2Field;
      const triggerCard = ownerField
        ? ownerField.find((m) => m && m.uniqueId === trigger.cardId)
        : null;

      // トリガー実行用のコンテキストを作成（カード情報を追加）
      // フィールドにカードが見つかった場合のみ上書き、見つからない場合は元のcontext.cardを維持
      // （ON_DESTROY_SELFなど、カードがすでにフィールドにない場合に対応）
      const triggerContext = {
        ...context,
        card: triggerCard || context.card || context.destroyedCard,
        slotIndex: trigger.slotIndex ?? context.slotIndex,
      };

      // 条件チェック
      if (trigger.condition && !trigger.condition(triggerContext)) {
        return; // 条件を満たさない
      }

      // 効果実行
      if (typeof trigger.effect === 'function') {
        trigger.effect(triggerContext);
      }

      // ログ出力（effectから出力されていない場合）
      // context.addLog(`${trigger.cardName}の効果を発動！`, 'info');
    } catch (error) {
      console.error(`トリガー実行エラー: ${trigger.cardName}`, error);
      context.addLog(`${trigger.cardName}の効果実行中にエラーが発生しました`, 'damage');
    }
  });
};

/**
 * トリガーを優先度順にソート
 * @param {Array} triggers - トリガーエントリーの配列
 * @param {object} context - ゲームコンテキスト
 * @returns {Array} ソート済みのトリガー配列
 */
const sortTriggersByPriority = (triggers, context) => {
  return [...triggers].sort((a, b) => {
    // 優先度が高い順（降順）
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    // 優先度が同じ場合、オーナーがターンプレイヤーのトリガーを先に
    const currentPlayer = context.currentPlayer;
    if (a.owner === currentPlayer && b.owner !== currentPlayer) {
      return -1;
    }
    if (b.owner === currentPlayer && a.owner !== currentPlayer) {
      return 1;
    }

    // それ以外は登録順
    return 0;
  });
};

// ========================================
// 任意発動トリガーの取得（UI表示用）
// ========================================

/**
 * フィールドカードのメインフェイズトリガーを取得
 * @param {object} card - フィールドのカードオブジェクト
 * @param {number} currentPlayer - 現在のプレイヤー
 * @returns {Array} 発動可能なトリガーの配列
 */
export const getCardMainPhaseTriggers = (card, currentPlayer) => {
  if (!card || !card.uniqueId) {
    return [];
  }

  const triggers = globalRegistry.get(TRIGGER_TYPES.ON_MAIN_PHASE_SELF);

  return triggers
    .filter((trigger) => {
      // このカードのトリガーかつ、オーナーがターンプレイヤー
      return trigger.cardId === card.uniqueId && trigger.owner === currentPlayer;
    })
    .map((trigger) => ({
      ...trigger,
      canActivate: !trigger.usedThisTurn,
    }));
};

/**
 * 墓地カードのトリガーを取得
 * @param {object} card - 墓地のカードオブジェクト
 * @param {object} context - ゲームコンテキスト
 * @returns {Array} 発動可能なトリガーの配列
 */
export const getCardGraveyardTriggers = (card, context) => {
  if (!card || !card.effect) {
    return [];
  }

  // 墓地のカードはレジストリに登録されていないので、効果テキストを直接パース
  const triggers = parseCardTriggers(card);

  return triggers
    .filter((trigger) => {
      // 墓地発動トリガーのみ
      return (
        trigger.type === TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD ||
        trigger.type === TRIGGER_TYPES.ON_END_PHASE_FROM_GRAVEYARD
      );
    })
    .map((trigger) => ({
      ...trigger,
      cardId: card.uniqueId,
      cardName: card.name,
      canActivate: checkGraveyardTriggerActivatable(card, trigger, context),
    }));
};

/**
 * 墓地トリガーが発動可能かチェック
 * @param {object} card - 墓地のカードオブジェクト
 * @param {object} trigger - トリガーオブジェクト
 * @param {object} context - ゲームコンテキスト
 * @returns {boolean} 発動可能な場合true
 */
const checkGraveyardTriggerActivatable = (card, trigger, context) => {
  // 1ターンに1度制限のチェック
  if (trigger.usedThisTurn) {
    return false;
  }

  // コストチェック
  if (trigger.costCheck && !trigger.costCheck(context)) {
    return false;
  }

  // 条件チェック
  if (trigger.condition && !trigger.condition(context)) {
    return false;
  }

  return true;
};

// ========================================
// トリガーの手動発動
// ========================================

/**
 * トリガーを手動で発動（任意発動用）
 * @param {object} trigger - トリガーオブジェクト
 * @param {object} context - ゲームコンテキスト
 * @returns {boolean} 発動成功の場合true
 */
export const activateTrigger = (trigger, context) => {
  try {
    // トリガーを所有するカードをフィールドから検索してコンテキストに追加
    const ownerField = trigger.owner === 1 ? context.p1Field : context.p2Field;
    const triggerCard = ownerField
      ? ownerField.find((m) => m && m.uniqueId === trigger.cardId)
      : null;

    // トリガー実行用のコンテキストを作成（カード情報を追加）
    // フィールドにカードが見つかった場合のみ上書き、見つからない場合は元のcontext.cardを維持
    const triggerContext = {
      ...context,
      card: triggerCard || context.card || context.destroyedCard,
      slotIndex: trigger.slotIndex ?? context.slotIndex,
    };

    // 発動可能かチェック
    if (trigger.usedThisTurn) {
      context.addLog(`${trigger.cardName}は既に使用済みです`, 'info');
      return false;
    }

    // コストチェック
    if (trigger.costCheck && !trigger.costCheck(triggerContext)) {
      context.addLog(`${trigger.cardName}を発動できません（コスト不足）`, 'info');
      return false;
    }

    // 条件チェック
    if (trigger.condition && !trigger.condition(triggerContext)) {
      context.addLog(`${trigger.cardName}を発動できません（条件不足）`, 'info');
      return false;
    }

    // 使用済みフラグを設定
    trigger.usedThisTurn = true;

    // 効果実行
    if (typeof trigger.effect === 'function') {
      trigger.effect(triggerContext);
    }

    // ログ出力
    context.addLog(`${trigger.cardName}の効果を発動！`, 'info');

    return true;
  } catch (error) {
    console.error(`トリガー発動エラー: ${trigger.cardName}`, error);
    context.addLog(`${trigger.cardName}の効果実行中にエラーが発生しました`, 'damage');
    return false;
  }
};

/**
 * トリガー条件をチェック
 * @param {object} trigger - トリガーオブジェクト
 * @param {object} context - ゲームコンテキスト（オプション）
 * @returns {boolean} 条件を満たす場合true
 */
export const checkTriggerCondition = (trigger, context = null) => {
  if (!trigger.condition) {
    return true; // 条件なしは常にtrue
  }

  if (context && typeof trigger.condition === 'function') {
    try {
      return trigger.condition(context);
    } catch (error) {
      console.error('トリガー条件チェックエラー:', error);
      return false;
    }
  }

  return true;
};

// ========================================
// ターン管理
// ========================================

/**
 * ターン終了時に使用済みフラグをリセット
 */
export const resetTurnFlags = () => {
  globalRegistry.triggers.forEach((triggerArray) => {
    triggerArray.forEach((trigger) => {
      trigger.usedThisTurn = false;
    });
  });
};

// ========================================
// デバッグ・ユーティリティ
// ========================================

/**
 * 登録されているトリガーの統計を取得
 * @returns {object} トリガータイプごとの登録数
 */
export const getTriggerStats = () => {
  return globalRegistry.getStats();
};

/**
 * 特定のカードの登録トリガーを取得
 * @param {string} cardId - カードの一意なID
 * @returns {Array} トリガーエントリーの配列
 */
export const getCardTriggers = (cardId) => {
  return globalRegistry.getByCardId(cardId);
};

/**
 * カードがトリガー実装を持っているかチェック
 * @param {string} cardId - カードID (例: 'C0000085')
 * @param {string} triggerType - トリガータイプ (省略時は召喚時をチェック)
 * @returns {boolean} トリガー実装を持っている場合true
 */
export const hasCardTrigger = (cardId, triggerType = TRIGGER_TYPES.ON_SUMMON) => {
  if (!cardId) return false;

  // 未来属性カードのトリガーをチェック
  if (hasFutureCardTrigger(cardId)) {
    const triggers = getFutureCardTriggers(cardId);
    if (triggers && Array.isArray(triggers)) {
      // 指定されたトリガータイプが含まれているかチェック
      return triggers.some(trigger => trigger.type === triggerType);
    }
  }

  // 炎属性カードのトリガーをチェック
  if (hasFireCardTrigger(cardId)) {
    const triggers = getFireCardTriggers(cardId);
    if (triggers && Array.isArray(triggers)) {
      return triggers.some(trigger => trigger.type === triggerType);
    }
  }

  // 水属性カードのトリガーをチェック
  if (hasWaterCardTrigger(cardId)) {
    const triggers = getWaterCardTriggers(cardId);
    if (triggers && Array.isArray(triggers)) {
      return triggers.some(trigger => trigger.type === triggerType);
    }
  }

  // 光属性カードのトリガーをチェック
  if (hasLightCardTrigger(cardId)) {
    const triggers = getLightCardTriggers(cardId);
    if (triggers && Array.isArray(triggers)) {
      return triggers.some(trigger => trigger.type === triggerType);
    }
  }

  // 闇属性カードのトリガーをチェック
  if (hasDarkCardTrigger(cardId)) {
    const triggers = getDarkCardTriggers(cardId);
    if (triggers && Array.isArray(triggers)) {
      return triggers.some(trigger => trigger.type === triggerType);
    }
  }

  // 原始属性カードのトリガーをチェック
  if (hasPrimitiveCardTrigger(cardId)) {
    const triggers = getPrimitiveCardTriggers(cardId);
    if (triggers && Array.isArray(triggers)) {
      return triggers.some(trigger => trigger.type === triggerType);
    }
  }

  // 属性なしカードのトリガーをチェック
  if (hasNeutralCardTrigger(cardId)) {
    const triggers = getNeutralCardTriggers(cardId);
    if (triggers && Array.isArray(triggers)) {
      return triggers.some(trigger => trigger.type === triggerType);
    }
  }

  return false;
};

/**
 * トリガーシステムの状態をログ出力
 */
export const debugTriggerSystem = () => {
  console.log('=== Trigger System Debug ===');
  console.log('Registered Triggers:', getTriggerStats());
  console.log('Total Triggers:', globalRegistry.triggers.size);

  globalRegistry.triggers.forEach((triggerArray, triggerType) => {
    if (triggerArray.length > 0) {
      console.log(`\n${triggerType} (${triggerArray.length}):`);
      triggerArray.forEach((trigger) => {
        console.log(`  - ${trigger.cardName} (Owner: P${trigger.owner}, Slot: ${trigger.slotIndex})`);
      });
    }
  });
};
