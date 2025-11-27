# 状態異常システム設計書

作成日: 2025-11-27
バージョン: 1.1（状態異常リスト更新）

## 1. 概要

### 1.1 目的
モンスターカードおよびプレイヤーに付与される一時的な状態（眠り、凍結、雷撃、毒など）を管理するシステムを設計する。

### 1.2 対象の分類

状態異常は**付与対象**によって2種類に分かれる：

| 対象 | 管理方法 | 例 |
|------|---------|-----|
| **モンスター** | monster.statusEffects配列 | 眠り、凍結、雷撃、濡れ、守護 |
| **プレイヤー** | playerState.statusEffects配列 | 毒 |

### 1.3 既存システムとの関係

```
┌─────────────────────────────────────────────────────────┐
│                    ゲームシステム                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ トリガー    │  │ 常時効果    │  │ 状態異常        │ │
│  │ システム    │  │ システム    │  │ システム(NEW)   │ │
│  │             │  │             │  │                 │ │
│  │ イベント    │  │ 場にいる間  │  │ 一時的な状態    │ │
│  │ 駆動型      │  │ 継続適用    │  │ ターン経過で    │ │
│  │             │  │             │  │ 解除            │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                 │           │
│         └────────────────┼─────────────────┘           │
│                          ↓                             │
│              ┌─────────────────────┐                   │
│              │   エフェクト        │                   │
│              │   ヘルパー          │                   │
│              └─────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

**トリガーシステム**: 状態異常を付与するタイミング（召喚時、技効果など）
**常時効果システム**: 状態異常中のステータス修正（凍結の攻撃力半減など）
**状態異常システム**: 状態の管理、解除判定、UI表示

## 2. 状態異常の種類

### 2.1 モンスターに付与される状態異常

| 状態異常 | 内部ID | 効果 | 解除条件 | 使用カード例 |
|---------|--------|------|---------|-------------|
| 眠り | `sleep` | 行動不能、効果無効 | ターン開始時50%で解除 or 次のターン終了時 | アクア・メイデン (C0000039) |
| 凍結 | `freeze` | 攻撃力半減、行動不能 | 次のターン開始時50%で解除 | 深海のクラーケン (C0000043)、ブリザード系 |
| 雷撃 | `thunder` | 攻撃力-500、技不能 | 次のターン終了時 | 雷嵐龍サンダーストーム・レックス (C0000327)、嵐の雷撃獣 (C0000329) |
| 濡れ | `wet` | 受けるダメージ2倍 | 次のターン終了時 | 水漏れのリリカ (C0000233) |
| 行動不能 | `stun` | 攻撃・効果使用不可 | 指定ターン後解除 | シャドウ・バインド (C0000075)、檻の牢獄 (C0000135) |
| 守護 | `guard` | 1度だけダメージ半減 | ダメージを受けた時消費 | 虹の守護竜 (C0000060)、鎖の守護者 (C0000131) |
| 効果無効 | `silence` | 効果が発動しない | 指定ターン後解除 | 檻の中の歌姫 (C0000130) |
| 覚醒 | `awakened` | 攻撃力上昇（カード依存） | ターン終了時 | 紅蓮の覚醒 (C0000033) |
| 深蝕 | `corrode` | エンドフェイズに攻撃力減少 | なし（永続） | 【深蝕】キーワード |

### 2.2 プレイヤーに付与される状態異常

| 状態異常 | 内部ID | 効果 | 解除条件 | 使用カード例 |
|---------|--------|------|---------|-------------|
| 毒 | `poison` | 毎ターン終了時100ダメージ | なし（永続） | 毒使いカムラ (C0000281)、酸毒竜 (C0000283)、白蛇の牙 (C0000284) |

※ 【毒侵】キーワード: 「このカードが相手**プレイヤー**にダメージを与えた時、相手を毒状態にする」

## 3. データ構造

### 3.1 モンスターの状態異常配列

```javascript
// モンスターインスタンスに追加
const monster = {
  // 既存のプロパティ
  uniqueId: 'C0000001_1234567890',
  name: 'モンスター名',
  attack: 1500,
  hp: 2000,
  currentHP: 2000,
  // ...

  // 新規追加: 状態異常配列
  statusEffects: [
    {
      id: 'freeze_1701234567890',   // 一意のID
      type: 'freeze',                // 状態異常タイプ
      source: 'C0000144',            // 付与元カードID
      sourceName: 'ブリザードキャット・フロスト',
      appliedTurn: 5,                // 付与されたターン
      duration: 1,                   // 持続ターン数（-1 = 永続）
      removeChance: 0.5,             // 解除確率（0 = 確定解除、1 = 解除なし）
      removeOnDamage: false,         // ダメージ時に解除
      usageCount: 0,                 // 使用回数（守護用）
      maxUsage: 1,                   // 最大使用回数（守護用）
      value: 0.5,                    // 効果値（凍結の攻撃力半減 = 0.5）
      stackable: false,              // 重複可能か
    }
  ],
};
```

### 3.2 プレイヤーの状態異常配列

```javascript
// ゲーム状態に追加
const [p1StatusEffects, setP1StatusEffects] = useState([]);
const [p2StatusEffects, setP2StatusEffects] = useState([]);

// プレイヤー状態異常オブジェクト
const playerStatusEffect = {
  id: 'poison_1701234567890',     // 一意のID
  type: 'poison',                  // 状態異常タイプ
  source: 'C0000281',              // 付与元カードID
  sourceName: '毒使いカムラ',
  appliedTurn: 5,                  // 付与されたターン
  value: 100,                      // 効果値（毒ダメージ量）
};
```

### 3.3 状態異常タイプ定義

```javascript
// src/engine/statusEffects/statusTypes.js

export const STATUS_EFFECT_TYPES = {
  // ========================================
  // 行動制限系（モンスター）
  // ========================================

  /**
   * 眠り
   * - 攻撃不可
   * - 効果発動不可（基本技、上級技、トリガー）
   * - ターン開始時50%で解除、または次ターン終了時に解除
   */
  SLEEP: 'sleep',

  /**
   * 凍結
   * - 攻撃力50%ダウン
   * - 攻撃不可
   * - 次ターン開始時50%で解除
   */
  FREEZE: 'freeze',

  /**
   * 雷撃
   * - 攻撃力-500
   * - 技不能（基本技、上級技使用不可）
   * - 次のターン終了時に解除
   */
  THUNDER: 'thunder',

  /**
   * 行動不能（スタン）
   * - 攻撃不可
   * - 効果発動不可
   * - 指定ターン後に解除
   */
  STUN: 'stun',

  // ========================================
  // 効果制限系（モンスター）
  // ========================================

  /**
   * 効果無効（サイレンス）
   * - 効果発動不可
   * - 攻撃は可能
   * - 指定ターン後に解除
   */
  SILENCE: 'silence',

  // ========================================
  // 被ダメージ増加系（モンスター）
  // ========================================

  /**
   * 濡れ
   * - 受けるダメージ2倍
   * - 次のターン終了時に解除
   */
  WET: 'wet',

  // ========================================
  // 防御系（モンスター）
  // ========================================

  /**
   * 守護
   * - 1度だけダメージを半減
   * - ダメージを受けた時に消費
   */
  GUARD: 'guard',

  /**
   * 無敵（免疫）
   * - ダメージを受けない
   * - 指定ターン後に解除
   */
  INVINCIBLE: 'invincible',

  // ========================================
  // 継続ダメージ/デバフ系（モンスター）
  // ========================================

  /**
   * 深蝕
   * - エンドフェイズに攻撃力減少
   * - 解除されるまで継続（永続）
   */
  CORRODE: 'corrode',

  // ========================================
  // バフ系（モンスター - 正の状態異常）
  // ========================================

  /**
   * 覚醒
   * - 攻撃力が上昇（カードにより効果値異なる）
   * - ターン終了時に解除
   */
  AWAKENED: 'awakened',

  /**
   * 攻撃力上昇（一時的）
   * - 攻撃力が上昇
   * - 指定ターン後に解除
   */
  ATK_UP: 'atk_up',

  /**
   * HP上昇（一時的）
   * - HPが上昇
   * - 指定ターン後に解除
   */
  HP_UP: 'hp_up',

  // ========================================
  // プレイヤー状態異常
  // ========================================

  /**
   * 毒（プレイヤー）
   * - 毎ターン終了時に固定ダメージ（100）
   * - 解除されるまで継続（永続）
   */
  POISON: 'poison',
};

/**
 * 状態異常の対象を判定
 */
export const STATUS_EFFECT_TARGETS = {
  MONSTER: 'monster',
  PLAYER: 'player',
};

/**
 * 状態異常がどの対象に付与されるか
 */
export const getStatusEffectTarget = (statusType) => {
  switch (statusType) {
    case STATUS_EFFECT_TYPES.POISON:
      return STATUS_EFFECT_TARGETS.PLAYER;
    default:
      return STATUS_EFFECT_TARGETS.MONSTER;
  }
};
```

### 3.4 状態異常メタデータ

```javascript
// src/engine/statusEffects/statusTypes.js

export const STATUS_EFFECT_METADATA = {
  // ========================================
  // モンスター状態異常
  // ========================================

  [STATUS_EFFECT_TYPES.SLEEP]: {
    displayName: '眠り',
    icon: '💤',
    color: '#9966cc',
    category: 'debuff',
    target: 'monster',
    effects: {
      canAttack: false,
      canUseSkill: false,
      canUseTrigger: false,
    },
    defaultDuration: 1,
    defaultRemoveChance: 0.5,
  },
  [STATUS_EFFECT_TYPES.FREEZE]: {
    displayName: '凍結',
    icon: '❄️',
    color: '#00bfff',
    category: 'debuff',
    target: 'monster',
    effects: {
      canAttack: false,
      attackModifier: 0.5, // 攻撃力50%
    },
    defaultDuration: 1,
    defaultRemoveChance: 0.5,
  },
  [STATUS_EFFECT_TYPES.THUNDER]: {
    displayName: '雷撃',
    icon: '⚡',
    color: '#ffd700',
    category: 'debuff',
    target: 'monster',
    effects: {
      attackModifier: -500, // 攻撃力-500（固定値）
      canUseSkill: false,
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.WET]: {
    displayName: '濡れ',
    icon: '💧',
    color: '#1e90ff',
    category: 'debuff',
    target: 'monster',
    effects: {
      damageMultiplier: 2.0, // 受けるダメージ2倍
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.STUN]: {
    displayName: '行動不能',
    icon: '🚫',
    color: '#ff6347',
    category: 'debuff',
    target: 'monster',
    effects: {
      canAttack: false,
      canUseSkill: false,
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.SILENCE]: {
    displayName: '効果無効',
    icon: '🔇',
    color: '#888888',
    category: 'debuff',
    target: 'monster',
    effects: {
      canUseSkill: false,
      canUseTrigger: false,
    },
    defaultDuration: 1,
  },
  [STATUS_EFFECT_TYPES.GUARD]: {
    displayName: '守護',
    icon: '🛡️',
    color: '#4a90d9',
    category: 'buff',
    target: 'monster',
    effects: {
      damageReduction: 0.5, // 50%軽減
    },
    maxUsage: 1,
    removeOnUse: true,
  },
  [STATUS_EFFECT_TYPES.CORRODE]: {
    displayName: '深蝕',
    icon: '🦠',
    color: '#556b2f',
    category: 'debuff',
    target: 'monster',
    effects: {
      endPhaseAtkDown: true,
    },
    defaultDuration: -1, // 永続
  },
  [STATUS_EFFECT_TYPES.AWAKENED]: {
    displayName: '覚醒',
    icon: '🔥',
    color: '#ff4500',
    category: 'buff',
    target: 'monster',
    effects: {
      attackModifier: 0, // カードにより異なる、valueで指定
    },
    defaultDuration: 0, // ターン終了時まで
  },
  [STATUS_EFFECT_TYPES.ATK_UP]: {
    displayName: '攻撃力上昇',
    icon: '⬆️',
    color: '#32cd32',
    category: 'buff',
    target: 'monster',
    effects: {
      attackModifier: 0, // valueで指定
    },
    defaultDuration: 1,
  },

  // ========================================
  // プレイヤー状態異常
  // ========================================

  [STATUS_EFFECT_TYPES.POISON]: {
    displayName: '毒',
    icon: '☠️',
    color: '#9932cc',
    category: 'debuff',
    target: 'player',
    effects: {
      endPhaseDamage: 100, // 毎ターン100ダメージ
    },
    defaultDuration: -1, // 永続
  },
};
```

## 4. 状態異常エンジン

### 4.1 ファイル構成

```
src/engine/statusEffects/
├── index.js              # エクスポート集約
├── statusTypes.js        # タイプ定義とメタデータ
├── statusEngine.js       # メインエンジン
└── statusHelpers.js      # ヘルパー関数
```

### 4.2 エンジンAPI設計

```javascript
// src/engine/statusEffects/statusEngine.js

class StatusEffectEngine {
  // ========================================
  // ライフサイクル管理
  // ========================================

  /**
   * 状態異常を付与
   * @param {Object} monster - 対象モンスター
   * @param {string} statusType - 状態異常タイプ
   * @param {Object} options - オプション
   * @returns {Object} 付与結果
   */
  applyStatus(monster, statusType, options = {}) {
    // 重複チェック
    // 免疫チェック（魔障壁など）
    // 状態異常オブジェクト作成
    // モンスターに追加
    // ログ出力
  }

  /**
   * 状態異常を解除
   * @param {Object} monster - 対象モンスター
   * @param {string} statusType - 状態異常タイプ（省略で全解除）
   * @returns {Array} 解除された状態異常
   */
  removeStatus(monster, statusType = null) {
    // 指定タイプ or 全状態異常を解除
    // ログ出力
  }

  /**
   * ターン開始時の処理
   * - 解除判定（確率解除）
   * - ターンカウント減少
   * @param {Object} monster - 対象モンスター
   * @param {number} currentTurn - 現在のターン
   */
  processTurnStart(monster, currentTurn) {
    // 各状態異常の解除判定
    // 確率判定（Math.random() < removeChance）
    // 解除ログ
  }

  /**
   * エンドフェイズ時の処理
   * - 毒ダメージ
   * - 深蝕の攻撃力減少
   * @param {Object} monster - 対象モンスター
   * @param {Object} context - ゲームコンテキスト
   */
  processEndPhase(monster, context) {
    // 毒ダメージ処理
    // 深蝕処理
    // 持続ターン減少
    // 期限切れ解除
  }

  // ========================================
  // 状態チェック
  // ========================================

  /**
   * 攻撃可能かチェック
   * @param {Object} monster - 対象モンスター
   * @returns {Object} { canAttack: boolean, reason: string }
   */
  canAttack(monster) {
    // sleep, freeze, stun をチェック
  }

  /**
   * 技使用可能かチェック
   * @param {Object} monster - 対象モンスター
   * @returns {Object} { canUseSkill: boolean, reason: string }
   */
  canUseSkill(monster) {
    // sleep, stun, silence をチェック
  }

  /**
   * 効果発動可能かチェック
   * @param {Object} monster - 対象モンスター
   * @returns {Object} { canUseTrigger: boolean, reason: string }
   */
  canUseTrigger(monster) {
    // sleep, silence をチェック
  }

  /**
   * 特定の状態異常を持っているか
   * @param {Object} monster - 対象モンスター
   * @param {string} statusType - 状態異常タイプ
   * @returns {boolean}
   */
  hasStatus(monster, statusType) {
    return monster.statusEffects?.some(s => s.type === statusType) || false;
  }

  /**
   * 状態異常一覧を取得
   * @param {Object} monster - 対象モンスター
   * @returns {Array} 状態異常配列
   */
  getActiveStatuses(monster) {
    return monster.statusEffects || [];
  }

  // ========================================
  // ステータス修正
  // ========================================

  /**
   * 攻撃力修正を計算
   * @param {Object} monster - 対象モンスター
   * @returns {Object} { multiplier: number, flatModifier: number }
   */
  getAttackModifier(monster) {
    let multiplier = 1.0;
    let flatModifier = 0;

    // 凍結: 50%
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.FREEZE)) {
      multiplier *= 0.5;
    }

    // 雷撃: -500（固定値）
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.THUNDER)) {
      flatModifier -= 500;
    }

    // 覚醒: 効果値分上昇
    const awakened = monster.statusEffects?.find(s => s.type === STATUS_EFFECT_TYPES.AWAKENED);
    if (awakened) {
      flatModifier += awakened.value;
    }

    // ATK_UP: バフ値を加算
    const atkUp = monster.statusEffects?.find(s => s.type === STATUS_EFFECT_TYPES.ATK_UP);
    if (atkUp) {
      flatModifier += atkUp.value;
    }

    return { multiplier, flatModifier };
  }

  /**
   * 被ダメージ倍率を計算
   * @param {Object} monster - 対象モンスター
   * @returns {number} ダメージ倍率（1.0 = 変化なし）
   */
  getDamageMultiplier(monster) {
    let multiplier = 1.0;

    // 濡れ: ダメージ2倍
    if (this.hasStatus(monster, STATUS_EFFECT_TYPES.WET)) {
      multiplier *= 2.0;
    }

    return multiplier;
  }

  // ========================================
  // プレイヤー状態異常
  // ========================================

  /**
   * プレイヤーに状態異常を付与
   * @param {number} player - プレイヤー番号 (1 or 2)
   * @param {string} statusType - 状態異常タイプ
   * @param {Object} options - オプション
   * @param {Object} context - ゲームコンテキスト
   */
  applyPlayerStatus(player, statusType, options, context) {
    const { setP1StatusEffects, setP2StatusEffects, addLog } = context;
    const setStatusEffects = player === 1 ? setP1StatusEffects : setP2StatusEffects;

    const statusEffect = {
      id: `${statusType}_${Date.now()}`,
      type: statusType,
      source: options.source,
      sourceName: options.sourceName,
      appliedTurn: options.currentTurn,
      value: options.value || STATUS_EFFECT_METADATA[statusType]?.effects?.endPhaseDamage || 0,
    };

    setStatusEffects(prev => [...prev, statusEffect]);
    const meta = STATUS_EFFECT_METADATA[statusType];
    addLog(`プレイヤー${player}に${meta.displayName}を付与！`, 'info');
  }

  /**
   * プレイヤーの状態異常を処理（エンドフェイズ）
   * @param {number} player - プレイヤー番号 (1 or 2)
   * @param {Array} statusEffects - プレイヤーの状態異常配列
   * @param {Object} context - ゲームコンテキスト
   */
  processPlayerEndPhase(player, statusEffects, context) {
    const { setP1Life, setP2Life, p1Life, p2Life, addLog } = context;
    const setLife = player === 1 ? setP1Life : setP2Life;
    const currentLife = player === 1 ? p1Life : p2Life;

    statusEffects.forEach(status => {
      if (status.type === STATUS_EFFECT_TYPES.POISON) {
        const damage = status.value;
        setLife(prev => Math.max(0, prev - damage));
        addLog(`プレイヤー${player}は毒で${damage}ダメージ！`, 'damage');
      }
    });
  }

  /**
   * ダメージ軽減を計算
   * @param {Object} monster - 対象モンスター
   * @param {number} damage - 元ダメージ
   * @returns {Object} { finalDamage: number, consumed: boolean }
   */
  calculateDamageReduction(monster, damage) {
    const guard = monster.statusEffects?.find(s => s.type === STATUS_EFFECT_TYPES.GUARD);

    if (guard) {
      const reduced = Math.floor(damage * guard.value);
      guard.usageCount++;

      // 使用回数上限に達したら解除
      const consumed = guard.usageCount >= guard.maxUsage;
      if (consumed) {
        this.removeStatus(monster, STATUS_EFFECT_TYPES.GUARD);
      }

      return { finalDamage: reduced, consumed };
    }

    return { finalDamage: damage, consumed: false };
  }
}

export const statusEffectEngine = new StatusEffectEngine();
```

## 5. ゲームへの統合

### 5.1 magic-spirit.jsxへの統合ポイント

```javascript
// 1. モンスター作成時の初期化
const createMonsterInstance = (card, owner) => {
  return {
    ...card,
    uniqueId: `${card.id}_${Date.now()}`,
    currentHP: card.hp,
    maxHP: card.hp,
    canAttack: false,
    owner,
    statusEffects: [], // 状態異常配列を初期化
  };
};

// 2. ターン開始フェイズでの処理
const processPhase = (phaseIndex) => {
  if (phaseIndex === 0) { // ターン開始
    // 現在のプレイヤーの全モンスターに対して処理
    const currentField = currentPlayer === 1 ? p1Field : p2Field;
    currentField.forEach((monster, index) => {
      if (monster) {
        statusEffectEngine.processTurnStart(monster, turn);
      }
    });
  }
};

// 3. エンドフェイズでの処理
const processEndPhase = () => {
  const currentField = currentPlayer === 1 ? p1Field : p2Field;
  currentField.forEach((monster, index) => {
    if (monster) {
      statusEffectEngine.processEndPhase(monster, context);
    }
  });
};

// 4. 攻撃時のチェック
const attack = (attackerIndex, targetIndex) => {
  const attacker = /* ... */;

  // 状態異常による攻撃制限チェック
  const attackCheck = statusEffectEngine.canAttack(attacker);
  if (!attackCheck.canAttack) {
    addLog(`${attacker.name}は${attackCheck.reason}のため攻撃できない！`, 'info');
    return;
  }

  // ダメージ計算時の守護チェック
  const target = /* ... */;
  const { finalDamage, consumed } = statusEffectEngine.calculateDamageReduction(target, damage);
  if (consumed) {
    addLog(`${target.name}の守護が発動！ダメージを半減！`, 'info');
  }
};

// 5. 技発動時のチェック
const executeSkill = (monsterIndex, skillType) => {
  const monster = /* ... */;

  const skillCheck = statusEffectEngine.canUseSkill(monster);
  if (!skillCheck.canUseSkill) {
    addLog(`${monster.name}は${skillCheck.reason}のため技を使えない！`, 'info');
    return;
  }
};
```

### 5.2 トリガーシステムとの連携

```javascript
// トリガー発動前のチェック
const canFireTrigger = (trigger, monster) => {
  const triggerCheck = statusEffectEngine.canUseTrigger(monster);
  return triggerCheck.canUseTrigger;
};
```

### 5.3 常時効果システムとの連携

状態異常による攻撃力修正は、常時効果システムの後に適用する。

```javascript
// 最終攻撃力計算
const getFinalAttack = (monster, context) => {
  let attack = monster.attack;

  // 1. 常時効果による修正
  attack += continuousEffectEngine.calculateAttackModifier(monster, context);

  // 2. 状態異常による修正
  attack *= statusEffectEngine.getAttackModifier(monster);

  return Math.floor(attack);
};
```

## 6. UIへの統合

### 6.1 FieldMonsterコンポーネントへの表示

```jsx
// src/components/FieldMonster.jsx

const FieldMonster = ({ monster, /* ... */ }) => {
  const activeStatuses = statusEffectEngine.getActiveStatuses(monster);

  return (
    <div className="field-monster">
      {/* 既存の表示 */}

      {/* 状態異常アイコン表示 */}
      {activeStatuses.length > 0 && (
        <div className="status-icons">
          {activeStatuses.map(status => {
            const meta = STATUS_EFFECT_METADATA[status.type];
            return (
              <span
                key={status.id}
                className="status-icon"
                title={`${meta.displayName}（残り${status.duration}ターン）`}
                style={{ color: meta.color }}
              >
                {meta.icon}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

### 6.2 スタイル定義

```javascript
// src/styles/gameStyles.js に追加

statusIcons: {
  position: 'absolute',
  top: '-8px',
  right: '4px',
  display: 'flex',
  gap: '2px',
  fontSize: '14px',
},
statusIcon: {
  textShadow: '0 0 3px #000',
  cursor: 'help',
},
```

## 7. エフェクトヘルパーへの追加

### 7.1 状態異常付与ヘルパー

```javascript
// src/engine/effectHelpers.js に追加

/**
 * 状態異常を付与する
 * @param {Object} context - ゲームコンテキスト
 * @param {Object} target - 対象モンスター
 * @param {string} statusType - 状態異常タイプ
 * @param {Object} options - オプション
 */
export const applyStatusEffect = (context, target, statusType, options = {}) => {
  const { addLog } = context;

  const result = statusEffectEngine.applyStatus(target, statusType, {
    source: options.sourceCard?.id,
    sourceName: options.sourceCard?.name,
    duration: options.duration,
    removeChance: options.removeChance,
    value: options.value,
    ...options,
  });

  if (result.success) {
    const meta = STATUS_EFFECT_METADATA[statusType];
    addLog(`${target.name}に${meta.displayName}を付与！`, 'info');
  } else {
    addLog(result.reason, 'info');
  }

  return result.success;
};

/**
 * 状態異常を回復する
 * @param {Object} context - ゲームコンテキスト
 * @param {Object} target - 対象モンスター
 * @param {string} statusType - 状態異常タイプ（省略で全回復）
 */
export const removeStatusEffect = (context, target, statusType = null) => {
  const { addLog } = context;

  const removed = statusEffectEngine.removeStatus(target, statusType);

  if (removed.length > 0) {
    const names = removed.map(s => STATUS_EFFECT_METADATA[s.type].displayName);
    addLog(`${target.name}の${names.join('、')}が回復した！`, 'heal');
  }

  return removed;
};
```

## 8. 実装計画

### Phase 1: 基盤実装（必須）
1. `statusTypes.js` - タイプ定義とメタデータ
2. `statusEngine.js` - 基本的なエンジン機能
   - applyStatus, removeStatus
   - hasStatus, getActiveStatuses
   - canAttack, canUseSkill
3. `index.js` - エクスポート

### Phase 2: ゲーム統合
1. `helpers.js` - createMonsterInstanceに statusEffects 追加
2. `magic-spirit.jsx` - フェイズ処理への統合
   - ターン開始時の解除判定
   - エンドフェイズのダメージ処理
   - 攻撃/技の制限チェック

### Phase 3: UI実装
1. `FieldMonster.jsx` - 状態異常アイコン表示
2. `gameStyles.js` - スタイル追加

### Phase 4: エフェクト連携
1. `effectHelpers.js` - applyStatusEffect, removeStatusEffect
2. カード固有エフェクト/トリガーへの実装

### Phase 5: カード実装
1. 眠り付与カード（アクア・メイデン等）
2. 凍結付与カード（ブリザード系）
3. 守護付与カード（虹の守護竜等）

## 9. テストケース

### 9.1 眠り状態のテスト
```javascript
// 1. 眠り付与
// 2. 攻撃不可確認
// 3. 技使用不可確認
// 4. ターン開始時50%解除確認
// 5. 次ターン終了時強制解除確認
```

### 9.2 凍結状態のテスト
```javascript
// 1. 凍結付与
// 2. 攻撃力50%ダウン確認
// 3. 攻撃不可確認
// 4. ターン開始時50%解除確認
```

### 9.3 守護状態のテスト
```javascript
// 1. 守護付与
// 2. ダメージ50%軽減確認
// 3. 1回使用後消費確認
```

## 10. 将来の拡張

### 10.1 追加予定の状態異常
- **燃焼**: エンドフェイズにダメージ（炎属性カード用）
- **麻痺**: 一定確率で行動失敗
- **混乱**: ランダムに攻撃対象決定
- **挑発**: このモンスターしか攻撃できない

### 10.2 状態異常耐性
- 【魔障壁】キーワード能力との連携
- 特定属性は特定状態異常に耐性

### 10.3 状態異常の重複ルール
- 同じ状態異常の重複不可（上書き or 無効）
- 異なる状態異常は重複可能
- スタック可能な状態異常（毒など）

---

**次のステップ**: Phase 1（基盤実装）から着手
