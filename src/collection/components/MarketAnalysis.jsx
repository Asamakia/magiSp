/**
 * 市場分析画面
 *
 * 詳細な市場データの分析・可視化
 * - MSI（Magic Spirit Index）総合指数
 * - 属性別トレンド
 * - カテゴリランキング
 * - ティア別分析
 * - イベント履歴
 * - 個別カード検索
 */

import React, { useState, useMemo } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { ATTRIBUTES } from '../market/constants';
import { CATEGORIES, CATEGORY_ATTRIBUTES } from '../market/data/categories';
import {
  getMarketIndexChartData,
  getAttributeChartData,
  getCategoryChartData,
  getTierChartData,
  getCardChartData,
  getTrendIcon,
  getTrendColor,
  generateSparklineData,
} from '../market/priceHistory';
import { PriceChart, MiniChart, MarketIndexDisplay } from './PriceChart';

// ========================================
// 定数
// ========================================

const TIERS = ['S', 'A', 'B', 'C', 'D'];

const TABS = [
  { id: 'overview', label: '総合', icon: '📊' },
  { id: 'attributes', label: '属性', icon: '🔮' },
  { id: 'categories', label: 'カテゴリ', icon: '🏷️' },
  { id: 'tiers', label: 'ティア', icon: '⭐' },
  { id: 'events', label: 'イベント', icon: '📰' },
  { id: 'search', label: '検索', icon: '🔍' },
];

const ATTRIBUTE_COLORS = {
  '炎': '#ff6b6b',
  '水': '#4dabf7',
  '光': '#ffd43b',
  '闇': '#9775fa',
  '原始': '#69db7c',
  '未来': '#74c0fc',
  'なし': '#868e96',
};

const TIER_COLORS = {
  'S': '#ffd700',
  'A': '#c0c0c0',
  'B': '#cd7f32',
  'C': '#69db7c',
  'D': '#868e96',
};

// ========================================
// スタイル
// ========================================

const createStyles = (isMobile) => ({
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? '12px 16px' : '16px 24px',
    borderBottom: '1px solid #333',
    backgroundColor: '#1a1a2e',
    flexShrink: 0,
  },
  title: {
    fontSize: isMobile ? '18px' : '24px',
    fontWeight: 'bold',
    color: '#ffd700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  tabBar: {
    display: 'flex',
    gap: isMobile ? '4px' : '8px',
    padding: isMobile ? '8px 12px' : '12px 24px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333',
    overflowX: 'auto',
    flexShrink: 0,
  },
  tab: {
    padding: isMobile ? '8px 12px' : '10px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: isMobile ? '12px' : '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#ffd700',
    color: '#000',
  },
  tabInactive: {
    backgroundColor: '#333',
    color: '#ccc',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: isMobile ? '16px' : '24px',
  },
  contentInner: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  section: {
    marginBottom: isMobile ? '20px' : '32px',
  },
  sectionTitle: {
    fontSize: isMobile ? '16px' : '20px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: isMobile ? '12px' : '16px',
  },
  card: {
    backgroundColor: '#252540',
    borderRadius: '12px',
    padding: isMobile ? '12px' : '16px',
    border: '1px solid #333',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: isMobile ? '14px' : '16px',
    fontWeight: 'bold',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #333',
  },
  statLabel: {
    color: '#888',
    fontSize: isMobile ? '12px' : '14px',
  },
  statValue: {
    color: '#fff',
    fontSize: isMobile ? '14px' : '16px',
    fontWeight: 'bold',
  },
  sparkline: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '40px',
    gap: '2px',
  },
  sparklineBar: {
    width: isMobile ? '8px' : '12px',
    backgroundColor: '#4dabf7',
    borderRadius: '2px 2px 0 0',
    transition: 'height 0.3s',
  },
  searchInput: {
    width: '100%',
    padding: isMobile ? '10px 12px' : '12px 16px',
    fontSize: isMobile ? '14px' : '16px',
    border: '2px solid #333',
    borderRadius: '8px',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    outline: 'none',
    marginBottom: '16px',
  },
  searchResults: {
    maxHeight: '400px',
    overflow: 'auto',
  },
  searchResultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#252540',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  eventList: {
    maxHeight: isMobile ? '300px' : '400px',
    overflow: 'auto',
  },
  eventItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#252540',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  eventIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  eventContent: {
    flex: 1,
  },
  eventType: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '4px',
  },
  eventText: {
    fontSize: isMobile ? '13px' : '14px',
    color: '#fff',
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: isMobile ? '14px' : '16px',
  },
  msiDisplay: {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: isMobile ? '16px' : '24px',
    marginBottom: '24px',
    border: '2px solid #ffd700',
  },
  msiValue: {
    fontSize: isMobile ? '36px' : '48px',
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
  },
  msiLabel: {
    fontSize: isMobile ? '14px' : '16px',
    color: '#888',
    textAlign: 'center',
    marginTop: '8px',
  },
  msiCondition: {
    fontSize: isMobile ? '16px' : '20px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: '12px',
    padding: '8px 16px',
    borderRadius: '8px',
    display: 'inline-block',
  },
  chartContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: isMobile ? '12px' : '16px',
    marginTop: '16px',
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#252540',
    borderRadius: '8px',
  },
  rankingRank: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    color: '#fff',
    fontSize: isMobile ? '14px' : '16px',
    fontWeight: 'bold',
  },
  rankingAttribute: {
    color: '#888',
    fontSize: '12px',
  },
  rankingChange: {
    fontSize: isMobile ? '14px' : '16px',
    fontWeight: 'bold',
  },
});

// ========================================
// サブコンポーネント
// ========================================

/**
 * スパークライン表示
 */
const Sparkline = ({ data, color = '#4dabf7', isMobile }) => {
  if (!data || data.length === 0) {
    return <div style={{ color: '#666', fontSize: '12px' }}>データなし</div>;
  }

  return (
    <div style={createStyles(isMobile).sparkline}>
      {data.map((value, index) => (
        <div
          key={index}
          style={{
            ...createStyles(isMobile).sparklineBar,
            height: `${Math.max(value, 5)}%`,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
};

/**
 * 総合タブ
 */
const OverviewTab = ({ priceHistory, isMobile }) => {
  const styles = createStyles(isMobile);
  const msiData = getMarketIndexChartData(priceHistory);

  const getConditionStyle = (condition) => {
    const colors = {
      '好況': { bg: '#2e7d32', color: '#fff' },
      'やや好況': { bg: '#4caf50', color: '#fff' },
      '安定': { bg: '#757575', color: '#fff' },
      'やや不況': { bg: '#ff9800', color: '#000' },
      '不況': { bg: '#d32f2f', color: '#fff' },
    };
    return colors[condition] || colors['安定'];
  };

  const conditionStyle = getConditionStyle(msiData.marketCondition);

  return (
    <div>
      {/* MSI表示 */}
      <div style={styles.msiDisplay}>
        <div style={styles.msiValue}>
          {msiData.currentPrice > 0 ? msiData.currentPrice.toLocaleString() : '---'}
        </div>
        <div style={styles.msiLabel}>Magic Spirit Index (MSI)</div>
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <span
            style={{
              ...styles.msiCondition,
              backgroundColor: conditionStyle.bg,
              color: conditionStyle.color,
            }}
          >
            {msiData.marketCondition}
          </span>
        </div>
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <span style={{ color: getTrendColor(msiData.changePercent), fontSize: '18px' }}>
            {getTrendIcon(msiData.changePercent)} {msiData.changePercent > 0 ? '+' : ''}{msiData.changePercent}%
          </span>
        </div>
      </div>

      {/* MSIチャート */}
      {msiData.prices.length > 0 && (
        <div style={styles.chartContainer}>
          <PriceChart
            data={msiData.prices}
            title="MSI推移（30戦）"
            height={isMobile ? 150 : 200}
            events={msiData.events}
          />
        </div>
      )}

      {/* 属性サマリー */}
      <div style={{ ...styles.section, marginTop: '24px' }}>
        <h3 style={styles.sectionTitle}>🔮 属性別サマリー</h3>
        <div style={styles.grid}>
          {ATTRIBUTES.map((attr) => {
            const data = getAttributeChartData(priceHistory, attr);
            const sparkData = generateSparklineData(data.prices);

            return (
              <div key={attr} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span
                    style={{
                      ...styles.cardTitle,
                      color: ATTRIBUTE_COLORS[attr],
                    }}
                  >
                    {attr}属性
                  </span>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: getTrendColor(data.changePercent),
                      color: '#000',
                    }}
                  >
                    {data.changePercent > 0 ? '+' : ''}{data.changePercent}%
                  </span>
                </div>
                <Sparkline data={sparkData} color={ATTRIBUTE_COLORS[attr]} isMobile={isMobile} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * 属性タブ
 */
const AttributesTab = ({ priceHistory, isMobile }) => {
  const styles = createStyles(isMobile);
  const [selectedAttr, setSelectedAttr] = useState(ATTRIBUTES[0]);

  const data = getAttributeChartData(priceHistory, selectedAttr);

  return (
    <div>
      {/* 属性選択 */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {ATTRIBUTES.map((attr) => (
          <button
            key={attr}
            onClick={() => setSelectedAttr(attr)}
            style={{
              ...styles.tab,
              ...(selectedAttr === attr ? styles.tabActive : styles.tabInactive),
              backgroundColor: selectedAttr === attr ? ATTRIBUTE_COLORS[attr] : '#333',
            }}
          >
            {attr}
          </button>
        ))}
      </div>

      {/* 詳細データ */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={{ ...styles.cardTitle, color: ATTRIBUTE_COLORS[selectedAttr] }}>
            {selectedAttr}属性 詳細分析
          </span>
          <span
            style={{
              ...styles.badge,
              backgroundColor: getTrendColor(data.changePercent),
              color: '#000',
            }}
          >
            {getTrendIcon(data.changePercent)} {data.changePercent > 0 ? '+' : ''}{data.changePercent}%
          </span>
        </div>

        <div style={styles.statRow}>
          <span style={styles.statLabel}>現在平均</span>
          <span style={styles.statValue}>{data.currentPrice.toLocaleString()} G</span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>最高値</span>
          <span style={{ ...styles.statValue, color: '#4caf50' }}>{data.highPrice.toLocaleString()} G</span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>最安値</span>
          <span style={{ ...styles.statValue, color: '#f44336' }}>{data.lowPrice.toLocaleString()} G</span>
        </div>

        {data.prices.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <PriceChart
              data={data.prices}
              title={`${selectedAttr}属性 価格推移`}
              height={isMobile ? 150 : 200}
              color={ATTRIBUTE_COLORS[selectedAttr]}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * カテゴリタブ
 */
const CategoriesTab = ({ priceHistory, isMobile }) => {
  const styles = createStyles(isMobile);

  // カテゴリを変動率でソート
  const sortedCategories = useMemo(() => {
    return CATEGORIES
      .map((cat) => {
        const data = getCategoryChartData(priceHistory, cat);
        return {
          name: cat,
          attribute: CATEGORY_ATTRIBUTES[cat] || '複数',
          ...data,
        };
      })
      .sort((a, b) => b.changePercent - a.changePercent);
  }, [priceHistory]);

  const getRankColor = (index) => {
    if (index === 0) return '#ffd700';
    if (index === 1) return '#c0c0c0';
    if (index === 2) return '#cd7f32';
    return '#555';
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>🏷️ カテゴリランキング（変動率順）</h3>

      <div style={styles.rankingList}>
        {sortedCategories.map((cat, index) => (
          <div key={cat.name} style={styles.rankingItem}>
            <div
              style={{
                ...styles.rankingRank,
                backgroundColor: getRankColor(index),
                color: index < 3 ? '#000' : '#fff',
              }}
            >
              {index + 1}
            </div>
            <div style={styles.rankingInfo}>
              <div style={styles.rankingName}>【{cat.name}】</div>
              <div style={styles.rankingAttribute}>
                <span style={{ color: ATTRIBUTE_COLORS[cat.attribute] || '#888' }}>
                  {cat.attribute}属性
                </span>
                {' · '}
                <span>平均 {cat.currentPrice.toLocaleString()} G</span>
              </div>
            </div>
            <div
              style={{
                ...styles.rankingChange,
                color: getTrendColor(cat.changePercent),
              }}
            >
              {getTrendIcon(cat.changePercent)} {cat.changePercent > 0 ? '+' : ''}{cat.changePercent}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * ティアタブ
 */
const TiersTab = ({ priceHistory, isMobile }) => {
  const styles = createStyles(isMobile);

  return (
    <div>
      <h3 style={styles.sectionTitle}>⭐ ティア別分析</h3>

      <div style={styles.grid}>
        {TIERS.map((tier) => {
          const data = getTierChartData(priceHistory, tier);
          const sparkData = generateSparklineData(data.prices);

          return (
            <div key={tier} style={styles.card}>
              <div style={styles.cardHeader}>
                <span
                  style={{
                    ...styles.cardTitle,
                    color: TIER_COLORS[tier],
                  }}
                >
                  ⭐ {tier}ティア
                </span>
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: getTrendColor(data.changePercent),
                    color: '#000',
                  }}
                >
                  {data.changePercent > 0 ? '+' : ''}{data.changePercent}%
                </span>
              </div>

              <div style={styles.statRow}>
                <span style={styles.statLabel}>現在平均</span>
                <span style={styles.statValue}>{data.currentPrice.toLocaleString()} G</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>最高値</span>
                <span style={{ ...styles.statValue, color: '#4caf50' }}>{data.highPrice.toLocaleString()} G</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>最安値</span>
                <span style={{ ...styles.statValue, color: '#f44336' }}>{data.lowPrice.toLocaleString()} G</span>
              </div>

              <div style={{ marginTop: '12px' }}>
                <Sparkline data={sparkData} color={TIER_COLORS[tier]} isMobile={isMobile} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * イベントタブ
 */
const EventsTab = ({ priceHistory, isMobile }) => {
  const styles = createStyles(isMobile);

  const events = [...(priceHistory.events || [])].reverse();

  const getEventIcon = (type) => {
    switch (type) {
      case 'sudden':
        return '⚡';
      case 'daily':
        return '📰';
      default:
        return '📌';
    }
  };

  const getEventTypeName = (type) => {
    switch (type) {
      case 'sudden':
        return '突発イベント';
      case 'daily':
        return 'デイリーニュース';
      default:
        return 'イベント';
    }
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>📰 イベント履歴</h3>

      {events.length === 0 ? (
        <div style={styles.noData}>
          イベント履歴がありません
        </div>
      ) : (
        <div style={styles.eventList}>
          {events.map((event, index) => (
            <div key={index} style={styles.eventItem}>
              <div style={styles.eventIcon}>{getEventIcon(event.type)}</div>
              <div style={styles.eventContent}>
                <div style={styles.eventType}>
                  {getEventTypeName(event.type)} · Day {event.day}
                </div>
                <div style={styles.eventText}>{event.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 検索タブ
 */
const SearchTab = ({ priceHistory, allCards, isMobile, onCardSelect }) => {
  const styles = createStyles(isMobile);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  const filteredCards = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return (allCards || [])
      .filter(
        (card) =>
          card.name?.toLowerCase().includes(query) ||
          card.category?.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [searchQuery, allCards]);

  const handleCardClick = (card) => {
    setSelectedCard(card);
    if (onCardSelect) {
      onCardSelect(card);
    }
  };

  const cardData = selectedCard
    ? getCardChartData(priceHistory, selectedCard.id, 1)
    : null;

  return (
    <div>
      <h3 style={styles.sectionTitle}>🔍 カード検索</h3>

      <input
        type="text"
        placeholder="カード名またはカテゴリで検索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={styles.searchInput}
      />

      {selectedCard && cardData ? (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>
              <span style={{ color: ATTRIBUTE_COLORS[selectedCard.attribute] || '#fff' }}>
                {selectedCard.name}
              </span>
            </span>
            <button
              onClick={() => setSelectedCard(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ✕
            </button>
          </div>

          <div style={styles.statRow}>
            <span style={styles.statLabel}>属性</span>
            <span style={{ ...styles.statValue, color: ATTRIBUTE_COLORS[selectedCard.attribute] }}>
              {selectedCard.attribute}
            </span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>カテゴリ</span>
            <span style={styles.statValue}>{selectedCard.category || '-'}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>現在価格</span>
            <span style={styles.statValue}>{cardData.currentPrice.toLocaleString()} G</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>変動率</span>
            <span style={{ ...styles.statValue, color: getTrendColor(cardData.changePercent) }}>
              {getTrendIcon(cardData.changePercent)} {cardData.changePercent > 0 ? '+' : ''}{cardData.changePercent}%
            </span>
          </div>

          {cardData.prices.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <PriceChart
                data={cardData.prices}
                title="価格推移"
                height={isMobile ? 150 : 200}
                color={ATTRIBUTE_COLORS[selectedCard.attribute] || '#4dabf7'}
              />
            </div>
          )}
        </div>
      ) : (
        <div style={styles.searchResults}>
          {filteredCards.length > 0 ? (
            filteredCards.map((card) => (
              <div
                key={card.id}
                style={styles.searchResultItem}
                onClick={() => handleCardClick(card)}
              >
                <div>
                  <div style={{ color: ATTRIBUTE_COLORS[card.attribute] || '#fff', fontWeight: 'bold' }}>
                    {card.name}
                  </div>
                  <div style={{ color: '#888', fontSize: '12px' }}>
                    {card.attribute} · {card.category || '-'}
                  </div>
                </div>
                <div style={{ color: '#888' }}>→</div>
              </div>
            ))
          ) : searchQuery.length >= 2 ? (
            <div style={styles.noData}>該当するカードが見つかりません</div>
          ) : (
            <div style={styles.noData}>2文字以上入力してください</div>
          )}
        </div>
      )}
    </div>
  );
};

// ========================================
// メインコンポーネント
// ========================================

/**
 * 市場分析画面
 *
 * @param {Object} props
 * @param {Object} props.marketState - 市場状態
 * @param {Object[]} props.allCards - 全カードデータ
 * @param {Function} props.onClose - 閉じるコールバック
 * @param {Function} props.onCardSelect - カード選択コールバック（オプション）
 */
const MarketAnalysis = ({ marketState, allCards, onClose, onCardSelect }) => {
  const isMobile = useIsMobile();
  const styles = createStyles(isMobile);
  const [activeTab, setActiveTab] = useState('overview');

  const priceHistory = marketState?.priceHistory || {
    cards: {},
    attributes: {},
    categories: {},
    tiers: {},
    marketIndex: [],
    events: [],
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab priceHistory={priceHistory} isMobile={isMobile} />;
      case 'attributes':
        return <AttributesTab priceHistory={priceHistory} isMobile={isMobile} />;
      case 'categories':
        return <CategoriesTab priceHistory={priceHistory} isMobile={isMobile} />;
      case 'tiers':
        return <TiersTab priceHistory={priceHistory} isMobile={isMobile} />;
      case 'events':
        return <EventsTab priceHistory={priceHistory} isMobile={isMobile} />;
      case 'search':
        return (
          <SearchTab
            priceHistory={priceHistory}
            allCards={allCards}
            isMobile={isMobile}
            onCardSelect={onCardSelect}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={styles.title}>
          📊 市場分析
        </div>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      {/* タブバー */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : styles.tabInactive),
            }}
          >
            {tab.icon} {!isMobile && tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={styles.content}>
        <div style={styles.contentInner}>{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default MarketAnalysis;
