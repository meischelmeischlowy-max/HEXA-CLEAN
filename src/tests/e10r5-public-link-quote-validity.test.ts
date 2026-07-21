import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("E10R.5 public-link quote validity", () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      "src/app/api/dashboard/quotes/[id]/public-link/route.ts",
    ),
    "utf8",
  );

  it("uses and persists the effective quote validity during sending", () => {
    expect(source).toContain(
      "const effectiveValidUntil =",
    );
    expect(source).toContain(
      "currentQuote.validUntil ??",
    );
    expect(source).toContain(
      "validUntil:\n            effectiveValidUntil",
    );
    expect(source).toContain(
      "validUntil:\n        effectiveValidUntil",
    );
  });

  it("repairs missing validity in the already-sent branch", () => {
    expect(source).toContain(
      "14 * 24 * 60 * 60 * 1000",
    );
  });
});
