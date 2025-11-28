/**
 * 属性なし（なし）カードのトリガー実装
 *
 * このファイルには属性なしカードの個別トリガー効果を実装します。
 * 各カードは独自のトリガー定義を持ち、triggerEngineによって管理されます。
 */

import { TRIGGER_TYPES, ACTIVATION_TYPES, TRIGGER_PRIORITIES } from '../triggerTypes';
import {
  getPlayerContext,
  conditionalDamage,
  drawCards,
  healLife,
  modifyAttack,
  modifyHP,
} from '../effectHelpers';
import { hasCategory } from '../../utils/helpers';

/**
 * 属性なしカードのトリガー定義
 * カードID => トリガー配列のマッピング
 */
export const neutralCardTriggers = {
  // ========================================
  // モンスターカード
  // ========================================

  /**
   * C0000189: 旅の助っ人
   * 【自分メインフェイズ時、墓地で発動】このカードを除外して、レスト状態のSPトークンを１つアクティブにする。
   */
  C0000189: [
    {
      type: TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: '墓地発動: 除外してSP1回復',
      priority: TRIGGER_PRIORITIES.NORMAL,
      effect: (context) => {
        const {
          currentPlayer,
          p1ActiveSP, p2ActiveSP, setP1ActiveSP, setP2ActiveSP,
          p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP,
          p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
          card, addLog,
        } = context;

        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        if (restedSP < 1) {
          addLog('旅の助っ人: レスト状態のSPがありません', 'info');
          return false;
        }

        // 墓地から除外
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        setGraveyard((prev) => prev.filter((c) => c.uniqueId !== card.uniqueId));

        // SPをアクティブに
        const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
        const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
        setActiveSP((prev) => prev + 1);
        setRestedSP((prev) => prev - 1);

        addLog('旅の助っ人を除外してSPを1回復！', 'heal');
        return true;
      },
    },
  ],

  /**
   * C0000190: 守りの歩哨
   * 【自壊時】自分のライフを300回復。
   */
  C0000190: [
    {
      type: TRIGGER_TYPES.ON_DESTROY_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '自壊時: ライフ300回復',
      effect: (context) => {
        healLife(context, 300, true);
        context.addLog('守りの歩哨の効果: ライフを300回復！', 'heal');
      },
    },
  ],

  /**
   * C0000191: 反撃の使者
   * 【相手モンスターに攻撃された時】、戦闘終了後にその相手モンスターに1200ダメージを与える。
   */
  C0000191: [
    {
      type: TRIGGER_TYPES.ON_ATTACKED,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '被攻撃時: 相手モンスターに1200ダメージ',
      effect: (context) => {
        const { attackerIndex, currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        // 攻撃者は相手側のモンスター
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        if (attackerIndex !== undefined && opponentField[attackerIndex]) {
          setOpponentField((prev) => {
            const newField = [...prev];
            if (newField[attackerIndex]) {
              const newHp = newField[attackerIndex].currentHp - 1200;
              if (newHp <= 0) {
                addLog(`${newField[attackerIndex].name}が反撃で破壊された！`, 'damage');
                newField[attackerIndex] = null;
              } else {
                newField[attackerIndex] = { ...newField[attackerIndex], currentHp: newHp };
                addLog(`反撃の使者の効果: ${newField[attackerIndex].name}に1200ダメージ！`, 'damage');
              }
            }
            return newField;
          });
        }
      },
    },
  ],

  /**
   * C0000192: 影の運び手
   * 【召喚時】自分の墓地のモンスター1体をデッキに戻し、自分のレスト状態のSPトークン１つをアクティブにする。
   */
  C0000192: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 墓地モンスター→デッキ、SP1回復',
      effect: (context) => {
        const {
          currentPlayer,
          p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard,
          p1Deck, p2Deck, setP1Deck, setP2Deck,
          p1ActiveSP, p2ActiveSP, setP1ActiveSP, setP2ActiveSP,
          p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP,
          addLog,
        } = context;

        const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
        const monsters = graveyard.filter((c) => c.type === 'monster');

        if (monsters.length === 0) {
          addLog('影の運び手: 墓地にモンスターがいません', 'info');
          return false;
        }

        // 最初のモンスターをデッキに戻す
        const targetMonster = monsters[0];
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;

        setGraveyard((prev) => prev.filter((c) => c.uniqueId !== targetMonster.uniqueId));
        setDeck((prev) => {
          const newDeck = [...prev, targetMonster];
          // シャッフル
          for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
          }
          return newDeck;
        });

        addLog(`影の運び手の効果: ${targetMonster.name}をデッキに戻した！`, 'info');

        // SPをアクティブに
        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        if (restedSP >= 1) {
          const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
          const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
          setActiveSP((prev) => prev + 1);
          setRestedSP((prev) => prev - 1);
          addLog('影の運び手の効果: SPを1回復！', 'heal');
        }

        return true;
      },
    },
  ],

  /**
   * C0000205: 囁く賢者
   * 【召喚時】自分のデッキの上から3枚を確認し、好きな順番で戻す。
   * 【墓地に送られたとき】デッキから1枚ドローする。
   */
  C0000205: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: デッキトップ3枚を並び替え',
      effect: (context) => {
        const { addLog } = context;
        // TODO: UIでカードを確認して並び替える機能が必要
        addLog('囁く賢者の効果: デッキトップ3枚を確認（並び替え未実装）', 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_DAMAGE_RECEIVED, // 墓地送りトリガーの代替
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '墓地送り時: 1枚ドロー',
      condition: (context) => {
        // このトリガーは墓地送り時に発動（ON_SENT_TO_GRAVEYARDがない場合の代替）
        return false; // 通常は発動しない。別のタイミングで処理
      },
      effect: (context) => {
        drawCards(context, 1);
        context.addLog('囁く賢者の効果: 1枚ドロー！', 'info');
      },
    },
  ],

  /**
   * C0000219: 団長プニリーヌ・ソフティア
   * 【常時】場にいる間、［蛮族］モンスターの攻撃力300アップ。
   * 【エンドフェイズ時】HPを500回復。
   */
  C0000219: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 蛮族の攻撃力+300',
      effect: (context) => {
        // 常時効果は別システムで処理予定
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: HP500回復',
      effect: (context) => {
        const { currentPlayer, slotIndex, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const field = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        // このカードのHP回復
        setField((prev) => {
          return prev.map((monster, idx) => {
            if (monster && monster.name === '団長プニリーヌ・ソフティア') {
              const newHp = Math.min(monster.currentHp + 500, monster.hp);
              addLog(`団長プニリーヌ・ソフティアのHPが${newHp - monster.currentHp}回復！`, 'heal');
              return { ...monster, currentHp: newHp };
            }
            return monster;
          });
        });
      },
    },
  ],

  /**
   * C0000220: 鉄槍騎士団のゲスール
   * 【エンドフェイズ時】《プニリーヌ》モンスターが場にいる場合、相手モンスター全体に500ダメージ。
   */
  C0000220: [
    {
      type: TRIGGER_TYPES.ON_END_PHASE,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: プニリーヌがいれば全体500ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;

        const myField = currentPlayer === 1 ? p1Field : p2Field;
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        // プニリーヌがいるかチェック
        const hasPunirine = myField.some((m) => m && m.name && m.name.includes('プニリーヌ'));

        if (!hasPunirine) {
          return;
        }

        let damaged = false;
        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              damaged = true;
              const newHp = monster.currentHp - 500;
              if (newHp <= 0) {
                addLog(`${monster.name}がゲスールの効果で破壊された！`, 'damage');
                return null;
              }
              return { ...monster, currentHp: newHp };
            }
            return monster;
          });
        });

        if (damaged) {
          addLog('ゲスールの効果: 相手全体に500ダメージ！', 'damage');
        }
      },
    },
  ],

  /**
   * C0000221: 鉄槍騎士団のマグラ
   * 【召喚時】相手の手札1枚をランダムに墓地に送る。
   */
  C0000221: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 相手手札1枚を墓地へ',
      effect: (context) => {
        const { currentPlayer, p1Hand, p2Hand, setP1Hand, setP2Hand, p1Graveyard, p2Graveyard, setP1Graveyard, setP2Graveyard, addLog } = context;

        const opponentHand = currentPlayer === 1 ? p2Hand : p1Hand;
        const setOpponentHand = currentPlayer === 1 ? setP2Hand : setP1Hand;
        const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;

        if (opponentHand.length === 0) {
          addLog('マグラの効果: 相手の手札がありません', 'info');
          return;
        }

        const randomIndex = Math.floor(Math.random() * opponentHand.length);
        const discardedCard = opponentHand[randomIndex];

        setOpponentHand((prev) => prev.filter((_, i) => i !== randomIndex));
        setOpponentGraveyard((prev) => [...prev, discardedCard]);

        addLog(`マグラの効果: 相手の${discardedCard.name}を墓地に送った！`, 'damage');
      },
    },
  ],

  /**
   * C0000222: 鉄槍騎士団のウィア
   * 【常時】《プニリーヌ》モンスターが場にいるときこのカードの攻撃力を500アップする。
   */
  C0000222: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: プニリーヌがいれば攻撃力+500',
      effect: (context) => {
        // 常時効果は別システムで処理予定
      },
    },
  ],

  /**
   * C0000224: 鉄槍騎士団の奴隷プニリーヌ
   * 【召喚時】場にいる［蛮族］モンスターの数×600ダメージを相手モンスター全体と相手プレイヤーに与える。
   * 【エンドフェイズ時】自分のライフを300減らす。
   */
  C0000224: [
    {
      type: TRIGGER_TYPES.ON_SUMMON,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '召喚時: 蛮族数×600ダメージ（全体＋プレイヤー）',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP2Field, setP1Field, addLog } = context;

        const myField = currentPlayer === 1 ? p1Field : p2Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        // 蛮族の数をカウント
        const barbarianCount = myField.filter((m) => m && hasCategory(m, '【蛮族】')).length;

        if (barbarianCount === 0) {
          addLog('奴隷プニリーヌの効果: 蛮族がいません', 'info');
          return;
        }

        const damage = barbarianCount * 600;

        // 相手モンスター全体にダメージ
        setOpponentField((prev) => {
          return prev.map((monster) => {
            if (monster) {
              const newHp = monster.currentHp - damage;
              if (newHp <= 0) {
                addLog(`${monster.name}が奴隷プニリーヌの効果で破壊された！`, 'damage');
                return null;
              }
              return { ...monster, currentHp: newHp };
            }
            return monster;
          });
        });

        // 相手プレイヤーにダメージ
        conditionalDamage(context, damage, 'opponent');
        addLog(`奴隷プニリーヌの効果: ${barbarianCount}体×600=${damage}ダメージ！`, 'damage');
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: ライフ-300',
      effect: (context) => {
        const { currentPlayer, setP1Life, setP2Life, addLog } = context;
        const setLife = currentPlayer === 1 ? setP1Life : setP2Life;
        setLife((prev) => prev - 300);
        addLog('奴隷プニリーヌの代償: ライフ-300', 'damage');
      },
    },
  ],

  /**
   * C0000310: 鉄槍の訓練兵
   * 【変幻身】メインフェイズにSPコストを2払うことで場のこのモンスターを別の形態に変化する。
   */
  C0000310: [
    {
      type: TRIGGER_TYPES.ON_MAIN_PHASE_SELF,
      activationType: ACTIVATION_TYPES.OPTIONAL,
      description: 'メインフェイズ時: 変幻身（SP2払い形態変化）',
      costCheck: (context) => {
        const { currentPlayer, p1ActiveSP, p2ActiveSP } = context;
        const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
        return activeSP >= 2;
      },
      effect: (context) => {
        const { addLog } = context;
        // TODO: 変幻身システムの実装が必要
        addLog('鉄槍の訓練兵: 変幻身（未実装）', 'info');
      },
    },
  ],

  /**
   * C0000317: 鉄槍の騎士長
   * 【常時】自分の《鉄槍》モンスターの攻撃力を300アップ。
   */
  C0000317: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 鉄槍モンスターの攻撃力+300',
      effect: (context) => {
        // 常時効果は別システムで処理予定
      },
    },
  ],

  /**
   * C0000401: 呪術狩りの傭兵バランド
   * 【常時】自分の他のモンスターが闇属性モンスターに与えるダメージを200アップ。
   */
  C0000401: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 闘属性へのダメージ+200',
      effect: (context) => {
        // 常時効果は別システムで処理予定
      },
    },
  ],

  // ========================================
  // フィールドカード
  // ========================================

  /**
   * C0000229: 鉄槍騎士団の宿舎
   * 【常時】《鉄槍》モンスターの攻撃力を400アップ。
   * 【エンドフェイズ時】《プニリーヌ》モンスターが場にいればレスト状態のSPを１つアクティブにする。
   * 場に【蛮族】モンスターが3体以上いるとき相手モンスター全体に200ダメージを与え、攻撃力を200ダウン。
   */
  C0000229: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 鉄槍モンスターの攻撃力+400',
      effect: (context) => {
        // 常時効果は別システムで処理予定
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: プニリーヌがいればSP回復＆蛮族3体以上で全体ダメージ',
      effect: (context) => {
        const {
          currentPlayer,
          p1Field, p2Field,
          setP1Field, setP2Field,
          p1ActiveSP, p2ActiveSP, setP1ActiveSP, setP2ActiveSP,
          p1RestedSP, p2RestedSP, setP1RestedSP, setP2RestedSP,
          addLog,
        } = context;

        const myField = currentPlayer === 1 ? p1Field : p2Field;
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        // プニリーヌチェック
        const hasPunirine = myField.some((m) => m && m.name && m.name.includes('プニリーヌ'));
        if (hasPunirine) {
          const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
          if (restedSP >= 1) {
            const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
            const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
            setActiveSP((prev) => prev + 1);
            setRestedSP((prev) => prev - 1);
            addLog('鉄槍騎士団の宿舎: SPを1回復！', 'heal');
          }
        }

        // 蛮族3体以上チェック
        const barbarianCount = myField.filter((m) => m && hasCategory(m, '【蛮族】')).length;
        if (barbarianCount >= 3) {
          setOpponentField((prev) => {
            return prev.map((monster) => {
              if (monster) {
                const newHp = monster.currentHp - 200;
                const newAttack = monster.currentAttack - 200;
                if (newHp <= 0) {
                  addLog(`${monster.name}が宿舎の効果で破壊された！`, 'damage');
                  return null;
                }
                return { ...monster, currentHp: newHp, currentAttack: Math.max(0, newAttack) };
              }
              return monster;
            });
          });
          addLog('鉄槍騎士団の宿舎: 相手全体に200ダメージ＆攻撃力-200！', 'damage');
        }
      },
    },
  ],

  /**
   * C0000242: ご主人様のアパート
   * 【常時】《ご主人様》または《リリカ》と名の付くモンスターの攻撃力を400アップ。
   * 【自分エンドフェイズ時】《ご主人様》が場にいるとき、1枚ドローする。
   */
  C0000242: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: ご主人様/リリカの攻撃力+400',
      effect: (context) => {
        // 常時効果は別システムで処理予定
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: ご主人様がいれば1ドロー',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, addLog } = context;

        const myField = currentPlayer === 1 ? p1Field : p2Field;
        const hasGoshujinsama = myField.some((m) => m && m.name && m.name.includes('ご主人様'));

        if (hasGoshujinsama) {
          drawCards(context, 1);
          addLog('ご主人様のアパートの効果: 1枚ドロー！', 'info');
        }
      },
    },
  ],

  /**
   * C0000289: 薬師の隠れ家
   * 【常時】場にいる《毒》と名の付くモンスターの攻撃力を400アップ。
   * 【自分エンドフェイズ時】自分のライフを300回復。
   */
  C0000289: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 毒モンスターの攻撃力+400',
      effect: (context) => {
        // 常時効果は別システムで処理予定
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: ライフ300回復',
      effect: (context) => {
        healLife(context, 300, true);
        context.addLog('薬師の隠れ家の効果: ライフ300回復！', 'heal');
      },
    },
  ],

  /**
   * C0000376: 虹羽の微脈
   * 【常時】自分のターン中《虹羽密林》モンスターの攻撃力を500アップ。
   * 【自分エンドフェイズ時】自分の場の《虹羽密林》モンスターの属性によって、以下の効果から1つを選択：
   *   水: ライフ300回復
   *   光: SPを1アクティブ
   *   炎: 相手モンスター1体に400ダメージ
   */
  C0000376: [
    {
      type: TRIGGER_TYPES.CONTINUOUS,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '常時: 虹羽密林モンスターの攻撃力+500（自分ターン中）',
      effect: (context) => {
        // 常時効果は別システムで処理予定
      },
    },
    {
      type: TRIGGER_TYPES.ON_END_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: 'エンドフェイズ時: 虹羽密林の属性に応じた効果',
      effect: (context) => {
        const {
          currentPlayer, p1Field, p2Field,
          setP1ActiveSP, setP2ActiveSP, setP1RestedSP, setP2RestedSP,
          p1RestedSP, p2RestedSP,
          setP2Field, setP1Field,
          addLog,
        } = context;

        const myField = currentPlayer === 1 ? p1Field : p2Field;
        const rainbowMonsters = myField.filter((m) => m && m.name && m.name.includes('虹羽密林'));

        if (rainbowMonsters.length === 0) {
          return;
        }

        // 最初に見つかった属性で効果を適用
        const firstMonster = rainbowMonsters[0];
        const attribute = firstMonster.attribute;

        if (attribute === '水') {
          healLife(context, 300, true);
          addLog('虹羽の微脈（水）: ライフ300回復！', 'heal');
        } else if (attribute === '光') {
          const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
          if (restedSP >= 1) {
            const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
            const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
            setActiveSP((prev) => prev + 1);
            setRestedSP((prev) => prev - 1);
            addLog('虹羽の微脈（光）: SP1回復！', 'heal');
          }
        } else if (attribute === '炎') {
          const opponentField = currentPlayer === 1 ? p2Field : p1Field;
          const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
          const targets = opponentField.filter((m) => m !== null);
          if (targets.length > 0) {
            const randomIndex = opponentField.findIndex((m) => m !== null);
            setOpponentField((prev) => {
              const newField = [...prev];
              if (newField[randomIndex]) {
                const newHp = newField[randomIndex].currentHp - 400;
                if (newHp <= 0) {
                  addLog(`${newField[randomIndex].name}が虹羽の微脈で破壊された！`, 'damage');
                  newField[randomIndex] = null;
                } else {
                  newField[randomIndex] = { ...newField[randomIndex], currentHp: newHp };
                }
              }
              return newField;
            });
            addLog('虹羽の微脈（炎）: 相手モンスターに400ダメージ！', 'damage');
          }
        }
      },
    },
  ],

  // ========================================
  // フェーズカード
  // ========================================

  /**
   * C0000383: 虹羽密林の共鳴弦
   * 初期効果: 【自分のコスト3以下の水、光、炎属性モンスターの召喚時】、そのモンスターの攻撃力をターン終了時まで300アップ。
   * 1枚重ね: 【自分ドローフェイズ】虹羽密林モンスターがいればドロー+1
   * 2枚重ね: 【自分のコスト3以下の召喚時】SP1アクティブ（1ターンに1度）
   * 3枚重ね: 水/光/炎モンスター攻撃力+500、このカードを墓地へ
   */
  C0000383: [
    {
      type: TRIGGER_TYPES.ON_COST_SUMMON_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '初期効果: コスト3以下の水/光/炎モンスター召喚時、攻撃力+300',
      condition: (context) => {
        const { card } = context;
        // 召喚されたカードがコスト3以下かつ水/光/炎属性
        return (
          card &&
          card.cost <= 3 &&
          ['水', '光', '炎'].includes(card.attribute)
        );
      },
      effect: (context) => {
        const { card, slotIndex, currentPlayer, setP1Field, setP2Field, addLog } = context;

        const setField = currentPlayer === 1 ? setP1Field : setP2Field;
        setField((prev) => {
          return prev.map((monster, idx) => {
            if (idx === slotIndex && monster) {
              return { ...monster, currentAttack: monster.currentAttack + 300 };
            }
            return monster;
          });
        });

        addLog(`虹羽密林の共鳴弦: ${card.name}の攻撃力+300！`, 'info');
      },
    },
    {
      type: TRIGGER_TYPES.ON_DRAW_PHASE_SELF,
      activationType: ACTIVATION_TYPES.AUTOMATIC,
      description: '1枚重ね: 虹羽密林モンスターがいればドロー+1',
      condition: (context) => {
        // フェーズカードのスタック数をチェック（1枚重ね以上）
        // TODO: フェーズカードのスタックシステムの実装が必要
        return false; // 現在は無効
      },
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, addLog } = context;

        const myField = currentPlayer === 1 ? p1Field : p2Field;
        const hasRainbow = myField.some((m) => m && m.name && m.name.includes('虹羽密林'));

        if (hasRainbow) {
          drawCards(context, 1);
          addLog('虹羽密林の共鳴弦: 追加ドロー！', 'info');
        }
      },
    },
  ],
};

// ========================================
// ヘルパー関数
// ========================================

/**
 * カードIDに対応するトリガーが定義されているかチェック
 * @param {string} cardId - カードID
 * @returns {boolean} トリガーが定義されている場合true
 */
export const hasNeutralCardTrigger = (cardId) => {
  return cardId && neutralCardTriggers[cardId] !== undefined;
};

/**
 * カードIDに対応するトリガー配列を取得
 * @param {string} cardId - カードID
 * @returns {Array|null} トリガー配列、または未定義の場合null
 */
export const getNeutralCardTriggers = (cardId) => {
  if (!cardId || !neutralCardTriggers[cardId]) {
    return null;
  }
  return neutralCardTriggers[cardId];
};

/**
 * 実装されているカード数を取得
 * @returns {number} 実装カード数
 */
export const getNeutralCardTriggersCount = () => {
  return Object.keys(neutralCardTriggers).length;
};
