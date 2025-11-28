/**
 * カード詳細モーダル
 *
 * カードの詳細情報表示と売却機能
 */

import React, { useState } from 'react';
import { ATTRIBUTE_COLORS } from '../../utils/constants';
import { RARITY_COLORS, RARITY_NAMES, RARITY_MULTIPLIERS } from '../data/constants';
import { currencyManager } from '../systems/currencyManager';

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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a3a 0%, #2a2a4a 100%)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '2px solid #6b4ce6',
    boxShadow: '0 0 50px rgba(107,76,230,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  cardPreview: {
    width: '120px',
    height: '160px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardPreviewHeader: {
    padding: '6px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.3)',
  },
  cardPreviewBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '8px',
  },
  headerInfo: {
    flex: 1,
    marginLeft: '16px',
  },
  cardName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  cardMeta: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '4px',
  },
  rarityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
  },
  rarityBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  quantityText: {
    fontSize: '16px',
    color: '#ffd700',
    fontWeight: 'bold',
  },
  closeButton: {
    padding: '4px 8px',
    background: 'transparent',
    border: 'none',
    color: '#a0a0a0',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '8px',
    borderBottom: '1px solid rgba(107,76,230,0.3)',
    paddingBottom: '4px',
  },
  effectText: {
    fontSize: '13px',
    color: '#e0e0e0',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '8px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  valueSection: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  valueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  valueLabel: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  valueAmount: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  tierBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  sellSection: {
    borderTop: '1px solid rgba(107,76,230,0.3)',
    paddingTop: '16px',
    marginTop: '16px',
  },
  sellRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  sellQuantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quantityButton: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(107,76,230,0.5)',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  quantityInput: {
    width: '50px',
    textAlign: 'center',
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid rgba(107,76,230,0.5)',
    background: 'rgba(30,30,50,0.8)',
    color: '#e0e0e0',
    fontSize: '14px',
  },
  sellButton: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
  sellButtonDisabled: {
    background: 'rgba(100,100,100,0.5)',
    cursor: 'not-allowed',
  },
};

// ========================================
// ティアカラー
// ========================================

const TIER_COLORS = {
  S: '#ffd700',
  A: '#c0c0c0',
  B: '#cd7f32',
  C: '#4ade80',
  D: '#a0a0a0',
};

// ========================================
// メインコンポーネント
// ========================================

const CardDetail = ({
  card,
  rarity,
  quantity,
  valueInfo,
  onClose,
  onSell,
}) => {
  const [sellQuantity, setSellQuantity] = useState(1);

  const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
  const rarityColor = RARITY_COLORS[rarity] || '#808080';
  const isMonster = card.type === 'monster';

  // 売却価格計算
  const baseValue = valueInfo?.baseValue || 0;
  const tier = valueInfo?.tier || 'D';
  const sellPrice = valueInfo?.rarityValues?.[rarity] || baseValue;
  const totalSellPrice = sellPrice * sellQuantity;

  // 売却数量の調整
  const handleQuantityChange = (delta) => {
    const newQty = Math.max(1, Math.min(quantity, sellQuantity + delta));
    setSellQuantity(newQty);
  };

  // 売却実行
  const handleSell = () => {
    if (sellQuantity > 0 && sellQuantity <= quantity) {
      onSell(card.id, rarity, sellQuantity, card);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={styles.header}>
          {/* カードプレビュー */}
          <div style={{
            ...styles.cardPreview,
            background: colors.bg,
            border: `2px solid ${rarityColor}`,
          }}>
            <div style={styles.cardPreviewHeader}>
              <div style={{
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
              }}>
                {card.cost}
              </div>
              <div style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#fff',
                background: rarityColor,
              }}>
                {rarity}
              </div>
            </div>
            <div style={styles.cardPreviewBody}>
              <div style={{
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#fff',
                textAlign: 'center',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}>
                {card.name}
              </div>
            </div>
          </div>

          {/* カード情報 */}
          <div style={styles.headerInfo}>
            <div style={styles.cardName}>{card.name}</div>
            <div style={styles.cardMeta}>
              {card.attribute} / {card.type === 'monster' ? 'モンスター' : card.type === 'magic' ? '魔法' : card.type === 'field' ? 'フィールド' : 'フェイズ'}
            </div>
            {card.category && (
              <div style={styles.cardMeta}>{card.category}</div>
            )}
            <div style={styles.rarityRow}>
              <div style={{
                ...styles.rarityBadge,
                background: rarityColor,
              }}>
                {RARITY_NAMES[rarity] || rarity}
              </div>
              <span style={styles.quantityText}>×{quantity}</span>
            </div>
          </div>

          {/* 閉じるボタン */}
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => e.target.style.color = '#fff'}
            onMouseLeave={(e) => e.target.style.color = '#a0a0a0'}
          >
            ×
          </button>
        </div>

        {/* ステータス（モンスターのみ） */}
        {isMonster && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>ステータス</div>
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>攻撃力:</span>
                <span style={{...styles.statValue, color: '#ff6b6b'}}>{card.attack}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>HP:</span>
                <span style={{...styles.statValue, color: '#4ade80'}}>{card.hp}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>コスト:</span>
                <span style={{...styles.statValue, color: '#6b9dff'}}>{card.cost}</span>
              </div>
            </div>
          </div>
        )}

        {/* 効果テキスト */}
        {card.effect && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>効果</div>
            <div style={styles.effectText}>{card.effect}</div>
          </div>
        )}

        {/* 価値情報 */}
        <div style={styles.valueSection}>
          <div style={styles.valueRow}>
            <span style={styles.valueLabel}>ティア</span>
            <div style={{
              ...styles.tierBadge,
              background: TIER_COLORS[tier] || '#808080',
            }}>
              {tier}ティア
            </div>
          </div>
          <div style={styles.valueRow}>
            <span style={styles.valueLabel}>基礎価値</span>
            <span style={styles.valueAmount}>{baseValue.toLocaleString()}G</span>
          </div>
          <div style={styles.valueRow}>
            <span style={styles.valueLabel}>レアリティ倍率</span>
            <span style={{...styles.valueAmount, color: '#e0e0e0'}}>×{RARITY_MULTIPLIERS[rarity] || 1}</span>
          </div>
          <div style={{...styles.valueRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px'}}>
            <span style={styles.valueLabel}>売却価格（1枚）</span>
            <span style={styles.valueAmount}>{sellPrice.toLocaleString()}G</span>
          </div>
        </div>

        {/* 売却セクション */}
        {quantity > 0 && onSell && (
          <div style={styles.sellSection}>
            <div style={styles.sellRow}>
              <div style={styles.sellQuantityControl}>
                <button
                  style={styles.quantityButton}
                  onClick={() => handleQuantityChange(-1)}
                  disabled={sellQuantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  style={styles.quantityInput}
                  value={sellQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setSellQuantity(Math.max(1, Math.min(quantity, val)));
                  }}
                  min={1}
                  max={quantity}
                />
                <button
                  style={styles.quantityButton}
                  onClick={() => handleQuantityChange(1)}
                  disabled={sellQuantity >= quantity}
                >
                  +
                </button>
                <span style={{color: '#a0a0a0', fontSize: '13px'}}>
                  / {quantity}枚
                </span>
              </div>

              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '12px', color: '#a0a0a0'}}>売却合計</div>
                <div style={{fontSize: '18px', fontWeight: 'bold', color: '#ffd700'}}>
                  {totalSellPrice.toLocaleString()}G
                </div>
              </div>
            </div>

            <button
              style={{
                ...styles.sellButton,
                width: '100%',
                marginTop: '12px',
              }}
              onClick={handleSell}
            >
              売却する
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardDetail;
