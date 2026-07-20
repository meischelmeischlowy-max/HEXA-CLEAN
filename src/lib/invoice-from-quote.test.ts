import {
  ServiceCatalogCategory,
  ServiceCatalogUnit,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createInvoiceItemsFromQuote,
  extractQuoteItemRecords,
  sanitizeInvoiceNoteFromQuote,
} from "./invoice-from-quote";

describe("invoice from quote", () => {
  const storedQuoteItems = {
    source: "estimate-quote-api",
    estimateId: "estimate-id",
    items: [
      {
        estimateItemId: "estimate-item-id",
        serviceCatalogItemId: null,
        serviceName: null,
        name: "QuickOffer: Wohnung",
        description: "Keine Zusatzleistungen ausgewählt.",
        category: "REINIGUNG",
        unit: "M2",
        quantity: "80.00",
        unitPrice: "2.60",
        subtotal: "208.00",
        riskMultiplier: "1.00",
        riskAmount: "0.00",
        discountAmount: "0.00",
        total: "208.00",
        sortOrder: 0,
      },
    ],
  };

  it("reads nested quote items stored by estimate quote API", () => {
    expect(
      extractQuoteItemRecords(storedQuoteItems),
    ).toHaveLength(1);
  });

  it("converts quote items into Prisma invoice items", () => {
    const items =
      createInvoiceItemsFromQuote(storedQuoteItems);

    expect(items).toHaveLength(1);

    expect(items[0]).toMatchObject({
      name: "QuickOffer: Wohnung",
      description: "Keine Zusatzleistungen ausgewählt.",
      category: ServiceCatalogCategory.REINIGUNG,
      unit: ServiceCatalogUnit.M2,
      quantity: "80.00",
      unitPrice: "2.60",
      subtotal: "208.00",
      taxRate: "0.00",
      taxAmount: "0.00",
      discountAmount: "0.00",
      total: "208.00",
      sortOrder: 0,
    });
  });

  it("uses safe fallbacks for malformed optional values", () => {
    const items = createInvoiceItemsFromQuote({
      items: [
        {
          name: "",
          category: "INVALID",
          unit: "INVALID",
          quantity: "abc",
          unitPrice: null,
          total: "25",
        },
      ],
    });

    expect(items).toHaveLength(1);

    expect(items[0]).toMatchObject({
      name: "Leistung 1",
      category: null,
      unit: ServiceCatalogUnit.FLAT,
      quantity: "1.00",
      unitPrice: "0.00",
      total: "25.00",
    });
  });

  it("removes internal estimate references from invoice notes", () => {
    const notes = [
      "Quote generated from estimate EST-20260720-9365.",
      "Estimate ID: 52570083-8dd1-4ee8-a296-3106418f1e74",
      "Customer notes: Interner Hinweis.",
    ].join("\n");

    expect(
      sanitizeInvoiceNoteFromQuote(notes),
    ).toBeNull();
  });

  it("keeps only intentionally safe invoice note lines", () => {
    const notes = [
      "Quote generated from estimate EST-1.",
      "Estimate ID: internal-id",
      "Customer notes: internal",
      "Zahlbar innerhalb von 14 Tagen.",
    ].join("\n");

    expect(
      sanitizeInvoiceNoteFromQuote(notes),
    ).toBe("Zahlbar innerhalb von 14 Tagen.");
  });
});
