import { useState } from "react";
import { GAMES } from "../games/registry";

interface Props {
  onBack: () => void;
}

// プラスチャレンジ画面。ゲームを選んでいないときは一覧(メニュー)を表示し、
// 選ぶとそのゲームのコンポーネントに切り替わる。
// ゲームの追加は src/games/registry.ts にエントリを1件足すだけでよい。
export function PlusChallenge({ onBack }: Props) {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const activeGame = GAMES.find((g) => g.id === activeGameId) ?? null;

  if (activeGame) {
    const { Component } = activeGame;
    return (
      <div className="plus-challenge">
        <Component onBack={() => setActiveGameId(null)} />
      </div>
    );
  }

  return (
    <div className="plus-challenge">
      <div className="plus-challenge__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <div className="plus-challenge__heading">
          <span className="plus-challenge__badge">🎓 プラスチャレンジ</span>
          <p className="plus-challenge__title">義務教育のその先へ</p>
        </div>
      </div>

      {GAMES.length === 0 ? (
        <p className="learning-drill__loading">まだゲームが用意されていません。</p>
      ) : (
        <div className="plus-challenge__game-grid">
          {GAMES.map((game) => (
            <button
              key={game.id}
              className="plus-challenge__game-card"
              onClick={() => setActiveGameId(game.id)}
            >
              <span className="plus-challenge__game-icon" aria-hidden="true">
                {game.icon}
              </span>
              <span className="plus-challenge__game-label">{game.label}</span>
              <span className="plus-challenge__game-desc">{game.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
