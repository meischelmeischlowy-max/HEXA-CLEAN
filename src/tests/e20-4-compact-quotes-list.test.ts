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
    "src/app/dashboard/quotes/page.tsx",
  ),
  "utf8",
);

function countFragment(
  value: string,
  fragment: string,
) {
  return value.split(fragment).length - 1;
}

describe("E20.4 compact quotes CRM list", () => {
  it("uses a compact header and summary strip", () => {
    expect(source).toContain(
      'data-testid="quotes-summary-strip"',
    );

    expect(source).toContain(
      'data-testid="quotes-operational-list"',
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
  });

  it("uses fixed CRM columns for each quote", () => {
    expect(source).toContain(
      "xl:grid-cols-[minmax(190px,1fr)_120px_minmax(180px,0.9fr)_140px_130px_auto]",
    );

    expect(source).toContain(
      "{getQuoteNumber(quote)}",
    );

    expect(source).toContain(
      "{getQuoteStatusLabel(quote.status)}",
    );

    expect(source).toContain(
      "quote.customerId",
    );

    expect(source).toContain(
      "quote.total",
    );

    expect(source).toContain(
      "{formatDate(getQuoteDeadline(quote))}",
    );
  });

  it("keeps exactly one operational action per row", () => {
    const mapStart = source.indexOf(
      "{sortedQuotes.map((quote) => {",
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
      ">Details<",
    );
  });

  it("prioritizes quote workflow states", () => {
    expect(source).toContain(
      "function getQuoteAction(",
    );

    expect(source).toContain(
      'case "DRAFT":',
    );

    expect(source).toContain(
      'case "READY_TO_SEND":',
    );

    expect(source).toContain(
      'case "SENT":',
    );

    expect(source).toContain(
      'case "ACCEPTED":',
    );

    expect(source).toContain(
      "priorityDifference",
    );
  });
});