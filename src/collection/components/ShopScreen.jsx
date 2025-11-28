/**
 * ショップ画面
 *
 * パック購入とカード売却導線を提供
 * 動的市場システム対応 - ニュース・トレンド表示
 */

import React, { useState } from 'react';
import { currencyManager, packSystem, ECONOMY, DAYS_PER_WEEK } from '../index';

// ========================================
// スタイル定義
// ========================================

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)',
    fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
  },
  header: {
    background: 'linear-gradient(90deg, rgba(20,20,50,0.95) 0%, rgba(40,20,60,0.95) 50%, rgba(20,20,50,0.95) 100%)',
    borderBottom: '2px solid #6b4ce6',
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(107,76,230,0.3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'rgba(107,76,230,0.3)',
    color: '#e0e0e0',
    transition: 'all 0.3s ease',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #ffd700, #ff9500, #ffd700)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  goldDisplay: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  mainContent: {
    flex: 1,
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#e0e0e0',
    marginBottom: '16px',
    textAlign: 'center',
  },
  packSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  packCard: {
    background: 'linear-gradient(135deg, #2a2a4a 0%, #3a3a5a 50%, #2a2a4a 100%)',
    borderRadius: '16px',
    padding: '32px',
    width: '300px',
    border: '2px solid #6b4ce6',
    boxShadow: '0 0 30px rgba(107,76,230,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.3s ease',
  },
  packName: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  packImage: {
    width: '120px',
    height: '160px',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    boxShadow: '0 4px 15px rgba(107,76,230,0.5)',
  },
  packInfo: {
    fontSize: '14px',
    color: '#a0a0a0',
    textAlign: 'center',
  },
  packPrice: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  buyButton: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    color: '#fff',
    transition: 'all 0.3s ease',
    width: '100%',
  },
  buyButtonDisabled: {
    background: 'rgba(100,100,100,0.5)',
    cursor: 'not-allowed',
  },
  buyButtonHover: {
    background: 'linear-gradient(135deg, #7b5cf6 0%, #ad5cf6 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 15px rgba(107,76,230,0.5)',
  },
  divider: {
    width: '80%',
    maxWidth: '400px',
    height: '1px',
    background: 'linear-gradient(90deg, transparent 0%, rgba(107,76,230,0.5) 50%, transparent 100%)',
    margin: '16px 0',
  },
  sellSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  sellButton: {
    padding: '12px 32px',
    borderRadius: '8px',
    border: '1px solid rgba(107,76,230,0.5)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'rgba(30,30,50,0.8)',
    color: '#e0e0e0',
    transition: 'all 0.3s ease',
  },
  sellHint: {
    fontSize: '13px',
    color: '#808080',
  },
  errorMessage: {
    padding: '12px 24px',
    background: 'rgba(255,100,100,0.2)',
    border: '1px solid rgba(255,100,100,0.5)',
    borderRadius: '8px',
    color: '#ff6b6b',
    fontSize: '14px',
  },
  successMessage: {
    padding: '12px 24px',
    background: 'rgba(100,255,100,0.2)',
    border: '1px solid rgba(100,255,100,0.5)',
    borderRadius: '8px',
    color: '#6bff6b',
    fontSize: '14px',
  },
  statsSection: {
    marginTop: 'auto',
    padding: '16px 24px',
    background: 'rgba(20,20,40,0.8)',
    borderTop: '1px solid rgba(107,76,230,0.3)',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '16px 32px',
  },
  statItem: {
    fontSize: '13px',
    color: '#a0a0a0',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#e0e0e0',
  },
  // マーケットニュースパネル
  marketNewsPanel: {
    width: '100%',
    maxWidth: '500px',
    background: 'linear-gradient(135deg, rgba(20,30,50,0.9) 0%, rgba(30,40,60,0.9) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(107,156,230,0.5)',
    padding: '16px',
    boxShadow: '0 4px 20px rgba(107,156,230,0.2)',
  },
  marketNewsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(107,156,230,0.3)',
  },
  marketNewsIcon: {
    fontSize: '20px',
  },
  marketNewsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#9dc4ff',
  },
  marketDayCounter: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: '#808080',
  },
  trendSection: {
    marginBottom: '12px',
    padding: '10px',
    background: 'rgba(107,156,230,0.1)',
    borderRadius: '8px',
  },
  trendLabel: {
    fontSize: '12px',
    color: '#6ba0e0',
    marginBottom: '4px',
  },
  trendName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#e0e0e0',
    marginBottom: '4px',
  },
  trendEffects: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  trendEffectUp: {
    color: '#6bff6b',
  },
  trendEffectDown: {
    color: '#ff6b6b',
  },
  newsSection: {
    padding: '10px',
    background: 'rgba(255,200,100,0.1)',
    borderRadius: '8px',
    borderLeft: '3px solid #ffc864',
  },
  newsLabel: {
    fontSize: '12px',
    color: '#c8a050',
    marginBottom: '4px',
  },
  newsText: {
    fontSize: '13px',
    color: '#e0e0e0',
    lineHeight: '1.5',
  },
  newsModifier: {
    marginTop: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  modifierUp: {
    color: '#6bff6b',
  },
  modifierDown: {
    color: '#ff6b6b',
  },
  // 突発イベントセクション
  suddenEventSection: {
    marginTop: '12px',
    padding: '12px',
    background: 'linear-gradient(135deg, rgba(255,50,50,0.15) 0%, rgba(255,100,50,0.1) 100%)',
    borderRadius: '8px',
    border: '1px solid rgba(255,100,100,0.4)',
    borderLeft: '3px solid #ff6b6b',
  },
  suddenEventLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#ff8080',
    marginBottom: '6px',
    fontWeight: 'bold',
  },
  suddenEventName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffa0a0',
    marginBottom: '4px',
  },
  suddenEventEffects: {
    fontSize: '12px',
    color: '#e0e0e0',
    lineHeight: '1.6',
  },
  suddenEventEffect: {
    marginBottom: '2px',
  },
  weekProgress: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: '#808080',
  },
  weekProgressBar: {
    flex: 1,
    height: '4px',
    background: 'rgba(107,156,230,0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  weekProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6ba0e0, #9dc4ff)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
};

// ========================================
// メインコンポーネント
// ========================================

const ShopScreen = ({
  playerData,
  allCards,
  cardValueMap,
  onBack,
  onOpenPack,
  onGoToCollection,
  onPlayerDataUpdate,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const packInfo = packSystem.getPackInfo();
  const canBuy = currencyManager.canBuyPack(playerData);

  // パック購入処理
  const handleBuyPack = async () => {
    if (!canBuy || isProcessing) return;

    setIsProcessing(true);
    setMessage(null);

    // 購入処理
    const result = packSystem.buyAndOpenPack(playerData, allCards, cardValueMap);

    if (result.success) {
      // プレイヤーデータを更新
      onPlayerDataUpdate(result.playerData);
      // パック開封画面へ
      onOpenPack(result.cards);
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setIsProcessing(false);
  };

  // ボタンスタイル計算
  const getBuyButtonStyle = () => {
    if (!canBuy || isProcessing) {
      return { ...styles.buyButton, ...styles.buyButtonDisabled };
    }
    if (isHovered) {
      return { ...styles.buyButton, ...styles.buyButtonHover };
    }
    return styles.buyButton;
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={onBack}
            onMouseEnter={(e) => e.target.style.background = 'rgba(107,76,230,0.5)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(107,76,230,0.3)'}
          >
            ← 戻る
          </button>
          <span style={styles.title}>ショップ</span>
        </div>
        <div style={styles.goldDisplay}>
          💰 {currencyManager.formatGold(playerData.gold)}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        {/* メッセージ表示 */}
        {message && (
          <div style={message.type === 'error' ? styles.errorMessage : styles.successMessage}>
            {message.text}
          </div>
        )}

        {/* マーケットニュースパネル */}
        {playerData.market && (
          <div style={styles.marketNewsPanel}>
            <div style={styles.marketNewsHeader}>
              <span style={styles.marketNewsIcon}>📰</span>
              <span style={styles.marketNewsTitle}>マーケットニュース</span>
              <span style={styles.marketDayCounter}>
                Day {playerData.market.currentDay + 1}
              </span>
            </div>

            {/* 週間トレンド */}
            {playerData.market.weeklyTrend && (
              <div style={styles.trendSection}>
                <div style={styles.trendLabel}>📅 週間トレンド</div>
                <div style={styles.trendName}>
                  {playerData.market.weeklyTrend.name}
                </div>
                <div style={styles.trendEffects}>
                  {playerData.market.weeklyTrend.effects.map((effect, i) => {
                    const targetText = effect.target.attribute
                      ? `${effect.target.attribute}属性`
                      : effect.target.all
                        ? '全体'
                        : effect.target.maxCost !== undefined
                          ? `コスト${effect.target.maxCost}以下`
                          : effect.target.minCost !== undefined
                            ? `コスト${effect.target.minCost}以上`
                            : effect.target.keyword
                              ? `${effect.target.keyword}`
                              : effect.target.tiers
                                ? `${effect.target.tiers.join('/')}ティア`
                                : effect.target.minRarity
                                  ? `${effect.target.minRarity}以上`
                                  : '対象';
                    const modifierStyle = effect.modifier > 0
                      ? styles.trendEffectUp
                      : effect.modifier < 0
                        ? styles.trendEffectDown
                        : {};
                    return (
                      <span key={i} style={{ marginRight: '12px', ...modifierStyle }}>
                        {targetText} {effect.modifier > 0 ? '+' : ''}{effect.modifier}%
                      </span>
                    );
                  })}
                </div>
                {/* 週進行バー */}
                <div style={styles.weekProgress}>
                  <span>次週まで</span>
                  <div style={styles.weekProgressBar}>
                    <div
                      style={{
                        ...styles.weekProgressFill,
                        width: `${((playerData.market.currentDay - playerData.market.weeklyTrend.startDay) / DAYS_PER_WEEK) * 100}%`,
                      }}
                    />
                  </div>
                  <span>
                    {DAYS_PER_WEEK - (playerData.market.currentDay - playerData.market.weeklyTrend.startDay)}戦
                  </span>
                </div>
              </div>
            )}

            {/* デイリーニュース */}
            {playerData.market.dailyNews && (
              <div style={styles.newsSection}>
                <div style={styles.newsLabel}>📰 本日のニュース</div>
                <div style={styles.newsText}>
                  「{playerData.market.dailyNews.text}」
                </div>
                <div
                  style={{
                    ...styles.newsModifier,
                    ...(playerData.market.dailyNews.modifier > 0
                      ? styles.modifierUp
                      : styles.modifierDown),
                  }}
                >
                  → {playerData.market.dailyNews.target.category
                    ? `[${playerData.market.dailyNews.target.category}]`
                    : playerData.market.dailyNews.target.attribute
                      ? `[${playerData.market.dailyNews.target.attribute}属性]`
                      : '[対象]'}
                  {' '}
                  {playerData.market.dailyNews.modifier > 0 ? '+' : ''}
                  {playerData.market.dailyNews.modifier}%
                </div>
              </div>
            )}

            {/* 突発イベント */}
            {playerData.market.suddenEvent && (
              <div style={styles.suddenEventSection}>
                <div style={styles.suddenEventLabel}>
                  <span>⚡</span>
                  <span>突発イベント発生中！</span>
                </div>
                <div style={styles.suddenEventName}>
                  {playerData.market.suddenEvent.name}
                </div>
                <div style={styles.suddenEventEffects}>
                  {playerData.market.suddenEvent.effects.map((effect, i) => {
                    // ターゲットの説明テキストを生成
                    let targetText = '';
                    const t = effect.target;
                    if (t.all) targetText = '全カード';
                    else if (t.attribute) targetText = `${t.attribute}属性`;
                    else if (t.category) targetText = `[${t.category}]`;
                    else if (t.minRarity) targetText = `${t.minRarity}以上`;
                    else if (t.maxRarity) targetText = `${t.maxRarity}以下`;
                    else if (t.minCost !== undefined) targetText = `コスト${t.minCost}以上`;
                    else if (t.maxCost !== undefined) targetText = `コスト${t.maxCost}以下`;
                    else if (t.tiers) targetText = `${t.tiers.join('/')}ティア`;
                    else if (t.keyword) targetText = t.keyword;
                    else if (t.type) targetText = `${t.type}カード`;
                    else targetText = '対象';

                    const isUp = effect.modifier > 0;
                    return (
                      <div key={i} style={styles.suddenEventEffect}>
                        <span>{targetText}: </span>
                        <span style={isUp ? styles.modifierUp : styles.modifierDown}>
                          {isUp ? '+' : ''}{effect.modifier}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* パック購入セクション */}
        <div style={styles.packSection}>
          <div style={styles.sectionTitle}>パック購入</div>

          <div
            style={{
              ...styles.packCard,
              ...(isHovered && canBuy ? { transform: 'translateY(-4px)' } : {}),
            }}
          >
            <div style={styles.packName}>スタンダードパック</div>

            <div style={styles.packImage}>🎴</div>

            <div style={styles.packInfo}>
              {packInfo.cardsPerPack}枚入り
            </div>

            <div style={styles.packPrice}>
              {packInfo.priceFormatted}
            </div>

            <button
              style={getBuyButtonStyle()}
              onClick={handleBuyPack}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={!canBuy || isProcessing}
            >
              {isProcessing ? '処理中...' : canBuy ? '購入する' : 'G不足'}
            </button>

            {!canBuy && (
              <div style={{ fontSize: '12px', color: '#ff6b6b' }}>
                あと {currencyManager.formatGold(ECONOMY.PACK_PRICE - playerData.gold)} 必要
              </div>
            )}
          </div>
        </div>

        {/* 区切り線 */}
        <div style={styles.divider} />

        {/* カード売却セクション */}
        <div style={styles.sellSection}>
          <div style={styles.sectionTitle}>カード売却</div>

          <button
            style={styles.sellButton}
            onClick={onGoToCollection}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(107,76,230,0.3)';
              e.target.style.borderColor = 'rgba(107,76,230,0.8)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(30,30,50,0.8)';
              e.target.style.borderColor = 'rgba(107,76,230,0.5)';
            }}
          >
            コレクションから選択 →
          </button>

          <div style={styles.sellHint}>
            コレクション画面でカードを選択して売却できます
          </div>
        </div>
      </div>

      {/* 統計フッター */}
      <div style={styles.statsSection}>
        <div style={styles.statItem}>
          開封済み: <span style={styles.statValue}>{playerData.stats?.packsOpened || 0}</span> パック
        </div>
        <div style={styles.statItem}>
          累計使用: <span style={styles.statValue}>{currencyManager.formatGold(playerData.stats?.totalGoldSpent || 0)}</span>
        </div>
        <div style={styles.statItem}>
          累計獲得: <span style={styles.statValue}>{currencyManager.formatGold(playerData.stats?.totalGoldEarned || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default ShopScreen;
