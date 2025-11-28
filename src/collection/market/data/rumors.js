/**
 * 動的市場システム - 噂型パターンデータ
 * パターン4: 噂種類 → 対象、噂種類 → 方向の紐づけ
 */

/**
 * 属性リスト（ランダム選択用）
 */
export const ATTRIBUTES = ['炎', '水', '光', '闇', '原始', '未来'];

/**
 * カテゴリリスト（ランダム選択用）
 */
export const CATEGORIES_LIST = [
  '岩狸', 'ドラゴン', 'フェニックス',
  'ブリザードキャット', 'ヴェルゼファール', 'リヴァイアサン',
  '鳥民', 'フルーツ・マリオネット', 'リリカ',
  '魔女', 'シャドウ', '黒呪',
  'ゴシック', '粘液獣', '鎖縛',
  'ゴーレム', '未来鴉',
];

/**
 * 噂データ
 */
export const RUMORS = {
  '規制系': {
    templates: [
      '${target}が規制されるとの噂',
      '${target}の使用が制限される可能性',
      '${target}が禁止リスト入りか',
    ],
    targets: [{ keyword: '禁忌' }],
    direction: 'down',
  },
  '強化系': {
    templates: [
      '次の環境は${target}が強いとの見方',
      '${target}が大幅強化されるとの噂',
      '${target}の時代が来るとの予想',
    ],
    targets: 'random_attribute',
    direction: 'up',
  },
  '弱体化系': {
    templates: [
      '${target}が弱体化されるとの噂',
      '${target}への対策が増えるとの見方',
      '${target}の全盛期は終わりか',
    ],
    targets: 'random_attribute',
    direction: 'down',
  },
  '再録系': {
    templates: [
      '${target}が再録されるとの情報',
      '${target}の復刻が決定との噂',
      '${target}の新版が出るとの話',
    ],
    targets: 'random_category',
    direction: 'down',
  },
  '絶版系': {
    templates: [
      '${target}が絶版になるとの噂',
      '${target}の生産終了が近いとの情報',
      '${target}は二度と出ないとの見方',
    ],
    targets: 'random_category',
    direction: 'up',
  },
  '新カード系': {
    templates: [
      '${target}の新カードが発表されるとの噂',
      '${target}に強力な新戦力が来るとの情報',
      '${target}の新規サポートが来るとの予想',
    ],
    targets: 'random_attribute',
    direction: 'up',
  },
  '大会メタ系': {
    templates: [
      '大会で${target}が大活躍との報告',
      '${target}デッキが優勝したとの情報',
      '${target}が環境トップとの見方',
    ],
    targets: 'random_attribute_or_category',
    direction: 'up',
  },
  '不正系': {
    templates: [
      '${target}に偽物が流通しているとの警告',
      '${target}の不正取引が発覚との噂',
      '${target}の鑑定基準に疑問の声',
    ],
    targets: [{ minRarity: 'SR' }],
    direction: 'down',
  },
  'コンボ系': {
    templates: [
      '${target}の新コンボ発見との報告',
      '${target}の隠れた強さが判明したとの噂',
      '${target}が実は最強との見方が浮上',
    ],
    targets: 'random_category',
    direction: 'up',
  },
};

/**
 * 噂のプレフィックス（バリエーション用）
 */
export const RUMOR_PREFIXES = [
  '【噂】',
  '【未確認情報】',
  '【速報】',
  '【関係者筋】',
  '【情報提供】',
];
