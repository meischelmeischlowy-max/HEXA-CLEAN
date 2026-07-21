import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function repositorySource() {
  return readFileSync(
    resolve(
      process.cwd(),
      "src/repositories/dashboardRepository.ts",
    ),
    "utf8",
  );
}

describe("E10R.3 quote related attachments", () => {
  it("loads attachments related to the quote workflow", () => {
    const source = repositorySource();

    expect(source).toContain(
      "async getQuoteDetails(quoteId: string)",
    );

    expect(source).toContain(
      "prisma.attachment.findMany({",
    );

    expect(source).toContain("OR: [");
    expect(source).toContain("quoteId,");
    expect(source).toContain("orderId,");
    expect(source).toContain("sessionId,");
  });

  it("does not limit quote details to quoteId only", () => {
    const source = repositorySource();

    expect(source).not.toContain(
      `prisma.attachment.findMany({
        where: {
          quoteId,
        },
        take: 50,`,
    );
  });
});
