/**
 * 計算れんしゅうの問題生成ロジック(クライアント側)。
 *
 * もともとRust側(learning_drill.rs の generate_arithmetic)にあった自由入力・
 * 自動生成の算数ドリルを、プラスチャレンジのゲームとして移設したもの。
 * プラスチャレンジの他のゲームと同じく、Tauri IPCを経由せずフロントエンドだけで
 * 完結するように、同じ生成ルールをそのままTypeScriptに書き写している
 * (範囲・演算の混ぜ方・コツの文言は元のRust実装と同一)。
 */

export type ArithmeticDifficulty = "low" | "mid" | "junior";
export type ArithmeticOperator = "mixed" | "addition" | "subtraction" | "multiplication" | "division";

export interface ArithmeticProblem {
  question: string;
  answer: number;
  tip: string;
}

function randInt(lo: number, hi: number): number {
  // [lo, hi] の整数を一様にランダム選択(hi含む)
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function rangeFor(difficulty: ArithmeticDifficulty): [number, number] {
  switch (difficulty) {
    case "low":
      return [1, 20];
    case "junior":
      return [1, 100];
    default:
      return [1, 50];
  }
}

// unitが「すべて」のときに、学年ごとにどの演算を混ぜるか。
// (割り算は暗算の負荷が高いため、「すべて」には低学年では含めない。
//  「割り算」を明示的に選べば低学年でも出題される)
function mixedOpsFor(difficulty: ArithmeticDifficulty): ("+" | "-" | "*")[] {
  return difficulty === "low" ? ["+", "-"] : ["+", "-", "*"];
}

function tipFor(question: string): string {
  if (question.includes("+")) {
    return "同じ位(くらい)どうしを足していこう。1の位を先に計算して、10を超えたら10の位に1くり上げるよ。";
  }
  if (question.includes("-")) {
    return "大きい数から順に引くよ。1の位が引けないときは、10の位から10借りてきて「くり下がり」で計算しよう。";
  }
  if (question.includes("×")) {
    return "九九を思い出そう。九九がまだ不安なときは、小さいほうの数だけ大きいほうの数を何回も足してもOK。";
  }
  if (question.includes("÷")) {
    return "「小さいほうの数を何回かけたら大きいほうの数になるか」を、九九の逆から探すと見つけやすいよ。";
  }
  return "";
}

export function generateArithmeticProblem(
  difficulty: ArithmeticDifficulty,
  operator: ArithmeticOperator
): ArithmeticProblem {
  const [lo, hi] = rangeFor(difficulty);

  let op: "+" | "-" | "*" | "/";
  switch (operator) {
    case "addition":
      op = "+";
      break;
    case "subtraction":
      op = "-";
      break;
    case "multiplication":
      op = "*";
      break;
    case "division":
      op = "/";
      break;
    default: {
      const ops = mixedOpsFor(difficulty);
      op = ops[randInt(0, ops.length - 1)];
    }
  }

  let answer: number;
  let question: string;

  switch (op) {
    case "+": {
      const a = randInt(lo, hi);
      const b = randInt(lo, hi);
      answer = a + b;
      question = `${a} + ${b} = ?`;
      break;
    }
    case "-": {
      // 負の数を避け、必ず a >= b になるようにする
      const a = randInt(lo, hi);
      const b = randInt(lo, a);
      answer = a - b;
      question = `${a} - ${b} = ?`;
      break;
    }
    case "*": {
      const a = randInt(lo, Math.min(hi, 12));
      const b = randInt(lo, Math.min(hi, 12));
      answer = a * b;
      question = `${a} × ${b} = ?`;
      break;
    }
    case "/": {
      // 割り切れる問題だけを出す
      const maxFactor = difficulty === "low" ? 5 : 12;
      const divisor = randInt(2, maxFactor);
      const quotient = randInt(1, maxFactor);
      const dividend = divisor * quotient;
      answer = quotient;
      question = `${dividend} ÷ ${divisor} = ?`;
      break;
    }
  }

  return { question, answer, tip: tipFor(question) };
}

export const ARITHMETIC_DIFFICULTIES: { id: ArithmeticDifficulty; label: string }[] = [
  { id: "low", label: "1〜3年生" },
  { id: "mid", label: "4〜6年生" },
  { id: "junior", label: "中学生" },
];

export const ARITHMETIC_OPERATORS: { id: ArithmeticOperator; label: string }[] = [
  { id: "mixed", label: "すべて" },
  { id: "addition", label: "たしざん" },
  { id: "subtraction", label: "ひきざん" },
  { id: "multiplication", label: "かけざん" },
  { id: "division", label: "わりざん" },
];
