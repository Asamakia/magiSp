/**
 * コレクション画面
 *
 * 所持カードの一覧表示、フィルタリング、詳細表示を行う
 */

import React, { useState, useMemo } from 'react';
import { ATTRIBUTE_COLORS } from '../../utils/constants';
import { collectionManager } from '../systems/collectionManager';
import { currencyManager } from '../systems/currencyManager';
import { RARITIES, RARITY_COLORS, TIERS } from '../data/constants';
import CardGrid from './CardGrid';
import CardDetail from './CardDetail';
import { EFFECT_LEVELS } from '../../styles/rarityEffects';

// ========================================
// 設定パネルコンポーネント
// ========================================

const SettingsPanel = ({ settings, onSettingsChange, onClose }) => {
  const effectLevelOptions = [
    { value: EFFECT_LEVELS.FULL, label: 'フル', desc: 'ホロ、パーティクル、光沢など全て' },
    { value: EFFECT_LEVELS.MINIMAL, label: '控えめ', desc: '枠色のみ' },
    { value: EFFECT_LEVELS.OFF, label: 'オフ', desc: 'レアリティ表示なし' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a3a 0%, #2a2a4a 100%)',
        borderRadius: '16px',
        padding: '24px',
        minWidth: '320px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        border: '2px solid rgba(107,76,230,0.5)',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          color: '#ffd700',
          textAlign: 'center',
        }}>
          ⚙️ 設定
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '14px',
            color: '#e0e0e0',
            marginBottom: '12px',
            fontWeight: 'bold',
          }}>
            レアリティ演出
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {effectLevelOptions.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: settings.rarityEffectLevel === opt.value
                    ? 'rgba(107,76,230,0.4)'
                    : 'rgba(30,30,50,0.6)',
                  border: settings.rarityEffectLevel === opt.value
                    ? '2px solid #6b4ce6'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="radio"
                  name="effectLevel"
                  value={opt.value}
                  checked={settings.rarityEffectLevel === opt.value}
                  onChange={() => onSettingsChange({
                    ...settings,
                    rarityEffectLevel: opt.value,
                  })}
                  style={{ accentColor: '#6b4ce6' }}
                />
                <div>
                  <div style={{ color: '#e0e0e0', fontWeight: 'bold' }}>{opt.label}</div>
                  <div style={{ color: '#a0a0a0', fontSize: '12px' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

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

const TIER_OPTIONS = [
  { value: 'all', label: '全ティア' },
  ...TIERS.map(t => ({ value: t, label: `ティア${t}` })),
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
  onSettingsChange,
}) => {
  // フィルタ状態
  const [attributeFilter, setAttributeFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  // 詳細表示
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedRarity, setSelectedRarity] = useState(null);

  // 設定パネル
  const [showSettings, setShowSettings] = useState(false);

  // 現在の設定（デフォルト値とマージ）
  const settings = {
    rarityEffectLevel: EFFECT_LEVELS.FULL,
    ...playerData.settings,
  };

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

        // 価値情報を取得
        const valueInfo = cardValueMap?.get(card.id);
        const tier = valueInfo?.tier || 'D';

        // フィルタ適用
        if (attributeFilter !== 'all' && card.attribute !== attributeFilter) continue;
        if (rarityFilter !== 'all' && rarity !== rarityFilter) continue;
        if (typeFilter !== 'all' && card.type !== typeFilter) continue;
        if (tierFilter !== 'all' && tier !== tierFilter) continue;
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
  }, [playerData, allCards, cardValueMap, attributeFilter, rarityFilter, typeFilter, tierFilter, searchText]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            style={{
              ...styles.backButton,
              padding: '8px 12px',
            }}
            onClick={() => setShowSettings(true)}
            onMouseEnter={(e) => e.target.style.background = 'rgba(107,76,230,0.5)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(107,76,230,0.3)'}
            title="設定"
          >
            ⚙️
          </button>
          <div style={styles.goldDisplay}>
            💰 {currencyManager.formatGold(playerData.gold)}
          </div>
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
          <span style={styles.filterLabel}>ティア:</span>
          <select
            style={styles.filterSelect}
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            {TIER_OPTIONS.map(opt => (
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
          effectLevel={settings.rarityEffectLevel}
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
          priceHistory={playerData.market?.priceHistory}
          marketState={playerData.market}
          onClose={handleCloseDetail}
          onSell={handleSellCard}
        />
      )}

      {/* 設定パネル */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={onSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default CollectionScreen;
