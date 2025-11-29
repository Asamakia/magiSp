// ========================================
// 光属性カードの固有効果
// ========================================

import {
  getPlayerContext,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  drawCards,
  healLife,
  modifyAttack,
  applyStatusToOwnMonster,
} from '../effectHelpers';
import { STATUS_EFFECT_TYPES } from '../statusEffects';
import { hasCategory, createMonsterInstance } from '../../utils/helpers';
import { registerCardTriggers } from '../triggerEngine';
import { continuousEffectEngine } from '../continuousEffects';

/**
 * 光属性カードの固有効果
 */
export const lightCardEffects = {
  /**
   * C0000062: 光の使徒
   * 基本技：手札から光属性カード1枚を捨てるとレスト状態のSPトークン1つをアクティブにする
   */
  C0000062: (skillText, context) => {
    const { addLog, setPendingHandSelection } = context;
    const { myHand, myRestedSP, setMyHand, setMyGraveyard, setMyRestedSP, setMyActiveSP } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // 手札に光属性カードがあるか確認
      const lightCards = myHand.filter(c => c.attribute === '光');
      if (lightCards.length === 0) {
        addLog('手札に光属性カードがありません', 'info');
        return false;
      }

      // レストSPがあるか確認
      if (myRestedSP <= 0) {
        addLog('レスト状態のSPトークンがありません', 'info');
        return false;
      }

      // 手札選択モードに入る
      setPendingHandSelection({
        message: '捨てる光属性カードを選択',
        filter: (card) => card.attribute === '光',
        callback: (selectedCard) => {
          // 手札から削除して墓地に送る
          setMyHand(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));
          setMyGraveyard(prev => [...prev, selectedCard]);

          // レストSPを1つアクティブにする
          setMyRestedSP(prev => prev - 1);
          setMyActiveSP(prev => prev + 1);

          addLog(`「${selectedCard.name}」を捨ててSPを1つアクティブにした`, 'info');
        },
      });

      return true;
    }
    return false;
  },

  /**
   * C0000059: 光の騎士
   * 【召喚時】デッキから《光の》魔法カード1枚を手札に加える
   */
  C0000059: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.type === 'magic' && card.name && card.name.includes('光の');
      }) !== null;
    }
    return false;
  },

  /**
   * C0000060: 聖なる導師
   * 基本技：場にいる光属性モンスター1体の攻撃力をターン終了時まで600アップ
   */
  C0000060: (skillText, context) => {
    if (context.skillType === 'basic') {
      return modifyAttack(context, 600, 0, false, false);
    }
    return false;
  },

  /**
   * C0000121: 聖域の灯守兵
   * 【召喚時】自分の手札から光属性モンスター1体を公開し、デッキに戻す。その後、1枚ドローする
   */
  C0000121: (skillText, context) => {
    const { addLog } = context;
    const { myHand, setMyHand, setMyDeck } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      const lightMonster = myHand.find(card =>
        card.type === 'monster' && card.attribute === '光'
      );

      if (lightMonster) {
        // 手札からデッキに戻す
        setMyHand(prev => prev.filter(c => c.uniqueId !== lightMonster.uniqueId));
        setMyDeck(prev => [...prev, lightMonster]);
        addLog(`手札から「${lightMonster.name}」をデッキに戻した`, 'info');

        // 1枚ドロー
        drawCards(context, 1);
        return true;
      } else {
        addLog('手札に光属性モンスターがありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000211: フルーツ・マリオネット・アップル
   * 【召喚時】デッキからコスト3以下のプラントモンスター1体を墓地に送る
   */
  C0000211: (skillText, context) => {
    const { addLog } = context;
    const { myDeck, setMyDeck, setMyGraveyard } = getPlayerContext(context);

    if (skillText.includes('【召喚時】')) {
      const plantCard = myDeck.find(card =>
        card.type === 'monster' &&
        card.cost <= 3 &&
        hasCategory(card, '【プラント】')
      );

      if (plantCard) {
        setMyDeck(prev => prev.filter(c => c.uniqueId !== plantCard.uniqueId));
        setMyGraveyard(prev => [...prev, plantCard]);
        addLog(`デッキから「${plantCard.name}」を墓地に送った`, 'info');
        return true;
      } else {
        addLog('デッキにコスト3以下のプラントモンスターがありません', 'info');
        return false;
      }
    }
    return false;
  },

  /**
   * C0000212: フルーツ・マリオネット・オレンジ
   * 【召喚時】デッキから《フルーツ・マリオネット》モンスター1体を手札に加える
   */
  C0000212: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.name && card.name.includes('フルーツ・マリオネット');
      }) !== null;
    }
    return false;
  },

  /**
   * C0000214: フルーツ・マリオネット・グレープ
   * 【召喚時】自分の墓地の［プラント］モンスター1体を場に戻す（攻撃力は半分）
   */
  C0000214: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return reviveFromGraveyard(context, (card) => {
        return hasCategory(card, '【プラント】');
      }, true);
    }
    return false;
  },

  /**
   * C0000235: プリンセス狂いのリリカ
   * 【召喚時】デッキから《プリティ☆プリンセス》魔法カード1枚を発動する（コストなし）
   */
  C0000235: (skillText, context) => {
    const { addLog } = context;

    if (skillText.includes('【召喚時】')) {
      const foundCard = searchCard(context, (card) => {
        return card.type === 'magic' && card.name && card.name.includes('プリティ☆プリンセス');
      });

      if (foundCard) {
        addLog(`魔法カード「${foundCard.name}」を発動（コストなし）`, 'info');
        // TODO: 魔法効果の実行（現在は簡易実装）
        return true;
      }
      return false;
    }
    return false;
  },

  /**
   * C0000318: 雷鳴の使者
   * 【召喚時】相手モンスター1体の攻撃力をターン終了時まで500下げる
   */
  C0000318: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return modifyAttack(context, -500, 0, true, false);
    }
    return false;
  },

  /**
   * C0000322: 嵐の雛雷鳥
   * 【召喚時】デッキから《雷》または《嵐》と名の付くカード1枚を手札に加える
   */
  C0000322: (skillText, context) => {
    if (skillText.includes('【召喚時】')) {
      return searchCard(context, (card) => {
        return card.name && (card.name.includes('雷') || card.name.includes('嵐'));
      }) !== null;
    }
    return false;
  },

  /**
   * C0000056: 輝聖女ルミナス
   * 基本技: このカードのHPを300回復。
   * 上級技: 手札から光属性モンスター1体をコストなしで召喚可能。
   */
  C0000056: (skillText, context) => {
    const { addLog, monsterIndex, setPendingHandSelection } = context;
    const { currentPlayer } = getPlayerContext(context);
    const { myField, myHand, setMyField, setMyHand } = getPlayerContext(context);

    // 基本技: HPを300回復
    if (context.skillType === 'basic') {
      if (monsterIndex === undefined || !myField[monsterIndex]) {
        addLog('対象のモンスターが見つかりません', 'info');
        return false;
      }

      const monster = myField[monsterIndex];
      const healAmount = Math.min(300, monster.maxHp - monster.currentHp);

      if (healAmount <= 0) {
        addLog(`${monster.name}のHPは既に最大です`, 'info');
        return false;
      }

      setMyField(prev => {
        const newField = [...prev];
        newField[monsterIndex] = {
          ...newField[monsterIndex],
          currentHp: newField[monsterIndex].currentHp + healAmount,
        };
        return newField;
      });

      addLog(`輝聖女ルミナスの基本技: HPを${healAmount}回復！`, 'heal');
      return true;
    }

    // 上級技: 手札から光属性モンスター1体をコストなしで召喚
    if (context.skillType === 'advanced') {
      // 手札に光属性モンスターがあるか確認
      const lightMonsters = myHand.filter(card =>
        card.type === 'monster' && card.attribute === '光'
      );

      if (lightMonsters.length === 0) {
        addLog('手札に光属性モンスターがありません', 'info');
        return false;
      }

      // フィールドに空きがあるか確認
      const emptySlotIndex = myField.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog('フィールドに空きがありません', 'info');
        return false;
      }

      // 手札選択モードに入る
      setPendingHandSelection({
        message: '特殊召喚する光属性モンスターを選択',
        filter: (card) => card.type === 'monster' && card.attribute === '光',
        callback: (selectedCard) => {
          // フィールドの空きスロットを再確認
          const targetSlot = myField.findIndex(slot => slot === null);
          if (targetSlot === -1) {
            addLog('フィールドに空きがありません', 'info');
            return;
          }

          // モンスターインスタンスを作成
          const monsterInstance = createMonsterInstance(selectedCard, currentPlayer);

          // 手札から削除
          setMyHand(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));

          // フィールドに配置
          setMyField(prev => {
            const newField = [...prev];
            newField[targetSlot] = monsterInstance;
            return newField;
          });

          // トリガーを登録
          registerCardTriggers(monsterInstance, currentPlayer, targetSlot);

          // 常時効果を登録
          continuousEffectEngine.register(monsterInstance, currentPlayer);

          addLog(`輝聖女ルミナスの上級技: 「${selectedCard.name}」をコストなしで特殊召喚！`, 'heal');
        },
      });

      return true;
    }

    return false;
  },

  /**
   * C0000057: プリズム・ガーディアン
   * 基本技: 自分の光属性モンスター1体にこのターン【守護】（次に受けるダメージを半減）を付与。
   */
  C0000057: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { myField, setMyField } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // 自分の光属性モンスターを取得
      const lightMonsters = myField
        .map((m, idx) => ({ monster: m, index: idx }))
        .filter(({ monster }) => monster !== null && monster.attribute === '光');

      if (lightMonsters.length === 0) {
        addLog('プリズム・ガーディアン: 場に光属性モンスターがいません', 'info');
        return false;
      }

      const applyGuard = (targetIndex) => {
        const targetMonster = myField[targetIndex];
        if (!targetMonster) return;

        // GUARDステータスを付与（次に受けるダメージを半減、1回使用で消える）
        applyStatusToOwnMonster(context, targetIndex, STATUS_EFFECT_TYPES.GUARD, {
          duration: 0, // ターン終了時まで
          usesRemaining: 1, // 1回使用で消える
        }, 'プリズム・ガーディアン');

        addLog(`プリズム・ガーディアン: ${targetMonster.name}に【守護】を付与！`, 'heal');
      };

      // 1体のみの場合は自動選択
      if (lightMonsters.length === 1) {
        applyGuard(lightMonsters[0].index);
        return true;
      }

      // 複数いる場合は選択UI
      if (setPendingTargetSelection) {
        setPendingTargetSelection({
          message: '【守護】を付与する光属性モンスターを選択',
          targetType: 'own_monster',
          validIndices: lightMonsters.map(l => l.index),
          callback: (selectedIndex) => {
            applyGuard(selectedIndex);
          },
        });
        return true;
      }

      // フォールバック: 最初のモンスター
      applyGuard(lightMonsters[0].index);
      return true;
    }
    return false;
  },

  /**
   * C0000058: 熾天使セラフ
   * 基本技: 自分の墓地の光属性モンスター1体を手札に戻す。
   */
  C0000058: (skillText, context) => {
    const { addLog, setPendingGraveyardSelection, setShowGraveyardViewer } = context;
    const { myGraveyard, setMyGraveyard, setMyHand, currentPlayer } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // 墓地の光属性モンスターを検索
      const lightMonsters = myGraveyard.filter(card =>
        card.type === 'monster' && card.attribute === '光'
      );

      if (lightMonsters.length === 0) {
        addLog('熾天使セラフ: 墓地に光属性モンスターがいません', 'info');
        return false;
      }

      // 手札に戻す処理
      const returnToHand = (targetCard) => {
        setMyGraveyard(prev => prev.filter(c => c.uniqueId !== targetCard.uniqueId));
        setMyHand(prev => [...prev, targetCard]);
        addLog(`熾天使セラフ: ${targetCard.name}を墓地から手札に戻した`, 'heal');
      };

      // 1体のみの場合は自動選択
      if (lightMonsters.length === 1) {
        returnToHand(lightMonsters[0]);
        return true;
      }

      // 複数いる場合は墓地選択UIを表示
      if (setPendingGraveyardSelection && setShowGraveyardViewer) {
        setShowGraveyardViewer({ player: currentPlayer });
        setPendingGraveyardSelection({
          message: '手札に戻す光属性モンスターを選択',
          filter: (card) => card.type === 'monster' && card.attribute === '光',
          callback: (selectedCard) => {
            returnToHand(selectedCard);
          },
        });
        return true;
      }

      // フォールバック: 最初の1体を選択
      returnToHand(lightMonsters[0]);
      return true;
    }
    return false;
  },

  /**
   * C0000064: ルミナスの裁き
   * 【刹那詠唱】光以外の相手モンスター1体を破壊する。
   * 自分の場に光属性モンスターが2体以上いる場合、自分はその攻撃力の半分回復する。
   */
  C0000064: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { myField, opponentField, setOpponentField, setOpponentGraveyard, setMyLife, myLife } = getPlayerContext(context);

    // 光以外の相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null && monster.attribute !== '光');

    if (validTargets.length === 0) {
      addLog('ルミナスの裁き: 光以外の相手モンスターがいません', 'info');
      return false;
    }

    const executeDestroy = (targetIndex) => {
      const targetMonster = opponentField[targetIndex];
      if (!targetMonster) return;

      // 破壊処理
      setOpponentField(prev => {
        const newField = [...prev];
        newField[targetIndex] = null;
        return newField;
      });
      setOpponentGraveyard(prev => [...prev, targetMonster]);
      addLog(`ルミナスの裁き: ${targetMonster.name}を破壊！`, 'damage');

      // 光属性2体以上なら回復
      const lightCount = myField.filter(m => m !== null && m.attribute === '光').length;
      if (lightCount >= 2) {
        const healAmount = Math.floor(targetMonster.currentAttack / 2);
        setMyLife(prev => prev + healAmount);
        addLog(`ルミナスの裁き: 光属性${lightCount}体いるため、${healAmount}回復！`, 'heal');
      }
    };

    // 1体のみなら自動選択
    if (validTargets.length === 1) {
      executeDestroy(validTargets[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: '破壊する光以外の相手モンスターを選択',
        targetType: 'opponent_monster',
        validIndices: validTargets.map(t => t.index),
        callback: (selectedIndex) => {
          executeDestroy(selectedIndex);
        },
      });
      return true;
    }

    // フォールバック
    executeDestroy(validTargets[0].index);
    return true;
  },

  /**
   * C0000065: 天使の波動
   * 【刹那詠唱】相手モンスター全体に、場にいる光属性モンスターの数×300ダメージを与える。
   */
  C0000065: (skillText, context) => {
    const { addLog } = context;
    const { myField, opponentField, setOpponentField, setOpponentGraveyard } = getPlayerContext(context);

    // 光属性モンスターをカウント
    const lightCount = myField.filter(m => m !== null && m.attribute === '光').length;
    if (lightCount === 0) {
      addLog('天使の波動: 場に光属性モンスターがいないため効果なし', 'info');
      return false;
    }

    const damage = lightCount * 300;
    addLog(`天使の波動: 光属性${lightCount}体 × 300 = ${damage}ダメージを全体に！`, 'damage');

    // 相手モンスター全体にダメージ
    const destroyedMonsters = [];
    setOpponentField(prev => {
      return prev.map((monster, idx) => {
        if (monster) {
          const newHp = monster.currentHp - damage;
          if (newHp <= 0) {
            destroyedMonsters.push(monster);
            return null;
          }
          return { ...monster, currentHp: newHp };
        }
        return monster;
      });
    });

    // 破壊されたモンスターを墓地に
    if (destroyedMonsters.length > 0) {
      setOpponentGraveyard(prev => [...prev, ...destroyedMonsters]);
      destroyedMonsters.forEach(m => {
        addLog(`${m.name}が破壊された！`, 'damage');
      });
    }

    return true;
  },

  /**
   * C0000066: ホーリーライトサモン
   * デッキからランダムなコスト3以下の光属性モンスター1体を場に出す（コスト不要）。
   */
  C0000066: (skillText, context) => {
    const { addLog } = context;
    const { myDeck, myField, setMyDeck, setMyField, currentPlayer } = getPlayerContext(context);

    // フィールドに空きがあるか
    const emptySlotIndex = myField.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
      addLog('ホーリーライトサモン: フィールドに空きがありません', 'info');
      return false;
    }

    // デッキからコスト3以下の光属性モンスターを検索
    const candidates = myDeck.filter(card =>
      card.type === 'monster' &&
      card.attribute === '光' &&
      card.cost <= 3
    );

    if (candidates.length === 0) {
      addLog('ホーリーライトサモン: デッキにコスト3以下の光属性モンスターがいません', 'info');
      return false;
    }

    // ランダムに1体選択
    const selectedCard = candidates[Math.floor(Math.random() * candidates.length)];

    // デッキから削除
    setMyDeck(prev => prev.filter(c => c.uniqueId !== selectedCard.uniqueId));

    // モンスターインスタンスを作成して場に配置
    const monsterInstance = createMonsterInstance(selectedCard, currentPlayer);
    setMyField(prev => {
      const newField = [...prev];
      newField[emptySlotIndex] = monsterInstance;
      return newField;
    });

    // トリガーと常時効果を登録
    registerCardTriggers(monsterInstance, currentPlayer, emptySlotIndex);
    continuousEffectEngine.register(monsterInstance, currentPlayer);

    addLog(`ホーリーライトサモン: デッキから「${selectedCard.name}」を特殊召喚！`, 'heal');
    return true;
  },

  /**
   * C0000067: ルミナス・ドミネーション
   * 相手の場にいるモンスター1体のコントロールをターン終了時まで奪う。
   * そのモンスターの攻撃力は半分になる。
   */
  C0000067: (skillText, context) => {
    const { addLog, setPendingTargetSelection } = context;
    const { myField, opponentField, setMyField, setOpponentField, currentPlayer } = getPlayerContext(context);

    // 相手モンスターを取得
    const validTargets = opponentField
      .map((m, idx) => ({ monster: m, index: idx }))
      .filter(({ monster }) => monster !== null);

    if (validTargets.length === 0) {
      addLog('ルミナス・ドミネーション: 相手フィールドにモンスターがいません', 'info');
      return false;
    }

    // 自分フィールドに空きがあるか
    const emptySlotIndex = myField.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
      addLog('ルミナス・ドミネーション: 自分フィールドに空きがありません', 'info');
      return false;
    }

    const executeControl = (targetIndex) => {
      const targetMonster = opponentField[targetIndex];
      if (!targetMonster) return;

      // 相手フィールドから削除
      setOpponentField(prev => {
        const newField = [...prev];
        newField[targetIndex] = null;
        return newField;
      });

      // 攻撃力を半分にして自分フィールドに配置
      const controlledMonster = {
        ...targetMonster,
        currentAttack: Math.floor(targetMonster.currentAttack / 2),
        owner: currentPlayer,
        controlledUntilEndOfTurn: true, // ターン終了時にコントロールを返す
        originalOwner: targetMonster.owner || (currentPlayer === 1 ? 2 : 1),
        canAttack: true, // コントロール奪取後は攻撃可能
      };

      setMyField(prev => {
        const newField = [...prev];
        newField[emptySlotIndex] = controlledMonster;
        return newField;
      });

      addLog(`ルミナス・ドミネーション: ${targetMonster.name}のコントロールを奪取！攻撃力が半分に！`, 'info');
    };

    // 1体のみなら自動選択
    if (validTargets.length === 1) {
      executeControl(validTargets[0].index);
      return true;
    }

    // 複数いる場合は選択UI
    if (setPendingTargetSelection) {
      setPendingTargetSelection({
        message: 'コントロールを奪う相手モンスターを選択',
        targetType: 'opponent_monster',
        validIndices: validTargets.map(t => t.index),
        callback: (selectedIndex) => {
          executeControl(selectedIndex);
        },
      });
      return true;
    }

    // フォールバック
    executeControl(validTargets[0].index);
    return true;
  },

  /**
   * C0000068: クリスタルブレス
   * 次の自分のターン、自分の光属性モンスターの召喚コストを1軽減。
   * Note: この効果は常時効果システムで実装するのが本来ですが、
   *       簡易実装としてフラグを立てる形式で対応。
   */
  C0000068: (skillText, context) => {
    const { addLog } = context;
    // 常時効果として登録するのが本来の実装だが、
    // 現状は効果が発動したことをログに表示するのみ
    addLog('クリスタルブレス: 次の自分のターン、光属性モンスターの召喚コスト-1！', 'heal');
    // TODO: 常時効果システムで次ターンのコスト軽減を実装
    return true;
  },

  /**
   * C0000069: 聖なる浄化
   * 場にいる全てのモンスターの効果をターン終了時まで無効化し、
   * 場のモンスター全体に2000ダメージを与える。
   */
  C0000069: (skillText, context) => {
    const { addLog } = context;
    const { setMyField, setOpponentField, setMyGraveyard, setOpponentGraveyard } = getPlayerContext(context);

    addLog('聖なる浄化: 全モンスターの効果を無効化し、2000ダメージ！', 'damage');

    const damage = 2000;
    const myDestroyedMonsters = [];
    const opponentDestroyedMonsters = [];

    // 自分フィールドのモンスターにダメージ
    setMyField(prev => {
      return prev.map(monster => {
        if (monster) {
          const newHp = monster.currentHp - damage;
          if (newHp <= 0) {
            myDestroyedMonsters.push(monster);
            return null;
          }
          return {
            ...monster,
            currentHp: newHp,
            effectNegated: true, // 効果無効化フラグ
          };
        }
        return monster;
      });
    });

    // 相手フィールドのモンスターにダメージ
    setOpponentField(prev => {
      return prev.map(monster => {
        if (monster) {
          const newHp = monster.currentHp - damage;
          if (newHp <= 0) {
            opponentDestroyedMonsters.push(monster);
            return null;
          }
          return {
            ...monster,
            currentHp: newHp,
            effectNegated: true, // 効果無効化フラグ
          };
        }
        return monster;
      });
    });

    // 破壊されたモンスターを墓地に
    if (myDestroyedMonsters.length > 0) {
      setMyGraveyard(prev => [...prev, ...myDestroyedMonsters]);
      myDestroyedMonsters.forEach(m => {
        addLog(`${m.name}が破壊された！`, 'damage');
      });
    }

    if (opponentDestroyedMonsters.length > 0) {
      setOpponentGraveyard(prev => [...prev, ...opponentDestroyedMonsters]);
      opponentDestroyedMonsters.forEach(m => {
        addLog(`${m.name}が破壊された！`, 'damage');
      });
    }

    return true;
  },

  // 他の光属性カードを追加...
};
