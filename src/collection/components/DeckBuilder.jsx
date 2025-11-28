/**
 * デッキ構築画面
 *
 * 所持カードからデッキを構築・編集する
 */

import React, { useState, useMemo } from 'react';
import { ATTRIBUTE_COLORS } from '../../utils/constants';
import { RARITY_COLORS, RARITY_NAMES } from '../data/constants';
import { collectionManager } from '../systems/collectionManager';

// ========================================
// 定数
// ========================================

const DECK_SIZE = 40;
const MAX_COPIES = 3; // 同名カード最大枚数（公式ルール準拠）
const MAX_FORBIDDEN = 1; // 禁忌カード最大枚数

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
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#a78bfa',
  },
  deckInfo: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  deckCount: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  // 左側: カード一覧
  cardListPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(107,76,230,0.3)',
    overflow: 'hidden',
  },
  filterBar: {
    padding: '12px',
    background: 'rgba(20,20,40,0.8)',
    borderBottom: '1px solid rgba(107,76,230,0.3)',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterSelect: {
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid rgba(107,76,230,0.5)',
    background: '#1a1a2e',
    color: '#e0e0e0',
    cursor: 'pointer',
  },
  searchInput: {
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid rgba(107,76,230,0.5)',
    background: '#1a1a2e',
    color: '#e0e0e0',
    flex: 1,
    minWidth: '150px',
  },
  cardGrid: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '8px',
    alignContent: 'start',
  },
  cardItem: {
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    position: 'relative',
  },
  cardCost: {
    position: 'absolute',
    top: '4px',
    left: '4px',
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
  cardRarity: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#fff',
  },
  cardName: {
    fontSize: '10px',
    textAlign: 'center',
    color: '#fff',
    marginTop: '24px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
  cardQuantity: {
    fontSize: '10px',
    color: '#a0a0a0',
  },
  cardDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  // 右側: デッキ内容
  deckPanel: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(20,20,40,0.5)',
  },
  deckHeader: {
    padding: '12px',
    background: 'rgba(20,20,40,0.8)',
    borderBottom: '1px solid rgba(107,76,230,0.3)',
  },
  deckNameInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid rgba(107,76,230,0.5)',
    background: '#1a1a2e',
    color: '#e0e0e0',
    marginBottom: '8px',
  },
  deckStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#a0a0a0',
  },
  deckList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  deckCardItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '4px',
    marginBottom: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deckCardCost: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#fff',
    flexShrink: 0,
  },
  deckCardName: {
    flex: 1,
    fontSize: '12px',
    color: '#e0e0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deckCardCount: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#a78bfa',
  },
  deckCardRarity: {
    fontSize: '10px',
    padding: '2px 4px',
    borderRadius: '3px',
    color: '#fff',
  },
  deckFooter: {
    padding: '12px',
    background: 'rgba(20,20,40,0.8)',
    borderTop: '1px solid rgba(107,76,230,0.3)',
    display: 'flex',
    gap: '8px',
  },
  saveButton: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
  saveButtonDisabled: {
    background: 'rgba(100,100,100,0.5)',
    cursor: 'not-allowed',
  },
  clearButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,100,100,0.5)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'rgba(255,100,100,0.2)',
    color: '#ff6b6b',
    transition: 'all 0.3s ease',
  },
  errorMessage: {
    padding: '8px 12px',
    background: 'rgba(255,100,100,0.2)',
    border: '1px solid rgba(255,100,100,0.5)',
    borderRadius: '6px',
    color: '#ff6b6b',
    fontSize: '12px',
    marginTop: '8px',
  },
  emptyMessage: {
    padding: '24px',
    textAlign: 'center',
    color: '#808080',
    fontSize: '14px',
  },
};

// ========================================
// メインコンポーネント
// ========================================

const DeckBuilder = ({
  playerData,
  allCards,
  cardValueMap,
  editingDeck = null, // 編集中のデッキ（nullなら新規作成）
  onBack,
  onSave,
}) => {
  // フィルタ状態
  const [filterAttribute, setFilterAttribute] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');
  const [searchText, setSearchText] = useState('');

  // デッキ状態
  const [deckName, setDeckName] = useState(editingDeck?.name || '新しいデッキ');
  const [deckCards, setDeckCards] = useState(editingDeck?.cards || []);
  // deckCards: [{ cardId, rarity }, ...]

  const [error, setError] = useState(null);

  // 所持カード一覧を生成（カードID + レアリティでグループ化）
  const ownedCards = useMemo(() => {
    if (!playerData?.collection) return [];

    const cardMap = new Map();

    playerData.collection.forEach(entry => {
      const card = allCards.find(c => c.id === entry.cardId);
      if (!card) return;

      const key = `${entry.cardId}_${entry.rarity}`;
      cardMap.set(key, {
        card,
        cardId: entry.cardId,
        rarity: entry.rarity,
        quantity: entry.quantity,
      });
    });

    return Array.from(cardMap.values());
  }, [playerData, allCards]);

  // フィルタリングされたカード一覧
  const filteredCards = useMemo(() => {
    return ownedCards.filter(({ card, rarity }) => {
      if (filterAttribute !== 'all' && card.attribute !== filterAttribute) return false;
      if (filterType !== 'all' && card.type !== filterType) return false;
      if (filterRarity !== 'all' && rarity !== filterRarity) return false;
      if (searchText && !card.name.includes(searchText)) return false;
      return true;
    }).sort((a, b) => {
      // コスト順 → 名前順
      if (a.card.cost !== b.card.cost) return a.card.cost - b.card.cost;
      return a.card.name.localeCompare(b.card.name);
    });
  }, [ownedCards, filterAttribute, filterType, filterRarity, searchText]);

  // デッキ内のカード数をカウント
  const getCardCountInDeck = (cardId) => {
    return deckCards.filter(c => c.cardId === cardId).length;
  };

  // デッキ内の禁忌カード数をカウント
  const getForbiddenCountInDeck = () => {
    return deckCards.filter(c => {
      const card = allCards.find(ac => ac.id === c.cardId);
      return card?.forbidden || (card?.keyword && card.keyword.includes('禁忌'));
    }).length;
  };

  // カードを追加できるか判定
  const canAddCard = (cardId, rarity, quantity) => {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return { can: false, reason: 'カードが見つかりません' };

    // デッキ枚数上限
    if (deckCards.length >= DECK_SIZE) {
      return { can: false, reason: `デッキは${DECK_SIZE}枚までです` };
    }

    // 同名カード上限
    const currentCount = getCardCountInDeck(cardId);
    if (currentCount >= MAX_COPIES) {
      return { can: false, reason: `同名カードは${MAX_COPIES}枚までです` };
    }

    // 所持枚数チェック
    if (currentCount >= quantity) {
      return { can: false, reason: '所持枚数を超えています' };
    }

    // 禁忌カード上限
    const isForbidden = card.forbidden || (card.keyword && card.keyword.includes('禁忌'));
    if (isForbidden && getForbiddenCountInDeck() >= MAX_FORBIDDEN) {
      return { can: false, reason: `禁忌カードは${MAX_FORBIDDEN}枚までです` };
    }

    return { can: true };
  };

  // カードをデッキに追加
  const addCardToDeck = (cardId, rarity, quantity) => {
    const check = canAddCard(cardId, rarity, quantity);
    if (!check.can) {
      setError(check.reason);
      setTimeout(() => setError(null), 2000);
      return;
    }

    setDeckCards(prev => [...prev, { cardId, rarity }]);
    setError(null);
  };

  // カードをデッキから削除
  const removeCardFromDeck = (index) => {
    setDeckCards(prev => prev.filter((_, i) => i !== index));
  };

  // デッキをクリア
  const clearDeck = () => {
    setDeckCards([]);
    setError(null);
  };

  // デッキを保存
  const saveDeck = () => {
    if (deckCards.length !== DECK_SIZE) {
      setError(`デッキは${DECK_SIZE}枚必要です（現在${deckCards.length}枚）`);
      return;
    }

    if (!deckName.trim()) {
      setError('デッキ名を入力してください');
      return;
    }

    const deck = {
      id: editingDeck?.id || `deck_${Date.now()}`,
      name: deckName.trim(),
      cards: deckCards,
      createdAt: editingDeck?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(deck);
  };

  // デッキ内カードをグループ化して表示用に整形
  const groupedDeckCards = useMemo(() => {
    const groups = new Map();

    deckCards.forEach((entry, index) => {
      const key = `${entry.cardId}_${entry.rarity}`;
      if (!groups.has(key)) {
        const card = allCards.find(c => c.id === entry.cardId);
        groups.set(key, {
          card,
          cardId: entry.cardId,
          rarity: entry.rarity,
          count: 0,
          indices: [],
        });
      }
      const group = groups.get(key);
      group.count++;
      group.indices.push(index);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.card.cost !== b.card.cost) return a.card.cost - b.card.cost;
      return a.card.name.localeCompare(b.card.name);
    });
  }, [deckCards, allCards]);

  // 属性一覧
  const attributes = ['all', '炎', '水', '光', '闇', '原始', '未来', 'なし'];
  const types = ['all', 'monster', 'magic', 'field', 'phase'];
  const rarities = ['all', 'C', 'UC', 'R', 'SR', 'UR', 'HR', 'SEC', 'ALT', 'SP', 'GR'];

  const canSave = deckCards.length === DECK_SIZE && deckName.trim();

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
          <span style={styles.title}>デッキ構築</span>
        </div>
        <div style={styles.deckInfo}>
          <span style={{
            ...styles.deckCount,
            color: deckCards.length === DECK_SIZE ? '#6bff6b' : '#ff6b6b',
          }}>
            {deckCards.length} / {DECK_SIZE} 枚
          </span>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        {/* 左側: カード一覧 */}
        <div style={styles.cardListPanel}>
          {/* フィルタバー */}
          <div style={styles.filterBar}>
            <select
              value={filterAttribute}
              onChange={(e) => setFilterAttribute(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">全属性</option>
              {attributes.slice(1).map(attr => (
                <option key={attr} value={attr}>{attr}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">全タイプ</option>
              <option value="monster">モンスター</option>
              <option value="magic">魔法</option>
              <option value="field">フィールド</option>
              <option value="phase">フェイズ</option>
            </select>

            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">全レアリティ</option>
              {rarities.slice(1).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="カード名で検索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* カードグリッド */}
          <div style={styles.cardGrid}>
            {filteredCards.length === 0 ? (
              <div style={styles.emptyMessage}>
                条件に一致するカードがありません
              </div>
            ) : (
              filteredCards.map(({ card, cardId, rarity, quantity }) => {
                const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
                const rarityColor = RARITY_COLORS[rarity] || '#808080';
                const countInDeck = getCardCountInDeck(cardId);
                const check = canAddCard(cardId, rarity, quantity);
                const isDisabled = !check.can;

                return (
                  <div
                    key={`${cardId}_${rarity}`}
                    style={{
                      ...styles.cardItem,
                      background: colors.bg,
                      border: `2px solid ${rarityColor}`,
                      ...(isDisabled ? styles.cardDisabled : {}),
                    }}
                    onClick={() => !isDisabled && addCardToDeck(cardId, rarity, quantity)}
                    title={isDisabled ? check.reason : `クリックでデッキに追加`}
                  >
                    <div style={styles.cardCost}>{card.cost}</div>
                    <div style={{
                      ...styles.cardRarity,
                      background: rarityColor,
                    }}>
                      {rarity}
                    </div>
                    <div style={styles.cardName}>{card.name}</div>
                    <div style={styles.cardQuantity}>
                      {countInDeck}/{quantity}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右側: デッキ内容 */}
        <div style={styles.deckPanel}>
          <div style={styles.deckHeader}>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="デッキ名"
              style={styles.deckNameInput}
            />
            <div style={styles.deckStats}>
              <span>モンスター: {deckCards.filter(c => allCards.find(ac => ac.id === c.cardId)?.type === 'monster').length}</span>
              <span>魔法: {deckCards.filter(c => allCards.find(ac => ac.id === c.cardId)?.type === 'magic').length}</span>
              <span>その他: {deckCards.filter(c => {
                const card = allCards.find(ac => ac.id === c.cardId);
                return card?.type !== 'monster' && card?.type !== 'magic';
              }).length}</span>
            </div>
            {error && (
              <div style={styles.errorMessage}>{error}</div>
            )}
          </div>

          <div style={styles.deckList}>
            {groupedDeckCards.length === 0 ? (
              <div style={styles.emptyMessage}>
                左のカード一覧からカードを選択してください
              </div>
            ) : (
              groupedDeckCards.map(({ card, cardId, rarity, count, indices }) => {
                const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
                const rarityColor = RARITY_COLORS[rarity] || '#808080';

                return (
                  <div
                    key={`${cardId}_${rarity}`}
                    style={{
                      ...styles.deckCardItem,
                      background: `${colors.bg}80`,
                    }}
                    onClick={() => removeCardFromDeck(indices[indices.length - 1])}
                    title="クリックで1枚削除"
                  >
                    <div style={styles.deckCardCost}>{card.cost}</div>
                    <div style={styles.deckCardName}>{card.name}</div>
                    <div style={{
                      ...styles.deckCardRarity,
                      background: rarityColor,
                    }}>
                      {rarity}
                    </div>
                    <div style={styles.deckCardCount}>×{count}</div>
                  </div>
                );
              })
            )}
          </div>

          <div style={styles.deckFooter}>
            <button
              style={styles.clearButton}
              onClick={clearDeck}
            >
              クリア
            </button>
            <button
              style={{
                ...styles.saveButton,
                ...(canSave ? {} : styles.saveButtonDisabled),
              }}
              onClick={saveDeck}
              disabled={!canSave}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;
