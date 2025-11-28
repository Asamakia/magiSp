/**
 * キーワード能力システム
 *
 * キーワード能力の定義・判定・ヘルパー関数を提供する
 */

// =============================================================================
// キーワード能力の定義
// =============================================================================

export const KEYWORD_ABILITIES = {
  // ルール明記済み（Phase 1）
  SETSUNA_EISHO: '刹那詠唱',      // 相手ターン発動可能（魔法カード）
  KINKI_CARD: '禁忌カード',        // デッキ1枚制限

  // 戦闘・シンプル系（Phase 1）
  SHISHOKU: '死触',                // ダメージ1点でも与えれば破壊
  DOKUSHIN: '毒侵',                // プレイヤーダメージ時に毒付与

  // 戦闘・ターン終了系（Phase 2）
  SHINSYOKU: '深蝕',               // エンドフェイズ攻撃力減少
  MASHOUHEKI: '魔障壁',            // 魔法無効化
  ZANKON: '残魂',                  // 破壊時効果

  // 召喚・コスト系（Phase 3）
  HENGENMI: '変幻身',              // 形態変化
  GIGEN: '犠現',                   // 生贄コスト軽減
  KONKETSU: '魂結',                // リンク効果
  KAKUSEI: '覚醒',                 // 条件強化

  // 固有効果（Phase 4）
  SOUREI: '壮麗',                  // 同名カード捨てて効果
  IATSUKO: '威圧吼',               // 攻撃時追加効果
  MIRAI_YOCHI: '未来予知',         // デッキ操作
};

// 実装方式の分類
export const KEYWORD_IMPLEMENTATION_TYPE = {
  GAME_FLOW: 'game_flow',           // magic-spirit.jsx でゲームフロー変更
  DECK_BUILDING: 'deck_building',   // デッキ構築時の検証
  TRIGGER: 'trigger',               // トリガーシステム
  CONTINUOUS: 'continuous',         // 継続効果システム
  ACTION: 'action',                 // プレイヤーアクション
  SUMMON_COST: 'summon_cost',       // 召喚コスト計算
  STATE: 'state',                   // 状態管理
};

// 各キーワードの実装方式マッピング
export const KEYWORD_IMPLEMENTATION = {
  [KEYWORD_ABILITIES.SETSUNA_EISHO]: KEYWORD_IMPLEMENTATION_TYPE.GAME_FLOW,
  [KEYWORD_ABILITIES.KINKI_CARD]: KEYWORD_IMPLEMENTATION_TYPE.DECK_BUILDING,
  [KEYWORD_ABILITIES.SHISHOKU]: KEYWORD_IMPLEMENTATION_TYPE.TRIGGER,
  [KEYWORD_ABILITIES.DOKUSHIN]: KEYWORD_IMPLEMENTATION_TYPE.TRIGGER,
  [KEYWORD_ABILITIES.SHINSYOKU]: KEYWORD_IMPLEMENTATION_TYPE.CONTINUOUS,
  [KEYWORD_ABILITIES.MASHOUHEKI]: KEYWORD_IMPLEMENTATION_TYPE.CONTINUOUS,
  [KEYWORD_ABILITIES.ZANKON]: KEYWORD_IMPLEMENTATION_TYPE.TRIGGER,
  [KEYWORD_ABILITIES.HENGENMI]: KEYWORD_IMPLEMENTATION_TYPE.ACTION,
  [KEYWORD_ABILITIES.GIGEN]: KEYWORD_IMPLEMENTATION_TYPE.SUMMON_COST,
  [KEYWORD_ABILITIES.KONKETSU]: KEYWORD_IMPLEMENTATION_TYPE.TRIGGER,
  [KEYWORD_ABILITIES.KAKUSEI]: KEYWORD_IMPLEMENTATION_TYPE.STATE,
  [KEYWORD_ABILITIES.SOUREI]: KEYWORD_IMPLEMENTATION_TYPE.ACTION,
  [KEYWORD_ABILITIES.IATSUKO]: KEYWORD_IMPLEMENTATION_TYPE.TRIGGER,
  [KEYWORD_ABILITIES.MIRAI_YOCHI]: KEYWORD_IMPLEMENTATION_TYPE.TRIGGER,
};

// =============================================================================
// キーワード判定関数
// =============================================================================

/**
 * カードが指定したキーワード能力を持つか判定
 * @param {Object} card - カードオブジェクト
 * @param {string} keyword - キーワード能力（【】なし）
 * @returns {boolean} キーワードを持つかどうか
 */
export function hasKeyword(card, keyword) {
  if (!card) return false;

  const keywordWithBrackets = `【${keyword}】`;

  // CSVの「キーワード能力」フィールドをチェック
  // card.keyword は配列形式（cardManager.jsで変換済み）または文字列形式
  const keywordField = card.keyword;
  if (keywordField) {
    if (Array.isArray(keywordField)) {
      // 配列の場合: 【】なしのキーワードで検索
      if (keywordField.includes(keyword)) return true;
    } else if (typeof keywordField === 'string') {
      // 文字列の場合: 【】ありで検索
      if (keywordField.includes(keywordWithBrackets)) return true;
    }
  }

  // keywordText（表示用の元のテキスト）もチェック
  const keywordText = card.keywordText || '';
  if (keywordText.includes(keywordWithBrackets)) return true;

  // 効果テキスト内のキーワードもチェック
  const effectText = card.effect || '';
  if (effectText.includes(keywordWithBrackets)) return true;

  return false;
}

/**
 * カードが持つキーワード能力一覧を取得
 * @param {Object} card - カードオブジェクト
 * @returns {string[]} キーワード能力の配列
 */
export function getCardKeywords(card) {
  const keywords = [];
  for (const value of Object.values(KEYWORD_ABILITIES)) {
    if (hasKeyword(card, value)) {
      keywords.push(value);
    }
  }
  return keywords;
}

/**
 * 刹那詠唱を持つ魔法カードか判定
 * @param {Object} card - カードオブジェクト
 * @returns {boolean}
 */
export function isSetsunaMagic(card) {
  if (!card) return false;
  if (card.type !== 'magic') return false;
  return hasKeyword(card, KEYWORD_ABILITIES.SETSUNA_EISHO);
}

/**
 * 禁忌カードか判定
 * @param {Object} card - カードオブジェクト
 * @returns {boolean}
 */
export function isKinkiCard(card) {
  if (!card) return false;
  return hasKeyword(card, KEYWORD_ABILITIES.KINKI_CARD);
}

// =============================================================================
// 刹那詠唱関連
// =============================================================================

/**
 * 刹那詠唱のコストを計算（通常コスト + 1）
 * @param {Object} card - カードオブジェクト
 * @returns {number} 刹那詠唱時のコスト
 */
export function getSetsunaCost(card) {
  if (!card) return 0;
  return (card.cost || 0) + 1;
}

/**
 * 刹那詠唱で発動可能なカードをフィルタ
 * @param {Object[]} hand - 手札の配列
 * @param {number} activeSP - 使用可能なSP
 * @returns {Object[]} 発動可能なカードの配列
 */
export function getActivatableSetsunaMagics(hand, activeSP) {
  if (!hand || !Array.isArray(hand)) return [];

  return hand.filter(card => {
    if (!isSetsunaMagic(card)) return false;
    const cost = getSetsunaCost(card);
    return activeSP >= cost;
  });
}

// =============================================================================
// 禁忌カード関連
// =============================================================================

/**
 * デッキ内の禁忌カード枚数をカウント
 * @param {Object[]} deck - デッキの配列
 * @returns {number} 禁忌カードの枚数
 */
export function countKinkiCards(deck) {
  if (!deck || !Array.isArray(deck)) return 0;
  return deck.filter(card => isKinkiCard(card)).length;
}

/**
 * デッキが禁忌カードルールに違反していないか検証
 * @param {Object[]} deck - デッキの配列
 * @returns {{ valid: boolean, count: number, message: string }}
 */
export function validateKinkiCards(deck) {
  const count = countKinkiCards(deck);
  const valid = count <= 1;
  const message = valid
    ? '禁忌カードルール: OK'
    : `禁忌カードルール違反: ${count}枚（上限1枚）`;

  return { valid, count, message };
}

// =============================================================================
// チェーンポイントシステム（刹那詠唱の発動タイミング）
// =============================================================================

/**
 * チェーンポイントの種類
 * 刹那詠唱カードが発動可能なタイミングを定義
 */
export const CHAIN_POINTS = {
  BATTLE_START: 'battle_start',       // バトルフェイズ開始時
  ATTACK_DECLARATION: 'attack_declaration', // 攻撃宣言時
  SUMMON: 'summon',                   // 召喚時（将来実装）
  MAGIC_ACTIVATION: 'magic_activation', // 魔法発動時（将来実装）
};

/**
 * チェーンポイントの表示名
 */
export const CHAIN_POINT_NAMES = {
  [CHAIN_POINTS.BATTLE_START]: 'バトルフェイズ開始',
  [CHAIN_POINTS.ATTACK_DECLARATION]: '攻撃宣言',
  [CHAIN_POINTS.SUMMON]: '召喚',
  [CHAIN_POINTS.MAGIC_ACTIVATION]: '魔法発動',
};

/**
 * スタックアイテムを作成
 * @param {Object} card - 発動するカード
 * @param {number} player - 発動プレイヤー（1 or 2）
 * @param {string} chainPoint - チェーンポイント種類
 * @param {Object} context - 追加コンテキスト（攻撃者情報など）
 * @returns {Object} スタックアイテム
 */
export function createStackItem(card, player, chainPoint, context = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    card,
    player,
    chainPoint,
    context,
    timestamp: Date.now(),
  };
}

/**
 * スタックを解決（現在は1枚のみ、将来はLIFO）
 * @param {Object[]} stack - スタック配列
 * @param {Function} resolveEffect - 効果解決関数
 * @returns {Object[]} 解決後の空スタック
 */
export function resolveStack(stack, resolveEffect) {
  // Phase A: 1枚のみなので先頭を解決
  // Phase B: 逆順（LIFO）で解決
  const toResolve = [...stack].reverse();

  for (const item of toResolve) {
    resolveEffect(item);
  }

  return []; // スタックをクリア
}

// =============================================================================
// 【魂結】関連
// =============================================================================

/**
 * 【魂結】を持つカードか判定
 * @param {Object} card - カードオブジェクト
 * @returns {boolean}
 */
export function hasKonketsu(card) {
  return hasKeyword(card, KEYWORD_ABILITIES.KONKETSU);
}

/**
 * 【魂結】の効果定義
 * カードIDごとのリンク効果を定義
 */
export const KONKETSU_EFFECTS = {
  // C0000333: 深みの儀式者 - 双方攻撃力+100
  C0000333: {
    targetCondition: 'ヴェルゼファール',
    atkBonus: 100,
    hpBonus: 0,
    endPhaseDamage: 0,
  },
  // C0000334: クラディオム - 双方攻撃力+300
  C0000334: {
    targetCondition: 'ヴェルゼファール',
    atkBonus: 300,
    hpBonus: 0,
    endPhaseDamage: 0,
  },
  // C0000335: シスラゴン - 双方にターン終了時300ダメージ付与
  C0000335: {
    targetCondition: 'ヴェルゼファール',
    atkBonus: 0,
    hpBonus: 0,
    endPhaseDamage: 300,
  },
  // C0000336: ルミナクール - 双方HP+800
  C0000336: {
    targetCondition: 'ヴェルゼファール',
    atkBonus: 0,
    hpBonus: 800,
    endPhaseDamage: 0,
  },
  // C0000337: タラッサロス - 双方攻撃力+1000、ターン終了時800ダメージ付与
  C0000337: {
    targetCondition: 'ヴェルゼファール',
    atkBonus: 1000,
    hpBonus: 0,
    endPhaseDamage: 800,
  },
  // C0000340: 深海の支配者・ヴェルゼファール - 双方にターン終了時800ダメージ付与
  C0000340: {
    targetCondition: 'ヴェルゼファール',
    atkBonus: 0,
    hpBonus: 0,
    endPhaseDamage: 800,
  },
};

/**
 * 【魂結】の効果定義を取得
 * @param {string} cardId - カードID
 * @returns {Object|null} 効果定義
 */
export function getKonketsuEffect(cardId) {
  return KONKETSU_EFFECTS[cardId] || null;
}

/**
 * フィールド上でリンク可能な対象を検索
 * @param {Object[]} field - フィールド配列
 * @param {string} targetCondition - 対象条件（名前に含む文字列）
 * @param {string} excludeUniqueId - 除外するカードのuniqueId（自分自身）
 * @returns {Object[]} リンク可能なモンスターの配列 [{monster, slotIndex}]
 */
export function findLinkableTargets(field, targetCondition, excludeUniqueId) {
  const targets = [];
  field.forEach((monster, idx) => {
    if (monster &&
        monster.uniqueId !== excludeUniqueId &&
        monster.name &&
        monster.name.includes(targetCondition) &&
        !monster.linkedTo) { // 既にリンク済みでない
      targets.push({ monster, slotIndex: idx });
    }
  });
  return targets;
}

/**
 * 【魂結】リンクを実行
 * 双方のモンスターにリンク効果を適用
 * @param {Object} sourceMonster - リンク元モンスター
 * @param {number} sourceSlotIndex - リンク元のスロットインデックス
 * @param {Object} targetMonster - リンク先モンスター
 * @param {number} targetSlotIndex - リンク先のスロットインデックス
 * @param {Object} effect - 効果定義（KONKETSU_EFFECTS）
 * @param {Function} setField - フィールド更新関数
 * @param {Function} addLog - ログ関数
 * @returns {boolean} 成功したかどうか
 */
export function executeKonketsuLink(
  sourceMonster,
  sourceSlotIndex,
  targetMonster,
  targetSlotIndex,
  effect,
  setField,
  addLog
) {
  const { atkBonus, hpBonus, endPhaseDamage } = effect;

  setField(prev => {
    const newField = [...prev];

    // リンク元モンスターを更新
    if (newField[sourceSlotIndex]) {
      const source = { ...newField[sourceSlotIndex] };
      source.linkedTo = targetMonster.uniqueId;
      source.linkedBonus = { atk: atkBonus, hp: hpBonus };
      source.currentAttack = (source.currentAttack || source.attack) + atkBonus;
      source.maxHp = (source.maxHp || source.hp) + hpBonus;
      source.currentHp = (source.currentHp || source.hp) + hpBonus;

      if (endPhaseDamage > 0) {
        source.linkedEndPhaseDamage = [
          ...(source.linkedEndPhaseDamage || []),
          { damage: endPhaseDamage, linkedWith: targetMonster.uniqueId, sourceCardName: sourceMonster.name }
        ];
      }
      newField[sourceSlotIndex] = source;
    }

    // リンク先モンスターを更新
    if (newField[targetSlotIndex]) {
      const target = { ...newField[targetSlotIndex] };
      target.linkedTo = sourceMonster.uniqueId;
      target.linkedBonus = { atk: atkBonus, hp: hpBonus };
      target.currentAttack = (target.currentAttack || target.attack) + atkBonus;
      target.maxHp = (target.maxHp || target.hp) + hpBonus;
      target.currentHp = (target.currentHp || target.hp) + hpBonus;

      if (endPhaseDamage > 0) {
        target.linkedEndPhaseDamage = [
          ...(target.linkedEndPhaseDamage || []),
          { damage: endPhaseDamage, linkedWith: sourceMonster.uniqueId, sourceCardName: sourceMonster.name }
        ];
      }
      newField[targetSlotIndex] = target;
    }

    return newField;
  });

  // ログ出力
  const effects = [];
  if (atkBonus > 0) effects.push(`ATK+${atkBonus}`);
  if (hpBonus > 0) effects.push(`HP+${hpBonus}`);
  if (endPhaseDamage > 0) effects.push(`ターン終了時${endPhaseDamage}ダメージ`);

  addLog(`【魂結】${sourceMonster.name}と${targetMonster.name}がリンク！双方に${effects.join('、')}`, 'info');

  return true;
}

/**
 * リンク解除処理
 * モンスターが場を離れる時にリンク相手の効果を解除
 * @param {Object} leavingMonster - 場を離れるモンスター
 * @param {Function} setField - フィールド更新関数
 * @param {Function} addLog - ログ関数
 */
export function handleLinkBreak(leavingMonster, setField, addLog) {
  if (!leavingMonster || !leavingMonster.linkedTo) return;

  const linkedToId = leavingMonster.linkedTo;

  setField(prev => {
    return prev.map(monster => {
      if (monster && monster.uniqueId === linkedToId) {
        const updated = { ...monster };

        // リンクボーナスを解除
        const bonus = updated.linkedBonus || { atk: 0, hp: 0 };
        updated.currentAttack = Math.max(0, (updated.currentAttack || 0) - bonus.atk);

        // maxHPを減らす（currentHPはmaxHPを超えない限り維持）
        updated.maxHp = Math.max(1, (updated.maxHp || updated.hp) - bonus.hp);
        if (updated.currentHp > updated.maxHp) {
          updated.currentHp = updated.maxHp;
        }

        // エンドフェイズダメージからこのリンクによるものを削除
        updated.linkedEndPhaseDamage = (updated.linkedEndPhaseDamage || [])
          .filter(d => d.linkedWith !== leavingMonster.uniqueId);

        // リンク状態をクリア
        updated.linkedTo = null;
        updated.linkedBonus = { atk: 0, hp: 0 };

        addLog(`${updated.name}のリンクが解除された（ATK-${bonus.atk}、maxHP-${bonus.hp}）`, 'info');

        return updated;
      }
      return monster;
    });
  });
}

/**
 * エンドフェイズのリンクダメージを処理
 * @param {Object[]} field - フィールド配列
 * @param {Function} setOpponentLife - 相手ライフ設定関数
 * @param {Function} addLog - ログ関数
 * @returns {number} 与えた総ダメージ
 */
export function processLinkEndPhaseDamage(field, setOpponentLife, addLog) {
  let totalDamage = 0;

  field.forEach(monster => {
    if (monster && monster.linkedEndPhaseDamage && monster.linkedEndPhaseDamage.length > 0) {
      monster.linkedEndPhaseDamage.forEach(({ damage, sourceCardName }) => {
        totalDamage += damage;
        addLog(`${monster.name}の【魂結】効果: 相手に${damage}ダメージ`, 'damage');
      });
    }
  });

  if (totalDamage > 0) {
    setOpponentLife(prev => Math.max(0, prev - totalDamage));
  }

  return totalDamage;
}

