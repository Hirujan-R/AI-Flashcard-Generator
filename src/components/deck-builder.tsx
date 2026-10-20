"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  FileStack,
  KeyRound,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tags,
  WandSparkles,
  Zap,
} from "lucide-react";
import { buildAnkiDeck } from "@/lib/anki";
import { requestDeck } from "@/lib/deepseek-client";
import { DEEPSEEK_MODELS } from "@/lib/deepseek-contract";
import {
  MAX_TOTAL_CHARS,
  fitDocumentsToBudget,
  getDocumentKind,
  parseDocumentFile,
  totalDocumentCharacters,
} from "@/lib/parse-documents";
import { hasApiKey, useDeepSeekSettings } from "@/lib/settings";
import type { DocumentEntry, DraftCard } from "@/lib/types";
import {
  cn,
  downloadBlob,
  fileStem,
  formatNumber,
  isAbortError,
  pluralize,
  uid,
} from "@/lib/utils";
import { AnkiImportHelp } from "./anki-import-help";
import { DeepSeekSettingsDialog } from "./deepseek-settings";
import { DraftCardRow } from "./draft-card-row";
import { FileDropzone } from "./file-dropzone";
import { GeneratingState } from "./generating-state";
import { Logo } from "./logo";
import { useToast } from "./toast";
import { Button, inputClass, labelClass } from "./ui";

const MAX_FILES = 10;
type CountChoice = "auto" | 5 | 10 | 15 | 20 | 30;

function modelDisplayName(id: string): string {
  return DEEPSEEK_MODELS.find((model) => model.id === id)?.name ?? id;
}

function shortModelName(id: string): string {
  return modelDisplayName(id).replace(/^DeepSeek\s+/, "");
}

function SettingsChip({ onClick }: { onClick: () => void }) {
  const settings = useDeepSeekSettings();
  const connected = hasApiKey(settings);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors",
        connected
          ? "border-forest/20 bg-forest-soft text-forest hover:border-forest/40"
          : "border-accent/30 bg-accent-soft text-accent-deep hover:border-accent/50",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connected ? "bg-forest" : "bg-accent",
        )}
      />
      <span className="hidden sm:inline">
        {connected
          ? `DeepSeek · ${shortModelName(settings.model)}`
          : "Connect DeepSeek"}
      </span>
      <span className="sm:hidden">
        {connected ? "DeepSeek" : "Connect"}
      </span>
      <Settings2 className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

function AppHeader({ onSettings }: { onSettings: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted sm:flex">
            <Package className="h-3 w-3 text-accent" />
            Anki .apkg
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#how-it-works"
            className="hidden rounded-full px-3 py-2 text-[11px] font-semibold text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink sm:block"
          >
            How it works
          </a>
          <SettingsChip onClick={onSettings} />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mt-6 grid items-stretch gap-4 lg:grid-cols-[1.12fr_0.88fr]">
      <div className="relative overflow-hidden rounded-[30px] border border-line bg-surface px-6 py-8 sm:px-9 sm:py-10">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            Flashcards for Anki
          </span>
        </div>
        <h1 className="mt-4 max-w-xl text-balance font-display text-[46px] leading-[0.96] tracking-[-0.025em] text-ink sm:text-[58px]">
          Documents in.
          <br />
          <span className="italic text-accent-deep">Anki deck</span> out.
        </h1>
        <p className="mt-4 max-w-lg text-pretty text-[13px] leading-6 text-muted sm:text-[14px]">
          Drop in a Word doc, slide deck, PDF, or text file. DeepSeek writes the
          cards; you review them and download a ready-to-import{" "}
          <span className="font-semibold text-ink">.apkg</span> file.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-forest" />
            Local-first
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            DeepSeek-powered
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-ink-soft" />
            Basic Front/Back cards
          </span>
        </div>
      </div>

      <div className="relative hidden overflow-hidden rounded-[30px] border border-line bg-[#eee9dd] lg:block">
        <div className="paper-grid absolute inset-0 opacity-70" />
        <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-forest/15 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 w-[300px] -translate-x-1/2 -translate-y-1/2">
          <div
            className="absolute inset-0 rounded-[24px] border border-line bg-[#f7f3e7]"
            style={{ transform: "rotate(6deg) translate(12px, 4px)" }}
          />
          <div
            className="absolute inset-0 rounded-[24px] border border-line bg-[#e9e3d4]"
            style={{ transform: "rotate(-7deg) translate(-14px, 2px)" }}
          />
          <div className="relative rounded-[24px] border border-line-strong/70 bg-cream p-5 shadow-lift">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-soft px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-forest">
                <Package className="h-2.5 w-2.5" />
                Anki package
              </span>
              <span className="font-mono text-[9px] text-muted">.apkg</span>
            </div>
            <p className="mt-4 font-display text-[24px] leading-[1.08] tracking-[-0.02em] text-ink">
              What is the testing effect?
            </p>
            <div className="mt-3 rounded-xl border border-line/80 bg-white/70 p-3">
              <p className="text-[10px] leading-[1.55] text-ink-soft">
                Retrieving information strengthens memory more than rereading it.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line/80 pt-3">
              <span className="text-[9px] text-muted">Front / Back</span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[8px] font-semibold text-accent-deep">
                1 of 18 notes
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-5 rotate-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
              <Download className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-ink">
                Ready for Anki
              </p>
              <p className="text-[9px] text-muted">One file, no copy-paste</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeckDetails({
  deckName,
  setDeckName,
  setDeckNameTouched,
  tags,
  setTags,
  count,
  setCount,
  instructions,
  setInstructions,
  disabled,
}: {
  deckName: string;
  setDeckName: (value: string) => void;
  setDeckNameTouched: (value: boolean) => void;
  tags: string;
  setTags: (value: string) => void;
  count: CountChoice;
  setCount: (value: CountChoice) => void;
  instructions: string;
  setInstructions: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface">
      <div className="border-b border-line/80 px-5 py-4">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Tags className="h-4 w-4 text-accent" />
          Deck details
        </h2>
        <p className="mt-0.5 text-[11px] text-muted">
          Name the deck, add tags, and tell DeepSeek what to focus on.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deck-name" className={labelClass}>
              Deck name
            </label>
            <input
              id="deck-name"
              value={deckName}
              onChange={(event) => {
                setDeckName(event.target.value);
                setDeckNameTouched(true);
              }}
              placeholder="e.g. Biology — Midterm"
              maxLength={120}
              disabled={disabled}
              className={`${inputClass} mt-2`}
            />
          </div>
          <div>
            <label htmlFor="deck-tags" className={labelClass}>
              Tags{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="deck-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="biology, midterm, lecture-4"
              maxLength={300}
              disabled={disabled}
              className={`${inputClass} mt-2`}
            />
            <p className="mt-1.5 text-[10px] text-muted">
              Comma-separated. The tag <code>recall</code> is added automatically.
            </p>
          </div>
        </div>

        <div>
          <span className={labelClass}>How many cards?</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["auto", 5, 10, 15, 20, 30] as CountChoice[]).map((option) => (
              <button
                key={String(option)}
                type="button"
                onClick={() => setCount(option)}
                disabled={disabled}
                className={cn(
                  "min-w-10 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  count === option
                    ? "border-ink bg-ink text-cream"
                    : "border-line bg-surface text-ink-soft hover:border-ink/30",
                )}
              >
                {option === "auto" ? "Auto" : option}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted">
            Auto picks a sensible number between 8 and 30 based on the material.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="deck-instructions" className={labelClass}>
              Guidance{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <span className="text-[10px] tabular-nums text-muted">
              {instructions.length} / 600
            </span>
          </div>
          <textarea
            id="deck-instructions"
            value={instructions}
            onChange={(event) =>
              setInstructions(event.target.value.slice(0, 600))
            }
            rows={3}
            placeholder="e.g. Focus on definitions and formulas. Write the answers in Spanish. Skip trivia."
            disabled={disabled}
            className={`${inputClass} mt-2 resize-y`}
          />
        </div>
      </div>
    </section>
  );
}

function GeneratePanel({
  connected,
  model,
  deepReasoning,
  deckName,
  documentCount,
  cardCount,
  canGenerate,
  parsing,
  onSettings,
  onGenerate,
}: {
  connected: boolean;
  model: string;
  deepReasoning: boolean;
  deckName: string;
  documentCount: number;
  cardCount: CountChoice;
  canGenerate: boolean;
  parsing: boolean;
  onSettings: () => void;
  onGenerate: () => void;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-line bg-surface lg:sticky lg:top-24">
      <div className="flex items-center justify-between border-b border-line/80 px-5 py-4">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <WandSparkles className="h-4 w-4 text-accent" />
          DeepSeek
        </h2>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide",
            connected
              ? "bg-forest-soft text-forest"
              : "bg-accent-soft text-accent-deep",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              connected ? "bg-forest" : "bg-accent",
            )}
          />
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="space-y-4 p-5">
        {connected ? (
          <div className="rounded-xl border border-line bg-paper/40 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Model
              </span>
              <button
                type="button"
                onClick={onSettings}
                className="text-[10px] font-semibold text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
              >
                Change
              </button>
            </div>
            <p className="mt-1 text-[12px] font-semibold text-ink">
              {modelDisplayName(model)}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">{model}</p>
            <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted">
              <Sparkles className="h-3 w-3 text-accent" />
              {deepReasoning ? "Deep reasoning enabled" : "Fast mode"}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-accent/20 bg-accent-soft/60 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                <KeyRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-ink">
                  Connect DeepSeek
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  Add your API key and choose Flash or Pro.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={onSettings} className="mt-3 w-full">
              Add API key
            </Button>
          </div>
        )}

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Deck</span>
            <span className="max-w-[65%] truncate text-right font-semibold text-ink">
              {deckName || "Your new deck"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Sources</span>
            <span className="font-semibold text-ink">
              {parsing
                ? "Reading…"
                : documentCount > 0
                  ? pluralize(documentCount, "document")
                  : "None"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Cards</span>
            <span className="font-semibold text-ink">
              {cardCount === "auto" ? "Auto" : cardCount}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Anki note type</span>
            <span className="font-semibold text-ink">Basic</span>
          </div>
        </div>

        {connected ? (
          <Button
            size="lg"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 text-gold" />
            Generate deck
          </Button>
        ) : (
          <Button size="lg" onClick={onSettings} className="w-full">
            <KeyRound className="h-4 w-4" />
            Connect DeepSeek
          </Button>
        )}

        <p className="text-center text-[10px] leading-relaxed text-muted">
          Only extracted text is sent to DeepSeek. Files never leave your
          browser.
        </p>
      </div>
    </aside>
  );
}

function ExportPanel({
  deckName,
  setDeckName,
  setDeckNameTouched,
  tags,
  setTags,
  selectedCount,
  validCount,
  incompleteSelected,
  exporting,
  exportedFilename,
  exportError,
  onExport,
}: {
  deckName: string;
  setDeckName: (value: string) => void;
  setDeckNameTouched: (value: boolean) => void;
  tags: string;
  setTags: (value: string) => void;
  selectedCount: number;
  validCount: number;
  incompleteSelected: boolean;
  exporting: boolean;
  exportedFilename: string | null;
  exportError: string | null;
  onExport: () => void;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-line bg-surface lg:sticky lg:top-24">
      <div className="border-b border-line/80 px-5 py-4">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Package className="h-4 w-4 text-accent" />
          Export to Anki
        </h2>
        <p className="mt-0.5 text-[11px] text-muted">
          Built here, downloaded as one .apkg file.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <label htmlFor="export-deck-name" className={labelClass}>
            Deck name
          </label>
          <input
            id="export-deck-name"
            value={deckName}
            onChange={(event) => {
              setDeckName(event.target.value);
              setDeckNameTouched(true);
            }}
            placeholder="Recall deck"
            maxLength={120}
            className={`${inputClass} mt-2`}
          />
        </div>
        <div>
          <label htmlFor="export-tags" className={labelClass}>
            Tags
          </label>
          <input
            id="export-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="biology, midterm"
            maxLength={300}
            className={`${inputClass} mt-2`}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-paper/60 px-3 py-2.5 text-[11px]">
          <span className="text-muted">Notes to add</span>
          <span className="font-semibold text-ink">{validCount}</span>
        </div>

        {incompleteSelected && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
            Some selected cards are missing a front or back and will be skipped.
          </p>
        )}

        {exportError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] leading-relaxed text-red-800"
          >
            {exportError}
          </div>
        )}

        <Button
          size="lg"
          onClick={onExport}
          disabled={exporting || validCount === 0}
          className="w-full"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Building package…" : "Download .apkg"}
        </Button>

        {exportedFilename && (
          <div className="rounded-xl border border-forest/20 bg-forest-soft/70 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-forest">
              <CheckCircle2 className="h-4 w-4" />
              Deck downloaded
            </div>
            <p className="mt-1 break-all font-mono text-[9px] text-forest/80">
              {exportedFilename}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-forest/80">
              Open Anki → File → Import and choose this file.
            </p>
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-[9px] text-muted">
          <Check className="h-3 w-3 text-forest" />
          {selectedCount} selected · nothing stored in this app
        </p>
      </div>
    </aside>
  );
}

export function DeckBuilder() {
  const settings = useDeepSeekSettings();
  const connected = hasApiKey(settings);
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [deckNameTouched, setDeckNameTouched] = useState(false);
  const [tags, setTags] = useState("");
  const [count, setCount] = useState<CountChoice>("auto");
  const [instructions, setInstructions] = useState("");
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [cards, setCards] = useState<DraftCard[] | null>(null);
  const [trimmed, setTrimmed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const readyDocs = useMemo(
    () =>
      documents.filter(
        (document) =>
          !document.parsing && !document.error && document.text.trim().length > 0,
      ),
    [documents],
  );
  const totalChars = totalDocumentCharacters(documents);
  const parsing = documents.some((document) => document.parsing);
  const derivedDeckName = useMemo(() => {
    if (deckName.trim()) return deckName;
    if (deckNameTouched) return "";
    const first = readyDocs[0];
    return first ? fileStem(first.name) : "";
  }, [deckName, deckNameTouched, readyDocs]);
  const canGenerate =
    connected && readyDocs.length > 0 && totalChars >= 20 && !parsing;

  const selectedCards = useMemo(
    () => (cards ?? []).filter((card) => card.selected),
    [cards],
  );
  const validSelectedCards = useMemo(
    () =>
      selectedCards.filter(
        (card) => card.front.trim().length > 0 && card.back.trim().length > 0,
      ),
    [selectedCards],
  );
  const allSelected = Boolean(cards?.length) && cards!.every((card) => card.selected);
  const incompleteSelected = selectedCards.some(
    (card) => !card.front.trim() || !card.back.trim(),
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function resetExportState() {
    setExportedFilename(null);
    setExportError(null);
  }

  async function handleFiles(files: File[]) {
    const remaining = MAX_FILES - documents.length;
    if (remaining <= 0) {
      toast(`You can add up to ${MAX_FILES} files at a time.`, "info");
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > accepted.length) {
      toast(
        `Only the first ${accepted.length} file${accepted.length === 1 ? "" : "s"} were added.`,
        "info",
      );
    }

    const placeholders: DocumentEntry[] = accepted.map((file) => ({
      id: uid(),
      name: file.name,
      kind: getDocumentKind(file.name) ?? "txt",
      size: file.size,
      text: "",
      characters: 0,
      truncated: false,
      parsing: true,
    }));

    setDocuments((current) => [...current, ...placeholders]);

    for (const [index, file] of accepted.entries()) {
      const parsed = await parseDocumentFile(file);
      setDocuments((current) =>
        fitDocumentsToBudget(
          current.map((document) =>
            document.id === placeholders[index].id
              ? { ...parsed, id: placeholders[index].id, parsing: false }
              : document,
          ),
        ),
      );
    }
  }

  function removeDocument(id: string) {
    setDocuments((current) =>
      fitDocumentsToBudget(current.filter((document) => document.id !== id)),
    );
  }

  async function handleGenerate() {
    if (!connected) {
      setSettingsOpen(true);
      return;
    }
    if (!canGenerate) return;

    setGenError(null);
    setGenerating(true);
    setTrimmed(false);
    setExportedFilename(null);
    setExportError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await requestDeck(
        {
          apiKey: settings.apiKey,
          model: settings.model,
          deepReasoning: settings.deepReasoning,
          deckName: derivedDeckName.trim() || "Recall deck",
          documents: readyDocs.map((document) => ({
            name: document.name,
            text: document.text,
          })),
          count,
          instructions,
        },
        controller.signal,
      );

      const singleSource =
        readyDocs.length === 1 ? readyDocs[0].name : undefined;
      const generated: DraftCard[] = result.cards.map((card) => ({
        id: uid(),
        front: card.front,
        back: card.back,
        source: card.source || singleSource,
        selected: true,
      }));

      if (generated.length === 0) {
        throw new Error("No cards came back from DeepSeek. Try again.");
      }

      setCards(generated);
      setTrimmed(Boolean(result.trimmed));
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast(
        `${pluralize(generated.length, "card")} generated. Review them, then download the .apkg.`,
        "success",
      );
    } catch (error) {
      if (isAbortError(error)) {
        toast("Generation cancelled.", "info");
      } else {
        setGenError(
          error instanceof Error
            ? error.message
            : "Couldn't generate cards. Please try again.",
        );
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function updateCard(id: string, patch: Partial<DraftCard>) {
    setCards((current) =>
      current?.map((card) => (card.id === id ? { ...card, ...patch } : card)) ??
      null,
    );
    resetExportState();
  }

  function removeCard(id: string) {
    setCards((current) => current?.filter((card) => card.id !== id) ?? null);
    resetExportState();
  }

  function addCard() {
    setCards((current) => [
      ...(current ?? []),
      {
        id: uid(),
        front: "",
        back: "",
        selected: true,
      },
    ]);
    resetExportState();
  }

  function toggleAllSelected() {
    setCards((current) =>
      current?.map((card) => ({
        ...card,
        selected: !allSelected,
      })) ?? null,
    );
    resetExportState();
  }

  async function handleExport() {
    if (validSelectedCards.length === 0) {
      setExportError("Add at least one complete card before downloading.");
      return;
    }

    setExporting(true);
    setExportError(null);
    try {
      const { blob, filename } = await buildAnkiDeck({
        deckName: derivedDeckName.trim() || "Recall deck",
        cards: validSelectedCards,
        tags,
      });
      downloadBlob(blob, filename);
      setExportedFilename(filename);
      toast(`${filename} is ready for Anki.`, "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Couldn't build the Anki package.";
      setExportError(message);
      toast(message, "error");
    } finally {
      setExporting(false);
    }
  }

  const settingsDialog = (
    <DeepSeekSettingsDialog
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
    />
  );

  if (generating) {
    return (
      <div className="min-h-dvh">
        <AppHeader onSettings={() => setSettingsOpen(true)} />
        <main className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-8 sm:px-8">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                Generating
              </span>
            </div>
            <h1 className="mt-2 font-display text-[38px] leading-none tracking-[-0.025em] text-ink sm:text-[46px]">
              Building your Anki deck.
            </h1>
          </div>
          <GeneratingState
            documentCount={readyDocs.length}
            model={modelDisplayName(settings.model)}
            onCancel={() => abortRef.current?.abort()}
          />
        </main>
        {settingsDialog}
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <AppHeader onSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-1 sm:px-8">
        {cards === null ? (
          <>
            <Hero />

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <DeckDetails
                  deckName={derivedDeckName}
                  setDeckName={setDeckName}
                  setDeckNameTouched={setDeckNameTouched}
                  tags={tags}
                  setTags={setTags}
                  count={count}
                  setCount={setCount}
                  instructions={instructions}
                  setInstructions={setInstructions}
                  disabled={false}
                />

                <FileDropzone
                  documents={documents}
                  onFiles={(files) => void handleFiles(files)}
                  onRemove={removeDocument}
                />

                {genError && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
                  >
                    <p className="text-[12px] font-semibold text-red-800">
                      DeepSeek didn&apos;t finish
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-red-700">
                      {genError}
                    </p>
                    <button
                      type="button"
                      onClick={() => setGenError(null)}
                      className="mt-2 text-[10px] font-semibold text-red-800 underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <GeneratePanel
                  connected={connected}
                  model={settings.model}
                  deepReasoning={settings.deepReasoning}
                  deckName={derivedDeckName}
                  documentCount={readyDocs.length}
                  cardCount={count}
                  canGenerate={canGenerate}
                  parsing={parsing}
                  onSettings={() => setSettingsOpen(true)}
                  onGenerate={() => void handleGenerate()}
                />
                <div className="rounded-2xl border border-line bg-surface/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileStack className="h-3.5 w-3.5 text-muted" />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Source limit
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                    <span>{formatNumber(totalChars)} characters</span>
                    <span>{formatNumber(MAX_TOTAL_CHARS)} max</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-forest transition-all"
                      style={{
                        width: `${Math.min(100, (totalChars / MAX_TOTAL_CHARS) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div id="how-it-works" className="mt-4 scroll-mt-24">
              <AnkiImportHelp />
            </div>
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setCards(null);
                    setGenError(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-ink"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sources
                </button>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                    Review
                  </span>
                </div>
                <h1 className="mt-2 max-w-2xl text-balance font-display text-[42px] leading-[1.02] tracking-[-0.025em] text-ink sm:text-[52px]">
                  Your Anki deck is taking shape.
                </h1>
                <p className="mt-2 text-[12px] text-muted">
                  {selectedCards.length} of {cards.length} cards selected · edit
                  anything before you export.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllSelected}
                  className="bg-surface/60"
                >
                  <Check className="h-3.5 w-3.5" />
                  {allSelected ? "Clear all" : "Select all"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleGenerate()}
                  disabled={!canGenerate}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Generate again
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="order-2 space-y-3 lg:order-1">
                {trimmed && (
                  <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-[10px] leading-relaxed text-amber-800">
                    Some source text was trimmed to fit DeepSeek&apos;s context.
                    Split very long documents into separate decks for full
                    coverage.
                  </p>
                )}

                {genError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-red-800"
                  >
                    {genError}
                  </div>
                )}

                {cards.map((card, index) => (
                  <DraftCardRow
                    key={card.id}
                    draft={card}
                    index={index}
                    onToggle={() =>
                      updateCard(card.id, { selected: !card.selected })
                    }
                    onChange={(patch) => updateCard(card.id, patch)}
                    onRemove={() => removeCard(card.id)}
                  />
                ))}

                <button
                  type="button"
                  onClick={addCard}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface/40 px-4 py-5 text-[12px] font-semibold text-ink-soft transition-all hover:border-ink/30 hover:bg-surface"
                >
                  <Plus className="h-4 w-4" />
                  Add a card manually
                </button>

                {cards.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-ink">
                      No cards left in this deck.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => void handleGenerate()}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Generate again
                    </Button>
                  </div>
                )}

                <div id="how-it-works" className="scroll-mt-24">
                  <AnkiImportHelp />
                </div>
              </div>

              <div className="order-1 space-y-4 lg:order-2">
                <ExportPanel
                  deckName={derivedDeckName}
                  setDeckName={(value) => {
                    setDeckName(value);
                    resetExportState();
                  }}
                  setDeckNameTouched={setDeckNameTouched}
                  tags={tags}
                  setTags={(value) => {
                    setTags(value);
                    resetExportState();
                  }}
                  selectedCount={selectedCards.length}
                  validCount={validSelectedCards.length}
                  incompleteSelected={incompleteSelected}
                  exporting={exporting}
                  exportedFilename={exportedFilename}
                  exportError={exportError}
                  onExport={() => void handleExport()}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-line/80">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-2 px-5 py-6 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-forest" />
            Local-first. Your documents are parsed in the browser.
          </span>
          <span>
            Built for{" "}
            <a
              href="https://apps.ankiweb.net/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
            >
              Anki
            </a>{" "}
            · Basic Front/Back notes
          </span>
        </div>
      </footer>

      {settingsDialog}
    </div>
  );
}
