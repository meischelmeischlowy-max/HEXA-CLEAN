export type PublicQuoteStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export function normalizePublicOfferDecisionConfirmation(
  value: unknown,
  decision: "accept" | "reject",
) {
  if (value === true || value === "true" || value === "yes") {
    return true;
  }

  return decision === "accept"
    ? value === "accepted"
    : value === "rejected";
}

export function canAcceptPublicOffer(status: PublicQuoteStatus) {
  return status === "SENT";
}

export function canRejectPublicOffer(status: PublicQuoteStatus) {
  return status === "SENT";
}

export function isPublicOfferInactiveForAcceptance(
  status: PublicQuoteStatus,
) {
  return status === "REJECTED" || status === "EXPIRED";
}

export function isPublicOfferAlreadyAccepted(
  status: PublicQuoteStatus,
  acceptedAt: Date | string | null | undefined,
) {
  return status === "ACCEPTED" && Boolean(acceptedAt);
}

export function isPublicOfferRejectionLocked(
  status: PublicQuoteStatus,
  linkAcceptedAt: Date | string | null | undefined,
) {
  return status === "ACCEPTED" || Boolean(linkAcceptedAt);
}

export function isPublicOfferAlreadyRejected(status: PublicQuoteStatus) {
  return status === "REJECTED";
}

export function isPublicOfferExpiredStatus(status: PublicQuoteStatus) {
  return status === "EXPIRED";
}

export function canCreateInvoiceFromQuote(status: PublicQuoteStatus) {
  return status === "ACCEPTED";
}
