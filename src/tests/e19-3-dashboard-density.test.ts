import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const pageSource = readFileSync(
  join(root, "src/app/dashboard/page.tsx"),
  "utf8",
);

const layoutSource = readFileSync(
  join(root, "src/app/dashboard/layout.tsx"),
  "utf8",
);

const navigationSource = readFileSync(
  join(root, "src/app/dashboard/DashboardNavigationLink.tsx"),
  "utf8",
);

describe("E19.3 dashboard density", () => {
  it("keeps compact desktop branding without a duplicate sidebar title", () => {
    expect(layoutSource).toContain("w-[260px]");
    expect(layoutSource).toContain("Automatisierter Betrieb");

    expect(layoutSource).not.toContain(
      '<h1 className="mt-2 text-xl font-black text-white">Cockpit</h1>',
    );
  });

  it("shows navigation descriptions only for the active destination", () => {
    expect(navigationSource).toContain(
      "{description && isActive ? (",
    );

    expect(navigationSource).toContain(
      "px-3.5 py-2.5",
    );
  });

  it("uses one compact summary strip instead of two large card grids", () => {
    expect(pageSource).toContain(
      "grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8",
    );

    expect(pageSource).not.toContain(
      "[&>*]:!p-4",
    );
  });
});