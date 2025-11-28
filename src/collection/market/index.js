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

// データ
export * from './data/categories';
export * from './data/reasons';

// デフォルトエクスポート
import marketEngine from './marketEngine';
export default marketEngine;
