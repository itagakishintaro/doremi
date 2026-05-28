import * as fs from "node:fs";
import { detectStavesInPage } from "../src/scoreParser/staves";
import { detectNoteheads } from "../src/scoreParser/noteheads";
import { calcPosIndex, posIndexToNoteNumber } from "../src/scoreParser/pitch";

const importESM = new Function("m", "return import(m)") as <T = unknown>(m: string) => Promise<T>;

const NOTE = ["?", "ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"];

async function main() {
  const sharpMod = (await importESM<typeof import("sharp")>("sharp")) as unknown as { default: typeof import("sharp") };
  const sharp = sharpMod.default;
  const { data, info } = await sharp("/tmp/alien-1.png").removeAlpha().grayscale().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const bin = new Uint8Array(pixels.length);
  for (let j = 0; j < pixels.length; j++) bin[j] = pixels[j] < 150 ? 0 : 255;

  const staves = detectStavesInPage(bin, info.width, info.height, 0);
  const heads = detectNoteheads(bin, info.width, info.height, staves);

  const s0 = staves[0];
  const clefSkip = s0.xMin + s0.spacing * 7;
  console.log(`stave[0]: xMin=${s0.xMin} xMax=${s0.xMax} staffY=${s0.staffY.join(",")} spacing=${s0.spacing.toFixed(2)}`);
  console.log(`clefSkip ends at x=${clefSkip.toFixed(0)}`);
  const h0 = heads
    .filter((h) => h.staveIndex === 0 && h.x >= clefSkip)
    .sort((a, b) => a.x - b.x);
  let prevX = clefSkip;
  for (const h of h0) {
    const pi = calcPosIndex(h.y, s0);
    const n = posIndexToNoteNumber(pi);
    const gap = h.x - prevX;
    console.log(`  x=${h.x.toFixed(0).padStart(4)} y=${h.y.toFixed(0)} pi=${pi.toFixed(2)} → ${NOTE[n]} (gap=${gap.toFixed(0)})`);
    prevX = h.x;
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
