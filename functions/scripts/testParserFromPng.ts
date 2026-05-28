// PNGファイルを直接読み込んで scoreParser でテストする
// 使い方: npx tsx functions/scripts/testParserFromPng.ts <png1> [png2 ...]

import * as fs from "node:fs";
import * as path from "node:path";
import { detectStavesInPage } from "../src/scoreParser/staves";
import { detectNoteheads } from "../src/scoreParser/noteheads";
import { calcPosIndex, posIndexToNoteNumber } from "../src/scoreParser/pitch";

const importESM = new Function("m", "return import(m)") as <T = unknown>(m: string) => Promise<T>;

const NOTE = ["?", "ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"];

async function main() {
  const pngPaths = process.argv.slice(2);
  if (pngPaths.length === 0) {
    console.error("usage: npx tsx functions/scripts/testParserFromPng.ts <png1> [png2 ...]");
    process.exit(1);
  }

  const sharpMod = (await importESM<typeof import("sharp")>("sharp")) as unknown as { default: typeof import("sharp") };
  const sharp = sharpMod.default;

  for (let i = 0; i < pngPaths.length; i++) {
    const p = pngPaths[i];
    console.log(`\n=== ${path.basename(p)} ===`);
    const img = sharp(p).removeAlpha().grayscale();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    console.log(`  size: ${info.width} x ${info.height}, channels: ${info.channels}`);

    // 二値化（150 を閾値に）
    const bin = new Uint8Array(pixels.length);
    for (let j = 0; j < pixels.length; j++) bin[j] = pixels[j] < 150 ? 0 : 255;

    const t0 = Date.now();
    const staves = detectStavesInPage(bin, info.width, info.height, i);
    const t1 = Date.now();
    const heads = detectNoteheads(bin, info.width, info.height, staves);
    const t2 = Date.now();
    console.log(`  staves: ${staves.length} (${t1 - t0}ms), heads: ${heads.length} (${t2 - t1}ms)`);
    for (let si = 0; si < Math.min(3, staves.length); si++) {
      const s = staves[si];
      const sh = heads.filter((h) => h.staveIndex === si);
      const clefSkip = s.xMin + s.spacing * 7;
      const accepted = sh.filter((h) => h.x >= clefSkip).sort((a, b) => a.x - b.x);
      const names = accepted.map((h) => {
        const pi = calcPosIndex(h.y, s);
        return NOTE[posIndexToNoteNumber(pi)];
      });
      console.log(
        `    stave[${si}] y=${s.staffY[0]}-${s.staffY[4]} spacing=${s.spacing.toFixed(1)} accepted=${accepted.length}: ${names.join(",")}`
      );
    }

    // SVGデバッグも書き出す
    const scale = 0.18;
    const dispW = Math.round(info.width * scale);
    const dispH = Math.round(info.height * scale);
    const pngBuf = await sharp(Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength), {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
      .resize({ width: dispW })
      .png()
      .toBuffer();
    const base64 = pngBuf.toString("base64");
    const linesStr = staves
      .map((s, si) => {
        const lines = s.staffY
          .map(
            (y) =>
              `<line x1="${s.xMin * scale}" y1="${y * scale}" x2="${s.xMax * scale}" y2="${y * scale}" stroke="blue" stroke-width="0.4" opacity="0.6" />`
          )
          .join("");
        const label = `<text x="${(s.xMin - 60) * scale}" y="${(s.staffY[2] + 5) * scale}" fill="green" font-size="12">${si}</text>`;
        return lines + label;
      })
      .join("");
    const dotsStr = heads
      .map((h) => {
        const s = staves[h.staveIndex];
        const accepted = h.x >= s.xMin + s.spacing * 7;
        const color = accepted ? "red" : "orange";
        return `<circle cx="${h.x * scale}" cy="${h.y * scale}" r="2" fill="${color}" fill-opacity="0.7" />`;
      })
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dispW}" height="${dispH}">
  <image href="data:image/png;base64,${base64}" width="${dispW}" height="${dispH}" />
  ${linesStr}
  ${dotsStr}
</svg>`;
    const out = `/tmp/parser-${path.basename(p, ".png")}.svg`;
    fs.writeFileSync(out, svg);
    console.log(`  debug: ${out}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
