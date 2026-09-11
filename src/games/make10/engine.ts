/**
 * メイク10パズルの式パーサー・評価エンジン。
 *
 * ルール: 与えられた数字(1〜9)をちょうど1回ずつすべて使い、+ - × ÷ とカッコを
 * 使って結果が10になる式を作る。数字を並べて2桁の数として扱うこと(例: "1"と"2"を
 * つなげて"12"にする)は許可しない — 元データの解答例が単独の数字しか使っていない
 * ことと一致させるため、パーサーは数字を常に1文字ずつ独立したトークンとして読む
 * (結果として "12" のような連続した数字はパースエラーになる。これは意図的な仕様)。
 */

export interface Make10Puzzle {
  id: string;
  /** 使用する数字(例: "111113")。順序は表示上の参考でしかなく、並び替えは自由。 */
  digits: string;
  /** ヒント・答え合わせ用の解答例(このアプリのデータとして機械的に検証済み)。 */
  solution: string;
}

type Token =
  | { type: "num"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" };

class Make10ParseError extends Error {
  reason: "syntax" | "division_by_zero";
  constructor(reason: "syntax" | "division_by_zero", message: string) {
    super(message);
    this.reason = reason;
  }
}

/** 全角の数字・演算子・カッコ、空白を、半角ASCIIに正規化する。 */
export function normalizeExpression(input: string): string {
  return input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/＋/g, "+")
    .replace(/[－ー−]/g, "-")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s+/g, "");
}

/** 正規化後の文字列から、使われている数字だけを昇順に並べた文字列を作る(digit-multisetの比較用)。 */
export function extractDigitsKey(normalized: string): string {
  return [...normalized].filter((c) => c >= "0" && c <= "9").sort().join("");
}

function digitsKey(digits: string): string {
  return [...digits].sort().join("");
}

function tokenize(s: string): Token[] | null {
  const tokens: Token[] = [];
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") {
      tokens.push({ type: "num", value: Number(ch) });
    } else if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch });
    } else if (ch === "(") {
      tokens.push({ type: "lparen" });
    } else if (ch === ")") {
      tokens.push({ type: "rparen" });
    } else {
      return null;
    }
  }
  return tokens;
}

/**
 * 再帰下降パーサーで四則演算+カッコを評価する。
 * 文法: expr := term (('+'|'-') term)* / term := factor (('*'|'/') factor)*
 *      factor := NUMBER | '(' expr ')' | '-' factor
 */
function evaluateTokens(tokens: Token[]): number {
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }
  function advance(): Token {
    const t = tokens[pos];
    pos += 1;
    if (!t) throw new Make10ParseError("syntax", "式が途中で終わっています");
    return t;
  }

  function parseExpr(): number {
    let value = parseTerm();
    for (;;) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "+" || t.value === "-")) {
        advance();
        const rhs = parseTerm();
        value = t.value === "+" ? value + rhs : value - rhs;
      } else {
        break;
      }
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    for (;;) {
      const t = peek();
      if (t && t.type === "op" && (t.value === "*" || t.value === "/")) {
        advance();
        const rhs = parseFactor();
        if (t.value === "/") {
          if (rhs === 0) {
            throw new Make10ParseError("division_by_zero", "0で割ることはできません");
          }
          value = value / rhs;
        } else {
          value = value * rhs;
        }
      } else {
        break;
      }
    }
    return value;
  }

  function parseFactor(): number {
    const t = advance();
    if (t.type === "op" && t.value === "-") {
      return -parseFactor();
    }
    if (t.type === "num") return t.value;
    if (t.type === "lparen") {
      const v = parseExpr();
      const close = advance();
      if (close.type !== "rparen") {
        throw new Make10ParseError("syntax", "カッコが閉じていません");
      }
      return v;
    }
    throw new Make10ParseError("syntax", "式の形が正しくありません");
  }

  const result = parseExpr();
  if (pos !== tokens.length) {
    throw new Make10ParseError("syntax", "式の形が正しくありません(余分な文字があります)");
  }
  return result;
}

export type Make10CheckReason =
  | "empty"
  | "invalid_char"
  | "digit_mismatch"
  | "syntax"
  | "division_by_zero"
  | "not_ten";

export interface Make10CheckResult {
  ok: boolean;
  /** 計算できた場合の値(不正解でも、計算自体はできた場合は入る)。 */
  value?: number;
  reason?: Make10CheckReason;
  /** 生徒向けの短いフィードバック文。 */
  message: string;
}

function formatNumber(n: number): string {
  // 浮動小数点の丸め誤差(9.999999999999998など)を見た目上そろえる。
  const rounded = Math.round(n * 1e6) / 1e6;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * 入力された式が、指定した数字をちょうど1回ずつ使い、10になっているかを判定する。
 * このアプリ内の唯一の正誤判定ロジック(データ側のsolutionと文字列比較はしない)。
 */
export function checkMake10Answer(input: string, requiredDigits: string): Make10CheckResult {
  const normalized = normalizeExpression(input);
  if (!normalized) {
    return { ok: false, reason: "empty", message: "式を入力してね" };
  }
  if (!/^[0-9+\-*/()]+$/.test(normalized)) {
    return { ok: false, reason: "invalid_char", message: "数字(1〜9)と + - × ÷ ( ) だけを使ってね" };
  }

  const used = extractDigitsKey(normalized);
  const needed = digitsKey(requiredDigits);
  if (used !== needed) {
    return {
      ok: false,
      reason: "digit_mismatch",
      message: `「${requiredDigits}」の数字を1回ずつ、全部使ってね(今の式で使っている数字: ${used || "なし"})`,
    };
  }

  const tokens = tokenize(normalized);
  if (!tokens) {
    return { ok: false, reason: "invalid_char", message: "数字(1〜9)と + - × ÷ ( ) だけを使ってね" };
  }

  try {
    const value = evaluateTokens(tokens);
    if (Math.abs(value - 10) > 1e-6) {
      return {
        ok: false,
        value,
        reason: "not_ten",
        message: `計算すると ${formatNumber(value)} になったよ。もう一度考えてみよう`,
      };
    }
    return { ok: true, value: 10, message: "せいかい!🎉" };
  } catch (e) {
    if (e instanceof Make10ParseError && e.reason === "division_by_zero") {
      return { ok: false, reason: "division_by_zero", message: "0で割ることはできないよ" };
    }
    return {
      ok: false,
      reason: "syntax",
      message: "式の形が正しくないよ(カッコの対応などを確認してね)",
    };
  }
}
