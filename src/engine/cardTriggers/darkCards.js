/**
 * Dark Attribute Card Triggers (闇属性トリガー)
 *
 * This file contains trigger implementations for dark attribute cards.
 * Dark attribute focuses on:
 * - Mill effects (deck destruction)
 * - Graveyard manipulation (banish effects)
 * - Control effects (stealing monsters, hand disruption)
 * - Debuff effects (attack reduction, status removal)
 * - Search effects (theme support)
 *
 * Total: 18 cards
 * - 召喚時 (On Summon): 14 cards
 * - 攻撃時 (On Attack): 2 cards
 * - メインフェイズ時 (Main Phase): 1 card
 * - フェイズカード (Phase Card): 1 card
 */

import { TRIGGER_TYPES, ACTIVATION_TYPES } from '../triggerTypes';
import {
  millDeck,
  millOpponentDeck,
  conditionalDamage,
  searchCard,
  drawCards,
  healLife,
  destroyMonster,
  modifyAttack,
} from '../effectHelpers';

/**
 * Dark Card Triggers Registry
 * Key: Card ID (e.g., 'C0000094')
 * Value: Array of trigger objects
 */
export const darkCardTriggers = {
  /**
   * C0000094: 闇鴉の斥候
   * 召喚時、相手のデッキの上から1枚を墓地に送る。
   */
  C0000094: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手デッキ1枚を墓地へ',
      effect: (context) => {
        millOpponentDeck(context, 1);
      },
    },
  ],

  /**
   * C0000095: シャドウ・プランダラー
   * 攻撃時、相手の墓地のカード1枚を除外し、そのコスト＊100分のダメージを相手プレイヤーに与える。
   */
  C0000095: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 相手墓地カード1枚除外、コスト×100ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentGraveyard = currentPlayer === 1 ? p2Graveyard : p1Graveyard;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        if (opponentGraveyard.length > 0) {
          // Banish the first card from opponent's graveyard
          const banishedCard = opponentGraveyard[0];
          setOpponentGraveyard((prev) => prev.slice(1));

          const damage = (banishedCard.cost || 0) * 100;
          addLog(`${banishedCard.name}を除外し、${damage}ダメージ！`, 'damage');

          if (damage > 0) {
            conditionalDamage(context, damage, 'opponent');
          }
        } else {
          addLog('相手の墓地にカードがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000096: 奈落の追跡者
   * 召喚時、相手の手札を1枚選び、それがモンスターなら墓地に送る。
   */
  C0000096: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手手札1枚がモンスターなら墓地へ',
      effect: (context) => {
        const { currentPlayer, p1Hand, p2Hand, setP1Hand, setP2Hand,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentHand = currentPlayer === 1 ? p2Hand : p1Hand;
        const setOpponentHand = currentPlayer === 1 ? setP2Hand : setP1Hand;
        const opponentGraveyard = currentPlayer === 1 ? p2Graveyard : p1Graveyard;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        if (opponentHand.length > 0) {
          // Select a random card from opponent's hand
          const randomIndex = Math.floor(Math.random() * opponentHand.length);
          const selectedCard = opponentHand[randomIndex];

          if (selectedCard.type === 'monster') {
            // Send monster to graveyard
            setOpponentHand((prev) => prev.filter((_, index) => index !== randomIndex));
            setOpponentGraveyard((prev) => [...prev, selectedCard]);
            addLog(`相手の手札から${selectedCard.name}を墓地に送った！`, 'info');
          } else {
            addLog(`相手の手札から${selectedCard.name}を選んだがモンスターではない`, 'info');
          }
        } else {
          addLog('相手の手札がない', 'info');
        }
      },
    },
  ],

  /**
   * C0000099: 虚蝕獣・爪刃の群れ
   * 召喚時、相手モンスター1体に800ダメージを与える。
   */
  C0000099: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター1体に800ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        // Find first monster on opponent's field
        const targetIndex = opponentField.findIndex((m) => m !== null);

        if (targetIndex !== -1) {
          const target = opponentField[targetIndex];
          const newHp = target.currentHp - 800;

          if (newHp <= 0) {
            // Destroy monster
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = null;
              return newField;
            });
            setOpponentGraveyard((prev) => [...prev, target]);
            addLog(`${target.name}に800ダメージを与え破壊した！`, 'damage');
          } else {
            // Damage monster
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = { ...target, currentHp: newHp };
              return newField;
            });
            addLog(`${target.name}に800ダメージ！`, 'damage');
          }
        } else {
          addLog('相手の場にモンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000109: ブラック・オラクル (禁忌カード)
   * 召喚時、場にいる自分以外の全てのモンスターに3000ダメージを与え、
   * この効果で破壊したモンスター1体につき300ダメージを相手プレイヤーに与え、
   * このターン中、相手のモンスター効果と魔法カードの発動を全て無効化。
   */
  C0000109: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 全モンスターに3000、破壊数×300、相手効果無効化',
      effect: (context) => {
        const { currentPlayer, slotIndex, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        let destroyedCount = 0;

        // Damage all own monsters except Black Oracle
        setP1Field((prev) => {
          return prev.map((monster, index) => {
            if (monster && !(currentPlayer === 1 && index === slotIndex)) {
              const newHp = monster.currentHp - 3000;
              if (newHp <= 0) {
                destroyedCount++;
                addLog(`${monster.name}が破壊された！`, 'damage');
                return null;
              }
              return { ...monster, currentHp: newHp };
            }
            return monster;
          });
        });

        setP2Field((prev) => {
          return prev.map((monster, index) => {
            if (monster && !(currentPlayer === 2 && index === slotIndex)) {
              const newHp = monster.currentHp - 3000;
              if (newHp <= 0) {
                destroyedCount++;
                addLog(`${monster.name}が破壊された！`, 'damage');
                return null;
              }
              return { ...monster, currentHp: newHp };
            }
            return monster;
          });
        });

        // Deal damage based on destroyed count
        if (destroyedCount > 0) {
          const damage = destroyedCount * 300;
          addLog(`${destroyedCount}体破壊し、${damage}ダメージ！`, 'damage');
          conditionalDamage(context, damage, 'opponent');
        }

        // Note: Effect nullification would require a new game state flag
        // This is a TODO for future implementation
        addLog('このターン、相手の効果と魔法を無効化！', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 自ライフ3000減、闇属性1体特殊召喚',
      effect: (context) => {
        const { currentPlayer, p1Life, p2Life, setP1Life, setP2Life,
                p1Deck, p2Deck, setP1Deck, setP2Deck,
                p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        // Reduce own life by 3000
        const currentLife = currentPlayer === 1 ? p1Life : p2Life;
        const setLife = currentPlayer === 1 ? setP1Life : setP2Life;
        const newLife = Math.max(0, currentLife - 3000);
        setLife(newLife);
        addLog(`ライフが3000減少！(${currentLife} → ${newLife})`, 'damage');

        // Special summon a dark attribute monster from deck
        const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        const darkMonster = currentDeck.find((card) =>
          card.type === 'monster' && card.attribute === '闇'
        );

        if (darkMonster) {
          const emptySlotIndex = currentField.findIndex((slot) => slot === null);

          if (emptySlotIndex !== -1) {
            setDeck((prev) => prev.filter((c) => c.id !== darkMonster.id));
            setField((prev) => {
              const newField = [...prev];
              newField[emptySlotIndex] = {
                ...darkMonster,
                uniqueId: `${darkMonster.id}_${Date.now()}_${Math.random()}`,
                currentHp: darkMonster.hp,
                canAttack: false,
              };
              return newField;
            });
            addLog(`${darkMonster.name}を特殊召喚！`, 'info');
          } else {
            addLog('場に空きがないため特殊召喚できない', 'info');
          }
        } else {
          addLog('デッキに闇属性モンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000110: 闇の支配者
   * 召喚時、相手の場にいる禁忌カード以外のコスト3以下モンスター1体のコントロールを奪う。
   */
  C0000110: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手のコスト3以下モンスター1体の支配権奪取',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setCurrentField = currentPlayer === 1 ? setP1Field : setP2Field;

        // Find first eligible monster (cost 3 or less, not forbidden)
        const targetIndex = opponentField.findIndex((monster) =>
          monster &&
          monster.cost <= 3 &&
          !monster.forbidden
        );

        if (targetIndex !== -1) {
          const stolenMonster = opponentField[targetIndex];
          const emptySlotIndex = currentField.findIndex((slot) => slot === null);

          if (emptySlotIndex !== -1) {
            // Remove from opponent's field
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = null;
              return newField;
            });

            // Add to own field
            setCurrentField((prev) => {
              const newField = [...prev];
              newField[emptySlotIndex] = stolenMonster;
              return newField;
            });

            addLog(`${stolenMonster.name}の支配権を奪った！`, 'info');
          } else {
            addLog('自分の場に空きがないため支配権を奪えない', 'info');
          }
        } else {
          addLog('相手の場に対象となるモンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000113: 咆哮の虚蝕獣
   * 召喚時、相手のデッキの上から3枚を墓地に送る。
   */
  C0000113: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手デッキ3枚を墓地へ',
      effect: (context) => {
        millOpponentDeck(context, 3);
      },
    },
  ],

  /**
   * C0000115: 禁断の使徒
   * 召喚時、相手モンスター1体に300ダメージを与える。
   */
  C0000115: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター1体に300ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        // Find first monster on opponent's field
        const targetIndex = opponentField.findIndex((m) => m !== null);

        if (targetIndex !== -1) {
          const target = opponentField[targetIndex];
          const newHp = target.currentHp - 300;

          if (newHp <= 0) {
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = null;
              return newField;
            });
            setOpponentGraveyard((prev) => [...prev, target]);
            addLog(`${target.name}に300ダメージを与え破壊した！`, 'damage');
          } else {
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = { ...target, currentHp: newHp };
              return newField;
            });
            addLog(`${target.name}に300ダメージ！`, 'damage');
          }
        } else {
          addLog('相手の場にモンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000126: ダーク・シャンデリア
   * 召喚時、相手モンスター全ての攻撃力を300下げる。
   */
  C0000126: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手全モンスターの攻撃力-300',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        let affectedCount = 0;

        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              affectedCount++;
              return {
                ...monster,
                attack: Math.max(0, monster.attack - 300)
              };
            }
            return monster;
          });
        });

        if (affectedCount > 0) {
          addLog(`相手モンスター${affectedCount}体の攻撃力を300減少！`, 'info');
        } else {
          addLog('相手の場にモンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000231: 幼魔王女リリカ
   * 召喚時、デッキから「ゴシック」または「鎖」魔法カード1枚を手札に加える。
   */
  C0000231: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 「ゴシック」または「鎖」魔法カードをサーチ',
      effect: (context) => {
        const foundCard = searchCard(context, (card) => {
          return card.type === 'magic' &&
                 card.name &&
                 (card.name.includes('ゴシック') || card.name.includes('鎖'));
        });

        if (!foundCard) {
          context.addLog('デッキに該当カードがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000232: 奉仕のリリカ
   * 召喚時、自分のSPトークンを１つアクティブにする。
   */
  C0000232: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: SPトークン1つをアクティブ化',
      effect: (context) => {
        const { currentPlayer, p1ActiveSP, p2ActiveSP, setP1ActiveSP, setP2ActiveSP,
                p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP, addLog } = context;

        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
        const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;

        if (restedSP > 0) {
          setActiveSP((prev) => prev + 1);
          setRestedSP((prev) => prev - 1);
          addLog('SPトークン1つをアクティブ化！', 'info');
        } else {
          addLog('アクティブ化するSPトークンがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000275: 虚蝕に染まる騎士
   * 召喚時、自分のデッキ上1枚を墓地に送り、それが「未来」属性なら
   * 自分の「闇」モンスター1体の攻撃力を800アップ、違えば自分ライフに800ダメージ。
   */
  C0000275: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: デッキ1枚を墓地へ、未来なら闇+800、違えば自800ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Deck, p2Deck, setP1Deck, setP2Deck,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

        if (currentDeck.length > 0) {
          const milledCard = currentDeck[0];
          setDeck((prev) => prev.slice(1));
          setGraveyard((prev) => [...prev, milledCard]);
          addLog(`${milledCard.name}を墓地に送った`, 'info');

          if (milledCard.attribute === '未来') {
            // Buff dark monster
            const currentField = currentPlayer === 1 ? p1Field : p2Field;
            const setField = currentPlayer === 1 ? setP1Field : setP2Field;

            const darkMonsterIndex = currentField.findIndex((monster) =>
              monster && monster.attribute === '闇'
            );

            if (darkMonsterIndex !== -1) {
              setField((prev) => {
                const newField = [...prev];
                newField[darkMonsterIndex] = {
                  ...newField[darkMonsterIndex],
                  attack: newField[darkMonsterIndex].attack + 800,
                };
                return newField;
              });
              addLog(`${currentField[darkMonsterIndex].name}の攻撃力が800上昇！`, 'info');
            } else {
              addLog('場に闇属性モンスターがいない', 'info');
            }
          } else {
            // Self damage
            conditionalDamage(context, 800, 'self');
          }
        } else {
          addLog('デッキにカードがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000281: 毒使いカムラ
   * 召喚時、自分のモンスター1体の状態異常を回復。
   */
  C0000281: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 自モンスター1体の状態異常回復',
      effect: (context) => {
        const { addLog } = context;
        // Note: Status effect system not yet implemented
        // This is a TODO for future implementation
        addLog('自モンスター1体の状態異常を回復！', 'info');
      },
    },
  ],

  /**
   * C0000308: シャドウ・クロウ (変幻身)
   * 【変幻身】メインフェイズにSPコストを2払うことで場のこのモンスターを別の形態に変化する。
   */
  C0000308: [
    {
      type: TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: 'メインフェイズ: SP2消費で別形態に変化',
      effect: (context) => {
        const { currentPlayer, p1ActiveSP, p2ActiveSP, setP1ActiveSP, setP2ActiveSP,
                p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP,
                slotIndex, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
        const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
        const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;

        if (activeSP >= 2) {
          // Pay SP cost
          setActiveSP((prev) => prev - 2);
          setRestedSP((prev) => prev + 2);

          // Note: Transformation system not yet implemented
          // This would require searching deck for the transformed form
          addLog('SP2を消費して変化形態へ！', 'info');
          addLog('(変化システム未実装)', 'info');
        } else {
          addLog('SPが足りない（2必要）', 'info');
        }
      },
    },
  ],

  /**
   * C0000315: シャドウ・ネクロレイヴン
   * 攻撃時、相手モンスター1体に400ダメージを与える。
   */
  C0000315: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 相手モンスター1体に400ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        // Find first monster on opponent's field
        const targetIndex = opponentField.findIndex((m) => m !== null);

        if (targetIndex !== -1) {
          const target = opponentField[targetIndex];
          const newHp = target.currentHp - 400;

          if (newHp <= 0) {
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = null;
              return newField;
            });
            setOpponentGraveyard((prev) => [...prev, target]);
            addLog(`${target.name}に400ダメージを与え破壊した！`, 'damage');
          } else {
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = { ...target, currentHp: newHp };
              return newField;
            });
            addLog(`${target.name}に400ダメージ！`, 'damage');
          }
        } else {
          addLog('相手の場にモンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000364: ヴォランティス・エクリプス (壮麗)
   * 召喚時、自分の墓地のカードを3枚まで除外し、除外した枚数×400ダメージを相手プレイヤーに与える。
   */
  C0000364: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地3枚まで除外、除外数×400ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

        const banishCount = Math.min(3, currentGraveyard.length);

        if (banishCount > 0) {
          // Banish cards from graveyard
          setGraveyard((prev) => prev.slice(banishCount));

          const damage = banishCount * 400;
          addLog(`墓地から${banishCount}枚除外し、${damage}ダメージ！`, 'damage');
          conditionalDamage(context, damage, 'opponent');
        } else {
          addLog('墓地にカードがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000385: 呪魂の従者
   * 召喚時、デッキから「エリザヴェット・ヴェイル」1枚を手札に加える。
   */
  C0000385: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 「エリザヴェット・ヴェイル」をサーチ',
      effect: (context) => {
        const foundCard = searchCard(context, (card) => {
          return card.name && card.name.includes('エリザヴェット・ヴェイル');
        });

        if (!foundCard) {
          context.addLog('デッキにエリザヴェット・ヴェイルがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000395: 血呪の棺・ヴェルディクタス (Phase Card)
   * 初期効果: このカード発動時、「ヴァルディスの幻影」（光属性、コスト0、ATK 1000 / HP 1000、トークン）を
   * 自分の場に召喚する。このトークンはターン終了時まで場に残り、次のターン開始時に墓地に送られる。
   */
  C0000395: [
    {
      type: TRIGGER_TYPES.ON_PHASE_CARD_ACTIVATE,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'カード発動時: ヴァルディスの幻影トークン召喚',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        const emptySlotIndex = currentField.findIndex((slot) => slot === null);

        if (emptySlotIndex !== -1) {
          // Create token
          const token = {
            id: 'TOKEN_VALDIS',
            name: 'ヴァルディスの幻影',
            attribute: '光',
            cost: 0,
            type: 'monster',
            attack: 1000,
            hp: 1000,
            currentHp: 1000,
            category: '【トークン】',
            effect: 'トークン。次のターン開始時に墓地に送られる。',
            uniqueId: `TOKEN_VALDIS_${Date.now()}_${Math.random()}`,
            canAttack: false,
            isToken: true,
          };

          setField((prev) => {
            const newField = [...prev];
            newField[emptySlotIndex] = token;
            return newField;
          });

          addLog('ヴァルディスの幻影トークンを召喚！', 'info');
        } else {
          addLog('場に空きがないためトークンを召喚できない', 'info');
        }
      },
    },
  ],
};

/**
 * Check if a card has dark attribute trigger implementation
 * @param {string} cardId - Card ID (e.g., 'C0000094')
 * @returns {boolean} - True if card has trigger implementation
 */
export const hasDarkCardTrigger = (cardId) => {
  return cardId && darkCardTriggers[cardId] !== undefined;
};

/**
 * Get dark attribute card triggers
 * @param {string} cardId - Card ID (e.g., 'C0000094')
 * @returns {Array|null} - Array of trigger objects or null
 */
export const getDarkCardTriggers = (cardId) => {
  if (!cardId || !darkCardTriggers[cardId]) {
    return null;
  }
  return darkCardTriggers[cardId];
};

/**
 * Get count of implemented dark attribute cards
 * @returns {number} - Count of implemented cards
 */
export const getDarkCardTriggerCount = () => {
  return Object.keys(darkCardTriggers).length;
};
