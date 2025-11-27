// ========================================
// 効果実行エンジン
// ========================================

import { hasCategory } from '../utils/helpers';

// 効果タイプの定義
export const EFFECT_TYPES = {
  DAMAGE: 'damage',
  HEAL: 'heal',
  BUFF_ATK: 'buff_atk',
  BUFF_HP: 'buff_hp',
  DEBUFF_ATK: 'debuff_atk',
  DEBUFF_HP: 'debuff_hp',
  SEARCH: 'search',
  REVIVE: 'revive',
  DESTROY: 'destroy',
  DRAW: 'draw',
  SP_GAIN: 'sp_gain',
  CONTROL: 'control',
  DOUBLE_ATTACK: 'double_attack',
};

/**
 * 検索語を正規化（新表記形式［］《》に対応）
 * @param {string} searchTerm - 検索語
 * @returns {Object} { term: 正規化された検索語, type: 'name'|'category'|'text' }
 */
const normalizeSearchTerm = (searchTerm) => {
  // 《名称》形式の場合（名称指定 - カード名の部分一致）
  const nameMatch = searchTerm.match(/《(.+?)》/);
  if (nameMatch) {
    return {
      term: nameMatch[1],
      type: 'name',
    };
  }

  // ［カテゴリ］形式の場合（カテゴリ指定 - カードデータ内では【】で表記）
  const categoryMatch = searchTerm.match(/［(.+?)］/);
  if (categoryMatch) {
    return {
      term: `【${categoryMatch[1]}】`,
      type: 'category',
    };
  }

  // その他のテキスト（「と名の付く」「モンスター」などの余分なテキストを除去）
  const cleanTerm = searchTerm
    .replace(/と名の付く.*/, '')
    .replace(/モンスター.*/, '')
    .replace(/カード.*/, '')
    .trim();

  return {
    term: cleanTerm,
    type: 'text',
  };
};

/**
 * 効果テキストから効果を抽出
 * @param {string} effectText - 効果テキスト
 * @returns {Array} 効果オブジェクトの配列
 */
export const parseEffect = (effectText) => {
  const effects = [];

  // ダメージ効果（相手プレイヤー）
  const damageMatch = effectText.match(/相手(?:プレイヤー)?に(\d+)ダメージ/);
  if (damageMatch) {
    effects.push({
      type: EFFECT_TYPES.DAMAGE,
      value: parseInt(damageMatch[1]),
      target: 'opponent',
    });
  }

  // ダメージ効果（相手モンスター）
  const monsterDamageMatch = effectText.match(/相手(?:の)?モンスター.{0,10}(\d+)ダメージ/);
  if (monsterDamageMatch) {
    effects.push({
      type: EFFECT_TYPES.DAMAGE,
      value: parseInt(monsterDamageMatch[1]),
      target: 'opponent_monster',
    });
  }

  // 回復効果（ライフ）
  const healMatch = effectText.match(/(?:ライフを?|HP.*を?)(\d+)回復/);
  if (healMatch) {
    effects.push({
      type: EFFECT_TYPES.HEAL,
      value: parseInt(healMatch[1]),
      target: 'self',
    });
  }

  // 攻撃力バフ（様々なパターン）
  const buffAtkMatch = effectText.match(/攻撃力(?:を)?(\d+)(?:アップ|上げ|上昇)|攻撃力\+(\d+)/);
  if (buffAtkMatch) {
    effects.push({
      type: EFFECT_TYPES.BUFF_ATK,
      value: parseInt(buffAtkMatch[1] || buffAtkMatch[2]),
      target: 'self',
      duration: 'permanent', // デフォルトは永続
    });
  }

  // 攻撃力デバフ（様々なパターン）
  const debuffAtkMatch = effectText.match(/攻撃力(?:を)?(\d+)(?:ダウン|下げ|減少)|攻撃力-(\d+)/);
  if (debuffAtkMatch) {
    effects.push({
      type: EFFECT_TYPES.DEBUFF_ATK,
      value: parseInt(debuffAtkMatch[1] || debuffAtkMatch[2]),
      target: 'opponent_monster',
      duration: 'turn', // デフォルトはターン終了まで
    });
  }

  // HP バフ
  const buffHpMatch = effectText.match(/HP(?:を)?(\d+)(?:アップ|上げ|上昇)|HP\+(\d+)/);
  if (buffHpMatch) {
    effects.push({
      type: EFFECT_TYPES.BUFF_HP,
      value: parseInt(buffHpMatch[1] || buffHpMatch[2]),
      target: 'self',
    });
  }

  // HP デバフ
  const debuffHpMatch = effectText.match(/HP(?:を)?(\d+)(?:ダウン|下げ|減少)|HP-(\d+)/);
  if (debuffHpMatch) {
    effects.push({
      type: EFFECT_TYPES.DEBUFF_HP,
      value: parseInt(debuffHpMatch[1] || debuffHpMatch[2]),
      target: 'opponent_monster',
    });
  }

  // サーチ効果
  const searchMatch = effectText.match(/デッキから(.+?)(?:を|1枚を)?手札に加える/);
  if (searchMatch) {
    effects.push({
      type: EFFECT_TYPES.SEARCH,
      searchTerm: searchMatch[1].trim(),
      target: 'deck',
    });
  }

  // 蘇生効果
  const reviveMatch = effectText.match(/墓地(?:の|から)(.+?)(?:を|1体を)?(?:場に|フィールドに)?戻す/);
  if (reviveMatch) {
    effects.push({
      type: EFFECT_TYPES.REVIVE,
      searchTerm: reviveMatch[1].trim(),
      weakened: effectText.includes('攻撃力半減') || effectText.includes('弱体化'),
    });
  }

  // ドロー効果
  const drawMatch = effectText.match(/(\d+)枚?ドロー/);
  if (drawMatch) {
    effects.push({
      type: EFFECT_TYPES.DRAW,
      value: parseInt(drawMatch[1]),
    });
  }

  // 破壊効果
  const destroyMatch = effectText.match(/(?:相手の?)?モンスター.{0,10}(?:を)?破壊/);
  if (destroyMatch) {
    effects.push({
      type: EFFECT_TYPES.DESTROY,
      target: 'opponent_monster',
    });
  }

  // 2回攻撃
  if (effectText.match(/2回攻撃|二回攻撃/)) {
    effects.push({
      type: EFFECT_TYPES.DOUBLE_ATTACK,
      value: true,
    });
  }

  return effects;
};

/**
 * 単一の効果を実行
 * @param {Object} effect - 効果オブジェクト
 * @param {Object} context - ゲームコンテキスト
 * @returns {boolean} 成功したかどうか
 */
export const executeEffect = (effect, context) => {
  const {
    type,
    value,
    target,
    searchTerm,
    weakened,
    // duration, // 将来の実装用に保持
  } = effect;

  const {
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
    p1Field,
    p2Field,
    // p1Hand, // コンテキストで渡されるが、現在未使用
    // p2Hand, // コンテキストで渡されるが、現在未使用
    p1Deck,
    p2Deck,
    p1Graveyard,
    p2Graveyard,
    addLog,
  } = context;

  switch (type) {
    case EFFECT_TYPES.DAMAGE:
      if (target === 'opponent') {
        // 相手プレイヤーへのダメージ
        if (currentPlayer === 1) {
          setP2Life(prev => Math.max(0, prev - value));
        } else {
          setP1Life(prev => Math.max(0, prev - value));
        }
        addLog(`相手に${value}ダメージ！`, 'damage');
      } else if (target === 'opponent_monster') {
        // 相手モンスターへのダメージ（簡易実装：ランダムな相手モンスター）
        const opponentField = currentPlayer === 1 ? p2Field : p1Field;
        const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
        const monsters = opponentField.filter(m => m !== null);

        if (monsters.length > 0) {
          const targetMonster = monsters[0]; // 最初のモンスターに
          setOpponentField(prev => prev.map(m => {
            if (m && m.uniqueId === targetMonster.uniqueId) {
              const newHp = Math.max(0, m.currentHp - value);
              addLog(`${m.name}に${value}ダメージ！（残りHP: ${newHp}）`, 'damage');
              return { ...m, currentHp: newHp };
            }
            return m;
          }));
        } else {
          addLog(`対象のモンスターがいません`, 'info');
        }
      }
      return true;

    case EFFECT_TYPES.HEAL:
      if (target === 'self') {
        if (currentPlayer === 1) {
          setP1Life(prev => prev + value);
        } else {
          setP2Life(prev => prev + value);
        }
        addLog(`ライフを${value}回復！`, 'heal');
      }
      return true;

    case EFFECT_TYPES.BUFF_ATK:
      // モンスターの攻撃力を上昇
      if (monsterIndex !== undefined && monsterIndex !== null) {
        const setCurrentField = currentPlayer === 1 ? setP1Field : setP2Field;
        setCurrentField(prev => prev.map((m, idx) => {
          if (idx === monsterIndex && m) {
            addLog(`${m.name}の攻撃力が${value}上昇！`, 'info');
            return { ...m, attack: m.attack + value };
          }
          return m;
        }));
        return true;
      } else {
        addLog(`攻撃力+${value}（対象未指定）`, 'info');
        return false;
      }

    case EFFECT_TYPES.BUFF_HP:
      // モンスターのHPを上昇
      if (monsterIndex !== undefined && monsterIndex !== null) {
        const setCurrentField = currentPlayer === 1 ? setP1Field : setP2Field;
        setCurrentField(prev => prev.map((m, idx) => {
          if (idx === monsterIndex && m) {
            addLog(`${m.name}のHPが${value}上昇！`, 'heal');
            return {
              ...m,
              hp: m.hp + value,
              currentHp: m.currentHp + value
            };
          }
          return m;
        }));
        return true;
      } else {
        addLog(`HP+${value}（対象未指定）`, 'info');
        return false;
      }

    case EFFECT_TYPES.DEBUFF_ATK:
      // 相手モンスターの攻撃力を減少
      const opponentField = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField = currentPlayer === 1 ? setP2Field : setP1Field;
      const monsters = opponentField.filter(m => m !== null);

      if (monsters.length > 0) {
        const targetMonster = monsters[0]; // 最初のモンスター
        setOpponentField(prev => prev.map(m => {
          if (m && m.uniqueId === targetMonster.uniqueId) {
            const newAtk = Math.max(0, m.attack - value);
            addLog(`${m.name}の攻撃力が${value}減少！（攻撃力: ${newAtk}）`, 'info');
            return { ...m, attack: newAtk };
          }
          return m;
        }));
        return true;
      } else {
        addLog(`対象のモンスターがいません`, 'info');
        return false;
      }

    case EFFECT_TYPES.DEBUFF_HP:
      // 相手モンスターのHPを減少
      const opponentField2 = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField2 = currentPlayer === 1 ? setP2Field : setP1Field;
      const monsters2 = opponentField2.filter(m => m !== null);

      if (monsters2.length > 0) {
        const targetMonster = monsters2[0];
        setOpponentField2(prev => prev.map(m => {
          if (m && m.uniqueId === targetMonster.uniqueId) {
            const newHp = Math.max(0, m.currentHp - value);
            addLog(`${m.name}のHPが${value}減少！（HP: ${newHp}）`, 'damage');
            return { ...m, currentHp: newHp };
          }
          return m;
        }));
        return true;
      } else {
        addLog(`対象のモンスターがいません`, 'info');
        return false;
      }

    case EFFECT_TYPES.SEARCH:
      // デッキからサーチ
      const currentDeck = currentPlayer === 1 ? p1Deck : p2Deck;
      const setCurrentDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
      const setCurrentHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

      // 検索語を正規化（新表記形式［］《》に対応）
      const normalizedSearch = normalizeSearchTerm(searchTerm);

      // サーチ条件に一致するカードを検索
      const foundCard = currentDeck.find(card => {
        if (normalizedSearch.type === 'name') {
          // 《名称》形式 - カード名の部分一致
          return card.name.includes(normalizedSearch.term);
        } else if (normalizedSearch.type === 'category') {
          // ［カテゴリ］形式 - カテゴリの一致（hasCategory使用）
          return hasCategory(card, normalizedSearch.term);
        } else {
          // その他 - 名前、カテゴリ、属性で検索
          return (
            card.name.includes(normalizedSearch.term) ||
            hasCategory(card, normalizedSearch.term) ||
            card.attribute === normalizedSearch.term
          );
        }
      });

      if (foundCard) {
        setCurrentDeck(prev => prev.filter(c => c.uniqueId !== foundCard.uniqueId));
        setCurrentHand(prev => [...prev, foundCard]);
        addLog(`デッキから「${foundCard.name}」を手札に加えた！`, 'info');
        return true;
      } else {
        addLog(`デッキに「${searchTerm}」が見つかりません`, 'info');
        return false;
      }

    case EFFECT_TYPES.REVIVE:
      // 墓地から蘇生
      const currentGraveyard = currentPlayer === 1 ? p1Graveyard : p2Graveyard;
      const setCurrentGraveyard = currentPlayer === 1 ? setP1Graveyard : setP2Graveyard;
      const currentField = currentPlayer === 1 ? p1Field : p2Field;
      const setCurrentField2 = currentPlayer === 1 ? setP1Field : setP2Field;

      // 検索語を正規化（新表記形式［］《》に対応）
      const normalizedRevive = normalizeSearchTerm(searchTerm);

      // 墓地から蘇生対象を検索
      const reviveCard = currentGraveyard.find(card => {
        if (card.type !== 'monster') return false;

        if (normalizedRevive.type === 'name') {
          // 《名称》形式 - カード名の部分一致
          return card.name.includes(normalizedRevive.term);
        } else if (normalizedRevive.type === 'category') {
          // ［カテゴリ］形式 - カテゴリの一致（hasCategory使用）
          return hasCategory(card, normalizedRevive.term);
        } else {
          // その他 - 名前、カテゴリ、属性で検索
          return (
            card.name.includes(normalizedRevive.term) ||
            hasCategory(card, normalizedRevive.term) ||
            card.attribute === normalizedRevive.term
          );
        }
      });

      if (!reviveCard) {
        addLog(`墓地に「${searchTerm}」が見つかりません`, 'info');
        return false;
      }

      // 空きスロットを探す
      const emptySlotIndex = currentField.findIndex(slot => slot === null);
      if (emptySlotIndex === -1) {
        addLog(`場が満杯で蘇生できません`, 'info');
        return false;
      }

      // 蘇生（弱体化オプション付き）
      setCurrentGraveyard(prev => prev.filter(c => c.uniqueId !== reviveCard.uniqueId));
      setCurrentField2(prev => {
        const newField = [...prev];
        const revivedMonster = {
          ...reviveCard,
          attack: weakened ? Math.floor(reviveCard.attack / 2) : reviveCard.attack,
          hp: weakened ? Math.floor(reviveCard.hp / 2) : reviveCard.hp,
          currentHp: weakened ? Math.floor(reviveCard.hp / 2) : reviveCard.hp,
          canAttack: false,
        };
        newField[emptySlotIndex] = revivedMonster;
        return newField;
      });
      addLog(`${reviveCard.name}を墓地から蘇生！${weakened ? '（弱体化）' : ''}`, 'heal');
      return true;

    case EFFECT_TYPES.DRAW:
      // カードをドロー
      const deck = currentPlayer === 1 ? p1Deck : p2Deck;
      const setDeck = currentPlayer === 1 ? setP1Deck : setP2Deck;
      const setHand = currentPlayer === 1 ? setP1Hand : setP2Hand;

      if (deck.length < value) {
        addLog(`デッキが足りません（${deck.length}枚）`, 'info');
        return false;
      }

      const drawnCards = deck.slice(0, value);
      setDeck(prev => prev.slice(value));
      setHand(prev => [...prev, ...drawnCards]);
      addLog(`${value}枚ドロー！`, 'info');
      return true;

    case EFFECT_TYPES.DESTROY:
      // モンスターを破壊
      const opponentField3 = currentPlayer === 1 ? p2Field : p1Field;
      const setOpponentField3 = currentPlayer === 1 ? setP2Field : setP1Field;
      const setOpponentGraveyard = currentPlayer === 1 ? setP2Graveyard : setP1Graveyard;
      const monsters3 = opponentField3.filter(m => m !== null);

      if (monsters3.length > 0) {
        const targetMonster = monsters3[0]; // 最初のモンスターを破壊
        setOpponentField3(prev => prev.map(m => {
          if (m && m.uniqueId === targetMonster.uniqueId) {
            return null;
          }
          return m;
        }));
        setOpponentGraveyard(prev => [...prev, targetMonster]);
        addLog(`${targetMonster.name}を破壊！`, 'damage');
        return true;
      } else {
        addLog(`破壊する対象がいません`, 'info');
        return false;
      }

    case EFFECT_TYPES.DOUBLE_ATTACK:
      // 2回攻撃フラグを設定
      if (monsterIndex !== undefined && monsterIndex !== null) {
        const setCurrentField3 = currentPlayer === 1 ? setP1Field : setP2Field;
        setCurrentField3(prev => prev.map((m, idx) => {
          if (idx === monsterIndex && m) {
            addLog(`${m.name}は2回攻撃可能！`, 'info');
            return { ...m, doubleAttack: true };
          }
          return m;
        }));
        return true;
      } else {
        addLog(`2回攻撃（対象未指定）`, 'info');
        return false;
      }

    default:
      console.warn('未実装の効果タイプ:', type);
      return false;
  }
};

/**
 * 技の効果を実行（拡張版 - カード固有処理対応）
 * @param {string} skillText - 技の効果テキスト
 * @param {Object} context - ゲームコンテキスト
 * @param {string} cardId - カードID（オプション）
 * @returns {boolean} 成功したかどうか
 */
export const executeSkillEffects = (skillText, context, cardId = null) => {
  const { addLog } = context;

  // カード固有処理が存在する場合は優先
  if (cardId) {
    // 動的インポートを避けるため、レジストリをチェック
    try {
      const { hasCardEffect, getCardEffect } = require('./cardEffects/index');

      if (hasCardEffect(cardId)) {
        const cardEffect = getCardEffect(cardId);
        const result = cardEffect(skillText, context);

        // カード固有処理が成功した場合はそこで終了
        if (result) {
          return true;
        }
        // falseの場合は汎用パーサーにフォールバック
        addLog('カード固有処理が失敗、汎用パーサーで処理します', 'info');
      }
    } catch (error) {
      // カード固有処理のインポートが失敗した場合は汎用パーサーで処理
      console.warn('Card effects not loaded, using generic parser:', error);
    }
  }

  // 汎用パーサーで処理
  const effects = parseEffect(skillText);

  if (effects.length === 0) {
    addLog('効果を解析できませんでした', 'info');
    return false;
  }

  // 各効果を実行
  let allSucceeded = true;
  effects.forEach(effect => {
    const success = executeEffect(effect, context);
    if (!success) {
      allSucceeded = false;
    }
  });

  return allSucceeded;
};
