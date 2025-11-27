import React, { useEffect, useRef } from 'react';
import styles from '../styles/gameStyles';

// ========================================
// ログコンポーネント（直近50件表示、スクロール可能）
// ========================================
const GameLog = ({ logs }) => {
  const logEndRef = useRef(null);

  // 新しいログが追加されたら自動スクロール
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div style={{
      ...styles.log,
      maxHeight: '200px',
      overflowY: 'auto',
    }}>
      {logs.slice(-50).map((log, i) => (
        <div key={i} style={{
          color: log.type === 'damage' ? '#ff6b6b' : log.type === 'heal' ? '#6bff6b' : '#a0a0a0',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '2px 0',
        }}>
          {log.message}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  );
};

export default GameLog;
