/**
 * 商人ギルド画面
 *
 * 商人一覧を表示し、各商人の店舗へ遷移する
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  MERCHANTS,
  MERCHANT_TYPES,
  TICKETS,
  getTodayAppearances,
  callAttributeMerchant,
  ATTRIBUTE_MERCHANTS,
} from '../merchant';

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
    overflowX: 'hidden',
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
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#e0e0e0',
    marginBottom: '16px',
    paddingLeft: '8px',
    borderLeft: '4px solid #6b4ce6',
  },
  merchantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  merchantCard: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 100%)',
    borderRadius: '12px',
    padding: '16px',
    border: '2px solid #4a4a6a',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  merchantCardHover: {
    border: '2px solid #6b4ce6',
    boxShadow: '0 0 20px rgba(107,76,230,0.4)',
    transform: 'translateY(-2px)',
  },
  merchantCardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  merchantIcon: {
    fontSize: '36px',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(107,76,230,0.2)',
    borderRadius: '50%',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '4px',
  },
  merchantSpecialty: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  merchantFav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#ff69b4',
  },
  wishlistBadge: {
    background: 'linear-gradient(90deg, #ffd700, #ff9500)',
    color: '#1a1a2e',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  enterButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'linear-gradient(90deg, #6b4ce6, #9d4ce6)',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
  ticketSection: {
    background: 'rgba(107,76,230,0.1)',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '24px',
    border: '1px solid #4a4a6a',
  },
  ticketGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '12px',
  },
  ticketItem: {
    background: 'rgba(50,50,80,0.5)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  ticketCount: {
    fontWeight: 'bold',
    color: '#ffd700',
  },
  noticeCard: {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,150,0,0.1) 100%)',
    border: '1px solid #ffd700',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  noticeIcon: {
    fontSize: '24px',
  },
  noticeText: {
    flex: 1,
    fontSize: '14px',
    color: '#ffd700',
  },
  ticketUseButton: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    background: 'linear-gradient(90deg, #ff9800, #ffc107)',
    color: '#1a1a2e',
    marginLeft: '8px',
    transition: 'all 0.3s ease',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 100%)',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #6b4ce6',
    maxWidth: '400px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '16px',
    textAlign: 'center',
  },
  modalList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  modalItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(107,76,230,0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modalItemDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  modalCancelButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'rgba(100,100,100,0.5)',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
};

// ========================================
// 好感度ハートアイコン
// ========================================

const FavorabilityHearts = ({ level }) => {
  const hearts = [];
  for (let i = 0; i < 5; i++) {
    hearts.push(
      <span key={i} style={{ opacity: i < level ? 1 : 0.3 }}>
        ♥
      </span>
    );
  }
  return <div style={styles.merchantFav}>{hearts}</div>;
};

// ========================================
// 商人カードコンポーネント
// ========================================

const MerchantCard = ({
  merchant,
  favorability,
  hasWishlistItem,
  available,
  onClick,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const favLevel = favorability?.level || 1;

  const cardStyle = {
    ...styles.merchantCard,
    ...(isHovered && available ? styles.merchantCardHover : {}),
    ...(!available ? styles.merchantCardDisabled : {}),
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => available && onClick(merchant)}
    >
      <div style={styles.merchantIcon}>{merchant.icon}</div>
      <div style={styles.merchantInfo}>
        <div style={styles.merchantName}>
          {merchant.name}
          {hasWishlistItem && <span style={styles.wishlistBadge}>⭐</span>}
        </div>
        <div style={styles.merchantSpecialty}>
          {merchant.specialty
            ? merchant.specialty.type === 'attribute'
              ? `${merchant.specialty.value}属性`
              : merchant.specialty.value.join(' / ')
            : '全属性'}
        </div>
        <FavorabilityHearts level={favLevel} />
      </div>
      {available && (
        <button style={styles.enterButton}>入店</button>
      )}
    </div>
  );
};

// ========================================
// メインコンポーネント
// ========================================

const MerchantGuild = ({
  playerData,
  dayId = 0,
  onBack,
  onEnterShop,
  onMerchantDataUpdate,
  allCards = [],
  forbiddenCount = 0,
  totalAssets = 0,
}) => {
  const [showTicketModal, setShowTicketModal] = useState(false);

  const merchantData = playerData?.merchantData || {};
  const favorability = merchantData.favorability || {};
  const tickets = merchantData.tickets || { attribute: 0, dark: 0, traveler: 0 };
  const wishlist = merchantData.wishlist || [];

  // 今日出現する商人を計算（キャッシュ付き）
  const { appearances, updated, newMerchantData } = useMemo(() => {
    return getTodayAppearances(merchantData, dayId, {
      forbiddenCount,
      totalAssets,
    });
  }, [merchantData, dayId, forbiddenCount, totalAssets]);

  // merchantDataが更新された場合、親に通知
  useEffect(() => {
    if (updated && newMerchantData && onMerchantDataUpdate) {
      onMerchantDataUpdate(newMerchantData);
    }
  }, [updated, newMerchantData, onMerchantDataUpdate]);

  // 出現商人を使いやすい形式に変換
  const availableMerchants = useMemo(() => ({
    general: ['マルクス'],
    attribute: appearances.attribute || [],
    collector: appearances.collector || [],
    dark: appearances.dark ? ['名無し'] : [],
    traveler: appearances.traveler ? ['ゼルヴァン'] : [],
  }), [appearances]);

  // ウィッシュリストに含まれるカードを持つ商人をチェック
  const merchantsWithWishlist = useMemo(() => {
    if (!wishlist || wishlist.length === 0) return new Set();

    const stocks = merchantData.todayStock?.stocks || {};
    const result = new Set();

    for (const [merchantName, stock] of Object.entries(stocks)) {
      if (stock && stock.some(item => wishlist.includes(item.cardId))) {
        result.add(merchantName);
      }
    }

    return result;
  }, [wishlist, merchantData.todayStock]);

  const handleEnterShop = (merchant) => {
    if (onEnterShop) {
      onEnterShop(merchant.name);
    }
  };

  // 属性商人呼び出しチケット使用
  const handleCallAttributeMerchant = (merchantName) => {
    const result = callAttributeMerchant(merchantData, merchantName, dayId);
    if (result.success && onMerchantDataUpdate) {
      onMerchantDataUpdate(result.newMerchantData);
    }
    setShowTicketModal(false);
    if (!result.success) {
      alert(result.message);
    }
  };

  // チケットで呼び出し可能な属性商人（今日出現していない商人）
  const callableMerchants = useMemo(() => {
    const currentAppearances = appearances.attribute || [];
    return ATTRIBUTE_MERCHANTS.filter(m => !currentAppearances.includes(m.name));
  }, [appearances.attribute]);

  // 曜日名
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const currentWeekday = weekdays[dayId % 7];

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
          <span style={styles.title}>🏪 商人ギルド</span>
        </div>
        <div style={styles.goldDisplay}>
          💰 {(playerData?.gold || 0).toLocaleString()} G
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        {/* 本日の曜日 */}
        <div style={styles.noticeCard}>
          <span style={styles.noticeIcon}>📅</span>
          <span style={styles.noticeText}>
            本日は <strong>{currentWeekday}曜日</strong> です（{dayId}日目）
          </span>
        </div>

        {/* 常設商人 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>常設</div>
          <div style={styles.merchantGrid}>
            {/* 一般商人 */}
            {MERCHANTS['マルクス'] && (
              <MerchantCard
                merchant={MERCHANTS['マルクス']}
                favorability={favorability['マルクス']}
                hasWishlistItem={merchantsWithWishlist.has('マルクス')}
                available={true}
                onClick={handleEnterShop}
              />
            )}
            {/* 今日の属性商人 */}
            {availableMerchants.attribute.map(name => (
              <MerchantCard
                key={name}
                merchant={MERCHANTS[name]}
                favorability={favorability[name]}
                hasWishlistItem={merchantsWithWishlist.has(name)}
                available={true}
                onClick={handleEnterShop}
              />
            ))}
          </div>
        </div>

        {/* 本日の来訪者 */}
        {(availableMerchants.collector.length > 0 ||
          availableMerchants.dark.length > 0 ||
          availableMerchants.traveler.length > 0) && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>本日の来訪者</div>
            <div style={styles.merchantGrid}>
              {/* コレクター */}
              {availableMerchants.collector.map(name => (
                <MerchantCard
                  key={name}
                  merchant={MERCHANTS[name]}
                  favorability={favorability[name]}
                  hasWishlistItem={merchantsWithWishlist.has(name)}
                  available={true}
                  onClick={handleEnterShop}
                />
              ))}
              {/* 闇商人 */}
              {availableMerchants.dark.map(name => (
                <MerchantCard
                  key={name}
                  merchant={MERCHANTS[name]}
                  favorability={favorability[name]}
                  hasWishlistItem={merchantsWithWishlist.has(name)}
                  available={true}
                  onClick={handleEnterShop}
                />
              ))}
              {/* 旅商人 */}
              {availableMerchants.traveler.map(name => (
                <MerchantCard
                  key={name}
                  merchant={MERCHANTS[name]}
                  favorability={favorability[name]}
                  hasWishlistItem={merchantsWithWishlist.has(name)}
                  available={true}
                  onClick={handleEnterShop}
                />
              ))}
            </div>
          </div>
        )}

        {/* 所持チケット */}
        <div style={styles.ticketSection}>
          <div style={styles.sectionTitle}>所持チケット</div>
          <div style={styles.ticketGrid}>
            <div style={styles.ticketItem}>
              📜 {TICKETS.attribute.name}
              <span style={styles.ticketCount}>×{tickets.attribute}</span>
              {tickets.attribute > 0 && callableMerchants.length > 0 && (
                <button
                  style={styles.ticketUseButton}
                  onClick={() => setShowTicketModal(true)}
                >
                  使用
                </button>
              )}
            </div>
            <div style={styles.ticketItem}>
              📜 {TICKETS.dark.name}
              <span style={styles.ticketCount}>×{tickets.dark}</span>
            </div>
            <div style={styles.ticketItem}>
              📜 {TICKETS.traveler.name}
              <span style={styles.ticketCount}>×{tickets.traveler}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 属性商人呼び出しモーダル */}
      {showTicketModal && (
        <div style={styles.modal} onClick={() => setShowTicketModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>呼び出す商人を選択</div>
            <div style={styles.modalList}>
              {callableMerchants.map(merchant => (
                <div
                  key={merchant.name}
                  style={styles.modalItem}
                  onClick={() => handleCallAttributeMerchant(merchant.name)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(107,76,230,0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(107,76,230,0.2)'}
                >
                  <span style={{ fontSize: '24px' }}>{merchant.icon}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{merchant.name}</div>
                    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                      {merchant.specialty?.value}属性
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              style={styles.modalCancelButton}
              onClick={() => setShowTicketModal(false)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantGuild;
