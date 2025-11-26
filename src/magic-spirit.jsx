import React, { useState, useEffect, useCallback } from 'react';
import {
  INITIAL_LIFE,
  INITIAL_SP,
  MAX_SP,
  INITIAL_HAND_SIZE,
  COUNTER_ATTACK_RATE,
  PHASES,
} from './utils/constants';
import { createDeck, createMonsterInstance } from './utils/helpers';
import { loadCardsFromCSV, SAMPLE_CARDS } from './utils/cardManager';
import { executeSkillEffects } from './engine/effectEngine';
import {
  registerCardTriggers,
  unregisterCardTriggers,
  fireTrigger,
  clearAllTriggers,
  resetTurnFlags,
  getCardMainPhaseTriggers,
} from './engine/triggerEngine';
import { TRIGGER_TYPES } from './engine/triggerTypes';
import styles from './styles/gameStyles';
import Card from './components/Card';
import FieldMonster from './components/FieldMonster';
import SPTokens from './components/SPTokens';
import GameLog from './components/GameLog';

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
    const deck1 = createDeck(allCards);
    const deck2 = createDeck(allCards);

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

    // トリガーシステムをクリア
    clearAllTriggers();

    setGameState('playing');
    addLog('ゲーム開始！先攻プレイヤー1のターン', 'info');
  }, [addLog, allCards]);

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

        // ターン終了時に使用済みフラグをリセット
        resetTurnFlags();

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

    // チャージ数チェック（最大3枚）
    const currentCharges = phaseCard.charges ? phaseCard.charges.length : 0;
    if (currentCharges >= 3) {
      addLog('フェイズカードは既に最大（3枚）チャージされています', 'damage');
      return false;
    }

    // 属性チェック（同属性のみ）
    if (card.attribute !== phaseCard.attribute && card.attribute !== 'なし') {
      addLog(`フェイズカードと同じ属性のカードのみチャージできます（フェイズカード: ${phaseCard.attribute}）`, 'damage');
      return false;
    }

    // 属性カードのみチャージ可能
    if (card.type !== 'monster' && card.type !== 'magic' && card.type !== 'field') {
      addLog('チャージできるのは属性カード（モンスター、魔法、フィールド）のみです', 'damage');
      return false;
    }

    const newCharge = {
      card: card,
      attribute: card.attribute,
    };

    const updatedPhaseCard = {
      ...phaseCard,
      charges: [...(phaseCard.charges || []), newCharge],
    };

    // 手札から削除
    setHand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));

    // チャージ数に応じた処理
    const newChargeCount = currentCharges + 1;
    addLog(`フェイズカード【${phaseCard.name}】に${card.name}をチャージしました（${newChargeCount}/3）`, 'info');

    // 段階効果を実行
    if (phaseCard.effect) {
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
        addLog,
      };

      // 段階に応じた効果を実行
      const phasePattern = new RegExp(`${newChargeCount}枚重ね[：:]\\s*([^。\\n]+)`);
      const phaseMatch = phaseCard.effect.match(phasePattern);

      if (phaseMatch) {
        addLog(`【第${newChargeCount}段階効果】: ${phaseMatch[1]}`, 'info');
        executeSkillEffects(phaseMatch[1], context, phaseCard.id);
      }
    }

    // 3枚目の場合は墓地へ
    if (newChargeCount >= 3) {
      addLog(`フェイズカード【${phaseCard.name}】は最終段階に到達し、墓地へ送られます`, 'info');
      setGraveyard(prev => [...prev, updatedPhaseCard, ...updatedPhaseCard.charges.map(c => c.card)]);
      setPhaseCard(null);
    } else {
      setPhaseCard(updatedPhaseCard);
    }

    setChargeUsedThisTurn(true);
    return true;
  }, [currentPlayer, p1PhaseCard, p2PhaseCard, p1Field, p2Field, p1Hand, p2Hand,
      p1Deck, p2Deck, p1Graveyard, p2Graveyard, chargeUsedThisTurn, addLog,
      setP1Life, setP2Life, setP1Field, setP2Field, setP1Hand, setP2Hand,
      setP1Deck, setP2Deck, setP1Graveyard, setP2Graveyard,
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

      // 召喚時効果を実行（新表記【召喚時】と旧表記「召喚時」に対応）
      if (card.effect && (card.effect.includes('召喚時') || card.effect.includes('【召喚時】'))) {
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

      // 召喚時トリガーを発火（他のカードのトリガー）
      const triggerContext = {
        currentPlayer,
        card: monsterInstance,
        slotIndex,
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

      addLog(`プレイヤー${currentPlayer}: ${card.name}を設置！`, 'info');
      return true;
    }

    if (card.type === 'phasecard') {
      if (currentPlayer === 1) {
        setP1PhaseCard(card);
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
      } else {
        setP2PhaseCard(card);
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
      }

      addLog(`プレイヤー${currentPlayer}: フェイズカード【${card.name}】を設置！`, 'info');

      // フェイズカードの初期効果を実行
      if (card.effect) {
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
          addLog,
        };
        // 初期効果のみを実行
        const initialEffectMatch = card.effect.match(/初期効果[：:]\s*([^。\n]+)/);
        if (initialEffectMatch) {
          addLog(`初期効果: ${initialEffectMatch[1]}`, 'info');
          executeSkillEffects(initialEffectMatch[1], context, card.id);
        }
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

    const target = opponentField[targetIndex];
    
    if (target) {
      // モンスター攻撃
      const damage = attacker.currentAttack;
      const counterDamage = Math.floor(target.currentAttack * COUNTER_ATTACK_RATE);
      
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
      let damage = attacker.currentAttack;
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
    
    setSelectedHandCard(selectedHandCard?.uniqueId === card.uniqueId ? null : card);
    setSelectedFieldMonster(null);
    setAttackingMonster(null);
  };

  // フィールドスロットクリック
  const handleFieldSlotClick = (slotIndex, playerNum) => {
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
        // 属性カード（モンスター、魔法、フィールド）をチャージ
        if (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field') {
          if (chargePhaseCard(selectedHandCard)) {
            setSelectedHandCard(null);
          }
        } else {
          addLog('フェイズカードにチャージできるのは属性カード（モンスター、魔法、フィールド）のみです', 'damage');
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

  // ========================================
  // レンダリング
  // ========================================
  
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
                      border: currentPlayer === 2 && phase === 2 && selectedHandCard && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field') ? '2px solid #ff6b6b' : selectedFieldCardInfo?.card === p2PhaseCard ? '2px solid #ff6b6b' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 2 ? handlePhaseCardZoneClick : undefined}
                  >
                    <Card card={p2PhaseCard} small />
                    <div style={{ fontSize: '10px', color: '#ffd700', textAlign: 'center', marginTop: '4px' }}>
                      ⚡ チャージ: {p2PhaseCard.charges?.length || 0}/3
                    </div>
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
                    なし
                  </div>
                )}
              </div>
            </div>
            {selectedHandCard && currentPlayer === 2 && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(255,107,107,0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(255,107,107,0.5)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#ff8a8a' }}>
                  📋 選択中: {selectedHandCard.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                  属性: {selectedHandCard.attribute} | コスト: {selectedHandCard.cost} SP
                </div>
                {selectedHandCard.categoryText && (
                  <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '4px' }}>
                    カテゴリ: {selectedHandCard.categoryText}
                  </div>
                )}
                {selectedHandCard.type === 'monster' && (
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                    ⚔️ {selectedHandCard.attack} | ❤️ {selectedHandCard.hp}
                  </div>
                )}
                <div style={{
                  fontSize: '10px',
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '6px',
                  borderRadius: '4px',
                  lineHeight: '1.4',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}>
                  {selectedHandCard.effect || 'なし'}
                </div>
                {/* 技情報 */}
                {selectedHandCard.type === 'monster' && (selectedHandCard.basicSkill || selectedHandCard.advancedSkill) && (
                  <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: '1.4' }}>
                    {selectedHandCard.basicSkill && (
                      <div style={{
                        marginBottom: '4px',
                        padding: '4px',
                        background: 'rgba(76,175,80,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(76,175,80,0.3)',
                      }}>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技(1):</span>
                        <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{selectedHandCard.basicSkill.text}</span>
                      </div>
                    )}
                    {selectedHandCard.advancedSkill && (
                      <div style={{
                        padding: '4px',
                        background: 'rgba(255,152,0,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,152,0,0.3)',
                      }}>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技(2):</span>
                        <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{selectedHandCard.advancedSkill.text}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{
                  fontSize: '10px',
                  color: '#ff6b6b',
                  marginTop: '6px',
                  fontWeight: 'bold',
                }}>
                  {selectedHandCard.type === 'monster' && '👆 空きスロットをクリックして召喚'}
                  {selectedHandCard.type === 'magic' && '👆 「魔法カード発動」ボタンで発動'}
                  {selectedHandCard.type === 'field' && '👆 フィールドゾーンをクリックして設置'}
                  {selectedHandCard.type === 'phasecard' && '👆 フィールドゾーンをクリックして設置'}
                </div>
              </div>
            )}
            {!selectedHandCard && selectedFieldMonster !== null && currentPlayer === 2 && (() => {
              const monster = p2Field[selectedFieldMonster];
              if (!monster) return null;
              return (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: 'rgba(255,107,107,0.2)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,107,107,0.5)',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#ff8a8a' }}>
                    📋 フィールド: {monster.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                    属性: {monster.attribute} | コスト: {monster.cost} SP
                  </div>
                  {monster.categoryText && (
                    <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '4px' }}>
                      カテゴリ: {monster.categoryText}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                    ⚔️ {monster.attack} | ❤️ {monster.hp}
                    {monster.charges && monster.charges.length > 0 && (
                      <span style={{ marginLeft: '8px', color: '#4caf50' }}>
                        ⚡ チャージ: {monster.charges.length}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#e0e0e0',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '6px',
                    borderRadius: '4px',
                    lineHeight: '1.4',
                    maxHeight: '80px',
                    overflowY: 'auto',
                  }}>
                    {monster.effect || 'なし'}
                  </div>
                  {/* 技情報 */}
                  {(monster.basicSkill || monster.advancedSkill) && (
                    <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: '1.4' }}>
                      {monster.basicSkill && (
                        <div style={{
                          marginBottom: '4px',
                          padding: '4px',
                          background: 'rgba(76,175,80,0.2)',
                          borderRadius: '4px',
                          border: '1px solid rgba(76,175,80,0.3)',
                        }}>
                          <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技(1):</span>
                          <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{monster.basicSkill.text}</span>
                        </div>
                      )}
                      {monster.advancedSkill && (
                        <div style={{
                          padding: '4px',
                          background: 'rgba(255,152,0,0.2)',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,152,0,0.3)',
                        }}>
                          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技(2):</span>
                          <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{monster.advancedSkill.text}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {!selectedHandCard && !selectedFieldMonster && selectedFieldCardInfo && selectedFieldCardInfo.player === 2 && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(255,107,107,0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(255,107,107,0.5)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#ff8a8a' }}>
                  📋 {selectedFieldCardInfo.type === 'field' ? 'フィールドカード' : 'フェイズカード'}: {selectedFieldCardInfo.card.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                  属性: {selectedFieldCardInfo.card.attribute} | コスト: {selectedFieldCardInfo.card.cost} SP
                </div>
                {selectedFieldCardInfo.card.categoryText && (
                  <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '4px' }}>
                    カテゴリ: {selectedFieldCardInfo.card.categoryText}
                  </div>
                )}
                {selectedFieldCardInfo.type === 'phasecard' && selectedFieldCardInfo.card.charges && (
                  <div style={{ fontSize: '11px', color: '#4caf50', marginBottom: '4px' }}>
                    ⚡ チャージ: {selectedFieldCardInfo.card.charges.length}/3
                  </div>
                )}
                <div style={{
                  fontSize: '10px',
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '6px',
                  borderRadius: '4px',
                  lineHeight: '1.4',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}>
                  {selectedFieldCardInfo.card.effect || 'なし'}
                </div>
                <button
                  onClick={() => setSelectedFieldCardInfo(null)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 12px',
                    background: 'rgba(255,107,107,0.5)',
                    border: '1px solid #ff6b6b',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  閉じる
                </button>
              </div>
            )}
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
              <div style={{ display: 'flex', gap: '12px' }}>
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

          {/* ログ */}
          <div style={{ width: '250px' }}>
            <GameLog logs={logs} />
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
                      border: currentPlayer === 1 && phase === 2 && selectedHandCard && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field') ? '2px solid #4da6ff' : selectedFieldCardInfo?.card === p1PhaseCard ? '2px solid #4da6ff' : 'none',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                    onClick={currentPlayer === 1 ? handlePhaseCardZoneClick : undefined}
                  >
                    <Card card={p1PhaseCard} small />
                    <div style={{ fontSize: '10px', color: '#ffd700', textAlign: 'center', marginTop: '4px' }}>
                      ⚡ チャージ: {p1PhaseCard.charges?.length || 0}/3
                    </div>
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
                    なし
                  </div>
                )}
              </div>
            </div>
            {selectedHandCard && currentPlayer === 1 && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(107,76,230,0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(107,76,230,0.5)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#a78bfa' }}>
                  📋 選択中: {selectedHandCard.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                  属性: {selectedHandCard.attribute} | コスト: {selectedHandCard.cost} SP
                </div>
                {selectedHandCard.categoryText && (
                  <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '4px' }}>
                    カテゴリ: {selectedHandCard.categoryText}
                  </div>
                )}
                {selectedHandCard.type === 'monster' && (
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                    ⚔️ {selectedHandCard.attack} | ❤️ {selectedHandCard.hp}
                  </div>
                )}
                <div style={{
                  fontSize: '10px',
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '6px',
                  borderRadius: '4px',
                  lineHeight: '1.4',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}>
                  {selectedHandCard.effect || 'なし'}
                </div>
                {/* 技情報 */}
                {selectedHandCard.type === 'monster' && (selectedHandCard.basicSkill || selectedHandCard.advancedSkill) && (
                  <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: '1.4' }}>
                    {selectedHandCard.basicSkill && (
                      <div style={{
                        marginBottom: '4px',
                        padding: '4px',
                        background: 'rgba(76,175,80,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(76,175,80,0.3)',
                      }}>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技(1):</span>
                        <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{selectedHandCard.basicSkill.text}</span>
                      </div>
                    )}
                    {selectedHandCard.advancedSkill && (
                      <div style={{
                        padding: '4px',
                        background: 'rgba(255,152,0,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,152,0,0.3)',
                      }}>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技(2):</span>
                        <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{selectedHandCard.advancedSkill.text}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{
                  fontSize: '10px',
                  color: '#6b4ce6',
                  marginTop: '6px',
                  fontWeight: 'bold',
                }}>
                  {selectedHandCard.type === 'monster' && '👆 空きスロットをクリックして召喚'}
                  {selectedHandCard.type === 'magic' && '👆 「魔法カード発動」ボタンで発動'}
                  {selectedHandCard.type === 'field' && '👆 フィールドゾーンをクリックして設置'}
                  {selectedHandCard.type === 'phasecard' && '👆 フィールドゾーンをクリックして設置'}
                </div>
              </div>
            )}
            {!selectedHandCard && selectedFieldMonster !== null && currentPlayer === 1 && (() => {
              const monster = p1Field[selectedFieldMonster];
              if (!monster) return null;
              return (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: 'rgba(107,76,230,0.2)',
                  borderRadius: '8px',
                  border: '1px solid rgba(107,76,230,0.5)',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#a78bfa' }}>
                    📋 フィールド: {monster.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                    属性: {monster.attribute} | コスト: {monster.cost} SP
                  </div>
                  {monster.categoryText && (
                    <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '4px' }}>
                      カテゴリ: {monster.categoryText}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                    ⚔️ {monster.attack} | ❤️ {monster.hp}
                    {monster.charges && monster.charges.length > 0 && (
                      <span style={{ marginLeft: '8px', color: '#4caf50' }}>
                        ⚡ チャージ: {monster.charges.length}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#e0e0e0',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '6px',
                    borderRadius: '4px',
                    lineHeight: '1.4',
                    maxHeight: '80px',
                    overflowY: 'auto',
                  }}>
                    {monster.effect || 'なし'}
                  </div>
                  {/* 技情報 */}
                  {(monster.basicSkill || monster.advancedSkill) && (
                    <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: '1.4' }}>
                      {monster.basicSkill && (
                        <div style={{
                          marginBottom: '4px',
                          padding: '4px',
                          background: 'rgba(76,175,80,0.2)',
                          borderRadius: '4px',
                          border: '1px solid rgba(76,175,80,0.3)',
                        }}>
                          <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技(1):</span>
                          <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{monster.basicSkill.text}</span>
                        </div>
                      )}
                      {monster.advancedSkill && (
                        <div style={{
                          padding: '4px',
                          background: 'rgba(255,152,0,0.2)',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,152,0,0.3)',
                        }}>
                          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技(2):</span>
                          <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{monster.advancedSkill.text}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {!selectedHandCard && !selectedFieldMonster && selectedFieldCardInfo && selectedFieldCardInfo.player === 1 && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(107,76,230,0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(107,76,230,0.5)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#a78bfa' }}>
                  📋 {selectedFieldCardInfo.type === 'field' ? 'フィールドカード' : 'フェイズカード'}: {selectedFieldCardInfo.card.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                  属性: {selectedFieldCardInfo.card.attribute} | コスト: {selectedFieldCardInfo.card.cost} SP
                </div>
                {selectedFieldCardInfo.card.categoryText && (
                  <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '4px' }}>
                    カテゴリ: {selectedFieldCardInfo.card.categoryText}
                  </div>
                )}
                {selectedFieldCardInfo.type === 'phasecard' && selectedFieldCardInfo.card.charges && (
                  <div style={{ fontSize: '11px', color: '#4caf50', marginBottom: '4px' }}>
                    ⚡ チャージ: {selectedFieldCardInfo.card.charges.length}/3
                  </div>
                )}
                <div style={{
                  fontSize: '10px',
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '6px',
                  borderRadius: '4px',
                  lineHeight: '1.4',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}>
                  {selectedFieldCardInfo.card.effect || 'なし'}
                </div>
                <button
                  onClick={() => setSelectedFieldCardInfo(null)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 12px',
                    background: 'rgba(107,76,230,0.5)',
                    border: '1px solid #6b4ce6',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
