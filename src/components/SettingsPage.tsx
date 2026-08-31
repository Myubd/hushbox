interface Props {
  textColor: string;
  onTextColorChange: (color: string) => void;
  onBack: () => void;
}

// アプリ全体の設定ページ。現時点ではプラスチャレンジの文字色のみだが、
// 今後の設定項目もこの画面に並べていく想定。
export function SettingsPage({ textColor, onTextColorChange, onBack }: Props) {
  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <p className="settings-page__title">⚙️ 設定</p>
      </div>

      <div className="settings-page__section">
        <div className="settings-page__row">
          <div className="settings-page__row-text">
            <p className="settings-page__row-label">文字色</p>
            <p className="settings-page__row-desc">
              アプリ全体の文字色を、好きな色に変えられます。
            </p>
          </div>
          <input
            className="settings-page__color-input"
            type="color"
            value={textColor}
            onChange={(e) => onTextColorChange(e.target.value)}
            aria-label="アプリ全体の文字色を選ぶ"
          />
        </div>
      </div>
    </div>
  );
}
