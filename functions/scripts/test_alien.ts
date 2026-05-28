import * as fs from "node:fs";

const importESM = new Function("m", "return import(m)") as <T = unknown>(m: string) => Promise<T>;

interface PdfJsApi {
  getDocument: (src: { data: Uint8Array; isEvalSupported?: boolean; disableFontFace?: boolean; verbosity?: number }) => { promise: Promise<PdfDoc> };
  OPS: Record<string, number>;
}
interface PdfDoc { numPages: number; getPage: (n: number) => Promise<PdfPage>; }
interface PdfPage {
  view: number[];
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
  objs: { get: (k: string) => unknown; has: (k: string) => boolean };
  commonObjs: { get: (k: string) => unknown; has: (k: string) => boolean };
}

async function main() {
  const buf = fs.readFileSync("/Users/shintaro.itagaki/dev/エイリアンズ.pdf");
  console.log(`pdf bytes: ${buf.length}`);
  const pdfjs = await importESM<PdfJsApi>("pdfjs-dist/legacy/build/pdf.mjs");
  const OPS = pdfjs.OPS;
  const opsName = (code: number): string => {
    for (const [k, v] of Object.entries(OPS)) if (v === code) return k;
    return `OP_${code}`;
  };

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, verbosity: 0 });
  const pdf = await loadingTask.promise;
  console.log(`pages: ${pdf.numPages}`);

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    console.log(`page${p} view: ${JSON.stringify(page.view)}`);
    const opList = await page.getOperatorList();
    const counts = new Map<number, number>();
    for (const c of opList.fnArray) counts.set(c, (counts.get(c) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log(`  top ops: ${top.map(([c, n]) => `${opsName(c)}=${n}`).join(", ")}`);
    // paintImageXObject の数
    const imgCount = counts.get(OPS.paintImageXObject) ?? 0;
    console.log(`  paintImageXObject: ${imgCount}`);
  }
}
main().catch((e) => { console.error("ERROR:", e); process.exit(1); });
