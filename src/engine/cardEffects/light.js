// ========================================
// 光属性カードの固有効果
// ========================================

import {
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  drawCards,
  healLife,
  modifyAttack,
} from '../effectHelpers';
import { hasCategory } from '../../utils/helpers';

/**
 * 光属性カードの固有効果
 */
export const lightCardEffects = {
  /**
   * C0000059: 光の騎士
   * 【召喚時】デッキから《光の》魔法カード1枚を手札に加える
   */
  C0000059: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.type === 'magic' && card.name && card.name.includes('光の');
      }) !== null;
    }
    return false;
  },

  /**
   * C0000060: 聖なる導師
   * 基本技：場にいる光属性モンスター1体の攻撃力をターン終了時まで600アップ
   */
  C0000060: (skillText, context) => {
    if (context.skillType === 'basic') {
      return modifyAttack(context, 600, 0, false, false);
    }
    return false;
  },

  /**
   * C0000121: 聖域の灯守兵
   * 【召喚時】自分の手札から光属性モンスター1体を公開し、デッキに戻す。その後、1枚ドローする
   */
  C0000121: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      setP1Deck, setP2Deck,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentHand = currentPlayer === 1 ? p1Hand : p2Hand;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

      const lightMonster = currentHand.find(card =>
        card.type === 'monster' && card.attribute === '光'
      );

      if (lightMonster) {
        // 手札からデッキに戻す
        setHand(prev => prev.filter(c => c.uniqueId !== lightMonster.uniqueId));
        setDeck(prev => [...prev, lightMonster]);
        addLog(`手札から「${lightMonster.name}」をデッキに戻した`, 'info');

        // 1枚ドロー
        drawCards(context, 1);
        return true;
      } else {
        addLog('手札に光属性モンスターがありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000211: フルーツ・マリオネット・アップル
   * 【召喚時】デッキからコスト3以下のプラントモンスター1体を墓地に送る
   */
  C0000211: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Deck, p2Deck,
      setP1Deck, setP2Deck,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

      const plantCard = currentDeck.find(card =>
        card.type === 'monster' &&
        card.cost <= 3 &&
        hasCategory(card, '【プラント】')
      );

      if (plantCard) {
        setDeck(prev => prev.filter(c => c.uniqueId !== plantCard.uniqueId));
        setGraveyard(prev => [...prev, plantCard]);
        addLog(`デッキから「${plantCard.name}」を墓地に送った`, 'info');
        return true;
      } else {
        addLog('デッキにコスト3以下のプラントモンスターがありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000212: フルーツ・マリオネット・オレンジ
   * 【召喚時】デッキから《フルーツ・マリオネット》モンスター1体を手札に加える
   */
  C0000212: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.name && card.name.includes('フルーツ・マリオネット');
      }) !== null;
    }
    return false;
  },

  /**
   * C0000214: フルーツ・マリオネット・グレープ
   * 【召喚時】自分の墓地の［プラント］モンスター1体を場に戻す（攻撃力は半分）
   */
  C0000214: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return reviveFromGraveyard(context, (card) => {
        return hasCategory(card, '【プラント】');
      }, true);
    }
    return false;
  },

  /**
   * C0000235: プリンセス狂いのリリカ
   * 【召喚時】デッキから《プリティ☆プリンセス》魔法カード1枚を発動する（コストなし）
   */
  C0000235: (skillText, context) => {
    const { addLog } = context;

    if (skillText.includes('【召喚時】')) {
      const foundCard = searchCard(context, (card) => {
        return card.type === 'magic' && card.name && card.name.includes('プリティ☆プリンセス');
      });

      if (foundCard) {
        addLog(`魔法カード「${foundCard.name}」を発動（コストなし）`, 'info');
        // TODO: 魔法効果の実行（現在は簡易実装）
        return true;
      }
      return false;
    }
    return false;
  },

  /**
   * C0000318: 雷鳴の使者
   * 【召喚時】相手モンスター1体の攻撃力をターン終了時まで500下げる
   */
  C0000318: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return modifyAttack(context, -500, 0, true, false);
    }
    return false;
  },

  /**
   * C0000322: 嵐の雛雷鳥
   * 【召喚時】デッキから《雷》または《嵐》と名の付くカード1枚を手札に加える
   */
  C0000322: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.name && (card.name.includes('雷') || card.name.includes('嵐'));
      }) !== null;
    }
    return false;
  },

  // 他の光属性カードを追加...
};
