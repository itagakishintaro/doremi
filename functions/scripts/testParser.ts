// scoreParser の動作確認スクリプト
// 使い方: npx tsx functions/scripts/testParser.ts <pdf-path>

import * as fs from "node:fs";
import * as path from "node:path";
import { extractImagesFromPdf } from "../src/scoreParser/extractImage";
import { detectStavesInPage } from "../src/scoreParser/staves";
import { detectNoteheads } from "../src/scoreParser/noteheads";

const importESM = new Function("m", "return import(m)") as <T = unknown>(m: string) => Promise<T>;

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("usage: npx tsx functions/scripts/testParser.ts <pdf-path>");
    process.exit(1);
  }
  const buf = fs.readFileSync(pdfPath);

  console.log("=== extracting images ===");
  const pages = await extractImagesFromPdf(buf);
  console.log(`pages: ${pages.length}`);
  for (const page of pages) {
    console.log(`  page ${page.pageIndex}: ${page.width}x${page.height}`);
  }

  console.log("\n=== detecting staves & noteheads ===");
  const allStaves: { pageIndex: number; staves: ReturnType<typeof detectStavesInPage> }[] = [];
  const allHeads: { pageIndex: number; heads: ReturnType<typeof detectNoteheads> }[] = [];
  for (const page of pages) {
    const t0 = Date.now();
    const staves = detectStavesInPage(page.pixels, page.width, page.height, page.pageIndex);
    const t1 = Date.now();
    const heads = detectNoteheads(page.pixels, page.width, page.height, staves);
    const t2 = Date.now();
    console.log(`  page ${page.pageIndex}: ${staves.length} staves (${t1 - t0}ms), ${heads.length} noteheads (${t2 - t1}ms)`);
    for (let i = 0; i < staves.length; i++) {
      const s = staves[i];
      const inStave = heads.filter((h) => h.staveIndex === i).length;
      console.log(
        `    stave[${i}] y=${s.staffY[0].toFixed(0)}-${s.staffY[4].toFixed(0)} spacing=${s.spacing.toFixed(1)} heads=${inStave}`
      );
    }
    allStaves.push({ pageIndex: page.pageIndex, staves });
    allHeads.push({ pageIndex: page.pageIndex, heads });
  }

  // 全体パイプラインを動かして確認
  console.log("\n=== full parse via scoreParser ===");
  const { parseScorePdf } = await import("../src/scoreParser/index.js");
  const result = await parseScorePdf(buf);
  console.log(`  staves: ${result.staves.length}`);
  console.log(`  raw heads: ${result.rawHeads.length}`);
  console.log(`  accepted heads: ${result.acceptedHeads.length}`);
  console.log(`  parts: ${result.score.p.length}`);
  const NOTE = ["?", "ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"];
  for (let i = 0; i < Math.min(5, result.score.p.length); i++) {
    const part = result.score.p[i];
    console.log(`  part[${i}] (${part.length} notes): ${part.map((e) => NOTE[e.n]).join(",")}`);
  }

  // SVG（簡易デバッグ画像）を書き出す: ページ画像（縮小PNG）に五線を重ね描き
  console.log("\n=== writing debug SVG ===");
  const sharp = (await importESM<typeof import("sharp")>("sharp")).default;
  for (const page of pages) {
    const scale = 0.2;
    const dispW = Math.round(page.width * scale);
    const dispH = Math.round(page.height * scale);
    const pngBuf = await sharp(
      Buffer.from(page.pixels.buffer, page.pixels.byteOffset, page.pixels.byteLength),
      { raw: { width: page.width, height: page.height, channels: 1 } }
    )
      .resize({ width: dispW })
      .png()
      .toBuffer();
    const base64 = pngBuf.toString("base64");

    const staves = allStaves.find((s) => s.pageIndex === page.pageIndex)!.staves;
    const heads = allHeads.find((s) => s.pageIndex === page.pageIndex)!.heads;
    const lines = staves
      .map(
        (s, idx) => `
        ${s.staffY
          .map(
            (y) =>
              `<line x1="${s.xMin * scale}" y1="${y * scale}" x2="${s.xMax * scale}" y2="${y * scale}" stroke="blue" stroke-width="0.5" opacity="0.6" />`
          )
          .join("")}
        <text x="${(s.xMin - 30) * scale}" y="${(s.staffY[2] + 5) * scale}" fill="green" font-size="14">${idx}</text>`
      )
      .join("");
    const dots = heads
      .map(
        (h) =>
          `<circle cx="${h.x * scale}" cy="${h.y * scale}" r="3" fill="red" fill-opacity="0.5" stroke="red" stroke-width="0.5" />`
      )
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dispW}" height="${dispH}">
  <image href="data:image/png;base64,${base64}" width="${dispW}" height="${dispH}" />
  ${lines}
  ${dots}
</svg>`;
    const outPath = path.join("/tmp", `parser-page${page.pageIndex}.svg`);
    fs.writeFileSync(outPath, svg);
    console.log(`  ${outPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
