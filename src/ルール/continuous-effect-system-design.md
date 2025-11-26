# 常時効果システム設計書

## 1. 概要

### 1.1 背景

Magic Spiritには57枚以上のカードが【常時】効果を持っています。現在のトリガーシステムはイベント駆動型ですが、常時効果は**状態ベース型**の処理が必要です。

### 1.2 イベント駆動型 vs 状態ベース型

| 方式 | イベント駆動型（現行トリガー） | 状態ベース型（常時効果） |
|-----|------------------------|-------------------|
| 発動タイミング | イベント発生時（召喚時、破壊時等） | カードが場にある間常に |
| 効果の持続 | 一度だけ実行 | 継続的に適用 |
| 更新タイミング | fireTrigger()呼び出し時 | 場の状態変化ごと |

### 1.3 設計方針

- **データ駆動型**: 効果をデータとして定義し、汎用エンジンで処理
- **拡張性重視**: 新カード追加はデータ追加のみで完了
- **型安全**: 効果タイプと条件を明確に定義
- **パフォーマンス**: 必要時のみ計算、キャッシュ活用

---

## 2. アーキテクチャ

### 2.1 ファイル構成

```
src/engine/continuousEffects/
├── index.js                    # エクスポート集約
├── effectTypes.js              # 効果タイプ定義
├── conditionTypes.js           # 条件タイプ定義
├── targetTypes.js              # ターゲットタイプ定義
├── effectEngine.js             # 効果エンジン本体
├── conditionChecker.js         # 条件チェックユーティリティ
├── valueCalculator.js          # 値計算ユーティリティ
└── effectDefinitions/          # カード別効果定義
    ├── index.js                # 全効果を集約
    ├── fieldCards.js           # フィールドカードの常時効果
    ├── phaseCards.js           # フェイズカードの常時効果
    ├── fireCards.js            # 炎属性モンスター
    ├── waterCards.js           # 水属性モンスター
    ├── lightCards.js           # 光属性モンスター
    ├── darkCards.js            # 闇属性モンスター
    ├── primitiveCards.js       # 原始属性モンスター
    ├── futureCards.js          # 未来属性モンスター
    └── neutralCards.js         # なし属性モンスター
```

### 2.2 システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                    magic-spirit.jsx                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ summonCard()│ │  attack()   │ │ getActualCost()     │   │
│  └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘   │
│         │               │                    │              │
└─────────┼───────────────┼────────────────────┼──────────────┘
          │               │                    │
          ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  ContinuousEffectEngine                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   activeEffects                       │  │
│  │         Map<uniqueId, {card, owner, effects[]}>       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │ register()     │ │ unregister()   │ │ clear()        │  │
│  └────────────────┘ └────────────────┘ └────────────────┘  │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │              計算メソッド群                             ││
│  │  ┌──────────────────┐ ┌──────────────────────────┐    ││
│  │  │calculateAtkMod() │ │calculateDamageReduction()│    ││
│  │  └──────────────────┘ └──────────────────────────┘    ││
│  │  ┌──────────────────┐ ┌──────────────────────────┐    ││
│  │  │calculateCostMod()│ │canAttack()               │    ││
│  │  └──────────────────┘ └──────────────────────────┘    ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              effectDefinitions (データ層)                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ fieldCards │ │ fireCards  │ │ waterCards │ ...          │
│  └────────────┘ └────────────┘ └────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 効果タイプ定義

### 3.1 CONTINUOUS_EFFECT_TYPES

```javascript
export const CONTINUOUS_EFFECT_TYPES = {
  // ========================================
  // ステータス修正 (Stat Modifiers)
  // ========================================

  /**
   * 攻撃力修正
   * 例: 「光属性モンスターの攻撃力を500アップ」
   */
  ATK_MODIFIER: 'atk_modifier',

  /**
   * HP修正
   * 例: 「『アクアレギナ』モンスターのHPを600アップ」
   */
  HP_MODIFIER: 'hp_modifier',

  // ========================================
  // ダメージ関連 (Damage Effects)
  // ========================================

  /**
   * ダメージ軽減
   * 例: 「光属性が受けるダメージを200軽減」
   */
  DAMAGE_REDUCTION: 'damage_reduction',

  /**
   * ダメージ無効
   * 例: 「［ドラゴン］は効果ダメージを受けない」
   */
  DAMAGE_IMMUNITY: 'damage_immunity',

  /**
   * 与ダメージ増加
   * 例: 「未来属性が与えるダメージを500アップ」
   */
  DAMAGE_DEALT_MODIFIER: 'damage_dealt_modifier',

  /**
   * 被ダメージ増加
   * 例: 「相手の闇属性が受けるダメージを400アップ」
   */
  DAMAGE_RECEIVED_MODIFIER: 'damage_received_modifier',

  // ========================================
  // コスト関連 (Cost Modifiers)
  // ========================================

  /**
   * 召喚コスト修正
   * 例: 「水属性モンスターの召喚コストを1軽減」
   */
  SUMMON_COST_MODIFIER: 'summon_cost_modifier',

  /**
   * 魔法カードコスト修正
   * 例: 「《黒呪》魔法カードのコストを1軽減」
   */
  MAGIC_COST_MODIFIER: 'magic_cost_modifier',

  // ========================================
  // 制限・禁止 (Restrictions)
  // ========================================

  /**
   * 攻撃制限
   * 例: 「このカードは攻撃できない」
   */
  ATTACK_RESTRICTION: 'attack_restriction',

  /**
   * SP制限
   * 例: 「自分のSPはすべてレスト状態になる」
   */
  SP_RESTRICTION: 'sp_restriction',

  // ========================================
  // 無効化 (Negation)
  // ========================================

  /**
   * 魔法カード無効化
   * 例: 「相手の魔法カードの発動をターンに1度無効化」
   */
  MAGIC_NEGATION: 'magic_negation',

  /**
   * 技無効化
   * 例: 「相手の基本技を1ターンに1度無効化」
   */
  SKILL_NEGATION: 'skill_negation',

  // ========================================
  // 召喚連動 (Summon-Linked)
  // ========================================

  /**
   * 召喚時バフ
   * 例: 「光属性が召喚されるたび、HPを200アップ」
   * Note: これは召喚イベント時に適用される特殊な常時効果
   */
  ON_SUMMON_BUFF: 'on_summon_buff',
};
```

---

## 4. ターゲットタイプ定義

### 4.1 TARGET_TYPES

```javascript
export const TARGET_TYPES = {
  // ========================================
  // モンスター対象
  // ========================================

  /**
   * このカード自身
   * 例: 「場にいる粘液獣1体につき自身の攻撃力を1500アップ」
   */
  SELF_CARD: 'self_card',

  /**
   * 自分のモンスター全体
   * 例: 「光属性モンスターの攻撃力を500アップ」
   */
  SELF_MONSTERS: 'self_monsters',

  /**
   * 相手のモンスター全体
   * 例: 「相手モンスター全体の攻撃力をダウン」
   */
  OPPONENT_MONSTERS: 'opponent_monsters',

  /**
   * 全モンスター
   * 例: 「場のすべてのモンスターの攻撃力をダウン」
   */
  ALL_MONSTERS: 'all_monsters',

  // ========================================
  // コスト対象
  // ========================================

  /**
   * 自分の召喚
   * 例: 「水属性モンスターの召喚コストを1軽減」
   */
  SELF_SUMMON: 'self_summon',

  /**
   * 相手の召喚
   * 例: 「相手のモンスター召喚コストを1増加」
   */
  OPPONENT_SUMMON: 'opponent_summon',

  /**
   * 自分の魔法カード
   * 例: 「《黒呪》魔法カードのコストを1軽減」
   */
  SELF_MAGIC: 'self_magic',

  /**
   * 相手の魔法カード
   * 例: 「相手の魔法カードのコストを1増加」
   */
  OPPONENT_MAGIC: 'opponent_magic',
};
```

---

## 5. 条件タイプ定義

### 5.1 基本条件

```javascript
/**
 * 条件オブジェクトの構造
 * すべてのプロパティはオプショナルで、ANDで結合される
 */
const conditionExample = {
  // 属性条件
  attribute: '光',                    // 単一属性
  attributes: ['光', '闇'],           // 複数属性（OR）

  // カテゴリ条件
  category: '【ドラゴン】',            // カテゴリを含む
  categories: ['【ドラゴン】', '【ワイバーン】'], // 複数カテゴリ（OR）

  // 名前条件
  nameIncludes: '粘液獣',             // 名前に含む
  nameExact: 'ブリザードマスター',      // 名前が一致

  // コスト条件
  maxCost: 3,                         // コスト以下
  minCost: 5,                         // コスト以上

  // 場の状態条件
  minFieldMonsters: 2,                // 場のモンスター数以上
  minAttributeOnField: { attribute: '光', count: 2 },  // 特定属性の数
  hasCardOnField: 'C0000XXX',         // 特定カードが場にある
  hasCategoryOnField: '【ドラゴン】',   // 特定カテゴリが場にある

  // ライフ条件
  maxLife: 2000,                      // ライフ以下
  minLife: 4000,                      // ライフ以上

  // ターン条件
  isMyTurn: true,                     // 自分のターン中のみ

  // 除外条件
  excludeSelf: true,                  // 自身を含めない（カウント時）
};
```

### 5.2 値計算タイプ

```javascript
export const VALUE_CALCULATOR_TYPES = {
  /**
   * 固定値
   * value: 500 → 常に500
   */
  FIXED: 'fixed',

  /**
   * 数量×基本値
   * baseValue: 1500, countCondition: {category: '【粘液獣】'}
   * → 場の粘液獣数 × 1500
   */
  COUNT_MULTIPLY: 'count_multiply',

  /**
   * 条件付き値
   * value: 400, ifCondition: {hasCategoryOnField: '【ドラゴン】'}
   * → ドラゴンがいれば400、いなければ0
   */
  CONDITIONAL: 'conditional',

  /**
   * カスタム計算
   * customCalculator: (context) => { return computedValue; }
   */
  CUSTOM: 'custom',
};
```

---

## 6. 効果定義データ構造

### 6.1 基本構造

```javascript
/**
 * 効果定義の基本構造
 */
const effectDefinitionExample = {
  // 必須フィールド
  type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,

  // 値関連（type によって必要なフィールドが異なる）
  value: 500,                         // 固定値
  // または
  valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
  baseValue: 1500,
  countCondition: { category: '【粘液獣】', excludeSelf: true },
  // または
  customCalculator: (context) => { /* 複雑な計算 */ },

  // ターゲット
  target: TARGET_TYPES.SELF_MONSTERS,

  // 条件（オプション）
  condition: { attribute: '光' },

  // 使用回数制限（オプション）
  usesPerTurn: 1,                     // 1ターンに1度

  // 特殊フラグ（オプション）
  damageSource: 'effect',             // DAMAGE_IMMUNITY用: 'effect' | 'battle' | 'all'
  skillType: 'basic',                 // SKILL_NEGATION用: 'basic' | 'advanced' | 'all'
  restriction: 'CANNOT_ATTACK',       // ATTACK_RESTRICTION用
};
```

### 6.2 カード定義例

```javascript
// src/engine/continuousEffects/effectDefinitions/fieldCards.js

import { CONTINUOUS_EFFECT_TYPES } from '../effectTypes';
import { TARGET_TYPES } from '../targetTypes';
import { VALUE_CALCULATOR_TYPES } from '../valueCalculator';

export const fieldCardEffects = {
  /**
   * C0000071: クリスタルサンクチュアリ
   * 【常時】光属性モンスターの攻撃力を500アップ。
   * 【常時】2体以上光属性モンスターが場にいるとき相手の基本技の効果を1ターンに1度無効化できる。
   */
  C0000071: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 500,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '光' },
    },
    {
      type: CONTINUOUS_EFFECT_TYPES.SKILL_NEGATION,
      skillType: 'basic',
      usesPerTurn: 1,
      condition: { minAttributeOnField: { attribute: '光', count: 2 } },
    },
  ],

  /**
   * C0000053: 母なる大海
   * 【常時】水属性モンスターの攻撃力300アップ。
   */
  C0000053: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 300,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '水' },
    },
  ],

  /**
   * C0000073: 輝く天蓋
   * 【常時】相手モンスター全体の攻撃力を、場にいる光属性モンスター1体につき200ダウン。
   */
  C0000073: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
      baseValue: -200,
      countCondition: { attribute: '光' },
      target: TARGET_TYPES.OPPONENT_MONSTERS,
    },
  ],

  /**
   * C0000055: 深淵の潮流
   * 【常時】水属性モンスターの召喚コストを1軽減。
   */
  C0000055: [
    {
      type: CONTINUOUS_EFFECT_TYPES.SUMMON_COST_MODIFIER,
      value: -1,
      target: TARGET_TYPES.SELF_SUMMON,
      condition: { attribute: '水' },
    },
  ],

  /**
   * C0000089: 闇の宮殿
   * 【常時】闇属性モンスターの攻撃力を400アップ。
   */
  C0000089: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '闇' },
    },
  ],

  /**
   * C0000123: 禁忌の王座
   * 【常時】自分のライフが2000以下の場合、闇属性モンスターの召喚コストを1軽減。
   */
  C0000123: [
    {
      type: CONTINUOUS_EFFECT_TYPES.SUMMON_COST_MODIFIER,
      value: -1,
      target: TARGET_TYPES.SELF_SUMMON,
      condition: { attribute: '闇', maxLife: 2000 },
    },
  ],
};
```

```javascript
// src/engine/continuousEffects/effectDefinitions/primitiveCards.js

export const primitiveCardEffects = {
  /**
   * C0000007: 粘液獣・キング
   * 【常時】場にいる粘液獣1体につき自身の攻撃力を1500アップ（自身は含めない）。
   */
  C0000007: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
      baseValue: 1500,
      countCondition: { category: '【粘液獣】', excludeSelf: true },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],
};
```

```javascript
// src/engine/continuousEffects/effectDefinitions/fireCards.js

export const fireCardEffects = {
  /**
   * C0000028: 炎竜母フレイマ
   * 【常時】自分の［ドラゴン］モンスターは効果でダメージを受けない。
   */
  C0000028: [
    {
      type: CONTINUOUS_EFFECT_TYPES.DAMAGE_IMMUNITY,
      damageSource: 'effect',
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { category: '【ドラゴン】' },
    },
  ],

  /**
   * C0000029: クリムゾン・ワイバーン
   * 【常時】［ドラゴン］モンスターがいる時、このカードの攻撃力は400アップする。
   */
  C0000029: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      valueCalculator: VALUE_CALCULATOR_TYPES.CONDITIONAL,
      value: 400,
      ifCondition: { hasCategoryOnField: '【ドラゴン】' },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],
};
```

```javascript
// src/engine/continuousEffects/effectDefinitions/darkCards.js

export const darkCardEffects = {
  /**
   * C0000080: 闇魔界の貴婦人
   * 【常時】相手の魔法カードのコストを1増加する。
   */
  C0000080: [
    {
      type: CONTINUOUS_EFFECT_TYPES.MAGIC_COST_MODIFIER,
      value: 1,
      target: TARGET_TYPES.OPPONENT_MAGIC,
    },
  ],

  /**
   * C0000114: 闇の巨像
   * 【常時】このカードは攻撃できない。
   */
  C0000114: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATTACK_RESTRICTION,
      target: TARGET_TYPES.SELF_CARD,
      restriction: 'CANNOT_ATTACK',
    },
  ],
};
```

```javascript
// src/engine/continuousEffects/effectDefinitions/lightCards.js

export const lightCardEffects = {
  /**
   * C0000020: 灯火の護衛霊
   * 【常時】自分の光属性モンスターが受けるダメージを200軽減する（1ターンに1度）。
   */
  C0000020: [
    {
      type: CONTINUOUS_EFFECT_TYPES.DAMAGE_REDUCTION,
      value: 200,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '光' },
      usesPerTurn: 1,
    },
  ],

  /**
   * C0000091: 灯火の精霊
   * 【常時】自分の光属性モンスターが召喚されるたび、そのモンスターのHPを200アップ。
   */
  C0000091: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ON_SUMMON_BUFF,
      statType: 'hp',
      value: 200,
      condition: { attribute: '光' },
    },
  ],

  /**
   * C0000234: 撮影会のリリカ
   * 【常時】相手の魔法カードの発動をターンに1度無効化。
   */
  C0000234: [
    {
      type: CONTINUOUS_EFFECT_TYPES.MAGIC_NEGATION,
      usesPerTurn: 1,
    },
  ],
};
```

---

## 7. エンジンAPI

### 7.1 ContinuousEffectEngine クラス

```javascript
class ContinuousEffectEngine {
  // ========================================
  // ライフサイクル管理
  // ========================================

  /**
   * カードの常時効果を登録
   * @param {Object} card - カードオブジェクト
   * @param {number} owner - オーナー（1 or 2）
   */
  register(card, owner) { }

  /**
   * カードの常時効果を解除
   * @param {string} uniqueId - カードのuniqueId
   */
  unregister(uniqueId) { }

  /**
   * 全効果をクリア（ゲームリセット時）
   */
  clear() { }

  /**
   * ターンごとの使用フラグをリセット
   */
  resetTurnFlags() { }

  // ========================================
  // ステータス修正計算
  // ========================================

  /**
   * 攻撃力修正値を計算
   * @param {Object} monster - 対象モンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値（正: アップ, 負: ダウン）
   */
  calculateAttackModifier(monster, context) { }

  /**
   * HP修正値を計算
   * @param {Object} monster - 対象モンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値
   */
  calculateHPModifier(monster, context) { }

  // ========================================
  // ダメージ関連計算
  // ========================================

  /**
   * ダメージ軽減値を計算
   * @param {Object} target - ダメージを受けるモンスター
   * @param {string} damageSource - ダメージ源 ('battle' | 'effect')
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 軽減値（Infinity = 完全無効）
   */
  calculateDamageReduction(target, damageSource, context) { }

  /**
   * 与ダメージ修正値を計算
   * @param {Object} attacker - 攻撃モンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値
   */
  calculateDamageDealtModifier(attacker, context) { }

  // ========================================
  // コスト修正計算
  // ========================================

  /**
   * 召喚コスト修正値を計算
   * @param {Object} card - 召喚するカード
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値（正: 増加, 負: 軽減）
   */
  calculateSummonCostModifier(card, context) { }

  /**
   * 魔法カードコスト修正値を計算
   * @param {Object} card - 発動する魔法カード
   * @param {Object} context - ゲームコンテキスト
   * @returns {number} 修正値
   */
  calculateMagicCostModifier(card, context) { }

  // ========================================
  // 制限チェック
  // ========================================

  /**
   * モンスターが攻撃可能かチェック
   * @param {Object} monster - チェック対象モンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {boolean} 攻撃可能ならtrue
   */
  canAttack(monster, context) { }

  // ========================================
  // 無効化チェック
  // ========================================

  /**
   * 魔法カードを無効化できるかチェック（無効化も実行）
   * @param {Object} magicCard - 発動された魔法カード
   * @param {Object} context - ゲームコンテキスト
   * @returns {boolean} 無効化されたらtrue
   */
  tryNegateMagic(magicCard, context) { }

  /**
   * 技を無効化できるかチェック（無効化も実行）
   * @param {string} skillType - 技タイプ ('basic' | 'advanced')
   * @param {Object} context - ゲームコンテキスト
   * @returns {boolean} 無効化されたらtrue
   */
  tryNegateSkill(skillType, context) { }

  // ========================================
  // 召喚連動効果
  // ========================================

  /**
   * 召喚時バフを適用
   * @param {Object} summonedMonster - 召喚されたモンスター
   * @param {Object} context - ゲームコンテキスト
   * @returns {Object} 適用されたバフ情報 {atkBuff, hpBuff}
   */
  applySummonBuffs(summonedMonster, context) { }

  // ========================================
  // デバッグ・ユーティリティ
  // ========================================

  /**
   * 登録されている全効果を取得（デバッグ用）
   * @returns {Map} activeEffects
   */
  getActiveEffects() { }

  /**
   * 特定カードの効果を取得
   * @param {string} uniqueId - カードのuniqueId
   * @returns {Array} 効果配列
   */
  getEffectsForCard(uniqueId) { }
}
```

---

## 8. ゲームエンジン統合

### 8.1 magic-spirit.jsx での統合箇所

```javascript
// インポート
import { continuousEffectEngine } from './engine/continuousEffects';

// ========================================
// ゲーム初期化
// ========================================
const initGame = () => {
  // ... 既存の初期化処理
  continuousEffectEngine.clear();
};

// ========================================
// カード召喚
// ========================================
const summonCard = (card, slotIndex) => {
  // ... 既存の召喚処理

  // 常時効果を登録
  continuousEffectEngine.register(monsterInstance, currentPlayer);

  // 召喚時バフを適用
  const buffs = continuousEffectEngine.applySummonBuffs(monsterInstance, context);
  if (buffs.hpBuff > 0) {
    monsterInstance.hp += buffs.hpBuff;
    monsterInstance.maxHp += buffs.hpBuff;
    addLog(`${monsterInstance.name}のHPが${buffs.hpBuff}アップ！`, 'info');
  }
};

// ========================================
// 召喚コスト計算
// ========================================
const getActualSummonCost = (card) => {
  const baseCost = card.cost;
  const modifier = continuousEffectEngine.calculateSummonCostModifier(card, context);
  return Math.max(0, baseCost + modifier);
};

// ========================================
// モンスター破壊
// ========================================
const destroyMonster = (monster, field, setField, graveyard, setGraveyard) => {
  // 常時効果を解除
  continuousEffectEngine.unregister(monster.uniqueId);

  // ... 既存の破壊処理
};

// ========================================
// 攻撃処理
// ========================================
const attack = (attackerIndex, targetIndex) => {
  const attacker = currentField[attackerIndex];

  // 攻撃可能チェック
  if (!continuousEffectEngine.canAttack(attacker, context)) {
    addLog(`${attacker.name}は攻撃できない！`, 'info');
    return;
  }

  // 攻撃力計算（常時効果を適用）
  const atkModifier = continuousEffectEngine.calculateAttackModifier(attacker, context);
  const effectiveAttack = attacker.attack + atkModifier;

  if (targetIndex === -1) {
    // 直接攻撃
    // ... 既存の処理
  } else {
    // モンスター攻撃
    const target = opponentField[targetIndex];

    // ターゲットの攻撃力修正も計算
    const targetAtkMod = continuousEffectEngine.calculateAttackModifier(target, context);
    const targetEffectiveAtk = target.attack + targetAtkMod;

    // ダメージ計算
    let damage = effectiveAttack;

    // 与ダメージ修正
    damage += continuousEffectEngine.calculateDamageDealtModifier(attacker, context);

    // ダメージ軽減
    const reduction = continuousEffectEngine.calculateDamageReduction(target, 'battle', context);
    if (reduction === Infinity) {
      addLog(`${target.name}へのダメージは無効化された！`, 'info');
      return;
    }
    damage = Math.max(1, damage - reduction);

    // ... 既存のダメージ適用処理
  }
};

// ========================================
// 魔法カード発動
// ========================================
const useMagicCard = () => {
  const magicCard = selectedHandCard;

  // コスト計算（常時効果を適用）
  const baseCost = magicCard.cost;
  const costModifier = continuousEffectEngine.calculateMagicCostModifier(magicCard, context);
  const actualCost = Math.max(0, baseCost + costModifier);

  // コストチェック
  if (activeSP < actualCost) {
    addLog('SPが足りません！', 'info');
    return;
  }

  // 無効化チェック
  if (continuousEffectEngine.tryNegateMagic(magicCard, context)) {
    addLog(`${magicCard.name}は無効化された！`, 'info');
    // SPは消費、カードは墓地へ
    setActiveSP(prev => prev - actualCost);
    // ... 墓地送り処理
    return;
  }

  // ... 既存の発動処理
};

// ========================================
// 技実行
// ========================================
const executeSkill = (monsterIndex, skillType) => {
  // 無効化チェック
  if (continuousEffectEngine.tryNegateSkill(skillType, context)) {
    addLog(`${skillType === 'basic' ? '基本技' : '上級技'}は無効化された！`, 'info');
    return;
  }

  // ... 既存の技実行処理
};

// ========================================
// ターン開始時
// ========================================
useEffect(() => {
  if (phase === 0) { // ターン開始フェイズ
    continuousEffectEngine.resetTurnFlags();
  }
}, [phase]);

// ========================================
// UI表示用: 実効攻撃力を取得
// ========================================
const getEffectiveAttack = (monster) => {
  const modifier = continuousEffectEngine.calculateAttackModifier(monster, context);
  return monster.attack + modifier;
};
```

---

## 9. 実装ロードマップ

### Phase 1: 基盤構築（優先度: 最高）

| タスク | 工数目安 | 成果物 |
|-------|---------|--------|
| effectTypes.js 作成 | 15分 | 効果タイプ定義 |
| targetTypes.js 作成 | 10分 | ターゲットタイプ定義 |
| conditionChecker.js 作成 | 30分 | 条件チェックユーティリティ |
| valueCalculator.js 作成 | 20分 | 値計算ユーティリティ |
| effectEngine.js 基本実装 | 1時間 | エンジン基本機能 |

### Phase 2: 攻撃力修正（優先度: 高）

| タスク | 工数目安 | カバー枚数 |
|-------|---------|----------|
| フィールドカード効果定義 | 30分 | 15枚 |
| モンスター効果定義 | 45分 | 16枚 |
| magic-spirit.jsx 統合（攻撃） | 30分 | - |
| テスト | 30分 | - |

### Phase 3: コスト修正（優先度: 中）

| タスク | 工数目安 | カバー枚数 |
|-------|---------|----------|
| コスト修正効果定義 | 20分 | 5枚 |
| magic-spirit.jsx 統合（召喚・魔法） | 30分 | - |
| テスト | 20分 | - |

### Phase 4: ダメージ関連（優先度: 中）

| タスク | 工数目安 | カバー枚数 |
|-------|---------|----------|
| ダメージ効果定義 | 30分 | 6枚 |
| magic-spirit.jsx 統合（ダメージ計算） | 45分 | - |
| テスト | 30分 | - |

### Phase 5: 制限・無効化（優先度: 低）

| タスク | 工数目安 | カバー枚数 |
|-------|---------|----------|
| 制限効果定義 | 20分 | 4枚 |
| 無効化効果定義 | 30分 | 4枚 |
| magic-spirit.jsx 統合 | 45分 | - |
| テスト | 30分 | - |

### Phase 6: 召喚連動・残り（優先度: 低）

| タスク | 工数目安 | カバー枚数 |
|-------|---------|----------|
| 召喚連動効果定義 | 30分 | 2枚 |
| 残りのカード効果定義 | 1時間 | 5枚以上 |
| 総合テスト | 1時間 | - |

### 合計工数見積もり

| Phase | 工数 | 累計 |
|-------|-----|------|
| Phase 1 | 2時間15分 | 2時間15分 |
| Phase 2 | 2時間15分 | 4時間30分 |
| Phase 3 | 1時間10分 | 5時間40分 |
| Phase 4 | 1時間45分 | 7時間25分 |
| Phase 5 | 2時間5分 | 9時間30分 |
| Phase 6 | 2時間30分 | 12時間 |

---

## 10. カード追加ガイド

### 10.1 新カードの常時効果を追加する手順

**Step 1**: カードの属性/タイプを確認し、適切なファイルを選択

```
フィールドカード → effectDefinitions/fieldCards.js
フェイズカード   → effectDefinitions/phaseCards.js
炎属性モンスター → effectDefinitions/fireCards.js
水属性モンスター → effectDefinitions/waterCards.js
光属性モンスター → effectDefinitions/lightCards.js
闇属性モンスター → effectDefinitions/darkCards.js
原始属性モンスター → effectDefinitions/primitiveCards.js
未来属性モンスター → effectDefinitions/futureCards.js
なし属性モンスター → effectDefinitions/neutralCards.js
```

**Step 2**: 効果テキストを分析し、効果タイプを特定

```
「攻撃力を○○アップ」 → ATK_MODIFIER
「HPを○○アップ」    → HP_MODIFIER
「ダメージを○○軽減」 → DAMAGE_REDUCTION
「コストを○○軽減」   → SUMMON_COST_MODIFIER / MAGIC_COST_MODIFIER
「攻撃できない」      → ATTACK_RESTRICTION
「無効化」           → MAGIC_NEGATION / SKILL_NEGATION
```

**Step 3**: 効果定義を追加

```javascript
// 例: C0000999 - 新しい水属性モンスター
// 【常時】水属性モンスターの攻撃力を400アップ。

// effectDefinitions/waterCards.js に追加
export const waterCardEffects = {
  // ... 既存の効果

  /**
   * C0000999: カード名
   * 【常時】水属性モンスターの攻撃力を400アップ。
   */
  C0000999: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '水' },
    },
  ],
};
```

**Step 4**: 自動的に効果が有効化される（index.js で集約されるため）

### 10.2 新しい効果タイプを追加する手順

**Step 1**: effectTypes.js に新タイプを追加

```javascript
export const CONTINUOUS_EFFECT_TYPES = {
  // ... 既存

  /**
   * 新しい効果タイプ
   * 例: 「反撃ダメージを○○アップ」
   */
  COUNTER_DAMAGE_MODIFIER: 'counter_damage_modifier',
};
```

**Step 2**: effectEngine.js に計算メソッドを追加

```javascript
/**
 * 反撃ダメージ修正値を計算
 */
calculateCounterDamageModifier(defender, context) {
  let totalModifier = 0;

  for (const [uniqueId, { card, owner, effects }] of this.activeEffects) {
    for (const effect of effects) {
      if (effect.type !== CONTINUOUS_EFFECT_TYPES.COUNTER_DAMAGE_MODIFIER) continue;
      if (!this.checkTarget(effect, defender, owner, context)) continue;
      if (!this.checkCondition(effect.condition, defender, context)) continue;

      totalModifier += this.calculateValue(effect, context);
    }
  }

  return totalModifier;
}
```

**Step 3**: magic-spirit.jsx の適切な箇所で使用

```javascript
// attack() 内の反撃ダメージ計算
const counterDamage = baseCounter + continuousEffectEngine.calculateCounterDamageModifier(target, context);
```

---

## 11. テスト戦略

### 11.1 ユニットテスト

```javascript
// __tests__/continuousEffects/effectEngine.test.js

describe('ContinuousEffectEngine', () => {
  describe('calculateAttackModifier', () => {
    test('フィールドカードの属性バフが適用される', () => {
      // C0000071: クリスタルサンクチュアリ - 光属性+500
      const engine = new ContinuousEffectEngine();
      engine.register(fieldCard_C0000071, 1);

      const lightMonster = { attribute: '光', attack: 1000, owner: 1 };
      const modifier = engine.calculateAttackModifier(lightMonster, context);

      expect(modifier).toBe(500);
    });

    test('条件を満たさない場合はバフが適用されない', () => {
      const engine = new ContinuousEffectEngine();
      engine.register(fieldCard_C0000071, 1);

      const fireMonster = { attribute: '炎', attack: 1000, owner: 1 };
      const modifier = engine.calculateAttackModifier(fireMonster, context);

      expect(modifier).toBe(0);
    });

    test('数量依存バフが正しく計算される', () => {
      // C0000007: 粘液獣・キング - 粘液獣1体につき+1500
      const engine = new ContinuousEffectEngine();
      engine.register(monster_C0000007, 1);

      const context = {
        p1Field: [monster_C0000007, slimeMonster1, slimeMonster2, null, null],
        currentPlayer: 1,
      };

      const modifier = engine.calculateAttackModifier(monster_C0000007, context);

      expect(modifier).toBe(3000); // 2匹 × 1500
    });
  });
});
```

### 11.2 統合テスト

```javascript
// __tests__/integration/continuousEffects.test.js

describe('常時効果の統合テスト', () => {
  test('フィールドカード設置で常時効果が有効化される', () => {
    // ゲーム開始
    // フィールドカード設置
    // モンスター召喚
    // 攻撃力が正しく修正されていることを確認
  });

  test('フィールドカードが破壊されると常時効果が解除される', () => {
    // フィールドカード設置
    // モンスター召喚
    // フィールドカード破壊
    // 攻撃力が元に戻ることを確認
  });
});
```

---

## 12. 注意事項・エッジケース

### 12.1 複数の常時効果の累積

```javascript
// 同じ効果が複数ある場合は累積する
// 例: フィールドカードA (+500) + モンスターB (+300) = +800

// ただし「重複不可」の効果は最大1つのみ適用
// condition に nonStackable: true を追加して制御
```

### 12.2 ターン限定効果

```javascript
// 「自分のターン中のみ」の効果
condition: { isMyTurn: true }

// この条件はチェック時に currentPlayer === effectOwner で判定
```

### 12.3 「ターン終了時まで」の効果

```javascript
// これは常時効果ではなく、一時的なバフとして別管理が必要
// 例: 「召喚されるたび攻撃力を400アップ（ターン終了時まで）」
// → temporaryBuffs システムを別途実装する必要あり
```

### 12.4 効果の適用タイミング

```
1. カード登録時: register() で効果を activeEffects に追加
2. 計算呼び出し時: calculateXXX() で都度計算（キャッシュなし）
3. カード削除時: unregister() で効果を削除
4. ターン開始時: resetTurnFlags() で使用回数をリセット
```

---

## 13. 将来の拡張

### 13.1 予定している拡張

- **キャッシュ機構**: 頻繁な計算のパフォーマンス最適化
- **効果の可視化**: UI に常時効果のアイコン/ツールチップ表示
- **効果ログ**: どの常時効果が適用されたかをログに記録
- **効果の優先度**: 複数効果の適用順序制御

### 13.2 検討中の機能

- **効果の打ち消し**: 「相手の常時効果を無効化」
- **効果の反転**: 「バフをデバフに変換」
- **条件付き発動**: 「ライフが減るたびに効果値が上昇」

---

## 付録A: 全57枚の【常時】効果カード一覧

（別ファイル `continuous-effect-card-list.md` に記載予定）

---

**ドキュメントバージョン**: 1.0
**作成日**: 2025-11-26
**作成者**: AI Assistant (Claude)
**対象プロジェクト**: Magic Spirit (magiSp)
