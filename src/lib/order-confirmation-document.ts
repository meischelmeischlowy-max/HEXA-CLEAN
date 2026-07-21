import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import {
  companyConfig,
} from "@/config/company";

export type OrderConfirmationItem = {
  name: string;
  description?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  unitPrice?: string | number | null;
  total?: string | number | null;
};

export type OrderConfirmationPayload = {
  orderNumber: string;
  quoteNumber: string;
  customerName: string;
  customerAddress?: string[];
  serviceAddress?: string[];
  serviceTitle: string;
  serviceType?: string | null;
  total: number;
  currency: string;
  acceptedAt: Date;
  scheduledStart?: Date | null;
  items: OrderConfirmationItem[];
};

function numberValue(
  value: unknown,
) {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(
      value.toString(),
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  const parsed = Number(
    value ?? 0,
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function cleanCurrency(
  value: string,
) {
  const currency = value
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(
    currency,
  )
    ? currency
    : "CHF";
}

function formatMoney(
  value: unknown,
  currency: string,
) {
  return new Intl.NumberFormat(
    "de-CH",
    {
      style: "currency",
      currency:
        cleanCurrency(currency),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(
    numberValue(value),
  );
}

function formatDate(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "long",
    },
  ).format(value);
}

function formatDateTime(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone:
        "Europe/Zurich",
    },
  ).format(value);
}

function escapeHtml(
  value: unknown,
) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pdfSafeText(
  value: unknown,
) {
  return String(value ?? "")
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replaceAll("²", "2")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .normalize("NFKD")
    .replace(
      /[^\x20-\x7E]/g,
      "",
    )
    .trim();
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
) {
  const words =
    pdfSafeText(text)
      .split(/\s+/)
      .filter(Boolean);

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;

    if (
      font.widthOfTextAtSize(
        candidate,
        fontSize,
      ) <= maxWidth
    ) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0
    ? lines
    : [""];
}

function drawWrappedText({
  page,
  font,
  text,
  x,
  y,
  fontSize,
  maxWidth,
  lineHeight,
  color,
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  maxWidth: number;
  lineHeight: number;
  color: ReturnType<typeof rgb>;
}) {
  const lines = wrapText(
    text,
    font,
    fontSize,
    maxWidth,
  );

  lines.forEach(
    (line, index) => {
      page.drawText(line, {
        x,
        y:
          y -
          index * lineHeight,
        size: fontSize,
        font,
        color,
      });
    },
  );

  return (
    y -
    lines.length * lineHeight
  );
}

function companyLines() {
  return [
    companyConfig.legalName ||
      companyConfig.name,
    companyConfig.street,
    [
      companyConfig.zipCode,
      companyConfig.city,
    ]
      .filter(Boolean)
      .join(" "),
    companyConfig.country,
    companyConfig.email,
    companyConfig.phone,
    companyConfig.website,
    companyConfig.mwst.registered &&
    companyConfig.mwst.uid
      ? `MWST-Nr.: ${companyConfig.mwst.uid}`
      : null,
  ].filter(
    (value): value is string =>
      Boolean(value?.trim()),
  );
}

function normalizedItems(
  items: OrderConfirmationItem[],
) {
  return items
    .filter(
      (item) =>
        Boolean(
          item.name?.trim(),
        ),
    )
    .slice(0, 12);
}

export function buildOrderConfirmationSubject(
  orderNumber: string,
) {
  return `Auftragsbestätigung ${orderNumber} von HEXA CLEAN`;
}

export function buildOrderConfirmationText(
  payload: OrderConfirmationPayload,
) {
  const executionText =
    payload.scheduledStart
      ? formatDateTime(
          payload.scheduledStart,
        )
      : "Der Ausführungstermin wird separat bestätigt.";

  return [
    `Guten Tag ${payload.customerName}`,
    "",
    `vielen Dank für die Annahme unserer Offerte ${payload.quoteNumber}.`,
    "",
    `Ihr Auftrag wurde unter der Nummer ${payload.orderNumber} zur Ausführung übernommen.`,
    "",
    `Leistung: ${payload.serviceTitle}`,
    `Auftragswert: ${formatMoney(
      payload.total,
      payload.currency,
    )}`,
    `Termin: ${executionText}`,
    "",
    "Im Anhang finden Sie Ihre Auftragsbestätigung als PDF.",
    "",
    "Freundliche Grüsse",
    companyConfig.name ||
      "HEXA CLEAN",
    ...companyLines().slice(1),
  ].join("\n");
}

export function buildOrderConfirmationHtml(
  payload: OrderConfirmationPayload,
) {
  const executionText =
    payload.scheduledStart
      ? formatDateTime(
          payload.scheduledStart,
        )
      : "Wird separat bestätigt";

  const companyFooter =
    companyLines()
      .map(escapeHtml)
      .join("<br />");

  return `
    <div style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #cbd5e1;border-radius:18px;overflow:hidden;">
        <div style="padding:26px 30px;background:#062f33;color:#ffffff;">
          <div style="font-size:12px;font-weight:700;letter-spacing:3px;color:#67e8f9;">
            HEXA CLEAN
          </div>
          <h1 style="margin:12px 0 0;font-size:27px;line-height:1.25;">
            Auftrag angenommen
          </h1>
        </div>

        <div style="padding:30px;">
          <p style="margin:0 0 18px;line-height:1.7;">
            Guten Tag ${escapeHtml(
              payload.customerName,
            )}
          </p>

          <p style="margin:0 0 22px;line-height:1.7;color:#334155;">
            Vielen Dank für die Annahme unserer Offerte
            <strong>${escapeHtml(
              payload.quoteNumber,
            )}</strong>.
            Ihr Auftrag wurde zur Ausführung übernommen.
          </p>

          <table style="width:100%;margin:0 0 26px;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
            <tr>
              <td style="padding:12px 0;color:#64748b;">Auftrag</td>
              <td style="padding:12px 0;text-align:right;font-weight:700;">
                ${escapeHtml(
                  payload.orderNumber,
                )}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#64748b;">Leistung</td>
              <td style="padding:12px 0;text-align:right;font-weight:700;">
                ${escapeHtml(
                  payload.serviceTitle,
                )}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#64748b;">Auftragswert</td>
              <td style="padding:12px 0;text-align:right;font-weight:700;">
                ${escapeHtml(
                  formatMoney(
                    payload.total,
                    payload.currency,
                  ),
                )}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#64748b;">Ausführungstermin</td>
              <td style="padding:12px 0;text-align:right;font-weight:700;">
                ${escapeHtml(
                  executionText,
                )}
              </td>
            </tr>
          </table>

          <div style="padding:16px 18px;border-radius:12px;background:#ecfeff;border:1px solid #a5f3fc;color:#155e75;line-height:1.65;">
            Im Anhang finden Sie die Auftragsbestätigung
            <strong>${escapeHtml(
              payload.orderNumber,
            )}</strong>
            als PDF-Dokument.
          </div>
        </div>

        <div style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#475569;">
          ${companyFooter}
        </div>
      </div>
    </div>
  `;
}

export async function createOrderConfirmationPdf(
  payload: OrderConfirmationPayload,
) {
  const pdf =
    await PDFDocument.create();

  pdf.setTitle(
    `Auftragsbestaetigung ${payload.orderNumber}`,
  );

  pdf.setAuthor(
    companyConfig.name ||
      "HEXA CLEAN",
  );

  pdf.setSubject(
    `Auftragsbestaetigung zur Offerte ${payload.quoteNumber}`,
  );

  pdf.setCreator(
    "HEXA OS CRM",
  );

  pdf.setCreationDate(
    new Date(),
  );

  const regular =
    await pdf.embedFont(
      StandardFonts.Helvetica,
    );

  const bold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold,
    );

  const page =
    pdf.addPage([
      595.28,
      841.89,
    ]);

  const width =
    page.getWidth();

  const margin = 48;
  const contentWidth =
    width - margin * 2;

  page.drawRectangle({
    x: 0,
    y: 716,
    width,
    height: 126,
    color: rgb(
      0.02,
      0.18,
      0.2,
    ),
  });

  page.drawText(
    "HEXA CLEAN",
    {
      x: margin,
      y: 800,
      size: 11,
      font: bold,
      color: rgb(
        0.4,
        0.9,
        0.95,
      ),
    },
  );

  page.drawText(
    "AUFTRAGSBESTAETIGUNG",
    {
      x: margin,
      y: 758,
      size: 25,
      font: bold,
      color: rgb(
        1,
        1,
        1,
      ),
    },
  );

  page.drawText(
    pdfSafeText(
      payload.orderNumber,
    ),
    {
      x: margin,
      y: 731,
      size: 15,
      font: regular,
      color: rgb(
        0.86,
        0.96,
        0.97,
      ),
    },
  );

  let y = 685;

  page.drawText(
    "Auftragnehmer",
    {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: rgb(
        0.1,
        0.45,
        0.5,
      ),
    },
  );

  y -= 19;

  for (
    const line
    of companyLines()
  ) {
    page.drawText(
      pdfSafeText(line),
      {
        x: margin,
        y,
        size: 9.5,
        font: regular,
        color: rgb(
          0.18,
          0.22,
          0.28,
        ),
      },
    );

    y -= 14;
  }

  const customerX = 320;
  let customerY = 685;

  page.drawText(
    "Auftraggeber",
    {
      x: customerX,
      y: customerY,
      size: 10,
      font: bold,
      color: rgb(
        0.1,
        0.45,
        0.5,
      ),
    },
  );

  customerY -= 19;

  page.drawText(
    pdfSafeText(
      payload.customerName,
    ),
    {
      x: customerX,
      y: customerY,
      size: 10,
      font: bold,
      color: rgb(
        0.1,
        0.13,
        0.18,
      ),
    },
  );

  customerY -= 15;

  for (
    const line
    of payload.customerAddress ?? []
  ) {
    page.drawText(
      pdfSafeText(line),
      {
        x: customerX,
        y: customerY,
        size: 9.5,
        font: regular,
        color: rgb(
          0.18,
          0.22,
          0.28,
        ),
      },
    );

    customerY -= 14;
  }

  y = Math.min(
    y,
    customerY,
  ) - 20;

  page.drawLine({
    start: {
      x: margin,
      y,
    },
    end: {
      x:
        width - margin,
      y,
    },
    thickness: 1,
    color: rgb(
      0.82,
      0.86,
      0.9,
    ),
  });

  y -= 32;

  const fields = [
    [
      "Offerte",
      payload.quoteNumber,
    ],
    [
      "Annahme",
      formatDate(
        payload.acceptedAt,
      ),
    ],
    [
      "Status",
      "Auftrag angenommen",
    ],
    [
      "Ausfuehrungstermin",
      payload.scheduledStart
        ? formatDateTime(
            payload.scheduledStart,
          )
        : "Wird separat bestaetigt",
    ],
    [
      "Leistungsort",
      (
        payload.serviceAddress ??
        []
      ).join(", ") || "-",
    ],
  ];

  for (
    const [label, value]
    of fields
  ) {
    page.drawText(
      pdfSafeText(label),
      {
        x: margin,
        y,
        size: 9.5,
        font: regular,
        color: rgb(
          0.38,
          0.44,
          0.52,
        ),
      },
    );

    page.drawText(
      pdfSafeText(value),
      {
        x: 210,
        y,
        size: 9.5,
        font: bold,
        color: rgb(
          0.08,
          0.11,
          0.16,
        ),
      },
    );

    y -= 22;
  }

  y -= 12;

  page.drawText(
    "Leistungsumfang",
    {
      x: margin,
      y,
      size: 14,
      font: bold,
      color: rgb(
        0.04,
        0.2,
        0.23,
      ),
    },
  );

  y -= 26;

  y = drawWrappedText({
    page,
    font: bold,
    text:
      payload.serviceTitle,
    x: margin,
    y,
    fontSize: 11,
    maxWidth:
      contentWidth,
    lineHeight: 15,
    color: rgb(
      0.08,
      0.11,
      0.16,
    ),
  });

  y -= 10;

  const items =
    normalizedItems(
      payload.items,
    );

  if (items.length === 0) {
    page.drawText(
      "Leistung gemaess akzeptierter Offerte.",
      {
        x: margin,
        y,
        size: 9.5,
        font: regular,
        color: rgb(
          0.25,
          0.29,
          0.35,
        ),
      },
    );

    y -= 20;
  } else {
    for (
      const item of items
    ) {
      const quantity =
        item.quantity
          ? `${item.quantity} ${item.unit ?? ""}`.trim()
          : "";

      const total =
        item.total !== null &&
        item.total !== undefined
          ? formatMoney(
              item.total,
              payload.currency,
            )
          : "";

      const line = [
        item.name,
        quantity,
        total,
      ]
        .filter(Boolean)
        .join(" | ");

      y = drawWrappedText({
        page,
        font: regular,
        text: `- ${line}`,
        x: margin,
        y,
        fontSize: 9.5,
        maxWidth:
          contentWidth,
        lineHeight: 13,
        color: rgb(
          0.2,
          0.24,
          0.3,
        ),
      });

      if (
        item.description?.trim()
      ) {
        y = drawWrappedText({
          page,
          font: regular,
          text:
            item.description,
          x: margin + 14,
          y: y - 2,
          fontSize: 8.5,
          maxWidth:
            contentWidth - 14,
          lineHeight: 12,
          color: rgb(
            0.42,
            0.46,
            0.52,
          ),
        });
      }

      y -= 7;

      if (y < 180) {
        break;
      }
    }
  }

  y = Math.max(
    y - 8,
    135,
  );

  page.drawRectangle({
    x: margin,
    y: y - 54,
    width:
      contentWidth,
    height: 64,
    color: rgb(
      0.93,
      0.99,
      1,
    ),
    borderColor: rgb(
      0.45,
      0.86,
      0.9,
    ),
    borderWidth: 1,
  });

  page.drawText(
    "Vereinbarter Auftragswert",
    {
      x: margin + 18,
      y: y - 15,
      size: 10,
      font: regular,
      color: rgb(
        0.18,
        0.38,
        0.42,
      ),
    },
  );

  page.drawText(
    pdfSafeText(
      formatMoney(
        payload.total,
        payload.currency,
      ),
    ),
    {
      x: margin + 18,
      y: y - 39,
      size: 19,
      font: bold,
      color: rgb(
        0.02,
        0.45,
        0.52,
      ),
    },
  );

  page.drawText(
    "Die Rechnung wird erst nach Abschluss der Leistung erstellt.",
    {
      x: margin,
      y: 62,
      size: 8.5,
      font: regular,
      color: rgb(
        0.38,
        0.42,
        0.48,
      ),
    },
  );

  page.drawText(
    "Dieses Dokument wurde mit HEXA OS CRM erstellt.",
    {
      x: margin,
      y: 44,
      size: 8,
      font: regular,
      color: rgb(
        0.5,
        0.53,
        0.58,
      ),
    },
  );

  return pdf.save();
}

export function extractOrderConfirmationItems(
  value: unknown,
): OrderConfirmationItem[] {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return [];
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (
    !Array.isArray(
      record.items,
    )
  ) {
    return [];
  }

  return record.items
    .filter(
      (
        entry,
      ): entry is Record<
        string,
        unknown
      > =>
        Boolean(
          entry &&
          typeof entry ===
            "object" &&
          !Array.isArray(entry),
        ),
    )
    .map((entry) => ({
      name:
        typeof entry.name ===
        "string"
          ? entry.name.trim()
          : "Leistung",
      description:
        typeof entry.description ===
        "string"
          ? entry.description.trim()
          : null,
      quantity:
        entry.quantity as
          | string
          | number
          | null
          | undefined,
      unit:
        typeof entry.unit ===
        "string"
          ? entry.unit
          : null,
      unitPrice:
        entry.unitPrice as
          | string
          | number
          | null
          | undefined,
      total:
        (
          entry.total ??
          entry.subtotal
        ) as
          | string
          | number
          | null
          | undefined,
    }));
}
