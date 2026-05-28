import { useEffect, useState } from "react";

interface Props {
  expectedSec: number;
  running: boolean;
}

export function Timer({ expectedSec, running }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 50);
    return () => clearInterval(id);
  }, [running]);

  const ratio = Math.min(elapsed / expectedSec, 1);
  const overTime = elapsed > expectedSec;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{elapsed.toFixed(1)}秒</span>
        <span>目標: {expectedSec.toFixed(1)}秒</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-none ${overTime ? "bg-red-500" : "bg-green-500"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
