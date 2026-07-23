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
    "src/app/dashboard/availability/page.tsx",
  ),
  "utf8",
);

describe("E20.8 compact availability CRM list", () => {
  it("uses compact header and summary strip", () => {
    expect(source).toContain(
      'data-testid="availability-summary-strip"',
    );

    expect(source).toContain(
      'data-testid="availability-operational-list"',
    );

    expect(source).toContain(
      "max-w-[1600px]",
    );

    expect(source).not.toContain(
      "<table",
    );

    expect(source).not.toContain(
      "<thead",
    );

    expect(source).not.toContain(
      "<tbody",
    );
  });

  it("keeps the special slot form compact and collapsed", () => {
    expect(source).toContain(
      'data-testid="availability-entry-form"',
    );

    expect(source).toContain(
      "setFormOpen",
    );

    expect(source).toContain(
      "Sondertermin erstellen",
    );

    expect(source).toContain(
      "createSlot",
    );
  });

  it("uses fixed operational appointment columns", () => {
    expect(source).toContain(
      "xl:grid-cols-[150px_130px_120px_minmax(170px,0.8fr)_minmax(220px,1fr)_auto]",
    );

    expect(source).toContain(
      "formatDate(slot.startAt)",
    );

    expect(source).toContain(
      "statusLabel(slot.status)",
    );

    expect(source).toContain(
      "slot.order?.orderNumber",
    );

    expect(source).toContain(
      "slot.notes",
    );
  });

  it("keeps one workflow action for every slot state", () => {
    expect(source).toContain(
      'slot.status === "BOOKED"',
    );

    expect(source).toContain(
      "Auftrag öffnen",
    );

    expect(source).toContain(
      'slot.status === "AVAILABLE"',
    );

    expect(source).toContain(
      "Blockieren",
    );

    expect(source).toContain(
      'slot.status === "BLOCKED"',
    );

    expect(source).toContain(
      "Freigeben",
    );

    expect(source).not.toContain(
      "deleteSlot",
    );

    expect(source).not.toContain(
      "Löschen",
    );
  });

  it("keeps automatic availability behavior", () => {
    expect(source).toContain(
      '"/api/dashboard/availability-slots"',
    );

    expect(source).toContain(
      "credentials: \"include\"",
    );

    expect(source).toContain(
      'timeZone: "Europe/Zurich"',
    );
  });
});