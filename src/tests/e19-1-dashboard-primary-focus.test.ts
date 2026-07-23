import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "src/app/dashboard/page.tsx"),
  "utf8",
);

function countOccurrences(source: string, value: string) {
  return source.split(value).length - 1;
}

describe("E19.1 dashboard primary focus", () => {
  it("keeps exactly one primary dashboard action", () => {
    expect(
      countOccurrences(
        pageSource,
        '"dashboard-primary-action"',
      ),
    ).toBe(1);

    expect(pageSource).toContain(
      'isPrimary\n            ? "dashboard-primary-action"',
    );
  });

  it("selects the first alert as the primary operational item", () => {
    expect(pageSource).toContain(
      "const primaryAlert =\n    alerts[0] ?? null;",
    );

    expect(pageSource).toContain(
      "alerts.slice(1, 20);",
    );
  });

  it("does not restore the old large alert queue", () => {
    expect(pageSource).not.toContain("alerts.slice(0, 18)");
    expect(pageSource).not.toContain("Weitere Aufgaben");
  });
});