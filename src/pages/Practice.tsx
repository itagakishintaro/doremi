import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, collection, updateDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import {
  usePractice,
  TAP_BUFFER_LEVELS,
  DEFAULT_TAP_LEVEL,
  bufferSecForLevel,
} from "../hooks/usePractice";
import type { Part } from "../types";
import { PartViewer } from "../components/PartViewer";
import { MusicStaff } from "../components/MusicStaff";
import { NoteInput } from "../components/NoteInput";
import { Timer } from "../components/Timer";
import { Countdown } from "../components/Countdown";

export function Practice() {
  const { scoreId, partId } = useParams<{ scoreId: string; partId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState<number>(() => {
    const saved = Number(localStorage.getItem("tapLevel"));
    return TAP_BUFFER_LEVELS.some((l) => l.level === saved) ? saved : DEFAULT_TAP_LEVEL;
  });

  const setAndStoreLevel = (lv: number) => {
    setLevel(lv);
    localStorage.setItem("tapLevel", String(lv));
  };

  useEffect(() => {
    if (!user || !scoreId || !partId) return;
    getDoc(doc(db, "users", user.uid, "scores", scoreId, "parts", partId)).then((snap) => {
      if (snap.exists()) setPart({ id: snap.id, ...snap.data() } as Part);
      setLoading(false);
    });
  }, [user, scoreId, partId]);

  const { phase, currentIndex, answers, passed, start, begin, answer, deadlineTimeSec, feedbackType } =
    usePractice(part?.notes ?? [], part?.tempo ?? 120, bufferSecForLevel(level));

  const feedbackBg =
    feedbackType === "correct" ? "bg-green-100" :
    feedbackType === "wrong"   ? "bg-red-100"   :
    feedbackType === "late"    ? "bg-yellow-100" :
    "bg-white";

  useEffect(() => {
    if (phase !== "finished" || !user || !scoreId || !partId || !part) return;

    const save = async () => {
      setSaving(true);
      try {
        await addDoc(
          collection(db, "users", user.uid, "scores", scoreId, "practiceResults"),
          {
            partId,
            answers,
            passed,
            practizedAt: serverTimestamp(),
          }
        );

        await updateDoc(
          doc(db, "users", user.uid, "scores", scoreId, "parts", partId),
          { lastResult: passed ? "plus" : "minus" }
        );

        const checkFn = httpsCallable(functions, "checkClearStatus");
        await checkFn({ scoreId, userId: user.uid });

        navigate(`/scores/${scoreId}/result`, {
          state: { answers, passed, partIndex: part.index, notes: part.notes },
        });
      } finally {
        setSaving(false);
      }
    };

    save();
  }, [phase]);

  if (loading) {
    return <div className="text-center text-gray-400 py-16">読み込み中...</div>;
  }
  if (!part) {
    return <div className="text-center text-red-500 py-16">パートが見つかりません</div>;
  }

  return (
    <div className="space-y-4">
      {phase === "countdown" && <Countdown onComplete={begin} />}

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/scores/${scoreId}`)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 戻る
        </button>
      </div>

      {/* 進捗バブル（回答済みのみ音符名表示） */}
      <PartViewer part={part} currentNoteIndex={phase === "active" ? currentIndex : undefined} />

      {phase === "waiting" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">難易度（タップ猶予）</span>
              <span className="text-xs text-gray-400">
                レベル{level}・{bufferSecForLevel(level)}秒
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {TAP_BUFFER_LEVELS.map((l) => (
                <button
                  key={l.level}
                  onClick={() => setAndStoreLevel(l.level)}
                  className={`py-2 rounded-lg text-sm font-bold transition-colors
                    ${level === l.level
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
                >
                  {l.level}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              レベルが上がるほど猶予が短く、難しくなります
            </p>
          </div>

          <button
            onClick={start}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold
                       hover:bg-indigo-700 transition-colors"
          >
            練習開始
          </button>
        </div>
      )}

      {phase === "active" && (
        <div className={`space-y-3 rounded-xl transition-colors duration-300 p-2 ${feedbackBg}`}>
          {/* 五線譜で現在の音符を表示（音符名は非表示） */}
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
            <MusicStaff noteName={part.notes[currentIndex]?.noteName ?? "ド"} />
          </div>

          <Timer
            expectedSec={deadlineTimeSec(currentIndex)}
            running={true}
            key={currentIndex}
          />

          <NoteInput onAnswer={answer} />

          <p className="text-center text-sm text-gray-500">
            {currentIndex + 1} / {part.notes.length} 音符
          </p>
        </div>
      )}

      {(phase === "finished" || saving) && (
        <div className="text-center text-gray-400 py-8">結果を保存中...</div>
      )}
    </div>
  );
}
