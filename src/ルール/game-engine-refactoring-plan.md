# ゲームエンジン分離リファクタリング計画

作成日: 2025-11-29
ステータス: **実装中** (Step 1-5 完了、Step 4 エンジン統合完了)

---

## 1. 背景と目的

### 1.1 現状の問題点

```
magic-spirit.jsx (5,909行)
├── useState × 70個           ← React依存
├── ゲームロジック (~3,900行)  ← UIと密結合
│   ├── initGame()
│   ├── processPhase()
│   ├── summonCard()
│   ├── attack() / executeAttack()
│   ├── executeSkill()
│   ├── chargeCard() / chargeSP()
│   └── その他アクション
└── UIレンダリング (~2,000行)
```

**問題**:
1. ゲームロジックがReact hooks（useState, useCallback）に依存
2. ヘッドレス（UIなし）実行が不可能
3. AI対戦シミュレーション（オッズ計算等）ができない
4. ユニットテストが困難
5. リプレイ機能の実装が困難

### 1.2 目的

1. **ヘッドレス対戦の実現**: AI同士の高速シミュレーション
2. **テスタビリティ向上**: 純粋関数によるユニットテスト
3. **コードの保守性向上**: ロジックとUIの明確な分離
4. **将来の拡張性**: リプレイ、オンライン対戦、強化学習

---

## 2. 目標とする構造

### 2.1 新しいアーキテクチャ

```
src/engine/
├── gameEngine/                  # 新規作成 ⭐
│   ├── index.js                 # エクスポート
│   ├── GameState.js             # ゲーム状態の型定義と初期化
│   ├── GameActions.js           # アクション関数（純粋関数）
│   ├── GameFlow.js              # フェイズ進行ロジック
│   ├── GameRules.js             # ルール判定（勝敗、コスト計算等）
│   └── Simulator.js             # ヘッドレス対戦実行
│
├── effectEngine.js              # 既存（そのまま使用）
├── effectHelpers.js             # 既存（そのまま使用）
├── triggerEngine.js             # 既存（軽微な修正）
├── continuousEffects/           # 既存（そのまま使用）
├── statusEffects/               # 既存（そのまま使用）
├── keywordAbilities/            # 既存（そのまま使用）
└── ai/                          # 既存（アダプター追加）

src/magic-spirit.jsx             # UIアダプター化（ロジック大幅削減）
```

### 2.2 データフロー

```
【現在】
React Component (magic-spirit.jsx)
    ├── useState (状態管理)
    ├── useCallback (ロジック)
    └── JSX (UI)

【変更後】
GameEngine (純粋JavaScript)
    ├── GameState (プレーンオブジェクト)
    ├── GameActions (純粋関数)
    └── applyAction(state, action) → newState

        ↓ 使用

React Component (magic-spirit.jsx)
    ├── useState({ gameState }) ← GameStateを保持
    ├── dispatch(action) → setGameState(applyAction(...))
    └── JSX (UI) ← gameStateを参照
```

---

## 3. GameState 設計

### 3.1 状態オブジェクト構造

```javascript
/**
 * @typedef {Object} GameState
 */
const GameState = {
  // ゲーム進行
  turn: 1,                      // 現在のターン数
  currentPlayer: 1,             // 現在のプレイヤー (1 or 2)
  phase: 0,                     // 現在のフェイズ (0-4)
  isFirstTurn: true,            // 先攻1ターン目フラグ
  winner: null,                 // 勝者 (null, 1, or 2)
  gameStatus: 'playing',        // 'playing', 'gameOver'

  // プレイヤー1
  p1: {
    life: 6000,
    deck: [],                   // Card[]
    hand: [],                   // Card[]
    field: [null, null, null, null, null],  // (Monster | null)[]
    graveyard: [],              // Card[]
    activeSP: 1,
    restedSP: 0,
    fieldCard: null,            // Card | null
    phaseCard: null,            // Card | null
    statusEffects: [],          // StatusEffect[]
    nextTurnSPBonus: 0,
    magicBlocked: false,
    spReduction: 0,
  },

  // プレイヤー2
  p2: {
    // p1と同じ構造
  },

  // ターン内フラグ
  turnFlags: {
    chargeUsedThisTurn: false,
    attackedMonsters: new Set(), // 攻撃済みモンスターのuniqueId
  },

  // ログ（オプション）
  logs: [],                     // { message, type }[]
};
```

### 3.2 初期化関数

```javascript
/**
 * 初期ゲーム状態を生成
 * @param {Object} config - { deck1, deck2, firstPlayer? }
 * @returns {GameState}
 */
function createInitialState(config) {
  const { deck1, deck2, firstPlayer = Math.random() < 0.5 ? 1 : 2 } = config;

  return {
    turn: 1,
    currentPlayer: firstPlayer,
    phase: 0,
    isFirstTurn: true,
    winner: null,
    gameStatus: 'playing',
    p1: createPlayerState(deck1),
    p2: createPlayerState(deck2),
    turnFlags: createTurnFlags(),
    logs: [{ message: `P${firstPlayer}が先行`, type: 'info' }],
  };
}
```

---

## 4. GameActions 設計

### 4.1 アクション型定義

```javascript
/**
 * @typedef {Object} GameAction
 * @property {string} type - アクションタイプ
 * @property {Object} payload - アクションデータ
 */

const ACTION_TYPES = {
  // フェイズ進行
  PROCESS_PHASE: 'PROCESS_PHASE',
  NEXT_PHASE: 'NEXT_PHASE',
  END_TURN: 'END_TURN',

  // カードアクション
  SUMMON_CARD: 'SUMMON_CARD',
  ATTACK: 'ATTACK',
  EXECUTE_SKILL: 'EXECUTE_SKILL',
  CHARGE_CARD: 'CHARGE_CARD',
  CHARGE_SP: 'CHARGE_SP',
  USE_MAGIC: 'USE_MAGIC',
  PLACE_FIELD_CARD: 'PLACE_FIELD_CARD',
  CHARGE_PHASE_CARD: 'CHARGE_PHASE_CARD',

  // トリガー
  ACTIVATE_TRIGGER: 'ACTIVATE_TRIGGER',

  // 特殊
  DRAW_CARD: 'DRAW_CARD',
  DISCARD_CARD: 'DISCARD_CARD',
  DESTROY_MONSTER: 'DESTROY_MONSTER',
};
```

### 4.2 アクション適用関数

```javascript
/**
 * アクションを適用して新しい状態を返す（純粋関数）
 * @param {GameState} state - 現在の状態
 * @param {GameAction} action - 適用するアクション
 * @returns {GameState} - 新しい状態
 */
function applyAction(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SUMMON_CARD:
      return applySummonCard(state, action.payload);
    case ACTION_TYPES.ATTACK:
      return applyAttack(state, action.payload);
    case ACTION_TYPES.EXECUTE_SKILL:
      return applyExecuteSkill(state, action.payload);
    case ACTION_TYPES.PROCESS_PHASE:
      return applyProcessPhase(state, action.payload);
    // ... 他のアクション
    default:
      return state;
  }
}
```

### 4.3 個別アクション実装例

```javascript
/**
 * カード召喚
 * @param {GameState} state
 * @param {Object} payload - { cardIndex, slotIndex }
 * @returns {GameState}
 */
function applySummonCard(state, { cardIndex, slotIndex }) {
  const player = getPlayer(state, state.currentPlayer);
  const card = player.hand[cardIndex];

  // バリデーション
  if (!card) return state;
  if (card.cost > player.activeSP) return state;
  if (player.field[slotIndex] !== null) return state;

  // 新しい状態を構築
  const monster = createMonsterInstance(card);
  const newHand = player.hand.filter((_, i) => i !== cardIndex);
  const newField = [...player.field];
  newField[slotIndex] = monster;
  const newActiveSP = player.activeSP - card.cost;

  // プレイヤー状態を更新
  const newPlayerState = {
    ...player,
    hand: newHand,
    field: newField,
    activeSP: newActiveSP,
  };

  // トリガー発火（副作用を状態に含める）
  let newState = updatePlayer(state, state.currentPlayer, newPlayerState);
  newState = fireSummonTriggers(newState, monster, slotIndex);

  // ログ追加
  newState = addLog(newState, `${card.name}を召喚！`, 'info');

  return newState;
}
```

---

## 5. 既存エンジンとの統合

### 5.1 triggerEngine の修正

現在のtriggerEngineはグローバル状態を持っています。これを以下のように修正：

```javascript
// 現在（グローバル状態）
let globalTriggerRegistry = [];

// 変更後（状態を引数で受け取る）
function fireTrigger(triggerRegistry, triggerType, context) {
  // ...
  return { newRegistry, effects };
}
```

**または**、GameStateの一部としてトリガーレジストリを保持：

```javascript
const GameState = {
  // ...
  triggerRegistry: [],  // 登録されたトリガー
};
```

### 5.2 effectHelpers の修正

現在のeffectHelpersはReact setterを直接呼び出しています：

```javascript
// 現在
function conditionalDamage(context, damage, target) {
  const { setP1Life, setP2Life } = context;
  setP1Life(prev => prev - damage);  // React setter
}

// 変更後（状態を返す）
function conditionalDamage(state, damage, target) {
  const newLife = getTargetLife(state, target) - damage;
  return setTargetLife(state, target, newLife);
}
```

### 5.3 移行戦略

**段階的移行**（既存コードを壊さない）:

1. **Phase 1**: GameState/GameActions を新規作成（既存コードに影響なし）
2. **Phase 2**: effectHelpers に状態ベース版を追加（両方共存）
3. **Phase 3**: triggerEngine に状態ベース版を追加
4. **Phase 4**: magic-spirit.jsx を新エンジンに切り替え
5. **Phase 5**: 旧コード削除

---

## 6. Simulator 設計

### 6.1 ヘッドレス対戦

```javascript
/**
 * AI同士の対戦をシミュレート
 * @param {Object} config - { deck1, deck2, ai1Config, ai2Config }
 * @returns {Object} - { winner, turns, logs }
 */
function simulateBattle(config) {
  const { deck1, deck2, ai1Config, ai2Config } = config;

  let state = createInitialState({ deck1, deck2 });
  const maxTurns = 50;

  while (state.gameStatus === 'playing' && state.turn < maxTurns) {
    // フェイズ処理
    state = applyAction(state, { type: 'PROCESS_PHASE', payload: { phase: state.phase } });

    // AIの行動決定
    if (state.phase === 2) { // メインフェイズ
      const aiConfig = state.currentPlayer === 1 ? ai1Config : ai2Config;
      const actions = getAIActions(state, aiConfig);
      for (const action of actions) {
        state = applyAction(state, action);
      }
    }

    if (state.phase === 3) { // バトルフェイズ
      const aiConfig = state.currentPlayer === 1 ? ai1Config : ai2Config;
      const attacks = getAIAttacks(state, aiConfig);
      for (const attack of attacks) {
        state = applyAction(state, attack);
      }
    }

    // 次のフェイズへ
    state = applyAction(state, { type: 'NEXT_PHASE' });
  }

  return {
    winner: state.winner,
    turns: state.turn,
    logs: state.logs,
  };
}
```

### 6.2 オッズ計算

```javascript
/**
 * 複数回シミュレートしてオッズを計算
 * @param {Object} config - { deck1, deck2, ai1, ai2, simulations }
 * @returns {Object} - { p1WinRate, p2WinRate, avgTurns }
 */
function calculateOdds(config) {
  const { deck1, deck2, ai1, ai2, simulations = 100 } = config;

  let p1Wins = 0;
  let totalTurns = 0;

  for (let i = 0; i < simulations; i++) {
    const result = simulateBattle({ deck1, deck2, ai1Config: ai1, ai2Config: ai2 });
    if (result.winner === 1) p1Wins++;
    totalTurns += result.turns;
  }

  return {
    p1WinRate: p1Wins / simulations,
    p2WinRate: (simulations - p1Wins) / simulations,
    avgTurns: totalTurns / simulations,
  };
}
```

---

## 7. React アダプター

### 7.1 magic-spirit.jsx の変更

```javascript
// 変更前: 70個のuseState
const [p1Life, setP1Life] = useState(6000);
const [p1Deck, setP1Deck] = useState([]);
// ... 68個以上

// 変更後: 1つのuseStateでGameStateを管理
const [gameState, setGameState] = useState(null);

// アクションディスパッチ
const dispatch = useCallback((action) => {
  setGameState(prevState => applyAction(prevState, action));
}, []);

// ゲーム初期化
const initGame = useCallback(() => {
  const initialState = createInitialState({
    deck1: createDeckFromSelection(p1SelectedDeck),
    deck2: createDeckFromSelection(p2SelectedDeck),
  });
  setGameState(initialState);
}, [p1SelectedDeck, p2SelectedDeck]);

// 召喚
const summonCard = useCallback((cardIndex, slotIndex) => {
  dispatch({ type: 'SUMMON_CARD', payload: { cardIndex, slotIndex } });
}, [dispatch]);

// UIからの参照
const p1Life = gameState?.p1.life ?? 6000;
const p1Hand = gameState?.p1.hand ?? [];
// ...
```

### 7.2 フェイズ自動進行

```javascript
// フェイズ自動進行はuseEffectで維持
useEffect(() => {
  if (gameState?.gameStatus !== 'playing') return;
  if (gameState.phase === 0 || gameState.phase === 1) {
    const timer = setTimeout(() => {
      dispatch({ type: 'PROCESS_PHASE', payload: { phase: gameState.phase } });
    }, 500);
    return () => clearTimeout(timer);
  }
}, [gameState?.phase, gameState?.gameStatus, dispatch]);
```

---

## 8. 実装ステップ

### Step 1: GameState/GameActions 基盤（1日目）✅ 完了
- [x] `src/engine/gameEngine/GameState.js` - 状態型定義と初期化 (380行)
- [x] `src/engine/gameEngine/GameActions.js` - アクション型とapplyAction骨格 (805行)
- [x] `src/engine/gameEngine/index.js` - エクスポート (70行)
- [x] `src/engine/gameEngine/GameEngine.test.js` - テスト (14テスト)

### Step 2: コアアクション実装（1-2日目）✅ 完了
- [x] `applySummonCard` - カード召喚
- [x] `applyAttack` / `executeMonsterAttack` / `executeDirectAttack` - 攻撃処理
- [x] `applyExecuteSkill` - 技発動（スタブ、effectEngine統合待ち）
- [x] `applyProcessPhase` - フェイズ処理
- [x] `applyNextPhase` / `applyEndTurn` - ターン進行

### Step 3: 補助アクション実装（2日目）✅ 完了
- [x] `applyChargeCard` / `applyChargeSP` - チャージ
- [x] `applyUseMagic` - 魔法カード（スタブ、effectEngine統合待ち）
- [ ] `applyPlaceFieldCard` - フィールドカード（未実装）
- [ ] `applyActivateTrigger` - トリガー発動（未実装）

### Step 4: エンジン統合（2-3日目）✅ 完了
- [x] effectHelpers を状態ベースに対応 (`effectHelpersPure.js`, ~280行)
- [x] triggerEngine を状態ベースに対応 (`triggerEnginePure.js`, ~320行)
- [ ] continuousEffects との統合（必要時に実装）
- [ ] statusEffects との統合（必要時に実装）

### Step 5: Simulator 実装（3日目）✅ 完了
- [x] `simulateGame` - ヘッドレス対戦 (1ゲーム平均0.4ms)
- [x] `simulateMultiple` - 複数回シミュレーション
- [x] `calculateOdds` - オッズ計算
- [x] シンプルAI実装（高速シミュレーション用）
- [x] `src/engine/gameEngine/Simulator.test.js` - テスト (8テスト)

### Step 6: React アダプター（3-4日目）🔄 進行中
- [x] `useGameEngine.js` - カスタムフック作成 (~260行)
- [x] `useGameEngine.test.js` - テスト作成 (10テスト)
- [x] toLegacyState/fromLegacyState - 既存形式との相互変換
- [ ] magic-spirit.jsx を新エンジンに切り替え（大規模変更、保留）
- [ ] 動作確認・バグ修正
- [ ] 旧コード削除

### Step 7: テスト・検証（4-5日目）⏳ 待機中
- [x] ユニットテスト作成 (41テスト全パス)
- [ ] 統合テスト
- [x] パフォーマンス検証（100戦40ms、目標5秒を大幅にクリア）

---

## 9. リスクと対策

### 9.1 リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| 既存機能の破壊 | 高 | 段階的移行、両方共存期間を設ける |
| 挙動の差異 | 中 | 詳細なテスト、ログ比較 |
| パフォーマンス低下 | 低 | プロファイリング、最適化 |
| 工数超過 | 中 | 優先度付け、最小限の機能から |

### 9.2 ロールバック計画

- Git ブランチで作業（`claude/game-engine-refactoring`）
- 既存コードは最後まで削除しない
- 問題発生時は旧コードに戻せる状態を維持

---

## 10. 成功基準

1. **ヘッドレス対戦**: 100戦シミュレーションが5秒以内
2. **既存機能維持**: 全ての現行機能が動作
3. **テストカバレッジ**: コアアクションの80%以上
4. **コード削減**: magic-spirit.jsx が 3,000行以下

---

## 11. 参考資料

- `src/ルール/code-structure.md` - 現在のコード構造
- `src/ルール/ai-player-system-design.md` - AI システム設計
- `src/ルール/trigger-system-design.md` - トリガーシステム設計
- `src/ルール/CardValueSystem/investment_system.md` - 投資システム（本リファクタの動機）

---

**作成日**: 2025-11-29
**作成者**: Claude
**ステータス**: 実装中

---

## 12. 実装進捗（2025-11-29）

### 完了した作業

| ファイル | 行数 | 内容 |
|---------|------|------|
| `GameState.js` | ~385 | 状態型定義、初期化、ヘルパー関数、トリガーレジストリ |
| `GameActions.js` | ~805 | Redux風アクション（召喚/攻撃/チャージ等） |
| `Simulator.js` | ~245 | ヘッドレス対戦シミュレーション |
| `effectHelpersPure.js` | ~280 | 純粋関数版効果ヘルパー（12関数） |
| `triggerEnginePure.js` | ~320 | 純粋関数版トリガーエンジン（8関数） |
| `useGameEngine.js` | ~260 | Reactアダプター（カスタムフック） |
| `index.js` | ~120 | エクスポート |
| `GameEngine.test.js` | ~350 | GameEngineテスト（14テスト） |
| `Simulator.test.js` | ~165 | Simulatorテスト（8テスト） |
| `triggerEnginePure.test.js` | ~210 | triggerEnginePureテスト（9テスト） |
| `useGameEngine.test.js` | ~210 | useGameEngineテスト（10テスト） |

**合計: 3,390行、41テスト全パス**

### パフォーマンス達成

| 指標 | 目標 | 実績 |
|------|------|------|
| 100戦シミュレーション | 5秒以内 | **40ms** (125倍高速) |
| 1ゲーム平均 | - | **0.4ms** |

### Step 4 純粋関数化 完了

**effectHelpersPure.js (12関数)**
- `getPlayerContextPure` - プレイヤーコンテキスト取得
- `millDeckPure` - デッキミル
- `drawCardsPure` - カードドロー
- `dealDamagePure` - ダメージ
- `healLifePure` - 回復
- `modifyAttackPure` - 攻撃力修正
- `modifyHPPure` - HP修正
- `destroyMonsterPure` - モンスター破壊
- `searchCardPure` - カード検索
- `reviveFromGraveyardPure` - 蘇生
- `addSPPure` - SP追加
- `reduceSPPure` - SP減少

**triggerEnginePure.js (8関数)**
- `parseCardTriggers` - カードトリガー解析
- `registerCardTriggersPure` - トリガー登録
- `unregisterCardTriggersPure` - トリガー解除
- `clearAllTriggersPure` - 全トリガークリア
- `fireTriggerPure` - トリガー発火
- `resetTurnFlagsPure` - ターンフラグリセット
- `getCardTriggersPure` - カードトリガー取得
- `getTriggerStatsPure` - トリガー統計取得

### Step 6 Reactアダプター 進行中

**useGameEngine.js (カスタムフック)**
- `useGameEngine()` - GameEngine状態管理フック
- `dispatch(action)` - アクション適用
- `initGame(config)` / `resetGame()` - ゲーム初期化
- アクションラッパー: summonCard, attack, chargeCard, executeSkill, useMagic, nextPhase, endTurn

**変換ユーティリティ**
- `toLegacyState(gameState)` - 既存形式への変換
- `fromLegacyState(legacyState)` - 既存形式からの変換

### 次のステップ

**Phase B完了（シャドウディスパッチ方式）** ✅
- [x] Phase B-1: nextPhase/processPhase のシャドウディスパッチ化
- [x] Phase B-2: summonCard/attack のシャドウディスパッチ化
- [x] Phase B-3: chargeCard/chargeSP のシャドウディスパッチ化
- [x] Phase B-4: executeSkill のシャドウディスパッチ化（効果実行はUI、結果同期のみ）
- [x] Phase B-5: placeFieldCard/placePhaseCard のシャドウディスパッチ化

**Phase C: UIの状態参照移行**
- [ ] Phase C-1: 互換レイヤー変数の導入（検証付き）
- [ ] Phase C-2: 検証ツールの導入（開発モード）
- [ ] Phase C-3: 段階的置き換え（logs, life, field順）

**Phase D: useState削除（最終目標）**
- [ ] 全UIがengineState参照を確認
- [ ] 33個のゲーム状態useStateを削除
- [ ] magic-spirit.jsx 大幅行数削減

**詳細**: `step6-integration-design.md` を参照

**対象useState（33個）**
- ゲーム進行: turn, currentPlayer, phase, isFirstTurn, winner, logs
- P1/P2状態: life, deck, hand, field, graveyard, activeSP, restedSP, fieldCard, phaseCard, statusEffects, nextTurnSPBonus, magicBlocked, spReduction
- ターンフラグ: chargeUsedThisTurn
