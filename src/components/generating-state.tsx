"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "./ui";

const statuses = [
  "Reading your documents",
  "Finding the key ideas",
  "Writing precise questions",
  "Checking for duplicates",
  "Polishing the answers",
];

export function GeneratingState({
  documentCount,
  model,
  onCancel,
}: {
  documentCount: number;
  model: string;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusIndex((value) => Math.min(value + 1, statuses.length - 1));
    }, 3_200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative flex min-h-[480px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-ink/10 bg-ink px-6 py-14 text-center text-cream">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-forest/50 blur-3xl" />

      <div className="relative h-40 w-56">
        <div
          className="absolute inset-x-6 top-3 h-36 rounded-2xl border border-cream/10 bg-cream/[0.04]"
          style={{ transform: "rotate(-9deg) translate(-14px, 4px)" }}
        />
        <div
          className="absolute inset-x-6 top-3 h-36 rounded-2xl border border-cream/10 bg-cream/[0.06]"
          style={{ transform: "rotate(7deg) translate(14px, 2px)" }}
        />
        <div className="animate-pulse-soft relative flex h-36 flex-col justify-between rounded-2xl border border-cream/15 bg-cream/[0.09] p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-cream/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-cream/70">
              <Sparkles className="h-2.5 w-2.5 text-gold" />
              Writing cards
            </span>
            <span className="font-mono text-[8px] text-cream/40">AI</span>
          </div>
          <div className="space-y-2 text-left">
            <div className="h-2 w-4/5 rounded-full bg-cream/25" />
            <div className="h-2 w-3/5 rounded-full bg-cream/15" />
            <div className="h-2 w-2/5 rounded-full bg-cream/10" />
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1 w-1 animate-pulse rounded-full bg-gold" />
            <span
              className="h-1 w-1 animate-pulse rounded-full bg-gold"
              style={{ animationDelay: "200ms" }}
            />
            <span
              className="h-1 w-1 animate-pulse rounded-full bg-gold"
              style={{ animationDelay: "400ms" }}
            />
          </div>
        </div>
      </div>

      <div className="relative mt-8 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
        {statuses[statusIndex]}
        <span className="animate-pulse-soft">…</span>
      </div>

      <h2 className="mt-3 max-w-xl text-balance font-display text-[40px] leading-[1.02] tracking-[-0.025em] text-cream sm:text-[48px]">
        Turning {documentCount === 1 ? "your document" : "your documents"} into
        Anki notes.
      </h2>
      <p className="mt-3 max-w-md text-[12px] leading-relaxed text-cream/55">
        {model} is working through the material. This usually takes 10–40
        seconds; deep reasoning can take a little longer.
      </p>

      <div className="mt-7 flex items-center gap-4">
        <span className="font-mono text-[11px] tabular-nums text-cream/40">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
        <span className="h-3 w-px bg-cream/15" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-cream/60 hover:bg-cream/10 hover:text-cream"
        >
          Cancel
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative mt-8 flex items-center gap-2 rounded-full border border-cream/10 bg-cream/[0.04] px-3 py-1.5 text-[10px] text-cream/40">
        <WandSparkles className="h-3 w-3" />
        Your text is sent only to DeepSeek.
      </div>
    </div>
  );
}
