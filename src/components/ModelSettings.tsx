import type { ModelSpec } from "../types";

interface Props {
  models: ModelSpec[];
  currentModelId: string | null;
  disabled: boolean;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

export function ModelSettings({ models, currentModelId, disabled, onSelect, onClose }: Props) {
  return (
    <div className="model-settings">
      <div className="model-settings__header">
        <p className="model-settings__title">🧠 使用するAIモデル</p>
        <button className="btn btn--ghost btn--small" onClick={onClose}>
          閉じる
        </button>
      </div>
      <p className="model-settings__note">
        モデルを切り替えると、初回はダウンロードが発生します(以降はキャッシュから読込)。
        切り替え後は会話がリセットされます。
      </p>
      <ul className="model-settings__list">
        {models.map((m) => {
          const isCurrent = m.id === currentModelId;
          return (
            <li key={m.id} className={`model-settings__item${isCurrent ? " is-current" : ""}`}>
              <div className="model-settings__item-info">
                <p className="model-settings__item-label">
                  {m.label}
                  {isCurrent && <span className="model-settings__badge">使用中</span>}
                </p>
                <p className="model-settings__item-note">{m.note}</p>
                <p className="model-settings__item-size">
                  約{(m.approxSizeMb / 1000).toFixed(1)}GB(ダウンロード後の目安)
                </p>
              </div>
              <button
                className="btn btn--primary btn--small"
                disabled={disabled || isCurrent}
                onClick={() => onSelect(m.id)}
              >
                {isCurrent ? "使用中" : "切り替える"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
