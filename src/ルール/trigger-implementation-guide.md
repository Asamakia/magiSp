# トリガーシステム実装ガイド

**作成日**: 2025-11-26
**バージョン**: 1.1（修正版）
**対象**: Magic Spirit トリガーシステム開発者向け

> **⚠️ 重要な実装変更 (v1.1)**
> 1. **カード紐づけ型UI**:
>    - フィールドカード選択時 → 基本技と同じエリアにトリガーボタン表示
>    - 墓地カード選択時 → 墓地UIで墓地カードを選択してトリガーボタン表示
>    - `getCardMainPhaseTriggers(card)` でカード紐づけトリガーを取得
>
> 2. **墓地UI実装が必要**:
>    - 墓地カード一覧表示（モーダル/パネル）
>    - 墓地カード選択機能
>    - `getCardGraveyardTriggers(card)` で墓地トリガーを取得
>
> 3. **トリガータイプの汎用化**:
>    - カテゴリ/属性特定トリガーは条件関数で実装
>    - トリガータイプ数を大幅削減（51 → 約20種類）
>
> 最新の実装パターンは `trigger-revision-plan.md` を参照してください。

---

## 目次

1. [はじめに](#はじめに)
2. [実装の前提知識](#実装の前提知識)
3. [Phase 1: 基盤構築](#phase-1-基盤構築)
4. [Phase 2: 最優先トリガー実装](#phase-2-最優先トリガー実装)
5. [カード固有トリガーの実装](#カード固有トリガーの実装)
6. [テストとデバッグ](#テストとデバッグ)
7. [パフォーマンス最適化](#パフォーマンス最適化)
8. [よくある問題と解決策](#よくある問題と解決策)

---

## はじめに

このガイドでは、Magic Spiritのトリガーシステムを実装するための具体的な手順を説明します。

### 前提条件

- `trigger-system-design.md` を読んでシステム設計を理解していること
- `trigger-specifications.md` で各トリガーの仕様を確認していること
- React Hooks（useState, useCallback）の基本的な知識
- Magic Spiritの既存コード構造の理解

### 実装の全体像

```
Step 1: トリガータイプ定義
  ↓
Step 2: トリガーエンジン実装
  ↓
Step 3: magic-spirit.jsxへの統合
  ↓
Step 4: カード固有効果の実装
  ↓
Step 5: テスト＆デバッグ
```

---

## 実装の前提知識

### 既存のeffectEngineとの関係

**effectEngine** (src/engine/effectEngine.js):
- 魔法カードやスキルの**即時実行**効果を処理
- スキルテキストをパースして効果を実行

**triggerEngine** (新規作成):
- **タイミングベース**の効果を処理
- カードが場にある間トリガーを管理
- effectEngineを内部で呼び出す

### データフロー

```
カード召喚
  ↓
triggerEngine.registerCardTriggers(card) ← トリガー登録
  ↓
ゲームイベント発生（攻撃、フェイズ移行など）
  ↓
triggerEngine.fireTrigger(type, context) ← トリガー発火
  ↓
カード固有効果実行 or effectEngine呼び出し
  ↓
ゲームステート更新
```

---

## Phase 1: 基盤構築

### Step 1-1: トリガータイプの定義

**ファイル**: `src/engine/triggerTypes.js` (新規作成)

```javascript
/**
 * トリガータイプの定義
 * 全51種類のトリガーを列挙
 */

export const TRIGGER_TYPES = {
  // ========================================
  // 召喚時トリガー (7種類)
  // ========================================
  ON_SUMMON: 'on_summon', // 【召喚時】
  ON_OPPONENT_SUMMON: 'on_opponent_summon', // 【相手モンスター召喚時】
  ON_SUMMON_LIGHT_SELF: 'on_summon_light_self', // 【自分光属性モンスター召喚時】
  ON_SUMMON_COST_3_BELOW: 'on_summon_cost_3_below', // 【自分のコスト3以下の召喚時】
  // ... その他の召喚時トリガー

  // ========================================
  // 破壊時トリガー (8種類)
  // ========================================
  ON_DESTROY_SELF: 'on_destroy_self', // 【自壊時】
  ON_SELF_BREAK: 'on_self_break', // 【自破壊時】（自壊時と同じ）
  ON_LEAVE_FIELD: 'on_leave_field', // 【場を離れる時】（破壊、手札戻し、デッキ戻し等全て）
  ON_DRAGON_DESTROYED: 'on_dragon_destroyed', // 【ドラゴンが破壊された時】
  ON_LIGHT_BEFORE_DESTROY: 'on_light_before_destroy', // 【光属性モンスターが破壊される時】
  // ... その他の破壊時トリガー

  // ========================================
  // フェイズトリガー (14種類)
  // ========================================
  ON_END_PHASE_SELF: 'on_end_phase_self', // 【自分エンドフェイズ時】
  ON_END_PHASE: 'on_end_phase', // 【エンドフェイズ時】
  ON_OPPONENT_END_PHASE: 'on_opponent_end_phase', // 【相手エンドフェイズ時】
  ON_MAIN_PHASE_SELF: 'on_main_phase_self', // 【自分メインフェイズ時】
  ON_BATTLE_PHASE_START: 'on_battle_phase_start', // 【バトルフェイズ開始時】
  ON_TURN_START_SELF: 'on_turn_start_self', // 【自分ターン開始時】
  ON_DRAW_PHASE_SELF: 'on_draw_phase_self', // 【自分ドローフェイズ】
  // 墓地発動
  ON_MAIN_PHASE_FROM_GRAVEYARD: 'on_main_phase_from_graveyard', // 【自分メインフェイズ時、墓地で発動】
  ON_END_PHASE_FROM_GRAVEYARD: 'on_end_phase_from_graveyard', // 【自分エンドフェイズ時、墓地で発動】
  // ... その他のフェイズトリガー

  // ========================================
  // 攻撃関連トリガー (10種類)
  // ========================================
  ON_ATTACK_SELF: 'on_attack_self', // 【自攻撃時】
  ON_BEFORE_ATTACK_SELF: 'on_before_attack_self', // 【自攻撃前】
  ON_ATTACK_AFTER_SELF: 'on_attack_after_self', // 【自攻撃後】
  ON_OPPONENT_MONSTER_ATTACK: 'on_opponent_monster_attack', // 【相手モンスター攻撃時】
  ON_BEING_ATTACKED: 'on_being_attacked', // 【被攻撃時】
  ON_ATTACKED_BY_MONSTER: 'on_attacked_by_monster', // 【相手モンスターに攻撃された時】
  // ... その他の攻撃トリガー

  // ========================================
  // 常時効果 (2種類)
  // ========================================
  CONTINUOUS: 'continuous', // 【常時】
  CONTINUOUS_IN_HAND: 'continuous_in_hand', // 【常時・手札】

  // ========================================
  // 条件発動トリガー (2種類)
  // ========================================
  ON_LIFE_BELOW_3000: 'on_life_below_3000', // 【自ライフ3000以下】
  ON_LIFE_HEAL_SELF: 'on_life_heal_self', // 【自分のライフが回復したとき】

  // ========================================
  // その他のトリガー (8種類)
  // ========================================
  ON_ACTIVATE: 'on_activate', // 【発動時】
  ON_LEAVE_FIELD: 'on_leave_field', // 【場を離れる時】
  ON_AWAKEN: 'on_awaken', // 【覚醒時】
  ON_OPPONENT_MAGIC_ACTIVATE: 'on_opponent_magic_activate', // 【相手が魔法カードを発動時】
  ON_FRIENDLY_MONSTER_DAMAGED: 'on_friendly_monster_damaged', // 【自分モンスター被ダメージ時】
  ON_SENT_TO_GRAVEYARD: 'on_sent_to_graveyard', // 【墓地に送られたとき】
  // ... その他
};

/**
 * トリガー優先度の定義
 * 数値が小さいほど優先度が高い
 */
export const TRIGGER_PRIORITIES = {
  PREVENT_DESTRUCTION: 0, // 破壊阻止系
  BEFORE_ATTACK: 1, // 攻撃前効果
  NORMAL: 2, // 通常のトリガー
  AFTER_ATTACK: 3, // 攻撃後効果
  CONTINUOUS: 4, // 常時効果（計算時に適用）
};
```

---

### Step 1-2: トリガーエンジンの実装

**ファイル**: `src/engine/triggerEngine.js` (新規作成)

```javascript
/**
 * トリガーエンジン
 * トリガーの登録、発火、管理を担当
 */

import { TRIGGER_TYPES, TRIGGER_PRIORITIES } from './triggerTypes';
import { getCardEffect } from './cardEffects';

/**
 * トリガーレジストリ
 * Map<TriggerType, Array<TriggerEntry>>
 */
class TriggerRegistry {
  constructor() {
    // トリガータイプごとにトリガーを管理
    this.triggers = new Map();
    // カードIDでインデックス化（高速削除用）
    this.triggersByCard = new Map();
    // 登録順カウンター
    this.registrationOrder = 0;
  }

  /**
   * トリガーを登録
   * @param {string} cardId - カードの一意ID（uniqueId）
   * @param {string} triggerType - TRIGGER_TYPES の値
   * @param {object} triggerData - トリガー情報
   */
  register(cardId, triggerType, triggerData) {
    const entry = {
      cardId,
      triggerType,
      ...triggerData,
      registrationOrder: this.registrationOrder++,
    };

    // トリガータイプ別に登録
    if (!this.triggers.has(triggerType)) {
      this.triggers.set(triggerType, []);
    }
    this.triggers.get(triggerType).push(entry);

    // カードID別にインデックス
    if (!this.triggersByCard.has(cardId)) {
      this.triggersByCard.set(cardId, []);
    }
    this.triggersByCard.get(cardId).push(entry);
  }

  /**
   * 指定されたトリガータイプの全トリガーを取得
   * @param {string} triggerType
   * @returns {Array} トリガーエントリーの配列
   */
  get(triggerType) {
    return this.triggers.get(triggerType) || [];
  }

  /**
   * カードIDに紐づく全トリガーを削除
   * @param {string} cardId
   */
  clearByCard(cardId) {
    const cardTriggers = this.triggersByCard.get(cardId);
    if (!cardTriggers) return;

    // 各トリガータイプから削除
    cardTriggers.forEach(trigger => {
      const typeArray = this.triggers.get(trigger.triggerType);
      if (typeArray) {
        const index = typeArray.findIndex(t => t.cardId === cardId);
        if (index !== -1) {
          typeArray.splice(index, 1);
        }
      }
    });

    // カードインデックスから削除
    this.triggersByCard.delete(cardId);
  }

  /**
   * 全トリガーをクリア
   */
  clearAll() {
    this.triggers.clear();
    this.triggersByCard.clear();
    this.registrationOrder = 0;
  }
}

// グローバルレジストリインスタンス
const globalRegistry = new TriggerRegistry();

/**
 * カードのトリガーを登録
 * @param {object} card - カードオブジェクト
 * @param {number} owner - オーナープレイヤー（1 or 2）
 * @param {number} slotIndex - フィールドスロット番号
 */
export const registerCardTriggers = (card, owner, slotIndex) => {
  if (!card || !card.uniqueId) return;

  // カードの効果テキストを解析してトリガーを抽出
  const triggers = parseCardTriggers(card);

  triggers.forEach(trigger => {
    globalRegistry.register(card.uniqueId, trigger.type, {
      cardName: card.name,
      owner,
      slotIndex,
      priority: trigger.priority || TRIGGER_PRIORITIES.NORMAL,
      condition: trigger.condition,
      effect: trigger.effect,
    });
  });
};

/**
 * カードの効果テキストからトリガーを抽出
 * @param {object} card
 * @returns {Array} トリガー情報の配列
 */
const parseCardTriggers = (card) => {
  const triggers = [];

  // カード固有効果がある場合はそちらを優先
  const cardEffect = getCardEffect(card.id);
  if (cardEffect) {
    // カード固有効果から複数のトリガーを登録
    Object.keys(cardEffect).forEach(triggerType => {
      if (TRIGGER_TYPES[triggerType] || Object.values(TRIGGER_TYPES).includes(triggerType)) {
        triggers.push({
          type: triggerType,
          effect: cardEffect[triggerType],
          priority: TRIGGER_PRIORITIES.NORMAL,
        });
      }
    });
    return triggers;
  }

  // 効果テキストから【】パターンを抽出
  const effectText = card.effect || '';

  // 【召喚時】
  if (effectText.includes('【召喚時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_SUMMON,
      effect: effectText,
      priority: TRIGGER_PRIORITIES.NORMAL,
    });
  }

  // 【自壊時】または【自破壊時】
  if (effectText.includes('【自壊時】') || effectText.includes('【自破壊時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      effect: effectText,
      priority: TRIGGER_PRIORITIES.NORMAL,
    });
  }

  // 【常時】
  if (effectText.includes('【常時】')) {
    triggers.push({
      type: TRIGGER_TYPES.CONTINUOUS,
      effect: effectText,
      priority: TRIGGER_PRIORITIES.CONTINUOUS,
    });
  }

  // 【自分エンドフェイズ時】
  if (effectText.includes('【自分エンドフェイズ時】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      effect: effectText,
      priority: TRIGGER_PRIORITIES.NORMAL,
    });
  }

  // 【自攻撃時】または【自攻撃前】
  if (effectText.includes('【自攻撃時】') || effectText.includes('【自攻撃前】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_ATTACK_SELF,
      effect: effectText,
      priority: TRIGGER_PRIORITIES.BEFORE_ATTACK,
    });
  }

  // 【自攻撃後】
  if (effectText.includes('【自攻撃後】')) {
    triggers.push({
      type: TRIGGER_TYPES.ON_ATTACK_AFTER_SELF,
      effect: effectText,
      priority: TRIGGER_PRIORITIES.AFTER_ATTACK,
    });
  }

  // ... その他のトリガーパターン
  // TODO: 全51種類のトリガーパターンマッチング

  return triggers;
};

/**
 * トリガーを発火
 * @param {string} triggerType - TRIGGER_TYPES の値
 * @param {object} context - トリガーコンテキスト
 */
export const fireTrigger = (triggerType, context) => {
  const triggers = globalRegistry.get(triggerType);

  if (!triggers || triggers.length === 0) return;

  // 優先度順にソート
  const sortedTriggers = [...triggers].sort((a, b) => {
    // 優先度が異なる場合は優先度順
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // 優先度が同じ場合はターンプレイヤーの効果を先に
    if (a.owner === context.currentPlayer && b.owner !== context.currentPlayer) {
      return -1;
    }
    if (b.owner === context.currentPlayer && a.owner !== context.currentPlayer) {
      return 1;
    }
    // それでも同じ場合は登録順
    return a.registrationOrder - b.registrationOrder;
  });

  // 各トリガーを実行
  sortedTriggers.forEach(trigger => {
    try {
      // 条件チェック（あれば）
      if (trigger.condition && !trigger.condition(context)) {
        return; // 条件を満たさない場合はスキップ
      }

      // 効果実行
      if (typeof trigger.effect === 'function') {
        // カード固有効果の関数
        trigger.effect(context);
      } else if (typeof trigger.effect === 'string') {
        // 効果テキストの場合はeffectEngineに委譲
        // TODO: effectEngine統合
        console.log(`トリガー発火: ${trigger.cardName} - ${triggerType}`);
      }
    } catch (error) {
      console.error(`トリガー実行エラー: ${trigger.cardName}`, error);
    }
  });
};

/**
 * カードのトリガーを削除
 * @param {string} cardId - カードの一意ID
 */
export const clearCardTriggers = (cardId) => {
  globalRegistry.clearByCard(cardId);
};

/**
 * 全トリガーをクリア（ゲームリセット時など）
 */
export const clearAllTriggers = () => {
  globalRegistry.clearAll();
};

/**
 * デバッグ用: 現在登録されているトリガーを表示
 */
export const debugPrintTriggers = () => {
  console.log('=== Trigger Registry ===');
  globalRegistry.triggers.forEach((triggers, type) => {
    console.log(`${type}: ${triggers.length} triggers`);
    triggers.forEach(t => {
      console.log(`  - ${t.cardName} (Owner: P${t.owner}, Slot: ${t.slotIndex})`);
    });
  });
};
```

---

### Step 1-3: magic-spirit.jsxへの統合

**ファイル**: `src/magic-spirit.jsx`

#### トリガーエンジンのインポート

```javascript
// 既存のインポートの後に追加
import {
  registerCardTriggers,
  fireTrigger,
  clearCardTriggers,
  clearAllTriggers,
} from './engine/triggerEngine';
import { TRIGGER_TYPES } from './engine/triggerTypes';
```

#### ゲーム初期化時の処理

```javascript
const initGame = () => {
  // 既存の初期化処理
  // ...

  // トリガーレジストリをクリア
  clearAllTriggers();

  // 初期フィールドのトリガー登録
  // （通常は空なのでスキップ）
};
```

#### カード召喚時の処理

```javascript
const summonCard = (card, slotIndex) => {
  // 既存の召喚処理
  const currentActiveSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;

  if (currentActiveSP < card.cost) {
    addLog('SP が足りません', 'damage');
    return;
  }

  // SPコスト支払い
  // ... 既存のコスト処理 ...

  // フィールドに配置
  const newField = [...currentField];
  const monsterInstance = createMonsterInstance(card);
  newField[slotIndex] = monsterInstance;

  if (currentPlayer === 1) {
    setP1Field(newField);
  } else {
    setP2Field(newField);
  }

  // 手札から削除
  // ... 既存の手札処理 ...

  // ✨ トリガーの登録
  registerCardTriggers(monsterInstance, currentPlayer, slotIndex);

  // ✨【召喚時】トリガーの発火
  fireTrigger(TRIGGER_TYPES.ON_SUMMON, {
    card: monsterInstance,
    slotIndex,
    currentPlayer,
    // ゲームステート
    p1Life, p2Life,
    p1Field, p2Field,
    p1Hand, p2Hand,
    p1Deck, p2Deck,
    p1Graveyard, p2Graveyard,
    // Setters
    setP1Life, setP2Life,
    setP1Field, setP2Field,
    setP1Hand, setP2Hand,
    setP1Deck, setP2Deck,
    setP1Graveyard, setP2Graveyard,
    // ヘルパー
    addLog,
  });

  addLog(`${card.name} を召喚しました`, 'info');
};
```

#### カード破壊時の処理

```javascript
const destroyMonster = (targetIndex, isOpponent = false) => {
  const field = isOpponent ? (currentPlayer === 1 ? p2Field : p1Field) : (currentPlayer === 1 ? p1Field : p2Field);
  const setField = isOpponent ? (currentPlayer === 1 ? setP2Field : setP1Field) : (currentPlayer === 1 ? setP1Field : setP2Field);
  const graveyard = isOpponent ? (currentPlayer === 1 ? p2Graveyard : p1Graveyard) : (currentPlayer === 1 ? p1Graveyard : p2Graveyard);
  const setGraveyard = isOpponent ? (currentPlayer === 1 ? setP2Graveyard : setP1Graveyard) : (currentPlayer === 1 ? setP1Graveyard : setP2Graveyard);

  const monster = field[targetIndex];
  if (!monster) return;

  // ✨【自壊時】トリガーの発火
  const destroyContext = {
    destroyedCard: monster,
    slotIndex: targetIndex,
    isOpponent,
    currentPlayer,
    // ゲームステート
    p1Life, p2Life,
    p1Field, p2Field,
    p1Graveyard, p2Graveyard,
    // Setters
    setP1Life, setP2Life,
    setP1Field, setP2Field,
    setP1Graveyard, setP2Graveyard,
    // ヘルパー
    addLog,
  };
  fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);

  // ✨【場を離れる時】トリガーの発火
  // 破壊、手札戻し、デッキ戻しなど全ての場離れで発動
  fireLeaveFieldTrigger(monster, destroyContext, 'destroy');

  // ✨ トリガーの削除
  clearCardTriggers(monster.uniqueId);

  // 墓地に送る
  const newField = [...field];
  newField[targetIndex] = null;
  setField(newField);

  const newGraveyard = [...graveyard, monster];
  setGraveyard(newGraveyard);

  addLog(`${monster.name} が破壊されました`, 'damage');
};
```

#### フェイズ処理への統合

```javascript
const processPhase = useCallback((phaseIndex) => {
  setPhase(phaseIndex);

  switch (phaseIndex) {
    case 0: // ターン開始フェイズ
      // ✨【自分ターン開始時】トリガー発火
      fireTrigger(TRIGGER_TYPES.ON_TURN_START_SELF, {
        currentPlayer,
        // ... context
      });
      // 既存の処理
      // ...
      break;

    case 1: // ドローフェイズ
      // ✨【自分ドローフェイズ】トリガー発火
      fireTrigger(TRIGGER_TYPES.ON_DRAW_PHASE_SELF, {
        currentPlayer,
        // ... context
      });
      // 既存の処理
      // ...
      break;

    case 2: // メインフェイズ
      // ✨【自分メインフェイズ時】トリガー発火
      fireTrigger(TRIGGER_TYPES.ON_MAIN_PHASE_SELF, {
        currentPlayer,
        // ... context
      });
      // ✨ 墓地発動トリガー
      fireTrigger(TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD, {
        currentPlayer,
        // ... context
      });
      break;

    case 3: // バトルフェイズ
      // ✨【バトルフェイズ開始時】トリガー発火
      fireTrigger(TRIGGER_TYPES.ON_BATTLE_PHASE_START, {
        currentPlayer,
        // ... context
      });
      break;

    case 4: // エンドフェイズ
      // ✨【自分エンドフェイズ時】トリガー発火
      fireTrigger(TRIGGER_TYPES.ON_END_PHASE_SELF, {
        currentPlayer,
        // ... context
      });
      // ✨【エンドフェイズ時】トリガー発火
      fireTrigger(TRIGGER_TYPES.ON_END_PHASE, {
        currentPlayer,
        // ... context
      });
      // ✨ 墓地発動トリガー
      fireTrigger(TRIGGER_TYPES.ON_END_PHASE_FROM_GRAVEYARD, {
        currentPlayer,
        // ... context
      });
      break;
  }
}, [currentPlayer, /* 依存配列 */]);
```

#### 攻撃処理への統合

```javascript
const attack = (attackerIndex, targetIndex) => {
  const attacker = currentField[attackerIndex];
  const target = targetIndex === -1 ? null : opponentField[targetIndex];

  // ✨【自攻撃時】【自攻撃前】トリガー発火
  fireTrigger(TRIGGER_TYPES.ON_ATTACK_SELF, {
    attacker,
    attackerIndex,
    target,
    targetIndex,
    currentPlayer,
    // ... context
  });

  // ✨ 対象が被攻撃時トリガーを持つ場合
  if (target) {
    fireTrigger(TRIGGER_TYPES.ON_BEING_ATTACKED, {
      attacker,
      target,
      targetIndex,
      currentPlayer,
      // ... context
    });
  }

  // ダメージ計算
  // ... 既存の戦闘処理 ...

  const targetDestroyed = target && target.currentHp <= 0;

  // ✨【自攻撃後】トリガー発火
  fireTrigger(TRIGGER_TYPES.ON_ATTACK_AFTER_SELF, {
    attacker,
    attackerIndex,
    target,
    targetIndex,
    targetDestroyed,
    currentPlayer,
    // ... context
  });
};
```

---

## Phase 2: 最優先トリガー実装

### 【召喚時】トリガーの実装

#### カード固有効果の実装例

**ファイル**: `src/engine/cardEffects/primitive.js`

```javascript
import { TRIGGER_TYPES } from '../triggerTypes';
import {
  reviveFromGraveyard,
  searchCard,
  drawCards,
} from '../effectHelpers';

export const primitiveCardEffects = {
  /**
   * C0000004: ゴミあさり粘液獣
   * 【召喚時】墓地の《粘液獣》モンスター1体を攻撃力半減して場に戻す。
   * 【召喚時】このターンはダイレクトアタック可能。
   */
  C0000004: {
    [TRIGGER_TYPES.ON_SUMMON]: (context) => {
      const { addLog } = context;

      // 墓地から《粘液獣》を蘇生
      const success = reviveFromGraveyard(context, (card) => {
        return card.name && card.name.includes('粘液獣');
      }, true); // weakened = true (攻撃力半減)

      if (success) {
        addLog('墓地の《粘液獣》を蘇生した！', 'info');
      }

      // ダイレクトアタック可能フラグを設定
      // TODO: カードにフラグを追加する機能が必要
      // context.card.canDirectAttack = true;

      return success;
    },
  },

  /**
   * C0000008: 粘液獣・胞子
   * 【召喚時】デッキから《粘液獣》と名の付くカード1枚を手札に加える。
   */
  C0000008: {
    [TRIGGER_TYPES.ON_SUMMON]: (context) => {
      const { addLog } = context;

      // デッキから《粘液獣》を検索
      const found = searchCard(context, (card) => {
        return card.name && card.name.includes('粘液獣');
      });

      if (found) {
        addLog(`デッキから《${found.name}》を手札に加えた！`, 'info');
        return true;
      } else {
        addLog('条件に合うカードが見つからなかった', 'info');
        return false;
      }
    },
  },

  /**
   * C0000010: 粘液獣・融合体
   * 【召喚時】このカードと場の他の《粘液獣》1体を融合し、
   * このカードの攻撃力を融合素材の合計に変更する。
   */
  C0000010: {
    [TRIGGER_TYPES.ON_SUMMON]: (context) => {
      const {
        currentPlayer,
        p1Field,
        p2Field,
        setP1Field,
        setP2Field,
        slotIndex,
        addLog,
      } = context;

      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;

      // 他の《粘液獣》を探す
      const otherSlimeIndex = currentField.findIndex((m, idx) => {
        return m && idx !== slotIndex && m.name && m.name.includes('粘液獣');
      });

      if (otherSlimeIndex === -1) {
        addLog('融合素材がいません', 'info');
        return false;
      }

      const thisMonster = currentField[slotIndex];
      const otherMonster = currentField[otherSlimeIndex];

      // 攻撃力を合計
      const totalAttack = thisMonster.attack + otherMonster.attack;

      // このカードの攻撃力を更新
      const newField = [...currentField];
      newField[slotIndex] = {
        ...thisMonster,
        attack: totalAttack,
      };

      // 融合素材を破壊
      newField[otherSlimeIndex] = null;

      setField(newField);
      addLog(`${otherMonster.name}と融合！攻撃力が${totalAttack}になった！`, 'info');

      return true;
    },
  },
};
```

---

### 【常時】効果の実装

常時効果は特殊で、計算時に毎回チェックする必要があります。

#### 攻撃力計算への統合

```javascript
// magic-spirit.jsx 内に追加

/**
 * モンスターの現在の攻撃力を計算（常時効果を適用）
 * @param {object} monster - モンスターオブジェクト
 * @param {number} owner - オーナープレイヤー
 * @param {number} slotIndex - スロット番号
 * @returns {number} 最終攻撃力
 */
const calculateMonsterAttack = (monster, owner, slotIndex) => {
  if (!monster) return 0;

  let totalAttack = monster.attack;

  // フィールドカードの常時効果
  const fieldCard = owner === 1 ? p1FieldCard : p2FieldCard;
  if (fieldCard) {
    // 属性一致で攻撃力アップなど
    if (fieldCard.effect && fieldCard.effect.includes('【常時】')) {
      // TODO: フィールドカードの常時効果を解析
    }
  }

  // 場のモンスターの常時効果
  const field = owner === 1 ? p1Field : p2Field;
  field.forEach((m, idx) => {
    if (!m || idx === slotIndex) return;

    // カード固有の常時効果を取得
    const cardEffect = getCardEffect(m.id);
    if (cardEffect && cardEffect[TRIGGER_TYPES.CONTINUOUS]) {
      const modifier = cardEffect[TRIGGER_TYPES.CONTINUOUS]({
        targetMonster: monster,
        targetSlotIndex: slotIndex,
        field,
        // ... context
      });

      if (typeof modifier === 'number') {
        totalAttack += modifier;
      }
    }
  });

  return Math.max(0, totalAttack); // 最低0
};
```

#### 常時効果の実装例

**ファイル**: `src/engine/cardEffects/primitive.js`

```javascript
/**
 * C0000007: 粘液獣・キング
 * 【常時】場にいる粘液獣1体につき自身の攻撃力を1500アップ（自身は含めない）。
 */
C0000007: {
  [TRIGGER_TYPES.CONTINUOUS]: (context) => {
    const { field, targetMonster, targetSlotIndex } = context;

    // 対象が自分自身の場合は0
    if (targetMonster.id === 'C0000007') {
      // 場の粘液獣をカウント（自身を除く）
      const slimeCount = field.filter((m, idx) => {
        return m && idx !== targetSlotIndex && m.name && m.name.includes('粘液獣');
      }).length;

      return slimeCount * 1500;
    }

    return 0;
  },
},
```

---

### 【自分エンドフェイズ時】トリガーの実装

**ファイル**: `src/engine/cardEffects/primitive.js`

```javascript
/**
 * C0000003: 粘液獣の群生地
 * 【常時】自分の場の粘液獣モンスターの攻撃力を300アップ。
 * 【自分エンドフェイズ時】場にいる粘液獣1体につき相手プレイヤーに300ダメージを与える。
 */
C0000003: {
  [TRIGGER_TYPES.CONTINUOUS]: (context) => {
    const { targetMonster } = context;
    // 粘液獣の場合のみ+300
    if (targetMonster.name && targetMonster.name.includes('粘液獣')) {
      return 300;
    }
    return 0;
  },

  [TRIGGER_TYPES.ON_END_PHASE_SELF]: (context) => {
    const { currentPlayer, p1Field, p2Field, setP2Life, p2Life, addLog } = context;

    const currentField = currentPlayer === 1 ? p1Field : p2Field;

    // 場にいる粘液獣をカウント
    const slimeCount = currentField.filter(m => {
      return m && m.name && m.name.includes('粘液獣');
    }).length;

    if (slimeCount === 0) return false;

    const damage = slimeCount * 300;

    // 相手にダメージ
    if (currentPlayer === 1) {
      setP2Life(prev => Math.max(0, prev - damage));
      addLog(`粘液獣の群生地の効果で相手に${damage}ダメージ！`, 'damage');
    } else {
      setP1Life(prev => Math.max(0, prev - damage));
      addLog(`粘液獣の群生地の効果で相手に${damage}ダメージ！`, 'damage');
    }

    return true;
  },
},
```

---

### 【自壊時】トリガーの実装

**ファイル**: `src/engine/cardEffects/fire.js`

```javascript
import { TRIGGER_TYPES } from '../triggerTypes';
import { searchCard } from '../effectHelpers';

export const fireCardEffects = {
  /**
   * C0000025: ブレイズ・ドラゴン
   * 【自壊時】デッキから［ドラゴン］モンスター1体を手札に加える。
   */
  C0000025: {
    [TRIGGER_TYPES.ON_DESTROY_SELF]: (context) => {
      const { addLog } = context;

      // デッキから［ドラゴン］を検索
      const found = searchCard(context, (card) => {
        return card.category && card.category.includes('【ドラゴン】');
      });

      if (found) {
        addLog(`デッキから《${found.name}》を手札に加えた！`, 'info');
        return true;
      } else {
        addLog('［ドラゴン］モンスターが見つからなかった', 'info');
        return false;
      }
    },
  },
};
```

---

## カード固有トリガーの実装

### テンプレート

新しいカードのトリガー効果を実装する際のテンプレート：

**ファイル**: `src/engine/cardEffects/_template.js`

```javascript
import { TRIGGER_TYPES } from '../triggerTypes';
import {
  millDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  destroyMonster,
  drawCards,
  healLife,
  modifyAttack,
  modifyHP,
} from '../effectHelpers';

/**
 * カードID: カード名
 * 効果テキスト（cardlist_v3.csvから引用）
 */
export const yourAttributeCardEffects = {
  C0000XXX: {
    // 【召喚時】トリガー
    [TRIGGER_TYPES.ON_SUMMON]: (context) => {
      const { addLog } = context;

      // 効果の実装
      // effectHelpers を活用

      addLog('効果が発動した！', 'info');
      return true;
    },

    // 【常時】効果
    [TRIGGER_TYPES.CONTINUOUS]: (context) => {
      const { targetMonster } = context;

      // 条件チェック
      if (targetMonster.attribute === '炎') {
        return 300; // 攻撃力+300
      }

      return 0;
    },

    // 【自壊時】トリガー
    [TRIGGER_TYPES.ON_DESTROY_SELF]: (context) => {
      const { addLog } = context;

      // 破壊時の効果

      return true;
    },

    // 【自分エンドフェイズ時】トリガー
    [TRIGGER_TYPES.ON_END_PHASE_SELF]: (context) => {
      const { currentPlayer, addLog } = context;

      // エンドフェイズの効果

      return true;
    },

    // その他のトリガー
    // ...
  },
};
```

---

### 【推奨】cardTriggersによる実装（v2.0形式）

上記のcardEffects形式は古い形式です。現在は`src/engine/cardTriggers/`の配列形式を推奨します。

**ファイル**: `src/engine/cardTriggers/[attribute]Cards.js`

```javascript
import { TRIGGER_TYPES, ACTIVATION_TYPES, TRIGGER_PRIORITIES } from '../triggerTypes';
import { conditionalDamage, modifyAttack } from '../effectHelpers';

export const lightCardTriggers = {
  /**
   * C0000091: 灯火の精霊
   * 【常時】自分の光属性モンスターが召喚されるたび、そのモンスターのHPを200アップ。
   */
  C0000091: [
    {
      type: TRIGGER_TYPES.ON_ATTRIBUTE_SUMMON_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      displayDescription: '自分光属性モンスター召喚時',  // ⭐ UI表示用
      description: '光属性召喚時: そのモンスターのHP+200',
      effect: (context) => {
        const { card, slotIndex, addLog } = context;
        if (card && card.attribute === '光') {
          modifyHP(context, 200, slotIndex, false);
          addLog(`灯火の精霊の効果: ${card.name}のHP+200`, 'info');
        }
      },
    },
  ],
};
```

#### トリガーオブジェクトのフィールド

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `type` | ✅ | `TRIGGER_TYPES`の値。トリガーのタイミング |
| `activationType` | ✅ | `AUTOMATIC`（自動）または `OPTIONAL`（任意） |
| `description` | ✅ | 効果説明（情報パネルに表示） |
| `displayDescription` | ⭐ | タイミング表示文（省略時はtypeのdisplayNameを使用） |
| `effect` | ✅ | 効果関数 `(context) => { ... }` |
| `priority` | - | 優先度（デフォルト: NORMAL） |
| `usesPerTurn` | - | 1ターンの使用回数制限 |

#### displayDescription の使用ケース

汎用トリガータイプに条件が付く場合に使用します：

```javascript
// ON_ATTRIBUTE_SUMMON_SELF の displayName は「属性召喚時」
// 実際の効果テキストは「自分光属性モンスター召喚時」なので displayDescription で上書き

C0000091: [{
  type: TRIGGER_TYPES.ON_ATTRIBUTE_SUMMON_SELF,
  displayDescription: '自分光属性モンスター召喚時',  // ← 情報パネルに表示される
  description: 'そのモンスターのHP+200',
  // ...
}]
```

**displayDescription が必要なケース**:
- `ON_ATTRIBUTE_SUMMON_SELF` + 特定属性/名称
- `ON_ATTACK` + 特定名称（例: 「自分《ヴォランティス》モンスター攻撃時」）
- その他、汎用トリガーに追加条件がある場合

---

## テストとデバッグ

### デバッグツールの活用

```javascript
// magic-spirit.jsx 内で、開発モード時のみデバッグ情報を表示

useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    // トリガーレジストリの状態を表示
    debugPrintTriggers();
  }
}, [p1Field, p2Field]);
```

### テストケース

#### 【召喚時】トリガーのテスト

```javascript
// Test: C0000008 粘液獣・胞子
// 1. デッキに《粘液獣》カードが存在することを確認
// 2. 粘液獣・胞子を召喚
// 3. 手札に《粘液獣》カードが追加されたことを確認
```

#### 【常時】効果のテスト

```javascript
// Test: C0000007 粘液獣・キング
// 1. 粘液獣・キングを召喚（攻撃力1000）
// 2. 他の粘液獣を1体召喚
// 3. 粘液獣・キングの攻撃力が2500（1000+1500）になることを確認
// 4. さらに粘液獣を1体召喚
// 5. 粘液獣・キングの攻撃力が4000（1000+1500*2）になることを確認
```

---

## パフォーマンス最適化

### 1. 常時効果のキャッシュ

```javascript
// 常時効果の計算結果をキャッシュ
const continuousEffectCache = useRef({
  attackModifiers: {},
  lastFieldState: null,
});

// フィールド変更時のみ再計算
useEffect(() => {
  const currentFieldState = JSON.stringify({ p1Field, p2Field });

  if (currentFieldState !== continuousEffectCache.current.lastFieldState) {
    // キャッシュをクリア
    continuousEffectCache.current.attackModifiers = {};
    continuousEffectCache.current.lastFieldState = currentFieldState;

    // 常時効果を再計算
    recalculateContinuousEffects();
  }
}, [p1Field, p2Field]);
```

### 2. トリガー発火の最適化

```javascript
// トリガーが0件の場合は早期リターン
export const fireTrigger = (triggerType, context) => {
  const triggers = globalRegistry.get(triggerType);

  // 高速パス: トリガーが存在しない場合
  if (!triggers || triggers.length === 0) return;

  // ... 処理
};
```

---

## よくある問題と解決策

### Q1: トリガーが発火しない

**原因**:
- トリガーが正しく登録されていない
- トリガータイプの名前が間違っている
- 条件チェックでfalseになっている

**解決策**:
```javascript
// デバッグログを追加
console.log('Registering trigger for:', card.name, triggerType);

// トリガーレジストリを確認
debugPrintTriggers();
```

### Q2: トリガーが重複して発火する

**原因**:
- カードが複数回登録されている
- トリガーが削除されていない

**解決策**:
```javascript
// カード破壊時に必ずトリガーを削除
clearCardTriggers(monster.uniqueId);
```

### Q3: 常時効果が反映されない

**原因**:
- 攻撃力計算時に常時効果をチェックしていない
- キャッシュが古い

**解決策**:
```javascript
// フィールド変更時にキャッシュをクリア
useEffect(() => {
  clearContinuousEffectCache();
}, [p1Field, p2Field]);
```

### Q4: ステート更新のタイミング問題

**原因**:
- Reactのステート更新は非同期
- トリガー実行中に古いステートを参照

**解決策**:
```javascript
// 関数形式のステート更新を使用
setP1Life(prev => prev - damage);

// 即座に更新が必要な場合はuseRefを活用
```

---

## まとめ

このガイドでは、Magic Spiritのトリガーシステムを実装するための詳細な手順を説明しました。

**実装の流れ**:
1. トリガータイプ定義（triggerTypes.js）
2. トリガーエンジン実装（triggerEngine.js）
3. magic-spirit.jsxへの統合
4. カード固有トリガーの実装（cardEffects/*.js）
5. テストとデバッグ

**次のステップ**:
- Phase 1の基盤構築を完了
- Phase 2の最優先トリガー（召喚時、常時、エンドフェイズ時、自壊時）を実装
- 段階的に残りのトリガーを実装

---

**関連ドキュメント**:
- `trigger-system-design.md` - システム設計
- `trigger-specifications.md` - トリガー仕様定義
- `CLAUDE.md` - プロジェクト全体ガイド
