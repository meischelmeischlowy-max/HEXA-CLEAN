import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildPaymentConfirmationHtml,
  buildPaymentConfirmationSubject,
  buildPaymentConfirmationText,
  paymentConfirmationMetadataMatches,
} from "@/lib/payment-confirmation-email";

const invoicePaymentsRoute =
  fs.readFileSync(
    "src/app/api/dashboard/invoices/[id]/payments/route.ts",
    "utf8",
  );

const paymentsRoute =
  fs.readFileSync(
    "src/app/api/dashboard/payments/route.ts",
    "utf8",
  );

const markPaidRoute =
  fs.readFileSync(
    "src/app/api/dashboard/payments/[id]/mark-paid/route.ts",
    "utf8",
  );

const serviceSource =
  fs.readFileSync(
    "src/lib/payment-confirmation-service.ts",
    "utf8",
  );

describe(
  "E15 automatic payment confirmation",
  () => {
    it(
      "matches only the exact invoice confirmation metadata",
      () => {
        expect(
          paymentConfirmationMetadataMatches(
            {
              source:
                "automatic_payment_confirmation",
              type:
                "customer_payment_confirmation",
              invoiceId:
                "invoice-1",
            },
            "invoice-1",
          ),
        ).toBe(true);

        expect(
          paymentConfirmationMetadataMatches(
            {
              source:
                "automatic_payment_confirmation",
              type:
                "customer_payment_confirmation",
              invoiceId:
                "invoice-2",
            },
            "invoice-1",
          ),
        ).toBe(false);
      },
    );

    it(
      "builds customer-facing confirmation content",
      () => {
        const payload = {
          invoiceNumber:
            "INV-20260721-1000",
          customerName:
            "Test Kunde",
          amount:
            "208.00",
          currency:
            "CHF",
          paidAt:
            "21.07.2026, 18:30",
        };

        expect(
          buildPaymentConfirmationSubject(
            payload.invoiceNumber,
          ),
        ).toContain(
          payload.invoiceNumber,
        );

        expect(
          buildPaymentConfirmationText(
            payload,
          ),
        ).toContain(
          "vollständigen Zahlungseingang",
        );

        expect(
          buildPaymentConfirmationHtml(
            payload,
          ),
        ).toContain(
          "208.00 CHF",
        );
      },
    );

    it(
      "uses notification metadata for idempotency",
      () => {
        expect(serviceSource).toContain(
          "paymentConfirmationMetadataMatches",
        );

        expect(serviceSource).toContain(
          "alreadySent: true",
        );

        expect(serviceSource).toContain(
          "automatic_payment_confirmation",
        );
      },
    );

    it(
      "sends only for a PAID invoice",
      () => {
        expect(serviceSource).toContain(
          "InvoiceStatus.PAID",
        );

        expect(serviceSource).toContain(
          "resend.emails.send",
        );

        expect(serviceSource).toContain(
          "NotificationStatus.SENT",
        );
      },
    );

    it(
      "records missing email and delivery failures",
      () => {
        expect(serviceSource).toContain(
          "CUSTOMER_EMAIL_MISSING",
        );

        expect(serviceSource).toContain(
          "NotificationStatus.FAILED",
        );

        expect(serviceSource).toContain(
          "actionRequired: true",
        );
      },
    );

    it(
      "connects invoice payment creation",
      () => {
        expect(invoicePaymentsRoute).toContain(
          "sendPaymentConfirmationWorkflow",
        );

        expect(invoicePaymentsRoute).toContain(
          "paymentConfirmation",
        );
      },
    );

    it(
      "connects dashboard payment creation",
      () => {
        expect(paymentsRoute).toContain(
          "sendPaymentConfirmationWorkflow",
        );

        expect(paymentsRoute).toContain(
          "paymentConfirmation",
        );
      },
    );

    it(
      "connects mark-paid quick action",
      () => {
        expect(markPaidRoute).toContain(
          "sendPaymentConfirmationWorkflow",
        );

        expect(markPaidRoute).toContain(
          "paymentConfirmation",
        );
      },
    );
  },
);
