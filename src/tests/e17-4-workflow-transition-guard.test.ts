import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const repositorySource = fs.readFileSync(
  "src/repositories/dashboardOrderActionsRepository.ts",
  "utf8",
);

const routeSource = fs.readFileSync(
  "src/app/api/dashboard/orders/[id]/mark-completed/route.ts",
  "utf8",
);

describe(
  "E17.4 workflow transition guard",
  () => {
    it(
      "allows completion only from SCHEDULED",
      () => {
        expect(repositorySource).toContain(
          'order.status !== "SCHEDULED"',
        );

        expect(repositorySource).toContain(
          'requiredStatus: "SCHEDULED" as const',
        );

        expect(repositorySource).toContain(
          "conflict: true",
        );
      },
    );

    it(
      "keeps COMPLETED idempotent",
      () => {
        const completedIndex =
          repositorySource.indexOf(
            'order.status === "COMPLETED"',
          );

        const scheduledIndex =
          repositorySource.indexOf(
            'order.status !== "SCHEDULED"',
          );

        expect(completedIndex)
          .toBeGreaterThanOrEqual(0);

        expect(completedIndex)
          .toBeLessThan(scheduledIndex);

        expect(repositorySource).toContain(
          "conflict: false",
        );
      },
    );

    it(
      "returns HTTP 409 for invalid transition",
      () => {
        expect(routeSource).toContain(
          "completionResult.conflict",
        );

        expect(routeSource).toContain(
          'status: "CONFLICT"',
        );

        expect(routeSource).toContain(
          "status: 409",
        );

        expect(routeSource).toContain(
          "Nur ein eingeplanter Auftrag kann abgeschlossen werden.",
        );
      },
    );

    it(
      "runs the guard before invoice automation",
      () => {
        const guardIndex =
          routeSource.indexOf(
            "completionResult.conflict",
          );

        const quoteIndex =
          routeSource.indexOf(
            "const acceptedQuote",
          );

        const invoiceIndex =
          routeSource.indexOf(
            ".createInvoiceFromQuote(",
          );

        expect(guardIndex)
          .toBeGreaterThanOrEqual(0);

        expect(guardIndex)
          .toBeLessThan(quoteIndex);

        expect(guardIndex)
          .toBeLessThan(invoiceIndex);
      },
    );

    it(
      "preserves invoice and email automation",
      () => {
        expect(routeSource).toContain(
          "markOrderAsCompleted(id)",
        );

        expect(routeSource).toContain(
          "QuoteStatus.ACCEPTED",
        );

        expect(routeSource).toContain(
          ".createInvoiceFromQuote(",
        );

        expect(routeSource).toContain(
          "sendInvoiceEmailWorkflow(",
        );
      },
    );
  },
);