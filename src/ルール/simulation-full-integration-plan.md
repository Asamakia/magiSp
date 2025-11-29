# シミュレーション完全統合計画

作成日: 2025-11-29
ステータス: **計画段階**

---

## 1. 目的

**AIで高速シミュレーション（技やトリガーも使用）を実現する**

### 1.1 現状の問題

現在のSimulator.jsは以下のみ実行：
- ✅ モンスター召喚
- ✅ 攻撃（基本ダメージ計算）
- ❌ 技発動（スタブ実装）
- ❌ トリガー効果（React依存で動かない）
- ❌ 魔法カード（未実装）
- ❌ 常時効果（グローバル状態依存）
- ❌ 状態異常の反映（処理はあるが統合されていない）

### 1.2 達成後の姿

```
Simulator.js
    ├── 召喚 ✅
    ├── 攻撃 ✅
    ├── 技発動 ✅ ← 完全な効果
    ├── トリガー ✅ ← 完全な効果
    ├── 魔法カード ✅
    ├── 常時効果 ✅
    └── 状態異常 ✅
```

---

## 2. アーキテクチャ設計

### 2.1 contextアダプター方式

```
┌─────────────────────────────────────────────────────────────┐
│                    contextAdapter.js (新規)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ createPureContext(state)                             │   │
│  │   → setOpponentField, setMyField, addLog, etc.      │   │
│  │   → React setterのように見せかけてstateを更新        │   │
│  │   → UI選択は自動選択にフォールバック                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ 同じcontextを渡す
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ cardEffects/  │   │ cardTriggers/ │   │ effectHelpers │
│   *.js        │   │    *.js       │   │    .js        │
│  (5,800行)    │   │   (8,400行)   │   │  (1,300行)    │
│  変更不要     │   │   変更不要    │   │   変更不要    │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 2.2 データフロー

```
Simulator.js
    │
    ├─→ createPureContext(state) ← contextAdapter.js
    │
    ├─→ applyAction(state, actions.executeSkill(...))
    │       │
    │       └─→ GameActions.applyExecuteSkill()
    │               │
    │               └─→ executeSkillEffects(skillText, context)
    │                       │
    │                       └─→ cardEffects/fire.js など
    │                               │
    │                               └─→ context.setOpponentField(...)
    │                                       │
    │                                       └─→ state更新（contextAdapter内）
    │
    └─→ fireTriggerPure(state, TRIGGER_TYPE, context)
            │
            └─→ trigger.effect(context)
                    │
                    └─→ context.conditionalDamage(...)
                            │
                            └─→ state更新（contextAdapter内）
```

---

## 3. 現状分析

### 3.1 既存ファイルの依存関係

| ファイル | 行数 | React依存 | グローバル状態 |
|---------|------|----------|--------------|
| cardEffects/*.js | 5,832 | context.set* 使用 | なし |
| cardTriggers/*.js | 8,373 | context.set* 使用 | なし |
| effectHelpers.js | 1,328 | context.set* 使用 | なし |
| statusEffects/statusEngine.js | ~400 | なし | なし ✅ |
| continuousEffects/effectEngine.js | ~700 | なし | this.activeEffects ❌ |
| triggerEngine.js | ~730 | なし | TriggerRegistry ❌ |

### 3.2 Pure版の現状

| ファイル | 状態 | 問題点 |
|---------|------|-------|
| GameState.js | ✅ 完成 | - |
| GameActions.js | ⚠️ 部分的 | applyExecuteSkillがスタブ |
| effectHelpersPure.js | ✅ 完成 | 基本関数のみ |
| triggerEnginePure.js | ⚠️ 部分的 | trigger.effectがReact依存 |
| continuousEffectEnginePure.js | ❌ 未作成 | 必要 |
| contextAdapter.js | ❌ 未作成 | 必要 |

---

## 4. 作成・修正が必要なファイル

### 4.1 新規作成

#### A. contextAdapter.js (~300行)

**場所**: `src/engine/gameEngine/contextAdapter.js`

**役割**: React setterをエミュレートし、純粋関数として状態を更新

```javascript
/**
 * 純粋関数モード用のcontextを作成
 * @param {Object} state - GameState
 * @returns {Object} context + getState()
 */
export function createPureContext(state) {
  let currentState = state;

  // プレイヤー抽象化
  const getPlayerContext = () => {
    const isP1 = currentState.currentPlayer === 1;
    return {
      myField: isP1 ? currentState.p1.field : currentState.p2.field,
      opponentField: isP1 ? currentState.p2.field : currentState.p1.field,
      // ... 他のプロパティ
    };
  };

  return {
    // 読み取り専用プロパティ
    get currentPlayer() { return currentState.currentPlayer; },
    get p1Field() { return currentState.p1.field; },
    get p2Field() { return currentState.p2.field; },
    // ... 他のゲッター

    // React setter互換（内部でstate更新）
    setOpponentField: (updater) => {
      const opponentNum = currentState.currentPlayer === 1 ? 2 : 1;
      const currentField = currentState.currentPlayer === 1
        ? currentState.p2.field
        : currentState.p1.field;
      const newField = typeof updater === 'function'
        ? updater(currentField)
        : updater;
      currentState = updatePlayer(currentState, opponentNum, { field: newField });
    },

    setMyField: (updater) => { /* 同様 */ },
    setP1Life: (updater) => { /* 同様 */ },
    setP2Life: (updater) => { /* 同様 */ },
    // ... 他のセッター（約20個）

    // ログ
    addLog: (message, type) => {
      currentState = addLog(currentState, message, type);
    },

    // UI選択（自動選択にフォールバック）
    setPendingTargetSelection: (options) => {
      // シミュレーションではUIがないので自動選択
      const autoTarget = selectBestTarget(options.validTargets, currentState);
      options.callback(autoTarget);
    },

    setPendingHandSelection: (options) => {
      // 最初のカードを自動選択
      const autoCard = options.validCards?.[0] || 0;
      options.callback(autoCard);
    },

    // getPlayerContext互換
    getPlayerContext: () => getPlayerContext(),

    // 最終state取得
    getState: () => currentState,
  };
}

/**
 * ターゲット自動選択ロジック
 */
function selectBestTarget(validTargets, state) {
  if (!validTargets || validTargets.length === 0) return -1;
  // シンプルに最初のターゲットを選択
  // TODO: より賢い選択ロジック（HPが低い敵を優先など）
  return validTargets[0];
}
```

**実装の課題**:
1. effectHelpers.jsの`getPlayerContext()`との互換性
2. すべてのsetterパターンの網羅（約20種類）
3. UI選択の自動化ロジック

---

#### B. continuousEffectEnginePure.js (~200行)

**場所**: `src/engine/gameEngine/continuousEffectEnginePure.js`

**役割**: 常時効果をフィールドから動的に計算（グローバル状態なし）

```javascript
import { CONTINUOUS_EFFECT_TYPES } from '../continuousEffects/effectTypes';
import { checkCondition } from '../continuousEffects/conditionChecker';
import { calculateValue } from '../continuousEffects/valueCalculator';
import { getEffectDefinition } from '../continuousEffects';

/**
 * 攻撃力修正値を計算（純粋関数版）
 * @param {Object} state - GameState
 * @param {Object} monster - 対象モンスター
 * @returns {number} 修正値
 */
export function calculateAttackModifierPure(state, monster) {
  let totalModifier = 0;

  // P1のフィールドカード
  if (state.p1.fieldCard) {
    totalModifier += getFieldCardModifier(state.p1.fieldCard, 1, monster, state);
  }

  // P2のフィールドカード
  if (state.p2.fieldCard) {
    totalModifier += getFieldCardModifier(state.p2.fieldCard, 2, monster, state);
  }

  // P1のフィールドモンスター
  state.p1.field.forEach(m => {
    if (m) totalModifier += getMonsterModifier(m, 1, monster, state);
  });

  // P2のフィールドモンスター
  state.p2.field.forEach(m => {
    if (m) totalModifier += getMonsterModifier(m, 2, monster, state);
  });

  // フェイズカード
  if (state.p1.phaseCard) {
    totalModifier += getPhaseCardModifier(state.p1.phaseCard, 1, monster, state);
  }
  if (state.p2.phaseCard) {
    totalModifier += getPhaseCardModifier(state.p2.phaseCard, 2, monster, state);
  }

  return totalModifier;
}

/**
 * フィールドカードからの修正値を取得
 */
function getFieldCardModifier(fieldCard, owner, targetMonster, state) {
  const definitions = getEffectDefinition(fieldCard.id);
  if (!definitions) return 0;

  let modifier = 0;
  definitions.forEach(effect => {
    if (effect.type !== CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER) return;
    if (!checkTarget(effect, targetMonster, owner, state)) return;
    if (!checkCondition(effect.condition, targetMonster, { ...state, effectOwner: owner })) return;
    modifier += calculateValue(effect, state);
  });

  return modifier;
}

// 同様に HP修正、ダメージ軽減、コスト修正なども実装
```

**実装の課題**:
1. effectDefinitionsへのアクセス方法
2. 既存のcheckCondition, calculateValueとの互換性
3. フェイズカードの段階(stage)の考慮

---

### 4.2 修正が必要なファイル

#### C. GameActions.js - applyExecuteSkill実装 (~100行追加)

**場所**: `src/engine/gameEngine/GameActions.js` (既存)

**現状**:
```javascript
function applyExecuteSkill(state, { monsterIndex, skillType }) {
  // TODO: 実際の技効果実行（effectEngineとの統合）
  // スタブ実装
}
```

**修正後**:
```javascript
import { executeSkillEffects } from '../effectEngine';
import { createPureContext } from './contextAdapter';

function applyExecuteSkill(state, { monsterIndex, skillType }) {
  const player = getCurrentPlayer(state);
  const monster = player.field[monsterIndex];

  if (!monster) {
    return addLog(state, 'モンスターが見つかりません', 'info');
  }

  if (monster.usedSkillThisTurn) {
    return addLog(state, 'このモンスターは既に技を使用しています', 'info');
  }

  // チャージ確認
  const requiredCharges = skillType === 'basic' ? 1 : 2;
  if ((monster.charges?.length || 0) < requiredCharges) {
    return addLog(state, 'チャージが足りません', 'info');
  }

  // contextアダプターを作成
  const context = createPureContext(state);
  context.monsterIndex = monsterIndex;
  context.skillType = skillType;

  // スキルテキストを取得
  const skillText = skillType === 'basic'
    ? monster.basicSkill
    : monster.advancedSkill;

  // 効果実行
  executeSkillEffects(monster.id, skillText, context);

  // 更新されたstateを取得
  let newState = context.getState();

  // 技使用済みフラグとチャージ消費
  const newField = [...getCurrentPlayer(newState).field];
  const newCharges = [...(monster.charges || [])];
  for (let i = 0; i < requiredCharges; i++) {
    newCharges.shift();
  }
  newField[monsterIndex] = {
    ...newField[monsterIndex],
    usedSkillThisTurn: true,
    charges: newCharges,
  };

  newState = updatePlayer(newState, newState.currentPlayer, { field: newField });

  return newState;
}
```

**依存**:
- contextAdapter.js
- effectEngine.executeSkillEffects()

---

#### D. Simulator.js - AI拡張 (~150行追加)

**場所**: `src/engine/gameEngine/Simulator.js` (既存)

**追加内容**:

```javascript
import { fireTriggerPure } from './triggerEnginePure';
import { createPureContext } from './contextAdapter';
import { TRIGGER_TYPES } from '../triggerTypes';

/**
 * メインフェイズAI（拡張版）
 */
function getAIMainPhaseAction(state) {
  const player = getCurrentPlayer(state);

  // 1. 使用可能な技があれば発動
  for (let i = 0; i < player.field.length; i++) {
    const monster = player.field[i];
    if (monster && canUseSkill(monster)) {
      const skillType = monster.charges?.length >= 2 ? 'advanced' : 'basic';
      return actions.executeSkill(i, skillType);
    }
  }

  // 2. 魔法カードがあれば使用
  for (let i = 0; i < player.hand.length; i++) {
    const card = player.hand[i];
    if (card.type === 'magic' && canUseMagic(state, card)) {
      return actions.useMagic(i);
    }
  }

  // 3. 召喚可能なカードがあれば召喚
  const emptySlot = getFirstEmptySlot(player.field);
  if (emptySlot !== -1) {
    for (let i = 0; i < player.hand.length; i++) {
      const card = player.hand[i];
      if (card.type === 'monster' && canSummonCard(state, card, emptySlot)) {
        return actions.summonCard(i, emptySlot);
      }
    }
  }

  // 4. チャージ可能ならチャージ
  // ...

  return null;
}

/**
 * 1ターンを実行（拡張版）
 */
function executeTurn(state) {
  let newState = state;
  const context = createPureContext(newState);

  // ターン開始フェイズ
  newState = applyAction(newState, actions.processPhase(PHASES.TURN_START));
  newState = fireTriggerPure(newState, TRIGGER_TYPES.ON_TURN_START_SELF, context);
  newState = applyAction(newState, actions.nextPhase());

  // ドローフェイズ
  newState = applyAction(newState, actions.processPhase(PHASES.DRAW));
  newState = applyAction(newState, actions.nextPhase());

  // メインフェイズ
  newState = fireTriggerPure(newState, TRIGGER_TYPES.ON_MAIN_PHASE_SELF, context);
  let mainPhaseActions = 0;
  const maxMainActions = 20;
  while (mainPhaseActions < maxMainActions) {
    const action = getAIMainPhaseAction(newState);
    if (!action) break;
    newState = applyAction(newState, action);
    mainPhaseActions++;
  }
  newState = applyAction(newState, actions.nextPhase());

  // バトルフェイズ
  newState = fireTriggerPure(newState, TRIGGER_TYPES.ON_BATTLE_PHASE_START, context);
  // ... 攻撃処理
  newState = applyAction(newState, actions.nextPhase());

  // エンドフェイズ
  newState = fireTriggerPure(newState, TRIGGER_TYPES.ON_END_PHASE_SELF, context);
  newState = applyAction(newState, actions.processPhase(PHASES.END));
  newState = applyAction(newState, actions.nextPhase());

  return newState;
}
```

---

#### E. triggerEnginePure.js - executeTriggerEffectPure修正 (~50行修正)

**場所**: `src/engine/gameEngine/triggerEnginePure.js` (既存)

**現状の問題**:
```javascript
// 注意: 既存のtrigger.effectはReact setterを使用するため、
// シミュレーションでは限定的な効果のみサポート
```

**修正方針**:
```javascript
import { createPureContext } from './contextAdapter';

function executeTriggerEffectPure(state, trigger, triggerContext) {
  if (!trigger.effect) {
    return addLog(state, `${trigger.cardName || 'カード'}の効果（汎用）`, 'info');
  }

  // contextアダプターを作成
  const context = createPureContext(state);

  // triggerContextの情報をマージ
  Object.assign(context, triggerContext);

  // 効果実行
  try {
    trigger.effect(context);
  } catch (error) {
    console.error('Trigger effect error:', error);
  }

  // 更新されたstateを返す
  return context.getState();
}
```

---

## 5. 依存関係図

```
                    ┌─────────────────────┐
                    │   Simulator.js      │
                    │   (エントリーポイント) │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ GameActions.js  │  │triggerEnginePure│  │continuousEffect │
│                 │  │     .js         │  │  EnginePure.js  │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  contextAdapter.js  │
                    │   (状態変換層)       │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  cardEffects/   │  │  cardTriggers/  │  │ effectHelpers   │
│     *.js        │  │      *.js       │  │     .js         │
│   (変更不要)    │  │    (変更不要)   │  │   (変更不要)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 6. 作業サマリー

| # | ファイル | 種別 | 行数 | 優先度 |
|---|---------|------|------|--------|
| 1 | contextAdapter.js | 新規 | ~300 | 最優先 |
| 2 | continuousEffectEnginePure.js | 新規 | ~200 | 高 |
| 3 | GameActions.js (applyExecuteSkill) | 修正 | ~100 | 高 |
| 4 | Simulator.js (AI拡張) | 修正 | ~150 | 中 |
| 5 | triggerEnginePure.js | 修正 | ~50 | 中 |
| **合計** | | | **~800行** | |

**変更不要**: cardEffects/*.js, cardTriggers/*.js, effectHelpers.js (計14,000行)

---

## 7. 懸念点とリスク

### 7.1 技術的リスク

| リスク | 影響度 | 対策 |
|-------|-------|------|
| contextアダプターでカバーできないパターン | 高 | 事前にset*使用箇所を全調査 |
| UI選択の自動化が複雑 | 中 | シンプルな選択ロジック（最初の候補を選択） |
| effectHelpersの一部がcontextに依存しすぎ | 中 | getPlayerContextの互換実装 |
| 状態異常の処理順序 | 低 | 既存ロジックを踏襲 |

### 7.2 調査が必要な項目

1. **context.set*の全パターン洗い出し**
   - 現在判明: setOpponentField, setMyField, setP1Life, setP2Life, etc.
   - 全種類の確認が必要

2. **setPendingTargetSelectionの使用パターン**
   - 単一ターゲット選択
   - 複数ターゲット選択
   - 条件付き選択（属性指定など）

3. **effectHelpers.getPlayerContext()との互換性**
   - 戻り値の構造を完全一致させる必要

### 7.3 テスト計画

1. **単体テスト**: contextAdapter.jsの各メソッド
2. **統合テスト**: 特定カードの技効果実行
3. **シミュレーションテスト**: 100戦実行して異常終了がないことを確認
4. **精度テスト**: UIパスとシミュレーションパスで同じデッキの勝率を比較

---

## 8. 実装順序（推奨）

```
Step 1: contextAdapter.js作成
    │
    ├── set*の全パターン調査
    ├── 基本実装
    └── getPlayerContext互換実装

Step 2: triggerEnginePure.js修正
    │
    └── executeTriggerEffectPureでcontextAdapter使用

Step 3: GameActions.js修正
    │
    └── applyExecuteSkillでcontextAdapter使用

Step 4: Simulator.js拡張
    │
    ├── トリガー発火の統合
    ├── 技発動AIの追加
    └── 魔法カードAIの追加

Step 5: continuousEffectEnginePure.js作成
    │
    └── 攻撃力修正等の計算をSimulatorに統合

Step 6: テスト・検証
    │
    ├── 100戦シミュレーション
    └── 精度比較
```

---

## 9. 成功基準

| 基準 | 目標値 |
|------|--------|
| シミュレーション速度 | 100戦 < 1秒 |
| 技発動カバー率 | 100%（全cardEffects動作） |
| トリガーカバー率 | 100%（全cardTriggers動作） |
| 異常終了率 | 0% |
| 既存UIへの影響 | なし |

---

**作成日**: 2025-11-29
**作成者**: Claude
**次のアクション**: Step 1 contextAdapter.js作成の開始
