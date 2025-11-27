import React from 'react';
import { ATTRIBUTE_COLORS, TYPE_ICONS } from '../utils/constants';

// ========================================
// カードコンポーネント
// ========================================
const Card = ({ card, onClick, selected, small, faceDown, inHand, disabled, modifiedCost, costModifierSource, onMouseEnter, onMouseLeave }) => {
  if (!card) return null;

  const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
  const isMonster = card.type === 'monster';

  const cardStyle = {
    width: small ? '80px' : '100px',
    height: small ? '110px' : '130px',
    borderRadius: '8px',
    background: faceDown ? 'linear-gradient(135deg, #2a2a4a 0%, #1a1a3a 100%)' : colors.bg,
    border: selected ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.3)',
    boxShadow: selected
      ? `0 0 20px ${colors.glow}, 0 0 40px rgba(255,215,0,0.5)`
      : `0 4px 15px rgba(0,0,0,0.4)`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    transform: selected ? 'translateY(-8px) scale(1.05)' : inHand ? 'translateY(0)' : 'none',
    opacity: disabled ? 0.5 : 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  };

  if (faceDown) {
    return (
      <div style={cardStyle}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'repeating-linear-gradient(45deg, #2a2a4a, #2a2a4a 10px, #3a3a5a 10px, #3a3a5a 20px)',
        }}>
          <span style={{ fontSize: '32px' }}>🎴</span>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle} onClick={disabled ? null : onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* コスト表示 */}
      {(() => {
        const actualCost = modifiedCost !== undefined ? modifiedCost : card.cost;
        const isCostReduced = modifiedCost !== undefined && modifiedCost < card.cost;
        const isCostIncreased = modifiedCost !== undefined && modifiedCost > card.cost;
        const costDiff = card.cost - actualCost;

        // ツールチップテキスト生成
        let tooltipText = `コスト: ${card.cost}`;
        if (isCostReduced && costModifierSource) {
          tooltipText = `コスト: ${actualCost} (元: ${card.cost})\n${costModifierSource}により-${costDiff}`;
        } else if (isCostIncreased && costModifierSource) {
          tooltipText = `コスト: ${actualCost} (元: ${card.cost})\n${costModifierSource}により+${-costDiff}`;
        }

        return (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: isCostReduced
                ? 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)'
                : isCostIncreased
                  ? 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'
                  : 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#fff',
              boxShadow: isCostReduced
                ? '0 2px 8px rgba(34, 197, 94, 0.6)'
                : isCostIncreased
                  ? '0 2px 8px rgba(239, 68, 68, 0.6)'
                  : '0 2px 8px rgba(0,0,0,0.4)',
            }}
            title={tooltipText}
          >
            {actualCost}
          </div>
        );
      })()}

      {/* 禁忌カード表示 */}
      {card.isForbidden && (
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '28px',
          fontSize: '14px',
          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
        }}>
          ⚠️
        </div>
      )}

      {/* タイプアイコン */}
      <div style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        fontSize: '14px',
      }}>
        {TYPE_ICONS[card.type]}
      </div>

      {/* カード名 */}
      <div style={{
        padding: '26px 4px 4px',
        fontSize: small ? '9px' : '10px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: colors.text,
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        lineHeight: '1.2',
        height: '36px',
        overflow: 'hidden',
      }}>
        {card.name}
      </div>

      {/* イラストエリア（プロトタイプ用） */}
      <div style={{
        flex: 1,
        margin: '2px 4px',
        borderRadius: '4px',
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        position: 'relative',
      }}>
        {card.type === 'monster' ? '🐉' : card.type === 'magic' ? '📜' : '🏔️'}

        {/* 技アイコン表示（モンスターのみ） */}
        {card.type === 'monster' && (card.basicSkill || card.advancedSkill) && (
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            display: 'flex',
            gap: '2px',
          }}>
            {card.basicSkill && (
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }} title={`基本技: ${card.basicSkill.text}`}>
                1
              </div>
            )}
            {card.advancedSkill && (
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }} title={`上級技: ${card.advancedSkill.text}`}>
                2
              </div>
            )}
          </div>
        )}
      </div>

      {/* ステータス（モンスターのみ） */}
      {isMonster && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 6px',
          background: 'rgba(0,0,0,0.4)',
          fontSize: small ? '10px' : '11px',
          fontWeight: 'bold',
        }}>
          <span style={{ color: '#ff6b6b' }}>⚔️{card.currentAttack || card.attack}</span>
          <span style={{ color: '#6bff6b' }}>❤️{card.currentHp || card.hp}</span>
        </div>
      )}
    </div>
  );
};

export default Card;
