import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateQuickOfferPrice,
} from "@/lib/quick-offer-pricing";

describe(
  "E23X real QuickOffer pricing",
  () => {
    it(
      "uses realistic Biel moving-cleaning room bands",
      () => {
        const result =
          calculateQuickOfferPrice({
            service:
              "Umzugsreinigung",
            size: 80,
            rooms: 3.5,
            bathrooms: 1,
            condition: "NORMAL",
            frequency: "EINMALIG",
            selectedExtras: [],
            photoCount: 2,
          });

        expect(result.min).toBeGreaterThanOrEqual(
          750,
        );

        expect(result.max).toBeLessThanOrEqual(
          1000,
        );
      },
    );

    it(
      "raises the range for heavy dirt",
      () => {
        const normal =
          calculateQuickOfferPrice({
            service:
              "Grundreinigung",
            size: 80,
            rooms: 3.5,
            bathrooms: 1,
            condition: "NORMAL",
            frequency: "EINMALIG",
            selectedExtras: [],
            photoCount: 1,
          });

        const heavy =
          calculateQuickOfferPrice({
            service:
              "Grundreinigung",
            size: 80,
            rooms: 3.5,
            bathrooms: 1,
            condition: "STARK",
            frequency: "EINMALIG",
            selectedExtras: [],
            photoCount: 1,
          });

        expect(heavy.min).toBeGreaterThan(
          normal.min,
        );

        expect(heavy.max).toBeGreaterThan(
          normal.max,
        );
      },
    );

    it(
      "keeps the range broader without required photos",
      () => {
        const withoutPhotos =
          calculateQuickOfferPrice({
            service:
              "Grundreinigung",
            size: 80,
            rooms: 3.5,
            bathrooms: 1,
            condition: "NORMAL",
            frequency: "EINMALIG",
            selectedExtras: [],
            photoCount: 0,
          });

        const withPhotos =
          calculateQuickOfferPrice({
            service:
              "Grundreinigung",
            size: 80,
            rooms: 3.5,
            bathrooms: 1,
            condition: "NORMAL",
            frequency: "EINMALIG",
            selectedExtras: [],
            photoCount: 2,
          });

        expect(
          withoutPhotos.max -
            withoutPhotos.min,
        ).toBeGreaterThan(
          withPhotos.max -
            withPhotos.min,
        );

        expect(
          withoutPhotos.requiresPhotoReview,
        ).toBe(true);
      },
    );

    it(
      "includes rooms bathrooms condition frequency and photo review in the form",
      async () => {
        const {
          readFile,
        } = await import(
          "node:fs/promises"
        );

        const source =
          await readFile(
            "src/components/QuickOffer.tsx",
            "utf8",
          );

        expect(source).toContain(
          "rooms",
        );
        expect(source).toContain(
          "bathrooms",
        );
        expect(source).toContain(
          "condition",
        );
        expect(source).toContain(
          "frequency",
        );
        expect(source).toContain(
          "requiresPhotoReview",
        );
      },
    );

    it(
      "uses the same pricing module in the public API",
      async () => {
        const {
          readFile,
        } = await import(
          "node:fs/promises"
        );

        const source =
          await readFile(
            "src/app/api/contact/route.ts",
            "utf8",
          );

        expect(source).toContain(
          "@/lib/quick-offer-pricing",
        );

        expect(source).toContain(
          "calculateServerQuickOfferPrice",
        );
      },
    );
  },
);
