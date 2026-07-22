import { describe, expect, it } from "vitest";

import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
  buildInvoiceEmailText,
  invoiceNotificationMatches,
  sanitizeInvoiceCustomerText,
  type InvoiceEmailPayload,
} from "./invoice-email";

const payload: InvoiceEmailPayload = {
  invoiceNumber: "INV-20260720-8311",
  customerName: "Stefen",
  issueDate: new Date("2026-07-20T00:00:00.000Z"),
  dueDate: new Date("2026-08-03T00:00:00.000Z"),
  currency: "CHF",
  subtotal: 208,
  taxAmount: 0,
  total: 208,
  items: [
    {
      name: "QuickOffer: Wohnung",
      description: "Keine Zusatzleistungen ausgewählt.",
      quantity: 80,
      unit: "m²",
      unitPrice: 2.6,
      total: 208,
    },
  ],
};

describe("invoice customer email", () => {
  it("creates a correct customer subject", () => {
    expect(
      buildInvoiceEmailSubject(payload.invoiceNumber),
    ).toBe(
      "Ihre Rechnung INV-20260720-8311 von HEXA CLEAN",
    );
  });

  it("contains invoice number, position and amount", () => {
    const text = buildInvoiceEmailText(payload);

    expect(text).toContain("INV-20260720-8311");
    expect(text).toContain("QuickOffer: Wohnung");
    expect(text).toContain("208.00");
  });

  it("creates customer-safe HTML", () => {
    const html = buildInvoiceEmailHtml(payload);

    expect(html).toContain("QuickOffer: Wohnung");
    expect(html).toContain("HEXA CLEAN");
    expect(html).not.toContain("Estimate ID:");
    expect(html).not.toContain("Session ID:");
    expect(html).not.toContain("Customer notes:");
  });

  it("removes internal references and UUID values", () => {
    const value = [
      "Normale Kundeninformation",
      "Estimate ID: 123",
      "Customer notes: intern",
      "CRM ID: abc",
      "Session ID: xyz",
      "8cd9f103-bf7f-4789-b3b5-b872c02047f4",
    ].join("\n");

    expect(
      sanitizeInvoiceCustomerText(value),
    ).toBe("Normale Kundeninformation");
  });

  it("does not include arbitrary invoice notes", () => {
    const html = buildInvoiceEmailHtml(payload);
    const text = buildInvoiceEmailText(payload);

    expect(html).not.toContain(
      "internal technical note",
    );

    expect(text).not.toContain(
      "internal technical note",
    );
  });
  it("creates a mobile-safe responsive invoice layout", () => {
    const html = buildInvoiceEmailHtml(payload);

    expect(html).toContain(
      'name="viewport"',
    );

    expect(html).toContain(
      "overflow-wrap:anywhere",
    );

    expect(html).toContain(
      "table-layout:fixed",
    );

    expect(html).toContain(
      "Einzelpreis",
    );

    expect(html).toContain(
      "Betrag",
    );

    expect(html).not.toContain(
      "white-space:nowrap",
    );

    expect(html).not.toContain(
      "<thead>",
    );
  });
});

describe("invoice notification matching", () => {
  it("matches a sent notification to the exact invoice", () => {
    expect(
      invoiceNotificationMatches(
        {
          source:
            "automatic_invoice_email",
          invoiceId:
            "invoice-123",
        },
        "invoice-123",
      ),
    ).toBe(true);
  });

  it("rejects notifications belonging to another invoice", () => {
    expect(
      invoiceNotificationMatches(
        {
          invoiceId:
            "invoice-other",
        },
        "invoice-123",
      ),
    ).toBe(false);

    expect(
      invoiceNotificationMatches(
        null,
        "invoice-123",
      ),
    ).toBe(false);
  });
});
