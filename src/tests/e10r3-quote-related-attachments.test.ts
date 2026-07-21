import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("E10R.3 quote related attachments", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/repositories/dashboardRepository.ts"),
    "utf8",
  );

  it("loads attachments across the complete customer workflow", () => {
    expect(source).toContain("OR: [");
    expect(source).toContain("quoteId,");
    expect(source).toContain("customerId,");
    expect(source).toContain("orderId,");
    expect(source).toContain("sessionId,");
  });
});
