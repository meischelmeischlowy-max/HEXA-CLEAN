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
    "src/components/QuickOffer.tsx",
  ),
  "utf8",
);

describe(
  "E24H FINAL A1 QuickOffer contact and address",
  () => {
    it(
      "uses separate contact fields",
      () => {
        expect(source).toContain(
          'placeholder="Vor- und Nachname *"',
        );

        expect(source).toContain(
          'placeholder="E-Mail *"',
        );

        expect(source).toContain(
          'placeholder="Telefon"',
        );

        expect(source).not.toContain(
          'placeholder="Telefon oder E-Mail"',
        );
      },
    );

    it(
      "requires the complete service address",
      () => {
        expect(source).toContain(
          'placeholder="Strasse und Hausnummer *"',
        );

        expect(source).toContain(
          'placeholder="PLZ *"',
        );

        expect(source).toContain(
          'placeholder="Ort *"',
        );

        expect(source).toContain(
          "die vollständige Einsatzadresse",
        );
      },
    );

    it(
      "sends contact address and notes",
      () => {
        for (const marker of [
          "email,",
          "phone,",
          "street,",
          "zipCode,",
          "city,",
          'country: "CH"',
          "notes,",
        ]) {
          expect(source).toContain(
            marker,
          );
        }
      },
    );

    it(
      "includes all details in the WhatsApp summary",
      () => {
        for (const marker of [
          "E-Mail: ${email",
          "Telefon: ${phone",
          "Adresse: ${street",
          "Bemerkungen: ${notes",
        ]) {
          expect(source).toContain(
            marker,
          );
        }
      },
    );
  },
);
