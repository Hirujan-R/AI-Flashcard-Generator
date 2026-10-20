import JSZip from "jszip";
import type { DocumentKind, ParsedDocument } from "./types";
import { normalizeWhitespace, uid } from "./utils";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_DOC_CHARS = 50_000;
export const MAX_TOTAL_CHARS = 80_000;
export const MAX_PDF_PAGES = 250;
export const ACCEPTED_EXTENSIONS = [
  ".docx",
  ".pptx",
  ".pdf",
  ".txt",
  ".md",
] as const;

export function getDocumentKind(filename: string): DocumentKind | null {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (extension === ".docx") return "docx";
  if (extension === ".pptx") return "pptx";
  if (extension === ".pdf") return "pdf";
  if (extension === ".txt") return "txt";
  if (extension === ".md" || extension === ".markdown") return "md";
  return null;
}

export async function parseDocumentFile(file: File): Promise<ParsedDocument> {
  const kind = getDocumentKind(file.name);
  const base: ParsedDocument = {
    id: uid(),
    name: file.name,
    kind: kind ?? "txt",
    size: file.size,
    text: "",
    characters: 0,
    truncated: false,
  };

  if (!kind) {
    return {
      ...base,
      error: "Unsupported file type. Use Word, PowerPoint, PDF, text, or Markdown.",
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ...base,
      error: "File is larger than 20 MB. Try splitting it into smaller files.",
    };
  }

  try {
    let text: string;
    let extractionTrimmed = false;

    if (kind === "docx") {
      text = await extractDocxText(await file.arrayBuffer());
    } else if (kind === "pptx") {
      text = await extractPptxText(await file.arrayBuffer());
    } else if (kind === "pdf") {
      const extracted = await extractPdfText(await file.arrayBuffer());
      text = extracted.text;
      extractionTrimmed = extracted.truncated;
    } else {
      text = await file.text();
    }

    const normalized = normalizeWhitespace(text);
    if (normalized.length < 20) {
      return {
        ...base,
        error:
          kind === "pdf"
            ? "No selectable text was found in this PDF. It may be a scanned document; run OCR on it first, then upload the searchable PDF."
            : "We couldn't find readable text in this file. If it contains scanned images, try a text-based document instead.",
      };
    }

    const truncated = extractionTrimmed || normalized.length > MAX_DOC_CHARS;
    const clipped = truncated
      ? normalized.slice(0, MAX_DOC_CHARS).trimEnd()
      : normalized;

    return {
      ...base,
      text: clipped,
      characters: clipped.length,
      truncated,
    };
  } catch (error) {
    const name =
      error && typeof error === "object" && "name" in error
        ? String((error as { name: unknown }).name)
        : "";

    if (name === "PasswordException") {
      return {
        ...base,
        error:
          "This PDF is password-protected. Remove the password, then upload it again.",
      };
    }

    return {
      ...base,
      error:
        kind === "docx" || kind === "pptx" || kind === "pdf"
          ? "This file couldn't be read. It may be corrupted, password-protected, or not a real Office/PDF file."
          : "This file couldn't be read. Try saving it as plain UTF-8 text.",
    };
  }
}

function parseXml(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("Invalid XML");
  }
  return document;
}

function descendants(root: Document | Element, tagName: string): Element[] {
  return Array.from(root.getElementsByTagName(tagName));
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const main = zip.file("word/document.xml");
  if (!main) throw new Error("Missing document.xml");

  const doc = parseXml(await main.async("text"));
  const paragraphs = descendants(doc, "w:p");
  const output: string[] = [];

  for (const paragraph of paragraphs) {
    let line = "";
    const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_ELEMENT);
    let node = walker.currentNode as Element | null;

    while (node) {
      const name = node.nodeName;
      if (name === "w:t") {
        line += node.textContent ?? "";
      } else if (name === "w:tab") {
        line += "\t";
      } else if (name === "w:br" || name === "w:cr") {
        const type = node.getAttribute("w:type");
        line += type === "page" ? "\n\n" : "\n";
      } else if (name === "w:noBreakHyphen") {
        line += "-";
      }
      node = walker.nextNode() as Element | null;
    }

    if (line.trim()) output.push(line);
  }

  if (output.length === 0) {
    return descendants(doc, "w:t")
      .map((node) => node.textContent ?? "")
      .join(" ");
  }

  return output.join("\n");
}

async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files)
    .map((path) => {
      const match = /^ppt\/slides\/slide(\d+)\.xml$/.exec(path);
      return match ? { path, index: Number(match[1]) } : null;
    })
    .filter((slide): slide is { path: string; index: number } => slide !== null)
    .sort((a, b) => a.index - b.index);

  if (slides.length === 0) throw new Error("No slides found");

  const output: string[] = [];
  for (const slide of slides) {
    const xml = await zip.file(slide.path)!.async("text");
    const doc = parseXml(xml);
    const paragraphs = descendants(doc, "a:p");
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      let line = "";
      const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_ELEMENT);
      let node = walker.currentNode as Element | null;
      while (node) {
        if (node.nodeName === "a:t") line += node.textContent ?? "";
        if (node.nodeName === "a:br") line += "\n";
        node = walker.nextNode() as Element | null;
      }
      if (line.trim()) lines.push(line);
    }

    if (lines.length > 0) {
      output.push(`Slide ${slide.index}\n${lines.join("\n")}`);
    }
  }

  return output.join("\n\n");
}

async function extractPdfText(
  buffer: ArrayBuffer,
): Promise<{ text: string; truncated: boolean }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
  });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const pages: string[] = [];
  let characters = 0;
  let truncated = pdf.numPages > MAX_PDF_PAGES;

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let line = "";
      let lastY: number | null = null;

      for (const item of content.items) {
        if (!("str" in item) || !item.str) continue;
        const y = Array.isArray(item.transform) ? item.transform[5] : null;

        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          if (line.trim()) lines.push(line.trim());
          line = "";
        } else if (
          line &&
          !/\s$/.test(line) &&
          !/^\s/.test(item.str)
        ) {
          line += " ";
        }

        line += item.str;
        if (item.hasEOL) {
          if (line.trim()) lines.push(line.trim());
          line = "";
        }
        lastY = y;
      }

      if (line.trim()) lines.push(line.trim());
      const pageText = lines.join("\n").trim();
      if (pageText) {
        pages.push(`Page ${pageNumber}\n${pageText}`);
        characters += pageText.length;
      }
      page.cleanup();

      if (characters > MAX_DOC_CHARS * 2) {
        truncated = true;
        break;
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return { text: pages.join("\n\n"), truncated };
}

export function fitDocumentsToBudget(
  documents: ParsedDocument[],
): ParsedDocument[] {
  let remaining = MAX_TOTAL_CHARS;

  return documents.map((document) => {
    if (document.error) return document;

    const allowance = Math.max(0, remaining);
    if (document.text.length <= allowance) {
      remaining -= document.text.length;
      return document;
    }

    if (allowance < 200) {
      remaining = 0;
      return {
        ...document,
        text: "",
        characters: 0,
        truncated: true,
        error:
          "Skipped because the combined source limit was reached. Remove another file or split this deck into multiple generations.",
      };
    }

    const clipped = document.text.slice(0, allowance).trimEnd();
    remaining = 0;
    return {
      ...document,
      text: clipped,
      characters: clipped.length,
      truncated: true,
    };
  });
}

export function totalDocumentCharacters(documents: ParsedDocument[]): number {
  return documents.reduce(
    (total, document) => total + (document.error ? 0 : document.characters),
    0,
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
