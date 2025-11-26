// ========================================
// [属性名]属性カードの固有効果
// 新規カード追加時のテンプレート
// ========================================

import {
  millDeck,
  millOpponentDeck,
  checkAttribute,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  destroyMonster,
  drawCards,
  healLife,
  modifyAttack,
  modifyHP,
} from '../effectHelpers';

/**
 * [属性名]属性カードの固有効果
 */
export const [属性名]CardEffects = {
  /**
   * C0000XXX: [カード名]
   * [効果の詳細説明]
   * 例: 基本技: 自分のデッキ上1枚を墓地に送る、それが「未来属性」カードなら相手プレイヤーに300ダメージ、違えばこのカードに300ダメージ。
   */
  C0000XXX: (skillText, context) => {
    const { addLog, currentPlayer, monsterIndex } = context;

    // 召喚時効果の場合
    if (skillText.includes('【召喚時】')) {
      // 召喚時効果の実装
      addLog('召喚時効果を発動！', 'info');
      // ...
      return true;
    }

    // 基本技の場合
    if (skillText.includes('基本技')) {
      // 基本技の実装
      addLog('基本技を発動！', 'info');

      // 例: デッキから1枚墓地に送る
      const milledCards = millDeck(context, 1);
      if (milledCards.length === 0) {
        return false;
      }

      // 例: 条件分岐
      const milledCard = milledCards[0];
      if (checkAttribute(milledCard, '未来')) {
        // 相手に300ダメージ
        conditionalDamage(context, 300, 'opponent');
      } else {
        // 自分のモンスターに300ダメージ
        conditionalDamage(context, 300, 'self_monster');
      }

      return true;
    }

    // 上級技の場合
    if (skillText.includes('上級技')) {
      // 上級技の実装
      addLog('上級技を発動！', 'info');
      // ...
      return true;
    }

    return false;
  },

  /**
   * C0000YYY: [別のカード名]
   * [効果の詳細説明]
   */
  C0000YYY: (skillText, context) => {
    // 別のカードの実装
    return false;
  },

  // さらにカードを追加...
};
