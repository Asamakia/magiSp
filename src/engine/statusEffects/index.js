/**
 * 状態異常システム: エクスポート集約
 *
 * @see src/ルール/status-effect-system-design.md
 */

// タイプ定義
export {
  STATUS_EFFECT_TYPES,
  STATUS_EFFECT_TARGETS,
  STATUS_EFFECT_METADATA,
  getStatusEffectTarget,
  getStatusDisplayName,
  getStatusIcon,
  isDebuff,
  isBuff,
} from './statusTypes';

// エンジン
export { statusEffectEngine } from './statusEngine';
