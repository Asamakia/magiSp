#!/usr/bin/env python3
"""
cardlist_v3.csvからトリガー効果を抽出し、分類するスクリプト
"""
import re
from collections import defaultdict

# CSVファイルのパス
csv_path = "src/cardlist/cardlist_v3.csv"

# トリガーパターンの抽出
trigger_pattern = re.compile(r'【([^】]+)】')

# トリガーをカウント
trigger_counts = defaultdict(int)
trigger_examples = defaultdict(list)

with open(csv_path, 'r', encoding='utf-8') as f:
    for line_num, line in enumerate(f, 1):
        # Skip header
        if line_num == 1:
            continue

        # 【】で囲まれたすべてのパターンを抽出
        triggers = trigger_pattern.findall(line)

        # カード情報を取得
        parts = line.strip().split(',')
        if len(parts) >= 2:
            card_id = parts[0]
            card_name = parts[1]
        else:
            card_id = f"Line {line_num}"
            card_name = "Unknown"

        for trigger in triggers:
            # カテゴリ/属性っぽいものを除外（トリガーではないもの）
            # トリガーかどうかを判定（時/後/前/開始時/ダメージ/発動などの単語を含む）
            if any(keyword in trigger for keyword in [
                '時', '後', '前', '開始', 'ダメージ', '発動', '常時', '破壊', '召喚',
                'フェイズ', 'ライフ', '墓地', '覚醒', '攻撃'
            ]):
                trigger_counts[trigger] += 1
                if len(trigger_examples[trigger]) < 3:  # 最初の3例のみ保存
                    trigger_examples[trigger].append(f"{card_id} ({card_name})")

# 結果を表示
print("=" * 80)
print("トリガー効果の分類と統計")
print("=" * 80)
print()

# トリガーを頻度順にソート
sorted_triggers = sorted(trigger_counts.items(), key=lambda x: x[1], reverse=True)

# カテゴリ別に分類
categories = {
    '召喚時': [],
    '破壊時': [],
    'フェイズトリガー': [],
    '攻撃関連': [],
    '墓地発動': [],
    '常時効果': [],
    '条件発動': [],
    'その他': []
}

for trigger, count in sorted_triggers:
    if '召喚時' in trigger:
        categories['召喚時'].append((trigger, count))
    elif '壊' in trigger or '自壊時' in trigger:
        categories['破壊時'].append((trigger, count))
    elif 'フェイズ' in trigger or 'ターン' in trigger:
        categories['フェイズトリガー'].append((trigger, count))
    elif '攻撃' in trigger:
        categories['攻撃関連'].append((trigger, count))
    elif '墓地' in trigger:
        categories['墓地発動'].append((trigger, count))
    elif '常時' in trigger:
        categories['常時効果'].append((trigger, count))
    elif 'ライフ' in trigger or '場に' in trigger:
        categories['条件発動'].append((trigger, count))
    else:
        categories['その他'].append((trigger, count))

# カテゴリ別に表示
for category, triggers in categories.items():
    if triggers:
        print(f"\n【{category}】 ({len(triggers)} 種類)")
        print("-" * 80)
        for trigger, count in triggers:
            print(f"  【{trigger}】 - {count}回使用")
            if trigger in trigger_examples:
                print(f"    例: {', '.join(trigger_examples[trigger][:3])}")
        print()

# 統計サマリー
print("\n" + "=" * 80)
print("統計サマリー")
print("=" * 80)
print(f"トリガー種類の総数: {len(trigger_counts)}")
print(f"トリガー使用回数の合計: {sum(trigger_counts.values())}")
print()
print("最も使用頻度の高いトリガー TOP 10:")
for i, (trigger, count) in enumerate(sorted_triggers[:10], 1):
    print(f"  {i}. 【{trigger}】 - {count}回")
print()
