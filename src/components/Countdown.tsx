import { useEffect, useState } from "react";

// 各ステップの表示時間（ms）
const STEP_MS = 700;
// 3 → 2 → 1 → スタート の順に表示
const STEPS = ["3", "2", "1", "スタート"];

export function Countdown({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) {
      onComplete();
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [step, onComplete]);

  if (step >= STEPS.length) return null;

  const isStart = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* keyでステップごとに再マウントしてアニメーションを再生 */}
      <span
        key={step}
        className={`animate-countdown-pop font-extrabold tabular-nums drop-shadow-lg
          ${isStart ? "text-6xl sm:text-7xl text-green-300" : "text-8xl sm:text-9xl text-white"}`}
      >
        {STEPS[step]}
      </span>
    </div>
  );
}
