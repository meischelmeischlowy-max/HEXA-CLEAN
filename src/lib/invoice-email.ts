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
  const itemRows = payload.items
    .map((item) => {
      const description = sanitizeInvoiceCustomerText(
        item.description,
      );

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(item.name)}</strong>
            ${
              description
                ? `<div style="margin-top:4px;color:#6b7280;font-size:13px;">${escapeHtml(
                    description,
                  )}</div>`
                : ""
            }
          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">
            ${escapeHtml(String(item.quantity))}
            ${escapeHtml(item.unit)}
          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">
            ${escapeHtml(
              formatMoney(
                item.unitPrice,
                payload.currency,
              ),
            )}
          </td>

          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-weight:700;">
            ${escapeHtml(
              formatMoney(
                item.total,
                payload.currency,
              ),
            )}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="de">
      <body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
        <div style="max-width:720px;margin:0 auto;padding:32px 16px;">
          <div style="background:#111827;padding:24px;border-radius:16px 16px 0 0;color:white;">
            <div style="font-size:12px;letter-spacing:3px;color:#67e8f9;">
              HEXA CLEAN
            </div>

            <h1 style="margin:10px 0 0;font-size:26px;">
              Rechnung ${escapeHtml(payload.invoiceNumber)}
            </h1>
          </div>

          <div style="background:white;padding:28px;border-radius:0 0 16px 16px;">
            <p>
              Guten Tag ${escapeHtml(payload.customerName)}
            </p>

            <p>
              Vielen Dank für Ihren Auftrag. Sie erhalten hiermit
              Ihre Rechnung von HEXA CLEAN.
            </p>

            <table style="width:100%;margin:24px 0;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;color:#6b7280;">
                  Rechnungsdatum
                </td>

                <td style="padding:6px 0;text-align:right;font-weight:700;">
                  ${escapeHtml(formatDate(payload.issueDate))}
                </td>
              </tr>

              <tr>
                <td style="padding:6px 0;color:#6b7280;">
                  Zahlbar bis
                </td>

                <td style="padding:6px 0;text-align:right;font-weight:700;">
                  ${escapeHtml(formatDate(payload.dueDate))}
                </td>
              </tr>
            </table>

            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:12px;text-align:left;">
                    Leistung
                  </th>

                  <th style="padding:12px;text-align:right;">
                    Menge
                  </th>

                  <th style="padding:12px;text-align:right;">
                    Preis
                  </th>

                  <th style="padding:12px;text-align:right;">
                    Betrag
                  </th>
                </tr>
              </thead>

              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <table style="width:100%;margin-top:22px;border-collapse:collapse;">
              <tr>
                <td style="padding:5px 0;color:#6b7280;">
                  Zwischensumme
                </td>

                <td style="padding:5px 0;text-align:right;">
                  ${escapeHtml(
                    formatMoney(
                      payload.subtotal,
                      payload.currency,
                    ),
                  )}
                </td>
              </tr>

              <tr>
                <td style="padding:5px 0;color:#6b7280;">
                  Steuerbetrag
                </td>

                <td style="padding:5px 0;text-align:right;">
                  ${escapeHtml(
                    formatMoney(
                      payload.taxAmount,
                      payload.currency,
                    ),
                  )}
                </td>
              </tr>

              <tr>
                <td style="padding:14px 0 5px;font-size:18px;font-weight:700;">
                  Gesamtbetrag
                </td>

                <td style="padding:14px 0 5px;text-align:right;font-size:22px;font-weight:800;color:#0891b2;">
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
              Bei Fragen antworten Sie bitte direkt auf diese E-Mail.
            </p>

            <p style="margin-top:28px;">
              Freundliche Grüsse<br />
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
