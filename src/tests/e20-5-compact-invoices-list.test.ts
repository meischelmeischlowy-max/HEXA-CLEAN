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
    "src/app/dashboard/invoices/page.tsx",
  ),
  "utf8",
);

function countFragment(
  value: string,
  fragment: string,
) {
  return value.split(fragment).length - 1;
}

describe("E20.5 compact invoices CRM list", () => {
  it("uses the invoice API and compact summary", () => {
    expect(source).toContain(
      "fetch(",
    );

    expect(source).toContain(
      '"/api/dashboard/invoices"',
    );

    expect(source).toContain(
      'data-testid="invoices-summary-strip"',
    );

    expect(source).toContain(
      'data-testid="invoices-operational-list"',
    );

    expect(source).toContain(
      "max-w-[1600px]",
    );

    expect(source).not.toContain(
      "PrismaClient",
    );

    expect(source).not.toContain(
      "prisma.invoice.findMany",
    );
  });

  it("uses fixed operational CRM columns", () => {
    expect(source).toContain(
      "xl:grid-cols-[minmax(190px,1fr)_minmax(190px,0.9fr)_120px_140px_140px_120px_auto]",
    );

    expect(source).toContain(
      "customerName(invoice.customer)",
    );

    expect(source).toContain(
      "statusLabel(invoice.status)",
    );

    expect(source).toContain(
      "formatMoney(total, currency)",
    );

    expect(source).toContain(
      "formatMoney(\n                          remaining,",
    );

    expect(source).toContain(
      "formatDate(invoice.dueDate)",
    );
  });

  it("keeps exactly one operational action per row", () => {
    const mapStart = source.indexOf(
      "{sortedInvoices.map((invoice) => {",
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
      "{action.label}",
    );

    expect(rowSource).not.toContain(
      "/edit",
    );

    expect(rowSource).not.toContain(
      "/print",
    );
  });

  it("prioritizes invoice workflow states", () => {
    expect(source).toContain(
      "function getInvoiceAction(",
    );

    expect(source).toContain(
      'case "DRAFT":',
    );

    expect(source).toContain(
      'case "OVERDUE":',
    );

    expect(source).toContain(
      'case "PARTIALLY_PAID":',
    );

    expect(source).toContain(
      'case "SENT":',
    );

    expect(source).toContain(
      'case "PAID":',
    );

    expect(source).toContain(
      "priorityDifference",
    );
  });
});