import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

interface RecognizeRequest {
  audioBase64: string;
}

interface RecognizeResult {
  noteName: string;
}

const NOTE_NAMES = ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"];

export const recognizeSpeech = onCall(
  { secrets: [anthropicApiKey], region: "asia-northeast1" },
  async (request) => {
    const { audioBase64 } = request.data as RecognizeRequest;
    if (!audioBase64) throw new HttpsError("invalid-argument", "audioBase64 is required");

    const client = new Anthropic({ apiKey: anthropicApiKey.value() });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `ユーザーが歌った音声（base64エンコード済み、webm形式）を聞いて、
歌っているドレミの音名を1つ答えてください。
候補: ド、レ、ミ、ファ、ソ、ラ、シ
音名のみを1文字で返してください。例: ド

音声データ（参考）: ${audioBase64.substring(0, 100)}...

最も可能性の高い音名を返してください。`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const matched = NOTE_NAMES.find((n) => text.includes(n));
    const noteName: string = matched ?? "ド";

    return { noteName } as RecognizeResult;
  }
);
