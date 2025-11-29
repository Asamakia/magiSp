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

### Phase B-5: placeFieldCard/placePhaseCard のシャドウディスパッチ化 ✅ 完了

| アクション | 優先度 | 複雑度 | 状態 |
|-----------|-------|-------|------|
| placeFieldCard | 低 | 中 | ✅ 完了 |
| placePhaseCard | 低 | 中 | ✅ 完了 |
| useMagicCard | - | - | summonCard経由で既に完了 |

**GameActions.js に追加**:
- `applyPlaceFieldCard()`: フィールドカード配置
- `applyPlacePhaseCard()`: フェイズカード配置

### Phase C: UIの状態参照移行

**目標**: UIコンポーネントの読み取りをengineStateから行う

**対応表（33個のuseState → engineState）**:

| カテゴリ | useState | engineState |
|---------|----------|-------------|
| ゲーム進行 | turn, currentPlayer, phase, isFirstTurn, winner, logs | state.turn, state.currentPlayer, state.phase, state.isFirstTurn, state.winner, state.logs |
| P1基本 | p1Life, p1Deck, p1Hand, p1Field, p1Graveyard | state.p1.life, state.p1.deck, state.p1.hand, state.p1.field, state.p1.graveyard |
| P1リソース | p1ActiveSP, p1RestedSP, p1FieldCard, p1PhaseCard | state.p1.activeSP, state.p1.restedSP, state.p1.fieldCard, state.p1.phaseCard |
| P1状態 | p1StatusEffects, p1NextTurnSPBonus, p1MagicBlocked, p1SpReduction | state.p1.statusEffects, state.p1.nextTurnSPBonus, state.p1.magicBlocked, state.p1.spReduction |
| P2 | （P1と同様） | state.p2.* |
| ターンフラグ | chargeUsedThisTurn | state.turnFlags.chargeUsedThisTurn |

#### Phase C-1: 互換レイヤー変数の導入 ✅ 完了

**実装内容**:
- 33個の互換レイヤー変数を追加（`*FromEngine` 命名規則）
- 検証ツール `verifyStateSync()` を全33項目に拡張
- 開発コンソールから `window.magicSpirit.verifySync()` で呼び出し可能

```javascript
// 既存のuseState
const [p1Life, setP1Life] = useState(INITIAL_LIFE);

// engineStateからの読み取り（互換レイヤー）
const p1LifeFromEngine = engineState?.p1?.life ?? INITIAL_LIFE;

// 検証用（開発中）
if (p1Life !== p1LifeFromEngine) {
  console.warn('State mismatch: p1Life', { useState: p1Life, engineState: p1LifeFromEngine });
}
```

**優先順位**:
1. 読み取り専用状態（logs, winner, isFirstTurn）
2. 表示用状態（life, SP, field）
3. ロジック参照状態（hand, deck, graveyard）

#### Phase C-2: UIの一部で互換レイヤー変数を使用 ✅ 完了

**実装内容**:
- 読み取り専用で影響が小さい3つの状態を互換レイヤー変数に置き換え
- `logs` → `logsFromEngine`（GameLogコンポーネント）
- `winner` → `winnerFromEngine`（ゲームオーバー画面）
- `isFirstTurn` → `isFirstTurnFromEngine`（バトルフェイズ判定、AI用データ）

```javascript
// Before
<GameLog logs={logs} />
プレイヤー{winner}の勝利！
if (isFirstTurn && currentPlayer === 1)

// After (Phase C-2)
<GameLog logs={logsFromEngine} />
プレイヤー{winnerFromEngine}の勝利！
if (isFirstTurnFromEngine && currentPlayer === 1)
```

**注意**: 依存配列（useCallback等）にはuseStateを維持（変更検出用）

#### Phase C-3: 段階的置き換え ✅ 完了

**Step 1: UI表示のみに使用される状態** ✅ (Phase C-2で完了)
- `logs` → `logsFromEngine`
- `winner` → `winnerFromEngine`
- `isFirstTurn` → `isFirstTurnFromEngine`

**Step 2: 数値表示状態** ✅ 完了
- `p1Life`, `p2Life` → `p1LifeFromEngine`, `p2LifeFromEngine`（ライフバー表示）
- `p1ActiveSP`, `p2ActiveSP` → `p1ActiveSPFromEngine`, `p2ActiveSPFromEngine`（SP表示・SPチャージボタン）
- `p1RestedSP`, `p2RestedSP` → `p1RestedSPFromEngine`, `p2RestedSPFromEngine`（SP表示・SPTokensコンポーネント）

**Step 3: 配列状態** ✅ 完了
- `p1Field`, `p2Field` → `p1FieldFromEngine`, `p2FieldFromEngine`（モンスターゾーン表示、スキルパネル）
- `p1Hand`, `p2Hand` → `p1HandFromEngine`, `p2HandFromEngine`（手札表示）
- `p1Deck`, `p2Deck` → `p1DeckFromEngine`, `p2DeckFromEngine`（デッキ枚数表示）
- `p1Graveyard`, `p2Graveyard` → `p1GraveyardFromEngine`, `p2GraveyardFromEngine`（墓地枚数表示）

**Step 4: カード状態** ✅ 完了
- `p1FieldCard`, `p2FieldCard` → `p1FieldCardFromEngine`, `p2FieldCardFromEngine`（フィールドカード表示）
- `p1PhaseCard`, `p2PhaseCard` → `p1PhaseCardFromEngine`, `p2PhaseCardFromEngine`（フェイズカード表示）

**注意**: 依存配列（useCallback等）およびロジック内の条件判定はuseStateを維持（変更検出・ロジック一貫性のため）

#### Phase C リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| シャドウディスパッチ漏れ | 中 | 検証ツールで検出 |
| 二重管理中の不整合 | 高 | 段階的移行、ロールバック可能に |
| パフォーマンス劣化 | 低 | 必要に応じてuseMemo |
| UIコンポーネント破壊 | 中 | コンポーネント単位でテスト |

### Phase D: useState削除（最終目標）

**目標**:
1. `engineState` が唯一の状態源泉
2. UIは `engineState` を参照、アクションは `dispatch` 経由
3. magic-spirit.jsx のロジック行数を大幅削減
4. 33個のuseState → 1個のengineState

#### Phase D 実行条件

- Phase C-3 完了（全UIがengineStateを参照） ✅
- 検証ツールで不整合ゼロを確認
- 主要ゲームフローのE2Eテスト通過

#### Phase D 現状分析

**set*関数の使用状況** (約500箇所):
- useState宣言: 33箇所
- legacyStateSync: ~60箇所（initGame後の同期）
- エフェクトコンテキスト: ~100箇所（effectHelpers, cardEffectsに渡される）
- 直接状態更新: ~300箇所（processPhase, summonCard, attack等）

**課題**:
1. effectHelpers.jsは`set*`関数をcontextで受け取り直接呼び出す
2. cardEffects/*.jsも同様にcontext経由で`set*`を使用
3. 状態異常ヘルパー（processStatusEffectsTurnStart等）も`set*`を使用
4. これらを全てdispatch経由に変更するのは大規模リファクタリング

#### Phase D 実装戦略

**アプローチ: 段階的な移行**

```
Phase D-1: シャドウディスパッチ箇所の整理
├── 目的: dispatch呼び出しがある箇所でuseState更新を削除
├── 対象: summonCard, attack, nextPhase, processPhase等
├── リスク: 低（既にdispatchで状態が更新されている）
└── 削減: ~50箇所のset*呼び出し

Phase D-2: legacyStateSync削除
├── 目的: initGame後の同期処理を削除
├── 対象: initializeGameFromEngine()のset*呼び出し群
├── 前提: initGameがdispatch経由で完結している
└── 削減: ~60箇所のset*呼び出し

Phase D-3: useState宣言削除（第1弾: 読み取り専用）
├── 目的: UI表示のみに使用されるuseStateを削除
├── 対象: turn, currentPlayer, phase, isFirstTurn, winner, logs
├── 方法: *FromEngine変数を直接使用（リネーム不要）
└── 削減: 6個のuseState

Phase D-4: 効果コンテキストの移行
├── 目的: effectHelpers/cardEffectsをdispatch対応に
├── 対象: set*をcontextで受け取る全関数
├── 方法: dispatchとアクション関数をcontextに追加
├── リスク: 高（50+ファイルに影響）
└── 検討: Phase D-4は将来の拡張として保留も可

Phase D-5: useState宣言削除（第2弾: 残り全て）
├── 目的: 残り27個のuseStateを削除
├── 前提: Phase D-4完了
└── 削減: 27個のuseState
```

#### Phase D-1 詳細設計

**対象**: シャドウディスパッチ箇所（Phase Bで追加）

既にdispatchを呼び出している箇所から、冗長なuseState更新を削除:

```javascript
// Before (シャドウディスパッチ)
setPhase(newPhase);  // useState更新
dispatch(gameActions.setPhase(newPhase));  // dispatch更新

// After (dispatchのみ)
dispatch(gameActions.setPhase(newPhase));
```

**対象関数**:
1. `nextPhase()` - setPhase呼び出し削除
2. `processPhase()` - 各フェイズのset*呼び出し削除
3. `summonCard()` - setField, setHand, setSP呼び出し削除
4. `executeAttack()` - setLife, setField呼び出し削除
5. `chargeCard()` / `chargeSP()` - 関連set*呼び出し削除
6. `executeSkill()` - usedSkillThisTurnフラグのset削除
7. `placeFieldCard()` / `placePhaseCard()` - set*呼び出し削除

**注意点**:
- 依存配列はそのまま維持（変更検出に必要）
- エフェクトコンテキストに渡すset*は残す（Phase D-4で対応）

#### Phase D-2 詳細設計

**対象**: `initializeGameFromEngine()` 関数

```javascript
// Before
const initializeGameFromEngine = useCallback((legacy) => {
  setTurn(legacy.turn);
  setCurrentPlayer(legacy.currentPlayer);
  // ... 60行のset*呼び出し
}, []);

// After
// 関数自体を削除（useEffectからの呼び出しも削除）
```

**前提**:
- `initGame()`が`dispatch(gameActions.initGame(...))`を呼び出し済み
- engineStateが初期化されている
- UIは*FromEngine変数を参照している

#### Phase D-3 詳細設計

**対象**: 読み取り専用の6個のuseState

```javascript
// Before
const [turn, setTurn] = useState(1);
const turnFromEngine = engineState?.turn ?? 1;

// After
const turn = engineState?.turn ?? 1;
// setTurnは削除（dispatch経由のみ）
```

**削除対象**:
- `[turn, setTurn]`
- `[currentPlayer, setCurrentPlayer]`
- `[phase, setPhase]`
- `[isFirstTurn, setIsFirstTurn]`
- `[winner, setWinner]`
- `[logs, setLogs]` → `addLog`関数も要修正

**特別な考慮: addLog関数**
```javascript
// Before
const addLog = useCallback((message, type = 'info') => {
  setLogs(prev => [...prev, { message, type, timestamp: Date.now() }]);
}, []);

// After
const addLog = useCallback((message, type = 'info') => {
  dispatch(gameActions.addLog(message, type));
}, [dispatch]);
```

#### Phase D リスク評価

| Phase | リスク | 影響範囲 | ロールバック容易性 |
|-------|-------|---------|-----------------|
| D-1 | 低 | magic-spirit.jsx | 高（git revert） |
| D-2 | 低 | magic-spirit.jsx | 高 |
| D-3 | 中 | magic-spirit.jsx + 依存配列 | 高 |
| D-4 | 高 | 50+ファイル | 中 |
| D-5 | 高 | 全体 | 低 |

#### 推奨実装順序

1. **Phase D-1**: シャドウディスパッチ箇所整理（本セッション）
2. **Phase D-2**: legacyStateSync削除（本セッション）
3. **Phase D-3**: 読み取り専用useState削除（本セッション）
4. **Phase D-4**: 将来の拡張として保留（大規模リファクタリング）
5. **Phase D-5**: Phase D-4完了後に実施

**Phase D-1〜D-3で達成されること**:
- 冗長なuseState更新の削除
- 読み取り専用useStateの削除（6個）
- legacyStateSync関数の削除
- コード行数: 約200行削減見込み

---

## 8. 成功基準

1. **既存機能維持**: 全ての現行機能が動作
2. **useState削減**: 33個 → 1個（GameState）
3. **コード削減**: 目標 500行以上削減
4. **テスト**: 既存テスト + 新規統合テスト全パス
