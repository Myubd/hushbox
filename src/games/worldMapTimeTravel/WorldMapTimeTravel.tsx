import { useState } from "react";
import { ChoiceQuizGame } from "../ChoiceQuizGame";
import { WORLD_MAP_TIME_TRAVEL_QUESTIONS, type WorldMapEraQuestion } from "./data";
import type { GameScreenProps } from "../types";

function MapImage({ item }: { item: WorldMapEraQuestion }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="world-map__image-wrap">
      {!failed ? (
        <img
          className="world-map__image"
          src={item.imageSrc}
          alt="年代を当てる世界地図"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="world-map__placeholder">
          <span className="world-map__placeholder-icon" aria-hidden="true">
            🗺️
          </span>
          <p className="world-map__placeholder-text">
            地図画像が見つかりません
            <br />
            <code>public{item.imageSrc}</code> に画像を配置してください
          </p>
        </div>
      )}
      {item.caption && <p className="world-map__caption">{item.caption}</p>}
    </div>
  );
}

export function WorldMapTimeTravel({ onBack }: GameScreenProps) {
  return (
    <ChoiceQuizGame
      title="世界地図タイムトラベル（準備中）"
      icon="🗺️"
      items={WORLD_MAP_TIME_TRAVEL_QUESTIONS}
      onBack={onBack}
      notice="⚠️ このゲームは現在サンプル問題のみです。地図画像・問題データは今後追加予定です。"
      renderPrompt={(item) => (
        <div className="world-map__prompt">
          <p className="world-map__hint">この世界地図は、いつ頃のもの?</p>
          <MapImage item={item} />
        </div>
      )}
    />
  );
}
