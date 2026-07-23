import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const source = fs.readFileSync(
  "src/app/dashboard/orders/page.tsx",
  "utf8",
);

describe(
  "E17.19 operational orders queue",
  () => {
    it(
      "removes reporting and technical clutter",
      () => {
        const forbidden = [
          "MetricCard",
          "Alle Aufträge",
          "QuickOffer",
          "Chatbot",
          'title="Wert"',
          "Auftrag erstellen",
          'href="/dashboard/customers"',
          'href="/dashboard/invoices"',
          "Lead öffnen",
          "Lead prüfen",
          ">Bearbeiten<",
          ">Rechnungen<",
          'header: "Quelle"',
          "Session:",
        ];

        for (const fragment of forbidden) {
          expect(source).not.toContain(fragment);
        }
      },
    );

    it(
      "shows only active orders",
      () => {
        expect(source).toContain(
          ".filter(isActiveOrder)",
        );

        expect(source).toContain(
          'status !== "COMPLETED"',
        );

        expect(source).toContain(
          'status !== "CANCELLED"',
        );

        expect(source).toContain(
          "const nextOrder = activeOrders[0] ?? null;",
        );

        expect(source).toContain(
          "const remainingOrders = activeOrders.slice(1);",
        );
      },
    );

    it(
      "uses clear German workflow labels",
      () => {
        expect(source).toContain(
          'return "Geplant";',
        );

        expect(source).toContain(
          'return "Zu prüfen";',
        );

        expect(source).toContain(
          'return "Offerte bereit";',
        );

        expect(source).toContain(
          'return "Termin planen";',
        );

        expect(source).toContain(
          'return "Wartet auf Kunden";',
        );
      },
    );

    it(
      "shows the next step and one action per order",
      () => {
        expect(source).toContain(
          'data-testid="orders-operational-list"',
        );

        expect(source).toContain(
          "Nächster Schritt",
        );

        expect(source).toContain(
          "Aktive Aufträge",
        );

        expect(source).toContain(
          "function OrderQueueCard",
        );

        expect(source).toContain(
          "const action = getOrderAction(order);",
        );

        expect(source).toContain(
          "href={action.href}",
        );

        expect(source).toContain(
          "{action.label}",
        );
      },
    );

    it(
      "keeps the orders page operationally focused",
      () => {
        expect(source).toContain(
          "Nur aktive Arbeit. Pro Auftrag zeigt das System genau den nächsten Schritt.",
        );

        expect(source).toContain(
          "getOrderTitle(order)",
        );

        expect(source).toContain(
          "`/dashboard/orders/${order.id}`",
        );
      },
    );
  },
);