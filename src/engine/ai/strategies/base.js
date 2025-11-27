/**
 * AIストラテジー - ベース（ランダム）
 *
 * すべての判断をランダムで行うベースストラテジー。
 * 各メソッドをオーバーライドすることで判断基準をカスタマイズ可能。
 */

// ユーティリティ関数
export function randomPick(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * ベースストラテジー（すべてランダム）
 */
export const baseStrategy = {
  /**
   * 召喚するカードを選択
   * @param {Array} summonableCards - 召喚可能なカード一覧
   * @param {Object} gameState - ゲーム状態
   * @returns {Object|null} 召喚するカード（nullの場合は召喚しない）
   */
  chooseSummon(summonableCards, gameState) {
    if (summonableCards.length === 0) return null;
    return randomPick(summonableCards);
  },

  /**
   * 召喚先スロットを選択
   * @param {Array<number>} emptySlots - 空きスロットのインデックス配列
   * @param {Object} card - 召喚するカード
   * @param {Object} gameState - ゲーム状態
   * @returns {number|null} スロットインデックス
   */
  chooseSlot(emptySlots, card, gameState) {
    if (emptySlots.length === 0) return null;
    return randomPick(emptySlots);
  },

  /**
   * 使用するスキルを選択
   * @param {Array} usableSkills - 使用可能なスキル一覧 [{monsterIndex, skillType, monster}]
   * @param {Object} gameState - ゲーム状態
   * @returns {Object|null} 使用するスキル（nullの場合は使用しない）
   */
  chooseSkill(usableSkills, gameState) {
    if (usableSkills.length === 0) return null;
    // デフォルト: スキル使用しない（チャージを温存）
    return null;
  },

  /**
   * 発動するトリガーを選択
   * @param {Array} activatableTriggers - 発動可能なトリガー一覧
   * @param {Object} gameState - ゲーム状態
   * @returns {Object|null} 発動するトリガー（nullの場合は発動しない）
   */
  chooseTrigger(activatableTriggers, gameState) {
    if (activatableTriggers.length === 0) return null;
    // デフォルト: 発動しない
    return null;
  },

  /**
   * 攻撃するモンスターと攻撃順序を決定
   * @param {Array<number>} attackableIndices - 攻撃可能なモンスターのスロットインデックス
   * @param {Object} gameState - ゲーム状態
   * @returns {Array<number>} 攻撃順序（空配列の場合は攻撃しない）
   */
  chooseAttackOrder(attackableIndices, gameState) {
    // デフォルト: ランダム順で全員攻撃
    return shuffleArray([...attackableIndices]);
  },

  /**
   * 攻撃対象を選択
   * @param {Array} validTargets - 有効な攻撃対象 (スロットインデックス or 'direct')
   * @param {Object} attacker - 攻撃するモンスター
   * @param {Object} gameState - ゲーム状態
   * @returns {number|'direct'} 攻撃対象
   */
  chooseAttackTarget(validTargets, attacker, gameState) {
    if (validTargets.length === 0) return 'direct';
    return randomPick(validTargets);
  },

  /**
   * 手札選択（効果による選択）
   * @param {Array} validCards - 選択可能なカード一覧
   * @param {string} message - 選択メッセージ
   * @param {Object} gameState - ゲーム状態
   * @returns {Object|null} 選択するカード
   */
  chooseFromHand(validCards, message, gameState) {
    if (validCards.length === 0) return null;
    return randomPick(validCards);
  },

  /**
   * モンスターターゲット選択（効果による選択）
   * @param {Array<number>} validIndices - 選択可能なスロットインデックス
   * @param {string} message - 選択メッセージ
   * @param {Object} gameState - ゲーム状態
   * @returns {number|null} 選択するスロットインデックス
   */
  chooseMonsterTarget(validIndices, message, gameState) {
    if (validIndices.length === 0) return null;
    return randomPick(validIndices);
  },

  /**
   * 墓地カード選択（効果による選択）
   * @param {Array} validCards - 選択可能なカード一覧
   * @param {string} message - 選択メッセージ
   * @param {Object} gameState - ゲーム状態
   * @returns {Object|null} 選択するカード
   */
  chooseFromGraveyard(validCards, message, gameState) {
    if (validCards.length === 0) return null;
    return randomPick(validCards);
  },

  /**
   * デッキ確認時の選択（効果による選択）
   * @param {Array} cards - 確認できるカード一覧
   * @param {Object} options - オプション { allowReorder, selectMode }
   * @param {Object} gameState - ゲーム状態
   * @returns {Object} { selectedCard?, reorderedCards? }
   */
  chooseFromDeckReview(cards, options, gameState) {
    if (options.selectMode && cards.length > 0) {
      // 選択するカードをランダムに1枚選ぶ
      const selectedCard = randomPick(cards);
      const selectedCards = [selectedCard];
      const remainingCards = cards.filter(c => c.uniqueId !== selectedCard.uniqueId);
      return { selectedCards, remainingCards };
    }
    // 並び替えはそのまま
    return { reorderedCards: cards };
  },

  /**
   * 刹那詠唱を発動するか判断
   * @param {Array} availableSetsunaCards - 発動可能な刹那詠唱カード
   * @param {Object} chainContext - チェーンコンテキスト（攻撃情報等）
   * @param {Object} gameState - ゲーム状態
   * @returns {Object|null} 発動するカード（nullの場合は発動しない）
   */
  chooseSetsuna(availableSetsunaCards, chainContext, gameState) {
    // デフォルト: 発動しない
    return null;
  },

  /**
   * 魔法カードを使用するか判断
   * @param {Array} usableMagicCards - 使用可能な魔法カード
   * @param {Object} gameState - ゲーム状態
   * @returns {Object|null} 使用するカード（nullの場合は使用しない）
   */
  chooseMagicCard(usableMagicCards, gameState) {
    // デフォルト: 使用しない
    return null;
  },

  /**
   * メインフェイズを終了するか判断
   * @param {Object} gameState - ゲーム状態
   * @param {Object} actionsRemaining - 残りのアクション情報
   * @returns {boolean} true: バトルフェイズへ進む, false: メインフェイズ継続
   */
  shouldEndMainPhase(gameState, actionsRemaining) {
    // デフォルト: アクションがなければ終了
    const { canSummon, canUseSkill, canUseMagic, canActivateTrigger } = actionsRemaining;
    return !canSummon && !canUseSkill && !canUseMagic && !canActivateTrigger;
  },

  /**
   * バトルフェイズを終了するか判断
   * @param {Object} gameState - ゲーム状態
   * @param {Array<number>} remainingAttackers - まだ攻撃していないモンスター
   * @returns {boolean} true: エンドフェイズへ進む, false: 攻撃継続
   */
  shouldEndBattlePhase(gameState, remainingAttackers) {
    // デフォルト: 全員攻撃したら終了
    return remainingAttackers.length === 0;
  },
};
