/**
 * 価格チャートコンポーネント
 *
 * ASCIIベースのシンプルなチャート表示
 */

import React from 'react';
import {
  getTrendIcon,
  getTrendColor,
  generateSparklineData,
} from '../market/priceHistory';

// ========================================
// スタイル
// ========================================

const styles = {
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  change: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  chartArea: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '40px',
    gap: '2px',
    marginBottom: '8px',
  },
  bar: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: '2px 2px 0 0',
    minWidth: '4px',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#888',
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    color: '#fff',
    fontWeight: 'bold',
  },
  miniChart: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  sparkline: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '16px',
    gap: '1px',
  },
  sparkBar: {
    width: '3px',
    backgroundColor: '#4CAF50',
    borderRadius: '1px 1px 0 0',
  },
  marketCondition: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
};

// ========================================
// メインチャートコンポーネント
// ========================================

/**
 * 価格チャート
 *
 * @param {Object} props
 * @param {string} props.title - チャートタイトル
 * @param {Object} props.chartData - チャートデータ
 * @param {string} [props.suffix='G'] - 価格の接尾辞
 */
export const PriceChart = ({ title, chartData, suffix = 'G' }) => {
  if (!chartData || chartData.prices.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>{title}</div>
        <div style={{ color: '#666', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>
          データなし
        </div>
      </div>
    );
  }

  const { prices, currentPrice, highPrice, lowPrice, changePercent } = chartData;
  const trendColor = getTrendColor(changePercent);
  const trendIcon = getTrendIcon(changePercent);

  // 正規化されたバーの高さを計算
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const normalizedHeights = prices.map(p => Math.round((p - min) / range * 100));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        <span style={{ ...styles.change, color: trendColor }}>
          {trendIcon} {changePercent > 0 ? '+' : ''}{changePercent}%
        </span>
      </div>

      <div style={styles.chartArea}>
        {normalizedHeights.map((height, i) => (
          <div
            key={i}
            style={{
              ...styles.bar,
              height: `${Math.max(height, 5)}%`,
              backgroundColor: i === normalizedHeights.length - 1 ? trendColor : '#444',
            }}
          />
        ))}
      </div>

      <div style={styles.stats}>
        <div style={styles.statItem}>
          <div>現在</div>
          <div style={styles.statValue}>{currentPrice.toLocaleString()}{suffix}</div>
        </div>
        <div style={styles.statItem}>
          <div>最高</div>
          <div style={{ ...styles.statValue, color: '#4CAF50' }}>{highPrice.toLocaleString()}{suffix}</div>
        </div>
        <div style={styles.statItem}>
          <div>最安</div>
          <div style={{ ...styles.statValue, color: '#F44336' }}>{lowPrice.toLocaleString()}{suffix}</div>
        </div>
      </div>
    </div>
  );
};

// ========================================
// ミニチャートコンポーネント
// ========================================

/**
 * ミニスパークラインチャート（インライン表示用）
 *
 * @param {Object} props
 * @param {number[]} props.prices - 価格配列
 * @param {number} props.changePercent - 変動率
 */
export const MiniChart = ({ prices, changePercent }) => {
  const sparklineData = generateSparklineData(prices);
  const trendColor = getTrendColor(changePercent);
  const trendIcon = getTrendIcon(changePercent);

  return (
    <div style={styles.miniChart}>
      <div style={styles.sparkline}>
        {sparklineData.map((height, i) => (
          <div
            key={i}
            style={{
              ...styles.sparkBar,
              height: `${Math.max(height, 10)}%`,
              backgroundColor: trendColor,
              opacity: i === sparklineData.length - 1 ? 1 : 0.5,
            }}
          />
        ))}
      </div>
      <span style={{ color: trendColor, fontSize: '12px' }}>
        {trendIcon}
      </span>
    </div>
  );
};

// ========================================
// 市場指数コンポーネント
// ========================================

/**
 * 市場指数（MSI）表示
 *
 * @param {Object} props
 * @param {Object} props.chartData - マーケットインデックスチャートデータ
 */
export const MarketIndexDisplay = ({ chartData }) => {
  if (!chartData || chartData.prices.length === 0) {
    return null;
  }

  const { currentPrice, changePercent, marketCondition } = chartData;
  const trendColor = getTrendColor(changePercent);

  const conditionColors = {
    '好況': '#4CAF50',
    'やや好況': '#8BC34A',
    '安定': '#FFC107',
    'やや不況': '#FF9800',
    '不況': '#F44336',
  };

  return (
    <div style={{ ...styles.container, padding: '8px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#888', fontSize: '11px' }}>MSI（市場指数）</span>
          <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>
            {currentPrice.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              ...styles.marketCondition,
              backgroundColor: conditionColors[marketCondition] || '#666',
              color: '#fff',
            }}
          >
            {marketCondition}
          </span>
          <div style={{ color: trendColor, fontSize: '12px', marginTop: '4px' }}>
            {changePercent > 0 ? '+' : ''}{changePercent}%
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================
// イベントマーカーコンポーネント
// ========================================

/**
 * イベントマーカー表示
 *
 * @param {Object} props
 * @param {Object[]} props.events - イベント配列
 */
export const EventMarkers = ({ events }) => {
  if (!events || events.length === 0) return null;

  const recentEvents = events.slice(-5);

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>直近のイベント</div>
      {recentEvents.map((event, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#ccc',
            marginBottom: '2px',
          }}
        >
          <span>{event.type === 'sudden' ? '⚡' : '📰'}</span>
          <span>{event.text}</span>
        </div>
      ))}
    </div>
  );
};

// ========================================
// エクスポート
// ========================================

export default PriceChart;
