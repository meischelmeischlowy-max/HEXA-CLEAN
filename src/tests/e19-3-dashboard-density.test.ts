import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const layoutSource = readFileSync(
  join(root, "src/app/dashboard/layout.tsx"),
  "utf8",
);

const navigationSource = readFileSync(
  join(root, "src/app/dashboard/DashboardNavigationLink.tsx"),
  "utf8",
);

const pageSource = readFileSync(
  join(root, "src/app/dashboard/page.tsx"),
  "utf8",
);

function countOccurrences(source: string, value: string) {
  return source.split(value).length - 1;
}

describe("E19.3 dashboard density", () => {
  it("uses compact desktop branding without a duplicated Cockpit title", () => {
    expect(layoutSource).toContain("w-[260px]");
    expect(layoutSource).toContain("Automatisierter Betrieb");
    expect(layoutSource).not.toContain(
      '<h1 className="mt-2 text-xl font-black text-white">Cockpit</h1>',
    );
  });

  it("shows navigation descriptions only for the active destination", () => {
    expect(navigationSource).toContain("{description && isActive ? (");
    expect(navigationSource).toContain("px-3.5 py-2.5");
    expect(navigationSource).toContain("leading-4");
  });

  it("keeps one main action and reduces dashboard vertical density", () => {
    expect(
      countOccurrences(pageSource, 'data-testid="dashboard-primary-action"'),
    ).toBe(1);

    expect(pageSource).toContain(
      "gap-4 lg:flex-row lg:items-center lg:justify-start",
    );

    expect(
      countOccurrences(pageSource, "[&>*]:!p-4"),
    ).toBe(2);

    expect(pageSource).toContain("px-5 py-3.5");
    expect(pageSource).toContain("px-5 py-3 text-center");
  });
});
