/**
 * useMediaQuery - レスポンシブ対応用フック
 *
 * メディアクエリの状態を監視し、マッチ状態を返す
 */

import { useState, useEffect } from 'react';

/**
 * メディアクエリの状態を監視するフック
 *
 * @param {string} query - メディアクエリ文字列 (例: '(max-width: 768px)')
 * @returns {boolean} - クエリにマッチしているかどうか
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    // SSR対応: windowが存在しない場合はfalseを返す
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);

    // 初期値を設定
    setMatches(mediaQuery.matches);

    // 変更を監視
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
};

/**
 * モバイル判定フック
 *
 * @returns {boolean} - モバイル幅かどうか
 */
export const useIsMobile = () => {
  return useMediaQuery('(max-width: 768px)');
};

/**
 * タブレット判定フック
 *
 * @returns {boolean} - タブレット幅かどうか
 */
export const useIsTablet = () => {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
};

/**
 * デスクトップ判定フック
 *
 * @returns {boolean} - デスクトップ幅かどうか
 */
export const useIsDesktop = () => {
  return useMediaQuery('(min-width: 1025px)');
};

export default useMediaQuery;
