/**
 * レアリティ別ビジュアルエフェクト定義
 *
 * レアリティに応じたカード装飾とアニメーションを提供
 */

import { RARITY_COLORS } from '../collection/data/constants';

// ========================================
// エフェクトレベル定義
// ========================================

export const EFFECT_LEVELS = {
  FULL: 'full',       // フルエフェクト
  MINIMAL: 'minimal', // 枠色のみ
  OFF: 'off',         // なし
};

// ========================================
// CSSキーフレーム定義
// ========================================

export const RARITY_KEYFRAMES = `
  @keyframes rarityShine {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes rarityPulse {
    0%, 100% {
      box-shadow: 0 0 10px var(--rarity-color),
                  0 0 20px var(--rarity-color-dim);
    }
    50% {
      box-shadow: 0 0 20px var(--rarity-color),
                  0 0 40px var(--rarity-color-dim),
                  0 0 60px var(--rarity-color-dim);
    }
  }

  @keyframes holoShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes holoRotate {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }

  @keyframes sparkleFloat {
    0%, 100% {
      transform: translateY(0) scale(1);
      opacity: 0.8;
    }
    50% {
      transform: translateY(-8px) scale(1.2);
      opacity: 1;
    }
  }

  @keyframes particleDrift {
    0% {
      transform: translate(0, 0) rotate(0deg);
      opacity: 0;
    }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% {
      transform: translate(var(--drift-x, 20px), var(--drift-y, -30px)) rotate(180deg);
      opacity: 0;
    }
  }

  @keyframes goldShimmer {
    0% {
      background-position: -100% 0;
      filter: brightness(1);
    }
    50% { filter: brightness(1.3); }
    100% {
      background-position: 200% 0;
      filter: brightness(1);
    }
  }

  @keyframes rainbowBorder {
    0% { border-color: #ff0000; }
    17% { border-color: #ff8800; }
    33% { border-color: #ffff00; }
    50% { border-color: #00ff00; }
    67% { border-color: #0088ff; }
    83% { border-color: #8800ff; }
    100% { border-color: #ff0000; }
  }

  @keyframes revealFlash {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1);
    }
    100% {
      opacity: 0;
      transform: scale(1.5);
    }
  }
`;

// ========================================
// レアリティ別エフェクト定義
// ========================================

const createRarityEffect = (rarity) => {
  const color = RARITY_COLORS[rarity] || '#808080';
  const colorDim = color + '60'; // 透明度付き

  switch (rarity) {
    case 'C':
      return {
        border: `2px solid ${color}`,
        boxShadow: 'none',
        animation: 'none',
        overlay: null,
        particles: 0,
      };

    case 'UC':
      return {
        border: `2px solid ${color}`,
        boxShadow: `0 0 8px ${colorDim}`,
        animation: 'none',
        overlay: null,
        particles: 0,
      };

    case 'R':
      return {
        border: `2px solid ${color}`,
        boxShadow: `0 0 12px ${colorDim}`,
        animation: 'none',
        overlay: {
          background: `linear-gradient(
            110deg,
            transparent 30%,
            rgba(255, 255, 255, 0.15) 45%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0.15) 55%,
            transparent 70%
          )`,
          backgroundSize: '200% 100%',
          animation: 'rarityShine 3s ease-in-out infinite',
        },
        particles: 0,
      };

    case 'SR':
      return {
        border: `3px solid ${color}`,
        boxShadow: `0 0 15px ${colorDim}, inset 0 0 10px ${colorDim}`,
        animation: 'rarityPulse 2s ease-in-out infinite',
        cssVars: {
          '--rarity-color': color,
          '--rarity-color-dim': colorDim,
        },
        overlay: {
          background: `linear-gradient(
            110deg,
            transparent 25%,
            rgba(155, 89, 182, 0.2) 40%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(155, 89, 182, 0.2) 60%,
            transparent 75%
          )`,
          backgroundSize: '200% 100%',
          animation: 'rarityShine 2.5s ease-in-out infinite',
        },
        particles: 0,
      };

    case 'UR':
      return {
        border: `3px solid ${color}`,
        boxShadow: `0 0 20px ${color}, 0 0 40px ${colorDim}`,
        animation: 'rarityPulse 1.8s ease-in-out infinite',
        cssVars: {
          '--rarity-color': color,
          '--rarity-color-dim': colorDim,
        },
        overlay: {
          background: `linear-gradient(
            110deg,
            transparent 20%,
            rgba(241, 196, 15, 0.3) 35%,
            rgba(255, 255, 255, 0.5) 50%,
            rgba(241, 196, 15, 0.3) 65%,
            transparent 80%
          )`,
          backgroundSize: '200% 100%',
          animation: 'goldShimmer 2s ease-in-out infinite',
        },
        particles: 2,
        doubleBorder: true,
      };

    case 'HR':
      // ホログラフィック
      return {
        border: `3px solid transparent`,
        borderImage: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0000) 1',
        boxShadow: `0 0 20px rgba(255, 100, 100, 0.5), 0 0 40px rgba(100, 100, 255, 0.3)`,
        animation: 'rainbowBorder 3s linear infinite',
        overlay: {
          background: `linear-gradient(
            135deg,
            rgba(255, 0, 0, 0.15) 0%,
            rgba(255, 136, 0, 0.15) 17%,
            rgba(255, 255, 0, 0.15) 33%,
            rgba(0, 255, 0, 0.15) 50%,
            rgba(0, 136, 255, 0.15) 67%,
            rgba(136, 0, 255, 0.15) 83%,
            rgba(255, 0, 0, 0.15) 100%
          )`,
          backgroundSize: '400% 400%',
          animation: 'holoShift 4s ease-in-out infinite',
        },
        holoEffect: true,
        particles: 3,
      };

    case 'SEC':
      return {
        border: `3px solid ${color}`,
        boxShadow: `0 0 25px ${color}, 0 0 50px ${colorDim}, inset 0 0 15px ${colorDim}`,
        animation: 'rarityPulse 1.5s ease-in-out infinite',
        cssVars: {
          '--rarity-color': color,
          '--rarity-color-dim': colorDim,
        },
        overlay: {
          background: `radial-gradient(
            ellipse at 30% 20%,
            rgba(26, 188, 156, 0.4) 0%,
            transparent 50%
          ), radial-gradient(
            ellipse at 70% 80%,
            rgba(26, 188, 156, 0.3) 0%,
            transparent 50%
          )`,
          animation: 'sparkleFloat 2s ease-in-out infinite',
        },
        particles: 4,
      };

    case 'ALT':
      return {
        border: `3px solid ${color}`,
        boxShadow: `0 0 20px ${color}, 0 0 40px ${colorDim}`,
        animation: 'rarityPulse 2s ease-in-out infinite',
        cssVars: {
          '--rarity-color': color,
          '--rarity-color-dim': colorDim,
        },
        overlay: {
          background: `linear-gradient(
            45deg,
            transparent 30%,
            rgba(233, 30, 99, 0.3) 45%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(233, 30, 99, 0.3) 55%,
            transparent 70%
          )`,
          backgroundSize: '200% 200%',
          animation: 'rarityShine 2s ease-in-out infinite',
        },
        specialFrame: 'alt',
        particles: 3,
      };

    case 'SP':
      return {
        border: `4px solid ${color}`,
        boxShadow: `0 0 25px ${color}, 0 0 50px ${colorDim}, 0 0 75px ${colorDim}`,
        animation: 'rarityPulse 1.5s ease-in-out infinite',
        cssVars: {
          '--rarity-color': color,
          '--rarity-color-dim': colorDim,
        },
        overlay: {
          background: `linear-gradient(
            135deg,
            rgba(255, 152, 0, 0.2) 0%,
            rgba(255, 200, 100, 0.4) 25%,
            rgba(255, 255, 200, 0.5) 50%,
            rgba(255, 200, 100, 0.4) 75%,
            rgba(255, 152, 0, 0.2) 100%
          )`,
          backgroundSize: '200% 200%',
          animation: 'holoShift 3s ease-in-out infinite',
        },
        particles: 5,
      };

    case 'GR':
      // ゴッドレア - 最も豪華
      return {
        border: `4px solid ${color}`,
        boxShadow: `
          0 0 30px ${color},
          0 0 60px ${colorDim},
          0 0 90px ${colorDim},
          inset 0 0 20px rgba(255, 215, 0, 0.3)
        `,
        animation: 'rarityPulse 1.2s ease-in-out infinite, rainbowBorder 4s linear infinite',
        cssVars: {
          '--rarity-color': color,
          '--rarity-color-dim': colorDim,
        },
        overlay: {
          background: `
            linear-gradient(
              135deg,
              rgba(255, 215, 0, 0.3) 0%,
              rgba(255, 255, 200, 0.5) 25%,
              rgba(255, 215, 0, 0.4) 50%,
              rgba(255, 255, 200, 0.5) 75%,
              rgba(255, 215, 0, 0.3) 100%
            )
          `,
          backgroundSize: '300% 300%',
          animation: 'holoShift 2.5s ease-in-out infinite, holoRotate 8s linear infinite',
        },
        holoEffect: true,
        doubleBorder: true,
        cornerOrnaments: true,
        particles: 6,
      };

    default:
      return {
        border: `2px solid ${color}`,
        boxShadow: 'none',
        animation: 'none',
        overlay: null,
        particles: 0,
      };
  }
};

// ========================================
// エフェクト取得関数
// ========================================

/**
 * レアリティに応じたエフェクトスタイルを取得
 * @param {string} rarity - レアリティコード
 * @param {string} effectLevel - エフェクトレベル ('full' | 'minimal' | 'off')
 * @returns {object} スタイルオブジェクト
 */
export const getRarityEffect = (rarity, effectLevel = EFFECT_LEVELS.FULL) => {
  if (effectLevel === EFFECT_LEVELS.OFF) {
    return {
      border: '2px solid rgba(255,255,255,0.3)',
      boxShadow: 'none',
      animation: 'none',
      overlay: null,
      particles: 0,
    };
  }

  if (effectLevel === EFFECT_LEVELS.MINIMAL) {
    const color = RARITY_COLORS[rarity] || '#808080';
    return {
      border: `2px solid ${color}`,
      boxShadow: `0 0 8px ${color}40`,
      animation: 'none',
      overlay: null,
      particles: 0,
    };
  }

  return createRarityEffect(rarity);
};

/**
 * カードスタイルにレアリティエフェクトを適用
 * @param {object} baseStyle - 基本スタイル
 * @param {string} rarity - レアリティコード
 * @param {string} effectLevel - エフェクトレベル
 * @returns {object} 適用済みスタイル
 */
export const applyRarityStyle = (baseStyle, rarity, effectLevel = EFFECT_LEVELS.FULL) => {
  const effect = getRarityEffect(rarity, effectLevel);

  const style = {
    ...baseStyle,
    border: effect.border,
    boxShadow: effect.boxShadow,
    animation: effect.animation,
    position: 'relative',
  };

  if (effect.cssVars) {
    Object.assign(style, effect.cssVars);
  }

  return style;
};

/**
 * オーバーレイ要素のスタイルを取得
 * @param {string} rarity - レアリティコード
 * @param {string} effectLevel - エフェクトレベル
 * @returns {object|null} オーバーレイスタイル（なければnull）
 */
export const getRarityOverlay = (rarity, effectLevel = EFFECT_LEVELS.FULL) => {
  if (effectLevel !== EFFECT_LEVELS.FULL) {
    return null;
  }

  const effect = getRarityEffect(rarity, effectLevel);
  if (!effect.overlay) {
    return null;
  }

  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: 1,
    ...effect.overlay,
  };
};

/**
 * パーティクル数を取得
 * @param {string} rarity - レアリティコード
 * @param {string} effectLevel - エフェクトレベル
 * @returns {number} パーティクル数
 */
export const getParticleCount = (rarity, effectLevel = EFFECT_LEVELS.FULL) => {
  if (effectLevel !== EFFECT_LEVELS.FULL) {
    return 0;
  }

  const effect = getRarityEffect(rarity, effectLevel);
  return effect.particles || 0;
};

/**
 * パーティクルスタイルを生成
 * @param {number} index - パーティクルインデックス
 * @param {string} rarity - レアリティコード
 * @returns {object} パーティクルスタイル
 */
export const getParticleStyle = (index, rarity) => {
  const color = RARITY_COLORS[rarity] || '#ffffff';
  const positions = [
    { top: '10%', left: '15%', driftX: '-15px', driftY: '-25px' },
    { top: '20%', right: '10%', driftX: '20px', driftY: '-30px' },
    { bottom: '30%', left: '10%', driftX: '-20px', driftY: '15px' },
    { bottom: '15%', right: '15%', driftX: '15px', driftY: '20px' },
    { top: '50%', left: '5%', driftX: '-25px', driftY: '-10px' },
    { top: '40%', right: '5%', driftX: '25px', driftY: '-15px' },
  ];

  const pos = positions[index % positions.length];

  return {
    position: 'absolute',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
    pointerEvents: 'none',
    zIndex: 2,
    animation: `particleDrift ${2 + (index * 0.3)}s ease-in-out infinite`,
    animationDelay: `${index * 0.4}s`,
    '--drift-x': pos.driftX,
    '--drift-y': pos.driftY,
    ...pos,
  };
};

/**
 * 二重枠が必要かどうか
 * @param {string} rarity - レアリティコード
 * @param {string} effectLevel - エフェクトレベル
 * @returns {boolean}
 */
export const hasDoubleBorder = (rarity, effectLevel = EFFECT_LEVELS.FULL) => {
  if (effectLevel !== EFFECT_LEVELS.FULL) {
    return false;
  }
  const effect = getRarityEffect(rarity, effectLevel);
  return effect.doubleBorder || false;
};

/**
 * コーナー装飾が必要かどうか
 * @param {string} rarity - レアリティコード
 * @param {string} effectLevel - エフェクトレベル
 * @returns {boolean}
 */
export const hasCornerOrnaments = (rarity, effectLevel = EFFECT_LEVELS.FULL) => {
  if (effectLevel !== EFFECT_LEVELS.FULL) {
    return false;
  }
  const effect = getRarityEffect(rarity, effectLevel);
  return effect.cornerOrnaments || false;
};

/**
 * レア以上かどうか（演出対象）
 * @param {string} rarity - レアリティコード
 * @returns {boolean}
 */
export const isRareOrAbove = (rarity) => {
  const rareRarities = ['R', 'SR', 'UR', 'HR', 'SEC', 'ALT', 'SP', 'GR'];
  return rareRarities.includes(rarity);
};

/**
 * 開封時フラッシュ色を取得
 * @param {string} rarity - レアリティコード
 * @returns {string} 色コード
 */
export const getRevealFlashColor = (rarity) => {
  const flashColors = {
    C: null,
    UC: null,
    R: 'rgba(52, 152, 219, 0.6)',
    SR: 'rgba(155, 89, 182, 0.7)',
    UR: 'rgba(241, 196, 15, 0.8)',
    HR: 'rgba(255, 100, 100, 0.8)',
    SEC: 'rgba(26, 188, 156, 0.8)',
    ALT: 'rgba(233, 30, 99, 0.8)',
    SP: 'rgba(255, 152, 0, 0.9)',
    GR: 'rgba(255, 215, 0, 1)',
  };
  return flashColors[rarity] || null;
};

// ========================================
// マウス追従エフェクト用ヘルパー
// ========================================

/**
 * マウス位置から反射角度を計算
 * @param {object} rect - 要素のBoundingClientRect
 * @param {number} mouseX - マウスX座標
 * @param {number} mouseY - マウスY座標
 * @returns {object} { rotateX, rotateY, glareX, glareY }
 */
export const calculateMouseReflection = (rect, mouseX, mouseY) => {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const deltaX = (mouseX - centerX) / (rect.width / 2);
  const deltaY = (mouseY - centerY) / (rect.height / 2);

  return {
    rotateX: deltaY * -10, // 上下回転
    rotateY: deltaX * 10,  // 左右回転
    glareX: 50 + deltaX * 30, // グレア位置X (%)
    glareY: 50 + deltaY * 30, // グレア位置Y (%)
  };
};

/**
 * マウス追従スタイルを生成
 * @param {object} reflection - calculateMouseReflectionの戻り値
 * @param {string} rarity - レアリティコード
 * @returns {object} 追加スタイル
 */
export const getMouseFollowStyle = (reflection, rarity) => {
  if (!reflection) return {};

  const effect = getRarityEffect(rarity);
  if (!effect.holoEffect) return {};

  return {
    transform: `perspective(1000px) rotateX(${reflection.rotateX}deg) rotateY(${reflection.rotateY}deg)`,
    transition: 'transform 0.1s ease-out',
  };
};

/**
 * マウス追従グレアスタイルを生成
 * @param {object} reflection - calculateMouseReflectionの戻り値
 * @param {string} rarity - レアリティコード
 * @returns {object|null} グレアオーバーレイスタイル
 */
export const getMouseGlareStyle = (reflection, rarity) => {
  if (!reflection) return null;

  const effect = getRarityEffect(rarity);
  if (!effect.holoEffect) return null;

  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: 3,
    background: `radial-gradient(
      circle at ${reflection.glareX}% ${reflection.glareY}%,
      rgba(255, 255, 255, 0.4) 0%,
      rgba(255, 255, 255, 0.1) 30%,
      transparent 60%
    )`,
    opacity: 0.8,
  };
};

// ========================================
// エクスポート
// ========================================

export default {
  EFFECT_LEVELS,
  RARITY_KEYFRAMES,
  getRarityEffect,
  applyRarityStyle,
  getRarityOverlay,
  getParticleCount,
  getParticleStyle,
  hasDoubleBorder,
  hasCornerOrnaments,
  isRareOrAbove,
  getRevealFlashColor,
  calculateMouseReflection,
  getMouseFollowStyle,
  getMouseGlareStyle,
};
