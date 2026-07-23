import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOnlineBeraterOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured",
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
      timeout: 45_000,
      maxRetries: 1,
    });
  }

  return client;
}

export function getOnlineBeraterModel() {
  const model =
    process.env.OPENAI_MODEL?.trim();

  if (!model) {
    throw new Error(
      "OPENAI_MODEL is not configured",
    );
  }

  return model;
}
