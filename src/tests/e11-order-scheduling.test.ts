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

const pageSource = fs.readFileSync(
  "src/app/dashboard/orders/[id]/page.tsx",
  "utf8",
);

const buttonSource = fs.readFileSync(
  "src/components/dashboard/ScheduleOrderButton.tsx",
  "utf8",
);

describe(
  "E11 order scheduling",
  () => {
    it(
      "schedules confirmed orders",
      () => {
        expect(routeSource).toMatch(
          /OrderStatus\.CONFIRMED/,
        );

        expect(routeSource).toMatch(
          /OrderStatus\.SCHEDULED/,
        );

        expect(routeSource).toContain(
          "scheduledStart",
        );

        expect(routeSource).toContain(
          "scheduledEnd",
        );

        expect(routeSource).toMatch(
          /AuditAction\.STATUS_CHANGE/,
        );
      },
    );

    it(
      "exposes automation-first action",
      () => {
        expect(pageSource).toContain(
          "ScheduleOrderButton",
        );

        expect(pageSource).toContain(
          'orderStatus === "CONFIRMED"',
        );

        expect(pageSource).toContain(
          'orderStatus === "SCHEDULED"',
        );

        expect(buttonSource).toContain(
          "Termin planen",
        );

        expect(buttonSource).toContain(
          "Termin bestätigen",
        );
      },
    );
  },
);
