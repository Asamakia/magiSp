# Magic Spirit (マジックスピリット)

<div align="center">

**A browser-based trading card game built with React**

ブラウザベースのトレーディングカードゲーム

[English](#english) | [日本語](#japanese)

</div>

---

## <a name="english"></a>English

### 📖 About

Magic Spirit is a 2-player turn-based strategy card game featuring monsters, magic cards, and field cards with various elemental attributes. Players summon creatures, cast spells, and strategically battle to reduce their opponent's Life Points to zero.

### ✨ Features

- **433+ Cards**: Diverse collection of monsters, magic, field, and phase cards
- **6 Attributes**: Fire (炎), Water (水), Light (光), Dark (闇), Primitive (原始), and None (なし)
- **SP Resource System**: Strategic resource management similar to mana systems
- **5 Game Phases**: Turn Start, Draw, Main, Battle, and End phases
- **Combat System**: Featuring counter attacks and direct damage mechanics
- **Skill System**: Basic and advanced skills with extensible effect engine
- **AI Opponent**: 3 difficulty levels (Easy, Normal, Hard) with strategic decision-making
- **Trigger System**: 220+ cards with event-based trigger effects
- **Continuous Effects**: State-based persistent effects from field/monster cards
- **Status Effects**: 15 status types (freeze, sleep, poison, etc.)
- **Deck Selection**: Choose from predefined decks before battle
- **Local & AI Play**: 2-player hot-seat or vs AI gameplay

### 🛠️ Technology Stack

- **Framework**: React 19.2.0
- **Build Tool**: Create React App
- **Testing**: Jest + React Testing Library
- **Language**: JavaScript (JSX)
- **Styling**: CSS-in-JS with inline styles

### 🚀 Getting Started

#### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

#### Installation

```bash
# Clone the repository
git clone https://github.com/Asamakia/magiSp.git
cd magiSp

# Install dependencies
npm install

# Start the development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the game in your browser.

### 📜 Available Scripts

- **`npm start`**: Run development server
- **`npm test`**: Launch test runner
- **`npm run build`**: Create production build
- **`npm run eject`**: Eject from CRA (⚠️ irreversible)

### 🎮 How to Play

1. **Starting the Game**: Click "ゲーム開始" (Start Game) on the title screen
2. **SP (Spirit Points)**: Use SP to summon monsters and play cards
   - Start with 1 SP, gain 1 per turn (max 10)
   - Each card has a cost requirement
3. **Game Phases**:
   - **ターン開始** (Turn Start): SP refreshes, monsters become ready
   - **ドロー** (Draw): Draw one card
   - **メイン** (Main): Summon monsters, play magic/field cards
   - **バトル** (Battle): Attack with your monsters
   - **エンド** (End): End turn
4. **Victory**: Reduce opponent's Life Points from 6000 to 0

### 📁 Project Structure

```
magiSp/
├── public/
│   ├── cardlist/
│   │   └── cardlist.csv        # 433 card definitions
│   └── index.html
├── src/
│   ├── components/             # UI components (Card, FieldMonster, etc.)
│   ├── engine/                 # Game logic engines (~21,000 lines)
│   │   ├── ai/                 # AI player system (3 difficulty levels)
│   │   ├── cardEffects/        # Card-specific effect implementations
│   │   ├── cardTriggers/       # Card trigger implementations (220+ cards)
│   │   ├── continuousEffects/  # Persistent effect system
│   │   ├── keywordAbilities/   # Keyword ability system
│   │   ├── statusEffects/      # Status effect system (15 types)
│   │   ├── effectEngine.js     # Generic effect engine
│   │   ├── effectHelpers.js    # Reusable effect helpers
│   │   ├── triggerEngine.js    # Trigger lifecycle management
│   │   └── triggerTypes.js     # Trigger type definitions
│   ├── utils/                  # Helper functions
│   ├── styles/                 # Style definitions
│   ├── ルール/                  # Documentation (Japanese)
│   ├── magic-spirit.jsx        # Main game component (~4,700 lines)
│   └── App.js
└── package.json
```

### 🔧 Development

This project uses a modular architecture with separated concerns:

- **Effect Engine** (`src/engine/effectEngine.js`): Extensible card effect system
- **Effect Helpers** (`src/engine/effectHelpers.js`): Reusable effect patterns
- **Trigger System** (`src/engine/triggerEngine.js`): Event-based card triggers
- **AI System** (`src/engine/ai/`): Strategic AI with 3 difficulty levels
- **Status Effects** (`src/engine/statusEffects/`): Monster status conditions
- **Continuous Effects** (`src/engine/continuousEffects/`): Persistent field effects
- **Card Manager** (`src/utils/cardManager.js`): Card data loading and management
- **Components** (`src/components/`): Reusable UI components

For detailed development information, see [CLAUDE.md](./CLAUDE.md).

### 🎯 Current Status

**Advanced Prototype** - AI opponent and comprehensive card systems implemented

**Recent Updates (2025-11-28)**:
- ✅ AI player system with 3 difficulty levels (Easy/Normal/Hard)
- ✅ Trigger system (220+ cards with event-based effects)
- ✅ Continuous effect system (45 cards with persistent effects)
- ✅ Status effect system (15 status types)
- ✅ Keyword abilities (【刹那詠唱】chain system)
- ✅ Deck selection UI
- ✅ Phase card stage progression

**Previous Updates (2025-11-26)**:
- ✅ Code refactoring (modular architecture)
- ✅ Effect engine with card-specific implementations

### 🗺️ Roadmap

- [ ] Full deck builder UI (currently predefined decks only)
- [ ] Online multiplayer support
- [ ] Mobile responsive design
- [ ] Card artwork integration
- [ ] Animation system
- [ ] Remaining card effects implementation

### 📝 License

This project is available for educational and personal use.

### 🤝 Contributing

This is currently a personal project. For AI assistants working on this codebase, please refer to [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines.

---

## <a name="japanese"></a>日本語

### 📖 概要

マジックスピリットは、モンスター、魔法、フィールドカードを駆使する2人対戦型のターン制戦略カードゲームです。様々な属性のカードを召喚し、戦略的にバトルを行い、相手のライフポイントをゼロにすることを目指します。

### ✨ 特徴

- **433枚以上のカード**: モンスター、魔法、フィールド、フェイズカードの豊富なコレクション
- **6つの属性**: 炎、水、光、闇、原始、なし
- **SPリソースシステム**: 戦略的なリソース管理
- **5つのゲームフェーズ**: ターン開始、ドロー、メイン、バトル、エンド
- **戦闘システム**: カウンターアタックと直接ダメージ
- **スキルシステム**: 基本技と上級技、拡張可能な効果エンジン
- **AIプレイヤー**: 3段階の難易度（かんたん、ふつう、むずかしい）
- **トリガーシステム**: 220枚以上のカードにイベントベースのトリガー効果
- **常時効果**: フィールド/モンスターカードの永続効果
- **状態異常**: 15種類の状態異常（凍結、眠り、毒など）
- **デッキ選択**: 対戦前にデッキを選択可能
- **対戦モード**: 2人対戦またはAI対戦

### 🚀 はじめ方

```bash
# リポジトリをクローン
git clone https://github.com/Asamakia/magiSp.git
cd magiSp

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm start
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くとゲームが表示されます。

### 🎮 遊び方

1. **ゲーム開始**: タイトル画面で「ゲーム開始」をクリック
2. **SPトークン**: カードをプレイするためのリソース
   - 初期値1、毎ターン+1（最大10）
   - 各カードにはコストが設定されています
3. **ゲームフェーズ**:
   - **ターン開始**: SPが回復、モンスターが攻撃可能に
   - **ドロー**: カードを1枚引く
   - **メイン**: モンスター召喚、魔法/フィールドカードプレイ
   - **バトル**: モンスターで攻撃
   - **エンド**: ターン終了
4. **勝利条件**: 相手のライフポイントを6000から0にする

### 🔧 開発状況

**高度プロトタイプ版** - AI対戦と包括的なカードシステム実装済み

**最新アップデート (2025-11-28)**:
- ✅ AIプレイヤーシステム（かんたん/ふつう/むずかしい）
- ✅ トリガーシステム（220枚以上のカードに効果実装）
- ✅ 常時効果システム（45枚のカードに永続効果）
- ✅ 状態異常システム（15種類の状態異常）
- ✅ キーワード能力（【刹那詠唱】チェーンシステム）
- ✅ デッキ選択UI
- ✅ フェイズカード段階進行

**過去のアップデート (2025-11-26)**:
- ✅ コードリファクタリング（モジュラーアーキテクチャ）
- ✅ カード固有効果エンジン

### 📝 ライセンス

このプロジェクトは教育および個人使用目的で利用可能です。

---

<div align="center">

**Built with React ⚛️ | Powered by Magic ✨**

</div>
