import { ChoiceQuizGame } from "../ChoiceQuizGame";
import { HISTORY_TIMESTAMP_QUESTIONS } from "./data";
import type { GameScreenProps } from "../types";

export function HistoryTimestamp({ onBack }: GameScreenProps) {
  return (
    <ChoiceQuizGame
      title="歴史のタイムスタンプ"
      icon="🕰️"
      items={HISTORY_TIMESTAMP_QUESTIONS}
      onBack={onBack}
      renderPrompt={(item) => (
        <div className="history-timestamp__date-wrap">
          <p className="history-timestamp__hint">この日、何がおきた?</p>
          <p className="history-timestamp__date">{item.date}</p>
        </div>
      )}
    />
  );
}
