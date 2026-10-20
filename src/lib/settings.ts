"use client";

import { useSyncExternalStore } from "react";

export interface DeepSeekSettings {
  apiKey: string;
  model: string;
  deepReasoning: boolean;
  rememberKey: boolean;
}

const STORAGE_KEY = "recall:deepseek:v1";

export const DEFAULT_SETTINGS: DeepSeekSettings = {
  apiKey: "",
  model: "deepseek-flash",
  deepReasoning: false,
  rememberKey: true,
};

let cached: DeepSeekSettings | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): DeepSeekSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const record = raw as Record<string, unknown>;
  return {
    apiKey: typeof record.apiKey === "string" ? record.apiKey : "",
    model:
      typeof record.model === "string" && record.model.trim()
        ? record.model
        : DEFAULT_SETTINGS.model,
    deepReasoning: record.deepReasoning === true,
    rememberKey: record.rememberKey !== false,
  };
}

function readSettings(): DeepSeekSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const session = window.sessionStorage.getItem(STORAGE_KEY);
    if (session) return sanitize(JSON.parse(session));
    const local = window.localStorage.getItem(STORAGE_KEY);
    if (local) return sanitize(JSON.parse(local));
  } catch {
    // Corrupt or unavailable storage: fall back to defaults.
  }
  return DEFAULT_SETTINGS;
}

export function getSettingsSnapshot(): DeepSeekSettings {
  if (!cached) cached = readSettings();
  return cached;
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToSettings(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = readSettings();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveSettings(next: DeepSeekSettings): void {
  if (typeof window === "undefined") return;
  cached = next;
  const serialized = JSON.stringify(next);
  try {
    if (next.rememberKey) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, serialized);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be full or disabled; keep the in-memory value for this tab.
  }
  emit();
}

export function useDeepSeekSettings(): DeepSeekSettings {
  return useSyncExternalStore(
    subscribeToSettings,
    getSettingsSnapshot,
    () => DEFAULT_SETTINGS,
  );
}

export function hasApiKey(settings: DeepSeekSettings): boolean {
  return Boolean(settings.apiKey.trim() && settings.model.trim());
}

export function clearStoredSettings(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  cached = DEFAULT_SETTINGS;
  emit();
}
