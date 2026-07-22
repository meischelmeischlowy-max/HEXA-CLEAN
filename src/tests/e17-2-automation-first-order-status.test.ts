import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const orderForm = fs.readFileSync(
  "src/components/dashboard/OrderForm.tsx",
  "utf8",
);

const newPage = fs.readFileSync(
  "src/app/dashboard/orders/new/page.tsx",
  "utf8",
);

const editPage = fs.readFileSync(
  "src/app/dashboard/orders/[id]/edit/page.tsx",
  "utf8",
);

const createRoute = fs.readFileSync(
  "src/app/api/dashboard/orders/route.ts",
  "utf8",
);

const editRoute = fs.readFileSync(
  "src/app/api/dashboard/orders/[id]/route.ts",
  "utf8",
);

const detailsPage = fs.readFileSync(
  "src/app/dashboard/orders/[id]/page.tsx",
  "utf8",
);

describe(
  "E17.2 automation-first order status",
  () => {
    it(
      "removes manual status selection",
      () => {
        expect(orderForm).not.toContain(
          "statuses.map",
        );

        expect(orderForm).not.toContain(
          'updateField("status"',
        );

        expect(orderForm).not.toContain(
          "form.status",
        );

        expect(orderForm).not.toContain(
          "statuses: string[]",
        );

        expect(orderForm).toContain(
          "Automatisch verwaltet",
        );
      },
    );

    it(
      "removes OrderStatus options from pages",
      () => {
        expect(newPage).not.toContain(
          "Object.values(OrderStatus)",
        );

        expect(editPage).not.toContain(
          "Object.values(OrderStatus)",
        );
      },
    );

    it(
      "creates manual orders as NEW",
      () => {
        expect(createRoute).toContain(
          "status: OrderStatus.NEW",
        );

        expect(createRoute).not.toContain(
          "status: cleanStatus(body.status)",
        );
      },
    );

    it(
      "blocks generic status editing",
      () => {
        expect(editRoute).not.toContain(
          "status: cleanStatus(body.status)",
        );

        expect(editRoute).not.toMatch(
          /status:\s*body\.status/,
        );
      },
    );

    it(
      "preserves workflow actions",
      () => {
        expect(detailsPage).toContain(
          "ScheduleOrderButton",
        );

        expect(detailsPage).toContain(
          "MarkOrderAsCompletedButton",
        );
      },
    );
  },
);