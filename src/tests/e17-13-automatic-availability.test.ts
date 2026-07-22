import fs from "node:fs";
import path from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

const root = process.cwd();

function read(
  relativePath: string,
) {
  return fs.readFileSync(
    path.join(
      root,
      relativePath,
    ),
    "utf8",
  );
}

describe(
  "E17.13 automatic availability",
  () => {
    it(
      "creates a rolling working calendar",
      () => {
        const source = read(
          "src/lib/automatic-availability.ts",
        );

        expect(source).toContain(
          "HORIZON_DAYS = 30",
        );

        expect(source).toContain(
          "SLOT_MINUTES = 120",
        );

        expect(source).toContain(
          "WORK_START_HOUR = 8",
        );

        expect(source).toContain(
          "WORK_END_HOUR = 18",
        );

        expect(source).toContain(
          "WORKING_DAYS",
        );
      },
    );

    it(
      "subtracts reservations and scheduled orders",
      () => {
        const source = read(
          "src/lib/automatic-availability.ts",
        );

        expect(source).toContain(
          "existingSlots",
        );

        expect(source).toContain(
          "OrderStatus.SCHEDULED",
        );

        expect(source).toContain(
          "OrderStatus.IN_PROGRESS",
        );

        expect(source).toContain(
          "overlaps(",
        );
      },
    );

    it(
      "releases orphaned and cancelled bookings",
      () => {
        const source = read(
          "src/lib/automatic-availability.ts",
        );

        expect(source).toContain(
          "!slot.order",
        );

        expect(source).toContain(
          "OrderStatus.CANCELLED",
        );

        expect(source).toContain(
          "orderId: null",
        );
      },
    );

    it(
      "runs for dashboard and public offer views",
      () => {
        const dashboard = read(
          "src/app/api/dashboard/availability-slots/route.ts",
        );

        const publicPage = read(
          "src/app/public/offers/[token]/page.tsx",
        );

        expect(dashboard).toContain(
          "ensureAutomaticAvailability",
        );

        expect(publicPage).toContain(
          "ensureAutomaticAvailability",
        );
      },
    );
  },
);
