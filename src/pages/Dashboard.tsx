import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useScores } from "../hooks/useScores";
import { useDeleteScore } from "../hooks/useDeleteScore";
import { ScoreCard } from "../components/ScoreCard";

export function Dashboard() {
  const { user } = useAuth();
  const { scores, loading } = useScores(user?.uid);
  const { deleteScore, deleting } = useDeleteScore(user?.uid);

  if (loading) {
    return <div className="text-center text-gray-400 py-16">読み込み中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">楽譜一覧</h2>
        <Link
          to="/upload"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium
                     hover:bg-indigo-700 transition-colors"
        >
          + 楽譜を登録
        </Link>
      </div>

      {scores.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">まだ楽譜が登録されていません</p>
          <Link to="/upload" className="text-indigo-600 hover:underline">
            楽譜を登録する
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {scores.map((score) => (
            <ScoreCard
              key={score.id}
              score={score}
              onDelete={deleteScore}
              deleting={deleting === score.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
