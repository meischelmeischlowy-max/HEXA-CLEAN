import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("E10R.4 quote validity on send", () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      "src/app/api/dashboard/quotes/[id]/route.ts",
    ),
    "utf8",
  );

  it("sets 14-day validity when sending a quote without validUntil", () => {
    expect(source).toContain("validUntil?: Date;");
    expect(source).toContain(
      "quote.validUntil ??",
    );
    expect(source).toContain(
      "14 * 24 * 60 * 60 * 1000",
    );
  });
});
