import { describe, expect, it } from "vitest";
import { checkMake10Answer, extractDigitsKey, normalizeExpression } from "../make10/engine";

describe("normalizeExpression", () => {
  it("全角数字・演算子・カッコ・空白を半角に正規化する", () => {
    expect(normalizeExpression("（１＋２）× ３ ÷ ４")).toBe("(1+2)*3/4");
  });

  it("半角はそのまま変化しない", () => {
    expect(normalizeExpression("(1+2)*3/4")).toBe("(1+2)*3/4");
  });
});

describe("extractDigitsKey", () => {
  it("正規化済み文字列から数字だけを昇順に取り出す", () => {
    expect(extractDigitsKey("(9+1)*3-5")).toBe("1359");
  });
});

describe("checkMake10Answer", () => {
  it("正しい式(サンプル: 1115 -> (1+1)×5×1)を正解と判定する", () => {
    const r = checkMake10Answer("(1+1)×5×1", "1115");
    expect(r.ok).toBe(true);
    expect(r.value).toBe(10);
  });

  it("数字の並び順が違っても、多重集合が一致すれば正解と判定する", () => {
    const r = checkMake10Answer("5×1×(1+1)", "1115");
    expect(r.ok).toBe(true);
  });

  it("半角/全角どちらの演算子でも正しく評価する", () => {
    const half = checkMake10Answer("(1+1)*5*1", "1115");
    const full = checkMake10Answer("（１＋１）×５×１", "1115");
    expect(half.ok).toBe(true);
    expect(full.ok).toBe(true);
  });

  it("計算結果が10でなければ不正解(not_ten)", () => {
    const r = checkMake10Answer("1+1+1+5", "1115");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("not_ten");
    expect(r.value).toBeCloseTo(8);
  });

  it("使う数字が指定と異なれば不正解(digit_mismatch)", () => {
    const r = checkMake10Answer("(1+1)*5*2", "1115");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("digit_mismatch");
  });

  it("数字を2桁の数として連結すること(例: 12)は許可しない", () => {
    // "12" は "1" "2" の連結ではなく別々のトークンとして扱われ、
    // 演算子が無いため構文エラーになる。
    const r = checkMake10Answer("12+3", "123");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("syntax");
  });

  it("0で割る式はエラーとして扱う", () => {
    const r = checkMake10Answer("1/(1-1)", "111");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("division_by_zero");
  });

  it("数字・演算子・カッコ以外の文字は拒否する", () => {
    const r = checkMake10Answer("1+1+5+1a", "1115");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid_char");
  });

  it("空文字は拒否する", () => {
    const r = checkMake10Answer("", "1115");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty");
  });

  it("カッコが閉じていない式は構文エラーとして扱う", () => {
    const r = checkMake10Answer("((1+1)*5*1", "1115");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("syntax");
  });

  it("演算子の優先順位(×÷が+-より先)を正しく扱う", () => {
    // 2+2*4=10 (掛け算が先)
    const r = checkMake10Answer("2+2*4", "224");
    expect(r.ok).toBe(true);
  });

  it("除算を含む式で、割り切れない中間結果でも最終的に10になれば正解", () => {
    // 5÷(8÷(7+9)) = 5 / 0.5 = 10
    const r = checkMake10Answer("5÷(8÷(7+9))", "5879");
    expect(r.ok).toBe(true);
  });
});
