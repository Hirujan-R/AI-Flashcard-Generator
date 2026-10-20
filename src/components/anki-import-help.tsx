import { Download, FolderOpen, MousePointerClick } from "lucide-react";

const steps = [
  {
    icon: Download,
    title: "Download the .apkg",
    description:
      "Your deck is built in the browser as an Anki Deck Package, with one Basic note per card.",
  },
  {
    icon: FolderOpen,
    title: "Open it in Anki",
    description:
      "In Anki, choose File → Import, then select the downloaded .apkg file and confirm the deck.",
  },
  {
    icon: MousePointerClick,
    title: "Start reviewing",
    description:
      "The deck appears in Anki with Front/Back cards. Re-import later and choose “Update notes” to sync edits.",
  },
];

export function AnkiImportHelp({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-line bg-paper/40 p-4"
          : "rounded-3xl border border-line bg-surface p-6 sm:p-8"
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          From download to review
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className={compact ? "mt-3 space-y-3" : "mt-5 grid gap-5 sm:grid-cols-3"}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-ink">
                  <span className="mr-1.5 font-mono text-[10px] text-muted">
                    0{index + 1}
                  </span>
                  {step.title}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
