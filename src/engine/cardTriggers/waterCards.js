/**
 * 水属性カードのトリガー実装
 *
 * このファイルには水属性カードの個別トリガー効果を実装します。
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
  selectAndApplyStatusToOpponent,
  applyStatusToAllOpponentMonsters,
} from '../effectHelpers';
import { STATUS_EFFECT_TYPES } from '../statusEffects';

/**
 * 水属性カードのトリガー定義
 * カードID => トリガー配列のマッピング
 */
export const waterCardTriggers = {
  /**
   * C0000039: アクア・メイデン
   * 【召喚時】相手モンスター1体を「眠り」（次のターン終了時まで行動不能、効果無効、ターン開始フェイズに50％で解除）にする。
   */
  C0000039: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター1体を「眠り」状態に',
      effect: (context) => {
        // 眠り: 次のターン終了時まで行動不能＋効果無効、ターン開始時50%解除
        selectAndApplyStatusToOpponent(
          context,
          STATUS_EFFECT_TYPES.SLEEP,
          {
            duration: 2, // 次のターン終了時まで
            removeChance: 0.5, // 50%で解除
          },
          'アクア・メイデン'
        );
      },
    },
  ],

  /**
   * C0000041: ダーク・リヴァイアサン
   * 【召喚時】相手の場にいるモンスター全てに3000ダメージを与え、相手プレイヤーに破壊したモンスター1体につき800ダメージを与える。
   */
  C0000041: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手全体に3000、破壊数×800',
      effect: (context) => {
        const { p2Field, setP2Field, addLog } = context;
        let destroyedCount = 0;

        setP2Field((prev) => {
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

        if (destroyedCount > 0) {
          const totalDamage = destroyedCount * 800;
          addLog(`ダーク・リヴァイアサンの効果: ${destroyedCount}体破壊、相手に${totalDamage}ダメージ`, 'damage');
          conditionalDamage(context, totalDamage, 'opponent');
        }
      },
    },
  ],

  /**
   * C0000042: 潮の乙女
   * 【召喚時】手札の水属性カード1枚のSPコストを1軽減。
   */
  C0000042: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 手札の水属性カード1枚のコスト-1',
      effect: (context) => {
        const {
          currentPlayer, p1Hand, p2Hand, setP1Hand, setP2Hand,
          addLog, setPendingHandSelection,
        } = context;

        const hand = currentPlayer === 1 ? p1Hand : p2Hand;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        // 水属性カードをフィルタ（自分自身以外）
        const waterCards = hand.filter(c => c.attribute === '水');

        if (waterCards.length === 0) {
          addLog('潮の乙女の効果: 手札に水属性カードがありません', 'info');
          return;
        }

        // 1枚のみの場合は自動選択
        if (waterCards.length === 1) {
          const targetCard = waterCards[0];
          setHand(prev => prev.map(c =>
            c.uniqueId === targetCard.uniqueId
              ? { ...c, tempCostModifier: (c.tempCostModifier || 0) - 1, tempCostModifierSource: '潮の乙女' }
              : c
          ));
          addLog(`潮の乙女の効果: ${targetCard.name}のコストを1軽減！`, 'heal');
          return;
        }

        // 複数の場合は選択UI
        if (setPendingHandSelection) {
          setPendingHandSelection({
            message: 'コストを1軽減する水属性カードを選択してください',
            filter: (card) => card.attribute === '水',
            callback: (selectedCard) => {
              setHand(prev => prev.map(c =>
                c.uniqueId === selectedCard.uniqueId
                  ? { ...c, tempCostModifier: (c.tempCostModifier || 0) - 1, tempCostModifierSource: '潮の乙女' }
                  : c
              ));
              addLog(`潮の乙女の効果: ${selectedCard.name}のコストを1軽減！`, 'heal');
            },
          });
          return;
        }

        // フォールバック: 最初の水属性カードを選択
        const targetCard = waterCards[0];
        setHand(prev => prev.map(c =>
          c.uniqueId === targetCard.uniqueId
            ? { ...c, tempCostModifier: (c.tempCostModifier || 0) - 1, tempCostModifierSource: '潮の乙女' }
            : c
        ));
        addLog(`潮の乙女の効果: ${targetCard.name}のコストを1軽減！`, 'heal');
      },
    },
  ],

  /**
   * C0000043: 深海のクラーケン
   * 【墓地発動】このカードが墓地にあるときSPコスト4を払い、このカードを再度召喚可能。
   */
  C0000043: [
    {
      type: TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '墓地発動: SP4払い自己蘇生',
      priority: TRIGGER_PRIORITIES.NORMAL,
      costCheck: (context) => {
        const { currentPlayer, p1ActiveSP, p2ActiveSP } = context;
        const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
        return activeSP >= 4;
      },
      effect: (context) => {
        const { currentPlayer, p1ActiveSP, p2ActiveSP, setP1ActiveSP, setP2ActiveSP,
                p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP,
                p1Field, p2Field, setP1Field, setP2Field,
                p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                card, addLog } = context;

        const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
        if (activeSP < 4) {
          addLog('深海のクラーケンの効果: SPが足りません', 'info');
          return false;
        }

        // 空きスロットを探す
        const field = currentPlayer === 1 ? p1Field : p2Field;
        const emptySlotIndex = field.findIndex((slot) => slot === null);
        if (emptySlotIndex === -1) {
          addLog('深海のクラーケンの効果: フィールドに空きがありません', 'info');
          return false;
        }

        // SPコストを支払う
        const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
        const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
        setActiveSP((prev) => prev - 4);
        setRestedSP((prev) => prev + 4);

        // 墓地から除外
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        setGraveyard((prev) => prev.filter((c) => c.uniqueId !== card.uniqueId));

        // フィールドに配置
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;
        const resurrectedMonster = {
          ...card,
          currentHp: card.hp,
          currentAttack: card.attack,
          canAttack: false, // 召喚ターンは攻撃不可
        };

        setField((prev) => {
          const newField = [...prev];
          newField[emptySlotIndex] = resurrectedMonster;
          return newField;
        });

        addLog(`深海のクラーケンを墓地からSP4で蘇生！`, 'heal');
        return true;
      },
    },
  ],

  /**
   * C0000044: 水晶のマーメイド
   * 【召喚時】手札の水属性モンスター1体選び、次の自分のエンドフェイズまで召喚コストを1軽減。
   */
  C0000044: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 手札の水属性モンスター1体のコスト-1（エンドフェイズまで）',
      effect: (context) => {
        const {
          currentPlayer, p1Hand, p2Hand, setP1Hand, setP2Hand,
          addLog, setPendingHandSelection,
        } = context;

        const hand = currentPlayer === 1 ? p1Hand : p2Hand;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        // 水属性モンスターをフィルタ
        const waterMonsters = hand.filter(c => c.type === 'monster' && c.attribute === '水');

        if (waterMonsters.length === 0) {
          addLog('水晶のマーメイドの効果: 手札に水属性モンスターがありません', 'info');
          return;
        }

        // 1体のみの場合は自動選択
        if (waterMonsters.length === 1) {
          const targetCard = waterMonsters[0];
          setHand(prev => prev.map(c =>
            c.uniqueId === targetCard.uniqueId
              ? {
                  ...c,
                  tempCostModifier: (c.tempCostModifier || 0) - 1,
                  tempCostModifierSource: '水晶のマーメイド',
                  tempCostModifierUntilEndPhase: true, // エンドフェイズまでの一時軽減
                }
              : c
          ));
          addLog(`水晶のマーメイドの効果: ${targetCard.name}のコストを1軽減！`, 'heal');
          return;
        }

        // 複数の場合は選択UI
        if (setPendingHandSelection) {
          setPendingHandSelection({
            message: 'コストを1軽減する水属性モンスターを選択してください',
            filter: (card) => card.type === 'monster' && card.attribute === '水',
            callback: (selectedCard) => {
              setHand(prev => prev.map(c =>
                c.uniqueId === selectedCard.uniqueId
                  ? {
                      ...c,
                      tempCostModifier: (c.tempCostModifier || 0) - 1,
                      tempCostModifierSource: '水晶のマーメイド',
                      tempCostModifierUntilEndPhase: true,
                    }
                  : c
              ));
              addLog(`水晶のマーメイドの効果: ${selectedCard.name}のコストを1軽減！`, 'heal');
            },
          });
          return;
        }

        // フォールバック: 最初の水属性モンスターを選択
        const targetCard = waterMonsters[0];
        setHand(prev => prev.map(c =>
          c.uniqueId === targetCard.uniqueId
            ? {
                ...c,
                tempCostModifier: (c.tempCostModifier || 0) - 1,
                tempCostModifierSource: '水晶のマーメイド',
                tempCostModifierUntilEndPhase: true,
              }
            : c
        ));
        addLog(`水晶のマーメイドの効果: ${targetCard.name}のコストを1軽減！`, 'heal');
      },
    },
  ],

  /**
   * C0000045: 海流の守護者
   * 【墓地発動】このカードが墓地にある場合、自分のターン終了時にレスト状態のSPトークンを１つアクティブにする。
   */
  C0000045: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_FROM_GRAVEYARD,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '墓地・エンドフェイズ: レストSP1個をアクティブに',
      priority: TRIGGER_PRIORITIES.NORMAL,
      effect: (context) => {
        const { currentPlayer, p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP,
                setP1ActiveSP, setP2ActiveSP, addLog } = context;

        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;

        if (restedSP > 0) {
          const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
          const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
          setRestedSP((prev) => prev - 1);
          setActiveSP((prev) => prev + 1);
          addLog('海流の守護者の墓地効果: レストSP1個をアクティブにした', 'info');
        } else {
          addLog('海流の守護者の墓地効果: レスト状態のSPがありません', 'info');
        }
        return true;
      },
    },
  ],

  /**
   * C0000053: 母なる大海
   * 【常時】水属性モンスターの攻撃力300アップ。（continuousEffects/fieldCards.jsで実装）
   * 【自分エンドフェイズ時】自分のレスト状態のSPトークンを1つアクティブにする。
   * 【エンドフェイズ時】「凍結」状態の相手モンスターがいる場合、相手プレイヤーに300ダメージを与える。
   */
  C0000053: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: レストSP1個をアクティブに',
      effect: (context) => {
        const { currentPlayer, p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP,
                p1ActiveSP, p2ActiveSP, setP1ActiveSP, setP2ActiveSP, addLog } = context;

        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
        const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;

        if (restedSP > 0) {
          setRestedSP((prev) => prev - 1);
          setActiveSP((prev) => prev + 1);
          addLog('母なる大海の効果: レストSP1個をアクティブにした', 'info');
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 凍結モンスターいれば相手に300ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, addLog } = context;
        // 相手フィールドをチェック
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;

        // 凍結状態のモンスターがいるかチェック
        const frozenMonsters = opponentField.filter(monster =>
          monster &&
          monster.statusEffects &&
          monster.statusEffects.some(effect => effect.type === STATUS_EFFECT_TYPES.FREEZE)
        );

        if (frozenMonsters.length > 0) {
          addLog(`母なる大海の効果: 凍結モンスター${frozenMonsters.length}体、相手に300ダメージ！`, 'damage');
          conditionalDamage(context, 300, 'opponent');
        }
      },
    },
  ],

  /**
   * C0000054: 珊瑚の迷宮
   * 【相手モンスターの攻撃時】、その攻撃力を200ダウン。
   * 【自分エンドフェイズ時】自分のライフを300回復。
   */
  C0000054: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 自分のライフ300回復',
      effect: (context) => {
        healLife(context, 300, true);
      },
    },
  ],

  /**
   * C0000055: 深淵の潮流
   * 【常時】水属性モンスターの召喚コストを1軽減。
   * 【エンドフェイズ時】場に水属性モンスターが3体以上いる場合、相手プレイヤーに500ダメージを与える。
   */
  C0000055: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 水属性モンスターのコスト-1',
      effect: (context) => {
        const { addLog } = context;
        addLog('深淵の潮流の常時効果: 水属性モンスターのコスト-1（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 水属性3体以上で相手に500',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, addLog } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;

        const waterCount = field.filter((monster) =>
          monster && monster.attribute === '水'
        ).length;

        if (waterCount >= 3) {
          addLog(`深淵の潮流の効果: 水属性${waterCount}体、相手に500ダメージ`, 'damage');
          conditionalDamage(context, 500, 'opponent');
        }
      },
    },
  ],

  /**
   * C0000142: ブリザードマスター
   * 【召喚時】デッキから《ブリザード》または《猫》魔法カード1枚を手札に加える。
   */
  C0000142: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 《ブリザード》/《猫》魔法をサーチ',
      effect: (context) => {
        const found = searchCard(context, (card) => {
          return card.type === 'magic' &&
                 (card.name.includes('ブリザード') || card.name.includes('猫'));
        });

        if (!found) {
          context.addLog('ブリザードマスターの効果: 対象カードが見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000143: 氷猫の使い魔
   * 【墓地発動】このカードが墓地にある場合、自分のターン終了時に墓地の「ブリザードキャット」モンスター1体を手札に戻す（1度だけ）。
   */
  C0000143: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_FROM_GRAVEYARD,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '墓地・エンドフェイズ: ブリザードキャットを手札に（1度だけ）',
      priority: TRIGGER_PRIORITIES.NORMAL,
      usedOnce: false, // 1度だけ発動のフラグ
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                setP1Hand, setP2Hand, card, addLog } = context;

        // 1度だけの制限チェック（カードにフラグを設定）
        if (card.graveyardEffectUsed) {
          return false; // 既に使用済み
        }

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        // 墓地から「ブリザードキャット」を探す（自分自身以外）
        const targetCard = graveyard.find((c) =>
          c.uniqueId !== card.uniqueId &&
          c.type === 'monster' &&
          c.name &&
          c.name.includes('ブリザードキャット')
        );

        if (!targetCard) {
          addLog('氷猫の使い魔の墓地効果: 墓地に「ブリザードキャット」がいません', 'info');
          return false;
        }

        // 墓地から手札に戻す
        setGraveyard((prev) => {
          // 自分自身にフラグを設定
          return prev.map((c) => {
            if (c.uniqueId === card.uniqueId) {
              return { ...c, graveyardEffectUsed: true };
            }
            return c;
          }).filter((c) => c.uniqueId !== targetCard.uniqueId);
        });
        setHand((prev) => [...prev, targetCard]);

        addLog(`氷猫の使い魔の墓地効果: ${targetCard.name}を手札に戻した`, 'info');
        return true;
      },
    },
  ],

  /**
   * C0000144: ブリザードキャット・フロスト
   * 【召喚時】相手モンスター1体を「凍結（攻撃力半減＋行動不能）」にする、次のターン開始時に50%で解除。
   */
  C0000144: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター1体を「凍結」',
      effect: (context) => {
        // 凍結: 攻撃力半減＋行動不能、次のターン開始時に50%で解除
        selectAndApplyStatusToOpponent(
          context,
          STATUS_EFFECT_TYPES.FREEZE,
          {
            duration: -1, // 永続（解除判定で消える）
            removeChance: 0.5, // 50%で解除
          },
          'ブリザードキャット・フロスト'
        );
      },
    },
  ],

  /**
   * C0000145: ブリザードキャット・スノウ
   * 【召喚時】相手モンスター1体を「凍結（攻撃力半減＋行動不能）」にする、次のターン開始時に50%で解除。
   */
  C0000145: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター1体を「凍結」',
      effect: (context) => {
        // 凍結: 攻撃力半減＋行動不能、次のターン開始時に50%で解除
        selectAndApplyStatusToOpponent(
          context,
          STATUS_EFFECT_TYPES.FREEZE,
          {
            duration: -1, // 永続（解除判定で消える）
            removeChance: 0.5, // 50%で解除
          },
          'ブリザードキャット・スノウ'
        );
      },
    },
  ],

  /**
   * C0000146: 氷結の守護猫
   * 【自破壊時】デッキから《ブリザード》フィールドカード1枚を手札に加える。
   */
  C0000146: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 《ブリザード》フィールドをサーチ',
      effect: (context) => {
        const found = searchCard(context, (card) => {
          return card.type === 'field' && card.name.includes('ブリザード');
        });

        if (!found) {
          context.addLog('氷結の守護猫の効果: 《ブリザード》フィールドカードが見つかりませんでした', 'info');
        }
      },
    },
  ],

  /**
   * C0000147: ブリザードキャット・シャード
   * 【召喚時】相手モンスター1体に、場にいる《ブリザードキャット》×500ダメージを与える。
   */
  C0000147: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 《ブリザードキャット》×500ダメージ',
      effect: (context) => {
        const {
          currentPlayer, p1Field, p2Field, addLog,
          setP1Field, setP2Field, setP1Graveyard, setP2Graveyard,
          setPendingTargetSelection,
        } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        // 場の《ブリザードキャット》をカウント
        const blizzardCatCount = field.filter((monster) =>
          monster && monster.name && monster.name.includes('ブリザードキャット')
        ).length;

        if (blizzardCatCount === 0) {
          addLog('ブリザードキャット・シャードの効果: 《ブリザードキャット》がいません', 'info');
          return;
        }

        const damage = blizzardCatCount * 500;

        // 相手モンスターを取得
        const validTargets = opponentField
          .map((m, idx) => ({ monster: m, index: idx }))
          .filter(({ monster }) => monster !== null);

        if (validTargets.length === 0) {
          addLog('ブリザードキャット・シャードの効果: 相手モンスターがいません', 'info');
          return;
        }

        const applyDamage = (targetIndex) => {
          setOpponentField(prev => {
            const newField = [...prev];
            const target = newField[targetIndex];
            if (target) {
              const newHp = Math.max(0, target.currentHp - damage);
              addLog(`${target.name}に${damage}ダメージ！（残りHP: ${newHp}）`, 'damage');
              if (newHp <= 0) {
                addLog(`${target.name}が破壊された！`, 'damage');
                setOpponentGraveyard(prev => [...prev, target]);
                newField[targetIndex] = null;
              } else {
                newField[targetIndex] = { ...target, currentHp: newHp };
              }
            }
            return newField;
          });
        };

        // 1体のみの場合は自動選択
        if (validTargets.length === 1) {
          addLog(`ブリザードキャット×${blizzardCatCount}で${damage}ダメージ！`, 'info');
          applyDamage(validTargets[0].index);
          return;
        }

        // 複数いる場合は選択UI
        if (setPendingTargetSelection) {
          addLog(`ブリザードキャット×${blizzardCatCount}で${damage}ダメージ！対象を選択...`, 'info');
          setPendingTargetSelection({
            message: `${damage}ダメージを与える相手モンスターを選択してください`,
            targetType: 'opponent_monster',
            callback: (selectedIndex) => {
              applyDamage(selectedIndex);
            },
          });
          return;
        }

        // フォールバック
        addLog(`ブリザードキャット×${blizzardCatCount}で${damage}ダメージ！`, 'info');
        applyDamage(validTargets[0].index);
      },
    },
  ],

  /**
   * C0000149: ブリザードマスターの愛猫・ミスティ
   * 【常時】場に《ブリザードマスター》がいる場合、攻撃力が1000アップ。
   */
  C0000149: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 《ブリザードマスター》いる時攻撃力+1000',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, monsterIndex } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;

        const hasBlizzardMaster = field.some((monster, idx) =>
          monster &&
          idx !== monsterIndex &&
          monster.name &&
          monster.name.includes('ブリザードマスター')
        );

        if (hasBlizzardMaster) {
          modifyAttack(context, 1000, monsterIndex, false, true);
        }
      },
    },
  ],

  /**
   * C0000155: 氷猫の聖域
   * 【常時】《ブリザードキャット》モンスターの攻撃力を400アップ。
   * 【エンドフェイズ時】相手の場にいるモンスター1体の攻撃力を300ダウン。
   */
  C0000155: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 《ブリザードキャット》の攻撃力+400',
      effect: (context) => {
        const { addLog } = context;
        addLog('氷猫の聖域の常時効果: 《ブリザードキャット》の攻撃力+400（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: 'エンドフェイズ: 相手モンスター1体の攻撃力-300',
      effect: (context) => {
        const { p2Field, addLog } = context;

        const opponentMonsters = p2Field.filter((m) => m !== null);
        if (opponentMonsters.length === 0) {
          addLog('氷猫の聖域の効果: 相手フィールドにモンスターがいません', 'info');
          return;
        }

        // 最初のモンスターをターゲット（UIで選択させるべきだが、簡略化）
        const targetIndex = p2Field.findIndex((m) => m !== null);
        if (targetIndex !== -1) {
          modifyAttack(context, -300, targetIndex, true, false);
          addLog('氷猫の聖域の効果: 相手モンスターの攻撃力-300', 'info');
        }
      },
    },
  ],

  /**
   * C0000156: 凍結の猫森
   * 【エンドフェイズ時】場に水属性モンスターがいるとき、相手プレイヤーに200ダメージ。
   * 【自分エンドフェイズ時】場に《ブリザードキャット》が2体以上いるとき、レスト状態のSPトークンを2個アクティブにする。
   */
  C0000156: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 水属性いれば相手に200、《ブリザードキャット》2体以上でSP回復',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, p1RestedSP, p2RestedSP,
                setP1RestedSP, setP2RestedSP, setP1ActiveSP, setP2ActiveSP, addLog } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;

        // 水属性モンスターチェック
        const hasWater = field.some((monster) => monster && monster.attribute === '水');
        if (hasWater) {
          addLog('凍結の猫森の効果: 相手に200ダメージ', 'damage');
          conditionalDamage(context, 200, 'opponent');
        }

        // 《ブリザードキャット》2体以上チェック
        const blizzardCatCount = field.filter((monster) =>
          monster && monster.name && monster.name.includes('ブリザードキャット')
        ).length;

        if (blizzardCatCount >= 2) {
          const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
          const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
          const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;

          const toActivate = Math.min(restedSP, 2);
          if (toActivate > 0) {
            setRestedSP((prev) => prev - toActivate);
            setActiveSP((prev) => prev + toActivate);
            addLog(`凍結の猫森の効果: レストSP${toActivate}個をアクティブにした`, 'info');
          }
        }
      },
    },
  ],

  /**
   * C0000157: ブリザードキャット・エターナル
   * 【召喚時】相手の場のモンスター全てを凍結（攻撃力半減＋行動不能、ターン開始時に50%解除）にする。
   * 【自壊時】自分のライフを3000減らす。
   */
  C0000157: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター全てを「凍結」',
      effect: (context) => {
        // 凍結: 攻撃力半減＋行動不能、ターン開始時50%解除
        const count = applyStatusToAllOpponentMonsters(
          context,
          STATUS_EFFECT_TYPES.FREEZE,
          {
            duration: -1, // 永続（解除判定で消える）
            removeChance: 0.5, // 50%で解除
          },
          'ブリザードキャット・エターナル'
        );
        if (count === 0) {
          context.addLog('相手の場にモンスターがいません', 'info');
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 自分のライフ-3000',
      effect: (context) => {
        context.addLog('ブリザードキャット・エターナルの破壊時効果: 自分のライフ-3000', 'damage');
        conditionalDamage(context, 3000, 'self');
      },
    },
  ],

  /**
   * C0000199: 永遠の氷結宮殿
   * 【発動時】相手モンスター全体を「凍結」（攻撃半減＋行動不能、ターン開始時50％解除）状態にする。
   * 【自分エンドフェイズ時】自分の場に水属性3体以上いる場合、場のモンスター1体を「凍結」状態にする。
   * 【相手エンドフェイズ時】凍結モンスター1体につき相手プレイヤーに300ダメージを与える。
   * 【常時】自分のSP上限が4になる。
   * 【自壊時】自分のライフを2000減らす。
   */
  C0000199: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '発動時: 相手モンスター全体を「凍結」',
      effect: (context) => {
        // 凍結: 攻撃半減＋行動不能、ターン開始時50%解除
        const count = applyStatusToAllOpponentMonsters(
          context,
          STATUS_EFFECT_TYPES.FREEZE,
          {
            duration: -1,
            removeChance: 0.5,
          },
          '永遠の氷結宮殿'
        );
        if (count === 0) {
          context.addLog('相手の場にモンスターがいません', 'info');
        }
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 自分のライフ-2000',
      effect: (context) => {
        context.addLog('永遠の氷結宮殿の破壊時効果: 自分のライフ-2000', 'damage');
        conditionalDamage(context, 2000, 'self');
      },
    },
  ],

  /**
   * C0000233: 水漏れのリリカ
   * 【召喚時】相手の場にいるモンスター1体を「濡れ」状態にする（次のターン終了まで受けるダメージ倍）。
   */
  C0000233: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 相手モンスター1体を「濡れ」状態に',
      effect: (context) => {
        const { addLog } = context;
        addLog('水漏れのリリカの効果: 相手モンスター1体を「濡れ」状態に（未実装）', 'info');
        // TODO: 状態異常システムの実装が必要
      },
    },
  ],

  /**
   * C0000283: 酸毒竜
   * 【自分エンドフェイズ時】相手に300ダメージを与える。
   */
  C0000283: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 相手に300ダメージ',
      effect: (context) => {
        context.addLog('酸毒竜の効果: 相手に300ダメージ', 'damage');
        conditionalDamage(context, 300, 'opponent');
      },
    },
  ],

  /**
   * C0000313: アクア・リヴァイアサン
   * 【召喚時】相手の場にいるモンスター全ての攻撃力をターン終了時まで500下げる。
   */
  C0000313: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手モンスター全ての攻撃力-500',
      effect: (context) => {
        const { p2Field, setP2Field, addLog } = context;

        let affected = 0;
        setP2Field((prev) => {
          return prev.map((monster) => {
            if (monster) {
              affected++;
              return {
                ...monster,
                currentAttack: Math.max(0, monster.attack - 500),
                attackModified: true,
              };
            }
            return monster;
          });
        });

        if (affected > 0) {
          addLog(`アクア・リヴァイアサンの効果: 相手モンスター${affected}体の攻撃力-500`, 'info');
        }
      },
    },
  ],

  /**
   * C0000330: アクアレギナの漂流漁師
   * 【召喚時】墓地の『アクアレギア』と名の付くモンスター1体をデッキに戻すと、レスト状態のSPトークンをアクティブにする。
   */
  C0000330: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 墓地の『アクアレギア』をデッキに戻しSP回復',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                p1Deck, p2Deck, setP1Deck, setP2Deck, p1RestedSP, p2RestedSP,
                setP1RestedSP, setP2RestedSP, setP1ActiveSP, setP2ActiveSP, addLog } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

        // 墓地から『アクアレギア』を探す
        const targetCard = graveyard.find((card) =>
          card.type === 'monster' && card.name && card.name.includes('アクアレギア')
        );

        if (!targetCard) {
          addLog('アクアレギナの漂流漁師の効果: 墓地に『アクアレギア』モンスターがいません', 'info');
          return;
        }

        // 墓地からデッキに戻す
        setGraveyard((prev) => prev.filter((c) => c.uniqueId !== targetCard.uniqueId));
        setDeck((prev) => [...prev, targetCard]);

        // レストSPをアクティブに
        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        if (restedSP > 0) {
          const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
          const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
          setRestedSP((prev) => prev - 1);
          setActiveSP((prev) => prev + 1);
          addLog(`${targetCard.name}をデッキに戻し、レストSP1個をアクティブにした`, 'info');
        }
      },
    },
  ],

  /**
   * C0000332: アクアレギナの守護者
   * 【召喚時】自分の墓地の『アクアレギア』モンスター1体の攻撃力の半分をこのカードのHPに加える（最大1000）。
   */
  C0000332: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地の『アクアレギア』の攻撃力半分をHPに加算',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, monsterIndex,
                p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const field = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        // 墓地から『アクアレギア』を探す
        const targetCard = graveyard.find((card) =>
          card.type === 'monster' && card.name && card.name.includes('アクアレギア')
        );

        if (!targetCard) {
          addLog('アクアレギナの守護者の効果: 墓地に『アクアレギア』モンスターがいません', 'info');
          return;
        }

        const hpBonus = Math.min(Math.floor(targetCard.attack / 2), 1000);

        setField((prev) => {
          return prev.map((monster, idx) => {
            if (idx === monsterIndex && monster) {
              addLog(`アクアレギナの守護者の効果: HPを${hpBonus}増加`, 'info');
              return {
                ...monster,
                maxHp: monster.maxHp + hpBonus,
                currentHp: monster.currentHp + hpBonus,
              };
            }
            return monster;
          });
        });
      },
    },
  ],

  /**
   * C0000338: アクアレギアの廃墟
   * 【常時】『アクアレギナ』または『ヴェルゼファール』モンスターのHPを600アップ。
   * 【自分エンドフェイズ時】自分の墓地の『アクアレギナ』モンスター1体を手札に戻すことができる。
   */
  C0000338: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 『アクアレギナ』/『ヴェルゼファール』のHP+600',
      effect: (context) => {
        const { addLog } = context;
        addLog('アクアレギアの廃墟の常時効果: HP+600（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: 'エンドフェイズ: 墓地の『アクアレギナ』を手札に',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                setP1Hand, setP2Hand, addLog } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        // 墓地から『アクアレギナ』を探す
        const targetCard = graveyard.find((card) =>
          card.type === 'monster' && card.name && card.name.includes('アクアレギナ')
        );

        if (!targetCard) {
          addLog('アクアレギアの廃墟の効果: 墓地に『アクアレギナ』モンスターがいません', 'info');
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
   * C0000339: アクアレギナの動力-エテルノス・コア
   * 初期効果:【常時】 『アクアレギナ』または『ヴェルゼファール』モンスターの攻撃力を400アップ。
   */
  C0000339: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 『アクアレギナ』/『ヴェルゼファール』の攻撃力+400',
      effect: (context) => {
        const { addLog } = context;
        addLog('アクアレギナの動力-エテルノス・コアの常時効果: 攻撃力+400（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
  ],

  /**
   * C0000340: 深海の支配者・ヴェルゼファール
   * 【召喚時】手札から『ヴェルゼファール』モンスター1体を場に召喚（コスト不要）。このターン、ダイレクトアタック不可。
   * 【場を離れる時】自分のライフを1000減らす。
   */
  C0000340: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 『ヴェルゼファール』1体をコスト不要で召喚',
      effect: (context) => {
        const { addLog } = context;
        addLog('深海の支配者・ヴェルゼファールの効果: 『ヴェルゼファール』を特殊召喚（未実装）', 'info');
        // TODO: 特殊召喚システムの実装が必要
      },
    },
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '場を離れる時: 自分のライフ-1000',
      effect: (context) => {
        context.addLog('深海の支配者・ヴェルゼファールの効果: 自分のライフ-1000', 'damage');
        conditionalDamage(context, 1000, 'self');
      },
    },
  ],

  /**
   * C0000363: 虹羽密林のアクアフェザー
   * 【自分エンドフェイズ時】自分のライフを800回復。
   */
  C0000363: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ: 自分のライフ800回復',
      effect: (context) => {
        healLife(context, 800, true);
      },
    },
  ],

  /**
   * C0000375: 虹羽密林の霧花蛙・ヴェルミナ
   * 【召喚時】自分の手札1枚をデッキに戻しシャッフルする、その後、自分のSPトークンを1個レスト状態からアクティブに変える。
   */
  C0000375: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '召喚時: 手札1枚をデッキに戻しSP回復',
      effect: (context) => {
        const { currentPlayer, p1Hand, p2Hand, setP1Hand, setP2Hand,
                p1Deck, p2Deck, setP1Deck, setP2Deck, p1RestedSP, p2RestedSP,
                setP1RestedSP, setP2RestedSP, setP1ActiveSP, setP2ActiveSP, addLog } = context;

        const hand = currentPlayer === 1 ? p1Hand : p2Hand;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

        if (hand.length === 0) {
          addLog('虹羽密林の霧花蛙・ヴェルミナの効果: 手札がありません', 'info');
          return;
        }

        // 最初のカードをデッキに戻す（UIで選択させるべきだが、簡略化）
        const returnedCard = hand[0];
        setHand((prev) => prev.slice(1));
        setDeck((prev) => [...prev, returnedCard]);

        // レストSPをアクティブに
        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        if (restedSP > 0) {
          const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
          const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
          setRestedSP((prev) => prev - 1);
          setActiveSP((prev) => prev + 1);
          addLog(`${returnedCard.name}をデッキに戻し、レストSP1個をアクティブにした`, 'info');
        }
      },
    },
  ],

  /**
   * C0000379: 虹羽密林の青滴虫・サルフィス
   * 【召喚時】自分のデッキの上から1枚を墓地に送る。墓地に送ったカードが《虹羽密林》モンスターだった場合、自分のSPトークンを1個アクティブにする。
   */
  C0000379: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 1枚ミル、《虹羽密林》ならSP回復',
      effect: (context) => {
        const { currentPlayer, p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP,
                setP1ActiveSP, setP2ActiveSP, addLog } = context;

        const milledCards = millDeck(context, 1);

        if (milledCards.length > 0) {
          const card = milledCards[0];
          if (card.name && card.name.includes('虹羽密林')) {
            const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
            if (restedSP > 0) {
              const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
              const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
              setRestedSP((prev) => prev - 1);
              setActiveSP((prev) => prev + 1);
              addLog('虹羽密林の青滴虫・サルフィスの効果: レストSP1個をアクティブにした', 'info');
            }
          }
        }
      },
    },
  ],

  /**
   * C0000380: 虹羽密林の湖鱗獣・アクアレオン
   * 【常時】このカードの攻撃力は、自分の場の《虹羽密林》モンスター1体につき500アップ。
   */
  C0000380: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 《虹羽密林》1体につき攻撃力+500',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, monsterIndex } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;

        // 場の《虹羽密林》をカウント（自分自身を除く）
        const rainbowFeatherCount = field.filter((monster, idx) =>
          monster &&
          idx !== monsterIndex &&
          monster.name &&
          monster.name.includes('虹羽密林')
        ).length;

        if (rainbowFeatherCount > 0) {
          const attackBonus = rainbowFeatherCount * 500;
          modifyAttack(context, attackBonus, monsterIndex, false, true);
        }
      },
    },
  ],

  /**
   * C0000399: 呪術狩りの鎖術師ミリア
   * 【常時】相手の闇属性モンスターの攻撃力をターン終了時まで300ダウン。
   */
  C0000399: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 相手の闇属性モンスターの攻撃力-300',
      effect: (context) => {
        const { addLog } = context;
        addLog('呪術狩りの鎖術師ミリアの常時効果: 相手の闇属性攻撃力-300（未実装）', 'info');
        // TODO: フィールドカードの常時効果システムが必要
      },
    },
  ],

  /**
   * C0000403: 沼の血叫びヴォルガノス
   * 【召喚時】相手プレイヤーに600ダメージを与える。
   */
  C0000403: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手に600ダメージ',
      effect: (context) => {
        context.addLog('沼の血叫びヴォルガノスの効果: 相手に600ダメージ', 'damage');
        conditionalDamage(context, 600, 'opponent');
      },
    },
  ],

  /**
   * C0000421: 沼の狩人クルーロプス
   * 【召喚時】1枚ドローする。
   */
  C0000421: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 1枚ドロー',
      effect: (context) => {
        context.addLog('沼の狩人クルーロプスの効果: 1枚ドロー', 'info');
        drawCards(context, 1);
      },
    },
  ],

  /**
   * C0000422: 黒涙の山椒魚サラマグナ
   * 【自壊時】自分の墓地の水属性カード1枚を手札に戻す。
   */
  C0000422: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '破壊時: 墓地の水属性カード1枚を手札に',
      effect: (context) => {
        const { currentPlayer, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
                setP1Hand, setP2Hand, addLog } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

        // 墓地から水属性カードを探す
        const targetCard = graveyard.find((card) => card.attribute === '水');

        if (!targetCard) {
          addLog('黒涙の山椒魚サラマグナの効果: 墓地に水属性カードがありません', 'info');
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
   * C0000423: 黒涙の毒樹フロラクルス
   * 【相手モンスター攻撃時】その攻撃力をターン終了時まで300ダウン。
   */
  C0000423: [
    {
      type: TRIGGER_TYPES.ON_OPPONENT_ATTACK,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '相手モンスター攻撃時: 攻撃力-300',
      effect: (context) => {
        const { addLog } = context;
        addLog('黒涙の毒樹フロラクルスの効果: 攻撃モンスターの攻撃力-300（未実装）', 'info');
        // TODO: ON_OPPONENT_ATTACK トリガータイプが必要
      },
    },
  ],
};

/**
 * 水属性カードがトリガー実装を持っているかチェック
 * @param {string} cardId - カードID
 * @returns {boolean} トリガー実装を持っている場合true
 */
export const hasWaterCardTrigger = (cardId) => {
  return cardId && waterCardTriggers[cardId] !== undefined;
};

/**
 * 水属性カードのトリガーを取得
 * @param {string} cardId - カードID
 * @returns {Array|null} トリガー配列、または null
 */
export const getWaterCardTriggers = (cardId) => {
  if (!cardId || !waterCardTriggers[cardId]) {
    return null;
  }
  return waterCardTriggers[cardId];
};

/**
 * 実装済み水属性カード数を取得
 * @returns {number} 実装済みカード数
 */
export const getWaterCardCount = () => {
  return Object.keys(waterCardTriggers).length;
};
