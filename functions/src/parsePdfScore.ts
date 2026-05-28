import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";

interface ParseRequest {
  scoreId: string;
  userId: string;
}

const STORAGE_BUCKET = "doremi-2d517.firebasestorage.app";
const REGION = "asia-northeast1";
const JOB_NAME = "omr-job";

// Project number is injected at deploy time. See functions/.env.<projectId>.
const projectIdParam = defineString("PROJECT_ID");

// Auth client with cloud-platform scope to call the Cloud Run Admin API.
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

async function triggerOmrJob(
  bucket: string,
  object: string,
  scoreId: string,
  userId: string
): Promise<void> {
  const projectId = projectIdParam.value() || "doremi-2d517";
  const url = `https://${REGION}-run.googleapis.com/v2/projects/${projectId}/locations/${REGION}/jobs/${JOB_NAME}:run`;

  const client = await auth.getClient();
  // Fire the job execution. Returns immediately with an Operation resource.
  await client.request({
    url,
    method: "POST",
    data: {
      overrides: {
        containerOverrides: [
          {
            env: [
              { name: "BUCKET", value: bucket },
              { name: "OBJECT", value: object },
              { name: "SCORE_ID", value: scoreId },
              { name: "USER_ID", value: userId },
            ],
          },
        ],
      },
    },
    timeout: 60_000,
    responseType: "json",
  });
}

export const parsePdfScore = onCall(
  {
    region: REGION,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const { scoreId, userId } = request.data as ParseRequest;
    if (!scoreId || !userId) {
      throw new HttpsError("invalid-argument", "scoreId and userId are required");
    }

    const db = admin.firestore();
    const scoreRef = db.collection("users").doc(userId).collection("scores").doc(scoreId);
    const scoreSnap = await scoreRef.get();
    if (!scoreSnap.exists) throw new HttpsError("not-found", "Score not found");

    const pdfPath: string = scoreSnap.data()!.pdfPath;
    console.log(`[parsePdfScore] trigger job scoreId=${scoreId} pdfPath=${pdfPath}`);

    try {
      await triggerOmrJob(STORAGE_BUCKET, pdfPath, scoreId, userId);
      // Job runs in background; completion is signaled via the score document's
      // `status` field (parsing -> ready/error), which the frontend watches via onSnapshot.
      return { success: true, accepted: true };
    } catch (err) {
      console.error("[parsePdfScore] trigger failed:", err instanceof Error ? err.stack : String(err));
      await scoreRef.update({
        status: "error",
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
      });
      throw new HttpsError("internal", err instanceof Error ? err.message : String(err));
    }
  }
);
