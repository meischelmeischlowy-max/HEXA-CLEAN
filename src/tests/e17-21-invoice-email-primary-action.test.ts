import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const pageSource = fs.readFileSync(
  "src/app/dashboard/invoices/[id]/page.tsx",
  "utf8",
);

const actionSource = fs.readFileSync(
  "src/components/dashboard/InvoiceEmailAction.tsx",
  "utf8",
);

describe(
  "E17.21 invoice email primary action",
  () => {
    it(
      "shows one real invoice email action",
      () => {
        expect(pageSource).toContain(
          "InvoiceEmailAction",
        );

        expect(pageSource).toContain(
          "invoiceId={invoice.id}",
        );

        expect(pageSource).toContain(
          "recipient={",
        );

        expect(pageSource).not.toContain(
          'className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"',
        );
      },
    );

    it(
      "calls the real email endpoint",
      () => {
        expect(actionSource).toContain(
          "`/api/dashboard/invoices/${invoiceId}/send-email`",
        );

        expect(actionSource).toContain(
          'method: "POST"',
        );

        expect(actionSource).toContain(
          "data?.success !== true",
        );
      },
    );

    it(
      "supports the current failed invoice",
      () => {
        expect(actionSource).toContain(
          '"Rechnung erneut senden"',
        );

        expect(actionSource).toContain(
          '"Rechnung senden"',
        );

        expect(actionSource).toContain(
          "data-testid=\"invoice-email-primary-action\"",
        );
      },
    );

    it(
      "does not manually mark the invoice as sent",
      () => {
        expect(actionSource).not.toContain(
          'status: "SENT"',
        );

        expect(actionSource).not.toContain(
          'method: "PATCH"',
        );
      },
    );
  },
);