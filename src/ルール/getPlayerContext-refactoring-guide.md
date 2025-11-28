# getPlayerContext リファクタリングガイド

**作成日**: 2025-11-28
**目的**: cardEffects/ および cardTriggers/ のボイラープレートコード削減

---

## 1. 背景と目的

### 1.1 現状の問題

各カード効果・トリガーで以下のようなボイラープレートが繰り返されている：

```javascript
C0000XXX: (skillText, context) => {
  const {
    addLog,
    currentPlayer,
    p1Field,
    p2Field,
    setP1Field,
    setP2Field,
    p1Graveyard,
    p2Graveyard,
    setP1Graveyard,
    setP2Graveyard,
    monsterIndex,
  } = context;

  const myField = currentPlayer === 1 ? p1Field : p2Field;
  const setMyField = currentPlayer === 1 ? setP1Field : setP2Field;
  const opponentField = currentPlayer === 1 ? p2Field : p1Field;

  // 効果処理（実質5-10行）
};
```

### 1.2 問題点

| 問題 | 説明 |
|------|------|
| 冗長性 | 15-25行のボイラープレート × 数百カード |
| 1/2判定ミスリスク | `currentPlayer === 1` の判定が散在（314箇所） |
| 保守性 | 新プロパティ追加時に全ファイル修正必要 |
| 可読性 | 本質的な効果ロジックがボイラープレートに埋もれる |

### 1.3 影響範囲

| 対象 | ファイル数 | コード量 | 分割代入 | 1/2判定 |
|------|-----------|----------|----------|---------|
| cardEffects/ | 7 | 約2,850行 | 多数 | 多数 |
| cardTriggers/ | 7 | 約8,000行 | 48回 | 314回 |
| **合計** | **14** | **約10,850行** | - | - |

---

## 2. 解決策

### 2.1 getPlayerContext ヘルパー関数

`currentPlayer` の値（1 or 2）に基づいて、「自分/相手」に抽象化したプロパティを返す。

```javascript
export const getPlayerContext = (context) => {
  const { currentPlayer } = context;
  const isP1 = currentPlayer === 1;

  return {
    // フィールド
    myField: isP1 ? context.p1Field : context.p2Field,
    opponentField: isP1 ? context.p2Field : context.p1Field,
    setMyField: isP1 ? context.setP1Field : context.setP2Field,
    setOpponentField: isP1 ? context.setP2Field : context.setP1Field,

    // 手札
    myHand: isP1 ? context.p1Hand : context.p2Hand,
    opponentHand: isP1 ? context.p2Hand : context.p1Hand,
    setMyHand: isP1 ? context.setP1Hand : context.setP2Hand,
    setOpponentHand: isP1 ? context.setP2Hand : context.setP1Hand,

    // ... 以下同様
  };
};
```

### 2.2 使用後のコード（After）

```javascript
C0000XXX: (skillText, context) => {
  const { addLog, monsterIndex } = context;
  const { myField, opponentField, setMyField } = getPlayerContext(context);

  // 効果処理（本質的なロジックのみ）
};
```

---

## 3. getPlayerContext 仕様

### 3.1 返却プロパティ一覧

```javascript
{
  // === フィールド ===
  myField,              // 自分のフィールド（モンスター配列）
  opponentField,        // 相手のフィールド
  setMyField,           // 自分のフィールドsetter
  setOpponentField,     // 相手のフィールドsetter

  // === 手札 ===
  myHand,               // 自分の手札
  opponentHand,         // 相手の手札
  setMyHand,            // 自分の手札setter
  setOpponentHand,      // 相手の手札setter

  // === デッキ ===
  myDeck,               // 自分のデッキ
  opponentDeck,         // 相手のデッキ
  setMyDeck,            // 自分のデッキsetter
  setOpponentDeck,      // 相手のデッキsetter

  // === 墓地 ===
  myGraveyard,          // 自分の墓地
  opponentGraveyard,    // 相手の墓地
  setMyGraveyard,       // 自分の墓地setter
  setOpponentGraveyard, // 相手の墓地setter

  // === ライフ ===
  myLife,               // 自分のライフ
  opponentLife,         // 相手のライフ
  setMyLife,            // 自分のライフsetter
  setOpponentLife,      // 相手のライフsetter

  // === SP（アクティブ） ===
  myActiveSP,           // 自分のアクティブSP
  opponentActiveSP,     // 相手のアクティブSP
  setMyActiveSP,        // 自分のアクティブSPsetter
  setOpponentActiveSP,  // 相手のアクティブSPsetter

  // === SP（レスト） ===
  myRestedSP,           // 自分のレストSP
  opponentRestedSP,     // 相手のレストSP
  setMyRestedSP,        // 自分のレストSPsetter
  setOpponentRestedSP,  // 相手のレストSPsetter

  // === フィールドカード ===
  myFieldCard,          // 自分のフィールドカード
  opponentFieldCard,    // 相手のフィールドカード
  setMyFieldCard,       // 自分のフィールドカードsetter
  setOpponentFieldCard, // 相手のフィールドカードsetter

  // === フェイズカード ===
  myPhaseCard,          // 自分のフェイズカード
  opponentPhaseCard,    // 相手のフェイズカード
  setMyPhaseCard,       // 自分のフェイズカードsetter
  setOpponentPhaseCard, // 相手のフェイズカードsetter

  // === ユーティリティ ===
  isP1,                 // currentPlayer === 1
  currentPlayer,        // 元の値（1 or 2）
}
```

### 3.2 contextから直接取得するプロパティ

以下はgetPlayerContextに含めず、contextから直接取得する：

| カテゴリ | プロパティ | 理由 |
|----------|-----------|------|
| **共通** | addLog | プレイヤー依存なし |
| **共通** | monsterIndex | プレイヤー依存なし |
| **共通** | skillType | プレイヤー依存なし |
| **UI制御** | setPendingHandSelection | プレイヤー依存なし |
| **UI制御** | setPendingTargetSelection | プレイヤー依存なし |
| **UI制御** | setPendingMonsterTarget | プレイヤー依存なし |
| **UI制御** | setPendingGraveyardSelection | プレイヤー依存なし |
| **UI制御** | setPendingDeckReview | プレイヤー依存なし |
| **UI制御** | setShowGraveyardViewer | プレイヤー依存なし |
| **レア** | attacker, attackerIndex | 特殊ケース |
| **レア** | setP1MagicBlocked, setP2MagicBlocked | 特殊ケース |
| **レア** | setP1NextTurnSPBonus, setP2NextTurnSPBonus | 特殊ケース |

---

## 4. 実装フェーズ

### Phase 1: ヘルパー関数実装

**対象ファイル**: `src/engine/effectHelpers.js`

**作業内容**:
1. `getPlayerContext()` 関数を追加
2. export に追加

**完了条件**:
- [x] 関数が正しく実装されている
- [x] 全プロパティが含まれている
- [x] exportされている

**完了日**: 2025-11-28

---

### Phase 2: テンプレート更新

**対象ファイル**: `src/engine/cardEffects/_template.js`

**作業内容**:
1. 新パターンでテンプレートを更新
2. 使用例を追記

**完了条件**:
- [x] 新パターンのテンプレートがある
- [x] 使用例がコメントで記載されている

**完了日**: 2025-11-28

---

### Phase 3: cardEffects/ 移行

**対象ファイル**（順番）:
1. `src/engine/cardEffects/fire.js`
2. `src/engine/cardEffects/water.js`
3. `src/engine/cardEffects/light.js`
4. `src/engine/cardEffects/dark.js`
5. `src/engine/cardEffects/primitive.js`
6. `src/engine/cardEffects/future.js`
7. `src/engine/cardEffects/neutral.js`

**各ファイルの作業手順**:
1. ファイル先頭で `getPlayerContext` をインポート
2. 各カード効果を新パターンに変換
3. 動作確認（ゲーム起動）
4. 問題なければ次のファイルへ

**変換ルール**:

| Before | After |
|--------|-------|
| `const { currentPlayer, p1Field, p2Field, ... } = context;` | `const { addLog, monsterIndex } = context;` |
| `const myField = currentPlayer === 1 ? p1Field : p2Field;` | `const { myField, ... } = getPlayerContext(context);` |
| `const setMyField = currentPlayer === 1 ? setP1Field : setP2Field;` | （上記に含まれる） |

**完了条件（各ファイル）**:
- [x] getPlayerContextをインポートしている
- [x] 全カード効果が新パターンに変換されている
- [x] `currentPlayer === 1 ?` の判定が残っていない（レアケース除く）
- [x] ゲームが正常に起動する

**ステータス**: ✅ 全7ファイル完了
- fire.js: 完了
- water.js: 完了（C0000047のみ特殊state setterのため直接アクセス維持）
- light.js: 完了
- dark.js: 完了
- primitive.js: 完了（C0000002のみ特殊state setterのため直接アクセス維持）
- future.js: 完了
- neutral.js: 完了

**完了日**: 2025-11-28

---

### Phase 4: cardTriggers/ 移行

**対象ファイル**（順番）:
1. `src/engine/cardTriggers/fireCards.js`
2. `src/engine/cardTriggers/waterCards.js`
3. `src/engine/cardTriggers/lightCards.js`
4. `src/engine/cardTriggers/darkCards.js`
5. `src/engine/cardTriggers/primitiveCards.js`
6. `src/engine/cardTriggers/futureCards.js`
7. `src/engine/cardTriggers/neutralCards.js`

**作業手順**: Phase 3 と同様

**完了条件（各ファイル）**:
- [x] getPlayerContextをインポートしている
- [ ] 全トリガーが新パターンに変換されている
- [ ] `currentPlayer === 1 ?` の判定が残っていない（レアケース除く）
- [x] ゲームが正常に起動する

**ステータス**: 🔄 進行中（インポート追加完了、一部カード変換完了）
- fireCards.js: インポート追加済み、12+カード変換完了
- waterCards.js: インポート追加済み、2カード変換完了（C0000041, C0000042）
- lightCards.js: インポート追加済み、変換作業未着手
- darkCards.js: インポート追加済み、変換作業未着手
- primitiveCards.js: インポート追加済み、変換作業未着手
- futureCards.js: インポート追加済み、変換作業未着手
- neutralCards.js: インポート追加済み、変換作業未着手

**最終更新**: 2025-11-28

---

## 5. 変換パターン集

### 5.1 基本パターン

**Before**:
```javascript
C0000XXX: (skillText, context) => {
  const {
    addLog,
    currentPlayer,
    p1Field,
    p2Field,
    setP1Field,
    setP2Field,
  } = context;

  const myField = currentPlayer === 1 ? p1Field : p2Field;
  const opponentField = currentPlayer === 1 ? p2Field : p1Field;
  const setMyField = currentPlayer === 1 ? setP1Field : setP2Field;

  // 効果処理
  addLog('効果発動', 'info');
  // ...
};
```

**After**:
```javascript
C0000XXX: (skillText, context) => {
  const { addLog } = context;
  const { myField, opponentField, setMyField } = getPlayerContext(context);

  // 効果処理
  addLog('効果発動', 'info');
  // ...
};
```

---

### 5.2 monsterIndex を使う場合

**Before**:
```javascript
C0000XXX: (skillText, context) => {
  const {
    addLog,
    currentPlayer,
    p1Field,
    p2Field,
    setP1Field,
    setP2Field,
    monsterIndex,
  } = context;

  const myField = currentPlayer === 1 ? p1Field : p2Field;
  const setMyField = currentPlayer === 1 ? setP1Field : setP2Field;
  const monster = myField[monsterIndex];
  // ...
};
```

**After**:
```javascript
C0000XXX: (skillText, context) => {
  const { addLog, monsterIndex } = context;
  const { myField, setMyField } = getPlayerContext(context);

  const monster = myField[monsterIndex];
  // ...
};
```

---

### 5.3 UI制御を使う場合

**Before**:
```javascript
C0000XXX: (skillText, context) => {
  const {
    addLog,
    currentPlayer,
    p1Field,
    p2Field,
    setPendingHandSelection,
  } = context;

  const opponentField = currentPlayer === 1 ? p2Field : p1Field;

  setPendingHandSelection({
    message: '手札を選択',
    callback: (card) => { /* ... */ },
  });
};
```

**After**:
```javascript
C0000XXX: (skillText, context) => {
  const { addLog, setPendingHandSelection } = context;
  const { opponentField } = getPlayerContext(context);

  setPendingHandSelection({
    message: '手札を選択',
    callback: (card) => { /* ... */ },
  });
};
```

---

### 5.4 レアケース（MagicBlocked等）

**変換しない**（contextから直接取得を維持）:

```javascript
// setP1MagicBlocked/setP2MagicBlocked は getPlayerContext に含めない
// 理由: 使用頻度が低く、抽象化のメリットが小さい
C0000002: (skillText, context) => {
  const { addLog, currentPlayer, setP1MagicBlocked, setP2MagicBlocked } = context;
  const { opponentField } = getPlayerContext(context);

  // 相手の魔法をブロック
  const setOpponentMagicBlocked = currentPlayer === 1 ? setP2MagicBlocked : setP1MagicBlocked;
  setOpponentMagicBlocked(true);
};
```

---

## 6. チェックリスト

### Phase 1 完了チェック
- [x] `getPlayerContext()` が effectHelpers.js に実装されている
- [x] 全プロパティが正しくマッピングされている
- [x] export されている

### Phase 2 完了チェック
- [x] `_template.js` が新パターンに更新されている
- [x] コメントで使用例が記載されている

### Phase 3 完了チェック（cardEffects/）
- [x] fire.js 移行完了・動作確認OK
- [x] water.js 移行完了・動作確認OK
- [x] light.js 移行完了・動作確認OK
- [x] dark.js 移行完了・動作確認OK
- [x] primitive.js 移行完了・動作確認OK
- [x] future.js 移行完了・動作確認OK
- [x] neutral.js 移行完了・動作確認OK

### Phase 4 完了チェック（cardTriggers/）
- [ ] fireCards.js 移行完了・動作確認OK （インポート済み、部分変換済み）
- [ ] waterCards.js 移行完了・動作確認OK （インポート済み、部分変換済み）
- [ ] lightCards.js 移行完了・動作確認OK （インポート済み）
- [ ] darkCards.js 移行完了・動作確認OK （インポート済み）
- [ ] primitiveCards.js 移行完了・動作確認OK （インポート済み）
- [ ] futureCards.js 移行完了・動作確認OK （インポート済み）
- [ ] neutralCards.js 移行完了・動作確認OK （インポート済み）

### 最終確認
- [ ] 全ファイルで `currentPlayer === 1 ?` の不要な判定がない
- [x] ゲームが正常に動作する
- [ ] CLAUDE.md を更新した

---

## 7. ロールバック手順

問題発生時：

1. **単一ファイルの問題**: git checkout でそのファイルのみ戻す
   ```bash
   git checkout HEAD -- src/engine/cardEffects/fire.js
   ```

2. **全体の問題**: コミット前なら全変更を破棄
   ```bash
   git checkout -- .
   ```

3. **コミット後の問題**: revert
   ```bash
   git revert HEAD
   ```

---

## 8. 完了後の作業

1. **CLAUDE.md 更新**
   - effectHelpers.js のセクションに `getPlayerContext()` を追加
   - cardEffects/, cardTriggers/ の使用パターンを更新

2. **不要コードの削除確認**
   - 各ファイルで古いパターンが残っていないか grep で確認
   ```bash
   grep -r "currentPlayer === 1 \?" src/engine/cardEffects/
   grep -r "currentPlayer === 1 \?" src/engine/cardTriggers/
   ```

3. **ドキュメント完了マーク**
   - このファイルのチェックリストを全て完了にする

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2025-11-28 | 初版作成 |
| 2025-11-28 | Phase 1-3 完了、Phase 4 インポート追加・部分変換（fireCards.js, waterCards.js）|

---

## 9. 実装結果サマリー

### コード削減効果

| 対象 | 追加行 | 削除行 | 純削減 |
|------|--------|--------|--------|
| cardEffects/ | ~200 | ~600 | ~400行削減 |
| cardTriggers/ | ~375 | ~384 | ~9行削減（部分変換のみ）|
| **合計** | ~575 | ~984 | **~409行削減** |

### 完了状況

| フェーズ | ステータス | 完了率 |
|----------|-----------|--------|
| Phase 1: ヘルパー関数 | ✅ 完了 | 100% |
| Phase 2: テンプレート | ✅ 完了 | 100% |
| Phase 3: cardEffects/ | ✅ 完了 | 100% |
| Phase 4: cardTriggers/ | 🔄 進行中 | ~20% |

### 特殊ケース（直接アクセス維持）

以下のカードは特殊なstate setterを使用するため、`currentPlayer === 1 ?` の判定を維持：

- **C0000002** (primitive.js): `setP1MagicBlocked` / `setP2MagicBlocked`
- **C0000047** (water.js): `setP1NextTurnSPBonus` / `setP2NextTurnSPBonus`
