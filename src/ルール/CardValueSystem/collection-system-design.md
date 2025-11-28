# カードコレクションシステム設計書

作成日: 2025-11-28
バージョン: 1.0

## 概要

カードの収集・管理・売買を行うシステム。対戦ゲーム部分とは独立したモジュールとして設計する。

### 主要機能
- カード所持管理（コレクション）
- 通貨（G）管理
- パック購入・開封
- カード売買
- デッキ編成（所持カードから）

### 関連ドキュメント
- `card_value_system_v2.1.md` - カード価値計算・レアリティ・経済システムの仕様

---

## アーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                    App.js                               │
├─────────────────────────────────────────────────────────┤
│  gameState: 'title' | 'playing' | 'gameOver'            │
│           | 'collection' | 'shop' | 'deckEdit'          │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  game/        │ │  collection/  │ │    decks/     │
│  (対戦)       │ │ (コレクション) │ │  (デッキ管理)  │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
              ┌───────────────────────┐
              │  collection/data/     │
              │  storage.js           │
              │  (localStorage抽象化)  │
              └───────────────────────┘
```

### 対戦システムとの関係

| 観点 | 対戦システム | コレクションシステム |
|------|-------------|-------------------|
| 状態管理 | Reactステート（揮発） | localStorage（永続） |
| データ | カードマスター参照 | プレイヤー固有データ |
| 連携点 | 対戦終了時の報酬付与 | デッキ選択時のレアリティ適用 |

---

## ディレクトリ構成

### 実装済み構成

```
src/
├── collection/                    # カードコレクションシステム
│   ├── index.js                   # エクスポート
│   │
│   ├── data/                      # データ管理
│   │   ├── storage.js             # 永続化（localStorage抽象化）
│   │   ├── playerData.js          # プレイヤーデータ構造定義
│   │   ├── constants.js           # 経済定数
│   │   └── migration.js           # データ移行（バージョンアップ時）
│   │
│   ├── systems/                   # 各システム
│   │   ├── valueCalculator.js     # 基礎価値計算
│   │   ├── raritySystem.js        # レアリティ定義・排出率
│   │   ├── collectionManager.js   # 所持カード管理
│   │   ├── currencyManager.js     # 通貨（G）管理
│   │   ├── packSystem.js          # パック開封
│   │   └── shopSystem.js          # 売買
│   │
│   └── components/                # コレクションUI
│       ├── CollectionScreen.jsx   # コレクション画面
│       ├── ShopScreen.jsx         # ショップ画面
│       ├── PackOpening.jsx        # パック開封演出
│       ├── CardGrid.jsx           # カード一覧グリッド
│       ├── CardDetail.jsx         # カード詳細モーダル
│       ├── DeckList.jsx           # デッキ一覧・管理
│       └── DeckBuilder.jsx        # デッキ構築・編集
│
├── magic-spirit.jsx               # メインゲームロジック（対戦+UI統合）
├── engine/                        # 対戦エンジン
├── components/                    # 対戦UI
├── decks/                         # プリセットデッキ
│   └── prebuiltDecks.js
├── utils/                         # ユーティリティ
└── styles/                        # スタイル
```

### 将来の検討事項

```
# 以下は将来の拡張で検討
src/
├── game/                          # 対戦ゲーム（src/直下から移動）
│   ├── magic-spirit.jsx
│   ├── engine/
│   └── components/
│
├── decks/
│   └── userDecks.js               # ユーザー作成デッキ専用モジュール
│
└── shared/
    └── hooks/
        └── usePlayerData.js       # プレイヤーデータ用カスタムフック
```

---

## データ構造

### プレイヤーデータ（playerData）

```javascript
{
  // バージョン（マイグレーション用）
  version: 1,

  // 通貨
  gold: 10000,

  // 未開封パック数（勝利報酬で獲得、ショップで開封可能）
  unopenedPacks: 0,

  // 所持カード
  // 同じカードでもレアリティ違いは別エントリ
  collection: [
    { cardId: "C0000021", rarity: "C", quantity: 3 },
    { cardId: "C0000021", rarity: "SR", quantity: 1 },
    { cardId: "C0000023", rarity: "R", quantity: 2 },
  ],

  // ユーザー作成デッキ
  userDecks: [
    {
      id: "deck_001",
      name: "炎ドラゴン",
      cards: [
        { cardId: "C0000021", rarity: "SR" },
        { cardId: "C0000021", rarity: "C" },
        // ... 40枚
      ],
      createdAt: 1732780800000,
      updatedAt: 1732780800000,
    }
  ],

  // 統計
  stats: {
    totalBattles: 0,
    wins: 0,
    packsOpened: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
  },

  // メタデータ
  createdAt: 1732780800000,
  updatedAt: 1732780800000,
}
```

### 所持カードエントリ

```javascript
{
  cardId: "C0000021",  // カードマスターのID
  rarity: "SR",        // レアリティ（C/UC/R/SR/UR/HR/SEC/ALT/SP/GR）
  quantity: 2,         // 所持枚数
}
```

### ユーザーデッキ

```javascript
{
  id: "deck_001",           // 一意ID
  name: "炎ドラゴン",        // デッキ名
  cards: [                  // 40枚
    { cardId: "C0000021", rarity: "SR" },
    // ...
  ],
  createdAt: 1732780800000,
  updatedAt: 1732780800000,
}
```

---

## 経済定数

```javascript
// 初期値
INITIAL_GOLD: 10000

// 対戦報酬
BATTLE_REWARD_GOLD: 5000      // 対戦完了時
BATTLE_WIN_BONUS_PACKS: 1     // 勝利ボーナス

// パック
PACK_PRICE: 3500              // 1パックの価格
CARDS_PER_PACK: 5             // 1パックの枚数
```

---

## レアリティシステム

### レアリティ一覧

| レアリティ | 名称 | 価値倍率 | 備考 |
|------------|------|----------|------|
| C | コモン | ×1.0 | 毎パック2-3枚 |
| UC | アンコモン | ×1.3 | 毎パック1枚 |
| R | レア | ×2.0 | 1-2パック |
| SR | スーパーレア | ×5.0 | 5-6パック |
| UR | ウルトラレア | ×15.0 | 20パック（1箱） |
| HR | ホログラム | ×30.0 | 80パック（4箱） |
| SEC | シークレット | ×50.0 | 200パック |
| ALT | オルタナティブ | ×50.0 | 500パック |
| SP | スペシャル | ×60.0 | 1,250パック |
| GR | ゴッドレア | ×100.0 | 禁忌カード専用 |

### ティア別レアリティ制限

| ティア | 出現レアリティ | 最低レア |
|--------|----------------|----------|
| S | R / SR / UR / HR / SEC / ALT / SP / GR※ | R |
| A | UC / R / SR / UR / HR / SEC / ALT / SP | UC |
| B〜D | C / UC / R / SR / UR / HR / SEC / ALT / SP | C |

※GRは禁忌カード専用

### パック構成（1パック5枚）

```
枠1: C確定
枠2: C確定
枠3: C/UC（UC 30%）
枠4: C/UC（UC 30%）
枠5: R以上確定枠
```

### 枠5（R以上確定枠）の排出率

| レア | 確率 |
|------|------|
| R | 75% |
| SR | 18% |
| UR | 5% |
| HR | 1.2% |
| SEC | 0.5% |
| ALT | 0.2% |
| SP | 0.08% |
| GR | 0.02% |

---

## システム詳細

### storage.js - 永続化抽象レイヤー

将来の移行（IndexedDB、クラウド同期等）を容易にするための抽象化。

```javascript
const STORAGE_VERSION = 1;
const STORAGE_KEY = 'magicSpirit_playerData';

export const storage = {
  // 保存
  save: (data) => {
    const wrapped = {
      version: STORAGE_VERSION,
      data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapped));
  },

  // 読み込み
  load: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { version, data } = JSON.parse(raw);
    // バージョン違いがあればmigration処理を呼び出し
    if (version < STORAGE_VERSION) {
      return migrate(data, version);
    }
    return data;
  },

  // 削除
  clear: () => localStorage.removeItem(STORAGE_KEY),

  // 存在確認
  exists: () => localStorage.getItem(STORAGE_KEY) !== null,

  // エクスポート（バックアップ用）
  export: () => localStorage.getItem(STORAGE_KEY),

  // インポート（復元用）
  import: (jsonString) => {
    localStorage.setItem(STORAGE_KEY, jsonString);
  },
};
```

### collectionManager.js - 所持カード管理

```javascript
export const collectionManager = {
  // カード追加（パック開封、報酬等）
  addCard: (playerData, cardId, rarity) => {
    const collection = [...playerData.collection];
    const existing = collection.find(
      c => c.cardId === cardId && c.rarity === rarity
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      collection.push({ cardId, rarity, quantity: 1 });
    }

    return { ...playerData, collection };
  },

  // カード削除（売却）
  removeCard: (playerData, cardId, rarity, quantity = 1) => {
    const collection = [...playerData.collection];
    const index = collection.findIndex(
      c => c.cardId === cardId && c.rarity === rarity
    );

    if (index === -1) return playerData;

    collection[index].quantity -= quantity;
    if (collection[index].quantity <= 0) {
      collection.splice(index, 1);
    }

    return { ...playerData, collection };
  },

  // 所持確認
  hasCard: (playerData, cardId, rarity = null) => {
    if (rarity) {
      return playerData.collection.some(
        c => c.cardId === cardId && c.rarity === rarity && c.quantity > 0
      );
    }
    return playerData.collection.some(
      c => c.cardId === cardId && c.quantity > 0
    );
  },

  // 特定カードの所持枚数
  getQuantity: (playerData, cardId, rarity) => {
    const entry = playerData.collection.find(
      c => c.cardId === cardId && c.rarity === rarity
    );
    return entry ? entry.quantity : 0;
  },

  // 特定カードの所持レアリティ一覧
  getOwnedRarities: (playerData, cardId) => {
    return playerData.collection
      .filter(c => c.cardId === cardId && c.quantity > 0)
      .map(c => c.rarity);
  },

  // 最高レアリティ取得（プリセットデッキ用）
  getHighestRarity: (playerData, cardId) => {
    const owned = collectionManager.getOwnedRarities(playerData, cardId);
    if (owned.length === 0) return 'C'; // 未所持はC扱い

    const rarityOrder = ['GR', 'SP', 'ALT', 'SEC', 'HR', 'UR', 'SR', 'R', 'UC', 'C'];
    for (const rarity of rarityOrder) {
      if (owned.includes(rarity)) return rarity;
    }
    return 'C';
  },

  // 全所持カード数
  getTotalCards: (playerData) => {
    return playerData.collection.reduce((sum, c) => sum + c.quantity, 0);
  },

  // ユニークカード数（レアリティ問わず）
  getUniqueCardCount: (playerData) => {
    const uniqueIds = new Set(playerData.collection.map(c => c.cardId));
    return uniqueIds.size;
  },
};
```

### packSystem.js - パック開封

```javascript
import { ECONOMY } from '../data/constants';
import { raritySystem } from './raritySystem';

export const packSystem = {
  // パック購入可能か
  canBuyPack: (playerData) => {
    return playerData.gold >= ECONOMY.PACK_PRICE;
  },

  // パック開封（5枚抽選）
  openPack: (allCards, cardValues) => {
    const results = [];

    // 枠1-2: C確定
    results.push(drawCard(allCards, cardValues, 'C_ONLY'));
    results.push(drawCard(allCards, cardValues, 'C_ONLY'));

    // 枠3-4: C/UC（UC 30%）
    results.push(drawCard(allCards, cardValues, 'C_UC'));
    results.push(drawCard(allCards, cardValues, 'C_UC'));

    // 枠5: R以上確定
    results.push(drawCard(allCards, cardValues, 'R_PLUS'));

    return results;
  },

  // パック購入処理（G消費 + 開封）
  buyAndOpenPack: (playerData, allCards, cardValues) => {
    if (!packSystem.canBuyPack(playerData)) {
      return { success: false, error: 'ゴールドが足りません' };
    }

    let newData = {
      ...playerData,
      gold: playerData.gold - ECONOMY.PACK_PRICE,
      stats: {
        ...playerData.stats,
        packsOpened: playerData.stats.packsOpened + 1,
        totalGoldSpent: playerData.stats.totalGoldSpent + ECONOMY.PACK_PRICE,
      },
    };

    const cards = packSystem.openPack(allCards, cardValues);

    // 各カードをコレクションに追加
    for (const { cardId, rarity } of cards) {
      newData = collectionManager.addCard(newData, cardId, rarity);
    }

    return { success: true, cards, playerData: newData };
  },
};

// 内部関数：カード抽選
function drawCard(allCards, cardValues, slotType) {
  // 1. レアリティを決定
  const rarity = raritySystem.drawRarity(slotType);

  // 2. そのレアリティで出現可能なカードを絞り込み
  const eligibleCards = allCards.filter(card => {
    const tier = cardValues[card.id]?.tier || 'D';
    return raritySystem.canAppearAtRarity(tier, rarity);
  });

  // 3. ランダムに1枚選択
  const card = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];

  return { cardId: card.id, rarity, card };
}
```

---

## UI画面仕様

### タイトル画面（変更）

```
┌────────────────────────────────────┐
│         Magic Spirit               │
│                                    │
│    所持G: 10,000G                  │
│                                    │
│   ┌──────────┐  ┌──────────┐       │
│   │  対戦    │  │コレクション│      │
│   └──────────┘  └──────────┘       │
│   ┌──────────┐  ┌──────────┐       │
│   │ ショップ │  │デッキ編集 │       │
│   └──────────┘  └──────────┘       │
└────────────────────────────────────┘
```

### コレクション画面

```
┌────────────────────────────────────────────┐
│ ← 戻る      コレクション         G: 10,000│
├────────────────────────────────────────────┤
│ フィルタ: [全属性▼][全レア▼][全種類▼][全ティア▼][検索]│
├────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐          │
│ │ カード名 │ │ カード名 │ │ カード名 │         │
│ │ C×3    │ │ SR×1   │ │ R×2    │          │
│ │ [S] 350G│ │ [A] 1,250G│ │ [B] 400G│       │
│ └────────┘ └────────┘ └────────┘          │
│                                            │
│ 所持: 156種 / 433種  総枚数: 312枚         │
└────────────────────────────────────────────┘
```

**フィルタ機能**:
- 属性: 炎/水/光/闇/原始/未来/なし
- レアリティ: C/UC/R/SR/UR/HR/SEC/ALT/SP/GR
- 種類: モンスター/魔法/フィールド/フェイズ
- **ティア: S/A/B/C/D** （カード強さ指標）
- 検索: カード名部分一致

**カード表示情報**:
- カード名、コスト、レアリティ
- ステータス（モンスターのみ）
- 所持枚数
- **ティア**（S/A/B/C/D のバッジ表示）
- **価格**（レアリティ別売却価格）

### ショップ画面

```
┌────────────────────────────────────┐
│ ← 戻る      ショップ       G: 10,000│
├────────────────────────────────────┤
│                                    │
│   ┌─────────────────────┐          │
│   │    スタンダードパック │          │
│   │                     │          │
│   │    🎴 5枚入り        │          │
│   │    3,500G           │          │
│   │                     │          │
│   │   [ 購入する ]       │          │
│   └─────────────────────┘          │
│                                    │
│   ──────────────────────           │
│   カード売却 →                      │
│   （コレクションから選択）            │
│                                    │
└────────────────────────────────────┘
```

### 対戦終了画面（変更）

```
┌────────────────────────────────────┐
│                                    │
│            VICTORY!                │
│                                    │
│   ───── 報酬 ─────                  │
│                                    │
│   💰 5,000G                        │
│   🎴 パック ×1（勝利ボーナス）       │
│                                    │
│   [ パックを開ける ]                │
│   [ タイトルに戻る ]                │
│                                    │
└────────────────────────────────────┘
```

---

## プリセットデッキとの連携

### 仕様

1. プリセットデッキは**カードを所持していなくても使用可能**
2. 所持しているカードは**最高レアリティを自動適用**
3. 対戦中のカード能力は**レアリティに関係なく同一**

### 実装

```javascript
// デッキ選択時のレアリティ解決
function resolvePrebuiltDeckRarities(prebuiltDeck, playerData) {
  return prebuiltDeck.cards.map(cardId => {
    const rarity = collectionManager.getHighestRarity(playerData, cardId);
    return { cardId, rarity };
  });
}
```

---

## 実装フェーズ

### Phase 1: データ基盤 ✅ 完了
- `src/collection/data/storage.js`
- `src/collection/data/playerData.js`
- `src/collection/data/constants.js`
- `src/collection/data/migration.js`
- `src/collection/index.js`

### Phase 2: コアシステム ✅ 完了
- `src/collection/systems/valueCalculator.js`
- `src/collection/systems/raritySystem.js`
- `src/collection/systems/collectionManager.js`
- `src/collection/systems/currencyManager.js`
- `src/collection/systems/packSystem.js`
- `src/collection/systems/shopSystem.js`

### Phase 3: コレクションUI ✅ 完了
- `src/collection/components/CollectionScreen.jsx`
- `src/collection/components/CardGrid.jsx`
- `src/collection/components/CardDetail.jsx`
- タイトル画面への導線追加

### Phase 4: パック・ショップ ✅ 完了
- `src/collection/components/ShopScreen.jsx`
- `src/collection/components/PackOpening.jsx`

### Phase 5: ゲーム統合 ✅ 完了
- 対戦終了時の報酬付与（G + 勝利パック）
- タイトル画面にコレクション/ショップ/マイデッキボタン
- デッキ一覧画面（`DeckList.jsx`）- 保存・編集・削除
- デッキ構築画面（`DeckBuilder.jsx`）
- プレイヤーデータのlocalStorage永続化

---

## 将来の拡張予定

- プリセットデッキのレアリティ解決（所持カードに最高レアリティ適用）
- ユーザー作成デッキでの対戦
- 属性別パック
- 新カードパック
- トレード機能
- クラウド同期
- 実績システム
- src/game/ へのファイル構成移動

---

## 動的市場システム（実装予定）⭐

### 概要

カードの価値が常に変動する擬似市場システム。
詳細仕様: `market_system.md`

```
最終価格 = 基礎価値 × レアリティ倍率 × 市場変動率
```

### ディレクトリ構成

```
src/collection/market/           # 動的市場システム
├── index.js                     # エクスポート
├── constants.js                 # 変動幅、確率等の定数
├── marketState.js               # 市場状態管理
├── marketEngine.js              # 価格変動計算エンジン
├── weeklyTrend.js               # 週間トレンド（15種）
├── newsGenerator.js             # デイリーニュース生成
├── suddenEvent.js               # 突発イベント（25種）
├── priceHistory.js              # 価格履歴管理
└── data/                        # データ定義
    ├── categories.js            # カテゴリと所属属性
    ├── templates.js             # ニューステンプレート
    └── events.js                # イベント定義
```

### 市場状態（playerDataへの追加）

```javascript
{
  market: {
    currentDay: 0,              // ゲーム内日数（戦闘数）
    weeklyTrend: {              // 週間トレンド
      id: 1,
      name: '炎属性の時代',
      effects: [...],
      startDay: 0,
    },
    dailyNews: {                // デイリーニュース
      text: '...',
      target: { category: '岩狸' },
      modifier: 35,
    },
    suddenEvent: null,          // 突発イベント（10%確率）
    priceHistory: {             // 価格履歴（30戦分）
      cards: {},
      attributes: {},
      marketIndex: [],
      events: [],
    },
  },
}
```

### 実装フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| M-1 | 市場エンジン（価格変動計算） | ✅ 完了 |
| M-2 | 週間トレンド（15種） | ✅ 完了 |
| M-3 | 簡易ニュース（基本型パターン） | ✅ 完了 |
| M-4 | UI統合（ショップに市場価格表示） | ✅ 完了 |
| M-5 | 紐づけテーブル完備・全8パターン | ✅ 完了 |
| M-6 | 突発イベント（25種） | ✅ 完了 |
| M-7 | 価格チャート・市場分析画面 | ✅ 完了 |

### 変動要素（3層構造）

| 要素 | 発生 | 変動幅 | 上限 |
|------|------|--------|------|
| デイリーニュース | 毎戦 | ±15%〜50% | - |
| 週間トレンド | 7戦ごと | ±15%〜25% | - |
| 突発イベント | 10%確率 | ±30%〜60% | - |
| **合計変動** | - | - | +100%〜-50% |

### ニューステンプレート（8パターン）

1. **基本型**: カテゴリ→属性（自動紐づけ）
2. **人物型**: 人物×行動（制限紐づけ）
3. **場所型**: 場所→対象・出来事（紐づけ）
4. **噂型**: 噂内容→対象（紐づけ）
5. **比較型**: 自由
6. **需要供給型**: 自由
7. **時事ネタ型**: 季節/時間→属性（紐づけ）
8. **ストーリー型**: キャラ→対象（紐づけ）

**総バリエーション**: 約50,000〜65,000通り（紐づけテーブル完備時）

### 市場分析画面（MarketAnalysis.jsx）

ショップ画面の「詳細分析 →」ボタンから開く詳細分析画面。

**タブ構成**:

| タブ | 内容 | 説明 |
|------|------|------|
| 📊 総合 | MSI + 属性サマリー | 市場全体の状況を俯瞰 |
| 🔮 属性 | 属性別詳細 | 各属性の価格推移チャート |
| 🏷️ カテゴリ | ランキング | 変動率でソートされたカテゴリ一覧 |
| ⭐ ティア | ティア別分析 | S/A/B/C/D各ティアの推移 |
| 📰 イベント | 履歴 | 過去のニュース・突発イベント |
| 🔍 検索 | 個別カード | カード名検索で個別価格確認 |

**⚠️ 注意: 価格履歴について**

市場分析画面は**価格履歴データ**を基に表示されます。履歴は**対戦ごと（1戦 = ゲーム内1日）**に蓄積されるため：

- **2〜3戦**: ほとんどのデータが「0」「---」「データなし」と表示される
- **7戦**: 週間トレンドが1周し、簡易的な傾向が見える
- **30戦**: 意味のあるチャートが表示される（推奨）

これは正常な動作であり、対戦を重ねることでデータが蓄積されます。

---

## 更新履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| 1.0 | 2025-11-28 | 初版作成 |
| 1.1 | 2025-11-28 | 全フェーズ実装完了、ディレクトリ構成を実態に合わせて更新 |
| 1.2 | 2025-11-28 | DeckList.jsx追加（デッキ一覧・編集・削除機能） |
| 1.3 | 2025-11-28 | コレクション画面に価格表示・ティアフィルター追加 |
| 1.4 | 2025-11-28 | 動的市場システム計画を追加 |
| 1.5 | 2025-11-28 | 動的市場システム全フェーズ完了（M-1〜M-7）、市場分析画面の説明追加 |
