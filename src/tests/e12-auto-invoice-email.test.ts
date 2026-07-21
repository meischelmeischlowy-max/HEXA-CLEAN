import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const routeSource =
  fs.readFileSync(
    "src/app/api/dashboard/orders/[id]/mark-completed/route.ts",
    "utf8",
  );

const emailServiceSource =
  fs.readFileSync(
    "src/lib/invoice-email-service.ts",
    "utf8",
  );

describe(
  "E12 automatic invoice email after order completion",
  () => {
    it(
      "uses the existing invoice email workflow after invoice creation",
      () => {
        expect(routeSource).toContain(
          "sendInvoiceEmailWorkflow",
        );

        expect(routeSource).toContain(
          "invoiceResult.invoice.id",
        );

        expect(routeSource.indexOf(
          "createInvoiceFromQuote",
        )).toBeLessThan(
          routeSource.indexOf(
            "sendInvoiceEmailWorkflow(",
          ),
        );
      },
    );

    it(
      "reports sent, already sent and action-required states",
      () => {
        expect(routeSource).toContain(
          '"SENT"',
        );

        expect(routeSource).toContain(
          '"ALREADY_SENT"',
        );

        expect(routeSource).toContain(
          '"ACTION_REQUIRED"',
        );

        expect(routeSource).toContain(
          "actionRequired",
        );
      },
    );

    it(
      "keeps email delivery idempotent",
      () => {
        expect(emailServiceSource).toContain(
          "findSentInvoiceNotification",
        );

        expect(emailServiceSource).toContain(
          "alreadySent: true",
        );

        expect(emailServiceSource).toContain(
          "invoiceNotificationMatches",
        );
      },
    );

    it(
      "moves a successfully delivered invoice to SENT",
      () => {
        expect(emailServiceSource).toContain(
          "status: InvoiceStatus.SENT",
        );

        expect(emailServiceSource).toContain(
          "sentAt",
        );

        expect(emailServiceSource).toContain(
          "NotificationStatus.SENT",
        );
      },
    );

    it(
      "records failed delivery as action required",
      () => {
        expect(emailServiceSource).toContain(
          "recordInvoiceEmailFailure",
        );

        expect(emailServiceSource).toContain(
          "actionRequired: true",
        );

        expect(emailServiceSource).toContain(
          "NotificationStatus.FAILED",
        );
      },
    );
  },
);
