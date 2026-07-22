import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const files = [
  "src/app/api/contact/route.ts",
  "src/app/api/dashboard/availability-slots/[id]/route.ts",
  "src/app/api/dashboard/estimates/route.ts",
  "src/app/api/public/offers/[token]/accept-with-slot/route.ts",
  "src/app/dashboard/page.tsx",
  "src/components/QuickOffer.tsx",
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
  "E17.11C production German UTF-8",
  () => {
    it(
      "uses proper German characters",
      () => {
        const required = [
          "Pr\u00fcfung",
          "pr\u00fcfen",
          "\u00f6ffnen",
          "f\u00fcr",
          "gel\u00f6scht",
          "Plausibilit\u00e4tsspanne",
          "Best\u00e4tigung",
          "\u00fcberf\u00e4llige",
          "R\u00fcckruf",
        ];

        for (const value of required) {
          expect(content).toContain(value);
        }
      },
    );

    it(
      "does not retain ASCII substitutions",
      () => {
        const forbidden = [
          "Pruefung",
          "pruefen",
          "oeffnen",
          " fuer ",
          "Fuer ",
          "geloescht",
          "Plausibilitaetsspanne",
          "Bestaetigung",
          "ueberfaellige",
          "Rueckruf",
        ];

        for (const value of forbidden) {
          expect(content).not.toContain(value);
        }
      },
    );

    it(
      "does not contain mojibake markers",
      () => {
        const forbidden = [
          "\u0102",
          "\u0139",
          "\u013d",
          "\u00c2\u02db",
        ];

        for (const value of forbidden) {
          expect(content).not.toContain(value);
        }
      },
    );
  },
);
