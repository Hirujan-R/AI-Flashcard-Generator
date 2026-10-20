export type DocumentKind = "docx" | "pptx" | "pdf" | "txt" | "md";

export interface ParsedDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  size: number;
  text: string;
  characters: number;
  truncated: boolean;
  error?: string;
}

export interface DocumentEntry extends ParsedDocument {
  parsing?: boolean;
}

export interface GeneratedCard {
  front: string;
  back: string;
  source?: string;
}

export interface DraftCard extends GeneratedCard {
  id: string;
  selected: boolean;
}
