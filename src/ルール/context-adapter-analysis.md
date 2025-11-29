# contextアダプター調査結果

作成日: 2025-11-29

---

## 1. サマリー

### 必要なcontextプロパティ総数

| カテゴリ | 項目数 | 対応難易度 |
|---------|--------|-----------|
| 基本プロパティ（読み取り） | 12 | ✅ 容易 |
| setter（getPlayerContext経由） | 24 | ✅ 容易 |
| UI選択系 | 5種類 | ⚠️ 自動選択必要 |
| 特殊プロパティ | 4種類 | ❌ 要対応 |

---

## 2. 基本プロパティ（context から直接取得）

| プロパティ | 使用箇所 | 対応方法 |
|-----------|---------|---------|
| addLog | 287箇所 | state更新で対応 |
| monsterIndex | 41箇所 | 引数として渡す |
| card | 27箇所 | 引数として渡す |
| slotIndex | 18箇所 | 引数として渡す |
| currentPlayer | 6箇所 | stateから取得 |
| destroyedCard | 3箇所 | 引数として渡す |
| attackerIndex | 3箇所 | 引数として渡す |
| targetIndex | 2箇所 | 引数として渡す |
| phaseCard | 1箇所 | stateから取得 |
| leavingCard | 1箇所 | 引数として渡す |
| destroyedTarget | 1箇所 | 引数として渡す |
| attacker | 1箇所 | 引数として渡す |

**対応方針**: stateから動的に取得、または引数として渡す。問題なし。

---

## 3. getPlayerContext() が返すプロパティ

### 3.1 読み取り専用（12項目）

| プロパティ | 説明 |
|-----------|------|
| myField | 自分のフィールド |
| opponentField | 相手のフィールド |
| myHand | 自分の手札 |
| opponentHand | 相手の手札 |
| myDeck | 自分のデッキ |
| opponentDeck | 相手のデッキ |
| myGraveyard | 自分の墓地 |
| opponentGraveyard | 相手の墓地 |
| myLife | 自分のライフ |
| opponentLife | 相手のライフ |
| myActiveSP / myRestedSP | 自分のSP |
| myFieldCard / myPhaseCard | 自分のフィールド/フェイズカード |

**対応方針**: stateから動的に計算。問題なし。

### 3.2 setter（24項目）

| カテゴリ | setter一覧 |
|---------|-----------|
| フィールド | setMyField, setOpponentField |
| 手札 | setMyHand, setOpponentHand |
| デッキ | setMyDeck, setOpponentDeck |
| 墓地 | setMyGraveyard, setOpponentGraveyard |
| ライフ | setMyLife, setOpponentLife |
| SP（アクティブ） | setMyActiveSP, setOpponentActiveSP |
| SP（レスト） | setMyRestedSP, setOpponentRestedSP |
| フィールドカード | setMyFieldCard, setOpponentFieldCard |
| フェイズカード | setMyPhaseCard, setOpponentPhaseCard |

**対応方針**: 内部でstate更新する関数を生成。問題なし。

---

## 4. UI選択系（5種類、計181箇所）⚠️

| 関数名 | 使用箇所 | 用途 |
|-------|---------|------|
| setPendingTargetSelection | 84箇所 | モンスターターゲット選択 |
| setPendingDeckReview | 45箇所 | デッキからカード選択 |
| setPendingHandSelection | 22箇所 | 手札からカード選択 |
| setPendingMonsterTarget | 15箇所 | モンスター対象選択 |
| setPendingGraveyardSelection | 15箇所 | 墓地からカード選択 |

### 使用パターン例

```javascript
// setPendingTargetSelection
setPendingTargetSelection({
  message: '攻撃対象を選択',
  validTargets: [0, 1, 2],  // 有効なスロットインデックス
  isOpponent: true,
  callback: (targetIndex) => {
    // 選択後の処理
  },
});

// setPendingDeckReview
setPendingDeckReview({
  message: 'サーチするカードを選択',
  cards: filteredCards,  // 選択可能なカード配列
  callback: (selectedCard) => {
    // 選択後の処理
  },
});

// setPendingHandSelection
setPendingHandSelection({
  message: '捨てるカードを選択',
  count: 1,  // 選択枚数
  callback: (selectedIndices) => {
    // 選択後の処理
  },
});
```

### 対応方針: 自動選択

```javascript
// contextAdapter内で自動選択ロジックを実装
setPendingTargetSelection: (options) => {
  // 最もHPが低いターゲットを選択（または最初の候補）
  const autoTarget = selectBestTarget(options.validTargets, currentState);
  options.callback(autoTarget);
},

setPendingDeckReview: (options) => {
  // 最初のカードを選択
  const autoCard = options.cards[0];
  options.callback(autoCard);
},

setPendingHandSelection: (options) => {
  // 最初のN枚を選択
  const autoIndices = Array.from({ length: options.count }, (_, i) => i);
  options.callback(autoIndices);
},
```

**リスク**:
- 自動選択が最適でない場合、シミュレーション結果の精度が下がる
- 複雑な選択条件（属性指定など）への対応が必要

---

## 5. 特殊プロパティ ❌

### 5.1 setP1MagicBlocked / setP2MagicBlocked

**使用箇所**: `src/engine/cardEffects/primitive.js` (1箇所)

```javascript
// 原始属性カードの効果で魔法をブロック
const { setP1MagicBlocked, setP2MagicBlocked } = context;
if (currentPlayer === 1) {
  setP2MagicBlocked(true);
} else {
  setP1MagicBlocked(true);
}
```

**対応方針**:
- GameStateにmagicBlockedフラグを追加
- contextアダプターで対応可能

---

### 5.2 registerCardTriggers / continuousEffectEngine

**使用箇所**:
- `src/engine/cardEffects/light.js` (1箇所)
- `src/engine/cardTriggers/darkCards.js` (1箇所)

```javascript
// 光属性: フィールドに召喚効果
registerCardTriggers(monsterInstance, currentPlayer, targetSlot);
continuousEffectEngine.register(monsterInstance, currentPlayer);

// 闘属性: フィールドカード設置効果
registerCardTriggers(fieldCard, currentPlayer, null);
continuousEffectEngine.register(fieldCard, currentPlayer);
```

**対応方針**:
- Pure版の関数（registerCardTriggersPure, continuousEffectEnginePure）を使用
- contextアダプターでPure版にディスパッチ

---

### 5.3 setShowGraveyardViewer

**使用箇所**: `src/engine/effectHelpers.js`, `src/engine/cardEffects/water.js`

```javascript
// 墓地表示UI
setShowGraveyardViewer({ player: targetPlayer });
```

**対応方針**:
- シミュレーションではUI不要
- 空の関数として実装（何もしない）

---

## 6. 危険度評価

### ✅ 問題なし（対応可能）

| 項目 | 理由 |
|------|------|
| 基本プロパティ | 単純な値の受け渡し |
| getPlayerContext経由のsetter | パターン化されている |
| setShowGraveyardViewer | UI専用、無視可能 |

### ⚠️ 注意が必要

| 項目 | リスク | 軽減策 |
|------|-------|--------|
| UI選択系（181箇所） | 自動選択の精度 | シンプルな選択ロジック |
| setP1/2MagicBlocked | GameState拡張必要 | フラグ追加 |

### ❌ 重大な対応が必要

| 項目 | リスク | 対応 |
|------|-------|------|
| registerCardTriggers | グローバルレジストリ依存 | Pure版へディスパッチ |
| continuousEffectEngine | グローバル状態依存 | Pure版作成必要 |

---

## 7. 実装チェックリスト

### contextAdapter.js で実装が必要なもの

```javascript
createPureContext(state) {
  return {
    // === 基本プロパティ ===
    currentPlayer: state.currentPlayer,
    addLog: (msg, type) => { ... },

    // === getPlayerContext互換 ===
    // 読み取り
    get p1Field() { return state.p1.field; },
    get p2Field() { return state.p2.field; },
    // ... 全12項目

    // setter
    setP1Field: (updater) => { ... },
    setP2Field: (updater) => { ... },
    // ... 全24項目

    // === UI選択系（自動選択） ===
    setPendingTargetSelection: (options) => { autoSelect... },
    setPendingDeckReview: (options) => { autoSelect... },
    setPendingHandSelection: (options) => { autoSelect... },
    setPendingMonsterTarget: (options) => { autoSelect... },
    setPendingGraveyardSelection: (options) => { autoSelect... },

    // === 特殊 ===
    setP1MagicBlocked: (value) => { ... },
    setP2MagicBlocked: (value) => { ... },
    setShowGraveyardViewer: () => { /* no-op */ },

    // === エンジン連携 ===
    registerCardTriggers: (card, owner, slot) => {
      currentState = registerCardTriggersPure(currentState, card, owner, slot);
    },
    continuousEffectEngine: {
      register: (card, owner) => { ... },
      unregister: (uniqueId) => { ... },
    },

    // === 最終state取得 ===
    getState: () => currentState,
  };
}
```

---

## 8. 結論

### 対応可能性: ✅ 可能

全てのパターンはcontextアダプターで対応可能。

### 追加作業

| 作業 | 見積もり |
|------|---------|
| 基本setter実装 | ~100行 |
| getPlayerContext互換 | ~50行 |
| UI選択自動化 | ~80行 |
| 特殊プロパティ対応 | ~50行 |
| エンジン連携 | ~30行 |
| **合計** | **~310行** |

### 懸念事項

1. **UI選択の精度**: 自動選択が最適でない場合あり
   - 対策: 基本的なヒューリスティック（HP低い敵を優先など）

2. **continuousEffectEngine**: Pure版が必要
   - 別途200行程度の実装が必要

3. **デバッグ難易度**: 複雑な効果でバグが出た場合の追跡が困難
   - 対策: 詳細なログ出力

---

**作成日**: 2025-11-29
**作成者**: Claude
