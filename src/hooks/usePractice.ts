import { useState, useRef, useCallback } from "react";
import type { Answer, Note } from "../types";

export type PracticePhase = "waiting" | "active" | "finished";

// 音符を認識してからタップするまでの操作時間分の猶予
const TAP_BUFFER_SEC = 1.0;

export function usePractice(notes: Note[], tempo: number) {
  const [phase, setPhase] = useState<PracticePhase>("waiting");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const noteStartTimeRef = useRef<number>(0);

  const expectedTimeSec = (index: number) => {
    const beats = notes[index]?.durationBeats || 1;
    return (60 / tempo) * beats;
  };

  const deadlineTimeSec = (index: number) => expectedTimeSec(index) + TAP_BUFFER_SEC;

  const start = useCallback(() => {
    setPhase("active");
    setCurrentIndex(0);
    setAnswers([]);
    noteStartTimeRef.current = Date.now();
  }, []);

  const answer = useCallback(
    (noteName: string) => {
      if (phase !== "active") return;

      const responseTimeSec = (Date.now() - noteStartTimeRef.current) / 1000;
      const correct = notes[currentIndex]?.noteName ?? "";
      const expected = expectedTimeSec(currentIndex);

      const a: Answer = {
        noteIndex: currentIndex,
        userAnswer: noteName,
        correctAnswer: correct,
        responseTimeSec,
        expectedTimeSec: expected,
        isCorrect: noteName === correct,
        isOnTime: responseTimeSec <= deadlineTimeSec(currentIndex),
      };

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

  return { phase, currentIndex, answers, passed, start, answer, expectedTimeSec, deadlineTimeSec };
}
