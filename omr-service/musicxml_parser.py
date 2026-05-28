"""Parse MusicXML emitted by oemer into Doremi's part-list shape.

Mirrors functions/src/musicxmlParser.ts. Each oemer <measure> is treated as one
"段" (staff system). Rests are dropped — the current Doremi Note schema has no
rest representation.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List

STEP_TO_N = {"C": 1, "D": 2, "E": 3, "F": 4, "G": 5, "A": 6, "B": 7}
DEFAULT_TEMPO = 120
DEFAULT_TIME_SIG = "4/4"


@dataclass
class NoteEntry:
    n: int  # 1=ド ... 7=シ (固定ド)
    d: float  # beats (quarter = 1)


@dataclass
class ParsedScore:
    tempo: int
    time_signature: str
    parts: List[List[NoteEntry]]  # one list per stave/system


def _to_int(s: str | None, fallback: int) -> int:
    if s is None:
        return fallback
    try:
        return int(s)
    except ValueError:
        return fallback


def _parse_page(xml_text: str) -> tuple[List[List[NoteEntry]], int, str]:
    root = ET.fromstring(xml_text)
    parts_out: List[List[NoteEntry]] = []
    divisions = 1
    tempo = DEFAULT_TEMPO
    time_sig = DEFAULT_TIME_SIG

    for part in root.findall("part"):
        for measure in part.findall("measure"):
            attrs = measure.find("attributes")
            if attrs is not None:
                div_el = attrs.find("divisions")
                if div_el is not None and div_el.text:
                    divisions = _to_int(div_el.text, divisions)
                time_el = attrs.find("time")
                if time_el is not None:
                    beats = (time_el.findtext("beats") or "4").strip()
                    beat_type = (time_el.findtext("beat-type") or "4").strip()
                    time_sig = f"{beats}/{beat_type}"

            for sound in measure.findall("sound"):
                t = sound.get("tempo")
                if t is not None:
                    tempo = _to_int(t, tempo)

            entries: List[NoteEntry] = []
            for note in measure.findall("note"):
                if note.find("rest") is not None:
                    continue
                pitch = note.find("pitch")
                if pitch is None:
                    continue
                step = (pitch.findtext("step") or "").strip().upper()
                n = STEP_TO_N.get(step)
                if n is None:
                    continue
                dur_text = note.findtext("duration") or "1"
                duration_units = _to_int(dur_text, 1)
                d = duration_units / divisions if divisions > 0 else 1.0
                entries.append(NoteEntry(n=n, d=d))
            parts_out.append(entries)

    return parts_out, tempo, time_sig


def parse_music_xml_pages(page_xmls: List[str]) -> ParsedScore:
    tempo = DEFAULT_TEMPO
    time_sig = DEFAULT_TIME_SIG
    tempo_set = False
    time_set = False
    all_parts: List[List[NoteEntry]] = []
    for xml in page_xmls:
        parts, t, m = _parse_page(xml)
        if not tempo_set and t != DEFAULT_TEMPO:
            tempo = t
            tempo_set = True
        if not time_set and m != DEFAULT_TIME_SIG:
            time_sig = m
            time_set = True
        all_parts.extend(parts)
    return ParsedScore(tempo=tempo, time_signature=time_sig, parts=all_parts)
