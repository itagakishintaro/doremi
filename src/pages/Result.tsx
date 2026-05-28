import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Answer, Note } from "../types";

interface LocationState {
  answers: Answer[];
  passed: boolean;
  partIndex: number;
  notes: Note[];
}

export function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { scoreId } = useParams<{ scoreId: string }>();
  const state = location.state as LocationState | null;

  if (!state) {
    navigate("/");
    return null;
  }

  const { answers, passed, partIndex, notes } = state;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const onTimeCount = answers.filter((a) => a.isOnTime).length;

  return (
    <div className="space-y-6">
      <div
        className={`text-center py-8 rounded-xl ${
          passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
        }`}
      >
        <p className="text-4xl mb-2">{passed ? "+" : "-"}</p>
        <h2 className={`text-2xl font-bold ${passed ? "text-green-700" : "text-red-700"}`}>
          {passed ? "クリア！" : "もう一度！"}
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          パート {partIndex + 1} / 正解: {correctCount}/{answers.length} / 間に合い: {onTimeCount}/{answers.length}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-700">詳細</p>
        </div>
        <div className="divide-y divide-gray-100">
          {answers.map((a, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-5">{i + 1}</span>
                <span className="font-medium text-gray-900">{notes[i]?.noteName}</span>
                {a.userAnswer !== a.correctAnswer && (
                  <span className="text-red-500 text-xs">→ {a.userAnswer}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={a.isCorrect ? "text-green-600" : "text-red-500"}>
                  {a.isCorrect ? "正解" : "不正解"}
                </span>
                <span className={a.isOnTime ? "text-green-600" : "text-red-500"}>
                  {a.responseTimeSec.toFixed(1)}s / {a.expectedTimeSec.toFixed(1)}s
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate(`/scores/${scoreId}`)}
          className="flex-1 py-3 border border-gray-300 rounded-lg text-sm font-medium
                     text-gray-700 hover:bg-gray-50 transition-colors"
        >
          パート一覧へ
        </button>
        <button
          onClick={() => navigate(-1)}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium
                     hover:bg-indigo-700 transition-colors"
        >
          もう一度
        </button>
      </div>
    </div>
  );
}
