import type { ReactNode } from "react";
import type { ChatMessage, PiiMatch } from "../types";
import { PII_LABELS } from "../types";

interface Props {
  message: ChatMessage;
}

// Rust側は正規化されたインデックスを返さない(UTF-16/バイトオフセットの単位差を
// 避けるため)ので、一致した文字列そのものをテキスト内で探してハイライトする。
// 同じ文字列が複数回出現する場合は先頭から順に1回ずつ消費する。
function renderWithHighlights(text: string, matches: PiiMatch[] | undefined) {
  if (!matches || matches.length === 0) return text;

  type Span = { start: number; end: number; type: PiiMatch["type"] };
  const spans: Span[] = [];
  const cursorByText = new Map<string, number>();

  for (const m of matches) {
    const from = cursorByText.get(m.text) ?? 0;
    const idx = text.indexOf(m.text, from);
    if (idx === -1) continue;
    spans.push({ start: idx, end: idx + m.text.length, type: m.type });
    cursorByText.set(m.text, idx + m.text.length);
  }
  spans.sort((a, b) => a.start - b.start);

  const parts: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((s, i) => {
    if (s.start < cursor) return; // 重なりはスキップ
    if (s.start > cursor) parts.push(text.slice(cursor, s.start));
    parts.push(
      <mark className="pii-mark" key={i} title={`${PII_LABELS[s.type]}として検出`}>
        {text.slice(s.start, s.end)}
      </mark>
    );
    cursor = s.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function ChatBubble({ message }: Props) {
  if (message.role === "system-notice") {
    const [title, ...rest] = message.content.split("\n");
    return (
      <div className="chat-notice">
        <p className="chat-notice__title">{title}</p>
        {rest.length > 0 && <p className="chat-notice__body">{rest.join("\n")}</p>}
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`chat-row ${isUser ? "chat-row--user" : "chat-row--ai"}`}>
      <div className={`chat-bubble ${isUser ? "chat-bubble--user" : "chat-bubble--ai"}`}>
        {message.content === "" && !isUser ? (
          <span className="typing-dots" aria-label="入力中">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <p>{renderWithHighlights(message.content, message.piiFlags)}</p>
        )}
        {isUser && message.piiFlags && message.piiFlags.length > 0 && (
          <p className="chat-bubble__note">
            🌱 {message.piiFlags.length}件の個人情報を隠してAIに送りました
          </p>
        )}
      </div>
    </div>
  );
}
