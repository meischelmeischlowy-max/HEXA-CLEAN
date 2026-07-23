import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/api/contact/route.ts",
  ),
  "utf8",
);

describe(
  "E24H FINAL A2 complete CRM intake",
  () => {
    it(
      "accepts full contact and address data",
      () => {
        for (const marker of [
          "email?: unknown",
          "phone?: unknown",
          "street?: unknown",
          "zipCode?: unknown",
          "city?: unknown",
          "notes?: unknown",
        ]) {
          expect(source).toContain(
            marker,
          );
        }
      },
    );

    it(
      "preserves selected service type",
      () => {
        expect(source).toContain(
          'case "Grundreinigung"',
        );

        expect(source).toContain(
          'case "Unterhaltsreinigung"',
        );

        expect(source).toContain(
          'case "Umzugsreinigung"',
        );

        expect(source).toContain(
          "ServiceType.UMZUGSREINIGUNG",
        );
      },
    );

    it(
      "stores complete request details",
      () => {
        for (const marker of [
          "offer.rooms",
          "offer.bathrooms",
          "offer.condition",
          "offer.frequency",
          "offer.street",
          "offer.zipCode",
          "offer.city",
          "offer.notes",
          "offer.photoCount",
        ]) {
          expect(source).toContain(
            marker,
          );
        }
      },
    );

    it(
      "creates separate calculation items",
      () => {
        expect(source).toMatch(
          /lineType:\s*"BASE_SERVICE"/,
        );

        expect(source).toMatch(
          /lineType:\s*"SELECTED_EXTRA"/,
        );

        expect(source).toContain(
          "...offer.selectedExtras.map",
        );

        expect(source).toContain(
          "selectedByCustomer:",
        );
      },
    );

    it(
      "uses the same details in emails",
      () => {
        expect(source).toContain(
          "buildOfferDetailLines",
        );

        expect(source).toContain(
          "buildOwnerEmailHtml",
        );

        expect(source).toContain(
          "buildCustomerEmailHtml",
        );

        expect(source).toContain(
          "buildCustomerEmailPlainText",
        );
      },
    );

    it(
      "writes the service address to the estimate",
      () => {
        expect(source).toContain(
          "serviceStreet:",
        );

        expect(source).toContain(
          "serviceZipCode:",
        );

        expect(source).toContain(
          "serviceCity:",
        );

        expect(source).toContain(
          "serviceCountry:",
        );
      },
    );
  },
);
