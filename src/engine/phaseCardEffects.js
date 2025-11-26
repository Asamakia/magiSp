/**
 * フェイズカードの段階効果テキストパーサー
 *
 * フェイズカードは設置後、同属性カードを重ねることで段階的に効果が強化されます。
 * - stage 0: 初期効果（設置直後）
 * - stage 1: 1枚重ね効果
 * - stage 2: 2枚重ね効果
 * - stage 3: 3枚重ね効果（最終、発動後墓地へ）
 *
 * 効果は上書き方式：新しい段階の効果が発動すると、前の段階の効果は無効になります。
 *
 * CSVのeffectフィールドに以下の形式で段階効果が定義されています：
 * 初期効果: [効果テキスト]
 * 1枚重ね: [効果テキスト]
 * 2枚重ね: [効果テキスト]
 * 3枚重ね: [効果テキスト]
 */

/**
 * フェイズカードの効果テキストから各段階の効果を抽出
 * @param {string} effectText - カードのeffectフィールド
 * @returns {Object} 各段階の効果テキスト { stage0, stage1, stage2, stage3 }
 */
export const parsePhaseCardStageEffects = (effectText) => {
  if (!effectText) {
    return { stage0: null, stage1: null, stage2: null, stage3: null };
  }

  const result = {
    stage0: null,
    stage1: null,
    stage2: null,
    stage3: null,
  };

  // 初期効果を抽出
  // パターン: 「初期効果:」または「初期効果：」から、次の「N枚重ね:」まで、または文末まで
  const initialMatch = effectText.match(/初期効果[：:]\s*([\s\S]*?)(?=\n*[0-9１２３]枚重ね|$)/);
  if (initialMatch) {
    result.stage0 = initialMatch[1].trim();
  }

  // 1枚重ね効果を抽出
  const stage1Match = effectText.match(/[1１]枚重ね[：:]\s*([\s\S]*?)(?=\n*[2２]枚重ね|$)/);
  if (stage1Match) {
    result.stage1 = stage1Match[1].trim();
  }

  // 2枚重ね効果を抽出
  const stage2Match = effectText.match(/[2２]枚重ね[：:]\s*([\s\S]*?)(?=\n*[3３]枚重ね|$)/);
  if (stage2Match) {
    result.stage2 = stage2Match[1].trim();
  }

  // 3枚重ね効果を抽出
  const stage3Match = effectText.match(/[3３]枚重ね[：:]\s*([\s\S]*?)$/);
  if (stage3Match) {
    result.stage3 = stage3Match[1].trim();
  }

  return result;
};

/**
 * 指定した段階の効果テキストを取得
 * @param {Object} card - フェイズカード
 * @param {number} stage - 段階（0-3）
 * @returns {string|null} 段階の効果テキスト
 */
export const getPhaseCardStageText = (card, stage) => {
  if (!card || !card.effect) {
    return null;
  }

  const stageEffects = parsePhaseCardStageEffects(card.effect);
  const stageKey = `stage${stage}`;
  return stageEffects[stageKey];
};

/**
 * フェイズカードの全段階効果テキストを取得
 * @param {Object} card - フェイズカード
 * @returns {Object} 全段階の効果テキスト { stage0, stage1, stage2, stage3 }
 */
export const getAllPhaseCardStageTexts = (card) => {
  if (!card || !card.effect) {
    return { stage0: null, stage1: null, stage2: null, stage3: null };
  }
  return parsePhaseCardStageEffects(card.effect);
};

/**
 * 段階名を取得
 * @param {number} stage - 段階（0-3）
 * @returns {string} 段階名
 */
export const getStageName = (stage) => {
  const stageNames = ['初期効果', '第1段階', '第2段階', '最終段階'];
  return stageNames[stage] || '不明';
};

/**
 * 段階の短縮名を取得（UI表示用）
 * @param {number} stage - 段階（0-3）
 * @returns {string} 短縮段階名
 */
export const getStageShortName = (stage) => {
  const stageNames = ['初期', '第1', '第2', '最終'];
  return stageNames[stage] || '不明';
};

/**
 * フェイズカードが有効な段階効果定義を持っているかチェック
 * @param {Object} card - フェイズカード
 * @returns {boolean}
 */
export const hasPhaseCardStageEffects = (card) => {
  if (!card || !card.effect) {
    return false;
  }
  const stageEffects = parsePhaseCardStageEffects(card.effect);
  return stageEffects.stage0 !== null;
};

/**
 * 現在の段階の効果説明を取得（UI表示用）
 * @param {Object} card - フェイズカード（stage情報を含む）
 * @returns {string} 現在段階の効果説明
 */
export const getCurrentStageDescription = (card) => {
  if (!card) {
    return '';
  }

  const stage = card.stage !== undefined ? card.stage : 0;
  const stageEffects = parsePhaseCardStageEffects(card.effect);
  const stageKey = `stage${stage}`;
  const effectText = stageEffects[stageKey];

  if (!effectText) {
    return `${getStageName(stage)}: 効果定義なし`;
  }

  return effectText;
};

/**
 * 次の段階の効果説明を取得（UI表示用）
 * @param {Object} card - フェイズカード（stage情報を含む）
 * @returns {string|null} 次段階の効果説明（最終段階の場合はnull）
 */
export const getNextStageDescription = (card) => {
  if (!card) {
    return null;
  }

  const stage = card.stage !== undefined ? card.stage : 0;
  if (stage >= 3) {
    return null; // 既に最終段階
  }

  const nextStage = stage + 1;
  const stageEffects = parsePhaseCardStageEffects(card.effect);
  const stageKey = `stage${nextStage}`;
  const effectText = stageEffects[stageKey];

  if (!effectText) {
    return null;
  }

  return effectText;
};

/**
 * フェイズカード情報をフォーマットして取得（情報パネル用）
 * @param {Object} card - フェイズカード
 * @returns {Object} フォーマットされた情報
 */
export const getPhaseCardDisplayInfo = (card) => {
  if (!card) {
    return null;
  }

  const stage = card.stage !== undefined ? card.stage : 0;
  const stageEffects = parsePhaseCardStageEffects(card.effect);

  return {
    name: card.name,
    attribute: card.attribute,
    currentStage: stage,
    stageName: getStageName(stage),
    stageShortName: getStageShortName(stage),
    currentEffect: stageEffects[`stage${stage}`],
    nextEffect: stage < 3 ? stageEffects[`stage${stage + 1}`] : null,
    allEffects: stageEffects,
    chargeCount: card.charges?.length || 0,
    isFinalStage: stage >= 3,
  };
};
