import type { DraftCard } from "./types";
import { slugifyFilename } from "./utils";

const MAX_DECK_NAME = 120;
const MAX_TAG_LENGTH = 60;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toAnkiHtml(value: string): string {
  return escapeHtml(value.trim()).replace(/\r\n?/g, "\n").replace(/\n/g, "<br>");
}

export function normalizeAnkiTag(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_:-]+/gu, "")
    .slice(0, MAX_TAG_LENGTH);
}

export function normalizeAnkiTags(raw: string | string[]): string[] {
  const input = Array.isArray(raw) ? raw : raw.split(/[,\n]/);
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const tag of ["recall", ...input]) {
    const normalized = normalizeAnkiTag(tag);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(normalized);
  }

  return tags;
}

function fallbackHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(5);
}

async function stableNoteId(deckName: string, front: string, back: string) {
  const source = `${deckName}\u0000${front}\u0000${back}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(source),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return fallbackHash(source);
}

function apkgFilename(deckName: string): string {
  let base = slugifyFilename(deckName);
  if (base === "collection" || base.startsWith("backup-")) {
    base = `recall-${base}`;
  }
  return `${base}-anki.apkg`;
}

export interface AnkiDeckResult {
  blob: Blob;
  filename: string;
}

export async function buildAnkiDeck(input: {
  deckName: string;
  cards: DraftCard[];
  tags: string;
}): Promise<AnkiDeckResult> {
  const deckName =
    input.deckName.trim().slice(0, MAX_DECK_NAME) || "Recall deck";
  const cards = input.cards.filter(
    (card) => card.front.trim() && card.back.trim(),
  );

  if (cards.length === 0) {
    throw new Error("Add at least one complete card before exporting.");
  }

  const { default: AnkiExport } = await import("anki-apkg-export");
  const apkg = await AnkiExport.create(deckName, {
    kind: "basic",
    locateFile: () => "/sql-wasm.wasm",
  });

  try {
    const tags = normalizeAnkiTags(input.tags);

    for (const card of cards) {
      apkg.addCard(toAnkiHtml(card.front), toAnkiHtml(card.back), {
        noteId: await stableNoteId(deckName, card.front.trim(), card.back.trim()),
        tags,
      });
    }

    const blob = await apkg.save({ type: "blob" });
    return { blob, filename: apkgFilename(deckName) };
  } finally {
    apkg.close();
  }
}
