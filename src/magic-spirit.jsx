import React, { useState, useEffect, useCallback } from 'react';

// ========================================
// CSVパーサー関数
// ========================================
const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const cards = [];
  let i = 1; // ヘッダー行をスキップ

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // CSVの各フィールドをパース（引用符で囲まれた複数行テキストに対応）
    const fields = [];
    let currentField = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField);

    // 引用符内で改行がある場合、次の行も読み込む
    while (inQuotes && i + 1 < lines.length) {
      i++;
      currentField += '\n' + lines[i];
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuotes = !inQuotes;
        }
      }
      if (!inQuotes) {
        fields[fields.length - 1] = currentField;
      }
    }

    // カードオブジェクトを作成
    if (fields.length >= 11) {
      const [id, name, attribute, cost, type, keyword, attack, hp, category, effect, flavor] = fields;

      // カテゴリを配列に変換（【ドラゴン】【スライム】 → ['ドラゴン', 'スライム']）
      const categoryArray = category ? category.match(/【([^】]+)】/g)?.map(c => c.replace(/【|】/g, '')) || [] : [];

      // キーワード能力を配列に変換（【覚醒】【刹那詠唱】 → ['覚醒', '刹那詠唱']）
      const keywordArray = keyword ? keyword.match(/【([^】]+)】/g)?.map(k => k.replace(/【|】/g, '')) || [] : [];

      // 禁忌カードフラグのチェック
      const isForbidden = keywordArray.includes('禁忌カード');

      // 技情報の抽出（モンスターカードのみ）
      const trimmedType = type.trim();
      const skills = trimmedType === 'monster' ? parseSkills(effect.trim()) : { basicSkill: null, advancedSkill: null };

      cards.push({
        id: id.trim(),
        name: name.trim(),
        attribute: attribute.trim(),
        cost: parseInt(cost) || 0,
        type: trimmedType,
        keyword: keywordArray, // 配列形式に変更
        keywordText: keyword.trim(), // 表示用の元のテキスト
        attack: attack ? parseInt(attack) : undefined,
        hp: hp ? parseInt(hp) : undefined,
        category: categoryArray,
        categoryText: category.trim(), // 表示用の元のテキスト
        effect: effect.trim(),
        flavor: flavor?.trim() || '',
        isForbidden: isForbidden, // 禁忌カードフラグ
        basicSkill: skills.basicSkill, // 基本技
        advancedSkill: skills.advancedSkill, // 上級技
      });
    }

    i++;
  }

  return cards;
};

// ========================================
// 技効果パーサー関数
// ========================================
const parseSkills = (effectText) => {
  if (!effectText) return { basicSkill: null, advancedSkill: null };

  const skills = {
    basicSkill: null,
    advancedSkill: null,
  };

  // 基本技のパターンマッチ
  const basicMatch = effectText.match(/基本技[：:]\s*([^。\n]+)/);
  if (basicMatch) {
    const skillText = basicMatch[1].trim();
    skills.basicSkill = {
      text: skillText,
      attribute: null, // デフォルトは同属性
      cost: 1, // 基本技はチャージ1枚
    };

    // 「任意」が含まれているかチェック
    if (effectText.match(/基本技.*任意/)) {
      skills.basicSkill.attribute = 'any';
    }
  }

  // 上級技のパターンマッチ
  const advancedMatch = effectText.match(/上級技[：:]\s*([^。\n]+)/);
  if (advancedMatch) {
    const skillText = advancedMatch[1].trim();
    skills.advancedSkill = {
      text: skillText,
      attribute: null, // デフォルトは同属性
      cost: 2, // 上級技はチャージ2枚
    };

    // 「任意」が含まれているかチェック
    if (effectText.match(/上級技.*任意/)) {
      skills.advancedSkill.attribute = 'any';
    }
  }

  return skills;
};

// ========================================
// カードデータ（プロトタイプ用サンプル - CSVロード失敗時のフォールバック）
// ========================================
const SAMPLE_CARDS = [
  // 炎属性モンスター
  { id: 'C0000021', name: 'フレア・ドラゴン', attribute: '炎', cost: 3, type: 'monster', attack: 1800, hp: 1500, category: ['ドラゴン'], categoryText: '【ドラゴン】', keyword: [], keywordText: '', effect: '召喚時、相手プレイヤーに300ダメージ。基本技：攻撃力の半分のダメージを相手モンスター1体に与える。', flavor: '炎の翼を広げ、灼熱の息吹で全てを焼き尽くす。', isForbidden: false },
  { id: 'C0000025', name: 'ブレイズ・ドラゴン', attribute: '炎', cost: 2, type: 'monster', attack: 1200, hp: 1200, category: ['ドラゴン'], categoryText: '【ドラゴン】', keyword: [], keywordText: '', effect: '破壊時、デッキから【ドラゴン】1体を手札に加える。', flavor: '炎の使者が現れ、敵に熱波を送り込む。', isForbidden: false },
  { id: 'C0000026', name: 'インフェルノ・ドラゴン', attribute: '炎', cost: 3, type: 'monster', attack: 1600, hp: 1800, category: ['ドラゴン'], categoryText: '【ドラゴン】', keyword: [], keywordText: '', effect: '攻撃時、相手モンスターの攻撃力を300下げる。', flavor: '地獄の炎を纏い、敵を焼き尽くす龍。', isForbidden: false },
  { id: 'C0000023', name: 'レッドバーストドラゴン', attribute: '炎', cost: 5, type: 'monster', attack: 2500, hp: 2700, category: ['ドラゴン'], categoryText: '【ドラゴン】', keyword: ['覚醒'], keywordText: '【覚醒】', effect: '【覚醒】バトルフェイズ開始時に300ダメージ。覚醒時攻撃力+1000。', flavor: '紅蓮の爆発と共に覚醒し、敵を焼き尽くす龍。', isForbidden: false },
  // 炎属性魔法
  { id: 'C0000022', name: 'バーニング・ブレス', attribute: '炎', cost: 2, type: 'magic', keyword: ['刹那詠唱'], keywordText: '【刹那詠唱】', effect: '【刹那詠唱】相手モンスター1体に1000ダメージ、相手プレイヤーに500ダメージ。', isForbidden: false },
  { id: 'C0000031', name: '炎の咆哮', attribute: '炎', cost: 2, type: 'magic', effect: 'ドラゴン1体の攻撃力+500、相手プレイヤーに300ダメージ。' },
  // 炎属性フィールド
  { id: 'C0000037', name: 'ドラゴンの火山', attribute: '炎', cost: 3, type: 'field', effect: 'ドラゴンの攻撃力+400。ターン終了時、相手モンスターに300ダメージ。' },

  // 水属性モンスター
  { id: 'C0000039', name: 'アクア・メイデン', attribute: '水', cost: 3, type: 'monster', attack: 1300, hp: 1700, category: '【タイドウェーブ】', effect: '召喚時、相手モンスター1体を「眠り」状態にする。', flavor: '水の乙女が優しく敵を眠らせる。' },
  { id: 'C0000040', name: 'シー・サーペント', attribute: '水', cost: 4, type: 'monster', attack: 2000, hp: 3200, category: '【スネーク】【タイドウェーブ】', effect: 'なし', flavor: '海の深淵から現れた蛇が、全てを飲み込む。' },
  { id: 'C0000044', name: '水晶のマーメイド', attribute: '水', cost: 3, type: 'monster', attack: 1200, hp: 1600, category: '【マーメイド】【タイドウェーブ】', effect: '召喚時、手札の水属性モンスターのSPコスト-1。', flavor: '水晶のように輝く人魚が、仲間を導く。' },
  { id: 'C0000043', name: '深海のクラーケン', attribute: '水', cost: 4, type: 'monster', attack: 1800, hp: 2800, category: '【ビースト】【ディープシャドウ】', effect: '基本技：コスト4以下の相手モンスター1体を「凍結」状態にする。', flavor: '深海の巨獣が触手を伸ばし、敵を絡め取る。' },
  // 水属性魔法
  { id: 'C0000051', name: 'リヴァイアサンの奔流', attribute: '水', cost: 4, type: 'magic', effect: '相手モンスター全てに水属性モンスターの数×400ダメージ。' },
  { id: 'C0000047', name: 'マーメイドの恵み', attribute: '水', cost: 2, type: 'magic', effect: '次のターンのSPトークン増加量+1。' },
  // 水属性フィールド
  { id: 'C0000053', name: '母なる大海', attribute: '水', cost: 3, type: 'field', effect: '水属性攻撃力+300。ターン終了時、SPトークン1つをアクティブ化。' },

  // 光属性モンスター
  { id: 'C0000056', name: '輝聖女ルミナス', attribute: '光', cost: 4, type: 'monster', attack: 1800, hp: 2400, category: '【ヒューマノイド】【ルミナフォース】', effect: '毎ターン終了時、相手モンスターの攻撃力-200。上級技：光属性モンスター1体をコストなしで召喚。', flavor: '聖なる光を放つ乙女が、闇を浄化する。' },
  { id: 'C0000059', name: '光の騎士', attribute: '光', cost: 2, type: 'monster', attack: 1000, hp: 1200, category: '【ヒューマノイド】', effect: '召喚時、デッキから「光の」魔法カード1枚を手札に加える。', flavor: '光の剣を手に持つ騎士が、希望を導く。' },
  { id: 'C0000058', name: 'エンジェル・セラフィム', attribute: '光', cost: 5, type: 'monster', attack: 2200, hp: 2900, category: '【天使】【ルミナフォース】', effect: '相手がモンスターを召喚するたび200ダメージ。', flavor: '天界の使者が、聖なる裁きを下す。' },
  { id: 'C0000063', name: '聖獣フェニックス', attribute: '光', cost: 5, type: 'monster', attack: 2000, hp: 3000, category: '【フェニックス】【スカイレジェンド】', effect: '墓地にある時、ライフが半分以下になると場に戻る（1度だけ）。', flavor: '聖なる炎に包まれた鳥が、灰から再び舞い上がる。' },
  // 光属性魔法
  { id: 'C0000065', name: '天使の波動', attribute: '光', cost: 2, type: 'magic', effect: '【刹那詠唱】光属性モンスターの数×300ダメージを相手モンスター全体に与える。', keyword: '【刹那詠唱】' },
  { id: 'C0000066', name: 'ホーリーライトサモン', attribute: '光', cost: 3, type: 'magic', effect: 'デッキからコスト3以下の光属性モンスター1体を場に出す。' },
  // 光属性フィールド
  { id: 'C0000071', name: 'クリスタルサンクチュアリ', attribute: '光', cost: 3, type: 'field', effect: '光属性攻撃力+500。ターン終了時ライフ+500回復。' },

  // 闇属性モンスター
  { id: 'C0000077', name: '闇の亡霊', attribute: '闇', cost: 3, type: 'monster', attack: 1200, hp: 1400, category: '【ゴースト】', effect: '破壊時、相手モンスター1体に1200ダメージ。', flavor: '亡魂が敵の手札を奪い、怨念を残す。' },
  { id: 'C0000079', name: '深淵の騎士', attribute: '闇', cost: 3, type: 'monster', attack: 1400, hp: 1700, category: '【アビスソウル】', effect: '基本技：このターン2回攻撃可能。', flavor: '深淵から現れた騎士が、敵を次々と切り裂く。' },
  { id: 'C0000078', name: '禁忌の傀儡師', attribute: '闘', cost: 4, type: 'monster', attack: 1600, hp: 1900, category: '【アビスソウル】【パペットマスター】', effect: '基本技：墓地の闇属性モンスター1体を場に戻す（弱体化）。', flavor: '禁忌の操り手が、死者を玩具に変える。' },
  // 闇属性魔法
  { id: 'C0000075', name: 'シャドウ・バインド', attribute: '闇', cost: 2, type: 'magic', effect: '【刹那詠唱】相手モンスター1体を1ターン行動不能にする。', keyword: '【刹那詠唱】' },

  // 原始属性モンスター
  { id: 'C0000001', name: '粘液獣・開花', attribute: '原始', cost: 2, type: 'monster', attack: 200, hp: 300, category: '【プラント】【スライム】', effect: 'エンドフェイズに分裂。破壊時「粘液獣の種子」を生成。', flavor: '春の訪れと共に咲き乱れ、粘液の花が無限に広がる。' },
  { id: 'C0000007', name: '粘液獣・キング', attribute: '原始', cost: 6, type: 'monster', attack: 1000, hp: 1300, category: '【コア・ビースト】【スライム】', effect: '場の粘液獣1体につき攻撃力+1500。基本技：相手の効果を全て無効化。', flavor: '群れを率いる王が、敵の力を奪い支配する。' },
  // 原始属性魔法
  { id: 'C0000012', name: '粘液の増殖', attribute: '原始', cost: 2, type: 'magic', effect: '粘液獣1体を分裂させる（攻撃力半分）。' },

  // なし（無色）
  { id: 'C0000401', name: '呪術狩りの傭兵バランド', attribute: 'なし', cost: 3, type: 'monster', attack: 1400, hp: 1500, category: '【ヒューマノイド】【ライバル】', effect: '他のモンスターが闇属性に与えるダメージ+200。', flavor: '呪剣を手に戦う傭兵。' },
];

// ========================================
// 定数
// ========================================
const INITIAL_LIFE = 6000;
const INITIAL_SP = 1;
const MAX_SP = 10;
const INITIAL_HAND_SIZE = 5;
const DECK_SIZE = 40;
const COUNTER_ATTACK_RATE = 0.3;

const PHASES = ['ターン開始', 'ドロー', 'メイン', 'バトル', 'エンド'];

const ATTRIBUTE_COLORS = {
  '炎': { bg: 'linear-gradient(135deg, #ff4d4d 0%, #ff8533 100%)', text: '#fff', glow: '#ff6b35' },
  '水': { bg: 'linear-gradient(135deg, #4da6ff 0%, #66d9ff 100%)', text: '#fff', glow: '#4da6ff' },
  '光': { bg: 'linear-gradient(135deg, #ffd700 0%, #fff8dc 100%)', text: '#333', glow: '#ffd700' },
  '闇': { bg: 'linear-gradient(135deg, #4a0080 0%, #1a0033 100%)', text: '#e0b0ff', glow: '#9933ff' },
  '未来': { bg: 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)', text: '#fff', glow: '#00ffff' },
  '原始': { bg: 'linear-gradient(135deg, #2d5016 0%, #6b8e23 100%)', text: '#fff', glow: '#7cfc00' },
  'なし': { bg: 'linear-gradient(135deg, #808080 0%, #a9a9a9 100%)', text: '#fff', glow: '#c0c0c0' },
};

const TYPE_ICONS = {
  'monster': '⚔️',
  'magic': '✨',
  'field': '🏔️',
  'phase': '🔮',
  'phasecard': '🔮', // フェイズカード
};

// ========================================
// ユーティリティ関数
// ========================================
const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const createDeck = (cardPool = SAMPLE_CARDS) => {
  // カードプールからランダムに40枚生成
  let deck = [];
  const availableCards = cardPool.filter(c =>
    c.type === 'monster' || c.type === 'magic' || c.type === 'field' || c.type === 'phasecard'
  );

  if (availableCards.length === 0) {
    console.error('利用可能なカードがありません');
    return [];
  }

  while (deck.length < DECK_SIZE) {
    const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    const count = deck.filter(c => c.id === randomCard.id).length;

    // 禁忌カードは1枚まで
    const maxCount = randomCard.isForbidden ? 1 : 3;

    if (count < maxCount) {
      deck.push({ ...randomCard, uniqueId: `${randomCard.id}-${Date.now()}-${Math.random()}` });
    }
  }
  return shuffle(deck);
};

const createMonsterInstance = (card) => ({
  ...card,
  currentHp: card.hp,
  currentAttack: card.attack,
  canAttack: false,
  charges: [],
  statusEffects: [],
});

// ========================================
// スタイル
// ========================================
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)',
    fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    color: '#e0e0e0',
    overflow: 'hidden',
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
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #ff6b9d, #c44dff, #6b9dff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(196,77,255,0.5)',
    letterSpacing: '2px',
  },
  gameBoard: {
    display: 'grid',
    gridTemplateRows: '1fr auto 1fr',
    height: 'calc(100vh - 70px)',
    gap: '8px',
    padding: '12px',
  },
  playerArea: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 180px',
    gap: '12px',
    padding: '8px',
    borderRadius: '12px',
  },
  infoPanel: {
    background: 'rgba(20,20,40,0.8)',
    borderRadius: '12px',
    padding: '12px',
    border: '1px solid rgba(107,76,230,0.3)',
  },
  fieldArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  monsterZone: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    minHeight: '140px',
  },
  cardSlot: {
    width: '100px',
    height: '130px',
    border: '2px dashed rgba(107,76,230,0.4)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(20,20,40,0.5)',
    transition: 'all 0.3s ease',
  },
  handArea: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    padding: '8px',
    minHeight: '150px',
    overflowX: 'auto',
  },
  centerZone: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '40px',
    padding: '12px',
    background: 'linear-gradient(90deg, rgba(20,20,50,0.6) 0%, rgba(40,30,60,0.8) 50%, rgba(20,20,50,0.6) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(107,76,230,0.3)',
  },
  phaseIndicator: {
    display: 'flex',
    gap: '8px',
  },
  phaseButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    transition: 'all 0.3s ease',
  },
  actionButton: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(107,76,230,0.4)',
    transition: 'all 0.3s ease',
  },
  lifeBar: {
    height: '24px',
    borderRadius: '12px',
    background: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  lifeBarFill: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.5s ease',
  },
  spToken: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'linear-gradient(135deg, #1a1a3a 0%, #2a2a4a 100%)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    border: '2px solid #6b4ce6',
    boxShadow: '0 0 50px rgba(107,76,230,0.5)',
  },
  log: {
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '8px',
    padding: '8px',
    maxHeight: '120px',
    overflowY: 'auto',
    fontSize: '11px',
    lineHeight: '1.6',
  },
};

// ========================================
// カードコンポーネント
// ========================================
const Card = ({ card, onClick, selected, small, faceDown, inHand, disabled }) => {
  if (!card) return null;
  
  const colors = ATTRIBUTE_COLORS[card.attribute] || ATTRIBUTE_COLORS['なし'];
  const isMonster = card.type === 'monster';
  
  const cardStyle = {
    width: small ? '80px' : '100px',
    height: small ? '110px' : '130px',
    borderRadius: '8px',
    background: faceDown ? 'linear-gradient(135deg, #2a2a4a 0%, #1a1a3a 100%)' : colors.bg,
    border: selected ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.3)',
    boxShadow: selected 
      ? `0 0 20px ${colors.glow}, 0 0 40px rgba(255,215,0,0.5)` 
      : `0 4px 15px rgba(0,0,0,0.4)`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    transform: selected ? 'translateY(-8px) scale(1.05)' : inHand ? 'translateY(0)' : 'none',
    opacity: disabled ? 0.5 : 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  };

  if (faceDown) {
    return (
      <div style={cardStyle}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'repeating-linear-gradient(45deg, #2a2a4a, #2a2a4a 10px, #3a3a5a 10px, #3a3a5a 20px)',
        }}>
          <span style={{ fontSize: '32px' }}>🎴</span>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle} onClick={disabled ? null : onClick}>
      {/* コスト表示 */}
      <div style={{
        position: 'absolute',
        top: '4px',
        left: '4px',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        {card.cost}
      </div>

      {/* 禁忌カード表示 */}
      {card.isForbidden && (
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '28px',
          fontSize: '14px',
          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
        }}>
          ⚠️
        </div>
      )}

      {/* タイプアイコン */}
      <div style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        fontSize: '14px',
      }}>
        {TYPE_ICONS[card.type]}
      </div>

      {/* カード名 */}
      <div style={{
        padding: '26px 4px 4px',
        fontSize: small ? '9px' : '10px',
        fontWeight: 'bold',
        textAlign: 'center',
        color: colors.text,
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        lineHeight: '1.2',
        height: '36px',
        overflow: 'hidden',
      }}>
        {card.name}
      </div>

      {/* イラストエリア（プロトタイプ用） */}
      <div style={{
        flex: 1,
        margin: '2px 4px',
        borderRadius: '4px',
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        position: 'relative',
      }}>
        {card.type === 'monster' ? '🐉' : card.type === 'magic' ? '📜' : '🏔️'}

        {/* 技アイコン表示（モンスターのみ） */}
        {card.type === 'monster' && (card.basicSkill || card.advancedSkill) && (
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            display: 'flex',
            gap: '2px',
          }}>
            {card.basicSkill && (
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }} title={`基本技: ${card.basicSkill.text}`}>
                1
              </div>
            )}
            {card.advancedSkill && (
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }} title={`上級技: ${card.advancedSkill.text}`}>
                2
              </div>
            )}
          </div>
        )}
      </div>

      {/* ステータス（モンスターのみ） */}
      {isMonster && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 6px',
          background: 'rgba(0,0,0,0.4)',
          fontSize: small ? '10px' : '11px',
          fontWeight: 'bold',
        }}>
          <span style={{ color: '#ff6b6b' }}>⚔️{card.currentAttack || card.attack}</span>
          <span style={{ color: '#6bff6b' }}>❤️{card.currentHp || card.hp}</span>
        </div>
      )}
    </div>
  );
};

// ========================================
// フィールドモンスターコンポーネント
// ========================================
const FieldMonster = ({ monster, onClick, selected, canAttack, isTarget, isValidTarget }) => {
  if (!monster) {
    return (
      <div 
        style={{
          ...styles.cardSlot,
          cursor: isValidTarget ? 'pointer' : 'default',
          border: isValidTarget ? '2px dashed #6b4ce6' : '2px dashed rgba(107,76,230,0.4)',
          background: isValidTarget ? 'rgba(107,76,230,0.2)' : 'rgba(20,20,40,0.5)',
          transition: 'all 0.3s ease',
        }}
        onClick={onClick}
      >
        {isValidTarget ? '召喚可能' : '空'}
      </div>
    );
  }

  const colors = ATTRIBUTE_COLORS[monster.attribute] || ATTRIBUTE_COLORS['なし'];
  const hpPercent = (monster.currentHp / monster.hp) * 100;

  return (
    <div 
      onClick={onClick}
      style={{
        ...styles.cardSlot,
        border: selected ? '3px solid #ffd700' : isTarget ? '3px solid #ff4444' : '2px solid rgba(107,76,230,0.6)',
        background: colors.bg,
        cursor: 'pointer',
        flexDirection: 'column',
        padding: '4px',
        position: 'relative',
        boxShadow: selected 
          ? `0 0 20px ${colors.glow}, 0 0 30px rgba(255,215,0,0.5)` 
          : canAttack 
            ? `0 0 15px ${colors.glow}` 
            : 'none',
        animation: canAttack ? 'pulse 2s infinite' : 'none',
      }}
    >
      {/* 攻撃可能インジケーター */}
      {canAttack && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: '#ffd700',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          boxShadow: '0 0 10px #ffd700',
        }}>
          ⚔️
        </div>
      )}

      {/* チャージ表示 */}
      {monster.charges && monster.charges.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          background: '#9d4ce6',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#fff',
        }}>
          {monster.charges.length}
        </div>
      )}

      <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: '2px' }}>
        {monster.name}
      </div>

      <div style={{ fontSize: '24px', marginBottom: '4px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        🐉
        {/* 技アイコン */}
        {(monster.basicSkill || monster.advancedSkill) && (
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '18px',
            display: 'flex',
            gap: '2px',
          }}>
            {monster.basicSkill && (
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
              }} title={`基本技: ${monster.basicSkill.text}`}>
                1
              </div>
            )}
            {monster.advancedSkill && (
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
              }} title={`上級技: ${monster.advancedSkill.text}`}>
                2
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* HPバー */}
      <div style={{
        width: '90%',
        height: '8px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '4px',
      }}>
        <div style={{
          width: `${hpPercent}%`,
          height: '100%',
          background: hpPercent > 50 ? '#4caf50' : hpPercent > 25 ? '#ff9800' : '#f44336',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', fontSize: '10px', fontWeight: 'bold' }}>
        <span style={{ color: '#ff6b6b' }}>⚔️{monster.currentAttack}</span>
        <span style={{ color: '#6bff6b' }}>❤️{monster.currentHp}</span>
      </div>
    </div>
  );
};

// ========================================
// SPトークン表示コンポーネント
// ========================================
const SPTokens = ({ active, rested, max }) => {
  const tokens = [];
  for (let i = 0; i < max; i++) {
    const isActive = i < active;
    const isRested = i >= active && i < active + rested;
    tokens.push(
      <div 
        key={i}
        style={{
          ...styles.spToken,
          background: isActive 
            ? 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)' 
            : isRested 
              ? 'linear-gradient(135deg, #444 0%, #666 100%)'
              : 'rgba(30,30,50,0.5)',
          border: isActive ? '2px solid #a78bfa' : '2px solid #444',
          boxShadow: isActive ? '0 0 10px rgba(107,76,230,0.5)' : 'none',
          color: isActive ? '#fff' : '#666',
        }}
      >
        {isActive ? '◆' : isRested ? '◇' : '○'}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
      {tokens}
    </div>
  );
};

// ========================================
// ログコンポーネント
// ========================================
const GameLog = ({ logs }) => (
  <div style={styles.log}>
    {logs.slice(-10).map((log, i) => (
      <div key={i} style={{ 
        color: log.type === 'damage' ? '#ff6b6b' : log.type === 'heal' ? '#6bff6b' : '#a0a0a0',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '2px 0',
      }}>
        {log.message}
      </div>
    ))}
  </div>
);

// ========================================
// メインゲームコンポーネント
// ========================================
export default function MagicSpiritGame() {
  // カードデータ管理
  const [allCards, setAllCards] = useState(SAMPLE_CARDS);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // ゲーム状態
  const [gameState, setGameState] = useState('title'); // title, playing, gameOver
  const [turn, setTurn] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [phase, setPhase] = useState(0);
  const [isFirstTurn, setIsFirstTurn] = useState(true);
  const [winner, setWinner] = useState(null);
  const [logs, setLogs] = useState([]);

  // プレイヤー1の状態
  const [p1Life, setP1Life] = useState(INITIAL_LIFE);
  const [p1Deck, setP1Deck] = useState([]);
  const [p1Hand, setP1Hand] = useState([]);
  const [p1Field, setP1Field] = useState([null, null, null, null, null]);
  const [p1Graveyard, setP1Graveyard] = useState([]);
  const [p1ActiveSP, setP1ActiveSP] = useState(INITIAL_SP);
  const [p1RestedSP, setP1RestedSP] = useState(0);
  const [p1FieldCard, setP1FieldCard] = useState(null);

  // プレイヤー2の状態
  const [p2Life, setP2Life] = useState(INITIAL_LIFE);
  const [p2Deck, setP2Deck] = useState([]);
  const [p2Hand, setP2Hand] = useState([]);
  const [p2Field, setP2Field] = useState([null, null, null, null, null]);
  const [p2Graveyard, setP2Graveyard] = useState([]);
  const [p2ActiveSP, setP2ActiveSP] = useState(INITIAL_SP);
  const [p2RestedSP, setP2RestedSP] = useState(0);
  const [p2FieldCard, setP2FieldCard] = useState(null);

  // UI状態
  const [selectedHandCard, setSelectedHandCard] = useState(null);
  const [selectedFieldMonster, setSelectedFieldMonster] = useState(null);
  const [attackingMonster, setAttackingMonster] = useState(null);
  const [chargeUsedThisTurn, setChargeUsedThisTurn] = useState(false);

  // ログ追加関数
  const addLog = useCallback((message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, time: Date.now() }]);
  }, []);

  // CSVファイルの読み込み
  useEffect(() => {
    const loadCards = async () => {
      try {
        setIsLoadingCards(true);
        const response = await fetch('/cardlist/cardlist.csv');
        if (!response.ok) {
          throw new Error('CSVファイルの読み込みに失敗しました');
        }
        const csvText = await response.text();
        const parsedCards = parseCSV(csvText);

        if (parsedCards.length > 0) {
          setAllCards(parsedCards);
          console.log(`${parsedCards.length}枚のカードをCSVから読み込みました`);
        } else {
          console.warn('CSVからカードが読み込めませんでした。サンプルカードを使用します。');
        }
      } catch (error) {
        console.error('CSVの読み込みエラー:', error);
        console.log('サンプルカードを使用します。');
      } finally {
        setIsLoadingCards(false);
      }
    };

    loadCards();
  }, []);

  // ゲーム初期化
  const initGame = useCallback(() => {
    const deck1 = createDeck(allCards);
    const deck2 = createDeck(allCards);
    
    setP1Deck(deck1.slice(INITIAL_HAND_SIZE));
    setP1Hand(deck1.slice(0, INITIAL_HAND_SIZE));
    setP2Deck(deck2.slice(INITIAL_HAND_SIZE));
    setP2Hand(deck2.slice(0, INITIAL_HAND_SIZE));
    
    setP1Life(INITIAL_LIFE);
    setP2Life(INITIAL_LIFE);
    setP1ActiveSP(INITIAL_SP);
    setP2ActiveSP(INITIAL_SP);
    setP1RestedSP(0);
    setP2RestedSP(0);
    setP1Field([null, null, null, null, null]);
    setP2Field([null, null, null, null, null]);
    setP1FieldCard(null);
    setP2FieldCard(null);
    setP1Graveyard([]);
    setP2Graveyard([]);
    
    setTurn(1);
    setCurrentPlayer(1);
    setPhase(0);
    setIsFirstTurn(true);
    setWinner(null);
    setLogs([]);
    setSelectedHandCard(null);
    setSelectedFieldMonster(null);
    setAttackingMonster(null);
    setChargeUsedThisTurn(false);
    
    setGameState('playing');
    addLog('ゲーム開始！先攻プレイヤー1のターン', 'info');
  }, [addLog, allCards]);

  // 現在のプレイヤーのデータを取得
  const getCurrentPlayerData = () => {
    if (currentPlayer === 1) {
      return {
        life: p1Life, setLife: setP1Life,
        deck: p1Deck, setDeck: setP1Deck,
        hand: p1Hand, setHand: setP1Hand,
        field: p1Field, setField: setP1Field,
        graveyard: p1Graveyard, setGraveyard: setP1Graveyard,
        activeSP: p1ActiveSP, setActiveSP: setP1ActiveSP,
        restedSP: p1RestedSP, setRestedSP: setP1RestedSP,
        fieldCard: p1FieldCard, setFieldCard: setP1FieldCard,
      };
    }
    return {
      life: p2Life, setLife: setP2Life,
      deck: p2Deck, setDeck: setP2Deck,
      hand: p2Hand, setHand: setP2Hand,
      field: p2Field, setField: setP2Field,
      graveyard: p2Graveyard, setGraveyard: setP2Graveyard,
      activeSP: p2ActiveSP, setActiveSP: setP2ActiveSP,
      restedSP: p2RestedSP, setRestedSP: setP2RestedSP,
      fieldCard: p2FieldCard, setFieldCard: setP2FieldCard,
    };
  };

  const getOpponentData = () => {
    if (currentPlayer === 1) {
      return {
        life: p2Life, setLife: setP2Life,
        field: p2Field, setField: setP2Field,
        graveyard: p2Graveyard, setGraveyard: setP2Graveyard,
        fieldCard: p2FieldCard,
      };
    }
    return {
      life: p1Life, setLife: setP1Life,
      field: p1Field, setField: setP1Field,
      graveyard: p1Graveyard, setGraveyard: setP1Graveyard,
      fieldCard: p1FieldCard,
    };
  };

  // フェイズ処理
  const processPhase = useCallback((phaseIndex) => {
    const player = getCurrentPlayerData();
    const opponent = getOpponentData();

    switch (phaseIndex) {
      case 0: // ターン開始フェイズ
        // SPトークン追加（最大10）
        const totalSP = player.activeSP + player.restedSP;
        if (totalSP < MAX_SP) {
          player.setActiveSP(prev => Math.min(prev + 1, MAX_SP));
          addLog(`プレイヤー${currentPlayer}: SPトークン+1`, 'info');
        }
        // レスト状態のSPをアクティブに
        player.setActiveSP(prev => prev + player.restedSP);
        player.setRestedSP(0);
        
        // モンスターの攻撃可能フラグをリセット
        player.setField(prev => prev.map(m => m ? { ...m, canAttack: true } : null));
        setChargeUsedThisTurn(false);
        setPhase(1);
        break;

      case 1: // ドローフェイズ
        if (player.deck.length > 0) {
          const drawnCard = player.deck[0];
          player.setDeck(prev => prev.slice(1));
          player.setHand(prev => [...prev, drawnCard]);
          addLog(`プレイヤー${currentPlayer}: 1枚ドロー`, 'info');
        } else {
          addLog(`プレイヤー${currentPlayer}: デッキ切れ！`, 'damage');
        }
        setPhase(2);
        break;

      case 2: // メインフェイズ
        // プレイヤーの操作待ち（自動進行なし）
        break;

      case 3: // バトルフェイズ
        // 先攻1ターン目は攻撃不可
        if (isFirstTurn && currentPlayer === 1) {
          addLog('先攻1ターン目は攻撃できません', 'info');
          setPhase(4);
        }
        break;

      case 4: // エンドフェイズ
        setPhase(0);
        // ターン終了、相手に切り替え
        if (currentPlayer === 1) {
          setCurrentPlayer(2);
        } else {
          setCurrentPlayer(1);
          setTurn(prev => prev + 1);
          if (isFirstTurn) setIsFirstTurn(false);
        }
        addLog(`プレイヤー${currentPlayer}のターン終了`, 'info');
        break;
    }
  }, [currentPlayer, isFirstTurn, addLog]);

  // チャージ処理
  const chargeCard = useCallback((card, monsterIndex) => {
    if (chargeUsedThisTurn) {
      addLog('このターンは既にチャージを使用しました', 'damage');
      return false;
    }

    const field = currentPlayer === 1 ? p1Field : p2Field;
    const monster = field[monsterIndex];

    if (!monster) {
      addLog('モンスターが存在しません', 'damage');
      return false;
    }

    if (monster.charges && monster.charges.length >= 2) {
      addLog('このモンスターは既に2枚チャージされています', 'damage');
      return false;
    }

    // 属性チャージ（モンスター、魔法、フィールドカード）
    if (card.type === 'monster' || card.type === 'magic' || card.type === 'field') {
      const newCharge = {
        card: card,
        attribute: card.attribute,
      };

      if (currentPlayer === 1) {
        setP1Field(prev => {
          const newField = [...prev];
          newField[monsterIndex] = {
            ...monster,
            charges: [...(monster.charges || []), newCharge],
          };
          return newField;
        });
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      } else {
        setP2Field(prev => {
          const newField = [...prev];
          newField[monsterIndex] = {
            ...monster,
            charges: [...(monster.charges || []), newCharge],
          };
          return newField;
        });
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
      }

      setChargeUsedThisTurn(true);
      addLog(`${monster.name}に${card.name}をチャージしました`, 'info');
      return true;
    }

    addLog('チャージできるのは属性カードのみです', 'damage');
    return false;
  }, [currentPlayer, p1Field, p2Field, chargeUsedThisTurn, addLog]);

  // 技発動処理
  const useSkill = useCallback((monsterIndex, skillType) => {
    const field = currentPlayer === 1 ? p1Field : p2Field;
    const monster = field[monsterIndex];

    if (!monster) {
      addLog('モンスターが存在しません', 'damage');
      return false;
    }

    const skill = skillType === 'basic' ? monster.basicSkill : monster.advancedSkill;
    const skillName = skillType === 'basic' ? '基本技' : '上級技';

    if (!skill) {
      addLog(`このモンスターには${skillName}がありません`, 'damage');
      return false;
    }

    const requiredCharges = skill.cost;
    const currentCharges = monster.charges ? monster.charges.length : 0;

    if (currentCharges < requiredCharges) {
      addLog(`${skillName}を発動するには${requiredCharges}枚のチャージが必要です（現在: ${currentCharges}枚）`, 'damage');
      return false;
    }

    // 属性チェック（「任意」でない場合、同属性のチャージが必要）
    if (skill.attribute !== 'any') {
      const validCharges = monster.charges.filter(charge =>
        charge.attribute === monster.attribute || charge.attribute === 'なし'
      );
      if (validCharges.length < requiredCharges) {
        addLog(`${skillName}を発動するには同属性のチャージが必要です`, 'damage');
        return false;
      }
    }

    // 技発動（簡易実装：ダメージ処理のみ）
    addLog(`${monster.name}の${skillName}を発動！`, 'info');
    addLog(`効果: ${skill.text}`, 'info');

    // ダメージパターンのマッチング
    const damageMatch = skill.text.match(/(\d+)ダメージ/);
    if (damageMatch) {
      const damage = parseInt(damageMatch[1]);
      if (currentPlayer === 1) {
        setP2Life(prev => Math.max(0, prev - damage));
      } else {
        setP1Life(prev => Math.max(0, prev - damage));
      }
      addLog(`相手に${damage}ダメージ！`, 'damage');
    }

    // 回復パターンのマッチング
    const healMatch = skill.text.match(/(\d+)回復/);
    if (healMatch) {
      const heal = parseInt(healMatch[1]);
      if (currentPlayer === 1) {
        setP1Life(prev => prev + heal);
      } else {
        setP2Life(prev => prev + heal);
      }
      addLog(`ライフを${heal}回復！`, 'heal');
    }

    return true;
  }, [currentPlayer, p1Field, p2Field, addLog]);

  // カード召喚
  const summonCard = useCallback((card, slotIndex) => {
    // 現在のプレイヤーのSPを直接取得
    const activeSP = currentPlayer === 1 ? p1ActiveSP : p2ActiveSP;
    const field = currentPlayer === 1 ? p1Field : p2Field;
    
    if (activeSP < card.cost) {
      addLog(`SPが足りません！（必要: ${card.cost}, 現在: ${activeSP}）`, 'damage');
      return false;
    }

    if (card.type === 'monster') {
      if (field[slotIndex] !== null) {
        addLog('そのスロットは使用中です', 'damage');
        return false;
      }
      
      const monsterInstance = createMonsterInstance(card);
      monsterInstance.canAttack = false; // 召喚ターンは攻撃不可
      
      // フィールドにモンスターを配置
      if (currentPlayer === 1) {
        setP1Field(prev => {
          const newField = [...prev];
          newField[slotIndex] = monsterInstance;
          return newField;
        });
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
      } else {
        setP2Field(prev => {
          const newField = [...prev];
          newField[slotIndex] = monsterInstance;
          return newField;
        });
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
      }
      
      addLog(`プレイヤー${currentPlayer}: ${card.name}を召喚！`, 'info');
      
      // 召喚時効果（簡易実装）
      if (card.effect && card.effect.includes('召喚時')) {
        addLog(`${card.name}の召喚時効果発動！`, 'info');
      }
      
      return true;
    }

    if (card.type === 'magic') {
      if (currentPlayer === 1) {
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
        setP1Graveyard(prev => [...prev, card]);
      } else {
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
        setP2Graveyard(prev => [...prev, card]);
      }
      
      addLog(`プレイヤー${currentPlayer}: ${card.name}を発動！`, 'info');
      
      // 魔法効果（簡易実装）
      if (card.effect && card.effect.includes('ダメージ')) {
        const damage = parseInt(card.effect.match(/\d+/)?.[0] || '500');
        if (currentPlayer === 1) {
          setP2Life(prev => Math.max(0, prev - damage));
        } else {
          setP1Life(prev => Math.max(0, prev - damage));
        }
        addLog(`相手に${damage}ダメージ！`, 'damage');
      }
      
      return true;
    }

    if (card.type === 'field') {
      if (currentPlayer === 1) {
        setP1FieldCard(card);
        setP1Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP1ActiveSP(prev => prev - card.cost);
        setP1RestedSP(prev => prev + card.cost);
      } else {
        setP2FieldCard(card);
        setP2Hand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
        setP2ActiveSP(prev => prev - card.cost);
        setP2RestedSP(prev => prev + card.cost);
      }
      
      addLog(`プレイヤー${currentPlayer}: ${card.name}を設置！`, 'info');
      return true;
    }

    return false;
  }, [currentPlayer, p1ActiveSP, p2ActiveSP, p1Field, p2Field, addLog]);

  // 攻撃処理
  const attack = useCallback((attackerIndex, targetIndex) => {
    // 現在のプレイヤーと相手のフィールドを直接取得
    const playerField = currentPlayer === 1 ? p1Field : p2Field;
    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    
    const attacker = playerField[attackerIndex];
    if (!attacker || !attacker.canAttack) {
      addLog('このモンスターは攻撃できません', 'damage');
      return;
    }

    const target = opponentField[targetIndex];
    
    if (target) {
      // モンスター攻撃
      const damage = attacker.currentAttack;
      const counterDamage = Math.floor(target.currentAttack * COUNTER_ATTACK_RATE);
      
      addLog(`${attacker.name}が${target.name}を攻撃！`, 'info');
      
      // ダメージ処理（新しいオブジェクトを作成）
      const newTargetHp = target.currentHp - damage;
      const newAttackerHp = attacker.currentHp - counterDamage;
      
      addLog(`${target.name}に${damage}ダメージ！`, 'damage');
      addLog(`反撃で${attacker.name}に${counterDamage}ダメージ！`, 'damage');
      
      // 相手フィールドの更新
      if (currentPlayer === 1) {
        // プレイヤー1が攻撃 → 相手はプレイヤー2
        if (newTargetHp <= 0) {
          setP2Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = null;
            return newField;
          });
          setP2Graveyard(prev => [...prev, target]);
          addLog(`${target.name}は破壊された！`, 'damage');
        } else {
          setP2Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = { ...target, currentHp: newTargetHp };
            return newField;
          });
        }
        
        // 自分のフィールドの更新
        if (newAttackerHp <= 0) {
          setP1Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = null;
            return newField;
          });
          setP1Graveyard(prev => [...prev, attacker]);
          addLog(`${attacker.name}は破壊された！`, 'damage');
        } else {
          setP1Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = { ...attacker, currentHp: newAttackerHp, canAttack: false };
            return newField;
          });
        }
      } else {
        // プレイヤー2が攻撃 → 相手はプレイヤー1
        if (newTargetHp <= 0) {
          setP1Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = null;
            return newField;
          });
          setP1Graveyard(prev => [...prev, target]);
          addLog(`${target.name}は破壊された！`, 'damage');
        } else {
          setP1Field(prev => {
            const newField = [...prev];
            newField[targetIndex] = { ...target, currentHp: newTargetHp };
            return newField;
          });
        }
        
        // 自分のフィールドの更新
        if (newAttackerHp <= 0) {
          setP2Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = null;
            return newField;
          });
          setP2Graveyard(prev => [...prev, attacker]);
          addLog(`${attacker.name}は破壊された！`, 'damage');
        } else {
          setP2Field(prev => {
            const newField = [...prev];
            newField[attackerIndex] = { ...attacker, currentHp: newAttackerHp, canAttack: false };
            return newField;
          });
        }
      }
    } else {
      // ダイレクトアタック判定
      const hasOpponentMonster = opponentField.some(m => m !== null);
      let damage = attacker.currentAttack;
      const opponentFieldCard = currentPlayer === 1 ? p2FieldCard : p1FieldCard;
      
      if (hasOpponentMonster) {
        damage = Math.floor(damage * 0.5);
        addLog(`相手の場にモンスターがいるためダメージ半減`, 'info');
      }
      
      if (opponentFieldCard) {
        damage = Math.floor(damage * 0.75);
        addLog(`フィールドカードによりダメージ75%`, 'info');
      }
      
      addLog(`${attacker.name}がダイレクトアタック！${damage}ダメージ！`, 'damage');
      
      if (currentPlayer === 1) {
        setP2Life(prev => Math.max(0, prev - damage));
        setP1Field(prev => {
          const newField = [...prev];
          newField[attackerIndex] = { ...attacker, canAttack: false };
          return newField;
        });
      } else {
        setP1Life(prev => Math.max(0, prev - damage));
        setP2Field(prev => {
          const newField = [...prev];
          newField[attackerIndex] = { ...attacker, canAttack: false };
          return newField;
        });
      }
    }
    
    setAttackingMonster(null);
    setSelectedFieldMonster(null);
  }, [currentPlayer, p1Field, p2Field, p1FieldCard, p2FieldCard, addLog]);

  // 勝敗判定
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    if (p1Life <= 0) {
      setWinner(2);
      setGameState('gameOver');
      addLog('プレイヤー2の勝利！', 'info');
    } else if (p2Life <= 0) {
      setWinner(1);
      setGameState('gameOver');
      addLog('プレイヤー1の勝利！', 'info');
    }
  }, [p1Life, p2Life, gameState, addLog]);

  // フェイズ自動進行
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (phase === 0 || phase === 1) {
      const timer = setTimeout(() => processPhase(phase), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, gameState, processPhase]);

  // ハンドカードクリック
  const handleHandCardClick = (card) => {
    if (phase !== 2) return;
    // 現在のプレイヤーの手札かどうかチェック
    const currentHand = currentPlayer === 1 ? p1Hand : p2Hand;
    if (!currentHand.find(c => c.uniqueId === card.uniqueId)) return;
    
    setSelectedHandCard(selectedHandCard?.uniqueId === card.uniqueId ? null : card);
    setSelectedFieldMonster(null);
    setAttackingMonster(null);
  };

  // フィールドスロットクリック
  const handleFieldSlotClick = (slotIndex, playerNum) => {
    // 現在のプレイヤーの場か相手の場かを判定
    const isMyField = playerNum === currentPlayer;

    if (phase === 2 && isMyField) {
      const field = currentPlayer === 1 ? p1Field : p2Field;
      const monster = field[slotIndex];

      if (selectedHandCard) {
        // チャージモード（モンスターが存在する場合）
        if (monster && (selectedHandCard.type === 'monster' || selectedHandCard.type === 'magic' || selectedHandCard.type === 'field')) {
          if (chargeCard(selectedHandCard, slotIndex)) {
            setSelectedHandCard(null);
          }
        }
        // 召喚モード（空きスロットの場合）
        else if (!monster && selectedHandCard.type === 'monster') {
          if (summonCard(selectedHandCard, slotIndex)) {
            setSelectedHandCard(null);
          }
        }
      } else {
        // モンスター選択（技発動用）
        if (monster) {
          setSelectedFieldMonster(selectedFieldMonster === slotIndex ? null : slotIndex);
          setSelectedHandCard(null);
        }
      }
    } else if (phase === 3 && isMyField) {
      // 攻撃者選択
      const field = currentPlayer === 1 ? p1Field : p2Field;
      const monster = field[slotIndex];
      if (monster && monster.canAttack) {
        setAttackingMonster(slotIndex);
        setSelectedFieldMonster(slotIndex);
      }
    } else if (phase === 3 && !isMyField && attackingMonster !== null) {
      // 攻撃対象選択
      attack(attackingMonster, slotIndex);
    }
  };

  // ダイレクトアタック
  const handleDirectAttack = () => {
    if (attackingMonster === null) return;
    const opponentField = currentPlayer === 1 ? p2Field : p1Field;
    const hasTarget = opponentField.some(m => m !== null);
    if (!hasTarget) {
      attack(attackingMonster, -1);
    } else {
      addLog('相手の場にモンスターがいます。対象を選択してください。', 'info');
    }
  };

  // 次のフェイズへ
  const nextPhase = () => {
    if (phase === 2) {
      // メインフェイズ終了前に手札の魔法を使用可能
      if (selectedHandCard && selectedHandCard.type === 'magic') {
        summonCard(selectedHandCard, 0);
        setSelectedHandCard(null);
        return;
      }
      setPhase(3);
      setSelectedHandCard(null);
    } else if (phase === 3) {
      setPhase(4);
      processPhase(4);
    }
  };

  // ========================================
  // レンダリング
  // ========================================
  
  // タイトル画面
  if (gameState === 'title') {
    return (
      <div style={styles.container}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '32px',
        }}>
          <h1 style={{
            ...styles.title,
            fontSize: '48px',
            textAlign: 'center',
          }}>
            ✨ Magic Spirit ✨
          </h1>
          <p style={{ color: '#a0a0a0', fontSize: '18px' }}>
            スピリットウェイヴァーよ、戦いの時だ
          </p>
          {isLoadingCards ? (
            <div style={{ color: '#a0a0a0', fontSize: '16px' }}>
              カードデータを読み込み中...
            </div>
          ) : (
            <>
              <button
                onClick={initGame}
                style={{
                  ...styles.actionButton,
                  fontSize: '20px',
                  padding: '16px 48px',
                }}
              >
                ゲーム開始
              </button>
              <div style={{ color: '#888', fontSize: '13px' }}>
                {allCards.length}枚のカードを読み込み完了
              </div>
            </>
          )}
          <div style={{ color: '#666', fontSize: '12px', marginTop: '32px' }}>
            プロトタイプ版 - 2人対戦
          </div>
        </div>
      </div>
    );
  }

  // ゲームオーバー画面
  if (gameState === 'gameOver') {
    return (
      <div style={styles.container}>
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#ffd700' }}>
              🏆 ゲーム終了 🏆
            </h2>
            <p style={{ textAlign: 'center', fontSize: '24px', marginBottom: '24px' }}>
              プレイヤー{winner}の勝利！
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button onClick={initGame} style={styles.actionButton}>
                もう一度プレイ
              </button>
              <button 
                onClick={() => setGameState('title')} 
                style={{ ...styles.actionButton, background: '#444' }}
              >
                タイトルへ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ゲーム画面
  const player = getCurrentPlayerData();
  const opponent = getOpponentData();

  return (
    <div style={styles.container}>
      {/* CSSアニメーション */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 10px currentColor; }
          50% { box-shadow: 0 0 25px currentColor, 0 0 40px currentColor; }
        }
      `}</style>

      {/* ヘッダー */}
      <header style={styles.header}>
        <h1 style={styles.title}>✨ Magic Spirit</h1>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span>ターン {turn}</span>
          <span style={{ 
            background: currentPlayer === 1 ? '#4da6ff' : '#ff6b6b',
            padding: '4px 12px',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}>
            プレイヤー{currentPlayer}
          </span>
        </div>
      </header>

      {/* ゲームボード */}
      <div style={styles.gameBoard}>
        {/* プレイヤー2エリア（上） */}
        <div style={{ ...styles.playerArea, background: currentPlayer === 2 ? 'rgba(255,107,107,0.1)' : 'transparent' }}>
          {/* 情報パネル */}
          <div style={styles.infoPanel}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ff6b6b' }}>
              プレイヤー2
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>LP: {p2Life}</div>
              <div style={styles.lifeBar}>
                <div style={{
                  ...styles.lifeBarFill,
                  width: `${(p2Life / INITIAL_LIFE) * 100}%`,
                  background: 'linear-gradient(90deg, #ff6b6b, #ff8533)',
                }} />
              </div>
            </div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>SP: {p2ActiveSP}/{p2ActiveSP + p2RestedSP}</div>
            <SPTokens active={p2ActiveSP} rested={p2RestedSP} max={MAX_SP} />
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#888' }}>
              デッキ: {p2Deck.length} | 墓地: {p2Graveyard.length}
            </div>
          </div>

          {/* フィールド */}
          <div style={styles.fieldArea}>
            {/* 手札（プレイヤー2のターンなら表示、それ以外は裏向き） */}
            <div style={{ ...styles.handArea, minHeight: '80px' }}>
              {p2Hand.map((card, i) => (
                currentPlayer === 2 ? (
                  <Card
                    key={card.uniqueId}
                    card={card}
                    onClick={() => handleHandCardClick(card)}
                    selected={selectedHandCard?.uniqueId === card.uniqueId}
                    inHand
                    small
                    disabled={phase !== 2}
                  />
                ) : (
                  <Card key={card.uniqueId} card={card} faceDown small />
                )
              ))}
            </div>
            {/* モンスターゾーン */}
            <div style={styles.monsterZone}>
              {p2Field.map((monster, i) => (
                <FieldMonster
                  key={i}
                  monster={monster}
                  onClick={() => handleFieldSlotClick(i, 2)}
                  selected={selectedFieldMonster === i && currentPlayer === 2}
                  canAttack={currentPlayer === 2 && phase === 3 && monster?.canAttack}
                  isTarget={currentPlayer === 1 && phase === 3 && attackingMonster !== null}
                  isValidTarget={currentPlayer === 2 && phase === 2 && selectedHandCard && selectedHandCard.type === 'monster' && !monster}
                />
              ))}
            </div>
          </div>

          {/* フィールドカード */}
          <div style={styles.infoPanel}>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>フィールド</div>
            {p2FieldCard ? (
              <Card card={p2FieldCard} small />
            ) : (
              <div style={{ ...styles.cardSlot, width: '80px', height: '100px' }}>なし</div>
            )}
            {selectedHandCard && currentPlayer === 2 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '10px', 
                background: 'rgba(255,107,107,0.2)', 
                borderRadius: '8px',
                border: '1px solid rgba(255,107,107,0.5)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#ff8a8a' }}>
                  📋 選択中: {selectedHandCard.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                  属性: {selectedHandCard.attribute} | コスト: {selectedHandCard.cost} SP
                </div>
                {selectedHandCard.type === 'monster' && (
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                    ⚔️ {selectedHandCard.attack} | ❤️ {selectedHandCard.hp}
                  </div>
                )}
                <div style={{
                  fontSize: '10px',
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '6px',
                  borderRadius: '4px',
                  lineHeight: '1.4',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}>
                  {selectedHandCard.effect || 'なし'}
                </div>
                {/* 技情報 */}
                {selectedHandCard.type === 'monster' && (selectedHandCard.basicSkill || selectedHandCard.advancedSkill) && (
                  <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: '1.4' }}>
                    {selectedHandCard.basicSkill && (
                      <div style={{
                        marginBottom: '4px',
                        padding: '4px',
                        background: 'rgba(76,175,80,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(76,175,80,0.3)',
                      }}>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技(1):</span>
                        <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{selectedHandCard.basicSkill.text}</span>
                      </div>
                    )}
                    {selectedHandCard.advancedSkill && (
                      <div style={{
                        padding: '4px',
                        background: 'rgba(255,152,0,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,152,0,0.3)',
                      }}>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技(2):</span>
                        <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{selectedHandCard.advancedSkill.text}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ 
                  fontSize: '10px', 
                  color: '#ff6b6b', 
                  marginTop: '6px',
                  fontWeight: 'bold',
                }}>
                  {selectedHandCard.type === 'monster' && '👆 空きスロットをクリックして召喚'}
                  {selectedHandCard.type === 'magic' && '👆 「バトルフェイズへ」で発動'}
                  {selectedHandCard.type === 'field' && '👆 フィールドゾーンに設置'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* センターゾーン */}
        <div style={styles.centerZone}>
          {/* フェイズ表示 */}
          <div style={styles.phaseIndicator}>
            {PHASES.map((p, i) => (
              <div
                key={i}
                style={{
                  ...styles.phaseButton,
                  background: phase === i 
                    ? 'linear-gradient(135deg, #6b4ce6 0%, #9d4ce6 100%)' 
                    : 'rgba(40,40,60,0.8)',
                  color: phase === i ? '#fff' : '#888',
                  boxShadow: phase === i ? '0 0 15px rgba(107,76,230,0.5)' : 'none',
                }}
              >
                {p}
              </div>
            ))}
          </div>

          {/* アクションボタン */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 技発動ボタン（メインフェイズ） */}
            {phase === 2 && selectedFieldMonster !== null && currentPlayer === 1 && (
              (() => {
                const monster = p1Field[selectedFieldMonster];
                if (!monster) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#ffd700', textAlign: 'center' }}>
                      {monster.name} - 技発動
                    </div>
                    {monster.basicSkill && (
                      <button
                        onClick={() => useSkill(selectedFieldMonster, 'basic')}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 1}
                      >
                        基本技 (チャージ{monster.charges?.length || 0}/1)
                      </button>
                    )}
                    {monster.advancedSkill && (
                      <button
                        onClick={() => useSkill(selectedFieldMonster, 'advanced')}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 2}
                      >
                        上級技 (チャージ{monster.charges?.length || 0}/2)
                      </button>
                    )}
                  </div>
                );
              })()
            )}
            {phase === 2 && selectedFieldMonster !== null && currentPlayer === 2 && (
              (() => {
                const monster = p2Field[selectedFieldMonster];
                if (!monster) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#ffd700', textAlign: 'center' }}>
                      {monster.name} - 技発動
                    </div>
                    {monster.basicSkill && (
                      <button
                        onClick={() => useSkill(selectedFieldMonster, 'basic')}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 1}
                      >
                        基本技 (チャージ{monster.charges?.length || 0}/1)
                      </button>
                    )}
                    {monster.advancedSkill && (
                      <button
                        onClick={() => useSkill(selectedFieldMonster, 'advanced')}
                        style={{
                          ...styles.actionButton,
                          background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                        disabled={!monster.charges || monster.charges.length < 2}
                      >
                        上級技 (チャージ{monster.charges?.length || 0}/2)
                      </button>
                    )}
                  </div>
                );
              })()
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              {phase === 2 && (
                <button onClick={nextPhase} style={styles.actionButton}>
                  バトルフェイズへ →
                </button>
              )}
              {phase === 3 && (
                <>
                  {attackingMonster !== null && (
                    <button onClick={handleDirectAttack} style={{ ...styles.actionButton, background: '#ff4444' }}>
                      ダイレクトアタック
                    </button>
                  )}
                  <button onClick={nextPhase} style={styles.actionButton}>
                    ターン終了 →
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ログ */}
          <div style={{ width: '250px' }}>
            <GameLog logs={logs} />
          </div>
        </div>

        {/* プレイヤー1エリア（下） */}
        <div style={{ ...styles.playerArea, background: currentPlayer === 1 ? 'rgba(77,166,255,0.1)' : 'transparent' }}>
          {/* 情報パネル */}
          <div style={styles.infoPanel}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#4da6ff' }}>
              プレイヤー1
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>LP: {p1Life}</div>
              <div style={styles.lifeBar}>
                <div style={{
                  ...styles.lifeBarFill,
                  width: `${(p1Life / INITIAL_LIFE) * 100}%`,
                  background: 'linear-gradient(90deg, #4da6ff, #66d9ff)',
                }} />
              </div>
            </div>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>SP: {p1ActiveSP}/{p1ActiveSP + p1RestedSP}</div>
            <SPTokens active={p1ActiveSP} rested={p1RestedSP} max={MAX_SP} />
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#888' }}>
              デッキ: {p1Deck.length} | 墓地: {p1Graveyard.length}
            </div>
          </div>

          {/* フィールド */}
          <div style={styles.fieldArea}>
            {/* モンスターゾーン */}
            <div style={styles.monsterZone}>
              {p1Field.map((monster, i) => (
                <FieldMonster
                  key={i}
                  monster={monster}
                  onClick={() => handleFieldSlotClick(i, 1)}
                  selected={selectedFieldMonster === i && currentPlayer === 1}
                  canAttack={currentPlayer === 1 && phase === 3 && monster?.canAttack}
                  isTarget={currentPlayer === 2 && phase === 3 && attackingMonster !== null}
                  isValidTarget={currentPlayer === 1 && phase === 2 && selectedHandCard && selectedHandCard.type === 'monster' && !monster}
                />
              ))}
            </div>
            {/* 手札 */}
            <div style={styles.handArea}>
              {p1Hand.map((card) => (
                <Card
                  key={card.uniqueId}
                  card={card}
                  onClick={() => handleHandCardClick(card)}
                  selected={selectedHandCard?.uniqueId === card.uniqueId}
                  inHand
                  disabled={currentPlayer !== 1 || phase !== 2}
                />
              ))}
            </div>
          </div>

          {/* フィールドカード */}
          <div style={styles.infoPanel}>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>フィールド</div>
            {p1FieldCard ? (
              <Card card={p1FieldCard} small />
            ) : (
              <div style={{ ...styles.cardSlot, width: '80px', height: '100px' }}>なし</div>
            )}
            {selectedHandCard && currentPlayer === 1 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '10px', 
                background: 'rgba(107,76,230,0.2)', 
                borderRadius: '8px',
                border: '1px solid rgba(107,76,230,0.5)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#a78bfa' }}>
                  📋 選択中: {selectedHandCard.name}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
                  属性: {selectedHandCard.attribute} | コスト: {selectedHandCard.cost} SP
                </div>
                {selectedHandCard.type === 'monster' && (
                  <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                    ⚔️ {selectedHandCard.attack} | ❤️ {selectedHandCard.hp}
                  </div>
                )}
                <div style={{
                  fontSize: '10px',
                  color: '#e0e0e0',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '6px',
                  borderRadius: '4px',
                  lineHeight: '1.4',
                  maxHeight: '80px',
                  overflowY: 'auto',
                }}>
                  {selectedHandCard.effect || 'なし'}
                </div>
                {/* 技情報 */}
                {selectedHandCard.type === 'monster' && (selectedHandCard.basicSkill || selectedHandCard.advancedSkill) && (
                  <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: '1.4' }}>
                    {selectedHandCard.basicSkill && (
                      <div style={{
                        marginBottom: '4px',
                        padding: '4px',
                        background: 'rgba(76,175,80,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(76,175,80,0.3)',
                      }}>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>基本技(1):</span>
                        <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{selectedHandCard.basicSkill.text}</span>
                      </div>
                    )}
                    {selectedHandCard.advancedSkill && (
                      <div style={{
                        padding: '4px',
                        background: 'rgba(255,152,0,0.2)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,152,0,0.3)',
                      }}>
                        <span style={{ color: '#ff9800', fontWeight: 'bold' }}>上級技(2):</span>
                        <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>{selectedHandCard.advancedSkill.text}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ 
                  fontSize: '10px', 
                  color: '#6b4ce6', 
                  marginTop: '6px',
                  fontWeight: 'bold',
                }}>
                  {selectedHandCard.type === 'monster' && '👆 空きスロットをクリックして召喚'}
                  {selectedHandCard.type === 'magic' && '👆 「バトルフェイズへ」で発動'}
                  {selectedHandCard.type === 'field' && '👆 フィールドゾーンに設置'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
