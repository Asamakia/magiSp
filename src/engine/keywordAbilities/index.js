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
  const keywordField = card.keyword || '';
  if (keywordField.includes(keywordWithBrackets)) return true;

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
