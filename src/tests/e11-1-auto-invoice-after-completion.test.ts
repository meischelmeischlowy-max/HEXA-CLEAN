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

const repositorySource =
  fs.readFileSync(
    "src/repositories/dashboardRepository.ts",
    "utf8",
  );

describe(
  "E11.1 automatic invoice after completion",
  () => {
    it(
      "completes the order before invoice automation",
      () => {
        expect(routeSource).toContain(
          "markOrderAsCompleted(id)",
        );

        expect(routeSource).toContain(
          "QuoteStatus.ACCEPTED",
        );

        expect(routeSource).toContain(
          "orderId: id",
        );
      },
    );

    it(
      "uses the existing idempotent invoice-from-quote workflow",
      () => {
        expect(routeSource).toContain(
          "dashboardRepository",
        );

        expect(routeSource).toContain(
          ".createInvoiceFromQuote(",
        );

        expect(routeSource).toContain(
          "invoiceResult.created",
        );

        expect(routeSource).toContain(
          '"CREATED"',
        );

        expect(routeSource).toContain(
          '"EXISTING"',
        );
      },
    );

    it(
      "does not silently ignore a missing accepted quote",
      () => {
        expect(routeSource).toContain(
          '"NO_ACCEPTED_QUOTE"',
        );

        expect(routeSource).toContain(
          "actionRequired: true",
        );

        expect(routeSource).toContain(
          'actorType:\n            "invoice_automation"',
        );
      },
    );

    it(
      "keeps invoice creation idempotent in the repository",
      () => {
        expect(repositorySource).toContain(
          "async createInvoiceFromQuote(quoteId: string)",
        );

        expect(repositorySource).toContain(
          "existingInvoice",
        );

        expect(repositorySource).toContain(
          "created: false",
        );

        expect(repositorySource).toContain(
          "created: true",
        );
      },
    );
  },
);
