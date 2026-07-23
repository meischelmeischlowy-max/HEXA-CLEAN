import fs from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

const routeSource = fs.readFileSync(
  "src/app/api/dashboard/orders/[id]/schedule/route.ts",
  "utf8",
);

const existingTestSource = fs.readFileSync(
  "src/tests/e17-5-schedule-confirmation-email.test.ts",
  "utf8",
);

const combinedSource = [
  routeSource,
  existingTestSource,
].join("\n");

const forbiddenTokens = [
  "Terminbest?tigung",
  "Ausf?hrungstermin",
  "Best?tigung",
  "ung?ltige",
  "f?r",
];

describe(
  "E18.3 schedule German UTF-8",
  () => {
    it(
      "contains no known damaged German schedule strings",
      () => {
        for (
          const token of forbiddenTokens
        ) {
          expect(
            combinedSource,
          ).not.toContain(token);
        }
      },
    );

    it(
      "keeps the correct German confirmation wording",
      () => {
        expect(routeSource).toContain(
          "Terminbestätigung",
        );

        expect(routeSource).toContain(
          "Ausführungstermin",
        );

        expect(routeSource).toContain(
          "für Ihren Auftrag",
        );

        expect(routeSource).toContain(
          "ungültige Kunden-E-Mail",
        );
      },
    );

    it(
      "updates the existing regression expectations",
      () => {
        expect(
          existingTestSource,
        ).toContain(
          "Terminbestätigung",
        );

        expect(
          existingTestSource,
        ).toContain(
          "die Bestätigung konnte nicht versendet werden",
        );
      },
    );
  },
);