// PDF構造観察 + 画像抽出テスト
// 使い方: npx tsx functions/scripts/inspectPdf.ts <pdf-path>

import * as fs from "node:fs";
import * as path from "node:path";

const importESM = new Function("m", "return import(m)") as <T = unknown>(m: string) => Promise<T>;

interface PdfJsApi {
  getDocument: (src: {
    data: Uint8Array;
    isEvalSupported?: boolean;
    disableFontFace?: boolean;
    verbosity?: number;
  }) => { promise: Promise<PdfDoc> };
  OPS: Record<string, number>;
}

interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
}

interface PdfPage {
  view: number[];
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  objs: {
    get: (k: string) => unknown;
    has: (k: string) => boolean;
  };
  commonObjs: {
    get: (k: string) => unknown;
    has: (k: string) => boolean;
  };
}

interface PdfImageData {
  width: number;
  height: number;
  data?: Uint8Array | Uint8ClampedArray;
  bitmap?: { width: number; height: number };
  kind?: number;
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("usage: npx tsx functions/scripts/inspectPdf.ts <pdf-path>");
    process.exit(1);
  }
  const buf = fs.readFileSync(pdfPath);

  const pdfjs = await importESM<PdfJsApi>("pdfjs-dist/legacy/build/pdf.mjs");
  const OPS = pdfjs.OPS;
  const opsName = (code: number): string => {
    for (const [k, v] of Object.entries(OPS)) if (v === code) return k;
    return `OP_${code}`;
  };

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buf),
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  console.log(`pages: ${pdf.numPages}`);

  // ページ1の画像抽出を試す
  const page = await pdf.getPage(1);
  console.log(`page1 view: ${JSON.stringify(page.view)}`);

  const opList = await page.getOperatorList();

  // paintImageXObject の引数（画像名）を集める
  const imageNames: string[] = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === OPS.paintImageXObject) {
      const args = opList.argsArray[i] as [string];
      imageNames.push(args[0]);
      console.log(`  paintImageXObject[${i}] name=${args[0]}`);
    }
  }

  // 画像オブジェクトを取得
  for (const name of imageNames) {
    console.log(`\n--- image: ${name} ---`);
    let imgData: PdfImageData | null = null;
    try {
      if (page.objs.has(name)) {
        imgData = page.objs.get(name) as PdfImageData;
        console.log(`  source: page.objs`);
      } else if (page.commonObjs.has(name)) {
        imgData = page.commonObjs.get(name) as PdfImageData;
        console.log(`  source: page.commonObjs`);
      } else {
        // 解決待ちかもしれない。get に Promise が返るパターン
        const result = page.objs.get(name);
        console.log(`  page.objs.get returned: ${typeof result}`);
        if (result && typeof (result as { then?: unknown }).then === "function") {
          imgData = (await (result as Promise<PdfImageData>)) ?? null;
        } else {
          imgData = result as PdfImageData;
        }
      }
    } catch (e) {
      console.log(`  error: ${(e as Error).message}`);
      continue;
    }
    if (!imgData) {
      console.log(`  no data`);
      continue;
    }
    console.log(`  width=${imgData.width} height=${imgData.height} kind=${imgData.kind}`);
    console.log(`  has data=${!!imgData.data} dataLen=${imgData.data?.length ?? "n/a"}`);
    console.log(`  has bitmap=${!!imgData.bitmap}`);
    if (imgData.bitmap) {
      console.log(`  bitmap.width=${imgData.bitmap.width} bitmap.height=${imgData.bitmap.height}`);
    }
    console.log(`  keys: ${Object.keys(imgData).join(",")}`);

    // 1bpp（kind=1）を 8bppグレースケールにアンパック
    if (imgData.width && imgData.height && imgData.data && imgData.kind === 1) {
      const w = imgData.width;
      const h = imgData.height;
      const rowBytes = Math.ceil(w / 8);
      console.log(`  unpacking 1bpp: rowBytes=${rowBytes} expected=${rowBytes * h} actual=${imgData.data.length}`);
      const unpacked = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const byte = imgData.data[y * rowBytes + (x >> 3)];
          const bit = (byte >> (7 - (x & 7))) & 1;
          // PDF 1bpp: 1=白 (255), 0=黒 (0)
          unpacked[y * w + x] = bit ? 255 : 0;
        }
      }
      const sharp = (await importESM<typeof import("sharp")>("sharp")).default;
      try {
        const outPath = path.join("/tmp", `inspect-${name}.png`);
        // 半分にダウンサンプリングして保存
        await sharp(Buffer.from(unpacked.buffer, unpacked.byteOffset, unpacked.byteLength), {
          raw: { width: w, height: h, channels: 1 },
        })
          .resize({ width: Math.round(w / 4) })
          .png()
          .toFile(outPath);
        console.log(`  saved: ${outPath} (downsampled to ${Math.round(w / 4)}px wide)`);
      } catch (e) {
        console.log(`  sharp error: ${(e as Error).message}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
