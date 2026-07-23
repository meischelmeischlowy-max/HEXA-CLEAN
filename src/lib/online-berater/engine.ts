import {
  getOnlineBeraterOpenAIClient,
  getOnlineBeraterModel,
} from "./ai-client";
import {
  getOnlineBeraterBusinessContext,
} from "./business-context";
import {
  onlineBeraterResponseSchema,
} from "./response-schema";
import {
  buildOnlineBeraterSystemPrompt,
} from "./system-prompt";
import type {
  OnlineBeraterMessage,
  OnlineBeraterResult,
} from "./types";
import {
  validateOnlineBeraterResult,
} from "./validation";

export type RunOnlineBeraterInput = {
  messages: OnlineBeraterMessage[];
};

function sanitizeMessages(
  messages: OnlineBeraterMessage[],
) {
  return messages
    .slice(-24)
    .map((message) => ({
      role: message.role,
      content: message.content
        .trim()
        .slice(0, 2_000),
    }))
    .filter(
      (message) =>
        message.content.length > 0,
    );
}

export async function runOnlineBerater({
  messages,
}: RunOnlineBeraterInput): Promise<OnlineBeraterResult> {
  const cleanMessages =
    sanitizeMessages(messages);

  if (cleanMessages.length === 0) {
    throw new Error(
      "At least one conversation message is required",
    );
  }

  const context =
    await getOnlineBeraterBusinessContext();

  const client =
    getOnlineBeraterOpenAIClient();

  const response =
    await client.responses.create({
      model: getOnlineBeraterModel(),
      reasoning: {
        effort: "minimal",
      },
      instructions:
        buildOnlineBeraterSystemPrompt(
          context,
        ),
      input: cleanMessages.map(
        (message) => ({
          role: message.role,
          content: message.content,
        }),
      ),
      max_output_tokens: 1_200,
      text: {
        format: {
          type: "json_schema",
          name: "online_berater_result",
          strict: true,
          schema:
            onlineBeraterResponseSchema,
        },
      },
    });

  const output =
    response.output_text?.trim();

  if (!output) {
    throw new Error(
      `Online Berater returned no output. Status: ${response.status}`,
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error(
      "Online Berater returned invalid JSON",
    );
  }

  return validateOnlineBeraterResult(
    parsed,
  );
}
