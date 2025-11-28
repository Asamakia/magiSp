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
import { fireLeaveFieldTrigger } from '../triggerEngine';
import { hasCategory } from '../../utils/helpers';

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
    if (context.skillType === 'basic') {
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

    if (context.skillType === 'basic') {
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

      // 全モンスターに600ダメージ（ログを先に出力）
      const damageResults = opponentField.map(m => {
        if (m) {
          const newHp = Math.max(0, m.currentHp - 600);
          addLog(`${m.name}に600ダメージ（残りHP: ${newHp}）`, 'damage');
          return { monster: m, newHp };
        }
        return null;
      });

      setOpponentField(prev => prev.map((m, idx) => {
        if (m && damageResults[idx]) {
          return { ...m, currentHp: damageResults[idx].newHp };
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

  /**
   * C0000267: 星翼の飛舟エクラオン
   * 基本技: デッキからコスト4以下の「未来属性」モンスター1体を召喚。このカードをデッキの下に戻す。
   */
  C0000267: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Deck, p2Deck,
      setP1Deck, setP2Deck,
      p1Field, p2Field,
      setP1Field, setP2Field,
      monsterIndex,
    } = context;

    if (context.skillType === 'basic') {
      const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;

      // デッキからコスト4以下の未来属性モンスターを検索
      const targetIndex = currentDeck.findIndex(card =>
        card.type === 'monster' &&
        checkAttribute(card, '未来') &&
        card.cost <= 4
      );

      if (targetIndex === -1) {
        addLog('デッキにコスト4以下の未来属性モンスターがいません', 'info');
        return false;
      }

      // 空きスロットを探す
      const emptySlotIndex = currentField.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog('フィールドに空きがありません', 'info');
        return false;
      }

      // デッキからカードを取得
      const targetCard = currentDeck[targetIndex];
      const newDeck = currentDeck.filter((_, idx) => idx !== targetIndex);

      // このカード（エクラオン）を取得
      const thisCard = currentField[monsterIndex];
      if (!thisCard) {
        addLog('エラー: カードが見つかりません', 'info');
        return false;
      }

      // モンスターインスタンスを作成
      const monsterInstance = {
        ...targetCard,
        uniqueId: `${targetCard.id}_${Date.now()}`,
        currentHp: targetCard.hp,
        currentAttack: targetCard.attack,
        canAttack: false, // 召喚ターンは攻撃不可
        usedSkillThisTurn: false,
        owner: currentPlayer,
        charges: [],
        statusEffects: [],
      };

      // フィールドを更新：召喚＆このカードを除去
      setField(prev => prev.map((slot, idx) => {
        if (idx === emptySlotIndex) {
          return monsterInstance;
        }
        if (idx === monsterIndex) {
          return null; // このカードをフィールドから除去
        }
        return slot;
      }));

      // デッキを更新：このカードをデッキの下に追加
      setDeck([...newDeck, thisCard]);

      addLog(`デッキから「${targetCard.name}」を召喚！`, 'info');
      addLog(`「${thisCard.name}」をデッキの下に戻した`, 'info');

      // 「場を離れる時」トリガーを発動（デッキに戻る場合も発動）
      fireLeaveFieldTrigger(thisCard, context, 'return_to_deck');

      return true;
    }

    return false;
  },

  /**
   * C0000274: 星辰の魔導術師
   * 基本技: 場に《エクラリア》モンスターがいる場合、自分のデッキからコスト4以下「未来属性」魔法カード1枚を手札に加える。
   */
  C0000274: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Field, p2Field,
      p1Deck, p2Deck,
      setP1Deck, setP2Deck,
      setP1Hand, setP2Hand,
    } = context;

    if (context.skillType === 'basic') {
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

      // 場に「エクラリア」モンスターがいるか確認
      const hasEclaria = currentField.some(monster =>
        monster !== null &&
        (monster.name.includes('エクラリア') || hasCategory(monster, '【エクラリア】'))
      );

      if (!hasEclaria) {
        addLog('場に《エクラリア》モンスターがいません', 'info');
        return false;
      }

      // デッキからコスト4以下の未来属性魔法カードを検索
      const targetIndex = currentDeck.findIndex(card =>
        card.type === 'magic' &&
        checkAttribute(card, '未来') &&
        card.cost <= 4
      );

      if (targetIndex === -1) {
        addLog('デッキにコスト4以下の未来属性魔法カードがありません', 'info');
        return false;
      }

      // カードを手札に加える
      const targetCard = currentDeck[targetIndex];
      setDeck(prev => prev.filter((_, idx) => idx !== targetIndex));
      setHand(prev => [...prev, targetCard]);

      addLog(`デッキから「${targetCard.name}」を手札に加えた`, 'info');
      return true;
    }

    return false;
  },

  /**
   * C0000278: 灯守の少女
   * トリガーのみ（futureCards.jsで実装）
   * - 【召喚時】自分のデッキ上1枚を見て、それが「未来属性」カードなら手札に、違えばデッキ下に
   * - 【場を離れる時】自分の墓地の「未来属性」カード1枚をデッキに戻す
   */
  C0000278: (skillText, context) => {
    // このカードは基本技/上級技を持たない（トリガーのみ）
    return false;
  },

  /**
   * C0000268: 虚蝕の魔導兵
   * 召喚時効果はトリガー（futureCards.jsで実装）
   * 基本技: 自分の墓地の「未来属性」カード1枚をデッキに戻し、このカードの攻撃力をターン終了時まで800アップ。
   */
  C0000268: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      monsterIndex,
      p1Graveyard, p2Graveyard,
      setP1Graveyard, setP2Graveyard,
      setP1Deck, setP2Deck,
      p1Field, p2Field,
      setP1Field, setP2Field,
    } = context;

    // 基本技
    if (context.skillType === 'basic') {
      const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
      const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;

      // 墓地から未来属性カードを検索
      const futureCard = currentGraveyard.find(card => checkAttribute(card, '未来'));

      if (!futureCard) {
        addLog('墓地に未来属性カードがありません', 'info');
        return false;
      }

      // 墓地からデッキに戻す
      setGraveyard(prev => prev.filter(c => c.uniqueId !== futureCard.uniqueId));
      setDeck(prev => [...prev, futureCard]);
      addLog(`墓地から「${futureCard.name}」をデッキに戻した`, 'info');

      // このカードの攻撃力を800アップ（ターン終了時まで）
      const thisCard = currentField[monsterIndex];
      if (thisCard) {
        setField(prev => prev.map((m, idx) => {
          if (idx === monsterIndex && m) {
            const newAttack = (m.currentAttack || m.attack) + 800;
            addLog(`${m.name}の攻撃力が800アップ（${newAttack}）！`, 'info');
            return {
              ...m,
              currentAttack: newAttack,
              attackBuffUntilEndOfTurn: (m.attackBuffUntilEndOfTurn || 0) + 800,
            };
          }
          return m;
        }));
      }

      return true;
    }

    return false;
  },

  /**
   * C0000106: 次元渡り・ヴォイドウォーカー
   * エンドフェイズトリガーはfutureCards.jsで実装
   * 基本技: このカードの攻撃力をターン終了時まで1800に変更。
   */
  C0000106: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      monsterIndex,
      p1Field, p2Field,
      setP1Field, setP2Field,
    } = context;

    // 基本技
    if (context.skillType === 'basic') {
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setField = currentPlayer === 1 ? setP1Field : setP2Field;

      const thisCard = currentField[monsterIndex];
      if (!thisCard) {
        return false;
      }

      const currentAttack = thisCard.currentAttack || thisCard.attack;
      const targetAttack = 1800;

      // 既に1800以上なら効果なし
      if (currentAttack >= targetAttack) {
        addLog(`${thisCard.name}の攻撃力は既に${currentAttack}です`, 'info');
        return true;
      }

      // 攻撃力を1800に変更（ターン終了時まで）
      const buffAmount = targetAttack - currentAttack;
      setField(prev => prev.map((m, idx) => {
        if (idx === monsterIndex && m) {
          addLog(`${m.name}の攻撃力が${targetAttack}に変更！`, 'info');
          return {
            ...m,
            currentAttack: targetAttack,
            attackBuffUntilEndOfTurn: (m.attackBuffUntilEndOfTurn || 0) + buffAmount,
          };
        }
        return m;
      }));

      return true;
    }

    return false;
  },

  /**
   * C0000269: 永遠の灯の残響
   * 自分の墓地のコスト4以下「未来属性」モンスター1体を場に召喚。そのモンスターはターン終了時まで破壊されない。
   */
  C0000269: (skillText, context) => {
    const { addLog } = context;

    // 魔法カード効果
    const result = reviveFromGraveyard(
      context,
      (card) => checkAttribute(card, '未来') && card.cost <= 4,
      { indestructible: true }
    );

    if (result) {
      addLog('永遠の灯の残響の効果発動！', 'info');
    }
    return result;
  },

  /**
   * C0000277: 星屑の時導術
   * 【刹那詠唱】自分のデッキ上3枚を見て、1枚を手札に加え、残りを好きな順番で戻す。
   */
  C0000277: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Deck, p2Deck,
      setP1Deck, setP2Deck,
      setP1Hand, setP2Hand,
      setPendingDeckReview,
    } = context;

    const deck = currentPlayer === 1 ? p1Deck : p2Deck;
    const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
    const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

    if (deck.length === 0) {
      addLog('デッキにカードがありません', 'info');
      return true; // 効果処理は完了（対象なし）
    }

    const cardCount = Math.min(3, deck.length);
    const topCards = deck.slice(0, cardCount);
    addLog(`星屑の時導術: デッキ上${cardCount}枚を確認`, 'info');

    if (cardCount === 1) {
      // 1枚しかない場合、その1枚を手札に加える
      setHand((prev) => [...prev, topCards[0]]);
      setDeck((prev) => prev.slice(1));
      addLog(`${topCards[0].name}を手札に加えた`, 'info');
      return true;
    }

    // 2枚以上ある場合、プレイヤーに選択させる
    setPendingDeckReview({
      cards: topCards,
      title: '星屑の時導術',
      message: '手札に加えるカードを1枚選択してください（残りは順番を変更してデッキに戻します）',
      allowReorder: false,
      selectMode: { enabled: true, count: 1 },
      onSelect: (selectedCards, remainingCards) => {
        const cardToHand = selectedCards[0];
        setHand((prev) => [...prev, cardToHand]);
        addLog(`${cardToHand.name}を手札に加えた`, 'info');

        if (remainingCards.length > 1) {
          // 残りカードの順番を選択させる
          setPendingDeckReview({
            cards: remainingCards,
            title: '星屑の時導術',
            message: 'デッキに戻すカードの順番を決めてください（上から順）',
            allowReorder: true,
            onConfirm: (reorderedCards) => {
              setDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
              addLog(`残りをデッキに戻した: ${reorderedCards.map((c) => c.name).join(' → ')}`, 'info');
            },
          });
        } else if (remainingCards.length === 1) {
          // 残りが1枚なら自動で戻す
          setDeck((prev) => [remainingCards[0], ...prev.slice(cardCount)]);
          addLog(`${remainingCards[0].name}をデッキに戻した`, 'info');
        }
      },
    });

    return true;
  },

  /**
   * C0000255: 未来の鴉予言
   * 自分のデッキの上から5枚を見て、1枚を手札に加え、残りを好きな順番で戻す。
   */
  C0000255: (skillText, context) => {
    const {
      addLog,
      currentPlayer,
      p1Deck, p2Deck,
      setP1Deck, setP2Deck,
      setP1Hand, setP2Hand,
      setPendingDeckReview,
    } = context;

    const deck = currentPlayer === 1 ? p1Deck : p2Deck;
    const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
    const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

    if (deck.length === 0) {
      addLog('デッキにカードがありません', 'info');
      return true; // 効果処理は完了（対象なし）
    }

    const cardCount = Math.min(5, deck.length);
    const topCards = deck.slice(0, cardCount);
    addLog(`未来の鴉予言: デッキ上${cardCount}枚を確認`, 'info');

    if (cardCount === 1) {
      // 1枚しかない場合、その1枚を手札に加える
      setHand((prev) => [...prev, topCards[0]]);
      setDeck((prev) => prev.slice(1));
      addLog(`${topCards[0].name}を手札に加えた`, 'info');
      return true;
    }

    // 2枚以上ある場合、プレイヤーに選択させる
    setPendingDeckReview({
      cards: topCards,
      title: '未来の鴉予言',
      message: '手札に加えるカードを1枚選択してください（残りは順番を変更してデッキに戻します）',
      allowReorder: false,
      selectMode: { enabled: true, count: 1 },
      onSelect: (selectedCards, remainingCards) => {
        const cardToHand = selectedCards[0];
        setHand((prev) => [...prev, cardToHand]);
        addLog(`${cardToHand.name}を手札に加えた`, 'info');

        if (remainingCards.length > 1) {
          // 残りカードの順番を選択させる
          setPendingDeckReview({
            cards: remainingCards,
            title: '未来の鴉予言',
            message: 'デッキに戻すカードの順番を決めてください（上から順）',
            allowReorder: true,
            onConfirm: (reorderedCards) => {
              setDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
              addLog(`残りをデッキに戻した`, 'info');
            },
          });
        } else if (remainingCards.length === 1) {
          // 残りが1枚なら自動で戻す
          setDeck((prev) => [remainingCards[0], ...prev.slice(cardCount)]);
          addLog(`${remainingCards[0].name}をデッキに戻した`, 'info');
        }
      },
    });

    return true;
  },

  /**
   * C0000273: エクラリアの残影
   * 自分のデッキから《エクラリア》と名のついたモンスター1体を手札に加える。
   */
  C0000273: (skillText, context) => {
    const { addLog } = context;

    // デッキから「エクラリア」の名前を持つモンスターを検索
    const foundCard = searchCard(context, (card) => {
      return card.type === 'monster' && card.name.includes('エクラリア');
    });

    if (foundCard) {
      addLog(`エクラリアの残影: ${foundCard.name}を手札に加えた`, 'info');
    } else {
      addLog('エクラリアの残影: デッキに《エクラリア》モンスターがありません', 'info');
    }
    return true; // 効果処理は完了（対象の有無に関わらず）
  },

  // 他の未来属性カードを追加...
};
