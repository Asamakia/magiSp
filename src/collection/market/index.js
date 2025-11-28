/**
 * 動的市場システム - メインエクスポート
 */

// 定数
export * from './constants';

// 週間トレンド
export * from './weeklyTrend';

// ニュース生成
export * from './newsGenerator';

// 市場エンジン
export * from './marketEngine';

// データ - 基本
export * from './data/categories';
export * from './data/reasons';

// データ - パターン2〜8
export * from './data/persons';
export * from './data/locations';
export * from './data/rumors';
export * from './data/comparisons';
export * from './data/supplyDemand';
export * from './data/seasonal';
export * from './data/characters';

// デフォルトエクスポート
import marketEngine from './marketEngine';
export default marketEngine;
