import sys
import xml.etree.ElementTree as ET

STEP_TO_DOREMI = {"C": "ド", "D": "レ", "E": "ミ", "F": "ファ", "G": "ソ", "A": "ラ", "B": "シ"}

tree = ET.parse(sys.argv[1])
root = tree.getroot()

for part in root.findall(".//part"):
    measures = part.findall("measure")
    print(f"# part: {part.get('id')}  measures={len(measures)}")
    for m in measures:
        num = m.get("number")
        # attributes
        key = m.find(".//key/fifths")
        time = m.find(".//time")
        hdr = ""
        if key is not None:
            hdr += f" key={key.text}"
        if time is not None:
            b = time.find("beats"); bt = time.find("beat-type")
            if b is not None and bt is not None:
                hdr += f" time={b.text}/{bt.text}"
        toks = []
        for note in m.findall("note"):
            if note.find("rest") is not None:
                dur = note.find("duration")
                t = note.find("type")
                toks.append(f"休({t.text if t is not None else '?'})")
                continue
            p = note.find("pitch")
            if p is None:
                continue
            step = p.find("step").text
            octv = p.find("octave").text
            alt = p.find("alter")
            acc = ""
            if alt is not None:
                acc = "#" if alt.text == "1" else ("b" if alt.text == "-1" else "")
            t = note.find("type")
            tt = t.text if t is not None else "?"
            doremi = STEP_TO_DOREMI.get(step, step)
            toks.append(f"{doremi}{acc}{octv}({tt})")
        print(f"  m{num}{hdr}: " + "  ".join(toks))
