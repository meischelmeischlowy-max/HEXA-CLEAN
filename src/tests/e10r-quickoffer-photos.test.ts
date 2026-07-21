import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("E10R photos before pricing", () => {
  it("QuickOffer sends multipart form data with photos", () => {
    const content = source("src/components/QuickOffer.tsx");

    expect(content).toContain("new FormData()");
    expect(content).toContain('formData.append("photos"');
    expect(content).toContain("<QuickOfferPhotoUpload");
    expect(content).not.toContain('"Content-Type": "application/json"');
  });

  it("contact API creates PHOTO attachments linked before quote creation", () => {
    const content = source("src/app/api/contact/route.ts");

    expect(content).toContain("AttachmentType.PHOTO");
    expect(content).toContain('purpose: "pricing_evidence"');
    expect(content).toContain('stage: "before_quote"');
    expect(content).toContain("estimateId: estimate.id");
    expect(content).toContain("orderId: order.id");
    expect(content).toContain("sessionId: session.id");
    expect(content).toContain("customerId: customer.id");
  });

  it("public offer page no longer contains the main upload box", () => {
    const content = source("src/app/public/offers/[token]/page.tsx");

    expect(content).not.toContain("PublicOfferUploadBox");
  });

  it("estimate page already loads attachments for the Anfrage workspace", () => {
    const content = source("src/app/dashboard/estimates/[id]/page.tsx");

    expect(content).toContain("attachments");
    expect(content).toContain("Anfrage");
  });
});
