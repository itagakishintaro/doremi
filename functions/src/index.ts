import * as admin from "firebase-admin";

admin.initializeApp();

export { parsePdfScore } from "./parsePdfScore";
export { recognizeSpeech } from "./recognizeSpeech";
export { checkClearStatus } from "./checkClearStatus";
