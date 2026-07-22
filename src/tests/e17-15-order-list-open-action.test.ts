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

describe(
  "E17.15 visible order details action",
  () => {
    it(
      "shows a visible order-open action in the first column",
      () => {
        const orderColumnStart =
          source.indexOf(
            'key: "order"',
          );

        const sourceColumnStart =
          source.indexOf(
            'key: "source"',
          );

        expect(
          orderColumnStart,
        ).toBeGreaterThanOrEqual(0);

        expect(
          sourceColumnStart,
        ).toBeGreaterThan(
          orderColumnStart,
        );

        const orderColumn =
          source.slice(
            orderColumnStart,
            sourceColumnStart,
          );

        expect(orderColumn).toContain(
          "Auftrag öffnen",
        );

        expect(orderColumn).toContain(
          "PremiumButton",
        );

        expect(orderColumn).toContain(
          "href={`/dashboard/orders/${order.id}`}",
        );
      },
    );

    it(
      "does not depend on the plain Next Link styling",
      () => {
        expect(source).not.toContain(
          'import Link from "next/link"',
        );
      },
    );
  },
);
