import { describe, expect, it } from "vitest";
import { MAKE10_DIFFICULTIES } from "../make10/data";
import { checkMake10Answer } from "../make10/engine";

/**
 * メイク10の問題データ(4〜7桁、合計7,730問)の整合性を検証する。
 *
 * データ生成時にPython側で一度ファクトチェック済みだが、このアプリが実際に
 * 使う判定ロジック(engine.ts の checkMake10Answer)そのものを使って、
 * 「収録されているsolutionが、そのdigitsに対して本当に正解と判定されるか」を
 * 全問についてここでも再検証する。ロジックとデータの食い違い
 * (将来どちらかだけ編集ミスが入った場合)を検出するための回帰テスト。
 */
describe("メイク10のデータ検証", () => {
  it("4つの難易度すべてにデータが存在する", () => {
    for (const d of MAKE10_DIFFICULTIES) {
      expect(d.puzzles.length, `${d.id}にデータが無い`).toBeGreaterThan(0);
    }
  });

  it("桁数がidと一致している(d4なら4桁、d7なら7桁)", () => {
    const expectedLength: Record<string, number> = { d4: 4, d5: 5, d6: 6, d7: 7 };
    for (const d of MAKE10_DIFFICULTIES) {
      for (const p of d.puzzles) {
        expect(p.digits, `${d.id}/${p.id}`).toHaveLength(expectedLength[d.id]);
      }
    }
  });

  it("数字はすべて1〜9(0を含まない)", () => {
    for (const d of MAKE10_DIFFICULTIES) {
      for (const p of d.puzzles) {
        expect([...p.digits].every((c) => c >= "1" && c <= "9"), `${d.id}/${p.id}: ${p.digits}`).toBe(
          true
        );
      }
    }
  });

  for (const d of MAKE10_DIFFICULTIES) {
    it(`${d.id}: idがすべて一意である`, () => {
      const ids = d.puzzles.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(d.puzzles.map((p) => [p.id, p] as const))(
      `[${d.id} %s] 収録されているsolutionは実際に正解と判定される`,
      (_id, p) => {
        const r = checkMake10Answer(p.solution, p.digits);
        expect(r.ok, `digits=${p.digits} solution=${p.solution} => ${r.message}`).toBe(true);
      }
    );
  }
});
