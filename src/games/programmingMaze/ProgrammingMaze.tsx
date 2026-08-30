import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { GameScreenProps } from "../types";
import {
  ALLOWED_COMMANDS,
  DEFAULT_JUNIOR_CODE,
  MAX_BLOCKS,
  MAZE_DIFFICULTIES,
  generateMazeLevel,
  parseProgram,
  runProgram,
  type Command,
  type CommandKind,
  type MazeDifficulty,
  type MazeLevel,
  type RunResult,
  type SimpleCommand,
} from "./logic";

/**
 * ロジックめいろ。
 * low/mid: 命令ブロック(まえに進む/右を向く/左を向く/くりかえし)を並べる方式。
 * junior : 簡易Pythonもどきのコードエディタ方式(forward() / if wall_ahead(): など)。
 * どちらも Tauri IPC は使わずフロントエンドだけで完結し、AIは一切使わず
 * 決定的な実行エンジン(logic.ts の runProgram)で判定する。
 */

const KIND_LABEL: Record<CommandKind, string> = {
  forward: "⬆️ まえに進む",
  turnLeft: "↩️ 左を向く",
  turnRight: "↪️ 右を向く",
  repeat: "🔁 くりかえす",
  ifWall: "❓ もし壁があれば",
};

const DIR_ARROW: Record<string, string> = { up: "⬆️", right: "➡️", down: "⬇️", left: "⬅️" };

function isSimpleKind(kind: CommandKind): kind is SimpleCommand["kind"] {
  return kind === "forward" || kind === "turnLeft" || kind === "turnRight";
}

// isSimpleKind は「命令の種類(文字列)」を絞り込むための型ガード。
// cmd.kind を渡してもcmd自体(オブジェクト)は絞り込まれないので、
// Command → SimpleCommand への絞り込みが必要な箇所ではこちらを使う。
function isSimpleCommand(cmd: Command): cmd is SimpleCommand {
  return cmd.kind === "forward" || cmd.kind === "turnLeft" || cmd.kind === "turnRight";
}

function makeSimple(kind: SimpleCommand["kind"]): SimpleCommand {
  return { kind };
}

function cellSizeRem(gridWidth: number): number {
  if (gridWidth > 9) return 1.5;
  if (gridWidth > 6) return 1.9;
  return 2.4;
}

export function ProgrammingMaze({ onBack }: GameScreenProps) {
  const [difficulty, setDifficulty] = useState<MazeDifficulty>("low");
  const [level, setLevel] = useState<MazeLevel>(() => generateMazeLevel("low"));
  const [program, setProgram] = useState<Command[]>([]);
  const [code, setCode] = useState(DEFAULT_JUNIOR_CODE);
  const [parseError, setParseError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const isCodeMode = difficulty === "junior";

  const loadNext = useCallback((nextDifficulty: MazeDifficulty) => {
    setLevel(generateMazeLevel(nextDifficulty));
    setProgram([]);
    setCode(DEFAULT_JUNIOR_CODE);
    setParseError(null);
    setRunResult(null);
    setPathIndex(0);
    setAnimating(false);
  }, []);

  const changeDifficulty = useCallback(
    (d: MazeDifficulty) => {
      setDifficulty(d);
      loadNext(d);
    },
    [loadNext]
  );

  const allowedKinds = ALLOWED_COMMANDS[difficulty];
  const maxBlocks = MAX_BLOCKS[difficulty];
  const blockCount = program.length;

  const addTopCommand = useCallback(
    (kind: CommandKind) => {
      if (blockCount >= maxBlocks || animating) return;
      setProgram((prev) => {
        if (isSimpleKind(kind)) return [...prev, makeSimple(kind)];
        if (kind === "repeat") return [...prev, { kind: "repeat", times: 2, body: [] }];
        return [...prev, { kind: "ifWall", body: [] }];
      });
      setRunResult(null);
    },
    [blockCount, maxBlocks, animating]
  );

  const removeTopCommand = useCallback(
    (index: number) => {
      if (animating) return;
      setProgram((prev) => prev.filter((_, i) => i !== index));
      setRunResult(null);
    },
    [animating]
  );

  const addBodyCommand = useCallback(
    (blockIndex: number, kind: SimpleCommand["kind"]) => {
      if (animating) return;
      setProgram((prev) =>
        prev.map((cmd, i) => {
          if (i !== blockIndex || isSimpleCommand(cmd)) return cmd;
          return { ...cmd, body: [...cmd.body, makeSimple(kind)] };
        })
      );
      setRunResult(null);
    },
    [animating]
  );

  const removeLastBodyCommand = useCallback(
    (blockIndex: number) => {
      if (animating) return;
      setProgram((prev) =>
        prev.map((cmd, i) => {
          if (i !== blockIndex || isSimpleCommand(cmd)) return cmd;
          return { ...cmd, body: cmd.body.slice(0, -1) };
        })
      );
      setRunResult(null);
    },
    [animating]
  );

  const changeRepeatTimes = useCallback(
    (blockIndex: number, delta: number) => {
      if (animating) return;
      setProgram((prev) =>
        prev.map((cmd, i) => {
          if (i !== blockIndex || cmd.kind !== "repeat") return cmd;
          const next = Math.min(8, Math.max(2, cmd.times + delta));
          return { ...cmd, times: next };
        })
      );
      setRunResult(null);
    },
    [animating]
  );

  const clearProgram = useCallback(() => {
    if (animating) return;
    setProgram([]);
    setRunResult(null);
  }, [animating]);

  const resetCode = useCallback(() => {
    if (animating) return;
    setCode(DEFAULT_JUNIOR_CODE);
    setParseError(null);
    setRunResult(null);
  }, [animating]);

  const startAnimation = useCallback((result: RunResult) => {
    setRunResult(result);
    setPathIndex(0);
    setAnimating(true);
  }, []);

  const runBlocks = useCallback(() => {
    if (animating || program.length === 0) return;
    startAnimation(runProgram(level, program));
  }, [animating, program, level, startAnimation]);

  const runCode = useCallback(() => {
    if (animating) return;
    const result = parseProgram(code);
    if (!result.ok) {
      setParseError(`${result.error.line}行目: ${result.error.message}`);
      setRunResult(null);
      return;
    }
    setParseError(null);
    startAnimation(runProgram(level, result.program));
  }, [animating, code, level, startAnimation]);

  const handleCodeKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = code.slice(0, start) + "    " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    },
    [code]
  );

  // アニメーション: 実行結果のパスに沿って1マスずつ進める
  useEffect(() => {
    if (!animating || !runResult) return;
    if (pathIndex >= runResult.path.length - 1) {
      setAnimating(false);
      setTotal((t) => t + 1);
      if (runResult.success) setCorrect((c) => c + 1);
      return;
    }
    const timer = setTimeout(() => setPathIndex((i) => i + 1), 200);
    return () => clearTimeout(timer);
  }, [animating, runResult, pathIndex]);

  const avatarPos = runResult ? runResult.path[Math.min(pathIndex, runResult.path.length - 1)] : level.start;
  const finished = runResult !== null && !animating;

  const gridHeight = level.grid.length;
  const gridWidth = level.grid[0]?.length ?? 0;
  const cellRem = cellSizeRem(gridWidth);

  return (
    <div className="mini-game">
      <div className="plus-challenge__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <div className="plus-challenge__heading">
          <span className="plus-challenge__badge">🤖 ロジックめいろ</span>
        </div>
      </div>

      <div className="learning-drill__units">
        {MAZE_DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            className={`learning-drill__unit${difficulty === d.id ? " is-active" : ""}`}
            onClick={() => changeDifficulty(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <p className="learning-drill__badge">AIを使わず、確実に判定しています</p>

      {total > 0 && (
        <p className="plus-challenge__score">
          クリア数: {correct} / {total}
        </p>
      )}

      <div className="learning-drill__card">
        <div
          className="programming-maze__board"
          style={
            {
              gridTemplateColumns: `repeat(${gridWidth}, ${cellRem}rem)`,
              gridTemplateRows: `repeat(${gridHeight}, ${cellRem}rem)`,
              "--maze-font": `${cellRem * 0.5}rem`,
            } as unknown as CSSProperties
          }
        >
          {level.grid.map((rowCells, y) =>
            rowCells.map((cell, x) => {
              const isAvatar = avatarPos.x === x && avatarPos.y === y;
              let content = "";
              let cellClass = "programming-maze__cell";
              if (cell === "wall") {
                content = "🧱";
                cellClass += " programming-maze__cell--wall";
              } else if (cell === "goal") {
                content = "🚩";
                cellClass += " programming-maze__cell--goal";
              }
              if (isAvatar) {
                cellClass += " programming-maze__cell--avatar";
                content = DIR_ARROW[avatarPositionDirLabel(runResult, pathIndex, level)] ?? content;
              }
              return (
                <div key={`${x}-${y}`} className={cellClass}>
                  {content}
                </div>
              );
            })
          )}
        </div>

        <p className="programming-maze__hint">💡 {level.hint}</p>

        {!isCodeMode && (
          <>
            <div className="learning-drill__units">
              {allowedKinds.map((kind) => (
                <button
                  key={kind}
                  className="learning-drill__unit"
                  onClick={() => addTopCommand(kind)}
                  disabled={blockCount >= maxBlocks || animating}
                >
                  {KIND_LABEL[kind]}
                </button>
              ))}
            </div>
            <p className="learning-drill__badge">
              ブロック数: {blockCount} / {maxBlocks}
            </p>

            <div className="programming-maze__blocks">
              {program.length === 0 && <p className="learning-drill__badge">上のボタンでブロックを積んでいこう</p>}
              {program.map((cmd, i) => (
                <div className="programming-maze__block" key={i}>
                  <span className="programming-maze__block-index">{i + 1}.</span>
                  {isSimpleCommand(cmd) ? (
                    <span>{KIND_LABEL[cmd.kind]}</span>
                  ) : (
                    <div className="programming-maze__block-container">
                      <div className="programming-maze__block-container-head">
                        <span>
                          {KIND_LABEL[cmd.kind]}
                          {cmd.kind === "repeat" && ` (${cmd.times}回)`}
                        </span>
                        {cmd.kind === "repeat" && (
                          <>
                            <button className="btn btn--ghost btn--small" onClick={() => changeRepeatTimes(i, -1)}>
                              -
                            </button>
                            <button className="btn btn--ghost btn--small" onClick={() => changeRepeatTimes(i, 1)}>
                              +
                            </button>
                          </>
                        )}
                      </div>
                      <div className="programming-maze__block-body">
                        <span className="programming-maze__block-body-items">
                          {cmd.body.length === 0
                            ? "(中身が空です)"
                            : cmd.body.map((b) => KIND_LABEL[b.kind]).join(" → ")}
                        </span>
                        <div className="programming-maze__block-body-actions">
                          <button className="btn btn--ghost btn--small" onClick={() => addBodyCommand(i, "forward")}>
                            + まえ
                          </button>
                          <button className="btn btn--ghost btn--small" onClick={() => addBodyCommand(i, "turnLeft")}>
                            + 左
                          </button>
                          <button className="btn btn--ghost btn--small" onClick={() => addBodyCommand(i, "turnRight")}>
                            + 右
                          </button>
                          <button className="btn btn--ghost btn--small" onClick={() => removeLastBodyCommand(i)}>
                            中身を1つ消す
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    className="btn btn--ghost btn--small programming-maze__remove"
                    onClick={() => removeTopCommand(i)}
                    disabled={animating}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="programming-maze__actions">
              <button className="btn btn--primary" onClick={runBlocks} disabled={animating || program.length === 0}>
                ▶️ じっこう
              </button>
              <button className="btn btn--ghost" onClick={clearProgram} disabled={animating}>
                クリア
              </button>
            </div>
          </>
        )}

        {isCodeMode && (
          <>
            <p className="programming-maze__hint">
              💡 使えるコマンド: forward() / turn_left() / turn_right() / for i in range(N): / if wall_ahead(): / else:
            </p>
            <textarea
              className="programming-maze__code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleCodeKeyDown}
              disabled={animating}
              spellCheck={false}
              rows={12}
              maxLength={2000}
            />
            {parseError && (
              <div className="programming-maze__error">
                <p className="programming-maze__error-title">⚠️ 文法エラー</p>
                <p className="programming-maze__error-body">{parseError}</p>
              </div>
            )}
            <div className="programming-maze__actions">
              <button className="btn btn--primary" onClick={runCode} disabled={animating || !code.trim()}>
                ▶️ じっこう
              </button>
              <button className="btn btn--ghost" onClick={resetCode} disabled={animating}>
                コードをリセット
              </button>
            </div>
          </>
        )}

        {finished && runResult && (
          <div className={`learning-drill__feedback${runResult.success ? " is-correct" : " is-wrong"}`}>
            <p className="learning-drill__feedback-title">{runResult.success ? "🎉 せいかい!" : "❌ おしい!"}</p>
            <p className="learning-drill__feedback-body">{runResult.message}</p>
            <button className="btn btn--primary" onClick={() => loadNext(difficulty)}>
              つぎの問題へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// アバターの現在の向きを、パスの移動方向から推定して矢印を出すためのヘルパー。
// (実行前は初期の向き、実行中/後は直前の移動方向を表示する)
function avatarPositionDirLabel(runResult: RunResult | null, pathIndex: number, level: MazeLevel): string {
  if (!runResult || pathIndex === 0) return level.start.dir;
  const prev = runResult.path[pathIndex - 1];
  const cur = runResult.path[Math.min(pathIndex, runResult.path.length - 1)];
  const dx = cur.x - prev.x;
  const dy = cur.y - prev.y;
  if (dx === 1) return "right";
  if (dx === -1) return "left";
  if (dy === 1) return "down";
  if (dy === -1) return "up";
  return level.start.dir;
}
