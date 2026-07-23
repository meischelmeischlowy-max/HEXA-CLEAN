import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/dashboard/orders/page.tsx",
  ),
  "utf8",
);

describe("E20.2 order schedule consistency", () => {
  it("uses the real Prisma and API schedule field", () => {
    expect(source).toContain(
      "scheduledStart?: string | null;",
    );

    expect(source).toContain(
      "order.scheduledStart",
    );

    expect(source).not.toContain(
      "scheduledAt",
    );
  });

  it("does not mark an order as planned without a start date", () => {
    expect(source).toContain(
      'orderStatus === "SCHEDULED" &&\n    !order.scheduledStart',
    );

    expect(source).toContain(
      'return "Termin planen";',
    );
  });

  it("shows completion only for a scheduled order with a real date", () => {
    expect(source).toContain(
      'orderStatus === "SCHEDULED" &&\n    order.scheduledStart',
    );

    expect(source).toContain(
      'label: "Auftrag abschliessen"',
    );
  });

  it("formats and sorts orders by scheduledStart", () => {
    expect(source).toContain(
      "formatAppointment(order.scheduledStart)",
    );

    expect(source).toContain(
      "order.scheduledStart ??",
    );
  });
});