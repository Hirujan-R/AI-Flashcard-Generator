import {
  DeepSeekError,
  generateDeck,
} from "@/lib/deepseek-server";
import type { GenerateDeckInput, SourceDocumentInput } from "@/lib/deepseek-contract";

export const maxDuration = 180;

const MAX_BODY_BYTES = 1_500_000;

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError(
      "The source material is too large. Try fewer or smaller documents.",
      413,
    );
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return jsonError(
        "The source material is too large. Try fewer or smaller documents.",
        413,
      );
    }
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON request.", 400);
  }

  const documents: SourceDocumentInput[] = Array.isArray(body.documents)
    ? body.documents
        .filter(
          (document): document is Record<string, unknown> =>
            Boolean(document) && typeof document === "object",
        )
        .map((document) => ({
          name: typeof document.name === "string" ? document.name : "Document",
          text: typeof document.text === "string" ? document.text : "",
        }))
    : [];

  if (documents.length === 0) {
    return jsonError("Add at least one readable document.", 400);
  }

  const count =
    body.count === "auto" || typeof body.count === "number"
      ? body.count
      : "auto";

  const input: GenerateDeckInput = {
    apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
    model: typeof body.model === "string" ? body.model : "",
    deepReasoning: body.deepReasoning === true,
    deckName: typeof body.deckName === "string" ? body.deckName : undefined,
    documents,
    count,
    instructions:
      typeof body.instructions === "string" ? body.instructions : "",
  };

  try {
    const result = await generateDeck(input);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return jsonError(error.message, error.status);
    }
    return jsonError(
      "Something went wrong while generating cards. Try again.",
      502,
    );
  }
}
