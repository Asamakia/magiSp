/**
 * 動的市場システム - 理由データ
 *
 * ニュース生成に使用する理由（30種）
 */

// ========================================
// 理由一覧（30種）
// ========================================

export const REASONS = [
  // 大会・競技系
  '大会優勝',
  '大会メタ',
  '環境変化',

  // 研究・発見系
  '研究発表',
  '新発見',
  '相性発見',
  'コンボ開発',
  '再評価',
  '歴史的発見',

  // 噂・情報系
  '噂話',
  '規制議論',
  '新カード発表',

  // 市場動向系
  '買い占め',
  '在庫処分',
  '大量流出',
  '希少化',

  // 評価系
  '初心者人気',
  'ベテラン評価',
  '不具合報告',

  // 騒動系
  '偽物騒動',
  '呪い騒動',
  '事故報告',

  // ポジティブ系
  '浄化成功',
  'コレクション完成',
  '博物館展示',
  '王室御用達',
  '冒険者愛用',

  // ミステリー系
  '神話解明',
  '封印解除',
  '予言成就',

  // 取締系
  '密輸摘発',
];

// ========================================
// 理由の傾向（上昇/下落に向きやすい）
// ========================================

export const REASON_TENDENCY = {
  // 上昇傾向
  '大会優勝': 'up',
  '研究発表': 'up',
  '新発見': 'up',
  '相性発見': 'up',
  'コンボ開発': 'up',
  '再評価': 'up',
  '買い占め': 'up',
  '希少化': 'up',
  '初心者人気': 'up',
  'ベテラン評価': 'up',
  '浄化成功': 'up',
  'コレクション完成': 'up',
  '博物館展示': 'up',
  '王室御用達': 'up',
  '冒険者愛用': 'up',
  '神話解明': 'up',
  '封印解除': 'up',
  '予言成就': 'up',

  // 下落傾向
  '規制議論': 'down',
  '在庫処分': 'down',
  '大量流出': 'down',
  '偽物騒動': 'down',
  '不具合報告': 'down',
  '呪い騒動': 'down',
  '事故報告': 'down',
  '密輸摘発': 'down',

  // 中立（どちらもあり）
  '大会メタ': 'neutral',
  '環境変化': 'neutral',
  '噂話': 'neutral',
  '新カード発表': 'neutral',
  '歴史的発見': 'neutral',
};

// ========================================
// ヘルパー関数
// ========================================

/**
 * ランダムな理由を取得
 * @param {string} [tendency] - 傾向（'up', 'down', 'neutral', null=全て）
 * @returns {string} 理由
 */
export const getRandomReason = (tendency = null) => {
  let candidates = REASONS;

  if (tendency) {
    candidates = REASONS.filter(r => {
      const t = REASON_TENDENCY[r];
      if (tendency === 'neutral') {
        return t === 'neutral';
      }
      return t === tendency || t === 'neutral';
    });
  }

  if (candidates.length === 0) {
    candidates = REASONS;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
};

/**
 * 理由の傾向を取得
 * @param {string} reason - 理由
 * @returns {string} 傾向（'up', 'down', 'neutral'）
 */
export const getReasonTendency = (reason) => {
  return REASON_TENDENCY[reason] || 'neutral';
};

// ========================================
// エクスポート
// ========================================

export default {
  REASONS,
  REASON_TENDENCY,
  getRandomReason,
  getReasonTendency,
};
