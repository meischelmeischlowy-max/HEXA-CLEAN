import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const pageSource = fs.readFileSync(
  "src/app/dashboard/orders/[id]/page.tsx",
  "utf8",
);

const buttonSource = fs.readFileSync(
  "src/components/dashboard/MarkOrderAsCompletedButton.tsx",
  "utf8",
);

const routeSource = fs.readFileSync(
  "src/app/api/dashboard/orders/[id]/mark-completed/route.ts",
  "utf8",
);

const repositorySource = fs.readFileSync(
  "src/repositories/dashboardRepository.ts",
  "utf8",
);

describe(
  "E17.17 completion invoice workspace",
  () => {
    it(
      "keeps automatic invoice creation and email delivery",
      () => {
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

    it(
      "keeps invoice creation idempotent",
      () => {
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

    it(
      "explains the automatic completion action",
      () => {
        expect(buttonSource).toContain(
          "Die Rechnung wird automatisch erstellt und per E-Mail versendet.",
        );

        expect(buttonSource).toContain(
          "Auftrag abschliessen",
        );

        expect(buttonSource).toContain(
          "result.message ??",
        );
      },
    );

    it(
      "opens the invoice after order completion",
      () => {
        expect(pageSource).toContain(
          "const latestInvoice = invoices[0] ?? null;",
        );

        expect(pageSource).toContain(
          "completed && latestInvoice?.id",
        );

        expect(pageSource).toContain(
          "Rechnung \u00f6ffnen",
        );

        expect(pageSource).toContain(
          "Rechnung pr\u00fcfen",
        );

        expect(pageSource).toContain(
          'label="Rechnung"',
        );
      },
    );

    it(
      "hides obsolete lead labels after review",
      () => {
        expect(pageSource).toContain(
          "quickOffer && reviewRequired",
        );

        expect(pageSource).toContain(
          "chatbot && reviewRequired",
        );
      },
    );

    it(
      "keeps the screen operationally focused",
      () => {
        expect(pageSource).toContain(
          "Kunde, Termin, Fotos und Abrechnung auf einen Blick.",
        );

        expect(pageSource).not.toContain(
          "Vollst\u00e4ndige Ansicht des Auftrags:",
        );
      },
    );
  },
);
