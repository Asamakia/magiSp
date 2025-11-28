/**
 * デッキ一覧画面
 *
 * 保存済みデッキの表示・選択・削除を行う
 */

import React, { useState } from 'react';
import { DECK } from '../data/constants';

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
    background: 'linear-gradient(90deg, #4ecdc4, #44a08d, #4ecdc4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  mainContent: {
    flex: 1,
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  deckGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    width: '100%',
    maxWidth: '900px',
  },
  deckCard: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 50%, #2a2a4a 100%)',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid #4a4a6a',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  deckCardHover: {
    border: '2px solid #6b4ce6',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 20px rgba(107,76,230,0.3)',
  },
  newDeckCard: {
    background: 'linear-gradient(135deg, #1a3a2a 0%, #2a4a3a 50%, #1a3a2a 100%)',
    border: '2px dashed #4ecdc4',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '150px',
  },
  newDeckIcon: {
    fontSize: '36px',
    marginBottom: '8px',
  },
  newDeckText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  deckName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deckInfo: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#a0a0a0',
    marginBottom: '12px',
  },
  deckCardCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  deckActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  editButton: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
  deleteButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,100,100,0.5)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
    background: 'rgba(255,100,100,0.2)',
    color: '#ff6b6b',
    transition: 'all 0.3s ease',
  },
  emptyMessage: {
    padding: '48px',
    textAlign: 'center',
    color: '#808080',
    fontSize: '16px',
  },
  confirmDialog: {
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
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #6b4ce6',
    maxWidth: '400px',
    textAlign: 'center',
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '16px',
  },
  confirmText: {
    fontSize: '14px',
    color: '#a0a0a0',
    marginBottom: '24px',
  },
  confirmActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  confirmButton: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  cancelButton: {
    background: 'rgba(107,76,230,0.3)',
    color: '#e0e0e0',
    border: '1px solid rgba(107,76,230,0.5)',
  },
  dangerButton: {
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%)',
    color: '#fff',
  },
  statsBar: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
};

// ========================================
// メインコンポーネント
// ========================================

const DeckList = ({
  playerData,
  allCards,
  onBack,
  onCreateNew,
  onEditDeck,
  onDeleteDeck,
}) => {
  const [hoveredDeck, setHoveredDeck] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const userDecks = playerData?.userDecks || [];

  // デッキのカード統計を計算
  const getDeckStats = (deck) => {
    if (!deck.cards || deck.cards.length === 0) {
      return { total: 0, monsters: 0, magic: 0, other: 0 };
    }

    let monsters = 0;
    let magic = 0;
    let other = 0;

    deck.cards.forEach(({ cardId }) => {
      const card = allCards.find(c => c.id === cardId);
      if (card) {
        if (card.type === 'monster') monsters++;
        else if (card.type === 'magic') magic++;
        else other++;
      }
    });

    return {
      total: deck.cards.length,
      monsters,
      magic,
      other,
    };
  };

  // 削除確認
  const handleDeleteClick = (e, deck) => {
    e.stopPropagation();
    setDeleteTarget(deck);
  };

  // 削除実行
  const confirmDelete = () => {
    if (deleteTarget && onDeleteDeck) {
      onDeleteDeck(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  // 編集ボタン
  const handleEditClick = (e, deck) => {
    e.stopPropagation();
    onEditDeck(deck);
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
          <span style={styles.title}>マイデッキ</span>
        </div>
        <div style={{ color: '#a0a0a0', fontSize: '14px' }}>
          {userDecks.length} / {DECK.MAX_USER_DECKS || 10} デッキ
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        <div style={styles.deckGrid}>
          {/* 新規作成カード */}
          <div
            style={{
              ...styles.deckCard,
              ...styles.newDeckCard,
              ...(hoveredDeck === 'new' ? {
                border: '2px dashed #6bffb8',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(78,205,196,0.3)',
              } : {}),
            }}
            onClick={onCreateNew}
            onMouseEnter={() => setHoveredDeck('new')}
            onMouseLeave={() => setHoveredDeck(null)}
          >
            <div style={styles.newDeckIcon}>+</div>
            <div style={styles.newDeckText}>新しいデッキを作成</div>
          </div>

          {/* 既存デッキ一覧 */}
          {userDecks.map((deck) => {
            const stats = getDeckStats(deck);
            const isComplete = stats.total === 40;

            return (
              <div
                key={deck.id}
                style={{
                  ...styles.deckCard,
                  ...(hoveredDeck === deck.id ? styles.deckCardHover : {}),
                }}
                onMouseEnter={() => setHoveredDeck(deck.id)}
                onMouseLeave={() => setHoveredDeck(null)}
                onClick={() => onEditDeck(deck)}
              >
                <div style={styles.deckName}>{deck.name}</div>

                <div style={styles.deckInfo}>
                  <div style={styles.deckCardCount}>
                    <span style={{ color: isComplete ? '#6bff6b' : '#ff6b6b' }}>
                      {stats.total}/40枚
                    </span>
                  </div>
                </div>

                <div style={styles.statsBar}>
                  {stats.monsters > 0 && (
                    <span style={{
                      ...styles.statBadge,
                      background: 'rgba(255,107,107,0.3)',
                      color: '#ff6b6b',
                    }}>
                      モンスター {stats.monsters}
                    </span>
                  )}
                  {stats.magic > 0 && (
                    <span style={{
                      ...styles.statBadge,
                      background: 'rgba(107,156,255,0.3)',
                      color: '#6b9cff',
                    }}>
                      魔法 {stats.magic}
                    </span>
                  )}
                  {stats.other > 0 && (
                    <span style={{
                      ...styles.statBadge,
                      background: 'rgba(107,255,107,0.3)',
                      color: '#6bff6b',
                    }}>
                      その他 {stats.other}
                    </span>
                  )}
                </div>

                <div style={styles.deckActions}>
                  <button
                    style={styles.editButton}
                    onClick={(e) => handleEditClick(e, deck)}
                    onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    編集
                  </button>
                  <button
                    style={styles.deleteButton}
                    onClick={(e) => handleDeleteClick(e, deck)}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,100,100,0.4)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,100,100,0.2)'}
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {userDecks.length === 0 && (
          <div style={styles.emptyMessage}>
            まだデッキがありません。<br />
            「新しいデッキを作成」から始めましょう。
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div style={styles.confirmDialog} onClick={() => setDeleteTarget(null)}>
          <div style={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmTitle}>デッキを削除</div>
            <div style={styles.confirmText}>
              「{deleteTarget.name}」を削除しますか？<br />
              この操作は取り消せません。
            </div>
            <div style={styles.confirmActions}>
              <button
                style={{ ...styles.confirmButton, ...styles.cancelButton }}
                onClick={() => setDeleteTarget(null)}
              >
                キャンセル
              </button>
              <button
                style={{ ...styles.confirmButton, ...styles.dangerButton }}
                onClick={confirmDelete}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckList;
