/**
 * 動的市場システム - 人物型パターンデータ
 * パターン2: 人物 → 行動の紐づけ
 */

/**
 * 人物データ
 * 各人物には許可される行動リストがある
 */
export const PERSONS = {
  '有名コレクター': {
    actions: ['買い占め', '売却', '注目', '収集開始', '引退宣言'],
    tendency: 'neutral',
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

/**
 * 行動 → 方向傾向
 */
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

/**
 * テンプレート
 */
export const PERSON_TEMPLATES = [
  '${person}が${category}を${action}！${direction}の兆し',
  '${person}、${category}に${action}',
  '速報：${person}が${category}を${action}',
  '${person}の${action}で${category}に注目',
];
