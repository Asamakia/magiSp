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

- **433+ Cards**: Diverse collection of monsters, magic, and field cards
- **6 Attributes**: Fire (炎), Water (水), Light (光), Dark (闇), Primitive (原始), and None (なし)
- **SP Resource System**: Strategic resource management similar to mana systems
- **5 Game Phases**: Turn Start, Draw, Main, Battle, and End phases
- **Combat System**: Featuring counter attacks and direct damage mechanics
- **Skill System**: Basic and advanced skills with extensible effect engine
- **Local Multiplayer**: 2-player hot-seat gameplay

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
│   ├── components/             # UI components
│   ├── engine/                 # Game logic engines
│   ├── utils/                  # Helper functions
│   ├── styles/                 # Style definitions
│   ├── magic-spirit.jsx        # Main game component
│   └── App.js
└── package.json
```

### 🔧 Development

This project uses a modular architecture with separated concerns:

- **Effect Engine** (`src/engine/effectEngine.js`): Extensible card effect system
- **Card Manager** (`src/utils/cardManager.js`): Card data loading and management
- **Components** (`src/components/`): Reusable UI components
- **Constants** (`src/utils/constants.js`): Centralized game constants

For detailed development information, see [CLAUDE.md](./CLAUDE.md).

### 🎯 Current Status

**Prototype Version** - Local multiplayer gameplay implemented

**Recent Updates (2025-11-26)**:
- ✅ Code refactoring completed (Phase 1-4)
- ✅ 39% code reduction (2237 → 1366 lines)
- ✅ Modular architecture implementation
- ✅ Effect engine foundation created

### 🗺️ Roadmap

- [ ] Expand effect system (buff/debuff, search, revive)
- [ ] AI opponent implementation
- [ ] Deck builder UI
- [ ] Online multiplayer support
- [ ] Mobile responsive design
- [ ] Card artwork integration
- [ ] Animation system

### 📝 License

This project is available for educational and personal use.

### 🤝 Contributing

This is currently a personal project. For AI assistants working on this codebase, please refer to [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines.

---

## <a name="japanese"></a>日本語

### 📖 概要

マジックスピリットは、モンスター、魔法、フィールドカードを駆使する2人対戦型のターン制戦略カードゲームです。様々な属性のカードを召喚し、戦略的にバトルを行い、相手のライフポイントをゼロにすることを目指します。

### ✨ 特徴

- **433枚以上のカード**: モンスター、魔法、フィールドカードの豊富なコレクション
- **6つの属性**: 炎、水、光、闇、原始、なし
- **SPリソースシステム**: 戦略的なリソース管理
- **5つのゲームフェーズ**: ターン開始、ドロー、メイン、バトル、エンド
- **戦闘システム**: カウンターアタックと直接ダメージ
- **スキルシステム**: 基本技と上級技、拡張可能な効果エンジン
- **ローカルマルチプレイ**: 2人対戦プレイ対応

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

**プロトタイプ版** - ローカル対戦機能実装済み

**最新アップデート (2025-11-26)**:
- ✅ コードリファクタリング完了（フェーズ1-4）
- ✅ コード量39%削減（2237行 → 1366行）
- ✅ モジュラーアーキテクチャ実装
- ✅ 効果エンジンの基礎構築

### 📝 ライセンス

このプロジェクトは教育および個人使用目的で利用可能です。

---

<div align="center">

**Built with React ⚛️ | Powered by Magic ✨**

</div>
