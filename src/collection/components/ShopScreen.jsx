/**
 * ショップ画面
 *
 * パック購入とカード売却導線を提供
 */

import React, { useState } from 'react';
import { currencyManager, packSystem, ECONOMY } from '../index';

// ========================================
// スタイル定義
// ========================================

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)',
    fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(90deg, rgba(20,20,50,0.95) 0%, rgba(40,20,60,0.95) 50%, rgba(20,20,50,0.95) 100%)',
    borderBottom: '2px solid #6b4ce6',
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(107,76,230,0.3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'rgba(107,76,230,0.3)',
    color: '#e0e0e0',
    transition: 'all 0.3s ease',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #ffd700, #ff9500, #ffd700)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  goldDisplay: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  mainContent: {
    flex: 1,
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#e0e0e0',
    marginBottom: '16px',
    textAlign: 'center',
  },
  packSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  packCard: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 50%, #2a2a4a 100%)',
    borderRadius: '16px',
    padding: '32px',
    width: '300px',
    border: '2px solid #6b4ce6',
    boxShadow: '0 0 30px rgba(107,76,230,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.3s ease',
  },
  packName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  packImage: {
    width: '120px',
    height: '160px',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    boxShadow: '0 4px 15px rgba(107,76,230,0.5)',
  },
  packInfo: {
    fontSize: '14px',
    color: '#a0a0a0',
    textAlign: 'center',
  },
  packPrice: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  buyButton: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    color: '#fff',
    transition: 'all 0.3s ease',
    width: '100%',
  },
  buyButtonDisabled: {
    background: 'rgba(100,100,100,0.5)',
    cursor: 'not-allowed',
  },
  buyButtonHover: {
    background: 'linear-gradient(135deg, #7b5cf6 0%, #ad5cf6 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 15px rgba(107,76,230,0.5)',
  },
  divider: {
    width: '80%',
    maxWidth: '400px',
    height: '1px',
    background: 'linear-gradient(90deg, transparent 0%, rgba(107,76,230,0.5) 50%, transparent 100%)',
    margin: '16px 0',
  },
  sellSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  sellButton: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: '1px solid rgba(107,76,230,0.5)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'rgba(30,30,50,0.8)',
    color: '#e0e0e0',
    transition: 'all 0.3s ease',
  },
  sellHint: {
    fontSize: '13px',
    color: '#808080',
  },
  errorMessage: {
    padding: '12px 24px',
    background: 'rgba(255,100,100,0.2)',
    border: '1px solid rgba(255,100,100,0.5)',
    borderRadius: '8px',
    color: '#ff6b6b',
    fontSize: '14px',
  },
  successMessage: {
    padding: '12px 24px',
    background: 'rgba(100,255,100,0.2)',
    border: '1px solid rgba(100,255,100,0.5)',
    borderRadius: '8px',
    color: '#6bff6b',
    fontSize: '14px',
  },
  statsSection: {
    marginTop: 'auto',
    padding: '16px 24px',
    background: 'rgba(20,20,40,0.8)',
    borderTop: '1px solid rgba(107,76,230,0.3)',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
  },
  statItem: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#e0e0e0',
  },
};

// ========================================
// メインコンポーネント
// ========================================

const ShopScreen = ({
  playerData,
  allCards,
  cardValueMap,
  onBack,
  onOpenPack,
  onGoToCollection,
  onPlayerDataUpdate,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const packInfo = packSystem.getPackInfo();
  const canBuy = currencyManager.canBuyPack(playerData);

  // パック購入処理
  const handleBuyPack = async () => {
    if (!canBuy || isProcessing) return;

    setIsProcessing(true);
    setMessage(null);

    // 購入処理
    const result = packSystem.buyAndOpenPack(playerData, allCards, cardValueMap);

    if (result.success) {
      // プレイヤーデータを更新
      onPlayerDataUpdate(result.playerData);
      // パック開封画面へ
      onOpenPack(result.cards);
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setIsProcessing(false);
  };

  // ボタンスタイル計算
  const getBuyButtonStyle = () => {
    if (!canBuy || isProcessing) {
      return { ...styles.buyButton, ...styles.buyButtonDisabled };
    }
    if (isHovered) {
      return { ...styles.buyButton, ...styles.buyButtonHover };
    }
    return styles.buyButton;
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={onBack}
            onMouseEnter={(e) => e.target.style.background = 'rgba(107,76,230,0.5)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(107,76,230,0.3)'}
          >
            ← 戻る
          </button>
          <span style={styles.title}>ショップ</span>
        </div>
        <div style={styles.goldDisplay}>
          💰 {currencyManager.formatGold(playerData.gold)}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        {/* メッセージ表示 */}
        {message && (
          <div style={message.type === 'error' ? styles.errorMessage : styles.successMessage}>
            {message.text}
          </div>
        )}

        {/* パック購入セクション */}
        <div style={styles.packSection}>
          <div style={styles.sectionTitle}>パック購入</div>

          <div
            style={{
              ...styles.packCard,
              ...(isHovered && canBuy ? { transform: 'translateY(-4px)' } : {}),
            }}
          >
            <div style={styles.packName}>スタンダードパック</div>

            <div style={styles.packImage}>🎴</div>

            <div style={styles.packInfo}>
              {packInfo.cardsPerPack}枚入り
            </div>

            <div style={styles.packPrice}>
              {packInfo.priceFormatted}
            </div>

            <button
              style={getBuyButtonStyle()}
              onClick={handleBuyPack}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={!canBuy || isProcessing}
            >
              {isProcessing ? '処理中...' : canBuy ? '購入する' : 'G不足'}
            </button>

            {!canBuy && (
              <div style={{ fontSize: '12px', color: '#ff6b6b' }}>
                あと {currencyManager.formatGold(ECONOMY.PACK_PRICE - playerData.gold)} 必要
              </div>
            )}
          </div>
        </div>

        {/* 区切り線 */}
        <div style={styles.divider} />

        {/* カード売却セクション */}
        <div style={styles.sellSection}>
          <div style={styles.sectionTitle}>カード売却</div>

          <button
            style={styles.sellButton}
            onClick={onGoToCollection}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(107,76,230,0.3)';
              e.target.style.borderColor = 'rgba(107,76,230,0.8)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(30,30,50,0.8)';
              e.target.style.borderColor = 'rgba(107,76,230,0.5)';
            }}
          >
            コレクションから選択 →
          </button>

          <div style={styles.sellHint}>
            コレクション画面でカードを選択して売却できます
          </div>
        </div>
      </div>

      {/* 統計フッター */}
      <div style={styles.statsSection}>
        <div style={styles.statItem}>
          開封済み: <span style={styles.statValue}>{playerData.stats?.packsOpened || 0}</span> パック
        </div>
        <div style={styles.statItem}>
          累計使用: <span style={styles.statValue}>{currencyManager.formatGold(playerData.stats?.totalGoldSpent || 0)}</span>
        </div>
        <div style={styles.statItem}>
          累計獲得: <span style={styles.statValue}>{currencyManager.formatGold(playerData.stats?.totalGoldEarned || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default ShopScreen;
