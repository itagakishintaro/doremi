import type { Part } from "../types";

interface Props {
  part: Part;
  currentNoteIndex?: number;
}

export function PartViewer({ part, currentNoteIndex }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
        <span>パート {part.index + 1}</span>
        <span>テンポ: ♩={part.tempo} / 拍子: {part.timeSignature}</span>
      </div>

      {part.imageUrl ? (
        <img
          src={part.imageUrl}
          alt={`楽譜パート ${part.index + 1}`}
          className="w-full rounded"
        />
      ) : (
        <div className="bg-gray-100 rounded h-32 flex items-center justify-center text-gray-400 text-sm">
          楽譜画像なし
        </div>
      )}

      {currentNoteIndex !== undefined && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {part.notes.map((note, i) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium border
                ${i < currentNoteIndex ? "bg-gray-100 text-gray-500 border-gray-200" : ""}
                ${i === currentNoteIndex ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300" : ""}
                ${i > currentNoteIndex ? "bg-white text-gray-200 border-gray-100" : ""}
              `}
            >
              {/* 回答済みのみ正解を表示。現在・未来は非表示 */}
              {i < currentNoteIndex ? note.noteName : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
