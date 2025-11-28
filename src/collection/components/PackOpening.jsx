/**
 * パック開封演出画面
 *
 * 開封されたカードを演出付きで表示
 */

import React, { useState, useEffect } from 'react';
import { ATTRIBUTE_COLORS } from '../../utils/constants';
import { RARITY_COLORS, RARITY_NAMES } from '../data/constants';
import { valueCalculator } from '../systems/valueCalculator';
import CardDetail from './CardDetail';

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
    background: 'linear-gradient(180deg, rgba(10,10,26,0.98) 0%, rgba(26,26,58,0.98) 50%, rgba(10,10,26,0.98) 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    animation: 'fadeIn 0.5s ease-out',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '32px',
    textShadow: '0 0 20px rgba(255,215,0,0.5)',
  },
  cardsContainer: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '800px',
    padding: '16px',
  },
  cardWrapper: {
    perspective: '1000px',
    cursor: 'pointer',
  },
  cardInner: {
    width: '140px',
    height: '190px',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.8s ease-out',
  },
  cardFlipped: {
    transform: 'rotateY(180deg)',
  },
  cardBack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #4a3a7a 0%, #6b4ce6 50%, #4a3a7a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    boxShadow: '0 4px 20px rgba(107,76,230,0.5)',
    border: '3px solid #8b6cf6',
  },
  cardFront: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    padding: '6px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.4)',
  },
  costBadge: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
  },
  rarityBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
  },
  cardBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12px 8px',
  },
  cardName: {
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    textShadow: '0 1px 3px rgba(0,0,0,0.7)',
    marginBottom: '8px',
  },
  cardStats: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.9)',
  },
  cardFooter: {
    padding: '6px 8px',
    background: 'rgba(0,0,0,0.5)',
    fontSize: '11px',
    color: '#a0a0a0',
    textAlign: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%)',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '8px',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(255,75,117,0.5)',
  },
  sparkle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    borderRadius: '12px',
    boxShadow: '0 0 30px rgba(255,215,0,0.5), inset 0 0 30px rgba(255,215,0,0.2)',
    animation: 'sparkle 1.5s ease-in-out infinite',
  },
  controlsContainer: {
    marginTop: '32px',
    display: 'flex',
    gap: '16px',
  },
  button: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  revealAllButton: {
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    color: '#fff',
  },
  closeButton: {
    background: 'rgba(107,76,230,0.3)',
    color: '#e0e0e0',
    border: '1px solid rgba(107,76,230,0.5)',
  },
  summaryText: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#a0a0a0',
  },
  summaryHighlight: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
};

// ========================================
// キーフレームアニメーション
// ========================================

const keyframeStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes sparkle {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  @keyframes cardAppear {
    0% { transform: scale(0.5) translateY(50px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }

  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3); }
    50% { box-shadow: 0 0 40px rgba(255,215,0,0.6); }
  }
`;

// ========================================
// カードコンポーネント
// ========================================

const PackCard = ({ cardData, index, isFlipped, onFlip, onShowDetail, isNew }) => {
  const { card, rarity } = cardData;
  const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
  const rarityColor = RARITY_COLORS[rarity] || '#808080';
  const isMonster = card.type === 'monster';
  const isRare = ['SR', 'UR', 'HR', 'SEC', 'ALT', 'SP', 'GR'].includes(rarity);

  const handleClick = () => {
    if (!isFlipped) {
      onFlip(index);
    } else {
      onShowDetail(cardData);
    }
  };

  return (
    <div
      style={{
        ...styles.cardWrapper,
        animation: `cardAppear 0.5s ease-out ${index * 0.1}s both`,
      }}
      onClick={handleClick}
    >
      <div style={{
        ...styles.cardInner,
        ...(isFlipped ? styles.cardFlipped : {}),
      }}>
        {/* カード裏面 */}
        <div style={styles.cardBack}>
          <span>🎴</span>
        </div>

        {/* カード表面 */}
        <div style={{
          ...styles.cardFront,
          background: colors.bg,
          border: `3px solid ${rarityColor}`,
          boxShadow: `0 4px 20px ${rarityColor}60`,
        }}>
          {/* 新規バッジ */}
          {isNew && (
            <div style={styles.newBadge}>NEW</div>
          )}

          {/* レアカード演出 */}
          {isRare && isFlipped && (
            <div style={{
              ...styles.sparkle,
              animation: 'glowPulse 1.5s ease-in-out infinite',
            }} />
          )}

          {/* ヘッダー */}
          <div style={styles.cardHeader}>
            <div style={styles.costBadge}>{card.cost}</div>
            <div style={{
              ...styles.rarityBadge,
              background: rarityColor,
            }}>
              {rarity}
            </div>
          </div>

          {/* ボディ */}
          <div style={styles.cardBody}>
            <div style={styles.cardName}>{card.name}</div>
            {isMonster && (
              <div style={styles.cardStats}>
                ATK {card.attack} / HP {card.hp}
              </div>
            )}
          </div>

          {/* フッター */}
          <div style={styles.cardFooter}>
            {card.attribute} • {RARITY_NAMES[rarity] || rarity}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================
// メインコンポーネント
// ========================================

const PackOpening = ({
  cards,
  onClose,
  existingCollection = [],
}) => {
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState(null);

  // カード詳細を表示
  const handleShowDetail = (cardData) => {
    setSelectedCardForDetail(cardData);
  };

  // カード詳細を閉じる
  const handleCloseDetail = () => {
    setSelectedCardForDetail(null);
  };

  // スタイルシートを追加
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = keyframeStyles;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  // カードが新規かどうかを判定
  const isNewCard = (cardId, rarity) => {
    // 既存コレクションに同じカード・レアリティがあるか確認
    return !existingCollection.some(
      c => c.cardId === cardId && c.rarity === rarity && c.quantity > 0
    );
  };

  // カードをめくる
  const flipCard = (index) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      newSet.add(index);

      // 全カードがめくられたかチェック
      if (newSet.size === cards.length) {
        setAllRevealed(true);
      }

      return newSet;
    });
  };

  // 全てめくる
  const revealAll = () => {
    const allIndices = new Set(cards.map((_, i) => i));
    setFlippedCards(allIndices);
    setAllRevealed(true);
  };

  // サマリー計算
  const getSummary = () => {
    const rarityCounts = {};
    let newCardCount = 0;

    cards.forEach(({ cardId, rarity }) => {
      rarityCounts[rarity] = (rarityCounts[rarity] || 0) + 1;
      if (isNewCard(cardId, rarity)) {
        newCardCount++;
      }
    });

    return { rarityCounts, newCardCount };
  };

  const summary = getSummary();

  return (
    <div style={styles.overlay}>
      {/* タイトル */}
      <div style={styles.title}>
        パック開封！
      </div>

      {/* カード表示 */}
      <div style={styles.cardsContainer}>
        {cards.map((cardData, index) => (
          <PackCard
            key={`${cardData.cardId}_${cardData.rarity}_${index}`}
            cardData={cardData}
            index={index}
            isFlipped={flippedCards.has(index)}
            onFlip={flipCard}
            onShowDetail={handleShowDetail}
            isNew={isNewCard(cardData.cardId, cardData.rarity)}
          />
        ))}
      </div>

      {/* サマリー表示（全カードめくり後） */}
      {allRevealed && (
        <div style={styles.summaryText}>
          獲得:
          {Object.entries(summary.rarityCounts)
            .sort((a, b) => {
              const order = ['GR', 'SP', 'ALT', 'SEC', 'HR', 'UR', 'SR', 'R', 'UC', 'C'];
              return order.indexOf(a[0]) - order.indexOf(b[0]);
            })
            .map(([rarity, count]) => (
              <span key={rarity} style={{
                color: RARITY_COLORS[rarity] || '#e0e0e0',
                marginLeft: '8px',
              }}>
                {rarity}×{count}
              </span>
            ))
          }
          {summary.newCardCount > 0 && (
            <span style={{ marginLeft: '16px' }}>
              (<span style={styles.summaryHighlight}>NEW: {summary.newCardCount}枚</span>)
            </span>
          )}
        </div>
      )}

      {/* コントロールボタン */}
      <div style={styles.controlsContainer}>
        {!allRevealed && (
          <button
            style={{
              ...styles.button,
              ...styles.revealAllButton,
            }}
            onClick={revealAll}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 15px rgba(107,76,230,0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'none';
              e.target.style.boxShadow = 'none';
            }}
          >
            全てめくる
          </button>
        )}

        <button
          style={{
            ...styles.button,
            ...styles.closeButton,
          }}
          onClick={onClose}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(107,76,230,0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(107,76,230,0.3)';
          }}
        >
          {allRevealed ? '閉じる' : 'スキップして閉じる'}
        </button>
      </div>

      {/* カード詳細モーダル（売却なし） */}
      {selectedCardForDetail && (
        <CardDetail
          card={selectedCardForDetail.card}
          rarity={selectedCardForDetail.rarity}
          quantity={1}
          valueInfo={valueCalculator.calculateCardValue(selectedCardForDetail.card)}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default PackOpening;
