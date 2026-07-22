import {
  readFileSync,
} from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

function source(path: string) {
  return readFileSync(
    path,
    "utf8",
  );
}

describe(
  "E17.6B+C public slot booking",
  () => {
    it(
      "loads only future available unassigned slots",
      () => {
        const page = source(
          "src/app/public/offers/[token]/page.tsx",
        );

        expect(page).toContain(
          "prisma.availabilitySlot.findMany",
        );
        expect(page).toContain(
          'status: "AVAILABLE"',
        );
        expect(page).toContain(
          "orderId: null",
        );
        expect(page).toContain(
          "PublicOfferScheduleDecision",
        );
      },
    );

    it(
      "requires appointment selection in the public UI",
      () => {
        const component = source(
          "src/components/public/PublicOfferScheduleDecision.tsx",
        );

        expect(component).toContain(
          "availabilitySlotId:",
        );
        expect(component).toContain(
          "Offerte und Termin verbindlich bestaetigen",
        );
        expect(component).toContain(
          "accept-with-slot",
        );
      },
    );

    it(
      "books the slot and schedules the order atomically",
      () => {
        const route = source(
          "src/app/api/public/offers/[token]/accept-with-slot/route.ts",
        );

        expect(route).toContain(
          ".$transaction(",
        );
        expect(route).toContain(
          "tx.availabilitySlot.updateMany",
        );
        expect(route).toContain(
          "AvailabilitySlotStatus.BOOKED",
        );
        expect(route).toContain(
          "OrderStatus.SCHEDULED",
        );
        expect(route).toContain(
          "const orderId = link.quote.orderId;",
        );
        expect(route).toContain(
          "SLOT_NOT_AVAILABLE",
        );
      },
    );

    it(
      "runs confirmation automation only after the transaction",
      () => {
        const route = source(
          "src/app/api/public/offers/[token]/accept-with-slot/route.ts",
        );

        const transactionIndex =
          route.indexOf(
            ".$transaction(",
          );
        const automationIndex =
          route.indexOf(
            "await sendOrderConfirmationWorkflow",
          );

        expect(
          transactionIndex,
        ).toBeGreaterThan(-1);
        expect(
          automationIndex,
        ).toBeGreaterThan(
          transactionIndex,
        );
      },
    );
  },
);
