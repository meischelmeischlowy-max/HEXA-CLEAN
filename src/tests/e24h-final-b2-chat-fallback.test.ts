import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const route = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/api/public/online-berater/route.ts",
  ),
  "utf8",
);

const chat = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/components/AIChat/AIChat.tsx",
  ),
  "utf8",
);

describe(
  "E24H FINAL B2 resilient chat",
  () => {
    it(
      "returns a successful fallback",
      () => {
        expect(route).toContain(
          "buildLocalFallback",
        );

        expect(route).toContain(
          "degradedMode: true",
        );

        expect(route).toContain(
          '"local-fallback"',
        );

        expect(route).not.toContain(
          "status: 503",
        );
      },
    );

    it(
      "captures essential information",
      () => {
        for (const marker of [
          "customerName",
          "email",
          "phone",
          "location",
          "areaM2",
          "rooms",
          "bathrooms",
          "floor",
          "elevator",
          "condition",
          "frequency",
          "extras",
          "preferredDate",
        ]) {
          expect(route).toContain(
            marker,
          );
        }
      },
    );

    it(
      "asks for missing critical data",
      () => {
        expect(route).toContain(
          "vollständige Einsatzadresse",
        );

        expect(route).toContain(
          "E-Mail-Adresse oder Telefonnummer",
        );
      },
    );

    it(
      "keeps automatic CRM saving",
      () => {
        expect(route).toContain(
          "shouldCreateLead:",
        );

        expect(chat).toContain(
          "shouldCreateLead",
        );

        expect(chat).toContain(
          "/api/public/chat/lead",
        );
      },
    );
  },
);
