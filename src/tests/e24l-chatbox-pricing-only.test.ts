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
    path.join(
      root,
      relativePath,
    ),
    "utf8",
  );
}

describe(
  "E24L chatbox pricing only",
  () => {
    it(
      "does not create CRM leads from the chat UI",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).not.toContain(
          "/api/public/chat/lead",
        );

        expect(source).not.toContain(
          "Wird gespeichert",
        );

        expect(source).not.toContain(
          "Anfrage senden",
        );

        expect(source).not.toContain(
          "leadContact",
        );

        expect(source).not.toContain(
          "leadName",
        );
      },
    );

    it(
      "keeps central orientational pricing",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "/api/public/pricing",
        );

        expect(source).toContain(
          "priceRange",
        );

        expect(source).toContain(
          "estimatedPrice",
        );
      },
    );

    it(
      "routes customers to Quick Offer",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          'href="/#quick-offer"',
        );

        expect(source).toContain(
          "Schnelle Offerte öffnen",
        );
      },
    );

    it(
      "forbids CRM and contact collection in the system prompt",
      () => {
        const source = read(
          "src/lib/online-berater/system-prompt.ts",
        );

        expect(source).toContain(
          "Du sammelst keine Kundendaten für das CRM.",
        );

        expect(source).toContain(
          "Du fragst nicht nach Name, E-Mail-Adresse oder Telefonnummer.",
        );

        expect(source).toContain(
          "Du erstellst keinen Lead.",
        );

        expect(source).toContain(
          "Du speicherst keine Anfrage.",
        );
      },
    );

    it(
      "keeps real pricing and availability context",
      () => {
        const source = read(
          "src/lib/online-berater/system-prompt.ts",
        );

        expect(source).toContain(
          "context.services",
        );

        expect(source).toContain(
          "context.availability",
        );
      },
    );
  },
);