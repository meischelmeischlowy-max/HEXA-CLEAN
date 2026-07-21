import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function estimateSource() {
  return readFileSync(
    resolve(
      process.cwd(),
      "src/app/dashboard/estimates/[id]/page.tsx",
    ),
    "utf8",
  );
}

describe("E10R.1 estimate photo preview", () => {
  it("prefers complete QuickOffer session metadata", () => {
    const content = estimateSource();

    expect(content).toContain(
      "const quickOfferSessionMetadata = estimate.session?.metadata",
    );

    expect(content).toContain(
      'metadataValue(quickOfferSessionMetadata, "size")',
    );

    expect(content).toContain(
      'metadataValue(quickOfferSessionMetadata, "time")',
    );
  });

  it("renders customer photo previews before price approval", () => {
    const content = estimateSource();

    expect(content).toContain(
      "estimate.attachments.map((attachment)",
    );

    expect(content).toContain("src={attachment.url}");
    expect(content).toContain("Foto oeffnen");
    expect(content).toContain("attachment.fileName");
    expect(content).toContain("attachment.sizeBytes");
  });

  it("does not display the raw attachment URL as text", () => {
    const content = estimateSource();

    expect(content).not.toContain(
      "<p>{attachment.url}</p>",
    );

    expect(content).not.toContain(
      "value={attachment.url}",
    );
  });
});
