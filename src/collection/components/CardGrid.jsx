/**
 * カードグリッドコンポーネント
 *
 * カードを格子状に表示する
 */

import React, { useState, useEffect, useRef } from 'react';
import { ATTRIBUTE_COLORS } from '../../utils/constants';
import { RARITY_COLORS, RARITY_NAMES, TIERS } from '../data/constants';
import {
  EFFECT_LEVELS,
  RARITY_KEYFRAMES,
  applyRarityStyle,
  getRarityOverlay,
  getParticleCount,
  getParticleStyle,
  hasDoubleBorder,
  hasCornerOrnaments,
  calculateMouseReflection,
  getMouseFollowStyle,
  getMouseGlareStyle,
} from '../../styles/rarityEffects';

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
  priceRow: {
    padding: '3px 6px',
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierBadge: {
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  priceBadge: {
    fontSize: '10px',
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

// ティアカラー
const TIER_COLORS = {
  S: '#ff4444',
  A: '#ff9900',
  B: '#3498db',
  C: '#2ecc71',
  D: '#808080',
};

// ========================================
// カードアイテムコンポーネント
// ========================================

const CardItem = ({ card, onClick, effectLevel = EFFECT_LEVELS.FULL }) => {
  const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
  const rarityColor = RARITY_COLORS[card.rarity] || '#808080';
  const isMonster = card.type === 'monster';
  const cardRef = useRef(null);
  const [mouseReflection, setMouseReflection] = useState(null);

  // 価格とティア情報
  const tier = card.valueInfo?.tier || 'D';
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.D;
  const price = card.valueInfo?.rarityValues?.[card.rarity] || 0;

  // パーティクル数
  const particleCount = getParticleCount(card.rarity, effectLevel);

  // ベーススタイル
  const baseCardStyle = {
    ...styles.card,
    background: colors.bg,
  };

  // レアリティエフェクト適用
  const cardStyle = applyRarityStyle(baseCardStyle, card.rarity, effectLevel);

  // オーバーレイスタイル
  const overlayStyle = getRarityOverlay(card.rarity, effectLevel);

  // マウス追従スタイル
  const mouseFollowStyle = getMouseFollowStyle(mouseReflection, card.rarity);
  const mouseGlareStyle = getMouseGlareStyle(mouseReflection, card.rarity);

  // 二重枠チェック
  const showDoubleBorder = hasDoubleBorder(card.rarity, effectLevel);
  const showCornerOrnaments = hasCornerOrnaments(card.rarity, effectLevel);

  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = 'none';
    setMouseReflection(null);
  };

  const handleMouseMove = (e) => {
    if (effectLevel !== EFFECT_LEVELS.FULL) return;
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const reflection = calculateMouseReflection(rect, e.clientX, e.clientY);
    setMouseReflection(reflection);
  };

  return (
    <div
      ref={cardRef}
      style={{
        ...styles.cardWrapper,
        ...mouseFollowStyle,
      }}
      onClick={() => onClick(card)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <div style={cardStyle}>
        {/* 二重枠（UR, GR用） */}
        {showDoubleBorder && (
          <div style={{
            position: 'absolute',
            top: '3px',
            left: '3px',
            right: '3px',
            bottom: '3px',
            border: `1px solid ${rarityColor}80`,
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: 0,
          }} />
        )}

        {/* コーナー装飾（GR用） */}
        {showCornerOrnaments && (
          <>
            <div style={{
              position: 'absolute', top: '-2px', left: '-2px',
              width: '16px', height: '16px',
              borderTop: `3px solid ${rarityColor}`,
              borderLeft: `3px solid ${rarityColor}`,
              borderRadius: '4px 0 0 0',
              zIndex: 5,
            }} />
            <div style={{
              position: 'absolute', top: '-2px', right: '-2px',
              width: '16px', height: '16px',
              borderTop: `3px solid ${rarityColor}`,
              borderRight: `3px solid ${rarityColor}`,
              borderRadius: '0 4px 0 0',
              zIndex: 5,
            }} />
            <div style={{
              position: 'absolute', bottom: '-2px', left: '-2px',
              width: '16px', height: '16px',
              borderBottom: `3px solid ${rarityColor}`,
              borderLeft: `3px solid ${rarityColor}`,
              borderRadius: '0 0 0 4px',
              zIndex: 5,
            }} />
            <div style={{
              position: 'absolute', bottom: '-2px', right: '-2px',
              width: '16px', height: '16px',
              borderBottom: `3px solid ${rarityColor}`,
              borderRight: `3px solid ${rarityColor}`,
              borderRadius: '0 0 4px 0',
              zIndex: 5,
            }} />
          </>
        )}

        {/* レアリティオーバーレイ（光沢、ホロ等） */}
        {overlayStyle && <div style={overlayStyle} />}

        {/* マウス追従グレア */}
        {mouseGlareStyle && <div style={mouseGlareStyle} />}

        {/* パーティクル */}
        {Array.from({ length: particleCount }).map((_, i) => (
          <div key={i} style={getParticleStyle(i, card.rarity)} />
        ))}

        {/* ヘッダー: コスト & レアリティ */}
        <div style={{ ...styles.cardHeader, position: 'relative', zIndex: 4 }}>
          <div style={styles.costBadge}>{card.cost}</div>
          <div style={{
            ...styles.rarityBadge,
            background: rarityColor,
          }}>
            {card.rarity}
          </div>
        </div>

        {/* ボディ: 名前 & ステータス */}
        <div style={{ ...styles.cardBody, position: 'relative', zIndex: 4 }}>
          <div style={styles.cardName}>{card.name}</div>
          {isMonster && (
            <div style={styles.cardStats}>
              ATK {card.attack} / HP {card.hp}
            </div>
          )}
        </div>

        {/* フッター: タイプ & 所持枚数 */}
        <div style={{ ...styles.cardFooter, position: 'relative', zIndex: 4 }}>
          <span style={styles.typeIcon}>
            {TYPE_ICONS[card.type] || '📄'}
          </span>
          <span style={styles.quantityBadge}>
            ×{card.quantity}
          </span>
        </div>

        {/* 価格行: ティア & 価格 */}
        <div style={{ ...styles.priceRow, position: 'relative', zIndex: 4 }}>
          <span style={{
            ...styles.tierBadge,
            background: tierColor,
            color: '#fff',
          }}>
            {tier}
          </span>
          <span style={styles.priceBadge}>
            {price.toLocaleString()}G
          </span>
        </div>
      </div>
    </div>
  );
};

// ========================================
// メインコンポーネント
// ========================================

const CardGrid = ({ cards, onCardClick, effectLevel = EFFECT_LEVELS.FULL }) => {
  // キーフレームをDOMに注入
  useEffect(() => {
    const styleId = 'rarity-effect-keyframes';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = RARITY_KEYFRAMES;
      document.head.appendChild(styleSheet);
    }
    // クリーンアップは不要（グローバルスタイルとして維持）
  }, []);

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
          effectLevel={effectLevel}
        />
      ))}
    </div>
  );
};

export default CardGrid;
