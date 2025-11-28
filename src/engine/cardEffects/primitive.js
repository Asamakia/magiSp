// ========================================
// 原始属性カードの固有効果
// ========================================

import {
  getPlayerContext,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  modifyAttack,
  applyStatusToAllOpponentMonsters,
  selectAndApplyStatusToOpponent,
} from '../effectHelpers';
import { hasCategory } from '../../utils/helpers';
import { statusEffectEngine, STATUS_EFFECT_TYPES } from '../statusEffects';

/**
 * 原始属性カードの固有効果
 */
export const primitiveCardEffects = {
  /**
   * C0000002: 触覚持ち粘液獣
   * 基本技：次の相手エンドフェイズ時まで相手は魔法カードを使えない
   */
  C0000002: (skillText, context) => {
    if (context.skillType === 'basic') {
      // setP1MagicBlocked/setP2MagicBlockedは特殊なステートのためcontext直接参照
      const { addLog, currentPlayer, setP1MagicBlocked, setP2MagicBlocked } = context;

      // 相手の魔法カード使用をブロック
      if (currentPlayer === 1) {
        setP2MagicBlocked(true);
        addLog('触覚持ち粘液獣の効果: プレイヤー2は次のエンドフェイズまで魔法カードを使用できない！', 'info');
      } else {
        setP1MagicBlocked(true);
        addLog('触覚持ち粘液獣の効果: プレイヤー1は次のエンドフェイズまで魔法カードを使用できない！', 'info');
      }

      return true;
    }
    return false;
  },

  /**
   * C0000004: ゴミあさり粘液獣
   * 【召喚時】墓地の《粘液獣》モンスター1体を攻撃力半減して場に戻す
   * ※召喚時効果はトリガーシステムで処理
   */
  // C0000004は基本技がないため、cardEffectsでの実装は不要

  /**
   * C0000009: 粘液獣・寄生
   * 基本技: このカードを相手モンスターに重ねて発動。
   * 対象の攻撃力を毎ターン開始時に500ダウン、次の相手エンドフェイズまで対象モンスターの効果を無効化する。
   * 場に粘液獣が3体以上いる場合、さらに攻撃力を500ダウン。
   */
  C0000009: (skillText, context) => {
    if (context.skillType === 'basic') {
      const { addLog, monsterIndex, setPendingMonsterTarget } = context;
      const { myField, setMyField, opponentField, setOpponentField, currentPlayer } = getPlayerContext(context);

      // このカードの情報を取得
      const thisMonster = myField[monsterIndex];
      if (!thisMonster) {
        addLog('粘液獣・寄生: カードが見つかりません', 'info');
        return false;
      }

      // 相手モンスターがいるかチェック
      const hasOpponentMonster = opponentField.some(m => m !== null);
      if (!hasOpponentMonster) {
        addLog('粘液獣・寄生: 寄生する対象がいません', 'info');
        return false;
      }

      // 場の粘液獣の数をカウント（自分を除く）
      const slimeCount = myField.filter((m, idx) =>
        m && idx !== monsterIndex && hasCategory(m, '【スライム】')
      ).length;

      // ATK減少量を計算
      const atkReduction = slimeCount >= 3 ? 1000 : 500;

      // モンスター選択UIを表示
      setPendingMonsterTarget({
        message: '寄生する相手モンスターを選択してください',
        targetPlayer: 'opponent',
        callback: (targetIndex) => {
          const target = opponentField[targetIndex];
          if (!target) return;

          // このカードを自分フィールドから除去（墓地には送らない、寄生として付与）
          setMyField(prev => prev.map((m, idx) => {
            if (idx === monsterIndex) {
              return null;
            }
            return m;
          }));

          // 相手モンスターにPARASITE状態異常を付与
          setOpponentField(prev => prev.map((m, idx) => {
            if (idx === targetIndex && m) {
              // 状態異常を付与（直接mをmutateせず、新しいオブジェクトで返す）
              const updatedMonster = { ...m };
              if (!updatedMonster.statusEffects) {
                updatedMonster.statusEffects = [];
              }
              // 寄生状態異常を追加
              statusEffectEngine.applyStatus(updatedMonster, STATUS_EFFECT_TYPES.PARASITE, {
                value: atkReduction,
                parasiteCard: { ...thisMonster },
                parasiteOwner: currentPlayer,
                effectNegated: true, // 効果無効化フラグ
                source: 'C0000009',
                sourceName: '粘液獣・寄生',
              });
              return updatedMonster;
            }
            return m;
          }));

          addLog(`粘液獣・寄生が${target.name}に寄生した！`, 'info');
          addLog(`毎ターン開始時に攻撃力-${atkReduction}、効果無効化！`, 'info');
        },
      });

      return true;
    }
    return false;
  },

  /**
   * C0000006: 新・超覚醒粘液獣ハイパー
   * 【召喚時】場にいる粘液獣1体につき、自身の攻撃力を1000アップ
   * ※召喚時効果はトリガーシステムで処理
   * 基本技：場にいる時一度だけ相手モンスター1体を飲み込んで無効化する
   */
  C0000006: (skillText, context) => {
    const { addLog, monsterIndex, setPendingMonsterTarget } = context;
    const { myField, setMyField, opponentField, setOpponentField } = getPlayerContext(context);

    // 基本技：相手モンスター1体を飲み込む（1回限り、2ターン後に消化）
    if (context.skillType === 'basic') {
      // このカードの情報を取得
      const thisMonster = myField[monsterIndex];
      if (!thisMonster) {
        addLog('新・超覚醒粘液獣ハイパー: カードが見つかりません', 'info');
        return false;
      }

      // 一度だけ使用可能チェック
      if (thisMonster.hasUsedSwallow) {
        addLog('新・超覚醒粘液獣ハイパー: すでに飲み込み効果を使用済み', 'info');
        return false;
      }

      // 相手モンスターがいるかチェック
      const hasOpponentMonster = opponentField.some(m => m !== null);
      if (!hasOpponentMonster) {
        addLog('新・超覚醒粘液獣ハイパー: 飲み込む対象がいません', 'info');
        return false;
      }

      // モンスター選択UIを表示
      setPendingMonsterTarget({
        message: '飲み込むモンスターを選択してください',
        targetPlayer: 'opponent',
        callback: (targetIndex) => {
          const target = opponentField[targetIndex];
          if (!target) return;

          // 相手モンスターをフィールドから除外
          setOpponentField(prev => prev.map((m, idx) => {
            if (idx === targetIndex) {
              return null;
            }
            return m;
          }));

          // 自身に飲み込んだモンスターを保存（2ターン後に消化）
          setMyField(prev => prev.map((m, idx) => {
            if (idx === monsterIndex && m) {
              return {
                ...m,
                hasUsedSwallow: true,
                swallowedMonster: { ...target, originalSlotIndex: targetIndex },
                digestCounter: 2,
              };
            }
            return m;
          }));

          addLog(`新・超覚醒粘液獣ハイパーが${target.name}を飲み込んだ！（消化まで2ターン）`, 'info');
        },
      });

      return true;
    }

    return false;
  },

  /**
   * C0000007: 粘液獣・キング
   * 基本技：このターン中、相手モンスターの効果を全て無効化する。
   */
  C0000007: (skillText, context) => {
    if (context.skillType === 'basic') {
      const { addLog } = context;
      const { opponentField } = getPlayerContext(context);

      // 相手モンスターがいるかチェック
      const hasOpponentMonster = opponentField.some(m => m !== null);
      if (!hasOpponentMonster) {
        addLog('粘液獣・キング: 無効化する対象がいません', 'info');
        return true; // 空振りでも発動成功
      }

      // 相手モンスター全体にSILENCE（効果無効）を付与（ターン終了まで）
      applyStatusToAllOpponentMonsters(context, STATUS_EFFECT_TYPES.SILENCE, {
        duration: 0, // ターン終了時まで
        source: 'C0000007',
        sourceName: '粘液獣・キング',
      }, '粘液獣・キング');

      addLog('粘液獣・キング: このターン中、相手モンスターの効果を全て無効化！', 'info');
      return true;
    }
    return false;
  },

  /**
   * C0000008: 粘液獣・胞子
   * 【召喚時】デッキから《粘液獣》と名の付くカード1枚を手札に加える
   * ※召喚時効果はトリガーシステムで処理
   */
  C0000008: (skillText, context) => {
    // 召喚時効果はトリガーで処理されるため、cardEffectsでは何もしない
    return false;
  },

  /**
   * C0000010: 粘液獣・融合体
   * 【召喚時】このカードと場の他の《粘液獣》1体を融合し、このカードの攻撃力を融合素材の合計に変更する
   * ※召喚時効果はトリガーシステムで処理
   * 基本技：ターン終了時まで相手モンスター1体の効果を無効化する。
   */
  C0000010: (skillText, context) => {
    // 基本技：ターン終了時まで相手モンスター1体の効果を無効化
    if (context.skillType === 'basic') {
      const { addLog } = context;
      const { opponentField } = getPlayerContext(context);

      // 相手モンスターがいるかチェック
      const hasOpponentMonster = opponentField.some(m => m !== null);
      if (!hasOpponentMonster) {
        addLog('粘液獣・融合体: 無効化する対象がいません', 'info');
        return false;
      }

      // 相手モンスター1体を選択してSILENCE（効果無効）を付与
      selectAndApplyStatusToOpponent(context, STATUS_EFFECT_TYPES.SILENCE, {
        duration: 0, // ターン終了時まで
        source: 'C0000010',
        sourceName: '粘液獣・融合体',
      }, '粘液獣・融合体');

      return true;
    }

    // 召喚時効果はトリガーで処理されるため、cardEffectsでは何もしない
    return false;
  },

  /**
   * C0000011: 粘液獣・暴走体
   * 【召喚時】場にいる《粘液獣》1体を破壊し、そのコスト×300ダメージを相手プレイヤーに与える
   * ※召喚時効果はトリガーシステムで処理
   */
  C0000011: (skillText, context) => {
    // 召喚時効果はトリガーで処理されるため、cardEffectsでは何もしない
    return false;
  },

  /**
   * C0000127: ゴシック・ローズ
   * 【召喚時】デッキから《ゴシック》または《鎖》魔法カード1枚を手札に加える
   */
  C0000127: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.type === 'magic' &&
               card.name && (card.name.includes('ゴシック') || card.name.includes('鎖'));
      }) !== null;
    }
    return false;
  },

  /**
   * C0000128: 鎖縛のメイド
   * 【召喚時】相手モンスター1体の攻撃力をターン終了時まで0にする
   */
  C0000128: (skillText, context) => {
    const { addLog } = context;
    const { opponentField, setOpponentField } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      const monsters = opponentField.filter(m => m !== null);
      if (monsters.length === 0) {
        addLog('相手モンスターがいません', 'info');
        return true;
      }

      const target = monsters[0];
      setOpponentField(prev => prev.map(m => {
        if (m && m.uniqueId === target.uniqueId) {
          addLog(`${m.name}の攻撃力を0にした`, 'info');
          return { ...m, attack: 0 };
        }
        return m;
      }));

      return true;
    }
    return false;
  },

  /**
   * C0000012: 粘液の増殖
   * 場にいる《粘液獣》1体を分裂させる（攻撃力は半分になる）。
   */
  C0000012: (skillText, context) => {
    const { addLog } = context;
    const { myField, setMyField, currentPlayer } = getPlayerContext(context);

    // 《粘液獣》と名の付くモンスターを探す（名前判定）
    const slimeIndex = myField.findIndex(
      (m) => m && m.name && m.name.includes('粘液獣')
    );

    if (slimeIndex === -1) {
      addLog('粘液の増殖: 場に《粘液獣》がいません', 'info');
      return false;
    }

    // 空きスロットを探す
    const emptySlotIndex = myField.findIndex((slot) => slot === null);
    if (emptySlotIndex === -1) {
      addLog('粘液の増殖: 場が満杯のため分裂できない', 'info');
      return false;
    }

    const targetSlime = myField[slimeIndex];

    // 分裂: 攻撃力半分のコピーを生成
    const copy = {
      ...targetSlime,
      uniqueId: `${targetSlime.id}_magic_split_${Date.now()}`,
      attack: Math.floor(targetSlime.attack / 2),
      currentAttack: Math.floor((targetSlime.currentAttack || targetSlime.attack) / 2),
      hp: targetSlime.hp,
      currentHp: targetSlime.currentHp || targetSlime.hp,
      canAttack: targetSlime.canAttack, // 分裂前と同じ状態を引き継ぐ
      charges: [],
      statusEffects: [],
      owner: currentPlayer,
    };

    const newField = [...myField];
    newField[emptySlotIndex] = copy;
    setMyField(newField);

    addLog(
      `粘液の増殖: ${targetSlime.name}が分裂した！（攻撃力${copy.currentAttack}）`,
      'info'
    );
    return true;
  },

  /**
   * C0000013: 粘液の罠
   * 【刹那詠唱】相手モンスター攻撃時、発動可能。
   * そのモンスターの攻撃力を800ダウン、次のターンまで行動不能にする。
   */
  C0000013: (skillText, context) => {
    const { addLog, attacker, attackerIndex } = context;
    const { setOpponentField } = getPlayerContext(context);

    // 刹那詠唱で発動された場合のみ有効
    // attacker は攻撃宣言をしたモンスター（相手フィールドにいる）
    if (!attacker || attackerIndex === undefined) {
      addLog('粘液の罠: 攻撃対象がありません', 'info');
      return false;
    }

    // 攻撃者は「相手フィールド」にいる
    // currentPlayer = 刹那詠唱使用者
    // 攻撃者は currentPlayer の相手のフィールドにいる

    // 攻撃力を800ダウン & STUN（行動不能）を付与
    setOpponentField(prev => prev.map((m, idx) => {
      if (idx === attackerIndex && m) {
        const newAttack = Math.max(0, (m.currentAttack || m.attack) - 800);
        const updatedMonster = {
          ...m,
          currentAttack: newAttack,
        };

        // STUN状態異常を付与（次のターンまで行動不能）
        statusEffectEngine.applyStatus(updatedMonster, STATUS_EFFECT_TYPES.STUN, {
          duration: 1, // 次のターンまで
          source: 'C0000013',
          sourceName: '粘液の罠',
        });

        addLog(`粘液の罠: ${m.name}の攻撃力を800ダウン（${m.currentAttack || m.attack}→${newAttack}）`, 'info');
        addLog(`粘液の罠: ${m.name}は次のターンまで行動不能！`, 'info');

        return updatedMonster;
      }
      return m;
    }));

    return true;
  },

  // 他の原始属性カードを追加...
};
