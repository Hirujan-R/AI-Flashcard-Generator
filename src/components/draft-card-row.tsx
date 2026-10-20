"use client";

import { Check, X } from "lucide-react";
import type { DraftCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { inputClass } from "./ui";

export function DraftCardRow({
  draft,
  index,
  onToggle,
  onChange,
  onRemove,
}: {
  draft: DraftCard;
  index: number;
  onToggle: () => void;
  onChange: (patch: Partial<DraftCard>) => void;
  onRemove: () => void;
}) {
  const incomplete = !draft.front.trim() || !draft.back.trim();

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        draft.selected
          ? incomplete
            ? "border-amber-300 bg-amber-50/30"
            : "border-line bg-surface"
          : "border-line/70 bg-paper/40 opacity-65",
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            draft.selected
              ? "border-forest bg-forest text-cream"
              : "border-line-strong bg-surface text-transparent hover:border-ink/40",
          )}
          aria-label={draft.selected ? "Skip this card" : "Include this card"}
          aria-pressed={draft.selected}
        >
          <Check className="h-3 w-3" />
        </button>
        <span className="font-mono text-[10px] text-muted">
          {String(index + 1).padStart(2, "0")}
        </span>
        {draft.source && (
          <span className="max-w-[50%] truncate rounded-full bg-paper px-2 py-0.5 text-[9px] font-medium text-muted">
            {draft.source}
          </span>
        )}
        {incomplete && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
            Needs text
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded-full p-1 text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
          aria-label="Remove this card"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`draft-front-${draft.id}`}
            className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted"
          >
            <span className="h-1 w-3 rounded-full bg-accent" />
            Anki front
          </label>
          <textarea
            id={`draft-front-${draft.id}`}
            value={draft.front}
            onChange={(event) =>
              onChange({ front: event.target.value.slice(0, 2_000) })
            }
            rows={3}
            placeholder="Question or prompt"
            className={cn(inputClass, "resize-y bg-paper/30 text-[12px] leading-relaxed")}
          />
        </div>
        <div>
          <label
            htmlFor={`draft-back-${draft.id}`}
            className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted"
          >
            <span className="h-1 w-3 rounded-full bg-forest" />
            Anki back
          </label>
          <textarea
            id={`draft-back-${draft.id}`}
            value={draft.back}
            onChange={(event) =>
              onChange({ back: event.target.value.slice(0, 6_000) })
            }
            rows={3}
            placeholder="Answer"
            className={cn(inputClass, "resize-y bg-paper/30 text-[12px] leading-relaxed")}
          />
        </div>
      </div>
    </div>
  );
}
