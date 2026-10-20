"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlugZap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { fetchDeepSeekModels } from "@/lib/deepseek-client";
import { DEEPSEEK_MODELS, type ModelInfo } from "@/lib/deepseek-contract";
import {
  clearStoredSettings,
  saveSettings,
  useDeepSeekSettings,
  type DeepSeekSettings,
} from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Modal } from "./modal";
import { useToast } from "./toast";
import { Button, inputClass, labelClass } from "./ui";

function modelLabel(model: ModelInfo): string {
  return model.name === model.id ? model.id : `${model.name} (${model.id})`;
}

function SettingsForm({
  initialSettings,
  onClose,
}: {
  initialSettings: DeepSeekSettings;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(initialSettings.apiKey);
  const [model, setModel] = useState(initialSettings.model);
  const [deepReasoning, setDeepReasoning] = useState(
    initialSettings.deepReasoning,
  );
  const [rememberKey, setRememberKey] = useState(initialSettings.rememberKey);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>(DEEPSEEK_MODELS);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function testConnection() {
    setError(null);
    if (!apiKey.trim()) {
      setError("Enter your DeepSeek API key first.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setTesting(true);

    try {
      const result = await fetchDeepSeekModels(apiKey.trim(), controller.signal);
      setModels(result);
      setConnected(true);
      if (result.length > 0 && !result.some((item) => item.id === model)) {
        setModel(result[0].id);
      }
      toast(`Connected to DeepSeek — ${result.length} model${result.length === 1 ? "" : "s"} available.`, "success");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setConnected(false);
      setError(
        caught instanceof Error ? caught.message : "Couldn't reach DeepSeek.",
      );
    } finally {
      if (!controller.signal.aborted) setTesting(false);
    }
  }

  function save() {
    setError(null);
    if (!apiKey.trim()) {
      setError("Add your DeepSeek API key to connect.");
      return;
    }
    if (!model.trim()) {
      setError("Choose a DeepSeek model.");
      return;
    }

    saveSettings({
      apiKey: apiKey.trim(),
      model: model.trim(),
      deepReasoning,
      rememberKey,
    });
    toast("DeepSeek settings saved.", "success");
    onClose();
  }

  const availableModels = models.some((item) => item.id === model)
    ? models
    : [
        ...models,
        ...(DEEPSEEK_MODELS.some((item) => item.id === model)
          ? []
          : [{ id: model, name: model }]),
      ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <span className={labelClass}>DeepSeek API key</span>
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
          >
            Get a key
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="relative mt-2">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="deepseek-api-key"
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              setConnected(false);
            }}
            placeholder="sk-…"
            autoComplete="off"
            spellCheck={false}
            className={cn(inputClass, "pl-9 pr-11 font-mono text-[13px]")}
          />
          <button
            type="button"
            onClick={() => setShowKey((current) => !current)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
            aria-label={showKey ? "Hide API key" : "Show API key"}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Stored in your browser. It is sent through this app&apos;s server only
          to DeepSeek and is never saved server-side.
        </p>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="deepseek-model" className={cn(labelClass, "mb-2")}>
            Model
          </label>
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:decoration-ink disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : connected ? (
              <Check className="h-3 w-3 text-forest" />
            ) : (
              <PlugZap className="h-3 w-3" />
            )}
            {testing ? "Testing…" : connected ? "Refresh models" : "Test connection"}
          </button>
        </div>
        <div className="relative">
          <select
            id="deepseek-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className={cn(inputClass, "appearance-none pr-9")}
          >
            {availableModels.map((item) => (
              <option key={item.id} value={item.id}>
                {modelLabel(item)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          <strong className="font-semibold text-ink">Flash</strong> is fast and
          cheap for most notes. <strong className="font-semibold text-ink">Pro</strong>{" "}
          is better for dense or technical material.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/40 px-4 py-3">
        <span className="relative mt-0.5 flex h-5 w-9 shrink-0 items-center">
          <input
            type="checkbox"
            checked={deepReasoning}
            onChange={(event) => setDeepReasoning(event.target.checked)}
            className="peer sr-only"
          />
          <span className="h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-forest" />
          <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </span>
        <span>
          <span className="block text-[12px] font-semibold text-ink">
            Use deep reasoning
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
            Lets DeepSeek think longer before writing. Slower and uses more
            tokens, but can improve complex technical cards.
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/40 px-4 py-3">
        <span className="relative mt-0.5 flex h-5 w-9 shrink-0 items-center">
          <input
            type="checkbox"
            checked={rememberKey}
            onChange={(event) => setRememberKey(event.target.checked)}
            className="peer sr-only"
          />
          <span className="h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-forest" />
          <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </span>
        <span>
          <span className="block text-[12px] font-semibold text-ink">
            Remember API key on this device
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
            Stored in localStorage. Turn this off to keep the key in this browser
            tab only.
          </span>
        </span>
      </label>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-relaxed text-red-800"
        >
          {error}
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl bg-forest-soft/70 px-4 py-3 text-[11px] leading-relaxed text-forest">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Your documents are sent only to DeepSeek when you generate. Nothing is
          persisted on the server, and no deck data is stored in this app.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {initialSettings.apiKey ? (
          <button
            type="button"
            onClick={() => {
              clearStoredSettings();
              toast("Saved DeepSeek key removed from this browser.", "success");
              onClose();
            }}
            className="text-[11px] font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
          >
            Forget saved key
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} className="sm:min-w-40">
            <Sparkles className="h-4 w-4" />
            Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DeepSeekSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const settings = useDeepSeekSettings();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="DeepSeek settings"
      description="Bring your own API key. It stays in your browser and is only used to generate cards."
      size="md"
    >
      {open && <SettingsForm initialSettings={settings} onClose={onClose} />}
    </Modal>
  );
}
