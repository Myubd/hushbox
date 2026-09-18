import { describe, expect, it } from "vitest";
import type { PhishingItem } from "../phishingSimulator/types";
import { PHISHING_EASY_ITEMS } from "../phishingSimulator/dataEasy";
import { PHISHING_NORMAL_ITEMS } from "../phishingSimulator/dataNormal";
import { PHISHING_HARD_ITEMS } from "../phishingSimulator/dataHard";

/**
 * フィッシングシミュレーター(MultiSelectQuizGameベース)のデータが満たすべき
 * 最低条件を検証する。piiHunterData.test.ts と方針・検証内容はほぼ同じ
 * (messageTextとpostTextの違いのみ)。
 *
 * 新しい難易度・問題を追加したら、`DATASETS`にも反映すること。
 */
const DATASETS: { name: string; items: PhishingItem[] }[] = [
  { name: "phishing-easy", items: PHISHING_EASY_ITEMS },
  { name: "phishing-normal", items: PHISHING_NORMAL_ITEMS },
  { name: "phishing-hard", items: PHISHING_HARD_ITEMS },
];

// 実在の企業・サービス名を騙る問題文になっていないかの簡易チェック。
// 完全な検出はできないが、代表的な誤りに早く気づけるようにしておく。
const REAL_BRAND_HINTS = [
  "amazon",
  "google",
  "apple",
  "line株式会社",
  "楽天",
  "ヤフー",
  "yahoo",
  "docomo",
  "ドコモ",
  "softbank",
  "ソフトバンク",
];

describe.each(DATASETS)("$name のデータ検証", ({ items }) => {
  it("問題データが1件以上存在する", () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it("idがすべて一意である", () => {
    const ids = items.map((item) => item.id);
    const uniqueIds = new Set(ids);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(uniqueIds.size, `重複したid: ${[...new Set(duplicates)].join(", ")}`).toBe(items.length);
  });

  it.each(items.map((item) => [item.id, item] as const))(
    "[%s] 選択肢が2つ以上あり、重複がない",
    (_id, item) => {
      expect(item.choices.length).toBeGreaterThanOrEqual(2);
      expect(new Set(item.choices).size).toBe(item.choices.length);
    }
  );

  it.each(items.map((item) => [item.id, item] as const))(
    "[%s] correctChoicesが1つ以上あり、choicesの部分集合で重複がない",
    (_id, item) => {
      expect(item.correctChoices.length).toBeGreaterThan(0);
      expect(item.correctChoices.length).toBeLessThanOrEqual(item.choices.length);
      expect(new Set(item.correctChoices).size).toBe(item.correctChoices.length);
      for (const correct of item.correctChoices) {
        expect(item.choices).toContain(correct);
      }
    }
  );

  it.each(items.map((item) => [item.id, item] as const))(
    "[%s] 少なくとも1つは不正解の選択肢(ひっかけ)がある",
    (_id, item) => {
      expect(item.choices.length).toBeGreaterThan(item.correctChoices.length);
    }
  );

  it.each(items.map((item) => [item.id, item] as const))("[%s] choiceが空文字でない", (_id, item) => {
    for (const choice of item.choices) {
      expect(choice.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(items.map((item) => [item.id, item] as const))(
    "[%s] messageText・senderLabel・explanationが空文字でない",
    (_id, item) => {
      expect(item.messageText.trim().length).toBeGreaterThan(0);
      expect(item.senderLabel.trim().length).toBeGreaterThan(0);
      expect(item.explanation.trim().length).toBeGreaterThan(0);
    }
  );

  it.each(items.map((item) => [item.id, item] as const))(
    "[%s] correctChoicesの各フレーズがmessageText内に実際に出現する",
    (_id, item) => {
      // 選択肢はメッセージ本文から抜き出したものなので、正解フレーズは本文内に
      // 含まれているはず(含まれていない場合、データの入力ミスの可能性が高い)。
      for (const correct of item.correctChoices) {
        expect(
          item.messageText.includes(correct),
          `"${correct}" がmessageText("${item.messageText}")内に見つかりません`
        ).toBe(true);
      }
    }
  );

  it.each(items.map((item) => [item.id, item] as const))(
    "[%s] 実在の企業・サービス名を騙っていない(架空の名称のみを使う方針)",
    (_id, item) => {
      const haystack = (item.messageText + item.senderLabel).toLowerCase();
      for (const brand of REAL_BRAND_HINTS) {
        expect(haystack.includes(brand), `実在ブランド名らしき文字列 "${brand}" が含まれています`).toBe(
          false
        );
      }
    }
  );
});
