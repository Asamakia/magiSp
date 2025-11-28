/**
 * 未来属性カードのトリガー実装
 *
 * このファイルには未来属性カードの個別トリガー効果を実装します。
 * 各カードは独自のトリガー定義を持ち、triggerEngineによって管理されます。
 */

import { TRIGGER_TYPES, ACTIVATION_TYPES } from '../triggerTypes';
import {
  getPlayerContext,
  millDeck,
  millOpponentDeck,
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
        const { addLog, monsterIndex } = context;
        const { myField, setMyField } = getPlayerContext(context);
        const milledCards = millDeck(context, 1);

        if (milledCards.length > 0) {
          const card = milledCards[0];
          addLog(`${card.name}を墓地に送った`, 'info');

          // 未来属性の場合、攻撃力を600に変更
          if (card.attribute === '未来') {
            if (myField[monsterIndex]) {
              setMyField((prev) => {
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
        const { addLog } = context;
        const { myGraveyard, setMyGraveyard, myDeck, setMyDeck } = getPlayerContext(context);

        // 墓地から未来属性カードを探す
        const futureCard = myGraveyard.find((card) => card.attribute === '未来');

        if (futureCard) {
          // 墓地から削除
          setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== futureCard.uniqueId));
          // デッキに追加
          setMyDeck((prev) => [...prev, futureCard]);
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
        const { addLog } = context;
        const { myRestedSP, setMyActiveSP, setMyRestedSP } = getPlayerContext(context);

        if (myRestedSP > 0) {
          setMyRestedSP((prev) => prev - 1);
          setMyActiveSP((prev) => prev + 1);
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
        const { addLog } = context;
        const { setMyField } = getPlayerContext(context);

        let healed = false;

        setMyField((prev) => {
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
        const { addLog, setPendingHandSelection } = context;
        const { myHand, setMyDeck, setMyHand } = getPlayerContext(context);

        // 1枚ドロー
        const drawnCards = drawCards(context, 1);

        if (drawnCards.length > 0) {
          addLog(`${drawnCards[0].name}をドローした`, 'info');

          // ドロー後の手札が1枚以上あれば選択させる
          if (myHand.length + drawnCards.length > 0) {
            addLog('デッキの下に戻すカードを手札から選択してください', 'info');

            // 手札選択モードに入る
            setPendingHandSelection({
              message: 'デッキの下に戻すカードを選択',
              callback: (selectedCard) => {
                // 手札から削除してデッキの下に追加
                setMyHand((prev) => prev.filter((c) => c.uniqueId !== selectedCard.uniqueId));
                setMyDeck((prev) => [...prev, selectedCard]);
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
        const { addLog } = context;
        const { opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

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
        const { addLog, setPendingDeckReview } = context;
        const { myDeck, setMyDeck } = getPlayerContext(context);

        if (myDeck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        const cardCount = Math.min(3, myDeck.length);
        const topCards = myDeck.slice(0, cardCount);
        addLog(`ミランの使い魔未来鴉の効果: デッキの上${cardCount}枚を確認`, 'info');

        // デッキ確認モーダルを表示
        setPendingDeckReview({
          cards: topCards,
          title: 'ミランの使い魔未来鴉',
          message: 'ドラッグして順番を変更し、確定してください',
          allowReorder: true,
          onConfirm: (reorderedCards) => {
            // 並び替えた順番でデッキを更新
            setMyDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
            addLog(`カードをデッキの上に戻した: ${reorderedCards.map((c) => c.name).join(' → ')}`, 'info');
          },
        });
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
        const { addLog } = context;
        const { opponentHand, setOpponentHand, setOpponentGraveyard } = getPlayerContext(context);

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
        const { addLog } = context;
        const { myDeck, setMyDeck, setMyGraveyard } = getPlayerContext(context);

        // デッキから未来属性モンスターを探す
        const futureMonsterIndex = myDeck.findIndex(
          (card) => card.attribute === '未来' && card.type === 'monster'
        );

        if (futureMonsterIndex !== -1) {
          const futureMonster = myDeck[futureMonsterIndex];

          // デッキから削除して墓地に送る
          setMyDeck((prev) => prev.filter((c, idx) => idx !== futureMonsterIndex));
          setMyGraveyard((prev) => [...prev, futureMonster]);
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
        const { addLog } = context;
        const { myGraveyard, setMyGraveyard, setMyHand } = getPlayerContext(context);

        // 墓地から未来属性カードを探す
        const futureCard = myGraveyard.find((card) => card.attribute === '未来');

        if (futureCard) {
          // 墓地から削除して手札に加える
          setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== futureCard.uniqueId));
          setMyHand((prev) => [...prev, futureCard]);
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
        const { addLog } = context;
        const { opponentDeck } = getPlayerContext(context);

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
        const { addLog } = context;
        const { myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

        if (myDeck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        // デッキトップ1枚を確認
        const topCard = myDeck[0];
        addLog(`デッキトップを確認: ${topCard.name}`, 'info');

        if (topCard.attribute === '未来') {
          // 未来属性なら手札に加える
          setMyDeck((prev) => prev.slice(1));
          setMyHand((prev) => [...prev, topCard]);
          addLog(`${topCard.name}は未来属性！手札に加えた`, 'info');
        } else {
          // 未来属性でなければデッキの下に戻す
          setMyDeck((prev) => {
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
        const { addLog, leavingCard } = context;
        const { myGraveyard, setMyGraveyard, setMyDeck } = getPlayerContext(context);

        // 墓地から未来属性カードを探す（自分自身は除外）
        const futureCard = myGraveyard.find(
          (card) => card.attribute === '未来' && card.uniqueId !== leavingCard?.uniqueId
        );

        if (futureCard) {
          // 墓地から削除してデッキに戻す
          setMyGraveyard((prev) => prev.filter((c) => c.uniqueId !== futureCard.uniqueId));
          setMyDeck((prev) => [...prev, futureCard]);
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
        const { addLog, setPendingDeckReview } = context;
        const { myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

        if (myDeck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        // デッキ上3枚を確認
        const cardCount = Math.min(3, myDeck.length);
        const topCards = myDeck.slice(0, cardCount);
        addLog(`星翼の飛舟エクラオンの効果: デッキ上${cardCount}枚を確認`, 'info');

        // 未来属性モンスターを探す
        const futureMonsters = topCards.filter(
          (card) => card.attribute === '未来' && card.type === 'monster'
        );

        if (futureMonsters.length === 0) {
          // 未来モンスターがいない場合、並び替えて戻す
          setPendingDeckReview({
            cards: topCards,
            title: '星翼の飛舟エクラオン',
            message: '未来属性モンスターがいませんでした。カードの順番を変更してデッキに戻してください',
            allowReorder: true,
            onConfirm: (reorderedCards) => {
              setMyDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
              addLog(`カードをデッキに戻した: ${reorderedCards.map((c) => c.name).join(' → ')}`, 'info');
            },
          });
        } else if (futureMonsters.length === 1) {
          // 未来モンスターが1体の場合、自動で手札に加え、残りを並び替え
          const futureMonster = futureMonsters[0];
          const remaining = topCards.filter((c) => c.uniqueId !== futureMonster.uniqueId);

          setMyHand((prev) => [...prev, futureMonster]);
          addLog(`${futureMonster.name}を手札に加えた`, 'info');

          if (remaining.length > 1) {
            // 残りが2枚以上なら並び替え
            setPendingDeckReview({
              cards: remaining,
              title: '星翼の飛舟エクラオン',
              message: '残りのカードの順番を変更してデッキに戻してください',
              allowReorder: true,
              onConfirm: (reorderedCards) => {
                setMyDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
                addLog(`残りをデッキに戻した: ${reorderedCards.map((c) => c.name).join(' → ')}`, 'info');
              },
            });
          } else if (remaining.length === 1) {
            // 残りが1枚なら自動で戻す
            setMyDeck((prev) => [remaining[0], ...prev.slice(cardCount)]);
            addLog(`${remaining[0].name}をデッキに戻した`, 'info');
          } else {
            // 残りがない
            setMyDeck((prev) => prev.slice(cardCount));
          }
        } else {
          // 未来モンスターが複数の場合、選択させる
          setPendingDeckReview({
            cards: topCards,
            title: '星翼の飛舟エクラオン',
            message: '手札に加える未来属性モンスターを1枚選択してください',
            allowReorder: false,
            selectMode: {
              enabled: true,
              count: 1,
              filter: (card) => card.attribute === '未来' && card.type === 'monster',
            },
            onSelect: (selectedCards, remainingCards) => {
              const selectedMonster = selectedCards[0];
              setMyHand((prev) => [...prev, selectedMonster]);
              addLog(`${selectedMonster.name}を手札に加えた`, 'info');

              // 残りを並び替えて戻す
              if (remainingCards.length > 1) {
                setPendingDeckReview({
                  cards: remainingCards,
                  title: '星翼の飛舟エクラオン',
                  message: '残りのカードの順番を変更してデッキに戻してください',
                  allowReorder: true,
                  onConfirm: (reorderedCards) => {
                    setMyDeck((prev) => [...reorderedCards, ...prev.slice(cardCount)]);
                    addLog(`残りをデッキに戻した: ${reorderedCards.map((c) => c.name).join(' → ')}`, 'info');
                  },
                });
              } else if (remainingCards.length === 1) {
                setMyDeck((prev) => [remainingCards[0], ...prev.slice(cardCount)]);
                addLog(`${remainingCards[0].name}をデッキに戻した`, 'info');
              } else {
                setMyDeck((prev) => prev.slice(cardCount));
              }
            },
          });
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_LEAVE_FIELD,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '場を離れる時、相手に600ダメージ',
      effect: (context) => {
        const { addLog } = context;
        const { setOpponentLife } = getPlayerContext(context);

        // 相手にダメージ
        setOpponentLife((prev) => Math.max(0, prev - 600));
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
        const { addLog } = context;
        const { myDeck, setMyDeck, setMyHand, setMyGraveyard } = getPlayerContext(context);

        if (myDeck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        // デッキトップ1枚を確認
        const topCard = myDeck[0];
        addLog(`エクラシアの時空炉の効果: デッキトップを確認 - ${topCard.name}`, 'info');

        if (topCard.attribute === '未来') {
          // 未来属性なら手札に加える
          setMyDeck((prev) => prev.slice(1));
          setMyHand((prev) => [...prev, topCard]);
          addLog(`${topCard.name}は未来属性！手札に加えた`, 'info');
        } else {
          // 未来属性でなければ墓地に送る
          setMyDeck((prev) => prev.slice(1));
          setMyGraveyard((prev) => [...prev, topCard]);
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
        const { addLog, setPendingDeckReview } = context;
        const { myDeck, setMyDeck, setMyHand } = getPlayerContext(context);

        if (myDeck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        // デッキ上2枚を確認
        const cardCount = Math.min(2, myDeck.length);
        const topCards = myDeck.slice(0, cardCount);
        addLog(`星辰の魔導術師の効果: デッキ上${cardCount}枚を確認`, 'info');

        if (cardCount === 1) {
          // 1枚しかない場合、その1枚を自動で手札に
          setMyHand((prev) => [...prev, topCards[0]]);
          setMyDeck((prev) => prev.slice(1));
          addLog(`${topCards[0].name}を手札に加えた`, 'info');
        } else {
          // 2枚ある場合、プレイヤーに選択させる
          setPendingDeckReview({
            cards: topCards,
            title: '星辰の魔導術師',
            message: '手札に加えるカードを1枚選択してください（残りはデッキ下へ）',
            allowReorder: false,
            selectMode: { enabled: true, count: 1 },
            onSelect: (selectedCards, remainingCards) => {
              const cardToHand = selectedCards[0];
              const cardToBottom = remainingCards[0];

              setMyHand((prev) => [...prev, cardToHand]);
              setMyDeck((prev) => {
                const deckWithoutTop = prev.slice(cardCount);
                return [...deckWithoutTop, cardToBottom];
              });
              addLog(`${cardToHand.name}を手札に加え、${cardToBottom.name}をデッキの下に戻した`, 'info');
            },
          });
        }
      },
    },
  ],

  /**
   * C0000271: 黄金の時姫エクラリア
   * 【召喚時】自分のデッキ上5枚を見て、コスト6以下のモンスター1枚を場に召喚、残りを好きな順番で戻す。
   * 【自分エンドフェイズ時】上級技使用後、このカード以外のモンスターをすべて墓地に送る。
   */
  C0000271: [
    // 召喚時効果はcardEffects/future.jsで実装
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '上級技発動後：このカード以外のモンスターを墓地に送る',
      effect: (context) => {
        const { addLog, monsterIndex, card } = context;
        const { myField, setMyField, setMyGraveyard } = getPlayerContext(context);

        // このカードがpendingEndTurnSacrificeフラグを持っているか確認
        const thisCard = myField[monsterIndex] || myField.find(m => m && m.id === 'C0000271' && m.pendingEndTurnSacrifice);

        if (!thisCard || !thisCard.pendingEndTurnSacrifice) {
          // 上級技が発動されていない場合はスキップ
          return;
        }

        addLog('黄金の時姫エクラリアの上級技効果が発動！', 'damage');

        // このカード以外のモンスターを墓地に送る
        const sacrificedMonsters = [];
        const eclariaIndex = myField.findIndex(m => m && m.id === 'C0000271' && m.pendingEndTurnSacrifice);

        setMyField(prev => prev.map((monster, idx) => {
          if (monster && idx !== eclariaIndex) {
            sacrificedMonsters.push(monster);
            addLog(`${monster.name}は墓地に送られた`, 'damage');
            return null;
          }
          if (idx === eclariaIndex && monster) {
            // フラグをリセット
            return { ...monster, pendingEndTurnSacrifice: false };
          }
          return monster;
        }));

        // 墓地に追加
        if (sacrificedMonsters.length > 0) {
          setMyGraveyard(prev => [...prev, ...sacrificedMonsters]);
        } else {
          addLog('他にモンスターがいませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000268: 虚蝕の魔導兵
   * 【召喚時】相手のデッキ上2枚を墓地に送り、その中のモンスター1体につき300ダメージ。
   */
  C0000268: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手のデッキ上2枚を墓地に送り、モンスター1体につき300ダメージ',
      effect: (context) => {
        const { addLog } = context;

        // 相手のデッキ上2枚を墓地に送る
        const milledCards = millOpponentDeck(context, 2);

        if (milledCards.length === 0) {
          addLog('相手のデッキにカードがありませんでした', 'info');
          return;
        }

        // 墓地に送ったカードを表示
        addLog(`相手のデッキから${milledCards.length}枚を墓地に送った: ${milledCards.map(c => c.name).join(', ')}`, 'info');

        // 墓地に送ったカードの中のモンスター数をカウント
        const monsterCount = milledCards.filter(card => card.type === 'monster').length;

        if (monsterCount > 0) {
          const totalDamage = monsterCount * 300;
          conditionalDamage(context, totalDamage, 'opponent');
          addLog(`モンスター${monsterCount}体分、${totalDamage}ダメージ！`, 'damage');
        } else {
          addLog('墓地に送ったカードにモンスターはいませんでした', 'info');
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
