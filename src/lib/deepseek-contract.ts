export interface ModelInfo {
  id: string;
  name: string;
  contextWindow?: number;
}

export interface SourceDocumentInput {
  name: string;
  text: string;
}

export interface GenerateDeckInput {
  apiKey: string;
  model: string;
  deepReasoning?: boolean;
  deckName?: string;
  documents: SourceDocumentInput[];
  count?: number | "auto";
  instructions?: string;
}

export interface GenerateDeckResult {
  cards: Array<{ front: string; back: string; source?: string }>;
  model: string;
  trimmed: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export const MAX_SERVER_TOTAL_CHARS = 80_000;
export const MAX_SERVER_CARDS = 50;

export const DEEPSEEK_MODELS: ModelInfo[] = [
  { id: "deepseek-flash", name: "DeepSeek Flash" },
  { id: "deepseek-v4-pro", name: "DeepSeek Pro" },
];
