import { describe, expect, it } from "vitest";
import { CANGJIE_1_ITEMS } from "../cangjie/data1";
import { CANGJIE_2_ITEMS } from "../cangjie/data2";
import { CANGJIE_4_ITEMS } from "../cangjie/data4";
import type { CangjieItem } from "../cangjie/types";

/**
 * 倉頡パズルの問題データ(単漢字/二字熟語/四字熟語、各300問)の整合性を検証する。
 * 元データ自体は、パーツの並び⇔正解の倉頡コード⇔誤答のコードが実際に異なることを
 * Python側で機械的に照合済み(1問だけ、倉頡コードの重複が意図的に解説されている
 * 既知の例外があるが、データの誤りではない)。ここでは、アプリが実際に使う形
 * (CangjieItem配列)としての基本的な整合性を確認する。
 */
const CATEGORIES: { label: string; items: CangjieItem[] }[] = [
  { label: "単漢字", items: CANGJIE_1_ITEMS },
  { label: "二字熟語", items: CANGJIE_2_ITEMS },
  { label: "四字熟語", items: CANGJIE_4_ITEMS },
];

describe("倉頡パズルのデータ検証", () => {
  for (const { label, items } of CATEGORIES) {
    it(`${label}: 300問ちょうど収録されている`, () => {
      expect(items).toHaveLength(300);
    });

    it(`${label}: idがすべて一意である`, () => {
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it(`${label}: 全問について選択肢が4つ・重複なし・正解を含む`, () => {
      for (const item of items) {
        expect(item.choices, item.id).toHaveLength(4);
        expect(new Set(item.choices).size, item.id).toBe(4);
        expect(item.choices, item.id).toContain(item.correctChoice);
      }
    });

    it(`${label}: パーツ・解説が空でない`, () => {
      for (const item of items) {
        expect(item.parts.trim().length, item.id).toBeGreaterThan(0);
        expect(item.explanation.trim().length, item.id).toBeGreaterThan(0);
      }
    });
  }
});
