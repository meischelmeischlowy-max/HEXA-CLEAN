import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("E10R.2 quote request photos and validity", () => {
  it("includes pricing evidence from the original request", () => {
    const page = source(
      "src/app/dashboard/quotes/[id]/page.tsx",
    );

    expect(page).toContain(
      'purpose === "pricing_evidence"',
    );

    expect(page).toContain(
      'stage === "before_quote"',
    );

    expect(page).toContain(
      ".filter(isCustomerRequestAttachment)",
    );
  });

  it("presents request photos directly on the quote page", () => {
    const page = source(
      "src/app/dashboard/quotes/[id]/page.tsx",
    );

    expect(page).toContain(
      "Fotos zur Kundenanfrage",
    );

    expect(page).toContain(
      'src={readString(attachment.url)}',
    );

    expect(page).toContain(
      'target="_blank"',
    );

    expect(page).not.toContain(
      "Hier sehen Sie nur die Unterlagen, die der Kunde über den",
    );
  });

  it("assigns 14 days validity when estimate has no date", () => {
    const route = source(
      "src/app/api/dashboard/estimates/[id]/quote/route.ts",
    );

    expect(route).toContain(
      "estimate.validUntil ??",
    );

    expect(route).toContain(
      "14 * 24 * 60 * 60 * 1000",
    );
  });
});
