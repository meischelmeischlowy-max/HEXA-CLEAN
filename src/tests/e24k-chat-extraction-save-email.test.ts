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
  "E24K chat extraction and delivery",
  () => {
    it(
      "supports windows in the complete online adviser contract",
      () => {
        const types = read(
          "src/lib/online-berater/types.ts",
        );

        const validation = read(
          "src/lib/online-berater/validation.ts",
        );

        const schema = read(
          "src/lib/online-berater/response-schema.ts",
        );

        expect(types).toContain(
          "windows: number | null;",
        );

        expect(validation).toContain(
          "numberOrNull(leadSource.windows)",
        );

        expect(schema).toContain(
          "windows: {",
        );

        expect(schema).toContain(
          '"windows",',
        );
      },
    );

    it(
      "extracts window count deterministically from customer messages",
      () => {
        const source = read(
          "src/app/api/public/online-berater/route.ts",
        );

        expect(source).toContain(
          "const windowsMatch =",
        );

        expect(source).toContain(
          "lead.windows =",
        );

        expect(source).toContain(
          "mergeAiAndDeterministicResult",
        );

        expect(source).toContain(
          "aiResult.lead.windows",
        );
      },
    );

    it(
      "sends owner and customer emails with timeout protection",
      () => {
        const source = read(
          "src/app/api/public/chat/lead/route.ts",
        );

        expect(source).toContain(
          "buildCustomerEmailHtml",
        );

        expect(source).toContain(
          "sendResendEmailWithTimeout",
        );

        expect(source).toContain(
          "customerEmailSent",
        );

        expect(source).toContain(
          "Resend timeout after 10000 ms",
        );
      },
    );

    it(
      "prevents endless saving state in the browser",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "AbortController",
        );

        expect(source).toContain(
          "25_000",
        );

        expect(source).toContain(
          "fetchChatLead",
        );
      },
    );
  },
);