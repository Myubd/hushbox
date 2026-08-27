import { describe, expect, it } from "vitest";
import { KANJI_SQUARE_PUZZLES } from "../kanjiSquare/data";

/**
 * 漢字スクエアのデータ整合性を検証する。
 *
 * `words`(完成する熟語)は表示・答え合わせ用に手入力されているため、
 * `answer`(中央の正解の漢字)と矛盾していてもコンパイルは通ってしまう。
 * 例えば `answer: "学"` なのに `words.bottom: "生徒"` のような編集ミスが起きても
 * TypeScriptは検出できないため、ここで全問について機械的に検証する。
 */
describe("kanjiSquare のデータ検証", () => {
  it("問題データが1件以上存在する", () => {
    expect(KANJI_SQUARE_PUZZLES.length).toBeGreaterThan(0);
  });

  it("idがすべて一意である", () => {
    const ids = KANJI_SQUARE_PUZZLES.map((p) => p.id);
    const uniqueIds = new Set(ids);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(uniqueIds.size, `重複したid: ${[...new Set(duplicates)].join(", ")}`).toBe(KANJI_SQUARE_PUZZLES.length);
  });

  it.each(KANJI_SQUARE_PUZZLES.map((p) => [p.id, p] as const))("[%s] answerは漢字1字である", (_id, p) => {
    expect([...p.answer]).toHaveLength(1);
  });

  it.each(KANJI_SQUARE_PUZZLES.map((p) => [p.id, p] as const))(
    "[%s] top/left/right/bottomもそれぞれ1字である",
    (_id, p) => {
      expect([...p.top]).toHaveLength(1);
      expect([...p.left]).toHaveLength(1);
      expect([...p.right]).toHaveLength(1);
      expect([...p.bottom]).toHaveLength(1);
    }
  );

  it.each(KANJI_SQUARE_PUZZLES.map((p) => [p.id, p] as const))(
    "[%s] 4方向の熟語がanswerと矛盾していない",
    (_id, p) => {
      expect(p.words.top, "top + answer が words.top と一致しない").toBe(`${p.top}${p.answer}`);
      expect(p.words.left, "left + answer が words.left と一致しない").toBe(`${p.left}${p.answer}`);
      expect(p.words.right, "answer + right が words.right と一致しない").toBe(`${p.answer}${p.right}`);
      expect(p.words.bottom, "answer + bottom が words.bottom と一致しない").toBe(`${p.answer}${p.bottom}`);
    }
  );
});
