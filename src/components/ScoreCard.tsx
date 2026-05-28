import { Link } from "react-router-dom";
import type { Score } from "../types";

interface Props {
  score: Score;
  onDelete: (score: Score) => void;
  deleting: boolean;
}

export function ScoreCard({ score, onDelete, deleting }: Props) {
  const statusBadge = () => {
    if (score.status === "parsing") {
      return (
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
          解析中...
        </span>
      );
    }
    if (score.status === "error") {
      return (
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
          エラー
        </span>
      );
    }
    if (score.cleared) {
      return (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          クリア済み
        </span>
      );
    }
    return (
      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
        練習中
      </span>
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`「${score.title}」を削除しますか？\nStorageのPDFとすべての練習データが削除されます。`)) {
      onDelete(score);
    }
  };

  return (
    <div className="relative group">
      <Link
        to={score.status === "ready" ? `/scores/${score.id}` : "#"}
        className={`block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow ${
          score.status !== "ready" ? "pointer-events-none opacity-70" : ""
        } ${deleting ? "opacity-40 pointer-events-none" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 truncate pr-6">{score.title}</h3>
          {statusBadge()}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {score.totalParts} パート
          {score.clearedAt && (
            <> ・ クリア日: {score.clearedAt.toDate().toLocaleDateString("ja-JP")}</>
          )}
        </p>
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center
                   rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50
                   opacity-0 group-hover:opacity-100 transition-all
                   disabled:cursor-not-allowed"
        title="削除"
      >
        {deleting ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
