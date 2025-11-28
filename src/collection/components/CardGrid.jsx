/**
 * カードグリッドコンポーネント
 *
 * カードを格子状に表示する
 */

import React from 'react';
import { ATTRIBUTE_COLORS } from '../../utils/constants';
import { RARITY_COLORS, RARITY_NAMES } from '../data/constants';

// ========================================
// スタイル定義
// ========================================

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
    padding: '8px',
  },
  cardWrapper: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
  card: {
    width: '100%',
    aspectRatio: '3/4',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    padding: '4px 6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.3)',
  },
  costBadge: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
  },
  rarityBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#fff',
  },
  cardBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '8px 4px',
  },
  cardName: {
    fontSize: '11px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    lineHeight: '1.3',
  },
  cardStats: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.8)',
    marginTop: '4px',
  },
  cardFooter: {
    padding: '4px 6px',
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: '12px',
  },
  quantityBadge: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '48px',
    color: '#a0a0a0',
    fontSize: '16px',
  },
};

// ========================================
// タイプアイコン
// ========================================

const TYPE_ICONS = {
  monster: '⚔️',
  magic: '✨',
  field: '🏔️',
  phasecard: '🔮',
};

// ========================================
// カードアイテムコンポーネント
// ========================================

const CardItem = ({ card, onClick }) => {
  const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
  const rarityColor = RARITY_COLORS[card.rarity] || '#808080';
  const isMonster = card.type === 'monster';

  const cardStyle = {
    ...styles.card,
    background: colors.bg,
    border: `2px solid ${rarityColor}`,
    boxShadow: `0 4px 15px rgba(0,0,0,0.4), 0 0 10px ${rarityColor}40`,
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
    e.currentTarget.style.boxShadow = `0 8px 25px rgba(0,0,0,0.5), 0 0 20px ${rarityColor}60`;
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = 'none';
    e.currentTarget.style.boxShadow = `0 4px 15px rgba(0,0,0,0.4), 0 0 10px ${rarityColor}40`;
  };

  return (
    <div
      style={styles.cardWrapper}
      onClick={() => onClick(card)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={cardStyle}>
        {/* ヘッダー: コスト & レアリティ */}
        <div style={styles.cardHeader}>
          <div style={styles.costBadge}>{card.cost}</div>
          <div style={{
            ...styles.rarityBadge,
            background: rarityColor,
          }}>
            {card.rarity}
          </div>
        </div>

        {/* ボディ: 名前 & ステータス */}
        <div style={styles.cardBody}>
          <div style={styles.cardName}>{card.name}</div>
          {isMonster && (
            <div style={styles.cardStats}>
              ATK {card.attack} / HP {card.hp}
            </div>
          )}
        </div>

        {/* フッター: タイプ & 所持枚数 */}
        <div style={styles.cardFooter}>
          <span style={styles.typeIcon}>
            {TYPE_ICONS[card.type] || '📄'}
          </span>
          <span style={styles.quantityBadge}>
            ×{card.quantity}
          </span>
        </div>
      </div>
    </div>
  );
};

// ========================================
// メインコンポーネント
// ========================================

const CardGrid = ({ cards, onCardClick }) => {
  if (!cards || cards.length === 0) {
    return (
      <div style={styles.emptyMessage}>
        カードがありません
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {cards.map((card, index) => (
        <CardItem
          key={`${card.id}_${card.rarity}_${index}`}
          card={card}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
};

export default CardGrid;
