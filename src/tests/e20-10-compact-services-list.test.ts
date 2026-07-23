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
    "src/app/dashboard/services/page.tsx",
  ),
  "utf8",
);

describe("E20.10 compact services CRM list", () => {
  it("uses compact header and summary strip", () => {
    expect(source).toContain(
      'data-testid="services-summary-strip"',
    );

    expect(source).toContain(
      'data-testid="services-operational-list"',
    );

    expect(source).toContain(
      "max-w-[1600px]",
    );

    expect(source).not.toContain(
      "MetricCard",
    );

    expect(source).not.toContain(
      "PageHeader",
    );
  });

  it("removes demo seeding and technical explanation panels", () => {
    expect(source).not.toContain(
      "seedDemoServices",
    );

    expect(source).not.toContain(
      "Beispielkatalog hinzufügen",
    );

    expect(source).not.toContain(
      "Rola Service Catalog",
    );

    expect(source).not.toContain(
      "Vision AI",
    );

    expect(source).not.toContain(
      'method: "POST"',
    );
  });

  it("uses German category and unit labels", () => {
    expect(source).toContain(
      "FENSTERREINIGUNG:",
    );

    expect(source).toContain(
      '"Fensterreinigung"',
    );

    expect(source).toContain(
      "WOHNUNGSABGABE:",
    );

    expect(source).toContain(
      '"Wohnungsabgabe"',
    );

    expect(source).toContain(
      'HOUR: "Stunde"',
    );

    expect(source).toContain(
      'WINDOW: "Fenster"',
    );

    expect(source).toContain(
      'PIECE: "Stück"',
    );

    expect(source).not.toContain(
      '"Godzina"',
    );

    expect(source).not.toContain(
      '"Okno"',
    );

    expect(source).not.toContain(
      '"Sztuka"',
    );
  });

  it("uses fixed operational service columns", () => {
    expect(source).toContain(
      "xl:grid-cols-[minmax(240px,1.2fr)_150px_120px_minmax(210px,0.9fr)_120px_150px_auto]",
    );

    expect(source).toContain(
      "service.name",
    );

    expect(source).toContain(
      "formatCategory(",
    );

    expect(source).toContain(
      "formatUnit(",
    );

    expect(source).toContain(
      "formatMoney(",
    );

    expect(source).toContain(
      "statusLabel(",
    );
  });

  it("keeps one action per service", () => {
    expect(source).toContain(
      'href={`/dashboard/services/${service.id}`}',
    );

    expect(source).toContain(
      "Leistung öffnen",
    );

    expect(source).not.toContain(
      "ActionLink",
    );

    expect(source).not.toContain(
      "Bearbeiten",
    );

    expect(source).not.toContain(
      "DashboardTable",
    );
  });
});