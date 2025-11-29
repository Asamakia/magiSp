/**
 * Match Simulator - 大会試合シミュレーター
 *
 * competitors.jsのデッキデータを使用して、
 * 既存のSimulator.jsでAI vs AI対戦をシミュレートする。
 *
 * Created: 2025-11-29
 */

import { simulateGame, simulateMultiple } from '../../../engine/gameEngine/Simulator';
import { loadCardsFromCSV } from '../../../utils/cardManager';
import {
  COMPETITORS,
  DECKS,
  getRandomDeckForCompetitor,
  expandDeckToCardIds,
  isDoppelganger,
  getActiveCompetitorIds,
} from '../data/competitors';
import { load as loadPlayerData } from '../../data/storage';

// ========================================
// カードキャッシュ
// ========================================

let cardCache = null;
let cardCachePromise = null;

/**
 * カードデータをロードしてキャッシュ
 * @returns {Promise<Map<string, Object>>} カードID -> カードオブジェクトのマップ
 */
export async function loadCardCache() {
  if (cardCache) return cardCache;

  if (cardCachePromise) return cardCachePromise;

  cardCachePromise = (async () => {
    const cards = await loadCardsFromCSV();
    cardCache = new Map();
    for (const card of cards) {
      cardCache.set(card.id, card);
    }
    console.log(`[MatchSimulator] ${cardCache.size}枚のカードをキャッシュしました`);
    return cardCache;
  })();

  return cardCachePromise;
}

/**
 * カードIDからカードオブジェクトを取得
 * @param {string} cardId - カードID
 * @returns {Object|null} カードオブジェクト
 */
export function getCardById(cardId) {
  if (!cardCache) {
    console.warn('[MatchSimulator] カードキャッシュが未初期化です');
    return null;
  }
  return cardCache.get(cardId) || null;
}

// ========================================
// プレイヤーデッキ取得
// ========================================

/**
 * プレイヤーの保存デッキからランダムに1つ取得
 * @returns {Object|null} ユーザーデッキ { id, name, cards: [{cardId, rarity}] }
 */
export function getRandomPlayerDeck() {
  const playerData = loadPlayerData();
  if (!playerData || !playerData.userDecks || playerData.userDecks.length === 0) {
    return null;
  }

  const validDecks = playerData.userDecks.filter(deck =>
    deck.cards && deck.cards.length >= 30  // 最低30枚以上のデッキ
  );

  if (validDecks.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * validDecks.length);
  return validDecks[randomIndex];
}

/**
 * プレイヤーデッキをカードオブジェクト配列に変換
 * @param {Object} playerDeck - ユーザーデッキ { cards: [{cardId, rarity}] }
 * @returns {Array<Object>} カードオブジェクトの配列
 */
export function convertPlayerDeckToCards(playerDeck) {
  if (!playerDeck || !playerDeck.cards) return [];
  if (!cardCache) {
    console.warn('[MatchSimulator] カードキャッシュが未初期化です');
    return [];
  }

  const cards = [];
  for (const entry of playerDeck.cards) {
    const card = cardCache.get(entry.cardId);
    if (card) {
      cards.push({
        ...card,
        rarity: entry.rarity,
        uniqueId: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    } else {
      console.warn(`[MatchSimulator] カードが見つかりません: ${entry.cardId}`);
    }
  }

  return cards;
}

/**
 * ドッペルゲンガー用にデッキを取得（プレイヤーデッキ優先、なければNPCランダム）
 * @returns {Object} { cards: Array, deckName: string, isPlayerDeck: boolean }
 */
export function getDoppelgangerDeck() {
  // プレイヤーデッキを試す
  const playerDeck = getRandomPlayerDeck();
  if (playerDeck) {
    const cards = convertPlayerDeckToCards(playerDeck);
    if (cards.length >= 30) {
      console.log(`[MatchSimulator] ドッペルゲンガーがプレイヤーデッキ「${playerDeck.name}」を使用`);
      return {
        cards,
        deckName: `コピー: ${playerDeck.name}`,
        isPlayerDeck: true,
      };
    }
  }

  // フォールバック: NPCのランダムデッキを使用
  const activeIds = getActiveCompetitorIds().filter(id => !isDoppelganger(id));
  if (activeIds.length === 0) {
    console.warn('[MatchSimulator] フォールバック用のNPCがいません');
    return { cards: [], deckName: 'なし', isPlayerDeck: false };
  }

  const randomNpcId = activeIds[Math.floor(Math.random() * activeIds.length)];
  const npcDeck = getRandomDeckForCompetitor(randomNpcId);

  if (npcDeck) {
    // nullチェック（ランダムデッキの場合）
    if (npcDeck.cards === null) {
      // ランダム生成デッキ → 再帰で別のNPCを選ぶ
      return getDoppelgangerDeck();
    }
    const cards = convertDeckToCards(npcDeck);
    console.log(`[MatchSimulator] ドッペルゲンガーがNPCデッキ「${npcDeck.name}」を使用（フォールバック）`);
    return {
      cards,
      deckName: `借用: ${npcDeck.name}`,
      isPlayerDeck: false,
    };
  }

  return { cards: [], deckName: 'なし', isPlayerDeck: false };
}

// ========================================
// デッキ変換
// ========================================

/**
 * デッキ定義からカードオブジェクト配列に変換
 * @param {Object} deck - DECKSのデッキ定義
 * @returns {Array<Object>} カードオブジェクトの配列
 */
export function convertDeckToCards(deck) {
  if (!deck) return [];

  // プレイヤーコピーの場合は専用処理
  if (deck.cards === 'player') {
    const result = getDoppelgangerDeck();
    return result.cards;
  }

  // ランダムデッキの場合（cards: null）
  if (deck.cards === null) {
    console.warn('[MatchSimulator] ランダムデッキは個別処理が必要です');
    return [];
  }

  if (!Array.isArray(deck.cards)) return [];
  if (!cardCache) {
    console.warn('[MatchSimulator] カードキャッシュが未初期化です');
    return [];
  }

  const cards = [];
  for (const entry of deck.cards) {
    const card = cardCache.get(entry.id);
    if (card) {
      for (let i = 0; i < entry.count; i++) {
        // ユニークIDを付与
        cards.push({
          ...card,
          uniqueId: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      }
    } else {
      console.warn(`[MatchSimulator] カードが見つかりません: ${entry.id}`);
    }
  }

  return cards;
}

/**
 * NPCの使用デッキをカードオブジェクト配列に変換
 * @param {string} competitorId - NPC ID
 * @param {string} [deckName] - デッキ名（省略時ランダム）
 * @returns {Array<Object>} カードオブジェクトの配列
 */
export function getCompetitorDeckCards(competitorId, deckName = null) {
  let deck;

  if (deckName) {
    deck = DECKS[deckName];
  } else {
    deck = getRandomDeckForCompetitor(competitorId);
  }

  if (!deck) {
    console.warn(`[MatchSimulator] デッキが見つかりません: ${competitorId}, ${deckName}`);
    return [];
  }

  return convertDeckToCards(deck);
}

// ========================================
// シミュレーション実行
// ========================================

/**
 * 2人のNPC間の試合をシミュレート
 * @param {string} competitor1Id - NPC1 ID
 * @param {string} competitor2Id - NPC2 ID
 * @param {Object} options - オプション
 * @param {string} [options.deck1Name] - NPC1のデッキ名（省略時ランダム）
 * @param {string} [options.deck2Name] - NPC2のデッキ名（省略時ランダム）
 * @returns {Object} シミュレーション結果
 */
export async function simulateMatch(competitor1Id, competitor2Id, options = {}) {
  await loadCardCache();

  const deck1 = getCompetitorDeckCards(competitor1Id, options.deck1Name);
  const deck2 = getCompetitorDeckCards(competitor2Id, options.deck2Name);

  if (deck1.length === 0 || deck2.length === 0) {
    console.error('[MatchSimulator] デッキが空です');
    return null;
  }

  const result = simulateGame({
    deck1,
    deck2,
  });

  return {
    ...result,
    competitor1: competitor1Id,
    competitor2: competitor2Id,
    deck1Name: options.deck1Name || 'random',
    deck2Name: options.deck2Name || 'random',
  };
}

/**
 * 2人のNPC間の試合を複数回シミュレート
 * @param {string} competitor1Id - NPC1 ID
 * @param {string} competitor2Id - NPC2 ID
 * @param {Object} options - オプション
 * @param {number} [options.count=10] - シミュレーション回数
 * @param {string} [options.deck1Name] - NPC1のデッキ名（省略時ランダム）
 * @param {string} [options.deck2Name] - NPC2のデッキ名（省略時ランダム）
 * @returns {Object} 統計結果
 */
export async function simulateMatchMultiple(competitor1Id, competitor2Id, options = {}) {
  await loadCardCache();

  const { count = 10, deck1Name, deck2Name } = options;
  const results = {
    competitor1: competitor1Id,
    competitor2: competitor2Id,
    competitor1Wins: 0,
    competitor2Wins: 0,
    draws: 0,
    totalDuration: 0,
    games: [],
  };

  for (let i = 0; i < count; i++) {
    // ランダムデッキの場合は毎回選択
    const d1Name = deck1Name || getRandomDeckForCompetitor(competitor1Id)?.name;
    const d2Name = deck2Name || getRandomDeckForCompetitor(competitor2Id)?.name;

    const deck1 = getCompetitorDeckCards(competitor1Id, d1Name);
    const deck2 = getCompetitorDeckCards(competitor2Id, d2Name);

    // デッキをシャッフル
    const shuffledDeck1 = shuffleArray([...deck1]);
    const shuffledDeck2 = shuffleArray([...deck2]);

    const result = simulateGame({
      deck1: shuffledDeck1,
      deck2: shuffledDeck2,
    });

    if (result.winner === 1) {
      results.competitor1Wins++;
    } else if (result.winner === 2) {
      results.competitor2Wins++;
    } else {
      results.draws++;
    }

    results.totalDuration += result.duration;
    results.games.push({
      ...result,
      deck1Name: d1Name,
      deck2Name: d2Name,
    });
  }

  results.competitor1WinRate = results.competitor1Wins / count;
  results.competitor2WinRate = results.competitor2Wins / count;
  results.avgDuration = results.totalDuration / count;

  return results;
}

// ========================================
// トーナメントシミュレーション
// ========================================

/**
 * トーナメント全体をシミュレート
 * @param {Array<string>} participantIds - 参加者IDの配列（4, 8, 16人）
 * @param {Object} options - オプション
 * @param {Object} [options.deckSelections] - NPC IDごとのデッキ名マップ（省略時ランダム）
 * @returns {Object} トーナメント結果
 */
export async function simulateTournament(participantIds, options = {}) {
  await loadCardCache();

  const { deckSelections = {} } = options;
  const numParticipants = participantIds.length;

  // 参加者数チェック（2の累乗）
  if (![2, 4, 8, 16].includes(numParticipants)) {
    console.error(`[MatchSimulator] 無効な参加者数: ${numParticipants}`);
    return null;
  }

  // 各参加者のデッキを決定
  const participantDecks = {};
  for (const id of participantIds) {
    if (deckSelections[id]) {
      participantDecks[id] = deckSelections[id];
    } else {
      const deck = getRandomDeckForCompetitor(id);
      participantDecks[id] = deck?.name || null;
    }
  }

  // トーナメント実行
  let currentRound = [...participantIds];
  const rounds = [];
  let roundNum = 1;

  while (currentRound.length > 1) {
    const nextRound = [];
    const roundResults = [];

    for (let i = 0; i < currentRound.length; i += 2) {
      const p1 = currentRound[i];
      const p2 = currentRound[i + 1];

      const deck1 = getCompetitorDeckCards(p1, participantDecks[p1]);
      const deck2 = getCompetitorDeckCards(p2, participantDecks[p2]);

      // シャッフル
      const shuffledDeck1 = shuffleArray([...deck1]);
      const shuffledDeck2 = shuffleArray([...deck2]);

      const result = simulateGame({
        deck1: shuffledDeck1,
        deck2: shuffledDeck2,
      });

      const winner = result.winner === 1 ? p1 : p2;
      const loser = result.winner === 1 ? p2 : p1;

      roundResults.push({
        matchId: roundResults.length + 1,
        p1,
        p2,
        winner,
        loser,
        p1Life: result.p1Life,
        p2Life: result.p2Life,
        turns: result.turns,
      });

      nextRound.push(winner);
    }

    rounds.push({
      roundNum,
      matches: roundResults,
    });

    currentRound = nextRound;
    roundNum++;
  }

  const finalWinner = currentRound[0];

  // 決勝の情報を取得
  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.matches[0];
  const finalSecond = finalMatch?.loser || null;

  return {
    participants: participantIds,
    participantDecks,
    rounds,
    finalWinner,
    finalSecond,
    finalMatch,
  };
}

// ========================================
// ヘルパー
// ========================================

/**
 * 配列をシャッフル（Fisher-Yates）
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
