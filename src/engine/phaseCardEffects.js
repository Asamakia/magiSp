/**
 * フェイズカードの段階効果定義
 *
 * フェイズカードは設置後、同属性カードを重ねることで段階的に効果が強化されます。
 * - stage 0: 初期効果（設置直後）
 * - stage 1: 1枚重ね効果
 * - stage 2: 2枚重ね効果
 * - stage 3: 3枚重ね効果（最終、発動後墓地へ）
 *
 * 効果は上書き方式：新しい段階の効果が発動すると、前の段階の効果は無効になります。
 */

import {
  conditionalDamage,
  drawCards,
  healLife,
  modifyAttack,
  modifyHP,
  destroyMonster,
  searchCard,
} from './effectHelpers';

/**
 * フェイズカードの段階効果定義
 * カードID => { stage0, stage1, stage2, stage3, effectType }
 *
 * effectType:
 *   - 'continuous': 常時効果（場にある間有効）
 *   - 'trigger': トリガー効果（特定タイミングで発動）
 *   - 'instant': 即時効果（段階到達時に1度だけ発動）
 */
export const phaseCardStageEffects = {
  /**
   * C0000108: 虚蝕の呪詛（闇属性）
   * 初期効果: 【自分エンドフェイズ時】相手プレイヤーに300ダメージを与える。
   */
  C0000108: {
    name: '虚蝕の呪詛',
    attribute: '闇',
    effectType: 'trigger',
    triggerType: 'ON_END_PHASE_SELF',
    stage0: {
      description: 'エンドフェイズ時: 相手に300ダメージ',
      effect: (context) => {
        conditionalDamage(context, 300, 'opponent');
        context.addLog('虚蝕の呪詛: 相手に300ダメージ！', 'damage');
      },
    },
    stage1: {
      description: 'エンドフェイズ時: 相手に500ダメージ',
      effect: (context) => {
        conditionalDamage(context, 500, 'opponent');
        context.addLog('虚蝕の呪詛【第1段階】: 相手に500ダメージ！', 'damage');
      },
    },
    stage2: {
      description: 'エンドフェイズ時: 相手に800ダメージ',
      effect: (context) => {
        conditionalDamage(context, 800, 'opponent');
        context.addLog('虚蝕の呪詛【第2段階】: 相手に800ダメージ！', 'damage');
      },
    },
    stage3: {
      description: '最終段階: 相手に1500ダメージ',
      effect: (context) => {
        conditionalDamage(context, 1500, 'opponent');
        context.addLog('虚蝕の呪詛【最終段階】: 相手に1500ダメージ！', 'damage');
      },
    },
  },

  /**
   * C0000185: 岩狸の山里（炎属性）
   * 初期効果: 【常時】場にいる《岩狸》モンスターの攻撃力を300アップ。
   */
  C0000185: {
    name: '岩狸の山里',
    attribute: '炎',
    effectType: 'continuous',
    stage0: {
      description: '常時: 岩狸モンスターの攻撃力+300',
      attackBonus: 300,
      targetCondition: (monster) => monster.name && monster.name.includes('岩狸'),
    },
    stage1: {
      description: '常時: 岩狸モンスターの攻撃力+500',
      attackBonus: 500,
      targetCondition: (monster) => monster.name && monster.name.includes('岩狸'),
    },
    stage2: {
      description: '常時: 岩狸モンスターの攻撃力+800、HP+500',
      attackBonus: 800,
      hpBonus: 500,
      targetCondition: (monster) => monster.name && monster.name.includes('岩狸'),
    },
    stage3: {
      description: '最終段階: 炎属性全体の攻撃力+1000、1枚ドロー',
      attackBonus: 1000,
      targetCondition: (monster) => monster.attribute === '炎',
      instantEffect: (context) => {
        drawCards(context, 1);
        context.addLog('岩狸の山里【最終段階】: 1枚ドロー！', 'info');
      },
    },
  },

  /**
   * C0000230: 永遠の灯の祈り（光属性）
   * 初期効果: 【発動時】場にいる光属性モンスターに【魔障壁】を付与。
   */
  C0000230: {
    name: '永遠の灯の祈り',
    attribute: '光',
    effectType: 'instant',
    stage0: {
      description: '発動時: 光属性モンスターに魔障壁を付与',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        setField(prev => prev.map(monster => {
          if (monster && monster.attribute === '光') {
            addLog(`${monster.name}に魔障壁を付与！`, 'info');
            return { ...monster, hasMagicBarrier: true };
          }
          return monster;
        }));
      },
    },
    stage1: {
      description: '発動時: 光属性モンスターの攻撃力+400',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        setField(prev => prev.map(monster => {
          if (monster && monster.attribute === '光') {
            addLog(`${monster.name}の攻撃力+400！`, 'info');
            return { ...monster, currentAttack: (monster.currentAttack || monster.attack) + 400 };
          }
          return monster;
        }));
      },
    },
    stage2: {
      description: '発動時: ライフ1000回復',
      effect: (context) => {
        healLife(context, 1000, true);
        context.addLog('永遠の灯の祈り【第2段階】: ライフ1000回復！', 'heal');
      },
    },
    stage3: {
      description: '最終段階: 光属性モンスター全体の攻撃力+1000、HP全回復',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        setField(prev => prev.map(monster => {
          if (monster && monster.attribute === '光') {
            addLog(`${monster.name}の攻撃力+1000、HP全回復！`, 'info');
            return {
              ...monster,
              currentAttack: (monster.currentAttack || monster.attack) + 1000,
              currentHp: monster.hp,
            };
          }
          return monster;
        }));
      },
    },
  },

  /**
   * C0000266: エクラシアの時空炉（未来属性）
   * 初期効果: 【発動時】自分のデッキ上1枚を見て、それが「未来属性」カードなら手札に、違えば墓地に送る。
   */
  C0000266: {
    name: 'エクラシアの時空炉',
    attribute: '未来',
    effectType: 'instant',
    stage0: {
      description: '発動時: デッキトップ確認、未来属性なら手札に',
      effect: (context) => {
        const { currentPlayer, p1Deck, p2Deck, setP1Deck, setP2Deck,
                setP1Hand, setP2Hand, setP1Graveyard, setP2Graveyard, addLog } = context;
        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        if (deck.length === 0) {
          addLog('デッキにカードがありません', 'info');
          return;
        }

        const topCard = deck[0];
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        setDeck(prev => prev.slice(1));

        if (topCard.attribute === '未来') {
          const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
          setHand(prev => [...prev, topCard]);
          addLog(`エクラシアの時空炉: ${topCard.name}を手札に加えた！`, 'info');
        } else {
          const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
          setGraveyard(prev => [...prev, topCard]);
          addLog(`エクラシアの時空炉: ${topCard.name}を墓地に送った`, 'info');
        }
      },
    },
    stage1: {
      description: '発動時: デッキトップ2枚確認、未来属性を手札に',
      effect: (context) => {
        const { currentPlayer, p1Deck, p2Deck, setP1Deck, setP2Deck,
                setP1Hand, setP2Hand, setP1Graveyard, setP2Graveyard, addLog } = context;
        const deck = currentPlayer === 1 ? p1Deck : p2Deck;
        const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
        const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;
        const setGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;

        const count = Math.min(2, deck.length);
        const topCards = deck.slice(0, count);
        setDeck(prev => prev.slice(count));

        topCards.forEach(card => {
          if (card.attribute === '未来') {
            setHand(prev => [...prev, card]);
            addLog(`${card.name}を手札に加えた！`, 'info');
          } else {
            setGraveyard(prev => [...prev, card]);
            addLog(`${card.name}を墓地に送った`, 'info');
          }
        });
      },
    },
    stage2: {
      description: '発動時: SP1回復',
      effect: (context) => {
        const { currentPlayer, setP1ActiveSP, setP2ActiveSP, p1RestedSP, p2RestedSP,
                setP1RestedSP, setP2RestedSP, addLog } = context;
        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        if (restedSP >= 1) {
          const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
          const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
          setActiveSP(prev => prev + 1);
          setRestedSP(prev => prev - 1);
          addLog('エクラシアの時空炉【第2段階】: SP1回復！', 'heal');
        }
      },
    },
    stage3: {
      description: '最終段階: 未来属性モンスターをサーチ',
      effect: (context) => {
        const found = searchCard(context, (card) => card.attribute === '未来' && card.type === 'monster');
        if (found) {
          context.addLog(`エクラシアの時空炉【最終段階】: ${found.name}を手札に加えた！`, 'info');
        }
      },
    },
  },

  /**
   * C0000339: アクアレギナの動力-エテルノス・コア（水属性）
   * 初期効果:【常時】 『アクアレギナ』または『ヴェルゼファール』モンスターの攻撃力を400アップ。
   */
  C0000339: {
    name: 'アクアレギナの動力-エテルノス・コア',
    attribute: '水',
    effectType: 'continuous',
    stage0: {
      description: '常時: アクアレギナ/ヴェルゼファールの攻撃力+400',
      attackBonus: 400,
      targetCondition: (monster) => {
        return monster.name && (monster.name.includes('アクアレギナ') || monster.name.includes('ヴェルゼファール'));
      },
    },
    stage1: {
      description: '常時: 水属性モンスターの攻撃力+300',
      attackBonus: 300,
      targetCondition: (monster) => monster.attribute === '水',
    },
    stage2: {
      description: '常時: 水属性モンスターの攻撃力+500、HP+300',
      attackBonus: 500,
      hpBonus: 300,
      targetCondition: (monster) => monster.attribute === '水',
    },
    stage3: {
      description: '最終段階: 相手モンスター全体に1000ダメージ',
      instantEffect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        setOpponentField(prev => prev.map(monster => {
          if (monster) {
            const newHp = (monster.currentHp || monster.hp) - 1000;
            if (newHp <= 0) {
              addLog(`${monster.name}が破壊された！`, 'damage');
              return null;
            }
            addLog(`${monster.name}に1000ダメージ！`, 'damage');
            return { ...monster, currentHp: newHp };
          }
          return monster;
        }));
      },
    },
  },

  /**
   * C0000352: アヴィクルスの試練（光属性）
   * 初期効果: 【常時】《ヴォランティス》モンスターの攻撃力を400アップ。
   */
  C0000352: {
    name: 'アヴィクルスの試練',
    attribute: '光',
    effectType: 'continuous',
    stage0: {
      description: '常時: ヴォランティスモンスターの攻撃力+400',
      attackBonus: 400,
      targetCondition: (monster) => monster.name && monster.name.includes('ヴォランティス'),
    },
    stage1: {
      description: '常時: ヴォランティスモンスターの攻撃力+600',
      attackBonus: 600,
      targetCondition: (monster) => monster.name && monster.name.includes('ヴォランティス'),
    },
    stage2: {
      description: '常時: ヴォランティスモンスターの攻撃力+800、HP+500',
      attackBonus: 800,
      hpBonus: 500,
      targetCondition: (monster) => monster.name && monster.name.includes('ヴォランティス'),
    },
    stage3: {
      description: '最終段階: ヴォランティスモンスター全体+1200、2枚ドロー',
      attackBonus: 1200,
      targetCondition: (monster) => monster.name && monster.name.includes('ヴォランティス'),
      instantEffect: (context) => {
        drawCards(context, 2);
        context.addLog('アヴィクルスの試練【最終段階】: 2枚ドロー！', 'info');
      },
    },
  },

  /**
   * C0000383: 虹羽密林の共鳴弦（なし属性）
   * 初期効果: 【自分のコスト3以下の水、光、炎属性モンスターの召喚時】、そのモンスターの攻撃力をターン終了時まで300アップ。
   */
  C0000383: {
    name: '虹羽密林の共鳴弦',
    attribute: 'なし',
    effectType: 'trigger',
    triggerType: 'ON_COST_SUMMON_SELF',
    stage0: {
      description: 'コスト3以下の水/光/炎モンスター召喚時: 攻撃力+300',
      condition: (card) => card && card.cost <= 3 && ['水', '光', '炎'].includes(card.attribute),
      effect: (context, slotIndex) => {
        const { currentPlayer, setP1Field, setP2Field, addLog } = context;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;
        setField(prev => prev.map((m, idx) => {
          if (idx === slotIndex && m) {
            return { ...m, currentAttack: (m.currentAttack || m.attack) + 300 };
          }
          return m;
        }));
        addLog('虹羽密林の共鳴弦: 攻撃力+300！', 'info');
      },
    },
    stage1: {
      description: 'ドローフェイズ: 虹羽密林モンスターがいれば+1ドロー',
      triggerType: 'ON_DRAW_PHASE_SELF',
      condition: (context) => {
        const { currentPlayer, p1Field, p2Field } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;
        return field.some(m => m && m.name && m.name.includes('虹羽密林'));
      },
      effect: (context) => {
        drawCards(context, 1);
        context.addLog('虹羽密林の共鳴弦【第1段階】: 追加ドロー！', 'info');
      },
    },
    stage2: {
      description: 'コスト3以下モンスター召喚時: SP1回復（1ターン1度）',
      effect: (context) => {
        const { currentPlayer, p1RestedSP, p2RestedSP, setP1ActiveSP, setP2ActiveSP,
                setP1RestedSP, setP2RestedSP, addLog } = context;
        const restedSP = currentPlayer === 1 ? p1RestedSP : p2RestedSP;
        if (restedSP >= 1) {
          const setActiveSP = currentPlayer === 1 ? setP1ActiveSP : setP2ActiveSP;
          const setRestedSP = currentPlayer === 1 ? setP1RestedSP : setP2RestedSP;
          setActiveSP(prev => prev + 1);
          setRestedSP(prev => prev - 1);
          addLog('虹羽密林の共鳴弦【第2段階】: SP1回復！', 'heal');
        }
      },
    },
    stage3: {
      description: '最終段階: 水/光/炎モンスター全体の攻撃力+500',
      instantEffect: (context) => {
        const { currentPlayer, setP1Field, setP2Field, addLog } = context;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        setField(prev => prev.map(monster => {
          if (monster && ['水', '光', '炎'].includes(monster.attribute)) {
            addLog(`${monster.name}の攻撃力+500！`, 'info');
            return { ...monster, currentAttack: (monster.currentAttack || monster.attack) + 500 };
          }
          return monster;
        }));
      },
    },
  },

  /**
   * C0000387: 呪核の杖・ザルヴェリオ（闇属性）
   * 初期効果: 【発動時】相手プレイヤーに200ダメージ。
   */
  C0000387: {
    name: '呪核の杖・ザルヴェリオ',
    attribute: '闘',
    effectType: 'instant',
    stage0: {
      description: '発動時: 相手に200ダメージ',
      effect: (context) => {
        conditionalDamage(context, 200, 'opponent');
        context.addLog('呪核の杖・ザルヴェリオ: 相手に200ダメージ！', 'damage');
      },
    },
    stage1: {
      description: '発動時: 相手に500ダメージ',
      effect: (context) => {
        conditionalDamage(context, 500, 'opponent');
        context.addLog('呪核の杖・ザルヴェリオ【第1段階】: 相手に500ダメージ！', 'damage');
      },
    },
    stage2: {
      description: '発動時: 相手モンスター1体に800ダメージ',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        const targetIndex = opponentField.findIndex(m => m !== null);
        if (targetIndex !== -1) {
          setOpponentField(prev => {
            const newField = [...prev];
            const target = newField[targetIndex];
            const newHp = (target.currentHp || target.hp) - 800;
            if (newHp <= 0) {
              addLog(`${target.name}が破壊された！`, 'damage');
              newField[targetIndex] = null;
            } else {
              newField[targetIndex] = { ...target, currentHp: newHp };
              addLog(`${target.name}に800ダメージ！`, 'damage');
            }
            return newField;
          });
        }
      },
    },
    stage3: {
      description: '最終段階: 相手全体に1200ダメージ',
      effect: (context) => {
        const { currentPlayer, setP1Field, setP2Field, addLog } = context;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;

        conditionalDamage(context, 1200, 'opponent');

        setOpponentField(prev => prev.map(monster => {
          if (monster) {
            const newHp = (monster.currentHp || monster.hp) - 1200;
            if (newHp <= 0) {
              addLog(`${monster.name}が破壊された！`, 'damage');
              return null;
            }
            return { ...monster, currentHp: newHp };
          }
          return monster;
        }));

        addLog('呪核の杖・ザルヴェリオ【最終段階】: 相手全体に1200ダメージ！', 'damage');
      },
    },
  },

  /**
   * C0000395: 血呪の棺・ヴェルディクタス（闇属性）
   * 初期効果:【発動時】トークンを召喚
   */
  C0000395: {
    name: '血呪の棺・ヴェルディクタス',
    attribute: '闇',
    effectType: 'instant',
    stage0: {
      description: '発動時: ヴァルディスの幻影トークンを召喚',
      effect: (context) => {
        const { currentPlayer, p1Field, p2Field, setP1Field, setP2Field, addLog } = context;
        const field = currentPlayer === 1 ? p1Field : p2Field;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        const emptySlot = field.findIndex(slot => slot === null);
        if (emptySlot === -1) {
          addLog('場が満杯のためトークンを召喚できません', 'info');
          return;
        }

        const token = {
          id: 'TOKEN_VALDIS',
          uniqueId: `TOKEN_VALDIS_${Date.now()}`,
          name: 'ヴァルディスの幻影',
          attribute: '光',
          cost: 0,
          type: 'monster',
          attack: 1000,
          hp: 1000,
          currentAttack: 1000,
          currentHp: 1000,
          isToken: true,
          canAttack: false,
        };

        setField(prev => {
          const newField = [...prev];
          newField[emptySlot] = token;
          return newField;
        });

        addLog('血呪の棺・ヴェルディクタス: ヴァルディスの幻影を召喚！', 'info');
      },
    },
    stage1: {
      description: '発動時: 闇属性モンスターの攻撃力+500',
      effect: (context) => {
        const { currentPlayer, setP1Field, setP2Field, addLog } = context;
        const setField = currentPlayer === 1 ? setP1Field : setP2Field;

        setField(prev => prev.map(monster => {
          if (monster && monster.attribute === '闇') {
            addLog(`${monster.name}の攻撃力+500！`, 'info');
            return { ...monster, currentAttack: (monster.currentAttack || monster.attack) + 500 };
          }
          return monster;
        }));
      },
    },
    stage2: {
      description: '発動時: 相手モンスター1体を破壊',
      effect: (context) => {
        destroyMonster(context, 0, true);
        context.addLog('血呪の棺・ヴェルディクタス【第2段階】: 相手モンスターを破壊！', 'damage');
      },
    },
    stage3: {
      description: '最終段階: 相手に2000ダメージ',
      effect: (context) => {
        conditionalDamage(context, 2000, 'opponent');
        context.addLog('血呪の棺・ヴェルディクタス【最終段階】: 相手に2000ダメージ！', 'damage');
      },
    },
  },
};

/**
 * 汎用フェイズカード段階効果（カードIDが未定義の場合のフォールバック）
 * 属性に応じた基本的な段階効果を提供
 */
export const genericPhaseCardEffects = {
  '炎': {
    stage1: { description: '炎属性モンスターの攻撃力+300', attackBonus: 300 },
    stage2: { description: '相手モンスター1体に500ダメージ', damage: 500, target: 'opponent_monster' },
    stage3: { description: '相手全体に800ダメージ', damage: 800, target: 'opponent_all' },
  },
  '水': {
    stage1: { description: '水属性モンスターのHP+500', hpBonus: 500 },
    stage2: { description: 'ライフ500回復', heal: 500 },
    stage3: { description: '1枚ドロー、相手モンスター全体に500ダメージ', draw: 1, damage: 500, target: 'opponent_all' },
  },
  '光': {
    stage1: { description: '光属性モンスターの攻撃力+300', attackBonus: 300 },
    stage2: { description: 'ライフ800回復', heal: 800 },
    stage3: { description: '光属性全体+500、ライフ1000回復', attackBonus: 500, heal: 1000 },
  },
  '闇': {
    stage1: { description: '相手に300ダメージ', damage: 300, target: 'opponent' },
    stage2: { description: '相手に600ダメージ', damage: 600, target: 'opponent' },
    stage3: { description: '相手に1200ダメージ、1枚ドロー', damage: 1200, target: 'opponent', draw: 1 },
  },
  '原始': {
    stage1: { description: '原始属性モンスターの攻撃力+300', attackBonus: 300 },
    stage2: { description: '原始属性モンスターのHP+500', hpBonus: 500 },
    stage3: { description: '原始属性全体+800、相手モンスター1体破壊', attackBonus: 800, destroyOpponent: 1 },
  },
  '未来': {
    stage1: { description: 'SP1回復', spRecover: 1 },
    stage2: { description: '1枚ドロー', draw: 1 },
    stage3: { description: '未来属性モンスターをサーチ、SP2回復', search: '未来', spRecover: 2 },
  },
  'なし': {
    stage1: { description: 'モンスター全体の攻撃力+200', attackBonus: 200, allMonsters: true },
    stage2: { description: '1枚ドロー', draw: 1 },
    stage3: { description: 'モンスター全体+500、ライフ500回復', attackBonus: 500, allMonsters: true, heal: 500 },
  },
};

/**
 * フェイズカードの段階効果を取得
 * @param {string} cardId - カードID
 * @param {number} stage - 段階（0-3）
 * @returns {Object|null} 段階効果定義
 */
export const getPhaseCardStageEffect = (cardId, stage) => {
  const cardEffects = phaseCardStageEffects[cardId];
  if (!cardEffects) {
    return null;
  }

  const stageKey = `stage${stage}`;
  return cardEffects[stageKey] || null;
};

/**
 * フェイズカードの全段階情報を取得
 * @param {string} cardId - カードID
 * @returns {Object|null} フェイズカード情報
 */
export const getPhaseCardInfo = (cardId) => {
  return phaseCardStageEffects[cardId] || null;
};

/**
 * 汎用段階効果を取得
 * @param {string} attribute - 属性
 * @param {number} stage - 段階（1-3）
 * @returns {Object|null} 汎用段階効果
 */
export const getGenericStageEffect = (attribute, stage) => {
  const attrEffects = genericPhaseCardEffects[attribute];
  if (!attrEffects) {
    return genericPhaseCardEffects['なし'][`stage${stage}`];
  }
  return attrEffects[`stage${stage}`] || null;
};

/**
 * フェイズカードがカード固有効果を持っているかチェック
 * @param {string} cardId - カードID
 * @returns {boolean}
 */
export const hasPhaseCardEffect = (cardId) => {
  return cardId && phaseCardStageEffects[cardId] !== undefined;
};

/**
 * 実装済みフェイズカード数を取得
 * @returns {number}
 */
export const getPhaseCardEffectCount = () => {
  return Object.keys(phaseCardStageEffects).length;
};
