import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Part } from "../types";

export function useParts(userId: string | undefined, scoreId: string | undefined) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !scoreId) return;

    const q = query(
      collection(db, "users", userId, "scores", scoreId, "parts"),
      orderBy("index", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Part));
      setParts(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId, scoreId]);

  return { parts, loading };
}
