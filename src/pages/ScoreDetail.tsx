import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useParts } from "../hooks/useParts";
import type { Part } from "../types";

function PartRow({ part, scoreId }: { part: Part; scoreId: string }) {
  const badge = () => {
    if (part.lastResult === "plus")
      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">+</span>;
    if (part.lastResult === "minus")
      return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">-</span>;
    return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">未練習</span>;
  };

  return (
    <Link
      to={`/scores/${scoreId}/practice/${part.id}`}
      className="flex items-center justify-between p-4 bg-white rounded-lg border
                 border-gray-200 hover:shadow-md transition-shadow"
    >
      <div>
        <p className="font-medium text-gray-900">パート {part.index + 1}</p>
        <p className="text-sm text-gray-500">
          ♩={part.tempo} / {part.timeSignature} / {part.notes.length}音符
        </p>
      </div>
      <div className="flex items-center gap-2">
        {badge()}
        <span className="text-gray-400">→</span>
      </div>
    </Link>
  );
}

export function ScoreDetail() {
  const { scoreId } = useParams<{ scoreId: string }>();
  const { user } = useAuth();
  const { parts, loading } = useParts(user?.uid, scoreId);
  const navigate = useNavigate();

  if (loading) {
    return <div className="text-center text-gray-400 py-16">読み込み中...</div>;
  }

  const randomPractice = () => {
    if (parts.length === 0) return;
    const part = parts[Math.floor(Math.random() * parts.length)];
    navigate(`/scores/${scoreId}/practice/${part.id}`);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← 一覧に戻る
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">パート一覧</h2>
        <button
          onClick={randomPractice}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium
                     hover:bg-indigo-700 transition-colors"
        >
          ランダム練習
        </button>
      </div>

      {parts.length === 0 ? (
        <p className="text-center text-gray-400 py-8">パートがありません</p>
      ) : (
        <div className="space-y-3">
          {parts.map((part) => (
            <PartRow key={part.id} part={part} scoreId={scoreId!} />
          ))}
        </div>
      )}
    </div>
  );
}
