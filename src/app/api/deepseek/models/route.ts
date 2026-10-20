import { DeepSeekError, listModels } from "@/lib/deepseek-server";

const MAX_BODY_BYTES = 20_000;

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError("Request is too large.", 413);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return jsonError("Request is too large.", 413);
    }
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON request.", 400);
  }

  try {
    const models = await listModels(
      typeof body.apiKey === "string" ? body.apiKey : "",
    );
    return Response.json(
      { models },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return jsonError(error.message, error.status);
    }
    return jsonError(
      "Couldn't load DeepSeek models. Check the API key and try again.",
      502,
    );
  }
}
