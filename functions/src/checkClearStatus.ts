import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface CheckRequest {
  scoreId: string;
  userId: string;
}

export const checkClearStatus = onCall(
  { region: "asia-northeast1" },
  async (request) => {
    const { scoreId, userId } = request.data as CheckRequest;
    if (!scoreId || !userId) throw new HttpsError("invalid-argument", "scoreId and userId are required");

    const db = admin.firestore();
    const scoreRef = db.collection("users").doc(userId).collection("scores").doc(scoreId);
    const partsSnap = await scoreRef.collection("parts").get();

    if (partsSnap.empty) return { cleared: false };

    const allPlus = partsSnap.docs.every((doc) => doc.data().lastResult === "plus");

    if (allPlus) {
      await scoreRef.update({
        cleared: true,
        clearedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { cleared: allPlus };
  }
);
