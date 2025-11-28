import React from 'react';
import { ATTRIBUTE_COLORS } from '../utils/constants';
import styles from '../styles/gameStyles';
import { getStatusIcon, getStatusDisplayName } from '../engine/statusEffects';

// ========================================
// フィールドモンスターコンポーネント
// ========================================
const FieldMonster = ({ monster, onClick, selected, canAttack, isTarget, isValidTarget, isTargetSelectable, isTargetSelected, onMouseEnter, onMouseLeave, atkModifier = 0, hpModifier = 0 }) => {
  if (!monster) {
    return (
      <div
        style={{
          ...styles.cardSlot,
          cursor: isValidTarget ? 'pointer' : 'default',
          border: isValidTarget ? '2px dashed #6b4ce6' : '2px dashed rgba(107,76,230,0.4)',
          background: isValidTarget ? 'rgba(107,76,230,0.2)' : 'rgba(20,20,40,0.5)',
          transition: 'all 0.3s ease',
        }}
        onClick={onClick}
      >
        {isValidTarget ? '召喚可能' : '空'}
      </div>
    );
  }

  const colors = ATTRIBUTE_COLORS[monster.attribute] || ATTRIBUTE_COLORS['なし'];
  const hpPercent = (monster.currentHp / monster.hp) * 100;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...styles.cardSlot,
        border: isTargetSelected ? '3px solid #4caf50' : isTargetSelectable ? '3px solid #e91e63' : selected ? '3px solid #ffd700' : isTarget ? '3px solid #ff4444' : '2px solid rgba(107,76,230,0.6)',
        background: colors.bg,
        cursor: isTargetSelectable || isTargetSelected ? 'pointer' : 'pointer',
        flexDirection: 'column',
        padding: '4px',
        position: 'relative',
        boxShadow: isTargetSelected
          ? '0 0 20px #4caf50, 0 0 30px rgba(76,175,80,0.5)'
          : isTargetSelectable
            ? '0 0 15px #e91e63, 0 0 25px rgba(233,30,99,0.4)'
            : selected
              ? `0 0 20px ${colors.glow}, 0 0 30px rgba(255,215,0,0.5)`
              : canAttack
                ? `0 0 15px ${colors.glow}`
                : 'none',
        animation: isTargetSelectable ? 'pulse 1.5s infinite' : canAttack ? 'pulse 2s infinite' : 'none',
      }}
    >
      {/* 攻撃可能インジケーター */}
      {canAttack && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: '#ffd700',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          boxShadow: '0 0 10px #ffd700',
        }}>
          ⚔️
        </div>
      )}

      {/* チャージ表示 */}
      {monster.charges && monster.charges.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          background: 'rgba(0,0,0,0.8)',
          borderRadius: '10px',
          padding: '2px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#fff',
          gap: '2px',
        }}>
          {monster.charges.map((charge, idx) => (
            <span key={idx} title={charge.isSPCharge ? 'SPチャージ' : `属性チャージ (${charge.attribute})`}>
              {charge.isSPCharge ? '💠' : '🃏'}
            </span>
          ))}
        </div>
      )}

      {/* 状態異常アイコン */}
      {monster.statusEffects && monster.statusEffects.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '2px',
          background: 'rgba(0,0,0,0.7)',
          borderRadius: '8px',
          padding: '2px 4px',
          zIndex: 10,
        }}>
          {monster.statusEffects.map((status, idx) => (
            <div
              key={status.id || `${status.type}-${idx}`}
              title={getStatusDisplayName(status.type)}
              style={{
                fontSize: '12px',
                lineHeight: 1,
                cursor: 'help',
              }}
            >
              {getStatusIcon(status.type)}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: '2px' }}>
        {monster.name}
      </div>

      <div style={{ fontSize: '24px', marginBottom: '4px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        🐉
        {/* 技アイコン */}
        {(monster.basicSkill || monster.advancedSkill) && (
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '18px',
            display: 'flex',
            gap: '2px',
          }}>
            {monster.basicSkill && (
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
              }} title={`基本技: ${monster.basicSkill.text}`}>
                1
              </div>
            )}
            {monster.advancedSkill && (
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
              }} title={`上級技: ${monster.advancedSkill.text}`}>
                2
              </div>
            )}
          </div>
        )}
      </div>

      {/* HPバー */}
      <div style={{
        width: '90%',
        height: '8px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '4px',
      }}>
        <div style={{
          width: `${hpPercent}%`,
          height: '100%',
          background: hpPercent > 50 ? '#4caf50' : hpPercent > 25 ? '#ff9800' : '#f44336',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        fontSize: '10px',
        fontWeight: 'bold',
        background: 'rgba(0,0,0,0.5)',
      }}>
        <span style={{
          color: atkModifier > 0 ? '#4cff4c' : atkModifier < 0 ? '#ff4c4c' : '#ff6b6b',
          textShadow: atkModifier !== 0 ? `0 0 4px ${atkModifier > 0 ? '#4cff4c' : '#ff4c4c'}` : 'none',
        }}>
          ⚔️{monster.currentAttack + atkModifier}
          {atkModifier !== 0 && (
            <span style={{ fontSize: '8px', marginLeft: '1px' }}>
              ({atkModifier > 0 ? '+' : ''}{atkModifier})
            </span>
          )}
        </span>
        <span style={{
          color: hpModifier > 0 ? '#4cff4c' : hpModifier < 0 ? '#ff4c4c' : '#6bff6b',
          textShadow: hpModifier !== 0 ? `0 0 4px ${hpModifier > 0 ? '#4cff4c' : '#ff4c4c'}` : 'none',
        }}>
          ❤️{monster.currentHp}
          {hpModifier !== 0 && (
            <span style={{ fontSize: '8px', marginLeft: '1px' }}>
              ({hpModifier > 0 ? '+' : ''}{hpModifier})
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default FieldMonster;
