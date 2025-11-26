# トリガーシステム設計書

**作成日**: 2025-11-26
**バージョン**: 1.0
**対象**: Magic Spirit トリガー効果実装

---

## 目次

1. [概要](#概要)
2. [トリガーの統計](#トリガーの統計)
3. [アーキテクチャ設計](#アーキテクチャ設計)
4. [トリガーのライフサイクル](#トリガーのライフサイクル)
5. [実装優先順位](#実装優先順位)
6. [既存システムとの統合](#既存システムとの統合)
7. [データ構造](#データ構造)
8. [実装フェーズ](#実装フェーズ)

---

## 概要

Magic Spiritのカード効果には、特定のタイミングで発動する**トリガー効果**が存在します。
cardlist_v3.csvの分析により、**51種類のトリガー**が確認され、合計**337回**使用されています。

### トリガー効果とは

トリガー効果は、特定のゲームイベント（召喚、攻撃、フェイズ移行など）が発生した際に自動的に発動する効果です。

**例**:
- `【召喚時】デッキから《粘液獣》カード1枚を手札に加える`
- `【自壊時】相手プレイヤーに200ダメージ`
- `【自分エンドフェイズ時】場に粘液獣が3体以上いる場合、自分のライフを500回復`

---

## トリガーの統計

### 使用頻度 TOP 10

| 順位 | トリガー | 使用回数 | 重要度 |
|------|---------|---------|--------|
| 1 | 【召喚時】 | 109回 | ★★★★★ |
| 2 | 【常時】 | 58回 | ★★★★★ |
| 3 | 【自分エンドフェイズ時】 | 40回 | ★★★★☆ |
| 4 | 【自壊時】 | 30回 | ★★★★☆ |
| 5 | 【エンドフェイズ時】 | 17回 | ★★★☆☆ |
| 6 | 【自攻撃時】 | 13回 | ★★★☆☆ |
| 7 | 【相手モンスター攻撃時】 | 5回 | ★★☆☆☆ |
| 8 | 【自攻撃後】 | 5回 | ★★☆☆☆ |
| 9 | 【発動時】 | 5回 | ★★☆☆☆ |
| 10 | 【相手モンスター召喚時】 | 3回 | ★★☆☆☆ |

### カテゴリ別分類

**7つの主要カテゴリ**:

1. **召喚時トリガー** (7種類) - モンスター召喚時に発動
2. **破壊時トリガー** (7種類) - モンスター破壊時に発動
3. **フェイズトリガー** (14種類) - ゲームフェイズの変化時に発動
4. **攻撃関連トリガー** (10種類) - 攻撃の前後に発動
5. **墓地発動トリガー** (3種類) - 墓地から効果を発動
6. **常時効果** (2種類) - 場にいる間常に有効
7. **条件発動トリガー** (8種類) - 特定条件満たした時に発動

---

## アーキテクチャ設計

### システム構成

```
┌─────────────────────────────────────────┐
│         magic-spirit.jsx               │
│    (メインゲームコンポーネント)          │
│                                         │
│  ゲームイベント発生                      │
│  (召喚、攻撃、フェイズ移行など)          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      src/engine/triggerEngine.js       │
│         (トリガー管理エンジン)           │
│                                         │
│  • トリガーの登録                        │
│  • トリガーの発火                        │
│  • トリガーキューの管理                  │
│  • 優先度制御                           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    src/engine/cardEffects/*.js         │
│      (カード固有効果の実装)              │
│                                         │
│  • カード個別のトリガー効果              │
│  • effectHelpersを使用                  │
└─────────────────────────────────────────┘
```

### 主要コンポーネント

#### 1. **triggerEngine.js** (新規作成)

トリガーシステムの中核となるエンジン。

**責務**:
- トリガーの登録・管理
- トリガーの発火タイミング制御
- トリガーキューの処理
- 優先度とチェーン処理

**主要関数**:
```javascript
// トリガーの登録
registerTrigger(cardId, triggerType, effectFunction, priority)

// トリガーの発火
fireTrigger(triggerType, context)

// トリガーのクリア（カード破壊時など）
clearTriggers(cardId)

// 全トリガーの取得
getAllActiveTriggers(triggerType)
```

#### 2. **triggerTypes.js** (新規作成)

トリガータイプの定義。

```javascript
export const TRIGGER_TYPES = {
  // 召喚時
  ON_SUMMON: 'on_summon',
  ON_OPPONENT_SUMMON: 'on_opponent_summon',

  // 破壊時
  ON_DESTROY_SELF: 'on_destroy_self',
  ON_DESTROY_ANY: 'on_destroy_any',

  // フェイズ
  ON_END_PHASE_SELF: 'on_end_phase_self',
  ON_END_PHASE: 'on_end_phase',
  ON_MAIN_PHASE_SELF: 'on_main_phase_self',
  ON_BATTLE_PHASE_START: 'on_battle_phase_start',

  // 攻撃
  ON_ATTACK_SELF: 'on_attack_self',
  ON_ATTACK_AFTER_SELF: 'on_attack_after_self',
  ON_OPPONENT_ATTACK: 'on_opponent_attack',
  ON_BEING_ATTACKED: 'on_being_attacked',

  // 常時
  CONTINUOUS: 'continuous',

  // その他
  ON_CARD_SENT_TO_GRAVEYARD: 'on_card_sent_to_graveyard',
  ON_LIFE_BELOW_THRESHOLD: 'on_life_below_threshold',
  // ... その他のトリガー
};
```

#### 3. **triggerHelpers.js** (新規作成)

トリガー効果の実装を支援するヘルパー関数。

```javascript
// トリガー条件のチェック
checkTriggerCondition(card, condition, context)

// トリガー効果の実行
executeTriggerEffect(card, effect, context)

// フェイズトリガーの登録
registerPhaseBasedTrigger(card, phase, effect)
```

---

## トリガーのライフサイクル

### 1. **トリガーの登録**

カードが場に出た時、そのカードのトリガー効果をトリガーエンジンに登録します。

```javascript
// カード召喚時
summonCard(card, slotIndex) {
  // ... 既存の召喚処理 ...

  // トリガーの登録
  registerCardTriggers(card);

  // 【召喚時】トリガーの発火
  fireTrigger(TRIGGER_TYPES.ON_SUMMON, {
    card,
    slotIndex,
    // ... その他のコンテキスト
  });
}
```

### 2. **トリガーの発火**

ゲームイベント発生時、該当するトリガーを全て発火します。

```javascript
// エンドフェイズ処理
processEndPhase() {
  // 【自分エンドフェイズ時】トリガーを発火
  fireTrigger(TRIGGER_TYPES.ON_END_PHASE_SELF, {
    currentPlayer,
    // ... コンテキスト
  });

  // 【エンドフェイズ時】トリガーを発火
  fireTrigger(TRIGGER_TYPES.ON_END_PHASE, {
    currentPlayer,
    // ... コンテキスト
  });
}
```

### 3. **トリガーのクリア**

カードが場を離れた時、そのカードのトリガーを登録解除します。

```javascript
// カード破壊時
destroyCard(cardId, slotIndex) {
  // 【自壊時】トリガーの発火
  fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, {
    card,
    slotIndex,
    // ... コンテキスト
  });

  // トリガーの登録解除
  clearTriggers(cardId);

  // ... 破壊処理 ...
}
```

---

## 実装優先順位

### Phase 1: 最優先トリガー (使用頻度 高)

実装順序と理由：

#### 1-1. **【召喚時】** (109回)
- **優先度**: ★★★★★ (最優先)
- **理由**: 最も使用頻度が高く、ゲームの基本フロー
- **影響範囲**: summonCard()関数
- **実装難易度**: 中

#### 1-2. **【常時】** (58回)
- **優先度**: ★★★★★
- **理由**: 常に効果を監視する必要があり、パフォーマンスに影響
- **影響範囲**: 攻撃力計算、ダメージ計算など多岐にわたる
- **実装難易度**: 高

#### 1-3. **【自分エンドフェイズ時】** (40回)
- **優先度**: ★★★★☆
- **理由**: ターンの終了処理で重要
- **影響範囲**: processPhase()関数
- **実装難易度**: 中

#### 1-4. **【自壊時】** (30回)
- **優先度**: ★★★★☆
- **理由**: カード破壊時の追加効果
- **影響範囲**: destroyMonster()関数
- **実装難易度**: 中

### Phase 2: 重要トリガー (使用頻度 中)

#### 2-1. **【エンドフェイズ時】** (17回)
#### 2-2. **【自攻撃時】** (13回)
#### 2-3. **【自攻撃後】** (5回)
#### 2-4. **【相手モンスター攻撃時】** (5回)

### Phase 3: 特殊トリガー (使用頻度 低)

#### 3-1. **墓地発動トリガー**
#### 3-2. **条件発動トリガー**
#### 3-3. **その他のトリガー**

---

## 既存システムとの統合

### effectEngine との関係

**既存のeffectEngine**:
- 魔法カードやスキルの**即時実行**効果を処理
- `executeSkillEffects()` でスキルテキストを解析・実行

**新しいtriggerEngine**:
- **タイミングベース**の効果を処理
- カードが場にある間トリガーを管理
- effectEngine を内部で呼び出して効果を実行

```javascript
// トリガー発火時の処理フロー
fireTrigger(triggerType, context) {
  const triggers = getActiveTriggers(triggerType);

  triggers.forEach(trigger => {
    // トリガー条件をチェック
    if (checkCondition(trigger, context)) {
      // effectEngine を使って効果を実行
      executeSkillEffects(trigger.effectText, context);
    }
  });
}
```

### cardEffects との関係

**カード固有効果** (`src/engine/cardEffects/*.js`):
- 複雑なトリガー効果の実装
- effectHelpers を使用

**トリガーエンジン**:
- カード固有効果の関数を適切なタイミングで呼び出す
- トリガータイプに基づいて実行を制御

```javascript
// cardEffects/fire.js の例
export const fireCardEffects = {
  C0000004: {
    // 【召喚時】トリガー
    [TRIGGER_TYPES.ON_SUMMON]: (context) => {
      // 墓地の《粘液獣》モンスター1体を場に戻す
      reviveFromGraveyard(context, (card) => {
        return card.name.includes('粘液獣');
      }, true);
    },
  },
};
```

---

## データ構造

### トリガー登録データ

```javascript
// トリガーレジストリの構造
const triggerRegistry = {
  // トリガータイプごとに配列で管理
  [TRIGGER_TYPES.ON_SUMMON]: [
    {
      cardId: 'C0000004_unique123',
      cardName: 'ゴミあさり粘液獣',
      owner: 1, // プレイヤー番号
      slotIndex: 2, // フィールドスロット
      priority: 0, // 優先度（低い方が先）
      condition: (context) => true, // 発動条件
      effect: (context) => { /* 効果処理 */ },
    },
    // ... その他のトリガー
  ],
  [TRIGGER_TYPES.ON_END_PHASE_SELF]: [
    // ...
  ],
  // ... その他のトリガータイプ
};
```

### コンテキストオブジェクト

トリガー発火時に渡されるコンテキスト情報：

```javascript
const triggerContext = {
  // 基本情報
  currentPlayer: 1,
  currentPhase: 2,
  turn: 5,

  // イベント情報（トリガータイプによって異なる）
  eventType: 'summon', // summon, attack, destroy など
  sourceCard: card, // イベントの発生源カード
  targetCard: targetCard, // ターゲット（存在する場合）
  slotIndex: 2,

  // ゲームステート
  p1Life, p2Life,
  p1Field, p2Field,
  p1Hand, p2Hand,
  p1Deck, p2Deck,
  p1Graveyard, p2Graveyard,

  // Setters
  setP1Life, setP2Life,
  setP1Field, setP2Field,
  // ... その他のsetters

  // ヘルパー
  addLog,
};
```

---

## 実装フェーズ

### Phase 1: 基盤構築 (Week 1)

**目標**: トリガーエンジンの基本機能実装

- [ ] `src/engine/triggerTypes.js` 作成
- [ ] `src/engine/triggerEngine.js` 作成
- [ ] `src/engine/triggerHelpers.js` 作成
- [ ] トリガー登録・発火の基本機能実装
- [ ] magic-spirit.jsx への統合

### Phase 2: 最優先トリガー実装 (Week 2-3)

**目標**: 使用頻度TOP 4のトリガーを実装

- [ ] 【召喚時】トリガー (109カード)
- [ ] 【常時】効果 (58カード)
- [ ] 【自分エンドフェイズ時】トリガー (40カード)
- [ ] 【自壊時】トリガー (30カード)

### Phase 3: 攻撃関連トリガー実装 (Week 4)

**目標**: 戦闘フローのトリガーを実装

- [ ] 【自攻撃時】トリガー (13カード)
- [ ] 【自攻撃後】トリガー (5カード)
- [ ] 【相手モンスター攻撃時】トリガー (5カード)
- [ ] 【被攻撃時】トリガー (3カード)

### Phase 4: フェイズトリガー拡張 (Week 5)

**目標**: その他のフェイズトリガーを実装

- [ ] 【エンドフェイズ時】トリガー (17カード)
- [ ] 【バトルフェイズ開始時】トリガー
- [ ] 【メインフェイズ時】トリガー
- [ ] その他フェイズトリガー

### Phase 5: 特殊トリガー実装 (Week 6)

**目標**: 墓地発動、条件発動など特殊なトリガー

- [ ] 墓地発動トリガー
- [ ] 条件発動トリガー（ライフ閾値など）
- [ ] その他の特殊トリガー

### Phase 6: テスト＆デバッグ (Week 7)

**目標**: 全トリガーの動作確認とバグ修正

- [ ] 各トリガータイプのユニットテスト
- [ ] 統合テスト
- [ ] パフォーマンステスト
- [ ] バグ修正

---

## パフォーマンス考慮事項

### 1. トリガー登録の最適化

```javascript
// インデックスを使った高速検索
const triggersByCard = new Map(); // cardId -> triggers
const triggersByType = new Map(); // triggerType -> triggers
```

### 2. 常時効果の処理

常時効果は毎回計算するとパフォーマンスに影響するため：

```javascript
// キャッシュ機構
const continuousEffectCache = {
  attackModifiers: {},
  hpModifiers: {},
  // ...
};

// フィールド変更時のみ再計算
updateContinuousEffects() {
  // キャッシュをクリア
  continuousEffectCache = {};

  // 全ての常時効果を再計算
  recalculateContinuousEffects();
}
```

### 3. トリガーチェーンの制御

複数トリガーが同時発火する場合の処理順序：

```javascript
// 優先度ベースのソート
const sortedTriggers = triggers.sort((a, b) => {
  // 優先度が低い方が先
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }
  // 優先度が同じ場合は登録順
  return a.registrationOrder - b.registrationOrder;
});
```

---

## まとめ

このトリガーシステム設計により、Magic Spiritの51種類のトリガー効果を体系的に実装できます。

**重要なポイント**:

1. **段階的実装**: 使用頻度の高いトリガーから順に実装
2. **既存システムとの統合**: effectEngine、cardEffects との連携
3. **パフォーマンス**: 常時効果のキャッシュ、インデックス活用
4. **拡張性**: 新しいトリガータイプを簡単に追加可能な設計

次のステップは、各トリガーの詳細な仕様定義ドキュメントの作成です。

---

**関連ドキュメント**:
- `trigger-specifications.md` - 各トリガーの詳細仕様
- `trigger-implementation-guide.md` - 実装ガイド
- `code-structure.md` - コード構造全体図
