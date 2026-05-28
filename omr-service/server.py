"""Cloud Run HTTP server for OMR (async pattern).

POST /parse
  body: { "bucket", "object", "scoreId", "userId" }
  resp: 202 { "status": "accepted" } -- returns immediately
  Background thread does: download → oemer → MusicXML parse → Firestore write.
  Completion is signaled via the score document's `status` field
  (parsing → ready | error), which the frontend already watches via onSnapshot.

GET /health
  resp: 200 "ok"
  (Note: /healthz is reserved by Google Frontend and never reaches the container.)

Background processing requires the Cloud Run service to be deployed with
`--no-cpu-throttling` so the worker thread continues after /parse returns.
"""

from __future__ import annotations

import logging
import os
import tempfile
import threading
import time
import traceback

from flask import Flask, jsonify, request
from google.cloud import firestore, storage

from musicxml_parser import parse_music_xml_pages
from runner import OmrError, run_oemer_on_pdf

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("omr-service")

NOTE_MAP = ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"]

app = Flask(__name__)
_storage_client: storage.Client | None = None
_firestore_client: firestore.Client | None = None


def _gcs() -> storage.Client:
    global _storage_client
    if _storage_client is None:
        _storage_client = storage.Client()
    return _storage_client


def _fs() -> firestore.Client:
    global _firestore_client
    if _firestore_client is None:
        _firestore_client = firestore.Client()
    return _firestore_client


def _write_status_error(user_id: str, score_id: str, message: str) -> None:
    try:
        score_ref = (
            _fs().collection("users").document(user_id).collection("scores").document(score_id)
        )
        score_ref.update({"status": "error", "errorMessage": message[:500]})
    except Exception:
        log.exception("failed to update score status=error")


def _process(bucket: str, obj: str, score_id: str, user_id: str) -> None:
    log.info("worker start scoreId=%s userId=%s object=%s", score_id, user_id, obj)
    t0 = time.monotonic()

    with tempfile.TemporaryDirectory() as td:
        pdf_path = os.path.join(td, "in.pdf")
        try:
            _gcs().bucket(bucket).blob(obj).download_to_filename(pdf_path)
        except Exception as e:
            log.exception("gcs download failed")
            _write_status_error(user_id, score_id, f"gcs download failed: {e}")
            return

        try:
            pages = run_oemer_on_pdf(pdf_path, td)
        except OmrError as e:
            log.exception("oemer failed")
            _write_status_error(user_id, score_id, f"oemer failed: {e}")
            return
        except Exception as e:
            log.exception("unexpected oemer error")
            _write_status_error(
                user_id, score_id, f"unexpected: {e}\n{traceback.format_exc()[-500:]}"
            )
            return

    try:
        parsed = parse_music_xml_pages([p.musicxml for p in pages])
    except Exception as e:
        log.exception("musicxml parse failed")
        _write_status_error(user_id, score_id, f"musicxml parse failed: {e}")
        return

    try:
        db = _fs()
        score_ref = (
            db.collection("users").document(user_id).collection("scores").document(score_id)
        )
        parts_coll = score_ref.collection("parts")

        # delete existing parts
        for doc in parts_coll.stream():
            doc.reference.delete()

        # write fresh parts
        batch = db.batch()
        for index, entries in enumerate(parsed.parts):
            part_ref = parts_coll.document()
            batch.set(
                part_ref,
                {
                    "index": index,
                    "imageUrl": "",
                    "notes": [
                        {
                            "noteName": NOTE_MAP[((e.n - 1) % 7 + 7) % 7],
                            "durationBeats": e.d,
                        }
                        for e in entries
                    ],
                    "tempo": parsed.tempo,
                    "timeSignature": parsed.time_signature,
                    "lastResult": None,
                },
            )
        batch.commit()
        score_ref.update({"status": "ready", "totalParts": len(parsed.parts)})
    except Exception as e:
        log.exception("firestore write failed")
        _write_status_error(user_id, score_id, f"firestore write failed: {e}")
        return

    elapsed = time.monotonic() - t0
    log.info(
        "worker done scoreId=%s pages=%d staves=%d elapsed=%.1fs",
        score_id,
        len(pages),
        len(parsed.parts),
        elapsed,
    )


@app.get("/health")
def health():
    return "ok", 200


@app.post("/parse")
def parse():
    body = request.get_json(silent=True) or {}
    bucket = body.get("bucket")
    obj = body.get("object")
    score_id = body.get("scoreId")
    user_id = body.get("userId")
    if not (bucket and obj and score_id and user_id):
        return (
            jsonify({"error": "bucket, object, scoreId, userId are all required"}),
            400,
        )

    log.info("accepted scoreId=%s userId=%s object=%s", score_id, user_id, obj)
    # daemon=False is important: gunicorn workers won't reap non-daemon threads
    # mid-execution, and Cloud Run with --no-cpu-throttling keeps the instance
    # warm while the worker has active CPU work.
    threading.Thread(
        target=_process, args=(bucket, obj, score_id, user_id), daemon=False
    ).start()
    return jsonify({"status": "accepted", "scoreId": score_id}), 202


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), debug=False)
