/**
 * 常時効果システム: メインエクスポート
 *
 * このファイルは常時効果システムの全モジュールをエクスポートします。
 * 外部からはこのファイルをインポートしてください。
 *
 * 使用例:
 * ```javascript
 * import { continuousEffectEngine, CONTINUOUS_EFFECT_TYPES } from './engine/continuousEffects';
 *
 * // ゲーム初期化時
 * continuousEffectEngine.clear();
 *
 * // カード召喚時
 * continuousEffectEngine.register(card, owner);
 *
 * // 攻撃力修正値を取得
 * const modifier = continuousEffectEngine.calculateAttackModifier(monster, context);
 * ```
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

// ========================================
// インポート（初期化用）
// ========================================
import { setEffectDefinitions, setPhaseCardEffectDefinitions } from './effectEngine';
import { allEffectDefinitions, phaseCardEffectsByStage } from './effectDefinitions';

// ========================================
// エクスポート
// ========================================

// 効果タイプ
export {
  CONTINUOUS_EFFECT_TYPES,
  EFFECT_TYPE_METADATA,
  getEffectTypeDisplayName,
  getEffectTypeCategory,
} from './effectTypes';

// ターゲットタイプ
export {
  TARGET_TYPES,
  TARGET_TYPE_METADATA,
  getTargetTypeDisplayName,
  getTargetTypeScope,
  isSelfTarget,
  isOpponentTarget,
} from './targetTypes';

// 値計算
export { VALUE_CALCULATOR_TYPES, calculateValue, setEffectUniqueId } from './valueCalculator';

// 条件チェック
export {
  checkCondition,
  countMonstersMatchingCondition,
  countOpponentMonstersMatchingCondition,
} from './conditionChecker';

// エフェクトエンジン
export {
  continuousEffectEngine,
  ContinuousEffectEngine,
  setEffectDefinitions,
  setPhaseCardEffectDefinitions,
} from './effectEngine';

// 効果定義
export {
  allEffectDefinitions,
  getEffectDefinition,
  hasEffectDefinition,
  getEffectDefinitionCount,
  getAllDefinedCardIds,
  // フェイズカード用
  phaseCardEffectsByStage,
  getPhaseCardEffectsForStage,
  hasPhaseCardContinuousEffects,
  getAllPhaseCardEffects,
  getPhaseCardCount,
} from './effectDefinitions';

// ========================================
// 初期化関数
// ========================================

/**
 * 常時効果システムを初期化
 * アプリケーション起動時に一度だけ呼び出してください
 */
export const initializeContinuousEffectSystem = () => {
  // 効果定義をエンジンに注入
  setEffectDefinitions(allEffectDefinitions);
  setPhaseCardEffectDefinitions(phaseCardEffectsByStage);
  console.log(
    `Continuous Effect System initialized with ${Object.keys(allEffectDefinitions).length} card definitions ` +
      `and ${Object.keys(phaseCardEffectsByStage).length} phase card definitions`
  );
};

// 自動初期化（インポート時に実行）
// Note: 必要に応じてコメントアウトし、手動で initializeContinuousEffectSystem() を呼び出してください
setEffectDefinitions(allEffectDefinitions);
setPhaseCardEffectDefinitions(phaseCardEffectsByStage);
