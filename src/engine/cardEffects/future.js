// ========================================
// 未来属性カードの固有効果
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
 * 未来属性カードの固有効果
 */
export const futureCardEffects = {
  /**
   * C0000279: 虚蝕の残響者
   * 【召喚時】相手のデッキ上1枚を墓地に送る
   * 基本技: 自分のデッキ上1枚を墓地に送る、それが「未来属性」カードなら相手プレイヤーに300ダメージ、違えばこのカードに300ダメージ
   */
  C0000279: (skillText, context) => {
    const { addLog } = context;

    // 召喚時効果
    if (skillText.includes('【召喚時】')) {
      millOpponentDeck(context, 1);
      return true;
    }

    // 基本技
    if (skillText.includes('基本技')) {
      const milledCards = millDeck(context, 1);
      if (milledCards.length === 0) {
        return false;
      }

      const milledCard = milledCards[0];
      if (checkAttribute(milledCard, '未来')) {
        conditionalDamage(context, 300, 'opponent');
        addLog('「未来属性」カードだった！', 'info');
      } else {
        conditionalDamage(context, 300, 'self_monster');
        addLog('「未来属性」カードではなかった...', 'info');
      }
      return true;
    }

    return false;
  },

  /**
   * C0000280: 星灯の少女エクラリア
   * 【召喚時】自分のデッキから《エクラシアの時空炉》1枚を手札に加える
   */
  C0000280: (skillText, context) => {
    const { addLog } = context;

    if (skillText.includes('【召喚時】')) {
      const foundCard = searchCard(context, (card) => {
        return card.name.includes('エクラシアの時空炉');
      });
      return foundCard !== null;
    }

    return false;
  },

  /**
   * C0000085: 胡乱なドローン
   * 【召喚時】デッキの上から1枚を墓地に送る。そのカードが未来属性の場合、次のターン終了時までこのカードの攻撃力を600に変更
   */
  C0000085: (skillText, context) => {
    const { addLog, monsterIndex, currentPlayer, setP1Field, setP2Field, p1Field, p2Field } = context;

    if (skillText.includes('【召喚時】')) {
      const milledCards = millDeck(context, 1);
      if (milledCards.length === 0) {
        return false;
      }

      const milledCard = milledCards[0];
      if (checkAttribute(milledCard, '未来')) {
        // 攻撃力を600に変更
        const setCurrentField = currentPlayer === 1 ? setP1Field : setP2Field;
        setCurrentField(prev => prev.map((m, idx) => {
          if (idx === monsterIndex && m) {
            addLog(`${m.name}の攻撃力が600に変更！`, 'info');
            return { ...m, attack: 600 };
          }
          return m;
        }));
      }
      return true;
    }

    return false;
  },

  /**
   * C0000090: 時脈の観測者
   * 基本技: 自分の手札1枚をデッキに戻しシャッフルする。その後、1枚ドローする
   */
  C0000090: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      setP1Deck, setP2Deck,
      p1Deck, p2Deck,
    } = context;

    if (skillText.includes('基本技')) {
      const currentHand = currentPlayer === 1 ? p1Hand : p2Hand;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
      const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

      if (currentHand.length === 0) {
        addLog('手札がありません', 'info');
        return false;
      }

      // 手札の最初のカードをデッキに戻す（本来はプレイヤーが選択）
      const cardToReturn = currentHand[0];
      setHand(prev => prev.slice(1));
      setDeck(prev => {
        // シャッフル（簡易実装）
        const newDeck = [...prev, cardToReturn];
        return newDeck.sort(() => Math.random() - 0.5);
      });
      addLog(`手札から「${cardToReturn.name}」をデッキに戻した`, 'info');

      // 1枚ドロー
      drawCards(context, 1);
      return true;
    }

    return false;
  },

  /**
   * C0000105: 魔導炉の残骸獣
   * 【召喚時】自分の墓地の未来属性カード1枚をデッキに戻す。その後、相手プレイヤーに300ダメージを与える
   */
  C0000105: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Graveyard, p2Graveyard,
      setP1Graveyard, setP2Graveyard,
      setP1Deck, setP2Deck,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

      // 墓地から未来属性カードを検索
      const futureCard = currentGraveyard.find(card => checkAttribute(card, '未来'));

      if (futureCard) {
        // デッキに戻す
        setGraveyard(prev => prev.filter(c => c.uniqueId !== futureCard.uniqueId));
        setDeck(prev => [...prev, futureCard]);
        addLog(`墓地から「${futureCard.name}」をデッキに戻した`, 'info');
      } else {
        addLog('墓地に未来属性カードがありません', 'info');
      }

      // 相手に300ダメージ
      conditionalDamage(context, 300, 'opponent');
      return true;
    }

    return false;
  },

  /**
   * C0000116: 時空旅人ソラリア
   * 【召喚時】1枚ドローする。その後、手札を1枚デッキの下に戻す
   */
  C0000116: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      setP1Deck, setP2Deck,
    } = context;

    if (skillText.includes('【召喚時】')) {
      // 1枚ドロー
      const drawnCards = drawCards(context, 1);
      if (drawnCards.length === 0) {
        return false;
      }

      const currentHand = currentPlayer === 1 ? p1Hand : p2Hand;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

      if (currentHand.length === 0) {
        addLog('手札がありません', 'info');
        return true; // ドローは成功したのでtrue
      }

      // 手札の最初のカードをデッキの下に戻す（本来はプレイヤーが選択）
      const cardToReturn = currentHand[0];
      setHand(prev => prev.slice(1));
      setDeck(prev => [...prev, cardToReturn]);
      addLog(`手札から「${cardToReturn.name}」をデッキの下に戻した`, 'info');

      return true;
    }

    return false;
  },

  /**
   * C0000183: 殲滅の魔導ゴーレム
   * 【召喚時】相手フィールド全体に600ダメージを与える
   */
  C0000183: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      setP1Field, setP2Field,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const opponentField = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

      const monsters = opponentField.filter(m => m !== null);
      if (monsters.length === 0) {
        addLog('相手フィールドにモンスターがいません', 'info');
        return true;
      }

      // 全モンスターに600ダメージ
      setOpponentField(prev => prev.map(m => {
        if (m) {
          const newHp = Math.max(0, m.currentHp - 600);
          addLog(`${m.name}に600ダメージ（残りHP: ${newHp}）`, 'damage');
          return { ...m, currentHp: newHp };
        }
        return m;
      }));

      return true;
    }

    return false;
  },

  /**
   * C0000249: ミランの使い魔未来鴉
   * 【召喚時】デッキの上から3枚を見て、好きな順番で戻す
   */
  C0000249: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Deck, p2Deck,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;

      if (currentDeck.length >= 3) {
        const topCards = currentDeck.slice(0, 3);
        addLog(`デッキの上から3枚を確認: ${topCards.map(c => c.name).join(', ')}`, 'info');
        addLog('（順番はそのまま戻しました）', 'info');
      } else {
        addLog(`デッキの残りは${currentDeck.length}枚です`, 'info');
      }

      // 実際の順番変更は UI が必要なので、現在は何もしない
      return true;
    }

    return false;
  },

  /**
   * C0000250: 時空渡りのカモメ
   * 【召喚時】相手の手札を1枚ランダムに墓地に送る
   */
  C0000250: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      setP1Graveyard, setP2Graveyard,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const opponentHand = currentPlayer === 1 ? p2Hand : p1Hand;
      const setOpponentHand = currentPlayer === 1 ? setP2Hand : setP1Hand;
      const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

      if (opponentHand.length === 0) {
        addLog('相手の手札がありません', 'info');
        return true;
      }

      // ランダムに1枚選択
      const randomIndex = Math.floor(Math.random() * opponentHand.length);
      const discardedCard = opponentHand[randomIndex];

      setOpponentHand(prev => prev.filter((_, idx) => idx !== randomIndex));
      setOpponentGraveyard(prev => [...prev, discardedCard]);
      addLog(`相手の手札から「${discardedCard.name}」を墓地に送った`, 'damage');

      return true;
    }

    return false;
  },

  /**
   * C0000251: 紫鴉の魔導士ミラン
   * 【召喚時】デッキから未来属性魔法カード1枚を手札に加える
   */
  C0000251: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      const foundCard = searchCard(context, (card) => {
        return checkAttribute(card, '未来') && card.type === 'magic';
      });
      return foundCard !== null;
    }

    return false;
  },

  /**
   * C0000256: 紫時空の幻鴉
   * 【召喚時】自分の墓地の「未来属性」カード1枚を手札に加える
   */
  C0000256: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Graveyard, p2Graveyard,
      setP1Graveyard, setP2Graveyard,
      setP1Hand, setP2Hand,
    } = context;

    if (skillText.includes('【召喚時】')) {
      const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

      // 墓地から未来属性カードを検索
      const futureCard = currentGraveyard.find(card => checkAttribute(card, '未来'));

      if (futureCard) {
        setGraveyard(prev => prev.filter(c => c.uniqueId !== futureCard.uniqueId));
        setHand(prev => [...prev, futureCard]);
        addLog(`墓地から「${futureCard.name}」を手札に加えた`, 'info');
        return true;
      } else {
        addLog('墓地に未来属性カードがありません', 'info');
        return false;
      }
    }

    return false;
  },

  // 他の未来属性カードを追加...
};
