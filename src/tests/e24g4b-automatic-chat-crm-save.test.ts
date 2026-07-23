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
  "E24G4B automatic chat CRM save",
  () => {
    it(
      "stores the AI shouldCreateLead decision",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "setShouldAutoCreateLead(",
        );

        expect(source).toContain(
          "result.shouldCreateLead",
        );
      },
    );

    it(
      "automatically calls the existing CRM endpoint",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "async function saveAutomatically()",
        );

        expect(source).toContain(
          '"/api/public/chat/lead"',
        );

        expect(source).toContain(
          "messages,",
        );

        expect(source).toContain(
          "session,",
        );
      },
    );

    it(
      "requires contact before automatic creation",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "!contact",
        );

        expect(source).toContain(
          "!shouldAutoCreateLead",
        );
      },
    );

    it(
      "prevents duplicate CRM records",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "autoLeadFingerprintRef",
        );

        expect(source).toContain(
          "fingerprint",
        );
      },
    );

    it(
      "preserves the manual submit fallback",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "handleSubmitLead",
        );

        expect(source).toContain(
          'type="submit"',
        );
      },
    );

    it(
      "keeps successful records from being reset",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          'leadStatus === "success"',
        );

        expect(source).toContain(
          'leadStatus === "partial"',
        );
      },
    );
  },
);
