import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildQuoteEmailHtml,
  buildQuoteEmailSubject,
  buildQuoteEmailText,
  quoteNotificationMatches,
} from "./quote-email";

const payload = {
  quoteNumber:
    "QUO-20260721-1254",
  customerName: "Stefen",
  total: 295,
  currency: "CHF",
  publicUrl:
    "https://www.hexaclean.ch/public/offers/secret-token",
  validUntil:
    "2026-08-04T00:00:00.000Z",
};

describe("quote email", () => {
  it("builds the subject", () => {
    expect(
      buildQuoteEmailSubject(
        payload.quoteNumber,
      ),
    ).toBe(
      "Ihre Offerte QUO-20260721-1254 von HEXA CLEAN",
    );
  });

  it("contains the customer link in text", () => {
    const text =
      buildQuoteEmailText(payload);

    expect(text).toContain(
      payload.publicUrl,
    );

    expect(text).toContain(
      "295",
    );

    expect(text).toContain(
      "akzeptieren oder ablehnen",
    );
  });

  it("contains the customer link in html", () => {
    const html =
      buildQuoteEmailHtml(payload);

    expect(html).toContain(
      `href="${payload.publicUrl}"`,
    );

    expect(html).toContain(
      "Offerte öffnen",
    );
  });

  it("escapes customer-facing values", () => {
    const html =
      buildQuoteEmailHtml({
        ...payload,
        customerName:
          '<script>alert("x")</script>',
      });

    expect(html).not.toContain(
      "<script>",
    );

    expect(html).toContain(
      "&lt;script&gt;",
    );
  });

  it("matches only automatic quote notifications", () => {
    expect(
      quoteNotificationMatches(
        {
          source:
            "automatic_quote_email",
          quoteId: "quote-1",
        },
        "quote-1",
      ),
    ).toBe(true);

    expect(
      quoteNotificationMatches(
        {
          source:
            "automatic_invoice_email",
          quoteId: "quote-1",
        },
        "quote-1",
      ),
    ).toBe(false);

    expect(
      quoteNotificationMatches(
        null,
        "quote-1",
      ),
    ).toBe(false);
  });
});
