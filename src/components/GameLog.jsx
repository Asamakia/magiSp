import React from 'react';
import styles from '../styles/gameStyles';

// ========================================
// ログコンポーネント
// ========================================
const GameLog = ({ logs }) => (
  <div style={styles.log}>
    {logs.slice(-10).map((log, i) => (
      <div key={i} style={{
        color: log.type === 'damage' ? '#ff6b6b' : log.type === 'heal' ? '#6bff6b' : '#a0a0a0',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '2px 0',
      }}>
        {log.message}
      </div>
    ))}
  </div>
);

export default GameLog;
