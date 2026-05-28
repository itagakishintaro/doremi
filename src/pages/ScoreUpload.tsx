import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { storage, db, functions } from "../firebase";
import { useAuth } from "../hooks/useAuth";

interface ParseResult {
  scoreId: string;
}

export function ScoreUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !title.trim()) return;

    setUploading(true);
    setError("");

    try {
      const path = `users/${user.uid}/scores/${Date.now()}.pdf`;
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });

      const pdfUrl = await getDownloadURL(storageRef);

      const scoreRef = await addDoc(
        collection(db, "users", user.uid, "scores"),
        {
          title: title.trim(),
          pdfUrl,
          pdfPath: path,
          totalParts: 0,
          cleared: false,
          clearedAt: null,
          status: "parsing",
          createdAt: serverTimestamp(),
        }
      );

      const parseFn = httpsCallable<{ scoreId: string; userId: string }, ParseResult>(
        functions,
        "parsePdfScore"
      );
      parseFn({ scoreId: scoreRef.id, userId: user.uid });

      navigate("/");
    } catch (err) {
      setError("アップロードに失敗しました。もう一度お試しください。");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-6">楽譜を登録</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            楽譜タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: バイエル No.1"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            楽譜PDF
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center
                       cursor-pointer hover:border-indigo-400 transition-colors"
          >
            {file ? (
              <p className="text-sm text-gray-700">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">PDFファイルをクリックして選択</p>
                <p className="text-xs text-gray-400 mt-1">PDF形式のみ対応</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>

        {uploading && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>アップロード中...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!file || !title.trim() || uploading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium
                     hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          {uploading ? "登録中..." : "登録する"}
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-3 text-center">
        登録後、Claude AIが楽譜を解析します（数秒〜数十秒かかります）
      </p>
    </div>
  );
}
