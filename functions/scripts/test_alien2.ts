import * as fs from "node:fs";

const importESM = new Function("m", "return import(m)") as <T = unknown>(m: string) => Promise<T>;

async function main() {
  const buf = fs.readFileSync("/Users/shintaro.itagaki/dev/エイリアンズ.pdf");
  const pdfjs = await importESM<any>("pdfjs-dist/legacy/build/pdf.mjs");
  const canvasMod = await importESM<any>("@napi-rs/canvas");

  // pdfjs-dist v4 の Node 用 CanvasFactory を自前で書く
  const CanvasFactory = class {
    create(width: number, height: number) {
      const canvas = canvasMod.createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      return { canvas, context: ctx };
    }
    reset(canvasAndContext: any, width: number, height: number) {
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    }
    destroy(canvasAndContext: any) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
  };

  const standardFontDataUrl = "file:///Users/shintaro.itagaki/dev/doremi/functions/node_modules/pdfjs-dist/standard_fonts/";
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buf),
    isEvalSupported: false,
    disableFontFace: false,
    useSystemFonts: false,
    standardFontDataUrl,
    verbosity: 0,
    CanvasFactory: CanvasFactory as any,
  });
  const pdf = await loadingTask.promise;
  console.log(`pages: ${pdf.numPages}`);

  // ページ1を高解像度でレンダリング
  const page = await pdf.getPage(1);
  const scale = 4;
  const viewport = page.getViewport({ scale });
  console.log(`viewport ${viewport.width}x${viewport.height}`);
  const factory = new CanvasFactory();
  const { canvas, context } = factory.create(viewport.width, viewport.height);
  // 背景を白に
  context.fillStyle = "white";
  context.fillRect(0, 0, viewport.width, viewport.height);

  await page.render({ canvasContext: context, viewport, canvasFactory: factory }).promise;
  const pngBuf = canvas.encodeSync("png");
  fs.writeFileSync("/tmp/alien-page1.png", pngBuf);
  console.log(`saved: /tmp/alien-page1.png (${pngBuf.length} bytes)`);
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
