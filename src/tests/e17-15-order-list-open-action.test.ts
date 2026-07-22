import fs from "node:fs";
import path from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/dashboard/orders/page.tsx",
  ),
  "utf8",
);

function countFragment(
  value: string,
  fragment: string,
) {
  return value.split(fragment).length - 1;
}

describe(
  "E17.15 visible order action",
  () => {
    it(
      "keeps exactly one action inside every order card",
      () => {
        const cardStart = source.indexOf(
          "function OrderQueueCard",
        );

        const cardEnd = source.indexOf(
          "export default function DashboardOrdersPage",
        );

        expect(cardStart).toBeGreaterThanOrEqual(0);
        expect(cardEnd).toBeGreaterThan(cardStart);

        const cardSource = source.slice(
          cardStart,
          cardEnd,
        );

        expect(
          countFragment(
            cardSource,
            "<PremiumButton",
          ),
        ).toBe(1);

        expect(cardSource).toContain(
          "getOrderAction(order)",
        );

        expect(cardSource).toContain(
          "href={action.href}",
        );

        expect(cardSource).toContain(
          "{action.label}",
        );
      },
    );

    it(
      "routes every workflow action to the correct work area",
      () => {
        expect(source).toContain(
          'label: "Anfrage prüfen"',
        );

        expect(source).toContain(
          'label: "Offerte senden"',
        );

        expect(source).toContain(
          'label: "Termin planen"',
        );

        expect(source).toContain(
          'label: "Auftrag abschliessen"',
        );

        expect(source).toContain(
          'href: orderHref',
        );

        expect(source).toContain(
          'href: estimateHref',
        );
      },
    );
  },
);