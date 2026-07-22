export type InvoiceEmailItem = {
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

export type InvoiceEmailPayload = {
  invoiceNumber: string;
  customerName: string;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  items: InvoiceEmailItem[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Zurich",
  }).format(value);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function sanitizeInvoiceCustomerText(value?: string | null) {
  if (!value) {
    return "";
  }

  const forbiddenMarkers = [
    "estimate id:",
    "customer notes:",
    "quote generated from estimate",
    "internal note",
    "internal notes",
    "notesinternal",
    "crm id:",
    "session id:",
    "customer id:",
    "order id:",
  ];

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const normalized = line.toLowerCase();

      if (
        forbiddenMarkers.some((marker) =>
          normalized.includes(marker),
        )
      ) {
        return false;
      }

      if (
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(
          line,
        )
      ) {
        return false;
      }

      return true;
    })
    .join(" ");
}

export function buildInvoiceEmailSubject(invoiceNumber: string) {
  return `Ihre Rechnung ${invoiceNumber} von HEXA CLEAN`;
}

export function buildInvoiceEmailText(
  payload: InvoiceEmailPayload,
) {
  const itemLines = payload.items.map((item) => {
    const description = sanitizeInvoiceCustomerText(
      item.description,
    );

    return [
      item.name,
      description ? `  ${description}` : null,
      `  ${item.quantity} ${item.unit} × ${formatMoney(
        item.unitPrice,
        payload.currency,
      )} = ${formatMoney(item.total, payload.currency)}`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    `Guten Tag ${payload.customerName}`,
    "",
    `Sie erhalten die Rechnung ${payload.invoiceNumber} von HEXA CLEAN.`,
    "",
    `Rechnungsdatum: ${formatDate(payload.issueDate)}`,
    `Zahlbar bis: ${formatDate(payload.dueDate)}`,
    "",
    "Rechnungspositionen:",
    ...itemLines,
    "",
    `Zwischensumme: ${formatMoney(
      payload.subtotal,
      payload.currency,
    )}`,
    `Steuerbetrag: ${formatMoney(
      payload.taxAmount,
      payload.currency,
    )}`,
    `Gesamtbetrag: ${formatMoney(
      payload.total,
      payload.currency,
    )}`,
    "",
    "Bei Fragen antworten Sie bitte direkt auf diese E-Mail.",
    "",
    "Freundliche Grüsse",
    "HEXA CLEAN",
  ].join("\n");
}

export function buildInvoiceEmailHtml(
  payload: InvoiceEmailPayload,
) {
  const itemCards = payload.items
    .map((item) => {
      const description = sanitizeInvoiceCustomerText(
        item.description,
      );

      return `
        <div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="padding:14px 16px;background:#f9fafb;">
            <div style="font-size:16px;font-weight:700;line-height:1.35;overflow-wrap:anywhere;word-break:break-word;">
              ${escapeHtml(item.name)}
            </div>
            ${
              description
                ? `<div style="margin-top:5px;color:#6b7280;font-size:13px;line-height:1.45;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(
                    description,
                  )}</div>`
                : ""
            }
          </div>

          <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <tr>
              <td style="width:44%;padding:10px 16px;border-top:1px solid #e5e7eb;color:#6b7280;">
                Menge
              </td>
              <td style="padding:10px 16px;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;overflow-wrap:anywhere;">
                ${escapeHtml(String(item.quantity))}
                ${escapeHtml(item.unit)}
              </td>
            </tr>

            <tr>
              <td style="width:44%;padding:10px 16px;border-top:1px solid #e5e7eb;color:#6b7280;">
                Einzelpreis
              </td>
              <td style="padding:10px 16px;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;overflow-wrap:anywhere;">
                ${escapeHtml(
                  formatMoney(
                    item.unitPrice,
                    payload.currency,
                  ),
                )}
              </td>
            </tr>

            <tr>
              <td style="width:44%;padding:10px 16px;border-top:1px solid #e5e7eb;color:#6b7280;">
                Betrag
              </td>
              <td style="padding:10px 16px;border-top:1px solid #e5e7eb;text-align:right;font-weight:800;color:#111827;overflow-wrap:anywhere;">
                ${escapeHtml(
                  formatMoney(
                    item.total,
                    payload.currency,
                  ),
                )}
              </td>
            </tr>
          </table>
        </div>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1"
        />
      </head>

      <body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
        <div style="width:100%;max-width:720px;margin:0 auto;padding:16px 8px;box-sizing:border-box;">
          <div style="background:#111827;padding:20px;border-radius:16px 16px 0 0;color:white;box-sizing:border-box;">
            <div style="font-size:12px;letter-spacing:3px;color:#67e8f9;">
              HEXA CLEAN
            </div>

            <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;overflow-wrap:anywhere;word-break:break-word;">
              Rechnung ${escapeHtml(payload.invoiceNumber)}
            </h1>
          </div>

          <div style="background:white;padding:20px;border-radius:0 0 16px 16px;box-sizing:border-box;">
            <p>
              Guten Tag ${escapeHtml(payload.customerName)}
            </p>

            <p>
              Vielen Dank f&uuml;r Ihren Auftrag. Sie erhalten
              hiermit Ihre Rechnung von HEXA CLEAN.
            </p>

            <table role="presentation" style="width:100%;margin:24px 0;border-collapse:collapse;table-layout:fixed;">
              <tr>
                <td style="width:48%;padding:6px 0;color:#6b7280;">
                  Rechnungsdatum
                </td>

                <td style="padding:6px 0;text-align:right;font-weight:700;overflow-wrap:anywhere;">
                  ${escapeHtml(formatDate(payload.issueDate))}
                </td>
              </tr>

              <tr>
                <td style="width:48%;padding:6px 0;color:#6b7280;">
                  Zahlbar bis
                </td>

                <td style="padding:6px 0;text-align:right;font-weight:700;overflow-wrap:anywhere;">
                  ${escapeHtml(formatDate(payload.dueDate))}
                </td>
              </tr>
            </table>

            <div>
              ${itemCards}
            </div>

            <table role="presentation" style="width:100%;margin-top:22px;border-collapse:collapse;table-layout:fixed;">
              <tr>
                <td style="width:48%;padding:5px 0;color:#6b7280;">
                  Zwischensumme
                </td>

                <td style="padding:5px 0;text-align:right;overflow-wrap:anywhere;">
                  ${escapeHtml(
                    formatMoney(
                      payload.subtotal,
                      payload.currency,
                    ),
                  )}
                </td>
              </tr>

              <tr>
                <td style="width:48%;padding:5px 0;color:#6b7280;">
                  Steuerbetrag
                </td>

                <td style="padding:5px 0;text-align:right;overflow-wrap:anywhere;">
                  ${escapeHtml(
                    formatMoney(
                      payload.taxAmount,
                      payload.currency,
                    ),
                  )}
                </td>
              </tr>

              <tr>
                <td style="width:48%;padding:14px 0 5px;font-size:18px;font-weight:700;">
                  Gesamtbetrag
                </td>

                <td style="padding:14px 0 5px;text-align:right;font-size:20px;font-weight:800;color:#0891b2;overflow-wrap:anywhere;">
                  ${escapeHtml(
                    formatMoney(
                      payload.total,
                      payload.currency,
                    ),
                  )}
                </td>
              </tr>
            </table>

            <p style="margin-top:28px;color:#52525b;">
              Bei Fragen antworten Sie bitte direkt auf diese
              E-Mail.
            </p>

            <p style="margin-top:28px;">
              Freundliche Gr&uuml;sse<br />
              <strong>HEXA CLEAN</strong>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function invoiceNotificationMatches(
  metadata: unknown,
  invoiceId: string,
) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return false;
  }

  const value = (
    metadata as Record<string, unknown>
  ).invoiceId;

  return (
    typeof value === "string" &&
    value === invoiceId
  );
}
