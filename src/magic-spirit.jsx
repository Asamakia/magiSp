import React, { useState, useEffect, useCallback } from 'react';
import {
  INITIAL_LIFE,
  INITIAL_SP,
  MAX_SP,
  INITIAL_HAND_SIZE,
  COUNTER_ATTACK_RATE,
  PHASES,
} from './utils/constants';
import { createDeck, createMonsterInstance, createDeckFromPrebuilt } from './utils/helpers';
import { getDeckOptions } from './decks/prebuiltDecks';
import { loadCardsFromCSV, SAMPLE_CARDS } from './utils/cardManager';
import { executeSkillEffects } from './engine/effectEngine';
import {
  registerCardTriggers,
  unregisterCardTriggers,
  fireTrigger,
  clearAllTriggers,
  resetTurnFlags,
  getCardMainPhaseTriggers,
  getCardGraveyardTriggers,
  hasCardTrigger,
  parseCardTriggers,
} from './engine/triggerEngine';
import { TRIGGER_TYPES } from './engine/triggerTypes';
import {
  getPhaseCardStageText,
  getStageName,
  getStageShortName,
  getCurrentStageDescription,
  getNextStageDescription,
} from './engine/phaseCardEffects';
import { continuousEffectEngine } from './engine/continuousEffects';
import styles from './styles/gameStyles';
import Card from './components/Card';
import FieldMonster from './components/FieldMonster';
import SPTokens from './components/SPTokens';
import GameLog from './components/GameLog';

// ========================================
// 効果テキストから基本技・上級技を除外するヘルパー関数
// （情報パネルでの重複表示を防ぐため）
// ========================================
const getEffectWithoutSkills = (effectText) => {
  if (!effectText) return effectText;
  // 基本技と上級技の記述を削除（句点または文末まで）
  return effectText
    .replace(/基本技[：:][^。\n]+[。]?/g, '')
    .replace(/上級技[：:][^。\n]+[。]?/g, '')
    .trim();
};

// メインゲームコンポーネント
// ========================================
export default function MagicSpiritGame() {
  // カードデータ管理
  const [allCards, setAllCards] = useState(SAMPLE_CARDS);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // ゲーム状態
  const [gameState, setGameState] = useState('title'); // title, playing, gameOver
  const [turn, setTurn] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [phase, setPhase] = useState(0);
  const [isFirstTurn, setIsFirstTurn] = useState(true);
  const [winner, setWinner] = useState(null);
  const [logs, setLogs] = useState([]);

  // プレイヤー1の状態
  const [p1Life, setP1Life] = useState(INITIAL_LIFE);
  const [p1Deck, setP1Deck] = useState([]);
  const [p1Hand, setP1Hand] = useState([]);
  const [p1Field, setP1Field] = useState([null, null, null, null, null]);
  const [p1Graveyard, setP1Graveyard] = useState([]);
  const [p1ActiveSP, setP1ActiveSP] = useState(INITIAL_SP);
  const [p1RestedSP, setP1RestedSP] = useState(0);
  const [p1FieldCard, setP1FieldCard] = useState(null);
  const [p1PhaseCard, setP1PhaseCard] = useState(null);

  // プレイヤー2の状態
  const [p2Life, setP2Life] = useState(INITIAL_LIFE);
  const [p2Deck, setP2Deck] = useState([]);
  const [p2Hand, setP2Hand] = useState([]);
  const [p2Field, setP2Field] = useState([null, null, null, null, null]);
  const [p2Graveyard, setP2Graveyard] = useState([]);
  const [p2ActiveSP, setP2ActiveSP] = useState(INITIAL_SP);
  const [p2RestedSP, setP2RestedSP] = useState(0);
  const [p2FieldCard, setP2FieldCard] = useState(null);
  const [p2PhaseCard, setP2PhaseCard] = useState(null);

  // UI状態
  const [selectedHandCard, setSelectedHandCard] = useState(null);
  const [selectedFieldMonster, setSelectedFieldMonster] = useState(null);
  const [attackingMonster, setAttackingMonster] = useState(null);
  const [chargeUsedThisTurn, setChargeUsedThisTurn] = useState(false);
  const [selectedFieldCardInfo, setSelectedFieldCardInfo] = useState(null); // フィールド/フェイズカード情報表示用
  const [pendingHandSelection, setPendingHandSelection] = useState(null); // 手札選択待ち状態 { message, callback, filter? }

  // デッキ選択状態
  const [p1SelectedDeck, setP1SelectedDeck] = useState('random');
  const [p2SelectedDeck, setP2SelectedDeck] = useState('random');

  // ログ追加関数
  const addLog = useCallback((message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, time: Date.now() }]);
  }, []);

  // CSVファイルの読み込み
  useEffect(() => {
    const loadCards = async () => {
      setIsLoadingCards(true);
      const cards = await loadCardsFromCSV();
      setAllCards(cards);
      setIsLoadingCards(false);
    };

    loadCards();
  }, []);

  // ゲーム初期化
  const initGame = useCallback(() => {
    // 選択されたデッキからカードを生成
    const deck1 = createDeckFromPrebuilt(p1SelectedDeck, allCards);
    const deck2 = createDeckFromPrebuilt(p2SelectedDeck, allCards);

    setP1Deck(deck1.slice(INITIAL_HAND_SIZE));
    setP1Hand(deck1.slice(0, INITIAL_HAND_SIZE));
    setP2Deck(deck2.slice(INITIAL_HAND_SIZE));
    setP2Hand(deck2.slice(0, INITIAL_HAND_SIZE));

    setP1Life(INITIAL_LIFE);
    setP2Life(INITIAL_LIFE);
    setP1ActiveSP(INITIAL_SP);
    setP2ActiveSP(INITIAL_SP);
    setP1RestedSP(0);
    setP2RestedSP(0);
    setP1Field([null, null, null, null, null]);
    setP2Field([null, null, null, null, null]);
    setP1FieldCard(null);
    setP2FieldCard(null);
    setP1PhaseCard(null);
    setP2PhaseCard(null);
    setP1Graveyard([]);
    setP2Graveyard([]);

    setTurn(1);
    setCurrentPlayer(1);
    setPhase(0);
    setIsFirstTurn(true);
    setWinner(null);
    setLogs([]);
    setSelectedHandCard(null);
    setSelectedFieldMonster(null);
    setAttackingMonster(null);
    setChargeUsedThisTurn(false);
    setSelectedFieldCardInfo(null);
    setPendingHandSelection(null);

    // トリガーシステムをクリア
    clearAllTriggers();

    // 常時効果システムをクリア
    continuousEffectEngine.clear();

    setGameState('playing');
    addLog('ゲーム開始！先攻プレイヤー1のターン', 'info');
  }, [addLog, allCards, p1SelectedDeck, p2SelectedDeck]);

  // 現在のプレイヤーのデータを取得
  const getCurrentPlayerData = () => {
    if (currentPlayer === 1) {
      return {
        life: p1Life, setLife: setP1Life,
        deck: p1Deck, setDeck: setP1Deck,
        hand: p1Hand, setHand: setP1Hand,
        field: p1Field, setField: setP1Field,
        graveyard: p1Graveyard, setGraveyard: setP1Graveyard,
        activeSP: p1ActiveSP, setActiveSP: setP1ActiveSP,
        restedSP: p1RestedSP, setRestedSP: setP1RestedSP,
        fieldCard: p1FieldCard, setFieldCard: setP1FieldCard,
        phaseCard: p1PhaseCard, setPhaseCard: setP1PhaseCard,
      };
    }
    return {
      life: p2Life, setLife: setP2Life,
      deck: p2Deck, setDeck: setP2Deck,
      hand: p2Hand, setHand: setP2Hand,
      field: p2Field, setField: setP2Field,
      graveyard: p2Graveyard, setGraveyard: setP2Graveyard,
      activeSP: p2ActiveSP, setActiveSP: setP2ActiveSP,
      restedSP: p2RestedSP, setRestedSP: setP2RestedSP,
      fieldCard: p2FieldCard, setFieldCard: setP2FieldCard,
      phaseCard: p2PhaseCard, setPhaseCard: setP2PhaseCard,
    };
  };

  const getOpponentData = () => {
    if (currentPlayer === 1) {
      return {
        life: p2Life, setLife: setP2Life,
        field: p2Field, setField: setP2Field,
        graveyard: p2Graveyard, setGraveyard: setP2Graveyard,
        fieldCard: p2FieldCard,
        phaseCard: p2PhaseCard,
      };
    }
    return {
      life: p1Life, setLife: setP1Life,
      field: p1Field, setField: setP1Field,
      graveyard: p1Graveyard, setGraveyard: setP1Graveyard,
      fieldCard: p1FieldCard,
      phaseCard: p1PhaseCard,
    };
  };

  // フェイズ処理
  const processPhase = useCallback((phaseIndex) => {
    const player = getCurrentPlayerData();
    const opponent = getOpponentData();

    // トリガー用コンテキスト
    const triggerContext = {
      currentPlayer,
      setP1Life,
      setP2Life,
      setP1Field,
      setP2Field,
      setP1Hand,
      setP2Hand,
      setP1Deck,
      setP2Deck,
      setP1Graveyard,
      setP2Graveyard,
      p1Field,
      p2Field,
      p1Hand,
      p2Hand,
      p1Deck,
      p2Deck,
      p1Graveyard,
      p2Graveyard,
      p1Life,
      p2Life,
      addLog,
      setPendingHandSelection,
    };

    switch (phaseIndex) {
      case 0: // ターン開始フェイズ
        // SPトークン追加（最大10）
        const totalSP = player.activeSP + player.restedSP;
        if (totalSP < MAX_SP) {
          player.setActiveSP(prev => Math.min(prev + 1, MAX_SP));
          addLog(`プレイヤー${currentPlayer}: SPトークン+1`, 'info');
        }
        // レスト状態のSPをアクティブに
        player.setActiveSP(prev => prev + player.restedSP);
        player.setRestedSP(0);

        // モンスターの攻撃可能フラグをリセット
        player.setField(prev => prev.map(m => m ? { ...m, canAttack: true } : null));
        setChargeUsedThisTurn(false);

        // ターン開始時トリガーを発火
        fireTrigger(TRIGGER_TYPES.ON_TURN_START_SELF, triggerContext);

        setPhase(1);
        break;

      case 1: // ドローフェイズ
        if (player.deck.length > 0) {
          const drawnCard = player.deck[0];
          player.setDeck(prev => prev.slice(1));
          player.setHand(prev => [...prev, drawnCard]);
          addLog(`プレイヤー${currentPlayer}: 1枚ドロー`, 'info');
        } else {
          addLog(`プレイヤー${currentPlayer}: デッキ切れ！`, 'damage');
        }

        // ドローフェイズトリガーを発火
        fireTrigger(TRIGGER_TYPES.ON_DRAW_PHASE_SELF, triggerContext);

        setPhase(2);
        break;

      case 2: // メインフェイズ
        // プレイヤーの操作待ち（自動進行なし）
        // メインフェイズトリガーは任意発動のため、ここでは発火しない
        // カード選択時にUIに表示される
        break;

      case 3: // バトルフェイズ
        // 先攻1ターン目は攻撃不可
        if (isFirstTurn && currentPlayer === 1) {
          addLog('先攻1ターン目は攻撃できません', 'info');
          setPhase(4);
        }

        // バトルフェイズ開始時トリガーを発火
        fireTrigger(TRIGGER_TYPES.ON_BATTLE_PHASE_START, triggerContext);
        break;

      case 4: // エンドフェイズ
        // エンドフェイズトリガーを発火
        fireTrigger(TRIGGER_TYPES.ON_END_PHASE_SELF, triggerContext);
        fireTrigger(TRIGGER_TYPES.ON_END_PHASE, triggerContext);

        // 墓地カードのエンドフェイズトリガーを発火
        {
          const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
          graveyard.forEach((card) => {
            const graveyardTriggers = getCardGraveyardTriggers(card, triggerContext);
            graveyardTriggers.forEach((trigger) => {
              if (trigger.type === TRIGGER_TYPES.ON_END_PHASE_FROM_GRAVEYARD &&
                  trigger.activationType === 'automatic' &&
                  trigger.canActivate) {
                try {
                  if (typeof trigger.effect === 'function') {
                    trigger.effect({ ...triggerContext, card });
                  }
                } catch (error) {
                  console.error(`墓地トリガー発動エラー: ${card.name}`, error);
                }
              }
            });
          });
        }

        // ターン終了時に使用済みフラグをリセット
        resetTurnFlags();
        continuousEffectEngine.resetTurnFlags();

        setPhase(0);
        // ターン終了、相手に切り替え
        if (currentPlayer === 1) {
          setCurrentPlayer(2);
        } else {
          setCurrentPlayer(1);
          setTurn(prev => prev + 1);
          if (isFirstTurn) setIsFirstTurn(false);
        }
        addLog(`プレイヤー${currentPlayer}のターン終了`, 'info');
        break;
    }
  }, [currentPlayer, isFirstTurn, p1Field, p2Field, p1Hand, p2Hand, p1Deck, p2Deck,
      p1Graveyard, p2Graveyard, p1Life, p2Life, addLog]);

  // チャージ処理
  const chargeCard = useCallback((card, monsterIndex) => {
    if (chargeUsedThisTurn) {
      addLog('このターンは既にチャージを使用しました', 'damage');
      return false;
    }

    const field = currentPlayer === 1 ? p1Field : p2Field;
    const monster = field[monsterIndex];

    if (!monster) {
      addLog('モンスターが存在しません', 'damage');
      return false;
    }

    if (monster.charges && monster.charges.length >= 2) {
      addLog('このモンスターは既に2枚チャージされています', 'damage');
      return false;
    }

    // 属性チャージ（モンスター、魔法、フィールドカード）
    if (card.type === 'monster' || card.type === 'magic' || card.type === 'field') {
      const newCharge = {
        card: card,
        attribute: card.attribute,
      };

      if (currentPlayer === 1) {
        setP1Field(prev => {
          const newField = [...prev];
          newField[monsterIndex] = {
            ...monster,
            charges: [...(monster.charges || []), newCharge],
          };
          return newField;
        });
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      } else {
        setP2Field(prev => {
          const newField = [...prev];
          newField[monsterIndex] = {
            ...monster,
            charges: [...(monster.charges || []), newCharge],
          };
          return newField;
        });
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      }

      setChargeUsedThisTurn(true);
      addLog(`${monster.name}に${card.name}をチャージしました`, 'info');
      return true;
    }

    addLog('チャージできるのは属性カードのみです', 'damage');
    return false;
  }, [currentPlayer, p1Field, p2Field, chargeUsedThisTurn, addLog]);

  // フェイズカードへのチャージ処理
  const chargePhaseCard = useCallback((card) => {
    if (chargeUsedThisTurn) {
      addLog('このターンは既にチャージを使用しました', 'damage');
      return false;
    }

    const phaseCard = currentPlayer === 1 ? p1PhaseCard : p2PhaseCard;
    const setPhaseCard = currentPlayer === 1 ? setP1PhaseCard : setP2PhaseCard;
    const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
    const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

    if (!phaseCard || phaseCard.type !== 'phasecard') {
      addLog('フェイズカードが設置されていません', 'damage');
      return false;
    }

    // 現在の段階を取得（chargesの数、または stageフィールド）
    const currentStage = phaseCard.stage !== undefined ? phaseCard.stage : (phaseCard.charges?.length || 0);

    // 最大段階チェック（3枚チャージで最終段階）
    if (currentStage >= 3) {
      addLog('フェイズカードは既に最終段階です', 'damage');
      return false;
    }

    // 属性チェック（同属性のみ、または「なし」属性のカードも可）
    if (card.attribute !== phaseCard.attribute && card.attribute !== 'なし' && phaseCard.attribute !== 'なし') {
      addLog(`フェイズカードと同じ属性のカードのみチャージできます（フェイズカード: ${phaseCard.attribute}）`, 'damage');
      return false;
    }

    // 属性カードのみチャージ可能（フェイズカードも含む）
    if (card.type !== 'monster' && card.type !== 'magic' && card.type !== 'field' && card.type !== 'phasecard') {
      addLog('チャージできるのは属性カード（モンスター、魔法、フィールド、フェイズ）のみです', 'damage');
      return false;
    }

    // 新しいチャージを追加
    const newCharge = {
      card: card,
      attribute: card.attribute,
    };

    const newStage = currentStage + 1;
    const updatedPhaseCard = {
      ...phaseCard,
      stage: newStage,
      charges: [...(phaseCard.charges || []), newCharge],
    };

    // 手札から削除
    setHand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));

    // 段階名を取得（新しい関数を使用）
    const stageName = getStageName(newStage);
    addLog(`フェイズカード【${phaseCard.name}】に${card.name}をチャージ → 【${stageName}】（${newStage}/3）`, 'info');

    // CSVの効果テキストから段階効果を取得
    const stageEffectText = getPhaseCardStageText(phaseCard, newStage);

    if (stageEffectText) {
      // 段階効果のテキストをログに表示
      addLog(`【${stageName}効果】: ${stageEffectText}`, 'info');

      // コンテキストを作成して効果を実行
      const context = {
        currentPlayer,
        monsterIndex: null,
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        setP1Hand,
        setP2Hand,
        setP1Deck,
        setP2Deck,
        setP1Graveyard,
        setP2Graveyard,
        p1Field,
        p2Field,
        p1Hand,
        p2Hand,
        p1Deck,
        p2Deck,
        p1Graveyard,
        p2Graveyard,
        p1ActiveSP,
        p2ActiveSP,
        setP1ActiveSP,
        setP2ActiveSP,
        p1RestedSP,
        p2RestedSP,
        setP1RestedSP,
        setP2RestedSP,
        addLog,
      };

      // 効果テキストを解析して実行（現状はトリガーシステムで処理される効果も多いため、ログ表示のみ）
      // TODO: 即時効果（ダメージ、回復など）は executeSkillEffects で処理可能
      // executeSkillEffects(stageEffectText, context, phaseCard.id);
    }

    // 最終段階（3枚チャージ）の場合は墓地へ送る
    if (newStage >= 3) {
      addLog(`フェイズカード【${phaseCard.name}】は最終段階の効果を発動し、墓地へ送られます`, 'info');

      // フェイズカードとチャージされたカードを全て墓地へ
      const cardsToGraveyard = [
        { ...updatedPhaseCard, charges: [] }, // フェイズカード本体（chargesは分離）
        ...updatedPhaseCard.charges.map(c => c.card), // チャージされたカード
      ];

      setGraveyard(prev => [...prev, ...cardsToGraveyard]);
      setPhaseCard(null);
    } else {
      setPhaseCard(updatedPhaseCard);
    }

    setChargeUsedThisTurn(true);
    return true;
  }, [currentPlayer, p1PhaseCard, p2PhaseCard, p1Field, p2Field, p1Hand, p2Hand,
      p1Deck, p2Deck, p1Graveyard, p2Graveyard, p1ActiveSP, p2ActiveSP,
      p1RestedSP, p2RestedSP, chargeUsedThisTurn, addLog,
      setP1Life, setP2Life, setP1Field, setP2Field, setP1Hand, setP2Hand,
      setP1Deck, setP2Deck, setP1Graveyard, setP2Graveyard,
      setP1ActiveSP, setP2ActiveSP, setP1RestedSP, setP2RestedSP,
      setP1PhaseCard, setP2PhaseCard]);

  // 技発動処理
  const executeSkill = useCallback((monsterIndex, skillType) => {
    const field = currentPlayer === 1 ? p1Field : p2Field;
    const monster = field[monsterIndex];

    if (!monster) {
      addLog('モンスターが存在しません', 'damage');
      return false;
    }

    const skill = skillType === 'basic' ? monster.basicSkill : monster.advancedSkill;
    const skillName = skillType === 'basic' ? '基本技' : '上級技';

    if (!skill) {
      addLog(`このモンスターには${skillName}がありません`, 'damage');
      return false;
    }

    const requiredCharges = skill.cost;
    const currentCharges = monster.charges ? monster.charges.length : 0;

    if (currentCharges < requiredCharges) {
      addLog(`${skillName}を発動するには${requiredCharges}枚のチャージが必要です（現在: ${currentCharges}枚）`, 'damage');
      return false;
    }

    // 属性チェック（「任意」でない場合、同属性のチャージが必要）
    if (skill.attribute !== 'any') {
      const validCharges = monster.charges.filter(charge =>
        charge.attribute === monster.attribute || charge.attribute === 'なし'
      );
      if (validCharges.length < requiredCharges) {
        addLog(`${skillName}を発動するには同属性のチャージが必要です`, 'damage');
        return false;
      }
    }

    // 技発動
    addLog(`${monster.name}の${skillName}を発動！`, 'info');
    addLog(`効果: ${skill.text}`, 'info');

    // 効果実行エンジンを使用
    const context = {
      currentPlayer,
      monsterIndex,
      setP1Life,
      setP2Life,
      setP1Field,
      setP2Field,
      setP1Hand,
      setP2Hand,
      setP1Deck,
      setP2Deck,
      setP1Graveyard,
      setP2Graveyard,
      setP1ActiveSP,
      setP2ActiveSP,
      setP1RestedSP,
      setP2RestedSP,
      p1Field,
      p2Field,
      p1Hand,
      p2Hand,
      p1Deck,
      p2Deck,
      p1Graveyard,
      p2Graveyard,
      p1ActiveSP,
      p2ActiveSP,
      p1RestedSP,
      p2RestedSP,
      addLog,
    };

    // カードIDを渡して効果を実行（カード固有処理がある場合は優先）
    const success = executeSkillEffects(skill.text, context, monster.id);
    return success;
  }, [currentPlayer, p1Field, p2Field, p1Hand, p2Hand, p1Deck, p2Deck, p1Graveyard, p2Graveyard,
      p1ActiveSP, p2ActiveSP, p1RestedSP, p2RestedSP,
      addLog, setP1Life, setP2Life, setP1Field, setP2Field, setP1Hand, setP2Hand,
      setP1Deck, setP2Deck, setP1Graveyard, setP2Graveyard,
      setP1ActiveSP, setP2ActiveSP, setP1RestedSP, setP2RestedSP]);

  // カード召喚
  const summonCard = useCallback((card, slotIndex) => {
    // 現在のプレイヤーのSPを直接取得
    const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
    const field = currentPlayer === 1 ? p1Field : p2Field;
    
    if (activeSP < card.cost) {
      addLog(`SPが足りません！（必要: ${card.cost}, 現在: ${activeSP}）`, 'damage');
      return false;
    }

    if (card.type === 'monster') {
      if (field[slotIndex] !== null) {
        addLog('そのスロットは使用中です', 'damage');
        return false;
      }
      
      const monsterInstance = createMonsterInstance(card);
      monsterInstance.canAttack = false; // 召喚ターンは攻撃不可
      
      // フィールドにモンスターを配置
      if (currentPlayer === 1) {
        setP1Field(prev => {
          const newField = [...prev];
          newField[slotIndex] = monsterInstance;
          return newField;
        });
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
      } else {
        setP2Field(prev => {
          const newField = [...prev];
          newField[slotIndex] = monsterInstance;
          return newField;
        });
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
      }
      
      addLog(`プレイヤー${currentPlayer}: ${card.name}を召喚！`, 'info');

      // トリガーを登録
      registerCardTriggers(monsterInstance, currentPlayer, slotIndex);

      // 常時効果を登録
      continuousEffectEngine.register(monsterInstance, currentPlayer);

      // 召喚時バフを適用（他のカードの常時効果による）
      const summonBuffContext = {
        currentPlayer,
        effectOwner: currentPlayer,
        p1Field: currentPlayer === 1 ? [...p1Field.slice(0, slotIndex), monsterInstance, ...p1Field.slice(slotIndex + 1)] : p1Field,
        p2Field: currentPlayer === 2 ? [...p2Field.slice(0, slotIndex), monsterInstance, ...p2Field.slice(slotIndex + 1)] : p2Field,
        p1Life,
        p2Life,
      };
      const summonBuffs = continuousEffectEngine.getSummonBuffs(monsterInstance, currentPlayer, summonBuffContext);
      if (summonBuffs.hpBuff > 0) {
        monsterInstance.currentHp += summonBuffs.hpBuff;
        monsterInstance.maxHp += summonBuffs.hpBuff;
        addLog(`${monsterInstance.name}のHPが${summonBuffs.hpBuff}アップ！（常時効果）`, 'info');
      }
      if (summonBuffs.atkBuff > 0) {
        monsterInstance.currentAttack += summonBuffs.atkBuff;
        addLog(`${monsterInstance.name}の攻撃力が${summonBuffs.atkBuff}アップ！（常時効果）`, 'info');
      }

      // 召喚時効果を実行（新表記【召喚時】と旧表記「召喚時」に対応）
      // ただし、トリガーシステムに実装済みの場合はスキップ（二重実行を防ぐ）
      const hasTriggerImplementation = hasCardTrigger(card.id, TRIGGER_TYPES.ON_SUMMON);

      if (card.effect && (card.effect.includes('召喚時') || card.effect.includes('【召喚時】')) && !hasTriggerImplementation) {
        addLog(`${card.name}の召喚時効果発動！`, 'info');

        // 召喚時効果を含む全テキストを渡す（カード固有処理で判定）
        const context = {
          currentPlayer,
          monsterIndex: slotIndex,
          card: monsterInstance,
          setP1Life,
          setP2Life,
          setP1Field,
          setP2Field,
          setP1Hand,
          setP2Hand,
          setP1Deck,
          setP2Deck,
          setP1Graveyard,
          setP2Graveyard,
          setP1ActiveSP,
          setP2ActiveSP,
          setP1RestedSP,
          setP2RestedSP,
          p1Field,
          p2Field,
          p1Hand,
          p2Hand,
          p1Deck,
          p2Deck,
          p1Graveyard,
          p2Graveyard,
          p1ActiveSP,
          p2ActiveSP,
          p1RestedSP,
          p2RestedSP,
          addLog,
        };
        // カードIDを渡して効果を実行
        executeSkillEffects(card.effect, context, card.id);
      }

      // 召喚時トリガーを発火（トリガーシステムに登録された効果を実行）
      const triggerContext = {
        currentPlayer,
        card: monsterInstance,
        slotIndex,
        monsterIndex: slotIndex, // トリガー効果で使用
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        setP1Hand,
        setP2Hand,
        setP1Deck,
        setP2Deck,
        setP1Graveyard,
        setP2Graveyard,
        setP1ActiveSP,
        setP2ActiveSP,
        setP1RestedSP,
        setP2RestedSP,
        p1Field,
        p2Field,
        p1Hand,
        p2Hand,
        p1Deck,
        p2Deck,
        p1Graveyard,
        p2Graveyard,
        p1Life,
        p2Life,
        p1ActiveSP,
        p2ActiveSP,
        p1RestedSP,
        p2RestedSP,
        addLog,
        setPendingHandSelection,
      };
      fireTrigger(TRIGGER_TYPES.ON_SUMMON, triggerContext);

      return true;
    }

    if (card.type === 'magic') {
      if (currentPlayer === 1) {
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
        setP1Graveyard(prev => [...prev, card]);
      } else {
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
        setP2Graveyard(prev => [...prev, card]);
      }
      
      addLog(`プレイヤー${currentPlayer}: ${card.name}を発動！`, 'info');

      // 魔法効果を実行
      if (card.effect) {
        const context = {
          currentPlayer,
          monsterIndex: null, // 魔法カードはモンスターではない
          setP1Life,
          setP2Life,
          setP1Field,
          setP2Field,
          setP1Hand,
          setP2Hand,
          setP1Deck,
          setP2Deck,
          setP1Graveyard,
          setP2Graveyard,
          p1Field,
          p2Field,
          p1Hand,
          p2Hand,
          p1Deck,
          p2Deck,
          p1Graveyard,
          p2Graveyard,
          addLog,
        };
        executeSkillEffects(card.effect, context);
      }

      return true;
    }

    if (card.type === 'field') {
      if (currentPlayer === 1) {
        setP1FieldCard(card);
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
      } else {
        setP2FieldCard(card);
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
      }

      // 常時効果を登録
      continuousEffectEngine.register(card, currentPlayer);

      addLog(`プレイヤー${currentPlayer}: ${card.name}を設置！`, 'info');
      return true;
    }

    if (card.type === 'phasecard') {
      // フェイズカードに段階情報とチャージ配列を追加
      const initializedPhaseCard = {
        ...card,
        stage: 0,           // 初期段階
        charges: [],        // チャージされたカード
      };

      if (currentPlayer === 1) {
        setP1PhaseCard(initializedPhaseCard);
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
      } else {
        setP2PhaseCard(initializedPhaseCard);
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
      }

      addLog(`プレイヤー${currentPlayer}: フェイズカード【${card.name}】を設置！【初期段階】`, 'info');

      // フェイズカードの初期効果を実行
      const context = {
        currentPlayer,
        monsterIndex: null,
        setP1Life,
        setP2Life,
        setP1Field,
        setP2Field,
        setP1Hand,
        setP2Hand,
        setP1Deck,
        setP2Deck,
        setP1Graveyard,
        setP2Graveyard,
        p1Field,
        p2Field,
        p1Hand,
        p2Hand,
        p1Deck,
        p2Deck,
        p1Graveyard,
        p2Graveyard,
        p1ActiveSP,
        p2ActiveSP,
        setP1ActiveSP,
        setP2ActiveSP,
        p1RestedSP,
        p2RestedSP,
        setP1RestedSP,
        setP2RestedSP,
        addLog,
      };

      // CSVの効果テキストから初期効果を取得して表示
      const initialEffectText = getPhaseCardStageText(card, 0);
      if (initialEffectText) {
        addLog(`【初期効果】: ${initialEffectText}`, 'info');
        // 初期効果はトリガーシステムで処理されるものが多い（【自分エンドフェイズ時】など）
        // 即時効果の場合は executeSkillEffects で実行可能
        // executeSkillEffects(initialEffectText, context, card.id);
      }

      return true;
    }

    return false;
  }, [currentPlayer, p1ActiveSP, p2ActiveSP, p1Field, p2Field, p1Hand, p2Hand,
      p1Deck, p2Deck, p1Graveyard, p2Graveyard, addLog,
      setP1Life, setP2Life, setP1Field, setP2Field, setP1Hand, setP2Hand,
      setP1Deck, setP2Deck, setP1Graveyard, setP2Graveyard,
      setP1ActiveSP, setP1RestedSP, setP2ActiveSP, setP2RestedSP, setP1FieldCard, setP2FieldCard,
      setP1PhaseCard, setP2PhaseCard]);

  // 攻撃処理
  const attack = useCallback((attackerIndex, targetIndex) => {
    // 現在のプレイヤーと相手のフィールドを直接取得
    const playerField = currentPlayer === 1 ? p1Field : p2Field;
    const opponentField = currentPlayer === 1 ? p2Field : p1Field;

    const attacker = playerField[attackerIndex];
    if (!attacker || !attacker.canAttack) {
      addLog('このモンスターは攻撃できません', 'damage');
      return;
    }

    // 常時効果による攻撃制限をチェック
    const effectContext = {
      currentPlayer,
      effectOwner: currentPlayer,
      p1Field,
      p2Field,
      p1Life,
      p2Life,
    };
    if (!continuousEffectEngine.canAttack(attacker, effectContext)) {
      addLog(`${attacker.name}は常時効果により攻撃できません！`, 'damage');
      return;
    }

    const target = opponentField[targetIndex];

    // 常時効果による攻撃力修正を計算
    const attackerAtkMod = continuousEffectEngine.calculateAttackModifier(attacker, effectContext);
    const effectiveAttackerAtk = attacker.currentAttack + attackerAtkMod;

    if (target) {
      // モンスター攻撃
      const targetAtkMod = continuousEffectEngine.calculateAttackModifier(target, { ...effectContext, effectOwner: currentPlayer === 1 ? 2 : 1 });
      const effectiveTargetAtk = target.currentAttack + targetAtkMod;

      const damage = effectiveAttackerAtk;
      const counterDamage = Math.floor(effectiveTargetAtk * COUNTER_ATTACK_RATE);
      
      addLog(`${attacker.name}が${target.name}を攻撃！`, 'info');
      
      // ダメージ処理（新しいオブジェクトを作成）
      const newTargetHp = target.currentHp - damage;
      const newAttackerHp = attacker.currentHp - counterDamage;
      
      addLog(`${target.name}に${damage}ダメージ！`, 'damage');
      addLog(`反撃で${attacker.name}に${counterDamage}ダメージ！`, 'damage');
      
      // 相手フィールドの更新
      if (currentPlayer === 1) {
        // プレイヤー1が攻撃 → 相手はプレイヤー2
        if (newTargetHp <= 0) {
          // 破壊時トリガーを発火（破壊される前）
          const destroyContext = {
            currentPlayer: 2, // 破壊されるモンスターのオーナー
            destroyedCard: target,
            destroyedSlotIndex: targetIndex,
            setP1Life,
            setP2Life,
            setP1Field,
            setP2Field,
            setP1Hand,
            setP2Hand,
            setP1Deck,
            setP2Deck,
            setP1Graveyard,
            setP2Graveyard,
            p1Field,
            p2Field,
            p1Hand,
            p2Hand,
            p1Deck,
            p2Deck,
            p1Graveyard,
            p2Graveyard,
            p1Life,
            p2Life,
            addLog,
          };
          fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);

          // トリガー登録を解除
          unregisterCardTriggers(target.uniqueId);
          // 常時効果を解除
          continuousEffectEngine.unregister(target.uniqueId);

          setP2Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = null;
            return newField;
          });
          setP2Graveyard(prev => [...prev, target]);
          addLog(`${target.name}は破壊された！`, 'damage');
        } else {
          setP2Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = { ...target, currentHp: newTargetHp };
            return newField;
          });
        }
        
        // 自分のフィールドの更新
        if (newAttackerHp <= 0) {
          // 破壊時トリガーを発火（破壊される前）
          const destroyContext = {
            currentPlayer: 1, // 破壊されるモンスターのオーナー
            destroyedCard: attacker,
            destroyedSlotIndex: attackerIndex,
            setP1Life,
            setP2Life,
            setP1Field,
            setP2Field,
            setP1Hand,
            setP2Hand,
            setP1Deck,
            setP2Deck,
            setP1Graveyard,
            setP2Graveyard,
            p1Field,
            p2Field,
            p1Hand,
            p2Hand,
            p1Deck,
            p2Deck,
            p1Graveyard,
            p2Graveyard,
            p1Life,
            p2Life,
            addLog,
          };
          fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);

          // トリガー登録を解除
          unregisterCardTriggers(attacker.uniqueId);
          // 常時効果を解除
          continuousEffectEngine.unregister(attacker.uniqueId);

          setP1Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = null;
            return newField;
          });
          setP1Graveyard(prev => [...prev, attacker]);
          addLog(`${attacker.name}は破壊された！`, 'damage');
        } else {
          setP1Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = { ...attacker, currentHp: newAttackerHp, canAttack: false };
            return newField;
          });
        }
      } else {
        // プレイヤー2が攻撃 → 相手はプレイヤー1
        if (newTargetHp <= 0) {
          // 破壊時トリガーを発火（破壊される前）
          const destroyContext = {
            currentPlayer: 1, // 破壊されるモンスターのオーナー
            destroyedCard: target,
            destroyedSlotIndex: targetIndex,
            setP1Life,
            setP2Life,
            setP1Field,
            setP2Field,
            setP1Hand,
            setP2Hand,
            setP1Deck,
            setP2Deck,
            setP1Graveyard,
            setP2Graveyard,
            p1Field,
            p2Field,
            p1Hand,
            p2Hand,
            p1Deck,
            p2Deck,
            p1Graveyard,
            p2Graveyard,
            p1Life,
            p2Life,
            addLog,
          };
          fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);

          // トリガー登録を解除
          unregisterCardTriggers(target.uniqueId);
          // 常時効果を解除
          continuousEffectEngine.unregister(target.uniqueId);

          setP1Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = null;
            return newField;
          });
          setP1Graveyard(prev => [...prev, target]);
          addLog(`${target.name}は破壊された！`, 'damage');
        } else {
          setP1Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = { ...target, currentHp: newTargetHp };
            return newField;
          });
        }

        // 自分のフィールドの更新
        if (newAttackerHp <= 0) {
          // 破壊時トリガーを発火（破壊される前）
          const destroyContext = {
            currentPlayer: 2, // 破壊されるモンスターのオーナー
            destroyedCard: attacker,
            destroyedSlotIndex: attackerIndex,
            setP1Life,
            setP2Life,
            setP1Field,
            setP2Field,
            setP1Hand,
            setP2Hand,
            setP1Deck,
            setP2Deck,
            setP1Graveyard,
            setP2Graveyard,
            p1Field,
            p2Field,
            p1Hand,
            p2Hand,
            p1Deck,
            p2Deck,
            p1Graveyard,
            p2Graveyard,
            p1Life,
            p2Life,
            addLog,
          };
          fireTrigger(TRIGGER_TYPES.ON_DESTROY_SELF, destroyContext);

          // トリガー登録を解除
          unregisterCardTriggers(attacker.uniqueId);
          // 常時効果を解除
          continuousEffectEngine.unregister(attacker.uniqueId);

          setP2Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = null;
            return newField;
          });
          setP2Graveyard(prev => [...prev, attacker]);
          addLog(`${attacker.name}は破壊された！`, 'damage');
        } else {
          setP2Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = { ...attacker, currentHp: newAttackerHp, canAttack: false };
            return newField;
          });
        }
      }
    } else {
      // ダイレクトアタック判定
      const hasOpponentMonster = opponentField.some(m => m !== null);
      let damage = effectiveAttackerAtk; // 常時効果による修正を適用
      const opponentFieldCard = currentPlayer === 1 ? p2FieldCard : p1FieldCard;
      
      if (hasOpponentMonster) {
        damage = Math.floor(damage * 0.5);
        addLog(`相手の場にモンスターがいるためダメージ半減`, 'info');
      }
      
      if (opponentFieldCard) {
        damage = Math.floor(damage * 0.75);
        addLog(`フィールドカードによりダメージ75%`, 'info');
      }
      
      addLog(`${attacker.name}がダイレクトアタック！${damage}ダメージ！`, 'damage');
      
      if (currentPlayer === 1) {
        setP2Life(prev => Math.max(0, prev - damage));
        setP1Field(prev => {
          const newField = [...prev];
          newField[attackerIndex] = { ...attacker, canAttack: false };
          return newField;
        });
      } else {
        setP1Life(prev => Math.max(0, prev - damage));
        setP2Field(prev => {
          const newField = [...prev];
          newField[attackerIndex] = { ...attacker, canAttack: false };
          return newField;
        });
      }
    }
    
    setAttackingMonster(null);
    setSelectedFieldMonster(null);
  }, [currentPlayer, p1Field, p2Field, p1FieldCard, p2FieldCard, addLog]);

  // 勝敗判定
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    if (p1Life <= 0) {
      setWinner(2);
      setGameState('gameOver');
      addLog('プレイヤー2の勝利！', 'info');
    } else if (p2Life <= 0) {
      setWinner(1);
      setGameState('gameOver');
      addLog('プレイヤー1の勝利！', 'info');
    }
  }, [p1Life, p2Life, gameState, addLog]);

  // フェイズ自動進行
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (phase === 0 || phase === 1) {
      const timer = setTimeout(() => processPhase(phase), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, gameState, processPhase]);

  // ハンドカードクリック
  const handleHandCardClick = (card) => {
    if (phase !== 2) return;
    // 現在のプレイヤーの手札かどうかチェック
    const currentHand = currentPlayer === 1 ? p1Hand : p2Hand;
    if (!currentHand.find(c => c.uniqueId === card.uniqueId)) return;

    // 手札選択待ち状態の場合：カードを選択状態にするだけ（決定は別ボタン）
    if (pendingHandSelection) {
      // フィルターがある場合はチェック
      if (pendingHandSelection.filter && !pendingHandSelection.filter(card)) {
        addLog('そのカードは選択できません', 'damage');
        return;
      }
      // 選択状態を切り替え（同じカードをクリックで選択解除）
      setSelectedHandCard(selectedHandCard?.uniqueId === card.uniqueId ? null : card);
      return;
    }

    setSelectedHandCard(selectedHandCard?.uniqueId === card.uniqueId ? null : card);
    setSelectedFieldMonster(null);
    setAttackingMonster(null);
  };

  // 手札選択を確定
  const confirmHandSelection = () => {
    if (!pendingHandSelection || !selectedHandCard) return;

    // コールバックを実行
    pendingHandSelection.callback(selectedHandCard);
    setPendingHandSelection(null);
    setSelectedHandCard(null);
  };

  // フィールドスロットクリック
  const handleFieldSlotClick = (slotIndex, playerNum) => {
    // 手札選択待ち中は操作不可
    if (pendingHandSelection) return;

    // 現在のプレイヤーの場か相手の場かを判定
    const isMyField = playerNum === currentPlayer;

    if (phase === 2 && isMyField) {
      const field = currentPlayer === 1 ? p1Field : p2Field;
      const monster = field[slotIndex];

      if (selectedHandCard) {
        // チャージモード（モンスターが存在する場合）
        if (monster && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field')) {
          if (chargeCard(selectedHandCard, slotIndex)) {
            setSelectedHandCard(null);
          }
        }
        // 召喚モード（空きスロットの場合）
        else if (!monster && selectedHandCard.type === 'monster') {
          if (summonCard(selectedHandCard, slotIndex)) {
            setSelectedHandCard(null);
          }
        }
      } else {
        // モンスター選択（技発動用）
        if (monster) {
          setSelectedFieldMonster(selectedFieldMonster === slotIndex ? null : slotIndex);
          setSelectedHandCard(null);
        }
      }
    } else if (phase === 3 && isMyField) {
      // 攻撃者選択
      const field = currentPlayer === 1 ? p1Field : p2Field;
      const monster = field[slotIndex];
      if (monster && monster.canAttack) {
        setAttackingMonster(slotIndex);
        setSelectedFieldMonster(slotIndex);
      }
    } else if (phase === 3 && !isMyField && attackingMonster !== null) {
      // 攻撃対象選択
      attack(attackingMonster, slotIndex);
    }
  };

  // ダイレクトアタック
  const handleDirectAttack = () => {
    if (attackingMonster === null) return;
    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const hasTarget = opponentField.some(m => m !== null);
    if (!hasTarget) {
      attack(attackingMonster, -1);
    } else {
      addLog('相手の場にモンスターがいます。対象を選択してください。', 'info');
    }
  };

  // フィールドカードゾーンクリック
  const handleFieldCardZoneClick = () => {
    if (phase !== 2) return;

    const currentFieldCard = currentPlayer === 1 ? p1FieldCard : p2FieldCard;

    // クリックして情報表示
    if (currentFieldCard && !selectedHandCard) {
      setSelectedFieldCardInfo({ card: currentFieldCard, type: 'field', player: currentPlayer });
      return;
    }

    // 手札からフィールドカードを設置
    if (selectedHandCard) {
      // 既にフィールドカードが設置されている場合
      if (currentFieldCard) {
        addLog('既にフィールドカードが設置されています', 'damage');
        return;
      }

      // フィールドカードを設置
      if (selectedHandCard.type === 'field') {
        if (summonCard(selectedHandCard, 0)) {
          setSelectedHandCard(null);
        }
      } else {
        addLog('フィールドゾーンに設置できるのはフィールドカードのみです', 'damage');
      }
    }
  };

  // フェイズカードゾーンクリック
  const handlePhaseCardZoneClick = () => {
    if (phase !== 2) return;

    const currentPhaseCard = currentPlayer === 1 ? p1PhaseCard : p2PhaseCard;

    // クリックして情報表示
    if (currentPhaseCard && !selectedHandCard) {
      setSelectedFieldCardInfo({ card: currentPhaseCard, type: 'phasecard', player: currentPlayer });
      return;
    }

    // 手札からカードを選択している場合
    if (selectedHandCard) {
      // フェイズカードが設置されている場合 → チャージモード
      if (currentPhaseCard) {
        // 属性カード（モンスター、魔法、フィールド、フェイズカード）をチャージ
        if (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') {
          if (chargePhaseCard(selectedHandCard)) {
            setSelectedHandCard(null);
          }
        } else {
          addLog('フェイズカードにチャージできるのは属性カード（モンスター、魔法、フィールド、フェイズ）のみです', 'damage');
        }
        return;
      }

      // フェイズカードを設置
      if (selectedHandCard.type === 'phasecard') {
        if (summonCard(selectedHandCard, 0)) {
          setSelectedHandCard(null);
        }
      } else {
        addLog('フェイズカードゾーンに設置できるのはフェイズカードのみです', 'damage');
      }
    }
  };

  // 次のフェイズへ
  const nextPhase = () => {
    // 手札選択待ち中はフェイズ進行不可
    if (pendingHandSelection) {
      addLog('手札を選択してください', 'damage');
      return;
    }
    if (phase === 2) {
      setPhase(3);
      setSelectedHandCard(null);
    } else if (phase === 3) {
      setPhase(4);
      processPhase(4);
    }
  };

  // 魔法カード発動
  const useMagicCard = () => {
    if (selectedHandCard && selectedHandCard.type === 'magic') {
      summonCard(selectedHandCard, 0);
      setSelectedHandCard(null);
    }
  };

  // 墓地発動可能なカードを取得
  const getActivatableGraveyardCards = () => {
    const graveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
    const field = currentPlayer === 1 ? p1Field : p2Field;
    const hasEmptySlot = field.some((slot) => slot === null);

    return graveyard.filter((card) => {
      const triggers = parseCardTriggers(card);
      return triggers.some((trigger) => {
        if (trigger.type !== TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD) {
          return false;
        }
        // コストチェック（深海のクラーケンはSP4必要）
        if (trigger.costCheck) {
          const context = { currentPlayer, p1ActiveSP, p2ActiveSP };
          if (!trigger.costCheck(context)) {
            return false;
          }
        }
        // フィールド空きチェック（蘇生カードの場合）
        if (card.type === 'monster' && !hasEmptySlot) {
          return false;
        }
        return true;
      });
    });
  };

  // 墓地発動を実行
  const activateGraveyardCard = (card) => {
    const triggers = parseCardTriggers(card);
    const graveyardTrigger = triggers.find(
      (t) => t.type === TRIGGER_TYPES.ON_MAIN_PHASE_FROM_GRAVEYARD
    );

    if (!graveyardTrigger) {
      addLog('墓地発動できません', 'damage');
      return;
    }

    const triggerContext = {
      currentPlayer,
      p1ActiveSP, p2ActiveSP,
      setP1ActiveSP, setP2ActiveSP,
      p1RestedSP, p2RestedSP,
      setP1RestedSP, setP2RestedSP,
      p1Field, p2Field,
      setP1Field, setP2Field,
      p1Graveyard, p2Graveyard,
      setP1Graveyard, setP2Graveyard,
      p1Hand, p2Hand,
      setP1Hand, setP2Hand,
      p1Deck, p2Deck,
      setP1Deck, setP2Deck,
      p1Life, p2Life,
      setP1Life, setP2Life,
      card,
      addLog,
      setPendingHandSelection,
    };

    try {
      if (typeof graveyardTrigger.effect === 'function') {
        graveyardTrigger.effect(triggerContext);
      }
    } catch (error) {
      console.error('墓地発動エラー:', error);
      addLog(`${card.name}の墓地発動に失敗しました`, 'damage');
    }
  };

  // ========================================
  // レンダリング
  // ========================================

  // 墓地発動可能カードを事前計算（パフォーマンス最適化）
  const activatableGraveyardCards = getActivatableGraveyardCards();

  // タイトル画面
  if (gameState === 'title') {
    return (
      <div style={styles.container}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '32px',
        }}>
          <h1 style={{
            ...styles.title,
            fontSize: '48px',
            textAlign: 'center',
          }}>
            ✨ Magic Spirit ✨
          </h1>
          <p style={{ color: '#a0a0a0', fontSize: '18px' }}>
            スピリットウェイヴァーよ、戦いの時だ
          </p>
          {isLoadingCards ? (
            <div style={{ color: '#a0a0a0', fontSize: '16px' }}>
              カードデータを読み込み中...
            </div>
          ) : (
            <>
              {/* デッキ選択UI */}
              <div style={{
                display: 'flex',
                gap: '40px',
                marginBottom: '16px',
              }}>
                {/* プレイヤー1のデッキ選択 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <label style={{ color: '#6b9eff', fontSize: '14px', fontWeight: 'bold' }}>
                    プレイヤー1 デッキ
                  </label>
                  <select
                    value={p1SelectedDeck}
                    onChange={(e) => setP1SelectedDeck(e.target.value)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '2px solid #6b9eff',
                      background: '#1a1a2e',
                      color: '#fff',
                      cursor: 'pointer',
                      minWidth: '160px',
                    }}
                  >
                    {getDeckOptions().map(deck => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                  <span style={{ color: '#888', fontSize: '11px', maxWidth: '180px', textAlign: 'center' }}>
                    {getDeckOptions().find(d => d.id === p1SelectedDeck)?.description}
                  </span>
                </div>

                {/* プレイヤー2のデッキ選択 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <label style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: 'bold' }}>
                    プレイヤー2 デッキ
                  </label>
                  <select
                    value={p2SelectedDeck}
                    onChange={(e) => setP2SelectedDeck(e.target.value)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '2px solid #ff6b6b',
                      background: '#1a1a2e',
                      color: '#fff',
                      cursor: 'pointer',
                      minWidth: '160px',
                    }}
                  >
                    {getDeckOptions().map(deck => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                  <span style={{ color: '#888', fontSize: '11px', maxWidth: '180px', textAlign: 'center' }}>
                    {getDeckOptions().find(d => d.id === p2SelectedDeck)?.description}
                  </span>
                </div>
              </div>

              <button
                onClick={initGame}
                style={{
                  ...styles.actionButton,
                  fontSize: '20px',
                  padding: '16px 48px',
                }}
              >
                ゲーム開始
              </button>
              <div style={{ color: '#888', fontSize: '13px' }}>
                {allCards.length}枚のカードを読み込み完了
              </div>
            </>
          )}
          <div style={{ color: '#666', fontSize: '12px', marginTop: '32px' }}>
            プロトタイプ版 - 2人対戦
          </div>
        </div>
      </div>
    );
  }

  // ゲームオーバー画面
  if (gameState === 'gameOver') {
    return (
      <div style={styles.container}>
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#ffd700' }}>
              🏆 ゲーム終了 🏆
            </h2>
            <p style={{ textAlign: 'center', fontSize: '24px', marginBottom: '24px' }}>
              プレイヤー{winner}の勝利！
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button onClick={initGame} style={styles.actionButton}>
                もう一度プレイ
              </button>
              <button 
                onClick={() => setGameState('title')} 
                style={{ ...styles.actionButton, background: '#444' }}
              >
                タイトルへ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ゲーム画面
  const player = getCurrentPlayerData();
  const opponent = getOpponentData();

  return (
    <div style={styles.container}>
      {/* CSSアニメーション */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 10px currentColor; }
          50% { box-shadow: 0 0 25px currentColor, 0 0 40px currentColor; }
        }
      `}</style>

      {/* ヘッダー */}
      <header style={styles.header}>
        <h1 style={styles.title}>✨ Magic Spirit</h1>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span>ターン {turn}</span>
          <span style={{ 
            background: currentPlayer === 1 ? '#4da6ff' : '#ff6b6b',
            padding: '4px 12px',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}>
            プレイヤー{currentPlayer}
          </span>
        </div>
      </header>

      {/* メインエリア（左サイドパネル + ゲームボード） */}
      <div style={styles.mainArea}>
        {/* 左サイドパネル（カード情報表示） */}
        <div style={styles.leftSidePanel}>
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(107,76,230,0.3)' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#a78bfa' }}>
              📋 カード情報
            </div>
          </div>
          <div style={styles.cardInfoPanel}>
            {/* 選択中の手札カード */}
            {selectedHandCard && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: currentPlayer === 1 ? '#4da6ff' : '#ff8a8a' }}>
                  {selectedHandCard.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                  属性: {selectedHandCard.attribute} | コスト: {selectedHandCard.cost} SP
                </div>
                {selectedHandCard.categoryText && (
                  <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '6px' }}>
                    カテゴリ: {selectedHandCard.categoryText}
                  </div>
                )}
                {selectedHandCard.type === 'monster' && (
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '8px' }}>
                    ⚔️ {selectedHandCard.attack} | ❤️ {selectedHandCard.hp}
                  </div>
                )}
                <div style={{
                  fontSize: '11px',
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px',
                  borderRadius: '6px',
                  lineHeight: '1.5',
                  marginBottom: '8px',
                }}>
                  {getEffectWithoutSkills(selectedHandCard.effect) || 'なし'}
                </div>
                {selectedHandCard.type === 'monster' && (selectedHandCard.basicSkill || selectedHandCard.advancedSkill) && (
                  <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                    {selectedHandCard.basicSkill && (
                      <div style={{ padding: '6px', background: 'rgba(76,175,80,0.2)', borderRadius: '4px', marginBottom: '4px' }}>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技:</span><br/>
                        {selectedHandCard.basicSkill.text}
                      </div>
                    )}
                    {selectedHandCard.advancedSkill && (
                      <div style={{ padding: '6px', background: 'rgba(255,152,0,0.2)', borderRadius: '4px' }}>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技:</span><br/>
                        {selectedHandCard.advancedSkill.text}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: '10px', color: '#888', marginTop: '8px', padding: '6px', background: 'rgba(107,76,230,0.1)', borderRadius: '4px' }}>
                  {selectedHandCard.type === 'monster' && '👆 空きスロットをクリックして召喚'}
                  {selectedHandCard.type === 'magic' && '👆 「魔法カード発動」ボタンで発動'}
                  {selectedHandCard.type === 'field' && '👆 フィールドゾーンをクリックして配置'}
                  {selectedHandCard.type === 'phasecard' && '👆 フェイズゾーンをクリックして配置'}
                </div>
              </div>
            )}
            {/* 選択中のフィールドモンスター */}
            {!selectedHandCard && selectedFieldMonster !== null && (() => {
              const field = currentPlayer === 1 ? p1Field : p2Field;
              const monster = field[selectedFieldMonster];
              if (!monster) return null;
              return (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: currentPlayer === 1 ? '#4da6ff' : '#ff8a8a' }}>
                    🎯 {monster.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                    属性: {monster.attribute}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '8px' }}>
                    ⚔️ {monster.currentAttack || monster.attack} | ❤️ {monster.currentHP}/{monster.maxHP || monster.hp}
                    {monster.charges && monster.charges.length > 0 && (
                      <span style={{ marginLeft: '8px', color: '#4caf50' }}>
                        ⚡ チャージ: {monster.charges.length}
                      </span>
                    )}
                  </div>
                  {monster.categoryText && (
                    <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '6px' }}>
                      カテゴリ: {monster.categoryText}
                    </div>
                  )}
                  <div style={{
                    fontSize: '11px',
                    color: '#e0e0e0',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px',
                    borderRadius: '6px',
                    lineHeight: '1.5',
                    marginBottom: '8px',
                  }}>
                    {getEffectWithoutSkills(monster.effect) || 'なし'}
                  </div>
                  {(monster.basicSkill || monster.advancedSkill) && (
                    <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                      {monster.basicSkill && (
                        <div style={{ padding: '6px', background: 'rgba(76,175,80,0.2)', borderRadius: '4px', marginBottom: '4px' }}>
                          <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技(1):</span><br/>
                          {monster.basicSkill.text}
                        </div>
                      )}
                      {monster.advancedSkill && (
                        <div style={{ padding: '6px', background: 'rgba(255,152,0,0.2)', borderRadius: '4px' }}>
                          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技(2):</span><br/>
                          {monster.advancedSkill.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* 選択中のフィールド/フェイズカード */}
            {!selectedHandCard && selectedFieldMonster === null && selectedFieldCardInfo && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: selectedFieldCardInfo.player === 1 ? '#4da6ff' : '#ff8a8a' }}>
                  {selectedFieldCardInfo.type === 'field' ? '🌍 フィールド' : '⚡ フェイズ'}: {selectedFieldCardInfo.card.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                  属性: {selectedFieldCardInfo.card.attribute} | コスト: {selectedFieldCardInfo.card.cost} SP
                </div>
                {selectedFieldCardInfo.type === 'phasecard' && (
                  <>
                    <div style={{ fontSize: '12px', color: '#4caf50', marginBottom: '8px' }}>
                      ⚡ {getStageShortName(selectedFieldCardInfo.card.stage || 0)}段階 ({selectedFieldCardInfo.card.charges?.length || 0}/3)
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#ffd700',
                      background: 'rgba(255,215,0,0.1)',
                      padding: '8px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      lineHeight: '1.5',
                    }}>
                      <strong>【現在の効果】</strong><br/>
                      {getCurrentStageDescription(selectedFieldCardInfo.card) || '効果なし'}
                    </div>
                    {(selectedFieldCardInfo.card.stage || 0) < 3 && getNextStageDescription(selectedFieldCardInfo.card) && (
                      <div style={{
                        fontSize: '11px',
                        color: '#4da6ff',
                        background: 'rgba(77,166,255,0.1)',
                        padding: '8px',
                        borderRadius: '6px',
                        lineHeight: '1.5',
                      }}>
                        <strong>【次の段階】</strong><br/>
                        {getNextStageDescription(selectedFieldCardInfo.card)}
                      </div>
                    )}
                  </>
                )}
                {selectedFieldCardInfo.type === 'field' && (
                  <div style={{
                    fontSize: '11px',
                    color: '#e0e0e0',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px',
                    borderRadius: '6px',
                    lineHeight: '1.5',
                  }}>
                    {getEffectWithoutSkills(selectedFieldCardInfo.card.effect) || 'なし'}
                  </div>
                )}
                <button
                  onClick={() => setSelectedFieldCardInfo(null)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 12px',
                    background: 'rgba(107,76,230,0.5)',
                    border: '1px solid #6b4ce6',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  閉じる
                </button>
              </div>
            )}
            {/* 何も選択されていない時 */}
            {!selectedHandCard && selectedFieldMonster === null && !selectedFieldCardInfo && (
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', padding: '40px 10px' }}>
                カードを選択すると<br/>情報が表示されます
              </div>
            )}
          </div>
          {/* ログ */}
          <div style={{ padding: '12px', borderTop: '1px solid rgba(107,76,230,0.3)' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
              📜 ログ
            </div>
            <GameLog logs={logs} />
          </div>
        </div>

        {/* ゲームボード */}
        <div style={styles.gameBoard}>
        {/* プレイヤー2エリア（上） */}
        <div style={{ ...styles.playerArea, background: currentPlayer === 2 ? 'rgba(255,107,107,0.1)' : 'transparent' }}>
          {/* 情報パネル */}
          <div style={styles.infoPanel}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ff6b6b' }}>
              プレイヤー2
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>LP: {p2Life}</div>
              <div style={styles.lifeBar}>
                <div style={{
                  ...styles.lifeBarFill,
                  width: `${(p2Life / INITIAL_LIFE) * 100}%`,
                  background: 'linear-gradient(90deg, #ff6b6b, #ff8533)',
                }} />
              </div>
            </div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>SP: {p2ActiveSP}/{p2ActiveSP + p2RestedSP}</div>
            <SPTokens active={p2ActiveSP} rested={p2RestedSP} max={MAX_SP} />
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#888' }}>
              デッキ: {p2Deck.length} | 墓地: {p2Graveyard.length}
            </div>
          </div>

          {/* フィールド */}
          <div style={styles.fieldArea}>
            {/* 手札（プレイヤー2のターンなら表示、それ以外は裏向き） */}
            <div style={{ ...styles.handArea, minHeight: '80px' }}>
              {p2Hand.map((card, i) => (
                currentPlayer === 2 ? (
                  <Card
                    key={card.uniqueId}
                    card={card}
                    onClick={() => handleHandCardClick(card)}
                    selected={selectedHandCard?.uniqueId === card.uniqueId}
                    inHand
                    small
                    disabled={phase !== 2}
                  />
                ) : (
                  <Card key={card.uniqueId} card={card} faceDown small />
                )
              ))}
            </div>
            {/* モンスターゾーン */}
            <div style={styles.monsterZone}>
              {p2Field.map((monster, i) => (
                <FieldMonster
                  key={i}
                  monster={monster}
                  onClick={() => handleFieldSlotClick(i, 2)}
                  selected={selectedFieldMonster === i && currentPlayer === 2}
                  canAttack={currentPlayer === 2 && phase === 3 && monster?.canAttack}
                  isTarget={currentPlayer === 1 && phase === 3 && attackingMonster !== null}
                  isValidTarget={currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'monster' && !monster}
                />
              ))}
            </div>
          </div>

          {/* フィールドカード・フェイズカード */}
          <div style={styles.infoPanel}>
            <div style={styles.cardZoneContainer}>
              {/* フィールドカード */}
              <div style={styles.cardZoneItem}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>フィールド</div>
                {p2FieldCard ? (
                  <div
                    style={{
                      cursor: currentPlayer === 2 && phase === 2 ? 'pointer' : 'default',
                      border: selectedFieldCardInfo?.card === p2FieldCard ? '2px solid #ff6b6b' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 2 ? handleFieldCardZoneClick : undefined}
                  >
                    <Card card={p2FieldCard} small />
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.cardSlot,
                      width: '80px',
                      height: '100px',
                      cursor: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? 'pointer' : 'default',
                      border: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? '2px solid #ff6b6b' : '1px dashed #444',
                      background: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? 'rgba(255,107,107,0.1)' : 'rgba(30,30,40,0.5)',
                    }}
                    onClick={currentPlayer === 2 ? handleFieldCardZoneClick : undefined}
                  >
                    なし
                  </div>
                )}
              </div>

              {/* フェイズカード */}
              <div style={styles.cardZoneItem}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>フェイズ</div>
                {p2PhaseCard ? (
                  <div
                    style={{
                      cursor: currentPlayer === 2 && phase === 2 ? 'pointer' : 'default',
                      border: currentPlayer === 2 && phase === 2 && selectedHandCard && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') ? '2px solid #ff6b6b' : selectedFieldCardInfo?.card === p2PhaseCard ? '2px solid #ff6b6b' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 2 ? handlePhaseCardZoneClick : undefined}
                  >
                    <Card card={p2PhaseCard} small />
                    <div style={{ fontSize: '10px', color: '#ffd700', textAlign: 'center', marginTop: '4px' }}>
                      ⚡ {getStageShortName(p2PhaseCard.stage || 0)}段階 ({p2PhaseCard.charges?.length || 0}/3)
                    </div>
                    {currentPlayer === 2 && phase === 2 && selectedHandCard &&
                      (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') &&
                      (selectedHandCard.attribute === p2PhaseCard.attribute || selectedHandCard.attribute === 'なし' || p2PhaseCard.attribute === 'なし') &&
                      (p2PhaseCard.stage || 0) < 3 && (
                      <div style={{ fontSize: '9px', color: '#4da6ff', textAlign: 'center', marginTop: '2px' }}>
                        クリックでチャージ
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.cardSlot,
                      width: '80px',
                      height: '100px',
                      cursor: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? 'pointer' : 'default',
                      border: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? '2px solid #ff6b6b' : '1px dashed #444',
                      background: currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? 'rgba(255,107,107,0.1)' : 'rgba(30,30,40,0.5)',
                    }}
                    onClick={currentPlayer === 2 ? handlePhaseCardZoneClick : undefined}
                  >
                    フェイズ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* センターゾーン */}
        <div style={styles.centerZone}>
          {/* フェイズ表示 */}
          <div style={styles.phaseIndicator}>
            {PHASES.map((p, i) => (
              <div
                key={i}
                style={{
                  ...styles.phaseButton,
                  background: phase === i 
                    ? 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)' 
                    : 'rgba(40,40,60,0.8)',
                  color: phase === i ? '#fff' : '#888',
                  boxShadow: phase === i ? '0 0 15px rgba(107,76,230,0.5)' : 'none',
                }}
              >
                {p}
              </div>
            ))}
          </div>

          {/* 手札選択モード */}
          {pendingHandSelection && (
            <div style={{
              background: selectedHandCard
                ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                : 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
              padding: '16px 24px',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: selectedHandCard
                ? '0 4px 20px rgba(76,175,80,0.4)'
                : '0 4px 20px rgba(255,107,107,0.4)',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                {pendingHandSelection.message}
              </div>
              {selectedHandCard ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#fff' }}>
                    選択中: <strong>{selectedHandCard.name}</strong>
                  </div>
                  <button
                    onClick={confirmHandSelection}
                    style={{
                      background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
                      color: '#333',
                      border: 'none',
                      padding: '10px 32px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    ✓ 決定
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#ffe0e0' }}>
                  手札からカードをクリックして選択してください
                </div>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 技発動ボタン（メインフェイズ） */}
            {phase === 2 && selectedFieldMonster !== null && currentPlayer === 1 && (
              (() => {
                const monster = p1Field[selectedFieldMonster];
                if (!monster) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#ffd700', textAlign: 'center' }}>
                      {monster.name} - 技発動
                    </div>
                    {monster.basicSkill && (
                      <button
                        onClick={() => executeSkill(selectedFieldMonster, 'basic')}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 1}
                      >
                        基本技 (チャージ{monster.charges?.length || 0}/1)
                      </button>
                    )}
                    {monster.advancedSkill && (
                      <button
                        onClick={() => executeSkill(selectedFieldMonster, 'advanced')}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 2}
                      >
                        上級技 (チャージ{monster.charges?.length || 0}/2)
                      </button>
                    )}
                    {/* メインフェイズトリガー */}
                    {(() => {
                      const triggers = getCardMainPhaseTriggers(monster, currentPlayer);
                      return triggers.map((trigger, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const triggerContext = {
                              currentPlayer,
                              card: monster,
                              slotIndex: selectedFieldMonster,
                              setP1Life,
                              setP2Life,
                              setP1Field,
                              setP2Field,
                              setP1Hand,
                              setP2Hand,
                              setP1Deck,
                              setP2Deck,
                              setP1Graveyard,
                              setP2Graveyard,
                              p1Field,
                              p2Field,
                              p1Hand,
                              p2Hand,
                              p1Deck,
                              p2Deck,
                              p1Graveyard,
                              p2Graveyard,
                              p1Life,
                              p2Life,
                              addLog,
                              setPendingHandSelection,
                            };
                            const { activateTrigger } = require('./engine/triggerEngine');
                            activateTrigger(trigger, triggerContext);
                          }}
                          style={{
                            ...styles.actionButton,
                            background: trigger.usedThisTurn
                              ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                              : 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                            fontSize: '12px',
                            padding: '8px 16px',
                          }}
                          disabled={!trigger.canActivate}
                        >
                          🌟 {trigger.description} {trigger.usedThisTurn && '(使用済み)'}
                        </button>
                      ));
                    })()}
                  </div>
                );
              })()
            )}
            {phase === 2 && selectedFieldMonster !== null && currentPlayer === 2 && (
              (() => {
                const monster = p2Field[selectedFieldMonster];
                if (!monster) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#ffd700', textAlign: 'center' }}>
                      {monster.name} - 技発動
                    </div>
                    {monster.basicSkill && (
                      <button
                        onClick={() => executeSkill(selectedFieldMonster, 'basic')}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 1}
                      >
                        基本技 (チャージ{monster.charges?.length || 0}/1)
                      </button>
                    )}
                    {monster.advancedSkill && (
                      <button
                        onClick={() => executeSkill(selectedFieldMonster, 'advanced')}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 2}
                      >
                        上級技 (チャージ{monster.charges?.length || 0}/2)
                      </button>
                    )}
                    {/* メインフェイズトリガー */}
                    {(() => {
                      const triggers = getCardMainPhaseTriggers(monster, currentPlayer);
                      return triggers.map((trigger, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const triggerContext = {
                              currentPlayer,
                              card: monster,
                              slotIndex: selectedFieldMonster,
                              setP1Life,
                              setP2Life,
                              setP1Field,
                              setP2Field,
                              setP1Hand,
                              setP2Hand,
                              setP1Deck,
                              setP2Deck,
                              setP1Graveyard,
                              setP2Graveyard,
                              p1Field,
                              p2Field,
                              p1Hand,
                              p2Hand,
                              p1Deck,
                              p2Deck,
                              p1Graveyard,
                              p2Graveyard,
                              p1Life,
                              p2Life,
                              addLog,
                              setPendingHandSelection,
                            };
                            const { activateTrigger } = require('./engine/triggerEngine');
                            activateTrigger(trigger, triggerContext);
                          }}
                          style={{
                            ...styles.actionButton,
                            background: trigger.usedThisTurn
                              ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                              : 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                            fontSize: '12px',
                            padding: '8px 16px',
                          }}
                          disabled={!trigger.canActivate}
                        >
                          🌟 {trigger.description} {trigger.usedThisTurn && '(使用済み)'}
                        </button>
                      ));
                    })()}
                  </div>
                );
              })()
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {phase === 2 && selectedHandCard && selectedHandCard.type === 'magic' && (
                <button
                  onClick={useMagicCard}
                  style={{
                    ...styles.actionButton,
                    background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                    fontSize: '14px',
                    padding: '10px 20px',
                  }}
                >
                  ✨ 魔法カード発動
                </button>
              )}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {phase === 2 && activatableGraveyardCards.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>
                      墓地発動可能
                    </div>
                    {activatableGraveyardCards.map((card) => (
                      <button
                        key={card.uniqueId}
                        onClick={() => activateGraveyardCard(card)}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #6b4e9e, #8b6bb8)',
                          fontSize: '12px',
                          padding: '6px 12px',
                        }}
                      >
                        💀 {card.name}
                      </button>
                    ))}
                  </div>
                )}
                {phase === 2 && (
                  <button onClick={nextPhase} style={styles.actionButton}>
                    バトルフェイズへ →
                  </button>
                )}
                {phase === 3 && (
                  <>
                    {attackingMonster !== null && (
                      <button onClick={handleDirectAttack} style={{ ...styles.actionButton, background: '#ff4444' }}>
                        ダイレクトアタック
                      </button>
                    )}
                    <button onClick={nextPhase} style={styles.actionButton}>
                      ターン終了 →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* プレイヤー1エリア（下） */}
        <div style={{ ...styles.playerArea, background: currentPlayer === 1 ? 'rgba(77,166,255,0.1)' : 'transparent' }}>
          {/* 情報パネル */}
          <div style={styles.infoPanel}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#4da6ff' }}>
              プレイヤー1
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>LP: {p1Life}</div>
              <div style={styles.lifeBar}>
                <div style={{
                  ...styles.lifeBarFill,
                  width: `${(p1Life / INITIAL_LIFE) * 100}%`,
                  background: 'linear-gradient(90deg, #4da6ff, #66d9ff)',
                }} />
              </div>
            </div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>SP: {p1ActiveSP}/{p1ActiveSP + p1RestedSP}</div>
            <SPTokens active={p1ActiveSP} rested={p1RestedSP} max={MAX_SP} />
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#888' }}>
              デッキ: {p1Deck.length} | 墓地: {p1Graveyard.length}
            </div>
          </div>

          {/* フィールド */}
          <div style={styles.fieldArea}>
            {/* モンスターゾーン */}
            <div style={styles.monsterZone}>
              {p1Field.map((monster, i) => (
                <FieldMonster
                  key={i}
                  monster={monster}
                  onClick={() => handleFieldSlotClick(i, 1)}
                  selected={selectedFieldMonster === i && currentPlayer === 1}
                  canAttack={currentPlayer === 1 && phase === 3 && monster?.canAttack}
                  isTarget={currentPlayer === 2 && phase === 3 && attackingMonster !== null}
                  isValidTarget={currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'monster' && !monster}
                />
              ))}
            </div>
            {/* 手札 */}
            <div style={styles.handArea}>
              {p1Hand.map((card) => (
                <Card
                  key={card.uniqueId}
                  card={card}
                  onClick={() => handleHandCardClick(card)}
                  selected={selectedHandCard?.uniqueId === card.uniqueId}
                  inHand
                  disabled={currentPlayer !== 1 || phase !== 2}
                />
              ))}
            </div>
          </div>

          {/* フィールドカード・フェイズカード */}
          <div style={styles.infoPanel}>
            <div style={styles.cardZoneContainer}>
              {/* フィールドカード */}
              <div style={styles.cardZoneItem}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>フィールド</div>
                {p1FieldCard ? (
                  <div
                    style={{
                      cursor: currentPlayer === 1 && phase === 2 ? 'pointer' : 'default',
                      border: selectedFieldCardInfo?.card === p1FieldCard ? '2px solid #4da6ff' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 1 ? handleFieldCardZoneClick : undefined}
                  >
                    <Card card={p1FieldCard} small />
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.cardSlot,
                      width: '80px',
                      height: '100px',
                      cursor: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? 'pointer' : 'default',
                      border: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? '2px solid #4da6ff' : '1px dashed #444',
                      background: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'field' ? 'rgba(77,166,255,0.1)' : 'rgba(30,30,40,0.5)',
                    }}
                    onClick={currentPlayer === 1 ? handleFieldCardZoneClick : undefined}
                  >
                    なし
                  </div>
                )}
              </div>

              {/* フェイズカード */}
              <div style={styles.cardZoneItem}>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>フェイズ</div>
                {p1PhaseCard ? (
                  <div
                    style={{
                      cursor: currentPlayer === 1 && phase === 2 ? 'pointer' : 'default',
                      border: currentPlayer === 1 && phase === 2 && selectedHandCard && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') ? '2px solid #4da6ff' : selectedFieldCardInfo?.card === p1PhaseCard ? '2px solid #4da6ff' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 1 ? handlePhaseCardZoneClick : undefined}
                  >
                    <Card card={p1PhaseCard} small />
                    <div style={{ fontSize: '10px', color: '#ffd700', textAlign: 'center', marginTop: '4px' }}>
                      ⚡ {getStageShortName(p1PhaseCard.stage || 0)}段階 ({p1PhaseCard.charges?.length || 0}/3)
                    </div>
                    {currentPlayer === 1 && phase === 2 && selectedHandCard &&
                      (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field' || selectedHandCard.type === 'phasecard') &&
                      (selectedHandCard.attribute === p1PhaseCard.attribute || selectedHandCard.attribute === 'なし' || p1PhaseCard.attribute === 'なし') &&
                      (p1PhaseCard.stage || 0) < 3 && (
                      <div style={{ fontSize: '9px', color: '#4da6ff', textAlign: 'center', marginTop: '2px' }}>
                        クリックでチャージ
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.cardSlot,
                      width: '80px',
                      height: '100px',
                      cursor: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? 'pointer' : 'default',
                      border: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? '2px solid #4da6ff' : '1px dashed #444',
                      background: currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'phasecard' ? 'rgba(77,166,255,0.1)' : 'rgba(30,30,40,0.5)',
                    }}
                    onClick={currentPlayer === 1 ? handlePhaseCardZoneClick : undefined}
                  >
                    フェイズ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
