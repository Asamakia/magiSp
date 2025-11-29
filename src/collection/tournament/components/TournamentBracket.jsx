/**
 * TournamentBracket - トーナメント表表示コンポーネント
 *
 * トーナメントのブラケット構造を可視化して表示。
 * 賭け時に組み合わせの妥当性を確認できるようにする。
 *
 * Created: 2025-11-29
 */

import React from 'react';
import {
  getCompetitorDisplayName,
  getCompetitorPortrait,
} from '../data/competitors';
import { getRoundName } from '../systems/tournamentManager';

// ========================================
// スタイル定義
// ========================================

const styles = {
  container: {
    padding: '16px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    overflowX: 'auto',
  },
  title: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bracketWrapper: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    minWidth: 'fit-content',
  },
  // ラウンド列
  roundColumn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '8px',
  },
  roundLabel: {
    fontSize: '11px',
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: '4px',
    fontWeight: 'bold',
  },
  // 試合ボックス
  matchBox: {
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(50,50,80,0.6)',
    borderRadius: '8px',
    border: '1px solid #4a4a6a',
    overflow: 'hidden',
    minWidth: '120px',
  },
  matchBoxFinal: {
    border: '2px solid #ffd700',
    background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(50,50,80,0.6) 100%)',
  },
  // 選手行
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    fontSize: '11px',
    color: '#e0e0e0',
    borderBottom: '1px solid #3a3a5a',
  },
  playerRowLast: {
    borderBottom: 'none',
  },
  playerRowWinner: {
    background: 'rgba(76,175,80,0.2)',
    color: '#4caf50',
    fontWeight: 'bold',
  },
  playerRowLoser: {
    opacity: 0.5,
  },
  portrait: {
    fontSize: '16px',
    flexShrink: 0,
  },
  playerName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tbd: {
    color: '#666',
    fontStyle: 'italic',
  },
  // コネクター（勝ち上がり線）
  connector: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    position: 'relative',
  },
  connectorLine: {
    width: '100%',
    height: '2px',
    background: '#4a4a6a',
  },
  // レジェンド
  legend: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
    fontSize: '11px',
    color: '#a0a0a0',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  // 決勝情報
  finalInfo: {
    textAlign: 'center',
    marginTop: '12px',
    padding: '8px',
    background: 'rgba(255,215,0,0.1)',
    borderRadius: '8px',
    border: '1px solid #ffd700',
  },
  // シンプル表示用
  simpleContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  halfBracket: {
    padding: '12px',
    background: 'rgba(50,50,80,0.4)',
    borderRadius: '8px',
    border: '1px solid #4a4a6a',
  },
  halfBracketTitle: {
    fontSize: '12px',
    color: '#ffd700',
    marginBottom: '8px',
    fontWeight: 'bold',
  },
  participantList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  participantChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: 'rgba(107,76,230,0.2)',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#e0e0e0',
  },
  vsText: {
    fontSize: '10px',
    color: '#666',
    padding: '0 4px',
  },
  matchupRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '6px',
  },
};

// ========================================
// ヘルパー関数
// ========================================

/**
 * ブラケットからラウンドごとの試合を抽出
 */
function getMatchesByRound(bracket) {
  const rounds = {};
  for (const match of bracket) {
    if (!rounds[match.round]) {
      rounds[match.round] = [];
    }
    rounds[match.round].push(match);
  }
  return rounds;
}

/**
 * 参加者を左右のブロックに分ける
 */
function splitParticipantsIntoBlocks(participants) {
  const half = participants.length / 2;
  return {
    left: participants.slice(0, half),
    right: participants.slice(half),
  };
}

/**
 * 1回戦の組み合わせを抽出
 */
function getFirstRoundMatchups(bracket) {
  return bracket.filter(m => m.round === 1);
}

// ========================================
// サブコンポーネント
// ========================================

/**
 * 選手行コンポーネント
 */
const PlayerRow = ({ competitorId, isWinner, isLoser, isLast }) => {
  if (!competitorId) {
    return (
      <div style={{
        ...styles.playerRow,
        ...(isLast ? styles.playerRowLast : {}),
      }}>
        <span style={styles.portrait}>❓</span>
        <span style={{ ...styles.playerName, ...styles.tbd }}>TBD</span>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.playerRow,
      ...(isLast ? styles.playerRowLast : {}),
      ...(isWinner ? styles.playerRowWinner : {}),
      ...(isLoser ? styles.playerRowLoser : {}),
    }}>
      <span style={styles.portrait}>{getCompetitorPortrait(competitorId)}</span>
      <span style={styles.playerName}>{getCompetitorDisplayName(competitorId)}</span>
      {isWinner && <span>🏆</span>}
    </div>
  );
};

/**
 * 試合ボックスコンポーネント
 */
const MatchBox = ({ match, isFinal }) => {
  const { p1, p2, winner } = match;

  return (
    <div style={{
      ...styles.matchBox,
      ...(isFinal ? styles.matchBoxFinal : {}),
    }}>
      <PlayerRow
        competitorId={p1}
        isWinner={winner === p1}
        isLoser={winner && winner !== p1}
      />
      <PlayerRow
        competitorId={p2}
        isWinner={winner === p2}
        isLoser={winner && winner !== p2}
        isLast
      />
    </div>
  );
};

/**
 * シンプルなブラケット表示（4人用）
 */
const SimpleBracket4 = ({ bracket, participants }) => {
  const firstRound = getFirstRoundMatchups(bracket);
  const blocks = splitParticipantsIntoBlocks(participants);

  return (
    <div style={styles.simpleContainer}>
      {/* 左ブロック */}
      <div style={styles.halfBracket}>
        <div style={styles.halfBracketTitle}>🔷 Aブロック（1回戦）</div>
        {firstRound.slice(0, 1).map((match, idx) => (
          <div key={idx} style={styles.matchupRow}>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p1)} {getCompetitorDisplayName(match.p1)}
            </div>
            <span style={styles.vsText}>vs</span>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p2)} {getCompetitorDisplayName(match.p2)}
            </div>
          </div>
        ))}
      </div>

      {/* 右ブロック */}
      <div style={styles.halfBracket}>
        <div style={styles.halfBracketTitle}>🔶 Bブロック（1回戦）</div>
        {firstRound.slice(1, 2).map((match, idx) => (
          <div key={idx} style={styles.matchupRow}>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p1)} {getCompetitorDisplayName(match.p1)}
            </div>
            <span style={styles.vsText}>vs</span>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p2)} {getCompetitorDisplayName(match.p2)}
            </div>
          </div>
        ))}
      </div>

      {/* 説明 */}
      <div style={{
        fontSize: '11px',
        color: '#a0a0a0',
        textAlign: 'center',
        marginTop: '8px',
      }}>
        💡 Aブロック勝者 vs Bブロック勝者 で決勝
      </div>
    </div>
  );
};

/**
 * シンプルなブラケット表示（8人用）
 */
const SimpleBracket8 = ({ bracket, participants }) => {
  const firstRound = getFirstRoundMatchups(bracket);
  const blocks = splitParticipantsIntoBlocks(participants);

  return (
    <div style={styles.simpleContainer}>
      {/* 左ブロック */}
      <div style={styles.halfBracket}>
        <div style={styles.halfBracketTitle}>🔷 Aブロック</div>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px' }}>
          ※ 勝者同士で準決勝 → Aブロック代表
        </div>
        {firstRound.slice(0, 2).map((match, idx) => (
          <div key={idx} style={styles.matchupRow}>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p1)} {getCompetitorDisplayName(match.p1)}
            </div>
            <span style={styles.vsText}>vs</span>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p2)} {getCompetitorDisplayName(match.p2)}
            </div>
          </div>
        ))}
      </div>

      {/* 右ブロック */}
      <div style={styles.halfBracket}>
        <div style={styles.halfBracketTitle}>🔶 Bブロック</div>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px' }}>
          ※ 勝者同士で準決勝 → Bブロック代表
        </div>
        {firstRound.slice(2, 4).map((match, idx) => (
          <div key={idx} style={styles.matchupRow}>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p1)} {getCompetitorDisplayName(match.p1)}
            </div>
            <span style={styles.vsText}>vs</span>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p2)} {getCompetitorDisplayName(match.p2)}
            </div>
          </div>
        ))}
      </div>

      {/* 説明 */}
      <div style={{
        fontSize: '11px',
        color: '#a0a0a0',
        textAlign: 'center',
        marginTop: '8px',
      }}>
        💡 Aブロック代表 vs Bブロック代表 で決勝
      </div>
    </div>
  );
};

/**
 * シンプルなブラケット表示（16人用）
 */
const SimpleBracket16 = ({ bracket, participants }) => {
  const firstRound = getFirstRoundMatchups(bracket);

  return (
    <div style={styles.simpleContainer}>
      {/* Aブロック */}
      <div style={styles.halfBracket}>
        <div style={styles.halfBracketTitle}>🔷 Aブロック（準々決勝進出者を決定）</div>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px' }}>
          ※ このブロックから決勝進出者1名
        </div>
        {firstRound.slice(0, 4).map((match, idx) => (
          <div key={idx} style={styles.matchupRow}>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p1)} {getCompetitorDisplayName(match.p1)}
            </div>
            <span style={styles.vsText}>vs</span>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p2)} {getCompetitorDisplayName(match.p2)}
            </div>
          </div>
        ))}
      </div>

      {/* Bブロック */}
      <div style={styles.halfBracket}>
        <div style={styles.halfBracketTitle}>🔶 Bブロック（準々決勝進出者を決定）</div>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px' }}>
          ※ このブロックから決勝進出者1名
        </div>
        {firstRound.slice(4, 8).map((match, idx) => (
          <div key={idx} style={styles.matchupRow}>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p1)} {getCompetitorDisplayName(match.p1)}
            </div>
            <span style={styles.vsText}>vs</span>
            <div style={styles.participantChip}>
              {getCompetitorPortrait(match.p2)} {getCompetitorDisplayName(match.p2)}
            </div>
          </div>
        ))}
      </div>

      {/* 説明 */}
      <div style={{
        fontSize: '11px',
        color: '#a0a0a0',
        textAlign: 'center',
        marginTop: '8px',
      }}>
        💡 Aブロック代表 vs Bブロック代表 で決勝
      </div>
    </div>
  );
};

// ========================================
// メインコンポーネント
// ========================================

const TournamentBracket = ({ tournament, showResults = false }) => {
  if (!tournament || !tournament.bracket || tournament.bracket.length === 0) {
    return null;
  }

  const { bracket, participants } = tournament;
  const numParticipants = participants.length;
  const numRounds = Math.log2(numParticipants);

  // ブロック分けの説明テキストを生成
  const getBlockExplanation = () => {
    const blocks = splitParticipantsIntoBlocks(participants);
    const leftNames = blocks.left.map(id => getCompetitorDisplayName(id)).join('、');
    const rightNames = blocks.right.map(id => getCompetitorDisplayName(id)).join('、');

    return (
      <div style={{
        fontSize: '11px',
        color: '#888',
        marginTop: '8px',
        padding: '8px',
        background: 'rgba(255,215,0,0.05)',
        borderRadius: '6px',
        border: '1px dashed #ffd700',
      }}>
        <div style={{ marginBottom: '4px' }}>
          <strong style={{ color: '#6b9eff' }}>🔷 Aブロック:</strong> {leftNames}
        </div>
        <div>
          <strong style={{ color: '#ff9500' }}>🔶 Bブロック:</strong> {rightNames}
        </div>
        <div style={{ marginTop: '8px', color: '#ffd700' }}>
          ⚠️ 同じブロック内の選手同士は決勝で対戦しません。
          <br />
          2連単を賭ける際は、異なるブロックから1名ずつ選んでください。
        </div>
      </div>
    );
  };

  // 決勝でありえる組み合わせを計算
  const getPossibleFinalists = () => {
    const blocks = splitParticipantsIntoBlocks(participants);
    const possible = [];

    for (const left of blocks.left) {
      for (const right of blocks.right) {
        possible.push(`${left}-${right}`);
        possible.push(`${right}-${left}`);
      }
    }

    return possible;
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        📋 トーナメント表
      </div>

      {/* 参加者数に応じたブラケット表示 */}
      {numParticipants === 4 && (
        <SimpleBracket4 bracket={bracket} participants={participants} />
      )}
      {numParticipants === 8 && (
        <SimpleBracket8 bracket={bracket} participants={participants} />
      )}
      {numParticipants === 16 && (
        <SimpleBracket16 bracket={bracket} participants={participants} />
      )}

      {/* ブロック分けの説明 */}
      {getBlockExplanation()}

      {/* レジェンド */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, background: 'rgba(76,175,80,0.5)' }} />
          <span>勝者</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, background: 'rgba(100,100,100,0.5)' }} />
          <span>敗者</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, border: '2px solid #ffd700' }} />
          <span>決勝</span>
        </div>
      </div>
    </div>
  );
};

export default TournamentBracket;
