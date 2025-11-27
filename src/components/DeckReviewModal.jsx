import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ATTRIBUTE_COLORS, TYPE_ICONS } from '../utils/constants';

// ========================================
// ドラッグ可能なカードアイテム
// ========================================
const SortableCard = ({ card, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.uniqueId });

  const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const cardStyle = {
    width: '100px',
    height: '140px',
    borderRadius: '8px',
    background: colors.bg,
    border: isDragging ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.3)',
    boxShadow: isDragging
      ? `0 0 20px ${colors.glow}, 0 0 40px rgba(255,215,0,0.5)`
      : `0 4px 15px rgba(0,0,0,0.4)`,
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={cardStyle}>
        {/* 順番表示 */}
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#000',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {index + 1}
        </div>

        {/* コスト表示 */}
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {card.cost}
        </div>

        {/* カード名 */}
        <div style={{
          padding: '30px 4px 4px',
          fontSize: '10px',
          fontWeight: 'bold',
          textAlign: 'center',
          color: colors.text,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          lineHeight: '1.2',
          height: '40px',
          overflow: 'hidden',
        }}>
          {card.name}
        </div>

        {/* イラストエリア */}
        <div style={{
          flex: 1,
          margin: '2px 4px',
          borderRadius: '4px',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
        }}>
          {card.type === 'monster' ? '🐉' : card.type === 'magic' ? '📜' : '🏔️'}
        </div>

        {/* タイプ・属性表示 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 6px',
          background: 'rgba(0,0,0,0.4)',
          fontSize: '10px',
        }}>
          <span>{TYPE_ICONS[card.type]}</span>
          <span style={{ color: colors.text }}>{card.attribute}</span>
        </div>

        {/* ステータス（モンスターのみ） */}
        {card.type === 'monster' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '2px 6px 4px',
            background: 'rgba(0,0,0,0.4)',
            fontSize: '10px',
            fontWeight: 'bold',
          }}>
            <span style={{ color: '#ff6b6b' }}>⚔️{card.attack}</span>
            <span style={{ color: '#6bff6b' }}>❤️{card.hp}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================
// デッキ確認モーダルコンポーネント
// ========================================
const DeckReviewModal = ({
  cards,           // 確認するカード配列
  title,           // モーダルタイトル
  message,         // 説明メッセージ
  allowReorder,    // 並び替え可能かどうか
  onConfirm,       // 確定時のコールバック (reorderedCards) => void
  onCancel,        // キャンセル時のコールバック
  selectMode,      // 選択モード { enabled: boolean, count: number, filter?: (card) => boolean }
  onSelect,        // 選択確定時のコールバック (selectedCards, remainingCards) => void
}) => {
  const [items, setItems] = useState(cards.map(c => ({ ...c })));
  const [selectedCards, setSelectedCards] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px以上動かすとドラッグ開始
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.uniqueId === active.id);
        const newIndex = items.findIndex(item => item.uniqueId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCardClick = (card) => {
    if (!selectMode?.enabled) return;

    // フィルターがある場合はチェック
    if (selectMode.filter && !selectMode.filter(card)) return;

    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.uniqueId === card.uniqueId);
      if (isSelected) {
        // 選択解除
        return prev.filter(c => c.uniqueId !== card.uniqueId);
      } else {
        // 選択（上限チェック）
        if (prev.length < (selectMode.count || 1)) {
          return [...prev, card];
        }
        return prev;
      }
    });
  };

  const handleConfirm = () => {
    if (selectMode?.enabled && onSelect) {
      const remaining = items.filter(
        item => !selectedCards.some(s => s.uniqueId === item.uniqueId)
      );
      onSelect(selectedCards, remaining);
    } else if (onConfirm) {
      onConfirm(items);
    }
  };

  const isCardSelected = (card) => {
    return selectedCards.some(c => c.uniqueId === card.uniqueId);
  };

  const isCardSelectable = (card) => {
    if (!selectMode?.enabled) return false;
    if (selectMode.filter && !selectMode.filter(card)) return false;
    return true;
  };

  const canConfirm = () => {
    if (selectMode?.enabled) {
      // 選択モードでは必要な枚数が選ばれているか
      return selectedCards.length === (selectMode.count || 1);
    }
    return true;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a3a 0%, #2a2a4a 100%)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '2px solid rgba(107, 76, 230, 0.6)',
        boxShadow: '0 0 40px rgba(107, 76, 230, 0.4)',
      }}>
        {/* ヘッダー */}
        <div style={{
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          <h2 style={{
            margin: '0 0 8px 0',
            color: '#ffd700',
            fontSize: '20px',
            textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
          }}>
            {title || 'デッキ確認'}
          </h2>
          <p style={{
            margin: 0,
            color: '#aaa',
            fontSize: '14px',
          }}>
            {message || (allowReorder ? 'ドラッグして順番を変更できます' : 'カードを確認してください')}
          </p>
          {selectMode?.enabled && (
            <p style={{
              margin: '8px 0 0 0',
              color: '#6b9eff',
              fontSize: '14px',
            }}>
              選択: {selectedCards.length} / {selectMode.count || 1}枚
            </p>
          )}
        </div>

        {/* カード表示エリア */}
        <div style={{
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          marginBottom: '16px',
        }}>
          {allowReorder ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map(item => item.uniqueId)}
                strategy={horizontalListSortingStrategy}
              >
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}>
                  {items.map((card, index) => (
                    <SortableCard key={card.uniqueId} card={card} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              {items.map((card, index) => {
                const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
                const selected = isCardSelected(card);
                const selectable = isCardSelectable(card);

                return (
                  <div
                    key={card.uniqueId}
                    onClick={() => handleCardClick(card)}
                    style={{
                      width: '100px',
                      height: '140px',
                      borderRadius: '8px',
                      background: colors.bg,
                      border: selected
                        ? '3px solid #ffd700'
                        : selectable
                          ? '2px solid rgba(107, 158, 255, 0.6)'
                          : '2px solid rgba(255,255,255,0.3)',
                      boxShadow: selected
                        ? `0 0 20px ${colors.glow}, 0 0 40px rgba(255,215,0,0.5)`
                        : `0 4px 15px rgba(0,0,0,0.4)`,
                      cursor: selectable ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      position: 'relative',
                      opacity: selectMode?.enabled && !selectable ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* 順番表示 */}
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: '4px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: selected
                        ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                        : 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: selected ? '#fff' : '#000',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}>
                      {selected ? '✓' : index + 1}
                    </div>

                    {/* コスト表示 */}
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}>
                      {card.cost}
                    </div>

                    {/* カード名 */}
                    <div style={{
                      padding: '30px 4px 4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      color: colors.text,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      lineHeight: '1.2',
                      height: '40px',
                      overflow: 'hidden',
                    }}>
                      {card.name}
                    </div>

                    {/* イラストエリア */}
                    <div style={{
                      flex: 1,
                      margin: '2px 4px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                    }}>
                      {card.type === 'monster' ? '🐉' : card.type === 'magic' ? '📜' : '🏔️'}
                    </div>

                    {/* タイプ・属性表示 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      background: 'rgba(0,0,0,0.4)',
                      fontSize: '10px',
                    }}>
                      <span>{TYPE_ICONS[card.type]}</span>
                      <span style={{ color: colors.text }}>{card.attribute}</span>
                    </div>

                    {/* ステータス（モンスターのみ） */}
                    {card.type === 'monster' && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '2px 6px 4px',
                        background: 'rgba(0,0,0,0.4)',
                        fontSize: '10px',
                        fontWeight: 'bold',
                      }}>
                        <span style={{ color: '#ff6b6b' }}>⚔️{card.attack}</span>
                        <span style={{ color: '#6bff6b' }}>❤️{card.hp}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ボタンエリア */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(100, 100, 100, 0.3)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(100, 100, 100, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(100, 100, 100, 0.3)';
              }}
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            style={{
              padding: '12px 32px',
              fontSize: '14px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              background: canConfirm()
                ? 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)'
                : 'rgba(100, 100, 100, 0.5)',
              color: '#fff',
              cursor: canConfirm() ? 'pointer' : 'not-allowed',
              boxShadow: canConfirm() ? '0 4px 15px rgba(107, 76, 230, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (canConfirm()) {
                e.target.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          >
            {selectMode?.enabled
              ? `選択確定 (${selectedCards.length}/${selectMode.count || 1})`
              : '確定'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckReviewModal;
