export type PaymentConfirmationPayload = {
  invoiceNumber: string;
  customerName: string;
  amount: string;
  currency: string;
  paidAt: string;
};

export function paymentConfirmationMetadataMatches(
  value: unknown,
  invoiceId: string,
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const metadata =
    value as Record<string, unknown>;

  return (
    metadata.source ===
      "automatic_payment_confirmation" &&
    metadata.type ===
      "customer_payment_confirmation" &&
    metadata.invoiceId === invoiceId
  );
}

export function buildPaymentConfirmationSubject(
  invoiceNumber: string,
) {
  return `Zahlungsbestätigung: ${invoiceNumber}`;
}

export function buildPaymentConfirmationText(
  payload: PaymentConfirmationPayload,
) {
  return [
    `Guten Tag ${payload.customerName},`,
    "",
    `vielen Dank. Wir bestätigen den vollständigen Zahlungseingang für die Rechnung ${payload.invoiceNumber}.`,
    "",
    `Bezahlter Betrag: ${payload.amount} ${payload.currency}`,
    `Zahlung verbucht am: ${payload.paidAt}`,
    "",
    "Die Rechnung ist vollständig bezahlt. Es sind keine weiteren Schritte erforderlich.",
    "",
    "Freundliche Grüsse",
    "HEXA CLEAN",
  ].join("\n");
}

export function buildPaymentConfirmationHtml(
  payload: PaymentConfirmationPayload,
) {
  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b">
      <h2 style="margin:0 0 18px">Zahlungsbestätigung</h2>
      <p>Guten Tag ${escapeHtml(payload.customerName)},</p>
      <p>
        Vielen Dank. Wir bestätigen den vollständigen Zahlungseingang
        für die Rechnung <strong>${escapeHtml(payload.invoiceNumber)}</strong>.
      </p>
      <div style="margin:20px 0;padding:16px;border:1px solid #e4e4e7;border-radius:12px">
        <p style="margin:0 0 8px">
          <strong>Bezahlter Betrag:</strong>
          ${escapeHtml(payload.amount)} ${escapeHtml(payload.currency)}
        </p>
        <p style="margin:0">
          <strong>Zahlung verbucht am:</strong>
          ${escapeHtml(payload.paidAt)}
        </p>
      </div>
      <p>
        Die Rechnung ist vollständig bezahlt.
        Es sind keine weiteren Schritte erforderlich.
      </p>
      <p>Freundliche Grüsse<br><strong>HEXA CLEAN</strong></p>
    </div>
  `.trim();
}
