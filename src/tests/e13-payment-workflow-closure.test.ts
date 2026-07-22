import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getInvoiceAction,
  getOrderAction,
} from "@/lib/dashboard/next-action";

const invoiceStatusSource =
  fs.readFileSync(
    "src/lib/dashboard/invoice-status.ts",
    "utf8",
  );

const invoicePaymentsApiSource =
  fs.readFileSync(
    "src/app/api/dashboard/invoices/[id]/payments/route.ts",
    "utf8",
  );

const paymentsApiSource =
  fs.readFileSync(
    "src/app/api/dashboard/payments/route.ts",
    "utf8",
  );

describe(
  "E13 terminal payment workflow",
  () => {
    it(
      "keeps the existing automatic partial and full payment calculation",
      () => {
        expect(
          invoiceStatusSource,
        ).toContain(
          'status: "PARTIALLY_PAID"',
        );

        expect(
          invoiceStatusSource,
        ).toContain(
          'status: "PAID"',
        );

        expect(
          invoiceStatusSource,
        ).toContain(
          "paidAmount >= total",
        );

        expect(
          invoiceStatusSource,
        ).toContain(
          "existingPaidAt ?? now",
        );
      },
    );

    it(
      "uses real paid payments as the source of invoice state",
      () => {
        expect(
          invoicePaymentsApiSource,
        ).toContain(
          "calculatePaidPaymentsTotal",
        );

        expect(
          invoicePaymentsApiSource,
        ).toContain(
          'status: "PAID"',
        );

        expect(
          paymentsApiSource,
        ).toContain(
          "paymentStatus === \"PAID\"",
        );

        expect(
          paymentsApiSource,
        ).toContain(
          "calculateAutomatedInvoiceState",
        );
      },
    );

    it(
      "keeps a completed order open while payment remains outstanding",
      () => {
        const action = getOrderAction({
          id: "order-open",
          status: "COMPLETED",
          hasInvoice: true,
          hasOpenInvoice: true,
          hasPaidInvoice: false,
        });

        expect(action).toMatchObject({
          label: "Zahlung offen",
          title: "Zahlungseingang abwarten",
          tone: "amber",
          owner: "invoice",
          primaryLabel: "Rechnung prüfen",
        });
      },
    );

    it(
      "closes a completed order after the invoice is fully paid",
      () => {
        const action = getOrderAction({
          id: "order-closed",
          status: "COMPLETED",
          hasInvoice: true,
          hasOpenInvoice: false,
          hasPaidInvoice: true,
        });

        expect(action).toMatchObject({
          label: "Abgeschlossen",
          title: "Vorgang abgeschlossen",
          tone: "green",
          owner: "order",
          primaryLabel: "Details ansehen",
        });

        expect(
          action.description,
        ).toContain(
          "keine weitere Aktion",
        );
      },
    );

    it(
      "treats a paid invoice as a terminal non-action state",
      () => {
        const action = getInvoiceAction({
          id: "invoice-paid",
          status: "PAID",
          total: 208,
          paidAmount: 208,
          isOverdue: false,
        });

        expect(action).toMatchObject({
          label: "Bezahlt",
          title:
            "Zahlungsworkflow abgeschlossen",
          tone: "green",
          owner: "invoice",
          primaryLabel: "Details ansehen",
        });

        expect(
          action.description,
        ).toContain(
          "keine weitere Aktion",
        );
      },
    );

    it(
      "keeps partial payment actionable",
      () => {
        const action = getInvoiceAction({
          id: "invoice-partial",
          status: "PARTIALLY_PAID",
          total: 208,
          paidAmount: 100,
          isOverdue: false,
        });

        expect(action).toMatchObject({
          label: "Teilzahlung",
          title: "Zahlung prüfen",
          tone: "amber",
          primaryLabel: "Zahlung prüfen",
        });
      },
    );

    it(
      "keeps missing invoice as an action-required state",
      () => {
        const action = getOrderAction({
          id: "order-no-invoice",
          status: "COMPLETED",
          hasInvoice: false,
          hasOpenInvoice: false,
          hasPaidInvoice: false,
        });

        expect(action).toMatchObject({
          label: "Rechnung fehlt",
          title: "Rechnung erstellen",
          tone: "amber",
          owner: "invoice",
        });
      },
    );
  },
);
