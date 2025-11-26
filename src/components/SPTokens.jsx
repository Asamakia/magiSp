import React from 'react';
import styles from '../styles/gameStyles';

// ========================================
// SPトークン表示コンポーネント
// ========================================
const SPTokens = ({ active, rested, max }) => {
  const tokens = [];
  for (let i = 0; i < max; i++) {
    const isActive = i < active;
    const isRested = i >= active && i < active + rested;
    tokens.push(
      <div
        key={i}
        style={{
          ...styles.spToken,
          background: isActive
            ? 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)'
            : isRested
              ? 'linear-gradient(135deg, #444 0%, #666 100%)'
              : 'rgba(30,30,50,0.5)',
          border: isActive ? '2px solid #a78bfa' : '2px solid #444',
          boxShadow: isActive ? '0 0 10px rgba(107,76,230,0.5)' : 'none',
          color: isActive ? '#fff' : '#666',
        }}
      >
        {isActive ? '◆' : isRested ? '◇' : '○'}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
      {tokens}
    </div>
  );
};

export default SPTokens;
