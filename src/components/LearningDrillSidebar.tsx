import type { SubjectInfo } from "../types";

interface Props {
  subjectInfo: SubjectInfo;
  score: { correct: number; total: number };
  points: number;
}

/**
 * 学習ドリルの成績パネル。App.tsxの.app-mainグリッドで.chat-panelの
 * となり(チャットタブでいう<PrivacyPanel>と同じ列)に配置される。
 * 以前はLearningDrill内部の横並びレイアウトで表示していたが、チャット画面の
 * 縦線(.chat-panelのborder-right)より右に来るよう、この専用コンポーネントに
 * 分離して.app-mainの第2カラムに描画するようにした。
 */
export function LearningDrillSidebar({ subjectInfo, score, points }: Props) {
  return (
    <aside className="learning-drill-sidebar">
      <p className="learning-drill-sidebar__title">
        {subjectInfo.icon} {subjectInfo.label}
      </p>
      <div className="learning-drill-sidebar__stat">
        <span className="learning-drill-sidebar__stat-value">{score.total}</span>
        <span className="learning-drill-sidebar__stat-label">解いた問題数</span>
      </div>
      <div className="learning-drill-sidebar__stat">
        <span className="learning-drill-sidebar__stat-value">{score.correct}</span>
        <span className="learning-drill-sidebar__stat-label">正解数</span>
      </div>
      <div className="learning-drill-sidebar__stat learning-drill-sidebar__stat--points">
        <span className="learning-drill-sidebar__stat-value">🌟 {points}</span>
        <span className="learning-drill-sidebar__stat-label">ポイント</span>
      </div>
    </aside>
  );
}
