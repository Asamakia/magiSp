/**
 * スキル有効性チェッカー
 *
 * AIがスキルを発動する前に、そのスキルが実際に効果を発揮できるか
 * （条件を満たしているか）を事前チェックするシステム
 *
 * 問題背景:
 * - 輝聖女ルミナスの上級技「手札から光属性モンスターを召喚」は、
 *   手札に光属性モンスターがないと効果なしでreturn falseする
 * - この場合 usedSkillThisTurn が設定されないため、
 *   AIが同じ技を繰り返し選択して無限ループになる
 *
 * 解決策:
 * - AIがスキルを選択する前に「効果が有効か」をチェック
 * - 有効でないスキルは使用可能リストから除外
 */

/**
 * カードIDとスキルタイプごとの有効性チェッカー
 * チェッカーが未定義のスキルはデフォルトで有効とみなす
 */
const skillEffectivityCheckers = {
  /**
   * C0000056: 輝聖女ルミナス
   * 上級技: 手札から光属性モンスター1体をコストなしで召喚可能
   * → 手札に光属性モンスターが必要、フィールドに空きが必要
   */
  C0000056: {
    advanced: (monster, gameState) => {
      // 手札に光属性モンスターがあるか
      const lightMonsters = gameState.myHand.filter(
        card => card.type === 'monster' && card.attribute === '光'
      );
      if (lightMonsters.length === 0) {
        return false;
      }

      // フィールドに空きがあるか
      const emptySlot = gameState.myField.findIndex(slot => slot === null);
      if (emptySlot === -1) {
        return false;
      }

      return true;
    },
  },

  /**
   * C0000142: ブリザードマスター
   * 上級技: デッキから「ブリザードキャット」と名のつくモンスターを1体特殊召喚
   * → フィールドに空きが必要（デッキの中身はAIが確認できないため、空きだけチェック）
   */
  C0000142: {
    advanced: (monster, gameState) => {
      const emptySlot = gameState.myField.findIndex(slot => slot === null);
      return emptySlot !== -1;
    },
  },

  /**
   * C0000044: 水晶のマーメイド
   * 基本技: 手札の水属性モンスター1体のコストを1下げる
   * → 手札に水属性モンスターが必要
   */
  C0000044: {
    basic: (monster, gameState) => {
      const waterMonsters = gameState.myHand.filter(
        card => card.type === 'monster' && card.attribute === '水'
      );
      return waterMonsters.length > 0;
    },
  },

  /**
   * C0000028: 炎竜母フレイマ
   * 上級技: 墓地からドラゴン族モンスター1体を特殊召喚（攻撃力半減）
   * → 墓地にドラゴン族モンスターが必要、フィールドに空きが必要
   */
  C0000028: {
    advanced: (monster, gameState) => {
      // 墓地にドラゴンがあるか
      const dragons = gameState.myGraveyard.filter(
        card => card.type === 'monster' && card.category?.includes('ドラゴン')
      );
      if (dragons.length === 0) {
        return false;
      }

      // フィールドに空きがあるか
      const emptySlot = gameState.myField.findIndex(slot => slot === null);
      return emptySlot !== -1;
    },
  },

  /**
   * C0000049: タイダルシフト（魔法カードだが参考用）
   * 手札とフィールドのモンスターを入れ替え
   * → 手札にモンスターが必要、フィールドにモンスターが必要
   */

  /**
   * ソラリア系のカード: 手札から特定属性を召喚する系
   * 必要に応じて追加
   */
};

/**
 * スキルが有効かどうかをチェック
 * @param {Object} monster - フィールド上のモンスター
 * @param {string} skillType - 'basic' または 'advanced'
 * @param {Object} gameState - AIGameState
 * @returns {boolean} スキルが有効ならtrue
 */
export function isSkillEffective(monster, skillType, gameState) {
  if (!monster || !monster.id) {
    return true; // チェックできない場合はデフォルトで有効
  }

  const checker = skillEffectivityCheckers[monster.id];
  if (!checker) {
    return true; // チェッカーが未定義の場合はデフォルトで有効
  }

  const skillChecker = checker[skillType];
  if (!skillChecker) {
    return true; // そのスキルタイプのチェッカーがない場合はデフォルトで有効
  }

  try {
    return skillChecker(monster, gameState);
  } catch (error) {
    console.warn(`スキル有効性チェックでエラー: ${monster.name} ${skillType}`, error);
    return true; // エラー時はデフォルトで有効
  }
}

/**
 * 使用可能なスキルリストから無効なスキルを除外
 * @param {Array} usableSkills - getUsableSkillsの結果
 * @param {Object} gameState - AIGameState
 * @returns {Array} 有効なスキルのみのリスト
 */
export function filterEffectiveSkills(usableSkills, gameState) {
  return usableSkills.filter(skill => {
    return isSkillEffective(skill.monster, skill.skillType, gameState);
  });
}

export default {
  isSkillEffective,
  filterEffectiveSkills,
  // 外部からチェッカーを追加可能にする
  addChecker: (cardId, checkers) => {
    skillEffectivityCheckers[cardId] = {
      ...skillEffectivityCheckers[cardId],
      ...checkers,
    };
  },
};
