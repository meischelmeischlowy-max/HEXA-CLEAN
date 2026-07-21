import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationSubject,
  buildOrderConfirmationText,
  createOrderConfirmationPdf,
  extractOrderConfirmationItems,
} from "./order-confirmation-document";

const payload = {
  orderNumber:
    "JOB-20260721-9045",
  quoteNumber:
    "QUO-20260721-1254",
  customerName: "Stefen",
  customerAddress: [
    "Teststrasse 1",
    "2500 Biel",
    "CH",
  ],
  serviceAddress: [
    "Serviceweg 2",
    "2502 Biel",
    "CH",
  ],
  serviceTitle:
    "QuickOffer: Wohnung",
  serviceType: "REINIGUNG",
  total: 295,
  currency: "CHF",
  acceptedAt:
    new Date(
      "2026-07-21T05:38:00.000Z",
    ),
  scheduledStart: null,
  items: [
    {
      name:
        "QuickOffer: Wohnung",
      description:
        "Zusatzleistungen: Fenster",
      quantity: "100",
      unit: "M2",
      unitPrice: "2.95",
      total: "295.00",
    },
  ],
};

describe(
  "order confirmation document",
  () => {
    it(
      "builds the email subject",
      () => {
        expect(
          buildOrderConfirmationSubject(
            payload.orderNumber,
          ),
        ).toBe(
          "Auftragsbestätigung JOB-20260721-9045 von HEXA CLEAN",
        );
      },
    );

    it(
      "builds customer-facing email content",
      () => {
        const text =
          buildOrderConfirmationText(
            payload,
          );

        expect(text).toContain(
          payload.orderNumber,
        );

        expect(text).toContain(
          payload.quoteNumber,
        );

        expect(text).toContain(
          "separat bestätigt",
        );

        const html =
          buildOrderConfirmationHtml(
            payload,
          );

        expect(html).toContain(
          "Auftrag angenommen",
        );

        expect(html).toContain(
          payload.orderNumber,
        );
      },
    );

    it(
      "extracts items from stored quote JSON",
      () => {
        const items =
          extractOrderConfirmationItems({
            source:
              "estimate-quote-api",
            items: [
              {
                name: "Reinigung",
                quantity: "10",
                unit: "M2",
                total: "100.00",
              },
            ],
          });

        expect(items).toHaveLength(1);

        expect(
          items[0],
        ).toMatchObject({
          name: "Reinigung",
          quantity: "10",
          unit: "M2",
          total: "100.00",
        });
      },
    );

    it(
      "creates a real PDF byte stream",
      async () => {
        const bytes =
          await createOrderConfirmationPdf(
            payload,
          );

        expect(
          bytes.length,
        ).toBeGreaterThan(1000);

        expect(
          Buffer.from(
            bytes.slice(0, 5),
          ).toString("ascii"),
        ).toBe("%PDF-");
      },
    );
  },
);
