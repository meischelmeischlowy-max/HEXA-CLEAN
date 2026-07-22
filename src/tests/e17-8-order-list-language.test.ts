import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const ordersPage = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "dashboard",
    "orders",
    "page.tsx",
  ),
  "utf8",
);

const orderDetails = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "dashboard",
    "orders",
    "[id]",
    "page.tsx",
  ),
  "utf8",
);

const auditPage = fs.readFileSync(
  path.join(
    root,
    "src",
    "app",
    "dashboard",
    "audit-logs",
    "page.tsx",
  ),
  "utf8",
);

describe(
  "E17.8 order list navigation and German UI",
  () => {
    it(
      "keeps the visible order title beside the single workflow action",
      () => {
        expect(
          ordersPage,
        ).toContain(
          "const orderHref =",
        );

        expect(
          ordersPage,
        ).toContain(
          "getOrderTitle(order)",
        );
      },
    );

    it(
      "uses German status labels",
      () => {
        expect(
          orderDetails,
        ).toContain(
          'NEW: "Neu"',
        );

        expect(
          orderDetails,
        ).toContain(
          'SCHEDULED: "Geplant"',
        );

        expect(
          orderDetails,
        ).toContain(
          'WAITING_FOR_CUSTOMER: "Wartet auf Kunden"',
        );

        expect(
          orderDetails,
        ).toContain(
          'CANCELLED: "Storniert"',
        );
      },
    );

    it(
      "removes known Polish order UI strings",
      () => {
        const forbidden = [
          "Powizan wycen",
          "Wiadomo klienta",
          "Sprawd kontakt",
          "Zlecenie wurde",
          "Chatbot-Wycena",
          'NEW: "Nowe"',
          'SCHEDULED: "Zaplanowane"',
          'CANCELLED: "Anulowane"',
        ];

        for (
          const value
          of forbidden
        ) {
          expect(
            orderDetails,
          ).not.toContain(
            value,
          );
        }

        expect(
          auditPage,
        ).not.toContain(
          "Zmiana statusu",
        );
      },
    );
  },
);
