// ========================================
// [属性名]属性カードの固有効果
// 新規カード追加時のテンプレート
// ========================================

import {
  // プレイヤーコンテキスト抽象化（必須）
  getPlayerContext,
  // 効果ヘルパー関数（必要なもののみインポート）
  millDeck,
  millOpponentDeck,
  checkAttribute,
  conditionalDamage,
  searchCard,
  reviveFromGraveyard,
  destroyMonster,
  drawCards,
  healLife,
  modifyAttack,
  modifyHP,
} from '../effectHelpers';

/**
 * [属性名]属性カードの固有効果
 */
export const templateCardEffects = {
  // ========================================
  // 使用パターン解説
  // ========================================
  //
  // 【旧パターン】（非推奨）:
  // C0000XXX: (skillText, context) => {
  //   const {
  //     addLog, currentPlayer, p1Field, p2Field, setP1Field, setP2Field,
  //     p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, ...
  //   } = context;
  //   const myField = currentPlayer === 1 ? p1Field : p2Field;
  //   const opponentField = currentPlayer === 1 ? p2Field : p1Field;
  //   // ... 10-20行のボイラープレート
  // }
  //
  // 【新パターン】（推奨）:
  // C0000XXX: (skillText, context) => {
  //   const { addLog, monsterIndex } = context;  // 共通プロパティのみ
  //   const { myField, opponentField, setMyField } = getPlayerContext(context);  // 必要なものだけ
  //   // ... すぐに効果処理へ
  // }
  //
  // ========================================

  /**
   * C0000XXX: [カード名]
   * [効果の詳細説明]
   * 例: 基本技: 自分のデッキ上1枚を墓地に送る、それが「未来属性」カードなら相手プレイヤーに300ダメージ、違えばこのカードに300ダメージ。
   */
  C0000XXX: (skillText, context) => {
    // === 共通プロパティ（contextから直接取得） ===
    const { addLog, monsterIndex } = context;

    // === プレイヤー依存プロパティ（getPlayerContextから取得） ===
    // 必要なものだけ分割代入する
    const {
      myField,
      opponentField,
      setMyField,
      myGraveyard,
      setMyGraveyard,
    } = getPlayerContext(context);

    // 召喚時効果の場合
    if (skillText.includes('【召喚時】')) {
      addLog('召喚時効果を発動！', 'info');
      // 召喚時効果の実装...
      return true;
    }

    // 基本技の場合（context.skillType で判定）
    if (context.skillType === 'basic') {
      addLog('基本技を発動！', 'info');

      // 例: デッキから1枚墓地に送る
      const milledCards = millDeck(context, 1);
      if (milledCards.length === 0) {
        return false;
      }

      // 例: 条件分岐
      const milledCard = milledCards[0];
      if (checkAttribute(milledCard, '未来')) {
        conditionalDamage(context, 300, 'opponent');
      } else {
        conditionalDamage(context, 300, 'self_monster');
      }

      return true;
    }

    // 上級技の場合（context.skillType で判定）
    if (context.skillType === 'advanced') {
      addLog('上級技を発動！', 'info');
      // 上級技の実装...
      return true;
    }

    return false;
  },

  /**
   * C0000YYY: [別のカード名 - シンプルな例]
   * フィールド操作の例
   */
  C0000YYY: (skillText, context) => {
    const { addLog, monsterIndex } = context;
    const { myField, opponentField, setOpponentField } = getPlayerContext(context);

    if (context.skillType === 'basic') {
      // 自分のモンスターを参照
      const myMonster = myField[monsterIndex];
      if (!myMonster) return false;

      // 相手フィールドを操作
      const opponentMonsters = opponentField.filter(m => m !== null);
      if (opponentMonsters.length === 0) {
        addLog('相手の場にモンスターがいません', 'info');
        return false;
      }

      // 相手全体に効果
      setOpponentField(prev => prev.map(m => {
        if (m) {
          return { ...m, currentHp: Math.max(0, m.currentHp - 200) };
        }
        return m;
      }));

      addLog('相手全体に200ダメージ！', 'damage');
      return true;
    }

    return false;
  },

  // ========================================
  // getPlayerContext で取得できるプロパティ一覧
  // ========================================
  //
  // フィールド:
  //   myField, opponentField, setMyField, setOpponentField
  //
  // 手札:
  //   myHand, opponentHand, setMyHand, setOpponentHand
  //
  // デッキ:
  //   myDeck, opponentDeck, setMyDeck, setOpponentDeck
  //
  // 墓地:
  //   myGraveyard, opponentGraveyard, setMyGraveyard, setOpponentGraveyard
  //
  // ライフ:
  //   myLife, opponentLife, setMyLife, setOpponentLife
  //
  // SP（アクティブ）:
  //   myActiveSP, opponentActiveSP, setMyActiveSP, setOpponentActiveSP
  //
  // SP（レスト）:
  //   myRestedSP, opponentRestedSP, setMyRestedSP, setOpponentRestedSP
  //
  // フィールドカード:
  //   myFieldCard, opponentFieldCard, setMyFieldCard, setOpponentFieldCard
  //
  // フェイズカード:
  //   myPhaseCard, opponentPhaseCard, setMyPhaseCard, setOpponentPhaseCard
  //
  // ユーティリティ:
  //   isP1 (currentPlayer === 1)
  //   currentPlayer (元の値)
  //
  // ========================================
  // contextから直接取得するプロパティ
  // ========================================
  //
  // 共通:
  //   addLog, monsterIndex, skillType
  //
  // UI制御:
  //   setPendingHandSelection, setPendingMonsterTarget,
  //   setPendingMonsterTarget, setPendingGraveyardSelection,
  //   setPendingDeckReview, setShowGraveyardViewer
  //
  // レアケース（特定カードのみ）:
  //   attacker, attackerIndex
  //   setP1MagicBlocked, setP2MagicBlocked
  //   setP1NextTurnSPBonus, setP2NextTurnSPBonus
  //
  // ========================================
};
