// ========================================
// 効果実行エンジン
// ========================================

// 効果タイプの定義
export const EFFECT_TYPES = {
  DAMAGE: 'damage',
  HEAL: 'heal',
  BUFF_ATK: 'buff_atk',
  BUFF_HP: 'buff_hp',
  DEBUFF_ATK: 'debuff_atk',
  DEBUFF_HP: 'debuff_hp',
  SEARCH: 'search',
  REVIVE: 'revive',
  DESTROY: 'destroy',
  DRAW: 'draw',
  SP_GAIN: 'sp_gain',
  CONTROL: 'control',
  DOUBLE_ATTACK: 'double_attack',
};

/**
 * 効果テキストから効果を抽出
 * @param {string} effectText - 効果テキスト
 * @returns {Array} 効果オブジェクトの配列
 */
export const parseEffect = (effectText) => {
  const effects = [];

  // ダメージ効果
  const damageMatch = effectText.match(/(\d+)ダメージ/);
  if (damageMatch) {
    effects.push({
      type: EFFECT_TYPES.DAMAGE,
      value: parseInt(damageMatch[1]),
      target: 'opponent', // デフォルトは相手プレイヤー
    });
  }

  // 回復効果
  const healMatch = effectText.match(/(\d+)回復/);
  if (healMatch) {
    effects.push({
      type: EFFECT_TYPES.HEAL,
      value: parseInt(healMatch[1]),
      target: 'self', // デフォルトは自分
    });
  }

  // 攻撃力バフ
  const buffAtkMatch = effectText.match(/攻撃力\+(\d+)/);
  if (buffAtkMatch) {
    effects.push({
      type: EFFECT_TYPES.BUFF_ATK,
      value: parseInt(buffAtkMatch[1]),
      target: 'self', // TODO: ターゲット指定を拡張
    });
  }

  // 攻撃力デバフ
  const debuffAtkMatch = effectText.match(/攻撃力-(\d+)/);
  if (debuffAtkMatch) {
    effects.push({
      type: EFFECT_TYPES.DEBUFF_ATK,
      value: parseInt(debuffAtkMatch[1]),
      target: 'opponent',
    });
  }

  // HP バフ
  const buffHpMatch = effectText.match(/HP\+(\d+)/);
  if (buffHpMatch) {
    effects.push({
      type: EFFECT_TYPES.BUFF_HP,
      value: parseInt(buffHpMatch[1]),
      target: 'self',
    });
  }

  // 2回攻撃
  if (effectText.includes('2回攻撃')) {
    effects.push({
      type: EFFECT_TYPES.DOUBLE_ATTACK,
      value: true,
    });
  }

  // ドロー効果
  const drawMatch = effectText.match(/(\d+)枚?ドロー/);
  if (drawMatch) {
    effects.push({
      type: EFFECT_TYPES.DRAW,
      value: parseInt(drawMatch[1]),
    });
  }

  // TODO: サーチ、蘇生、破壊などの複雑な効果は将来実装

  return effects;
};

/**
 * 単一の効果を実行
 * @param {Object} effect - 効果オブジェクト
 * @param {Object} context - ゲームコンテキスト
 * @returns {boolean} 成功したかどうか
 */
export const executeEffect = (effect, context) => {
  const {
    type,
    value,
    target,
  } = effect;

  const {
    currentPlayer,
    setP1Life,
    setP2Life,
    setP1Field,
    setP2Field,
    addLog,
  } = context;

  switch (type) {
    case EFFECT_TYPES.DAMAGE:
      if (target === 'opponent' || !target) {
        if (currentPlayer === 1) {
          setP2Life(prev => Math.max(0, prev - value));
        } else {
          setP1Life(prev => Math.max(0, prev - value));
        }
        addLog(`相手に${value}ダメージ！`, 'damage');
      }
      return true;

    case EFFECT_TYPES.HEAL:
      if (target === 'self' || !target) {
        if (currentPlayer === 1) {
          setP1Life(prev => prev + value);
        } else {
          setP2Life(prev => prev + value);
        }
        addLog(`ライフを${value}回復！`, 'heal');
      }
      return true;

    case EFFECT_TYPES.BUFF_ATK:
      // TODO: 実装（モンスターの攻撃力を永続的に上昇）
      addLog(`攻撃力+${value}（未実装）`, 'info');
      return false;

    case EFFECT_TYPES.BUFF_HP:
      // TODO: 実装（モンスターのHPを永続的に上昇）
      addLog(`HP+${value}（未実装）`, 'info');
      return false;

    case EFFECT_TYPES.DEBUFF_ATK:
      // TODO: 実装（相手モンスターの攻撃力を下降）
      addLog(`攻撃力-${value}（未実装）`, 'info');
      return false;

    case EFFECT_TYPES.DOUBLE_ATTACK:
      // TODO: 実装（このターン2回攻撃可能）
      addLog(`2回攻撃可能（未実装）`, 'info');
      return false;

    case EFFECT_TYPES.DRAW:
      // TODO: 実装（カードをドロー）
      addLog(`${value}枚ドロー（未実装）`, 'info');
      return false;

    case EFFECT_TYPES.SEARCH:
      // TODO: 実装（デッキからサーチ）
      addLog(`サーチ効果（未実装）`, 'info');
      return false;

    case EFFECT_TYPES.REVIVE:
      // TODO: 実装（墓地から蘇生）
      addLog(`蘇生効果（未実装）`, 'info');
      return false;

    case EFFECT_TYPES.DESTROY:
      // TODO: 実装（破壊効果）
      addLog(`破壊効果（未実装）`, 'info');
      return false;

    default:
      console.warn('未実装の効果タイプ:', type);
      return false;
  }
};

/**
 * 技の効果を実行
 * @param {string} skillText - 技の効果テキスト
 * @param {Object} context - ゲームコンテキスト
 * @returns {boolean} 成功したかどうか
 */
export const executeSkillEffects = (skillText, context) => {
  const { addLog } = context;

  // 効果を解析
  const effects = parseEffect(skillText);

  if (effects.length === 0) {
    addLog('効果を解析できませんでした', 'info');
    return false;
  }

  // 各効果を実行
  let allSucceeded = true;
  effects.forEach(effect => {
    const success = executeEffect(effect, context);
    if (!success) {
      allSucceeded = false;
    }
  });

  return allSucceeded;
};
