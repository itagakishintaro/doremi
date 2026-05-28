FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        poppler-utils \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Pre-download oemer ONNX model checkpoints into the installed package directory
# so the first request does not trigger a 100MB+ download.
RUN MP="$(python -c 'from oemer import MODULE_PATH; print(MODULE_PATH)')" \
    && mkdir -p "$MP/checkpoints/unet_big" "$MP/checkpoints/seg_net" \
    && curl -fsSL -o "$MP/checkpoints/unet_big/model.onnx" \
         https://github.com/BreezeWhite/oemer/releases/download/checkpoints/1st_model.onnx \
    && curl -fsSL -o "$MP/checkpoints/seg_net/model.onnx" \
         https://github.com/BreezeWhite/oemer/releases/download/checkpoints/2nd_model.onnx

COPY server.py runner.py musicxml_parser.py job_main.py ./

ENV PORT=8080
EXPOSE 8080

# Single worker, single thread. oemer is CPU-bound and uses lots of memory;
# concurrency is controlled at Cloud Run's instance level.
# --timeout matches Cloud Run --timeout (3600s); shorter values kill the worker
# mid-oemer even when Cloud Run would still allow the request to continue.
CMD ["gunicorn", "-b", "0.0.0.0:8080", "-w", "1", "--threads", "1", "--timeout", "3600", "server:app"]
