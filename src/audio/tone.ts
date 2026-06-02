// タップした音名に対応する音高を Web Audio API で再生する。
// 音名は日本語表記（ド〜シ）の 1 オクターブ固定（C4〜B4）。

// 平均律 C4 基準の周波数（Hz）
const NOTE_FREQ: Record<string, number> = {
  "ド": 261.63, // C4
  "レ": 293.66, // D4
  "ミ": 329.63, // E4
  "ファ": 349.23, // F4
  "ソ": 392.0, // G4
  "ラ": 440.0, // A4
  "シ": 493.88, // B4
};

// AudioContext は使い回す（タップごとに生成しない）
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null; // 非対応環境では何もしない
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function playNote(noteName: string) {
  const freq = NOTE_FREQ[noteName];
  if (freq == null) return;

  const audio = getContext();
  if (!audio) return;

  // モバイル/iOS のオーディオロックはユーザー操作ハンドラ内での resume が必要。
  // playNote はタップ起点で呼ばれるためここで解除する。
  if (audio.state === "suspended") {
    void audio.resume();
  }

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = "triangle"; // sine より輪郭があり聞き取りやすい
  osc.frequency.setValueAtTime(freq, now);

  // クリックノイズ防止のエンベロープ（速いアタック → 約0.4秒のリリース）
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

  osc.connect(gain);
  gain.connect(audio.destination);

  osc.start(now);
  osc.stop(now + 0.42);
}
