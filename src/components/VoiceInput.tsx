import { useState, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

interface Props {
  onAnswer: (noteName: string) => void;
  disabled?: boolean;
}

interface RecognizeResult {
  noteName: string;
}

export function VoiceInput({ onAnswer, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const base64 = await blobToBase64(blob);
      try {
        const fn = httpsCallable<{ audioBase64: string }, RecognizeResult>(
          functions,
          "recognizeSpeech"
        );
        const result = await fn({ audioBase64: base64 });
        onAnswer(result.data.noteName);
      } catch {
        // 認識失敗時は無視
      }
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <button
      onMouseDown={start}
      onMouseUp={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      disabled={disabled}
      className={`w-full py-4 rounded-lg font-bold text-white transition-colors
        ${recording ? "bg-red-500" : "bg-gray-600 hover:bg-gray-700"}
        disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {recording ? "録音中... (離して送信)" : "長押しして音声入力"}
    </button>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
