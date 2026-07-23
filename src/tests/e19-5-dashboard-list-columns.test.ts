import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "src/app/dashboard/page.tsx"),
  "utf8",
);

describe("E19.5 dashboard operational list columns", () => {
  it("shows full summary labels at normal desktop widths", () => {
    expect(pageSource).toContain(
      "md:grid-cols-4 2xl:grid-cols-8",
    );

    expect(pageSource).not.toContain(
      "min-w-0 truncate text-[10px] font-black uppercase tracking-[0.16em]",
    );
  });

  it("uses fixed operational columns on desktop", () => {
    expect(pageSource).toContain(
      "xl:grid-cols-[76px_minmax(180px,0.85fr)_minmax(260px,1.45fr)_150px_auto]",
    );
  });

  it("keeps customer, description, metadata and action visually separated", () => {
    expect(pageSource).toContain(
      "{alert.customer}",
    );

    expect(pageSource).toContain(
      "{alert.description}",
    );

    expect(pageSource).toContain(
      "{formatDate(alert.createdAt)}",
    );

    expect(pageSource).toContain(
      "{alert.primaryLabel}",
    );
  });

  it("keeps the primary record at the same compact height", () => {
    expect(pageSource).toContain(
      'title="Heute zuerst"',
    );

    expect(pageSource).not.toContain(
      "text-white/65 lg:mt-1 lg:block",
    );
  });
});