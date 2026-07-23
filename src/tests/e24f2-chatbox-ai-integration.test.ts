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
  "E24F2 chatbox AI integration",
  () => {
    it(
      "uses the new Online Berater endpoint",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          '"/api/public/online-berater"',
        );

        expect(source).toContain(
          "toApiMessages(",
        );

        expect(source).toContain(
          "nextMessages.slice(-24)",
        );
      },
    );

    it(
      "does not use the old rigid AI engine",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).not.toContain(
          "processMessage",
        );

        expect(source).not.toContain(
          "selectService",
        );

        expect(source).not.toContain(
          "createInitialSession",
        );

        expect(source).not.toContain(
          "@/lib/ai/engine/AIEngine",
        );
      },
    );

    it(
      "sends a safe recent conversation window",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "const nextMessages = [",
        );

        expect(source).toContain(
          "...messages",
        );

        expect(source).toContain(
          "requestOnlineBerater",
        );
      },
    );

    it(
      "maps structured AI data to the existing CRM payload",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "createCompatibleSession",
        );

        expect(source).toContain(
          "result.lead.areaM2",
        );

        expect(source).toContain(
          "result.lead.elevator",
        );

        expect(source).toContain(
          "completed: result.leadReady",
        );

        expect(source).toContain(
          '"/api/public/chat/lead"',
        );
      },
    );

    it(
      "keeps the current chatbox components",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "<ChatHeader />",
        );

        expect(source).toContain(
          "<ChatMessages",
        );

        expect(source).toContain(
          "<ServiceCards",
        );

        expect(source).toContain(
          "<ProgressPanelCompact",
        );

        expect(source).toContain(
          "<ChatInput",
        );
      },
    );

    it(
      "shows request errors without ending the conversation",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "setChatError",
        );

        expect(source).toContain(
          "Entschuldigung, der Online-Berater konnte gerade keine Antwort erstellen.",
        );

        expect(source).toContain(
          "setIsThinking(false)",
        );
      },
    );
  },
);
