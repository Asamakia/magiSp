# キーワード能力一覧

作成日: 2025-11-27
目的: キーワード能力の実装進捗管理

---

## 概要

キーワード能力とは、カードに付与される特殊な能力で、共通のルールに基づいて動作するものです。
トリガー系（【召喚時】【常時】など）やカテゴリ（【虚蝕】【蛮族】など）は含みません。

---

## キーワード能力一覧

### 1. 【刹那詠唱】
- **対象**: 魔法カード
- **件数**: 44枚
- **効果**: SPトークン1個を追加でレスト状態にすることで、相手ターンでも発動可能
- **ルール参照**: 公式ルール仕様書 ver2.3 - 5.2 魔法カード
- **実装状況**: [x] 実装完了 (2025-11-27)
- **実装優先度**: Phase 1（ルール明記済み）
- **実装ファイル**:
  - `src/engine/keywordAbilities/index.js` - isSetsunaMagic(), getSetsunaCost(), getActivatableSetsunaMagics(), CHAIN_POINTS, createStackItem()
  - `src/magic-spirit.jsx` - チェーン確認システム、刹那詠唱UI
- **詳細設計**: `src/ルール/chain-system-design.md`
- **実装メモ**:
  - チェーンポイントシステムによる発動タイミング制御
    - **バトルフェイズ開始時**: メイン→バトルフェイズ移行時に確認
    - **攻撃宣言時**: モンスター攻撃宣言時に確認
  - 非アクティブプレイヤーに確認ダイアログが表示される
  - コスト計算: 通常コスト + 1 SP
  - Phase A実装: 1チェーン（相互チェーンなし）
  - Phase B（将来）: スタック構造準備済み（LIFO順解決対応）

### 2. 【禁忌カード】
- **対象**: 全カード種類（モンスター、魔法、フィールド）
- **件数**: 16枚
- **効果**: デッキに1枚まで。強力な効果を持つがデメリットも存在
- **ルール参照**: 公式ルール仕様書 ver2.2 - 2. 基本ルール
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 1（ルール明記済み）
- **実装メモ**:
  - デッキ構築時の枚数制限チェック
  - UI上での禁忌カード表示（既に forbidden フラグあり）

### 3. 【変幻身】
- **対象**: モンスターカード
- **件数**: 14枚
- **効果**: メインフェイズにSPコストを2払うことで、場のこのモンスターを別の形態に変化する
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 3（召喚系）
- **対象カード例**:
  - C0000304: 粘液獣・幼体 → 粘液獣の別形態へ
  - C0000305: フレア・リザード → 炎属性ドラゴンへ
  - C0000306: アクア・スネーク → 水属性上位形態へ
  - C0000307: 輝くペガサス → 光属性幻獣へ
  - C0000308: シャドウ・クロウ → 闇属性上位形態へ
  - C0000309: 未来の雛鴉 → 未来属性魔導士へ
  - C0000310: 鉄槍の訓練兵 → 騎士団上位形態へ
- **実装メモ**:
  - 変身先カードのマッピングデータが必要
  - 変身時のステータス引き継ぎルール要確認
  - UI: 変身ボタンの追加

### 4. 【壮麗】
- **対象**: モンスターカード（主に【鳥】【スカイレジェンド】系）
- **件数**: 12枚
- **効果**: 手札から同名カードを1枚捨てて、カード固有の追加効果を発動
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 4（固有効果）
- **対象カード例**:
  - C0000345: ヴォランティス・アルディオン → 相手モンスター効果無効化
  - C0000346: ヴォランティス・セラヴェント → 【残魂】付与
  - C0000348: ヴォランティス・ファルクェス → 2回攻撃可能
  - C0000359: ヴォランティス・インフェルノ → 戦闘ダメージ1.5倍
  - C0000360: ヴォランティス・テンペスト → 相手SP増加-1
  - C0000364: ヴォランティス・エクリプス → 相手モンスター攻撃力半減
- **実装メモ**:
  - 手札から同名カードを捨てる処理
  - 各カード固有の効果はcardEffectsで実装
  - UI: 【壮麗】発動ボタン

### 5. 【魂結】
- **対象**: モンスターカード（主に【ヴェルゼファール】系）
- **件数**: 6枚
- **効果**: 召喚時、場にいる別の指定モンスターとリンクし、双方に効果を付与
- **実装状況**: [x] 実装完了 (2025-11-28)
- **実装優先度**: Phase 3（召喚系）
- **対象カード例**:
  - C0000333: 深みの儀式者 → 双方攻撃力+100
  - C0000334: クラディオム → 双方攻撃力+300
  - C0000335: シスラゴン → 双方にターン終了時300ダメージ付与
  - C0000336: ルミナクール → 双方HP+800
  - C0000337: タラッサロス → 双方攻撃力+1000、ターン終了時800ダメージ付与
  - C0000340: 深海の支配者・ヴェルゼファール → 双方にターン終了時800ダメージ付与
- **実装ファイル**:
  - `src/engine/keywordAbilities/index.js` - KONKETSU_EFFECTS, findLinkableTargets(), executeKonketsuLink(), handleLinkBreak(), processLinkEndPhaseDamage()
  - `src/engine/cardTriggers/waterCards.js` - 6カードのON_SUMMONトリガー
  - `src/magic-spirit.jsx` - エンドフェイズダメージ処理、リンク解除処理
  - `src/components/FieldMonster.jsx` - リンク状態UI表示（🔗アイコン）
  - `src/utils/helpers.js` - createMonsterInstance()にリンクプロパティ追加
- **実装メモ**:
  - リンク状態: モンスターの`linkedTo`プロパティでuniqueIdを管理
  - リンクボーナス: `linkedBonus`オブジェクトでATK/HPボーナスを追跡
  - エンドフェイズダメージ: `linkedEndPhaseDamage`配列で管理
  - リンク解除時: ATK/HPボーナスを減算、エンドフェイズダメージを削除
  - maxHPの減算時、currentHPはmaxHPを超えない限り維持

### 6. 【毒侵】
- **対象**: モンスターカード
- **件数**: 6枚
- **効果**: このカードが相手プレイヤーにダメージを与えた時、相手を「毒」状態（毎ターン終了時100ダメージ）にする
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 1（シンプル）
- **対象カード例**:
  - C0000281: 毒使いカムラ
  - C0000283: 酸毒竜
  - C0000284: 白蛇の牙
- **実装メモ**:
  - プレイヤーの状態異常システムが必要
  - 毒状態: エンドフェイズに100ダメージ
  - 毒の重複・解除ルール要確認

### 7. 【深蝕】
- **対象**: モンスターカード
- **件数**: 5枚
- **効果**: このカードが場にいる間、自分のターン終了時、相手モンスター1体の攻撃力を500下げ、0になると破壊
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 2（戦闘系）
- **対象カード例**:
  - C0000334: クラディオム（【魂結】と併用）
- **実装メモ**:
  - エンドフェイズトリガーとして実装
  - 攻撃力0判定と破壊処理
  - 対象選択UI（任意の相手モンスター1体）

### 8. 【死触】
- **対象**: モンスターカード
- **件数**: 4枚
- **効果**: このモンスターが与えるダメージが1点でもあれば、その相手モンスターを破壊する
- **実装状況**: [x] 実装完了 (2025-11-28)
- **実装優先度**: Phase 1（シンプル）
- **対象カード例**:
  - C0000409: 血涙の叫女バンシーディス
  - C0000426: 灰塵の怨念スペクトラグス
- **実装ファイル**:
  - `src/engine/keywordAbilities/index.js` - hasShishoku(), shouldApplyShishoku()
  - `src/magic-spirit.jsx` - executeAttack() 内で【死触】判定
- **実装メモ**:
  - 戦闘ダメージ処理時に shouldApplyShishoku() でチェック
  - ダメージ1以上で即破壊（HPに関係なく）
  - 破壊耐性（indestructibleUntilEndOfTurn）がある場合はHP1で止まる
  - 反撃ダメージは通常通り受ける
  - 【死触】による破壊は貫通ダメージなし

### 9. 【魔障壁】
- **対象**: モンスターカード
- **件数**: 3枚
- **効果**: 相手の魔法カードの発動をターンに1度無効化
- **実装状況**: [x] 実装完了 (2025-11-28)
- **実装優先度**: Phase 2（戦闘系）
- **対象カード例**:
  - C0000002: 触覚持ち粘液獣
  - C0000234: 撮影会のリリカ
- **実装ファイル**:
  - `src/engine/keywordAbilities/index.js` - hasMashouheki(), MASHOUHEKI_CARD_IDS
  - `src/engine/continuousEffects/effectDefinitions/monsterCards.js` - C0000002, C0000234 の MAGIC_NEGATION
  - `src/engine/continuousEffects/effectEngine.js` - tryNegateMagic()
- **実装メモ**:
  - 既存のMAGIC_NEGATION常時効果タイプを使用
  - ターンごとの使用回数管理（usesPerTurn: 1）
  - 魔法カード発動時に tryNegateMagic() で自動チェック

### 10. 【残魂】
- **対象**: モンスターカード
- **件数**: 3枚
- **効果**: 破壊時に魂が残り、特定の効果を発動（詳細要確認）
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 2（戦闘系）
- **対象カード例**:
  - C0000320: 雷帝ヴォルトロン
  - C0000327: 雷嵐龍サンダーストーム・レックス
- **実装メモ**:
  - 破壊時トリガーとして実装
  - 【壮麗】で付与される場合もある（C0000346）
  - 具体的な効果内容の調査が必要

### 11. 【犠現】
- **対象**: モンスターカード
- **件数**: 2枚
- **効果**: 自分の場からモンスター1体を破壊し、そのコスト分このカードのSPコストを軽減（最大3軽減）
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 3（召喚系）
- **対象カード例**:
  - C0000353: ヴォランティス・エテルノス（コスト10）
- **実装メモ**:
  - 召喚時のコスト軽減処理
  - 生贄モンスターの選択UI
  - 軽減上限（最大3）の管理

### 12. 【覚醒】
- **対象**: モンスターカード
- **件数**: 1枚
- **効果**: 特定条件で覚醒状態になり、効果が強化される
- **実装状況**: [x] 実装完了 (2025-11-28)
- **実装優先度**: Phase 3（召喚系）
- **対象カード例**:
  - C0000023: レッドバーストドラゴン → 覚醒時攻撃力+1000、バトルフェイズダメージ300→500
- **覚醒条件**: カード固有（例: 基本技発動、外部カード付与など）
  - **C0000023 レッドバーストドラゴン**: 基本技発動時に覚醒状態になる（手札を1枚捨てるアクションがトリガー）
  - **紅蓮の覚醒 (C0000033)**: 魔法カードでドラゴンモンスターに覚醒状態を付与
- **実装メモ**:
  - 覚醒状態 = `STATUS_EFFECT_TYPES.AWAKENED` 状態異常
  - `value`: 攻撃力上昇量（カードごとに異なる）
  - `duration: 0`: ターン終了時に解除
  - 覚醒状態の判定で効果が強化される（ダメージ量増加など）
- **実装ファイル**:
  - `src/engine/cardEffects/fire.js` - C0000023基本技、C0000033魔法効果
  - `src/engine/cardTriggers/fireCards.js` - C0000023バトルフェイズ開始時トリガー
  - `src/engine/effectHelpers.js` - applyAwakening() ヘルパー関数

### 13. 【威圧吼】
- **対象**: モンスターカード
- **件数**: 1枚
- **効果**: 攻撃時に追加効果（カード固有）
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 4（固有効果）
- **対象カード例**:
  - C0000319: 嵐光の騎士 → 自分光属性モンスター攻撃時、相手モンスターに300ダメージ
- **実装メモ**:
  - 攻撃時トリガーで実装可能
  - cardTriggersでの個別実装が適切

### 14. 【未来予知】
- **対象**: モンスターカード
- **件数**: 1枚
- **効果**: 自分ターン開始時、相手のデッキの上から1枚を見てデッキの上か下に置く
- **実装状況**: [ ] 未実装
- **実装優先度**: Phase 4（固有効果）
- **対象カード例**:
  - C0000316: 未来鴉の預言者
- **実装メモ**:
  - ターン開始時トリガーで実装
  - デッキトップ確認UI（相手デッキ）
  - 上/下選択UI

---

## 実装優先度まとめ

### Phase 1（基本・シンプル）
- [x] 【刹那詠唱】- 44枚、ルール明記 ✅ 2025-11-27
- [ ] 【禁忌カード】- 16枚、ルール明記
- [x] 【死触】- 4枚、戦闘時即破壊 ✅ 2025-11-28
- [ ] 【毒侵】- 6枚、状態異常付与

### Phase 2（戦闘・ターン終了系）
- [ ] 【深蝕】- 5枚、エンドフェイズ攻撃力減少
- [x] 【魔障壁】- 3枚、魔法無効化 ✅ 2025-11-28
- [ ] 【残魂】- 3枚、破壊時効果

### Phase 3（召喚・コスト系）
- [ ] 【変幻身】- 14枚、形態変化
- [ ] 【犠現】- 2枚、生贄コスト軽減
- [x] 【魂結】- 6枚、リンク効果 ✅ 2025-11-28
- [x] 【覚醒】- 1枚、条件強化 ✅ 2025-11-28

### Phase 4（固有効果）
- [ ] 【壮麗】- 12枚、同名カード捨てて効果
- [ ] 【威圧吼】- 1枚、攻撃時追加効果
- [ ] 【未来予知】- 1枚、デッキ操作

---

## 実装アーキテクチャ

### 設計方針: ハイブリッド方式

既存システム（トリガー、継続効果）を最大限活用し、キーワード能力の定義・判定のみを新規モジュールで管理する。

### ファイル構成

```
src/engine/
├── keywordAbilities/
│   ├── index.js            # キーワード定義・判定関数・ヘルパー
│   └── statusEffects.js    # 状態異常（毒、凍結等）の共通管理
│
├── triggerEngine.js        # 既存（トリガー型キーワード追加）
├── cardTriggers/           # 既存（カード個別トリガー）
├── continuousEffects/      # 既存（継続効果型キーワード追加）
├── effectEngine.js         # 既存
└── effectHelpers.js        # 既存

src/
├── magic-spirit.jsx        # ゲームフロー型キーワード統合
├── utils/helpers.js        # デッキ構築検証（禁忌カード）
└── components/Card.jsx     # キーワードアイコン表示
```

### 実装方式の分類

| キーワード | 実装方式 | 実装先 | 備考 |
|-----------|----------|--------|------|
| 【刹那詠唱】 | game_flow | magic-spirit.jsx | 相手ターン発動UI |
| 【禁忌カード】 | deck_building | helpers.js | デッキ検証 |
| 【死触】 | trigger | triggerEngine + cardTriggers | ON_DEAL_DAMAGE |
| 【毒侵】 | trigger | triggerEngine + statusEffects | ON_DEAL_PLAYER_DAMAGE |
| 【深蝕】 | continuous | continuousEffects | END_PHASE_EFFECT |
| 【魔障壁】 | continuous | continuousEffects | MAGIC_NEGATION 拡張 |
| 【残魂】 | trigger | triggerEngine + cardTriggers | ON_DESTROY_SELF |
| 【変幻身】 | action | magic-spirit.jsx | 変身アクションUI |
| 【犠現】 | summon_cost | magic-spirit.jsx | 召喚コスト計算 |
| 【魂結】 | trigger | cardTriggers + 状態管理 | ON_SUMMON + リンク状態 |
| 【覚醒】 | state | statusEffects | 覚醒フラグ管理 |
| 【壮麗】 | action | magic-spirit.jsx + cardEffects | 手札捨てアクション |
| 【威圧吼】 | trigger | cardTriggers | ON_ATTACK |
| 【未来予知】 | trigger | cardTriggers | ON_TURN_START |

---

## keywordAbilities/index.js 設計

```javascript
// キーワード能力の定義
export const KEYWORD_ABILITIES = {
  SETSUNA_EISHO: '刹那詠唱',
  KINKI_CARD: '禁忌カード',
  HENGENMI: '変幻身',
  SOUREI: '壮麗',
  KONKETSU: '魂結',
  DOKUSHIN: '毒侵',
  SHINSYOKU: '深蝕',
  SHISHOKU: '死触',
  MASHOUHEKI: '魔障壁',
  ZANKON: '残魂',
  GIGEN: '犠現',
  KAKUSEI: '覚醒',
  IATSUKO: '威圧吼',
  MIRAI_YOCHI: '未来予知',
};

// カードがキーワードを持つか判定
export function hasKeyword(card, keyword) {
  if (!card) return false;

  // CSVの「キーワード能力」フィールドをチェック
  const keywordField = card.keyword || '';
  if (keywordField.includes(`【${keyword}】`)) return true;

  // 効果テキスト内のキーワードもチェック
  const effectText = card.effect || '';
  if (effectText.includes(`【${keyword}】`)) return true;

  return false;
}

// キーワード能力一覧を取得
export function getCardKeywords(card) {
  const keywords = [];
  for (const [key, value] of Object.entries(KEYWORD_ABILITIES)) {
    if (hasKeyword(card, value)) {
      keywords.push(value);
    }
  }
  return keywords;
}
```

---

## statusEffects.js 設計

```javascript
// 状態異常タイプ
export const STATUS_EFFECTS = {
  // プレイヤー状態
  POISON: 'poison',           // 毒: 毎ターン終了時100ダメージ

  // モンスター状態
  FROZEN: 'frozen',           // 凍結: 攻撃力半減+行動不能
  PARALYZED: 'paralyzed',     // 行動不能
  THUNDER: 'thunder',         // 雷撃: 攻撃力-500、技不能
  AWAKENED: 'awakened',       // 覚醒状態
};

// 状態異常の効果定義
export const STATUS_EFFECT_DEFINITIONS = {
  [STATUS_EFFECTS.POISON]: {
    type: 'player',
    onEndPhase: (context) => { /* 100ダメージ */ },
    stackable: true,
  },
  [STATUS_EFFECTS.FROZEN]: {
    type: 'monster',
    attackModifier: 0.5,
    canAct: false,
    onTurnStart: { removeChance: 0.5 },
  },
};

// 状態付与・除去・チェック関数
export function applyStatus(target, status, source) { ... }
export function removeStatus(target, status) { ... }
export function hasStatus(target, status) { ... }
export function processEndPhaseStatus(context) { ... }
```

---

## 実装順序

### Step 1: 基盤構築
1. `keywordAbilities/index.js` 作成
   - KEYWORD_ABILITIES 定義
   - hasKeyword() 関数
   - getCardKeywords() 関数

### Step 2: 【刹那詠唱】実装
1. magic-spirit.jsx に相手ターン発動ロジック追加
   - 相手ターン中の刹那詠唱カード検出
   - コスト+1の計算
   - 発動UI（ボタン、カード選択）
   - 発動処理

### Step 3: 状態異常システム構築
1. `keywordAbilities/statusEffects.js` 作成
   - STATUS_EFFECTS 定義
   - 状態管理関数
   - エンドフェイズ処理

### Step 4: 【毒侵】【死触】実装
1. triggerEngine.js に新トリガータイプ追加
   - ON_DEAL_DAMAGE（モンスターへダメージ時）
   - ON_DEAL_PLAYER_DAMAGE（プレイヤーへダメージ時）
2. cardTriggers に個別実装

### Step 5: 以降のキーワード
- Phase 2, 3, 4 のキーワードを順次実装

---

## 実装時の共通事項

### 必要なシステム拡張
1. **状態異常システム**: 毒、凍結、行動不能などの管理
2. **キーワード能力判定**: カードがキーワードを持つかの判定関数
3. **UI拡張**: キーワード能力発動ボタン、状態表示

### 既存システムとの連携ポイント

**triggerEngine.js との連携**:
- 【死触】【毒侵】【残魂】【魂結】【威圧吼】【未来予知】
- 新トリガータイプの追加が必要な場合あり

**continuousEffects との連携**:
- 【深蝕】【魔障壁】
- 既存の MAGIC_NEGATION を拡張

**magic-spirit.jsx との連携**:
- 【刹那詠唱】【変幻身】【犠現】【壮麗】
- ゲームフローやUIの変更が必要

---

## 更新履歴

| 日付 | 更新内容 |
|------|----------|
| 2025-11-27 | 初版作成、14種類のキーワード能力を洗い出し |
| 2025-11-27 | ハイブリッド方式の実装アーキテクチャを追加 |
| 2025-11-27 | 【刹那詠唱】基本実装完了 |
| 2025-11-27 | 【刹那詠唱】チェーンポイントシステム実装（バトル開始・攻撃宣言時確認ダイアログ） |
| 2025-11-27 | チェーンシステム詳細設計書を追加、公式ルール仕様書をver2.3に更新 |
