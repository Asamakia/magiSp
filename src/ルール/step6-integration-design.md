# Step 6: magic-spirit.jsx 統合設計書

作成日: 2025-11-29

---

## 1. 現状分析

### 1.1 useState 分類

**ゲーム状態（GameEngineに移行）: 33個**

| カテゴリ | useState | 備考 |
|---------|----------|------|
| ゲーム進行 | turn, currentPlayer, phase, isFirstTurn, winner, logs | 6個 |
| P1基本 | p1Life, p1Deck, p1Hand, p1Field, p1Graveyard | 5個 |
| P1リソース | p1ActiveSP, p1RestedSP, p1FieldCard, p1PhaseCard | 4個 |
| P2基本 | p2Life, p2Deck, p2Hand, p2Field, p2Graveyard | 5個 |
| P2リソース | p2ActiveSP, p2RestedSP, p2FieldCard, p2PhaseCard | 4個 |
| 状態異常 | p1StatusEffects, p2StatusEffects | 2個 |
| SP修正 | p1NextTurnSPBonus, p2NextTurnSPBonus | 2個 |
| 魔法制限 | p1MagicBlocked, p2MagicBlocked | 2個 |
| SP減少 | p1SpReduction, p2SpReduction | 2個 |
| ターンフラグ | chargeUsedThisTurn | 1個 |

**UI状態（維持）: ~35個**

| カテゴリ | useState | 備考 |
|---------|----------|------|
| 画面制御 | gameState, allCards, isLoadingCards | 画面遷移 |
| コレクション | playerData, cardValueMap, pendingPackCards, etc. | 別システム |
| 選択状態 | selectedHandCard, selectedFieldMonster, attackingMonster | UI専用 |
| モーダル | showGraveyardViewer, pendingDeckReview, etc. | UI専用 |
| AI制御 | p1PlayerType, aiThinkingSpeed, aiAttackedMonsters, etc. | AI用 |

---

## 2. 統合方針

### 2.1 段階的移行

```
Phase A: ゲーム状態統合
├── 1. useGameEngine() を導入
├── 2. 33個のuseStateを1つのGameStateに統合
├── 3. 互換レイヤーで既存コードを維持
└── 4. テスト・検証

Phase B: アクション移行
├── 1. initGame → GameEngine版
├── 2. processPhase → dispatch版
├── 3. summonCard, attack等 → dispatch版
└── 4. 旧コード削除
```

### 2.2 互換レイヤー

既存コードが `p1Life`, `setP1Life` 等を直接使用しているため、
互換変数を提供して段階的に移行：

```javascript
// GameEngine状態
const { state: engineState, dispatch } = useGameEngine();

// 互換レイヤー（読み取り専用）
const p1Life = engineState?.p1?.life ?? INITIAL_LIFE;
const p1Hand = engineState?.p1?.hand ?? [];
// ... 他の状態も同様

// 互換レイヤー（更新用）- dispatch経由
const setP1Life = useCallback((updater) => {
  // 将来的にはdispatch版に置き換え
  // 現在は直接状態更新も許可
}, []);
```

---

## 3. 実装計画

### 3.1 Phase A-1: GameEngine導入

**変更内容**:
1. `useGameEngine()` をコンポーネントに追加
2. `engineState` と `dispatch` を取得
3. 既存useStateは一旦維持（二重管理）

```javascript
// 追加
const {
  state: engineState,
  dispatch,
  initGame: engineInitGame,
} = useGameEngine();
```

### 3.2 Phase A-2: initGame統合

**変更内容**:
1. 既存 `initGame()` を修正
2. GameEngine版 `engineInitGame()` を呼び出し
3. 既存useStateへの同期も維持（互換性）

```javascript
const initGame = useCallback(() => {
  // デッキ生成
  const deck1 = createDeckFromPrebuilt(...);
  const deck2 = createDeckFromPrebuilt(...);

  // GameEngine初期化
  const initialState = engineInitGame({ deck1, deck2 });

  // 既存useStateに同期（互換性）
  setP1Life(initialState.p1.life);
  setP1Deck(initialState.p1.deck);
  // ... 他も同様

  // トリガー登録等
  clearAllTriggers();
  // ...
}, [...]);
```

### 3.3 Phase A-3: 状態参照の移行

**優先順位**:
1. 読み取り専用の参照を `engineState` に変更
2. UI表示に使われる状態から順次移行
3. ロジック内の参照は最後（影響範囲大）

```javascript
// Before
const p1Life = useState(...)[0];

// After
const p1Life = engineState?.p1?.life ?? INITIAL_LIFE;
```

### 3.4 Phase B: アクション移行

**課題**:
- magic-spirit.jsxのアクション関数は複雑（チェーンポイント、トリガー等）
- GameActions.jsのアクションは単純化版
- 完全な置き換えは大規模変更

**アプローチ: シャドウディスパッチ**
```javascript
// 既存のuseState更新と並行してdispatchを呼び出す
// 同期機構により両者は同じ状態になるはず
const nextPhase = () => {
  // 既存ロジック（チェーン確認等）
  if (phase === 3) {
    setPhase(4);      // useState更新
    // dispatch(actions.nextPhase());  // シャドウ（テスト用）
    processPhase(4);
  }
};
```

**優先順位**:
1. `nextPhase()` - シンプル
2. `summonCard()` - 基本アクション
3. `attack()` - 複雑だが重要
4. `processPhase()` - 最も複雑

---

## 4. リスクと対策

### 4.1 リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| 二重管理による不整合 | 高 | 同期処理を徹底、テスト |
| 既存機能の破壊 | 高 | 互換レイヤー、段階的移行 |
| パフォーマンス低下 | 中 | プロファイリング |
| 複雑なトリガー/効果の不具合 | 高 | 個別テスト |

### 4.2 ロールバック計画

- Git ブランチで作業
- 各Phase完了時にコミット
- 問題発生時は前Phaseに戻る

---

## 5. 実装順序

```
1. [x] 設計書作成（本ドキュメント）
2. [x] Phase A-1: useGameEngine導入
3. [x] Phase A-2: initGame統合
4. [x] Phase A-3: 状態同期機構 + 検証ツール
5. [x] Phase B-1: nextPhase/processPhase移行（シャドウディスパッチ）
   - SET_PHASEアクション追加
   - nextPhase, processPhase, proceedToBattlePhase更新
6. [x] Phase B-2: summonCard/attack移行（シャドウディスパッチ）
   - summonCard: cardIndexを取得してモンスター・魔法カード発動時にdispatch
   - executeAttack: 攻撃完了時にgameActions.attackをdispatch
   - 複雑なロジックはUIに残し、結果をengineStateに同期
7. [x] 動作確認・テスト（41テスト成功）
8. [ ] 旧useState削除（将来）
```

---

## 6. 現在の統合状態（2025-11-29）

### 達成済み

- **ヘッドレス対戦**: GameEngineを使ったAI同士の対戦シミュレーションが可能
- **トーナメントシステム**: Tournament.jsで投資システム用のNPCトーナメント実行可能
- **フェイズ遷移のdispatch化**: nextPhase, processPhaseがdispatch経由で状態更新
- **summonCard/attackのdispatch化**: 召喚・攻撃もengineStateに同期

### 統合アーキテクチャ

```
現在の状態（シャドウディスパッチ方式）:
┌──────────────────┐    ┌──────────────────┐
│   magic-spirit   │    │   GameEngine     │
│   (useState)     │    │   (engineState)  │
├──────────────────┤    ├──────────────────┤
│ setPhase(3)      │◀──▶│ dispatch(SET_PHASE)│
│ setP1Field(...)  │    │ applyAction(...) │
└──────────────────┘    └──────────────────┘
         │                       │
         ▼                       ▼
      UI表示                ヘッドレス対戦

将来の目標（完全dispatch方式）:
┌──────────────────┐
│   GameEngine     │◀── dispatch(action)
│   (single state) │
├──────────────────┤
│ UI: engineState  │───▶ React表示
│ Sim: pure func   │───▶ ヘッドレス対戦
└──────────────────┘
```

### 残課題

1. **useStateの完全削除**: シャドウディスパッチ方式で両方更新中、将来的にはengineStateのみに
2. **状態同期の最適化**: 現在は手動同期、将来はuseEffect自動同期
3. **トリガー/常時効果のengineState統合**: triggerEnginePure/effectHelpersPureは実装済み、統合は将来

---

## 7. 次のステップ（Phase B-3以降）

### Phase B-3: 補助アクションのシャドウディスパッチ化 ✅ 完了

| アクション | 優先度 | 複雑度 | 状態 |
|-----------|-------|-------|------|
| chargeCard | 中 | 低 | ✅ 完了 |
| chargeSP | 中 | 低 | ✅ 完了 |

### Phase B-4: executeSkill のシャドウディスパッチ化 ✅ 完了

**アプローチ**: 効果実行はUIに残し、結果（usedSkillThisTurn）のみをengineStateに同期

```javascript
// 技発動成功時にdispatch
if (success !== false) {
  // ... 既存のuseState更新 ...
  dispatch(gameActions.executeSkill(monsterIndex, skillType));
}
```

**依存関係（31個）**:
- 状態読み取り: 12個（currentPlayer, p1/p2 Field/Hand/Deck/Graveyard, p1/p2 ActiveSP/RestedSP）
- 状態更新: 16個（set系）
- UI: 3個（addLog, setPendingMonsterTarget, setPendingHandSelection）
- 外部エンジン: statusEffectEngine, executeSkillEffects

### Phase B-5: 残りアクション（将来）

| アクション | 優先度 | 複雑度 | 備考 |
|-----------|-------|-------|------|
| placeFieldCard | 低 | 中 | フィールドカード配置 |
| useMagicCard | 中 | 高 | effectEngine統合必要 |

### Phase C: UIの状態参照移行（将来）

1. UIコンポーネントが `engineState` を直接参照
2. 互換レイヤー (`p1Life = engineState?.p1?.life ?? INITIAL_LIFE`) を活用
3. 読み取り専用参照から段階的に移行

### Phase D: useState削除（最終目標）

1. `engineState` が唯一の状態源泉
2. UIは `engineState` を参照、アクションは `dispatch` 経由
3. magic-spirit.jsx のロジック行数を大幅削減

---

## 8. 成功基準

1. **既存機能維持**: 全ての現行機能が動作
2. **useState削減**: 33個 → 1個（GameState）
3. **コード削減**: 目標 500行以上削減
4. **テスト**: 既存テスト + 新規統合テスト全パス
