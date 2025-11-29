// ========================================
// 未来属性カードの固有効果
// ========================================

import {
  getPlayerContext,
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
    const { addLog, monsterIndex } = context;
    const { setMyField } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      const milledCards = millDeck(context, 1);
      if (milledCards.length === 0) {
        return false;
      }

      const milledCard = milledCards[0];
      if (checkAttribute(milledCard, '未来')) {
        // 攻撃力を600に変更
        setMyField(prev => prev.map((m, idx) => {
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
    const { addLog } = context;
    const { myHand, setMyHand, setMyDeck } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      if (myHand.length === 0) {
        addLog('手札がありません', 'info');
        return false;
      }

      // 手札の最初のカードをデッキに戻す（本来はプレイヤーが選択）
      const cardToReturn = myHand[0];
      setMyHand(prev => prev.slice(1));
      setMyDeck(prev => {
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
   * 基本技: このカードの攻撃力をターン終了時まで1200に変更
   */
  C0000105: (skillText, context) => {
    const { addLog, monsterIndex } = context;
    const { myGraveyard, setMyGraveyard, setMyDeck, setMyField } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      // 墓地から未来属性カードを検索
      const futureCard = myGraveyard.find(card => checkAttribute(card, '未来'));

      if (futureCard) {
        // デッキに戻す
        setMyGraveyard(prev => prev.filter(c => c.uniqueId !== futureCard.uniqueId));
        setMyDeck(prev => [...prev, futureCard]);
        addLog(`墓地から「${futureCard.name}」をデッキに戻した`, 'info');
      } else {
        addLog('墓地に未来属性カードがありません', 'info');
      }

      // 相手に300ダメージ
      conditionalDamage(context, 300, 'opponent');
      return true;
    }

    // 基本技: 攻撃力を1200に変更
    if (context.skillType === 'basic') {
      setMyField(prev => prev.map((m, idx) => {
        if (idx === monsterIndex && m) {
          addLog(`${m.name}の攻撃力が1200に変更！`, 'info');
          return { ...m, currentAttack: 1200, attackModifiedUntilEndOfTurn: true };
        }
        return m;
      }));
      return true;
    }

    return false;
  },

  /**
   * C0000116: 時空旅人ソラリア
   * 【召喚時】1枚ドローする。その後、手札を1枚デッキの下に戻す
   */
  C0000116: (skillText, context) => {
    const { addLog } = context;
    const { myHand, setMyHand, setMyDeck } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      // 1枚ドロー
      const drawnCards = drawCards(context, 1);
      if (drawnCards.length === 0) {
        return false;
      }

      if (myHand.length === 0) {
        addLog('手札がありません', 'info');
        return true; // ドローは成功したのでtrue
      }

      // 手札の最初のカードをデッキの下に戻す（本来はプレイヤーが選択）
      const cardToReturn = myHand[0];
      setMyHand(prev => prev.slice(1));
      setMyDeck(prev => [...prev, cardToReturn]);
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
    const { addLog } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
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
    const { addLog } = context;
    const { myDeck } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      if (myDeck.length >= 3) {
        const topCards = myDeck.slice(0, 3);
        addLog(`デッキの上から3枚を確認: ${topCards.map(c => c.name).join(', ')}`, 'info');
        addLog('（順番はそのまま戻しました）', 'info');
      } else {
        addLog(`デッキの残りは${myDeck.length}枚です`, 'info');
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
    const { addLog } = context;
    const { opponentHand, setOpponentHand, setOpponentGraveyard } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
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
    const { addLog } = context;
    const { myGraveyard, setMyGraveyard, setMyHand } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      // 墓地から未来属性カードを検索
      const futureCard = myGraveyard.find(card => checkAttribute(card, '未来'));

      if (futureCard) {
        setMyGraveyard(prev => prev.filter(c => c.uniqueId !== futureCard.uniqueId));
        setMyHand(prev => [...prev, futureCard]);
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
    const { addLog, monsterIndex } = context;
    const { myDeck, setMyDeck, myField, setMyField, currentPlayer } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // デッキからコスト4以下の未来属性モンスターを検索
      const targetIndex = myDeck.findIndex(card =>
        card.type === 'monster' &&
        checkAttribute(card, '未来') &&
        card.cost <= 4
      );

      if (targetIndex === -1) {
        addLog('デッキにコスト4以下の未来属性モンスターがいません', 'info');
        return false;
      }

      // 空きスロットを探す
      const emptySlotIndex = myField.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog('フィールドに空きがありません', 'info');
        return false;
      }

      // デッキからカードを取得
      const targetCard = myDeck[targetIndex];
      const newDeck = myDeck.filter((_, idx) => idx !== targetIndex);

      // このカード（エクラオン）を取得
      const thisCard = myField[monsterIndex];
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
      setMyField(prev => prev.map((slot, idx) => {
        if (idx === emptySlotIndex) {
          return monsterInstance;
        }
        if (idx === monsterIndex) {
          return null; // このカードをフィールドから除去
        }
        return slot;
      }));

      // デッキを更新：このカードをデッキの下に追加
      setMyDeck([...newDeck, thisCard]);

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
    const { addLog } = context;
    const { myField, myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // 場に「エクラリア」モンスターがいるか確認
      const hasEclaria = myField.some(monster =>
        monster !== null &&
        (monster.name.includes('エクラリア') || hasCategory(monster, '【エクラリア】'))
      );

      if (!hasEclaria) {
        addLog('場に《エクラリア》モンスターがいません', 'info');
        return false;
      }

      // デッキからコスト4以下の未来属性魔法カードを検索
      const targetIndex = myDeck.findIndex(card =>
        card.type === 'magic' &&
        checkAttribute(card, '未来') &&
        card.cost <= 4
      );

      if (targetIndex === -1) {
        addLog('デッキにコスト4以下の未来属性魔法カードがありません', 'info');
        return false;
      }

      // カードを手札に加える
      const targetCard = myDeck[targetIndex];
      setMyDeck(prev => prev.filter((_, idx) => idx !== targetIndex));
      setMyHand(prev => [...prev, targetCard]);

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
    const { addLog, monsterIndex } = context;
    const { myGraveyard, setMyGraveyard, setMyDeck, myField, setMyField } = getPlayerContext(context);

    // 基本技
    if (context.skillType === 'basic') {
      // 墓地から未来属性カードを検索
      const futureCard = myGraveyard.find(card => checkAttribute(card, '未来'));

      if (!futureCard) {
        addLog('墓地に未来属性カードがありません', 'info');
        return false;
      }

      // 墓地からデッキに戻す
      setMyGraveyard(prev => prev.filter(c => c.uniqueId !== futureCard.uniqueId));
      setMyDeck(prev => [...prev, futureCard]);
      addLog(`墓地から「${futureCard.name}」をデッキに戻した`, 'info');

      // このカードの攻撃力を800アップ（ターン終了時まで）
      const thisCard = myField[monsterIndex];
      if (thisCard) {
        setMyField(prev => prev.map((m, idx) => {
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
    const { addLog, monsterIndex } = context;
    const { myField, setMyField } = getPlayerContext(context);

    // 基本技
    if (context.skillType === 'basic') {
      const thisCard = myField[monsterIndex];
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
      setMyField(prev => prev.map((m, idx) => {
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
    const { addLog, setPendingDeckReview } = context;
    const { myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

    if (myDeck.length === 0) {
      addLog('デッキにカードがありません', 'info');
      return true; // 効果処理は完了（対象なし）
    }

    const cardCount = Math.min(3, myDeck.length);
    const topCards = myDeck.slice(0, cardCount);
    addLog(`星屑の時導術: デッキ上${cardCount}枚を確認`, 'info');

    if (cardCount === 1) {
      // 1枚しかない場合、その1枚を手札に加える
      setMyHand((prev) => [...prev, topCards[0]]);
      setMyDeck((prev) => prev.slice(1));
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
        setMyHand((prev) => [...prev, cardToHand]);
        addLog(`${cardToHand.name}を手札に加えた`, 'info');

        if (remainingCards.length > 1) {
          // 残りカードの順番を選択させる
          setPendingDeckReview({
            cards: remainingCards,
            title: '星屑の時導術',
            message: 'デッキに戻すカードの順番を決めてください（上から順）',
            allowReorder: true,
            onConfirm: (reorderedCards) => {
              setMyDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
              addLog(`残りをデッキに戻した: ${reorderedCards.map((c) => c.name).join(' → ')}`, 'info');
            },
          });
        } else if (remainingCards.length === 1) {
          // 残りが1枚なら自動で戻す
          setMyDeck((prev) => [remainingCards[0], ...prev.slice(cardCount)]);
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
    const { addLog, setPendingDeckReview } = context;
    const { myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

    if (myDeck.length === 0) {
      addLog('デッキにカードがありません', 'info');
      return true; // 効果処理は完了（対象なし）
    }

    const cardCount = Math.min(5, myDeck.length);
    const topCards = myDeck.slice(0, cardCount);
    addLog(`未来の鴉予言: デッキ上${cardCount}枚を確認`, 'info');

    if (cardCount === 1) {
      // 1枚しかない場合、その1枚を手札に加える
      setMyHand((prev) => [...prev, topCards[0]]);
      setMyDeck((prev) => prev.slice(1));
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
        setMyHand((prev) => [...prev, cardToHand]);
        addLog(`${cardToHand.name}を手札に加えた`, 'info');

        if (remainingCards.length > 1) {
          // 残りカードの順番を選択させる
          setPendingDeckReview({
            cards: remainingCards,
            title: '未来の鴉予言',
            message: 'デッキに戻すカードの順番を決めてください（上から順）',
            allowReorder: true,
            onConfirm: (reorderedCards) => {
              setMyDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
              addLog(`残りをデッキに戻した`, 'info');
            },
          });
        } else if (remainingCards.length === 1) {
          // 残りが1枚なら自動で戻す
          setMyDeck((prev) => [remainingCards[0], ...prev.slice(cardCount)]);
          addLog(`${remainingCards[0].name}をデッキに戻した`, 'info');
        }
      },
    });

    return true;
  },

  /**
   * C0000271: 黄金の時姫エクラリア
   * 【召喚時】自分のデッキ上5枚を見て、コスト6以下のモンスター1枚を場に召喚、残りを好きな順番で戻す。
   * 【常時】自分の「未来属性」モンスターが与えるダメージを500アップ。（continuousEffectsで実装）
   * 基本技: 自分の墓地の「未来属性」カード1枚をデッキに戻し、レスト状態のSPトークン１つをアクティブにする（ターンに1度）。
   * 上級技: 勝負中1度のみ、自分のデッキ上3枚を公開し、1枚を場に召喚（コスト無視）。そのターン終了時、このカード以外の自分のモンスターをすべて墓地に送る。
   */
  C0000271: (skillText, context) => {
    const { addLog, monsterIndex, setPendingDeckReview } = context;
    const {
      myDeck, setMyDeck, myField, setMyField, myGraveyard, setMyGraveyard,
      myRestedSP, setMyRestedSP, myActiveSP, setMyActiveSP, currentPlayer,
    } = getPlayerContext(context);

    // 召喚時効果（デッキ上5枚からコスト6以下のモンスター1体を召喚）
    if (skillText.includes('【召喚時】')) {
      if (myDeck.length === 0) {
        addLog('デッキにカードがありません', 'info');
        return true;
      }

      const cardCount = Math.min(5, myDeck.length);
      const topCards = myDeck.slice(0, cardCount);
      const eligibleMonsters = topCards.filter(card =>
        card.type === 'monster' && card.cost <= 6
      );

      addLog(`黄金の時姫エクラリア: デッキ上${cardCount}枚を確認`, 'info');

      if (eligibleMonsters.length === 0) {
        addLog('コスト6以下のモンスターがありませんでした', 'info');
        // 残りを戻す処理（順番選択）
        if (topCards.length > 1) {
          setPendingDeckReview({
            cards: topCards,
            title: '黄金の時姫エクラリア',
            message: 'デッキに戻すカードの順番を決めてください（上から順）',
            allowReorder: true,
            onConfirm: (reorderedCards) => {
              setMyDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
              addLog(`カードをデッキに戻した`, 'info');
            },
          });
        }
        return true;
      }

      // 空きスロットを確認
      const emptySlotIndex = myField.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog('フィールドに空きがありません', 'info');
        return true;
      }

      // 対象モンスターを選択させる
      setPendingDeckReview({
        cards: topCards,
        title: '黄金の時姫エクラリア',
        message: '場に召喚するコスト6以下のモンスターを1体選択してください',
        allowReorder: false,
        selectMode: {
          enabled: true,
          count: 1,
          filter: (card) => card.type === 'monster' && card.cost <= 6,
        },
        onSelect: (selectedCards, remainingCards) => {
          const cardToSummon = selectedCards[0];

          // モンスターインスタンスを作成
          const monsterInstance = {
            ...cardToSummon,
            uniqueId: `${cardToSummon.id}_${Date.now()}`,
            currentHp: cardToSummon.hp,
            currentAttack: cardToSummon.attack,
            canAttack: false,
            usedSkillThisTurn: false,
            owner: currentPlayer,
            charges: [],
            statusEffects: [],
          };

          // フィールドに召喚
          setMyField(prev => prev.map((slot, idx) =>
            idx === emptySlotIndex ? monsterInstance : slot
          ));
          addLog(`${cardToSummon.name}を場に召喚！`, 'info');

          // 残りカードを戻す
          if (remainingCards.length > 1) {
            setPendingDeckReview({
              cards: remainingCards,
              title: '黄金の時姫エクラリア',
              message: 'デッキに戻すカードの順番を決めてください（上から順）',
              allowReorder: true,
              onConfirm: (reorderedCards) => {
                setMyDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
                addLog(`残りをデッキに戻した`, 'info');
              },
            });
          } else if (remainingCards.length === 1) {
            setMyDeck((prev) => [remainingCards[0], ...prev.slice(cardCount)]);
          } else {
            setMyDeck((prev) => prev.slice(cardCount));
          }
        },
      });

      return true;
    }

    // 基本技: 墓地の未来属性カードをデッキに戻し、レストSPをアクティブに
    if (context.skillType === 'basic') {
      const futureCard = myGraveyard.find(card => checkAttribute(card, '未来'));

      if (!futureCard) {
        addLog('墓地に未来属性カードがありません', 'info');
        return false;
      }

      // 墓地からデッキに戻す
      setMyGraveyard(prev => prev.filter(c => c.uniqueId !== futureCard.uniqueId));
      setMyDeck(prev => [...prev, futureCard]);
      addLog(`墓地から「${futureCard.name}」をデッキに戻した`, 'info');

      // レスト状態のSPをアクティブに
      if (myRestedSP > 0) {
        setMyRestedSP(prev => prev - 1);
        setMyActiveSP(prev => prev + 1);
        addLog('レスト状態のSPトークン1個をアクティブにした', 'info');
      } else {
        addLog('レスト状態のSPトークンがありません', 'info');
      }

      return true;
    }

    // 上級技: 勝負中1度のみ、デッキ上3枚から1枚を召喚（コスト無視）
    if (context.skillType === 'advanced') {
      const thisCard = myField[monsterIndex];
      if (!thisCard) {
        addLog('エラー: カードが見つかりません', 'info');
        return false;
      }

      // 勝負中1度のみチェック
      if (thisCard.usedUltimateSkillC0000271) {
        addLog('この効果は勝負中に1度しか使用できません', 'info');
        return false;
      }

      if (myDeck.length === 0) {
        addLog('デッキにカードがありません', 'info');
        return false;
      }

      const cardCount = Math.min(3, myDeck.length);
      const topCards = myDeck.slice(0, cardCount);

      addLog(`黄金の時姫エクラリア上級技: デッキ上${cardCount}枚を公開！`, 'info');
      topCards.forEach(card => addLog(`  - ${card.name}`, 'info'));

      // 空きスロットを確認
      const emptySlotIndex = myField.findIndex((slot, idx) => slot === null && idx !== monsterIndex);
      if (emptySlotIndex === -1) {
        addLog('フィールドに空きがありません', 'info');
        return false;
      }

      // 使用済みフラグを設定
      setMyField(prev => prev.map((m, idx) => {
        if (idx === monsterIndex && m) {
          return { ...m, usedUltimateSkillC0000271: true, pendingEndTurnSacrifice: true };
        }
        return m;
      }));

      // プレイヤーにカードを選択させる
      setPendingDeckReview({
        cards: topCards,
        title: '黄金の時姫エクラリア - 上級技',
        message: '場に召喚するカードを1枚選択してください（コスト無視）',
        allowReorder: false,
        selectMode: { enabled: true, count: 1 },
        onSelect: (selectedCards, remainingCards) => {
          const cardToSummon = selectedCards[0];

          // 召喚処理
          if (cardToSummon.type === 'monster') {
            const monsterInstance = {
              ...cardToSummon,
              uniqueId: `${cardToSummon.id}_${Date.now()}`,
              currentHp: cardToSummon.hp,
              currentAttack: cardToSummon.attack,
              canAttack: false,
              usedSkillThisTurn: false,
              owner: currentPlayer,
              charges: [],
              statusEffects: [],
              summonedByEclaria: true, // ターン終了時の墓地送り対象マーク
            };

            setMyField(prev => prev.map((slot, idx) =>
              idx === emptySlotIndex ? monsterInstance : slot
            ));
            addLog(`${cardToSummon.name}を場に召喚！（コスト無視）`, 'info');
          } else {
            // モンスター以外の場合は墓地へ
            setMyGraveyard(prev => [...prev, cardToSummon]);
            addLog(`${cardToSummon.name}は召喚できないため墓地に送られた`, 'info');
          }

          // 残りカードをデッキに戻す
          setMyDeck((prev) => [...remainingCards, ...prev.slice(cardCount)]);
          if (remainingCards.length > 0) {
            addLog(`残り${remainingCards.length}枚をデッキに戻した`, 'info');
          }

          addLog('⚠️ ターン終了時、このカード以外のモンスターは墓地に送られます', 'damage');
        },
      });

      return true;
    }

    return false;
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

  /**
   * C0000258: 禁忌の鴉王ミラン
   * 基本技: 相手モンスター全体に500ダメージ。
   * 上級技：勝負中1度のみ使用可能、相手のデッキの上から2枚を「カラス人形（攻撃0、HP200、コスト2、未来属性）」に変換する。
   */
  C0000258: (skillText, context) => {
    const { addLog, monsterIndex } = context;
    const { myField, setMyField, opponentField, setOpponentField, setOpponentGraveyard, opponentDeck, setOpponentDeck, currentPlayer } = getPlayerContext(context);

    // 基本技: 相手モンスター全体に500ダメージ
    if (context.skillType === 'basic') {
      const monsters = opponentField.filter(m => m !== null);
      if (monsters.length === 0) {
        addLog('相手フィールドにモンスターがいません', 'info');
        return true;
      }

      addLog('禁忌の鴉王ミランの基本技発動！', 'info');

      // 全モンスターに500ダメージ
      const destroyedMonsters = [];
      setOpponentField((prev) => {
        return prev.map((monster) => {
          if (monster) {
            const newHp = monster.currentHp - 500;
            addLog(`${monster.name}に500ダメージ（残りHP: ${Math.max(0, newHp)}）`, 'damage');
            if (newHp <= 0) {
              destroyedMonsters.push(monster);
              addLog(`${monster.name}は破壊された！`, 'damage');
              return null;
            }
            return { ...monster, currentHp: newHp };
          }
          return monster;
        });
      });

      // 破壊されたモンスターを墓地に送る
      if (destroyedMonsters.length > 0) {
        setOpponentGraveyard((prev) => [...prev, ...destroyedMonsters]);
      }

      return true;
    }

    // 上級技：勝負中1度のみ使用可能、相手のデッキの上から2枚を「カラス人形」に変換
    if (context.skillType === 'advanced') {
      const thisCard = myField[monsterIndex];
      if (!thisCard) {
        addLog('エラー: カードが見つかりません', 'info');
        return false;
      }

      // 勝負中1度のみチェック
      if (thisCard.usedUltimateSkillC0000258) {
        addLog('この効果は勝負中に1度しか使用できません', 'info');
        return false;
      }

      if (opponentDeck.length === 0) {
        addLog('相手のデッキにカードがありません', 'info');
        return false;
      }

      // 相手の空きスロットを確認
      const emptySlots = opponentField.reduce((acc, slot, idx) => {
        if (slot === null) acc.push(idx);
        return acc;
      }, []);

      if (emptySlots.length === 0) {
        addLog('相手のフィールドに空きがありません', 'info');
        return false;
      }

      // 使用済みフラグを設定
      setMyField((prev) => prev.map((m, idx) => {
        if (idx === monsterIndex && m) {
          return { ...m, usedUltimateSkillC0000258: true };
        }
        return m;
      }));

      addLog('禁忌の鴉王ミランの上級技発動！', 'info');

      // デッキの上から最大2枚を取得
      const cardCount = Math.min(2, opponentDeck.length, emptySlots.length);
      const takenCards = opponentDeck.slice(0, cardCount);

      // デッキから削除
      setOpponentDeck((prev) => prev.slice(cardCount));

      // カラス人形を作成して相手の場に召喚
      const crowDolls = takenCards.map((originalCard, i) => {
        addLog(`${originalCard.name}がカラス人形に変換された！`, 'info');
        return {
          id: `CROW_DOLL_${Date.now()}_${i}`,
          uniqueId: `CROW_DOLL_${Date.now()}_${i}`,
          name: 'カラス人形',
          attribute: '未来',
          cost: 2,
          type: 'monster',
          attack: 0,
          hp: 200,
          currentAttack: 0,
          currentHp: 200,
          maxHp: 200,
          category: '【人形】',
          effect: 'このカードは禁忌の鴉王ミランの効果で生成された。',
          flavor: '',
          keyword: '',
          canAttack: false,
          usedSkillThisTurn: false,
          owner: currentPlayer === 1 ? 2 : 1, // 相手の場に召喚するので相手が所有者
          charges: [],
          statusEffects: [],
          originalCard: originalCard, // 元のカード情報を保持
        };
      });

      // 相手の場に召喚
      setOpponentField((prev) => {
        const newField = [...prev];
        crowDolls.forEach((doll, i) => {
          if (emptySlots[i] !== undefined) {
            newField[emptySlots[i]] = doll;
            addLog(`カラス人形が相手の場に召喚された！`, 'info');
          }
        });
        return newField;
      });

      return true;
    }

    return false;
  },

  /**
   * C0000107: 守護の魔導ゴーレム
   * 基本技: SPトークン2個をレスト状態にし、自分のモンスター全体に「守護」を付与する
   * 上級技: 自分の手札1枚を墓地に送り、自分の墓地のモンスター1体を場に戻す（攻撃力半減、HP半減、効果無効）
   * ※トリガー（エンドフェイズ時のHP回復）はfutureCards.jsで実装済み
   */
  C0000107: (skillText, context) => {
    const { addLog, setPendingHandSelection, setPendingGraveyardSelection } = context;
    const {
      myField,
      setMyField,
      myActiveSP,
      setMyActiveSP,
      setMyRestedSP,
      myHand,
      setMyHand,
      myGraveyard,
      setMyGraveyard,
      currentPlayer,
    } = getPlayerContext(context);

    // 基本技: SP2個レスト、全体に守護付与
    if (context.skillType === 'basic') {
      // SP確認
      if (myActiveSP < 2) {
        addLog('アクティブSPが2個以上必要です', 'info');
        return false;
      }

      // SP2個をレスト
      setMyActiveSP((prev) => prev - 2);
      setMyRestedSP((prev) => prev + 2);
      addLog('SPトークン2個をレスト状態にした', 'info');

      // 自分のモンスター全体に守護を付与
      let guardApplied = false;
      setMyField((prev) =>
        prev.map((monster) => {
          if (monster) {
            guardApplied = true;
            // 既存のstatusEffectsに守護を追加
            const newStatusEffects = [...(monster.statusEffects || [])];
            // 既に守護があれば追加しない
            if (!newStatusEffects.some((e) => e.type === 'GUARD')) {
              newStatusEffects.push({
                type: 'GUARD',
                duration: -1, // 1回使用で消費
                source: 'C0000107',
                sourceName: '守護の魔導ゴーレム',
              });
              addLog(`${monster.name}に守護を付与！`, 'info');
            }
            return { ...monster, statusEffects: newStatusEffects };
          }
          return monster;
        })
      );

      if (!guardApplied) {
        addLog('守護を付与する対象がいません', 'info');
      }

      return true;
    }

    // 上級技: 手札1枚捨て、墓地からモンスター蘇生（半減、効果無効）
    if (context.skillType === 'advanced') {
      // 手札確認
      if (myHand.length === 0) {
        addLog('手札がありません', 'info');
        return false;
      }

      // 墓地にモンスターがあるか確認
      const validMonsters = myGraveyard.filter((card) => card.type === 'monster');
      if (validMonsters.length === 0) {
        addLog('墓地にモンスターがいません', 'info');
        return false;
      }

      // 空きスロット確認
      const emptySlotIndex = myField.findIndex((slot) => slot === null);
      if (emptySlotIndex === -1) {
        addLog('場が満杯です', 'info');
        return false;
      }

      // 手札選択
      if (setPendingHandSelection) {
        setPendingHandSelection({
          message: '墓地に送るカードを選択',
          callback: (selectedCard) => {
            // 手札から墓地へ
            setMyHand((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
            setMyGraveyard((prev) => [...prev, selectedCard]);
            addLog(`${selectedCard.name}を墓地に送った`, 'info');

            // 墓地からモンスター選択
            const monstersInGraveyard = myGraveyard.filter((card) => card.type === 'monster');

            if (monstersInGraveyard.length === 1) {
              // 1体のみの場合は自動選択
              const targetCard = monstersInGraveyard[0];
              performRevive(targetCard);
            } else if (monstersInGraveyard.length > 1 && setPendingGraveyardSelection) {
              // 複数の場合は選択
              setPendingGraveyardSelection({
                message: '蘇生するモンスターを選択（攻撃力・HP半減、効果無効）',
                cards: monstersInGraveyard,
                callback: (targetCard) => {
                  performRevive(targetCard);
                },
              });
            }

            function performRevive(targetCard) {
              // 墓地から削除
              setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== targetCard.uniqueId));

              // 場に蘇生（攻撃力・HP半減、効果無効）
              const halfAttack = Math.floor((targetCard.attack || 0) / 2);
              const halfHp = Math.floor((targetCard.hp || 0) / 2);

              setMyField((prev) => {
                const newField = [...prev];
                const slot = newField.findIndex((s) => s === null);
                if (slot !== -1) {
                  newField[slot] = {
                    ...targetCard,
                    currentAttack: halfAttack,
                    attack: halfAttack,
                    currentHp: halfHp,
                    maxHp: halfHp,
                    hp: halfHp,
                    canAttack: false,
                    owner: currentPlayer,
                    charges: [],
                    statusEffects: [],
                    usedSkillThisTurn: false,
                    effectNegated: true, // 効果無効
                  };
                  addLog(
                    `${targetCard.name}を蘇生！（ATK: ${halfAttack}, HP: ${halfHp}, 効果無効）`,
                    'info'
                  );
                }
                return newField;
              });
            }
          },
        });
        return true;
      }

      return false;
    }

    return false;
  },

  // 他の未来属性カードを追加...
};
