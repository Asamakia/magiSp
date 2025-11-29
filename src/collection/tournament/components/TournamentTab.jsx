/**
 * Tournament Tab - 大会タブコンポーネント
 *
 * 商人ギルド内で大会への賭けを行うUI
 *
 * Created: 2025-11-29
 */

import React, { useState, useMemo } from 'react';
import {
  TOURNAMENT_CONFIG,
  TOURNAMENT_STATUS,
  TOURNAMENT_TYPES,
  getRoundName,
} from '../systems/tournamentManager';
import {
  getCompetitorDisplayName,
  getCompetitorPortrait,
} from '../data/competitors';
import {
  BET_TYPES,
  BET_TYPE_NAMES,
  validateBet,
  createBet,
  addBet,
  removeBet,
  getOdds,
  getTotalBetAmount,
  getRemainingBetLimit,
  getBetTypeDescription,
  calculatePayouts,
} from '../systems/bettingSystem';
import {
  INFO_TYPES,
  INFO_TYPE_NAMES,
  getInfoPrice,
  validateInfoPurchase,
  hasInfo,
  getPurchasedInfo,
  getAnalysisComment,
} from '../systems/deckInfoSystem';
import TournamentBracket from './TournamentBracket';

// ========================================
// スタイル定義
// ========================================

const styles = {
  container: {
    padding: '16px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tournamentCard: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 100%)',
    borderRadius: '12px',
    padding: '16px',
    border: '2px solid #6b4ce6',
    marginBottom: '16px',
  },
  tournamentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  tournamentName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
  },
  deadline: {
    fontSize: '14px',
    color: '#ff9500',
    fontWeight: 'bold',
  },
  participantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '8px',
    marginBottom: '16px',
  },
  participantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    background: 'rgba(107,76,230,0.2)',
    borderRadius: '8px',
  },
  participantPortrait: {
    fontSize: '20px',
  },
  participantName: {
    fontSize: '12px',
    color: '#e0e0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  betSection: {
    marginTop: '16px',
    padding: '16px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
  },
  betTypeSelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  betTypeButton: {
    flex: 1,
    padding: '10px 8px',
    borderRadius: '8px',
    border: '2px solid #4a4a6a',
    background: 'transparent',
    color: '#a0a0a0',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  },
  betTypeButtonActive: {
    border: '2px solid #6b4ce6',
    background: 'rgba(107,76,230,0.3)',
    color: '#fff',
  },
  oddsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '8px',
    marginBottom: '16px',
  },
  oddsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'rgba(50,50,80,0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  oddsItemSelected: {
    border: '2px solid #ffd700',
    background: 'rgba(255,215,0,0.1)',
  },
  oddsValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  betInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '8px',
    border: '2px solid #4a4a6a',
    background: 'rgba(30,30,50,0.8)',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
  },
  quickButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(107,76,230,0.5)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  betButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(90deg, #6b4ce6, #9d4ce6)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  },
  betButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  currentBets: {
    marginTop: '16px',
  },
  betListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'rgba(50,50,80,0.5)',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  betListInfo: {
    flex: 1,
  },
  betListType: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  betListTarget: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  betListAmount: {
    fontSize: '14px',
    color: '#ffd700',
    marginRight: '12px',
  },
  cancelButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255,100,100,0.5)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
  },
  noTournament: {
    textAlign: 'center',
    padding: '40px',
    color: '#a0a0a0',
  },
  historyItem: {
    background: 'rgba(50,50,80,0.5)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  historyName: {
    fontWeight: 'bold',
    color: '#fff',
  },
  historyProfit: {
    fontWeight: 'bold',
  },
  historyProfitPositive: {
    color: '#4caf50',
  },
  historyProfitNegative: {
    color: '#f44336',
  },
  historyResult: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  totalStats: {
    background: 'rgba(107,76,230,0.2)',
    borderRadius: '8px',
    padding: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    textAlign: 'center',
  },
  statItem: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  // デッキ情報購入UI
  deckInfoSection: {
    marginTop: '16px',
    padding: '16px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
  },
  deckInfoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  competitorInfoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(50,50,80,0.5)',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  competitorIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '120px',
  },
  infoButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    flex: 1,
  },
  infoButton: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #6b4ce6',
    background: 'rgba(107,76,230,0.3)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  infoButtonPurchased: {
    border: '1px solid #4caf50',
    background: 'rgba(76,175,80,0.3)',
    cursor: 'default',
  },
  infoButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  infoPrice: {
    fontSize: '10px',
    color: '#ffd700',
  },
  purchasedBadge: {
    fontSize: '10px',
    color: '#4caf50',
  },
  deckInfoDisplay: {
    marginTop: '8px',
    padding: '10px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
    fontSize: '12px',
  },
  deckInfoLabel: {
    color: '#a0a0a0',
    marginBottom: '4px',
  },
  deckInfoValue: {
    color: '#fff',
  },
  keyCardList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  keyCardItem: {
    padding: '2px 6px',
    background: 'rgba(107,76,230,0.3)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#e0e0e0',
  },
  fullListItem: {
    padding: '2px 4px',
    background: 'rgba(50,50,80,0.5)',
    borderRadius: '3px',
    fontSize: '10px',
    color: '#c0c0c0',
  },
  analysisComment: {
    marginTop: '8px',
    padding: '8px',
    background: 'rgba(255,215,0,0.1)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#ffd700',
    fontStyle: 'italic',
  },
};

// ========================================
// デッキ情報購入サブコンポーネント
// ========================================

const DeckInfoSection = ({
  tournament,
  tournamentData,
  playerGold,
  expandedCompetitor,
  setExpandedCompetitor,
  onPurchaseInfo,
}) => {
  // 情報購入ハンドラ
  const handlePurchase = (competitorId, infoType) => {
    const validation = validateInfoPurchase({
      competitorId,
      infoType,
      tournament,
      purchasedInfo: tournamentData.purchasedInfo,
      playerGold,
    });

    if (validation.valid && onPurchaseInfo) {
      onPurchaseInfo(competitorId, infoType, tournament);
    }
  };

  // 情報タイプのボタンを描画
  const renderInfoButton = (competitorId, infoType) => {
    const purchased = hasInfo(tournamentData, tournament.id, competitorId, infoType);
    const price = getInfoPrice(tournament.type, infoType);
    const canAfford = playerGold >= price;

    if (purchased) {
      return (
        <div
          key={infoType}
          style={{
            ...styles.infoButton,
            ...styles.infoButtonPurchased,
          }}
        >
          <span>{INFO_TYPE_NAMES[infoType]}</span>
          <span style={styles.purchasedBadge}>✓ 購入済</span>
        </div>
      );
    }

    return (
      <button
        key={infoType}
        style={{
          ...styles.infoButton,
          ...(canAfford ? {} : styles.infoButtonDisabled),
        }}
        onClick={() => canAfford && handlePurchase(competitorId, infoType)}
        disabled={!canAfford}
      >
        <span>{INFO_TYPE_NAMES[infoType]}</span>
        <span style={styles.infoPrice}>{price.toLocaleString()}G</span>
      </button>
    );
  };

  // 購入済み情報の表示
  const renderPurchasedInfo = (competitorId) => {
    const info = getPurchasedInfo(tournamentData, tournament.id, competitorId);
    if (!info) return null;

    const participantInfo = tournament.participantDecks?.[competitorId];
    const deckKey = participantInfo?.deckKey;

    return (
      <div style={styles.deckInfoDisplay}>
        {/* デッキ型 */}
        {info.deckType && (
          <div style={{ marginBottom: '8px' }}>
            <div style={styles.deckInfoLabel}>📋 デッキ型</div>
            <div style={styles.deckInfoValue}>{info.deckType}</div>
          </div>
        )}

        {/* キーカード */}
        {info.keyCards && info.keyCards.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div style={styles.deckInfoLabel}>⭐ キーカード</div>
            <div style={styles.keyCardList}>
              {info.keyCards.map((card, idx) => (
                <span key={idx} style={styles.keyCardItem}>
                  {card.id} ×{card.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* フルリスト */}
        {info.fullList && info.fullList.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div style={styles.deckInfoLabel}>📜 フルリスト ({info.fullList.reduce((sum, c) => sum + c.count, 0)}枚)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {info.fullList.map((card, idx) => (
                <span key={idx} style={styles.fullListItem}>
                  {card.id} ×{card.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 分析コメント */}
        {deckKey && (info.deckType || info.keyCards) && (
          <div style={styles.analysisComment}>
            💡 {getAnalysisComment(competitorId, deckKey) || '分析データなし'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.deckInfoSection}>
      <div style={styles.sectionTitle}>🔍 デッキ情報</div>
      <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '12px' }}>
        選手のデッキ情報を購入できます。賭けの参考にしてください。
      </div>

      <div style={styles.deckInfoGrid}>
        {tournament.participants.map(competitorId => {
          const isExpanded = expandedCompetitor === competitorId;
          const hasPurchasedAny = hasInfo(tournamentData, tournament.id, competitorId, INFO_TYPES.DECK_TYPE)
            || hasInfo(tournamentData, tournament.id, competitorId, INFO_TYPES.KEY_CARDS)
            || hasInfo(tournamentData, tournament.id, competitorId, INFO_TYPES.FULL_LIST);

          return (
            <div key={competitorId}>
              <div
                style={{
                  ...styles.competitorInfoRow,
                  cursor: hasPurchasedAny ? 'pointer' : 'default',
                  border: isExpanded ? '1px solid #6b4ce6' : '1px solid transparent',
                }}
                onClick={() => hasPurchasedAny && setExpandedCompetitor(isExpanded ? null : competitorId)}
              >
                {/* 選手情報 */}
                <div style={styles.competitorIdentity}>
                  <span style={{ fontSize: '20px' }}>{getCompetitorPortrait(competitorId)}</span>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 'bold' }}>
                    {getCompetitorDisplayName(competitorId)}
                  </span>
                </div>

                {/* 情報購入ボタン */}
                <div style={styles.infoButtons}>
                  {renderInfoButton(competitorId, INFO_TYPES.DECK_TYPE)}
                  {renderInfoButton(competitorId, INFO_TYPES.KEY_CARDS)}
                  {renderInfoButton(competitorId, INFO_TYPES.FULL_LIST)}
                </div>

                {/* 展開インジケータ */}
                {hasPurchasedAny && (
                  <span style={{ color: '#a0a0a0', fontSize: '12px' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                )}
              </div>

              {/* 購入済み情報の表示 */}
              {isExpanded && renderPurchasedInfo(competitorId)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ========================================
// メインコンポーネント
// ========================================

const TournamentTab = ({
  playerData,
  currentBattle,
  onPlaceBet,
  onCancelBet,
  onPurchaseInfo,
  onClaimReward,
}) => {
  const [selectedBetType, setSelectedBetType] = useState(BET_TYPES.WIN);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [expandedCompetitor, setExpandedCompetitor] = useState(null);

  const tournamentData = playerData?.tournamentData || {};
  const tournament = tournamentData.currentTournament;
  const currentBets = tournamentData.currentBets || [];
  const history = tournamentData.history || [];
  const totalStats = tournamentData.totalStats || {};

  // ブロック判定用: 同じブロック内の選手かどうか判定
  const isInSameBlock = useMemo(() => {
    if (!tournament?.participants) return () => false;

    const participants = tournament.participants;
    const half = participants.length / 2;
    const leftBlock = new Set(participants.slice(0, half));
    const rightBlock = new Set(participants.slice(half));

    return (id1, id2) => {
      // 両方が左ブロック or 両方が右ブロック = 同じブロック
      return (leftBlock.has(id1) && leftBlock.has(id2)) ||
             (rightBlock.has(id1) && rightBlock.has(id2));
    };
  }, [tournament?.participants]);

  // オッズリストを取得
  const oddsList = useMemo(() => {
    if (!tournament || !tournament.odds) return [];

    const odds = tournament.odds;
    let items = [];

    if (selectedBetType === BET_TYPES.WIN) {
      items = tournament.participants.map(id => ({
        target: id,
        label: getCompetitorDisplayName(id),
        portrait: getCompetitorPortrait(id),
        odds: odds.win?.[id] || 0,
      }));
    } else if (selectedBetType === BET_TYPES.PLACE) {
      items = tournament.participants.map(id => ({
        target: id,
        label: getCompetitorDisplayName(id),
        portrait: getCompetitorPortrait(id),
        odds: odds.place?.[id] || 0,
      }));
    } else if (selectedBetType === BET_TYPES.EXACTA) {
      // 2連単: 同じブロック内の組み合わせを除外（決勝では当たらない）
      const exactaEntries = Object.entries(odds.exacta || {})
        .map(([key, oddsValue]) => {
          const [first, second] = key.split('-');
          return {
            target: key,
            label: `${getCompetitorDisplayName(first)} → ${getCompetitorDisplayName(second)}`,
            portrait: `${getCompetitorPortrait(first)}→${getCompetitorPortrait(second)}`,
            odds: oddsValue,
            first,
            second,
          };
        })
        // 同じブロック内の組み合わせを除外
        .filter(item => !isInSameBlock(item.first, item.second))
        .sort((a, b) => a.odds - b.odds)
        .slice(0, 12); // 上位12件
      items = exactaEntries;
    }

    return items.sort((a, b) => a.odds - b.odds);
  }, [tournament, selectedBetType, isInSameBlock]);

  // 賭け金額バリデーション
  const betValidation = useMemo(() => {
    if (!tournament || !selectedTarget || !betAmount) {
      return { valid: false, error: null };
    }

    const amount = parseInt(betAmount) || 0;
    const odds = getOdds(tournament, selectedBetType, selectedTarget);

    return validateBet(
      { type: selectedBetType, target: selectedTarget, amount },
      tournament,
      currentBets,
      playerData?.gold || 0
    );
  }, [tournament, selectedBetType, selectedTarget, betAmount, currentBets, playerData?.gold]);

  // 賭けを確定
  const handlePlaceBet = () => {
    if (!betValidation.valid) return;

    const amount = parseInt(betAmount) || 0;
    const odds = getOdds(tournament, selectedBetType, selectedTarget);

    const bet = createBet(selectedBetType, selectedTarget, amount, odds);

    if (onPlaceBet) {
      onPlaceBet(bet);
    }

    // リセット
    setSelectedTarget(null);
    setBetAmount('');
  };

  // 賭けをキャンセル
  const handleCancelBet = (betId) => {
    if (onCancelBet) {
      onCancelBet(betId);
    }
  };

  // 残り賭け可能金額
  const remainingLimit = tournament
    ? getRemainingBetLimit(tournament, currentBets)
    : 0;

  // 払い戻し計算（PENDING_REWARD時に使用）
  const payoutResults = tournament?.status === TOURNAMENT_STATUS.PENDING_REWARD
    ? calculatePayouts(currentBets, tournament)
    : null;

  // 報酬受け取りハンドラ
  const handleClaimReward = () => {
    if (onClaimReward && payoutResults) {
      onClaimReward(payoutResults);
    }
  };

  // 報酬受け取り待ちの大会がある場合
  if (tournament && tournament.status === TOURNAMENT_STATUS.PENDING_REWARD) {
    return (
      <div style={styles.container}>
        {/* 結果表示 */}
        <div style={styles.tournamentCard}>
          <div style={styles.tournamentHeader}>
            <span style={styles.tournamentName}>🏆 {tournament.name}</span>
            <span style={{ ...styles.deadline, color: '#4caf50' }}>終了</span>
          </div>

          {/* 優勝者表示 */}
          <div style={{
            textAlign: 'center',
            padding: '20px',
            background: 'rgba(255,215,0,0.1)',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '8px' }}>
              🏆 優勝
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '48px' }}>
                {getCompetitorPortrait(tournament.finalWinner)}
              </span>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>
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
          <div style={{
            background: 'rgba(107,76,230,0.2)',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
              📊 賭け結果
            </div>

            {payoutResults.bets.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '12px' }}>
                賭けはありませんでした
              </div>
            ) : (
              <>
                {payoutResults.bets.map((bet, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: bet.won ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.1)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: bet.won ? '1px solid #4caf50' : '1px solid #f44336',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#e0e0e0' }}>
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
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: bet.won ? '#4caf50' : '#f44336',
                    }}>
                      {bet.won ? `+${bet.payout.toLocaleString()}G` : `-${bet.amount.toLocaleString()}G`}
                    </span>
                  </div>
                ))}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  padding: '12px',
                  background: 'rgba(255,215,0,0.1)',
                  borderRadius: '8px',
                  border: '1px solid #ffd700',
                }}>
                  <span style={{ fontSize: '16px', color: '#ffd700', fontWeight: 'bold' }}>
                    {payoutResults.totalProfit >= 0 ? '📈 収支' : '📉 収支'}
                  </span>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: payoutResults.totalProfit >= 0 ? '#4caf50' : '#f44336',
                  }}>
                    {payoutResults.totalProfit >= 0 ? '+' : ''}
                    {payoutResults.totalProfit.toLocaleString()}G
                  </span>
                </div>
              </>
            )}

            {/* 報酬受け取りボタン */}
            <button
              style={{
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
              }}
              onClick={handleClaimReward}
            >
              💰 報酬を受け取る ({payoutResults.totalPayout.toLocaleString()}G)
            </button>
          </div>
        </div>

        {/* 通算成績 */}
        {totalStats.totalBets > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📊 通算成績</div>
            <div style={styles.totalStats}>
              <div>
                <div style={styles.statItem}>賭け回数</div>
                <div style={styles.statValue}>{totalStats.totalBets}回</div>
              </div>
              <div>
                <div style={styles.statItem}>的中率</div>
                <div style={styles.statValue}>
                  {totalStats.totalBets > 0
                    ? Math.round((totalStats.totalWins / totalStats.totalBets) * 100)
                    : 0}%
                </div>
              </div>
              <div>
                <div style={styles.statItem}>収支</div>
                <div style={{
                  ...styles.statValue,
                  color: totalStats.totalProfit >= 0 ? '#4caf50' : '#f44336',
                }}>
                  {totalStats.totalProfit >= 0 ? '+' : ''}{totalStats.totalProfit?.toLocaleString()}G
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 大会がない場合
  if (!tournament) {
    return (
      <div style={styles.container}>
        <div style={styles.noTournament}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>
            現在開催中の大会はありません
          </div>
          <div style={{ fontSize: '14px' }}>
            次の大会をお待ちください
          </div>
        </div>

        {/* 通算成績 */}
        {totalStats.totalBets > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📊 通算成績</div>
            <div style={styles.totalStats}>
              <div>
                <div style={styles.statItem}>賭け回数</div>
                <div style={styles.statValue}>{totalStats.totalBets}回</div>
              </div>
              <div>
                <div style={styles.statItem}>的中</div>
                <div style={styles.statValue}>{totalStats.totalWins}回</div>
              </div>
              <div>
                <div style={styles.statItem}>収支</div>
                <div style={{
                  ...styles.statValue,
                  color: totalStats.totalProfit >= 0 ? '#4caf50' : '#f44336',
                }}>
                  {totalStats.totalProfit >= 0 ? '+' : ''}{totalStats.totalProfit?.toLocaleString()}G
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 直近の結果 */}
        {history.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📜 直近の結果</div>
            {history.slice(0, 5).map((entry, index) => (
              <div key={index} style={styles.historyItem}>
                <div style={styles.historyHeader}>
                  <span style={styles.historyName}>{entry.name}</span>
                  <span style={{
                    ...styles.historyProfit,
                    ...(entry.totalProfit >= 0
                      ? styles.historyProfitPositive
                      : styles.historyProfitNegative),
                  }}>
                    {entry.totalProfit >= 0 ? '+' : ''}{entry.totalProfit?.toLocaleString()}G
                  </span>
                </div>
                <div style={styles.historyResult}>
                  優勝: {getCompetitorDisplayName(entry.finalWinner)}
                  {entry.wonCount > 0 && ` (${entry.wonCount}件的中)`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const config = TOURNAMENT_CONFIG[tournament.type];
  const battlesUntilDeadline = tournament.deadline - currentBattle;
  const canBet = tournament.status === TOURNAMENT_STATUS.BETTING && battlesUntilDeadline > 0;

  return (
    <div style={styles.container}>
      {/* 開催中の大会 */}
      <div style={styles.tournamentCard}>
        <div style={styles.tournamentHeader}>
          <span style={styles.tournamentName}>🏆 {tournament.name}</span>
          {canBet ? (
            <span style={styles.deadline}>締切まで あと{battlesUntilDeadline}戦</span>
          ) : (
            <span style={{ ...styles.deadline, color: '#f44336' }}>締切済み</span>
          )}
        </div>

        {/* 出場者 */}
        <div style={styles.participantGrid}>
          {tournament.participants.map(id => (
            <div key={id} style={styles.participantItem}>
              <span style={styles.participantPortrait}>{getCompetitorPortrait(id)}</span>
              <span style={styles.participantName}>{getCompetitorDisplayName(id)}</span>
            </div>
          ))}
        </div>

        {/* トーナメント表 */}
        <TournamentBracket tournament={tournament} />

        {/* 賭け受付中の場合 */}
        {canBet && (
          <div style={styles.betSection}>
            {/* 賭け種類選択 */}
            <div style={styles.betTypeSelector}>
              {Object.entries(BET_TYPE_NAMES).map(([type, name]) => (
                <button
                  key={type}
                  style={{
                    ...styles.betTypeButton,
                    ...(selectedBetType === type ? styles.betTypeButtonActive : {}),
                  }}
                  onClick={() => {
                    setSelectedBetType(type);
                    setSelectedTarget(null);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* オッズ一覧 */}
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '8px' }}>
              {getBetTypeDescription(selectedBetType)}
            </div>
            <div style={styles.oddsGrid}>
              {oddsList.map(item => (
                <div
                  key={item.target}
                  style={{
                    ...styles.oddsItem,
                    ...(selectedTarget === item.target ? styles.oddsItemSelected : {}),
                  }}
                  onClick={() => setSelectedTarget(item.target)}
                >
                  <span style={{ fontSize: '12px', color: '#e0e0e0' }}>
                    {selectedBetType === BET_TYPES.EXACTA
                      ? item.label.split(' → ').map((n, i) => (
                          <span key={i}>{i > 0 && '→'}{n}</span>
                        ))
                      : (
                          <>
                            <span style={{ marginRight: '4px' }}>{item.portrait}</span>
                            {item.label}
                          </>
                        )
                    }
                  </span>
                  <span style={styles.oddsValue}>{item.odds}倍</span>
                </div>
              ))}
            </div>

            {/* 金額入力 */}
            {selectedTarget && (
              <>
                <div style={styles.betInput}>
                  <input
                    type="number"
                    style={styles.input}
                    placeholder="賭け金額"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                  />
                  <button
                    style={styles.quickButton}
                    onClick={() => setBetAmount(String(config.minBet))}
                  >
                    +{config.minBet.toLocaleString()}
                  </button>
                  <button
                    style={styles.quickButton}
                    onClick={() => setBetAmount(String(config.maxBet))}
                  >
                    MAX
                  </button>
                </div>

                {/* エラー表示 */}
                {betValidation.error && (
                  <div style={{ color: '#f44336', fontSize: '12px', marginBottom: '8px' }}>
                    {betValidation.error}
                  </div>
                )}

                {/* 賭けボタン */}
                <button
                  style={{
                    ...styles.betButton,
                    ...(betValidation.valid ? {} : styles.betButtonDisabled),
                  }}
                  onClick={handlePlaceBet}
                  disabled={!betValidation.valid}
                >
                  賭ける ({parseInt(betAmount || 0).toLocaleString()}G)
                </button>
              </>
            )}
          </div>
        )}

        {/* デッキ情報購入セクション */}
        {canBet && (
          <DeckInfoSection
            tournament={tournament}
            tournamentData={tournamentData}
            playerGold={playerData?.gold || 0}
            expandedCompetitor={expandedCompetitor}
            setExpandedCompetitor={setExpandedCompetitor}
            onPurchaseInfo={onPurchaseInfo}
          />
        )}
      </div>

      {/* 現在の賭け */}
      {currentBets.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            💰 現在の賭け（合計 {getTotalBetAmount(currentBets).toLocaleString()}G）
          </div>
          {currentBets.map(bet => (
            <div key={bet.id} style={styles.betListItem}>
              <div style={styles.betListInfo}>
                <div style={styles.betListType}>{BET_TYPE_NAMES[bet.type]}</div>
                <div style={styles.betListTarget}>
                  {bet.type === BET_TYPES.EXACTA
                    ? bet.target.split('-').map(id => getCompetitorDisplayName(id)).join(' → ')
                    : getCompetitorDisplayName(bet.target)
                  }
                </div>
              </div>
              <span style={styles.betListAmount}>
                {bet.amount.toLocaleString()}G × {bet.odds}倍
              </span>
              {canBet && (
                <button
                  style={styles.cancelButton}
                  onClick={() => handleCancelBet(bet.id)}
                >
                  取消
                </button>
              )}
            </div>
          ))}
          <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '8px' }}>
            残り賭け可能: {remainingLimit.toLocaleString()}G
          </div>
        </div>
      )}

      {/* 通算成績 */}
      {totalStats.totalBets > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>📊 通算成績</div>
          <div style={styles.totalStats}>
            <div>
              <div style={styles.statItem}>賭け回数</div>
              <div style={styles.statValue}>{totalStats.totalBets}回</div>
            </div>
            <div>
              <div style={styles.statItem}>的中率</div>
              <div style={styles.statValue}>
                {totalStats.totalBets > 0
                  ? Math.round((totalStats.totalWins / totalStats.totalBets) * 100)
                  : 0}%
              </div>
            </div>
            <div>
              <div style={styles.statItem}>収支</div>
              <div style={{
                ...styles.statValue,
                color: totalStats.totalProfit >= 0 ? '#4caf50' : '#f44336',
              }}>
                {totalStats.totalProfit >= 0 ? '+' : ''}{totalStats.totalProfit?.toLocaleString()}G
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentTab;
