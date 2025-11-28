/**
 * 動的市場システム - 需要供給型パターンデータ
 * パターン6: 紐づけ不要（対象リストのみ）
 */

/**
 * 需要供給の対象リスト
 */
export const SUPPLY_DEMAND_TARGETS = [
  { target: { minRarity: 'UR' }, label: 'URカード' },
  { target: { minRarity: 'SR' }, label: '高レアカード' },
  { target: { tiers: ['S'] }, label: 'Sティア' },
  { target: { tiers: ['D'] }, label: 'Dティア' },
  { target: { attribute: '炎' }, label: '炎属性' },
  { target: { attribute: '水' }, label: '水属性' },
  { target: { attribute: '光' }, label: '光属性' },
  { target: { attribute: '闇' }, label: '闘属性' },
  { target: { attribute: '原始' }, label: '原始属性' },
  { target: { attribute: '未来' }, label: '未来属性' },
  { target: { keyword: '禁忌' }, label: '禁忌カード' },
  { target: { maxCost: 2 }, label: '低コストカード' },
  { target: { minCost: 6 }, label: '高コストカード' },
];

/**
 * 需要供給タイプ
 */
export const SUPPLY_DEMAND_TYPES = [
  { type: '需要', change: '急増', direction: 'up', min: 20, max: 35 },
  { type: '需要', change: '減少', direction: 'down', min: -20, max: -35 },
  { type: '供給', change: '過多', direction: 'down', min: -15, max: -30 },
  { type: '供給', change: '不足', direction: 'up', min: 15, max: 30 },
];

/**
 * テンプレート
 */
export const SUPPLY_DEMAND_TEMPLATES = [
  '${label}の${type}が${change}、価格に影響',
  '${label}、${type}${change}で相場変動',
  '市場動向：${label}に${type}${change}の兆候',
  '${label}の${type}${change}が話題に',
];
