/**
 * 炎属性カードのトリガー実装
 *
 * このファイルには炎属性カードの個別トリガー効果を実装します。
 * 各カードは独自のトリガー定義を持ち、triggerEngineによって管理されます。
 */

import { TRIGGER_TYPES, ACTIVATION_TYPES, TRIGGER_PRIORITIES } from '../triggerTypes';
import {
  millDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  drawCards,
  healLife,
  destroyMonster,
  modifyAttack,
} from '../effectHelpers';
import { hasCategory } from '../../utils/helpers';

/**
 * 炎属性カードのトリガー定義
 * カードID => トリガー配列のマッピング
 */
export const fireCardTriggers = {
  /**
   * C0000021: フレア・ドラゴン
   * 【召喚時】バトルフェイズ開始時、相手プレイヤーに300ダメージを与える。
   */
  C0000021: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 次のバトルフェイズ開始時に300ダメージ',
      effect: (context) => {
        const { addLog } = context;
        addLog('フレア・ドラゴンの召喚時効果: 次のバトルフェイズで300ダメージを与える', 'info');
        // TODO: バトルフェイズ開始時のトリガーを予約する仕組みが必要
        // 現時点では即座に300ダメージ
        conditionalDamage(context, 300, 'opponent');
      },
    },
  ],

  /**
   * C0000023: レッドバーストドラゴン
   * 【バトルフェイズ開始時】相手プレイヤーに300ダメージ（覚醒後500ダメージ）を与える。
   * 【覚醒時】攻撃力が1000アップ。
   */
  C0000023: [
    {
      type: TRIGGER_TYPES.ON_BATTLE_PHASE_START,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'バトルフェイズ開始時: 相手に300ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, monsterIndex, addLog } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;
        const monster = field[monsterIndex];

        // 覚醒状態チェック（攻撃力が初期値より高い場合など）
        const isAwakened = monster && monster.awakened;
        const damage = isAwakened ? 500 : 300;

        addLog(`レッドバーストドラゴンの効果: 相手に${damage}ダメージ`, 'info');
        conditionalDamage(context, damage, 'opponent');
      },
    },
  ],

  /**
   * C0000025: ブレイズ・ドラゴン
   * 【自壊時】デッキから［ドラゴン］モンスター1体を手札に加える。
   */
  C0000025: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: デッキから［ドラゴン］1体をサーチ',
      effect: (context) => {
        const found = searchCard(context, (card) => {
          return card.type === 'monster' &&
                 hasCategory(card, '【ドラゴン】');
        });

        if (!found) {
          context.addLog('ブレイズ・ドラゴンの効果: デッキに［ドラゴン］モンスターが見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000027: マグマ・ドラゴン
   * 【相手が魔法カードを発動時】相手プレイヤーに200ダメージを与える。
   * 注: このトリガーは現在のトリガーシステムでは未実装（魔法カード発動トリガーが必要）
   */
  C0000027: [
    {
      type: TRIGGER_TYPES.ON_OPPONENT_MAGIC_ACTIVATED, // TODO: triggerTypes.jsに追加必要
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手が魔法カード発動時: 200ダメージ',
      effect: (context) => {
        context.addLog('マグマ・ドラゴンの効果発動: 相手に200ダメージ', 'info');
        conditionalDamage(context, 200, 'opponent');
      },
    },
  ],

  /**
   * C0000028: 炎竜母フレイマ
   * 【召喚時】墓地の［ドラゴン］モンスター1体を攻撃力半減で場に戻す。
   * 【常時】自分の［ドラゴン］モンスターは効果でダメージを受けない。
   */
  C0000028: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地の［ドラゴン］を攻撃力半減で復活',
      effect: (context) => {
        const success = reviveFromGraveyard(context, (card) => {
          return card.type === 'monster' &&
                 hasCategory(card, '【ドラゴン】');
        }, true); // true = weakened (half attack)

        if (!success) {
          context.addLog('炎竜母フレイマの効果: 墓地に［ドラゴン］モンスターがいません', 'info');
        }
      },
    },
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 自分の［ドラゴン］は効果ダメージ無効',
      effect: (context) => {
        // 常時効果は別途実装が必要（継続的な効果管理）
        context.addLog('炎竜母フレイマの常時効果: ［ドラゴン］は効果ダメージを受けない', 'info');
      },
    },
  ],

  /**
   * C0000029: クリムゾン・ワイバーン
   * 【常時】［ドラゴン］モンスターがいる時、このカードの攻撃力は400アップする。
   */
  C0000029: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: ［ドラゴン］がいる時、攻撃力+400',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, monsterIndex } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;

        // 場に［ドラゴン］がいるかチェック
        const hasDragon = field.some((monster, idx) =>
          monster &&
          idx !== monsterIndex &&
          hasCategory(monster, '【ドラゴン】')
        );

        if (hasDragon) {
          modifyAttack(context, 400, monsterIndex, false, true);
        }
      },
    },
  ],

  /**
   * C0000161: 灯魔龍ランプデビル
   * 【召喚時】場にいる全ての炎属性モンスターに3000ダメージを与え、破壊したモンスター×600のダメージを相手プレイヤーに与える。
   * 【自壊時】自分のSPトークンを3個破壊する。
   */
  C0000161: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 全炎属性に3000ダメージ、破壊数×600を相手に',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;
        let destroyedCount = 0;

        // 両プレイヤーのフィールドをチェック
        [1, 2].forEach((player) => {
          const field = player === 1 ? p1Field : p2Field;
          const setField = player === 1 ? setP1Field : setP2Field;

          setField((prev) => {
            return prev.map((monster) => {
              if (monster && monster.attribute === '炎') {
                const newHp = monster.currentHp - 3000;
                if (newHp <= 0) {
                  destroyedCount++;
                  addLog(`${monster.name}が破壊された！`, 'damage');
                  return null;
                } else {
                  return { ...monster, currentHp: newHp };
                }
              }
              return monster;
            });
          });
        });

        // 破壊した数×600のダメージ
        if (destroyedCount > 0) {
          const totalDamage = destroyedCount * 600;
          addLog(`灯魔龍ランプデビルの効果: ${destroyedCount}体破壊、相手に${totalDamage}ダメージ`, 'damage');
          conditionalDamage(context, totalDamage, 'opponent');
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 自分のSPトークンを3個破壊',
      effect: (context) => {
        const { currentPlayer, p1ActiveSP, p2ActiveSP, p1RestedSP, p2RestedSP,
                setP1ActiveSP, setP2ActiveSP, setP1RestedSP, setP2RestedSP, addLog } = context;

        addLog('灯魔龍ランプデビルの自壊時効果: SPトークンを3個破壊', 'damage');

        if (currentPlayer === 1) {
          const totalSP = p1ActiveSP + p1RestedSP;
          if (totalSP >= 3) {
            // まずレストSPから減らす
            const restedToRemove = Math.min(p1RestedSP, 3);
            const activeToRemove = 3 - restedToRemove;
            setP1RestedSP((prev) => Math.max(0, prev - restedToRemove));
            setP1ActiveSP((prev) => Math.max(0, prev - activeToRemove));
          }
        } else {
          const totalSP = p2ActiveSP + p2RestedSP;
          if (totalSP >= 3) {
            const restedToRemove = Math.min(p2RestedSP, 3);
            const activeToRemove = 3 - restedToRemove;
            setP2RestedSP((prev) => Math.max(0, prev - restedToRemove));
            setP2ActiveSP((prev) => Math.max(0, prev - activeToRemove));
          }
        }
      },
    },
  ],

  /**
   * C0000164: 岩狸・岩太
   * 【自壊時】相手プレイヤーに200ダメージを与える。
   */
  C0000164: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 相手に200ダメージ',
      effect: (context) => {
        context.addLog('岩狸・岩太の自壊時効果: 相手に200ダメージ', 'damage');
        conditionalDamage(context, 200, 'opponent');
      },
    },
  ],

  /**
   * C0000165: 岩狸・熔岩守
   * 【召喚時】相手モンスター1体の攻撃力をターン終了時まで500ダウン。
   * 【自壊時】デッキから炎属性フィールドカード1枚を手札に加える。
   */
  C0000165: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 相手モンスター1体の攻撃力-500',
      effect: (context) => {
        const { p2Field, addLog } = context;

        // 相手のフィールドにモンスターがいるかチェック
        const opponentMonsters = p2Field.filter((m) => m !== null);
        if (opponentMonsters.length === 0) {
          addLog('岩狸・熔岩守の効果: 相手フィールドにモンスターがいません', 'info');
          return;
        }

        // 最初のモンスターをターゲット（UIで選択させるべきだが、簡略化）
        const targetIndex = p2Field.findIndex((m) => m !== null);
        if (targetIndex !== -1) {
          modifyAttack(context, -500, targetIndex, true, false); // temporary
          addLog('岩狸・熔岩守の効果: 相手モンスターの攻撃力-500', 'info');
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 炎属性フィールドカードをサーチ',
      effect: (context) => {
        const found = searchCard(context, (card) => {
          return card.type === 'field' && card.attribute === '炎';
        });

        if (!found) {
          context.addLog('岩狸・熔岩守の効果: デッキに炎属性フィールドカードが見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000166: 岩狸・地割れ狸
   * 【自攻撃時】相手の場にいるモンスター1体の効果をターン終了時まで無効化。
   */
  C0000166: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 相手モンスター1体の効果無効化',
      effect: (context) => {
        const { addLog } = context;
        addLog('岩狸・地割れ狸の効果: 相手モンスターの効果を無効化（未実装）', 'info');
        // TODO: 効果無効化の仕組みが必要
      },
    },
  ],

  /**
   * C0000167: 岩狸・剛石権蔵
   * 【召喚時】墓地の［マグマフォージ］モンスター1体を場に戻す（攻撃力半分）。
   */
  C0000167: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地の［マグマフォージ］を攻撃力半減で復活',
      effect: (context) => {
        const success = reviveFromGraveyard(context, (card) => {
          return card.type === 'monster' &&
                 hasCategory(card, '【マグマフォージ】');
        }, true);

        if (!success) {
          context.addLog('岩狸・剛石権蔵の効果: 墓地に［マグマフォージ］モンスターがいません', 'info');
        }
      },
    },
  ],

  /**
   * C0000168: 熱き剣士セイニー
   * 【自攻撃時】相手モンスターに400ダメージを与える。自分の場にフィールドカードがある場合、さらに相手プレイヤーに300ダメージ。
   */
  C0000168: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 相手モンスターに400、フィールドありで相手に300',
      effect: (context) => {
        const { currentPlayer, p1FieldCard, p2FieldCard, addLog } = context;
        const fieldCard = currentPlayer === 1 ? p1FieldCard : p2FieldCard;

        // TODO: 攻撃対象のモンスターに400ダメージ（攻撃対象が必要）
        addLog('熱き剣士セイニーの効果: 相手モンスターに400ダメージ', 'damage');

        if (fieldCard) {
          addLog('熱き剣士セイニーの追加効果: 相手プレイヤーに300ダメージ', 'damage');
          conditionalDamage(context, 300, 'opponent');
        }
      },
    },
  ],

  /**
   * C0000169: 岩狸・火山頭
   * 【召喚時】自分のSPを1減らすことで相手の場にいるモンスター1体に2000ダメージ。
   */
  C0000169: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: SP1消費で相手モンスター1体に2000ダメージ',
      effect: (context) => {
        const { currentPlayer, p1ActiveSP, p2ActiveSP, setP1ActiveSP, setP2ActiveSP,
                p2Field, addLog } = context;

        const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;

        if (activeSP < 1) {
          addLog('岩狸・火山頭の効果: SPが不足しています', 'damage');
          return;
        }

        // 相手のフィールドにモンスターがいるかチェック
        const opponentMonsters = p2Field.filter((m) => m !== null);
        if (opponentMonsters.length === 0) {
          addLog('岩狸・火山頭の効果: 相手フィールドにモンスターがいません', 'info');
          return;
        }

        // SP消費
        if (currentPlayer === 1) {
          setP1ActiveSP((prev) => prev - 1);
        } else {
          setP2ActiveSP((prev) => prev - 1);
        }

        // 最初のモンスターに2000ダメージ（UIで選択させるべきだが、簡略化）
        const targetIndex = p2Field.findIndex((m) => m !== null);
        if (targetIndex !== -1) {
          conditionalDamage(context, 2000, 'opponent_monster', targetIndex);
          addLog('岩狸・火山頭の効果: 相手モンスターに2000ダメージ', 'damage');
        }
      },
    },
  ],

  /**
   * C0000170: 岩狸・大岩王
   * 【常時】場にいる［マグマフォージ］モンスター1体につき攻撃力500アップ。
   */
  C0000170: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: ［マグマフォージ］1体につき攻撃力+500',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, monsterIndex } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;

        // 場に［マグマフォージ］が何体いるかカウント
        const magmaForgeCount = field.filter((monster, idx) =>
          monster &&
          idx !== monsterIndex &&
          hasCategory(monster, '【マグマフォージ】')
        ).length;

        if (magmaForgeCount > 0) {
          const attackBonus = magmaForgeCount * 500;
          modifyAttack(context, attackBonus, monsterIndex, false, true);
        }
      },
    },
  ],

  /**
   * C0000171: 岩狸・熔岩権蔵・極
   * 【召喚時】自分の場にいる《岩狸》モンスター1体を破壊し、その攻撃力の半分のダメージを相手プレイヤーに与える。
   */
  C0000171: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 《岩狸》1体破壊、攻撃力半分を相手に',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, monsterIndex, addLog } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;

        // 自分以外の《岩狸》を探す
        const tanukiIndex = field.findIndex((monster, idx) =>
          monster &&
          idx !== monsterIndex &&
          monster.name &&
          monster.name.includes('岩狸')
        );

        if (tanukiIndex === -1) {
          addLog('岩狸・熔岩権蔵・極の効果: 破壊できる《岩狸》がいません', 'info');
          return;
        }

        const targetMonster = field[tanukiIndex];
        const damageAmount = Math.floor(targetMonster.attack / 2);

        // モンスターを破壊
        destroyMonster(context, tanukiIndex, false);

        // ダメージを与える
        conditionalDamage(context, damageAmount, 'opponent');
        addLog(`岩狸・熔岩権蔵・極の効果: ${targetMonster.name}を破壊、相手に${damageAmount}ダメージ`, 'damage');
      },
    },
  ],

  /**
   * C0000172: 岩狸・禁忌の熔岩帝
   * 【召喚時】場にいる全てのモンスターに3000ダメージを与え、相手プレイヤーに破壊したモンスターの数×400ダメージを与える。
   */
  C0000172: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 全モンスターに3000、破壊数×400を相手に',
      effect: (context) => {
        const { p1Field, p2Field, setP1Field, setP2Field, addLog } = context;
        let destroyedCount = 0;

        // 両プレイヤーのフィールドをチェック
        [1, 2].forEach((player) => {
          const field = player === 1 ? p1Field : p2Field;
          const setField = player === 1 ? setP1Field : setP2Field;

          setField((prev) => {
            return prev.map((monster) => {
              if (monster) {
                const newHp = monster.currentHp - 3000;
                if (newHp <= 0) {
                  destroyedCount++;
                  addLog(`${monster.name}が破壊された！`, 'damage');
                  return null;
                } else {
                  return { ...monster, currentHp: newHp };
                }
              }
              return monster;
            });
          });
        });

        // 破壊した数×400のダメージ
        if (destroyedCount > 0) {
          const totalDamage = destroyedCount * 400;
          addLog(`岩狸・禁忌の熔岩帝の効果: ${destroyedCount}体破壊、相手に${totalDamage}ダメージ`, 'damage');
          conditionalDamage(context, totalDamage, 'opponent');
        }
      },
    },
  ],

  /**
   * C0000312: フレア・ワイバーン
   * 【自攻撃時】このカードと相手プレイヤーに300ダメージを与える。
   */
  C0000312: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 自分と相手に300ダメージ',
      effect: (context) => {
        context.addLog('フレア・ワイバーンの効果: 自分と相手に300ダメージ', 'damage');
        conditionalDamage(context, 300, 'opponent');
        conditionalDamage(context, 300, 'self');
      },
    },
  ],

  /**
   * C0000359: ヴォランティス・インフェルノ
   * 【召喚時】自分のフィールドのモンスター1体を破壊し、相手プレイヤーに1000ダメージを与える。
   */
  C0000359: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 自分のモンスター1体破壊、相手に1000ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, monsterIndex, addLog } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;

        // 自分以外のモンスターを探す
        const targetIndex = field.findIndex((monster, idx) =>
          monster && idx !== monsterIndex
        );

        if (targetIndex === -1) {
          addLog('ヴォランティス・インフェルノの効果: 破壊できるモンスターがいません', 'info');
          return;
        }

        // モンスターを破壊
        destroyMonster(context, targetIndex, false);

        // ダメージを与える
        conditionalDamage(context, 1000, 'opponent');
        addLog('ヴォランティス・インフェルノの効果: 相手に1000ダメージ', 'damage');
      },
    },
  ],

  /**
   * C0000361: 虹羽密林のフェザートラップ
   * 【被攻撃時】対象の相手モンスターの攻撃力をターン終了時まで600下げる。
   */
  C0000361: [
    {
      type: TRIGGER_TYPES.ON_ATTACKED,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '被攻撃時: 攻撃者の攻撃力-600',
      effect: (context) => {
        const { addLog } = context;
        addLog('虹羽密林のフェザートラップの効果: 攻撃者の攻撃力-600（未実装）', 'info');
        // TODO: 攻撃者の情報が必要
      },
    },
  ],

  /**
   * C0000369: 炎翼の鳥民・イグニス
   * 【召喚時】自分の手札1枚を墓地に送り、相手プレイヤーに600ダメージを与える。
   */
  C0000369: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 手札1枚捨て、相手に600ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Hand, p2Hand, setP1Hand, setP2Hand,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const hand = currentPlayer === 1 ? p1Hand : p2Hand;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

        if (hand.length === 0) {
          addLog('炎翼の鳥民・イグニスの効果: 手札がありません', 'info');
          return;
        }

        // 最初のカードを墓地に送る（UIで選択させるべきだが、簡略化）
        const discardedCard = hand[0];
        setHand((prev) => prev.slice(1));
        setGraveyard((prev) => [...prev, discardedCard]);

        addLog(`${discardedCard.name}を墓地に送った`, 'info');
        conditionalDamage(context, 600, 'opponent');
        addLog('炎翼の鳥民・イグニスの効果: 相手に600ダメージ', 'damage');
      },
    },
  ],

  /**
   * C0000373: 虹羽密林の血針蟻・ザルヴァキス
   * 【召喚時】自分の墓地の《虹羽密林の血針蟻・ザルヴァキス》を1体を召喚（同名カードはターンに1度）。
   */
  C0000373: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地の同名カードを召喚',
      effect: (context) => {
        const success = reviveFromGraveyard(context, (card) => {
          return card.id === 'C0000373'; // 同名カード
        }, false); // 弱体化なし

        if (!success) {
          context.addLog('虹羽密林の血針蟻・ザルヴァキスの効果: 墓地に同名カードがいません', 'info');
        }
      },
    },
  ],

  /**
   * C0000377: 虹羽密林の赤花蔓・カルティノス
   * 【召喚時】自分のデッキの上から2枚を墓地に送り、その中に《虹羽密林》モンスターが含まれていた場合、相手プレイヤーに300ダメージを与える。
   */
  C0000377: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 2枚ミル、《虹羽密林》含むなら相手に300',
      effect: (context) => {
        const milledCards = millDeck(context, 2);

        const hasRainbowFeatherJungle = milledCards.some((card) =>
          card.name && card.name.includes('虹羽密林')
        );

        if (hasRainbowFeatherJungle) {
          context.addLog('虹羽密林の赤花蔓・カルティノスの効果: 相手に300ダメージ', 'damage');
          conditionalDamage(context, 300, 'opponent');
        } else {
          context.addLog('虹羽密林の赤花蔓・カルティノスの効果: 《虹羽密林》がいませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000398: 呪術狩りの呪焔術師ガルドリック
   * 【召喚時】自分の墓地のコスト3の魔法カード1枚を手札に戻す。
   */
  C0000398: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地のコスト3魔法カードをサルベージ',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                p1Hand, p2Hand, setP1Hand, setP2Hand, addLog } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        // 墓地からコスト3の魔法カードを探す
        const targetCard = graveyard.find((card) =>
          card.type === 'magic' && card.cost === 3
        );

        if (!targetCard) {
          addLog('呪術狩りの呪焔術師ガルドリックの効果: 墓地にコスト3の魔法カードがありません', 'info');
          return;
        }

        // 墓地から手札に戻す
        setGraveyard((prev) => prev.filter((c) => c.uniqueId !== targetCard.uniqueId));
        setHand((prev) => [...prev, targetCard]);
        addLog(`${targetCard.name}を手札に戻した`, 'info');
      },
    },
  ],

  /**
   * C0000406: 血炎の精霊ブラッドフェニクス
   * 【自破壊時】相手プレイヤーに800ダメージを与える。
   */
  C0000406: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 相手に800ダメージ',
      effect: (context) => {
        context.addLog('血炎の精霊ブラッドフェニクスの効果: 相手に800ダメージ', 'damage');
        conditionalDamage(context, 800, 'opponent');
      },
    },
  ],

  /**
   * C0000410: 峠の暴君ヴェルミグノス
   * 【自分ターン開始フェイズ時】相手フィールド全体に300ダメージを与える。
   */
  C0000410: [
    {
      type: TRIGGER_TYPES.ON_TURN_START_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'ターン開始時: 相手フィールド全体に300',
      effect: (context) => {
        const { p2Field, setP2Field, addLog } = context;

        addLog('峠の暴君ヴェルミグノスの効果: 相手フィールド全体に300ダメージ', 'damage');

        setP2Field((prev) => {
          return prev.map((monster) => {
            if (monster) {
              const newHp = monster.currentHp - 300;
              if (newHp <= 0) {
                addLog(`${monster.name}が破壊された！`, 'damage');
                return null;
              } else {
                return { ...monster, currentHp: newHp };
              }
            }
            return monster;
          });
        });
      },
    },
  ],

  /**
   * C0000411: 呪炎殻のイグニファトゥス
   * 【自攻撃時】自分の攻撃を200アップ。
   */
  C0000411: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 自分の攻撃力+200',
      effect: (context) => {
        const { monsterIndex, addLog } = context;
        addLog('呪炎殻のイグニファトゥスの効果: 攻撃力+200', 'info');
        modifyAttack(context, 200, monsterIndex, false, false);
      },
    },
  ],

  /**
   * C0000412: 血針の蠍スコーピグニス
   * 【召喚時】自分のデッキの上から2枚を墓地に送る。
   */
  C0000412: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 2枚ミル',
      effect: (context) => {
        context.addLog('血針の蠍スコーピグニスの効果: デッキから2枚を墓地に送る', 'info');
        millDeck(context, 2);
      },
    },
  ],

  // ========================================
  // フィールドカード
  // ========================================

  /**
   * C0000037: ドラゴンの火山
   * 【常時】《ドラゴン》と名のついたモンスターの攻撃力を400アップ。→ continuousEffectsで実装
   * 【自分エンドフェイズ時】相手モンスターに300ダメージを与え、場に炎属性モンスターがいる場合、さらに相手プレイヤーに400ダメージを与える。
   */
  C0000037: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: 相手モンスターに300ダメージ、炎モンスターがいれば相手に400ダメージ',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field, p2Field,
          setP1Field, setP2Field,
          setP1Life, setP2Life,
          p1Graveyard, p2Graveyard,
          setP1Graveyard, setP2Graveyard,
          addLog,
        } = context;

        const myField = currentPlayer === 1 ? p1Field : p2Field;
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentLife = currentPlayer === 1 ? setP2Life : setP1Life;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        // 相手モンスター全体に300ダメージ
        let destroyedMonsters = [];
        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              const newHp = monster.currentHp - 300;
              if (newHp <= 0) {
                addLog(`${monster.name}がドラゴンの火山の炎で破壊された！`, 'damage');
                destroyedMonsters.push(monster);
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

        const hasOpponentMonsters = opponentField.some((m) => m !== null);
        if (hasOpponentMonsters) {
          addLog('ドラゴンの火山: 相手モンスター全体に300ダメージ！', 'damage');
        }

        // 場に炎属性モンスターがいるかチェック
        const hasFireMonster = myField.some((m) => m && m.attribute === '炎');
        if (hasFireMonster) {
          setOpponentLife((prev) => prev - 400);
          addLog('ドラゴンの火山: 炎モンスターの力で相手に400ダメージ！', 'damage');
        }
      },
    },
  ],
};

/**
 * 炎属性カードがトリガー実装を持っているかチェック
 * @param {string} cardId - カードID
 * @returns {boolean} トリガー実装を持っている場合true
 */
export const hasFireCardTrigger = (cardId) => {
  return cardId && fireCardTriggers[cardId] !== undefined;
};

/**
 * 炎属性カードのトリガーを取得
 * @param {string} cardId - カードID
 * @returns {Array|null} トリガー配列、または null
 */
export const getFireCardTriggers = (cardId) => {
  if (!cardId || !fireCardTriggers[cardId]) {
    return null;
  }
  return fireCardTriggers[cardId];
};

/**
 * 実装済み炎属性カード数を取得
 * @returns {number} 実装済みカード数
 */
export const getFireCardCount = () => {
  return Object.keys(fireCardTriggers).length;
};
