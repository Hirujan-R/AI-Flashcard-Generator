import type {
  GenerateDeckInput,
  GenerateDeckResult,
  ModelInfo,
} from "./deepseek-contract";

export class DeepSeekClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DeepSeekClientError";
    this.status = status;
  }
}

async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new DeepSeekClientError(
      "Couldn't reach the app's AI service. Check your connection and try again.",
      0,
    );
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // Fall through to a generic error below.
  }

  if (!response.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : "The DeepSeek request failed. Please try again.";
    throw new DeepSeekClientError(message, response.status);
  }

  return data as T;
}

export async function fetchDeepSeekModels(
  apiKey: string,
  signal?: AbortSignal,
): Promise<ModelInfo[]> {
  const data = await postJson<{ models: ModelInfo[] }>(
    "/api/deepseek/models",
    { apiKey },
    signal,
  );
  return Array.isArray(data.models) ? data.models : [];
}

export async function requestDeck(
  input: GenerateDeckInput,
  signal?: AbortSignal,
): Promise<GenerateDeckResult> {
  return postJson<GenerateDeckResult>("/api/deepseek/generate", input, signal);
}
