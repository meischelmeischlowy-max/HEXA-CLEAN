import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const source =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/AIChat/AIChat.tsx",
    ),
    "utf8",
  );

describe(
  "E24M compact chat layout",
  () => {
    it(
      "removes service selection tiles",
      () => {
        expect(source).not.toContain(
          "ServiceCards",
        );

        expect(source).not.toContain(
          "selectedService",
        );

        expect(source).not.toContain(
          "handleSelectService",
        );
      },
    );

    it(
      "keeps chat input and Quick Offer CTA",
      () => {
        expect(source).toContain(
          "<ChatInput",
        );

        expect(source).toContain(
          "Schnelle Offerte öffnen",
        );

        expect(source).toContain(
          'href="/#quick-offer"',
        );
      },
    );
  },
);