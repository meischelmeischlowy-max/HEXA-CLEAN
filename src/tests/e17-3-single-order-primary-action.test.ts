import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const pageSource = fs.readFileSync(
  "src/app/dashboard/orders/[id]/page.tsx",
  "utf8",
);

function countFragment(
  source: string,
  fragment: string,
) {
  return source
    .split(fragment)
    .length - 1;
}

describe(
  "E17.3 single order primary action",
  () => {
    it(
      "renders exactly one primary action container",
      () => {
        expect(
          countFragment(
            pageSource,
            'data-testid="order-primary-action"',
          ),
        ).toBe(1);

        expect(pageSource).toContain(
          "Nächster Schritt",
        );
      },
    );

    it(
      "selects the action from workflow state",
      () => {
        expect(pageSource).toContain(
          "reviewRequired && latestEstimate?.id",
        );

        expect(pageSource).toContain(
          ") : confirmed ? (",
        );

        expect(pageSource).toContain(
          ") : scheduled ? (",
        );

        expect(pageSource).toContain(
          ") : completed ? (",
        );

        expect(pageSource).toContain(
          "ScheduleOrderButton",
        );

        expect(pageSource).toContain(
          "MarkOrderAsCompletedButton",
        );
      },
    );

    it(
      "routes lead review to the estimate",
      () => {
        expect(pageSource).toContain(
          '? "Lead prüfen"',
        );

        expect(pageSource).toContain(
          ': "Kalkulation prüfen"',
        );

        expect(pageSource).toContain(
          "Kalkulation öffnen",
        );
      },
    );

    it(
      "removes the Schnellaktionen grid",
      () => {
        expect(pageSource).not.toContain(
          '<Section title="Schnellaktionen">',
        );

        expect(pageSource).toContain(
          '<Section title="Weitere Bereiche">',
        );

        expect(
          countFragment(
            pageSource,
            'data-testid="order-secondary-navigation"',
          ),
        ).toBe(1);
      },
    );

    it(
      "keeps secondary navigation subordinate",
      () => {
        const start = pageSource.indexOf(
          'data-testid="order-secondary-navigation"',
        );

        const end = pageSource.indexOf(
          "</nav>",
          start,
        );

        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);

        const navigation = pageSource.slice(
          start,
          end,
        );

        expect(navigation).not.toContain(
          "<ActionButton",
        );

        expect(navigation).toContain(
          "text-neutral-400",
        );
      },
    );
  },
);
