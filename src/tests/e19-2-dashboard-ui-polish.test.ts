import fs from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

const page = fs.readFileSync(
  "src/app/dashboard/page.tsx",
  "utf8",
);

const layout = fs.readFileSync(
  "src/app/dashboard/layout.tsx",
  "utf8",
);

const navigation = fs.readFileSync(
  "src/app/dashboard/DashboardNavigationLink.tsx",
  "utf8",
);

describe(
  "E19.2 dashboard UI polish",
  () => {
    it(
      "shows a compact header without duplicate shortcuts",
      () => {
        expect(page).toContain(
          "HEXA OS / Arbeitscockpit",
        );

        expect(page).not.toContain(
          "HEXA OS CRM / Automation Inbox",
        );

        expect(page).not.toContain(
          'href="/dashboard/estimates"',
        );

        expect(page).not.toContain(
          'href="/dashboard/notifications"',
        );
      },
    );

    it(
      "converts the Resend testing restriction into a readable message",
      () => {
        expect(page).toContain(
          "function notificationFailureDescription(",
        );

        expect(page).toContain(
          "Die Absender-Domain ist in Resend noch nicht verifiziert.",
        );

        expect(page).toContain(
          "description: notificationFailureDescription(",
        );

        expect(page).not.toContain(
          "notification.errorMessage ||",
        );
      },
    );

    it(
      "uses a compact primary card with wrapped error text",
      () => {
        expect(page).toContain(
          "max-w-3xl break-words",
        );

        expect(page).toContain(
          "rounded-3xl border p-4 shadow-xl",
        );

        expect(page).toContain(
          "sm:w-auto",
        );
      },
    );

    it(
      "highlights the active navigation route",
      () => {
        expect(layout).toContain(
          'import DashboardNavigationLink from "./DashboardNavigationLink";',
        );

        expect(layout).toContain(
          "w-[260px]",
        );

        expect(layout).not.toContain(
          "function NavigationLink(",
        );

        expect(navigation).toContain(
          "usePathname",
        );

        expect(navigation).toContain(
          'aria-current={isActive ? "page" : undefined}',
        );

        expect(navigation).toContain(
          'href === "/dashboard"',
        );
      },
    );
  },
);
