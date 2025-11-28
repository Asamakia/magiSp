# ニュース紐づけテーブル詳細設計

作成日: 2025-11-28

## 概要

ニュースが不自然にならないよう、パターンごとに適切な組み合わせのみを生成するための紐づけテーブル設計。

---

## パターン別紐づけ一覧

| パターン | 実装状況 | 紐づけ内容 |
|----------|----------|-----------|
| 1. 基本型 | ✅ 実装済み | カテゴリ→属性 |
| 2. 人物型 | ✅ 実装済み | 人物→行動（制限） |
| 3. 場所型 | ✅ 実装済み | 場所→出来事、場所→対象 |
| 4. 噂型 | ✅ 実装済み | 噂→対象、噂→方向 |
| 5. 比較型 | ✅ 実装済み | 比較ペア（固定） |
| 6. 需要供給型 | ✅ 実装済み | 自由（対象リストのみ） |
| 7. 時事ネタ型 | ✅ 実装済み | 季節/時間→属性 |
| 8. ストーリー型 | ✅ 実装済み | キャラ→動向、キャラ→対象 |

---

## 1. 基本型（✅ 実装済み）

> 実装ファイル: `src/collection/market/data/categories.js`, `src/collection/market/data/reasons.js`

```javascript
// src/collection/market/data/categories.js
export const CATEGORY_ATTRIBUTES = {
  '岩狸': '炎',
  'ドラゴン': '炎',
  'フェニックス': '炎',
  'ブリザードキャット': '水',
  'ヴェルゼファール': '水',
  'リヴァイアサン': '水',
  '鳥民': '光',
  'フルーツ・マリオネット': '光',
  'リリカ': '光',
  '魔女': '闇',
  'シャドウ': '闇',
  '黒呪': '闇',
  'ゴシック': '原始',
  '粘液獣': '原始',
  '鎖縛': '原始',
  'ゴーレム': '未来',
  '未来鴉': '未来',
  '虹羽密林': null,    // 複数→ランダム選択
  '呪術狩り': null,
  'ヴォランティス': null,
  '鉄槍騎士団': 'なし',
};
```

**組み合わせ数**: 21カテゴリ × 30理由 × 6方向 × 5接続詞 = **18,900通り**

---

## 2. 人物型（✅ 実装済み）

> 実装ファイル: `src/collection/market/data/persons.js`

### 紐づけ: 人物 → 許可される行動

```javascript
// src/collection/market/data/persons.js
export const PERSONS = {
  '有名コレクター': {
    actions: ['買い占め', '売却', '注目', '収集開始', '引退宣言'],
    tendency: 'neutral', // 行動で変わる
  },
  '研究者': {
    actions: ['研究発表', '酷評', '再評価', '新発見', '論文発表'],
    tendency: 'neutral',
  },
  '大会優勝者': {
    actions: ['採用', '推奨', 'デッキ公開', '使用宣言'],
    tendency: 'up',
  },
  '闇商人': {
    actions: ['密輸', '売り抜け', '買い占め', '取引開始'],
    tendency: 'neutral',
  },
  '鑑定士': {
    actions: ['鑑定', '再評価', '真贋判定', '価値発見'],
    tendency: 'up',
  },
  '投資家': {
    actions: ['大量購入', '売却', '注目', '投資開始'],
    tendency: 'neutral',
  },
  '古参トレーダー': {
    actions: ['評価', '警告', '推奨', '思い出話'],
    tendency: 'neutral',
  },
  '新規参入者': {
    actions: ['購入殺到', '人気', '注目'],
    tendency: 'up',
  },
  'ギルドマスター': {
    actions: ['推奨', '規制検討', '認定', '警告'],
    tendency: 'neutral',
  },
  '王宮関係者': {
    actions: ['採用', '御用達指定', '関心', '規制検討'],
    tendency: 'up',
  },
  'カード職人': {
    actions: ['傑作発表', '引退宣言', '技術革新', '復刻決定'],
    tendency: 'neutral',
  },
  '密輸業者': {
    actions: ['摘発', '大量流出', '新ルート発見'],
    tendency: 'down',
  },
  '占い師': {
    actions: ['予言', '警告', '吉兆', '凶兆'],
    tendency: 'neutral',
  },
  '引退した冒険者': {
    actions: ['コレクション放出', '思い出話', '再評価', '伝説公開'],
    tendency: 'neutral',
  },
  '謎の旅人': {
    actions: ['目撃情報', '噂話', '大量購入', '情報提供'],
    tendency: 'neutral',
  },
};

// 行動 → 方向傾向
export const ACTION_TENDENCY = {
  // 上昇傾向
  '買い占め': 'up',
  '注目': 'up',
  '収集開始': 'up',
  '採用': 'up',
  '推奨': 'up',
  '価値発見': 'up',
  '大量購入': 'up',
  '購入殺到': 'up',
  '人気': 'up',
  '御用達指定': 'up',
  '傑作発表': 'up',
  '技術革新': 'up',
  '吉兆': 'up',
  '伝説公開': 'up',
  '新発見': 'up',
  '再評価': 'up',
  '認定': 'up',

  // 下落傾向
  '売却': 'down',
  '引退宣言': 'down',
  '酷評': 'down',
  '売り抜け': 'down',
  '警告': 'down',
  '規制検討': 'down',
  '摘発': 'down',
  '大量流出': 'down',
  '凶兆': 'down',
  'コレクション放出': 'down',

  // 中立
  'デッキ公開': 'neutral',
  '研究発表': 'neutral',
  '論文発表': 'neutral',
  '密輸': 'neutral',
  '取引開始': 'neutral',
  '真贋判定': 'neutral',
  '投資開始': 'neutral',
  '思い出話': 'neutral',
  '復刻決定': 'neutral',
  '予言': 'neutral',
  '使用宣言': 'neutral',
  '関心': 'neutral',
  '目撃情報': 'neutral',
  '噂話': 'neutral',
  '情報提供': 'neutral',
  '新ルート発見': 'neutral',
  '鑑定': 'neutral',
  '評価': 'neutral',
};
```

**テンプレート**:
```javascript
const templates = [
  '${person}が${category}を${action}！${direction}の兆し',
  '${person}、${category}を${action}か',
  '速報：${person}が${category}に${action}',
];
```

**組み合わせ数**: 15人物 × 平均4行動 × 21カテゴリ × 3テンプレート = **3,780通り**

---

## 3. 場所型（✅ 実装済み）

> 実装ファイル: `src/collection/market/data/locations.js`

### 紐づけ: 場所 → 出来事、場所 → 対象

```javascript
// src/collection/market/data/locations.js
export const LOCATIONS = {
  '炎の火山': {
    events: ['噴火', '地震', '発掘', '活動活発化', '沈静化'],
    targets: [
      { attribute: '炎' },
      { category: '岩狸' },
      { category: 'ドラゴン' },
    ],
    eventTendency: {
      '噴火': 'up',
      '地震': 'down',
      '発掘': 'up',
      '活動活発化': 'up',
      '沈静化': 'down',
    },
  },
  '深海': {
    events: ['海流変化', '発見', '沈没', '調査開始', '異変'],
    targets: [
      { attribute: '水' },
      { category: 'ヴェルゼファール' },
      { category: 'リヴァイアサン' },
    ],
    eventTendency: {
      '海流変化': 'neutral',
      '発見': 'up',
      '沈没': 'down',
      '調査開始': 'up',
      '異変': 'neutral',
    },
  },
  '氷結宮殿': {
    events: ['吹雪', '凍結', '解凍', '氷祭り', '崩壊'],
    targets: [
      { attribute: '水' },
      { category: 'ブリザードキャット' },
    ],
    eventTendency: {
      '吹雪': 'up',
      '凍結': 'up',
      '解凍': 'down',
      '氷祭り': 'up',
      '崩壊': 'down',
    },
  },
  '魔女の森': {
    events: ['異変', '呪い', '儀式', '浄化', '封印'],
    targets: [
      { attribute: '闇' },
      { category: '魔女' },
      { category: 'ゴシック' },
    ],
    eventTendency: {
      '異変': 'neutral',
      '呪い': 'up',
      '儀式': 'up',
      '浄化': 'down',
      '封印': 'down',
    },
  },
  '闇市場': {
    events: ['摘発', '取引活発化', '密輸', '規制強化', '解放'],
    targets: [
      { attribute: '闇' },
      { category: 'シャドウ' },
      { category: '黒呪' },
    ],
    eventTendency: {
      '摘発': 'down',
      '取引活発化': 'up',
      '密輸': 'neutral',
      '規制強化': 'down',
      '解放': 'up',
    },
  },
  '時空の狭間': {
    events: ['時空歪み', '出現', '消失', '安定化', '拡大'],
    targets: [
      { attribute: '未来' },
      { category: 'ゴーレム' },
      { category: '未来鴉' },
    ],
    eventTendency: {
      '時空歪み': 'neutral',
      '出現': 'up',
      '消失': 'down',
      '安定化': 'down',
      '拡大': 'up',
    },
  },
  '粘液の沼地': {
    events: ['繁殖', '変異', '発見', '枯渇', '浄化'],
    targets: [
      { attribute: '原始' },
      { category: '粘液獣' },
    ],
    eventTendency: {
      '繁殖': 'up',
      '変異': 'up',
      '発見': 'up',
      '枯渇': 'down',
      '浄化': 'down',
    },
  },
  '鳥民の島': {
    events: ['祭典', '移住', '嵐', '豊作', '飢饉'],
    targets: [
      { attribute: '光' },
      { category: '鳥民' },
    ],
    eventTendency: {
      '祭典': 'up',
      '移住': 'neutral',
      '嵐': 'down',
      '豊作': 'up',
      '飢饉': 'down',
    },
  },
  '古代遺跡': {
    events: ['発掘', '封印', '崩壊', '発見', '調査'],
    targets: [
      { attribute: '原始' },
      { attribute: '闇' },
      { category: 'ゴシック' },
      { keyword: '禁忌' },
    ],
    eventTendency: {
      '発掘': 'up',
      '封印': 'down',
      '崩壊': 'down',
      '発見': 'up',
      '調査': 'up',
    },
  },
  '王都': {
    events: ['布告', '祭典', '事件', '規制', '開放'],
    targets: [
      { all: true },
    ],
    eventTendency: {
      '布告': 'neutral',
      '祭典': 'up',
      '事件': 'down',
      '規制': 'down',
      '開放': 'up',
    },
  },
  '学術都市': {
    events: ['研究発表', '発明', '論争', '新理論', '撤回'],
    targets: [
      { attribute: '未来' },
      { attribute: '光' },
      { category: 'ゴーレム' },
    ],
    eventTendency: {
      '研究発表': 'up',
      '発明': 'up',
      '論争': 'neutral',
      '新理論': 'up',
      '撤回': 'down',
    },
  },
  '辺境の村': {
    events: ['目撃', '被害', '救援', '発見', '襲撃'],
    targets: [
      { attribute: '原始' },
      { category: '粘液獣' },
      { category: '鎖縛' },
    ],
    eventTendency: {
      '目撃': 'up',
      '被害': 'down',
      '救援': 'neutral',
      '発見': 'up',
      '襲撃': 'down',
    },
  },
  '海賊の港': {
    events: ['密輸', '嵐', '沈没', '取引', '摘発'],
    targets: [
      { attribute: '水' },
      { category: 'リヴァイアサン' },
    ],
    eventTendency: {
      '密輸': 'neutral',
      '嵐': 'down',
      '沈没': 'down',
      '取引': 'up',
      '摘発': 'down',
    },
  },
  '商人ギルド': {
    events: ['相場操作', '規制', '開放', '新ルール', '混乱'],
    targets: [
      { all: true },
    ],
    eventTendency: {
      '相場操作': 'neutral',
      '規制': 'down',
      '開放': 'up',
      '新ルール': 'neutral',
      '混乱': 'down',
    },
  },
  '禁忌の塔': {
    events: ['封印解除', '異変', '調査', '崩壊', '発見'],
    targets: [
      { attribute: '闇' },
      { keyword: '禁忌' },
    ],
    eventTendency: {
      '封印解除': 'up',
      '異変': 'up',
      '調査': 'up',
      '崩壊': 'down',
      '発見': 'up',
    },
  },
};
```

**テンプレート**:
```javascript
const templates = [
  '${location}で${event}発生、${target}に影響',
  '速報：${location}にて${event}',
  '${location}の${event}が市場に波紋',
];
```

**組み合わせ数**: 15場所 × 平均5出来事 × 平均3対象 × 3テンプレート = **675通り**

---

## 4. 噂型（✅ 実装済み）

> 実装ファイル: `src/collection/market/data/rumors.js`

### 紐づけ: 噂種類 → 対象、噂種類 → 方向

```javascript
// src/collection/market/data/rumors.js
export const RUMORS = {
  '規制系': {
    templates: [
      '${target}が規制される',
      '${target}の使用が制限される',
      '${target}が禁止リスト入り',
    ],
    targets: [{ keyword: '禁忌' }],
    direction: 'down',
  },
  '強化系': {
    templates: [
      '次の環境は${target}が強い',
      '${target}が大幅強化される',
      '${target}の時代が来る',
    ],
    targets: 'random_attribute', // ランダム属性
    direction: 'up',
  },
  '弱体化系': {
    templates: [
      '${target}が弱体化される',
      '${target}への対策が増える',
      '${target}の全盛期は終わり',
    ],
    targets: 'random_attribute',
    direction: 'down',
  },
  '再録系': {
    templates: [
      '${target}が再録される',
      '${target}の復刻が決定',
      '${target}の新版が出る',
    ],
    targets: 'random_category',
    direction: 'down',
  },
  '絶版系': {
    templates: [
      '${target}が絶版になる',
      '${target}の生産終了',
      '${target}は二度と出ない',
    ],
    targets: 'random_category',
    direction: 'up',
  },
  '新カード系': {
    templates: [
      '${target}の新カードが出る',
      '${target}に強力な新戦力',
      '${target}の新規サポートが来る',
    ],
    targets: 'random_attribute',
    direction: 'up',
  },
  '大会メタ系': {
    templates: [
      '大会で${target}が大活躍',
      '${target}デッキが優勝',
      '${target}が環境トップ',
    ],
    targets: 'random_attribute_or_category',
    direction: 'up',
  },
  '不正系': {
    templates: [
      '${target}に偽物が流通',
      '${target}の不正取引発覚',
      '${target}の鑑定基準に疑問',
    ],
    targets: [{ minRarity: 'SR' }],
    direction: 'down',
  },
  'コンボ系': {
    templates: [
      '${target}の新コンボ発見',
      '${target}の隠れた強さが判明',
      '${target}が実は最強',
    ],
    targets: 'random_category',
    direction: 'up',
  },
};
```

**組み合わせ数**: 9種類 × 3テンプレート × 平均5対象 = **135通り**

---

## 5. 比較型（✅ 実装済み）

> 実装ファイル: `src/collection/market/data/comparisons.js`

### 固定比較ペア

```javascript
// src/collection/market/data/comparisons.js
export const COMPARISONS = [
  // 属性 vs 属性（相克関係）
  { a: { attribute: '炎' }, b: { attribute: '水' } },
  { a: { attribute: '水' }, b: { attribute: '炎' } },
  { a: { attribute: '光' }, b: { attribute: '闇' } },
  { a: { attribute: '闇' }, b: { attribute: '光' } },
  { a: { attribute: '原始' }, b: { attribute: '未来' } },
  { a: { attribute: '未来' }, b: { attribute: '原始' } },

  // コスト比較
  { a: { maxCost: 3, label: '低コスト' }, b: { minCost: 5, label: '高コスト' } },
  { a: { minCost: 5, label: '高コスト' }, b: { maxCost: 3, label: '低コスト' } },

  // レアリティ比較
  { a: { minRarity: 'SR', label: '高レア' }, b: { maxRarity: 'R', label: '低レア' } },
  { a: { maxRarity: 'R', label: '低レア' }, b: { minRarity: 'SR', label: '高レア' } },

  // ティア比較
  { a: { tiers: ['S', 'A'], label: '高ティア' }, b: { tiers: ['C', 'D'], label: '低ティア' } },
  { a: { tiers: ['C', 'D'], label: '低ティア' }, b: { tiers: ['S', 'A'], label: '高ティア' } },

  // モンスター vs 魔法
  { a: { type: 'monster', label: 'モンスター' }, b: { type: 'magic', label: '魔法' } },
  { a: { type: 'magic', label: '魔法' }, b: { type: 'monster', label: 'モンスター' } },
];

// 効果: aは下落、bは上昇
```

**テンプレート**:
```javascript
const templates = [
  '${targetA}より${targetB}が注目され、明暗分かれる',
  '${targetA}から${targetB}への乗り換え進む',
  '今は${targetA}より${targetB}の時代か',
];
```

**組み合わせ数**: 14ペア × 3テンプレート = **42通り**

---

## 6. 需要供給型（✅ 実装済み）

> 実装ファイル: `src/collection/market/data/supplyDemand.js`

### 対象リストのみ

```javascript
// src/collection/market/data/supplyDemand.js
export const SUPPLY_DEMAND_TARGETS = [
  { target: { minRarity: 'UR' }, label: 'URカード' },
  { target: { minRarity: 'SR' }, label: '高レアカード' },
  { target: { tiers: ['S'] }, label: 'Sティア' },
  { target: { tiers: ['D'] }, label: 'Dティア' },
  { target: { attribute: '炎' }, label: '炎属性' },
  { target: { attribute: '水' }, label: '水属性' },
  { target: { attribute: '光' }, label: '光属性' },
  { target: { attribute: '闇' }, label: '闇属性' },
  { target: { attribute: '原始' }, label: '原始属性' },
  { target: { attribute: '未来' }, label: '未来属性' },
  { target: { keyword: '禁忌' }, label: '禁忌カード' },
  { target: { maxCost: 2 }, label: '低コストカード' },
  { target: { minCost: 6 }, label: '高コストカード' },
];

export const SUPPLY_DEMAND_TYPES = [
  { type: '需要', change: '急増', direction: 'up' },
  { type: '需要', change: '減少', direction: 'down' },
  { type: '供給', change: '過多', direction: 'down' },
  { type: '供給', change: '不足', direction: 'up' },
];
```

**テンプレート**:
```javascript
const templates = [
  '${target}の${type}が${change}、価格に影響',
  '${target}、${type}${change}で相場変動',
];
```

**組み合わせ数**: 13対象 × 4種類 × 2テンプレート = **104通り**

---

## 7. 時事ネタ型（✅ 実装済み）

> 実装ファイル: `src/collection/market/data/seasonal.js`

### 紐づけ: 季節/時間 → 属性

```javascript
// src/collection/market/data/seasonal.js
export const SEASONS = {
  '春': {
    attributes: ['光', '原始'],
    reason: '芽吹きと再生の季節',
  },
  '夏': {
    attributes: ['炎', '水'],
    reason: '灼熱と海の季節',
  },
  '秋': {
    attributes: ['闇', '原始'],
    reason: '実りと静寂の季節',
  },
  '冬': {
    attributes: ['水', '闇'],
    reason: '氷と長夜の季節',
  },
  '朝': {
    attributes: ['光'],
    reason: '日の出の時間',
  },
  '昼': {
    attributes: ['炎', '光'],
    reason: '太陽の時間',
  },
  '夕': {
    attributes: ['炎'],
    reason: '夕焼けの時間',
  },
  '夜': {
    attributes: ['闇', '未来'],
    reason: '闇と星の時間',
  },
};
```

**テンプレート**:
```javascript
const templates = [
  '${time}の影響で${attribute}属性に注目集まる',
  '${time}らしく${attribute}属性が話題に',
  '${time}の訪れとともに${attribute}属性人気上昇',
];
```

**組み合わせ数**: 8時期 × 平均2属性 × 3テンプレート = **48通り**

---

## 8. ストーリー型（✅ 実装済み）

> 実装ファイル: `src/collection/market/data/characters.js`

### 紐づけ: キャラ → 動向、キャラ → 対象

```javascript
// src/collection/market/data/characters.js
export const CHARACTERS = {
  'ヴェルゼファール': {
    actions: ['目撃情報', '活動活発化', '沈黙', '領域拡大', '出現'],
    targets: [
      { attribute: '水' },
      { category: 'ヴェルゼファール' },
      { category: 'リヴァイアサン' },
    ],
    actionTendency: {
      '目撃情報': 'up',
      '活動活発化': 'up',
      '沈黙': 'down',
      '領域拡大': 'up',
      '出現': 'up',
    },
  },
  '魔女エリザヴェット': {
    actions: ['封印が緩み', '呪いが広がり', '儀式の噂で', '復活の兆候で', '沈黙'],
    targets: [
      { attribute: '闇' },
      { category: '魔女' },
      { category: '黒呪' },
      { category: 'ゴシック' },
    ],
    actionTendency: {
      '封印が緩み': 'up',
      '呪いが広がり': 'up',
      '儀式の噂で': 'up',
      '復活の兆候で': 'up',
      '沈黙': 'down',
    },
  },
  '岩狸一族': {
    actions: ['祭りで', '活動活発化', '冬眠入り', '縄張り拡大', '大移動'],
    targets: [
      { attribute: '炎' },
      { category: '岩狸' },
    ],
    actionTendency: {
      '祭りで': 'up',
      '活動活発化': 'up',
      '冬眠入り': 'down',
      '縄張り拡大': 'up',
      '大移動': 'neutral',
    },
  },
  'ブリザードマスター': {
    actions: ['降臨', '氷結拡大', '沈黙', '弟子募集', '大技披露'],
    targets: [
      { attribute: '水' },
      { category: 'ブリザードキャット' },
    ],
    actionTendency: {
      '降臨': 'up',
      '氷結拡大': 'up',
      '沈黙': 'down',
      '弟子募集': 'up',
      '大技披露': 'up',
    },
  },
  '鉄槍騎士団': {
    actions: ['出陣', '凱旋', '敗北', '新団員募集', '解散の噂'],
    targets: [
      { attribute: 'なし' },
      { category: '鉄槍騎士団' },
    ],
    actionTendency: {
      '出陣': 'up',
      '凱旋': 'up',
      '敗北': 'down',
      '新団員募集': 'up',
      '解散の噂': 'down',
    },
  },
  '鳥民の長老': {
    actions: ['予言', '祝福', '警告', '隠居', '帰還'],
    targets: [
      { attribute: '光' },
      { category: '鳥民' },
    ],
    actionTendency: {
      '予言': 'neutral',
      '祝福': 'up',
      '警告': 'down',
      '隠居': 'down',
      '帰還': 'up',
    },
  },
  '禁忌の鴉王ミラン': {
    actions: ['覚醒', '暗躍', '封印強化', '予言', '姿を消し'],
    targets: [
      { attribute: '未来' },
      { category: '未来鴉' },
      { keyword: '禁忌' },
    ],
    actionTendency: {
      '覚醒': 'up',
      '暗躍': 'up',
      '封印強化': 'down',
      '予言': 'neutral',
      '姿を消し': 'down',
    },
  },
  '幼魔王女リリカ': {
    actions: ['ご機嫌で', '不機嫌で', '新たな力に目覚め', 'お忍びで', '宣言'],
    targets: [
      { attribute: '光' },
      { attribute: '闇' },
      { category: 'リリカ' },
    ],
    actionTendency: {
      'ご機嫌で': 'up',
      '不機嫌で': 'down',
      '新たな力に目覚め': 'up',
      'お忍びで': 'neutral',
      '宣言': 'up',
    },
  },
  '粘液獣の女王': {
    actions: ['繁殖期で', '大移動', '進化', '沈黙', '新種誕生'],
    targets: [
      { attribute: '原始' },
      { category: '粘液獣' },
    ],
    actionTendency: {
      '繁殖期で': 'up',
      '大移動': 'neutral',
      '進化': 'up',
      '沈黙': 'down',
      '新種誕生': 'up',
    },
  },
  'ゴシック姫': {
    actions: ['目覚め', '支配拡大', '休眠', '祝宴', '怒り'],
    targets: [
      { attribute: '原始' },
      { category: 'ゴシック' },
      { category: '鎖縛' },
    ],
    actionTendency: {
      '目覚め': 'up',
      '支配拡大': 'up',
      '休眠': 'down',
      '祝宴': 'up',
      '怒り': 'up',
    },
  },
  'ヴォランティス': {
    actions: ['飛来', '去り', '巣作り', '狩り', '繁殖'],
    targets: [
      { category: 'ヴォランティス' },
    ],
    actionTendency: {
      '飛来': 'up',
      '去り': 'down',
      '巣作り': 'up',
      '狩り': 'neutral',
      '繁殖': 'up',
    },
  },
  '呪術狩りギルド': {
    actions: ['討伐成功', '新依頼', '壊滅', '再編', '休止'],
    targets: [
      { category: '呪術狩り' },
    ],
    actionTendency: {
      '討伐成功': 'up',
      '新依頼': 'up',
      '壊滅': 'down',
      '再編': 'neutral',
      '休止': 'down',
    },
  },
  '虹羽の守護者': {
    actions: ['姿を現し', '祝福', '警告', '姿を消し', '試練'],
    targets: [
      { category: '虹羽密林' },
    ],
    actionTendency: {
      '姿を現し': 'up',
      '祝福': 'up',
      '警告': 'down',
      '姿を消し': 'down',
      '試練': 'neutral',
    },
  },
  '時の賢者': {
    actions: ['予言', '発明', '隠居', '弟子選び', '時空実験'],
    targets: [
      { attribute: '未来' },
      { category: 'ゴーレム' },
      { category: '未来鴉' },
    ],
    actionTendency: {
      '予言': 'neutral',
      '発明': 'up',
      '隠居': 'down',
      '弟子選び': 'up',
      '時空実験': 'up',
    },
  },
  '炎竜母フレイマ': {
    actions: ['目覚め', '産卵', '怒り', '沈黙', '祝福'],
    targets: [
      { attribute: '炎' },
      { category: 'ドラゴン' },
      { category: 'フェニックス' },
    ],
    actionTendency: {
      '目覚め': 'up',
      '産卵': 'up',
      '怒り': 'up',
      '沈黙': 'down',
      '祝福': 'up',
    },
  },
};
```

**テンプレート**:
```javascript
const templates = [
  '${character}の${action}${target}が${direction}',
  '速報：${character}${action}',
  '${character}の動向により${target}に影響',
];
```

**組み合わせ数**: 15キャラ × 5動向 × 平均2.5対象 × 3テンプレート = **562通り**

---

## 総組み合わせ数

| パターン | 組み合わせ数 |
|----------|-------------|
| 1. 基本型 | 18,900 |
| 2. 人物型 | 3,780 |
| 3. 場所型 | 675 |
| 4. 噂型 | 135 |
| 5. 比較型 | 42 |
| 6. 需要供給型 | 104 |
| 7. 時事ネタ型 | 48 |
| 8. ストーリー型 | 562 |
| **合計** | **約24,246通り** |

さらに方向の強度バリエーション（6種）を加えると:
**約145,000通り以上**

---

## ファイル構成（✅ 全て実装完了）

```
src/collection/market/data/
├── categories.js     # ✅ パターン1: カテゴリ→属性
├── reasons.js        # ✅ 理由と傾向
├── persons.js        # ✅ パターン2: 人物→行動
├── locations.js      # ✅ パターン3: 場所→出来事/対象
├── rumors.js         # ✅ パターン4: 噂→対象/方向
├── comparisons.js    # ✅ パターン5: 比較ペア
├── supplyDemand.js   # ✅ パターン6: 需要供給
├── seasonal.js       # ✅ パターン7: 季節→属性
└── characters.js     # ✅ パターン8: キャラ→動向/対象

src/collection/market/
├── newsGenerator.js  # ✅ 全8パターン対応
└── marketEngine.js   # ✅ 比較型対応（複数ターゲット）
```

---

## 更新履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| v1.0 | 2025-11-28 | 初版作成（設計のみ） |
| v2.0 | 2025-11-28 | 全8パターン実装完了 |
