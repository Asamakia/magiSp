// ========================================
// カードデータ管理
// ========================================

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
// CSVパーサー関数
// ========================================
export const parseCSV = (csvText) => {
  const cards = [];
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  // 文字列全体を1文字ずつ処理して、引用符内の改行を正しく扱う
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされた引用符（""）
        currentField += '"';
        i++; // 次の引用符をスキップ
      } else {
        // 引用符の開始または終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールド区切り（引用符外のみ）
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      // 行区切り（引用符外のみ）
      currentRow.push(currentField);
      if (currentRow.some(field => field.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
      // Windows形式の改行（\r\n）
      currentRow.push(currentField);
      if (currentRow.some(field => field.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++; // \nをスキップ
    } else if (char === '\r' && !inQuotes) {
      // Mac形式の改行（\r）
      currentRow.push(currentField);
      if (currentRow.some(field => field.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      // 通常の文字（引用符内の改行も含む）
      currentField += char;
    }
  }

  // 最後のフィールドと行を追加
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(field => field.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  // ヘッダー行をスキップして、各行をカードオブジェクトに変換
  for (let i = 1; i < rows.length; i++) {
    const fields = rows[i];

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
  }

  return cards;
};

// ========================================
// カードデータ（プロトタイプ用サンプル - CSVロード失敗時のフォールバック）
// ========================================
export const SAMPLE_CARDS = [
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
// CSV読み込み関数
// ========================================
export const loadCardsFromCSV = async () => {
  try {
    const response = await fetch('/cardlist/cardlist.csv');
    if (!response.ok) {
      throw new Error('CSVファイルの読み込みに失敗しました');
    }
    const csvText = await response.text();
    const parsedCards = parseCSV(csvText);

    if (parsedCards.length > 0) {
      console.log(`${parsedCards.length}枚のカードをCSVから読み込みました`);
      return parsedCards;
    } else {
      console.warn('CSVからカードが読み込めませんでした。サンプルカードを使用します。');
      return SAMPLE_CARDS;
    }
  } catch (error) {
    console.error('CSVの読み込みエラー:', error);
    console.log('サンプルカードを使用します。');
    return SAMPLE_CARDS;
  }
};
