/**
 * コレクション画面
 *
 * 所持カードの一覧表示、フィルタリング、詳細表示を行う
 */

import React, { useState, useMemo } from 'react';
import { ATTRIBUTE_COLORS } from '../../utils/constants';
import { collectionManager, currencyManager, RARITIES, RARITY_COLORS } from '../index';
import CardGrid from './CardGrid';
import CardDetail from './CardDetail';

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
    background: 'linear-gradient(90deg, #ff6b9d, #c44dff, #6b9dff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  goldDisplay: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  filterBar: {
    background: 'rgba(20,20,40,0.8)',
    padding: '12px 24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderBottom: '1px solid rgba(107,76,230,0.3)',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  filterSelect: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(107,76,230,0.5)',
    background: 'rgba(30,30,50,0.8)',
    color: '#e0e0e0',
    fontSize: '13px',
    cursor: 'pointer',
  },
  searchInput: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(107,76,230,0.5)',
    background: 'rgba(30,30,50,0.8)',
    color: '#e0e0e0',
    fontSize: '13px',
    width: '200px',
  },
  mainContent: {
    flex: 1,
    padding: '16px 24px',
    overflowY: 'auto',
  },
  footer: {
    background: 'rgba(20,20,40,0.9)',
    padding: '12px 24px',
    borderTop: '1px solid rgba(107,76,230,0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: '14px',
    color: '#a0a0a0',
  },
  statsHighlight: {
    color: '#e0e0e0',
    fontWeight: 'bold',
  },
};

// ========================================
// 属性オプション
// ========================================

const ATTRIBUTE_OPTIONS = [
  { value: 'all', label: '全属性' },
  { value: '炎', label: '炎' },
  { value: '水', label: '水' },
  { value: '光', label: '光' },
  { value: '闇', label: '闇' },
  { value: '原始', label: '原始' },
  { value: '未来', label: '未来' },
  { value: 'なし', label: 'なし' },
];

const RARITY_OPTIONS = [
  { value: 'all', label: '全レアリティ' },
  ...RARITIES.map(r => ({ value: r, label: r })),
];

const TYPE_OPTIONS = [
  { value: 'all', label: '全種類' },
  { value: 'monster', label: 'モンスター' },
  { value: 'magic', label: '魔法' },
  { value: 'field', label: 'フィールド' },
  { value: 'phasecard', label: 'フェイズ' },
];

// ========================================
// メインコンポーネント
// ========================================

const CollectionScreen = ({
  playerData,
  allCards,
  cardValueMap,
  onBack,
  onSellCard,
}) => {
  // フィルタ状態
  const [attributeFilter, setAttributeFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  // 詳細表示
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedRarity, setSelectedRarity] = useState(null);

  // コレクションをカードデータと結合してフィルタリング
  const displayCards = useMemo(() => {
    // 所持カードをマップに変換
    const ownedMap = new Map();
    for (const entry of playerData.collection) {
      const key = `${entry.cardId}_${entry.rarity}`;
      ownedMap.set(key, entry);
    }

    // 全カードに対して所持情報を付加
    const result = [];

    for (const card of allCards) {
      // 所持しているレアリティを取得
      const ownedRarities = collectionManager.getOwnedRarities(playerData, card.id);

      if (ownedRarities.length === 0) continue; // 未所持はスキップ

      for (const rarity of ownedRarities) {
        const quantity = collectionManager.getQuantity(playerData, card.id, rarity);
        if (quantity <= 0) continue;

        // フィルタ適用
        if (attributeFilter !== 'all' && card.attribute !== attributeFilter) continue;
        if (rarityFilter !== 'all' && rarity !== rarityFilter) continue;
        if (typeFilter !== 'all' && card.type !== typeFilter) continue;
        if (searchText && !card.name.includes(searchText)) continue;

        result.push({
          ...card,
          rarity,
          quantity,
          valueInfo: cardValueMap?.get(card.id),
        });
      }
    }

    // ソート（レアリティ高い順、名前順）
    const rarityOrder = ['GR', 'SP', 'ALT', 'SEC', 'HR', 'UR', 'SR', 'R', 'UC', 'C'];
    result.sort((a, b) => {
      const rarityDiff = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name, 'ja');
    });

    return result;
  }, [playerData, allCards, cardValueMap, attributeFilter, rarityFilter, typeFilter, searchText]);

  // 統計計算
  const stats = useMemo(() => {
    return {
      uniqueCards: collectionManager.getUniqueCardCount(playerData),
      totalCards: collectionManager.getTotalCards(playerData),
      totalTypes: allCards.length,
    };
  }, [playerData, allCards]);

  // カード詳細を開く
  const handleCardClick = (card) => {
    setSelectedCard(card);
    setSelectedRarity(card.rarity);
  };

  // カード詳細を閉じる
  const handleCloseDetail = () => {
    setSelectedCard(null);
    setSelectedRarity(null);
  };

  // カード売却
  const handleSellCard = (cardId, rarity, quantity, card) => {
    if (onSellCard) {
      onSellCard(cardId, rarity, quantity, card);
    }
    handleCloseDetail();
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
          <span style={styles.title}>コレクション</span>
        </div>
        <div style={styles.goldDisplay}>
          💰 {currencyManager.formatGold(playerData.gold)}
        </div>
      </div>

      {/* フィルタバー */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>属性:</span>
          <select
            style={styles.filterSelect}
            value={attributeFilter}
            onChange={(e) => setAttributeFilter(e.target.value)}
          >
            {ATTRIBUTE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>レアリティ:</span>
          <select
            style={styles.filterSelect}
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
          >
            {RARITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>種類:</span>
          <select
            style={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>検索:</span>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="カード名で検索..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        <CardGrid
          cards={displayCards}
          onCardClick={handleCardClick}
        />
      </div>

      {/* フッター */}
      <div style={styles.footer}>
        <div style={styles.statsText}>
          所持: <span style={styles.statsHighlight}>{stats.uniqueCards}</span> 種 / {stats.totalTypes} 種
          {'　'}
          総枚数: <span style={styles.statsHighlight}>{stats.totalCards}</span> 枚
        </div>
        <div style={styles.statsText}>
          表示中: <span style={styles.statsHighlight}>{displayCards.length}</span> 件
        </div>
      </div>

      {/* カード詳細モーダル */}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          rarity={selectedRarity}
          quantity={selectedCard.quantity}
          valueInfo={selectedCard.valueInfo}
          onClose={handleCloseDetail}
          onSell={handleSellCard}
        />
      )}
    </div>
  );
};

export default CollectionScreen;
