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

describe(
  "E19.1 dashboard primary action",
  () => {
    it(
      "renders exactly one primary operational action definition",
      () => {
        const matches = source.match(
          /data-testid="dashboard-primary-action"/g,
        );

        expect(
          matches?.length ?? 0,
        ).toBe(1);

        expect(source).toContain(
          "function PrimaryAlertCard(",
        );

        expect(source).toContain(
          "const primaryAlert =",
        );
      },
    );

    it(
      "limits the secondary queue to eight items after the primary action",
      () => {
        expect(source).toContain(
          "const remainingAlerts =",
        );

        expect(source).toContain(
          "alerts.slice(1, 9)",
        );

        expect(source).toContain(
          "remainingAlerts.map((alert) => (",
        );

        expect(source).not.toContain(
          "alerts.slice(0, 18)",
        );
      },
    );

    it(
      "uses the focused cockpit width and a single empty state",
      () => {
        expect(source).toContain(
          "max-w-[1600px]",
        );

        expect(source).toContain(
          "Weitere Aufgaben",
        );

        expect(source).not.toContain(
          "{alerts.length === 0 ? <EmptyInbox /> : null}",
        );
      },
    );
  },
);
