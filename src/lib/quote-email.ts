export type QuoteEmailPayload = {
  quoteNumber: string;
  customerName: string;
  total: number;
  currency: string;
  publicUrl: string;
  validUntil?: Date | string | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeCurrency(
  value: string,
) {
  const currency = value
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(currency)
    ? currency
    : "CHF";
}

function formatMoney(
  value: number,
  currency: string,
) {
  const amount = Number.isFinite(value)
    ? value
    : 0;

  return new Intl.NumberFormat(
    "de-CH",
    {
      style: "currency",
      currency:
        normalizeCurrency(currency),
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

function formatDate(
  value?: Date | string | null,
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "long",
    },
  ).format(date);
}

export function buildQuoteEmailSubject(
  quoteNumber: string,
) {
  return `Ihre Offerte ${quoteNumber} von HEXA CLEAN`;
}

export function buildQuoteEmailText(
  payload: QuoteEmailPayload,
) {
  const validUntil =
    formatDate(payload.validUntil);

  return [
    `Guten Tag ${payload.customerName}`,
    "",
    "vielen Dank für Ihre Anfrage.",
    "",
    `Ihre Offerte ${payload.quoteNumber} ist bereit.`,
    `Gesamtbetrag: ${formatMoney(
      payload.total,
      payload.currency,
    )}`,
    ...(validUntil
      ? [
          `Gültig bis: ${validUntil}`,
        ]
      : []),
    "",
    "Über den folgenden geschützten Link können Sie die Offerte prüfen, akzeptieren oder ablehnen:",
    payload.publicUrl,
    "",
    "Freundliche Grüsse",
    "HEXA CLEAN",
  ].join("\n");
}

export function buildQuoteEmailHtml(
  payload: QuoteEmailPayload,
) {
  const validUntil =
    formatDate(payload.validUntil);

  const customerName =
    escapeHtml(payload.customerName);

  const quoteNumber =
    escapeHtml(payload.quoteNumber);

  const publicUrl =
    escapeHtml(payload.publicUrl);

  const total =
    escapeHtml(
      formatMoney(
        payload.total,
        payload.currency,
      ),
    );

  const validUntilHtml =
    validUntil
      ? `
        <tr>
          <td style="padding:8px 0;color:#64748b;">Gültig bis</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(
            validUntil,
          )}</td>
        </tr>
      `
      : "";

  return `
    <div style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #cbd5e1;border-radius:18px;overflow:hidden;">
        <div style="padding:26px 30px;background:#062f33;color:#ffffff;">
          <div style="font-size:12px;font-weight:700;letter-spacing:3px;color:#67e8f9;">
            HEXA CLEAN
          </div>
          <h1 style="margin:12px 0 0;font-size:27px;line-height:1.25;">
            Ihre Offerte ist bereit
          </h1>
        </div>

        <div style="padding:30px;">
          <p style="margin:0 0 18px;line-height:1.7;">
            Guten Tag ${customerName}
          </p>

          <p style="margin:0 0 22px;line-height:1.7;color:#334155;">
            Vielen Dank für Ihre Anfrage. Sie können Ihre Offerte jetzt über den geschützten Kundenlink prüfen, akzeptieren oder ablehnen.
          </p>

          <table style="width:100%;margin:0 0 26px;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
            <tr>
              <td style="padding:14px 0 8px;color:#64748b;">Offerte</td>
              <td style="padding:14px 0 8px;text-align:right;font-weight:700;">${quoteNumber}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;">Gesamtbetrag</td>
              <td style="padding:8px 0;text-align:right;font-weight:700;">${total}</td>
            </tr>
            ${validUntilHtml}
          </table>

          <p style="margin:0 0 24px;text-align:center;">
            <a
              href="${publicUrl}"
              style="display:inline-block;padding:15px 24px;border-radius:12px;background:#0891b2;color:#ffffff;text-decoration:none;font-weight:700;"
            >
              Offerte öffnen
            </a>
          </p>

          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#64748b;">
            Funktioniert der Button nicht, öffnen Sie diesen Link:
          </p>

          <p style="margin:0;overflow-wrap:anywhere;font-size:12px;line-height:1.6;">
            <a href="${publicUrl}" style="color:#0369a1;">${publicUrl}</a>
          </p>
        </div>

        <div style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.6;color:#475569;">
          Freundliche Grüsse<br />
          <strong>HEXA CLEAN</strong>
        </div>
      </div>
    </div>
  `;
}

export function quoteNotificationMatches(
  metadata: unknown,
  quoteId: string,
) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return false;
  }

  const record =
    metadata as Record<
      string,
      unknown
    >;

  return (
    record.source ===
      "automatic_quote_email" &&
    record.quoteId === quoteId
  );
}
