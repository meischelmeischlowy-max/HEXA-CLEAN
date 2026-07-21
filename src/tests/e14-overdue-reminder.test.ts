import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildOverdueReminderSubject,
  buildOverdueReminderText,
  isOverdueReminderMetadata,
} from "@/lib/overdue-reminder";

const routeSource =
  fs.readFileSync(
    "src/app/api/cron/overdue-invoices/route.ts",
    "utf8",
  );

const serviceSource =
  fs.readFileSync(
    "src/lib/overdue-reminder-service.ts",
    "utf8",
  );

const vercelConfig =
  JSON.parse(
    fs.readFileSync(
      "vercel.json",
      "utf8",
    ),
  ) as {
    crons?: Array<{
      path?: string;
      schedule?: string;
    }>;
  };

describe(
  "E14 overdue invoice reminder",
  () => {
    it(
      "protects cron with CRON_SECRET",
      () => {
        expect(routeSource).toContain(
          "process.env.CRON_SECRET",
        );

        expect(routeSource).toContain(
          "`Bearer ${cronSecret}`",
        );

        expect(routeSource).toContain(
          "status: 401",
        );
      },
    );

    it(
      "registers daily cron",
      () => {
        expect(
          vercelConfig.crons,
        ).toEqual([
          {
            path:
              "/api/cron/overdue-invoices",
            schedule:
              "0 5 * * *",
          },
        ]);
      },
    );

    it(
      "matches exact invoice reminder",
      () => {
        expect(
          isOverdueReminderMetadata(
            {
              source:
                "automatic_overdue_reminder",
              type:
                "owner_overdue_invoice",
              invoiceId:
                "invoice-123",
            },
            "invoice-123",
          ),
        ).toBe(true);

        expect(
          isOverdueReminderMetadata(
            {
              source:
                "automatic_overdue_reminder",
              type:
                "owner_overdue_invoice",
              invoiceId:
                "invoice-other",
            },
            "invoice-123",
          ),
        ).toBe(false);
      },
    );

    it(
      "builds reminder content",
      () => {
        expect(
          buildOverdueReminderSubject(
            "INV-20260721-1000",
          ),
        ).toContain(
          "INV-20260721-1000",
        );

        const text =
          buildOverdueReminderText({
            invoiceNumber:
              "INV-20260721-1000",
            customerName:
              "Test Kunde",
            total:
              "208.00",
            currency:
              "CHF",
            dueDate:
              "21.07.2026",
          });

        expect(text).toContain(
          "Test Kunde",
        );

        expect(text).toContain(
          "208.00 CHF",
        );

        expect(text).toContain(
          "Mahnung",
        );
      },
    );

    it(
      "marks overdue and sends owner email",
      () => {
        expect(serviceSource).toContain(
          "InvoiceStatus.OVERDUE",
        );

        expect(serviceSource).toContain(
          "calculatePaidPaymentsTotal",
        );

        expect(serviceSource).toContain(
          "emailConfiguration.ownerEmail",
        );

        expect(serviceSource).toContain(
          "resend.emails.send",
        );
      },
    );

    it(
      "prevents duplicates",
      () => {
        expect(serviceSource).toContain(
          "isOverdueReminderMetadata",
        );

        expect(serviceSource).toContain(
          '"ALREADY_NOTIFIED"',
        );

        expect(serviceSource).toContain(
          "alreadyNotified",
        );
      },
    );

    it(
      "records failures",
      () => {
        expect(serviceSource).toContain(
          "NotificationStatus.FAILED",
        );

        expect(serviceSource).toContain(
          "actionRequired: true",
        );

        expect(routeSource).toContain(
          "result.failed > 0",
        );
      },
    );
  },
);