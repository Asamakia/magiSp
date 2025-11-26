# マジックスピリット コード構成ドキュメント

最終更新日: 2025-11-26
リファクタリング実施: Phase 1-4完了

---

## 📁 ディレクトリ構成

```
/home/user/magiSp/
├── public/                     # 静的ファイル
│   ├── index.html
│   ├── cardlist/
│   │   └── cardlist.csv       # 433枚のカードデータ（CSV形式）
│   └── ...
│
├── src/
│   ├── App.js                  # Reactアプリエントリーポイント
│   ├── magic-spirit.jsx        # メインゲームコンポーネント（1366行）
│   │
│   ├── utils/                  # ユーティリティ関数群
│   │   ├── constants.js        # ゲーム定数定義
│   │   ├── helpers.js          # ヘルパー関数
│   │   └── cardManager.js      # カードデータ管理
│   │
│   ├── components/             # UIコンポーネント
│   │   ├── Card.jsx            # カード表示
│   │   ├── FieldMonster.jsx   # フィールドモンスター表示
│   │   ├── SPTokens.jsx        # SPトークン表示
│   │   └── GameLog.jsx         # ゲームログ表示
│   │
│   ├── styles/                 # スタイル定義
│   │   └── gameStyles.js       # ゲーム全体のスタイル
│   │
│   ├── engine/                 # ゲームロジックエンジン
│   │   └── effectEngine.js     # 効果実行エンジン
│   │
│   └── ルール/                  # ドキュメント類
│       ├── magic-spirit-roadmap-updated.txt
│       └── code-structure.md   # このファイル
│
├── package.json
├── CLAUDE.md                   # AI開発者向けガイド
└── README.md

```

---

## 📄 各ファイルの詳細

### **メインファイル**

#### `src/App.js` (Entry Point)
- **役割**: Reactアプリケーションのエントリーポイント
- **内容**: `<MagicSpiritGame />` コンポーネントをレンダリング
- **行数**: 約10行
- **依存**: magic-spirit.jsx

#### `src/magic-spirit.jsx` (Main Game Component)
- **役割**: ゲームのメインロジックと状態管理
- **内容**:
  - ゲーム状態管理（React hooks）
  - プレイヤー状態（ライフ、デッキ、手札、フィールド、墓地）
  - ゲームフロー制御（フェーズ進行、ターン管理）
  - カード召喚処理
  - 戦闘処理
  - 技発動処理
  - UI レンダリング
- **行数**: 1366行（リファクタリング前: 2237行）
- **依存**:
  - utils/constants.js
  - utils/helpers.js
  - utils/cardManager.js
  - engine/effectEngine.js
  - components/Card.jsx, FieldMonster.jsx, SPTokens.jsx, GameLog.jsx
  - styles/gameStyles.js

---

### **ユーティリティ（src/utils/）**

#### `constants.js` (Game Constants)
- **役割**: ゲーム全体で使用する定数を定義
- **内容**:
  - ゲーム定数（INITIAL_LIFE, INITIAL_SP, MAX_SP等）
  - フェーズ定義（PHASES配列）
  - 属性カラー定義（ATTRIBUTE_COLORS）
  - カードタイプアイコン（TYPE_ICONS）
- **行数**: 32行
- **エクスポート**:
  ```javascript
  export const INITIAL_LIFE = 6000;
  export const INITIAL_SP = 1;
  export const MAX_SP = 10;
  export const PHASES = ['ターン開始', 'ドロー', 'メイン', 'バトル', 'エンド'];
  export const ATTRIBUTE_COLORS = { ... };
  export const TYPE_ICONS = { ... };
  ```

#### `helpers.js` (Helper Functions)
- **役割**: 汎用的なユーティリティ関数
- **内容**:
  - `shuffle(array)`: 配列をシャッフル
  - `createDeck(cardPool)`: デッキを生成（40枚、ランダム、禁忌カード制限）
  - `createMonsterInstance(card)`: モンスターインスタンスを生成
- **行数**: 64行
- **エクスポート**:
  ```javascript
  export const shuffle = (array) => { ... };
  export const createDeck = (cardPool) => { ... };
  export const createMonsterInstance = (card) => { ... };
  ```

#### `cardManager.js` (Card Data Management)
- **役割**: カードデータの読み込みと管理
- **内容**:
  - `parseCSV(csvText)`: CSV→カードオブジェクト変換
  - `parseSkills(effectText)`: 技情報を抽出（基本技・上級技）
  - `SAMPLE_CARDS`: フォールバック用サンプルカード（30枚）
  - `loadCardsFromCSV()`: CSVファイルからカードを非同期読み込み
- **行数**: 240行
- **エクスポート**:
  ```javascript
  export const parseCSV = (csvText) => { ... };
  export const SAMPLE_CARDS = [ ... ];
  export const loadCardsFromCSV = async () => { ... };
  ```
- **CSV形式**:
  - id, name, attribute, cost, type, keyword, attack, hp, category, effect, flavor

---

### **UIコンポーネント（src/components/）**

#### `Card.jsx` (Card Display Component)
- **役割**: カード（手札・デッキ）の表示
- **Props**:
  - `card`: カードデータ
  - `onClick`: クリックハンドラ
  - `selected`: 選択状態
  - `small`: 小さいサイズ表示
  - `faceDown`: 裏向き表示
  - `inHand`: 手札表示
  - `disabled`: 無効状態
- **内容**:
  - 属性グラデーション表示
  - コスト、タイプアイコン表示
  - モンスターの攻撃力/HP表示
  - 技アイコン表示（基本技・上級技）
  - 禁忌カードマーク表示
- **行数**: 195行

#### `FieldMonster.jsx` (Field Monster Component)
- **役割**: フィールド上のモンスターの表示
- **Props**:
  - `monster`: モンスターデータ
  - `onClick`: クリックハンドラ
  - `selected`: 選択状態
  - `canAttack`: 攻撃可能状態
  - `isTarget`: 攻撃対象
  - `isValidTarget`: 召喚可能スロット
- **内容**:
  - HPバー表示
  - 現在の攻撃力/HP表示
  - チャージ数表示
  - 攻撃可能インジケーター
  - 技アイコン表示
- **行数**: 166行

#### `SPTokens.jsx` (SP Token Display)
- **役割**: SPトークンの表示
- **Props**:
  - `active`: アクティブなSP数
  - `rested`: レストSP数
  - `max`: 最大SP数
- **内容**:
  - トークンの視覚的表示（◆ = アクティブ、◇ = レスト、○ = 空）
  - 色分け表示
- **行数**: 38行

#### `GameLog.jsx` (Game Log Component)
- **役割**: ゲームログの表示
- **Props**:
  - `logs`: ログ配列
- **内容**:
  - 最新10件のログを表示
  - タイプ別色分け（damage: 赤、heal: 緑、info: グレー）
- **行数**: 20行

---

### **スタイル（src/styles/）**

#### `gameStyles.js` (Game Styles)
- **役割**: ゲーム全体のスタイル定義
- **内容**:
  - container, header, title
  - gameBoard, playerArea, fieldArea
  - monsterZone, cardSlot, handArea
  - centerZone, phaseIndicator
  - actionButton, phaseButton
  - lifeBar, spToken
  - modal, log
- **行数**: 165行
- **エクスポート**:
  ```javascript
  export default styles;
  ```
- **使用方法**:
  ```javascript
  import styles from './styles/gameStyles';
  <div style={styles.container}>...</div>
  ```

---

### **ゲームエンジン（src/engine/）**

#### `effectEngine.js` (Effect Execution Engine) ⭐最重要
- **役割**: カード効果・技効果の解析と実行
- **内容**:

  **1. EFFECT_TYPES（効果タイプ定義）**
  ```javascript
  export const EFFECT_TYPES = {
    DAMAGE: 'damage',           // ダメージ
    HEAL: 'heal',               // 回復
    BUFF_ATK: 'buff_atk',       // 攻撃力バフ
    BUFF_HP: 'buff_hp',         // HPバフ
    DEBUFF_ATK: 'debuff_atk',   // 攻撃力デバフ
    DEBUFF_HP: 'debuff_hp',     // HPデバフ
    SEARCH: 'search',           // サーチ
    REVIVE: 'revive',           // 蘇生
    DESTROY: 'destroy',         // 破壊
    DRAW: 'draw',               // ドロー
    SP_GAIN: 'sp_gain',         // SP獲得
    CONTROL: 'control',         // コントロール奪取
    DOUBLE_ATTACK: 'double_attack', // 2回攻撃
  };
  ```

  **2. parseEffect(effectText)**
  - 効果テキストから効果オブジェクトの配列を抽出
  - 正規表現でパターンマッチング
  - 現在対応: ダメージ、回復、バフ、デバフ、ドロー、2回攻撃
  - 戻り値: `[{ type, value, target }, ...]`

  **3. executeEffect(effect, context)**
  - 個別の効果を実行
  - context: { currentPlayer, setP1Life, setP2Life, setP1Field, setP2Field, addLog }
  - 実装済み: ダメージ、回復
  - 未実装（TODO）: バフ、デバフ、サーチ、蘇生、破壊、ドロー等

  **4. executeSkillEffects(skillText, context)**
  - 技全体の効果を実行
  - parseEffect → executeEffect の流れで処理

- **行数**: 220行
- **拡張方法**:
  ```javascript
  // 新しい効果を追加する場合:
  // 1. parseEffect関数に新しいパターンマッチを追加
  // 2. executeEffect関数に新しいcase文を追加
  ```
- **使用例**:
  ```javascript
  import { executeSkillEffects } from './engine/effectEngine';

  const context = {
    currentPlayer,
    setP1Life,
    setP2Life,
    setP1Field,
    setP2Field,
    addLog,
  };

  executeSkillEffects('相手に1000ダメージ', context);
  ```

---

## 🔄 データフロー

### ゲーム起動時
```
1. App.js
   ↓
2. MagicSpiritGame（magic-spirit.jsx）
   ↓
3. useEffect: loadCardsFromCSV()（cardManager.js）
   ↓ fetch('/cardlist/cardlist.csv')
4. parseCSV() → setAllCards()
   ↓
5. ゲーム画面表示
```

### カード召喚時
```
1. ユーザーがカードをクリック
   ↓
2. summonCard(card, slotIndex)
   ↓
3. createMonsterInstance(card)（helpers.js）
   ↓
4. setP1Field / setP2Field
   ↓
5. FieldMonster.jsx で表示更新
```

### 技発動時
```
1. ユーザーが技ボタンをクリック
   ↓
2. executeSkill(monsterIndex, skillType)
   ↓
3. executeSkillEffects(skill.text, context)（effectEngine.js）
   ↓
4. parseEffect(skill.text) → 効果解析
   ↓
5. executeEffect(effect, context) → 効果実行
   ↓
6. 状態更新（setP1Life, setP2Field等）
   ↓
7. UI更新
```

---

## 🎯 リファクタリングの成果

### Before（リファクタリング前）
- **magic-spirit.jsx**: 2237行
- **ファイル数**: 1個（すべてが1ファイルに集約）
- **問題点**:
  - 責務が不明確
  - テストが困難
  - 新機能追加が難しい
  - コードの見通しが悪い

### After（リファクタリング後）
- **magic-spirit.jsx**: 1366行（**-871行、-39%**）
- **ファイル数**: 10個（機能別に分離）
- **成果**:
  - ✅ 関心の分離（UI / ロジック / データ）
  - ✅ 保守性向上（各ファイルの責務が明確）
  - ✅ 拡張性向上（新機能の追加が容易）
  - ✅ テスト容易性（各モジュールを個別にテスト可能）

---

## 📝 開発ガイドライン

### 新しいカード効果を追加する場合

**Step 1: effectEngine.jsを更新**
```javascript
// parseEffect関数に新しいパターンを追加
const newEffectMatch = effectText.match(/新効果のパターン/);
if (newEffectMatch) {
  effects.push({
    type: EFFECT_TYPES.NEW_EFFECT,
    value: parseInt(newEffectMatch[1]),
  });
}
```

**Step 2: executeEffect関数に処理を追加**
```javascript
case EFFECT_TYPES.NEW_EFFECT:
  // 効果の実装
  addLog(`新効果を発動！`, 'info');
  return true;
```

### 新しいUIコンポーネントを追加する場合

**Step 1: src/components/ に新規ファイル作成**
```javascript
// src/components/NewComponent.jsx
import React from 'react';

const NewComponent = ({ prop1, prop2 }) => {
  return <div>...</div>;
};

export default NewComponent;
```

**Step 2: magic-spirit.jsx でimportして使用**
```javascript
import NewComponent from './components/NewComponent';

// JSX内で使用
<NewComponent prop1={value1} prop2={value2} />
```

---

## 🔧 今後の推奨改善

### 優先度: 高
- [ ] effectEngine.jsの効果実装を拡張
  - [ ] バフ/デバフ（攻撃力/HP）
  - [ ] サーチ（デッキから手札へ）
  - [ ] 蘇生（墓地から場へ）
  - [ ] 破壊（モンスター指定破壊）

### 優先度: 中
- [ ] battleSystem.jsの分離
- [ ] skillSystem.jsの分離
- [ ] テストコードの追加

### 優先度: 低
- [ ] phaseSystem.jsの分離
- [ ] TypeScriptへの移行
- [ ] Redux等の状態管理ライブラリ導入

---

## 📚 関連ドキュメント

- **開発ガイド**: `/home/user/magiSp/CLAUDE.md`
- **ロードマップ**: `/home/user/magiSp/src/ルール/magic-spirit-roadmap-updated.txt`
- **ルール仕様**: `/mnt/project/マジックスピリット_公式ルール仕様書_ver2_11.txt`

---

**作成日**: 2025-11-26
**バージョン**: 1.0
**リファクタリング**: Phase 1-4完了
