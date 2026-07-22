import fs from "node:fs";
import path from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

const source =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/public/PublicOfferScheduleDecision.tsx",
    ),
    "utf8",
  );

describe(
  "E17.14 compact public slot picker",
  () => {
    it(
      "groups slots by day",
      () => {
        expect(source).toContain(
          "getDayKey",
        );

        expect(source).toContain(
          "DayGroup",
        );

        expect(source).toContain(
          "Tag auswählen",
        );
      },
    );

    it(
      "shows compact time buttons after day selection",
      () => {
        expect(source).toContain(
          "Uhrzeit auswählen",
        );

        expect(source).toContain(
          "grid-cols-2",
        );

        expect(source).toContain(
          "formatTime",
        );
      },
    );

    it(
      "limits initial days and supports expansion",
      () => {
        expect(source).toContain(
          "INITIAL_VISIBLE_DAYS = 7",
        );

        expect(source).toContain(
          "Weitere Termine anzeigen",
        );

        expect(source).toContain(
          "Weniger Termine anzeigen",
        );
      },
    );

    it(
      "keeps atomic offer and slot acceptance",
      () => {
        expect(source).toContain(
          "accept-with-slot",
        );

        expect(source).toContain(
          "availabilitySlotId",
        );

        expect(source).toContain(
          "confirmAcceptance",
        );
      },
    );

    it(
      "keeps offer rejection",
      () => {
        expect(source).toContain(
          "/reject",
        );

        expect(source).toContain(
          "Offerte ablehnen",
        );
      },
    );
  },
);