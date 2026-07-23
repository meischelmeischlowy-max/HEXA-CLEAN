import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/dashboard/estimates/page.tsx",
  ),
  "utf8",
);

function countFragment(
  value: string,
  fragment: string,
) {
  return value.split(fragment).length - 1;
}

describe("E20.3 compact estimates CRM list", () => {
  it("uses a compact header and one summary strip", () => {
    expect(source).toContain(
      'data-testid="estimates-summary-strip"',
    );

    expect(source).toContain(
      'data-testid="estimates-operational-list"',
    );

    expect(source).toContain(
      "max-w-[1600px]",
    );

    expect(source).not.toContain(
      "PageHeader",
    );

    expect(source).not.toContain(
      "Prozessregel",
    );
  });

  it("uses fixed CRM columns for every estimate", () => {
    expect(source).toContain(
      "xl:grid-cols-[minmax(190px,0.9fr)_110px_minmax(210px,1fr)_minmax(170px,0.8fr)_140px_auto]",
    );

    expect(source).toContain(
      "{customerName(estimate.customer)}",
    );

    expect(source).toContain(
      "{customerContact(estimate.customer)}",
    );

    expect(source).toContain(
      "estimate.total",
    );

    expect(source).toContain(
      "estimate.aiMinTotal",
    );

    expect(source).toContain(
      "estimate.aiMaxTotal",
    );
  });

  it("keeps exactly one workflow action per estimate row", () => {
    const mapStart = source.indexOf(
      "{estimates.map((estimate) => {",
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
        "<ActionStatusBadge",
      ),
    ).toBe(1);

    expect(rowSource).not.toContain(
      ">Öffnen<",
    );

    expect(rowSource).toContain(
      "label={action.label}",
    );
  });

  it("preserves the estimate workflow source", () => {
    expect(source).toContain(
      "getEstimateAction({",
    );

    expect(source).toContain(
      "status: estimate.status",
    );

    expect(source).toContain(
      "sourceLabel(estimate.source)",
    );

    expect(source).toContain(
      "rowClass(",
    );

    expect(source).toContain(
      "estimate,",
    );
  });
});