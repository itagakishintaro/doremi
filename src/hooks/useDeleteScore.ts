import { useState } from "react";
import { doc, collection, getDocs, writeBatch } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import type { Score } from "../types";

export function useDeleteScore(userId: string | undefined) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const deleteScore = async (score: Score) => {
    if (!userId || !score.id) return;

    setDeleting(score.id);
    try {
      // Storage の PDF を削除
      if (score.pdfPath) {
        try {
          await deleteObject(ref(storage, score.pdfPath));
        } catch {
          // ファイルが存在しない場合は無視
        }
      }

      const scoreRef = doc(db, "users", userId, "scores", score.id);
      const batch = writeBatch(db);

      // parts サブコレクションを削除
      const partsSnap = await getDocs(collection(scoreRef, "parts"));
      partsSnap.docs.forEach((d) => batch.delete(d.ref));

      // practiceResults サブコレクションを削除
      const resultsSnap = await getDocs(collection(scoreRef, "practiceResults"));
      resultsSnap.docs.forEach((d) => batch.delete(d.ref));

      // score ドキュメント本体を削除
      batch.delete(scoreRef);

      await batch.commit();
    } finally {
      setDeleting(null);
    }
  };

  return { deleteScore, deleting };
}
