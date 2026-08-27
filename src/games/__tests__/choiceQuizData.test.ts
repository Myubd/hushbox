import { describe, expect, it } from "vitest";
import type { ChoiceQuizItem } from "../ChoiceQuizGame";
import { HISTORY_TIMESTAMP_QUESTIONS } from "../historyTimestamp/data";
import { WORLD_MAP_TIME_TRAVEL_QUESTIONS } from "../worldMapTimeTravel/data";

/**
 * ChoiceQuizGame(4択クイズ)を使うゲームのデータが満たすべき最低条件を検証する。
 *
 * データはこの端末にしか存在せず、LLMも経由しないぶん、間違ったデータがそのまま
 * 「正しい問題」として生徒に出題されてしまう。コンパイルが通っても内容の整合性は
 * 保証されないため、ここで機械的にチェックできる範囲を網羅する。
 *
 * 新しいChoiceQuizGameベースのゲームを追加したら、`DATASETS`にも1件追加すること。
 */
const DATASETS: { name: string; items: ChoiceQuizItem[] }[] = [
  { name: "historyTimestamp", items: HISTORY_TIMESTAMP_QUESTIONS },
  { name: "worldMapTimeTravel", items: WORLD_MAP_TIME_TRAVEL_QUESTIONS },
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

  it.each(items.map((item) => [item.id, item] as const))("[%s] correctChoiceがchoicesに含まれる", (_id, item) => {
    expect(item.choices).toContain(item.correctChoice);
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
