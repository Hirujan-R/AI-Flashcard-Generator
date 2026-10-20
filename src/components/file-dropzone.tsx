"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Presentation,
  UploadCloud,
  X,
} from "lucide-react";
import {
  ACCEPTED_EXTENSIONS,
  MAX_TOTAL_CHARS,
  formatFileSize,
  totalDocumentCharacters,
} from "@/lib/parse-documents";
import type { DocumentEntry } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { Button } from "./ui";

export function FileDropzone({
  documents,
  onFiles,
  onRemove,
  disabled = false,
}: {
  documents: DocumentEntry[];
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const totalChars = totalDocumentCharacters(documents);
  const parsing = documents.some((document) => document.parsing);
  const truncated = documents.some(
    (document) => document.truncated && !document.error,
  );

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line/80 px-5 py-4">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Source documents</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Add one or several files. They&apos;re parsed in your browser.
          </p>
        </div>
        {documents.length > 0 && (
          <span className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-[10px] font-semibold text-ink-soft">
            {documents.length} file{documents.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            dragDepth.current += 1;
            if (!disabled) setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) {
              dragDepth.current = 0;
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            if (!disabled) handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-colors",
            dragging
              ? "border-accent bg-accent-soft/50"
              : "border-line-strong bg-paper/35 hover:border-ink/25 hover:bg-paper/60",
          )}
        >
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors",
              dragging
                ? "border-accent/30 bg-accent text-white"
                : "border-line bg-surface text-ink-soft",
            )}
          >
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="mt-3 font-display text-[24px] leading-tight tracking-[-0.02em] text-ink">
            {dragging ? "Drop to add your sources" : "Drop your documents here"}
          </p>
          <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted">
            Word, PowerPoint, PDF, plain text, or Markdown. Up to 20 MB each.
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="hidden"
            disabled={disabled}
            onChange={(event) => handleFiles(event.target.files)}
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Choose files
          </Button>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {["DOCX", "PPTX", "PDF", "TXT", "MD"].map((format) => (
              <span
                key={format}
                className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-muted"
              >
                {format}
              </span>
            ))}
          </div>
        </div>

        {documents.length > 0 && (
          <div className="mt-4">
            <div className="space-y-2">
              {documents.map((document) => {
                const Icon =
                  document.kind === "pptx" ? Presentation : FileText;
                const failed = Boolean(document.error);
                return (
                  <div
                    key={document.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-3 py-2.5",
                      failed
                        ? "border-red-200 bg-red-50/60"
                        : "border-line bg-paper/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        failed
                          ? "bg-red-100 text-red-600"
                          : "bg-surface text-ink-soft",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="max-w-full truncate text-[12px] font-semibold text-ink">
                          {document.name}
                        </p>
                        {document.parsing ? (
                          <span className="flex items-center gap-1 rounded-full bg-ink/[0.05] px-1.5 py-0.5 text-[9px] font-semibold text-muted">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Parsing
                          </span>
                        ) : failed ? (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                            Unreadable
                          </span>
                        ) : (
                          <>
                            <span className="rounded-full bg-forest-soft px-1.5 py-0.5 text-[9px] font-semibold text-forest">
                              Ready
                            </span>
                            {document.truncated && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                                Trimmed
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <p
                        className={cn(
                          "mt-0.5 text-[10px] leading-relaxed",
                          failed ? "text-red-700" : "text-muted",
                        )}
                      >
                        {document.parsing
                          ? `${formatFileSize(document.size)} · reading text…`
                          : failed
                            ? document.error
                            : `${document.kind.toUpperCase()} · ${formatFileSize(document.size)} · ${formatNumber(document.characters)} characters`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(document.id)}
                      className="mt-0.5 rounded-full p-1.5 text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
                      aria-label={`Remove ${document.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-muted">
              <span>
                {parsing
                  ? "Reading your files…"
                  : `${formatNumber(totalChars)} characters ready`}
              </span>
              <span>
                Source limit {formatNumber(MAX_TOTAL_CHARS)} characters
              </span>
            </div>
            {truncated && (
              <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
                Some source text was trimmed to keep generation fast and within
                model limits. Split very long files into smaller decks for full
                coverage.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
