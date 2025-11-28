/**
 * カードコレクションシステム - 永続化抽象レイヤー
 *
 * 将来の移行（IndexedDB、クラウド同期等）を容易にするための抽象化
 * 現在はlocalStorageを使用
 */

import { STORAGE } from './constants';
import { migrate } from './migration';

// ========================================
// ストレージ操作
// ========================================

/**
 * プレイヤーデータを保存
 * @param {Object} data - プレイヤーデータ
 */
export const save = (data) => {
  try {
    const wrapped = {
      version: STORAGE.VERSION,
      data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE.KEY, JSON.stringify(wrapped));
    return true;
  } catch (error) {
    console.error('Failed to save player data:', error);
    return false;
  }
};

/**
 * プレイヤーデータを読み込み
 * @returns {Object|null} プレイヤーデータ、存在しない場合はnull
 */
export const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE.KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const { version, data } = parsed;

    // バージョンが古い場合はマイグレーション
    if (version < STORAGE.VERSION) {
      const migrated = migrate(data, version, STORAGE.VERSION);
      // マイグレーション後のデータを保存
      save(migrated);
      return migrated;
    }

    return data;
  } catch (error) {
    console.error('Failed to load player data:', error);
    return null;
  }
};

/**
 * プレイヤーデータを削除
 */
export const clear = () => {
  try {
    localStorage.removeItem(STORAGE.KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear player data:', error);
    return false;
  }
};

/**
 * プレイヤーデータが存在するか確認
 * @returns {boolean}
 */
export const exists = () => {
  return localStorage.getItem(STORAGE.KEY) !== null;
};

/**
 * プレイヤーデータをJSON文字列としてエクスポート（バックアップ用）
 * @returns {string|null}
 */
export const exportData = () => {
  return localStorage.getItem(STORAGE.KEY);
};

/**
 * JSON文字列からプレイヤーデータをインポート（復元用）
 * @param {string} jsonString - エクスポートされたJSON文字列
 * @returns {boolean} 成功したかどうか
 */
export const importData = (jsonString) => {
  try {
    // JSONとして有効か確認
    const parsed = JSON.parse(jsonString);
    if (!parsed.version || !parsed.data) {
      throw new Error('Invalid data format');
    }
    localStorage.setItem(STORAGE.KEY, jsonString);
    return true;
  } catch (error) {
    console.error('Failed to import player data:', error);
    return false;
  }
};

/**
 * 最終更新日時を取得
 * @returns {number|null} タイムスタンプ、存在しない場合はnull
 */
export const getLastUpdated = () => {
  try {
    const raw = localStorage.getItem(STORAGE.KEY);
    if (!raw) return null;
    const { updatedAt } = JSON.parse(raw);
    return updatedAt || null;
  } catch (error) {
    return null;
  }
};

// ========================================
// エクスポート（統一インターフェース）
// ========================================

export const storage = {
  save,
  load,
  clear,
  exists,
  export: exportData,
  import: importData,
  getLastUpdated,
};

export default storage;
