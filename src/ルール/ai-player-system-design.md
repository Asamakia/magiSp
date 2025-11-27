# AIプレイヤーシステム 仕様書・詳細設計

## 1. 概要

### 1.1 目的

Magic Spiritにおいて、プレイヤー1およびプレイヤー2それぞれをAI操作または人間操作に設定できる仕組みを提供する。

### 1.2 主要機能

- プレイヤーごとのAI/人間切り替え
- 難易度設定（Easy / Normal / Hard）
- デッキ専用AIへの拡張性（将来対応）
- 既存コードへの影響を最小限に抑えた設計

### 1.3 設計原則

1. **既存コード非侵襲**: 既存の関数・ロジックを変更しない
2. **ストラテジーパターン**: 判断基準を差し替え可能な設計
3. **段階的実装**: ランダム→ヒューリスティック→高度AIへ段階的に拡張
4. **callback活用**: 既存のcallback方式を利用してAIアクションを実行

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                      magic-spirit.jsx                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 既存ゲーム状態（変更なし）                                  │ │
│  │  - p1/p2 Life, Field, Hand, Deck, SP, Graveyard           │ │
│  │  - phase, turn, currentPlayer                              │ │
│  │  - pendingHandSelection, pendingMonsterTarget              │ │
│  │  - chainConfirmation                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │ 新規追加: プレイヤー制御状態                               │ │
│  │  - p1PlayerType: 'human' | 'ai'                           │ │
│  │  - p2PlayerType: 'human' | 'ai'                           │ │
│  │  - p1AIDifficulty: 'easy' | 'normal' | 'hard'             │ │
│  │  - p2AIDifficulty: 'easy' | 'normal' | 'hard'             │ │
│  │  - p1AIDeckStrategy?: string (将来拡張)                   │ │
│  │  - p2AIDeckStrategy?: string (将来拡張)                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │ 新規追加: useAIController フック                          │ │
│  │  - AIターン検出                                           │ │
│  │  - 特殊ケース処理（手札選択、ターゲット選択、チェーン）    │ │
│  │  - AIアクション実行                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    src/engine/ai/                               │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   index.js      │  │ aiController.js │  │ aiEvaluator.js  │ │
│  │                 │  │                 │  │   (将来拡張)    │ │
│  │  エクスポート    │  │ - executeAITurn │  │ - evaluateCard  │ │
│  │                 │  │ - getValidMoves │  │ - evaluateField │ │
│  │                 │  │ - delay         │  │ - scoreThreat   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    strategies/                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ base.js  │  │ easy.js  │  │ normal.js│  │ hard.js  │  │  │
│  │  │(ランダム)│  │          │  │          │  │          │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              deckStrategies/ (将来拡張)             │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │  │
│  │  │  │ dragon.js│  │iceSleep.js│ │ control.js│  ...    │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘          │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 ファイル構成

```
src/
├── magic-spirit.jsx          # 既存（最小限の追加のみ）
│
└── engine/
    └── ai/                   # 新規ディレクトリ
        ├── index.js          # エクスポート (~30行)
        ├── aiController.js   # メインAIコントローラー (~250行)
        ├── aiEvaluator.js    # 評価エンジン (~200行, 将来拡張)
        │
        └── strategies/       # ストラテジー群
            ├── index.js      # ストラテジー取得 (~50行)
            ├── base.js       # ベースストラテジー（ランダム）(~100行)
            ├── easy.js       # 簡易AI (~50行)
            ├── normal.js     # 中級AI (~100行)
            ├── hard.js       # 上級AI (~150行, 将来拡張)
            │
            └── deckStrategies/  # デッキ専用（将来拡張）
                ├── index.js
                ├── dragon.js
                ├── iceSleep.js
                └── ...
```

---

## 3. 状態管理

### 3.1 新規state定義

```javascript
// magic-spirit.jsx に追加

// プレイヤータイプ（人間 or AI）
const [p1PlayerType, setP1PlayerType] = useState('human'); // 'human' | 'ai'
const [p2PlayerType, setP2PlayerType] = useState('human'); // 'human' | 'ai'

// AI難易度
const [p1AIDifficulty, setP1AIDifficulty] = useState('normal'); // 'easy' | 'normal' | 'hard'
const [p2AIDifficulty, setP2AIDifficulty] = useState('normal'); // 'easy' | 'normal' | 'hard'

// デッキ専用ストラテジー（将来拡張用、オプション）
const [p1AIDeckStrategy, setP1AIDeckStrategy] = useState(null); // string | null
const [p2AIDeckStrategy, setP2AIDeckStrategy] = useState(null); // string | null
```

### 3.2 ゲーム状態スナップショット

AIに渡すゲーム状態のスナップショット構造：

```javascript
/**
 * @typedef {Object} AIGameState
 * @property {number} currentPlayer - 現在のプレイヤー (1 | 2)
 * @property {number} phase - 現在のフェイズ (0-4)
 * @property {number} turn - ターン数
 * @property {boolean} isFirstTurn - 先攻1ターン目か
 *
 * @property {number} myLife - 自分のライフ
 * @property {number} opponentLife - 相手のライフ
 * @property {Array} myHand - 自分の手札
 * @property {Array} opponentHandCount - 相手の手札枚数
 * @property {Array} myField - 自分のフィールド (5スロット)
 * @property {Array} opponentField - 相手のフィールド (5スロット)
 * @property {Array} myGraveyard - 自分の墓地
 * @property {Array} opponentGraveyard - 相手の墓地
 * @property {number} myDeckCount - 自分のデッキ残り枚数
 * @property {number} opponentDeckCount - 相手のデッキ残り枚数
 *
 * @property {number} myActiveSP - 自分のアクティブSP
 * @property {number} myRestedSP - 自分のレストSP
 * @property {Object|null} myFieldCard - 自分のフィールドカード
 * @property {Object|null} myPhaseCard - 自分のフェイズカード
 * @property {Object|null} opponentFieldCard - 相手のフィールドカード
 * @property {Object|null} opponentPhaseCard - 相手のフェイズカード
 */

function createAIGameState(currentPlayer) {
  const isP1 = currentPlayer === 1;
  return {
    currentPlayer,
    phase,
    turn,
    isFirstTurn,

    myLife: isP1 ? p1Life : p2Life,
    opponentLife: isP1 ? p2Life : p1Life,
    myHand: isP1 ? p1Hand : p2Hand,
    opponentHandCount: isP1 ? p2Hand.length : p1Hand.length,
    myField: isP1 ? p1Field : p2Field,
    opponentField: isP1 ? p2Field : p1Field,
    myGraveyard: isP1 ? p1Graveyard : p2Graveyard,
    opponentGraveyard: isP1 ? p2Graveyard : p1Graveyard,
    myDeckCount: isP1 ? p1Deck.length : p2Deck.length,
    opponentDeckCount: isP1 ? p2Deck.length : p1Deck.length,

    myActiveSP: isP1 ? p1ActiveSP : p2ActiveSP,
    myRestedSP: isP1 ? p1RestedSP : p2RestedSP,
    myFieldCard: isP1 ? p1FieldCard : p2FieldCard,
    myPhaseCard: isP1 ? p1PhaseCard : p2PhaseCard,
    opponentFieldCard: isP1 ? p2FieldCard : p1FieldCard,
    opponentPhaseCard: isP1 ? p2PhaseCard : p1PhaseCard,
  };
}
```

---

## 4. ストラテジーパターン設計

### 4.1 ベースストラテジーインターフェース

```javascript
// src/engine/ai/strategies/base.js

/**
 * ベースストラテジー（すべてランダム）
 * 各メソッドをオーバーライドすることで判断基準をカスタマイズ可能
 */
export const baseStrategy = {
  /**
   * 召喚するカードを選択
   * @param {Array} summonableCards - 召喚可能なカード一覧
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {Object|null} 召喚するカード（nullの場合は召喚しない）
   */
  chooseSummon(summonableCards, gameState) {
    if (summonableCards.length === 0) return null;
    return randomPick(summonableCards);
  },

  /**
   * 召喚先スロットを選択
   * @param {Array<number>} emptySlots - 空きスロットのインデックス配列
   * @param {Object} card - 召喚するカード
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {number} スロットインデックス
   */
  chooseSlot(emptySlots, card, gameState) {
    return randomPick(emptySlots);
  },

  /**
   * 使用するスキルを選択
   * @param {Array} usableSkills - 使用可能なスキル一覧 [{monsterIndex, skillType, monster}]
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {Object|null} 使用するスキル（nullの場合は使用しない）
   */
  chooseSkill(usableSkills, gameState) {
    if (usableSkills.length === 0) return null;
    // デフォルト: スキル使用しない（チャージを温存）
    return null;
  },

  /**
   * 発動するトリガーを選択
   * @param {Array} activatableTriggers - 発動可能なトリガー一覧
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {Object|null} 発動するトリガー（nullの場合は発動しない）
   */
  chooseTrigger(activatableTriggers, gameState) {
    if (activatableTriggers.length === 0) return null;
    // デフォルト: 発動しない
    return null;
  },

  /**
   * 攻撃するモンスターと攻撃順序を決定
   * @param {Array<number>} attackableIndices - 攻撃可能なモンスターのスロットインデックス
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {Array<number>} 攻撃順序（空配列の場合は攻撃しない）
   */
  chooseAttackOrder(attackableIndices, gameState) {
    // デフォルト: ランダム順で全員攻撃
    return shuffleArray([...attackableIndices]);
  },

  /**
   * 攻撃対象を選択
   * @param {Array} validTargets - 有効な攻撃対象 (スロットインデックス or 'direct')
   * @param {Object} attacker - 攻撃するモンスター
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {number|'direct'} 攻撃対象
   */
  chooseAttackTarget(validTargets, attacker, gameState) {
    return randomPick(validTargets);
  },

  /**
   * 手札選択（効果による選択）
   * @param {Array} validCards - 選択可能なカード一覧
   * @param {string} message - 選択メッセージ
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {Object} 選択するカード
   */
  chooseFromHand(validCards, message, gameState) {
    return randomPick(validCards);
  },

  /**
   * モンスターターゲット選択（効果による選択）
   * @param {Array<number>} validIndices - 選択可能なスロットインデックス
   * @param {string} message - 選択メッセージ
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {number} 選択するスロットインデックス
   */
  chooseMonsterTarget(validIndices, message, gameState) {
    return randomPick(validIndices);
  },

  /**
   * 墓地カード選択（効果による選択）
   * @param {Array} validCards - 選択可能なカード一覧
   * @param {string} message - 選択メッセージ
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {Object} 選択するカード
   */
  chooseFromGraveyard(validCards, message, gameState) {
    return randomPick(validCards);
  },

  /**
   * 刹那詠唱を発動するか判断
   * @param {Array} availableSetsunaCards - 発動可能な刹那詠唱カード
   * @param {Object} chainContext - チェーンコンテキスト（攻撃情報等）
   * @param {AIGameState} gameState - ゲーム状態
   * @returns {Object|null} 発動するカード（nullの場合は発動しない）
   */
  chooseSetsuna(availableSetsunaCards, chainContext, gameState) {
    // デフォルト: 発動しない
    return null;
  },

  /**
   * メインフェイズを終了するか判断
   * @param {AIGameState} gameState - ゲーム状態
   * @param {Object} actionsRemaining - 残りのアクション情報
   * @returns {boolean} true: バトルフェイズへ進む, false: メインフェイズ継続
   */
  shouldEndMainPhase(gameState, actionsRemaining) {
    // デフォルト: アクションがなければ終了
    const { canSummon, canUseSkill, canActivateTrigger } = actionsRemaining;
    return !canSummon && !canUseSkill && !canActivateTrigger;
  },

  /**
   * バトルフェイズを終了するか判断
   * @param {AIGameState} gameState - ゲーム状態
   * @param {Array<number>} remainingAttackers - まだ攻撃していないモンスター
   * @returns {boolean} true: エンドフェイズへ進む, false: 攻撃継続
   */
  shouldEndBattlePhase(gameState, remainingAttackers) {
    // デフォルト: 全員攻撃したら終了
    return remainingAttackers.length === 0;
  },
};

// ユーティリティ関数
function randomPick(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### 4.2 難易度別ストラテジー

#### Easy（かんたん）

```javascript
// src/engine/ai/strategies/easy.js

import { baseStrategy, randomPick } from './base';

/**
 * Easy AI ストラテジー
 * - ランダムに1枚だけ召喚
 * - 攻撃は直接攻撃優先
 * - スキル・トリガーは使用しない
 */
export const easyStrategy = {
  ...baseStrategy,

  // 1枚だけランダム召喚
  chooseSummon(summonableCards, gameState) {
    if (summonableCards.length === 0) return null;
    // 50%の確率で召喚しない
    if (Math.random() < 0.5) return null;
    return randomPick(summonableCards);
  },

  // 直接攻撃を優先
  chooseAttackTarget(validTargets, attacker, gameState) {
    if (validTargets.includes('direct')) {
      return Math.random() < 0.7 ? 'direct' : randomPick(validTargets);
    }
    return randomPick(validTargets);
  },
};
```

#### Normal（ふつう）

```javascript
// src/engine/ai/strategies/normal.js

import { baseStrategy, randomPick, shuffleArray } from './base';

/**
 * Normal AI ストラテジー
 * - コスト効率の良いカードを優先召喚
 * - HPの低い敵を優先攻撃
 * - 有利な状況でスキル使用
 */
export const normalStrategy = {
  ...baseStrategy,

  // コスト効率でソートして召喚
  chooseSummon(summonableCards, gameState) {
    if (summonableCards.length === 0) return null;

    // 攻撃力/コスト比でソート（高い順）
    const sorted = [...summonableCards].sort((a, b) => {
      const ratioA = (a.attack || 0) / Math.max(1, a.cost);
      const ratioB = (b.attack || 0) / Math.max(1, b.cost);
      return ratioB - ratioA;
    });

    return sorted[0];
  },

  // HPが低い敵を優先攻撃
  chooseAttackTarget(validTargets, attacker, gameState) {
    const monsterTargets = validTargets.filter(t => t !== 'direct');

    // 相手フィールドにモンスターがいない場合は直接攻撃
    if (monsterTargets.length === 0) {
      return 'direct';
    }

    // HPが最も低いモンスターを選択
    const targetHPs = monsterTargets.map(idx => ({
      idx,
      hp: gameState.opponentField[idx]?.currentHp || Infinity
    }));
    targetHPs.sort((a, b) => a.hp - b.hp);

    // 倒せる相手がいれば優先
    const killable = targetHPs.find(t => t.hp <= attacker.currentAttack);
    if (killable) return killable.idx;

    // 相手のライフが少なければ直接攻撃
    if (gameState.opponentLife <= attacker.currentAttack * 0.5) {
      return 'direct';
    }

    return targetHPs[0].idx;
  },

  // 有利な状況でスキル使用
  chooseSkill(usableSkills, gameState) {
    if (usableSkills.length === 0) return null;

    // 上級技が使えれば優先
    const advancedSkills = usableSkills.filter(s => s.skillType === 'advanced');
    if (advancedSkills.length > 0) {
      return advancedSkills[0];
    }

    // 基本技は30%の確率で使用
    if (Math.random() < 0.3) {
      return usableSkills[0];
    }

    return null;
  },
};
```

#### Hard（むずかしい）- 将来拡張

```javascript
// src/engine/ai/strategies/hard.js

import { baseStrategy } from './base';
import { normalStrategy } from './normal';

/**
 * Hard AI ストラテジー
 * - シナジーを考慮した召喚
 * - ダメージ期待値を最大化する攻撃
 * - トリガー・刹那詠唱を積極的に使用
 * - 相手のカードを予測した行動
 */
export const hardStrategy = {
  ...normalStrategy, // Normal をベースに拡張

  // TODO: シナジー評価による召喚判断
  chooseSummon(summonableCards, gameState) {
    // 将来実装: カード間シナジーを評価
    return normalStrategy.chooseSummon(summonableCards, gameState);
  },

  // TODO: ダメージ期待値計算
  chooseAttackTarget(validTargets, attacker, gameState) {
    // 将来実装: 全パターンのダメージ期待値を計算
    return normalStrategy.chooseAttackTarget(validTargets, attacker, gameState);
  },

  // 刹那詠唱を積極的に使用
  chooseSetsuna(availableSetsunaCards, chainContext, gameState) {
    if (availableSetsunaCards.length === 0) return null;

    // 攻撃宣言時、自分のモンスターが倒されそうなら発動
    if (chainContext.attacker) {
      const attackDamage = chainContext.attacker.currentAttack || 0;
      const myMonsters = gameState.myField.filter(m => m);
      const endangered = myMonsters.some(m => m.currentHp <= attackDamage);

      if (endangered) {
        return availableSetsunaCards[0]; // 最初の刹那カードを使用
      }
    }

    return null;
  },
};
```

### 4.3 ストラテジー取得

```javascript
// src/engine/ai/strategies/index.js

import { baseStrategy } from './base';
import { easyStrategy } from './easy';
import { normalStrategy } from './normal';
import { hardStrategy } from './hard';
// import { getDeckStrategy } from './deckStrategies'; // 将来拡張

const difficultyStrategies = {
  easy: easyStrategy,
  normal: normalStrategy,
  hard: hardStrategy,
};

/**
 * 難易度とデッキIDからストラテジーを取得
 * @param {string} difficulty - 難易度 ('easy' | 'normal' | 'hard')
 * @param {string|null} deckStrategyId - デッキ専用ストラテジーID（オプション）
 * @returns {Object} ストラテジーオブジェクト
 */
export function getStrategy(difficulty, deckStrategyId = null) {
  const difficultyStrategy = difficultyStrategies[difficulty] || baseStrategy;

  // 将来拡張: デッキ専用ストラテジー
  // if (deckStrategyId) {
  //   const deckStrategy = getDeckStrategy(deckStrategyId);
  //   return { ...difficultyStrategy, ...deckStrategy };
  // }

  return difficultyStrategy;
}

export { baseStrategy, easyStrategy, normalStrategy, hardStrategy };
```

---

## 5. AIコントローラー

### 5.1 メインコントローラー

```javascript
// src/engine/ai/aiController.js

import { getStrategy } from './strategies';

/**
 * AI思考の遅延時間（ミリ秒）
 */
const AI_DELAY = {
  SHORT: 300,   // 短い遅延（選択確定等）
  MEDIUM: 500,  // 中程度の遅延（アクション間）
  LONG: 800,    // 長い遅延（フェイズ開始時）
};

/**
 * 遅延を挿入（人間らしさのため）
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 200));
}

/**
 * 召喚可能なカードを取得
 */
export function getSummonableCards(gameState) {
  const { myHand, myField, myActiveSP } = gameState;
  const emptySlots = myField.map((m, i) => m === null ? i : -1).filter(i => i >= 0);

  if (emptySlots.length === 0) return [];

  return myHand.filter(card => {
    if (card.type !== 'monster') return false;
    const cost = card.cost + (card.tempCostModifier || 0);
    return cost <= myActiveSP;
  });
}

/**
 * 空きスロットを取得
 */
export function getEmptySlots(gameState) {
  return gameState.myField
    .map((m, i) => m === null ? i : -1)
    .filter(i => i >= 0);
}

/**
 * 使用可能なスキルを取得
 */
export function getUsableSkills(gameState) {
  const skills = [];
  gameState.myField.forEach((monster, index) => {
    if (!monster) return;
    const charges = monster.charges?.length || 0;

    if (charges >= 1 && monster.basicSkill) {
      skills.push({ monsterIndex: index, skillType: 'basic', monster });
    }
    if (charges >= 2 && monster.advancedSkill) {
      skills.push({ monsterIndex: index, skillType: 'advanced', monster });
    }
  });
  return skills;
}

/**
 * 攻撃可能なモンスターのインデックスを取得
 */
export function getAttackableMonsters(gameState) {
  return gameState.myField
    .map((m, i) => (m && m.canAttack) ? i : -1)
    .filter(i => i >= 0);
}

/**
 * 有効な攻撃対象を取得
 */
export function getValidAttackTargets(gameState) {
  const targets = [];

  // 相手モンスター
  gameState.opponentField.forEach((monster, index) => {
    if (monster) targets.push(index);
  });

  // 直接攻撃
  targets.push('direct');

  return targets;
}

/**
 * メインフェイズのAI行動を実行
 */
export async function executeMainPhase(gameState, actions, strategy) {
  const { summonCard, executeSkill, activateTrigger, nextPhase } = actions;

  await delay(AI_DELAY.LONG);

  // 召喚ループ（SPが続く限り）
  let continueActions = true;
  while (continueActions) {
    const summonableCards = getSummonableCards(gameState);
    const cardToSummon = strategy.chooseSummon(summonableCards, gameState);

    if (cardToSummon) {
      const emptySlots = getEmptySlots(gameState);
      const slot = strategy.chooseSlot(emptySlots, cardToSummon, gameState);

      if (slot !== null) {
        await delay(AI_DELAY.MEDIUM);
        const success = summonCard(cardToSummon, slot);
        if (success) {
          // gameState を更新（実際の実装では状態が自動更新される）
          continue;
        }
      }
    }

    continueActions = false;
  }

  // スキル使用判断
  const usableSkills = getUsableSkills(gameState);
  const skillToUse = strategy.chooseSkill(usableSkills, gameState);
  if (skillToUse) {
    await delay(AI_DELAY.MEDIUM);
    executeSkill(skillToUse.monsterIndex, skillToUse.skillType);
  }

  // トリガー発動判断
  // (トリガー取得は既存の getCardMainPhaseTriggers を使用)

  // バトルフェイズへ進行
  await delay(AI_DELAY.MEDIUM);
  nextPhase();
}

/**
 * バトルフェイズのAI行動を実行
 */
export async function executeBattlePhase(gameState, actions, strategy) {
  const { attack, nextPhase } = actions;

  // 先攻1ターン目は攻撃スキップ
  if (gameState.isFirstTurn && gameState.currentPlayer === 1) {
    await delay(AI_DELAY.SHORT);
    nextPhase();
    return;
  }

  await delay(AI_DELAY.LONG);

  // 攻撃可能なモンスターを取得
  const attackableIndices = getAttackableMonsters(gameState);
  const attackOrder = strategy.chooseAttackOrder(attackableIndices, gameState);

  // 攻撃実行
  for (const attackerIndex of attackOrder) {
    const attacker = gameState.myField[attackerIndex];
    if (!attacker || !attacker.canAttack) continue;

    const validTargets = getValidAttackTargets(gameState);
    const target = strategy.chooseAttackTarget(validTargets, attacker, gameState);

    await delay(AI_DELAY.MEDIUM);
    attack(attackerIndex, target);

    // 攻撃後の遅延
    await delay(AI_DELAY.SHORT);
  }

  // エンドフェイズへ
  await delay(AI_DELAY.MEDIUM);
  nextPhase();
}

/**
 * 手札選択（効果による）のAI処理
 */
export function handleAIHandSelection(pendingHandSelection, gameState, strategy) {
  const { callback, filter, message } = pendingHandSelection;
  const validCards = gameState.myHand.filter(filter || (() => true));

  if (validCards.length === 0) {
    console.warn('AI: 選択可能な手札がありません');
    return;
  }

  const selectedCard = strategy.chooseFromHand(validCards, message, gameState);
  callback(selectedCard);
}

/**
 * モンスターターゲット選択のAI処理
 */
export function handleAIMonsterTarget(pendingMonsterTarget, gameState, strategy) {
  const { callback, targetPlayer, message } = pendingMonsterTarget;

  const targetField = targetPlayer === 'opponent'
    ? gameState.opponentField
    : gameState.myField;

  const validIndices = targetField
    .map((m, i) => m ? i : -1)
    .filter(i => i >= 0);

  if (validIndices.length === 0) {
    console.warn('AI: 選択可能なモンスターがいません');
    return;
  }

  const selectedIndex = strategy.chooseMonsterTarget(validIndices, message, gameState);
  callback(selectedIndex);
}

/**
 * 刹那詠唱チェーン確認のAI処理
 */
export function handleAIChainConfirmation(
  chainConfirmation,
  availableSetsunaCards,
  gameState,
  strategy,
  actions
) {
  const { skipChainConfirmation, activateSetsunaInChain } = actions;
  const { context } = chainConfirmation;

  const cardToActivate = strategy.chooseSetsuna(
    availableSetsunaCards,
    context,
    gameState
  );

  if (cardToActivate) {
    activateSetsunaInChain(cardToActivate);
  } else {
    skipChainConfirmation();
  }
}

/**
 * 墓地選択のAI処理
 */
export function handleAIGraveyardSelection(pendingGraveyardSelection, gameState, strategy) {
  const { callback, filter, message } = pendingGraveyardSelection;
  const validCards = gameState.myGraveyard.filter(filter || (() => true));

  if (validCards.length === 0) {
    console.warn('AI: 選択可能な墓地カードがありません');
    return;
  }

  const selectedCard = strategy.chooseFromGraveyard(validCards, message, gameState);
  callback(selectedCard);
}
```

### 5.2 エクスポート

```javascript
// src/engine/ai/index.js

export {
  getStrategy,
  baseStrategy,
  easyStrategy,
  normalStrategy,
  hardStrategy,
} from './strategies';

export {
  executeMainPhase,
  executeBattlePhase,
  handleAIHandSelection,
  handleAIMonsterTarget,
  handleAIChainConfirmation,
  handleAIGraveyardSelection,
  getSummonableCards,
  getEmptySlots,
  getUsableSkills,
  getAttackableMonsters,
  getValidAttackTargets,
} from './aiController';
```

---

## 6. magic-spirit.jsx への統合

### 6.1 追加するstate

```javascript
// プレイヤータイプ
const [p1PlayerType, setP1PlayerType] = useState('human');
const [p2PlayerType, setP2PlayerType] = useState('human');

// AI難易度
const [p1AIDifficulty, setP1AIDifficulty] = useState('normal');
const [p2AIDifficulty, setP2AIDifficulty] = useState('normal');
```

### 6.2 AIターン実行フック

```javascript
// AIターン制御
useEffect(() => {
  // ゲーム中でない場合は何もしない
  if (gameState !== 'playing') return;

  // 現在のプレイヤーがAIかどうか判定
  const isAITurn = (currentPlayer === 1 && p1PlayerType === 'ai') ||
                   (currentPlayer === 2 && p2PlayerType === 'ai');

  if (!isAITurn) return;

  // AI難易度を取得
  const difficulty = currentPlayer === 1 ? p1AIDifficulty : p2AIDifficulty;
  const strategy = getStrategy(difficulty);

  // ゲーム状態スナップショットを作成
  const aiGameState = createAIGameState(currentPlayer);

  // アクション関数をまとめる
  const actions = {
    summonCard,
    executeSkill,
    activateTrigger,
    attack,
    nextPhase,
    skipChainConfirmation,
    activateSetsunaInChain,
  };

  // 特殊ケースの処理
  if (pendingHandSelection) {
    setTimeout(() => {
      handleAIHandSelection(pendingHandSelection, aiGameState, strategy);
    }, 500);
    return;
  }

  if (pendingMonsterTarget) {
    setTimeout(() => {
      handleAIMonsterTarget(pendingMonsterTarget, aiGameState, strategy);
    }, 500);
    return;
  }

  if (pendingGraveyardSelection) {
    setTimeout(() => {
      handleAIGraveyardSelection(pendingGraveyardSelection, aiGameState, strategy);
    }, 500);
    return;
  }

  if (chainConfirmation && chainConfirmation.askingPlayer === currentPlayer) {
    const availableSetsunaCards = getActivatableSetsunaMagics(
      currentPlayer === 1 ? p1Hand : p2Hand,
      currentPlayer === 1 ? p1ActiveSP : p2ActiveSP
    );
    setTimeout(() => {
      handleAIChainConfirmation(
        chainConfirmation,
        availableSetsunaCards,
        aiGameState,
        strategy,
        actions
      );
    }, 800);
    return;
  }

  // 通常フェイズの処理
  if (phase === 2) {
    executeMainPhase(aiGameState, actions, strategy);
  } else if (phase === 3) {
    executeBattlePhase(aiGameState, actions, strategy);
  }

}, [
  gameState, phase, currentPlayer,
  p1PlayerType, p2PlayerType,
  p1AIDifficulty, p2AIDifficulty,
  pendingHandSelection, pendingMonsterTarget, pendingGraveyardSelection,
  chainConfirmation,
]);
```

### 6.3 タイトル画面UI追加

```javascript
{/* プレイヤー設定 */}
<div style={{
  display: 'flex',
  justifyContent: 'space-around',
  marginTop: '30px',
  marginBottom: '20px',
}}>
  {/* プレイヤー1設定 */}
  <div style={{
    background: 'rgba(77, 166, 255, 0.1)',
    border: '1px solid rgba(77, 166, 255, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    minWidth: '200px',
  }}>
    <h3 style={{ color: '#4da6ff', marginBottom: '12px' }}>プレイヤー1</h3>
    <select
      value={p1PlayerType}
      onChange={(e) => setP1PlayerType(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '8px',
        borderRadius: '4px',
        background: '#2a2a4a',
        color: '#fff',
        border: '1px solid #4da6ff',
      }}
    >
      <option value="human">人間</option>
      <option value="ai">AI</option>
    </select>

    {p1PlayerType === 'ai' && (
      <select
        value={p1AIDifficulty}
        onChange={(e) => setP1AIDifficulty(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          background: '#2a2a4a',
          color: '#fff',
          border: '1px solid #4da6ff',
        }}
      >
        <option value="easy">かんたん</option>
        <option value="normal">ふつう</option>
        <option value="hard">むずかしい</option>
      </select>
    )}
  </div>

  {/* プレイヤー2設定 */}
  <div style={{
    background: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    minWidth: '200px',
  }}>
    <h3 style={{ color: '#ff6b6b', marginBottom: '12px' }}>プレイヤー2</h3>
    <select
      value={p2PlayerType}
      onChange={(e) => setP2PlayerType(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '8px',
        borderRadius: '4px',
        background: '#2a2a4a',
        color: '#fff',
        border: '1px solid #ff6b6b',
      }}
    >
      <option value="human">人間</option>
      <option value="ai">AI</option>
    </select>

    {p2PlayerType === 'ai' && (
      <select
        value={p2AIDifficulty}
        onChange={(e) => setP2AIDifficulty(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '4px',
          background: '#2a2a4a',
          color: '#fff',
          border: '1px solid #ff6b6b',
        }}
      >
        <option value="easy">かんたん</option>
        <option value="normal">ふつう</option>
        <option value="hard">むずかしい</option>
      </select>
    )}
  </div>
</div>
```

---

## 7. デッキ専用AI（将来拡張）

### 7.1 構造

```javascript
// src/engine/ai/strategies/deckStrategies/index.js

import { dragonDeckStrategy } from './dragon';
import { iceSleepDeckStrategy } from './iceSleep';
import { lightControlDeckStrategy } from './lightControl';

const deckStrategyMap = {
  // デッキID => 専用ストラテジー
  'dragon_fury': dragonDeckStrategy,
  'ice_prison': iceSleepDeckStrategy,
  'light_control': lightControlDeckStrategy,
  // 追加可能...
};

export function getDeckStrategy(deckId) {
  return deckStrategyMap[deckId] || {};
}
```

### 7.2 デッキ専用ストラテジー例

```javascript
// src/engine/ai/strategies/deckStrategies/iceSleep.js

/**
 * 氷眠の檻デッキ専用ストラテジー
 * - 凍結付与カードを優先召喚
 * - 凍結状態の敵を優先攻撃
 * - 刹那詠唱は防御的に使用
 */
export const iceSleepDeckStrategy = {
  // 凍結付与カードを優先
  chooseSummon(summonableCards, gameState) {
    const freezeCards = summonableCards.filter(card =>
      card.effect?.includes('凍結') ||
      card.name?.includes('ブリザード') ||
      card.name?.includes('氷')
    );

    if (freezeCards.length > 0) {
      // コストが払える最も強いカード
      return freezeCards.sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
    }

    // 凍結カードがなければ通常判断（継承元に委譲）
    return null; // nullを返すと継承元のメソッドが使われる
  },

  // 凍結モンスターを優先攻撃
  chooseAttackTarget(validTargets, attacker, gameState) {
    const monsterTargets = validTargets.filter(t => t !== 'direct');

    // 凍結状態のモンスターを探す
    const frozenTargets = monsterTargets.filter(idx => {
      const monster = gameState.opponentField[idx];
      return monster?.statusEffects?.some(s => s.type === 'FREEZE');
    });

    if (frozenTargets.length > 0) {
      // 凍結モンスターの中でHPが最も低いものを狙う
      return frozenTargets.sort((a, b) =>
        (gameState.opponentField[a]?.currentHp || 0) -
        (gameState.opponentField[b]?.currentHp || 0)
      )[0];
    }

    // 凍結モンスターがいなければnull（継承元に委譲）
    return null;
  },
};
```

### 7.3 統合方法

```javascript
// strategies/index.js でのマージ

export function getStrategy(difficulty, deckStrategyId = null) {
  const difficultyStrategy = difficultyStrategies[difficulty] || baseStrategy;

  if (deckStrategyId) {
    const deckStrategy = getDeckStrategy(deckStrategyId);

    // 各メソッドをラップして、デッキ専用がnullを返したら継承元を使用
    const mergedStrategy = {};
    for (const key of Object.keys(baseStrategy)) {
      mergedStrategy[key] = (...args) => {
        // デッキ専用ストラテジーを試す
        if (deckStrategy[key]) {
          const result = deckStrategy[key](...args);
          if (result !== null) return result;
        }
        // 難易度ストラテジーを使用
        return difficultyStrategy[key](...args);
      };
    }
    return mergedStrategy;
  }

  return difficultyStrategy;
}
```

---

## 8. 実装フェーズ

### Phase 1: 基盤構築

| タスク | 内容 |
|-------|------|
| ファイル作成 | `src/engine/ai/` ディレクトリ構造 |
| state追加 | p1/p2PlayerType, p1/p2AIDifficulty |
| UI追加 | タイトル画面のプレイヤー設定 |
| 基本フック | AIターン検出フック |

### Phase 2: ベースAI（ランダム）

| タスク | 内容 |
|-------|------|
| baseStrategy | 全メソッドをランダムで実装 |
| aiController | 基本的なターン実行ロジック |
| 統合テスト | AI vs 人間で動作確認 |

### Phase 3: 特殊ケース対応

| タスク | 内容 |
|-------|------|
| 手札選択 | pendingHandSelection のAI処理 |
| ターゲット選択 | pendingMonsterTarget のAI処理 |
| 墓地選択 | pendingGraveyardSelection のAI処理 |
| チェーン確認 | chainConfirmation のAI処理 |

### Phase 4: 難易度別AI

| タスク | 内容 |
|-------|------|
| easyStrategy | ランダム寄りの簡易AI |
| normalStrategy | ヒューリスティックAI |
| hardStrategy | 将来拡張用の枠組み |

### Phase 5: 調整・拡張

| タスク | 内容 |
|-------|------|
| AI思考演出 | 「考え中...」表示 |
| バランス調整 | 難易度ごとの強さ調整 |
| デッキ専用AI | 将来拡張の基盤 |

---

## 9. 既存コードへの影響まとめ

### 変更が必要なファイル

| ファイル | 変更内容 | 影響度 |
|---------|---------|-------|
| `magic-spirit.jsx` | state追加(4行)、useEffect追加(1つ)、UI追加 | 軽微 |

### 変更が不要なファイル

- `src/engine/effectEngine.js`
- `src/engine/effectHelpers.js`
- `src/engine/triggerEngine.js`
- `src/engine/continuousEffects/`
- `src/engine/statusEffects/`
- `src/components/`
- `src/utils/`
- `src/styles/`

### 新規作成ファイル

```
src/engine/ai/
├── index.js              (~30行)
├── aiController.js       (~250行)
└── strategies/
    ├── index.js          (~50行)
    ├── base.js           (~150行)
    ├── easy.js           (~50行)
    ├── normal.js         (~100行)
    └── hard.js           (~50行, 将来拡張)
```

**総追加行数**: 約680行（新規ファイル）+ 約100行（magic-spirit.jsx追加）

---

## 10. テスト計画

### 10.1 動作確認項目

| 項目 | 確認内容 |
|-----|---------|
| AI vs 人間 | P1=AI, P2=人間で正常動作 |
| 人間 vs AI | P1=人間, P2=AIで正常動作 |
| AI vs AI | P1=AI, P2=AIで自動対戦 |
| 難易度切替 | Easy/Normal/Hard で挙動が変わる |
| 特殊ケース | 手札選択、ターゲット選択が正しく動作 |
| チェーン | 刹那詠唱の確認が正しく処理される |

### 10.2 エッジケース

| ケース | 期待動作 |
|-------|---------|
| 手札0枚 | 召喚スキップ |
| フィールド満杯 | 召喚スキップ |
| SP不足 | 召喚スキップ |
| 攻撃可能モンスター0体 | バトルフェイズスキップ |
| 先攻1ターン目 | 攻撃スキップ |

---

## 付録A: 用語定義

| 用語 | 説明 |
|-----|------|
| ストラテジー | AIの判断基準を定義するオブジェクト |
| ベースストラテジー | すべてランダムのデフォルト判断基準 |
| 難易度ストラテジー | Easy/Normal/Hard別の判断基準 |
| デッキストラテジー | 特定デッキに特化した判断基準 |
| AIゲーム状態 | AIに渡すゲーム状態のスナップショット |

---

## 付録B: 参照ドキュメント

- `CLAUDE.md`: プロジェクト全体の開発ガイド
- `src/ルール/trigger-system-design.md`: トリガーシステム設計
- `src/ルール/continuous-effect-system-design.md`: 常時効果システム設計
- `src/ルール/status-effect-system-design.md`: 状態異常システム設計
- `src/ルール/chain-system-design.md`: チェーンシステム設計

---

**ドキュメントバージョン**: 1.0
**作成日**: 2025-11-27
**対象**: Magic Spirit AIプレイヤーシステム
