import fs from "node:fs";
import path from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/dashboard/customers/page.tsx",
  ),
  "utf8",
);

function countFragment(
  value: string,
  fragment: string,
) {
  return value.split(fragment).length - 1;
}

describe("E20.7 compact customers CRM list", () => {
  it("uses compact header and summary strip", () => {
    expect(source).toContain(
      'data-testid="customers-summary-strip"',
    );

    expect(source).toContain(
      'data-testid="customers-operational-list"',
    );

    expect(source).toContain(
      "max-w-[1600px]",
    );

    expect(source).not.toContain(
      "PageHeader",
    );

    expect(source).not.toContain(
      "ActionStatusBadge",
    );

    expect(source).not.toContain(
      "EmptyState",
    );
  });

  it("prioritizes incomplete customer profiles", () => {
    expect(source).toContain(
      "function customerProfileStatus(",
    );

    expect(source).toContain(
      'label: "Kontakt fehlt"',
    );

    expect(source).toContain(
      'label: "Adresse fehlt"',
    );

    expect(source).toContain(
      'label: "Vollständig"',
    );

    expect(source).toContain(
      "priorityDifference",
    );
  });

  it("uses fixed customer CRM columns", () => {
    expect(source).toContain(
      "xl:grid-cols-[minmax(210px,1.15fr)_minmax(220px,1fr)_minmax(210px,0.9fr)_130px_120px_auto]",
    );

    expect(source).toContain(
      "getCustomerName(customer)",
    );

    expect(source).toContain(
      "customer.email",
    );

    expect(source).toContain(
      "getCustomerLocation(customer)",
    );

    expect(source).toContain(
      "profile.label",
    );

    expect(source).toContain(
      "formatDate(customer.createdAt)",
    );
  });

  it("keeps exactly one operational action per customer", () => {
    const mapStart = source.indexOf(
      "{sortedCustomers.map((customer) => {",
    );

    const mapEnd = source.indexOf(
      "              })}",
      mapStart,
    );

    expect(mapStart).toBeGreaterThanOrEqual(0);
    expect(mapEnd).toBeGreaterThan(mapStart);

    const rowSource = source.slice(
      mapStart,
      mapEnd,
    );

    expect(
      countFragment(
        rowSource,
        "<PremiumButton",
      ),
    ).toBe(1);

    expect(rowSource).toContain(
      "href={action.href}",
    );

    expect(rowSource).toContain(
      "{action.label}",
    );

    expect(rowSource).not.toContain(
      "/edit",
    );
  });
});