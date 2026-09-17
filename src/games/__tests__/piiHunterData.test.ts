import { describe, expect, it } from "vitest";
import type { PiiHunterItem } from "../piiHunter/types";
import { PII_HUNTER_EASY_ITEMS } from "../piiHunter/dataEasy";
import { PII_HUNTER_NORMAL_ITEMS } from "../piiHunter/dataNormal";
import { PII_HUNTER_HARD_ITEMS } from "../piiHunter/dataHard";

/**
 * PIIハンター(MultiSelectQuizGameベース)のデータが満たすべき最低条件を検証する。
 * multiSelectQuizData.test.ts と方針は同じだが、PIIハンターは選択肢の数が
 * 文章の分割のしかたによって変わる(4つ固定ではない)ため、別ファイルにしている。
 *
 * 新しい難易度・問題を追加したら、`DATASETS`にも反映すること。
 */
const DATASETS: { name: string; items: PiiHunterItem[] }[] = [
  { name: "piiHunter-easy", items: PII_HUNTER_EASY_ITEMS },
  { name: "piiHunter-normal", items: PII_HUNTER_NORMAL_ITEMS },
  { name: "piiHunter-hard", items: PII_HUNTER_HARD_ITEMS },
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
    "[%s] postTextとexplanationが空文字でない",
    (_id, item) => {
      expect(item.postText.trim().length).toBeGreaterThan(0);
      expect(item.explanation.trim().length).toBeGreaterThan(0);
    }
  );

  it.each(items.map((item) => [item.id, item] as const))(
    "[%s] correctChoicesの各フレーズがpostText内に実際に出現する",
    (_id, item) => {
      // 選択肢は元の文章を分割したものなので、正解フレーズは文章内に含まれているはず。
      // (含まれていない場合、データの入力ミスの可能性が高い)
      for (const correct of item.correctChoices) {
        expect(
          item.postText.includes(correct),
          `"${correct}" がpostText("${item.postText}")内に見つかりません`
        ).toBe(true);
      }
    }
  );
});
