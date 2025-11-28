# CLAUDE.md - Magic Spirit Project Guide for AI Assistants

## Project Overview

**Magic Spirit (マジックスピリット)** is a browser-based trading card game built with React. It's a 2-player turn-based strategy game featuring monsters, magic cards, and field cards with various attributes (fire, water, light, dark, primitive, etc.).

### Technology Stack
- **Framework**: React 19.2.0
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **Testing**: Jest + React Testing Library
- **Language**: JavaScript (JSX)
- **Styling**: Inline styles with CSS-in-JS approach

### Project Status
Currently a **prototype version** with local 2-player gameplay and AI opponent support.

**Recent Major Updates**:
- **2025-11-26 (Phase 1-4)**: Code refactoring completed
  - Modular architecture with separated concerns
  - Note: magic-spirit.jsx has grown to ~4300 lines due to trigger system, AI, and deck selection integration
- **2025-11-26 (Phase 5 - Card Effects)**: Card-specific effects system implemented
  - 108+ individual card effects across all attributes
  - Hybrid approach: generic effects + card-specific implementations
  - Effect helper library for reusable effect patterns
  - ~2100 lines of new effect implementation code
- **2025-11-26 (Phase 5 - Phase Cards UI)**: Phase card system UI implemented
  - Field card and phase card separation (separate slots)
  - Horizontal layout for field/phase cards
  - Field/phase card information panel
  - Basic placement and activation functionality
  - Phase progression logic pending
- **2025-11-26 (Bug fixes & UI improvements)**: Fixed card display bugs and improved magic card UX
  - Fixed field/phase card info display showing in both player areas
  - Added dedicated magic card activation button for clearer UX
  - Separated magic card activation from phase transition logic
- **2025-11-26 (Phase 6 - Trigger System)**: Comprehensive trigger system implemented ⭐
  - 27 generic trigger types (reduced from 51 specific types)
  - Automatic vs optional trigger distinction
  - Card-bound UI integration (triggers shown with skills)
  - Priority-based trigger execution
  - Turn-based usage flags and lifecycle management
  - ~1230 lines of new trigger infrastructure
  - **221 cards with trigger implementations across 7 attributes** (~7600 lines)
    - Fire (炎): 33 cards (819 lines)
    - Water (水): 37 cards (1122 lines) - includes 3 graveyard triggers
    - Light (光): 47 cards (1309 lines)
    - Dark (闇): 45 cards (1591 lines)
    - Future (未来): 13 cards (~600 lines) - includes ON_LEAVE_FIELD trigger
    - Primitive (原始): 28 cards (1306 lines)
    - Neutral (なし): 18 cards (758 lines) - includes graveyard/field/phase card triggers
- **2025-11-26 (Graveyard Triggers)**: Graveyard trigger system implemented ⭐
  - ON_MAIN_PHASE_FROM_GRAVEYARD: メインフェイズ墓地発動（任意発動）
  - ON_END_PHASE_FROM_GRAVEYARD: エンドフェイズ墓地発動（自動発動）
  - Graveyard trigger UI in main phase (shows activatable graveyard cards)
  - Automatic graveyard trigger execution in end phase
  - 3 water attribute cards implemented:
    - C0000043 深海のクラーケン (SP4払い自己蘇生)
    - C0000045 海流の守護者 (エンド時SPアクティブ)
    - C0000143 氷猫の使い魔 (エンド時ブリザードキャット回収)
- **2025-11-26 (Deck Selection)**: Deck selection feature implemented ⭐
  - Players can select from predefined decks before game starts
  - Deck selection UI on title screen
  - Card pool maintained at 433 cards
- **2025-11-26 (UI Bug Fix)**: Fixed info panel skill text duplication
  - Removed duplicate 基本技/上級技 display in card info panel
- **2025-11-26 (Phase 5 - Phase Card Stage Logic)**: Phase card stage progression implemented ⭐
  - CSVテキストパース方式で段階効果を取得（「初期効果:」「1枚重ね:」等）
  - phaseCardEffects.jsを大幅簡素化（658行→200行）
  - 情報パネルに現在の段階効果と次の段階効果を表示
  - フェイズカードでフェイズカードをチャージ可能（同属性）
  - 最終段階（3枚チャージ）で墓地送り処理
- **2025-11-26 (Phase 7 - Continuous Effect System)**: Comprehensive continuous effect system implemented ⭐⭐⭐⭐
  - State-based effect system for persistent card effects
  - 12 effect types: ATK_MODIFIER, HP_MODIFIER, DAMAGE_REDUCTION, DAMAGE_IMMUNITY, etc.
  - Condition checking system (attribute, category, name, life, turn conditions)
  - Value calculation system (fixed, count multiply, conditional)
  - 45 cards with continuous effects (23 field cards + 22 monster cards)
  - Phase card stage-based effects support
  - ~2736 lines of new implementation code
- **2025-11-27 (Hand Selection System & Trigger Fix)**: Player hand selection UI and ON_SUMMON trigger scope fix ⭐
  - Hand selection system for effects requiring player choice (e.g., ソラリア)
  - Two-step confirmation: click to select, click area to confirm
  - Separate `pendingSelectedCard` state to prevent normal actions during selection
  - **ON_SUMMON trigger scope fix**: Now fires only for the summoned card itself
  - Previously ON_SUMMON fired for all summons; now correctly scoped to owning card
- **2025-11-27 (Cost Reduction & Category Fix)**: Summon cost modifier display and category comparison fix ⭐
  - Hand cards now display modified cost with color coding (green=reduced, red=increased)
  - Tooltip shows original cost and modifier source
  - Added `hasCategory()` helper function for normalized category comparison
  - Fixed category comparison across 10 files (cardEffects/, cardTriggers/, effectEngine.js, etc.)
  - Phase card continuous effects (e.g., エクラシアの時空炉) now work correctly
- **2025-11-27 (Keyword Abilities - Setsuna Eisho)**: Chain point system for 【刹那詠唱】 implemented ⭐⭐
  - Keyword abilities system foundation (`src/engine/keywordAbilities/index.js`)
  - Chain point system for opponent-turn card activation
    - BATTLE_START: Confirmation when entering battle phase
    - ATTACK_DECLARATION: Confirmation when monster attacks
  - Chain confirmation dialog UI with card selection
  - Setsuna cost calculation: normal cost + 1 SP
  - Phase A implementation: Single chain (no counter-chains)
  - Phase B preparation: Stack structure ready for LIFO resolution
  - Documentation: `src/ルール/chain-system-design.md`, rules updated to ver2.3
- **2025-11-27 (Phase Trigger Owner Check & Field Card Fix)**: Phase trigger system and continuous effect fixes ⭐
  - **Phase trigger owner validation**: `_SELF` triggers (ON_END_PHASE_SELF, etc.) now only fire when card owner === turn player
  - **Opponent phase trigger**: `ON_OPPONENT_END_PHASE` fires when card owner !== turn player
  - **Monster/card owner property**: Added `owner` property to monsters, field cards, phase cards on summon/placement
  - **Continuous effect UI display**: Field monsters now show ATK/HP modifiers with color coding (green=buff, red=debuff)
  - **Field card trigger registration**: Fixed missing `registerCardTriggers()` call for field cards
  - Fixed: ドラゴンの火山 end phase trigger now fires correctly (only on owner's turn, damages opponent monsters)
- **2025-11-27 (Status Effect System)**: Comprehensive status effect system implemented ⭐⭐
  - **Status effect engine** (`src/engine/statusEffects/`) with ~580 lines of new code
  - **15 status effect types**: SLEEP, FREEZE, THUNDER, WET, STUN, SILENCE, GUARD, INVINCIBLE, CORRODE, AWAKENED, ATK_UP, HP_UP, ATK_DOWN, PARASITE, POISON
  - **Game integration**: Turn start/end phase processing, attack/skill restrictions, damage calculation
  - **Status effect helpers** in effectHelpers.js for applying status effects
  - **UI display**: Status icons on field monsters (FieldMonster.jsx)
  - **New deck**: 氷眠の檻 (Ice Sleep Prison) - freeze/sleep control deck
  - **6 cards implemented**: C0000039 (sleep), C0000144/145/150/157/199 (freeze)
- **2025-11-27 (skillType Context & Ice Deck Effects)**: Skill type judgment system fix and ice deck card implementations ⭐⭐
  - **skillType context parameter**: Added `context.skillType` ('basic' | 'advanced') to effect context
  - **Deprecated pattern fix**: Changed `skillText.includes('基本技')` → `context.skillType === 'basic'`
  - Fixed across all attribute files: fire.js, water.js, light.js, dark.js, future.js
  - Updated template and README documentation
  - **Ice deck (氷眠の檻) card implementations**:
    - C0000053 母なる大海: 凍結バーンダメージ (エンド時凍結モンスターいれば300ダメージ)
    - C0000044 水晶のマーメイド: 召喚時コスト軽減 (水属性モンスター1体のコスト-1)
    - C0000142 ブリザードマスター: デッキ選択UI対応 (複数候補から選択可能)
    - C0000046 泡沫の精霊: 基本技修正 (skillType判定に変更)
    - C0000144 ブリザードキャット・フロスト: 基本技実装 (ATK半分ダメージ)
- **2025-11-27 (AI Player System)**: Comprehensive AI player system implemented ⭐⭐⭐⭐⭐
  - **AI system foundation** (`src/engine/ai/`) with ~1,211 lines of code
  - **3 difficulty levels**: Easy (かんたん), Normal (ふつう), Hard (むずかしい)
  - **Per-player AI control**: P1 and P2 can each be set to human or AI independently
  - **Title screen AI settings UI**: Player type and difficulty selection
  - **Strategy pattern architecture**: Extensible decision-making system
  - **Special case handling**: Hand selection, monster target, graveyard selection, deck review, chain confirmation
  - **AI vs AI auto-battle**: Full automated gameplay support
  - **Documentation**: `src/ルール/ai-player-system-design.md` (~1,400 lines)
- **2025-11-27 (AI Charge Mechanics)**: AI charge functionality ⭐
  - **AI charge decision**: AI can now charge monsters to empower them
  - **Charge conditions**: Intelligent targeting for charge actions
- **2025-11-27 (Bug Fixes & Card Implementations)**: Multiple fixes and new card effects ⭐⭐
  - **Fixed log duplication**: setState callback内のaddLog呼び出しを修正
  - **Fixed monster removal**: 魔法・技によるダメージでHP0になったモンスターが墓地送りされないバグを修正
  - **Fixed field card overwrite**: フィールドカード上書き時に既存カードを墓地に送る処理を追加
  - **Game log expansion**: ログ保持量を拡張（より多くの履歴を表示）
  - **New card effects implemented**:
    - C0000393 黒呪・カルヴェリオンの灰嵐 (闇属性魔法)
    - 魔女エリザヴェット・ヴェイルの基本技
    - ブリザードキャット・スノウの基本技
    - フレア・ドラゴンの基本技
- **2025-11-28 (Revival System & Attack Modifier Fix)**: 蘇生システム改善と攻撃力修正バグ修正 ⭐⭐
  - **reviveFromGraveyard柔軟化**: オプションオブジェクト形式に拡張
    - `{ attackHalf: true }`: 攻撃力のみ半減（フレイマ等）
    - `{ hpHalf: true }`: HPのみ半減（氷の双尾猫）
    - `{ attackHalf: true, hpHalf: true }`: 両方半減
    - `{ fixedAttack: 300, fixedHp: 800 }`: 固定値指定
    - 後方互換性: `true`/`false` の旧形式もサポート
  - **currentAttack初期化漏れ修正**: 蘇生・特殊召喚時のプロパティ初期化を修正
    - effectHelpers.js: reviveFromGraveyardでcurrentAttack, charges, statusEffectsを正しく設定
    - darkCards.js: 闘属性の特殊召喚、攻撃力半減/増加効果でcurrentAttackも更新
    - waterCards.js, primitiveCards.js, cardEffects/dark.js, future.js, water.js: 同様の修正
  - **常時効果との連携**: ドラゴンの火山などの攻撃力修正が蘇生モンスターにも正しく適用
- **2025-11-28 (AI Fix & Card Implementations)**: AIフリーズ修正と新カード効果実装 ⭐⭐
  - **AIフリーズ修正**: AIアクション空振り時（有効なアクションがない場合）のフリーズを修正
  - **新デッキ追加**: 粘液獣スウォームデッキ「無限増殖」
  - **ブリザードマスター技実装**: 基本技・上級技を実装
  - **水属性魔法カード効果実装**:
    - C0000049 タイダルシフト（手札とフィールドの入れ替え）
    - C0000047 マーメイドの恵み（水属性モンスターHP回復）
    - C0000050 クラーケンの呼び声（深海モンスター蘇生）
- **2025-11-28 (Trigger System Fix)**: トリガー実行エラー修正 ⭐⭐
  - **トリガー実行時カード情報追加**: fireTrigger/activateTriggerでcontext.cardが未設定だったバグを修正
    - フィールドからカードを検索してコンテキストに追加
    - フォールバック: triggerCard → context.card → context.destroyedCard
  - **ON_DESTROY_SELFトリガースコープ修正**: 破壊されたカード自身のトリガーのみ発火するように修正
    - 同名カード複数時の重複発動バグを修正（例: 粘液獣・開花3体中1体破壊で種子1体のみ生成）
- **2025-11-28 (Parasite Status Effect System)**: 寄生状態異常システム化 ⭐⭐
  - **PARASITE状態異常タイプ追加**: 寄生効果を状態異常システムで管理
    - 毎ターン開始時ATK減少（500 or 1000）
    - 効果無効化（技・トリガー使用不可）
    - 寄生カード参照保持（破壊時墓地送り用）
    - 相手エンドフェイズで効果無効のみ解除
  - **新API**: `processOpponentEndPhase()`, `getParasiteInfo()`, `isParasiteEffectNegated()`
  - **ヘルパー関数追加**: `processStatusEffectsTurnStart()`, `processStatusEffectsEndPhase()`
  - **magic-spirit.jsx簡素化**: ターン開始/エンドフェイズの状態異常処理をヘルパーに移動（約30行削減）
- **2025-11-28 (Skill & SP Charge Rules)**: 技発動1ターン1回制限とSPチャージ機能を実装 ⭐⭐
  - **技発動1ターン1回制限**: 公式ルール5.1準拠（各モンスター1ターンに一度のみ）
    - `usedSkillThisTurn`フラグをモンスターに追加
    - ターン開始時にフラグリセット
    - 技発動後にフラグセット、UI表示「[発動済]」
    - AI対応: `getUsableSkills()`で発動済みモンスターをスキップ
  - **SPチャージ機能**: 公式ルール5.1準拠（SPトークン1個をチャージ）
    - `chargeSP()`関数追加
    - SPチャージはSPトークンを永続消費（総数減少）
    - 属性チャージと同ターン不可（`chargeUsedThisTurn`フラグ共有）
    - チャージ消費優先度: 同属性 > なし属性 > SPチャージ
    - SPチャージは技発動時に消費、属性チャージは残存
    - UI表示: 💠(SPチャージ) / 🃏(属性チャージ)
    - AI非対応（長期的損失のため意図的に除外）
  - **修正ファイル**:
    - magic-spirit.jsx: chargeSP(), executeSkill(), processPhase(), UI buttons
    - helpers.js: createMonsterInstance() - usedSkillThisTurn初期化
    - effectHelpers.js: reviveFromGraveyard() - usedSkillThisTurn初期化
    - FieldMonster.jsx: charge icon display (💠/🃏)
    - aiController.js: getUsableSkills() - 発動済みスキップ
- **2025-11-28 (Card Collection System)**: カードコレクションシステム実装完了 ⭐⭐⭐⭐⭐
  - **対戦システムとは独立したモジュール** `src/collection/`
  - **カード価値計算システム**: 基礎価値・ティア（S/A/B/C/D）・レアリティ（10種）
  - **コレクション管理**: 所持カード（カードID + レアリティ + 枚数）
  - **経済システム**: 通貨G、初期10,000G、対戦報酬5,000G、パック3,500G
  - **パック開封**: 5枚/パック、闇鍋形式（将来属性別パック拡張予定）
  - **UI実装**: コレクション画面、ショップ画面、パック開封演出、デッキ構築
  - **ゲーム統合**: タイトル画面にG表示・コレクション/ショップ/デッキ編集ボタン
  - **対戦報酬**: ゲーム終了時に5,000G + 勝利時パック1個
  - **デッキ構築**: 所持カードから40枚デッキを作成（同名4枚まで、禁忌1枚まで）
  - **スターターデッキ**: 新規プレイヤーに炎ドラゴンデッキをC版で付与
  - **永続化**: localStorage（将来IndexedDB/クラウド移行可能な抽象化）
  - **Documentation**: `src/ルール/CardValueSystem/collection-system-design.md`
- **2025-11-28 (Dynamic Market System)**: 動的市場システム実装完了 ⭐⭐⭐⭐
  - **市場エンジン** (`src/collection/market/`): ~1,609行のコード
  - **週間トレンド**: 15種類（属性優勢、コスト環境、レアリティ注目、カオスなど）
  - **デイリーニュース**: 8パターンの自動生成システム
    - 基本（カテゴリ+理由）、人物（NPC+行動）、場所（ロケーション+イベント）
    - 噂話、比較（A vs B）、需給変動、季節、ストーリー
  - **価格変動**: 週間トレンド + デイリーニュース + 突発イベント（準備中）
    - 上限+100%、下限-50%の価格修正
  - **市場データ**: 64以上のエンティティ（人物、場所、理由、噂など）
  - **ショップ連携**: 売却価格が市場状況で変動
  - **Documentation**: `src/ルール/CardValueSystem/market_system.md`, `news-binding-tables-design.md`
- **2025-11-28 (Deck List UI)**: デッキ管理画面実装 ⭐
  - **DeckList.jsx**: デッキ一覧表示・作成・編集・削除
  - **デッキ統計**: カード分布、コストカーブ表示
  - **プリセット連携**: プリセットデッキをレアリティ適用してインポート

---

## Directory Structure

```
/home/user/magiSp/
├── public/                     # Static assets
│   ├── index.html              # HTML entry point
│   ├── cardlist/
│   │   └── cardlist.csv        # 433 cards data
│   ├── manifest.json           # PWA manifest
│   └── *.png, *.ico            # Icons and images
│
├── src/
│   ├── App.js                  # Main app component (renders MagicSpiritGame)
│   ├── magic-spirit.jsx        # Main game logic (~4300 lines) ⭐
│   │
│   ├── collection/             # Card collection system (~7,000 lines) ⭐⭐⭐⭐⭐
│   │   ├── index.js              # Main exports (92 lines)
│   │   ├── data/                 # Data management (~508 lines)
│   │   │   ├── storage.js        # Persistence layer (localStorage abstraction, 140 lines)
│   │   │   ├── playerData.js     # Player data structure & initialization (183 lines)
│   │   │   ├── constants.js      # Economy constants (INITIAL_GOLD, PACK_PRICE, etc., 134 lines)
│   │   │   └── migration.js      # Data migration for version upgrades (51 lines)
│   │   ├── systems/              # Core systems (~1,220 lines)
│   │   │   ├── valueCalculator.js    # Base value & tier calculation (240 lines)
│   │   │   ├── raritySystem.js       # Rarity definitions & pull rates (169 lines)
│   │   │   ├── collectionManager.js  # Card collection CRUD operations (274 lines)
│   │   │   ├── currencyManager.js    # Gold management (177 lines)
│   │   │   ├── packSystem.js         # Pack opening logic (195 lines)
│   │   │   └── shopSystem.js         # Buy/sell operations (165 lines)
│   │   ├── market/               # Dynamic market system (~1,609 lines) ⭐ NEW
│   │   │   ├── index.js          # Market module exports (33 lines)
│   │   │   ├── marketEngine.js   # Price calculation & state management (323 lines)
│   │   │   ├── weeklyTrend.js    # 15 weekly trend definitions (191 lines)
│   │   │   ├── newsGenerator.js  # 8-pattern news generation (569 lines)
│   │   │   ├── constants.js      # Market constants (126 lines)
│   │   │   └── data/             # Market data entities (~1,244 lines)
│   │   │       ├── categories.js     # Card category mappings (102 lines)
│   │   │       ├── persons.js        # NPC characters & actions (137 lines)
│   │   │       ├── locations.js      # Story locations (238 lines)
│   │   │       ├── reasons.js        # Price change reasons (152 lines)
│   │   │       ├── rumors.js         # Rumors & whispers (120 lines)
│   │   │       ├── comparisons.js    # A vs B patterns (94 lines)
│   │   │       ├── supplyDemand.js   # Supply/demand patterns (43 lines)
│   │   │       ├── seasonal.js       # Seasonal effects (114 lines)
│   │   │       └── characters.js     # Story characters (244 lines)
│   │   └── components/           # Collection UI (~3,313 lines)
│   │       ├── CollectionScreen.jsx  # Collection view (380 lines)
│   │       ├── ShopScreen.jsx        # Shop view with market info (576 lines)
│   │       ├── PackOpening.jsx       # Pack opening animation (487 lines)
│   │       ├── CardGrid.jsx          # Card grid display (262 lines)
│   │       ├── CardDetail.jsx        # Card detail modal (473 lines)
│   │       ├── DeckList.jsx          # Deck management (446 lines) ⭐ NEW
│   │       └── DeckBuilder.jsx       # Deck building from collection (689 lines)
│   │
│   ├── utils/                  # Utility functions
│   │   ├── constants.js        # Game constants (30 lines)
│   │   ├── helpers.js          # Helper functions (125 lines)
│   │   └── cardManager.js      # Card data management (253 lines)
│   │
│   ├── components/             # Battle UI Components
│   │   ├── Card.jsx            # Card display (187 lines)
│   │   ├── FieldMonster.jsx    # Field monster display (170 lines)
│   │   ├── SPTokens.jsx        # SP token display (38 lines)
│   │   └── GameLog.jsx         # Game log display (21 lines)
│   │
│   ├── styles/                 # Style definitions
│   │   └── gameStyles.js       # Game styles (182 lines)
│   │
│   ├── engine/                 # Battle engine ⭐⭐
│   │   ├── effectEngine.js     # Generic effect execution engine (563 lines)
│   │   ├── effectHelpers.js    # Reusable effect helper functions (~920 lines)
│   │   ├── phaseCardEffects.js # Phase card stage effect parser (200 lines) ⭐ NEW
│   │   ├── triggerTypes.js     # Trigger type definitions (372 lines) ⭐ NEW
│   │   ├── triggerEngine.js    # Trigger lifecycle management (716 lines) ⭐ NEW
│   │   ├── cardEffects/        # Card-specific effect implementations (~2850 lines)
│   │   │   ├── index.js        # Effect registry and exports
│   │   │   ├── _template.js    # Template for new card effects
│   │   │   ├── fire.js         # 炎属性 card effects
│   │   │   ├── water.js        # 水属性 card effects
│   │   │   ├── light.js        # 光属性 card effects
│   │   │   ├── dark.js         # 闇属性 card effects
│   │   │   ├── primitive.js    # 原始属性 card effects
│   │   │   ├── future.js       # 未来属性 card effects
│   │   │   └── neutral.js      # なし属性 card effects
│   │   ├── cardTriggers/       # Card-specific trigger implementations (~7955 lines)
│   │   │   ├── fireCards.js      # 炎属性 trigger implementations (~883 lines)
│   │   │   ├── waterCards.js     # 水属性 trigger implementations (~1411 lines)
│   │   │   ├── lightCards.js     # 光属性 trigger implementations (~1070 lines)
│   │   │   ├── darkCards.js      # 闇属性 trigger implementations (~1658 lines)
│   │   │   ├── futureCards.js    # 未来属性 trigger implementations (~868 lines)
│   │   │   ├── primitiveCards.js # 原始属性 trigger implementations (~1306 lines)
│   │   │   └── neutralCards.js   # なし属性 trigger implementations (~759 lines)
│   │   ├── continuousEffects/  # Continuous effect system (~2736 lines) ⭐⭐⭐⭐
│   │   │   ├── index.js          # Main exports (106 lines)
│   │   │   ├── effectTypes.js    # Effect type definitions (224 lines)
│   │   │   ├── targetTypes.js    # Target type definitions (182 lines)
│   │   │   ├── conditionChecker.js # Condition checking (303 lines)
│   │   │   ├── valueCalculator.js  # Value calculation (216 lines)
│   │   │   ├── effectEngine.js   # Main continuous effect engine (687 lines)
│   │   │   └── effectDefinitions/ # Card effect definitions (~1018 lines)
│   │   │       ├── index.js      # Definition registry (77 lines)
│   │   │       ├── fieldCards.js # Field card effects (23 cards, 390 lines)
│   │   │       ├── monsterCards.js # Monster card effects (22 cards, 368 lines)
│   │   │       └── phaseCards.js # Phase card effects (183 lines)
│   │   ├── keywordAbilities/   # Keyword ability system (~250 lines) ⭐⭐
│   │   │   └── index.js          # Keyword definitions, chain points, helpers
│   │   ├── statusEffects/      # Status effect system (~580 lines) ⭐⭐
│   │   │   ├── index.js          # Main exports
│   │   │   ├── statusTypes.js    # Status type definitions and metadata
│   │   │   └── statusEngine.js   # Main status effect engine
│   │   └── ai/                 # AI player system (~1246 lines) ⭐⭐⭐⭐⭐
│   │       ├── index.js          # Main exports (~35 lines)
│   │       ├── aiController.js   # AI controller (~499 lines)
│   │       └── strategies/       # Strategy implementations
│   │           ├── index.js      # Strategy selector (~61 lines)
│   │           ├── base.js       # Base strategy (random) (~209 lines)
│   │           ├── easy.js       # Easy AI (~50 lines)
│   │           ├── normal.js     # Normal AI (~157 lines)
│   │           └── hard.js       # Hard AI (~235 lines)
│   │
│   ├── ルール/                  # Documentation (~12000 lines total)
│   │   ├── Game Rules (日本語) - 3 files (~260 lines)
│   │   │   ├── マジックスピリット 公式ルール仕様書 ver2.3.txt (~130 lines)
│   │   │   ├── マジックスピリット - デッキ構築とコストバランス.txt (86 lines)
│   │   │   └── マジックスピリット - フェイズカードルール (ver1.0).txt (44 lines)
│   │   ├── Development Docs - 3 files (~395 lines)
│   │   │   ├── magic-spirit-roadmap-updated.txt (~145 lines) ⭐ Current roadmap
│   │   │   ├── CHANGELOG.md (~150 lines) - Completion history
│   │   │   └── magic-spirit-roadmap.txt (249 lines) - Legacy (archived)
│   │   ├── Code Architecture
│   │   │   └── code-structure.md (433 lines) - Detailed architecture guide
│   │   ├── Trigger System Documentation - 4 files (3579 lines)
│   │   │   ├── trigger-implementation-guide.md (1268 lines) - Implementation guide
│   │   │   ├── trigger-specifications.md (941 lines) - Spec details
│   │   │   ├── trigger-revision-plan.md (823 lines) - Design revision plan
│   │   │   └── trigger-system-design.md (547 lines) - System design
│   │   ├── Continuous Effect System Documentation - 1 file (1247 lines) ⭐⭐⭐⭐
│   │   │   └── continuous-effect-system-design.md (1247 lines) - System design
│   │   ├── Keyword Abilities Documentation - 2 files (~530 lines) ⭐⭐
│   │   │   ├── keyword-abilities.md (~450 lines) - Keyword ability list and progress
│   │   │   └── chain-system-design.md (~280 lines) - Chain point system design
│   │   ├── Status Effect System Documentation - 1 file (~1050 lines) ⭐⭐
│   │   │   └── status-effect-system-design.md (~1050 lines) - System design
│   │   ├── AI Player System Documentation - 1 file (~1400 lines) ⭐⭐⭐⭐⭐
│   │   │   └── ai-player-system-design.md (~1400 lines) - AI system design
│   │   └── Card Value System Documentation - 4 files (~3,000 lines) ⭐⭐⭐⭐⭐
│   │       ├── card_value_system_v2.1.md (~593 lines) - Value calculation spec
│   │       ├── collection-system-design.md (~748 lines) - Collection system design
│   │       ├── market_system.md (~698 lines) - Market mechanics spec ⭐ NEW
│   │       └── news-binding-tables-design.md (~975 lines) - News pattern definitions ⭐ NEW
│   │
│   ├── index.js                # React entry point
│   ├── App.css                 # App styling
│   ├── index.css               # Global styles
│   ├── setupTests.js           # Test configuration
│   ├── App.test.js             # App tests
│   └── reportWebVitals.js      # Performance monitoring
│
├── package.json                # Dependencies and scripts
├── CLAUDE.md                   # This file - AI developer guide
└── README.md                   # Standard CRA documentation
```

### Key Files

**`src/magic-spirit.jsx`** (Main game component - ~4300 lines)
- Game state management (React hooks)
- Game flow control (phase progression, turn management)
- Card summoning logic
- Battle system
- Skill execution
- UI rendering

**`src/engine/effectEngine.js`** (Generic effect engine - 563 lines) ⭐
- Generic effect type definitions (13 types)
- Effect text parser for common patterns
- Generic effect execution system
- Delegates to card-specific effects when available

**`src/engine/effectHelpers.js`** (Effect helpers - ~920 lines) ⭐⭐ **Most Important**
- Reusable effect helper functions
- Common patterns: damage, heal, draw, search, revive, destroy
- Field/graveyard manipulation utilities
- Used by all card-specific effects

**`src/engine/phaseCardEffects.js`** (Phase card stage parser - 200 lines) ⭐ **NEW**
- CSVのeffectフィールドから段階効果をパース
- 「初期効果:」「1枚重ね:」「2枚重ね:」「3枚重ね:」形式をサポート
- `parsePhaseCardStageEffects()` - 効果テキストから各段階を抽出
- `getPhaseCardStageText()` - 指定段階の効果テキストを取得
- `getStageName()` / `getStageShortName()` - 段階名ヘルパー
- `getCurrentStageDescription()` / `getNextStageDescription()` - UI表示用

**`src/engine/cardEffects/`** (Card-specific effects - ~2850 lines) ⭐⭐ **Most Important**
- 120+ individual card implementations
- Organized by attribute (fire, water, light, dark, primitive, future, neutral)
- Central registry in `index.js`
- Template file for new card effects

**`src/engine/triggerTypes.js`** (Trigger type definitions - 380 lines) ⭐ **NEW**
- 27 generic trigger types (召喚時, 破壊時, 場を離れる時, フェイズ, etc.)
- Activation types: AUTOMATIC vs OPTIONAL
- Priority system (HIGHEST, HIGH, NORMAL, LOW, LOWEST)
- Helper functions for trigger metadata
- Designed for extensibility without hardcoding

**`src/engine/triggerEngine.js`** (Trigger lifecycle engine - ~730 lines) ⭐
- Global trigger registry system
- Trigger registration/unregistration (on summon/destroy)
- Automatic trigger firing (phase-based)
- Optional trigger retrieval (for UI display)
- Manual trigger activation
- Turn-based usage flag management
- Priority-based execution ordering
- **Phase trigger owner validation**:
  - `_SELF` triggers (ON_END_PHASE_SELF, etc.): fire only when `trigger.owner === currentPlayer`
  - `_OPPONENT` triggers (ON_OPPONENT_END_PHASE): fire only when `trigger.owner !== currentPlayer`

**`src/engine/cardTriggers/`** (Card-specific trigger implementations - ~7955 lines, 220+ cards)
- **fireCards.js**: 炎属性 triggers (34 cards, ~850 lines) - includes field card ドラゴンの火山
- **waterCards.js**: 水属性 triggers (37 cards, 1122 lines) - includes 3 graveyard triggers
- **lightCards.js**: 光属性 triggers (37 cards, 1069 lines)
- **darkCards.js**: 闇属性 triggers (45 cards, 1591 lines)
- **futureCards.js**: 未来属性 triggers (12 cards, 504 lines)
- **primitiveCards.js**: 原始属性 triggers (28 cards, 1306 lines)
- **neutralCards.js**: なし属性 triggers (18 cards, 758 lines) - includes field/phase card triggers
- Uses effect helpers for common patterns
- Comprehensive trigger system covering 220 cards across all attributes

**`src/engine/continuousEffects/`** (Continuous effect system - ~2736 lines, 45 cards) ⭐⭐⭐⭐
- **effectTypes.js**: 12 continuous effect types (ATK_MODIFIER, DAMAGE_REDUCTION, etc.)
- **targetTypes.js**: Target type definitions (SELF_CARD, SELF_MONSTERS, etc.)
- **conditionChecker.js**: Condition checking system (attribute, category, name, life, etc.)
- **valueCalculator.js**: Value calculation (FIXED, COUNT_MULTIPLY, CONDITIONAL)
- **effectEngine.js**: Main engine with lifecycle management and calculation methods
- **effectDefinitions/**: Card-specific continuous effect definitions
  - fieldCards.js: 23 field cards with continuous effects
  - monsterCards.js: 22 monster cards with continuous effects
  - phaseCards.js: Phase card stage-based effects
- State-based effect system (vs event-driven trigger system)
- Comprehensive coverage of 常時 effects

**`src/engine/keywordAbilities/`** (Keyword ability system - ~250 lines) ⭐⭐
- **index.js**: Keyword ability definitions, judgment functions, chain point system
- `KEYWORD_ABILITIES`: 14 keyword ability definitions
- `hasKeyword()`, `getCardKeywords()`: Keyword judgment functions
- `isSetsunaMagic()`, `getSetsunaCost()`: Setsuna-specific helpers
- `CHAIN_POINTS`, `CHAIN_POINT_NAMES`: Chain point definitions
- `createStackItem()`, `resolveStack()`: Stack management for Phase B preparation
- Hybrid architecture: integrates with trigger/continuous effect systems

**`src/engine/ai/`** (AI player system - ~1210 lines) ⭐⭐⭐⭐⭐
- **aiController.js**: Main AI controller (~530 lines)
  - `createAIGameState()`: Game state snapshot for AI
  - `executeAIMainPhaseAction()`: Main phase AI logic
  - `executeAIBattlePhaseAction()`: Battle phase AI logic
  - `handleAIHandSelection()`, `handleAIMonsterTarget()`, `handleAIGraveyardSelection()`: Special case handlers
  - `handleAIDeckReview()`, `handleAIChainConfirmation()`: Additional handlers
- **strategies/**: Strategy pattern implementations
  - `base.js`: Base strategy (random decisions)
  - `easy.js`: Easy AI (30% skip summon, 70% direct attack)
  - `normal.js`: Normal AI (cost efficiency, HP targeting)
  - `hard.js`: Hard AI (field awareness, damage efficiency)
- **index.js**: Exports all AI functions and strategies
- Uses strategy pattern for extensible decision-making

**`src/utils/cardManager.js`** (Card data manager - 253 lines)
- CSV parser for 433 cards
- Skill information extraction
- Async card loading from CSV
- Fallback sample cards

**`src/components/`** (UI components - 4 files, 419 lines total)
- Separated UI components for better maintainability
- Independent, reusable components

**`src/utils/constants.js`** (Game constants - 30 lines)
- All game constants in one place
- Easy to adjust game balance

**`src/ルール/`** (Documentation directory - ~5356 lines total) 📚

*Game Rules (日本語) - 3 files, ~260 lines:*
- **公式ルール仕様書 ver2.3.txt** (~130 lines): Official game rules specification
  - Core game mechanics and rules
  - Turn structure and phase details
  - Card types and attributes
- **デッキ構築とコストバランス.txt** (86 lines): Deck building and cost balance guide
  - Deck construction rules
  - Cost balance guidelines
  - Card distribution recommendations
- **フェイズカードルール (ver1.0).txt** (44 lines): Phase card rules
  - Phase card mechanics
  - Stage progression rules
  - Phase card activation timing

*Development Docs - 3 files, ~395 lines:*
- **magic-spirit-roadmap-updated.txt** (~145 lines) ⭐ **Current roadmap**
  - Remaining tasks and priorities only
  - Total progress: 90%
- **CHANGELOG.md** (~150 lines): Completion history
  - Phase-by-phase implementation status
  - Milestone dates and code statistics
- **magic-spirit-roadmap.txt** (249 lines): Legacy roadmap (archived)

*Code Architecture - 1 file, 433 lines:*
- **code-structure.md**: Detailed architecture documentation
  - Module organization
  - Component hierarchy
  - State management patterns
  - Effect and trigger system architecture

*Trigger System Documentation - 4 files, 3579 lines:* ⭐ **NEW**
- **trigger-implementation-guide.md** (1268 lines): Implementation guide
  - Step-by-step trigger implementation
  - Code examples and patterns
  - Best practices and common pitfalls
- **trigger-specifications.md** (941 lines): Detailed specifications
  - Complete trigger type catalog
  - Activation rules and priorities
  - Edge case handling
- **trigger-revision-plan.md** (823 lines): Design revision documentation
  - System design evolution
  - Refactoring decisions
  - Architecture improvements
- **trigger-system-design.md** (547 lines): System design overview
  - High-level architecture
  - Design principles
  - Integration patterns

**`package.json`**
- React 19.2.0 (latest)
- Testing libraries included
- Standard CRA scripts

**See also**: Complete documentation in `src/ルール/` directory for game rules, architecture, and system design

---

## Game Mechanics Summary

Understanding these mechanics is crucial for working with the codebase:

### Core Concepts

1. **Life Points (LP)**: Each player starts with 6000 LP. Reaching 0 LP means defeat.

2. **SP Tokens (Spirit Points)**: Resource system for playing cards
   - Start with 1 SP
   - Gain 1 SP per turn (max 10)
   - Active SP: Available to use
   - Rested SP: Used this turn, returns next turn

3. **Card Types**:
   - **Monster Cards**: Have attack/HP, can battle
   - **Magic Cards**: One-time effects, go to graveyard
   - **Field Cards**: Persistent effects on the battlefield

4. **Attributes**: 炎 (fire), 水 (water), 光 (light), 闇 (dark), 原始 (primitive), なし (none)

5. **Game Phases** (per turn):
   - **ターン開始** (Turn Start): SP refresh, monster ready
   - **ドロー** (Draw): Draw 1 card
   - **メイン** (Main): Summon monsters, play cards
   - **バトル** (Battle): Attack with monsters
   - **エンド** (End): Turn end, switch player

6. **Combat System**:
   - Monsters can attack other monsters or directly attack player
   - Counter attacks deal 30% damage back
   - Direct attacks reduced 50% if opponent has monsters
   - Field cards reduce direct damage to 75%
   - Monsters cannot attack on summon turn

### Game State

The game uses React hooks with extensive state:
```javascript
// Player states (duplicated for P1 and P2)
- Life points
- Deck, Hand, Field (5 slots), Graveyard
- Active SP and Rested SP
- Field card

// Game flow
- Current turn, current player
- Current phase (0-4)
- isFirstTurn flag (first turn no attacks)
- Winner state

// UI state
- selectedHandCard
- selectedFieldMonster
- attackingMonster
- pendingHandSelection      // Hand selection mode { message, callback }
- pendingSelectedCard       // Selected card during hand selection (prevents normal actions)
```

---

## Development Guidelines

### Working with Game Logic

**Main Game Logic**: Located in `src/magic-spirit.jsx` (~4300 lines)
**Generic Effect System**: Located in `src/engine/effectEngine.js` (563 lines)
**Card-Specific Effects**: Located in `src/engine/cardEffects/` (~2850 lines, 120+ cards)
**Effect Helpers**: Located in `src/engine/effectHelpers.js` (~920 lines)
**Trigger System**: Located in `src/engine/` - triggerTypes.js, triggerEngine.js, cardTriggers/ ⭐ **NEW**
**Card Management**: Located in `src/utils/cardManager.js` (253 lines)

**Key Functions in magic-spirit.jsx**:

1. **`initGame()`**: Initialize/reset game state
2. **`processPhase(phaseIndex)`**: Handle phase transitions
3. **`summonCard(card, slotIndex)`**: Place cards on field
4. **`attack(attackerIndex, targetIndex)`**: Combat resolution
5. **`executeSkill(monsterIndex, skillType)`**: Execute monster skills (uses effectEngine)
6. **`useMagicCard()`**: Activate magic card from hand (dedicated function)
7. **`nextPhase()`**: Advance to next phase (no longer handles magic card activation)
8. **`getCurrentPlayerData()`**: Get active player state
9. **`getOpponentData()`**: Get opponent state

**Key Functions in effectEngine.js**:

1. **`parseEffect(effectText)`**: Parse effect text into effect objects
2. **`executeEffect(effect, context)`**: Execute single effect
3. **`executeSkillEffects(skillText, context)`**: Execute all effects in skill text

**Key Functions in effectHelpers.js**:

1. **`millDeck(context, count)`**: Mill cards from deck to graveyard
2. **`conditionalDamage(context, damage, target, targetIndex)`**: Apply damage with targeting
3. **`searchCard(context, condition)`**: Search deck for card matching condition
4. **`reviveFromGraveyard(context, condition, options)`**: Revive monster from graveyard (options: boolean or object)
5. **`destroyMonster(context, targetIndex, isOpponent)`**: Destroy target monster
6. **`drawCards(context, count)`**: Draw cards from deck
7. **`healLife(context, amount, isSelf)`**: Heal life points
8. **`modifyAttack(context, amount, targetIndex, isOpponent)`**: Buff/debuff attack
9. **`modifyHP(context, amount, targetIndex, isOpponent)`**: Modify monster HP

**Key Functions in cardEffects/index.js**:

1. **`getCardEffect(cardId)`**: Get card-specific effect function by ID
2. **`hasCardEffect(cardId)`**: Check if card has specific implementation
3. **`getRegisteredEffectCount()`**: Get total count of implemented cards

**Important Constants** (in `src/utils/constants.js`):
```javascript
INITIAL_LIFE = 6000
INITIAL_SP = 1
MAX_SP = 10
INITIAL_HAND_SIZE = 5
DECK_SIZE = 40
COUNTER_ATTACK_RATE = 0.3
PHASES = ['ターン開始', 'ドロー', 'メイン', 'バトル', 'エンド']
ATTRIBUTE_COLORS = { '炎': {...}, '水': {...}, ... }
TYPE_ICONS = { 'monster': '⚔️', 'magic': '✨', ... }
```

### Working with the Effect System ⭐⭐

The effect system uses a **hybrid approach** combining generic effects and card-specific implementations:

**System Architecture**:
```
Card Effect Execution Flow:
1. executeSkillEffects() called with card ID and skill text
2. Check if card has specific implementation (cardEffects/index.js)
   ├─ YES → Execute card-specific effect function
   └─ NO  → Fall back to generic effect parsing (effectEngine.js)
3. Card-specific effects use helper functions (effectHelpers.js)
4. Generic effects use built-in parsing patterns
```

**Three-Tier Effect System**:

1. **Card-Specific Effects** (`src/engine/cardEffects/*.js`) - **120+ cards**
   - Custom implementations for complex/unique cards
   - Organized by attribute (fire, water, light, dark, etc.)
   - Full control over effect behavior
   - Examples: C0000028 (炎竜母フレイマ), C0000161 (灯魔龍ランプデビル)

2. **Effect Helpers** (`src/engine/effectHelpers.js`) - **15+ helper functions**
   - Reusable patterns used by card-specific effects
   - Fully implemented: millDeck, conditionalDamage, searchCard, reviveFromGraveyard, destroyMonster, drawCards, healLife, modifyAttack, modifyHP
   - Status effect helpers: selectAndApplyStatusToOpponent, applyStatusToOpponentMonster, applyStatusToAllOpponentMonsters, applyStatusToOwnMonster

3. **Generic Effects** (`src/engine/effectEngine.js`) - **13 effect types**
   - ✅ DAMAGE: Direct damage to opponent
   - ✅ HEAL: Restore life to self
   - ⚠️ BUFF_ATK, BUFF_HP: Planned (returns false)
   - ⚠️ DEBUFF_ATK: Planned (returns false)
   - ⚠️ DOUBLE_ATTACK, DRAW: Planned (returns false)
   - ⚠️ SEARCH, REVIVE, DESTROY: Planned (returns false)
   - Note: Many generic effects are now superseded by effect helpers

**Adding a Card-Specific Effect** (Recommended approach):
```javascript
// Step 1: Choose the appropriate attribute file in src/engine/cardEffects/
// Example: fire.js for 炎属性, water.js for 水属性, etc.

// Step 2: Add card effect to the exports object
export const fireCardEffects = {
  /**
   * C0000XXX: Card Name
   * Effect description
   */
  C0000XXX: (skillText, context) => {
    // 召喚時効果の場合（skillTextで判定）
    if (skillText.includes('【召喚時】')) {
      const { addLog } = context;
      // Example: Revive a dragon from graveyard
      return reviveFromGraveyard(context, (card) => {
        return card.category && card.category.includes('【ドラゴン】');
      }, true); // true = weakened (half attack)
    }

    // 基本技の場合（context.skillTypeで判定）
    if (context.skillType === 'basic') {
      // 基本技の実装
      return true;
    }

    // 上級技の場合（context.skillTypeで判定）
    if (context.skillType === 'advanced') {
      // 上級技の実装
      return true;
    }

    return false;
  },
};
```

**Adding a Generic Effect** (For simple, reusable patterns):
```javascript
// Only add generic effects if the pattern is truly reusable
// Most card-specific behavior should use the card-specific approach above

// Step 1: Add to EFFECT_TYPES in src/engine/effectEngine.js
export const EFFECT_TYPES = {
  // ...existing types
  YOUR_EFFECT: 'your_effect',
};

// Step 2: Add parsing pattern in parseEffect()
const yourEffectMatch = effectText.match(/your_pattern/);
if (yourEffectMatch) {
  effects.push({
    type: EFFECT_TYPES.YOUR_EFFECT,
    value: /* extracted value */,
    target: /* target */,
  });
}

// Step 3: Add execution in executeEffect()
case EFFECT_TYPES.YOUR_EFFECT:
  const { currentPlayer, setP1Life, addLog } = context;
  // Implement effect logic
  addLog(`Effect message`, 'info');
  return true;
```

**Effect Context Object**:
```javascript
const context = {
  // Players
  currentPlayer,      // 1 or 2

  // Life
  setP1Life,          // P1 life setter
  setP2Life,          // P2 life setter
  p1Life,             // P1 current life (for helpers)
  p2Life,             // P2 current life (for helpers)

  // Fields
  setP1Field,         // P1 field setter
  setP2Field,         // P2 field setter
  p1Field,            // P1 current field (for helpers)
  p2Field,            // P2 current field (for helpers)

  // Deck & Hand
  p1Deck, p2Deck,     // Current decks
  setP1Deck, setP2Deck, // Deck setters
  p1Hand, p2Hand,     // Current hands
  setP1Hand, setP2Hand, // Hand setters

  // Graveyard
  p1Graveyard, p2Graveyard,         // Current graveyards
  setP1Graveyard, setP2Graveyard,   // Graveyard setters

  // Context info
  monsterIndex,       // Index of monster using skill (if applicable)
  skillType,          // 'basic' or 'advanced' (for skill type judgment)

  // Logging
  addLog,             // Log function (message, type)
};
```

### Available Effect Helper Functions ⭐

The effect helper library provides reusable functions for common card effect patterns:

**getPlayerContext(context)** ⭐⭐ **Core Helper**
- Returns player-abstracted properties based on `currentPlayer` (1 or 2)
- Eliminates repetitive `currentPlayer === 1 ? p1X : p2X` patterns
- Returns object with: `myField`, `opponentField`, `setMyField`, `setOpponentField`, `myHand`, `opponentHand`, `setMyHand`, `setOpponentHand`, `myDeck`, `opponentDeck`, `setMyDeck`, `setOpponentDeck`, `myGraveyard`, `opponentGraveyard`, `setMyGraveyard`, `setOpponentGraveyard`, `myLife`, `opponentLife`, `setMyLife`, `setOpponentLife`, `myActiveSP`, `myRestedSP`, `setMyActiveSP`, `setMyRestedSP`, `myFieldCard`, `setMyFieldCard`, `currentPlayer`, `isP1`
- Usage: `const { myField, setOpponentField } = getPlayerContext(context);`
- See: `src/ルール/getPlayerContext-refactoring-guide.md` for detailed documentation

**1. millDeck(context, count)**
- Mill cards from current player's deck to graveyard
- Returns: Array of milled cards

**2. millOpponentDeck(context, count)**
- Mill cards from opponent's deck to graveyard
- Returns: Array of milled cards

**3. conditionalDamage(context, damage, target, targetIndex)**
- Apply damage to specific target
- Targets: 'opponent', 'self', 'opponent_monster', 'self_monster'
- Returns: boolean (success)

**4. searchCard(context, condition)**
- Search deck for card matching condition function
- Example: `(card) => card.attribute === '炎'`
- Returns: Found card or null

**5. reviveFromGraveyard(context, condition, options)**
- Revive monster from graveyard matching condition
- Options (boolean for backward compatibility, or object):
  - `true` or `{ attackHalf: true }`: Attack halved only
  - `{ hpHalf: true }`: HP halved only
  - `{ attackHalf: true, hpHalf: true }`: Both halved
  - `{ fixedAttack: 300, fixedHp: 800 }`: Fixed values
- Returns: boolean (success)

**6. destroyMonster(context, targetIndex, isOpponent)**
- Destroy target monster and send to graveyard
- Returns: boolean (success)

**7. drawCards(context, count)**
- Draw cards from deck to hand
- Returns: Array of drawn cards

**8. healLife(context, amount, isSelf)**
- Heal life points for self or opponent
- Returns: boolean (success)

**9. modifyAttack(context, amount, targetIndex, isOpponent, permanent)**
- Modify monster's attack stat
- Positive amount = buff, negative = debuff
- Returns: boolean (success)

**10. modifyHP(context, amount, targetIndex, isOpponent)**
- Modify monster's HP (both max and current)
- Returns: boolean (success)

### Component Structure

**Main Component**:
- **`MagicSpiritGame`** (in `src/magic-spirit.jsx`): Root game component with all game state and logic

**UI Components** (in `src/components/`):
1. **`Card.jsx`** (187 lines): Renders individual cards in hand/deck
   - Props: card, onClick, selected, small, faceDown, inHand, disabled, modifiedCost, costModifierSource
   - Displays cost (with color coding for modifiers), name, stats, skills, forbidden markers

2. **`FieldMonster.jsx`** (166 lines): Renders monsters on field
   - Props: monster, onClick, selected, canAttack, isTarget, isValidTarget
   - Features: HP bar, attack indicators, charge counters, skill icons

3. **`SPTokens.jsx`** (38 lines): SP token visualization
   - Props: active, rested, max
   - Displays ◆ (active), ◇ (rested), ○ (empty) tokens

4. **`GameLog.jsx`** (20 lines): Battle log display
   - Props: logs
   - Color-coded messages (damage: red, heal: green, info: gray)

### Styling Approach

- **All styles centralized** in `src/styles/gameStyles.js` (182 lines)
- **Inline styling** using JavaScript objects
- Uses gradients, animations, and CSS-in-JS patterns
- Responsive design with flexbox/grid
- Dark theme with neon accents

**Style Structure**:
```javascript
// src/styles/gameStyles.js exports default styles object
export default {
  container: { ... },
  titleScreen: { ... },
  playerArea: { ... },
  card: { ... },
  cardSlot: { ... },
  spToken: { ... },
  log: { ... },
  // ... and more
};
```

**Color scheme** (defined in `src/utils/constants.js`):
```javascript
ATTRIBUTE_COLORS = {
  '炎': red/orange gradients with #ff6b6b glow
  '水': blue gradients with #6b9eff glow
  '光': gold/yellow gradients with #ffd700 glow
  '闇': purple/dark gradients with #9d4ce6 glow
  '原始': green/earth tones with #6bff6b glow
  'なし': gray gradients
}
```

### Adding New Features

**To add a new card**:
```javascript
// Option 1: Add to CSV file at public/cardlist/cardlist.csv
// (Recommended for production)

// Option 2: Add to SAMPLE_CARDS array in src/utils/cardManager.js
{
  id: 'C0000XXX',
  name: 'Card Name',
  attribute: '炎', // or '水', '光', '闇', '原始', 'なし'
  cost: 2,
  type: 'monster', // or 'magic', 'field'
  attack: 1000,  // monsters only
  hp: 1000,      // monsters only
  category: '【Category】',
  effect: 'Effect description. 基本技: 100ダメージ. 上級技: 200ダメージ',
  flavor: 'Flavor text',
  keyword: '【Keyword】', // optional
  forbidden: false // optional
}
```

**To add a card-specific effect** (Recommended):
1. Find or create appropriate attribute file in `src/engine/cardEffects/`
2. Import needed helper functions from `effectHelpers.js`
3. Add card ID and effect function to the attribute's export object
4. Use effect helpers for common patterns (damage, heal, draw, etc.)
5. Test with the specific card

**To add a new effect helper**:
1. Add function to `src/engine/effectHelpers.js`
2. Follow existing patterns for context usage
3. Ensure immutable state updates
4. Add comprehensive logging with `addLog()`
5. Export and use in card-specific effects

**To add a generic effect type** (Only for truly reusable patterns):
1. Add to `EFFECT_TYPES` in `src/engine/effectEngine.js`
2. Add parsing logic in `parseEffect()` function
3. Add execution logic in `executeEffect()` switch statement
4. Test with cards that use the new effect

**To add a new game phase**:
1. Add to `PHASES` array in `src/utils/constants.js`
2. Add case in `processPhase()` in `src/magic-spirit.jsx`
3. Update phase transition logic in `nextPhase()`

**To implement card effects**:
- **Card-specific effects** (Recommended): Add to appropriate file in `src/engine/cardEffects/`
- **Reusable helpers**: Add to `src/engine/effectHelpers.js` for common patterns
- **Simple generic effects**: Add pattern matching to `parseEffect()` in `src/engine/effectEngine.js`
- **Complex unique effects**: Implement in card-specific effect file with custom logic
- **Special on-summon effects**: Handled automatically if card effect includes '【召喚時】'

**To implement card triggers** ⭐ **NEW**:
1. Open appropriate attribute file in `src/engine/cardTriggers/`
   - `fireCards.js` (炎属性) - 33 cards implemented
   - `waterCards.js` (水属性) - 37 cards implemented (includes 3 graveyard triggers)
   - `lightCards.js` (光属性) - 47 cards implemented
   - `darkCards.js` (闇属性) - 45 cards implemented
   - `futureCards.js` (未来属性) - 12 cards implemented
   - `primitiveCards.js` (原始属性) - 28 cards implemented
   - `neutralCards.js` (なし属性) - 18 cards implemented (includes field/phase card triggers)
2. Import trigger types and effect helpers
3. Define trigger array for each card ID
4. Specify trigger type, activation type, and effect function
5. Return trigger array from export object

---

### Working with the Trigger System ⭐⭐ **NEW**

The trigger system manages event-based card effects that fire automatically or optionally based on game events.

**System Architecture**:
```
Trigger Lifecycle:
1. Card summoned → registerCardTriggers() registers all triggers
2. Game event occurs (phase change, summon, destroy, etc.)
3. For AUTOMATIC triggers → fireTrigger() executes all matching triggers
4. For OPTIONAL triggers → getCardMainPhaseTriggers() retrieves for UI display
5. Player activates → activateTrigger() executes manually
6. Card destroyed → unregisterCardTriggers() removes all triggers
7. Turn end → resetTurnFlags() clears usage flags
```

**Key Components**:

**1. Trigger Types** (`src/engine/triggerTypes.js` - 26 types):
- **Summon**: ON_SUMMON (self only), ON_OPPONENT_SUMMON, ON_ATTRIBUTE_SUMMON_SELF, etc.
  - **Important**: ON_SUMMON fires only for the summoned card itself, not for other summons
- **Destroy**: ON_DESTROY_SELF, ON_CATEGORY_MONSTER_DESTROYED, etc.
- **Phase**: ON_TURN_START_SELF, ON_MAIN_PHASE_SELF, ON_END_PHASE_SELF, etc.
- **Attack**: ON_ATTACK, ON_ATTACKED, ON_ATTACK_SUCCESS
- **Graveyard**: ON_MAIN_PHASE_FROM_GRAVEYARD, ON_END_PHASE_FROM_GRAVEYARD
- **Conditional**: ON_LIFE_CONDITION, ON_FIELD_CONDITION, etc.

**2. Activation Types**:
- **AUTOMATIC**: Triggers fire automatically when condition met
- **OPTIONAL**: Player chooses when to activate (shown in UI)

**3. Trigger Engine Functions**:
- **`registerCardTriggers(card, owner, slotIndex)`**: Register card's triggers
- **`unregisterCardTriggers(cardId)`**: Remove card's triggers
- **`fireTrigger(triggerType, context)`**: Fire all automatic triggers of a type
- **`getCardMainPhaseTriggers(card, currentPlayer)`**: Get optional triggers for UI
- **`activateTrigger(trigger, context)`**: Manually activate a trigger
- **`resetTurnFlags()`**: Clear usedThisTurn flags at turn end

**Implementing a Card Trigger**:
```javascript
// In appropriate attribute file (e.g., src/engine/cardTriggers/fireCards.js)
import { TRIGGER_TYPES, ACTIVATION_TYPES } from '../triggerTypes';
import { conditionalDamage, drawCards } from '../effectHelpers';

export const fireCardTriggers = {
  C0000XXX: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時に1枚ドロー',
      effect: (context) => {
        drawCards(context, 1);
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時に300ダメージ',
      effect: (context) => {
        conditionalDamage(context, 300, 'opponent');
      },
    },
  ],

  // 条件付きトリガーの例（displayDescriptionを使用）
  C0000YYY: [
    {
      type: TRIGGER_TYPES.ON_ATTRIBUTE_SUMMON_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      displayDescription: '自分光属性モンスター召喚時',  // UI表示用（省略時はtypeのdisplayNameを使用）
      description: 'そのモンスターのHP+200',
      effect: (context) => {
        // 条件チェックは effect 内で実装
        if (context.card?.attribute === '光') {
          // 効果処理
        }
      },
    },
  ],
};

// Available attribute files:
// - fireCards.js (炎属性)
// - waterCards.js (水属性)
// - lightCards.js (光属性)
// - darkCards.js (闇属性)
// - futureCards.js (未来属性)
// - primitiveCards.js (原始属性)
// - neutralCards.js (なし属性)
```

**Trigger Context Object**:
```javascript
const context = {
  currentPlayer,          // 1 or 2
  card,                   // Card that triggered (if applicable)
  slotIndex,              // Field slot index (if applicable)
  monsterIndex,           // Monster index (for compatibility)
  destroyedCard,          // Destroyed card (for destroy triggers)

  // Life
  p1Life, p2Life,
  setP1Life, setP2Life,

  // Fields
  p1Field, p2Field,
  setP1Field, setP2Field,

  // Hands & Decks
  p1Hand, p2Hand,
  setP1Hand, setP2Hand,
  p1Deck, p2Deck,
  setP1Deck, setP2Deck,

  // Graveyards
  p1Graveyard, p2Graveyard,
  setP1Graveyard, setP2Graveyard,

  // SP
  p1ActiveSP, p2ActiveSP,
  setP1ActiveSP, setP2ActiveSP,
  p1RestedSP, p2RestedSP,
  setP1RestedSP, setP2RestedSP,

  // UI Control
  setPendingHandSelection, // For effects requiring player hand selection

  // Logging
  addLog,
};
```

**Integration in magic-spirit.jsx**:
- **initGame()**: `clearAllTriggers()` - Reset system
- **summonCard()**: `registerCardTriggers()` - Register on summon
- **attack()**: `unregisterCardTriggers()` + `fireTrigger(ON_DESTROY_SELF)` - Handle destruction
- **processPhase()**: `fireTrigger(ON_TURN_START_SELF, etc.)` - Fire phase triggers
- **Skill Panel UI**: `getCardMainPhaseTriggers()` - Display optional triggers

---

### Working with the Continuous Effect System ⭐⭐⭐⭐ **NEW**

The continuous effect system manages state-based effects that apply while cards are on the field.

**Key Difference from Trigger System**:
- **Triggers**: Event-driven, fire once when event occurs (summon, destroy, phase change)
- **Continuous Effects**: State-based, continuously apply while card is on field

**System Architecture**:
```
Continuous Effect Lifecycle:
1. Card placed on field → register(card, owner) registers all effects
2. Game state changes (attack, damage, summon)
3. Calculation methods called to get current effect values
4. Card removed → unregister(uniqueId) removes all effects
5. Turn end → resetTurnFlags() clears per-turn usage
```

**Effect Types (12 types)**:
```javascript
CONTINUOUS_EFFECT_TYPES = {
  ATK_MODIFIER,           // 攻撃力修正
  HP_MODIFIER,            // HP修正
  DAMAGE_REDUCTION,       // ダメージ軽減
  DAMAGE_IMMUNITY,        // ダメージ無効
  DAMAGE_DEALT_MODIFIER,  // 与ダメージ修正
  DAMAGE_RECEIVED_MODIFIER, // 被ダメージ修正
  SUMMON_COST_MODIFIER,   // 召喚コスト修正
  MAGIC_COST_MODIFIER,    // 魔法コスト修正
  ATTACK_RESTRICTION,     // 攻撃制限
  SP_RESTRICTION,         // SP制限
  MAGIC_NEGATION,         // 魔法無効化
  SKILL_NEGATION,         // 技無効化
  ON_SUMMON_BUFF,         // 召喚時バフ
};
```

**Implementing a Card's Continuous Effect**:
```javascript
// In appropriate file (e.g., src/engine/continuousEffects/effectDefinitions/fieldCards.js)
import { CONTINUOUS_EFFECT_TYPES } from '../effectTypes';
import { TARGET_TYPES } from '../targetTypes';

export const fieldCardEffects = {
  /**
   * C0000XXX: Card Name
   * 【常時】Light attribute monsters get +500 ATK.
   */
  C0000XXX: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 500,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '光' },
    },
  ],
};
```

**Value Calculation Types**:
```javascript
// Fixed value
{ value: 500 }

// Count-based (e.g., per monster on field)
{
  valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
  baseValue: 1500,
  countCondition: { category: '【粘液獣】', excludeSelf: true },
}

// Conditional (e.g., if specific card is on field)
{
  valueCalculator: VALUE_CALCULATOR_TYPES.CONDITIONAL,
  value: 1000,
  ifCondition: { hasNameOnField: 'ブリザードマスター' },
}
```

**Condition Types**:
```javascript
const condition = {
  // Attribute
  attribute: '光',                    // Single attribute
  attributes: ['光', '闇'],           // Multiple (OR)

  // Category
  category: '【ドラゴン】',            // Contains category

  // Name
  nameIncludes: '粘液獣',             // Name contains
  hasNameOnField: 'ブリザードマスター', // Specific card on field
  hasCategoryOnField: '【ドラゴン】',   // Category on field

  // Numeric conditions
  maxCost: 3,                         // Cost ≤ value
  minCost: 5,                         // Cost ≥ value
  maxLife: 2000,                      // Life ≤ value
  minAttributeOnField: { attribute: '光', count: 2 },

  // Turn condition
  isMyTurn: true,                     // Only during own turn

  // Exclude self
  excludeSelf: true,                  // Don't count self
};
```

**Engine API**:
```javascript
import { continuousEffectEngine } from './engine/continuousEffects';

// Lifecycle
continuousEffectEngine.register(card, owner);     // Register card effects
continuousEffectEngine.unregister(uniqueId);      // Remove card effects
continuousEffectEngine.clear();                   // Reset all (game init)
continuousEffectEngine.resetTurnFlags();          // Reset per-turn usage

// Calculations
const atkMod = continuousEffectEngine.calculateAttackModifier(monster, context);
const hpMod = continuousEffectEngine.calculateHPModifier(monster, context);
const reduction = continuousEffectEngine.calculateDamageReduction(target, 'battle', context);
const costMod = continuousEffectEngine.calculateSummonCostModifier(card, summoner, context);
const { modifier, sources } = continuousEffectEngine.getSummonCostModifierDetails(card, summoner, context);
const magicCostMod = continuousEffectEngine.calculateMagicCostModifier(magicCard, caster, context);

// Restriction checks
const canAtkk = continuousEffectEngine.canAttack(monster, context);
const negated = continuousEffectEngine.tryNegateMagic(magicCard, caster, context);
const skillNegated = continuousEffectEngine.tryNegateSkill(skillType, skillUser, context);

// Summon buffs
const { atkBuff, hpBuff } = continuousEffectEngine.getSummonBuffs(monster, summoner, context);
```

**Integration in magic-spirit.jsx**:
- **initGame()**: `continuousEffectEngine.clear()` - Reset system
- **summonCard()**: `continuousEffectEngine.register()` - Register effects
- **summonCard()**: `getSummonBuffs()` - Apply summon-time buffs
- **attack()**: `calculateAttackModifier()` - Apply ATK modifications
- **attack()**: `calculateDamageReduction()` - Apply damage reduction
- **attack()**: `canAttack()` - Check attack restrictions
- **destroyMonster()**: `unregister()` - Remove effects
- **useMagicCard()**: `calculateMagicCostModifier()` - Apply cost modifications
- **useMagicCard()**: `tryNegateMagic()` - Check for negation
- **executeSkill()**: `tryNegateSkill()` - Check for skill negation
- **processPhase()**: `resetTurnFlags()` - Reset per-turn usage

---

### Working with the Status Effect System ⭐⭐ **NEW**

The status effect system manages temporary status conditions applied to monsters and players.

**Key Difference from Other Systems**:
- **Triggers**: Event-driven, fire once when event occurs
- **Continuous Effects**: State-based, continuously apply while card is on field
- **Status Effects**: Temporary conditions with duration/removal mechanics

**Status Effect Types (14 types)**:
```javascript
STATUS_EFFECT_TYPES = {
  // Debuffs (Monster)
  SLEEP,      // 眠り - 行動不能、効果無効、50%で解除
  FREEZE,     // 凍結 - 攻撃力半減、行動不能、50%で解除
  THUNDER,    // 雷撃 - ATK-500、技不能
  WET,        // 濡れ - 被ダメージ2倍
  STUN,       // 行動不能 - 攻撃・効果不可
  SILENCE,    // 効果無効 - 効果発動不可
  CORRODE,    // 深蝕 - エンド時ATKダウン
  PARASITE,   // 寄生 - ターン開始時ATK減少、効果無効化、寄生カード参照保持

  // Buffs (Monster)
  GUARD,      // 守護 - ダメージ半減（1回）
  INVINCIBLE, // 無敵 - ダメージ無効
  AWAKENED,   // 覚醒 - ATK上昇
  ATK_UP,     // 攻撃力上昇
  HP_UP,      // HP上昇
  ATK_DOWN,   // 攻撃力低下

  // Player
  POISON,     // 毒 - 毎ターン100ダメージ
};
```

**Engine API**:
```javascript
import { statusEffectEngine, STATUS_EFFECT_TYPES } from './engine/statusEffects';

// Apply/remove status
const result = statusEffectEngine.applyStatus(monster, STATUS_EFFECT_TYPES.FREEZE, {
  duration: 1,        // Number of turns (-1 = permanent)
  removeChance: 0.5,  // Chance to remove at turn start
  source: 'C0000144',
  sourceName: 'ブリザードキャット・フロスト',
});
statusEffectEngine.removeStatus(monster, STATUS_EFFECT_TYPES.FREEZE);

// Check status
const canAttack = statusEffectEngine.canAttack(monster);      // boolean
const canUseSkill = statusEffectEngine.canUseSkill(monster);  // boolean
const hasFreeze = statusEffectEngine.hasStatus(monster, STATUS_EFFECT_TYPES.FREEZE);

// Get modifiers
const atkMod = statusEffectEngine.getAttackModifier(monster); // number
const dmgMult = statusEffectEngine.getDamageMultiplier(monster); // number

// Turn processing
const { monster: updated, removedEffects, parasiteAtkReduction } = statusEffectEngine.processTurnStart(monster);
const { monster: updated, removedEffects, atkReduction } = statusEffectEngine.processEndPhase(monster);

// Opponent end phase (parasite effect negation removal)
const { monster: updated, effectNegatedRemoved } = statusEffectEngine.processOpponentEndPhase(monster, currentPlayer);

// Damage reduction (Guard)
const { reduction, usedGuard, updatedMonster } = statusEffectEngine.calculateDamageReduction(monster, damage);

// Parasite helpers
const parasiteInfo = statusEffectEngine.getParasiteInfo(monster); // { parasiteCard, parasiteOwner } | null
const isNegated = statusEffectEngine.isParasiteEffectNegated(monster); // boolean

// Clear all (game init)
statusEffectEngine.clear();
```

**Status Effect Helpers (effectHelpers.js)**:
```javascript
import {
  selectAndApplyStatusToOpponent,    // UI selection + apply
  applyStatusToOpponentMonster,      // Apply to specific slot
  applyStatusToAllOpponentMonsters,  // Apply to all
  applyStatusToOwnMonster,           // Apply to own monster
  processStatusEffectsTurnStart,     // Turn start processing (both fields)
  processStatusEffectsEndPhase,      // End phase processing (both fields)
} from './engine/effectHelpers';

// Example: Apply freeze to selected opponent monster
selectAndApplyStatusToOpponent(context, STATUS_EFFECT_TYPES.FREEZE, {
  duration: -1,       // Until removed
  removeChance: 0.5,  // 50% remove at turn start
}, 'ブリザードキャット・フロスト');

// Example: Apply freeze to all opponent monsters
applyStatusToAllOpponentMonsters(context, STATUS_EFFECT_TYPES.FREEZE, {
  duration: -1,
  removeChance: 0.5,
}, 'ブリザードキャット・エターナル');

// Example: Turn start status processing (replaces inline code in magic-spirit.jsx)
processStatusEffectsTurnStart({ setP1Field, setP2Field, addLog });

// Example: End phase status processing (handles opponent end phase for parasite)
processStatusEffectsEndPhase({ setP1Field, setP2Field, addLog }, currentPlayer);
```

**Integration in magic-spirit.jsx**:
- **initGame()**: `statusEffectEngine.clear()` - Reset system
- **processPhase(0)**: `processStatusEffectsTurnStart()` - Turn start processing (via effectHelpers)
- **processPhase(4)**: `processStatusEffectsEndPhase()` - End phase processing including opponent parasite handling (via effectHelpers)
- **processPhase(4)**: `processPlayerEndPhase()` - Apply player poison damage
- **attack()**: `canAttack()` - Check if attack allowed
- **attack()**: `getAttackModifier()` - Apply ATK modifiers (freeze, etc.)
- **attack()**: `getDamageMultiplier()` - Apply damage multipliers (wet)
- **attack()**: `calculateDamageReduction()` - Apply guard
- **executeSkill()**: `canUseSkill()` - Check if skill allowed
- **handleMonsterDestruction()**: `getParasiteInfo()` - Get parasite card for graveyard transfer

---

## Development Workflow

### Available Scripts

```bash
npm start      # Run dev server (http://localhost:3000)
npm test       # Run test suite in watch mode
npm run build  # Create production build
npm run eject  # Eject from CRA (⚠️ irreversible)
```

### Testing Strategy

**Current state**: Basic tests in `App.test.js`

**To add game tests**:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import MagicSpiritGame from './magic-spirit';

test('game initializes correctly', () => {
  render(<MagicSpiritGame />);
  expect(screen.getByText(/Magic Spirit/i)).toBeInTheDocument();
});
```

**Testing considerations**:
- Test game state transitions
- Test card summoning with SP costs
- Test combat calculations
- Test win conditions
- Mock random deck generation for consistency

### Code Style Conventions

1. **Japanese in UI**: Game text uses Japanese (cards, phases, UI labels)
2. **English in code**: Variables, functions, comments mostly in English
3. **Component organization**: Large components with inline sub-components
4. **State management**: React hooks only, no external state library
5. **Naming**: camelCase for functions, PascalCase for components
6. **Comments**: Section headers with `// ========` separators

### Performance Considerations

1. **`useCallback`** used for functions that trigger re-renders (e.g., `addLog`, `processPhase`)
2. **Card uniqueId**: Each card gets unique ID to prevent React key collisions
3. **Immutable updates**: Always create new arrays/objects for state updates
4. **Memoization opportunity**: Consider React.memo for Card/FieldMonster components if performance issues arise

---

## Git Workflow

### Branch Strategy

⚠️ **IMPORTANT**: Always work on branches starting with `claude/`

Current development branch: `claude/update-claude-md-017tKGZSNY44Cy1KQ1QRaeVe`

### Commit Guidelines

**Commit message style**: Based on repo history, accepts both English and Japanese
- Recent commit: "マジックスピリット適用" (Japanese)
- Original commit: "Initialize project using Create React App" (English)

**Good commit examples**:
```
Add new card attribute system
Fix SP token calculation bug
Implement field card effects
カードバランス調整
新しいモンスター追加
```

### Before Pushing

1. Ensure code runs without errors: `npm start`
2. Run tests: `npm test`
3. Check for console warnings
4. Verify game logic works for both players
5. Test on main game flow: title → playing → game over

### Push Protocol

```bash
# Always use -u flag on first push
git push -u origin claude/[branch-name]

# Retry on network errors with exponential backoff
# (2s, 4s, 8s, 16s delays)
```

---

## Common Tasks & Patterns

### Task: Add a New Monster Card

1. **Define card data** in CSV (`public/cardlist/cardlist.csv`) or `SAMPLE_CARDS` (`src/utils/cardManager.js`)
2. **Add effect pattern** to `parseEffect()` in `src/engine/effectEngine.js` if using new effect type
3. **Implement effect** in `executeEffect()` switch statement
4. **Test summoning** with correct SP cost
5. **Test combat** if monster has special combat rules

### Task: Modify Game Rules

1. **Update constants** in `src/utils/constants.js` (e.g., `INITIAL_LIFE`, `MAX_SP`)
2. **Find relevant function** in `src/magic-spirit.jsx` (phase processing, combat, etc.)
3. **Update logic** with immutable state patterns
4. **Add logging** with `addLog()` for visibility
5. **Test edge cases** (deck empty, max HP, etc.)

### Task: Improve UI/Styling

1. **Update styles** in `src/styles/gameStyles.js`
2. **Modify component** in `src/components/` if changing component structure
3. **Update colors** in `ATTRIBUTE_COLORS` in `src/utils/constants.js` if needed
4. **Consider responsive design** (currently designed for desktop)
5. **Test visual feedback** (hover, click, animations)

### Task: Add Card Effects

**Pattern 1: Card-Specific Effect (RECOMMENDED)**:
```javascript
// In appropriate attribute file (e.g., src/engine/cardEffects/fire.js)
import { conditionalDamage, reviveFromGraveyard } from '../effectHelpers';

export const fireCardEffects = {
  /**
   * C0000XXX: Your Card Name
   * Effect description from card
   */
  C0000XXX: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      // Use helper functions for common patterns
      conditionalDamage(context, 1000, 'opponent');
      return true;
    }
    return false;
  },
};
```

**Pattern 2: Using Effect Helpers**:
```javascript
// Import from effectHelpers.js
import {
  millDeck,           // Mill cards from deck
  conditionalDamage,  // Deal damage to specific target
  searchCard,         // Search deck for card
  reviveFromGraveyard, // Revive monster
  destroyMonster,     // Destroy monster
  drawCards,          // Draw cards
  healLife,           // Heal life points
  modifyAttack,       // Buff/debuff attack
  modifyHP,           // Modify HP
} from '../effectHelpers';

// Use in card effect
C0000XXX: (skillText, context) => {
  if (skillText.includes('基本技')) {
    // Search for a card matching condition
    const found = searchCard(context, (card) => {
      return card.attribute === '炎' && card.cost <= 3;
    });
    return found !== null;
  }
  return false;
};
```

**Pattern 3: Complex Custom Logic**:
```javascript
// For unique effects that don't fit helpers
C0000XXX: (skillText, context) => {
  const {
    currentPlayer, p1Field, p2Field,
    setP1Field, setP2Field, addLog
  } = context;

  if (skillText.includes('上級技')) {
    // Custom complex logic here
    const currentField = currentPlayer === 1 ? p1Field : p2Field;
    const setField = currentPlayer === 1 ? setP1Field : setP2Field;

    // Implement unique effect
    addLog('Custom effect activated!', 'info');
    return true;
  }
  return false;
};
```

**Pattern 4: Generic Effect Parsing** (Legacy/Simple patterns only):
```javascript
// Only for truly generic, reusable patterns
// Add to parseEffect() in src/engine/effectEngine.js
const damageMatch = effectText.match(/(\d+)ダメージ/);
if (damageMatch) {
  effects.push({
    type: EFFECT_TYPES.DAMAGE,
    value: parseInt(damageMatch[1]),
    target: 'opponent',
  });
}
```

### Task: Debug Game State

**Useful debugging locations**:
```javascript
// In src/magic-spirit.jsx

// Log current state in processPhase()
console.log('Player:', currentPlayer, 'Phase:', phase);

// Log combat details in attack()
console.log('Attacker:', attacker, 'Target:', target);

// Check SP before summon in summonCard()
console.log('Active SP:', activeSP, 'Cost:', card.cost);

// In src/engine/effectEngine.js

// Log effect parsing in parseEffect()
console.log('Parsed effects:', effects);

// Log effect execution in executeEffect()
console.log('Executing effect:', type, value, target);
```

**React DevTools**: Use React DevTools to inspect hooks and state

---

## Known Limitations & Future Improvements

### Current Limitations

1. **Card effects**: Many are simplified or not fully implemented
2. ~~**AI opponent**: No computer opponent, requires 2 human players~~ ✅ **RESOLVED** - AI player system implemented (2025-11-27)
3. **Deck building**: Basic deck selection available; full deck customization not yet implemented
4. **Multiplayer**: Local only, no online play
5. **Mobile support**: Designed for desktop, may not work well on mobile
6. **Animations**: Limited visual effects for actions
7. **Sound**: No audio feedback

### Potential Improvements

1. ✅ **~~Component splitting~~**: COMPLETED - Refactored into modular architecture (2025-11-26)
2. ✅ **~~Effect system foundation~~**: COMPLETED - Created effectEngine.js with extensible system (2025-11-26)
3. ✅ **~~Effect expansion~~**: COMPLETED - Implemented card-specific effects system (2025-11-26)
   - 108+ card implementations across all attributes
   - Effect helper library with 9 reusable functions
   - Hybrid approach: generic + card-specific effects
4. ✅ **~~Trigger system~~**: COMPLETED - Comprehensive trigger system implemented (2025-11-26)
   - 221 cards with triggers across 7 attributes (~7600 lines)
   - 27 generic trigger types with automatic/optional distinction
   - Priority-based execution and turn-based lifecycle management
5. ✅ **~~Deck selection~~**: COMPLETED - Basic deck selection feature (2025-11-26)
   - Predefined deck selection UI on title screen
   - 433 cards available in card pool
6. ✅ **~~AI player system~~**: COMPLETED - Comprehensive AI system implemented (2025-11-27)
   - 3 difficulty levels (Easy, Normal, Hard)
   - Per-player AI/human control
   - Strategy pattern for extensible decision-making
   - ~1,246 lines of AI code
7. **Remaining card effects**: Implement effects for remaining cards (433 total - 120+ implemented)
8. **Remaining card triggers**: Implement triggers for remaining cards (433 total - 225+ implemented)
9. **Card data format**: Convert CSV to JSON for better structure and validation
10. **State management**: Consider Context API or Redux for complex state
11. **TypeScript**: Add type safety to entire codebase
12. **Backend**: Add server for online multiplayer
13. **Full deck builder UI**: Allow complete custom deck creation (currently only predefined decks)
14. **Card images**: Replace placeholder emojis with actual artwork
15. **Animations**: Add GSAP or Framer Motion for smooth transitions
16. **Mobile responsive**: Add mobile-friendly layouts
17. **Testing**: Add comprehensive unit and integration tests for card effects and triggers
18. **Effect/Trigger testing framework**: Automated tests for all card effects and triggers

---

## Troubleshooting

### Common Issues

**Issue**: "SP が足りません" (Not enough SP)
- **Solution**: Check `p1ActiveSP`/`p2ActiveSP` state and card cost
- **Location**: `summonCard()` in `src/magic-spirit.jsx`

**Issue**: Monster won't attack
- **Solution**: Ensure `canAttack` flag is true and phase is バトル (3)
- **Location**: `attack()` in `src/magic-spirit.jsx`, `processPhase()` case 0

**Issue**: State not updating
- **Solution**: Ensure immutable updates (spread operator, new arrays)
- **Example**: `setP1Field(prev => [...prev])` not `field[i] = monster`

**Issue**: Card not appearing in hand
- **Solution**: Check deck generation in `createDeck()` in `src/utils/helpers.js` and initial hand size
- **Location**: `initGame()` in `src/magic-spirit.jsx`

**Issue**: Phase not advancing
- **Solution**: Check phase logic in `processPhase()` and auto-advance useEffect
- **Location**: `processPhase()` in `src/magic-spirit.jsx`

**Issue**: Effect not working
- **Solution**: Check if effect pattern is matched in `parseEffect()` and implemented in `executeEffect()`
- **Location**: `src/engine/effectEngine.js`

**Issue**: Card data not loading from CSV
- **Solution**: Check console for errors, verify CSV format, check fallback to SAMPLE_CARDS
- **Location**: `loadCardsFromCSV()` in `src/utils/cardManager.js`

**Issue**: Field/Phase card info showing in both player areas
- **Solution**: Ensure condition checks for specific player number (e.g., `selectedFieldCardInfo.player === 1` or `=== 2`), not `currentPlayer`
- **Location**: Info panel rendering in `src/magic-spirit.jsx` (lines ~1396, ~1861)

**Issue**: Magic card activation unclear
- **Solution**: Use dedicated `useMagicCard()` button instead of combined phase transition button
- **Location**: `useMagicCard()` function and center zone action buttons in `src/magic-spirit.jsx` (lines ~995, ~1560)

### Debug Mode

**Add temporary logging**:
```javascript
// At top of component
useEffect(() => {
  console.log('Game State:', {
    turn, currentPlayer, phase,
    p1Life, p2Life,
    p1ActiveSP, p2ActiveSP
  });
}, [turn, currentPlayer, phase, p1Life, p2Life, p1ActiveSP, p2ActiveSP]);
```

---

## Testing Checklist

Before considering a feature complete:

- [ ] Both players can perform the action
- [ ] SP cost is deducted correctly
- [ ] Game log shows appropriate messages
- [ ] State updates are reflected in UI
- [ ] No console errors or warnings
- [ ] Edge cases handled (empty deck, max SP, etc.)
- [ ] Phase transitions work correctly
- [ ] Win/lose conditions trigger properly
- [ ] Can restart game successfully
- [ ] No memory leaks (check DevTools profiler)

---

## Quick Reference

### Important File Locations

**Game Constants**: `src/utils/constants.js`
- INITIAL_LIFE, INITIAL_SP, MAX_SP, etc.
- PHASES array
- ATTRIBUTE_COLORS
- TYPE_ICONS

**Card Data**: `src/utils/cardManager.js`
- SAMPLE_CARDS (fallback data)
- parseCSV() - CSV parser
- parseSkills() - skill extractor
- loadCardsFromCSV() - async loader

**Helper Functions**: `src/utils/helpers.js`
- shuffle()
- createDeck()
- hasCategory() - カテゴリ判定（【】を自動正規化）
- createMonsterInstance()
- createDeckFromPrebuilt()

**Effect System**: `src/engine/` ⭐⭐
- **effectEngine.js**: Generic effect types and parser
  - EFFECT_TYPES (13 types)
  - parseEffect() - generic effect parser
  - executeEffect() - generic effect executor
  - executeSkillEffects() - skill processor (checks card-specific first)
- **effectHelpers.js**: Reusable effect functions (9 helpers)
  - millDeck, conditionalDamage, searchCard, reviveFromGraveyard
  - destroyMonster, drawCards, healLife, modifyAttack, modifyHP
- **cardEffects/**: Card-specific implementations (108+ cards)
  - index.js - effect registry
  - fire.js, water.js, light.js, dark.js, primitive.js, future.js, neutral.js
  - _template.js - template for new cards

**Styles**: `src/styles/gameStyles.js`
- All style definitions

**Components**: `src/components/`
- Card.jsx - card display
- FieldMonster.jsx - field monster
- SPTokens.jsx - SP visualization
- GameLog.jsx - log display

**Main Game Logic**: `src/magic-spirit.jsx`
- Game state management
- initGame() - initialization
- processPhase() - phase handler
- summonCard() - summoning logic
- attack() - combat logic
- executeSkill() - skill execution

### State Setters Quick Map

```javascript
P1: setP1Life, setP1Deck, setP1Hand, setP1Field, setP1Graveyard
    setP1ActiveSP, setP1RestedSP, setP1FieldCard

P2: setP2Life, setP2Deck, setP2Hand, setP2Field, setP2Graveyard
    setP2ActiveSP, setP2RestedSP, setP2FieldCard

Game: setTurn, setCurrentPlayer, setPhase, setGameState, setWinner
UI: setSelectedHandCard, setSelectedFieldMonster, setAttackingMonster
```

### Key Patterns

**Getting current player data**:
```javascript
const player = getCurrentPlayerData();
player.setLife(...);
```

**Adding game log**:
```javascript
addLog('Message here', 'info'); // 'info', 'damage', 'heal'
```

**Checking phase**:
```javascript
if (phase === 2) // Main phase
if (phase === 3) // Battle phase
```

---

## AI Assistant Best Practices

When working on this codebase:

1. **Always check current player**: Many bugs arise from wrong player state access
2. **Use immutable updates**: Never mutate state directly
3. **Test both players**: Code should work for both P1 and P2
4. **Preserve game flow**: Don't break phase transitions
5. **Japanese UI text**: Keep UI strings in Japanese for consistency
6. **Log changes**: Use `addLog()` for player visibility
7. **Consider balance**: Card changes should maintain game balance
8. **Performance**: Large state objects, be mindful of re-renders
9. **Unique IDs**: Use `uniqueId` not `id` for React keys
10. **Read before edit**: Understand context before modifying logic

### When Suggesting Changes

- Explain impact on game balance
- Consider both players' perspective
- Note any breaking changes
- Suggest testing approach
- Consider mobile compatibility
- Maintain code style consistency

---

## Resources & References

- **React Docs**: https://react.dev
- **Create React App**: https://create-react-app.dev
- **React Testing Library**: https://testing-library.com/react
- **React Hooks**: https://react.dev/reference/react/hooks

---

## Project Vision & Context

This appears to be a prototype/learning project for a digital card game. The game mechanics are inspired by trading card games with SP resource system similar to mana in Magic: The Gathering or energy in other TCGs.

The Japanese text throughout suggests this may be for a Japanese audience or is being developed by Japanese speakers.

**Key design decisions**:
- ~~Single-file component~~ → **Modular architecture** (refactored 2025-11-26)
- **Separated concerns**: utils, components, styles, engine modules
- **Effect engine foundation**: Extensible system for card effects
- Inline styles with centralized style objects
- Local multiplayer simplifies initial implementation
- React hooks provide clean state management without boilerplate

**Recent Evolution**:
- **2025-11-26 (Phase 1-4)**: Refactored to modular architecture
  - Created 9-file modular structure
  - Separated UI components for reusability
  - Centralized constants and styles
  - Note: magic-spirit.jsx has grown to 2482 lines due to trigger system and deck selection integration
- **2025-11-26 (Phase 5 - Card Effects)**: Implemented card-specific effects system
  - Added 108+ card implementations across all attributes
  - Created effect helper library with 9 reusable functions
  - Established hybrid effect system (generic + card-specific)
  - ~2100 lines of new effect implementation code
- **2025-11-26 (Phase 5 - Phase Cards UI)**: Implemented phase card system UI
  - Separated field cards and phase cards into distinct slots
  - Implemented horizontal layout for field/phase card display
  - Added field/phase card information panel
  - Implemented basic placement and activation functionality
  - Phase progression logic (stage advancement) pending
- **2025-11-26 (Bug fixes & UI improvements)**: Fixed display bugs and improved UX
  - Fixed field/phase card info panel displaying in both player areas simultaneously
  - Added dedicated "✨ 魔法カード発動" button for magic card activation
  - Improved guidance text for magic card usage
  - Separated magic card activation logic from phase transition
- **2025-11-26 (Deck Selection)**: Added deck selection feature
  - Predefined deck selection UI on title screen
- **2025-11-26 (Info Panel Fix)**: Fixed skill text duplication in info panel
  - Removed duplicate 基本技/上級技 display
- **2025-11-27 (AI System & Bug Fixes)**: AI enhancements and critical bug fixes
  - AI charge mechanics (monsters can now charge)
  - Fixed log duplication in setState callbacks
  - Fixed monster graveyard handling for magic/skill damage
  - Fixed field card overwrite (existing card → graveyard)
  - Game log history expansion
  - New card effects: 黒呪・カルヴェリオンの灰嵐, エリザヴェット・ヴェイル, ブリザードキャット・スノウ, フレア・ドラゴン
- **2025-11-28 (Card Collection System)**: Collection system architecture designed
  - Independent module from battle system
  - Card value calculation & rarity system (10 rarities)
  - Economy system (Gold, packs, trading)
  - localStorage persistence with migration support
  - Prebuilt deck rarity integration
- **2025-11-28 (Dynamic Market System)**: Full market system implementation
  - 15 weekly trends (attribute, cost, rarity, chaos)
  - 8 news pattern generators (basic, person, location, rumor, comparison, supply/demand, seasonal, story)
  - 64+ data entities (NPCs, locations, reasons, rumors, characters)
  - Market-aware sell pricing in shop
  - ~1,609 lines of market code
- **2025-11-28 (Deck List UI)**: Deck management screen
  - List/create/edit/delete user decks
  - Deck statistics display
  - Preset deck import with rarity application

This is suitable for expansion into a full game or as a learning project for React and game development concepts.

---

**Document Version**: 5.3
**Last Updated**: 2025-11-28 (Dynamic Market System - 動的市場システム, Deck List UI - デッキ管理画面)
**For**: Magic Spirit (magiSp) Repository
