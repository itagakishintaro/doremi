import { Timestamp } from "firebase/firestore";

export type ScoreStatus = "parsing" | "ready" | "error";
export type PartResult = "plus" | "minus" | null;

export interface Note {
  noteName: string;
  durationBeats: number;
}

export interface Answer {
  noteIndex: number;
  userAnswer: string;
  correctAnswer: string;
  responseTimeSec: number;
  expectedTimeSec: number;
  isCorrect: boolean;
  isOnTime: boolean;
}

export interface Score {
  id?: string;
  title: string;
  pdfUrl: string;
  pdfPath: string;
  totalParts: number;
  cleared: boolean;
  clearedAt: Timestamp | null;
  status: ScoreStatus;
  errorMessage?: string;
  createdAt: Timestamp;
}

export interface Part {
  id?: string;
  index: number;
  imageUrl: string;
  notes: Note[];
  tempo: number;
  timeSignature: string;
  lastResult: PartResult;
}

export interface PracticeResult {
  id?: string;
  partId: string;
  answers: Answer[];
  passed: boolean;
  practizedAt: Timestamp;
}

export const NOTE_NAMES = ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"];
