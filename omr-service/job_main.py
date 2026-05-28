"""Entrypoint for Cloud Run Job.

Reads execution parameters from environment variables (set via the Jobs API's
execution overrides), runs the OMR pipeline, and exits.

Unlike the HTTP `/parse` endpoint, this entrypoint runs to completion and
is not subject to Cloud Run Service's instance-idle-timeout. The Job's
`--task-timeout` is the only time bound.
"""

from __future__ import annotations

import logging
import os
import sys

from server import _process

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("omr-job")


def main() -> int:
    try:
        bucket = os.environ["BUCKET"]
        obj = os.environ["OBJECT"]
        score_id = os.environ["SCORE_ID"]
        user_id = os.environ["USER_ID"]
    except KeyError as e:
        log.error("missing required env var: %s", e)
        return 2

    log.info("job start scoreId=%s userId=%s object=%s", score_id, user_id, obj)
    try:
        _process(bucket, obj, score_id, user_id)
    except Exception:
        log.exception("job fatal error")
        return 1
    log.info("job done scoreId=%s", score_id)
    return 0


if __name__ == "__main__":
    sys.exit(main())
