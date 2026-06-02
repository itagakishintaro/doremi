import { NOTE_NAMES } from "../types";
import { playNote } from "../audio/tone";

interface Props {
  onAnswer: (noteName: string) => void;
  disabled?: boolean;
}

export function NoteInput({ onAnswer, disabled }: Props) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {NOTE_NAMES.map((note) => (
        <button
          key={note}
          onClick={() => {
            playNote(note);
            onAnswer(note);
          }}
          disabled={disabled}
          className="py-4 rounded-lg text-lg font-bold bg-indigo-100 text-indigo-800
                     hover:bg-indigo-200 active:bg-indigo-300 disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
        >
          {note}
        </button>
      ))}
    </div>
  );
}
