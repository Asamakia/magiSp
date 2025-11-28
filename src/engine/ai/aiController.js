/**
 * AIコントローラー
 *
 * AIプレイヤーの行動制御を担当
 * - ゲーム状態の取得
 * - アクション可能判定
 * - フェイズごとの行動実行
 * - 特殊ケース（手札選択、ターゲット選択等）の処理
 */

import { getStrategy } from './strategies';
import { statusEffectEngine } from '../statusEffects';

/**
 * AI思考の遅延時間（ミリ秒）
 */
export const AI_DELAY = {
  SHORT: 300,   // 短い遅延（選択確定等）
  MEDIUM: 500,  // 中程度の遅延（アクション間）
  LONG: 800,    // 長い遅延（フェイズ開始時）
};

/**
 * AI思考速度の設定
 * - normal: 普通（1.0倍）
 * - fast: 早い（0.4倍）
 * - veryFast: とても速い（0.1倍）
 */
export const AI_SPEED_SETTINGS = {
  normal: { label: '普通', multiplier: 1.0 },
  fast: { label: '早い', multiplier: 0.4 },
  veryFast: { label: 'とても速い', multiplier: 0.1 },
};

const AI_SPEED_STORAGE_KEY = 'magicSpirit_aiThinkingSpeed';

/**
 * AI思考速度をlocalStorageから取得
 * @returns {string} 'normal' | 'fast' | 'veryFast'
 */
export function getAIThinkingSpeed() {
  try {
    const stored = localStorage.getItem(AI_SPEED_STORAGE_KEY);
    if (stored && AI_SPEED_SETTINGS[stored]) {
      return stored;
    }
  } catch (e) {
    // localStorageが使えない環境
  }
  return 'normal';
}

/**
 * AI思考速度をlocalStorageに保存
 * @param {string} speed - 'normal' | 'fast' | 'veryFast'
 */
export function setAIThinkingSpeed(speed) {
  try {
    if (AI_SPEED_SETTINGS[speed]) {
      localStorage.setItem(AI_SPEED_STORAGE_KEY, speed);
    }
  } catch (e) {
    // localStorageが使えない環境
  }
}

/**
 * 現在の速度倍率を取得
 * @returns {number}
 */
export function getSpeedMultiplier() {
  const speed = getAIThinkingSpeed();
  return AI_SPEED_SETTINGS[speed]?.multiplier || 1.0;
}

/**
 * 遅延を挿入（人間らしさのため）
 * @param {number} ms - 基本遅延時間
 * @returns {Promise}
 */
export function delay(ms) {
  const multiplier = getSpeedMultiplier();
  const adjustedMs = ms * multiplier;
  const randomVariance = Math.random() * 200 * multiplier;
  return new Promise(resolve => setTimeout(resolve, adjustedMs + randomVariance));
}

// ============================================================
// ゲーム状態取得ヘルパー
// ============================================================

/**
 * AIGameState を作成
 * 現在のプレイヤー視点でゲーム状態をまとめる
 */
export function createAIGameState(currentPlayer, gameStateData) {
  const {
    phase, turn, isFirstTurn,
    p1Life, p2Life,
    p1Hand, p2Hand,
    p1Field, p2Field,
    p1Graveyard, p2Graveyard,
    p1Deck, p2Deck,
    p1ActiveSP, p2ActiveSP,
    p1RestedSP, p2RestedSP,
    p1FieldCard, p2FieldCard,
    p1PhaseCard, p2PhaseCard,
  } = gameStateData;

  const isP1 = currentPlayer === 1;

  return {
    currentPlayer,
    phase,
    turn,
    isFirstTurn,

    myLife: isP1 ? p1Life : p2Life,
    opponentLife: isP1 ? p2Life : p1Life,
    myHand: isP1 ? p1Hand : p2Hand,
    opponentHandCount: isP1 ? p2Hand.length : p1Hand.length,
    myField: isP1 ? p1Field : p2Field,
    opponentField: isP1 ? p2Field : p1Field,
    myGraveyard: isP1 ? p1Graveyard : p2Graveyard,
    opponentGraveyard: isP1 ? p2Graveyard : p1Graveyard,
    myDeckCount: isP1 ? p1Deck.length : p2Deck.length,
    opponentDeckCount: isP1 ? p2Deck.length : p1Deck.length,

    myActiveSP: isP1 ? p1ActiveSP : p2ActiveSP,
    myRestedSP: isP1 ? p1RestedSP : p2RestedSP,
    myFieldCard: isP1 ? p1FieldCard : p2FieldCard,
    myPhaseCard: isP1 ? p1PhaseCard : p2PhaseCard,
    opponentFieldCard: isP1 ? p2FieldCard : p1FieldCard,
    opponentPhaseCard: isP1 ? p2PhaseCard : p1PhaseCard,
  };
}

/**
 * 召喚可能なカードを取得
 */
export function getSummonableCards(gameState, costModifierFn = null) {
  const { myHand, myField, myActiveSP } = gameState;
  const emptySlots = myField.map((m, i) => m === null ? i : -1).filter(i => i >= 0);

  if (emptySlots.length === 0) return [];

  return myHand.filter(card => {
    if (card.type !== 'monster') return false;
    // コスト計算（常時効果による軽減を考慮）
    let cost = card.cost + (card.tempCostModifier || 0);
    if (costModifierFn) {
      cost += costModifierFn(card);
    }
    return cost <= myActiveSP;
  });
}

/**
 * 配置可能なフィールドカードを取得
 */
export function getPlaceableFieldCards(gameState) {
  const { myHand, myActiveSP, myFieldCard } = gameState;

  // 既にフィールドカードが設置されている場合は空配列
  // ※上書き配置を許可する場合はこの条件を削除
  if (myFieldCard) return [];

  return myHand.filter(card => {
    if (card.type !== 'field') return false;
    return card.cost <= myActiveSP;
  });
}

/**
 * 配置可能なフェイズカードを取得
 */
export function getPlaceablePhaseCards(gameState) {
  const { myHand, myActiveSP, myPhaseCard } = gameState;

  // 既にフェイズカードが設置されている場合は空配列
  if (myPhaseCard) return [];

  return myHand.filter(card => {
    if (card.type !== 'phasecard') return false;
    return card.cost <= myActiveSP;
  });
}

/**
 * 使用可能な魔法カードを取得
 */
export function getUsableMagicCards(gameState, costModifierFn = null) {
  const { myHand, myActiveSP } = gameState;

  return myHand.filter(card => {
    if (card.type !== 'magic') return false;
    let cost = card.cost + (card.tempCostModifier || 0);
    if (costModifierFn) {
      cost += costModifierFn(card);
    }
    return cost <= myActiveSP;
  });
}

/**
 * 空きスロットを取得
 */
export function getEmptySlots(gameState) {
  return gameState.myField
    .map((m, i) => m === null ? i : -1)
    .filter(i => i >= 0);
}

/**
 * チャージ可能なモンスターを取得
 * チャージ枚数が2未満で、かつ技を持っているモンスターを返す
 */
export function getChargeableMonsters(gameState) {
  const chargeableMonsters = [];
  gameState.myField.forEach((monster, index) => {
    if (!monster) return;
    const charges = monster.charges?.length || 0;
    // 技を持っていないモンスターにはチャージしない
    const hasSkill = monster.basicSkill || monster.advancedSkill;
    if (charges < 2 && hasSkill) {
      chargeableMonsters.push({ monsterIndex: index, monster, currentCharges: charges });
    }
  });
  return chargeableMonsters;
}

/**
 * チャージに使用可能なカードを取得
 * モンスター、魔法、フィールドカードがチャージ可能
 */
export function getChargeableCards(gameState) {
  return gameState.myHand.filter(card => {
    return card.type === 'monster' || card.type === 'magic' || card.type === 'field';
  });
}

/**
 * 使用可能なスキルを取得
 * 1ターン1回制限（usedSkillThisTurn）もチェック
 */
export function getUsableSkills(gameState) {
  const skills = [];
  gameState.myField.forEach((monster, index) => {
    if (!monster) return;
    // 既に技を発動済みの場合はスキップ
    if (monster.usedSkillThisTurn) return;
    const charges = monster.charges?.length || 0;

    if (charges >= 1 && monster.basicSkill) {
      skills.push({ monsterIndex: index, skillType: 'basic', monster });
    }
    if (charges >= 2 && monster.advancedSkill) {
      skills.push({ monsterIndex: index, skillType: 'advanced', monster });
    }
  });
  return skills;
}

/**
 * 攻撃可能なモンスターのインデックスを取得
 * canAttackフラグと状態異常（凍結、眠り等）の両方をチェック
 */
export function getAttackableMonsters(gameState) {
  return gameState.myField
    .map((m, i) => {
      if (!m || !m.canAttack) return -1;
      // 状態異常による攻撃不可をチェック（凍結、眠り、行動不能）
      if (!statusEffectEngine.canAttack(m)) return -1;
      return i;
    })
    .filter(i => i >= 0);
}

/**
 * 有効な攻撃対象を取得
 */
export function getValidAttackTargets(gameState) {
  const targets = [];

  // 相手モンスター
  gameState.opponentField.forEach((monster, index) => {
    if (monster) targets.push(index);
  });

  // 直接攻撃
  targets.push('direct');

  return targets;
}

/**
 * 残りアクション情報を取得
 */
export function getActionsRemaining(gameState, options = {}) {
  const { costModifierFn = null, chargeUsedThisTurn = false } = options;
  const summonableCards = getSummonableCards(gameState, costModifierFn);
  const usableSkills = getUsableSkills(gameState);
  const usableMagicCards = getUsableMagicCards(gameState, costModifierFn);
  const chargeableMonsters = getChargeableMonsters(gameState);
  const chargeableCards = getChargeableCards(gameState);
  const canCharge = !chargeUsedThisTurn && chargeableMonsters.length > 0 && chargeableCards.length > 0;
  const placeableFieldCards = getPlaceableFieldCards(gameState);
  const placeablePhaseCards = getPlaceablePhaseCards(gameState);

  return {
    canSummon: summonableCards.length > 0,
    canUseSkill: usableSkills.length > 0,
    canUseMagic: usableMagicCards.length > 0,
    canCharge,
    canPlaceFieldCard: placeableFieldCards.length > 0,
    canPlacePhaseCard: placeablePhaseCards.length > 0,
    canActivateTrigger: false, // トリガーは外部から渡す
    summonableCards,
    usableSkills,
    usableMagicCards,
    chargeableMonsters,
    chargeableCards,
    placeableFieldCards,
    placeablePhaseCards,
  };
}

// ============================================================
// メインフェイズ処理
// ============================================================

/**
 * メインフェイズのAI行動を1アクション実行
 * @returns {string} 実行したアクション種別 ('summon' | 'field' | 'phase' | 'skill' | 'magic' | 'charge' | 'trigger' | 'end')
 */
export function executeAIMainPhaseAction(gameState, actions, strategy, options = {}) {
  const { summonCard, executeSkill, activateMagicCard, activateTrigger, chargeCard, placeFieldCard, placePhaseCard, nextPhase } = actions;
  const { costModifierFn, activatableTriggers = [], chargeUsedThisTurn = false } = options;

  // 残りアクションを取得
  const remaining = getActionsRemaining(gameState, { costModifierFn, chargeUsedThisTurn });

  // 1. フィールドカード配置判断（召喚前に判断、シナジーを活かすため）
  if (remaining.canPlaceFieldCard && placeFieldCard) {
    const fieldCardToPlace = strategy.chooseFieldCard(remaining.placeableFieldCards, gameState);
    if (fieldCardToPlace) {
      placeFieldCard(fieldCardToPlace);
      return 'field';
    }
  }

  // 2. フェイズカード配置判断
  if (remaining.canPlacePhaseCard && placePhaseCard) {
    const phaseCardToPlace = strategy.choosePhaseCard(remaining.placeablePhaseCards, gameState);
    if (phaseCardToPlace) {
      placePhaseCard(phaseCardToPlace);
      return 'phase';
    }
  }

  // 3. 召喚判断
  const cardToSummon = strategy.chooseSummon(remaining.summonableCards, gameState);
  if (cardToSummon) {
    const emptySlots = getEmptySlots(gameState);
    const slot = strategy.chooseSlot(emptySlots, cardToSummon, gameState);
    if (slot !== null && slot !== undefined) {
      summonCard(cardToSummon, slot);
      return 'summon';
    }
  }

  // 4. チャージ判断（スキル使用前に行う）
  if (remaining.canCharge && chargeCard) {
    const chargeDecision = strategy.chooseCharge(
      remaining.chargeableCards,
      remaining.chargeableMonsters,
      gameState
    );
    if (chargeDecision) {
      chargeCard(chargeDecision.card, chargeDecision.monsterIndex);
      return 'charge';
    }
  }

  // 5. スキル使用判断
  const skillToUse = strategy.chooseSkill(remaining.usableSkills, gameState);
  if (skillToUse) {
    executeSkill(skillToUse.monsterIndex, skillToUse.skillType);
    return 'skill';
  }

  // 6. 魔法カード使用判断
  const magicToUse = strategy.chooseMagicCard(remaining.usableMagicCards, gameState);
  if (magicToUse && activateMagicCard) {
    activateMagicCard(magicToUse);
    return 'magic';
  }

  // 7. トリガー発動判断
  const triggerToActivate = strategy.chooseTrigger(activatableTriggers, gameState);
  if (triggerToActivate) {
    activateTrigger(triggerToActivate);
    return 'trigger';
  }

  // 8. アクションがなければバトルフェイズへ
  nextPhase();
  return 'end';
}

// ============================================================
// バトルフェイズ処理
// ============================================================

/**
 * バトルフェイズのAI行動を1アクション実行
 * @param {Set} attackedMonsters - 既に攻撃したモンスターのインデックスセット
 * @returns {Object} { action: string, attackedMonsters: Set }
 */
export function executeAIBattlePhaseAction(gameState, actions, strategy, attackedMonsters = new Set()) {
  const { attack, nextPhase } = actions;

  // 先攻1ターン目は攻撃スキップ
  if (gameState.isFirstTurn && gameState.currentPlayer === 1) {
    nextPhase();
    return { action: 'end', attackedMonsters };
  }

  // 攻撃可能なモンスターを取得（既に攻撃したものを除く）
  const allAttackable = getAttackableMonsters(gameState);
  const remainingAttackers = allAttackable.filter(idx => !attackedMonsters.has(idx));

  // 全員攻撃済みなら終了
  if (remainingAttackers.length === 0) {
    nextPhase();
    return { action: 'end', attackedMonsters };
  }

  // 攻撃順序を決定
  const attackOrder = strategy.chooseAttackOrder(remainingAttackers, gameState);
  if (attackOrder.length === 0) {
    nextPhase();
    return { action: 'end', attackedMonsters };
  }

  // 最初のモンスターで攻撃
  const attackerIndex = attackOrder[0];
  const attacker = gameState.myField[attackerIndex];

  // canAttackフラグと状態異常の両方をチェック
  if (attacker && attacker.canAttack && statusEffectEngine.canAttack(attacker)) {
    const validTargets = getValidAttackTargets(gameState);
    const target = strategy.chooseAttackTarget(validTargets, attacker, gameState);

    attack(attackerIndex, target);
    attackedMonsters.add(attackerIndex);

    return { action: 'attack', attackedMonsters };
  }

  // 攻撃できない場合（状態異常含む）は攻撃済みとしてマーク
  if (attacker) {
    attackedMonsters.add(attackerIndex);
    // まだ他に攻撃可能なモンスターがいる可能性があるので継続
    if (attackOrder.length > 1) {
      return { action: 'skip', attackedMonsters };
    }
  }

  // 攻撃できるモンスターがいない場合は終了
  nextPhase();
  return { action: 'end', attackedMonsters };
}

// ============================================================
// 特殊ケース処理
// ============================================================

/**
 * 手札選択（効果による）のAI処理
 */
export function handleAIHandSelection(pendingHandSelection, gameState, strategy) {
  const { callback, filter, message } = pendingHandSelection;
  const validCards = gameState.myHand.filter(filter || (() => true));

  if (validCards.length === 0) {
    console.warn('AI: 選択可能な手札がありません');
    // 選択できない場合はnullでコールバック（キャンセル扱い）
    callback(null);
    return false;
  }

  const selectedCard = strategy.chooseFromHand(validCards, message, gameState);
  if (selectedCard) {
    callback(selectedCard);
    return true;
  }

  // ランダムで選択
  callback(validCards[0]);
  return true;
}

/**
 * モンスターターゲット選択のAI処理
 */
export function handleAIMonsterTarget(pendingMonsterTarget, gameState, strategy) {
  const { callback, targetPlayer, message } = pendingMonsterTarget;

  const targetField = targetPlayer === 'opponent'
    ? gameState.opponentField
    : gameState.myField;

  const validIndices = targetField
    .map((m, i) => m ? i : -1)
    .filter(i => i >= 0);

  if (validIndices.length === 0) {
    console.warn('AI: 選択可能なモンスターがいません');
    callback(null);
    return false;
  }

  const selectedIndex = strategy.chooseMonsterTarget(validIndices, message, gameState);
  if (selectedIndex !== null && selectedIndex !== undefined) {
    callback(selectedIndex);
    return true;
  }

  // ランダムで選択
  callback(validIndices[0]);
  return true;
}

/**
 * 墓地選択のAI処理
 */
export function handleAIGraveyardSelection(pendingGraveyardSelection, gameState, strategy) {
  const { callback, filter, message } = pendingGraveyardSelection;
  const validCards = gameState.myGraveyard.filter(filter || (() => true));

  if (validCards.length === 0) {
    console.warn('AI: 選択可能な墓地カードがありません');
    callback(null);
    return false;
  }

  const selectedCard = strategy.chooseFromGraveyard(validCards, message, gameState);
  if (selectedCard) {
    callback(selectedCard);
    return true;
  }

  // ランダムで選択
  callback(validCards[0]);
  return true;
}

/**
 * デッキ確認のAI処理
 */
export function handleAIDeckReview(pendingDeckReview, gameState, strategy) {
  const { cards, onConfirm, onSelect, selectMode } = pendingDeckReview;

  const result = strategy.chooseFromDeckReview(cards, { selectMode }, gameState);

  if (selectMode && onSelect && result.selectedCards) {
    // onSelect(selectedCards, remainingCards) の形式で呼び出し
    onSelect(result.selectedCards, result.remainingCards);
    return true;
  }

  if (onConfirm) {
    onConfirm(result.reorderedCards || cards);
    return true;
  }

  return false;
}

/**
 * 刹那詠唱チェーン確認のAI処理
 */
export function handleAIChainConfirmation(
  chainConfirmation,
  availableSetsunaCards,
  gameState,
  strategy,
  actions
) {
  const { skipChainConfirmation, activateSetsunaInChain } = actions;
  const { context } = chainConfirmation;

  const cardToActivate = strategy.chooseSetsuna(
    availableSetsunaCards,
    context || {},
    gameState
  );

  if (cardToActivate) {
    activateSetsunaInChain(cardToActivate);
    return true;
  }

  skipChainConfirmation();
  return false;
}

// ============================================================
// エクスポート
// ============================================================

export { getStrategy };
