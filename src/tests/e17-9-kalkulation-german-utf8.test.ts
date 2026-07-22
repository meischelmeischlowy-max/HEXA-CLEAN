import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const files = [
  "src/app/dashboard/estimates/page.tsx",
  "src/app/dashboard/estimates/[id]/page.tsx",
  "src/app/dashboard/estimates/[id]/offer/page.tsx",
  "src/components/dashboard/EstimateStatusActions.tsx",
  "src/components/dashboard/RecordDrawerWorkspace.tsx",
  "src/components/dashboard/RecordWorkspace.tsx",
  "src/components/dashboard/OrderForm.tsx",
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
  "E17.9 Kalkulation German UTF-8",
  () => {
    it(
      "uses correct German characters",
      () => {
        const required = [
          "Pr\u00fcfung",
          "\u00f6ffnen",
          "f\u00fcr",
          "Zur\u00fcck",
          "Gr\u00f6\u00dfe",
          "schlie\u00dfen",
        ];

        for (const value of required) {
          expect(content).toContain(value);
        }
      },
    );

    it(
      "removes ASCII substitutions",
      () => {
        const forbidden = [
          "Pruefung",
          "pruefen",
          "oeffnen",
          "oeffentlichen",
          "geoeffnet",
          "schliessen",
          "Groesse",
          "Flaeche",
          "fuer",
          "Zurueck",
          "Rueckfrage",
          "muessen",
          "spaetere",
          "Aenderungshistorie",
          "Zaehlung",
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
