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
import { hasCategory, createMonsterInstance } from '../../utils/helpers';
import { registerCardTriggers } from '../triggerEngine';
import { continuousEffectEngine } from '../continuousEffects';

/**
 * 光属性カードの固有効果
 */
export const lightCardEffects = {
  /**
   * C0000062: 光の使徒
   * 基本技：手札から光属性カード1枚を捨てるとレスト状態のSPトークン1つをアクティブにする
   */
  C0000062: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      setP1Graveyard, setP2Graveyard,
      p1RestedSP, p2RestedSP,
      setP1RestedSP, setP2RestedSP,
      setP1ActiveSP, setP2ActiveSP,
      setPendingHandSelection,
    } = context;

    if (context.skillType === 'basic') {
      const hand = currentPlayer === 1 ? p1Hand : p2Hand;
      const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;

      // 手札に光属性カードがあるか確認
      const lightCards = hand.filter(c => c.attribute === '光');
      if (lightCards.length === 0) {
        addLog('手札に光属性カードがありません', 'info');
        return false;
      }

      // レストSPがあるか確認
      if (restedSP <= 0) {
        addLog('レスト状態のSPトークンがありません', 'info');
        return false;
      }

      // 手札選択モードに入る
      setPendingHandSelection({
        message: '捨てる光属性カードを選択',
        filter: (card) => card.attribute === '光',
        callback: (selectedCard) => {
          const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
          const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
          const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
          const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;

          // 手札から削除して墓地に送る
          setHand(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));
          setGraveyard(prev => [...prev, selectedCard]);

          // レストSPを1つアクティブにする
          setRestedSP(prev => prev - 1);
          setActiveSP(prev => prev + 1);

          addLog(`「${selectedCard.name}」を捨ててSPを1つアクティブにした`, 'info');
        },
      });

      return true;
    }
    return false;
  },

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

  /**
   * C0000056: 輝聖女ルミナス
   * 基本技: このカードのHPを300回復。
   * 上級技: 手札から光属性モンスター1体をコストなしで召喚可能。
   */
  C0000056: (skillText, context) => {
    const {
      currentPlayer,
      monsterIndex,
      p1Field, p2Field,
      p1Hand, p2Hand,
      setP1Field, setP2Field,
      setP1Hand, setP2Hand,
      addLog,
      setPendingHandSelection,
    } = context;

    // 基本技: HPを300回復
    if (context.skillType === 'basic') {
      const field = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;

      if (monsterIndex === undefined || !field[monsterIndex]) {
        addLog('対象のモンスターが見つかりません', 'info');
        return false;
      }

      const monster = field[monsterIndex];
      const healAmount = Math.min(300, monster.maxHp - monster.currentHp);

      if (healAmount <= 0) {
        addLog(`${monster.name}のHPは既に最大です`, 'info');
        return false;
      }

      setField(prev => {
        const newField = [...prev];
        newField[monsterIndex] = {
          ...newField[monsterIndex],
          currentHp: newField[monsterIndex].currentHp + healAmount,
        };
        return newField;
      });

      addLog(`輝聖女ルミナスの基本技: HPを${healAmount}回復！`, 'heal');
      return true;
    }

    // 上級技: 手札から光属性モンスター1体をコストなしで召喚
    if (context.skillType === 'advanced') {
      const hand = currentPlayer === 1 ? p1Hand : p2Hand;
      const field = currentPlayer === 1 ? p1Field : p2Field;

      // 手札に光属性モンスターがあるか確認
      const lightMonsters = hand.filter(card =>
        card.type === 'monster' && card.attribute === '光'
      );

      if (lightMonsters.length === 0) {
        addLog('手札に光属性モンスターがありません', 'info');
        return false;
      }

      // フィールドに空きがあるか確認
      const emptySlotIndex = field.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog('フィールドに空きがありません', 'info');
        return false;
      }

      // 手札選択モードに入る
      setPendingHandSelection({
        message: '特殊召喚する光属性モンスターを選択',
        filter: (card) => card.type === 'monster' && card.attribute === '光',
        callback: (selectedCard) => {
          const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
          const setField = currentPlayer === 1 ? setP1Field : setP2Field;
          const currentField = currentPlayer === 1 ? p1Field : p2Field;

          // フィールドの空きスロットを再確認
          const targetSlot = currentField.findIndex(slot => slot === null);
          if (targetSlot === -1) {
            addLog('フィールドに空きがありません', 'info');
            return;
          }

          // モンスターインスタンスを作成
          const monsterInstance = createMonsterInstance(selectedCard, currentPlayer);

          // 手札から削除
          setHand(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));

          // フィールドに配置
          setField(prev => {
            const newField = [...prev];
            newField[targetSlot] = monsterInstance;
            return newField;
          });

          // トリガーを登録
          registerCardTriggers(monsterInstance, currentPlayer, targetSlot);

          // 常時効果を登録
          continuousEffectEngine.register(monsterInstance, currentPlayer);

          addLog(`輝聖女ルミナスの上級技: 「${selectedCard.name}」をコストなしで特殊召喚！`, 'heal');
        },
      });

      return true;
    }

    return false;
  },

  // 他の光属性カードを追加...
};
