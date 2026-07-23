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

function countFragment(
  value: string,
  fragment: string,
) {
  return value.split(fragment).length - 1;
}

describe("E20.1 compact operational orders list", () => {
  it("uses one compact CRM list instead of large dashboard panels", () => {
    expect(source).toContain(
      'data-testid="orders-operational-list"',
    );

    expect(source).not.toContain(
      "DashboardPanel",
    );

    expect(source).not.toContain(
      "PageHeader",
    );

    expect(source).toContain(
      "max-w-[1600px]",
    );
  });

  it("uses fixed columns for every operational order", () => {
    expect(source).toContain(
      "xl:grid-cols-[56px_minmax(210px,1.1fr)_minmax(130px,0.65fr)_170px_130px_auto]",
    );

    expect(source).toContain(
      "{getCustomerName(order)}",
    );

    expect(source).toContain(
      "{getOrderService(order)}",
    );

    expect(source).toContain(
      "{formatAppointment(order.scheduledStart)}",
    );

    expect(source).toContain(
      "getOrderAmount(order)",
    );
  });

  it("keeps exactly one workflow action in every row", () => {
    const start = source.indexOf(
      "function OrderQueueCard",
    );

    const end = source.indexOf(
      "export default function DashboardOrdersPage",
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const card = source.slice(start, end);

    expect(
      countFragment(card, "<PremiumButton"),
    ).toBe(1);

    expect(card).toContain(
      "href={action.href}",
    );

    expect(card).toContain(
      "{action.label}",
    );
  });

  it("keeps the highest-priority order at the top", () => {
    expect(source).toContain(
      "const nextOrder = activeOrders[0] ?? null;",
    );

    expect(source).toContain(
      "const remainingOrders = activeOrders.slice(1);",
    );

    expect(source).toContain(
      "highlighted",
    );
  });
});