import { PII_LABELS, type PrivacySessionStats } from "../types";

interface DrillStats {
  attempts: number;
  sharedPii: number;
}

interface Props {
  stats: PrivacySessionStats;
  drillStats?: DrillStats;
  modelName: string;
}

export function PrivacyPanel({ stats, drillStats, modelName }: Props) {
  const elapsedMin = Math.max(
    0,
    Math.round((Date.now() - stats.sessionStartedAt) / 60000)
  );

  return (
    <aside className="privacy-panel">
      <h2 className="privacy-panel__title">
        <ShieldIcon /> 今日のプライバシー記録
      </h2>

      <div className="privacy-stat privacy-stat--hero">
        <span className="privacy-stat__value">0 MB</span>
        <span className="privacy-stat__label">外部に送信したデータ</span>
      </div>

      <p className="privacy-panel__note">
        このAI(<code>{modelName}</code>)は、この端末の中だけで動いています(Rust製のCandleエンジンで推論)。
        会話を開いている間、ネットワークは一切使いません。OSの通信モニタで確認できます。
      </p>

      <dl className="privacy-panel__list">
        <div>
          <dt>送った質問の数</dt>
          <dd>{stats.messagesSent}</dd>
        </div>
        <div>
          <dt>見つけた個人情報</dt>
          <dd>{stats.piiCaught}件</dd>
        </div>
        <div>
          <dt>今のセッション時間</dt>
          <dd>{elapsedMin}分</dd>
        </div>
      </dl>

      {stats.piiCaught > 0 && (
        <div className="privacy-panel__breakdown">
          <p className="privacy-panel__breakdown-title">内訳</p>
          <ul>
            {(Object.keys(stats.piiByType) as (keyof typeof stats.piiByType)[])
              .filter((k) => stats.piiByType[k] > 0)
              .map((k) => (
                <li key={k}>
                  {PII_LABELS[k]}: {stats.piiByType[k]}件
                </li>
              ))}
          </ul>
        </div>
      )}

      {drillStats && drillStats.attempts > 0 && (
        <div className="privacy-panel__breakdown">
          <p className="privacy-panel__breakdown-title">🛡️ SNS・AI安全チェック</p>
          <dl className="privacy-panel__list">
            <div>
              <dt>今日の練習回数</dt>
              <dd>{drillStats.attempts}回</dd>
            </div>
            <div>
              <dt>断れた回数</dt>
              <dd>
                {drillStats.attempts - drillStats.sharedPii}/{drillStats.attempts}
              </dd>
            </div>
          </dl>
          <p className="privacy-panel__note">
            会話の中で、AIが個人情報を聞き出そうとする「練習」を時々はさんでいます。
            本物のSNSやAIチャットでも同じ場面が起きたときの備えです。
          </p>
        </div>
      )}

      <p className="privacy-panel__footnote">
        会話の記録はこの端末のメモリ内だけに存在し、タブを閉じると消えます。
      </p>
    </aside>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 2L4 5v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10V5l-8-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
