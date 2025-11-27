/**
 * 未来属性カードのトリガー実装
 *
 * このファイルには未来属性カードの個別トリガー効果を実装します。
 * 各カードは独自のトリガー定義を持ち、triggerEngineによって管理されます。
 */

import { TRIGGER_TYPES, ACTIVATION_TYPES } from '../triggerTypes';
import {
  millDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  drawCards,
  healLife,
} from '../effectHelpers';

/**
 * 未来属性カードのトリガー定義
 * カードID => トリガー配列のマッピング
 */
export const futureCardTriggers = {
  /**
   * C0000085: 胡乱なドローン
   * 【召喚時】デッキの上から1枚を墓地に送る。
   * そのカードが未来属性の場合、次のターン終了時までこのカードの攻撃力を600に変更。
   */
  C0000085: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'デッキから1枚を墓地に送る',
      effect: (context) => {
        const { currentPlayer, addLog } = context;
        const milledCards = millDeck(context, 1);

        if (milledCards.length > 0) {
          const card = milledCards[0];
          addLog(`${card.name}を墓地に送った`, 'info');

          // 未来属性の場合、攻撃力を600に変更
          if (card.attribute === '未来') {
            const { monsterIndex, p1Field, p2Field, setP1Field, setP2Field } = context;
            const field = currentPlayer === 1 ? p1Field : p2Field;
            const setField = currentPlayer === 1 ? setP1Field : setP2Field;

            if (field[monsterIndex]) {
              setField((prev) => {
                const newField = [...prev];
                newField[monsterIndex] = {
                  ...newField[monsterIndex],
                  currentAttack: 600,
                  attackModified: true, // フラグを立てる
                };
                return newField;
              });
              addLog(`胡乱なドローンの攻撃力が600になった！`, 'info');
            }
          }
        }
      },
    },
  ],

  /**
   * C0000105: 魔導炉の残骸獣
   * 【召喚時】自分の墓地の未来属性カード1枚をデッキに戻す。
   * その後、相手プレイヤーに300ダメージを与える。
   */
  C0000105: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '墓地の未来属性カードをデッキに戻し300ダメージ',
      effect: (context) => {
        const {
          currentPlayer,
          p1Graveyard,
          p2Graveyard,
          setP1Graveyard,
          setP2Graveyard,
          p1Deck,
          p2Deck,
          setP1Deck,
          setP2Deck,
          addLog,
        } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

        // 墓地から未来属性カードを探す
        const futureCard = graveyard.find((card) => card.attribute === '未来');

        if (futureCard) {
          // 墓地から削除
          setGraveyard((prev) => prev.filter((c) => c.uniqueId !== futureCard.uniqueId));
          // デッキに追加
          setDeck((prev) => [...prev, futureCard]);
          addLog(`${futureCard.name}をデッキに戻した`, 'info');

          // 相手に300ダメージ
          conditionalDamage(context, 300, 'opponent');
        } else {
          addLog('墓地に未来属性カードがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000106: 次元渡り・ヴォイドウォーカー
   * 【自分エンドフェイズ時】レスト状態のSPトークン1個をアクティブにする（ターンに1度）。
   */
  C0000106: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'レストSP1個をアクティブに（1ターンに1度）',
      effect: (context) => {
        const {
          currentPlayer,
          p1RestedSP,
          p2RestedSP,
          setP1ActiveSP,
          setP2ActiveSP,
          setP1RestedSP,
          setP2RestedSP,
          addLog,
        } = context;

        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
        const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;

        if (restedSP > 0) {
          setRestedSP((prev) => prev - 1);
          setActiveSP((prev) => prev + 1);
          addLog('次元渡り・ヴォイドウォーカーの効果: SP1個をアクティブにした', 'info');
        }
      },
    },
  ],

  /**
   * C0000107: 守護の魔導ゴーレム
   * 【自分エンドフェイズ時】自分の未来属性モンスターのHPを500回復（ターンに1度）。
   */
  C0000107: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '未来属性モンスターのHP500回復（1ターンに1度）',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const field = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        let healed = false;

        setField((prev) => {
          const newField = prev.map((monster) => {
            if (monster && monster.attribute === '未来') {
              const newHp = Math.min(monster.currentHp + 500, monster.maxHp);
              if (newHp > monster.currentHp) {
                healed = true;
                addLog(`${monster.name}のHPが500回復した`, 'heal');
              }
              return { ...monster, currentHp: newHp };
            }
            return monster;
          });
          return newField;
        });

        if (!healed) {
          addLog('回復対象の未来属性モンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000116: 時空旅人ソラリア
   * 【召喚時】1枚ドローする。その後、手札を1枚デッキの下に戻す。
   */
  C0000116: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '1枚ドロー後、手札1枚をデッキの下に戻す',
      effect: (context) => {
        const { currentPlayer, p1Hand, p2Hand, setP1Deck, setP2Deck, setP1Hand, setP2Hand, addLog, setPendingHandSelection } = context;

        // 1枚ドロー
        const drawnCards = drawCards(context, 1);

        if (drawnCards.length > 0) {
          addLog(`${drawnCards[0].name}をドローした`, 'info');

          // 手札を確認（ドロー後の手札）
          const hand = currentPlayer === 1 ? p1Hand : p2Hand;
          const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
          const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

          // ドロー後の手札が1枚以上あれば選択させる
          if (hand.length + drawnCards.length > 0) {
            addLog('デッキの下に戻すカードを手札から選択してください', 'info');

            // 手札選択モードに入る
            setPendingHandSelection({
              message: 'デッキの下に戻すカードを選択',
              callback: (selectedCard) => {
                // 手札から削除してデッキの下に追加
                setHand((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
                setDeck((prev) => [...prev, selectedCard]);
                addLog(`${selectedCard.name}をデッキの下に戻した`, 'info');
              },
            });
          }
        }
      },
    },
  ],

  /**
   * C0000183: 殲滅の魔導ゴーレム
   * 【召喚時】相手フィールド全体に600ダメージを与える。
   */
  C0000183: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手フィールド全体に600ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        let damaged = false;
        const destroyedMonsters = [];

        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              damaged = true;
              const newHp = monster.currentHp - 600;
              addLog(`${monster.name}に600ダメージ！`, 'damage');

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

        if (!damaged) {
          addLog('相手フィールドにモンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000249: ミランの使い魔未来鴉
   * 【召喚時】デッキの上から3枚を見て、好きな順番で戻す。
   */
  C0000249: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'デッキの上から3枚を確認',
      effect: (context) => {
        const { currentPlayer, p1Deck, p2Deck, addLog } = context;

        const deck = currentPlayer === 1 ? p1Deck : p2Deck;

        if (deck.length >= 3) {
          const topCards = deck.slice(0, 3);
          addLog(`デッキの上3枚: ${topCards.map((c) => c.name).join(', ')}`, 'info');
          // TODO: UIで順番を変更する機能を実装
          addLog('(順番はそのまま)', 'info');
        } else {
          addLog(`デッキの残り: ${deck.length}枚`, 'info');
        }
      },
    },
  ],

  /**
   * C0000250: 時空渡りのカモメ
   * 【召喚時】相手の手札を1枚ランダムに墓地に送る。
   */
  C0000250: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手の手札を1枚ランダムに墓地に送る',
      effect: (context) => {
        const {
          currentPlayer,
          p1Hand,
          p2Hand,
          setP1Hand,
          setP2Hand,
          setP1Graveyard,
          setP2Graveyard,
          addLog,
        } = context;

        const opponentHand = currentPlayer === 1 ? p2Hand : p1Hand;
        const setOpponentHand = currentPlayer === 1 ? setP2Hand : setP1Hand;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        if (opponentHand.length > 0) {
          // ランダムに1枚選択
          const randomIndex = Math.floor(Math.random() * opponentHand.length);
          const discardedCard = opponentHand[randomIndex];

          // 手札から削除して墓地に送る
          setOpponentHand((prev) => prev.filter((c, idx) => idx !== randomIndex));
          setOpponentGraveyard((prev) => [...prev, discardedCard]);

          addLog(`相手の${discardedCard.name}を墓地に送った`, 'info');
        } else {
          addLog('相手の手札がない', 'info');
        }
      },
    },
  ],

  /**
   * C0000251: 紫鴉の魔導士ミラン
   * 【召喚時】デッキから未来属性魔法カード1枚を手札に加える。
   */
  C0000251: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'デッキから未来属性魔法カードをサーチ',
      effect: (context) => {
        const foundCard = searchCard(context, (card) => {
          return card.attribute === '未来' && card.type === 'magic';
        });

        if (foundCard) {
          context.addLog(`${foundCard.name}を手札に加えた`, 'info');
        } else {
          context.addLog('未来属性魔法カードが見つからない', 'info');
        }
      },
    },
  ],

  /**
   * C0000252: 未来鴉の群れ
   * 【自壊時】デッキから「未来属性」モンスター1体を墓地に送り、1枚ドローする。
   */
  C0000252: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '未来属性モンスターを墓地に送り1枚ドロー',
      effect: (context) => {
        const {
          currentPlayer,
          p1Deck,
          p2Deck,
          setP1Deck,
          setP2Deck,
          setP1Graveyard,
          setP2Graveyard,
          addLog,
        } = context;

        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

        // デッキから未来属性モンスターを探す
        const futureMonsterIndex = deck.findIndex(
          (card) => card.attribute === '未来' && card.type === 'monster'
        );

        if (futureMonsterIndex !== -1) {
          const futureMonster = deck[futureMonsterIndex];

          // デッキから削除して墓地に送る
          setDeck((prev) => prev.filter((c, idx) => idx !== futureMonsterIndex));
          setGraveyard((prev) => [...prev, futureMonster]);
          addLog(`${futureMonster.name}を墓地に送った`, 'info');

          // 1枚ドロー
          drawCards(context, 1);
        } else {
          addLog('デッキに未来属性モンスターがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000256: 紫時空の幻鴉
   * 【召喚時】自分の墓地の「未来属性」カード1枚を手札に加える。
   */
  C0000256: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '墓地の未来属性カードを手札に加える',
      effect: (context) => {
        const {
          currentPlayer,
          p1Graveyard,
          p2Graveyard,
          setP1Graveyard,
          setP2Graveyard,
          setP1Hand,
          setP2Hand,
          addLog,
        } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        // 墓地から未来属性カードを探す
        const futureCard = graveyard.find((card) => card.attribute === '未来');

        if (futureCard) {
          // 墓地から削除して手札に加える
          setGraveyard((prev) => prev.filter((c) => c.uniqueId !== futureCard.uniqueId));
          setHand((prev) => [...prev, futureCard]);
          addLog(`${futureCard.name}を手札に加えた`, 'info');
        } else {
          addLog('墓地に未来属性カードがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000257: 時読みの塔 (フィールドカード)
   * 【常時】「未来属性」モンスターの攻撃力を400アップ。
   * 【エンドフェイズ時】相手のデッキの1番上のカードを確認。
   */
  C0000257: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '未来属性モンスターの攻撃力+400',
      effect: (context) => {
        // 常時効果は別途実装が必要
        // フィールドカードが場にある間、継続的に効果を適用する仕組みが必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手のデッキトップを確認',
      effect: (context) => {
        const { currentPlayer, p1Deck, p2Deck, addLog } = context;

        const opponentDeck = currentPlayer === 1 ? p2Deck : p1Deck;

        if (opponentDeck.length > 0) {
          const topCard = opponentDeck[0];
          addLog(`相手のデッキトップ: ${topCard.name}`, 'info');
          // TODO: UIで「デッキの下に送るか、そのまま戻すか」を選択
        } else {
          addLog('相手のデッキがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000278: 灯守の少女
   * 【召喚時】自分のデッキ上1枚を見て、それが「未来属性」カードなら手札に、違えばデッキ下に。
   * 【場を離れる時】自分の墓地の「未来属性」カード1枚をデッキに戻す。
   */
  C0000278: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'デッキ上1枚を確認、未来属性なら手札に、違えばデッキ下に',
      effect: (context) => {
        const {
          currentPlayer,
          p1Deck,
          p2Deck,
          setP1Deck,
          setP2Deck,
          setP1Hand,
          setP2Hand,
          addLog,
        } = context;

        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        if (deck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        // デッキトップ1枚を確認
        const topCard = deck[0];
        addLog(`デッキトップを確認: ${topCard.name}`, 'info');

        if (topCard.attribute === '未来') {
          // 未来属性なら手札に加える
          setDeck((prev) => prev.slice(1));
          setHand((prev) => [...prev, topCard]);
          addLog(`${topCard.name}は未来属性！手札に加えた`, 'info');
        } else {
          // 未来属性でなければデッキの下に戻す
          setDeck((prev) => {
            const newDeck = prev.slice(1);
            return [...newDeck, topCard];
          });
          addLog(`${topCard.name}は未来属性ではない。デッキの下に戻した`, 'info');
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_LEAVE_FIELD,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '場を離れる時、墓地の未来属性カード1枚をデッキに戻す',
      effect: (context) => {
        const {
          currentPlayer,
          p1Graveyard,
          p2Graveyard,
          setP1Graveyard,
          setP2Graveyard,
          setP1Deck,
          setP2Deck,
          addLog,
          leavingCard,
        } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

        // 墓地から未来属性カードを探す（自分自身は除外）
        const futureCard = graveyard.find(
          (card) => card.attribute === '未来' && card.uniqueId !== leavingCard?.uniqueId
        );

        if (futureCard) {
          // 墓地から削除してデッキに戻す
          setGraveyard((prev) => prev.filter((c) => c.uniqueId !== futureCard.uniqueId));
          setDeck((prev) => [...prev, futureCard]);
          addLog(`灯守の少女の効果: ${futureCard.name}を墓地からデッキに戻した`, 'info');
        } else {
          addLog('墓地に未来属性カードがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000267: 星翼の飛舟エクラオン
   * 【召喚時】自分のデッキ上3枚を見て、未来モンスター1枚を手札に加え、残りを好きな順番で戻す。
   * 場を離れる時、相手プレイヤーに600ダメージ。
   */
  C0000267: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'デッキ上3枚を見て、未来モンスター1枚を手札に加える',
      effect: (context) => {
        const {
          currentPlayer,
          p1Deck,
          p2Deck,
          setP1Deck,
          setP2Deck,
          setP1Hand,
          setP2Hand,
          addLog,
        } = context;

        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        if (deck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        // デッキ上3枚を確認
        const topCards = deck.slice(0, Math.min(3, deck.length));
        addLog(`デッキ上${topCards.length}枚を確認: ${topCards.map((c) => c.name).join(', ')}`, 'info');

        // 未来属性モンスターを探す
        const futureMonster = topCards.find(
          (card) => card.attribute === '未来' && card.type === 'monster'
        );

        if (futureMonster) {
          // 未来モンスターを手札に加える
          setHand((prev) => [...prev, futureMonster]);
          // 残りをデッキに戻す（元の順番で。本来は好きな順番だがUI未実装）
          const remaining = topCards.filter((c) => c.uniqueId !== futureMonster.uniqueId);
          setDeck((prev) => {
            const deckWithoutTop = prev.slice(topCards.length);
            return [...remaining, ...deckWithoutTop];
          });
          addLog(`${futureMonster.name}を手札に加え、残りをデッキに戻した`, 'info');
        } else {
          // 未来モンスターがいない場合、全てそのまま戻す
          addLog('未来属性モンスターがいなかった。カードをデッキに戻した', 'info');
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_LEAVE_FIELD,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '場を離れる時、相手に600ダメージ',
      effect: (context) => {
        const { currentPlayer, setP1Life, setP2Life, addLog } = context;

        // 相手にダメージ
        if (currentPlayer === 1) {
          setP2Life((prev) => Math.max(0, prev - 600));
        } else {
          setP1Life((prev) => Math.max(0, prev - 600));
        }
        addLog('星翼の飛舟エクラオンの効果: 相手に600ダメージ！', 'damage');
      },
    },
  ],

  /**
   * C0000266: エクラシアの時空炉 (フェイズカード)
   * 初期効果:【発動時】自分のデッキ上1枚を見て、それが「未来属性」カードなら手札に、違えば墓地に送る。
   */
  C0000266: [
    {
      type: TRIGGER_TYPES.ON_PHASE_CARD_ACTIVATE,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '発動時: デッキ上1枚を見て、未来属性なら手札に、違えば墓地に送る',
      effect: (context) => {
        const {
          currentPlayer,
          p1Deck,
          p2Deck,
          setP1Deck,
          setP2Deck,
          setP1Hand,
          setP2Hand,
          setP1Graveyard,
          setP2Graveyard,
          addLog,
        } = context;

        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

        if (deck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        // デッキトップ1枚を確認
        const topCard = deck[0];
        addLog(`エクラシアの時空炉の効果: デッキトップを確認 - ${topCard.name}`, 'info');

        if (topCard.attribute === '未来') {
          // 未来属性なら手札に加える
          setDeck((prev) => prev.slice(1));
          setHand((prev) => [...prev, topCard]);
          addLog(`${topCard.name}は未来属性！手札に加えた`, 'info');
        } else {
          // 未来属性でなければ墓地に送る
          setDeck((prev) => prev.slice(1));
          setGraveyard((prev) => [...prev, topCard]);
          addLog(`${topCard.name}は未来属性ではない。墓地に送った`, 'info');
        }
      },
    },
  ],

  /**
   * C0000274: 星辰の魔導術師
   * 【召喚時】自分のデッキ上2枚を見て、1枚を手札に加え、残りをデッキ下に戻す。
   */
  C0000274: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'デッキ上2枚を見て、1枚を手札に加え、残りをデッキ下に戻す',
      effect: (context) => {
        const {
          currentPlayer,
          p1Deck,
          p2Deck,
          setP1Deck,
          setP2Deck,
          setP1Hand,
          setP2Hand,
          addLog,
        } = context;

        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        if (deck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        // デッキ上2枚を確認
        const topCards = deck.slice(0, Math.min(2, deck.length));
        addLog(`デッキ上${topCards.length}枚を確認: ${topCards.map((c) => c.name).join(', ')}`, 'info');

        if (topCards.length === 1) {
          // 1枚しかない場合、その1枚を手札に
          setHand((prev) => [...prev, topCards[0]]);
          setDeck((prev) => prev.slice(1));
          addLog(`${topCards[0].name}を手札に加えた`, 'info');
        } else {
          // 2枚ある場合、最初の1枚を手札に、残りをデッキ下に
          // 本来はプレイヤーが選択するがUI未実装のため最初の1枚を選択
          const cardToHand = topCards[0];
          const cardToBottom = topCards[1];

          setHand((prev) => [...prev, cardToHand]);
          setDeck((prev) => {
            const deckWithoutTop = prev.slice(2);
            return [...deckWithoutTop, cardToBottom];
          });
          addLog(`${cardToHand.name}を手札に加え、${cardToBottom.name}をデッキの下に戻した`, 'info');
        }
      },
    },
  ],
};

/**
 * カードIDから該当するトリガーを取得
 * @param {string} cardId - カードID (例: "C0000085")
 * @returns {Array|null} トリガー配列、または null
 */
export const getFutureCardTriggers = (cardId) => {
  return futureCardTriggers[cardId] || null;
};

/**
 * 未来属性カードのトリガーが実装されているか確認
 * @param {string} cardId - カードID
 * @returns {boolean}
 */
export const hasFutureCardTrigger = (cardId) => {
  return cardId in futureCardTriggers;
};
