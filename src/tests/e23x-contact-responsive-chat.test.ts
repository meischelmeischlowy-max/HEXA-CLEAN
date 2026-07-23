import {
  readFileSync,
} from "node:fs";
import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const root = process.cwd();

function source(path: string) {
  return readFileSync(
    join(root, path),
    "utf8",
  );
}

describe(
  "E23X contact and responsive chat",
  () => {
    it(
      "uses the business email instead of the private Gmail address",
      () => {
        const footer = source(
          "src/components/Footer.tsx",
        );

        const compact = source(
          "src/components/AIChat/ProgressPanelCompact.tsx",
        );

        expect(footer).toContain(
          "info@hexaclean.ch",
        );

        expect(compact).toContain(
          "info@hexaclean.ch",
        );

        expect(
          footer +
            compact,
        ).not.toContain(
          "meischel.meischlowy@gmail.com",
        );
      },
    );

    it(
      "does not display the private team photograph in the chat",
      () => {
        const chat = source(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(chat).not.toContain(
          "michal-monika.webp",
        );

        expect(chat).not.toContain(
          'from "next/image"',
        );
      },
    );

    it(
      "uses a mobile safe full-height dialog and real conversation component",
      () => {
        const launcher = source(
          "src/components/AIChat/AIChatLauncher.tsx",
        );

        expect(launcher).toContain(
          "h-[100dvh]",
        );

        expect(launcher).toContain(
          "<AIChat />",
        );

        expect(launcher).toContain(
          'role="dialog"',
        );
      },
    );

    it(
      "keeps the real CRM chat lead endpoint",
      () => {
        const chat = source(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(chat).toContain(
          'fetch(',
        );

        expect(chat).toContain(
          '"/api/public/chat/lead"',
        );

        expect(chat).toContain(
          "processMessage",
        );
      },
    );

    it(
      "removes non-functional microphone and attachment controls",
      () => {
        const input = source(
          "src/components/AIChat/ChatInput.tsx",
        );

        expect(input).not.toContain(
          "Mic",
        );

        expect(input).not.toContain(
          "Paperclip",
        );

        expect(input).toContain(
          "Nachricht senden",
        );
      },
    );
  },
);
