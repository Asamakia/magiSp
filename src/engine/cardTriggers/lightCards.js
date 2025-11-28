/**
 * 光属性カードのトリガー実装
 *
 * このファイルには光属性カードの個別トリガー効果を実装します。
 * 各カードは独自のトリガー定義を持ち、triggerEngineによって管理されます。
 */

import { TRIGGER_TYPES, ACTIVATION_TYPES, TRIGGER_PRIORITIES } from '../triggerTypes';
import {
  getPlayerContext,
  millDeck,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  drawCards,
  healLife,
  destroyMonster,
  modifyAttack,
  modifyHP,
} from '../effectHelpers';
import { hasCategory } from '../../utils/helpers';

/**
 * 光属性カードのトリガー定義
 * カードID => トリガー配列のマッピング
 */
export const lightCardTriggers = {
  /**
   * C0000020: 灯火の護衛霊
   * 【常時】自分の光属性モンスターが受けるダメージを200軽減する（1ターンに1度）。
   */
  C0000020: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 光属性が受けるダメージ-200（1ターン1度）',
      effect: (context) => {
        const { addLog } = context;
        addLog('灯火の護衛霊の常時効果: ダメージ軽減（未実装）', 'info');
        // TODO: ダメージ軽減システムが必要
      },
    },
  ],

  /**
   * C0000056: 輝聖女ルミナス
   * 【エンドフェイズ時】相手のモンスターの攻撃力を200ダウン。
   */
  C0000056: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 相手モンスター1体の攻撃力-200',
      effect: (context) => {
        const { addLog } = context;
        const { opponentField } = getPlayerContext(context);
        const opponentMonsters = opponentField.filter((m) => m !== null);
        if (opponentMonsters.length === 0) {
          addLog('輝聖女ルミナスの効果: 相手フィールドにモンスターがいません', 'info');
          return;
        }

        // 最初のモンスターをターゲット
        const targetIndex = opponentField.findIndex((m) => m !== null);
        if (targetIndex !== -1) {
          modifyAttack(context, -200, targetIndex, true, false);
          addLog('輝聖女ルミナスの効果: 相手モンスターの攻撃力-200', 'info');
        }
      },
    },
  ],

  /**
   * C0000057: プリズム・ガーディアン
   * 【自分モンスター被ダメージ時】1ターンに1度だけ、自分の光属性モンスターがダメージを受ける場合、代わりにこのカードが受ける。
   */
  C0000057: [
    {
      type: TRIGGER_TYPES.ON_DAMAGE_RECEIVED,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '被ダメージ時: 光属性の代わりにダメージを受ける',
      effect: (context) => {
        const { addLog } = context;
        addLog('プリズム・ガーディアンの効果: ダメージ肩代わり（未実装）', 'info');
        // TODO: ダメージ肩代わりシステムが必要
      },
    },
  ],

  /**
   * C0000058: 熾天使セラフ
   * 【相手モンスター召喚時】対象モンスターに200ダメージを与える。
   */
  C0000058: [
    {
      type: TRIGGER_TYPES.ON_OPPONENT_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手召喚時: 召喚されたモンスターに200ダメージ',
      effect: (context) => {
        const { slotIndex, addLog } = context;
        addLog('熾天使セラフの効果: 召喚されたモンスターに200ダメージ', 'damage');
        // 召喚されたモンスター（相手フィールドのslotIndex）にダメージ
        conditionalDamage(context, 200, 'opponent_monster', slotIndex);
      },
    },
  ],

  /**
   * C0000059: 光の騎士
   * 【召喚時】デッキから《光の》魔法カード1枚を手札に加える。
   */
  C0000059: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 《光の》魔法カードをサーチ',
      effect: (context) => {
        const found = searchCard(context, (card) => {
          return card.type === 'magic' && card.name && card.name.includes('光の');
        });

        if (!found) {
          context.addLog('光の騎士の効果: 《光の》魔法カードが見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000061: 輝くユニコーン
   * 【自攻撃時】自分のライフを500回復。
   */
  C0000061: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 自分のライフ500回復',
      effect: (context) => {
        healLife(context, 500, true);
      },
    },
  ],

  /**
   * C0000062: 光の使徒
   * 【自メインフェイズ時】このカードをリリースすると、自分のライフを400回復できる。
   */
  C0000062: [
    {
      type: TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: 'メインフェイズ: リリースで400回復',
      effect: (context) => {
        const { monsterIndex, addLog } = context;
        // このカードを破壊
        destroyMonster(context, monsterIndex, false);
        // ライフ回復
        healLife(context, 400, true);
        addLog('光の使徒の効果: リリースして400回復', 'info');
      },
    },
  ],

  /**
   * C0000071: クリスタルサンクチュアリ
   * 【常時】光属性モンスターの攻撃力を500アップ。
   * 【常時】2体以上光属性モンスターが場にいるとき相手の基本技の効果を1ターンに1度無効化できる。
   * 【自エンドフェイズ時】自分のライフを500回復。
   */
  C0000071: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 光属性の攻撃力+500',
      effect: (context) => {
        const { addLog } = context;
        addLog('クリスタルサンクチュアリの常時効果: 光属性攻撃力+500（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 自分のライフ500回復',
      effect: (context) => {
        healLife(context, 500, true);
      },
    },
  ],

  /**
   * C0000072: ルミナスの聖域
   * 【光属性モンスターが破壊される時】HPを1にして、代わりに自分のSPを1減らして守ることができる（1ターンに1度）。
   */
  C0000072: [
    {
      type: TRIGGER_TYPES.ON_ATTRIBUTE_BEFORE_DESTROY,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '光属性破壊時: SP1消費でHP1で守る',
      effect: (context) => {
        const { addLog } = context;
        addLog('ルミナスの聖域の効果: 破壊を防ぐ（未実装）', 'info');
        // TODO: 破壊防止システムが必要
      },
    },
  ],

  /**
   * C0000073: 輝く天蓋
   * 【常時】相手モンスター全体の攻撃力を、場にいる光属性モンスター1体につき200ダウン。
   */
  C0000073: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 相手全体の攻撃力を光属性×200ダウン',
      effect: (context) => {
        const { addLog } = context;
        const { myField } = getPlayerContext(context);

        // 場の光属性モンスターをカウント
        const lightCount = myField.filter((monster) =>
          monster && monster.attribute === '光'
        ).length;

        if (lightCount > 0) {
          const attackDown = lightCount * 200;
          addLog(`輝く天蓋の効果: 相手全体の攻撃力-${attackDown}（未実装）`, 'info');
          // TODO: フィールドカードの常時効果システムが必要
        }
      },
    },
  ],

  /**
   * C0000091: 灯火の精霊
   * 【常時】自分の光属性モンスターが召喚されるたび、そのモンスターのHPを200アップ。
   */
  C0000091: [
    {
      type: TRIGGER_TYPES.ON_ATTRIBUTE_SUMMON_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      displayDescription: '自分光属性モンスター召喚時',
      description: '光属性召喚時: そのモンスターのHP+200',
      effect: (context) => {
        const { card, slotIndex, addLog } = context;

        if (card && card.attribute === '光') {
          modifyHP(context, 200, slotIndex, false);
          addLog(`灯火の精霊の効果: ${card.name}のHP+200`, 'info');
        }
      },
    },
  ],

  /**
   * C0000121: 聖域の灯守兵
   * 【召喚時】自分の手札から光属性モンスター1体を公開し、デッキに戻す。その後、1枚ドローする。
   */
  C0000121: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 光属性モンスター1枚をデッキに戻しドロー',
      effect: (context) => {
        const { addLog } = context;
        const { myHand, setMyHand, setMyDeck } = getPlayerContext(context);

        // 手札から光属性モンスターを探す
        const lightMonster = myHand.find((card) =>
          card.type === 'monster' && card.attribute === '光'
        );

        if (!lightMonster) {
          addLog('聖域の灯守兵の効果: 手札に光属性モンスターがいません', 'info');
          return;
        }

        // 手札からデッキに戻す
        setMyHand((prev) => prev.filter((c) => c.uniqueId !== lightMonster.uniqueId));
        setMyDeck((prev) => [...prev, lightMonster]);

        // 1枚ドロー
        drawCards(context, 1);
        addLog(`${lightMonster.name}をデッキに戻し、1枚ドロー`, 'info');
      },
    },
  ],

  /**
   * C0000162: 死神天使ルシフェリエル
   * 【召喚時】自分の墓地の光属性モンスターを全てデッキに戻し、その枚数×500ライフを回復。
   * 【自壊時】相手プレイヤーに1500ダメージを与え、自分のライフを半分にする。
   */
  C0000162: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地の光属性をデッキに戻し枚数×500回復',
      effect: (context) => {
        const { addLog } = context;
        const { myGraveyard, setMyGraveyard, setMyDeck } = getPlayerContext(context);

        // 墓地から光属性モンスターを全て取得
        const lightMonsters = myGraveyard.filter((card) =>
          card.type === 'monster' && card.attribute === '光'
        );

        if (lightMonsters.length === 0) {
          addLog('死神天使ルシフェリエルの効果: 墓地に光属性モンスターがいません', 'info');
          return;
        }

        // 墓地からデッキに戻す
        setMyGraveyard((prev) => prev.filter((c) =>
          !(c.type === 'monster' && c.attribute === '光')
        ));
        setMyDeck((prev) => [...prev, ...lightMonsters]);

        // ライフ回復
        const healAmount = lightMonsters.length * 500;
        healLife(context, healAmount, true);
        addLog(`死神天使ルシフェリエルの効果: 光属性${lightMonsters.length}体をデッキに戻し、${healAmount}回復`, 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 相手に1500、自分のライフ半分に',
      effect: (context) => {
        const { addLog } = context;
        const { myLife, setMyLife } = getPlayerContext(context);

        // 相手に1500ダメージ
        conditionalDamage(context, 1500, 'opponent');

        // 自分のライフを半分に
        const newLife = Math.floor(myLife / 2);
        setMyLife(newLife);
        addLog(`死神天使ルシフェリエルの効果: 自分のライフが${newLife}になった`, 'damage');
      },
    },
  ],

  /**
   * C0000211: フルーツ・マリオネット・アップル
   * 【召喚時】デッキからコスト3以下のプラントモンスター1体を墓地に送る。
   * 【自分エンドフェイズ時】レスト状態のSPトークンを１つアクティブにする（ターンに1度のみ）。
   */
  C0000211: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: コスト3以下のプラントを墓地に',
      effect: (context) => {
        const { addLog } = context;
        const { myDeck, setMyDeck, setMyGraveyard } = getPlayerContext(context);

        // デッキからコスト3以下のプラントを探す
        const plantCard = myDeck.find((card) =>
          card.type === 'monster' &&
          hasCategory(card, '【プラント】') &&
          card.cost <= 3
        );

        if (!plantCard) {
          addLog('フルーツ・マリオネット・アップルの効果: 対象カードが見つかりませんでした', 'info');
          return;
        }

        // デッキから墓地に送る
        setMyDeck((prev) => prev.filter((c) => c.uniqueId !== plantCard.uniqueId));
        setMyGraveyard((prev) => [...prev, plantCard]);
        addLog(`${plantCard.name}を墓地に送った`, 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: レストSP1個をアクティブに',
      effect: (context) => {
        const { addLog } = context;
        const { myRestedSP, setMyRestedSP, setMyActiveSP } = getPlayerContext(context);

        if (myRestedSP > 0) {
          setMyRestedSP((prev) => prev - 1);
          setMyActiveSP((prev) => prev + 1);
          addLog('フルーツ・マリオネット・アップルの効果: レストSP1個をアクティブにした', 'info');
        }
      },
    },
  ],

  /**
   * C0000212: フルーツ・マリオネット・オレンジ
   * 【召喚時】デッキから《フルーツ・マリオネット》モンスター1体を手札に加える。
   */
  C0000212: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 《フルーツ・マリオネット》をサーチ',
      effect: (context) => {
        const found = searchCard(context, (card) => {
          return card.type === 'monster' &&
                 card.name &&
                 card.name.includes('フルーツ・マリオネット');
        });

        if (!found) {
          context.addLog('フルーツ・マリオネット・オレンジの効果: 対象カードが見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000213: フルーツ・マリオネット・バナナ
   * 【自壊時】自分モンスター全てのHPを600回復。
   */
  C0000213: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 自分モンスター全てのHP+600',
      effect: (context) => {
        const { addLog } = context;
        const { setMyField } = getPlayerContext(context);

        let healed = 0;
        setMyField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              healed++;
              const newHp = Math.min(monster.currentHp + 600, monster.maxHp);
              return { ...monster, currentHp: newHp };
            }
            return monster;
          });
        });

        if (healed > 0) {
          addLog(`フルーツ・マリオネット・バナナの効果: ${healed}体のHPを600回復`, 'info');
        }
      },
    },
  ],

  /**
   * C0000214: フルーツ・マリオネット・グレープ
   * 【召喚時】自分の墓地の［プラント］モンスター1体を場に戻す（攻撃力は半分）。
   */
  C0000214: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地の［プラント］を攻撃力半減で復活',
      effect: (context) => {
        const success = reviveFromGraveyard(context, (card) => {
          return card.type === 'monster' &&
                 hasCategory(card, '【プラント】');
        }, true);

        if (!success) {
          context.addLog('フルーツ・マリオネット・グレープの効果: 墓地に［プラント］モンスターがいません', 'info');
        }
      },
    },
  ],

  /**
   * C0000215: フルーツ・マリオネット・メロン王
   * 【常時】場にいる［プラント］モンスター1体につき攻撃力400アップ。
   */
  C0000215: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: ［プラント］1体につき攻撃力+400',
      effect: (context) => {
        const { monsterIndex } = context;
        const { myField } = getPlayerContext(context);

        // 場の［プラント］をカウント（自分自身を除く）
        const plantCount = myField.filter((monster, idx) =>
          monster &&
          idx !== monsterIndex &&
          hasCategory(monster, '【プラント】')
        ).length;

        if (plantCount > 0) {
          const attackBonus = plantCount * 400;
          modifyAttack(context, attackBonus, monsterIndex, false, true);
        }
      },
    },
  ],

  /**
   * C0000218: フルーツ・マリオネット劇場
   * 【常時】光属性［プラント］モンスターの攻撃力を400アップ。
   * 【自分エンドフェイズ時】場に光属性モンスターが3体以上いる場合、相手モンスター1体の攻撃力を500下げ、自分のライフを500回復。
   */
  C0000218: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 光属性［プラント］の攻撃力+400',
      effect: (context) => {
        const { addLog } = context;
        addLog('フルーツ・マリオネット劇場の常時効果: 攻撃力+400（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 光属性3体以上で相手攻撃力-500と500回復',
      effect: (context) => {
        const { addLog } = context;
        const { myField, opponentField } = getPlayerContext(context);

        const lightCount = myField.filter((monster) =>
          monster && monster.attribute === '光'
        ).length;

        if (lightCount >= 3) {
          // 相手モンスター1体の攻撃力を500ダウン
          const targetIndex = opponentField.findIndex((m) => m !== null);
          if (targetIndex !== -1) {
            modifyAttack(context, -500, targetIndex, true, false);
          }

          // 自分のライフを500回復
          healLife(context, 500, true);
          addLog('フルーツ・マリオネット劇場の効果発動', 'info');
        }
      },
    },
  ],

  /**
   * C0000230: 永遠の灯の祈り
   * 初期効果: 【発動時】場にいる光属性モンスターに【魔障壁（相手の魔法の効果を受けない）】を付与。
   */
  C0000230: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '発動時: 光属性に魔障壁を付与',
      effect: (context) => {
        const { addLog } = context;
        addLog('永遠の灯の祈りの効果: 光属性に魔障壁付与（未実装）', 'info');
        // TODO: 魔障壁システムの実装が必要
      },
    },
  ],

  /**
   * C0000234: 撮影会のリリカ
   * 【常時】相手の魔法カードの発動をターンに1度無効化。
   */
  C0000234: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 相手の魔法を1度無効化',
      effect: (context) => {
        const { addLog } = context;
        addLog('撮影会のリリカの常時効果: 魔法無効化（未実装）', 'info');
        // TODO: 魔法無効化システムの実装が必要
      },
    },
  ],

  /**
   * C0000235: プリンセス狂いのリリカ
   * 【召喚時】デッキから《プリティ☆プリンセス》魔法カード1枚を発動する（コストなし）。
   */
  C0000235: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 《プリティ☆プリンセス》をコスト不要で発動',
      effect: (context) => {
        const { addLog } = context;
        addLog('プリンセス狂いのリリカの効果: 《プリティ☆プリンセス》発動（未実装）', 'info');
        // TODO: カード発動システムの実装が必要
      },
    },
  ],

  /**
   * C0000241: ご主人様
   * 【召喚時】SP2を消費してデッキまたは墓地から《リリカ》と名の付くモンスター1体を場に召喚する（攻撃力50％、HP50％）。
   */
  C0000241: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: SP2消費で《リリカ》を特殊召喚',
      effect: (context) => {
        const { addLog } = context;
        const { myActiveSP } = getPlayerContext(context);

        if (myActiveSP < 2) {
          addLog('ご主人様の効果: SPが不足しています', 'info');
          return;
        }

        addLog('ご主人様の効果: 《リリカ》特殊召喚（未実装）', 'info');
        // TODO: 特殊召喚システムの実装が必要
      },
    },
  ],

  /**
   * C0000248: 輝鎖の聖姫ルミリア
   * 【召喚時】場にいる光属性モンスター1体につき相手に500ダメージを与え、ターン終了時まで相手モンスター全体の攻撃力を半分にする。
   * 【常時】場に『鎖縛の幻姫リアノン』または『鎖縛の禁忌姫リアノン・エターナル』がいる場合、このカードの攻撃力を1000アップする。
   */
  C0000248: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 光属性×500ダメージ、相手全体攻撃力半分',
      effect: (context) => {
        const { addLog } = context;
        const { myField, setOpponentField } = getPlayerContext(context);

        // 場の光属性モンスターをカウント
        const lightCount = myField.filter((monster) =>
          monster && monster.attribute === '光'
        ).length;

        if (lightCount > 0) {
          const damage = lightCount * 500;
          conditionalDamage(context, damage, 'opponent');
          addLog(`輝鎖の聖姫ルミリアの効果: 相手に${damage}ダメージ`, 'damage');

          // 相手モンスター全体の攻撃力を半分に
          setOpponentField((prev) => {
            return prev.map((monster) => {
              if (monster) {
                return {
                  ...monster,
                  currentAttack: Math.floor(monster.attack / 2),
                  attackModified: true,
                };
              }
              return monster;
            });
          });
          addLog('相手モンスター全体の攻撃力を半分にした', 'info');
        }
      },
    },
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: リアノンいれば攻撃力+1000',
      effect: (context) => {
        const { monsterIndex } = context;
        const { myField } = getPlayerContext(context);

        const hasRianon = myField.some((monster, idx) =>
          monster &&
          idx !== monsterIndex &&
          monster.name &&
          (monster.name.includes('鎖縛の幻姫リアノン') ||
           monster.name.includes('鎖縛の禁忌姫リアノン・エターナル'))
        );

        if (hasRianon) {
          modifyAttack(context, 1000, monsterIndex, false, true);
        }
      },
    },
  ],

  /**
   * C0000314: 聖光フェニックス
   * 【自壊時】次のターンに攻撃力1500で場に戻る（バトル中1度だけ）。
   */
  C0000314: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 次ターンに攻撃力1500で復活',
      effect: (context) => {
        const { addLog } = context;
        addLog('聖光フェニックスの効果: 次ターンに復活（未実装）', 'info');
        // TODO: 遅延復活システムの実装が必要
      },
    },
  ],

  /**
   * C0000319: 嵐光の騎士
   * 【自分光属性モンスター攻撃時】相手モンスターに300ダメージを与える。
   */
  C0000319: [
    {
      type: TRIGGER_TYPES.ON_ATTRIBUTE_SUMMON_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      displayDescription: '自分光属性モンスター攻撃時',
      description: '光属性攻撃時: 相手モンスターに300ダメージ',
      effect: (context) => {
        const { card, addLog } = context;

        if (card && card.attribute === '光') {
          addLog('嵐光の騎士の効果: 相手モンスターに300ダメージ（未実装）', 'info');
          // TODO: 攻撃時トリガーが必要
        }
      },
    },
  ],

  /**
   * C0000326: 雷嵐の聖域
   * 【常時】場にいる光属性モンスターの攻撃力を500アップ。
   * 【自分エンドフェイズ時】相手モンスターがいる場合、ランダムに1体を「雷撃」状態にする（次のターン中攻撃力-500、技不能）。
   */
  C0000326: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 光属性の攻撃力+500',
      effect: (context) => {
        const { addLog } = context;
        addLog('雷嵐の聖域の常時効果: 攻撃力+500（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 相手1体を「雷撃」状態に',
      effect: (context) => {
        const { addLog } = context;
        const { opponentField } = getPlayerContext(context);

        const opponentMonsters = opponentField.filter((m) => m !== null);
        if (opponentMonsters.length > 0) {
          addLog('雷嵐の聖域の効果: 相手を「雷撃」状態に（未実装）', 'info');
          // TODO: 状態異常システムの実装が必要
        }
      },
    },
  ],

  /**
   * C0000345: ヴォランティス・アルディオン
   * 【召喚時】相手モンスター全体の攻撃力をターン終了時まで500下げる。
   */
  C0000345: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター全体の攻撃力-500',
      effect: (context) => {
        const { addLog } = context;
        const { opponentField, setOpponentField } = getPlayerContext(context);

        const opponentMonsters = opponentField.filter((m) => m !== null);
        if (opponentMonsters.length === 0) {
          addLog('ヴォランティス・アルディオンの効果: 相手フィールドにモンスターがいません', 'info');
          return;
        }

        // 相手モンスター全体の攻撃力を500ダウン
        let count = 0;
        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              count++;
              const newAttack = Math.max(0, monster.currentAttack - 500);
              return {
                ...monster,
                currentAttack: newAttack,
                attackModified: true,
              };
            }
            return monster;
          });
        });

        if (count > 0) {
          addLog(`ヴォランティス・アルディオンの効果: 相手モンスター${count}体の攻撃力-500`, 'info');
        }
      },
    },
  ],

  /**
   * C0000346: ヴォランティス・セラヴェント
   * 【召喚時】デッキから《アヴィクルス》魔法カード1枚を手札に加える。
   */
  C0000346: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 《アヴィクルス》魔法カードをサーチ',
      effect: (context) => {
        const found = searchCard(context, (card) => {
          return card.type === 'magic' &&
                 card.name &&
                 card.name.includes('アヴィクルス');
        });

        if (!found) {
          context.addLog('ヴォランティス・セラヴェントの効果: 対象カードが見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000347: 鳥民の供物者・カルディス
   * 【召喚時】自分の手札1枚を墓地に送り、デッキから《ヴォランティス》モンスター1体を手札に加える。
   */
  C0000347: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 手札1枚捨てて《ヴォランティス》サーチ',
      effect: (context) => {
        const { addLog } = context;
        const { myHand, setMyHand, setMyGraveyard } = getPlayerContext(context);

        if (myHand.length === 0) {
          addLog('鳥民の供物者・カルディスの効果: 手札がありません', 'info');
          return;
        }

        // 手札の最初のカードを墓地に送る
        const discardCard = myHand[0];
        setMyHand((prev) => prev.filter((c) => c.uniqueId !== discardCard.uniqueId));
        setMyGraveyard((prev) => [...prev, discardCard]);
        addLog(`${discardCard.name}を墓地に送った`, 'info');

        // 《ヴォランティス》モンスターをサーチ
        const found = searchCard(context, (card) => {
          return card.type === 'monster' &&
                 card.name &&
                 card.name.includes('ヴォランティス');
        });

        if (!found) {
          addLog('鳥民の供物者・カルディスの効果: 《ヴォランティス》が見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000348: ヴォランティス・ファルクェス
   * 【自分《ヴォランティス》モンスターの攻撃時】相手プレイヤーに300ダメージ。
   */
  C0000348: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      displayDescription: '自分《ヴォランティス》モンスター攻撃時',
      description: '《ヴォランティス》攻撃時: 相手に300ダメージ',
      effect: (context) => {
        const { card, addLog } = context;

        if (card && card.name && card.name.includes('ヴォランティス')) {
          addLog('ヴォランティス・ファルクェスの効果: 相手に300ダメージ', 'damage');
          conditionalDamage(context, 300, 'opponent');
        }
      },
    },
  ],

  /**
   * C0000350: 鳥民の祈り
   * magic: 自分のライフを800回復し、デッキから《アヴィクルス》フィールドカード1枚を手札に加える。
   * Note: magicカードのためトリガーではなく、発動時効果として実装
   */
  C0000350: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '発動時: ライフ800回復、《アヴィクルス》フィールドカードサーチ',
      effect: (context) => {
        const { addLog } = context;

        // ライフ800回復
        healLife(context, 800, true);

        // 《アヴィクルス》フィールドカードをサーチ
        const found = searchCard(context, (card) => {
          return card.type === 'field' &&
                 card.name &&
                 card.name.includes('アヴィクルス');
        });

        if (!found) {
          addLog('鳥民の祈りの効果: 《アヴィクルス》フィールドカードが見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000351: 天翔峰アヴィクルス
   * 【常時】《ヴォランティス》モンスターの攻撃力を700アップ。
   * 【相手モンスター召喚時】対象の攻撃力をターン終了時まで500下げる。
   * 【エンドフェイズ時】場に《ヴォランティス》モンスターがいる場合、自分のライフを500回復。
   */
  C0000351: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 《ヴォランティス》の攻撃力+700',
      effect: (context) => {
        const { addLog } = context;
        addLog('天翔峰アヴィクルスの常時効果: 攻撃力+700（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_OPPONENT_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手召喚時: 攻撃力-500',
      effect: (context) => {
        const { slotIndex, addLog } = context;
        modifyAttack(context, -500, slotIndex, true, false);
        addLog('天翔峰アヴィクルスの効果: 召喚されたモンスターの攻撃力-500', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 《ヴォランティス》いれば500回復',
      effect: (context) => {
        const { myField } = getPlayerContext(context);

        const hasVolantis = myField.some((monster) =>
          monster && monster.name && monster.name.includes('ヴォランティス')
        );

        if (hasVolantis) {
          healLife(context, 500, true);
        }
      },
    },
  ],

  /**
   * C0000352: アヴィクルスの試練
   * 初期効果: 【常時】《ヴォランティス》モンスターの攻撃力を400アップ。
   */
  C0000352: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 《ヴォランティス》の攻撃力+400',
      effect: (context) => {
        const { addLog } = context;
        addLog('アヴィクルスの試練の常時効果: 攻撃力+400（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
  ],

  /**
   * C0000374: 虹羽密林の輝甲虫・ルクセリオ
   * 【自分エンドフェイズ時】自分のライフを400回復し、デッキの上から1枚を墓地に送る。
   */
  C0000374: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 400回復、1枚ミル',
      effect: (context) => {
        healLife(context, 400, true);
        millDeck(context, 1);
      },
    },
  ],

  /**
   * C0000378: 虹羽密林の金胞草・ファルネシア
   * 【常時】自分の《虹羽密林》モンスターが召喚されるたび、そのモンスターの攻撃力をターン終了時まで400アップ。
   */
  C0000378: [
    {
      type: TRIGGER_TYPES.ON_ATTRIBUTE_SUMMON_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      displayDescription: '自分《虹羽密林》モンスター召喚時',
      description: '《虹羽密林》召喚時: 攻撃力+400',
      effect: (context) => {
        const { card, slotIndex, addLog } = context;

        if (card && card.name && card.name.includes('虹羽密林')) {
          modifyAttack(context, 400, slotIndex, false, false);
          addLog(`虹羽密林の金胞草・ファルネシアの効果: ${card.name}の攻撃力+400`, 'info');
        }
      },
    },
  ],

  /**
   * C0000397: 呪術狩りの聖焔騎士レオノーラ
   * 【常時】相手の闇属性モンスターが受けるダメージを400アップ。
   */
  C0000397: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 相手の闇属性が受けるダメージ+400',
      effect: (context) => {
        const { addLog } = context;
        addLog('呪術狩りの聖焔騎士レオノーラの常時効果: ダメージ増加（未実装）', 'info');
        // TODO: ダメージ増加システムの実装が必要
      },
    },
  ],
};

/**
 * 光属性カードがトリガー実装を持っているかチェック
 * @param {string} cardId - カードID
 * @returns {boolean} トリガー実装を持っている場合true
 */
export const hasLightCardTrigger = (cardId) => {
  return cardId && lightCardTriggers[cardId] !== undefined;
};

/**
 * 光属性カードのトリガーを取得
 * @param {string} cardId - カードID
 * @returns {Array|null} トリガー配列、または null
 */
export const getLightCardTriggers = (cardId) => {
  if (!cardId || !lightCardTriggers[cardId]) {
    return null;
  }
  return lightCardTriggers[cardId];
};

/**
 * 実装済み光属性カード数を取得
 * @returns {number} 実装済みカード数
 */
export const getLightCardCount = () => {
  return Object.keys(lightCardTriggers).length;
};
