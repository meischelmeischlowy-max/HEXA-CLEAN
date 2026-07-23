import fs from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

const source = fs.readFileSync(
  "src/app/dashboard/page.tsx",
  "utf8",
);

const damagedGermanTokens = [
  "Pr?fung",
  "pr?fen",
  "R?ckfrage",
  "N?chster",
  "n?chster",
  "m?ssen",
  "Auftr?ge",
  "?berf?llig",
  "F?llig",
  "f?r",
  "geloest",
  "noetig",
];

describe(
  "E19.1 dashboard primary focus",
  () => {
    it(
      "shows exactly one primary dashboard action",
      () => {
        const matches = source.match(
          /data-testid="dashboard-primary-action"/g,
        );

        expect(
          matches?.length ?? 0,
        ).toBe(1);

        expect(source).toContain(
          "PrimaryAlertCard",
        );

        expect(source).toContain(
          "const primaryAlert =",
        );
      },
    );

    it(
      "limits the secondary work queue",
      () => {
        expect(source).toContain(
          "const remainingAlerts =",
        );

        expect(source).toContain(
          "alerts.slice(1, 9)",
        );

        expect(source).not.toContain(
          "alerts.slice(0, 18)",
        );
      },
    );

    it(
      "uses the focused responsive cockpit layout",
      () => {
        expect(source).toContain(
          "max-w-[1600px]",
        );

        expect(source).toContain(
          "Was ist jetzt zu tun?",
        );

        expect(source).toContain(
          "Weitere Aufgaben",
        );

        expect(source).toContain(
          "sm:grid-cols-2 xl:grid-cols-4",
        );
      },
    );

    it(
      "contains no known damaged German text",
      () => {
        for (
          const token of damagedGermanTokens
        ) {
          expect(source).not.toContain(
            token,
          );
        }

        expect(source).toContain(
          "Prüfung",
        );

        expect(source).toContain(
          "Überfällige",
        );
      },
    );
  },
);