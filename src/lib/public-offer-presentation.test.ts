import { describe, expect, it } from "vitest";

import {
  extractPublicOfferItems,
  normalizePublicOfferItems,
  sanitizePublicCustomerNote,
} from "./public-offer-presentation";

describe("public offer presentation", () => {
  it("reads offer items from the nested JSON structure stored by Quote", () => {
    const storedValue = {
      items: [
        {
          name: "QuickOffer: Wohnung",
          description: "Keine Zusatzleistungen ausgewählt.",
          quantity: "80",
          unitPrice: "2.60",
          subtotal: "208.00",
          total: "208.00",
        },
      ],
    };

    expect(extractPublicOfferItems(storedValue)).toHaveLength(1);

    expect(normalizePublicOfferItems(storedValue)).toEqual([
      {
        name: "QuickOffer: Wohnung",
        description: "Keine Zusatzleistungen ausgewählt.",
        quantity: "80",
        unitPrice: "2.60",
        subtotal: "208.00",
        total: "208.00",
      },
    ]);
  });

  it("still supports a direct array of offer items", () => {
    expect(
      normalizePublicOfferItems([
        {
          name: "Fensterreinigung",
          quantity: 4,
          unitPrice: 25,
          subtotal: 100,
          total: 100,
        },
      ]),
    ).toEqual([
      {
        name: "Fensterreinigung",
        description: null,
        quantity: "4",
        unitPrice: "25",
        subtotal: "100",
        total: "100",
      },
    ]);
  });

  it("removes all internal estimate references from customer notes", () => {
    const notes = [
      "Quote generated from estimate EST-20260720-9365.",
      "Estimate ID: 52570083-8dd1-4ee8-a296-3106418f1e74",
      "Customer notes: Interne Preisprüfung erforderlich.",
    ].join("\n");

    expect(sanitizePublicCustomerNote(notes)).toBeNull();
  });

  it("keeps only safe customer-facing note lines", () => {
    const notes = [
      "Quote generated from estimate EST-1.",
      "Estimate ID: internal-id",
      "Customer notes: internal text",
      "Die Reinigung umfasst die vereinbarten Räume.",
      "Bitte Zugang zum Objekt sicherstellen.",
    ].join("\n");

    expect(sanitizePublicCustomerNote(notes)).toBe(
      [
        "Die Reinigung umfasst die vereinbarten Räume.",
        "Bitte Zugang zum Objekt sicherstellen.",
      ].join("\n"),
    );
  });
});
