# トリガーシステム設計の修正方針

**作成日**: 2025-11-26
**バージョン**: 1.2（UIフロー修正版）
**修正理由**: ユーザーフィードバックに基づく設計改善（カード紐づけ型UI）

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

### 問題2: メインフェイズトリガーの発動タイミングとUI

**現在の設計**:
- 【自分メインフェイズ時】を自動発動トリガーとして扱っている
- フェイズ開始時に自動的に発火

**問題**:
- メインフェイズトリガーは実際には**任意発動**（プレイヤーが発動を選択）
- フェイズ開始時ではなく、**メインフェイズ中いつでも発動可能**（基本技と同じ）
- トリガーは**カードに紐づく**（全トリガーを一覧表示するのではない）
- 墓地トリガーは墓地カードを選択する必要がある

**正しいUI設計**:
- **フィールドカード選択時**: 基本技/上級技と同じエリアに【自分メインフェイズ時】トリガーを表示
- **墓地カード選択時**: 墓地UI（モーダル等）で墓地カードを選択し、【墓地で発動】トリガーを表示

**影響範囲**:
- 【自分メインフェイズ時】トリガー（フィールドカードに紐づく）
- 【自分メインフェイズ時、墓地で発動】トリガー（墓地カードに紐づく）
- 墓地UI実装（新規）

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

### 修正3: メインフェイズトリガーの扱い（カード紐づけ型）

#### 現在のフロー（問題あり）
```
メインフェイズ開始
  ↓
自動的に全ての【自分メインフェイズ時】トリガーが発火
  ↓
プレイヤーは選択できない
```

#### 修正後のフロー（フィールドカード）
```
メインフェイズ中
  ↓
【フィールドのモンスターを選択】
  ↓
選択したカードのスキル/トリガーを表示:
  - 基本技ボタン
  - 上級技ボタン
  - 【自分メインフェイズ時】トリガーボタン ← NEW!
  ↓
プレイヤーがボタンをクリックして発動
```

#### 修正後のフロー（墓地カード）
```
メインフェイズ中
  ↓
【墓地エリアをクリック】
  ↓
墓地カード一覧を表示（モーダル or パネル）
  ↓
【墓地カードを選択】
  ↓
選択した墓地カードの効果を表示:
  - 【自分メインフェイズ時、墓地で発動】トリガーボタン
  ↓
プレイヤーがボタンをクリックして発動
  ↓
墓地UIを閉じる
```

#### UI実装イメージ（フィールドカード）

```javascript
// フィールドカード選択時、既存のスキル表示エリアに統合
{selectedFieldMonster && phase === 2 && (
  <div style={styles.skillPanel}>
    {/* 基本技 */}
    {selectedFieldMonster.basicSkill && (
      <button onClick={() => useBasicSkill()}>
        基本技: {selectedFieldMonster.basicSkill}
      </button>
    )}

    {/* 上級技 */}
    {selectedFieldMonster.advancedSkill && chargeCount >= 3 && (
      <button onClick={() => useAdvancedSkill()}>
        上級技: {selectedFieldMonster.advancedSkill}
      </button>
    )}

    {/* 【自分メインフェイズ時】トリガー */}
    {getCardMainPhaseTriggers(selectedFieldMonster).map((trigger, idx) => (
      <button
        key={idx}
        onClick={() => activateTrigger(trigger)}
        disabled={trigger.usedThisTurn}
      >
        {trigger.description}
        {trigger.usedThisTurn && ' (使用済み)'}
      </button>
    ))}
  </div>
)}
```

#### UI実装イメージ（墓地カード）

```javascript
// 墓地エリアのボタン
<button onClick={() => setShowGraveyard(true)}>
  墓地を確認 ({currentGraveyard.length}枚)
</button>

// 墓地モーダル
{showGraveyard && (
  <div style={styles.graveyardModal}>
    <h3>墓地</h3>
    {currentGraveyard.map((card, idx) => (
      <div
        key={idx}
        onClick={() => setSelectedGraveyardCard(card)}
        style={{
          ...styles.graveyardCard,
          border: selectedGraveyardCard === card ? '2px solid gold' : 'none'
        }}
      >
        <Card card={card} small />
      </div>
    ))}

    {/* 選択した墓地カードのトリガー */}
    {selectedGraveyardCard && phase === 2 && (
      <div style={styles.graveyardTriggerPanel}>
        {getCardGraveyardTriggers(selectedGraveyardCard).map((trigger, idx) => (
          <button
            key={idx}
            onClick={() => {
              activateTrigger(trigger);
              setShowGraveyard(false);
            }}
            disabled={!trigger.canActivate}
          >
            {trigger.description}
            {trigger.cost && ` (SP${trigger.cost})`}
          </button>
        ))}
      </div>
    )}

    <button onClick={() => setShowGraveyard(false)}>閉じる</button>
  </div>
)}
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

#### カードに紐づくトリガーの取得

```javascript
/**
 * 特定のカードに紐づくメインフェイズトリガーを取得（フィールドカード用）
 * @param {object} card - カードオブジェクト
 * @param {number} currentPlayer - 現在のプレイヤー
 * @returns {Array} 発動可能なトリガーの配列
 */
export const getCardMainPhaseTriggers = (card, currentPlayer) => {
  if (!card || !card.uniqueId) return [];

  return globalRegistry.get(TRIGGER_TYPES.ON_MAIN_PHASE_SELF)
    .filter(trigger => {
      // このカードのトリガーのみ
      return trigger.cardId === card.uniqueId &&
             trigger.owner === currentPlayer;
    })
    .map(trigger => ({
      ...trigger,
      usedThisTurn: trigger.usedThisTurn || false,
      canActivate: !trigger.usedThisTurn && checkTriggerCondition(trigger),
    }));
};

/**
 * 墓地カードのトリガーを取得（墓地カード用）
 * @param {object} card - 墓地のカードオブジェクト
 * @param {object} context - ゲームコンテキスト
 * @returns {Array} 発動可能なトリガーの配列
 */
export const getCardGraveyardTriggers = (card, context) => {
  if (!card || !card.uniqueId) return [];

  // 墓地のカードは登録されていないので、効果テキストをパース
  const triggers = parseCardTriggers(card);

  return triggers
    .filter(trigger => {
      return trigger.type === TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD;
    })
    .map(trigger => ({
      ...trigger,
      cardId: card.uniqueId,
      cardName: card.name,
      canActivate: checkGraveyardTriggerActivatable(card, trigger, context),
    }));
};

/**
 * トリガーを手動で発動
 * @param {object} trigger
 * @param {object} context
 */
export const activateTrigger = (trigger, context) => {
  try {
    // 使用済みフラグを設定
    trigger.usedThisTurn = true;

    if (typeof trigger.effect === 'function') {
      trigger.effect(context);
    }

    context.addLog(`${trigger.cardName}の効果を発動！`, 'info');
  } catch (error) {
    console.error(`トリガー発動エラー: ${trigger.cardName}`, error);
  }
};

/**
 * ターン終了時に使用済みフラグをリセット
 */
export const resetTurnFlags = () => {
  globalRegistry.triggers.forEach((triggerArray) => {
    triggerArray.forEach(trigger => {
      trigger.usedThisTurn = false;
    });
  });
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
      // メインフェイズトリガーは自動発火しない
      // カード選択時に表示されるため、ここでは何もしない
      break;

    // その他のフェイズは自動発動
    case 0: // ターン開始
      fireTrigger(TRIGGER_TYPES.ON_TURN_START_SELF, context);
      break;

    case 4: // エンドフェイズ
      fireTrigger(TRIGGER_TYPES.ON_END_PHASE_SELF, context);
      fireTrigger(TRIGGER_TYPES.ON_END_PHASE, context);
      // ターン終了時に使用済みフラグをリセット
      resetTurnFlags();
      break;
  }
}, [currentPlayer, /* ... */]);
```

#### UI: フィールドカードのトリガー表示（既存のスキル表示エリアに統合）

```javascript
// フィールドモンスター選択時のUI（既存のスキルパネルに追加）
{selectedFieldMonster && phase === 2 && (
  <div style={styles.skillPanel}>
    {/* 既存の基本技 */}
    {selectedFieldMonster.basicSkill && (
      <button onClick={() => useBasicSkill()}>
        基本技: {selectedFieldMonster.basicSkill}
      </button>
    )}

    {/* 既存の上級技 */}
    {selectedFieldMonster.advancedSkill && chargeCount >= 3 && (
      <button onClick={() => useAdvancedSkill()}>
        上級技: {selectedFieldMonster.advancedSkill}
      </button>
    )}

    {/* 【自分メインフェイズ時】トリガー - NEW! */}
    {getCardMainPhaseTriggers(selectedFieldMonster, currentPlayer).map((trigger, idx) => (
      <button
        key={idx}
        onClick={() => {
          activateTrigger(trigger, {
            currentPlayer,
            card: selectedFieldMonster,
            slotIndex: selectedFieldMonsterIndex,
            // ... その他のcontext
          });
        }}
        disabled={trigger.usedThisTurn}
        style={styles.triggerButton}
      >
        {trigger.description}
        {trigger.usedThisTurn && ' (使用済み)'}
      </button>
    ))}
  </div>
)}
```

#### UI: 墓地カードのトリガー表示（新規実装）

```javascript
// ステート追加
const [showGraveyard, setShowGraveyard] = useState(false);
const [selectedGraveyardCard, setSelectedGraveyardCard] = useState(null);

// 墓地ボタン（プレイヤーエリアに配置）
<button
  onClick={() => setShowGraveyard(true)}
  style={styles.graveyardButton}
>
  墓地 ({currentGraveyard.length})
</button>

// 墓地モーダル
{showGraveyard && (
  <div style={styles.modalOverlay}>
    <div style={styles.graveyardModal}>
      <h3>墓地カード一覧</h3>

      <div style={styles.graveyardCardList}>
        {currentGraveyard.map((card, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedGraveyardCard(card)}
            style={{
              ...styles.graveyardCard,
              border: selectedGraveyardCard === card ? '3px solid gold' : '1px solid #666',
            }}
          >
            <Card card={card} small />
          </div>
        ))}
      </div>

      {/* 選択した墓地カードの効果表示 */}
      {selectedGraveyardCard && phase === 2 && (
        <div style={styles.graveyardTriggerPanel}>
          <h4>{selectedGraveyardCard.name} の効果</h4>
          {getCardGraveyardTriggers(selectedGraveyardCard, {
            currentPlayer,
            // ... context
          }).map((trigger, idx) => (
            <button
              key={idx}
              onClick={() => {
                activateTrigger(trigger, {
                  currentPlayer,
                  card: selectedGraveyardCard,
                  // ... context
                });
                setShowGraveyard(false);
                setSelectedGraveyardCard(null);
              }}
              disabled={!trigger.canActivate}
              style={styles.triggerButton}
            >
              {trigger.description}
              {trigger.cost && ` (コスト: SP${trigger.cost})`}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          setShowGraveyard(false);
          setSelectedGraveyardCard(null);
        }}
        style={styles.closeButton}
      >
        閉じる
      </button>
    </div>
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

1. **トリガータイプの汎用化** ✅
   - カテゴリ/属性特定のトリガーを汎用化
   - 条件関数で柔軟に対応
   - 51種類 → 約20種類に削減

2. **発動タイプの追加**
   - 自動発動（automatic）と任意発動（optional）を区別
   - デフォルトは自動発動、カード固有で任意化可能

3. **メインフェイズトリガーのUI統合** ⭐ 重要
   - **トリガーはカードに紐づく**
   - フィールドカード選択時 → 基本技/上級技と同じエリアに表示
   - 墓地カード選択時 → 墓地UIで墓地カードを選択して表示
   - **メインフェイズ中いつでも発動可能**（基本技と同じ）

4. **墓地UI実装** 🆕
   - 墓地カード一覧を表示するモーダル/パネル
   - 墓地カード選択機能
   - 墓地トリガー発動UI

5. **1ターン1度制限の管理**
   - `usedThisTurn` フラグで管理
   - エンドフェイズ時にリセット

### 設計の利点

✅ **一貫したUX**: 基本技/上級技と同じUIパターン
✅ **直感的**: カード選択 → 効果発動という自然なフロー
✅ **拡張性**: 新しいカテゴリ/属性にも柔軟に対応
✅ **戦略性**: プレイヤーが発動タイミングを選択

この修正により、より柔軟で拡張性の高いトリガーシステムを実現できます。

---

**関連ドキュメント**:
- `trigger-system-design.md` - システム設計（修正予定）
- `trigger-specifications.md` - トリガー仕様（修正予定）
- `trigger-implementation-guide.md` - 実装ガイド（修正予定）
