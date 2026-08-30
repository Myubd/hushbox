/**
 * ロジックめいろの問題生成・実行ロジック(クライアント側)。
 *
 * arithmeticPractice と同じく、Tauri IPCを経由せずフロントエンドだけで完結する。
 * ハルシネーション対策のため、AI(ローカルLLM)は一切使わず、
 * 迷路の生成・実行・判定はすべて決定的なロジックで行う。
 *
 * 学習指導要領の「プログラミング的思考」(順次・反復・分岐)に対応:
 *   - low   (1〜3年生): 順次のみ(まえに進む/右を向く/左を向く)、ブロック方式
 *   - mid   (4〜6年生): 順次 + 反復(くりかえし)、ブロック方式
 *   - junior(中学生)  : 順次 + 反復 + 分岐、簡易Pythonもどきのコードエディタ
 *
 * low/mid は毎回ランダムな道(直線+曲がり角)を生成し、
 * junior は再帰的バックトラック法で本格的な迷路を生成してBFSで一番遠いマスをゴールにする。
 */

export type MazeDifficulty = "low" | "mid" | "junior";
export type Direction = "up" | "right" | "down" | "left";
export type CellType = "empty" | "wall" | "goal";

// 単純命令(くりかえし・もしブロック/文の中にも入れられる)。
// line はコードエディタ(junior)でパースしたときだけ入る、元のコードの行番号。
// ブロック方式(low/mid)で組み立てたものにはline は付かない(undefinedのまま)。
export type SimpleCommand =
  | { kind: "forward"; line?: number }
  | { kind: "turnLeft"; line?: number }
  | { kind: "turnRight"; line?: number };

// プログラム全体で使える命令。repeat/ifWallの中身も再帰的にCommand[]にできるので、
// 中学生向けのコードエディタで for/if を好きなだけネストしても実行できる。
export type Command =
  | SimpleCommand
  | { kind: "repeat"; times: number; body: Command[]; line?: number }
  | { kind: "ifWall"; body: Command[]; elseBody?: Command[]; line?: number };

export type CommandKind = Command["kind"];

export interface MazeLevel {
  grid: CellType[][]; // grid[y][x]
  start: { x: number; y: number; dir: Direction };
  hint: string;
}

export interface RunResult {
  success: boolean;
  path: { x: number; y: number }[];
  message: string;
  /** ゴールに着く/失敗するまでに、実際に何マス移動できたか */
  stepsExecuted: number;
  /** 失敗の原因になった命令のコード上の行番号(コードエディタ実行時のみ) */
  failedLine?: number;
}

const DELTA: Record<Direction, [number, number]> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};

const TURN_LEFT: Record<Direction, Direction> = { up: "left", left: "down", down: "right", right: "up" };
const TURN_RIGHT: Record<Direction, Direction> = { up: "right", right: "down", down: "left", left: "up" };
const ALL_DIRS: Direction[] = ["up", "right", "down", "left"];

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- low/mid: ランダムな「直線+曲がり角」の道を生成 ---------------------------

function perpendiculars(dir: Direction): Direction[] {
  return dir === "up" || dir === "down" ? ["left", "right"] : ["up", "down"];
}

function generateSimplePath(
  width: number,
  height: number,
  segments: number,
  minLen: number,
  maxLen: number,
  hint: string
): MazeLevel {
  for (let attempt = 0; attempt < 60; attempt++) {
    const startX = randInt(0, width - 1);
    const startY = randInt(0, height - 1);
    let curDir = ALL_DIRS[randInt(0, 3)];
    const initialDir = curDir;

    const visited = new Set<string>([`${startX},${startY}`]);
    const path = [{ x: startX, y: startY }];
    let x = startX;
    let y = startY;
    let ok = true;

    for (let s = 0; s < segments; s++) {
      const dir = s === 0 ? curDir : perpendiculars(curDir)[randInt(0, 1)];
      const len = randInt(minLen, maxLen);
      const [dx, dy] = DELTA[dir];
      let steps = 0;
      let cx = x;
      let cy = y;
      const newCells: { x: number; y: number }[] = [];
      for (let k = 0; k < len; k++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || visited.has(`${nx},${ny}`)) break;
        cx = nx;
        cy = ny;
        newCells.push({ x: cx, y: cy });
        steps++;
      }
      if (steps === 0) {
        ok = false;
        break;
      }
      newCells.forEach((c) => {
        visited.add(`${c.x},${c.y}`);
        path.push(c);
      });
      x = cx;
      y = cy;
      curDir = dir;
    }

    if (!ok || path.length < 3) continue;

    const grid: CellType[][] = Array.from({ length: height }, () => Array<CellType>(width).fill("wall"));
    path.forEach((c, i) => {
      grid[c.y][c.x] = i === path.length - 1 ? "goal" : "empty";
    });

    return { grid, start: { x: startX, y: startY, dir: initialDir }, hint };
  }

  // 万一生成に失敗し続けた場合の保険(まっすぐな道だけの単純な迷路)
  const fallbackWidth = Math.max(width, 3);
  const grid: CellType[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: fallbackWidth }, (_, x) => (y === 0 ? (x === fallbackWidth - 1 ? "goal" : "empty") : "wall"))
  );
  return { grid, start: { x: 0, y: 0, dir: "right" }, hint };
}

// --- junior: 再帰的バックトラック法で本格的な迷路を生成 -------------------------

function generatePerfectMazeLevel(roomsW: number, roomsH: number): MazeLevel {
  const gw = roomsW * 2 - 1;
  const gh = roomsH * 2 - 1;
  const grid: CellType[][] = Array.from({ length: gh }, () => Array<CellType>(gw).fill("wall"));
  const visited: boolean[][] = Array.from({ length: roomsH }, () => Array(roomsW).fill(false));

  function carve(rx: number, ry: number) {
    visited[ry][rx] = true;
    grid[ry * 2][rx * 2] = "empty";
    const dirs = shuffle<[number, number]>([
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]);
    for (const [dx, dy] of dirs) {
      const nx = rx + dx;
      const ny = ry + dy;
      if (nx < 0 || nx >= roomsW || ny < 0 || ny >= roomsH || visited[ny][nx]) continue;
      grid[ry * 2 + dy][rx * 2 + dx] = "empty"; // 部屋の間の壁を取り払う
      carve(nx, ny);
    }
  }
  carve(0, 0);

  // スタートから一番遠いマスをBFSで探し、そこをゴールにする(できるだけ長い道のりにするため)
  const startX = 0;
  const startY = 0;
  const dist: number[][] = Array.from({ length: gh }, () => Array(gw).fill(-1));
  dist[startY][startX] = 0;
  const queue: [number, number][] = [[startX, startY]];
  let far: [number, number] = [startX, startY];
  let qi = 0;
  while (qi < queue.length) {
    const [cx, cy] = queue[qi++];
    if (dist[cy][cx] > dist[far[1]][far[0]]) far = [cx, cy];
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue;
      if (grid[ny][nx] === "wall") continue;
      if (dist[ny][nx] !== -1) continue;
      dist[ny][nx] = dist[cy][cx] + 1;
      queue.push([nx, ny]);
    }
  }
  grid[far[1]][far[0]] = "goal";

  // 開始時に体が向く方向(通路が開いている向き)を探す
  let startDir: Direction = "right";
  for (const d of ["right", "down", "up", "left"] as Direction[]) {
    const [dx, dy] = DELTA[d];
    const nx = startX + dx;
    const ny = startY + dy;
    if (nx >= 0 && nx < gw && ny >= 0 && ny < gh && grid[ny][nx] !== "wall") {
      startDir = d;
      break;
    }
  }

  return {
    grid,
    start: { x: startX, y: startY, dir: startDir },
    hint: "壁があるかどうかで動きを変える if wall_ahead(): を使うと、迷路の形を覚えなくても壁づたいにゴールへ進めるよ(右手法)。",
  };
}

export function generateMazeLevel(difficulty: MazeDifficulty): MazeLevel {
  switch (difficulty) {
    case "low":
      return generateSimplePath(5, 5, 2, 2, 3, "曲がり角では「右を向く」か「左を向く」を使おう。");
    case "mid":
      return generateSimplePath(
        7,
        6,
        3,
        2,
        4,
        "まっすぐな道は「くりかえし」でまとめると、ブロックの数を減らせるよ。"
      );
    case "junior":
      return generatePerfectMazeLevel(6, 6);
  }
}

// --- 難易度ごとの設定(low/midのブロック方式で使用) ----------------------------

export const MAZE_DIFFICULTIES: { id: MazeDifficulty; label: string }[] = [
  { id: "low", label: "1〜3年生" },
  { id: "mid", label: "4〜6年生" },
  { id: "junior", label: "中学生" },
];

export const ALLOWED_COMMANDS: Record<MazeDifficulty, CommandKind[]> = {
  low: ["forward", "turnLeft", "turnRight"],
  mid: ["forward", "turnLeft", "turnRight", "repeat"],
  junior: [], // junior はブロックではなくコードエディタを使うため未使用
};

export const MAX_BLOCKS: Record<MazeDifficulty, number> = {
  low: 10,
  mid: 18,
  junior: 0, // 未使用
};

// --- 実行エンジン(ブロック方式・コードエディタ方式で共通) -----------------------

const MAX_STEPS = 400; // くりかえしの暴走(無限ループ)を防ぐガード

export function runProgram(level: MazeLevel, program: Command[]): RunResult {
  let x = level.start.x;
  let y = level.start.y;
  let dir = level.start.dir;
  const path: { x: number; y: number }[] = [{ x, y }];
  let steps = 0;
  let success = false;
  let failReason: "wall" | "steps" | null = null;
  let failedLine: number | undefined;

  function cellAt(cx: number, cy: number): CellType | null {
    if (cy < 0 || cy >= level.grid.length) return null;
    const r = level.grid[cy];
    if (cx < 0 || cx >= r.length) return null;
    return r[cx];
  }

  function wallAhead(): boolean {
    const [dx, dy] = DELTA[dir];
    const cell = cellAt(x + dx, y + dy);
    return cell === null || cell === "wall";
  }

  function execOne(cmd: SimpleCommand): boolean {
    steps++;
    if (steps > MAX_STEPS) {
      failReason = "steps";
      failedLine = cmd.line;
      return false;
    }
    if (cmd.kind === "turnLeft") {
      dir = TURN_LEFT[dir];
      return true;
    }
    if (cmd.kind === "turnRight") {
      dir = TURN_RIGHT[dir];
      return true;
    }
    if (wallAhead()) {
      failReason = "wall";
      failedLine = cmd.line;
      return false;
    }
    const [dx, dy] = DELTA[dir];
    x += dx;
    y += dy;
    path.push({ x, y });
    if (cellAt(x, y) === "goal") success = true;
    return true;
  }

  function execList(list: Command[]): boolean {
    for (const cmd of list) {
      if (success) return true;
      if (cmd.kind === "repeat") {
        for (let i = 0; i < cmd.times; i++) {
          if (!execList(cmd.body)) return false;
          if (success) return true;
        }
      } else if (cmd.kind === "ifWall") {
        if (wallAhead()) {
          if (!execList(cmd.body)) return false;
        } else if (cmd.elseBody) {
          if (!execList(cmd.elseBody)) return false;
        }
      } else {
        if (!execOne(cmd)) return false;
      }
    }
    return true;
  }

  execList(program);

  // ここから: 「どこまで実行できたか」「どこで止まったか」が分かるメッセージを組み立てる
  const stepsExecuted = path.length - 1;
  const lineText = failedLine ? `(${failedLine}行目)` : "";
  let message: string;

  if (success) {
    const optimalPath = solvePath(level);
    if (optimalPath.length > 0) {
      const optimal = optimalPath.length - 1;
      message =
        stepsExecuted <= optimal
          ? `🎉 ゴールにたどり着いた!(${stepsExecuted}マスで到着、最短ルートだよ)`
          : `🎉 ゴールにたどり着いた!(${stepsExecuted}マスで到着。最短だと${optimal}マスで行けるよ)`;
    } else {
      message = "🎉 ゴールにたどり着いた!";
    }
  } else if (failReason === "wall") {
    message = `壁にぶつかった!${stepsExecuted}マス進んだところまでは合っていたよ${lineText}。`;
  } else if (failReason === "steps") {
    message = `命令が多すぎて止まらなくなったよ。${stepsExecuted}マス進んだところで止めたよ${lineText}。くりかえしの回数を見直してみよう。`;
  } else {
    const stopPoint = path[path.length - 1];
    const remainPath = solvePath(level, stopPoint);
    const remaining = remainPath.length > 0 ? remainPath.length - 1 : null;
    message =
      remaining !== null
        ? `${stepsExecuted}マス進んだけど、ゴールに届かなかったよ。ゴールまであと最短で${remaining}マスだよ。命令を増やしたり、順番を見直してみよう。`
        : `${stepsExecuted}マス進んだけど、ゴールに届かなかったよ。命令を増やしたり、順番を見直してみよう。`;
  }

  return { success, path, message, stepsExecuted, failedLine };
}

// --- 中学生向け: 簡易Pythonもどきのパーサー -----------------------------------
//
// 対応する構文はこれだけ(最小限にして、本格的すぎて挫折しないようにしている):
//   forward()
//   turn_left()
//   turn_right()
//   for i in range(N):
//       ...
//   if wall_ahead():
//       ...
//   else:
//       ...
// インデントは半角スペースのみ対応(タブは自動でスペース4個に変換する)。
// #以降はコメントとして無視する。

export interface ParseError {
  line: number;
  message: string;
}

export type ParseResult = { ok: true; program: Command[] } | { ok: false; error: ParseError };

const SIMPLE_LINE: Record<string, SimpleCommand["kind"]> = {
  "forward()": "forward",
  "turn_left()": "turnLeft",
  "turn_right()": "turnRight",
};

const FOR_RE = /^for\s+[A-Za-z_][A-Za-z0-9_]*\s+in\s+range\(\s*(\d+)\s*\)\s*:$/;
const IF_RE = /^if\s+wall_ahead\(\)\s*:$/;
const ELSE_RE = /^else\s*:$/;

interface RawLine {
  indent: number;
  text: string;
  lineNo: number;
}

function stripComment(line: string): string {
  const idx = line.indexOf("#");
  return idx === -1 ? line : line.slice(0, idx);
}

function preprocess(source: string): RawLine[] {
  const rawLines = source.replace(/\t/g, "    ").split("\n");
  const lines: RawLine[] = [];
  rawLines.forEach((raw, idx) => {
    const noComment = stripComment(raw).replace(/\s+$/, "");
    if (noComment.trim() === "") return; // 空行・コメントのみの行は無視
    const indent = noComment.length - noComment.trimStart().length;
    lines.push({ indent, text: noComment.trim(), lineNo: idx + 1 });
  });
  return lines;
}

interface BlockParseResult {
  statements: Command[];
  nextIndex: number;
  error?: ParseError;
}

function parseBlock(lines: RawLine[], start: number, indent: number, maxRange: number): BlockParseResult {
  const statements: Command[] = [];
  let i = start;

  while (i < lines.length && lines[i].indent === indent) {
    const line = lines[i];

    if (SIMPLE_LINE[line.text]) {
      statements.push({ kind: SIMPLE_LINE[line.text], line: line.lineNo });
      i++;
      continue;
    }

    const forMatch = line.text.match(FOR_RE);
    if (forMatch) {
      const times = parseInt(forMatch[1], 10);
      if (times < 1 || times > maxRange) {
        return { statements, nextIndex: i, error: { line: line.lineNo, message: `くりかえす回数は1〜${maxRange}回にしてね。` } };
      }
      if (i + 1 >= lines.length || lines[i + 1].indent <= indent) {
        return {
          statements,
          nextIndex: i,
          error: { line: line.lineNo, message: "for の中に命令が書かれていないよ。次の行を字下げして命令を書こう。" },
        };
      }
      const child = parseBlock(lines, i + 1, lines[i + 1].indent, maxRange);
      if (child.error) return { statements, nextIndex: i, error: child.error };
      statements.push({ kind: "repeat", times, body: child.statements, line: line.lineNo });
      i = child.nextIndex;
      continue;
    }

    if (IF_RE.test(line.text)) {
      if (i + 1 >= lines.length || lines[i + 1].indent <= indent) {
        return {
          statements,
          nextIndex: i,
          error: { line: line.lineNo, message: "if の中に命令が書かれていないよ。次の行を字下げして命令を書こう。" },
        };
      }
      const thenBlock = parseBlock(lines, i + 1, lines[i + 1].indent, maxRange);
      if (thenBlock.error) return { statements, nextIndex: i, error: thenBlock.error };

      let elseBody: Command[] | undefined;
      let nextIdx = thenBlock.nextIndex;
      if (nextIdx < lines.length && lines[nextIdx].indent === indent && ELSE_RE.test(lines[nextIdx].text)) {
        const elseLine = lines[nextIdx];
        if (nextIdx + 1 >= lines.length || lines[nextIdx + 1].indent <= indent) {
          return { statements, nextIndex: i, error: { line: elseLine.lineNo, message: "else の中に命令が書かれていないよ。" } };
        }
        const elseBlock = parseBlock(lines, nextIdx + 1, lines[nextIdx + 1].indent, maxRange);
        if (elseBlock.error) return { statements, nextIndex: i, error: elseBlock.error };
        elseBody = elseBlock.statements;
        nextIdx = elseBlock.nextIndex;
      }

      statements.push({ kind: "ifWall", body: thenBlock.statements, elseBody, line: line.lineNo });
      i = nextIdx;
      continue;
    }

    return {
      statements,
      nextIndex: i,
      error: {
        line: line.lineNo,
        message: `使えるコマンドじゃないみたい:「${line.text}」\n使えるのは forward() / turn_left() / turn_right() / for i in range(N): / if wall_ahead(): / else: だよ。`,
      },
    };
  }

  return { statements, nextIndex: i };
}

export function parseProgram(source: string, maxRange = 100): ParseResult {
  const lines = preprocess(source);
  if (lines.length === 0) {
    return { ok: false, error: { line: 1, message: "コードが空だよ。まずは forward() と書いてみよう。" } };
  }
  if (lines[0].indent !== 0) {
    return { ok: false, error: { line: lines[0].lineNo, message: "最初の行は字下げ(スペース)なしで書いてね。" } };
  }

  const result = parseBlock(lines, 0, 0, maxRange);
  if (result.error) return { ok: false, error: result.error };
  if (result.nextIndex < lines.length) {
    return {
      ok: false,
      error: {
        line: lines[result.nextIndex].lineNo,
        message: "インデント(字下げ)がそろっていないみたい。半角スペースの数を確認してみよう。",
      },
    };
  }
  return { ok: true, program: result.statements };
}

export const DEFAULT_JUNIOR_CODE = `# 使えるコマンド:
#   forward()            1マス進む
#   turn_left()           左を向く
#   turn_right()          右を向く
#   for i in range(N):    N回くりかえす
#   if wall_ahead():      壁があれば
#   else:                 (省略できる)

forward()
forward()
`;

// --- ヒント機能(AIは使わず、BFSによる決定的な最短経路探索だけを使う) --------------

/**
 * スタートからゴールまでの最短経路をBFSで求める。
 * コードの答えを教えるのではなく、あくまで「地図」として道すじを見せるためのもの。
 * 迷路は生成時に必ず到達可能になっているので、通常は空配列にはならない。
 */
/**
 * 指定した地点からゴールまでの最短経路をBFSで求める(fromを省略するとスタート地点から)。
 * コードの答えを教えるのではなく、あくまで「地図」として道すじを見せるためのもの。
 * 失敗した地点からゴールまでの残り距離を計算するのにも使う。
 * 迷路は生成時に必ず到達可能になっているので、通常は空配列にはならない。
 */
export function solvePath(
  level: MazeLevel,
  from: { x: number; y: number } = level.start
): { x: number; y: number }[] {
  const { grid } = level;
  const h = grid.length;
  const w = grid[0]?.length ?? 0;

  const key = (x: number, y: number) => `${x},${y}`;
  const prev = new Map<string, { x: number; y: number } | null>();
  prev.set(key(from.x, from.y), null);

  const queue: { x: number; y: number }[] = [{ x: from.x, y: from.y }];
  let qi = 0;
  let goal: { x: number; y: number } | null = null;

  while (qi < queue.length) {
    const cur = queue[qi++];
    if (grid[cur.y][cur.x] === "goal") {
      goal = cur;
      break;
    }
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (grid[ny][nx] === "wall") continue;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      prev.set(k, cur);
      queue.push({ x: nx, y: ny });
    }
  }

  if (!goal) return [];

  const path: { x: number; y: number }[] = [];
  let cur: { x: number; y: number } | null = goal;
  while (cur) {
    path.push(cur);
    cur = prev.get(key(cur.x, cur.y)) ?? null;
  }
  return path.reverse();
}

/**
 * 現在地からゴールがどちら向きにあるかを、方角の言葉で伝える簡易ヒント。
 * 正確な道すじではなく、大まかな方向感覚だけを与える(答えは教えない)。
 */
export function compassHint(level: MazeLevel, from: { x: number; y: number }): string {
  let goal: { x: number; y: number } | null = null;
  for (let y = 0; y < level.grid.length; y++) {
    for (let x = 0; x < level.grid[y].length; x++) {
      if (level.grid[y][x] === "goal") goal = { x, y };
    }
  }
  if (!goal) return "";

  const dx = goal.x - from.x;
  const dy = goal.y - from.y;
  const parts: string[] = [];
  if (dy < 0) parts.push("上");
  if (dy > 0) parts.push("下");
  if (dx < 0) parts.push("左");
  if (dx > 0) parts.push("右");
  if (parts.length === 0) return "";
  return `🧭 ゴールは今いる場所より${parts.join("・")}の方向だよ。`;
}
