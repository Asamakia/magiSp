/**
 * 原始属性カードのトリガー実装
 *
 * このファイルには原始属性カードの個別トリガー効果を実装します。
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
        const { card, addLog } = context;
        const { myField, setMyField, currentPlayer } = getPlayerContext(context);

        // 場の粘液獣・開花の数をカウント
        const bloomerCount = myField.filter(
          (m) => m && m.id === 'C0000001'
        ).length;

        if (bloomerCount >= 3) {
          addLog('粘液獣・開花: 場に3体以上いるため分裂できない', 'info');
          return;
        }

        // 空きスロットを探す
        const emptySlotIndex = myField.findIndex((slot) => slot === null);
        if (emptySlotIndex === -1) {
          addLog('粘液獣・開花: 場が満杯のため分裂できない', 'info');
          return;
        }

        // 分裂: 同じステータスのコピーを生成
        const copy = {
          ...card,
          uniqueId: `${card.id}_split_${Date.now()}`,
          attack: card.attack,
          currentAttack: card.currentAttack || card.attack,
          hp: card.hp,
          currentHp: card.currentHp || card.hp,
          canAttack: card.canAttack, // 分裂前と同じ状態を引き継ぐ
          charges: [],
          statusEffects: [],
          owner: currentPlayer,
        };

        const newField = [...myField];
        newField[emptySlotIndex] = copy;
        setMyField(newField);

        addLog('粘液獣・開花が分裂した！', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 粘液獣の種子（攻撃力0HP100）を場に生成',
      effect: (context) => {
        const { addLog } = context;
        const { myField, setMyField, currentPlayer } = getPlayerContext(context);

        // 空きスロットを探す
        const emptySlotIndex = myField.findIndex((slot) => slot === null);
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
          owner: currentPlayer, // 常時効果のターゲット判定用
          charges: [],
          statusEffects: [],
        };

        const newField = [...myField];
        newField[emptySlotIndex] = seed;
        setMyField(newField);

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
              hasCategory(card, '【スライム】')
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
        const { slotIndex, addLog } = context;
        const { setMyField } = getPlayerContext(context);

        // ダイレクトアタック許可フラグを設定
        setMyField((prev) =>
          prev.map((m, idx) => {
            if (idx === slotIndex && m) {
              return { ...m, canDirectAttackThisTurn: true };
            }
            return m;
          })
        );

        addLog(
          'ゴミあさり粘液獣: このターンはダイレクトアタック可能！',
          'info'
        );
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
        const { card, slotIndex, addLog, setPendingMonsterTarget } = context;
        const { myField, setMyField, opponentField } = getPlayerContext(context);

        // 場の粘液獣の数をカウント
        const slimeCount = myField.filter(
          (m) => m && hasCategory(m, '【スライム】')
        ).length;

        if (slimeCount < 3) {
          addLog(
            '苗床粘液獣: 場に粘液獣が3体未満のため捕食できない',
            'info'
          );
          return false;
        }

        // 相手モンスターがいるかチェック
        const hasOpponentMonster = opponentField.some((m) => m !== null);
        if (!hasOpponentMonster) {
          addLog('苗床粘液獣: 捕食する対象がいない', 'info');
          return false;
        }

        // 攻撃力上限チェック
        const currentMonster = myField[slotIndex];
        if (currentMonster) {
          const baseAttack = currentMonster.attack - (currentMonster.predationBonus || 0);
          const currentBonus = currentMonster.predationBonus || 0;
          if (currentBonus >= 1500) {
            addLog('苗床粘液獣: 攻撃力上昇は最大値(+1500)に達している', 'info');
            return false;
          }
        }

        // モンスター選択UIを表示
        setPendingMonsterTarget({
          message: '捕食する相手モンスターを選択してください',
          targetPlayer: 'opponent',
          callback: (targetIndex) => {
            // 破壊処理
            destroyMonster(context, targetIndex, true);

            // 攻撃力アップ（最大1500まで）
            modifyAttack(context, 300, slotIndex, false, true);

            // 捕食ボーナスを記録（上限管理用）
            setMyField((prev) =>
              prev.map((m, idx) => {
                if (idx === slotIndex && m) {
                  return {
                    ...m,
                    predationBonus: (m.predationBonus || 0) + 300,
                  };
                }
                return m;
              })
            );

            addLog('苗床粘液獣が相手モンスターを捕食した！', 'info');
          },
        });

        return true;
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 1度だけ効果無効で復活',
      effect: (context) => {
        const { card, addLog, slotIndex } = context;

        // 復活済みフラグをチェック
        if (card.hasRevived) {
          addLog('苗床粘液獣: すでに1度復活済みのため復活できない', 'info');
          return false;
        }

        const { myField, setMyField, currentPlayer } = getPlayerContext(context);

        // 復活処理
        const revivedCard = {
          ...card,
          hasRevived: true,
          currentHp: card.hp,
          effectDisabled: true,
          owner: currentPlayer, // 常時効果のターゲット判定用（再設定）
        };

        const newField = [...myField];
        newField[slotIndex] = revivedCard;
        setMyField(newField);

        addLog('苗床粘液獣が効果無効で復活した！', 'info');
        return true;
      },
    },
  ],

  /**
   * C0000006: 新・超覚醒粘液獣ハイパー
   * 【召喚時】場にいる粘液獣1体につき、自身の攻撃力を1000アップ。
   * 【基本技】相手モンスター1体を飲み込む（2ターン後に消化、破壊時は吐き出す）
   */
  C0000006: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 場の粘液獣1体につき攻撃力+1000',
      effect: (context) => {
        const { slotIndex, addLog } = context;
        const { myField } = getPlayerContext(context);

        // 場の粘液獣の数をカウント（自身を除く）
        const slimeCount = myField.filter(
          (m, idx) =>
            m &&
            idx !== slotIndex &&
            hasCategory(m, '【スライム】')
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
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンド時: 飲み込んだモンスターを消化中',
      effect: (context) => {
        const { slotIndex, card, addLog } = context;
        const { setMyField, setOpponentGraveyard } = getPlayerContext(context);

        // 飲み込んだモンスターがいない場合はスキップ
        if (!card || !card.swallowedMonster) {
          return;
        }

        const newDigestCounter = (card.digestCounter || 1) - 1;

        if (newDigestCounter <= 0) {
          // 消化完了：相手の墓地に送る
          const digestedMonster = { ...card.swallowedMonster };
          delete digestedMonster.originalSlotIndex;

          setOpponentGraveyard((prev) => [...prev, digestedMonster]);

          // 飲み込み情報をクリア
          setMyField((prev) =>
            prev.map((m, idx) => {
              if (idx === slotIndex && m) {
                const updated = { ...m };
                delete updated.swallowedMonster;
                delete updated.digestCounter;
                return updated;
              }
              return m;
            })
          );

          addLog(
            `新・超覚醒粘液獣ハイパーが${digestedMonster.name}を完全に消化した！`,
            'damage'
          );
        } else {
          // 消化中：カウンターを減らす
          setMyField((prev) =>
            prev.map((m, idx) => {
              if (idx === slotIndex && m) {
                return { ...m, digestCounter: newDigestCounter };
              }
              return m;
            })
          );

          addLog(
            `新・超覚醒粘液獣ハイパーが${card.swallowedMonster.name}を消化中...（あと${newDigestCounter}ターン）`,
            'info'
          );
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 飲み込んだモンスターを吐き出す',
      effect: (context) => {
        const { card, addLog } = context;
        const { opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

        // 飲み込んだモンスターがいない場合はスキップ
        if (!card || !card.swallowedMonster) {
          return;
        }

        const swallowed = card.swallowedMonster;

        // 相手フィールドの空きスロットを探す
        const emptySlotIndex = opponentField.findIndex((slot) => slot === null);

        if (emptySlotIndex !== -1) {
          // 空きがあればフィールドに戻す
          const restoredMonster = {
            ...swallowed,
            canAttack: false, // 戻った直後は攻撃不可
            currentHp: swallowed.currentHp || swallowed.hp,
            currentAttack: swallowed.currentAttack || swallowed.attack,
          };
          delete restoredMonster.originalSlotIndex;

          setOpponentField((prev) => {
            const newField = [...prev];
            newField[emptySlotIndex] = restoredMonster;
            return newField;
          });

          addLog(
            `新・超覚醒粘液獣ハイパーが破壊され、${swallowed.name}が吐き出された！`,
            'info'
          );
        } else {
          // 空きがなければ墓地に送る
          const deadMonster = { ...swallowed };
          delete deadMonster.originalSlotIndex;

          setOpponentGraveyard((prev) => [...prev, deadMonster]);

          addLog(
            `新・超覚醒粘液獣ハイパーが破壊されたが、場が満杯のため${swallowed.name}は墓地へ`,
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
        const { slotIndex, card, addLog } = context;
        const { myField, setMyField } = getPlayerContext(context);

        // 他の粘液獣を探す
        const targetIndex = myField.findIndex(
          (m, idx) =>
            m &&
            idx !== slotIndex &&
            hasCategory(m, '【スライム】')
        );

        if (targetIndex === -1) {
          addLog('粘液獣・融合体: 融合する対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        const target = myField[targetIndex];
        const totalAttack =
          (card.currentAttack || card.attack) +
          (target.currentAttack || target.attack);

        // 対象を破壊
        const newField = [...myField];
        newField[targetIndex] = null;

        // 融合体の攻撃力を更新
        const fusedCard = {
          ...card,
          attack: totalAttack,
          currentAttack: totalAttack,
        };
        newField[slotIndex] = fusedCard;

        setMyField(newField);
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
        const { addLog } = context;
        const { myField } = getPlayerContext(context);

        // 粘液獣を探す
        const targetIndex = myField.findIndex(
          (m) => m && hasCategory(m, '【スライム】')
        );

        if (targetIndex === -1) {
          addLog('粘液獣・暴走体: 破壊する対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        const target = myField[targetIndex];
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
        const { addLog } = context;
        const { opponentField, setOpponentField } = getPlayerContext(context);

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
        const { addLog } = context;
        const { opponentField, setOpponentField } = getPlayerContext(context);

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
        const { slotIndex, card, addLog } = context;
        const { myField, setMyField } = getPlayerContext(context);

        const newField = [...myField];
        newField[slotIndex] = {
          ...card,
          hasGuardian: true, // 守護フラグ
        };
        setMyField(newField);

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
        const { addLog } = context;
        const { myField, opponentField } = getPlayerContext(context);

        // まず相手の場を優先
        let targetIndex = opponentField.findIndex((m) => m !== null);
        let isOpponent = true;

        if (targetIndex === -1) {
          // 相手がいなければ自分の場
          targetIndex = myField.findIndex((m) => m !== null);
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
        const { slotIndex, card, addLog } = context;
        const { myField, setMyField } = getPlayerContext(context);

        const newField = [...myField];
        newField[slotIndex] = {
          ...card,
          noCounterDamage: true, // 反撃無効フラグ
        };
        setMyField(newField);

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
        const { slotIndex, card, addLog } = context;
        const { myField, setMyField } = getPlayerContext(context);

        const newField = [...myField];
        newField[slotIndex] = {
          ...card,
          counterDamageRate: 0.5, // 反撃50%
        };
        setMyField(newField);

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
        const { addLog } = context;
        const { myField } = getPlayerContext(context);

        // 粘液獣の数をカウント
        const slimeCount = myField.filter(
          (m) => m && hasCategory(m, '【スライム】')
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
              hasCategory(card, '【スライム】')
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
        const { addLog } = context;
        const { myField } = getPlayerContext(context);

        // 粘液獣の数をカウント
        const slimeCount = myField.filter(
          (m) => m && hasCategory(m, '【スライム】')
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
        const { addLog } = context;
        const { opponentField, setOpponentField } = getPlayerContext(context);

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
        const { addLog } = context;
        const { myField, opponentField, setOpponentField } = getPlayerContext(context);

        // ゴシックモンスターの数をカウント
        const gothicCount = myField.filter(
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
        const { addLog } = context;
        const { myField } = getPlayerContext(context);

        // 属性別のヴォランティスモンスターをカウント
        const attributeCounts = {};
        myField.forEach((monster) => {
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

  /**
   * C0000018: 粘液の沼地 (フィールドカード)
   * 【常時】場にいる《粘液獣》の攻撃力を300アップ。(※トリガー対象外)
   * 【相手モンスター攻撃時】相手プレイヤーに200ダメージを与える。
   */
  C0000018: [
    {
      type: TRIGGER_TYPES.ON_OPPONENT_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手攻撃時: 相手プレイヤーに200ダメージ',
      effect: (context) => {
        const { currentPlayer, addLog } = context;
        // 相手が攻撃した時、そのプレイヤーにダメージを与える
        conditionalDamage(context, 200, 'opponent');
        addLog('粘液の沼地: 相手の攻撃に反応して200ダメージ！', 'damage');
        return true;
      },
    },
  ],

  /**
   * C0000245: 鎖の守護霊リアリス
   * 【相手攻撃時】場に『鎖縛の幻姫リアノン』がいる場合、相手の攻撃を1ターンに1度無効化し、相手モンスターに500ダメージを与える。
   */
  C0000245: [
    {
      type: TRIGGER_TYPES.ON_OPPONENT_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手攻撃時: リアノンがいれば攻撃無効化＋500ダメージ',
      effect: (context) => {
        const { card, addLog } = context;
        const { myField } = getPlayerContext(context);

        // トリガー使用済みチェック（1ターンに1度）
        if (card.triggerUsedThisTurn) {
          addLog('鎖の守護霊リアリス: 今ターンは既に発動済み', 'info');
          return false;
        }

        // 場に鎖縛の幻姫リアノン（C0000244）がいるかチェック
        const hasRiannon = myField.some(
          (m) => m && (m.id === 'C0000244' || m.name?.includes('鎖縛の幻姫リアノン'))
        );

        if (!hasRiannon) {
          addLog('鎖の守護霊リアリス: 場に鎖縛の幻姫リアノンがいない', 'info');
          return false;
        }

        // 攻撃を無効化（TODO: 実際の攻撃無効化処理が必要）
        // 相手の攻撃モンスターに500ダメージ
        // TODO: 攻撃モンスターの特定が必要。現時点では相手プレイヤーにダメージ
        conditionalDamage(context, 500, 'opponent');

        addLog(
          '鎖の守護霊リアリス: 攻撃を無効化し、相手に500ダメージ！',
          'info'
        );

        // 使用済みフラグを立てる
        card.triggerUsedThisTurn = true;

        return true;
      },
    },
  ],

  /**
   * C0000138: 禁忌のゴシッククラウン
   * 【常時】自分のSPトークンはすべてレスト状態になる。(※トリガー対象外)
   * 【自壊時】自分のライフに2000ダメージ。
   */
  C0000138: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 自分に2000ダメージ',
      effect: (context) => {
        conditionalDamage(context, 2000, 'self');
        const { addLog } = context;
        addLog('禁忌のゴシッククラウンが破壊され、自分に2000ダメージ！', 'damage');
        return true;
      },
    },
  ],

  /**
   * C0000246: 鎖縛の禁忌姫リアノン・エターナル
   * 【召喚時】相手モンスター1体を1ターン行動不能にする。
   * 【常時】相手の魔法カードを1ターンに1度無効化する。(※トリガー対象外)
   * 【自壊時】2000ダメージを受ける。
   */
  C0000246: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      priority: TRIGGER_PRIORITIES.HIGH,
      description: '召喚時: 相手モンスター1体を1ターン行動不能に',
      effect: (context) => {
        const { addLog } = context;
        const { opponentField, setOpponentField } = getPlayerContext(context);

        // 対象を探す
        const targetIndex = opponentField.findIndex((m) => m !== null);
        if (targetIndex === -1) {
          addLog('鎖縛の禁忌姫リアノン・エターナル: 対象がいない', 'info');
          return false;
        }

        // TODO: UI実装時に対象選択が必要
        const target = opponentField[targetIndex];
        const newField = [...opponentField];
        newField[targetIndex] = {
          ...target,
          canAttack: false,
          effectDisabled: true,
          immobilizedUntilNextTurn: true,
        };
        setOpponentField(newField);

        addLog(
          `鎖縛の禁忌姫リアノン・エターナルが${target.name}を行動不能にした！`,
          'info'
        );
        return true;
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      priority: TRIGGER_PRIORITIES.NORMAL,
      description: '破壊時: 自分に2000ダメージ',
      effect: (context) => {
        conditionalDamage(context, 2000, 'self');
        const { addLog } = context;
        addLog(
          '鎖縛の禁忌姫リアノン・エターナルが破壊され、自分に2000ダメージ！',
          'damage'
        );
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
