/**
 * 常時効果システム: モンスターカードの効果定義
 *
 * モンスターカードの【常時】効果を定義します。
 * 攻撃力修正、ダメージ軽減、コスト修正などの効果が含まれます。
 *
 * @see src/ルール/continuous-effect-system-design.md
 */

import { CONTINUOUS_EFFECT_TYPES } from '../effectTypes';
import { TARGET_TYPES } from '../targetTypes';
import { VALUE_CALCULATOR_TYPES } from '../valueCalculator';

export const monsterCardEffects = {
  // ========================================
  // 原始属性モンスター
  // ========================================

  /**
   * C0000007: 粘液獣・キング
   * 【常時】場にいる粘液獣1体につき自身の攻撃力を1500アップ（自身は含めない）。
   */
  C0000007: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '場にいる粘液獣1体につき自身の攻撃力を1500アップ（自身は含めない）',
      valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
      baseValue: 1500,
      countCondition: { category: '【粘液獣】', excludeSelf: true },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  /**
   * C0000138: 禁忌のゴシッククラウン
   * 【常時】自分のSPトークンはすべてレスト状態になる。
   */
  C0000138: [
    {
      type: CONTINUOUS_EFFECT_TYPES.SP_RESTRICTION,
      description: '自分のSPトークンはすべてレスト状態になる',
      restriction: 'ALL_RESTED',
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  // ========================================
  // 炎属性モンスター
  // ========================================

  /**
   * C0000028: 炎竜母フレイマ
   * 【常時】自分の［ドラゴン］モンスターは効果でダメージを受けない。
   */
  C0000028: [
    {
      type: CONTINUOUS_EFFECT_TYPES.DAMAGE_IMMUNITY,
      description: '自分の［ドラゴン］モンスターは効果でダメージを受けない',
      damageSource: 'effect',
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { category: '【ドラゴン】' },
    },
  ],

  /**
   * C0000029: クリムゾン・ワイバーン
   * 【常時】［ドラゴン］モンスターがいる時、このカードの攻撃力は400アップする。
   */
  C0000029: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '［ドラゴン］モンスターがいる時、このカードの攻撃力は400アップする',
      valueCalculator: VALUE_CALCULATOR_TYPES.CONDITIONAL,
      value: 400,
      ifCondition: { hasCategoryOnField: '【ドラゴン】' },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  /**
   * C0000170: 岩狸・大岩王
   * 【常時】場にいる［マグマフォージ］モンスター1体につき攻撃力500アップ。
   */
  C0000170: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '場にいる［マグマフォージ］モンスター1体につき攻撃力500アップ',
      valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
      baseValue: 500,
      countCondition: { category: '【マグマフォージ】' },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  // ========================================
  // 水属性モンスター
  // ========================================

  /**
   * C0000149: ブリザードマスターの愛猫・ミスティ
   * 【常時】場に《ブリザードマスター》がいる場合、攻撃力が1000アップ。
   */
  C0000149: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '場に《ブリザードマスター》がいる場合、攻撃力が1000アップ',
      valueCalculator: VALUE_CALCULATOR_TYPES.CONDITIONAL,
      value: 1000,
      ifCondition: { hasNameOnField: 'ブリザードマスター' },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  /**
   * C0000380: 虹羽密林の湖鱗獣・アクアレオン
   * 【常時】このカードの攻撃力は、自分の場の《虹羽密林》モンスター1体につき500アップ。
   */
  C0000380: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: 'このカードの攻撃力は、自分の場の《虹羽密林》モンスター1体につき500アップ',
      valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
      baseValue: 500,
      countCondition: { nameIncludes: '虹羽密林' },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  /**
   * C0000399: 呪術狩りの鎖術師ミリア
   * 【常時】相手の闇属性モンスターの攻撃力をターン終了時まで300ダウン。
   * Note: ターン終了時までの効果だが、常時効果として実装
   */
  C0000399: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '相手の闇属性モンスターの攻撃力を300ダウン',
      value: -300,
      target: TARGET_TYPES.OPPONENT_MONSTERS,
      condition: { attribute: '闇' },
    },
  ],

  // ========================================
  // 光属性モンスター
  // ========================================

  /**
   * C0000020: 灯火の護衛霊
   * 【常時】自分の光属性モンスターが受けるダメージを200軽減する（1ターンに1度）。
   */
  C0000020: [
    {
      type: CONTINUOUS_EFFECT_TYPES.DAMAGE_REDUCTION,
      description: '自分の光属性モンスターが受けるダメージを200軽減する（1ターンに1度）',
      value: 200,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { attribute: '光' },
      usesPerTurn: 1,
    },
  ],

  /**
   * C0000091: 灯火の精霊
   * 【常時】自分の光属性モンスターが召喚されるたび、そのモンスターのHPを200アップ。
   */
  C0000091: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ON_SUMMON_BUFF,
      description: '自分の光属性モンスターが召喚されるたび、そのモンスターのHPを200アップ',
      statType: 'hp',
      value: 200,
      condition: { attribute: '光' },
    },
  ],

  /**
   * C0000234: 撮影会のリリカ
   * 【常時】相手の魔法カードの発動をターンに1度無効化。
   */
  C0000234: [
    {
      type: CONTINUOUS_EFFECT_TYPES.MAGIC_NEGATION,
      description: '相手の魔法カードの発動をターンに1度無効化',
      usesPerTurn: 1,
    },
  ],

  /**
   * C0000215: フルーツ・マリオネット・メロン王
   * 【常時】場にいる［プラント］モンスター1体につき攻撃力400アップ。
   */
  C0000215: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '場にいる［プラント］モンスター1体につき攻撃力400アップ',
      valueCalculator: VALUE_CALCULATOR_TYPES.COUNT_MULTIPLY,
      baseValue: 400,
      countCondition: { category: '【プラント】' },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  /**
   * C0000378: 虹羽密林の金胞草・ファルネシア
   * 【常時】自分の《虹羽密林》モンスターが召喚されるたび、そのモンスターの攻撃力をターン終了時まで400アップ。
   */
  C0000378: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ON_SUMMON_BUFF,
      description: '自分の《虹羽密林》モンスターが召喚されるたび、そのモンスターの攻撃力を400アップ',
      statType: 'atk',
      value: 400,
      condition: { nameIncludes: '虹羽密林' },
    },
  ],

  /**
   * C0000248: 輝鎖の聖姫ルミリア
   * 【常時】場に『鎖縛の幻姫リアノン』または『鎖縛の禁忌姫リアノン・エターナル』がいる場合、このカードの攻撃力を1000アップする。
   */
  C0000248: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '場に『鎖縛の幻姫リアノン』または『鎖縛の禁忌姫リアノン・エターナル』がいる場合、このカードの攻撃力を1000アップする',
      valueCalculator: VALUE_CALCULATOR_TYPES.CONDITIONAL,
      value: 1000,
      ifCondition: { hasNameOnField: '鎖縛の幻姫リアノン' },
      target: TARGET_TYPES.SELF_CARD,
    },
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      valueCalculator: VALUE_CALCULATOR_TYPES.CONDITIONAL,
      value: 1000,
      ifCondition: { hasNameOnField: '鎖縛の禁忌姫リアノン・エターナル' },
      target: TARGET_TYPES.SELF_CARD,
      // Note: これらの効果は重複しない（どちらかがいれば+1000）
      nonStackable: true,
      stackGroup: 'lumilia_rianon_buff',
    },
  ],

  /**
   * C0000397: 呪術狩りの聖焔騎士レオノーラ
   * 【常時】相手の闇属性モンスターが受けるダメージを400アップ。
   */
  C0000397: [
    {
      type: CONTINUOUS_EFFECT_TYPES.DAMAGE_RECEIVED_MODIFIER,
      description: '相手の闘属性モンスターが受けるダメージを400アップ',
      value: 400,
      condition: { attribute: '闇' },
    },
  ],

  // ========================================
  // 闇属性モンスター
  // ========================================

  /**
   * C0000080: 闇魔界の貴婦人
   * 【常時】相手の魔法カードのコストを1増加する。
   */
  C0000080: [
    {
      type: CONTINUOUS_EFFECT_TYPES.MAGIC_COST_MODIFIER,
      description: '相手の魔法カードのコストを1増加する',
      value: 1,
      target: TARGET_TYPES.OPPONENT_MAGIC,
    },
  ],

  /**
   * C0000114: 闇の巨像
   * 【常時】このカードは攻撃できない。
   */
  C0000114: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATTACK_RESTRICTION,
      description: 'このカードは攻撃できない',
      target: TARGET_TYPES.SELF_CARD,
      restriction: 'CANNOT_ATTACK',
    },
  ],

  /**
   * C0000246: 鎖縛の禁忌姫リアノン・エターナル
   * 【常時】相手の魔法カードを1ターンに1度無効化する。
   */
  C0000246: [
    {
      type: CONTINUOUS_EFFECT_TYPES.MAGIC_NEGATION,
      description: '相手の魔法カードを1ターンに1度無効化する',
      usesPerTurn: 1,
    },
  ],

  /**
   * C0000370: 影羽の鳥民・ノクティス
   * 【常時】自分の《ヴォランティス》モンスターが相手モンスターを戦闘で破壊するたび、
   *        そのモンスターの攻撃力の半分を相手プレイヤーにダメージとして与える。
   * Note: これは戦闘破壊トリガーとして実装すべきだが、常時効果としてフラグを立てておく
   */
  C0000370: [
    {
      type: CONTINUOUS_EFFECT_TYPES.DAMAGE_DEALT_MODIFIER,
      description: '自分の《ヴォランティス》モンスターが相手モンスターを戦闘で破壊するたび、そのモンスターの攻撃力の半分を相手プレイヤーにダメージとして与える',
      value: 0, // 実際のダメージはトリガーで計算
      target: TARGET_TYPES.SELF_DAMAGE_DEALT,
      condition: { nameIncludes: 'ヴォランティス' },
      // Note: この効果は特殊で、戦闘破壊時のトリガーと連携が必要
      specialEffect: 'BATTLE_DESTROY_BONUS_DAMAGE',
    },
  ],

  /**
   * C0000384: 魔女エリザヴェット・ヴェイル
   * 【常時】自分の《黒呪》魔法カードのコストを1軽減（重複不可）。
   */
  C0000384: [
    {
      type: CONTINUOUS_EFFECT_TYPES.MAGIC_COST_MODIFIER,
      description: '自分の《黒呪》魔法カードのコストを1軽減（重複不可）',
      value: -1,
      target: TARGET_TYPES.SELF_MAGIC,
      condition: { nameIncludes: '黒呪' },
      nonStackable: true,
    },
  ],

  // ========================================
  // なし属性モンスター
  // ========================================

  /**
   * C0000219: 団長プニリーヌ・ソフティア
   * 【常時】場にいる間、［蛮族］モンスターの攻撃力300アップ。
   */
  C0000219: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '場にいる間、［蛮族］モンスターの攻撃力300アップ',
      value: 300,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { category: '【蛮族】' },
    },
  ],

  /**
   * C0000222: 鉄槍騎士団のウィア
   * 【常時】《プニリーヌ》モンスターが場にいるときこのカードの攻撃力を500アップする。
   */
  C0000222: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '《プニリーヌ》モンスターが場にいるときこのカードの攻撃力を500アップする',
      valueCalculator: VALUE_CALCULATOR_TYPES.CONDITIONAL,
      value: 500,
      ifCondition: { hasNameOnField: 'プニリーヌ' },
      target: TARGET_TYPES.SELF_CARD,
    },
  ],

  /**
   * C0000317: 鉄槍の騎士長
   * 【常時】自分の《鉄槍》モンスターの攻撃力を300アップ。
   */
  C0000317: [
    {
      type: CONTINUOUS_EFFECT_TYPES.ATK_MODIFIER,
      description: '自分の《鉄槍》モンスターの攻撃力を300アップ',
      value: 300,
      target: TARGET_TYPES.SELF_MONSTERS,
      condition: { nameIncludes: '鉄槍' },
    },
  ],

  /**
   * C0000401: 呪術狩りの傭兵バランド
   * 【常時】自分の他のモンスターが闇属性モンスターに与えるダメージを200アップ。
   */
  C0000401: [
    {
      type: CONTINUOUS_EFFECT_TYPES.DAMAGE_DEALT_MODIFIER,
      description: '自分の他のモンスターが闇属性モンスターに与えるダメージを200アップ',
      value: 200,
      condition: { notAttribute: '闇' }, // 自分が闘属性でない場合
      // Note: 相手が闇属性の場合にダメージ増加。これは特殊な条件
      specialCondition: 'TARGET_IS_DARK',
    },
  ],
};
