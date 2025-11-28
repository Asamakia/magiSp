/**
 * カードコレクションシステム - データマイグレーション
 *
 * ストレージのバージョンアップ時にデータを移行する
 */

// ========================================
// マイグレーション関数
// ========================================

/**
 * データを指定バージョンに移行
 * @param {Object} data - 元データ
 * @param {number} fromVersion - 元バージョン
 * @param {number} toVersion - 移行先バージョン
 * @returns {Object} 移行後のデータ
 */
export const migrate = (data, fromVersion, toVersion) => {
  let migrated = { ...data };
  let currentVersion = fromVersion;

  // バージョンを1つずつ上げていく
  while (currentVersion < toVersion) {
    const migrationFn = MIGRATIONS[currentVersion];
    if (migrationFn) {
      migrated = migrationFn(migrated);
      console.log(`Migrated data from v${currentVersion} to v${currentVersion + 1}`);
    }
    currentVersion++;
  }

  return migrated;
};

// ========================================
// バージョン別マイグレーション
// ========================================

const MIGRATIONS = {
  // v1 -> v2 のマイグレーション（将来用）
  // 1: (data) => {
  //   return {
  //     ...data,
  //     // 新しいフィールドを追加
  //     newField: defaultValue,
  //   };
  // },
};

export default migrate;
