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
  "E24H1 owner review modal",
  () => {
    it(
      "integrates the review modal into the estimate workspace",
      () => {
        const page = read(
          "src/app/dashboard/estimates/[id]/page.tsx",
        );

        expect(page).toContain(
          "EstimateReviewModal",
        );

        expect(page).toContain(
          "<EstimateReviewModal",
        );

        expect(page).toContain(
          "estimateId={estimate.id}",
        );
      },
    );

    it(
      "supports editing customer and service data",
      () => {
        const modal = read(
          "src/components/dashboard/EstimateReviewModal.tsx",
        );

        expect(modal).toContain(
          "Kunde und Adresse",
        );

        expect(modal).toContain(
          "Leistung und Einsatzort",
        );

        expect(modal).toContain(
          "notesInternal",
        );
      },
    );

    it(
      "supports adding removing and pricing positions",
      () => {
        const modal = read(
          "src/components/dashboard/EstimateReviewModal.tsx",
        );

        expect(modal).toContain(
          "Position hinzufügen",
        );

        expect(modal).toContain(
          "removeItem",
        );

        expect(modal).toContain(
          "unitPrice",
        );

        expect(modal).toContain(
          "Endpreis",
        );
      },
    );

    it(
      "writes estimate items and authoritative totals",
      () => {
        const api = read(
          "src/app/api/dashboard/estimates/[id]/review/route.ts",
        );

        expect(api).toContain(
          "estimateItem.deleteMany",
        );

        expect(api).toContain(
          "subtotal.toFixed(2)",
        );

        expect(api).toContain(
          "total.toFixed(2)",
        );

        expect(api).toContain(
          "editedManually",
        );
      },
    );

    it(
      "supports requesting customer photos",
      () => {
        const modal = read(
          "src/components/dashboard/EstimateReviewModal.tsx",
        );

        const api = read(
          "src/app/api/dashboard/estimates/[id]/review/route.ts",
        );

        expect(modal).toContain(
          "Speichern und Fotos anfordern",
        );

        expect(api).toContain(
          "REQUEST_PHOTOS",
        );

        expect(api).toMatch(
          /EstimateStatus\s*\.\s*NEEDS_PHOTOS/,
        );

        expect(api).toContain(
          "NotificationChannel.EMAIL",
        );
      },
    );
  },
);
