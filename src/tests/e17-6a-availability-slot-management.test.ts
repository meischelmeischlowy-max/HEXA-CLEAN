import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const schemaSource =
  fs.readFileSync(
    "prisma/schema.prisma",
    "utf8",
  );

const migrationSource =
  fs.readFileSync(
    "prisma/migrations/20260722111000_add_availability_slots/migration.sql",
    "utf8",
  );

const collectionRoute =
  fs.readFileSync(
    "src/app/api/dashboard/availability-slots/route.ts",
    "utf8",
  );

const itemRoute =
  fs.readFileSync(
    "src/app/api/dashboard/availability-slots/[id]/route.ts",
    "utf8",
  );

const pageSource =
  fs.readFileSync(
    "src/app/dashboard/availability/page.tsx",
    "utf8",
  );

const layoutSource =
  fs.readFileSync(
    "src/app/dashboard/layout.tsx",
    "utf8",
  );

describe(
  "E17.6A availability slot management",
  () => {
    it(
      "defines availability slots and booking relation",
      () => {
        expect(schemaSource).toContain(
          "enum AvailabilitySlotStatus",
        );

        expect(schemaSource).toContain(
          "model AvailabilitySlot",
        );

        expect(schemaSource).toContain(
          "orderId String? @unique",
        );

        expect(schemaSource).toContain(
          "@@unique([tenantKey, startAt, endAt])",
        );
      },
    );

    it(
      "creates the database migration",
      () => {
        expect(migrationSource).toContain(
          'CREATE TABLE "availability_slots"',
        );

        expect(migrationSource).toContain(
          '"AvailabilitySlotStatus"',
        );

        expect(migrationSource).toContain(
          '"availability_slots_orderId_key"',
        );
      },
    );

    it(
      "prevents overlapping time windows",
      () => {
        expect(collectionRoute).toContain(
          "overlappingSlot",
        );

        expect(collectionRoute).toContain(
          "lt: endAt",
        );

        expect(collectionRoute).toContain(
          "gt: startAt",
        );

        expect(collectionRoute).toContain(
          'status: "CONFLICT"',
        );

        expect(collectionRoute).toContain(
          "status: 409",
        );
      },
    );

    it(
      "protects booked slots",
      () => {
        expect(itemRoute).toContain(
          "AvailabilitySlotStatus.BOOKED",
        );

        expect(itemRoute).toContain(
          "Ein gebuchter Termin kann nicht manuell ge?ndert werden.",
        );

        expect(itemRoute).toContain(
          "Ein gebuchter Termin kann nicht gel?scht werden.",
        );
      },
    );

    it(
      "adds owner slot management UI",
      () => {
        expect(pageSource).toContain(
          "Freie Kundentermine",
        );

        expect(pageSource).toContain(
          "Termin ver?ffentlichen",
        );

        expect(pageSource).toContain(
          "Blockieren",
        );

        expect(pageSource).toContain(
          "Freigeben",
        );

        expect(pageSource).toContain(
          "versendet keine E-Mail",
        );
      },
    );

    it(
      "adds dashboard navigation",
      () => {
        expect(layoutSource).toContain(
          'href: "/dashboard/availability"',
        );

        expect(layoutSource).toContain(
          'label: "Termine"',
        );
      },
    );

    it(
      "does not add email delivery to slot management",
      () => {
        expect(collectionRoute).not.toContain(
          "resend.emails.send",
        );

        expect(itemRoute).not.toContain(
          "resend.emails.send",
        );
      },
    );
  },
);
