// ========================================
// ユーティリティ関数
// ========================================

import { DECK_SIZE } from './constants';
import { PREBUILT_DECKS } from '../decks/prebuiltDecks';

/**
 * 配列をシャッフル
 */
export const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * デッキを生成（カードプールからランダムに40枚）
 * @param {Array} cardPool - カードプール
 * @returns {Array} シャッフルされたデッキ
 */
export const createDeck = (cardPool = []) => {
  let deck = [];
  const availableCards = cardPool.filter(c =>
    c.type === 'monster' || c.type === 'magic' || c.type === 'field' || c.type === 'phasecard'
  );

  if (availableCards.length === 0) {
    console.error('利用可能なカードがありません');
    return [];
  }

  while (deck.length < DECK_SIZE) {
    const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    const count = deck.filter(c => c.id === randomCard.id).length;

    // 禁忌カードは1枚まで
    const maxCount = randomCard.isForbidden ? 1 : 3;

    if (count < maxCount) {
      deck.push({ ...randomCard, uniqueId: `${randomCard.id}-${Date.now()}-${Math.random()}` });
    }
  }
  return shuffle(deck);
};

/**
 * カードが特定のカテゴリを持っているか判定
 * カテゴリ名の【】は自動的に除去して比較する
 * @param {Object} card - カードオブジェクト
 * @param {string} categoryName - カテゴリ名（【】付きでも可）
 * @returns {boolean} カテゴリを持っている場合true
 */
export const hasCategory = (card, categoryName) => {
  if (!card || !card.category) return false;
  // 【】を除去して正規化
  const normalized = categoryName.replace(/【|】/g, '');
  if (Array.isArray(card.category)) {
    return card.category.includes(normalized);
  }
  // 文字列の場合（古い形式への対応）
  return card.category.includes(normalized) || card.category.includes(categoryName);
};

/**
 * モンスターインスタンスを生成
 * @param {Object} card - カードデータ
 * @returns {Object} モンスターインスタンス
 */
export const createMonsterInstance = (card) => ({
  ...card,
  currentHp: card.hp,
  currentAttack: card.attack,
  canAttack: false,
  charges: [],
  statusEffects: [],
  usedSkillThisTurn: false,
});

/**
 * 固定デッキからカードインスタンスを生成
 * @param {string} deckId - デッキID（'random', 'fire', 'water', 'light', 'balanced'）
 * @param {Array} cardPool - カードプール（CSVから読み込んだ全カードデータ）
 * @returns {Array} シャッフルされたデッキ
 */
export const createDeckFromPrebuilt = (deckId, cardPool = []) => {
  const deckConfig = PREBUILT_DECKS[deckId];

  // ランダムまたは不明なデッキIDの場合は従来のランダム生成
  if (!deckConfig || deckConfig.cards === null) {
    return createDeck(cardPool);
  }

  // 固定デッキからカードインスタンスを生成
  const deck = [];
  for (const cardId of deckConfig.cards) {
    const cardData = cardPool.find(c => c.id === cardId);
    if (cardData) {
      deck.push({
        ...cardData,
        uniqueId: `${cardId}-${Date.now()}-${Math.random()}`,
      });
    } else {
      console.warn(`カードが見つかりません: ${cardId}`);
    }
  }

  // デッキが40枚に満たない場合、ランダムで補充
  if (deck.length < DECK_SIZE) {
    console.warn(`デッキが${deck.length}枚しかありません。ランダムで補充します。`);
    const availableCards = cardPool.filter(c =>
      c.type === 'monster' || c.type === 'magic' || c.type === 'field' || c.type === 'phasecard'
    );
    while (deck.length < DECK_SIZE && availableCards.length > 0) {
      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      deck.push({
        ...randomCard,
        uniqueId: `${randomCard.id}-${Date.now()}-${Math.random()}`,
      });
    }
  }

  return shuffle(deck);
};

/**
 * ユーザー作成デッキからカードインスタンスを生成
 * @param {Object} userDeck - ユーザーデッキ（playerData.userDecksの要素）
 * @param {Array} cardPool - カードプール（CSVから読み込んだ全カードデータ）
 * @returns {Array} シャッフルされたデッキ
 */
export const createDeckFromUserDeck = (userDeck, cardPool = []) => {
  if (!userDeck || !userDeck.cards || !Array.isArray(userDeck.cards)) {
    console.error('無効なユーザーデッキ:', userDeck);
    return createDeck(cardPool);
  }

  const deck = [];
  for (const deckCard of userDeck.cards) {
    const cardData = cardPool.find(c => c.id === deckCard.cardId);
    if (cardData) {
      deck.push({
        ...cardData,
        rarity: deckCard.rarity, // レアリティを保持
        uniqueId: `${deckCard.cardId}-${Date.now()}-${Math.random()}`,
      });
    } else {
      console.warn(`カードが見つかりません: ${deckCard.cardId}`);
    }
  }

  // デッキが40枚に満たない場合、ランダムで補充
  if (deck.length < DECK_SIZE) {
    console.warn(`ユーザーデッキが${deck.length}枚しかありません。ランダムで補充します。`);
    const availableCards = cardPool.filter(c =>
      c.type === 'monster' || c.type === 'magic' || c.type === 'field' || c.type === 'phasecard'
    );
    while (deck.length < DECK_SIZE && availableCards.length > 0) {
      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      deck.push({
        ...randomCard,
        uniqueId: `${randomCard.id}-${Date.now()}-${Math.random()}`,
      });
    }
  }

  return shuffle(deck);
};
