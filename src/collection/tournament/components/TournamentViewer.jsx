/**
 * Tournament Viewer - 大会観戦ダイアログ
 *
 * 大会の試合を観戦し、結果を確認して報酬を受け取るUI
 *
 * Created: 2025-11-29
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TOURNAMENT_STATUS,
  getCompetitorDisplayName,
  getCompetitorPortrait,
  getRoundName,
} from '../index';
import { calculatePayouts } from '../systems/bettingSystem';

// ========================================
// スタイル定義
// ========================================

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #2a2a4a 100%)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '3px solid #6b4ce6',
    boxShadow: '0 0 40px rgba(107,76,230,0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '8px',
    textShadow: '0 0 10px rgba(255,215,0,0.5)',
  },
  subtitle: {
    fontSize: '14px',
    color: '#a0a0a0',
  },
  bracketContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '24px',
    overflowX: 'auto',
    padding: '16px 0',
  },
  roundColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '160px',
  },
  roundTitle: {
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '8px',
  },
  matchCard: {
    background: 'rgba(50,50,80,0.6)',
    borderRadius: '8px',
    padding: '12px',
    border: '2px solid #4a4a6a',
    transition: 'all 0.3s ease',
  },
  matchCardActive: {
    border: '2px solid #ffd700',
    boxShadow: '0 0 15px rgba(255,215,0,0.4)',
  },
  matchCardFinished: {
    opacity: 0.9,
  },
  participant: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '4px',
    marginBottom: '4px',
  },
  participantWinner: {
    background: 'rgba(76,175,80,0.3)',
    border: '1px solid #4caf50',
  },
  participantLoser: {
    opacity: 0.6,
  },
  portrait: {
    fontSize: '20px',
  },
  name: {
    flex: 1,
    fontSize: '12px',
    color: '#e0e0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  vs: {
    textAlign: 'center',
    fontSize: '10px',
    color: '#666',
    margin: '2px 0',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  },
  watchButton: {
    background: 'linear-gradient(90deg, #6b4ce6, #9d4ce6)',
    color: '#fff',
  },
  skipButton: {
    background: 'rgba(100,100,100,0.5)',
    color: '#fff',
  },
  resultSection: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  winnerDisplay: {
    marginBottom: '20px',
  },
  winnerLabel: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '8px',
  },
  winnerInfo: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
  },
  winnerPortrait: {
    fontSize: '48px',
  },
  winnerName: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  payoutSection: {
    background: 'rgba(107,76,230,0.2)',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  payoutTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '12px',
  },
  betResult: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(50,50,80,0.5)',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  betWon: {
    border: '1px solid #4caf50',
    background: 'rgba(76,175,80,0.2)',
  },
  betLost: {
    border: '1px solid #f44336',
    background: 'rgba(244,67,54,0.1)',
  },
  betInfo: {
    fontSize: '13px',
    color: '#e0e0e0',
  },
  betPayout: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  totalPayout: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(255,215,0,0.1)',
    borderRadius: '8px',
    border: '1px solid #ffd700',
  },
  totalLabel: {
    fontSize: '16px',
    color: '#ffd700',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: '20px',
    color: '#ffd700',
    fontWeight: 'bold',
  },
  claimButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(90deg, #ffd700, #ffaa00)',
    color: '#1a1a2e',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '16px',
    transition: 'all 0.2s ease',
  },
  progressBar: {
    height: '4px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6b4ce6, #ffd700)',
    transition: 'width 0.5s ease',
  },
  noBets: {
    textAlign: 'center',
    color: '#a0a0a0',
    padding: '20px',
    fontSize: '14px',
  },
};

// ========================================
// メインコンポーネント
// ========================================

const TournamentViewer = ({
  tournament,
  currentBets = [],
  onClaimReward,
  onClose,
}) => {
  const [viewState, setViewState] = useState('intro'); // intro, watching, result
  const [currentRound, setCurrentRound] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [showingResult, setShowingResult] = useState(false);

  // ラウンド情報を整理
  const rounds = tournament?.results || [];
  const totalRounds = rounds.length;

  // 払い戻し計算
  const payoutResults = calculatePayouts(currentBets, tournament);

  // 次の試合へ進む
  const advanceMatch = useCallback(() => {
    if (currentRound >= totalRounds) {
      setViewState('result');
      return;
    }

    const roundMatches = rounds[currentRound]?.matches || [];
    if (currentMatch < roundMatches.length - 1) {
      setCurrentMatch(prev => prev + 1);
    } else {
      // 次のラウンドへ
      if (currentRound < totalRounds - 1) {
        setCurrentRound(prev => prev + 1);
        setCurrentMatch(0);
      } else {
        setViewState('result');
      }
    }
  }, [currentRound, currentMatch, totalRounds, rounds]);

  // 自動進行
  useEffect(() => {
    if (viewState !== 'watching') return;

    const timer = setTimeout(() => {
      advanceMatch();
    }, 1500); // 1.5秒ごとに進行

    return () => clearTimeout(timer);
  }, [viewState, currentRound, currentMatch, advanceMatch]);

  // 観戦開始
  const handleStartWatching = () => {
    setViewState('watching');
    setCurrentRound(0);
    setCurrentMatch(0);
  };

  // スキップ
  const handleSkip = () => {
    setViewState('result');
  };

  // 報酬受け取り
  const handleClaimReward = () => {
    if (onClaimReward) {
      onClaimReward(payoutResults);
    }
  };

  // 進捗計算
  const calculateProgress = () => {
    if (viewState === 'result') return 100;
    if (viewState === 'intro') return 0;

    let totalMatches = 0;
    let completedMatches = 0;

    rounds.forEach((round, ri) => {
      const matchCount = round.matches?.length || 0;
      totalMatches += matchCount;
      if (ri < currentRound) {
        completedMatches += matchCount;
      } else if (ri === currentRound) {
        completedMatches += currentMatch + 1;
      }
    });

    return totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  };

  // ブラケット描画
  const renderBracket = () => {
    const roundsToShow = [];

    for (let ri = 0; ri < totalRounds; ri++) {
      const round = rounds[ri];
      const isCurrentRound = viewState === 'watching' && ri === currentRound;
      const isPastRound = viewState === 'result' || ri < currentRound;

      roundsToShow.push(
        <div key={ri} style={styles.roundColumn}>
          <div style={styles.roundTitle}>
            {getRoundName(ri + 1, totalRounds)}
          </div>
          {(round?.matches || []).map((match, mi) => {
            const isCurrentMatch = isCurrentRound && mi === currentMatch;
            const isPastMatch = isPastRound || (isCurrentRound && mi < currentMatch);

            return (
              <div
                key={mi}
                style={{
                  ...styles.matchCard,
                  ...(isCurrentMatch ? styles.matchCardActive : {}),
                  ...(isPastMatch ? styles.matchCardFinished : {}),
                }}
              >
                <div
                  style={{
                    ...styles.participant,
                    ...(isPastMatch && match.winner === match.p1 ? styles.participantWinner : {}),
                    ...(isPastMatch && match.winner === match.p2 ? styles.participantLoser : {}),
                  }}
                >
                  <span style={styles.portrait}>{getCompetitorPortrait(match.p1)}</span>
                  <span style={styles.name}>{getCompetitorDisplayName(match.p1)}</span>
                  {isPastMatch && match.winner === match.p1 && <span>🏆</span>}
                </div>
                <div style={styles.vs}>VS</div>
                <div
                  style={{
                    ...styles.participant,
                    ...(isPastMatch && match.winner === match.p2 ? styles.participantWinner : {}),
                    ...(isPastMatch && match.winner === match.p1 ? styles.participantLoser : {}),
                  }}
                >
                  <span style={styles.portrait}>{getCompetitorPortrait(match.p2)}</span>
                  <span style={styles.name}>{getCompetitorDisplayName(match.p2)}</span>
                  {isPastMatch && match.winner === match.p2 && <span>🏆</span>}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return roundsToShow;
  };

  // 結果セクション描画
  const renderResultSection = () => (
    <div style={styles.resultSection}>
      <div style={styles.winnerDisplay}>
        <div style={styles.winnerLabel}>🏆 優勝</div>
        <div style={styles.winnerInfo}>
          <span style={styles.winnerPortrait}>
            {getCompetitorPortrait(tournament.finalWinner)}
          </span>
          <span style={styles.winnerName}>
            {getCompetitorDisplayName(tournament.finalWinner)}
          </span>
        </div>
        {tournament.finalSecond && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#a0a0a0' }}>
            準優勝: {getCompetitorPortrait(tournament.finalSecond)} {getCompetitorDisplayName(tournament.finalSecond)}
          </div>
        )}
      </div>

      {/* 賭け結果 */}
      <div style={styles.payoutSection}>
        <div style={styles.payoutTitle}>📊 賭け結果</div>

        {payoutResults.bets.length === 0 ? (
          <div style={styles.noBets}>賭けはありませんでした</div>
        ) : (
          <>
            {payoutResults.bets.map((bet, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.betResult,
                  ...(bet.won ? styles.betWon : styles.betLost),
                }}
              >
                <span style={styles.betInfo}>
                  {bet.type === 'win' && '単勝: '}
                  {bet.type === 'place' && '複勝: '}
                  {bet.type === 'exacta' && '2連単: '}
                  {bet.type === 'exacta'
                    ? bet.target.split('-').map(id => getCompetitorDisplayName(id)).join('→')
                    : getCompetitorDisplayName(bet.target)
                  }
                  <span style={{ marginLeft: '8px', color: '#a0a0a0' }}>
                    ({bet.amount.toLocaleString()}G × {bet.odds}倍)
                  </span>
                </span>
                <span
                  style={{
                    ...styles.betPayout,
                    color: bet.won ? '#4caf50' : '#f44336',
                  }}
                >
                  {bet.won ? `+${bet.payout.toLocaleString()}G` : `-${bet.amount.toLocaleString()}G`}
                </span>
              </div>
            ))}

            <div style={styles.totalPayout}>
              <span style={styles.totalLabel}>
                {payoutResults.totalProfit >= 0 ? '📈 収支' : '📉 収支'}
              </span>
              <span
                style={{
                  ...styles.totalAmount,
                  color: payoutResults.totalProfit >= 0 ? '#4caf50' : '#f44336',
                }}
              >
                {payoutResults.totalProfit >= 0 ? '+' : ''}
                {payoutResults.totalProfit.toLocaleString()}G
              </span>
            </div>
          </>
        )}
      </div>

      <button
        style={styles.claimButton}
        onClick={handleClaimReward}
      >
        💰 報酬を受け取る ({payoutResults.totalPayout.toLocaleString()}G)
      </button>
    </div>
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <div style={styles.title}>🏆 {tournament?.name}</div>
          <div style={styles.subtitle}>
            {viewState === 'intro' && '大会が開催されました！'}
            {viewState === 'watching' && `${getRoundName(currentRound + 1, totalRounds)} 進行中...`}
            {viewState === 'result' && '大会終了'}
          </div>
        </div>

        {/* 進捗バー */}
        {viewState !== 'intro' && (
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${calculateProgress()}%`,
              }}
            />
          </div>
        )}

        {/* トーナメント表 */}
        <div style={styles.bracketContainer}>
          {renderBracket()}
        </div>

        {/* コントロール */}
        {viewState === 'intro' && (
          <div style={styles.controls}>
            <button
              style={{ ...styles.button, ...styles.watchButton }}
              onClick={handleStartWatching}
            >
              🎬 観戦する
            </button>
            <button
              style={{ ...styles.button, ...styles.skipButton }}
              onClick={handleSkip}
            >
              ⏭ スキップ
            </button>
          </div>
        )}

        {viewState === 'watching' && (
          <div style={styles.controls}>
            <button
              style={{ ...styles.button, ...styles.skipButton }}
              onClick={handleSkip}
            >
              ⏭ 結果へスキップ
            </button>
          </div>
        )}

        {/* 結果セクション */}
        {viewState === 'result' && renderResultSection()}
      </div>
    </div>
  );
};

export default TournamentViewer;
