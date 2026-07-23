import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const pageSource = readFileSync(
  join(root, "src/app/dashboard/page.tsx"),
  "utf8",
);

const layoutSource = readFileSync(
  join(root, "src/app/dashboard/layout.tsx"),
  "utf8",
);

const navigationSource = readFileSync(
  join(root, "src/app/dashboard/DashboardNavigationLink.tsx"),
  "utf8",
);

describe("E19.2 dashboard UI polish", () => {
  it("shows a compact header without duplicate shortcuts", () => {
    expect(pageSource).toContain(
      "HEXA OS / Arbeitsliste",
    );

    expect(pageSource).not.toContain(
      "Die wichtigste Aufgabe steht direkt darunter.",
    );
  });

  it("converts the Resend testing restriction into a readable message", () => {
    expect(pageSource).toContain(
      "Die Absender-Domain ist in Resend noch nicht verifiziert.",
    );

    expect(pageSource).toContain(
      "nur Test-E-Mails an die eigene Konto-Adresse senden.",
    );
  });

  it("keeps the compact 260px desktop sidebar", () => {
    expect(layoutSource).toContain("w-[260px]");
    expect(layoutSource).toContain("Automatisierter Betrieb");
  });

  it("highlights the active navigation route", () => {
    expect(navigationSource).toContain("usePathname()");
    expect(navigationSource).toContain(
      'aria-current={isActive ? "page" : undefined}',
    );
  });
});