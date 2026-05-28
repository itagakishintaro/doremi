"""oemer wrapper.

Responsibilities:
- Inject `np.int` / `np.float` / `np.bool` / `np.object` aliases that oemer 0.1.5
  uses but numpy 2.x has removed.
- Rasterize PDF pages to PNG via poppler's pdftoppm.
- Invoke oemer's `extract()` on each page and collect the produced MusicXML.
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from dataclasses import dataclass
from typing import List

import numpy as np

for _name, _py in {"int": int, "float": float, "bool": bool, "object": object}.items():
    if not hasattr(np, _name):
        setattr(np, _name, _py)

# Import only after the aliases are in place.
from oemer.ete import extract as _oemer_extract  # noqa: E402


@dataclass
class PageResult:
    page_index: int
    musicxml: str


class OmrError(RuntimeError):
    pass


def _rasterize_pdf(pdf_path: str, out_dir: str, dpi: int = 300) -> List[str]:
    out_prefix = os.path.join(out_dir, "page")
    cmd = ["pdftoppm", "-png", "-r", str(dpi), pdf_path, out_prefix]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        raise OmrError(f"pdftoppm failed: {e.stderr.decode(errors='replace')}") from e
    pngs = sorted(
        os.path.join(out_dir, f) for f in os.listdir(out_dir) if f.endswith(".png")
    )
    if not pngs:
        raise OmrError("pdftoppm produced no pages")
    return pngs


class _Args:
    """Mimic argparse.Namespace shape that oemer.ete.extract expects."""

    def __init__(self, img_path: str, output_dir: str) -> None:
        self.img_path = img_path
        self.output_path = output_dir
        self.use_tf = False
        self.save_cache = False
        self.without_deskew = False


def run_oemer_on_pdf(pdf_path: str, work_dir: str) -> List[PageResult]:
    pngs = _rasterize_pdf(pdf_path, work_dir)
    results: List[PageResult] = []
    for idx, png in enumerate(pngs):
        page_dir = os.path.join(work_dir, f"page_{idx}")
        os.makedirs(page_dir, exist_ok=True)
        args = _Args(png, page_dir)
        mxl_path = _oemer_extract(args)
        with open(mxl_path, "r", encoding="utf-8") as f:
            results.append(PageResult(page_index=idx, musicxml=f.read()))
    return results
