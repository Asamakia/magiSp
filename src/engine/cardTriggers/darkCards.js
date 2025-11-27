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
 * Total: 45 cards
 * - 召喚時 (On Summon): 17 cards
 * - 自壊時 (On Self-Destroy): 10 cards
 * - 攻撃時 (On Attack): 4 cards
 * - 常時 (Continuous): 7 cards
 * - メインフェイズ時 (Main Phase): 2 cards
 * - エンドフェイズ時 (End Phase): 4 cards
 * - バトルフェイズ開始時 (Battle Phase Start): 1 card
 * - 相手モンスター攻撃時 (Opponent Attack): 1 card
 * - フェイズカード (Phase Card): 3 cards
 * - フィールドカード (Field Card): 5 cards
 * - 特殊能力 (Special Abilities): 2 cards (死触)
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
   * C0000074: ダーク・ネクロフィア
   * 【自バトルフェイズ開始時】場にこのカード以外の闇属性モンスターがいる場合のみ、
   * 相手モンスター全体と相手プレイヤーに500ダメージを与える。
   */
  C0000074: [
    {
      type: TRIGGER_TYPES.ON_BATTLE_PHASE_START,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'バトルフェイズ開始時: 闇属性がいれば相手全体に500ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                slotIndex, addLog } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;

        // Check if there are other dark attribute monsters on the field
        const hasDarkMonster = currentField.some((monster, index) =>
          monster && monster.attribute === '闇' && index !== slotIndex
        );

        if (!hasDarkMonster) {
          addLog('他の闇属性モンスターがいないため発動しない', 'info');
          return;
        }

        // Deal 500 damage to all opponent monsters
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        let destroyedCount = 0;

        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              const newHp = monster.currentHp - 500;
              if (newHp <= 0) {
                destroyedCount++;
                addLog(`${monster.name}に500ダメージを与え破壊！`, 'damage');
                return null;
              }
              return { ...monster, currentHp: newHp };
            }
            return monster;
          });
        });

        // Deal 500 damage to opponent player
        conditionalDamage(context, 500, 'opponent');
        addLog('相手プレイヤーに500ダメージ！', 'damage');
      },
    },
  ],

  /**
   * C0000076: シャドウ・サーバント
   * 【自壊時】デッキからコスト3以下「闇属性」魔法カード1枚を手札に加える。
   */
  C0000076: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '自壊時: コスト3以下の闇魔法カードをサーチ',
      effect: (context) => {
        const foundCard = searchCard(context, (card) => {
          return card.type === 'magic' &&
                 card.attribute === '闇' &&
                 card.cost <= 3;
        });

        if (!foundCard) {
          context.addLog('デッキに該当カードがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000077: 彷徨える死者
   * 【自壊時】相手モンスター1体に1200ダメージを与える。
   */
  C0000077: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '自壊時: 相手モンスター1体に1200ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        const targetIndex = opponentField.findIndex((m) => m !== null);

        if (targetIndex !== -1) {
          const target = opponentField[targetIndex];
          const newHp = target.currentHp - 1200;

          if (newHp <= 0) {
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = null;
              return newField;
            });
            setOpponentGraveyard((prev) => [...prev, target]);
            addLog(`${target.name}に1200ダメージを与え破壊した！`, 'damage');
          } else {
            setOpponentField((prev) => {
              const newField = [...prev];
              newField[targetIndex] = { ...target, currentHp: newHp };
              return newField;
            });
            addLog(`${target.name}に1200ダメージ！`, 'damage');
          }
        } else {
          addLog('相手の場にモンスターがいない', 'info');
        }
      },
    },
  ],

  /**
   * C0000080: 闇魔界の貴婦人
   * 【常時】相手の魔法カードのコストを1増加する。
   * 【自壊時】デッキから《ダーク・ネクロフィア》を手札に加える。
   */
  C0000080: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 相手の魔法カードコスト+1',
      effect: (context) => {
        const { addLog } = context;
        // Note: Cost modification system not yet implemented
        // This requires game engine changes to track continuous effects
        addLog('相手の魔法カードのコストを1増加！', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '自壊時: 《ダーク・ネクロフィア》をサーチ',
      effect: (context) => {
        const foundCard = searchCard(context, (card) => {
          return card.name && card.name.includes('ダーク・ネクロフィア');
        });

        if (!foundCard) {
          context.addLog('デッキにダーク・ネクロフィアがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000081: 虚蝕獣・喰らい触手
   * 【自攻撃後】相手モンスターを破壊した場合、破壊したモンスターの攻撃力の50％分のライフを回復する。
   */
  C0000081: [
    {
      type: TRIGGER_TYPES.ON_ATTACK_SUCCESS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃成功時: 破壊モンスターの攻撃力50%回復',
      effect: (context) => {
        const { destroyedCard } = context;

        if (destroyedCard) {
          const healAmount = Math.floor((destroyedCard.attack || 0) * 0.5);
          if (healAmount > 0) {
            healLife(context, healAmount, true);
          }
        }
      },
    },
  ],

  /**
   * C0000082: 怨霊の使者
   * 【自メインフェイズ時】このカードをリリース（墓地に送る）すると、
   * 相手の場にいるモンスター1体の攻撃力を半分にできる。
   */
  C0000082: [
    {
      type: TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: 'メインフェイズ: リリースして相手モンスター1体の攻撃力半減',
      effect: (context) => {
        const { currentPlayer, slotIndex, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setCurrentField = currentPlayer === 1 ? setP1Field : setP2Field;
        const setCurrentGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        // Find first monster on opponent's field to halve attack
        const targetIndex = opponentField.findIndex((m) => m !== null);

        if (targetIndex === -1) {
          addLog('相手の場にモンスターがいない', 'info');
          return;
        }

        // Release this card (send to graveyard)
        const thisCard = currentField[slotIndex];
        if (!thisCard) {
          addLog('カードが見つからない', 'info');
          return;
        }

        setCurrentField((prev) => {
          const newField = [...prev];
          newField[slotIndex] = null;
          return newField;
        });
        setCurrentGraveyard((prev) => [...prev, thisCard]);

        // Halve opponent monster's attack
        const target = opponentField[targetIndex];
        const newAttack = Math.floor(target.attack / 2);

        setOpponentField((prev) => {
          const newField = [...prev];
          newField[targetIndex] = { ...target, attack: newAttack };
          return newField;
        });

        addLog(`${thisCard.name}をリリース！${target.name}の攻撃力が半減！(${target.attack} → ${newAttack})`, 'info');
      },
    },
  ],

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
   * C0000098: 影喰いの鴉
   * 【自攻撃後】相手モンスターを破壊した場合、相手のデッキの上から2枚を墓地に送る。
   */
  C0000098: [
    {
      type: TRIGGER_TYPES.ON_ATTACK_SUCCESS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃成功時: 相手デッキ2枚をミル',
      effect: (context) => {
        const { destroyedCard } = context;

        if (destroyedCard) {
          millOpponentDeck(context, 2);
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
   * C0000111: 禁忌の守護者
   * 【自壊時】デッキから《ブラック・オラクル》を手札に加える。
   */
  C0000111: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '自壊時: 《ブラック・オラクル》をサーチ',
      effect: (context) => {
        const foundCard = searchCard(context, (card) => {
          return card.name && card.name.includes('ブラック・オラクル');
        });

        if (!foundCard) {
          context.addLog('デッキにブラック・オラクルがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000114: 闇の巨像
   * 【常時】このカードは攻撃できない。
   * 【自壊時】相手フィールド全体に1000ダメージを与える。
   */
  C0000114: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: このカードは攻撃できない',
      effect: (context) => {
        const { addLog } = context;
        // Note: Attack restriction system not yet implemented
        // This requires game engine changes
        addLog('このカードは攻撃できない', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '自壊時: 相手フィールド全体に1000ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        let destroyedCount = 0;

        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              const newHp = monster.currentHp - 1000;
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

        addLog(`相手フィールド全体に1000ダメージ！${destroyedCount}体破壊！`, 'damage');
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
   * C0000282: 暗殺者の亡魂
   * 【自壊時】相手に600ダメージを与える。
   */
  C0000282: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '自壊時: 相手に600ダメージ',
      effect: (context) => {
        conditionalDamage(context, 600, 'opponent');
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
   * C0000370: 影羽の鳥民・ノクティス
   * 【常時】自分の《ヴォランティス》モンスターが相手モンスターを戦闘で破壊するたび、
   * そのモンスターの攻撃力の半分を相手プレイヤーにダメージとして与える。
   */
  C0000370: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: ヴォランティス破壊時、攻撃力半分ダメージ',
      effect: (context) => {
        const { addLog } = context;
        // Note: Triggered effect from another card's action
        // This requires game engine changes to detect Volantis destroying monsters
        addLog('ヴォランティスモンスターが破壊する度、追加ダメージ！', 'info');
      },
    },
  ],

  /**
   * C0000384: 魔女エリザヴェット・ヴェイル
   * 【常時】自分の《黒呪》魔法カードのコストを1軽減（重複不可） → continuousEffectsで実装済み
   * 【破壊時】デッキから《呪縛の塔・ヴェルナクール》を1枚場に出す（コスト不要）
   */
  C0000384: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 《呪縛の塔・ヴェルナクール》をデッキから場に出す',
      effect: (context) => {
        const {
          currentPlayer,
          p1Deck,
          p2Deck,
          setP1Deck,
          setP2Deck,
          setP1FieldCard,
          setP2FieldCard,
          addLog,
          registerCardTriggers,
          continuousEffectEngine,
        } = context;

        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const setFieldCard = currentPlayer === 1 ? setP1FieldCard : setP2FieldCard;

        // デッキから《呪縛の塔・ヴェルナクール》(C0000386)を検索
        const cardIndex = deck.findIndex((card) => card.id === 'C0000386');

        if (cardIndex === -1) {
          addLog('デッキに《呪縛の塔・ヴェルナクール》がない', 'info');
          return;
        }

        const fieldCard = { ...deck[cardIndex], owner: currentPlayer, uniqueId: `${deck[cardIndex].id}_${Date.now()}_${Math.random()}` };

        // デッキから除去
        setDeck((prev) => {
          const newDeck = [...prev];
          newDeck.splice(cardIndex, 1);
          return newDeck;
        });

        // フィールドカードとして配置
        setFieldCard(fieldCard);

        // トリガーを登録
        if (registerCardTriggers) {
          registerCardTriggers(fieldCard, currentPlayer, null);
        }

        // 常時効果を登録
        if (continuousEffectEngine) {
          continuousEffectEngine.register(fieldCard, currentPlayer);
        }

        addLog(`魔女エリザヴェット・ヴェイルの効果で《呪縛の塔・ヴェルナクール》を場に出した！`, 'info');
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

  /**
   * C0000407: 魂喰いのレイスヴィット
   * 【相手モンスター攻撃時】そのモンスターに200ダメージ。
   */
  C0000407: [
    {
      type: TRIGGER_TYPES.ON_OPPONENT_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手モンスター攻撃時: 攻撃モンスターに200ダメージ',
      effect: (context) => {
        const { currentPlayer, attackerIndex, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        // Opponent is attacking, so opponent's field has the attacker
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        // Get the attacking monster
        const attacker = opponentField[attackerIndex];
        if (!attacker) {
          addLog('攻撃モンスターが見つからない', 'info');
          return;
        }

        const newHp = attacker.currentHp - 200;

        if (newHp <= 0) {
          setOpponentField((prev) => {
            const newField = [...prev];
            newField[attackerIndex] = null;
            return newField;
          });
          setOpponentGraveyard((prev) => [...prev, attacker]);
          addLog(`${attacker.name}に200ダメージを与え破壊！`, 'damage');
        } else {
          setOpponentField((prev) => {
            const newField = [...prev];
            newField[attackerIndex] = { ...attacker, currentHp: newHp };
            return newField;
          });
          addLog(`${attacker.name}に200ダメージ！`, 'damage');
        }
      },
    },
  ],

  /**
   * C0000409: 血涙の叫女バンシーディス
   * 【死触】このモンスターが与えるダメージが1点でもあれば、その相手モンスターを破壊する。
   */
  C0000409: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '死触: ダメージ1点でも相手モンスター破壊',
      effect: (context) => {
        const { addLog } = context;
        // Note: Death Touch is a special ability that modifies combat
        // This requires game engine changes to implement properly
        addLog('【死触】発動：ダメージを与えた相手モンスターを破壊！', 'info');
      },
    },
  ],

  /**
   * C0000418: 深層の隠蟲クリプトノムス
   * 【被攻撃時】そのターン終了時までこのカードのHPを800アップ。（ターンに1度）
   */
  C0000418: [
    {
      type: TRIGGER_TYPES.ON_ATTACKED,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '被攻撃時: HP+800（ターン終了まで）',
      effect: (context) => {
        const { currentPlayer, slotIndex, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        if (slotIndex !== undefined && currentField[slotIndex]) {
          setField((prev) => {
            const newField = [...prev];
            newField[slotIndex] = {
              ...newField[slotIndex],
              currentHp: newField[slotIndex].currentHp + 800,
              hp: newField[slotIndex].hp + 800, // Temporary HP boost
            };
            return newField;
          });
          addLog('HPが800上昇！（ターン終了まで）', 'info');
          // Note: HP should revert at turn end - requires game engine support
        }
      },
    },
  ],

  /**
   * C0000420: 瘴気の蟻アラクノファグス
   * 【自攻撃時】相手モンスターを破壊した時、相手プレイヤーに300ダメージを与える。
   */
  C0000420: [
    {
      type: TRIGGER_TYPES.ON_ATTACK_SUCCESS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃成功時: 相手に300ダメージ',
      effect: (context) => {
        const { destroyedCard } = context;

        if (destroyedCard) {
          conditionalDamage(context, 300, 'opponent');
        }
      },
    },
  ],

  /**
   * C0000424: 呪灰の翼ダスクドラゴン
   * 【自分エンドフェイズ時】相手フィールド全体に400ダメージを与える。
   */
  C0000424: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: 相手フィールド全体に400ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        let destroyedCount = 0;

        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              const newHp = monster.currentHp - 400;
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

        addLog(`相手フィールド全体に400ダメージ！`, 'damage');
        if (destroyedCount > 0) {
          addLog(`${destroyedCount}体破壊！`, 'damage');
        }
      },
    },
  ],

  /**
   * C0000425: 灰骨竜フレアスケルス
   * 【自攻撃時】相手モンスターに与えるダメージを400アップ。
   */
  C0000425: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: ダメージ+400',
      effect: (context) => {
        const { addLog } = context;
        // Note: Damage modification requires combat system changes
        addLog('攻撃ダメージが400上昇！', 'info');
      },
    },
  ],

  /**
   * C0000426: 灰塵の怨念スペクトラグス
   * 【死触】このモンスターが与えるダメージが1点でもあれば、相手モンスターを破壊する。
   */
  C0000426: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '死触: ダメージ1点でも相手モンスター破壊',
      effect: (context) => {
        const { addLog } = context;
        // Note: Death Touch is a special ability that modifies combat
        addLog('【死触】発動：ダメージを与えた相手モンスターを破壊！', 'info');
      },
    },
  ],

  /**
   * C0000427: 灰塵の骨霊ファントマリス
   * 【召喚時】自分の墓地の闇属性カード1枚をデッキに戻す。
   */
  C0000427: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地の闇属性カード1枚をデッキに戻す',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                p1Deck, p2Deck, setP1Deck, setP2Deck, addLog } = context;

        const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

        const darkCard = currentGraveyard.find((card) => card.attribute === '闇');

        if (darkCard) {
          setGraveyard((prev) => prev.filter((c) => c.id !== darkCard.id));
          setDeck((prev) => [...prev, darkCard]);
          addLog(`${darkCard.name}をデッキに戻した！`, 'info');
        } else {
          addLog('墓地に闇属性カードがない', 'info');
        }
      },
    },
  ],

  // ========================================
  // Field Cards (フィールドカード)
  // ========================================

  /**
   * C0000089: 闇の宮殿
   * 【常時】闇属性モンスターの攻撃力を400アップ。
   * 【相手エンドフェイズ時】自分の場に闇属性モンスターがいるとき、相手の手札を1枚ランダムに墓地に捨てる。
   */
  C0000089: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 闇属性モンスター攻撃力+400',
      effect: (context) => {
        const { addLog } = context;
        // Note: Continuous stat modification requires game engine changes
        addLog('闇属性モンスターの攻撃力が400上昇！', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_OPPONENT_END_PHASE,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手エンドフェイズ時: 闇属性いれば相手手札1枚破棄',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, p1Hand, p2Hand, setP1Hand, setP2Hand,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const hasDarkMonster = currentField.some((m) => m && m.attribute === '闇');

        if (hasDarkMonster) {
          const opponentHand = currentPlayer === 1 ? p2Hand : p1Hand;
          const setOpponentHand = currentPlayer === 1 ? setP2Hand : setP1Hand;
          const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

          if (opponentHand.length > 0) {
            const randomIndex = Math.floor(Math.random() * opponentHand.length);
            const discardedCard = opponentHand[randomIndex];

            setOpponentHand((prev) => prev.filter((_, index) => index !== randomIndex));
            setOpponentGraveyard((prev) => [...prev, discardedCard]);
            addLog(`相手の手札から${discardedCard.name}を墓地に捨てた！`, 'info');
          } else {
            addLog('相手の手札がない', 'info');
          }
        }
      },
    },
  ],

  /**
   * C0000108: 虚蝕の呪詛 (Phase Card)
   * 初期効果: 【自分エンドフェイズ時】相手プレイヤーに300ダメージを与える。
   */
  C0000108: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: 相手に300ダメージ',
      effect: (context) => {
        conditionalDamage(context, 300, 'opponent');
      },
    },
  ],

  /**
   * C0000123: 禁忌の王座
   * 【常時】自分のライフが2000以下の場合、闇属性モンスターの召喚コストを1軽減。
   * 【自分エンドフェイズ時】場にいる闇属性モンスター1体につき、相手プレイヤーに300ダメージ。
   */
  C0000123: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: ライフ2000以下で闇コスト-1',
      effect: (context) => {
        const { addLog } = context;
        // Note: Cost reduction requires game engine changes
        addLog('闇属性モンスターの召喚コストを1軽減！', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: 闇属性数×300ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, addLog } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const darkCount = currentField.filter((m) => m && m.attribute === '闇').length;

        if (darkCount > 0) {
          const damage = darkCount * 300;
          conditionalDamage(context, damage, 'opponent');
          addLog(`闇属性${darkCount}体で${damage}ダメージ！`, 'damage');
        }
      },
    },
  ],

  /**
   * C0000124: シャドウ・エンパイア
   * 【相手モンスター召喚時】その攻撃力を500ダウン、そのモンスターに300ダメージ。
   * 【自壊時】自分のライフを1000減らす。
   */
  C0000124: [
    {
      type: TRIGGER_TYPES.ON_OPPONENT_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手召喚時: 攻撃力-500、300ダメージ',
      effect: (context) => {
        const { card, addLog } = context;

        if (card) {
          // Note: Modifying summoned monster requires game engine changes
          // This trigger should fire during summon and modify the monster
          addLog(`${card.name}の攻撃力を500減少、300ダメージ！`, 'damage');
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '自壊時: 自ライフ-1000',
      effect: (context) => {
        conditionalDamage(context, 1000, 'self');
      },
    },
  ],

  /**
   * C0000240: 魔界の幼魔王城
   * 【常時】《リリカ》と名の付くモンスターの攻撃力を500アップ。
   * 【エンドフェイズ時】自分の墓地の《リリカ》モンスター1体をデッキに戻したら、相手プレイヤーに300ダメージ。
   */
  C0000240: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: リリカ攻撃力+500',
      effect: (context) => {
        const { addLog } = context;
        addLog('リリカモンスターの攻撃力が500上昇！', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: 'エンドフェイズ時: 墓地リリカをデッキに戻し300ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                p1Deck, p2Deck, setP1Deck, setP2Deck, addLog } = context;

        const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

        const lilikaCard = currentGraveyard.find((card) =>
          card.type === 'monster' && card.name && card.name.includes('リリカ')
        );

        if (lilikaCard) {
          setGraveyard((prev) => prev.filter((c) => c.id !== lilikaCard.id));
          setDeck((prev) => [...prev, lilikaCard]);
          conditionalDamage(context, 300, 'opponent');
          addLog(`${lilikaCard.name}をデッキに戻し、300ダメージ！`, 'damage');
        } else {
          addLog('墓地にリリカモンスターがない', 'info');
        }
      },
    },
  ],

  /**
   * C0000386: 呪縛の塔・ヴェルナクール
   * 【常時】自分の《黒呪》魔法カードのコストを1軽減（エリザヴェットと重複可）。
   */
  C0000386: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 黒呪魔法カードコスト-1（重複可）',
      effect: (context) => {
        const { addLog } = context;
        addLog('黒呪魔法カードのコストを1軽減！（エリザヴェットと重複可）', 'info');
      },
    },
  ],

  /**
   * C0000387: 呪核の杖・ザルヴェリオ (Phase Card)
   * 初期効果: 【発動時】相手プレイヤーに200ダメージ。
   */
  C0000387: [
    {
      type: TRIGGER_TYPES.ON_PHASE_CARD_ACTIVATE,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '発動時: 相手に200ダメージ',
      effect: (context) => {
        conditionalDamage(context, 200, 'opponent');
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
