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
  "E24B Online Berater foundation",
  () => {
    it(
      "reads only active services and available future slots",
      () => {
        const source = read(
          "src/lib/online-berater/business-context.ts",
        );

        expect(source).toContain(
          "isActive: true",
        );

        expect(source).toContain(
          "AvailabilitySlotStatus.AVAILABLE",
        );

        expect(source).toContain(
          "endAt: true",
        );

        expect(source).toContain(
          "notes: true",
        );

        expect(source).toContain(
          "startAt:",
        );

        expect(source).not.toContain(
          "prisma.customer",
        );

        expect(source).not.toContain(
          "conversationMessage",
        );
      },
    );

    it(
      "does not expose customer data in AI context",
      () => {
        const source = read(
          "src/lib/online-berater/business-context.ts",
        );

        expect(source).not.toContain(
          "email: true",
        );

        expect(source).not.toContain(
          "phone: true",
        );

        expect(source).not.toContain(
          "customerId",
        );
      },
    );

    it(
      "defines natural non-linear consultation behavior",
      () => {
        const source = read(
          "src/lib/online-berater/system-prompt.ts",
        );

        expect(source).toContain(
          "Du bist kein Formular",
        );

        expect(source).toContain(
          '"Nein" bedeutet nur eine Antwort',
        );

        expect(source).toContain(
          "Termin flexibel",
        );

        expect(source).toContain(
          "Das Gespräch darf deshalb nicht beendet werden",
        );

        expect(source).toContain(
          "immer nur eine sinnvolle nächste Frage",
        );
      },
    );

    it(
      "requires structured lead output",
      () => {
        const source = read(
          "src/lib/online-berater/response-schema.ts",
        );

        expect(source).toContain(
          "missingFields",
        );

        expect(source).toContain(
          "leadReady",
        );

        expect(source).toContain(
          "shouldCreateLead",
        );

        expect(source).toContain(
          "shouldAskForPhotos",
        );

        expect(source).toContain(
          "additionalProperties: false",
        );
      },
    );

    it(
      "uses dashboard services instead of a separate hardcoded public catalog",
      () => {
        const source = read(
          "src/lib/online-berater/business-context.ts",
        );

        expect(source).toContain(
          "prisma.serviceCatalogItem.findMany",
        );

        expect(source).toContain(
          "basePrice",
        );

        expect(source).toContain(
          "minPrice",
        );

        expect(source).toContain(
          "maxPrice",
        );
      },
    );
  },
);
