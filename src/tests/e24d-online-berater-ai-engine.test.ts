import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8",
  );
}

describe(
  "E24D Online Berater AI engine",
  () => {
    it(
      "uses the real OpenAI Responses API",
      () => {
        const source = read(
          "src/lib/online-berater/engine.ts",
        );

        expect(source).toContain(
          "client.responses.create",
        );

        expect(source).toContain(
          "reasoning:",
        );

        expect(source).toContain(
          'effort: "minimal"',
        );

        expect(source).toContain(
          "onlineBeraterResponseSchema",
        );
      },
    );

    it(
      "uses current dashboard business context",
      () => {
        const source = read(
          "src/lib/online-berater/engine.ts",
        );

        expect(source).toContain(
          "getOnlineBeraterBusinessContext",
        );

        expect(source).toContain(
          "buildOnlineBeraterSystemPrompt",
        );
      },
    );

    it(
      "sends conversation history instead of a rigid step",
      () => {
        const source = read(
          "src/lib/online-berater/engine.ts",
        );

        expect(source).toMatch(
          /messages\s*\.slice\(-24\)/,
        );

        expect(source).not.toContain(
          "currentStep",
        );

        expect(source).not.toContain(
          "switch (step)",
        );

        expect(source).not.toContain(
          "getNextStep",
        );
      },
    );

    it(
      "keeps the API key server-side",
      () => {
        const client = read(
          "src/lib/online-berater/ai-client.ts",
        );

        const route = read(
          "src/app/api/public/online-berater/route.ts",
        );

        expect(client).toContain(
          "process.env.OPENAI_API_KEY",
        );

        expect(route).not.toContain(
          "OPENAI_API_KEY",
        );

        expect(route).not.toContain(
          "apiKey",
        );
      },
    );

    it(
      "validates public requests and limits history",
      () => {
        const source = read(
          "src/app/api/public/online-berater/route.ts",
        );

        expect(source).toContain(
          "MAX_REQUEST_BYTES",
        );

        expect(source).toContain(
          "MAX_MESSAGES = 24",
        );

        expect(source).toContain(
          "MAX_MESSAGE_LENGTH = 2_000",
        );

        expect(source).toContain(
          '"Cache-Control": "no-store"',
        );
      },
    );

    it(
      "returns natural reply and structured lead data",
      () => {
        const validation = read(
          "src/lib/online-berater/validation.ts",
        );

        expect(validation).toContain(
          "reply",
        );

        expect(validation).toContain(
          "missingFields",
        );

        expect(validation).toContain(
          "leadReady",
        );

        expect(validation).toContain(
          "shouldCreateLead",
        );

        expect(validation).toContain(
          "shouldAskForPhotos",
        );
      },
    );
  },
);
