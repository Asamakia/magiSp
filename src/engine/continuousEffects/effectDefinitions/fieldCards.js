/**
 * 常時効果システム: フィールドカードの効果定義
 *
 * フィールドカードの【常時】効果を定義します。
 * 主に攻撃力/HP修正、コスト修正などの効果が含まれます。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

import { CONTINUOUS_EFFECT_TYPES } from '../effectTypes';
import { TARGET_TYPES } from '../targetTypes';
import { VALUE_CALCULATOR_TYPES } from '../valueCalculator';

export const fieldCardEffects = {
  // ========================================
  // 原始属性フィールドカード
  // ========================================

  /**
   * C0000003: 粘液獣の群生地
   * 【常時】自分の場の粘液獣モンスターの攻撃力を300アップ。
   */
  C0000003: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 300,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: '粘液獣' },
    },
  ],

  /**
   * C0000018: 粘液の沼地
   * 【常時】場にいる《粘液獣》の攻撃力を300アップ。
   */
  C0000018: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 300,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: '粘液獣' },
    },
  ],

  // ========================================
  // 炎属性フィールドカード
  // ========================================

  /**
   * C0000037: ドラゴンの火山
   * 【常時】《ドラゴン》と名のついたモンスターの攻撃力を400アップ。
   */
  C0000037: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'ドラゴン' },
    },
  ],

  /**
   * C0000188: 炎の岩峰
   * 【常時】炎属性モンスターの攻撃力を400アップ。
   */
  C0000188: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '炎' },
    },
  ],

  // ========================================
  // 水属性フィールドカード
  // ========================================

  /**
   * C0000053: 母なる大海
   * 【常時】水属性モンスターの攻撃力300アップ。
   */
  C0000053: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 300,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '水' },
    },
  ],

  /**
   * C0000055: 深淵の潮流
   * 【常時】水属性モンスターの召喚コストを1軽減。
   */
  C0000055: [
    {
      type: CONTINUOUS_EFFECT_TYPES.SUMMON_COST_MODIFIER,
      value: -1,
      target: TARGET_TYPES.SELF_SUMMON,
      condition: { attribute: '水' },
    },
  ],

  /**
   * C0000155: 氷猫の聖域
   * 【常時】《ブリザードキャット》モンスターの攻撃力を400アップ。
   */
  C0000155: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'ブリザードキャット' },
    },
  ],

  /**
   * C0000199: 永遠の氷結宮殿
   * 【常時】自分のSP上限が4になる。
   */
  C0000199: [
    {
      type: CONTINUOUS_EFFECT_TYPES.SP_LIMIT_MODIFIER,
      value: 4,
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  /**
   * C0000338: アクアレギアの廃墟
   * 【常時】『アクアレギナ』または『ヴェルゼファール』モンスターのHPを600アップ。
   */
  C0000338: [
    {
      type: CONTINUOUS_EFFECT_TYPES.HP_MODIFIER,
      value: 600,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'アクアレギナ' },
    },
    {
      type: CONTINUOUS_EFFECT_TYPES.HP_MODIFIER,
      value: 600,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'ヴェルゼファール' },
    },
  ],

  // ========================================
  // 光属性フィールドカード
  // ========================================

  /**
   * C0000071: クリスタルサンクチュアリ
   * 【常時】光属性モンスターの攻撃力を500アップ。
   * 【常時】2体以上光属性モンスターが場にいるとき相手の基本技の効果を1ターンに1度無効化できる。
   */
  C0000071: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 500,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '光' },
    },
    {
      type: CONTINUOUS_EFFECT_TYPES.SKILL_NEGATION,
      skillType: 'basic',
      usesPerTurn: 1,
      condition: { minAttributeOnField: { attribute: '光', count: 2 } },
    },
  ],

  /**
   * C0000073: 輝く天蓋
   * 【常時】相手モンスター全体の攻撃力を、場にいる光属性モンスター1体につき200ダウン。
   */
  C0000073: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
      baseValue: -200,
      countCondition: { attribute: '光' },
      target: TARGET_TYPES.OPPONENT_MONSTERS,
    },
  ],

  /**
   * C0000218: フルーツ・マリオネット劇場
   * 【常時】光属性［プラント］モンスターの攻撃力を400アップ。
   */
  C0000218: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '光', category: '【プラント】' },
    },
  ],

  /**
   * C0000326: 雷嵐の聖域
   * 【常時】場にいる光属性モンスターの攻撃力を500アップ。
   */
  C0000326: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 500,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '光' },
    },
  ],

  /**
   * C0000351: 天翔峰アヴィクルス
   * 【常時】《ヴォランティス》モンスターの攻撃力を700アップ。
   */
  C0000351: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 700,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'ヴォランティス' },
    },
  ],

  // ========================================
  // 闇属性フィールドカード
  // ========================================

  /**
   * C0000089: 闇の宮殿
   * 【常時】闇属性モンスターの攻撃力を400アップ。
   */
  C0000089: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '闇' },
    },
  ],

  /**
   * C0000123: 禁忌の王座
   * 【常時】自分のライフが2000以下の場合、闇属性モンスターの召喚コストを1軽減。
   */
  C0000123: [
    {
      type: CONTINUOUS_EFFECT_TYPES.SUMMON_COST_MODIFIER,
      value: -1,
      target: TARGET_TYPES.SELF_SUMMON,
      condition: { attribute: '闇', maxLife: 2000 },
    },
  ],

  /**
   * C0000240: 魔界の幼魔王城
   * 【常時】《リリカ》と名の付くモンスターの攻撃力を500アップ。
   */
  C0000240: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 500,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'リリカ' },
    },
  ],

  /**
   * C0000386: 呪縛の塔・ヴェルナクール
   * 【常時】自分の《黒呪》魔法カードのコストを1軽減（エリザヴェットと重複可）。
   */
  C0000386: [
    {
      type: CONTINUOUS_EFFECT_TYPES.MAGIC_COST_MODIFIER,
      value: -1,
      target: TARGET_TYPES.SELF_MAGIC,
      condition: { nameIncludes: '黒呪' },
    },
  ],

  // ========================================
  // 未来属性フィールドカード
  // ========================================

  /**
   * C0000257: 時読みの塔
   * 【常時】「未来属性」モンスターの攻撃力を400アップ。
   */
  C0000257: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '未来' },
    },
  ],

  /**
   * C0000270: ヴォイドゲートの遺構
   * 【常時】「未来属性」モンスターの召喚時にそのHPを600アップ。
   */
  C0000270: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ON_SUMMON_BUFF,
      statType: 'hp',
      value: 600,
      condition: { attribute: '未来' },
    },
  ],

  // ========================================
  // 原始属性フィールドカード
  // ========================================

  /**
   * C0000366: 天翔秘島
   * 【常時】《ヴォランティス》モンスターのHPを1000アップ。
   */
  C0000366: [
    {
      type: CONTINUOUS_EFFECT_TYPES.HP_MODIFIER,
      value: 1000,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'ヴォランティス' },
    },
  ],

  // ========================================
  // なし属性フィールドカード
  // ========================================

  /**
   * C0000229: 鉄槍騎士団の宿舎
   * 【常時】《鉄槍》モンスターの攻撃力を400アップ。
   */
  C0000229: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: '鉄槍' },
    },
  ],

  /**
   * C0000242: ご主人様のアパート
   * 【常時】《ご主人様》または《リリカ》と名の付くモンスターの攻撃力を400アップ。
   */
  C0000242: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'ご主人様' },
    },
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: 'リリカ' },
    },
  ],

  /**
   * C0000289: 薬師の隠れ家
   * 【常時】場にいる《毒》と名の付くモンスターの攻撃力を400アップ。
   */
  C0000289: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 400,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: '毒' },
    },
  ],

  /**
   * C0000376: 虹羽の微脈
   * 【常時】自分のターン中《虹羽密林》モンスターの攻撃力を500アップ。
   */
  C0000376: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      value: 500,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: '虹羽密林', isMyTurn: true },
    },
  ],
};
