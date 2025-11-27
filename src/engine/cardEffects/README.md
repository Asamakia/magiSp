# カード固有処理追加ガイド

このディレクトリには、複雑な効果を持つカードの固有処理を実装します。

## 概要

マジックスピリットのカード効果システムは **ハイブリッドアプローチ** を採用しています：

- **単純な効果**: 汎用パーサー（effectEngine.js）で自動処理
- **複雑な効果**: カード固有処理（このディレクトリ）で個別実装

## ディレクトリ構造

```
cardEffects/
├── index.js                 # レジストリ（自動登録）
├── fire.js                  # 炎属性カード
├── water.js                 # 水属性カード
├── light.js                 # 光属性カード
├── dark.js                  # 闇属性カード
├── primitive.js             # 原始属性カード
├── future.js                # 未来属性カード
├── neutral.js               # なし属性カード
├── _template.js             # 新規カード追加テンプレート
└── README.md                # このファイル
```

## 新規カードの追加手順

### 1. 属性ファイルの選択

カードの属性に応じて、該当するファイルを選択します：

| 属性 | ファイル名 |
|------|-----------|
| 炎 | `fire.js` |
| 水 | `water.js` |
| 光 | `light.js` |
| 闇 | `dark.js` |
| 原始 | `primitive.js` |
| 未来 | `future.js` |
| なし | `neutral.js` |

### 2. 効果関数の追加

選択したファイルに、以下の形式で効果関数を追加します：

```javascript
/**
 * [カードID]: [カード名]
 * [効果の詳細説明]
 */
[カードID]: (skillText, context) => {
  const { addLog } = context;

  // 効果の実装（context.skillType で判定）
  if (context.skillType === 'basic') {
    // 基本技の処理
    addLog('基本技を発動！', 'info');
    // ...
    return true;
  }

  if (context.skillType === 'advanced') {
    // 上級技の処理
    addLog('上級技を発動！', 'info');
    // ...
    return true;
  }

  return false;
},
```

### 3. コンテキストオブジェクト

`context` には以下の情報が含まれます：

```javascript
{
  // プレイヤー情報
  currentPlayer,          // 1 or 2
  monsterIndex,           // 技を発動するモンスターのインデックス
  skillType,              // 'basic' or 'advanced'

  // ゲーム状態
  p1Life, p2Life,
  p1Deck, p2Deck,
  p1Hand, p2Hand,
  p1Field, p2Field,
  p1Graveyard, p2Graveyard,
  p1ActiveSP, p2ActiveSP,
  p1RestedSP, p2RestedSP,

  // 状態更新関数
  setP1Life, setP2Life,
  setP1Deck, setP2Deck,
  setP1Hand, setP2Hand,
  setP1Field, setP2Field,
  setP1Graveyard, setP2Graveyard,
  setP1ActiveSP, setP2ActiveSP,
  setP1RestedSP, setP2RestedSP,

  // ログ関数
  addLog,                 // (message, type) => void
                         // type: 'info', 'damage', 'heal'
}
```

### 4. ヘルパー関数の活用

`effectHelpers.js` にある共通処理を積極的に活用してください：

#### デッキ操作

```javascript
// 自分のデッキから墓地に送る
const milledCards = millDeck(context, 1);

// 相手のデッキから墓地に送る
const milledCards = millOpponentDeck(context, 1);

// デッキからサーチ
const foundCard = searchCard(context, (card) => {
  return card.name.includes('ドラゴン');
});

// カードをドロー
const drawnCards = drawCards(context, 2);
```

#### ダメージと回復

```javascript
// 相手にダメージ
conditionalDamage(context, 300, 'opponent');

// 自分のモンスターにダメージ
conditionalDamage(context, 300, 'self_monster');

// 相手のモンスターにダメージ
conditionalDamage(context, 500, 'opponent_monster', 0);

// ライフ回復
healLife(context, 500, true);
```

#### モンスター操作

```javascript
// 墓地から蘇生（攻撃力半減）
reviveFromGraveyard(context, (card) => {
  return card.category && card.category.includes('【ドラゴン】');
}, true);

// モンスターを破壊
destroyMonster(context, 0, true);

// 攻撃力を変更
modifyAttack(context, 500, 0, false, true);

// HPを変更
modifyHP(context, 300, 0, false);
```

#### 条件チェック

```javascript
// 属性チェック
if (checkAttribute(card, '未来')) {
  // 未来属性だった場合の処理
}
```

### 5. 実装例：虚蝕の残響者

```javascript
/**
 * C0000279: 虚蝕の残響者
 * 基本技: 自分のデッキ上1枚を墓地に送る、
 *         それが「未来属性」カードなら相手プレイヤーに300ダメージ、
 *         違えばこのカードに300ダメージ
 */
C0000279: (skillText, context) => {
  const { addLog } = context;

  // 召喚時効果
  if (skillText.includes('【召喚時】')) {
    millOpponentDeck(context, 1);
    return true;
  }

  // 基本技（context.skillType で判定）
  if (context.skillType === 'basic') {
    const milledCards = millDeck(context, 1);
    if (milledCards.length === 0) {
      return false;
    }

    const milledCard = milledCards[0];
    if (checkAttribute(milledCard, '未来')) {
      conditionalDamage(context, 300, 'opponent');
      addLog('「未来属性」カードだった！', 'info');
    } else {
      conditionalDamage(context, 300, 'self_monster');
      addLog('「未来属性」カードではなかった...', 'info');
    }
    return true;
  }

  return false;
},
```

### 6. レジストリへの登録

新しい属性ファイルを作成した場合は、`index.js` に追加します：

```javascript
// index.js
import { fireCardEffects } from './fire';
import { waterCardEffects } from './water';
// ... 他の属性

export const CARD_SPECIFIC_EFFECTS = {
  ...fireCardEffects,
  ...waterCardEffects,
  // ... 他の属性
};
```

## 効果のパターン

### パターン1: 条件分岐

```javascript
// デッキから墓地に送って、条件によって効果が変わる
const milledCards = millDeck(context, 1);
const card = milledCards[0];

if (checkAttribute(card, '炎')) {
  // 炎属性の場合
  conditionalDamage(context, 500, 'opponent');
} else {
  // それ以外の場合
  conditionalDamage(context, 200, 'self');
}
```

### パターン2: サーチ → 召喚

```javascript
// デッキから特定のカードをサーチして召喚
const foundCard = searchCard(context, (card) => {
  return card.name.includes('エクラシア') && card.type === 'magic';
});
```

### パターン3: 複数ステップの処理

```javascript
// ステップ1: カードをドロー
const drawnCards = drawCards(context, 1);

// ステップ2: 相手にダメージ
conditionalDamage(context, 400, 'opponent');

// ステップ3: 自分を回復
healLife(context, 200, true);
```

### パターン4: フィールドチェック

```javascript
// 自分の場のモンスターをチェック
const { p1Field, p2Field, currentPlayer } = context;
const myField = currentPlayer === 1 ? p1Field : p2Field;
const dragonCount = myField.filter(m =>
  m && m.category && m.category.includes('【ドラゴン】')
).length;

// ドラゴンの数に応じた効果
conditionalDamage(context, dragonCount * 300, 'opponent');
```

## テスト

実装後は、必ずゲーム内でテストしてください：

1. カードを召喚できるか
2. 技を発動できるか
3. 効果が正しく動作するか
4. ログが適切に表示されるか
5. エラーが発生しないか

## 注意事項

### ✅ DO（推奨）

- ヘルパー関数を優先的に使用する
- ログ出力で動作を可視化する
- エラーハンドリングを適切に行う
- カードIDはユニークに保つ
- コメントで効果の詳細を記述する

### ❌ DON'T（非推奨）

- 直接状態を変更しない（必ずsetterを使用）
- 長すぎる処理を1つの関数に詰め込まない
- ヘルパー関数と同じ処理を重複実装しない
- ログ出力を省略しない

## トラブルシューティング

### Q: 効果が発動しない

A: 以下を確認してください：
- `index.js` でインポート・エクスポートされているか
- カードIDが正しいか
- `skillText` のパターンマッチが正しいか

### Q: エラーが発生する

A: 以下を確認してください：
- `context` から必要な値を取得しているか
- `monsterIndex` が undefined でないか
- 配列の範囲外アクセスがないか

### Q: ヘルパー関数の使い方が分からない

A: `effectHelpers.js` のコメントを参照するか、`future.js` の実装例を参考にしてください。

## 更新履歴

- 2025-11-26: 初版作成
  - ハイブリッドアプローチの導入
  - 属性ベース分類の採用
  - ヘルパー関数の整備
