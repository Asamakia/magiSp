/**
 * 商人店内画面
 *
 * カードの購入・売却を行う
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  MERCHANTS,
  MERCHANT_TYPES,
  TICKETS,
  generateStock,
  calculateSellPrice,
  calculateBuyPrice,
  getFavorabilityLevel,
  getFavorabilityInfo,
  getNextLevelProgress,
  isSpecialty,
  purchaseFromMerchant,
  sellToMerchant,
  purchaseTicket,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
} from '../merchant';
import { RARITY_COLORS, RARITY_NAMES } from '../data/constants';
import { ATTRIBUTE_COLORS } from '../../utils/constants';
import { getCardMarketPrice } from '../market/marketEngine';

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
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  goldDisplay: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    gap: '24px',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  leftPanel: {
    width: '300px',
    flexShrink: 0,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  merchantCard: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 100%)',
    borderRadius: '16px',
    padding: '20px',
    border: '2px solid #6b4ce6',
    marginBottom: '16px',
  },
  merchantHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  merchantIcon: {
    fontSize: '48px',
    width: '70px',
    height: '70px',
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
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '4px',
  },
  merchantSpecialty: {
    fontSize: '13px',
    color: '#a0a0a0',
    marginBottom: '8px',
  },
  favProgress: {
    fontSize: '12px',
    color: '#ff69b4',
  },
  favBar: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,105,180,0.2)',
    borderRadius: '3px',
    marginTop: '4px',
    overflow: 'hidden',
  },
  favBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ff69b4, #ff1493)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  greetingBox: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '14px',
    fontStyle: 'italic',
    color: '#c0c0c0',
    lineHeight: '1.6',
  },
  modeToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  modeButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  modeButtonActive: {
    background: 'linear-gradient(90deg, #6b4ce6, #9d4ce6)',
    color: '#fff',
  },
  modeButtonInactive: {
    background: 'rgba(107,76,230,0.2)',
    color: '#a0a0a0',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    flex: 1,
    overflowY: 'auto',
    padding: '4px',
  },
  cardItem: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 100%)',
    borderRadius: '12px',
    padding: '12px',
    border: '2px solid #4a4a6a',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  cardItemHover: {
    border: '2px solid #6b4ce6',
    boxShadow: '0 0 15px rgba(107,76,230,0.4)',
    transform: 'translateY(-2px)',
  },
  cardItemDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  cardName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardRarity: {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  cardAttribute: {
    fontSize: '11px',
    color: '#a0a0a0',
    marginBottom: '8px',
  },
  cardPrice: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffd700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marketPrice: {
    fontSize: '11px',
    color: '#808080',
    textDecoration: 'line-through',
  },
  bargainBadge: {
    background: '#ff4444',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  buyButton: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    background: 'linear-gradient(90deg, #4caf50, #66bb6a)',
    color: '#fff',
    marginTop: '8px',
    transition: 'all 0.3s ease',
  },
  sellButton: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    background: 'linear-gradient(90deg, #ff9800, #ffc107)',
    color: '#1a1a2e',
    marginTop: '8px',
    transition: 'all 0.3s ease',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#808080',
    padding: '48px',
    fontSize: '16px',
  },
  sortBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  sortButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #4a4a6a',
    background: 'rgba(50,50,80,0.5)',
    color: '#a0a0a0',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  sortButtonActive: {
    background: 'rgba(107,76,230,0.3)',
    border: '1px solid #6b4ce6',
    color: '#fff',
  },
  confirmModal: {
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
  confirmBox: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 100%)',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid #6b4ce6',
    maxWidth: '400px',
    width: '90%',
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '16px',
    textAlign: 'center',
  },
  confirmCard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
  },
  confirmButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  betterDealNotice: {
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid #ffd700',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#ffd700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  // チケット購入セクション
  ticketSection: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 100%)',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px',
    border: '2px solid #6b4ce6',
  },
  ticketSectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  ticketItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: 'rgba(107,76,230,0.1)',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  ticketInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  ticketName: {
    fontSize: '13px',
    color: '#e0e0e0',
  },
  ticketPrice: {
    fontSize: '12px',
    color: '#ffd700',
  },
  ticketOwned: {
    fontSize: '11px',
    color: '#808080',
  },
  ticketBuyButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    background: 'linear-gradient(90deg, #4caf50, #66bb6a)',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
  ticketBuyButtonDisabled: {
    background: '#444',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  // ウィッシュリストボタン
  wishlistButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(0,0,0,0.5)',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    zIndex: 1,
  },
  wishlistButtonActive: {
    background: 'rgba(255,100,100,0.8)',
  },
  wishlistBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    background: '#ff6b6b',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    zIndex: 1,
  },
  // カード詳細モーダル
  detailModal: {
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
  detailBox: {
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
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  detailCardPreview: {
    width: '120px',
    height: '160px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  },
  detailCardPreviewHeader: {
    padding: '6px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.3)',
  },
  detailCardPreviewBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '8px',
  },
  detailHeaderInfo: {
    flex: 1,
    marginLeft: '16px',
  },
  detailCardName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  detailCardMeta: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '4px',
  },
  detailSection: {
    marginBottom: '16px',
  },
  detailSectionTitle: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '8px',
    borderBottom: '1px solid rgba(107,76,230,0.3)',
    paddingBottom: '4px',
  },
  detailEffectText: {
    fontSize: '13px',
    color: '#e0e0e0',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  detailStatsRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '8px',
  },
  detailStatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detailStatLabel: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  detailStatValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  detailPriceSection: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  detailPriceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  detailPriceLabel: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  detailPriceValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  detailCloseButton: {
    padding: '4px 8px',
    background: 'transparent',
    border: 'none',
    color: '#a0a0a0',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  detailActionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  detailActionButton: {
    flex: 1,
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
};

// ========================================
// ソートオプション
// ========================================

const SORT_OPTIONS = [
  { key: 'price_asc', label: '価格↑' },
  { key: 'price_desc', label: '価格↓' },
  { key: 'rarity_asc', label: 'レア↑' },
  { key: 'rarity_desc', label: 'レア↓' },
  { key: 'name', label: '名前順' },
];

const RARITY_ORDER = ['C', 'UC', 'R', 'SR', 'UR', 'HR', 'SEC', 'ALT', 'SP', 'GR'];

// ========================================
// メインコンポーネント
// ========================================

const MerchantShop = ({
  merchantName,
  playerData,
  dayId = 0,
  allCards = [],
  cardValueMap = null,
  onBack,
  onPurchase,
  onSell,
  onPlayerDataChange,
}) => {
  const [mode, setMode] = useState('buy'); // 'buy' or 'sell'
  const [sortKey, setSortKey] = useState('price_asc');
  const [confirmModal, setConfirmModal] = useState(null);
  const [stock, setStock] = useState([]);
  const [selectedCardDetail, setSelectedCardDetail] = useState(null); // カード詳細表示用

  const merchant = MERCHANTS[merchantName];
  const merchantData = playerData?.merchantData || {};
  const favorability = merchantData.favorability?.[merchantName] || { level: 1, transactions: 0 };
  const favLevel = favorability.level;
  const favInfo = getFavorabilityInfo(favLevel);
  const nextLevel = getNextLevelProgress(favorability.transactions);

  // 市場価格取得関数（cardValueMapを使用して正しく計算）
  const getMarketPrice = (card, rarity) => {
    if (!playerData?.market || !cardValueMap) return 100;

    const valueInfo = cardValueMap.get(card.id);
    if (!valueInfo) return 100;

    // レアリティに応じた基礎価格を取得
    const baseValue = valueInfo.rarityValues?.[rarity] || valueInfo.baseValue || 100;

    // 市場価格を計算
    const result = getCardMarketPrice(card, baseValue, playerData.market, rarity, valueInfo.tier);
    return result?.price || baseValue;
  };

  // 品揃え生成
  useEffect(() => {
    if (!merchant || allCards.length === 0) return;

    // キャッシュされた品揃えがあればそれを使う
    const cachedStock = merchantData.todayStock?.stocks?.[merchantName];
    if (merchantData.todayStock?.dayId === dayId && cachedStock) {
      setStock(cachedStock);
      return;
    }

    // 新規生成
    const newStock = generateStock(merchant, allCards, dayId, {
      favorabilityLevel: favLevel,
      getMarketPrice,
      playerInventory: merchantData.pendingStock || [],
    });

    setStock(newStock);
  }, [merchantName, dayId, allCards.length, favLevel]);

  // プレイヤーの売却可能カード
  const sellableCards = useMemo(() => {
    if (!playerData?.collection || !merchant) return [];

    // 旅商人は買取なし
    if (merchant.type === MERCHANT_TYPES.TRAVELER) return [];

    return playerData.collection
      .filter(item => item.quantity > 0)
      .map(item => {
        const card = allCards.find(c => c.id === item.cardId);
        if (!card) return null;

        const marketPrice = getMarketPrice(card, item.rarity);
        const buyPrice = calculateBuyPrice(merchant, card, marketPrice, favLevel);

        return {
          ...item,
          card,
          marketPrice,
          buyPrice,
          isSpecialty: isSpecialty(merchant, card),
        };
      })
      .filter(Boolean);
  }, [playerData?.collection, allCards, merchant, favLevel]);

  // ソート処理
  const sortedItems = useMemo(() => {
    const items = mode === 'buy'
      ? stock.map(item => ({
          ...item,
          card: allCards.find(c => c.id === item.cardId),
        })).filter(item => item.card)
      : sellableCards;

    return [...items].sort((a, b) => {
      switch (sortKey) {
        case 'price_asc':
          return (mode === 'buy' ? a.price : a.buyPrice) - (mode === 'buy' ? b.price : b.buyPrice);
        case 'price_desc':
          return (mode === 'buy' ? b.price : b.buyPrice) - (mode === 'buy' ? a.price : a.buyPrice);
        case 'rarity_asc':
          return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
        case 'rarity_desc':
          return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
        case 'name':
          return a.card.name.localeCompare(b.card.name);
        default:
          return 0;
      }
    });
  }, [mode, stock, sellableCards, sortKey, allCards]);

  // カード詳細表示
  const handleShowDetail = (item) => {
    const card = mode === 'buy' ? allCards.find(c => c.id === item.cardId) : item.card;
    if (!card) return;

    setSelectedCardDetail({
      item,
      card,
      mode, // 'buy' or 'sell'
    });
  };

  // 購入処理（詳細モーダルから実行）
  const handlePurchase = (item) => {
    const card = allCards.find(c => c.id === item.cardId);
    if (!card) return;

    if (playerData.gold < item.price) {
      alert('所持金が足りません');
      return;
    }

    setConfirmModal({
      type: 'buy',
      item,
      card,
    });
    setSelectedCardDetail(null); // 詳細モーダルを閉じる
  };

  // 売却処理（詳細モーダルから実行）
  const handleSell = (item) => {
    setConfirmModal({
      type: 'sell',
      item,
      card: item.card,
    });
    setSelectedCardDetail(null); // 詳細モーダルを閉じる
  };

  // 確認後の処理
  const confirmTransaction = () => {
    if (!confirmModal) return;

    const { type, item, card } = confirmModal;

    if (type === 'buy') {
      // 購入実行
      if (onPurchase) {
        onPurchase(item.cardId, item.rarity, item.price);
      }
      // 品揃えから削除
      setStock(prev => prev.filter(
        s => !(s.cardId === item.cardId && s.rarity === item.rarity)
      ));
    } else {
      // 売却実行
      if (onSell) {
        onSell(card, item.rarity, item.buyPrice);
      }
    }

    setConfirmModal(null);
  };

  // チケット購入処理（マルクス専用）
  const handlePurchaseTicket = (ticketType) => {
    if (!playerData || !onPlayerDataChange) return;

    const result = purchaseTicket(merchantData, ticketType, playerData.gold);
    if (result.success) {
      onPlayerDataChange({
        ...playerData,
        gold: result.newGold,
        merchantData: result.newMerchantData,
      });
    } else {
      alert(result.message);
    }
  };

  // 所持チケット数
  const tickets = merchantData.tickets || { attribute: 0, dark: 0, traveler: 0 };

  // ウィッシュリスト
  const wishlist = merchantData.wishlist || [];

  // ウィッシュリストトグル
  const handleToggleWishlist = (cardId, e) => {
    e.stopPropagation();
    if (!onPlayerDataChange) return;

    const isInList = isInWishlist(merchantData, cardId);
    const newMerchantData = isInList
      ? removeFromWishlist(merchantData, cardId)
      : addToWishlist(merchantData, cardId);

    if (newMerchantData !== merchantData) {
      onPlayerDataChange({
        ...playerData,
        merchantData: newMerchantData,
      });
    }
  };

  if (!merchant) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={onBack}>← 戻る</button>
          <span>商人が見つかりません</span>
        </div>
      </div>
    );
  }

  // ランダム挨拶
  const greeting = merchant.greetings[Math.floor(dayId * 31) % merchant.greetings.length];

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
          <span style={styles.title}>
            {merchant.icon} {merchant.name}
          </span>
        </div>
        <div style={styles.goldDisplay}>
          💰 {(playerData?.gold || 0).toLocaleString()} G
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        {/* 左パネル: 商人情報 */}
        <div style={styles.leftPanel}>
          <div style={styles.merchantCard}>
            <div style={styles.merchantHeader}>
              <div style={styles.merchantIcon}>{merchant.icon}</div>
              <div style={styles.merchantInfo}>
                <div style={styles.merchantName}>{merchant.name}</div>
                <div style={styles.merchantSpecialty}>
                  {merchant.specialty
                    ? merchant.specialty.type === 'attribute'
                      ? `${merchant.specialty.value}属性専門`
                      : `${merchant.specialty.value.join(' / ')}専門`
                    : '全属性取扱'}
                </div>
                <div style={styles.favProgress}>
                  好感度 Lv{favLevel}
                  {favInfo.sellDiscount > 0 && ` (${Math.round(favInfo.sellDiscount * 100)}%OFF)`}
                </div>
                {nextLevel && (
                  <>
                    <div style={styles.favBar}>
                      <div
                        style={{
                          ...styles.favBarFill,
                          width: `${(favorability.transactions / nextLevel.required) * 100}%`,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: '#808080', marginTop: '4px' }}>
                      次のLvまで あと{nextLevel.remaining}回
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={styles.greetingBox}>
              「{greeting}」
            </div>
          </div>

          {/* 割引情報 */}
          {favLevel >= 2 && (
            <div style={{
              background: 'rgba(107,76,230,0.1)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              color: '#a0a0a0',
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                好感度ボーナス
              </div>
              {favInfo.sellDiscount > 0 && (
                <div>🛒 購入: {Math.round(favInfo.sellDiscount * 100)}% OFF</div>
              )}
              {favInfo.buyBonus > 0 && (
                <div>💰 売却: +{Math.round(favInfo.buyBonus * 100)}% UP</div>
              )}
              {favInfo.extraSlots && (
                <div>📦 品揃え: +{favInfo.extraSlots}枠</div>
              )}
            </div>
          )}

          {/* チケット購入セクション（マルクス専用） */}
          {merchant.type === MERCHANT_TYPES.GENERAL && (
            <div style={styles.ticketSection}>
              <div style={styles.ticketSectionTitle}>
                📜 呼び出しチケット販売
              </div>
              {Object.entries(TICKETS).map(([type, info]) => {
                const canAfford = (playerData?.gold || 0) >= info.price;
                return (
                  <div key={type} style={styles.ticketItem}>
                    <div style={styles.ticketInfo}>
                      <div style={styles.ticketName}>{info.name}</div>
                      <div style={styles.ticketPrice}>{info.price.toLocaleString()} G</div>
                      <div style={styles.ticketOwned}>所持: {tickets[type] || 0}枚</div>
                    </div>
                    <button
                      style={{
                        ...styles.ticketBuyButton,
                        ...(!canAfford ? styles.ticketBuyButtonDisabled : {}),
                      }}
                      onClick={() => canAfford && handlePurchaseTicket(type)}
                      disabled={!canAfford}
                    >
                      購入
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右パネル: カード一覧 */}
        <div style={styles.rightPanel}>
          {/* モード切替 */}
          <div style={styles.modeToggle}>
            <button
              style={{
                ...styles.modeButton,
                ...(mode === 'buy' ? styles.modeButtonActive : styles.modeButtonInactive),
              }}
              onClick={() => setMode('buy')}
            >
              🛒 購入
            </button>
            {merchant.type !== MERCHANT_TYPES.TRAVELER && (
              <button
                style={{
                  ...styles.modeButton,
                  ...(mode === 'sell' ? styles.modeButtonActive : styles.modeButtonInactive),
                }}
                onClick={() => setMode('sell')}
              >
                💰 売却
              </button>
            )}
          </div>

          {/* ソートバー */}
          <div style={styles.sortBar}>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                style={{
                  ...styles.sortButton,
                  ...(sortKey === opt.key ? styles.sortButtonActive : {}),
                }}
                onClick={() => setSortKey(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* カードグリッド */}
          <div style={styles.cardGrid}>
            {sortedItems.length === 0 ? (
              <div style={styles.emptyMessage}>
                {mode === 'buy'
                  ? '現在、品揃えがありません'
                  : '売却可能なカードがありません'}
              </div>
            ) : (
              sortedItems.map((item, idx) => {
                const card = item.card;
                const price = mode === 'buy' ? item.price : item.buyPrice;
                const canAfford = mode === 'buy' ? playerData.gold >= price : true;
                const inWishlist = wishlist.includes(item.cardId);

                return (
                  <div
                    key={`${item.cardId}_${item.rarity}_${idx}`}
                    style={{
                      ...styles.cardItem,
                    }}
                    onClick={() => handleShowDetail(item)}
                  >
                    {/* ウィッシュリストボタン */}
                    <button
                      style={{
                        ...styles.wishlistButton,
                        ...(inWishlist ? styles.wishlistButtonActive : {}),
                      }}
                      onClick={(e) => handleToggleWishlist(item.cardId, e)}
                      title={inWishlist ? 'ウィッシュリストから削除' : 'ウィッシュリストに追加'}
                    >
                      {inWishlist ? '❤️' : '🤍'}
                    </button>
                    {/* ウィッシュリストバッジ */}
                    {inWishlist && mode === 'buy' && (
                      <div style={styles.wishlistBadge}>欲しい</div>
                    )}
                    <div style={styles.cardName}>{card.name}</div>
                    <div style={{
                      ...styles.cardRarity,
                      color: RARITY_COLORS[item.rarity] || '#808080',
                    }}>
                      {RARITY_NAMES[item.rarity] || item.rarity}
                      {item.isBargain && <span style={styles.bargainBadge}>掘出物</span>}
                    </div>
                    <div style={styles.cardAttribute}>
                      {card.attribute} / コスト{card.cost}
                      {item.isPlayerSold && ' 📦'}
                      {mode === 'sell' && item.isSpecialty && ' ⭐'}
                    </div>
                    <div style={styles.cardPrice}>
                      <span>💰 {price.toLocaleString()} G</span>
                      {mode === 'sell' && (
                        <span style={{ fontSize: '11px', color: '#808080' }}>
                          ×{item.quantity}
                        </span>
                      )}
                    </div>
                    <button
                      style={{
                        ...styles.buyButton,
                        background: 'linear-gradient(90deg, #6b4ce6, #9d4ce6)',
                      }}
                    >
                      📋 詳細を見る
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* カード詳細モーダル */}
      {selectedCardDetail && (() => {
        const { item, card, mode: detailMode } = selectedCardDetail;
        const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
        const rarityColor = RARITY_COLORS[item.rarity] || '#808080';
        const price = detailMode === 'buy' ? item.price : item.buyPrice;
        const canAfford = detailMode === 'buy' ? playerData.gold >= price : true;
        const isMonster = card.type === 'monster';

        return (
          <div style={styles.detailModal} onClick={() => setSelectedCardDetail(null)}>
            <div style={styles.detailBox} onClick={e => e.stopPropagation()}>
              {/* ヘッダー */}
              <div style={styles.detailHeader}>
                {/* カードプレビュー */}
                <div style={{
                  ...styles.detailCardPreview,
                  background: colors.bg,
                  border: `2px solid ${rarityColor}`,
                }}>
                  <div style={styles.detailCardPreviewHeader}>
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
                      {item.rarity}
                    </div>
                  </div>
                  <div style={styles.detailCardPreviewBody}>
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
                <div style={styles.detailHeaderInfo}>
                  <div style={styles.detailCardName}>{card.name}</div>
                  <div style={styles.detailCardMeta}>
                    {card.attribute} / {card.type === 'monster' ? 'モンスター' : card.type === 'magic' ? '魔法' : card.type === 'field' ? 'フィールド' : 'フェイズ'}
                  </div>
                  {card.category && (
                    <div style={styles.detailCardMeta}>{card.category}</div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#fff',
                      background: rarityColor,
                    }}>
                      {RARITY_NAMES[item.rarity] || item.rarity}
                    </div>
                    {detailMode === 'sell' && (
                      <span style={{ marginLeft: '8px', color: '#ffd700', fontWeight: 'bold' }}>
                        ×{item.quantity}
                      </span>
                    )}
                  </div>
                </div>

                {/* 閉じるボタン */}
                <button
                  style={styles.detailCloseButton}
                  onClick={() => setSelectedCardDetail(null)}
                  onMouseEnter={(e) => e.target.style.color = '#fff'}
                  onMouseLeave={(e) => e.target.style.color = '#a0a0a0'}
                >
                  ×
                </button>
              </div>

              {/* ステータス（モンスターのみ） */}
              {isMonster && (
                <div style={styles.detailSection}>
                  <div style={styles.detailSectionTitle}>ステータス</div>
                  <div style={styles.detailStatsRow}>
                    <div style={styles.detailStatItem}>
                      <span style={styles.detailStatLabel}>攻撃力:</span>
                      <span style={{ ...styles.detailStatValue, color: '#ff6b6b' }}>{card.attack}</span>
                    </div>
                    <div style={styles.detailStatItem}>
                      <span style={styles.detailStatLabel}>HP:</span>
                      <span style={{ ...styles.detailStatValue, color: '#4ade80' }}>{card.hp}</span>
                    </div>
                    <div style={styles.detailStatItem}>
                      <span style={styles.detailStatLabel}>コスト:</span>
                      <span style={{ ...styles.detailStatValue, color: '#6b9dff' }}>{card.cost}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 効果テキスト */}
              {card.effect && (
                <div style={styles.detailSection}>
                  <div style={styles.detailSectionTitle}>効果</div>
                  <div style={styles.detailEffectText}>{card.effect}</div>
                </div>
              )}

              {/* 価格情報 */}
              <div style={styles.detailPriceSection}>
                <div style={styles.detailPriceRow}>
                  <span style={styles.detailPriceLabel}>市場価格</span>
                  <span style={{ ...styles.detailPriceValue, color: '#a0a0a0' }}>
                    {(detailMode === 'buy' ? item.marketPrice : item.marketPrice).toLocaleString()}G
                  </span>
                </div>
                <div style={styles.detailPriceRow}>
                  <span style={styles.detailPriceLabel}>
                    {detailMode === 'buy' ? '販売価格' : '買取価格'}
                    {item.isSpecialty && ' ⭐専門'}
                  </span>
                  <span style={styles.detailPriceValue}>
                    {price.toLocaleString()}G
                  </span>
                </div>
                {item.isBargain && (
                  <div style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: 'rgba(255,68,68,0.2)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#ff4444',
                    textAlign: 'center',
                  }}>
                    🔥 掘り出し物！
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div style={styles.detailActionButtons}>
                <button
                  style={{
                    ...styles.detailActionButton,
                    background: 'rgba(100,100,100,0.5)',
                    color: '#fff',
                  }}
                  onClick={() => setSelectedCardDetail(null)}
                >
                  閉じる
                </button>
                <button
                  style={{
                    ...styles.detailActionButton,
                    background: canAfford
                      ? (detailMode === 'buy'
                          ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                          : 'linear-gradient(90deg, #ff9800, #ffc107)')
                      : 'rgba(100,100,100,0.5)',
                    color: detailMode === 'buy' ? '#fff' : '#1a1a2e',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    opacity: canAfford ? 1 : 0.5,
                  }}
                  onClick={() => {
                    if (!canAfford) return;
                    if (detailMode === 'buy') {
                      handlePurchase(item);
                    } else {
                      handleSell(item);
                    }
                  }}
                  disabled={!canAfford}
                >
                  {detailMode === 'buy'
                    ? (canAfford ? '🛒 購入する' : '💰 所持金不足')
                    : '💰 売却する'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 確認モーダル */}
      {confirmModal && (
        <div style={styles.confirmModal} onClick={() => setConfirmModal(null)}>
          <div style={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div style={styles.confirmTitle}>
              {confirmModal.type === 'buy' ? '購入確認' : '売却確認'}
            </div>
            <div style={styles.confirmCard}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                {confirmModal.card.name}
              </div>
              <div style={{ color: RARITY_COLORS[confirmModal.item.rarity], marginBottom: '8px' }}>
                {RARITY_NAMES[confirmModal.item.rarity]}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>
                💰 {(confirmModal.type === 'buy'
                  ? confirmModal.item.price
                  : confirmModal.item.buyPrice
                ).toLocaleString()} G
              </div>
            </div>
            <div style={styles.confirmButtons}>
              <button
                style={{
                  ...styles.confirmButton,
                  background: 'rgba(100,100,100,0.5)',
                  color: '#fff',
                }}
                onClick={() => setConfirmModal(null)}
              >
                キャンセル
              </button>
              <button
                style={{
                  ...styles.confirmButton,
                  background: confirmModal.type === 'buy'
                    ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                    : 'linear-gradient(90deg, #ff9800, #ffc107)',
                  color: confirmModal.type === 'buy' ? '#fff' : '#1a1a2e',
                }}
                onClick={confirmTransaction}
              >
                {confirmModal.type === 'buy' ? '購入する' : '売却する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantShop;
