/**
 * NPC Competitors and Deck Definitions
 * 大会に出場するNPCとデッキデータ
 *
 * Created: 2025-11-29
 */

// ============================================================
// NPC定義
// ============================================================

export const COMPETITORS = {
  // 基本8人（デイリー・ウィークリー用）
  kain: {
    id: 'kain',
    name: '炎帝カイン',
    attribute: '炎',
    portrait: '🔥',
    style: '速攻',
    personality: '熱血、直情的、負けず嫌い',
    appearance: '赤い鎧、炎の紋章、短髪',
    quotes: {
      win: '燃え尽きろ！',
      lose: 'くっ...次は負けねぇ！',
      start: '全力で行くぜ！',
    },
    decks: ['紅蓮の咆哮', '血炎の呪い'],
  },

  seira: {
    id: 'seira',
    name: '氷姫セイラ',
    attribute: '水',
    portrait: '💧',
    style: 'コントロール',
    personality: '冷静、計算高い、少しツンデレ',
    appearance: '青いドレス、氷の髪飾り、長髪',
    quotes: {
      win: '計算通りね',
      lose: '...次は容赦しないわ',
      start: '凍り付きなさい',
    },
    decks: ['深海の支配者', '幼魔王女の支配'],
  },

  rowen: {
    id: 'rowen',
    name: '聖騎士ロウェン',
    attribute: '光',
    portrait: '✨',
    style: 'バランス',
    personality: '真面目、正義感強い、堅実',
    appearance: '白い鎧、聖剣、金髪',
    quotes: {
      win: '正義は勝つ',
      lose: '...まだだ、まだ終わらん',
      start: '正々堂々と勝負だ',
    },
    decks: ['聖域の光', '雷帝の裁き'],
  },

  malik: {
    id: 'malik',
    name: '闘術師マリク',
    attribute: '闇',
    portrait: '🌙',
    style: 'バーン',
    personality: '陰険、策略家、不安定',
    appearance: '黒いローブ、仮面、不気味',
    quotes: {
      win: '闇に飲まれろ',
      lose: '...くくく、面白い',
      start: '闇の力を見せてやる',
    },
    decks: ['呪森の狩人', '死の女神'],
  },

  garon: {
    id: 'garon',
    name: '獣王ガロン',
    attribute: '原始',
    portrait: '🦁',
    style: 'ビート',
    personality: '単純、パワー重視、脳筋',
    appearance: '獣の毛皮、筋肉質、野性的',
    quotes: {
      win: '力こそ全てだ！',
      lose: 'ぐおおっ...！',
      start: '粉砕してやる！',
    },
    decks: ['熔岩の王国', '闇鎖の舞踏'],
  },

  nova: {
    id: 'nova',
    name: '機工士ノヴァ',
    attribute: '未来',
    portrait: '⚙️',
    style: 'コンボ',
    personality: '早口、発明狂、ムラがある',
    appearance: 'ゴーグル、白衣、工具ベルト',
    quotes: {
      win: '計算通りなのだ！',
      lose: '計算が...狂ったのだ...',
      start: '実験開始なのだ！',
    },
    decks: ['紫鴉の預言者', '密林の覚醒'],
  },

  mask: {
    id: 'mask',
    name: '謎の仮面',
    attribute: '混合',
    portrait: '🎭',
    style: '禁忌軸',
    personality: '謎めいてる、読めない',
    appearance: '全身黒、仮面、正体不明',
    quotes: {
      win: '...予定通り',
      lose: '...',
      start: '...始めよう',
    },
    decks: ['闘の預言者', '天翔の覇王'],
  },

  toma: {
    id: 'toma',
    name: '新人トーマ',
    attribute: '混合',
    portrait: '🌱',
    style: '初心者',
    personality: '素直、頑張り屋、運任せ',
    appearance: '普通の青年、緊張した顔',
    quotes: {
      win: 'や、やりました！',
      lose: 'うう...頑張ります...',
      start: '頑張ります！',
    },
    decks: ['プニリーヌの騎士団', '密林の小さな命'],
  },

  // 追加NPC（グランドカップ用）
  elda: {
    id: 'elda',
    name: '森の賢者エルダ',
    attribute: '光',
    portrait: '🌳',
    style: '持久戦',
    personality: '穏やか、知識豊富、自然を愛する',
    appearance: '緑のローブ、木の杖、白髭の老人',
    quotes: {
      win: '自然の摂理じゃよ',
      lose: 'ふむ...良い勉強になったわい',
      start: '若者よ、全力で来るがよい',
    },
    decks: ['聖なる巨鳥', '果実の人形劇'],
  },

  // 追加7人（未定義、グランドカップ用プレースホルダー）
  extra_1: { id: 'extra_1', name: '（未定）', decks: [] },
  extra_2: { id: 'extra_2', name: '（未定）', decks: [] },
  extra_3: { id: 'extra_3', name: '（未定）', decks: [] },
  extra_4: { id: 'extra_4', name: '（未定）', decks: [] },
  extra_5: { id: 'extra_5', name: '（未定）', decks: [] },
  extra_6: { id: 'extra_6', name: '（未定）', decks: [] },
  extra_7: { id: 'extra_7', name: '（未定）', decks: [] },
};

// ============================================================
// デッキ定義
// ============================================================

export const DECKS = {
  // デッキ1: 深海の支配者（氷姫セイラ）
  '深海の支配者': {
    name: '深海の支配者',
    owner: 'seira',
    attribute: '水',
    type: 'コントロール/バーン',
    concept: '漂流民と深海の使者の融合。【魂結】でモンスター強化、フェイズカードでバフとバーン。',
    cards: [
      // モンスター（22枚）
      { id: 'C0000331', count: 3 },  // アクアレギナの漂流船乗り
      { id: 'C0000330', count: 3 },  // アクアレギナの漂流漁師
      { id: 'C0000334', count: 3 },  // ヴェルゼファールの眷属・クラディオム
      { id: 'C0000332', count: 2 },  // アクアレギナの守護者
      { id: 'C0000333', count: 3 },  // ヴェルゼファールの信徒・深みの儀式者
      { id: 'C0000335', count: 3 },  // ヴェルゼファールの眷属・シスラゴン
      { id: 'C0000336', count: 2 },  // ヴェルゼファールの眷属・ルミナクール
      { id: 'C0000337', count: 2 },  // ヴェルゼファールの眷属・タラッサロス
      { id: 'C0000340', count: 1 },  // 深海の支配者・ヴェルゼファール
      // 魔法（12枚）
      { id: 'C0000341', count: 3 },  // ヴェルゼファール降臨の儀式
      { id: 'C0000342', count: 2 },  // 漂流民の抵抗
      { id: 'C0000343', count: 2 },  // アクアレギナの水晶術師の防壁
      { id: 'C0000344', count: 3 },  // シスラゴンの汚染
      { id: 'C0000159', count: 2 },  // 潮の還流
      // フィールド（3枚）
      { id: 'C0000338', count: 3 },  // アクアレギアの廃墟
      // フェイズカード（3枚）
      { id: 'C0000339', count: 3 },  // アクアレギナの動力-エテルノス・コア
    ],
  },

  // デッキ2: 熔岩の王国（獣王ガロン）
  '熔岩の王国': {
    name: '熔岩の王国',
    owner: 'garon',
    attribute: '炎',
    type: 'ビート/バーン',
    concept: '岩狸モンスターの【マグマフォージ】シナジー。大岩王の超火力とバーン。',
    cards: [
      // モンスター（24枚）
      { id: 'C0000163', count: 3 },  // 岩狸・石ころ丸
      { id: 'C0000164', count: 3 },  // 岩狸・岩太
      { id: 'C0000165', count: 3 },  // 岩狸・熔岩守
      { id: 'C0000166', count: 3 },  // 岩狸・地割れ狸
      { id: 'C0000167', count: 3 },  // 岩狸・剛石権蔵
      { id: 'C0000169', count: 3 },  // 岩狸・火山頭
      { id: 'C0000170', count: 3 },  // 岩狸・大岩王
      { id: 'C0000171', count: 2 },  // 岩狸・熔岩権蔵・極
      { id: 'C0000172', count: 1 },  // 岩狸・禁忌の熔岩帝
      // 魔法（10枚）
      { id: 'C0000173', count: 3 },  // 熔岩の呼び声
      { id: 'C0000174', count: 3 },  // 岩狸の咆哮
      { id: 'C0000179', count: 2 },  // 熔岩再生
      { id: 'C0000184', count: 2 },  // 狸の業火
      // フィールド（3枚）
      { id: 'C0000187', count: 3 },  // 狸の熔岩郷
      // フェイズカード（3枚）
      { id: 'C0000185', count: 3 },  // 岩狸の山里
    ],
  },

  // デッキ3: 紫鴉の預言者（機工士ノヴァ）
  '紫鴉の預言者': {
    name: '紫鴉の預言者',
    owner: 'nova',
    attribute: '未来',
    type: 'コントロール',
    concept: 'ミランと未来鴉でデッキトップ操作と手札破壊。禁忌の鴉王ミランで制圧。',
    cards: [
      // モンスター（22枚）
      { id: 'C0000249', count: 3 },  // ミランの使い魔未来鴉
      { id: 'C0000250', count: 3 },  // 時空渡りのカモメ
      { id: 'C0000256', count: 3 },  // 紫時空の幻鴉
      { id: 'C0000265', count: 2 },  // 鴉の幻影
      { id: 'C0000252', count: 3 },  // 未来鴉の群れ
      { id: 'C0000251', count: 3 },  // 紫鴉の魔導士ミラン
      { id: 'C0000267', count: 2 },  // 星翼の飛舟エクラオン
      { id: 'C0000260', count: 2 },  // 預言者モナビン
      { id: 'C0000258', count: 1 },  // 禁忌の鴉王ミラン
      // 魔法（12枚）
      { id: 'C0000255', count: 3 },  // 未来の鴉予言
      { id: 'C0000253', count: 3 },  // 未来の紫翼
      { id: 'C0000254', count: 2 },  // 時の歪曲
      { id: 'C0000262', count: 2 },  // 時の遅延
      { id: 'C0000269', count: 2 },  // 永遠の灯の残響
      // フィールド（3枚）
      { id: 'C0000257', count: 3 },  // 時読みの塔
      // フェイズカード（3枚）
      { id: 'C0000266', count: 3 },  // エクラシアの時空炉
    ],
  },

  // デッキ4: 呪森の狩人（闘術師マリク）
  '呪森の狩人': {
    name: '呪森の狩人',
    owner: 'malik',
    attribute: '原始/水',
    type: 'ビート/バーン',
    concept: '狼・鹿・イノシシと黒涙の沼の怪物の融合。バーンで削りながらビート。',
    cards: [
      // モンスター（23枚）
      { id: 'C0000414', count: 3 },  // 呪縛の群狼
      { id: 'C0000416', count: 3 },  // 霧角の鹿ケルニグリス
      { id: 'C0000413', count: 3 },  // 群狼長ヴァルグレイス
      { id: 'C0000421', count: 3 },  // 沼の狩人クルーロプス
      { id: 'C0000404', count: 3 },  // 呪森の狼王グリムヴァルド
      { id: 'C0000415', count: 2 },  // 呪影の牙狼ウルフェイン
      { id: 'C0000423', count: 2 },  // 黒涙の毒樹フロラクルス
      { id: 'C0000417', count: 2 },  // 棘の剛毛猪イノブリスト
      { id: 'C0000403', count: 2 },  // 沼の血叫びヴォルガノス
      // 魔法（14枚）
      { id: 'C0000430', count: 3 },  // 狼王の咆哮
      { id: 'C0000432', count: 3 },  // 棘根の罠
      { id: 'C0000207', count: 2 },  // 知恵の代償
      { id: 'C0000195', count: 2 },  // 交換の手札
      { id: 'C0000194', count: 2 },  // 急ごしらえの罠
      { id: 'C0000198', count: 2 },  // 逆転の足音
      // フィールド（3枚）
      { id: 'C0000140', count: 3 },  // 鎖の迷宮
    ],
  },

  // デッキ5: 闘の預言者（謎の仮面）
  '闘の預言者': {
    name: '闘の預言者',
    owner: 'mask',
    attribute: '闇',
    type: 'コントロール/コンボ',
    concept: '禁忌の儀式でブラック・オラクル召喚、召喚時3000全体ダメージ。',
    cards: [
      // モンスター（22枚）
      { id: 'C0000115', count: 3 },  // 禁断の使徒
      { id: 'C0000082', count: 2 },  // 怨霊の使者
      { id: 'C0000076', count: 3 },  // シャドウ・サーバント
      { id: 'C0000079', count: 3 },  // 深淵の騎士ガルム
      { id: 'C0000111', count: 3 },  // 禁忌の守護者
      { id: 'C0000078', count: 2 },  // 禁忌の傀儡師マレウス
      { id: 'C0000080', count: 2 },  // 闇魔界の貴婦人
      { id: 'C0000110', count: 2 },  // 闇の支配者
      { id: 'C0000074', count: 1 },  // ダーク・ネクロフィア
      { id: 'C0000109', count: 1 },  // ブラック・オラクル
      // 魔法（12枚）
      { id: 'C0000083', count: 3 },  // 闇の契約
      { id: 'C0000103', count: 3 },  // 奈落の呼び声
      { id: 'C0000120', count: 2 },  // 禁忌の儀式
      { id: 'C0000117', count: 2 },  // 禁忌の波動
      { id: 'C0000086', count: 2 },  // 闇の波動
      // フィールド（4枚）
      { id: 'C0000089', count: 2 },  // 闇の宮殿
      { id: 'C0000123', count: 2 },  // 禁忌の王座
      // フェイズカード（2枚）
      { id: 'C0000108', count: 2 },  // 虚蝕の呪詛
    ],
  },

  // デッキ6: 死の女神（闘術師マリク）
  '死の女神': {
    name: '死の女神',
    owner: 'malik',
    attribute: '闇',
    type: 'バーン/ビート',
    concept: 'ネクロフィアの毎ターン全体500バーン。低コスト闇属性を並べてバーンとビート。',
    cards: [
      // モンスター（24枚）
      { id: 'C0000115', count: 3 },  // 禁断の使徒
      { id: 'C0000082', count: 3 },  // 怨霊の使者
      { id: 'C0000282', count: 3 },  // 暗殺者の亡魂
      { id: 'C0000076', count: 3 },  // シャドウ・サーバント
      { id: 'C0000079', count: 3 },  // 深淵の騎士ガルム
      { id: 'C0000077', count: 2 },  // 彷徨える死者
      { id: 'C0000078', count: 3 },  // 禁忌の傀儡師マレウス
      { id: 'C0000080', count: 2 },  // 闇魔界の貴婦人
      { id: 'C0000074', count: 2 },  // ダーク・ネクロフィア
      // 魔法（12枚）
      { id: 'C0000083', count: 3 },  // 闇の契約
      { id: 'C0000088', count: 3 },  // ネクロフィアの儀式
      { id: 'C0000103', count: 3 },  // 奈落の呼び声
      { id: 'C0000086', count: 3 },  // 闇の波動
      // フィールド（2枚）
      { id: 'C0000089', count: 2 },  // 闇の宮殿
      // フェイズカード（2枚）
      { id: 'C0000108', count: 2 },  // 虚蝕の呪詛
    ],
  },

  // デッキ7: 雷帝の裁き（聖騎士ロウェン）
  '雷帝の裁き': {
    name: '雷帝の裁き',
    owner: 'rowen',
    attribute: '光',
    type: 'ビート/コントロール',
    concept: '雷撃状態でコントロールしながら、雷帝と雷嵐龍でフィニッシュ。',
    cards: [
      // モンスター（23枚）
      { id: 'C0000328', count: 3 },  // 雷鳴の斥候
      { id: 'C0000322', count: 3 },  // 嵐の雛雷鳥
      { id: 'C0000318', count: 3 },  // 雷鳴の使者
      { id: 'C0000329', count: 3 },  // 嵐の雷撃獣
      { id: 'C0000321', count: 3 },  // 電刃の執行者
      { id: 'C0000319', count: 3 },  // 嵐光の騎士
      { id: 'C0000320', count: 3 },  // 雷帝ヴォルトロン
      { id: 'C0000327', count: 2 },  // 雷嵐龍サンダーストーム・レックス
      // 魔法（11枚）
      { id: 'C0000323', count: 3 },  // 雷鳴の裁き
      { id: 'C0000324', count: 3 },  // 嵐の咆哮
      { id: 'C0000065', count: 3 },  // 天使の波動
      { id: 'C0000068', count: 2 },  // クリスタルブレス
      // フィールド（6枚）
      { id: 'C0000326', count: 3 },  // 雷嵐の聖域
      { id: 'C0000073', count: 3 },  // 輝く天蓋
    ],
  },

  // デッキ8: プニリーヌの騎士団（新人トーマ）
  'プニリーヌの騎士団': {
    name: 'プニリーヌの騎士団',
    owner: 'toma',
    attribute: 'なし',
    type: 'スワーム/ビート',
    concept: '蛮族を大量展開し、禁忌の奴隷プニリーヌで蛮族数×600の大ダメージ。',
    cards: [
      // モンスター（24枚）
      { id: 'C0000223', count: 3 },  // 鉄槍騎士団のゴロツキ
      { id: 'C0000302', count: 3 },  // 鉄槍のソルジャー
      { id: 'C0000303', count: 3 },  // 鉄槍のソルジャーII
      { id: 'C0000222', count: 3 },  // 鉄槍騎士団のウィア
      { id: 'C0000221', count: 3 },  // 鉄槍騎士団のマグラ
      { id: 'C0000219', count: 3 },  // 団長プニリーヌ・ソフティア
      { id: 'C0000317', count: 2 },  // 鉄槍の騎士長
      { id: 'C0000220', count: 3 },  // 鉄槍騎士団のゲスール
      { id: 'C0000224', count: 1 },  // 鉄槍騎士団の奴隷プニリーヌ
      // 魔法（13枚）
      { id: 'C0000225', count: 3 },  // 鉄槍の奉仕
      { id: 'C0000226', count: 3 },  // 順番待ちの苛立ち
      { id: 'C0000227', count: 2 },  // 鉄槍の昼餐
      { id: 'C0000228', count: 2 },  // 鉄槍の睡眠罠
      { id: 'C0000196', count: 3 },  // 援軍の呼び声
      // フィールド（3枚）
      { id: 'C0000229', count: 3 },  // 鉄槍騎士団の宿舎
    ],
  },

  // デッキ9: 幼魔王女の支配（氷姫セイラ）
  '幼魔王女の支配': {
    name: '幼魔王女の支配',
    owner: 'seira',
    attribute: '混合',
    type: 'コントロール',
    concept: 'ゴシック・リリカ軸。幼魔王女でサーチ、ご主人様でリリカ展開＆強化。',
    cards: [
      // モンスター（25枚）
      { id: 'C0000132', count: 3 },  // ゴシック・パペット
      { id: 'C0000127', count: 3 },  // ゴシック・ローズ
      { id: 'C0000233', count: 3 },  // 水漏れのリリカ
      { id: 'C0000232', count: 3 },  // 奉仕のリリカ
      { id: 'C0000128', count: 3 },  // 鎖縛のメイド
      { id: 'C0000235', count: 2 },  // プリンセス狂いのリリカ
      { id: 'C0000125', count: 2 },  // ゴシック・ドール
      { id: 'C0000129', count: 2 },  // ゴシック・プリンセス
      { id: 'C0000234', count: 2 },  // 撮影会のリリカ
      { id: 'C0000231', count: 2 },  // 幼魔王女リリカ
      { id: 'C0000241', count: 2 },  // ご主人様
      { id: 'C0000138', count: 1 },  // 禁忌のゴシッククラウン
      // 魔法（12枚）
      { id: 'C0000238', count: 3 },  // おしおきの鎖
      { id: 'C0000236', count: 3 },  // プリティ☆プリンセス
      { id: 'C0000237', count: 2 },  // 幼魔王女の誘惑
      { id: 'C0000243', count: 2 },  // ご主人様のおしおき
      { id: 'C0000133', count: 2 },  // 鎖の舞踏
      // フィールド（3枚）
      { id: 'C0000240', count: 3 },  // 魔界の幼魔王城
    ],
  },

  // デッキ10: 紅蓮の咆哮（炎帝カイン）
  '紅蓮の咆哮': {
    name: '紅蓮の咆哮',
    owner: 'kain',
    attribute: '炎',
    type: 'アグロ/バーン',
    concept: 'ブレイズ・ドラゴンでサーチ、ドラゴンの火山でバフとバーン。炎ドラゴンアグロ。',
    cards: [
      // モンスター（22枚）
      { id: 'C0000025', count: 3 },  // ブレイズ・ドラゴン
      { id: 'C0000029', count: 3 },  // クリムゾン・ワイバーン
      { id: 'C0000021', count: 3 },  // フレア・ドラゴン
      { id: 'C0000026', count: 3 },  // インフェルノ・ドラゴン
      { id: 'C0000027', count: 3 },  // マグマ・ドラゴン
      { id: 'C0000030', count: 3 },  // バースト・ドラゴン・ナイト
      { id: 'C0000023', count: 3 },  // レッドバーストドラゴン
      { id: 'C0000028', count: 1 },  // 炎竜母フレイマ
      // 魔法（12枚）
      { id: 'C0000022', count: 3 },  // 火竜の吐息
      { id: 'C0000031', count: 3 },  // 炎の咆哮
      { id: 'C0000033', count: 3 },  // 紅蓮の覚醒
      { id: 'C0000034', count: 3 },  // 炎の嵐
      // フィールド（6枚）
      { id: 'C0000037', count: 3 },  // ドラゴンの火山
      { id: 'C0000038', count: 3 },  // 紅の竜宮
    ],
  },

  // デッキ11: 血炎の呪い（炎帝カイン）
  '血炎の呪い': {
    name: '血炎の呪い',
    owner: 'kain',
    attribute: '炎',
    type: 'ビート/バーン',
    concept: '血炎系モンスターで墓地肥やしと攻撃時バフ。炎の岩峰でバーン。',
    cards: [
      // モンスター（23枚）
      { id: 'C0000292', count: 3 },  // 炎のソルジャー
      { id: 'C0000293', count: 3 },  // 炎のソルジャーII
      { id: 'C0000412', count: 3 },  // 血針の蠍スコーピグニス
      { id: 'C0000369', count: 3 },  // 炎翼の鳥民・イグニス
      { id: 'C0000168', count: 3 },  // 熱き剣士セイニー
      { id: 'C0000411', count: 3 },  // 呪炎殻のイグニファトゥス
      { id: 'C0000406', count: 3 },  // 血炎の精霊ブラッドフェニクス
      { id: 'C0000410', count: 2 },  // 峠の暴君ヴェルミグノス
      // 魔法（14枚）
      { id: 'C0000175', count: 3 },  // 地層の炎流
      { id: 'C0000176', count: 3 },  // 熔岩の罠
      { id: 'C0000428', count: 3 },  // 血焔の嵐
      { id: 'C0000160', count: 3 },  // 業火の爆炎
      { id: 'C0000177', count: 2 },  // 岩石の守護
      // フィールド（3枚）
      { id: 'C0000188', count: 3 },  // 炎の岩峰
    ],
  },

  // デッキ12: 密林の小さな命（新人トーマ）
  '密林の小さな命': {
    name: '密林の小さな命',
    owner: 'toma',
    attribute: '混合',
    type: 'スワーム/ランプ',
    concept: '低コスト虹羽密林モンスターを大量展開。虹羽の覚醒脈でヴォランティス召喚。',
    cards: [
      // モンスター（25枚）
      { id: 'C0000377', count: 3 },  // 虹羽密林の赤花蔓・カルティノス
      { id: 'C0000379', count: 3 },  // 虹羽密林の青滴虫・サルフィス
      { id: 'C0000375', count: 3 },  // 虹羽密林の霧花蛙・ヴェルミナ
      { id: 'C0000378', count: 3 },  // 虹羽密林の金胞草・ファルネシア
      { id: 'C0000373', count: 3 },  // 虹羽密林の血針蟻・ザルヴァキス
      { id: 'C0000374', count: 3 },  // 虹羽密林の輝甲虫・ルクセリオ
      { id: 'C0000380', count: 3 },  // 虹羽密林の湖鱗獣・アクアレオン
      { id: 'C0000361', count: 2 },  // 虹羽密林のフェザートラップ
      { id: 'C0000363', count: 2 },  // 虹羽密林のアクアフェザー
      // 魔法（9枚）
      { id: 'C0000381', count: 3 },  // 虹羽密林の生命網
      { id: 'C0000382', count: 3 },  // 虹羽の覚醒脈
      { id: 'C0000207', count: 3 },  // 知恵の代償
      // フィールド（3枚）
      { id: 'C0000376', count: 3 },  // 虹羽の微脈
      // フェイズカード（3枚）
      { id: 'C0000383', count: 3 },  // 虹羽密林の共鳴弦
    ],
  },

  // デッキ13: 聖なる巨鳥（森の賢者エルダ）
  '聖なる巨鳥': {
    name: '聖なる巨鳥',
    owner: 'elda',
    attribute: '光',
    type: 'ミッドレンジ',
    concept: '鳥民サーチとコスト軽減。ファルクェス・アルディオンの壮麗効果でフィニッシュ。',
    cards: [
      // モンスター（22枚）
      { id: 'C0000356', count: 3 },  // 鳥民の斥候・ヴェルティス
      { id: 'C0000357', count: 3 },  // 風刻の使者・シルヴァリス
      { id: 'C0000347', count: 3 },  // 鳥民の供物者・カルディス
      { id: 'C0000368', count: 3 },  // 裁定の鳥民・ミナルス
      { id: 'C0000354', count: 3 },  // 鳥民の風使い・ゼルヴィス
      { id: 'C0000346', count: 3 },  // ヴォランティス・セラヴェント
      { id: 'C0000348', count: 2 },  // ヴォランティス・ファルクェス
      { id: 'C0000345', count: 2 },  // ヴォランティス・アルディオン
      // 魔法（12枚）
      { id: 'C0000358', count: 3 },  // アヴィクルスの風鳴り
      { id: 'C0000350', count: 3 },  // 鳥民の祈り
      { id: 'C0000355', count: 3 },  // 鳥民の壮麗儀式
      { id: 'C0000349', count: 3 },  // アヴィクルスの裁定
      // フィールド（3枚）
      { id: 'C0000351', count: 3 },  // 天翔峰アヴィクルス
      // フェイズカード（3枚）
      { id: 'C0000352', count: 3 },  // アヴィクルスの試練
    ],
  },

  // デッキ14: 天翔の覇王（謎の仮面）
  '天翔の覇王': {
    name: '天翔の覇王',
    owner: 'mask',
    attribute: '混合',
    type: 'ランプ/コントロール',
    concept: '多属性鳥民展開。犠現でコスト軽減、エテルノス(3800/4800)で制圧。',
    cards: [
      // モンスター（24枚）
      { id: 'C0000356', count: 3 },  // 鳥民の斥候・ヴェルティス
      { id: 'C0000347', count: 3 },  // 鳥民の供物者・カルディス
      { id: 'C0000357', count: 3 },  // 風刻の使者・シルヴァリス
      { id: 'C0000368', count: 2 },  // 裁定の鳥民・ミナルス
      { id: 'C0000370', count: 3 },  // 影羽の鳥民・ノクティス
      { id: 'C0000371', count: 3 },  // 風詠の鳥民・ゼフィラス
      { id: 'C0000346', count: 2 },  // ヴォランティス・セラヴェント
      { id: 'C0000364', count: 2 },  // ヴォランティス・エクリプス
      { id: 'C0000360', count: 2 },  // ヴォランティス・テンペスト
      { id: 'C0000353', count: 1 },  // ヴォランティス・エテルノス
      // 魔法（10枚）
      { id: 'C0000358', count: 3 },  // アヴィクルスの風鳴り
      { id: 'C0000350', count: 3 },  // 鳥民の祈り
      { id: 'C0000355', count: 2 },  // 鳥民の壮麗儀式
      { id: 'C0000382', count: 2 },  // 虹羽の覚醒脈
      // フィールド（6枚）
      { id: 'C0000366', count: 3 },  // 天翔秘島
      { id: 'C0000351', count: 3 },  // 天翔峰アヴィクルス
    ],
  },

  // デッキ15: 密林の覚醒（機工士ノヴァ）
  '密林の覚醒': {
    name: '密林の覚醒',
    owner: 'nova',
    attribute: '混合',
    type: 'コンボ/ワンショット',
    concept: '虹羽の覚醒脈でヴォランティスをコスト無視召喚。オーブで攻撃力+2500、一撃必殺。',
    cards: [
      // モンスター（22枚）
      { id: 'C0000377', count: 3 },  // 虹羽密林の赤花蔓・カルティノス
      { id: 'C0000379', count: 3 },  // 虹羽密林の青滴虫・サルフィス
      { id: 'C0000378', count: 3 },  // 虹羽密林の金胞草・ファルネシア
      { id: 'C0000373', count: 3 },  // 虹羽密林の血針蟻・ザルヴァキス
      { id: 'C0000374', count: 3 },  // 虹羽密林の輝甲虫・ルクセリオ
      { id: 'C0000359', count: 2 },  // ヴォランティス・インフェルノ
      { id: 'C0000345', count: 2 },  // ヴォランティス・アルディオン
      { id: 'C0000364', count: 2 },  // ヴォランティス・エクリプス
      { id: 'C0000353', count: 1 },  // ヴォランティス・エテルノス
      // 魔法（12枚）
      { id: 'C0000382', count: 3 },  // 虹羽の覚醒脈
      { id: 'C0000381', count: 3 },  // 虹羽密林の生命網
      { id: 'C0000365', count: 3 },  // ヴォランティス・オーブ
      { id: 'C0000207', count: 3 },  // 知恵の代償
      // フィールド（6枚）
      { id: 'C0000366', count: 3 },  // 天翔秘島
      { id: 'C0000376', count: 3 },  // 虹羽の微脈
    ],
  },

  // デッキ16: 果実の人形劇（森の賢者エルダ）
  '果実の人形劇': {
    name: '果実の人形劇',
    owner: 'elda',
    attribute: '光',
    type: 'ミッドレンジ/コントロール',
    concept: 'フルーツ・マリオネットで墓地肥やし＆回復。コントロール奪取でフィニッシュ。',
    cards: [
      // モンスター（24枚）
      { id: 'C0000211', count: 3 },  // フルーツ・マリオネット・アップル
      { id: 'C0000212', count: 3 },  // フルーツ・マリオネット・オレンジ
      { id: 'C0000213', count: 3 },  // フルーツ・マリオネット・バナナ
      { id: 'C0000214', count: 3 },  // フルーツ・マリオネット・グレープ
      { id: 'C0000215', count: 3 },  // フルーツ・マリオネット・メロン王
      { id: 'C0000298', count: 3 },  // 光のソルジャー
      { id: 'C0000299', count: 3 },  // 光のソルジャーII
      { id: 'C0000374', count: 3 },  // 虹羽密林の輝甲虫・ルクセリオ
      // 魔法（10枚）
      { id: 'C0000216', count: 3 },  // フルーツの糸引き
      { id: 'C0000217', count: 3 },  // 光果の舞踏
      { id: 'C0000065', count: 2 },  // 天使の波動
      { id: 'C0000068', count: 2 },  // クリスタルブレス
      // フィールド（6枚）
      { id: 'C0000218', count: 3 },  // フルーツ・マリオネット劇場
      { id: 'C0000073', count: 3 },  // 輝く天蓋
    ],
  },

  // デッキ17: 闇鎖の舞踏（獣王ガロン）
  '闇鎖の舞踏': {
    name: '闇鎖の舞踏',
    owner: 'garon',
    attribute: '原始',
    type: 'コントロール',
    concept: 'ゴシック・鎖で相手を拘束。禁忌の檻でゴシック数×300バーン。',
    cards: [
      // モンスター（23枚）
      { id: 'C0000132', count: 3 },  // ゴシック・パペット
      { id: 'C0000127', count: 3 },  // ゴシック・ローズ
      { id: 'C0000128', count: 3 },  // 鎖縛のメイド
      { id: 'C0000131', count: 3 },  // 鎖の守護者
      { id: 'C0000125', count: 2 },  // ゴシック・ドール
      { id: 'C0000129', count: 3 },  // ゴシック・プリンセス
      { id: 'C0000231', count: 2 },  // 幼魔王女リリカ
      { id: 'C0000244', count: 2 },  // 鎖縛の幻姫リアノン
      { id: 'C0000138', count: 2 },  // 禁忌のゴシッククラウン
      // 魔法（11枚）
      { id: 'C0000238', count: 3 },  // おしおきの鎖
      { id: 'C0000133', count: 3 },  // 鎖の舞踏
      { id: 'C0000136', count: 2 },  // 鎖の呪縛
      { id: 'C0000134', count: 3 },  // ゴシックの誘惑
      // フィールド（6枚）
      { id: 'C0000139', count: 3 },  // ゴシック・フォートレス
      { id: 'C0000141', count: 3 },  // 禁忌の檻
    ],
  },

  // デッキ18: 聖域の光（聖騎士ロウェン）
  '聖域の光': {
    name: '聖域の光',
    owner: 'rowen',
    attribute: '光',
    type: 'ミッドレンジ',
    concept: '光属性サポートと破壊耐性。ルシフェリエルで回復＆フィニッシュ。',
    cards: [
      // モンスター（24枚）
      { id: 'C0000121', count: 3 },  // 聖域の灯守兵
      { id: 'C0000091', count: 3 },  // 灯火の精霊
      { id: 'C0000020', count: 3 },  // 灯火の護衛霊
      { id: 'C0000122', count: 3 },  // 聖域の戦士
      { id: 'C0000057', count: 3 },  // プリズム・ガーディアン
      { id: 'C0000060', count: 2 },  // 聖なる導師
      { id: 'C0000056', count: 3 },  // 輝聖女ルミナス
      { id: 'C0000058', count: 2 },  // 熾天使セラフ
      { id: 'C0000162', count: 2 },  // 死神天使ルシフェリエル
      // 魔法（10枚）
      { id: 'C0000065', count: 3 },  // 天使の波動
      { id: 'C0000066', count: 3 },  // ホーリーライトサモン
      { id: 'C0000064', count: 2 },  // ルミナスの裁き
      { id: 'C0000158', count: 2 },  // 聖光の刃
      // フィールド（6枚）
      { id: 'C0000072', count: 3 },  // ルミナスの聖域
      { id: 'C0000073', count: 3 },  // 輝く天蓋
    ],
  },
};

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * NPCのデッキリストを取得
 * @param {string} competitorId - NPC ID
 * @returns {string[]} デッキ名の配列
 */
export function getCompetitorDeckNames(competitorId) {
  const competitor = COMPETITORS[competitorId];
  if (!competitor) return [];
  return competitor.decks || [];
}

/**
 * デッキデータを取得
 * @param {string} deckName - デッキ名
 * @returns {object|null} デッキデータ
 */
export function getDeck(deckName) {
  return DECKS[deckName] || null;
}

/**
 * NPCのランダムなデッキを取得
 * @param {string} competitorId - NPC ID
 * @returns {object|null} デッキデータ
 */
export function getRandomDeckForCompetitor(competitorId) {
  const deckNames = getCompetitorDeckNames(competitorId);
  if (deckNames.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * deckNames.length);
  return getDeck(deckNames[randomIndex]);
}

/**
 * デッキをカードID配列に展開（シミュレーター用）
 * @param {object} deck - デッキデータ
 * @returns {string[]} カードIDの配列（40枚）
 */
export function expandDeckToCardIds(deck) {
  if (!deck || !deck.cards) return [];

  const cardIds = [];
  for (const entry of deck.cards) {
    for (let i = 0; i < entry.count; i++) {
      cardIds.push(entry.id);
    }
  }
  return cardIds;
}

/**
 * 基本8NPCのIDリストを取得
 * @returns {string[]} NPC IDの配列
 */
export function getBaseCompetitorIds() {
  return ['kain', 'seira', 'rowen', 'malik', 'garon', 'nova', 'mask', 'toma'];
}

/**
 * 全NPCのIDリストを取得（グランドカップ用）
 * @returns {string[]} NPC IDの配列
 */
export function getAllCompetitorIds() {
  return [
    ...getBaseCompetitorIds(),
    'elda',
    'extra_1', 'extra_2', 'extra_3', 'extra_4',
    'extra_5', 'extra_6', 'extra_7',
  ];
}

/**
 * 有効なNPCのみを取得（デッキが設定されているNPC）
 * @returns {string[]} NPC IDの配列
 */
export function getActiveCompetitorIds() {
  return Object.keys(COMPETITORS).filter(id => {
    const competitor = COMPETITORS[id];
    return competitor.decks && competitor.decks.length > 0;
  });
}

/**
 * NPCの表示名を取得
 * @param {string} competitorId - NPC ID
 * @returns {string} 表示名
 */
export function getCompetitorDisplayName(competitorId) {
  const competitor = COMPETITORS[competitorId];
  return competitor ? competitor.name : competitorId;
}

/**
 * NPCのポートレート（絵文字）を取得
 * @param {string} competitorId - NPC ID
 * @returns {string} ポートレート
 */
export function getCompetitorPortrait(competitorId) {
  const competitor = COMPETITORS[competitorId];
  return competitor?.portrait || '❓';
}
