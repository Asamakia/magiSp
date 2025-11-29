/**
 * Deck Info System - デッキ情報購入システム
 *
 * NPCのデッキ情報を購入・管理する
 *
 * Created: 2025-11-29
 */

import { TOURNAMENT_TYPES, TOURNAMENT_CONFIG } from './tournamentManager';
import { COMPETITORS, DECKS, getDeck } from '../data/competitors';

// ========================================
// 情報タイプ定義
// ========================================

export const INFO_TYPES = {
  DECK_TYPE: 'deckType',      // デッキ型（例: ドラゴン軸）
  KEY_CARDS: 'keyCards',       // キーカード（2-3枚公開）
  FULL_LIST: 'fullList',       // フルリスト（全40枚公開）
};

export const INFO_TYPE_NAMES = {
  [INFO_TYPES.DECK_TYPE]: 'デッキ型',
  [INFO_TYPES.KEY_CARDS]: 'キーカード',
  [INFO_TYPES.FULL_LIST]: 'フルリスト',
};

// ========================================
// 価格設定
// ========================================

/**
 * 大会タイプ別の情報価格
 */
export const INFO_PRICES = {
  [TOURNAMENT_TYPES.DAILY]: {
    [INFO_TYPES.DECK_TYPE]: 500,
    [INFO_TYPES.KEY_CARDS]: 1500,
    [INFO_TYPES.FULL_LIST]: 5000,
  },
  [TOURNAMENT_TYPES.WEEKLY]: {
    [INFO_TYPES.DECK_TYPE]: 1000,
    [INFO_TYPES.KEY_CARDS]: 3000,
    [INFO_TYPES.FULL_LIST]: 10000,
  },
  [TOURNAMENT_TYPES.MAJOR]: {
    [INFO_TYPES.DECK_TYPE]: 3000,
    [INFO_TYPES.KEY_CARDS]: 10000,
    [INFO_TYPES.FULL_LIST]: 30000,
  },
};

// ========================================
// 情報取得
// ========================================

/**
 * デッキ型を取得
 * @param {string} competitorId - NPC ID
 * @param {string} deckKey - デッキキー
 * @returns {string} デッキ型の説明
 */
export function getDeckType(competitorId, deckKey) {
  const deck = getDeck(competitorId, deckKey);
  if (!deck) return '不明';

  // デッキ名からタイプを推測
  return deck.name || deckKey;
}

/**
 * キーカードを取得（2-3枚）
 * @param {string} competitorId - NPC ID
 * @param {string} deckKey - デッキキー
 * @returns {Array<Object>} キーカード配列 [{id, count}]
 */
export function getKeyCards(competitorId, deckKey) {
  const deck = getDeck(competitorId, deckKey);
  if (!deck || !deck.cards) return [];

  // コストが高い or 枚数が多いカードを優先
  const sortedCards = [...deck.cards].sort((a, b) => {
    // 枚数で優先
    if (b.count !== a.count) return b.count - a.count;
    return 0;
  });

  // 上位2-3枚を返す
  return sortedCards.slice(0, 3);
}

/**
 * フルリストを取得
 * @param {string} competitorId - NPC ID
 * @param {string} deckKey - デッキキー
 * @returns {Array<Object>} 全カード配列 [{id, count}]
 */
export function getFullList(competitorId, deckKey) {
  const deck = getDeck(competitorId, deckKey);
  if (!deck || !deck.cards) return [];
  return deck.cards;
}

// ========================================
// 購入管理
// ========================================

/**
 * 情報購入の価格を取得
 * @param {string} tournamentType - 大会タイプ
 * @param {string} infoType - 情報タイプ
 * @returns {number} 価格
 */
export function getInfoPrice(tournamentType, infoType) {
  const prices = INFO_PRICES[tournamentType];
  if (!prices) return 0;
  return prices[infoType] || 0;
}

/**
 * 情報購入をバリデーション
 * @param {Object} params - パラメータ
 * @param {string} params.competitorId - NPC ID
 * @param {string} params.infoType - 情報タイプ
 * @param {Object} params.tournament - 大会データ
 * @param {Object} params.purchasedInfo - 購入済み情報
 * @param {number} params.playerGold - 所持金
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateInfoPurchase({ competitorId, infoType, tournament, purchasedInfo, playerGold }) {
  // 大会チェック
  if (!tournament) {
    return { valid: false, error: '開催中の大会がありません' };
  }

  // 参加者チェック
  if (!tournament.participants.includes(competitorId)) {
    return { valid: false, error: 'この選手は参加していません' };
  }

  // 情報タイプチェック
  if (!Object.values(INFO_TYPES).includes(infoType)) {
    return { valid: false, error: '不明な情報タイプです' };
  }

  // 既に購入済みかチェック
  const key = `${tournament.id}_${competitorId}`;
  const existingInfo = purchasedInfo?.[key];
  if (existingInfo) {
    if (infoType === INFO_TYPES.DECK_TYPE && existingInfo.deckType) {
      return { valid: false, error: 'デッキ型は購入済みです' };
    }
    if (infoType === INFO_TYPES.KEY_CARDS && existingInfo.keyCards) {
      return { valid: false, error: 'キーカードは購入済みです' };
    }
    if (infoType === INFO_TYPES.FULL_LIST && existingInfo.fullList) {
      return { valid: false, error: 'フルリストは購入済みです' };
    }
  }

  // 価格チェック
  const price = getInfoPrice(tournament.type, infoType);
  if (price > playerGold) {
    return { valid: false, error: `所持金が不足しています（${price.toLocaleString()}G必要）` };
  }

  return { valid: true, price };
}

/**
 * 情報を購入
 * @param {Object} tournamentData - 大会データ
 * @param {Object} params - 購入パラメータ
 * @returns {Object} { success, tournamentData, info, price }
 */
export function purchaseInfo(tournamentData, { competitorId, infoType, tournament }) {
  const purchasedInfo = tournamentData.purchasedInfo || {};
  const key = `${tournament.id}_${competitorId}`;
  const existingInfo = purchasedInfo[key] || {};

  // 使用中のデッキを取得
  const participantInfo = tournament.participantDecks?.[competitorId];
  const deckKey = participantInfo?.deckKey;

  if (!deckKey) {
    return { success: false, error: 'デッキ情報が見つかりません' };
  }

  // 情報を取得
  let info = {};
  switch (infoType) {
    case INFO_TYPES.DECK_TYPE:
      info = { deckType: getDeckType(competitorId, deckKey) };
      break;
    case INFO_TYPES.KEY_CARDS:
      info = { keyCards: getKeyCards(competitorId, deckKey) };
      break;
    case INFO_TYPES.FULL_LIST:
      info = { fullList: getFullList(competitorId, deckKey) };
      break;
    default:
      return { success: false, error: '不明な情報タイプ' };
  }

  const price = getInfoPrice(tournament.type, infoType);

  // 購入情報を更新
  const newPurchasedInfo = {
    ...purchasedInfo,
    [key]: {
      ...existingInfo,
      ...info,
      competitorId,
      tournamentId: tournament.id,
    },
  };

  return {
    success: true,
    tournamentData: {
      ...tournamentData,
      purchasedInfo: newPurchasedInfo,
    },
    info,
    price,
  };
}

/**
 * 購入済み情報を取得
 * @param {Object} tournamentData - 大会データ
 * @param {string} tournamentId - 大会ID
 * @param {string} competitorId - NPC ID
 * @returns {Object|null} 購入済み情報
 */
export function getPurchasedInfo(tournamentData, tournamentId, competitorId) {
  const key = `${tournamentId}_${competitorId}`;
  return tournamentData.purchasedInfo?.[key] || null;
}

/**
 * 特定の情報タイプが購入済みかチェック
 * @param {Object} tournamentData - 大会データ
 * @param {string} tournamentId - 大会ID
 * @param {string} competitorId - NPC ID
 * @param {string} infoType - 情報タイプ
 * @returns {boolean}
 */
export function hasInfo(tournamentData, tournamentId, competitorId, infoType) {
  const info = getPurchasedInfo(tournamentData, tournamentId, competitorId);
  if (!info) return false;

  switch (infoType) {
    case INFO_TYPES.DECK_TYPE:
      return !!info.deckType;
    case INFO_TYPES.KEY_CARDS:
      return !!info.keyCards;
    case INFO_TYPES.FULL_LIST:
      return !!info.fullList;
    default:
      return false;
  }
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * NPCの表示名を取得
 * @param {string} competitorId - NPC ID
 * @returns {string}
 */
export function getCompetitorName(competitorId) {
  const competitor = COMPETITORS[competitorId];
  return competitor?.name || competitorId;
}

/**
 * NPCの分析コメントを生成
 * @param {string} competitorId - NPC ID
 * @param {string} deckKey - デッキキー
 * @returns {string}
 */
export function getAnalysisComment(competitorId, deckKey) {
  const competitor = COMPETITORS[competitorId];
  const deck = getDeck(competitorId, deckKey);

  if (!competitor || !deck) return '';

  const style = competitor.style || '';
  const attribute = competitor.attribute || '';

  // 簡易的な分析コメント
  const comments = [];

  if (style === '速攻') {
    comments.push('序盤の攻撃力に注意');
  } else if (style === 'コントロール') {
    comments.push('長期戦に備えた構成');
  } else if (style === 'バーン') {
    comments.push('削りダメージに警戒');
  } else if (style === 'ビート') {
    comments.push('高攻撃力のモンスターが中心');
  }

  if (attribute) {
    comments.push(`${attribute}属性が主力`);
  }

  return comments.join('。');
}
