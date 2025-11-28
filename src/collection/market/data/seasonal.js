/**
 * 動的市場システム - 時事ネタ型パターンデータ
 * パターン7: 季節/時間 → 属性の紐づけ
 */

/**
 * 季節・時間データ
 */
export const SEASONS = {
  '春': {
    attributes: ['光', '原始'],
    reason: '芽吹きと再生の季節',
    templates: [
      '春の訪れで${attribute}属性に注目',
      '春らしく${attribute}属性が活発に',
      '芽吹きの季節、${attribute}属性人気',
    ],
  },
  '夏': {
    attributes: ['炎', '水'],
    reason: '灼熱と海の季節',
    templates: [
      '夏本番、${attribute}属性が熱い',
      '夏の影響で${attribute}属性に関心',
      '夏到来で${attribute}属性が話題に',
    ],
  },
  '秋': {
    attributes: ['闇', '原始'],
    reason: '実りと静寂の季節',
    templates: [
      '秋深まり${attribute}属性に注目',
      '秋の気配で${attribute}属性が活況',
      '実りの秋、${attribute}属性が好調',
    ],
  },
  '冬': {
    attributes: ['水', '闇'],
    reason: '氷と長夜の季節',
    templates: [
      '冬の訪れで${attribute}属性需要増',
      '寒冬の影響で${attribute}属性人気',
      '長夜の季節、${attribute}属性に関心',
    ],
  },
  '朝': {
    attributes: ['光'],
    reason: '日の出の時間',
    templates: [
      '朝の光が${attribute}属性を照らす',
      '夜明けとともに${attribute}属性上昇',
      '朝の活気で${attribute}属性に注目',
    ],
  },
  '昼': {
    attributes: ['炎', '光'],
    reason: '太陽の時間',
    templates: [
      '真昼の太陽が${attribute}属性を後押し',
      '昼下がり、${attribute}属性が活発',
      '日差しのもと${attribute}属性好調',
    ],
  },
  '夕': {
    attributes: ['炎'],
    reason: '夕焼けの時間',
    templates: [
      '夕焼けに染まり${attribute}属性上昇',
      '夕暮れ時、${attribute}属性に関心',
      '黄昏の空に${attribute}属性映える',
    ],
  },
  '夜': {
    attributes: ['闇', '未来'],
    reason: '闇と星の時間',
    templates: [
      '夜の帳で${attribute}属性が覚醒',
      '闇夜に${attribute}属性の輝き',
      '星空のもと${attribute}属性活況',
    ],
  },
};

/**
 * 季節効果の変動幅
 */
export const SEASONAL_MODIFIERS = {
  up: { min: 10, max: 20 },
};

/**
 * 現在の季節を取得（ゲーム日数から）
 * @param {number} currentDay - 現在のゲーム日数
 * @returns {string} 季節キー
 */
export const getCurrentSeason = (currentDay) => {
  const seasonCycle = 28; // 28日で1年
  const dayInYear = currentDay % seasonCycle;

  if (dayInYear < 7) return '春';
  if (dayInYear < 14) return '夏';
  if (dayInYear < 21) return '秋';
  return '冬';
};

/**
 * 現在の時間帯を取得（ランダム、もしくは日数から）
 * @param {number} currentDay - 現在のゲーム日数
 * @returns {string} 時間帯キー
 */
export const getCurrentTimeOfDay = (currentDay) => {
  const times = ['朝', '昼', '夕', '夜'];
  return times[currentDay % 4];
};
