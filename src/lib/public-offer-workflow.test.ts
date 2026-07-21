import { describe, expect, it } from "vitest";
import {
  canAcceptPublicOffer,
  canCreateInvoiceFromQuote,
  canRejectPublicOffer,
  isPublicOfferAlreadyAccepted,
  isPublicOfferAlreadyRejected,
  isPublicOfferExpiredStatus,
  isPublicOfferInactiveForAcceptance,
  isPublicOfferRejectionLocked,
  normalizePublicOfferDecisionConfirmation,
  type PublicQuoteStatus,
} from "@/lib/public-offer-workflow";

const STATUSES: PublicQuoteStatus[] = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

describe("public offer confirmation", () => {
  it("accepts only supported acceptance confirmation values", () => {
    for (const value of [true, "true", "yes", "accepted"]) {
      expect(normalizePublicOfferDecisionConfirmation(value, "accept")).toBe(true);
    }
    for (const value of [false, "false", "rejected", "", null, undefined]) {
      expect(normalizePublicOfferDecisionConfirmation(value, "accept")).toBe(false);
    }
  });

  it("accepts only supported rejection confirmation values", () => {
    for (const value of [true, "true", "yes", "rejected"]) {
      expect(normalizePublicOfferDecisionConfirmation(value, "reject")).toBe(true);
    }
    for (const value of [false, "false", "accepted", "", null, undefined]) {
      expect(normalizePublicOfferDecisionConfirmation(value, "reject")).toBe(false);
    }
  });
});

describe("public offer status workflow", () => {
  it("allows acceptance only from SENT", () => {
    for (const status of STATUSES) {
      expect(canAcceptPublicOffer(status)).toBe(status === "SENT");
    }
  });

  it("allows rejection only from SENT", () => {
    for (const status of STATUSES) {
      expect(canRejectPublicOffer(status)).toBe(status === "SENT");
    }
  });

  it("treats accepted offers as idempotent only when acceptedAt exists", () => {
    expect(isPublicOfferAlreadyAccepted("ACCEPTED", new Date())).toBe(true);
    expect(isPublicOfferAlreadyAccepted("ACCEPTED", null)).toBe(false);
    expect(isPublicOfferAlreadyAccepted("SENT", new Date())).toBe(false);
  });

  it("blocks rejection after either quote or link acceptance", () => {
    expect(isPublicOfferRejectionLocked("ACCEPTED", null)).toBe(true);
    expect(isPublicOfferRejectionLocked("SENT", new Date())).toBe(true);
    expect(isPublicOfferRejectionLocked("SENT", null)).toBe(false);
  });

  it("recognizes inactive, rejected, and expired statuses", () => {
    expect(isPublicOfferInactiveForAcceptance("REJECTED")).toBe(true);
    expect(isPublicOfferInactiveForAcceptance("EXPIRED")).toBe(true);
    expect(isPublicOfferInactiveForAcceptance("SENT")).toBe(false);
    expect(isPublicOfferAlreadyRejected("REJECTED")).toBe(true);
    expect(isPublicOfferAlreadyRejected("SENT")).toBe(false);
    expect(isPublicOfferExpiredStatus("EXPIRED")).toBe(true);
    expect(isPublicOfferExpiredStatus("REJECTED")).toBe(false);
  });

  it("allows invoice creation only after accepted quote and completed order", () => {
    for (const status of STATUSES) {
      expect(
        canCreateInvoiceFromQuote(
          status,
          "COMPLETED",
        ),
      ).toBe(
        status === "ACCEPTED",
      );

      expect(
        canCreateInvoiceFromQuote(
          status,
          "CONFIRMED",
        ),
      ).toBe(false);

      expect(
        canCreateInvoiceFromQuote(
          status,
          "SCHEDULED",
        ),
      ).toBe(false);

      expect(
        canCreateInvoiceFromQuote(
          status,
          "IN_PROGRESS",
        ),
      ).toBe(false);
    }
  });
});
