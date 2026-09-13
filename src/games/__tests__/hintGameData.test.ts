import { describe, expect, it } from "vitest";
import { HINT_GAME_QUESTIONS } from "../hintGame/data";
import { HINT_GAME_CATEGORIES } from "../hintGame/types";

/**
 * ヒントゲームのデータが満たすべき最低条件を検証する。
 * データはこの端末にしか存在しないため、コンパイルが通っても内容の整合性は
 * 保証されない。ここで機械的にチェックできる範囲を網羅する。
 */
describe("hintGame のデータ検証", () => {
  it("問題データが1件以上存在する", () => {
    expect(HINT_GAME_QUESTIONS.length).toBeGreaterThan(0);
  });

  it("idがすべて一意である", () => {
    const ids = HINT_GAME_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(HINT_GAME_QUESTIONS.length);
  });

  it("answerがすべて一意である", () => {
    const answers = HINT_GAME_QUESTIONS.map((q) => q.answer);
    const uniqueAnswers = new Set(answers);
    const duplicates = answers.filter((a, i) => answers.indexOf(a) !== i);
    expect(uniqueAnswers.size, `重複した答え: ${[...new Set(duplicates)].join(", ")}`).toBe(
      HINT_GAME_QUESTIONS.length
    );
  });

  it("すべてのcategoryがHINT_GAME_CATEGORIESに含まれる", () => {
    for (const q of HINT_GAME_QUESTIONS) {
      expect(HINT_GAME_CATEGORIES, `未登録カテゴリ: ${q.category}`).toContain(q.category);
    }
  });

  it.each(HINT_GAME_QUESTIONS.map((q) => [q.id, q] as const))("[%s] answerが空文字でない", (_id, q) => {
    expect(q.answer.trim().length).toBeGreaterThan(0);
  });

  it.each(HINT_GAME_QUESTIONS.map((q) => [q.id, q] as const))(
    "[%s] easy/normal/hardのヒントがそれぞれ3つある",
    (_id, q) => {
      expect(q.hints.easy).toHaveLength(3);
      expect(q.hints.normal).toHaveLength(3);
      expect(q.hints.hard).toHaveLength(3);
    }
  );

  it.each(HINT_GAME_QUESTIONS.map((q) => [q.id, q] as const))("[%s] ヒントが空文字でない", (_id, q) => {
    for (const hint of [...q.hints.easy, ...q.hints.normal, ...q.hints.hard]) {
      expect(hint.trim().length).toBeGreaterThan(0);
    }
  });

  // 「hard=漢字1字」は元データで例外なく成立している(検証済み)ため厳密にチェックする。
  // 一方「easy=3文字まで/normal=2文字まで」は元データ側にも例外(「無抵抗」「大統領」など)が
  // 複数あり、あくまで大まかな目安のため、ここでは厳密な文字数チェックはしない。
  it.each(HINT_GAME_QUESTIONS.map((q) => [q.id, q] as const))(
    "[%s] hardのヒントはすべて1文字である",
    (_id, q) => {
      for (const hint of q.hints.hard) {
        expect(hint.length).toBe(1);
      }
    }
  );
});
