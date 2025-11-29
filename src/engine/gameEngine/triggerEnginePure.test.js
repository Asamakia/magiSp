/**
 * triggerEnginePure テスト
 *
 * 純粋関数版トリガーエンジンの動作確認
 */

import {
  registerCardTriggersPure,
  unregisterCardTriggersPure,
  clearAllTriggersPure,
  fireTriggerPure,
  resetTurnFlagsPure,
  getCardTriggersPure,
  getTriggerStatsPure,
} from './triggerEnginePure';
import { createInitialState } from './GameState';
import { TRIGGER_TYPES } from '../triggerTypes';

// テスト用デッキ
function createTestDeck() {
  const cards = [];
  for (let i = 0; i < 40; i++) {
    cards.push({
      id: `TEST_${i}`,
      uniqueId: `TEST_${i}_${Date.now()}_${Math.random()}`,
      name: `テストモンスター${i}`,
      type: 'monster',
      attribute: '炎',
      cost: (i % 3) + 1,
      attack: 1000,
      hp: 1000,
      category: '【テスト】',
      effect: '',
    });
  }
  return cards;
}

// 召喚時効果を持つテストカード
function createSummonEffectCard() {
  return {
    id: 'TEST_SUMMON',
    uniqueId: `TEST_SUMMON_${Date.now()}_${Math.random()}`,
    name: '召喚時テストカード',
    type: 'monster',
    attribute: '炎',
    cost: 2,
    attack: 1500,
    hp: 1200,
    category: '【テスト】',
    effect: '【召喚時】テスト効果を発動する',
  };
}

describe('triggerEnginePure', () => {
  let state;

  beforeEach(() => {
    const deck1 = createTestDeck();
    const deck2 = createTestDeck();
    state = createInitialState({ deck1, deck2, firstPlayer: 1 });
  });

  describe('registerCardTriggersPure', () => {
    test('召喚時効果カードのトリガーを登録できる', () => {
      const card = createSummonEffectCard();
      const newState = registerCardTriggersPure(state, card, 1, 0);

      // トリガーが登録されている
      const triggers = getCardTriggersPure(newState, card.uniqueId);
      expect(triggers.length).toBe(1);
      expect(triggers[0].triggerType).toBe(TRIGGER_TYPES.ON_SUMMON);
      expect(triggers[0].owner).toBe(1);
      expect(triggers[0].slotIndex).toBe(0);
    });

    test('効果なしカードはトリガー登録されない', () => {
      const card = {
        id: 'NO_EFFECT',
        uniqueId: `NO_EFFECT_${Date.now()}`,
        name: '効果なし',
        type: 'monster',
        effect: '',
      };
      const newState = registerCardTriggersPure(state, card, 1, 0);

      const triggers = getCardTriggersPure(newState, card.uniqueId);
      expect(triggers.length).toBe(0);
    });

    test('無効なカードは登録されない', () => {
      const newState = registerCardTriggersPure(state, null, 1, 0);
      expect(newState).toBe(state); // 同じ状態を返す
    });
  });

  describe('unregisterCardTriggersPure', () => {
    test('カードのトリガーを解除できる', () => {
      const card = createSummonEffectCard();
      let newState = registerCardTriggersPure(state, card, 1, 0);

      // 登録確認
      expect(getCardTriggersPure(newState, card.uniqueId).length).toBe(1);

      // 解除
      newState = unregisterCardTriggersPure(newState, card.uniqueId);

      // 解除確認
      expect(getCardTriggersPure(newState, card.uniqueId).length).toBe(0);
    });
  });

  describe('clearAllTriggersPure', () => {
    test('すべてのトリガーをクリアできる', () => {
      const card1 = createSummonEffectCard();
      card1.uniqueId = 'CARD1_' + Date.now();
      const card2 = createSummonEffectCard();
      card2.uniqueId = 'CARD2_' + Date.now();

      let newState = registerCardTriggersPure(state, card1, 1, 0);
      newState = registerCardTriggersPure(newState, card2, 2, 0);

      // 登録確認
      const statsBefore = getTriggerStatsPure(newState);
      expect(statsBefore[TRIGGER_TYPES.ON_SUMMON]).toBe(2);

      // クリア
      newState = clearAllTriggersPure(newState);

      // クリア確認
      const statsAfter = getTriggerStatsPure(newState);
      expect(statsAfter[TRIGGER_TYPES.ON_SUMMON]).toBeUndefined();
    });
  });

  describe('fireTriggerPure', () => {
    test('召喚時トリガーを発火できる', () => {
      const card = createSummonEffectCard();
      let newState = registerCardTriggersPure(state, card, 1, 0);

      // 登録確認
      const stats = getTriggerStatsPure(newState);
      expect(stats[TRIGGER_TYPES.ON_SUMMON]).toBe(1);

      // フィールドにカードを配置（同じuniqueIdを持つカード）
      const fieldCard = { ...card };
      newState = {
        ...newState,
        p1: {
          ...newState.p1,
          field: [fieldCard, null, null, null, null],
        },
      };

      // トリガー発火（cardのuniqueIdと一致するトリガーのみ発火）
      const context = { card: card };
      const logCountBefore = newState.logs.length;
      newState = fireTriggerPure(newState, TRIGGER_TYPES.ON_SUMMON, context);

      // ログが追加されている
      expect(newState.logs.length).toBeGreaterThan(logCountBefore);
      const lastLog = newState.logs[newState.logs.length - 1];
      expect(lastLog.message).toContain('召喚時テストカード');
    });
  });

  describe('resetTurnFlagsPure', () => {
    test('使用済みフラグをリセットできる', () => {
      const card = createSummonEffectCard();
      let newState = registerCardTriggersPure(state, card, 1, 0);

      // 手動でusedThisTurnをtrueに
      newState.triggers[TRIGGER_TYPES.ON_SUMMON][0].usedThisTurn = true;

      // リセット
      newState = resetTurnFlagsPure(newState);

      // リセット確認
      expect(newState.triggers[TRIGGER_TYPES.ON_SUMMON][0].usedThisTurn).toBe(false);
    });
  });

  describe('getTriggerStatsPure', () => {
    test('トリガー統計を取得できる', () => {
      const card1 = createSummonEffectCard();
      card1.uniqueId = 'CARD1_' + Date.now();
      const card2 = {
        ...createSummonEffectCard(),
        uniqueId: 'CARD2_' + Date.now(),
        effect: '【破壊時】テスト効果',
      };

      let newState = registerCardTriggersPure(state, card1, 1, 0);
      newState = registerCardTriggersPure(newState, card2, 2, 0);

      const stats = getTriggerStatsPure(newState);
      expect(stats[TRIGGER_TYPES.ON_SUMMON]).toBe(1);
      expect(stats[TRIGGER_TYPES.ON_DESTROY_SELF]).toBe(1);
    });
  });

  describe('イミュータビリティ', () => {
    test('元の状態が変更されない', () => {
      const card = createSummonEffectCard();
      const originalState = { ...state };
      const newState = registerCardTriggersPure(state, card, 1, 0);

      // 元の状態は変更されていない
      expect(state.triggers).toEqual(originalState.triggers);
      // 新しい状態は異なる
      expect(newState.triggers).not.toEqual(state.triggers);
    });
  });
});
