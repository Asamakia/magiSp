/**
 * 原始属性カードのトリガー実装
 *
 * このファイルには原始属性カードの個別トリガー効果を実装します。
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
  modifyHP,
} from '../effectHelpers';

/**
 * 原始属性カードのトリガー定義
 * カードID => トリガー配列のマッピング
 */
export const primitiveCardTriggers = {
  /**
   * C0000001: 粘液獣・開花
   * 【自分エンドフェイズ時】このカードは分裂する。場にこのカードが3体以上いる場合分裂不可
   * 【自壊時】破壊された時一度だけ「粘液獣の種子（攻撃力0HP100）」を場に生成する。
   */
  C0000001: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: 分裂する（場に3体未満の場合）',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          card,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        // 場の粘液獣・開花の数をカウント
        const bloomerCount = currentField.filter(
          (m) => m && m.id === 'C0000001'
        ).length;

        if (bloomerCount >= 3) {
          addLog('粘液獣・開花: 場に3体以上いるため分裂できない', 'info');
          return;
        }

        // 空きスロットを探す
        const emptySlotIndex = currentField.findIndex((slot) => slot === null);
        if (emptySlotIndex === -1) {
          addLog('粘液獣・開花: 場が満杯のため分裂できない', 'info');
          return;
        }

        // 分裂: 攻撃力半分のコピーを生成
        const copy = {
          ...card,
          uniqueId: `${card.id}_split_${Date.now()}`,
          attack: Math.floor(card.attack / 2),
          currentAttack: Math.floor(card.attack / 2),
        };

        const newField = [...currentField];
        newField[emptySlotIndex] = copy;
        setField(newField);

        addLog('粘液獣・開花が分裂した！', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 粘液獣の種子（攻撃力0HP100）を場に生成',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        // 空きスロットを探す
        const emptySlotIndex = currentField.findIndex((slot) => slot === null);
        if (emptySlotIndex === -1) {
          addLog('粘液獣・開花: 場が満杯のため種子を生成できない', 'info');
          return;
        }

        // 粘液獣の種子を生成
        const seed = {
          id: 'C0000001_SEED',
          uniqueId: `C0000001_SEED_${Date.now()}`,
          name: '粘液獣の種子',
          attribute: '原始',
          cost: 1,
          type: 'monster',
          attack: 0,
          hp: 100,
          currentAttack: 0,
          currentHp: 100,
          category: '【プラント】【スライム】',
          canAttack: false,
        };

        const newField = [...currentField];
        newField[emptySlotIndex] = seed;
        setField(newField);

        addLog('粘液獣・開花が破壊され、粘液獣の種子を生成した！', 'info');
      },
    },
  ],

  /**
   * C0000004: ゴミあさり粘液獣
   * 【召喚時】墓地の《粘液獣》モンスター1体を攻撃力半減して場に戻す。
   * 【召喚時】このターンはダイレクトアタック可能。
   */
  C0000004: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      priority: TRIGGER_PRIORITIES.HIGH,
      description: '召喚時: 墓地の粘液獣を攻撃力半減で復活',
      effect: (context) => {
        return reviveFromGraveyard(
          context,
          (card) => {
            return (
              card.type === 'monster' &&
              card.category &&
              card.category.includes('【スライム】')
            );
          },
          true // 弱体化
        );
      },
    },
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      priority: TRIGGER_PRIORITIES.NORMAL,
      description: '召喚時: このターンはダイレクトアタック可能',
      effect: (context) => {
        const { card, addLog } = context;
        // TODO: ダイレクトアタック許可フラグの実装が必要
        addLog(
          'ゴミあさり粘液獣: このターンはダイレクトアタック可能！',
          'info'
        );
        // 実装時にcard.canDirectAttack = trueのようなフラグを設定
      },
    },
  ],

  /**
   * C0000005: 苗床粘液獣
   * 【自分メインフェイズ時】、1ターンに1度、場に粘液獣が3体以上いる場合、相手モンスター1体を捕食して自身の攻撃力をアップ（捕食1体につき300、最大1500まで）。
   * 【自壊時】このカードは1度だけ破壊されると効果無効で墓地から復活。
   */
  C0000005: [
    {
      type: TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description:
        'メイン時: 場に粘液獣3体以上で相手モンスター捕食（攻撃力+300）',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          card,
          slotIndex,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        // 場の粘液獣の数をカウント
        const slimeCount = currentField.filter(
          (m) => m && m.category && m.category.includes('【スライム】')
        ).length;

        if (slimeCount < 3) {
          addLog(
            '苗床粘液獣: 場に粘液獣が3体未満のため捕食できない',
            'info'
          );
          return false;
        }

        // 相手モンスターを破壊可能かチェック
        const targetIndex = opponentField.findIndex((m) => m !== null);
        if (targetIndex === -1) {
          addLog('苗床粘液獣: 捕食する対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        // 現在は最初のモンスターを対象とする
        destroyMonster(context, targetIndex, true);

        // 攻撃力アップ（最大1500まで）
        const currentField2 = currentPlayer === 1 ? p1Field : p2Field;
        const currentMonster = currentField2[slotIndex];
        if (currentMonster) {
          const currentBonus = (currentMonster.currentAttack || currentMonster.attack) - currentMonster.attack;
          if (currentBonus < 1500) {
            modifyAttack(context, 300, slotIndex, false, true);
            addLog('苗床粘液獣が相手モンスターを捕食し、攻撃力+300！', 'info');
          } else {
            addLog('苗床粘液獣: 攻撃力上昇は最大値に達している', 'info');
          }
        }

        return true;
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 1度だけ効果無効で復活',
      effect: (context) => {
        const { card, addLog } = context;

        // 復活済みフラグをチェック
        if (card.hasRevived) {
          addLog('苗床粘液獣: すでに1度復活済みのため復活できない', 'info');
          return false;
        }

        // 復活処理
        const revivedCard = {
          ...card,
          hasRevived: true,
          currentHp: card.hp,
          effectDisabled: true,
        };

        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          slotIndex,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        const newField = [...currentField];
        newField[slotIndex] = revivedCard;
        setField(newField);

        addLog('苗床粘液獣が効果無効で復活した！', 'info');
        return true;
      },
    },
  ],

  /**
   * C0000006: 新・超覚醒粘液獣ハイパー
   * 【召喚時】場にいる粘液獣1体につき、自身の攻撃力を1000アップ。
   */
  C0000006: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 場の粘液獣1体につき攻撃力+1000',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          slotIndex,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;

        // 場の粘液獣の数をカウント（自身を除く）
        const slimeCount = currentField.filter(
          (m, idx) =>
            m &&
            idx !== slotIndex &&
            m.category &&
            m.category.includes('【スライム】')
        ).length;

        if (slimeCount > 0) {
          const boost = slimeCount * 1000;
          modifyAttack(context, boost, slotIndex, false, true);
          addLog(
            `新・超覚醒粘液獣ハイパーの召喚時効果: 攻撃力+${boost}！`,
            'info'
          );
        } else {
          addLog(
            '新・超覚醒粘液獣ハイパー: 場に他の粘液獣がいないため強化なし',
            'info'
          );
        }
      },
    },
  ],

  /**
   * C0000008: 粘液獣・胞子
   * 【召喚時】デッキから《粘液獣》と名の付くカード1枚を手札に加える。
   */
  C0000008: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: デッキから粘液獣カードをサーチ',
      effect: (context) => {
        const foundCard = searchCard(context, (card) => {
          return (
            card.name &&
            (card.name.includes('粘液獣') || card.name.includes('スライム'))
          );
        });

        if (foundCard) {
          const { addLog } = context;
          addLog(`粘液獣・胞子: ${foundCard.name}を手札に加えた`, 'info');
          return true;
        }
        return false;
      },
    },
  ],

  /**
   * C0000010: 粘液獣・融合体
   * 【召喚時】このカードと場の他の《粘液獣》1体を融合し、このカードの攻撃力を融合素材の合計に変更する。
   */
  C0000010: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 場の粘液獣1体と融合して攻撃力を合計値に',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          slotIndex,
          card,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        // 他の粘液獣を探す
        const targetIndex = currentField.findIndex(
          (m, idx) =>
            m &&
            idx !== slotIndex &&
            m.category &&
            m.category.includes('【スライム】')
        );

        if (targetIndex === -1) {
          addLog('粘液獣・融合体: 融合する対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        const target = currentField[targetIndex];
        const totalAttack =
          (card.currentAttack || card.attack) +
          (target.currentAttack || target.attack);

        // 対象を破壊
        const newField = [...currentField];
        newField[targetIndex] = null;

        // 融合体の攻撃力を更新
        const fusedCard = {
          ...card,
          attack: totalAttack,
          currentAttack: totalAttack,
        };
        newField[slotIndex] = fusedCard;

        setField(newField);
        addLog(
          `粘液獣・融合体が${target.name}と融合！攻撃力が${totalAttack}になった！`,
          'info'
        );
        return true;
      },
    },
  ],

  /**
   * C0000011: 粘液獣・暴走体
   * 【召喚時】場にいる《粘液獣》1体を破壊し、そのコスト×300ダメージを相手プレイヤーに与える。
   */
  C0000011: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 場の粘液獣1体を破壊してコスト×300ダメージ',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;

        // 粘液獣を探す
        const targetIndex = currentField.findIndex(
          (m) => m && m.category && m.category.includes('【スライム】')
        );

        if (targetIndex === -1) {
          addLog('粘液獣・暴走体: 破壊する対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        const target = currentField[targetIndex];
        const damage = (target.cost || 0) * 300;

        destroyMonster(context, targetIndex, false);
        conditionalDamage(context, damage, 'opponent');

        addLog(
          `粘液獣・暴走体が${target.name}を破壊し、${damage}ダメージ！`,
          'damage'
        );
        return true;
      },
    },
  ],

  /**
   * C0000127: ゴシック・ローズ
   * 【召喚時】デッキから《ゴシック》または《鎖》魔法カード1枚を手札に加える。
   * 【自壊時】相手に400ダメージ。
   */
  C0000127: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: デッキから《ゴシック》/《鎖》魔法カードをサーチ',
      effect: (context) => {
        const foundCard = searchCard(context, (card) => {
          return (
            card.type === 'magic' &&
            card.name &&
            (card.name.includes('ゴシック') || card.name.includes('鎖'))
          );
        });

        if (foundCard) {
          const { addLog } = context;
          addLog(`ゴシック・ローズ: ${foundCard.name}を手札に加えた`, 'info');
          return true;
        }
        return false;
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 相手に400ダメージ',
      effect: (context) => {
        conditionalDamage(context, 400, 'opponent');
        return true;
      },
    },
  ],

  /**
   * C0000128: 鎖縛のメイド
   * 【召喚時】相手モンスター1体の攻撃力をターン終了時まで0にする。
   */
  C0000128: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター1体の攻撃力を0に',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          addLog,
        } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        // 対象を探す
        const targetIndex = opponentField.findIndex((m) => m !== null);
        if (targetIndex === -1) {
          addLog('鎖縛のメイド: 対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        const target = opponentField[targetIndex];
        const newField = [...opponentField];
        newField[targetIndex] = {
          ...target,
          currentAttack: 0,
          attackSealedUntilEndPhase: true,
        };
        setOpponentField(newField);

        addLog(
          `鎖縛のメイドが${target.name}の攻撃力を0にした！`,
          'info'
        );
        return true;
      },
    },
  ],

  /**
   * C0000130: 檻の中の歌姫
   * 【召喚時】相手の場にいるモンスター1体を檻に閉じ込め、1ターン行動不能にする（効果無効）、相手は次のターン開始時にSP1で解除可能。
   */
  C0000130: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター1体を1ターン行動不能に',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          addLog,
        } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        // 対象を探す
        const targetIndex = opponentField.findIndex((m) => m !== null);
        if (targetIndex === -1) {
          addLog('檻の中の歌姫: 対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        const target = opponentField[targetIndex];
        const newField = [...opponentField];
        newField[targetIndex] = {
          ...target,
          canAttack: false,
          effectDisabled: true,
          caged: true, // 檻フラグ
          cageReleaseCost: 1,
        };
        setOpponentField(newField);

        addLog(
          `檻の中の歌姫が${target.name}を檻に閉じ込めた！`,
          'info'
        );
        return true;
      },
    },
  ],

  /**
   * C0000131: 鎖の守護者
   * 【召喚時】このカードに「守護（1度だけダメージ半減）」を付与する。
   */
  C0000131: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 守護（1度だけダメージ半減）を付与',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          slotIndex,
          card,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        const newField = [...currentField];
        newField[slotIndex] = {
          ...card,
          hasGuardian: true, // 守護フラグ
        };
        setField(newField);

        addLog('鎖の守護者に守護が付与された！', 'info');
        return true;
      },
    },
  ],

  /**
   * C0000311: 粘液獣・暴君
   * 【召喚時】場にいるモンスター1体を破壊する。
   * 【自分エンドフェイズ時】相手プレイヤーに400ダメージを与える。
   */
  C0000311: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 場のモンスター1体を破壊',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          addLog,
        } = context;

        // 自分か相手の場のモンスターを破壊可能
        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;

        // まず相手の場を優先
        let targetIndex = opponentField.findIndex((m) => m !== null);
        let isOpponent = true;

        if (targetIndex === -1) {
          // 相手がいなければ自分の場
          targetIndex = currentField.findIndex((m) => m !== null);
          isOpponent = false;
        }

        if (targetIndex === -1) {
          addLog('粘液獣・暴君: 破壊する対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        destroyMonster(context, targetIndex, isOpponent);
        addLog('粘液獣・暴君が召喚時にモンスターを破壊した！', 'info');
        return true;
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: 相手に400ダメージ',
      effect: (context) => {
        conditionalDamage(context, 400, 'opponent');
        return true;
      },
    },
  ],

  /**
   * C0000353: ヴォランティス・エテルノス
   * 【犠現】: 自分の場からモンスター1体を破壊し、そのコスト分このカードのSPコストを軽減（最大3軽減）。
   */
  C0000353: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時（犠現）: 場のモンスター破壊でコスト軽減済み',
      effect: (context) => {
        const { addLog } = context;
        // 犠現効果は召喚コスト支払い時に処理済み
        // このトリガーは記録用
        addLog('ヴォランティス・エテルノスが犠現効果で召喚された', 'info');
        return true;
      },
    },
  ],

  /**
   * C0000404: 呪森の狼王グリムヴァルド
   * 【自分エンドフェイズ時】相手プレイヤーに300ダメージを与える。
   */
  C0000404: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: 相手に300ダメージ',
      effect: (context) => {
        conditionalDamage(context, 300, 'opponent');
        return true;
      },
    },
  ],

  /**
   * C0000405: 灰塵の骨翼アッシュドラゴン
   * 【自攻撃時】相手モンスターに与えるダメージを300アップ。
   */
  C0000405: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: ダメージ+300',
      effect: (context) => {
        const { addLog } = context;
        // TODO: 実際のダメージ計算時に適用する仕組みが必要
        addLog('灰塵の骨翼アッシュドラゴン: 攻撃ダメージ+300！', 'info');
        // 実装時にcard.attackBonus = 300のようなフラグを設定
        return true;
      },
    },
  ],

  /**
   * C0000413: 群狼長ヴァルグレイス
   * 【自攻撃時】相手モンスターの攻撃力がこのカードより低い場合、そのダメージを400アップ。
   */
  C0000413: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 相手が弱い場合ダメージ+400',
      effect: (context) => {
        const { card, addLog } = context;
        // TODO: 対象モンスターの攻撃力と比較する仕組みが必要
        addLog(
          '群狼長ヴァルグレイス: 相手が弱い場合、攻撃ダメージ+400！',
          'info'
        );
        // 実装時に対象との比較とダメージボーナス適用
        return true;
      },
    },
  ],

  /**
   * C0000415: 呪影の牙狼ウルフェイン
   * 【自攻撃時】相手の反撃ダメージを受けない。
   */
  C0000415: [
    {
      type: TRIGGER_TYPES.ON_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '攻撃時: 反撃ダメージ無効',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          slotIndex,
          card,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        const newField = [...currentField];
        newField[slotIndex] = {
          ...card,
          noCounterDamage: true, // 反撃無効フラグ
        };
        setField(newField);

        addLog('呪影の牙狼ウルフェイン: 反撃ダメージを受けない！', 'info');
        return true;
      },
    },
  ],

  /**
   * C0000416: 霧角の鹿ケルニグリス
   * 【自分エンドフェイズ時】自分のライフを300回復。
   */
  C0000416: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: ライフ300回復',
      effect: (context) => {
        healLife(context, 300, true);
        return true;
      },
    },
  ],

  /**
   * C0000417: 棘の剛毛猪イノブリスト
   * 【被攻撃時】このカードが与える反撃は50％で計算する。
   */
  C0000417: [
    {
      type: TRIGGER_TYPES.ON_ATTACKED,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '被攻撃時: 反撃ダメージ50%',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          slotIndex,
          card,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        const newField = [...currentField];
        newField[slotIndex] = {
          ...card,
          counterDamageRate: 0.5, // 反撃50%
        };
        setField(newField);

        addLog('棘の剛毛猪イノブリスト: 反撃ダメージ50%！', 'info');
        return true;
      },
    },
  ],

  /**
   * C0000003: 粘液獣の群生地 (フィールドカード)
   * 【自分エンドフェイズ時】場にいる粘液獣1体につき相手プレイヤーに300ダメージを与える。
   */
  C0000003: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: 場の粘液獣1体につき相手に300ダメージ',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;

        // 粘液獣の数をカウント
        const slimeCount = currentField.filter(
          (m) => m && m.category && m.category.includes('【スライム】')
        ).length;

        if (slimeCount > 0) {
          const damage = slimeCount * 300;
          conditionalDamage(context, damage, 'opponent');
          addLog(
            `粘液獣の群生地: 粘液獣${slimeCount}体で${damage}ダメージ！`,
            'damage'
          );
        }
        return true;
      },
    },
  ],

  /**
   * C0000019: 粘液の巣窟 (フィールドカード)
   * 【自分エンドフェイズ時】墓地の《粘液獣》1体を場に戻す。
   * 【自分エンドフェイズ時】場に《粘液獣》が3体以上いる場合、自分のライフを500回復。
   */
  C0000019: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      priority: TRIGGER_PRIORITIES.HIGH,
      description: 'エンド時: 墓地の粘液獣1体を復活',
      effect: (context) => {
        return reviveFromGraveyard(
          context,
          (card) => {
            return (
              card.type === 'monster' &&
              card.category &&
              card.category.includes('【スライム】')
            );
          },
          false // 弱体化なし
        );
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      priority: TRIGGER_PRIORITIES.NORMAL,
      description: 'エンド時: 粘液獣3体以上でライフ500回復',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;

        // 粘液獣の数をカウント
        const slimeCount = currentField.filter(
          (m) => m && m.category && m.category.includes('【スライム】')
        ).length;

        if (slimeCount >= 3) {
          healLife(context, 500, true);
          addLog('粘液の巣窟: 粘液獣3体以上でライフ500回復！', 'heal');
          return true;
        } else {
          addLog('粘液の巣窟: 粘液獣が3体未満のため回復なし', 'info');
          return false;
        }
      },
    },
  ],

  /**
   * C0000139: ゴシック・フォートレス (フィールドカード)
   * 【自分エンドフェイズ時】相手モンスター全体に300ダメージ。
   */
  C0000139: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: 相手モンスター全体に300ダメージ',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          addLog,
        } = context;

        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        let damageDealt = false;
        const newField = opponentField.map((monster) => {
          if (monster) {
            damageDealt = true;
            const newHp = (monster.currentHp || monster.hp) - 300;
            return {
              ...monster,
              currentHp: Math.max(0, newHp),
            };
          }
          return monster;
        });

        if (damageDealt) {
          setOpponentField(newField);
          addLog(
            'ゴシック・フォートレス: 相手モンスター全体に300ダメージ！',
            'damage'
          );
        }

        return damageDealt;
      },
    },
  ],

  /**
   * C0000141: 禁忌の檻 (フィールドカード)
   * 【自分エンドフェイズ時】場にいる《ゴシック》モンスター1体につき、相手モンスター1体に300ダメージ。
   */
  C0000141: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: ゴシックモンスター1体につき相手に300ダメージ',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          setP1Field,
          setP2Field,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        // ゴシックモンスターの数をカウント
        const gothicCount = currentField.filter(
          (m) => m && m.name && m.name.includes('ゴシック')
        ).length;

        if (gothicCount === 0) {
          addLog('禁忌の檻: ゴシックモンスターがいないためダメージなし', 'info');
          return false;
        }

        // 相手モンスターにダメージ
        let damageCount = 0;
        const newField = opponentField.map((monster) => {
          if (monster && damageCount < gothicCount) {
            damageCount++;
            const newHp = (monster.currentHp || monster.hp) - 300;
            return {
              ...monster,
              currentHp: Math.max(0, newHp),
            };
          }
          return monster;
        });

        if (damageCount > 0) {
          setOpponentField(newField);
          addLog(
            `禁忌の檻: ゴシック${gothicCount}体で相手に${damageCount * 300}ダメージ！`,
            'damage'
          );
        }

        return damageCount > 0;
      },
    },
  ],

  /**
   * C0000366: 天翔秘島 (フィールドカード)
   * 【自分エンドフェイズ時】自分の属性ごとの《ヴォランティス》モンスター1体につき、以下の効果を適用
   */
  C0000366: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: 属性ごとのヴォランティスで効果発動',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field,
          p2Field,
          addLog,
        } = context;

        const currentField = currentPlayer === 1 ? p1Field : p2Field;

        // 属性別のヴォランティスモンスターをカウント
        const attributeCounts = {};
        currentField.forEach((monster) => {
          if (monster && monster.name && monster.name.includes('ヴォランティス')) {
            const attr = monster.attribute || 'なし';
            attributeCounts[attr] = (attributeCounts[attr] || 0) + 1;
          }
        });

        const attributeCount = Object.keys(attributeCounts).length;

        if (attributeCount === 0) {
          addLog('天翔秘島: ヴォランティスモンスターがいない', 'info');
          return false;
        }

        // 属性ごとに効果を適用（簡略版）
        // TODO: 完全な実装には各属性の効果を定義する必要がある
        let totalEffect = 0;
        Object.entries(attributeCounts).forEach(([attr, count]) => {
          totalEffect += count;
        });

        addLog(
          `天翔秘島: ${attributeCount}属性のヴォランティスで効果発動！`,
          'info'
        );

        // 簡易的に回復効果を適用
        healLife(context, totalEffect * 100, true);

        return true;
      },
    },
  ],
};

/**
 * 原始属性カードがトリガー実装を持っているかチェック
 * @param {string} cardId - カードID
 * @returns {boolean} トリガー実装を持っている場合true
 */
export const hasPrimitiveCardTrigger = (cardId) => {
  return cardId && primitiveCardTriggers[cardId] !== undefined;
};

/**
 * 原始属性カードのトリガーを取得
 * @param {string} cardId - カードID
 * @returns {Array|null} トリガー配列、または null
 */
export const getPrimitiveCardTriggers = (cardId) => {
  if (!cardId || !primitiveCardTriggers[cardId]) {
    return null;
  }
  return primitiveCardTriggers[cardId];
};

/**
 * 実装済み原始属性カード数を取得
 * @returns {number} 実装済みカード数
 */
export const getPrimitiveCardCount = () => {
  return Object.keys(primitiveCardTriggers).length;
};
