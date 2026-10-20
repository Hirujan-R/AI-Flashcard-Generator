import { copyFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const assets = [
  ["node_modules/sql.js/dist/sql-wasm-browser.wasm", "public/sql-wasm.wasm"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/pdf.worker.min.mjs"],
];

await mkdir(path.join(root, "public"), { recursive: true });

for (const [source, destination] of assets) {
  const from = path.join(root, source);
  try {
    await access(from);
    await copyFile(from, path.join(root, destination));
    console.log(`Copied ${source} -> ${destination}`);
  } catch {
    console.warn(`Static asset not found yet: ${source}`);
  }
}
