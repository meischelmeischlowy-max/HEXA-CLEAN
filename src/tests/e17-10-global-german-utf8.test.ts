import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const files = [
  "src/app/dashboard/availability/page.tsx",
  "src/app/dashboard/customers/[id]/page.tsx",
  "src/app/dashboard/customers/page.tsx",
  "src/app/dashboard/layout.tsx",
  "src/app/dashboard/notifications/page.tsx",
  "src/app/dashboard/orders/[id]/edit/page.tsx",
  "src/app/dashboard/orders/new/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/lib/dashboard/next-action.ts",
  "src/lib/order-confirmation-document.ts",
  "src/lib/order-confirmation-email-service.ts",
];

const content = files
  .map((file) =>
    fs.readFileSync(
      path.join(root, file),
      "utf8",
    ),
  )
  .join("\n");

describe(
  "E17.10 global German UTF-8",
  () => {
    it(
      "contains correct German text",
      () => {
        const required = [
          "Pr\u00fcfung",
          "\u00f6ffnen",
          "f\u00fcr",
          "Zur\u00fcck",
          "\u00dcberf\u00e4llig",
          "Auftragsbest\u00e4tigung",
          "Auftr\u00e4ge",
          "R\u00fcckfrage",
          "vollst\u00e4ndig",
        ];

        for (const value of required) {
          expect(content).toContain(value);
        }
      },
    );

    it(
      "removes known ASCII substitutions",
      () => {
        const forbidden = [
          "Pruefung",
          "pruefen",
          "Oeffnen",
          "oeffnen",
          "Zurueck",
          "Rueckfrage",
          "Rueckfragen",
          "Ueberfaellig",
          "Bestaetigung",
          "Auftragsbestaetigung",
          "Auftraege",
          "vollstaendig",
          "hinzufuegen",
          "loeschen",
          "geloescht",
          "Gruesse",
          "Naechster",
          "abschliessen",
        ];

        for (const value of forbidden) {
          expect(content).not.toContain(value);
        }
      },
    );

    it(
      "removes mojibake markers",
      () => {
        const forbidden = [
          "\u0102",
          "\u00c3",
          "\u00c2",
          "\u00e2\u20ac",
          "\u0139",
          "\u013d",
        ];

        for (const value of forbidden) {
          expect(content).not.toContain(value);
        }
      },
    );
  },
);
