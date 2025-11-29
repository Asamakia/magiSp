/**
 * Tournament - トーナメント対戦システム
 *
 * AI同士のトーナメント戦を実行し、結果を返す。
 * 賭けシステムのオッズ計算にも使用。
 */

import { simulateGame, simulateMultiple, calculateOdds } from './Simulator';

// ========================================
// トーナメント設定
// ========================================

export const TOURNAMENT_TYPES = {
  DAILY: {
    id: 'daily',
    name: 'デイリーカップ',
    participants: 4,
    minBet: 1000,
    maxBet: 10000,
    infoPrice: { type: 500, keyCards: 1500, fullList: 5000 },
  },
  WEEKLY: {
    id: 'weekly',
    name: 'ウィークリー杯',
    participants: 8,
    minBet: 10000,
    maxBet: 100000,
    infoPrice: { type: 1000, keyCards: 3000, fullList: 10000 },
  },
  MONTHLY: {
    id: 'monthly',
    name: 'マンスリー大会',
    participants: 16,
    minBet: 50000,
    maxBet: 500000,
    infoPrice: { type: 3000, keyCards: 10000, fullList: 30000 },
  },
  GRANDPRIX: {
    id: 'grandprix',
    name: 'グランプリ',
    participants: 32,
    minBet: 100000,
    maxBet: 2000000,
    infoPrice: { type: 10000, keyCards: 30000, fullList: 100000 },
  },
};

// ========================================
// NPCデータ
// ========================================

export const NPC_PARTICIPANTS = [
  {
    id: 'kain',
    name: '炎帝カイン',
    attribute: '炎',
    deckType: '速攻',
    icon: '🔥',
    description: '序盤強い、後半息切れ',
    baseWinRate: 0.83, // 15勝3敗
    deckVariants: ['低コスト特化', 'ドラゴン軸', 'バーン混合'],
  },
  {
    id: 'seira',
    name: '氷姫セイラ',
    attribute: '水',
    deckType: 'コントロール',
    icon: '💧',
    description: '遅いが安定',
    baseWinRate: 0.625, // 10勝6敗
    deckVariants: ['除去重視', '大型軸', '回復耐久'],
  },
  {
    id: 'rowen',
    name: '聖騎士ロウェン',
    attribute: '光',
    deckType: 'バランス',
    icon: '✨',
    description: '堅実、大崩れしない',
    baseWinRate: 0.6875, // 11勝5敗
    deckVariants: ['鳥民軸', '回復軸', 'バフ軸'],
  },
  {
    id: 'malik',
    name: '闇術師マリク',
    attribute: '闇',
    deckType: 'バーン',
    icon: '🌙',
    description: '削り特化、事故多め',
    baseWinRate: 0.375, // 6勝10敗
    deckVariants: ['魔女軸', '呪い軸', '墓地利用'],
  },
  {
    id: 'garon',
    name: '獣王ガロン',
    attribute: '原始',
    deckType: 'ビート',
    icon: '🌿',
    description: 'パワー重視、単純',
    baseWinRate: 0.5, // 8勝8敗
    deckVariants: ['粘液獣軸', '岩狸軸', '大型軸'],
  },
  {
    id: 'nova',
    name: '機工士ノヴァ',
    attribute: '未来',
    deckType: 'コンボ',
    icon: '⚙️',
    description: 'ハマれば強い、ムラがある',
    baseWinRate: 0.4375, // 7勝9敗
    deckVariants: ['ゴーレム軸', '未来鴉軸', '展開軸'],
  },
  {
    id: 'masked',
    name: '謎の仮面',
    attribute: '混合',
    deckType: '禁忌軸',
    icon: '🎭',
    description: '読めない、たまに爆発',
    baseWinRate: 0.3125, // 5勝11敗
    deckVariants: ['禁忌軸', '混合ビート', '奇襲型'],
  },
  {
    id: 'toma',
    name: '新人トーマ',
    attribute: '混合',
    deckType: '初心者構築',
    icon: '🌱',
    description: '弱いがたまに奇跡',
    baseWinRate: 0.125, // 2勝14敗
    deckVariants: ['初心者構築', '借り物デッキ', '運任せ'],
  },
];

// ========================================
// オッズ計算
// ========================================

/**
 * 勝率からオッズを計算
 * @param {number} winRate - 勝率 (0-1)
 * @returns {number} オッズ
 */
export function winRateToOdds(winRate) {
  if (winRate <= 0) return 99.99;
  if (winRate >= 1) return 1.01;
  const odds = 1 / winRate;
  return Math.max(1.01, Math.round(odds * 100) / 100);
}

/**
 * NPCのオッズを計算
 * @param {Object} npc - NPC情報
 * @param {Array} allParticipants - 全参加者
 * @returns {number} オッズ
 */
export function calculateNPCOdds(npc, allParticipants) {
  // 基本勝率を参加者数で調整
  const totalWinRate = allParticipants.reduce((sum, p) => sum + p.baseWinRate, 0);
  const adjustedWinRate = npc.baseWinRate / totalWinRate;
  return winRateToOdds(adjustedWinRate);
}

// ========================================
// トーナメント生成
// ========================================

/**
 * トーナメント参加者を選出
 * @param {number} count - 参加人数
 * @returns {Array} 参加者リスト
 */
export function selectParticipants(count) {
  const shuffled = [...NPC_PARTICIPANTS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // 足りない場合は重複許可で追加
  while (selected.length < count) {
    const clone = { ...shuffled[selected.length % shuffled.length] };
    clone.id = `${clone.id}_${selected.length}`;
    clone.name = `${clone.name}II`;
    selected.push(clone);
  }

  return selected;
}

/**
 * トーナメントブラケットを生成
 * @param {Array} participants - 参加者リスト
 * @returns {Object} トーナメントブラケット
 */
export function generateBracket(participants) {
  const rounds = Math.ceil(Math.log2(participants.length));
  const bracket = {
    rounds: [],
    participants: [...participants],
  };

  // 1回戦の組み合わせ
  const firstRound = [];
  for (let i = 0; i < participants.length; i += 2) {
    firstRound.push({
      matchId: `R1_M${i / 2}`,
      player1: participants[i],
      player2: participants[i + 1] || null, // 不戦勝
      winner: null,
      result: null,
    });
  }
  bracket.rounds.push(firstRound);

  // 以降のラウンド（空で初期化）
  let matchCount = firstRound.length / 2;
  for (let r = 2; r <= rounds; r++) {
    const round = [];
    for (let m = 0; m < matchCount; m++) {
      round.push({
        matchId: `R${r}_M${m}`,
        player1: null,
        player2: null,
        winner: null,
        result: null,
      });
    }
    bracket.rounds.push(round);
    matchCount = Math.ceil(matchCount / 2);
  }

  return bracket;
}

// ========================================
// 試合シミュレーション
// ========================================

/**
 * NPC用のダミーデッキを生成
 * @param {Object} npc - NPC情報
 * @returns {Array} デッキ
 */
function generateNPCDeck(npc) {
  const deck = [];
  const attribute = npc.attribute === '混合' ? '炎' : npc.attribute;

  for (let i = 0; i < 40; i++) {
    // 勝率に応じてステータスを調整
    const baseStats = 800 + Math.floor(npc.baseWinRate * 400);
    deck.push({
      id: `NPC_${npc.id}_${i}`,
      uniqueId: `NPC_${npc.id}_${i}_${Date.now()}_${Math.random()}`,
      name: `${npc.name}のカード${i}`,
      type: 'monster',
      attribute: attribute,
      cost: (i % 4) + 1,
      attack: baseStats + (i * 30),
      hp: baseStats + (i * 30),
      category: `【${npc.deckType}】`,
      effect: '',
    });
  }

  return deck;
}

/**
 * 1試合をシミュレート
 * @param {Object} player1 - プレイヤー1
 * @param {Object} player2 - プレイヤー2
 * @returns {Object} 試合結果
 */
export function simulateMatch(player1, player2) {
  if (!player2) {
    // 不戦勝
    return {
      winner: player1,
      loser: null,
      turns: 0,
      p1Life: 6000,
      p2Life: 0,
      isBye: true,
    };
  }

  const deck1 = generateNPCDeck(player1);
  const deck2 = generateNPCDeck(player2);

  const result = simulateGame({ deck1, deck2 });

  return {
    winner: result.winner === 1 ? player1 : player2,
    loser: result.winner === 1 ? player2 : player1,
    turns: result.turns,
    p1Life: result.p1Life,
    p2Life: result.p2Life,
    isBye: false,
  };
}

/**
 * トーナメント全体をシミュレート
 * @param {Object} bracket - トーナメントブラケット
 * @returns {Object} 完了したブラケット
 */
export function simulateTournament(bracket) {
  const completedBracket = JSON.parse(JSON.stringify(bracket));

  for (let roundIndex = 0; roundIndex < completedBracket.rounds.length; roundIndex++) {
    const round = completedBracket.rounds[roundIndex];
    const nextRound = completedBracket.rounds[roundIndex + 1];

    for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
      const match = round[matchIndex];

      // 前のラウンドから勝者を引き継ぐ
      if (roundIndex > 0) {
        const prevRound = completedBracket.rounds[roundIndex - 1];
        const sourceMatch1 = prevRound[matchIndex * 2];
        const sourceMatch2 = prevRound[matchIndex * 2 + 1];
        match.player1 = sourceMatch1?.winner || null;
        match.player2 = sourceMatch2?.winner || null;
      }

      // 試合実行
      if (match.player1) {
        const result = simulateMatch(match.player1, match.player2);
        match.winner = result.winner;
        match.result = result;
      }

      // 次のラウンドに勝者を設定
      if (nextRound && match.winner) {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const isFirstPlayer = matchIndex % 2 === 0;
        if (isFirstPlayer) {
          nextRound[nextMatchIndex].player1 = match.winner;
        } else {
          nextRound[nextMatchIndex].player2 = match.winner;
        }
      }
    }
  }

  return completedBracket;
}

// ========================================
// トーナメント作成・実行
// ========================================

/**
 * 新しいトーナメントを作成
 * @param {string} typeId - トーナメントタイプID
 * @returns {Object} トーナメント情報
 */
export function createTournament(typeId) {
  const type = Object.values(TOURNAMENT_TYPES).find(t => t.id === typeId);
  if (!type) {
    throw new Error(`Unknown tournament type: ${typeId}`);
  }

  const participants = selectParticipants(type.participants);
  const bracket = generateBracket(participants);

  // 各参加者のオッズを計算
  const participantsWithOdds = participants.map(p => ({
    ...p,
    odds: calculateNPCOdds(p, participants),
    deckVariant: p.deckVariants[Math.floor(Math.random() * p.deckVariants.length)],
  }));

  return {
    id: `tournament_${Date.now()}`,
    type,
    participants: participantsWithOdds,
    bracket,
    status: 'pending', // pending, running, completed
    createdAt: new Date().toISOString(),
    results: null,
  };
}

/**
 * トーナメントを実行
 * @param {Object} tournament - トーナメント情報
 * @returns {Object} 実行結果付きトーナメント
 */
export function runTournament(tournament) {
  const completedBracket = simulateTournament(tournament.bracket);
  const finalMatch = completedBracket.rounds[completedBracket.rounds.length - 1][0];

  // 順位を確定
  const rankings = [];

  // 1位: 優勝者
  rankings.push({ rank: 1, player: finalMatch.winner, prize: '🥇' });

  // 2位: 決勝敗者
  if (finalMatch.result && !finalMatch.result.isBye) {
    rankings.push({ rank: 2, player: finalMatch.result.loser, prize: '🥈' });
  }

  // 3位: 準決勝敗者（存在する場合）
  if (completedBracket.rounds.length >= 2) {
    const semiFinals = completedBracket.rounds[completedBracket.rounds.length - 2];
    semiFinals.forEach(match => {
      if (match.result && !match.result.isBye && match.result.loser) {
        rankings.push({ rank: 3, player: match.result.loser, prize: '🥉' });
      }
    });
  }

  return {
    ...tournament,
    bracket: completedBracket,
    status: 'completed',
    completedAt: new Date().toISOString(),
    results: {
      winner: finalMatch.winner,
      rankings,
      totalMatches: completedBracket.rounds.reduce((sum, round) =>
        sum + round.filter(m => m.result && !m.result.isBye).length, 0),
    },
  };
}

// ========================================
// 賭け計算
// ========================================

/**
 * 賭けの払い戻しを計算
 * @param {Object} bet - 賭け情報 { npcId, amount, type }
 * @param {Object} tournament - 完了したトーナメント
 * @returns {Object} 払い戻し情報
 */
export function calculatePayout(bet, tournament) {
  const participant = tournament.participants.find(p => p.id === bet.npcId);
  if (!participant) {
    return { won: false, payout: 0, message: '参加者が見つかりません' };
  }

  const results = tournament.results;
  if (!results) {
    return { won: false, payout: 0, message: 'トーナメント未完了' };
  }

  switch (bet.type) {
    case 'win': // 単勝（優勝予想）
      if (results.winner.id === bet.npcId) {
        const payout = Math.floor(bet.amount * participant.odds);
        return {
          won: true,
          payout,
          message: `${participant.name}が優勝！ オッズ${participant.odds}倍で${payout}G獲得！`,
        };
      }
      return { won: false, payout: 0, message: `${participant.name}は優勝できませんでした` };

    case 'place': // 複勝（上位半分入り）
      const topHalf = Math.ceil(tournament.participants.length / 2);
      const ranking = results.rankings.find(r => r.player.id === bet.npcId);
      if (ranking && ranking.rank <= topHalf) {
        const placeOdds = Math.max(1.2, participant.odds * 0.4);
        const payout = Math.floor(bet.amount * placeOdds);
        return {
          won: true,
          payout,
          message: `${participant.name}が${ranking.rank}位入賞！ ${payout}G獲得！`,
        };
      }
      return { won: false, payout: 0, message: `${participant.name}は上位に入れませんでした` };

    default:
      return { won: false, payout: 0, message: '不明な賭けタイプ' };
  }
}

// ========================================
// オッズ事前計算（シミュレーション）
// ========================================

/**
 * シミュレーションでオッズを事前計算
 * @param {Array} participants - 参加者リスト
 * @param {number} simCount - シミュレーション回数
 * @returns {Object} 各参加者の勝率とオッズ
 */
export function precalculateOdds(participants, simCount = 10) {
  const wins = {};
  participants.forEach(p => { wins[p.id] = 0; });

  for (let i = 0; i < simCount; i++) {
    const bracket = generateBracket([...participants]);
    const completed = simulateTournament(bracket);
    const winner = completed.rounds[completed.rounds.length - 1][0].winner;
    if (winner) {
      wins[winner.id]++;
    }
  }

  const result = {};
  participants.forEach(p => {
    const winRate = wins[p.id] / simCount;
    result[p.id] = {
      wins: wins[p.id],
      winRate: Math.round(winRate * 1000) / 10,
      odds: winRateToOdds(winRate),
    };
  });

  return result;
}
