import { describe, expect, it } from "vitest";
import { CONSENSUS_QUIZ_QUESTIONS } from "../consensusQuiz/data";
import { CONSENSUS_QUIZ_SUBJECTS } from "../consensusQuiz/types";

describe("consensusQuiz のデータ検証", () => {
  it("問題データが600件ある", () => {
    expect(CONSENSUS_QUIZ_QUESTIONS).toHaveLength(600);
  });

  it("idがすべて一意である", () => {
    const ids = CONSENSUS_QUIZ_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(CONSENSUS_QUIZ_QUESTIONS.length);
  });

  it("difficultyがeasy/normal/hardのいずれかで、各200件ずつある", () => {
    const counts: Record<string, number> = { easy: 0, normal: 0, hard: 0 };
    for (const q of CONSENSUS_QUIZ_QUESTIONS) {
      expect(["easy", "normal", "hard"]).toContain(q.difficulty);
      counts[q.difficulty] += 1;
    }
    expect(counts.easy).toBe(200);
    expect(counts.normal).toBe(200);
    expect(counts.hard).toBe(200);
  });

  it("すべてのsubjectがCONSENSUS_QUIZ_SUBJECTSに含まれる", () => {
    for (const q of CONSENSUS_QUIZ_QUESTIONS) {
      expect(CONSENSUS_QUIZ_SUBJECTS, `未登録教科: ${q.subject}`).toContain(q.subject);
    }
  });

  it.each(CONSENSUS_QUIZ_QUESTIONS.map((q) => [q.id, q] as const))(
    "[%s] questionとanswerが空文字でない",
    (_id, q) => {
      expect(q.question.trim().length).toBeGreaterThan(0);
      expect(q.answer.trim().length).toBeGreaterThan(0);
    }
  );
});
