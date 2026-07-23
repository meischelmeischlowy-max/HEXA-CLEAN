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
  "E24G3 QuickOffer central pricing integration",
  () => {
    it(
      "loads prices from the public central pricing endpoint",
      () => {
        const source = read(
          "src/components/QuickOffer.tsx",
        );

        expect(source).toContain(
          '"/api/public/pricing"',
        );

        expect(source).toContain(
          "setCalculation",
        );

        expect(source).toContain(
          "payload.pricing",
        );
      },
    );

    it(
      "does not calculate QuickOffer price in the browser",
      () => {
        const source = read(
          "src/components/QuickOffer.tsx",
        );

        expect(source).not.toContain(
          "calculateQuickOfferPrice",
        );

        expect(source).not.toContain(
          "@/lib/quick-offer-pricing",
        );

        expect(source).not.toContain(
          "size * 2.2",
        );

        expect(source).not.toContain(
          "selectedExtras.length * 35",
        );
      },
    );

    it(
      "recalculates the submitted offer on the server",
      () => {
        const source = read(
          "src/app/api/contact/route.ts",
        );

        expect(source).toContain(
          "@/lib/pricing/server",
        );

        expect(source).toContain(
          "await calculateServerPrice",
        );

        expect(source).toContain(
          "areaM2: size",
        );

        expect(source).toContain(
          "extras:",
        );
      },
    );

    it(
      "does not trust the client price as the authoritative result",
      () => {
        const source = read(
          "src/app/api/contact/route.ts",
        );

        expect(source).not.toContain(
          "@/lib/quick-offer-pricing",
        );

        expect(source).toContain(
          "calculatedPrice.min",
        );

        expect(source).toContain(
          "calculatedPrice.max",
        );

        expect(source).toContain(
          "calculatedPrice.confidence",
        );
      },
    );
  },
);
