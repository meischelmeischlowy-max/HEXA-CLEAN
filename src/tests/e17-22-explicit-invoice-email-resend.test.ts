import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const serviceSource = fs.readFileSync(
  "src/lib/invoice-email-service.ts",
  "utf8",
);

const routeSource = fs.readFileSync(
  "src/app/api/dashboard/invoices/[id]/send-email/route.ts",
  "utf8",
);

const componentSource = fs.readFileSync(
  "src/components/dashboard/InvoiceEmailAction.tsx",
  "utf8",
);

describe(
  "E17.22 explicit invoice email resend",
  () => {
    it(
      "allows the service to bypass an existing sent notification",
      () => {
        expect(serviceSource).toContain(
          "force?: boolean;",
        );

        expect(serviceSource).toContain(
          "options.force",
        );

        expect(serviceSource).toContain(
          "? null",
        );

        expect(serviceSource).toContain(
          "findSentInvoiceNotification(",
        );
      },
    );

    it(
      "reads the explicit force flag in the API route",
      () => {
        expect(routeSource).toContain(
          "body.force === true",
        );

        expect(routeSource).toContain(
          "force,",
        );

        expect(routeSource).toContain(
          "sendInvoiceEmailWorkflow(",
        );
      },
    );

    it(
      "forces a real resend when the invoice status is SENT",
      () => {
        expect(componentSource).toContain(
          'force: status === "SENT"',
        );

        expect(componentSource).toContain(
          "JSON.stringify({",
        );

        expect(componentSource).toContain(
          '"Rechnung erneut senden"',
        );
      },
    );

    it(
      "does not change the invoice status manually",
      () => {
        expect(componentSource).not.toContain(
          'method: "PATCH"',
        );

        expect(componentSource).not.toContain(
          'status: "SENT"',
        );
      },
    );
  },
);