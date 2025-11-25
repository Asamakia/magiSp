// ========================================
// ゲーム定数
// ========================================

export const INITIAL_LIFE = 6000;
export const INITIAL_SP = 1;
export const MAX_SP = 10;
export const INITIAL_HAND_SIZE = 5;
export const DECK_SIZE = 40;
export const COUNTER_ATTACK_RATE = 0.3;

export const PHASES = ['ターン開始', 'ドロー', 'メイン', 'バトル', 'エンド'];

export const ATTRIBUTE_COLORS = {
  '炎': { bg: 'linear-gradient(135deg, #ff4d4d 0%, #ff8533 100%)', text: '#fff', glow: '#ff6b35' },
  '水': { bg: 'linear-gradient(135deg, #4da6ff 0%, #66d9ff 100%)', text: '#fff', glow: '#4da6ff' },
  '光': { bg: 'linear-gradient(135deg, #ffd700 0%, #fff8dc 100%)', text: '#333', glow: '#ffd700' },
  '闇': { bg: 'linear-gradient(135deg, #4a0080 0%, #1a0033 100%)', text: '#e0b0ff', glow: '#9933ff' },
  '未来': { bg: 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)', text: '#fff', glow: '#00ffff' },
  '原始': { bg: 'linear-gradient(135deg, #2d5016 0%, #6b8e23 100%)', text: '#fff', glow: '#7cfc00' },
  'なし': { bg: 'linear-gradient(135deg, #808080 0%, #a9a9a9 100%)', text: '#fff', glow: '#c0c0c0' },
};

export const TYPE_ICONS = {
  'monster': '⚔️',
  'magic': '✨',
  'field': '🏔️',
  'phase': '🔮',
  'phasecard': '🔮', // フェイズカード
};
