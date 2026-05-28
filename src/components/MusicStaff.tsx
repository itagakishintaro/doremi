// 五線の間隔を16pxに設定
// 第5線y=20, 第4線y=36, 第3線y=52, 第2線y=68, 第1線y=84
const NOTE_Y: Record<string, number> = {
  "ド":  100, // C4: 第1線の下（加線1本）
  "レ":   92, // D4: 加線と第1線の間
  "ミ":   84, // E4: 第1線
  "ファ":  76, // F4: 第1〜第2線間
  "ソ":   68, // G4: 第2線
  "ラ":   60, // A4: 第2〜第3線間
  "シ":   52, // B4: 第3線
};

const STAFF_LINES = [20, 36, 52, 68, 84]; // 第5線〜第1線
const LEDGER_Y = 100; // ドの加線

interface Props {
  noteName: string;
}

export function MusicStaff({ noteName }: Props) {
  const noteY = NOTE_Y[noteName] ?? 68;
  const needsLedger = noteName === "ド";

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 260 118"
        className="w-full max-w-sm"
        aria-label="音符"
      >
        {/* 五線 */}
        {STAFF_LINES.map((y) => (
          <line key={y} x1="20" y1={y} x2="240" y2={y} stroke="#374151" strokeWidth="1.5" />
        ))}

        {/* ト音記号 */}
        <text x="22" y="94" fontSize="90" fontFamily="serif" fill="#374151" style={{ userSelect: "none" }}>
          𝄞
        </text>

        {/* ドの加線 */}
        {needsLedger && (
          <line x1="112" y1={LEDGER_Y} x2="152" y2={LEDGER_Y} stroke="#374151" strokeWidth="1.5" />
        )}

        {/* 音符（楕円・やや小さめ） */}
        <ellipse
          cx="132"
          cy={noteY}
          rx="9"
          ry="6.5"
          transform={`rotate(-15, 132, ${noteY})`}
          fill="#1e3a5f"
        />

        {/* 符幹 */}
        <line
          x1="140"
          y1={noteY - 2}
          x2="140"
          y2={noteY - 40}
          stroke="#1e3a5f"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}
