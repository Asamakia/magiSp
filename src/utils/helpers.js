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
