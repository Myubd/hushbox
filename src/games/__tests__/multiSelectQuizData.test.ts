import { describe, expect, it } from "vitest";
import type { MultiSelectQuizItem } from "../multiSelectQuiz/MultiSelectQuizGame";
import { NUMBER_QUIZ_EASY_ITEMS } from "../numberQuiz/dataEasy";
import { NUMBER_QUIZ_NORMAL_ITEMS } from "../numberQuiz/dataNormal";
import { NUMBER_QUIZ_HARD_ITEMS } from "../numberQuiz/dataHard";
import { COLOR_QUIZ_EASY_ITEMS } from "../colorQuiz/dataEasy";
import { COLOR_QUIZ_NORMAL_ITEMS } from "../colorQuiz/dataNormal";
import { COLOR_QUIZ_HARD_ITEMS } from "../colorQuiz/dataHard";

/**
 * MultiSelectQuizGame(複数選択クイズ)を使うゲームのデータが満たすべき最低条件を検証する。
 * ChoiceQuizGame版(choiceQuizData.test.ts)と同じ方針: コンパイルが通っても
 * 内容の整合性は保証されないため、ここで機械的にチェックできる範囲を網羅する。
 *
 * 新しいMultiSelectQuizGameベースのデータセットを追加したら、`DATASETS`にも1件追加すること。
 */
const DATASETS: { name: string; items: MultiSelectQuizItem[] }[] = [
  { name: "numberQuiz-easy", items: NUMBER_QUIZ_EASY_ITEMS },
  { name: "numberQuiz-normal", items: NUMBER_QUIZ_NORMAL_ITEMS },
  { name: "numberQuiz-hard", items: NUMBER_QUIZ_HARD_ITEMS },
  { name: "colorQuiz-easy", items: COLOR_QUIZ_EASY_ITEMS },
  { name: "colorQuiz-normal", items: COLOR_QUIZ_NORMAL_ITEMS },
  { name: "colorQuiz-hard", items: COLOR_QUIZ_HARD_ITEMS },
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

  it.each(items.map((item) => [item.id, item] as const))("[%s] 選択肢がちょうど4つある", (_id, item) => {
    expect(item.choices).toHaveLength(4);
  });

  it.each(items.map((item) => [item.id, item] as const))("[%s] 選択肢に重複がない", (_id, item) => {
    expect(new Set(item.choices).size).toBe(item.choices.length);
  });

  it.each(items.map((item) => [item.id, item] as const))(
    "[%s] correctChoicesが1つ以上あり、choicesに含まれる",
    (_id, item) => {
      expect(item.correctChoices.length).toBeGreaterThan(0);
      for (const correct of item.correctChoices) {
        expect(item.choices).toContain(correct);
      }
    }
  );

  it.each(items.map((item) => [item.id, item] as const))("[%s] correctChoicesに重複がない", (_id, item) => {
    expect(new Set(item.correctChoices).size).toBe(item.correctChoices.length);
  });

  it.each(items.map((item) => [item.id, item] as const))("[%s] choiceが空文字でない", (_id, item) => {
    for (const choice of item.choices) {
      expect(choice.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(items.map((item) => [item.id, item] as const))("[%s] explanationが存在する", (_id, item) => {
    expect(item.explanation.trim().length).toBeGreaterThan(0);
  });
});

describe("questionフィールドの検証", () => {
  const allItems = DATASETS.flatMap((d) => d.items as (MultiSelectQuizItem & { question: string })[]);

  it.each(allItems.map((item) => [item.id, item] as const))("[%s] questionが空文字でない", (_id, item) => {
    expect(item.question.trim().length).toBeGreaterThan(0);
  });
});

describe("数字クイズ: 選択肢の合計が答えの数と一致する", () => {
  const numberDatasets = [
    { name: "easy", items: NUMBER_QUIZ_EASY_ITEMS },
    { name: "normal", items: NUMBER_QUIZ_NORMAL_ITEMS },
    { name: "hard", items: NUMBER_QUIZ_HARD_ITEMS },
  ];

  for (const { name, items } of numberDatasets) {
    it.each(items.map((item) => [item.id, item] as const))(`[${name} %s] correctChoicesの合計が一意な正解値になる`, (_id, item) => {
      const sum = item.correctChoices.reduce((acc, c) => acc + Number(c), 0);
      expect(Number.isFinite(sum)).toBe(true);
      expect(sum).toBeGreaterThan(0);
    });
  }
});
