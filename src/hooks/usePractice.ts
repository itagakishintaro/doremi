import { useState, useRef, useCallback } from "react";
import type { Answer, Note } from "../types";

export type PracticePhase = "waiting" | "countdown" | "active" | "finished";
export type FeedbackType = "correct" | "late" | "wrong" | null;

// 音符を認識してからタップするまでの操作時間分の猶予（レベルで可変）
// レベルが上がるほど猶予が短くなり難しくなる
export const TAP_BUFFER_LEVELS: { level: number; bufferSec: number }[] = [
  { level: 1, bufferSec: 2.0 },
  { level: 2, bufferSec: 1.5 },
  { level: 3, bufferSec: 1.0 },
  { level: 4, bufferSec: 0.75 },
  { level: 5, bufferSec: 0.5 },
];
export const DEFAULT_TAP_LEVEL = 1;
export const DEFAULT_TAP_BUFFER_SEC = 2.0;

export function bufferSecForLevel(level: number): number {
  return TAP_BUFFER_LEVELS.find((l) => l.level === level)?.bufferSec ?? DEFAULT_TAP_BUFFER_SEC;
}

export function usePractice(notes: Note[], tempo: number, tapBufferSec: number = DEFAULT_TAP_BUFFER_SEC) {
  const [phase, setPhase] = useState<PracticePhase>("waiting");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const noteStartTimeRef = useRef<number>(0);

  const expectedTimeSec = (index: number) => {
    const beats = notes[index]?.durationBeats || 1;
    return (60 / tempo) * beats;
  };

  const deadlineTimeSec = (index: number) => expectedTimeSec(index) + tapBufferSec;

  // 練習開始ボタン押下時：カウントダウンに入る（この時点では計測しない）
  const start = useCallback(() => {
    setPhase("countdown");
    setCurrentIndex(0);
    setAnswers([]);
  }, []);

  // カウントダウン終了時：1音目の計測を開始する
  const begin = useCallback(() => {
    setPhase("active");
    noteStartTimeRef.current = Date.now();
  }, []);

  const answer = useCallback(
    (noteName: string) => {
      if (phase !== "active") return;

      const responseTimeSec = (Date.now() - noteStartTimeRef.current) / 1000;
      const correct = notes[currentIndex]?.noteName ?? "";
      const deadline = deadlineTimeSec(currentIndex);

      const isCorrect = noteName === correct;
      const isOnTime = responseTimeSec <= deadline;

      const a: Answer = {
        noteIndex: currentIndex,
        userAnswer: noteName,
        correctAnswer: correct,
        responseTimeSec,
        expectedTimeSec: deadline,
        isCorrect,
        isOnTime,
      };

      setFeedbackType(!isCorrect ? "wrong" : !isOnTime ? "late" : "correct");
      setTimeout(() => setFeedbackType(null), 400);

      const next = [...answers, a];
      setAnswers(next);

      if (currentIndex + 1 >= notes.length) {
        setPhase("finished");
      } else {
        setCurrentIndex((i) => i + 1);
        noteStartTimeRef.current = Date.now();
      }
    },
    [phase, currentIndex, notes, answers]
  );

  const passed = answers.length > 0 && answers.every((a) => a.isCorrect && a.isOnTime);

  return { phase, currentIndex, answers, passed, start, begin, answer, expectedTimeSec, deadlineTimeSec, feedbackType };
}
