import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "src/app/dashboard/page.tsx"),
  "utf8",
);

function countOccurrences(source: string, value: string) {
  return source.split(value).length - 1;
}

describe("E19.4 operational list cockpit", () => {
  it("renders one compact row per operational event", () => {
    expect(pageSource).toContain(
      "lg:grid-cols-[auto_minmax(0,1fr)_auto]",
    );

    expect(pageSource).toContain(
      "divide-y divide-white/10",
    );

    expect(pageSource).toContain(
      "Eine Zeile entspricht einem Vorgang.",
    );
  });

  it("shows the primary event and up to nineteen additional events", () => {
    expect(pageSource).toContain(
      "<PrimaryAlertCard",
    );

    expect(pageSource).toContain(
      "remainingAlerts.map((alert)",
    );

    expect(pageSource).toContain(
      "alerts.slice(1, 20);",
    );
  });

  it("keeps one direct action per row and one marked primary action", () => {
    expect(pageSource).toContain(
      "{alert.primaryLabel}",
    );

    expect(
      countOccurrences(
        pageSource,
        '"dashboard-primary-action"',
      ),
    ).toBe(1);
  });

  it("uses eight compact counters and removes the old large cards", () => {
    expect(
      countOccurrences(pageSource, "<StatCard"),
    ).toBe(8);

    expect(pageSource).not.toContain(
      "Weitere Aufgaben",
    );

    expect(pageSource).not.toContain(
      'className={`rounded-3xl border p-5 ${toneCardClass(tone)}`}',
    );
  });
});