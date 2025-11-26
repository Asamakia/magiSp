# トリガーシステム設計の修正方針

**作成日**: 2025-11-26
**バージョン**: 1.1
**修正理由**: ユーザーフィードバックに基づく設計改善

---

## 問題点の整理

### 問題1: カテゴリ/属性特定トリガーの非汎用性

**現在の設計**:
```javascript
ON_DRAGON_DESTROYED: 'on_dragon_destroyed', // 【［ドラゴン］モンスターが破壊された時】
ON_LIGHT_BEFORE_DESTROY: 'on_light_before_destroy', // 【光属性モンスターが破壊される時】
ON_SUMMON_LIGHT_SELF: 'on_summon_light_self', // 【自分光属性モンスター召喚時】
```

**問題**:
- ドラゴン、光属性など特定の値にハードコーディング
- 今後、プラント、水属性など別のカテゴリ/属性が追加される度にトリガータイプを増やす必要がある
- 拡張性がない

**影響範囲**:
- 召喚時トリガー（属性/カテゴリ特定）
- 破壊時トリガー（属性/カテゴリ特定）

---

### 問題2: メインフェイズトリガーの発動タイミング

**現在の設計**:
- 【自分メインフェイズ時】を自動発動トリガーとして扱っている
- フェイズ開始時に自動的に発火

**問題**:
- メインフェイズトリガーは実際には**任意発動**（プレイヤーが発動を選択）
- 自動発動では戦略性が失われる
- UIでの発動ボタンが必要

**影響範囲**:
- 【自分メインフェイズ時】トリガー
- 【自分メインフェイズ時、墓地で発動】トリガー

---

### 問題3: 任意発動と強制発動の区別がない

**現在の設計**:
- 全てのトリガーを自動・強制発動として扱っている

**問題**:
- 一部のトリガーは任意発動にする必要がある
- システムとして強制/任意を区別する仕組みがない

**影響範囲**:
- メインフェイズトリガー（任意）
- その他、今後追加される任意発動トリガー

---

## 修正方針

### 修正1: トリガータイプの汎用化

#### Before（現在）
```javascript
// 特定の値にハードコーディング
ON_DRAGON_DESTROYED: 'on_dragon_destroyed',
ON_LIGHT_BEFORE_DESTROY: 'on_light_before_destroy',
ON_SUMMON_LIGHT_SELF: 'on_summon_light_self',
```

#### After（修正後）
```javascript
// 汎用的なトリガータイプ
ON_CATEGORY_MONSTER_DESTROYED: 'on_category_monster_destroyed', // カテゴリモンスターが破壊された時
ON_ATTRIBUTE_BEFORE_DESTROY: 'on_attribute_before_destroy', // 属性モンスターが破壊される時
ON_ATTRIBUTE_SUMMON_SELF: 'on_attribute_summon_self', // 自分の属性モンスター召喚時

// トリガー登録時に条件を指定
registerCardTriggers(card, owner, slotIndex, {
  triggerType: TRIGGER_TYPES.ON_CATEGORY_MONSTER_DESTROYED,
  condition: (context) => {
    return context.destroyedCard.category?.includes('【ドラゴン】');
  },
  effect: (context) => { /* 効果 */ },
});
```

**メリット**:
- トリガータイプの数を削減
- 新しいカテゴリ/属性が追加されても対応可能
- 条件を柔軟にカスタマイズ可能

---

### 修正2: 発動タイプの追加（自動 vs 任意）

#### トリガー登録時に発動タイプを指定

```javascript
registerCardTriggers(card, owner, slotIndex, {
  triggerType: TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
  activationType: 'optional', // 'automatic' or 'optional'
  condition: (context) => true,
  effect: (context) => { /* 効果 */ },
});
```

#### 発動タイプの定義

```javascript
export const ACTIVATION_TYPES = {
  AUTOMATIC: 'automatic', // 自動・強制発動
  OPTIONAL: 'optional',   // 任意発動（プレイヤーが選択）
};
```

**メリット**:
- 強制発動と任意発動を明確に区別
- UIで任意発動トリガーを表示できる
- 将来的な拡張に対応

---

### 修正3: メインフェイズトリガーの扱い

#### 現在のフロー（問題あり）
```
メインフェイズ開始
  ↓
自動的に全ての【自分メインフェイズ時】トリガーが発火
  ↓
プレイヤーは選択できない
```

#### 修正後のフロー
```
メインフェイズ開始
  ↓
発動可能なトリガーをリストアップ
  ↓
UIで発動ボタンを表示
  ↓
プレイヤーが発動を選択
  ↓
選択されたトリガーのみ発火
```

#### UI実装イメージ

```javascript
// メインフェイズ中に発動可能なトリガーを取得
const availableTriggers = getAvailableTriggers(TRIGGER_TYPES.ON_MAIN_PHASE_SELF);

// UI表示
{availableTriggers.map(trigger => (
  <button onClick={() => activateTrigger(trigger)}>
    {trigger.cardName} の効果を発動
  </button>
))}
```

---

## 修正後のトリガータイプ一覧

### カテゴリ別の汎用トリガータイプ

#### 召喚時トリガー

| トリガータイプ | 説明 | 条件例 |
|---------------|------|--------|
| `ON_SUMMON` | モンスター召喚時 | なし（常に発動） |
| `ON_OPPONENT_SUMMON` | 相手モンスター召喚時 | なし |
| `ON_ATTRIBUTE_SUMMON_SELF` | 自分の特定属性モンスター召喚時 | `card.attribute === '光'` |
| `ON_CATEGORY_SUMMON_SELF` | 自分の特定カテゴリモンスター召喚時 | `card.category?.includes('【ドラゴン】')` |
| `ON_COST_SUMMON_SELF` | 自分の特定コスト以下モンスター召喚時 | `card.cost <= 3` |

#### 破壊時トリガー

| トリガータイプ | 説明 | 条件例 |
|---------------|------|--------|
| `ON_DESTROY_SELF` | このカードが破壊された時 | なし |
| `ON_CATEGORY_MONSTER_DESTROYED` | 特定カテゴリモンスターが破壊された時 | `card.category?.includes('【ドラゴン】')` |
| `ON_ATTRIBUTE_BEFORE_DESTROY` | 特定属性モンスターが破壊される前 | `card.attribute === '光'` |

#### フェイズトリガー

| トリガータイプ | 説明 | 発動タイプ |
|---------------|------|-----------|
| `ON_TURN_START_SELF` | 自分のターン開始時 | 自動 |
| `ON_DRAW_PHASE_SELF` | 自分のドローフェイズ | 自動 |
| `ON_MAIN_PHASE_SELF` | 自分のメインフェイズ時 | **任意** |
| `ON_BATTLE_PHASE_START` | バトルフェイズ開始時 | 自動 |
| `ON_END_PHASE_SELF` | 自分のエンドフェイズ時 | 自動 |
| `ON_END_PHASE` | エンドフェイズ時 | 自動 |

#### 墓地発動トリガー

| トリガータイプ | 説明 | 発動タイプ |
|---------------|------|-----------|
| `ON_MAIN_PHASE_FROM_GRAVEYARD` | メインフェイズ時、墓地で発動 | **任意** |
| `ON_END_PHASE_FROM_GRAVEYARD` | エンドフェイズ時、墓地で発動 | **任意** |

---

## トリガー登録の新しいデータ構造

```javascript
// トリガーエントリーの構造
{
  cardId: 'C0000XXX_unique123',
  cardName: 'カード名',
  triggerType: TRIGGER_TYPES.ON_SUMMON,
  activationType: ACTIVATION_TYPES.AUTOMATIC, // or OPTIONAL
  owner: 1, // プレイヤー番号
  slotIndex: 2, // フィールドスロット
  priority: 0, // 優先度

  // 発動条件（任意）
  condition: (context) => {
    // カテゴリチェック、属性チェックなど
    return context.card.attribute === '炎';
  },

  // 効果実行
  effect: (context) => {
    // 効果処理
  },

  // 任意発動用の情報
  description: '効果の説明', // UIに表示
  costCheck: (context) => true, // コスト支払い可能かチェック
}
```

---

## 実装の変更点

### 1. triggerTypes.js の修正

**削除するトリガータイプ**:
- `ON_DRAGON_DESTROYED` → `ON_CATEGORY_MONSTER_DESTROYED` に統合
- `ON_LIGHT_BEFORE_DESTROY` → `ON_ATTRIBUTE_BEFORE_DESTROY` に統合
- `ON_SUMMON_LIGHT_SELF` → `ON_ATTRIBUTE_SUMMON_SELF` に統合
- その他、特定の値にハードコーディングされたトリガー

**追加する定義**:
```javascript
export const ACTIVATION_TYPES = {
  AUTOMATIC: 'automatic',
  OPTIONAL: 'optional',
};
```

---

### 2. triggerEngine.js の修正

#### トリガー登録時の変更

```javascript
export const registerCardTriggers = (card, owner, slotIndex) => {
  const triggers = parseCardTriggers(card);

  triggers.forEach(trigger => {
    globalRegistry.register(card.uniqueId, trigger.type, {
      cardName: card.name,
      owner,
      slotIndex,
      priority: trigger.priority || TRIGGER_PRIORITIES.NORMAL,
      activationType: trigger.activationType || ACTIVATION_TYPES.AUTOMATIC,
      condition: trigger.condition, // 条件関数
      effect: trigger.effect,
      description: trigger.description,
      costCheck: trigger.costCheck,
    });
  });
};
```

#### 任意発動トリガーの取得

```javascript
/**
 * 発動可能な任意トリガーを取得
 * @param {string} triggerType
 * @param {object} context
 * @returns {Array} 発動可能なトリガーの配列
 */
export const getAvailableTriggers = (triggerType, context) => {
  const triggers = globalRegistry.get(triggerType);

  return triggers.filter(trigger => {
    // 任意発動のみ
    if (trigger.activationType !== ACTIVATION_TYPES.OPTIONAL) {
      return false;
    }

    // 条件チェック
    if (trigger.condition && !trigger.condition(context)) {
      return false;
    }

    // コストチェック
    if (trigger.costCheck && !trigger.costCheck(context)) {
      return false;
    }

    return true;
  });
};

/**
 * 任意トリガーを手動で発動
 * @param {object} trigger
 * @param {object} context
 */
export const activateTrigger = (trigger, context) => {
  try {
    if (typeof trigger.effect === 'function') {
      trigger.effect(context);
    }
  } catch (error) {
    console.error(`トリガー発動エラー: ${trigger.cardName}`, error);
  }
};
```

#### 自動発動トリガーの発火（修正版）

```javascript
export const fireTrigger = (triggerType, context) => {
  const triggers = globalRegistry.get(triggerType);

  if (!triggers || triggers.length === 0) return;

  // 自動発動のみをフィルター
  const automaticTriggers = triggers.filter(trigger => {
    return trigger.activationType === ACTIVATION_TYPES.AUTOMATIC;
  });

  // 優先度順にソート
  const sortedTriggers = sortTriggersByPriority(automaticTriggers, context);

  // 各トリガーを実行
  sortedTriggers.forEach(trigger => {
    try {
      if (trigger.condition && !trigger.condition(context)) {
        return; // 条件を満たさない
      }

      if (typeof trigger.effect === 'function') {
        trigger.effect(context);
      }
    } catch (error) {
      console.error(`トリガー実行エラー: ${trigger.cardName}`, error);
    }
  });
};
```

---

### 3. magic-spirit.jsx の修正

#### メインフェイズ処理の変更

```javascript
const processPhase = useCallback((phaseIndex) => {
  setPhase(phaseIndex);

  switch (phaseIndex) {
    case 2: // メインフェイズ
      // 自動発動トリガーは発火しない
      // 代わりに、発動可能なトリガーをステートに保存
      const available = getAvailableTriggers(TRIGGER_TYPES.ON_MAIN_PHASE_SELF, {
        currentPlayer,
        // ... context
      });
      setAvailableMainPhaseTriggers(available);

      // 墓地発動トリガーも同様
      const graveyardTriggers = getAvailableTriggers(
        TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD,
        { currentPlayer, /* ... */ }
      );
      setAvailableGraveyardTriggers(graveyardTriggers);
      break;

    // その他のフェイズは自動発動
    case 0: // ターン開始
      fireTrigger(TRIGGER_TYPES.ON_TURN_START_SELF, context);
      break;

    case 4: // エンドフェイズ
      fireTrigger(TRIGGER_TYPES.ON_END_PHASE_SELF, context);
      fireTrigger(TRIGGER_TYPES.ON_END_PHASE, context);
      break;
  }
}, [currentPlayer, /* ... */]);
```

#### UI: 任意発動トリガーの表示

```javascript
// メインフェイズ中のUI
{phase === 2 && availableMainPhaseTriggers.length > 0 && (
  <div style={styles.triggerPanel}>
    <h4>発動可能な効果</h4>
    {availableMainPhaseTriggers.map((trigger, idx) => (
      <button
        key={idx}
        onClick={() => {
          activateTrigger(trigger, {
            currentPlayer,
            // ... context
          });
          // トリガー発動後、リストを更新
          setAvailableMainPhaseTriggers(prev =>
            prev.filter((_, i) => i !== idx)
          );
        }}
        style={styles.triggerButton}
      >
        {trigger.cardName}: {trigger.description}
      </button>
    ))}
  </div>
)}
```

---

## カード固有効果の実装例（修正版）

### 例1: 属性特定の召喚時トリガー

```javascript
// C0000091: 灯火の精霊
// 【常時】自分の光属性モンスターが召喚されるたび、そのモンスターのHPを200アップ。

C0000091: {
  [TRIGGER_TYPES.ON_ATTRIBUTE_SUMMON_SELF]: {
    activationType: ACTIVATION_TYPES.AUTOMATIC,
    condition: (context) => {
      // 召喚されたモンスターが光属性か
      return context.card.attribute === '光';
    },
    effect: (context) => {
      const { card, slotIndex, currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

      const field = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;

      const newField = [...field];
      if (newField[slotIndex]) {
        newField[slotIndex] = {
          ...newField[slotIndex],
          maxHp: newField[slotIndex].maxHp + 200,
          currentHp: newField[slotIndex].currentHp + 200,
        };
        setField(newField);
        addLog(`${card.name}のHPが200アップした！`, 'info');
      }
    },
    description: '光属性モンスターのHPを200アップ',
  },
},
```

### 例2: カテゴリ特定の破壊時トリガー

```javascript
// C0000038: 紅の竜宮
// 【［ドラゴン］モンスターが破壊された時】手札からそのコスト以下の別の［ドラゴン］モンスター1体を効果無効で場に戻す（1ターンに1度）。

C0000038: {
  [TRIGGER_TYPES.ON_CATEGORY_MONSTER_DESTROYED]: {
    activationType: ACTIVATION_TYPES.AUTOMATIC,
    condition: (context) => {
      // 破壊されたモンスターが［ドラゴン］カテゴリか
      return context.destroyedCard.category?.includes('【ドラゴン】');
    },
    effect: (context) => {
      const { destroyedCard, currentPlayer, p1Hand, p2Hand, addLog } = context;

      const hand = currentPlayer === 1 ? p1Hand : p2Hand;

      // 手札から別の［ドラゴン］を探す
      const dragonCard = hand.find(card => {
        return card.category?.includes('【ドラゴン】') &&
               card.cost <= destroyedCard.cost &&
               card.id !== destroyedCard.id;
      });

      if (dragonCard) {
        // 特殊召喚処理
        // TODO: 特殊召喚ヘルパーを実装
        addLog(`${dragonCard.name}を場に戻した！`, 'info');
      }
    },
    description: '破壊された［ドラゴン］の代わりを召喚',
  },
},
```

### 例3: メインフェイズの任意発動トリガー

```javascript
// C0000005: 苗床粘液獣
// 【自分メインフェイズ時】、1ターンに1度、場に粘液獣が3体以上いる場合、相手モンスター1体を捕食して自身の攻撃力をアップ（捕食1体につき300、最大1500まで）。

C0000005: {
  [TRIGGER_TYPES.ON_MAIN_PHASE_SELF]: {
    activationType: ACTIVATION_TYPES.OPTIONAL, // 任意発動
    condition: (context) => {
      const { currentPlayer, p1Field, p2Field } = context;
      const field = currentPlayer === 1 ? p1Field : p2Field;

      // 場に粘液獣が3体以上いるか
      const slimeCount = field.filter(m =>
        m && m.name?.includes('粘液獣')
      ).length;

      return slimeCount >= 3;
    },
    costCheck: (context) => {
      // 1ターンに1度の制限をチェック
      // TODO: 使用済みフラグを管理
      return true;
    },
    effect: (context) => {
      // TODO: 相手モンスターを選択するUI
      // TODO: 捕食処理の実装
      const { addLog } = context;
      addLog('苗床粘液獣の効果を発動！', 'info');
    },
    description: '相手モンスター1体を捕食（粘液獣3体以上で発動可能）',
  },
},
```

---

## 移行計画

### Phase 1: 設計ドキュメントの修正
- ✅ 修正方針ドキュメント作成（このファイル）
- ⬜ trigger-system-design.md 修正
- ⬜ trigger-specifications.md 修正
- ⬜ trigger-implementation-guide.md 修正

### Phase 2: コードの実装
- ⬜ triggerTypes.js の修正
- ⬜ triggerEngine.js の修正
- ⬜ magic-spirit.jsx への統合
- ⬜ UI実装（任意発動ボタン）

### Phase 3: カード効果の実装
- ⬜ カード固有効果を新しい形式で実装
- ⬜ テストとデバッグ

---

## まとめ

### 主要な変更点

1. **トリガータイプの汎用化**
   - カテゴリ/属性特定のトリガーを汎用化
   - 条件関数で柔軟に対応

2. **発動タイプの追加**
   - 自動発動（automatic）と任意発動（optional）を区別
   - メインフェイズトリガーは任意発動

3. **UI対応**
   - 任意発動トリガーを表示するUI
   - プレイヤーが発動を選択

この修正により、より柔軟で拡張性の高いトリガーシステムを実現できます。

---

**関連ドキュメント**:
- `trigger-system-design.md` - システム設計（修正予定）
- `trigger-specifications.md` - トリガー仕様（修正予定）
- `trigger-implementation-guide.md` - 実装ガイド（修正予定）
