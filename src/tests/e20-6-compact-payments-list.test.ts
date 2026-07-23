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
    "src/app/dashboard/payments/page.tsx",
  ),
  "utf8",
);

function countFragment(
  value: string,
  fragment: string,
) {
  return value.split(fragment).length - 1;
}

describe("E20.6 compact payments CRM list", () => {
  it("uses compact header and summary strip", () => {
    expect(source).toContain(
      'data-testid="payments-summary-strip"',
    );

    expect(source).toContain(
      'data-testid="payments-operational-list"',
    );

    expect(source).toContain(
      "max-w-[1600px]",
    );

    expect(source).not.toContain(
      "PageHeader",
    );

    expect(source).not.toContain(
      "MetricCard",
    );

    expect(source).not.toContain(
      "DashboardPanel",
    );

    expect(source).not.toContain(
      "DashboardTable",
    );
  });

  it("keeps payment entry as a compact toggle form", () => {
    expect(source).toContain(
      'data-testid="payment-entry-form"',
    );

    expect(source).toContain(
      "setFormOpen",
    );

    expect(source).toContain(
      "Zahlung erfassen",
    );

    expect(source).toContain(
      "createPayment",
    );

    expect(source).toContain(
      "fillRemainingAmount",
    );
  });

  it("uses fixed operational payment columns", () => {
    expect(source).toContain(
      "xl:grid-cols-[minmax(190px,1fr)_120px_140px_160px_minmax(190px,0.9fr)_140px_auto]",
    );

    expect(source).toContain(
      "statusLabel(payment.status)",
    );

    expect(source).toContain(
      "formatPaymentMethod(",
    );

    expect(source).toContain(
      "payment.invoice?.invoiceNumber",
    );

    expect(source).toContain(
      "formatDate(payment.paidAt)",
    );
  });

  it("keeps one action per payment row", () => {
    const mapStart = source.indexOf(
      "{sortedPayments.map((payment) => (",
    );

    const mapEnd = source.indexOf(
      "              ))}",
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
      "Zahlung öffnen",
    );

    expect(rowSource).not.toContain(
      'href={`/dashboard/invoices/${payment.invoiceId}`}',
    );
  });
});