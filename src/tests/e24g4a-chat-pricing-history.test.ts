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
  "E24G4A exact chat integration",
  () => {
    it(
      "uses central pricing",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          '"/api/public/pricing"',
        );

        expect(source).toContain(
          "requestCentralPricing",
        );

        expect(source).toContain(
          "pricing?.estimatedPrice ?? 0",
        );

        expect(source).toContain(
          "pricing?.priceRange",
        );
      },
    );

    it(
      "limits AI history to 24 messages",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "nextMessages.slice(-24)",
        );
      },
    );

    it(
      "passes pricing to compatible session",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "createCompatibleSession(\n          result,\n          pricing,",
        );
      },
    );

    it(
      "preserves result.lead contact extraction",
      () => {
        const source = read(
          "src/components/AIChat/AIChat.tsx",
        );

        expect(source).toContain(
          "result.lead.customerName",
        );

        expect(source).toContain(
          "result.lead.email",
        );

        expect(source).toContain(
          "result.lead.phone",
        );
      },
    );
  },
);
