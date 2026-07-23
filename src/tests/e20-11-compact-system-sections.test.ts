import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const attachments = fs.readFileSync(
  "src/app/dashboard/attachments/page.tsx",
  "utf8",
);

const audit = fs.readFileSync(
  "src/app/dashboard/audit-logs/page.tsx",
  "utf8",
);

const security = fs.readFileSync(
  "src/app/dashboard/security/page.tsx",
  "utf8",
);

describe("E20.11 compact system sections", () => {
  it("compacts the attachments list", () => {
    expect(attachments).toContain(
      'data-testid="attachments-summary-strip"',
    );

    expect(attachments).toContain(
      'data-testid="attachments-operational-list"',
    );

    expect(attachments).toContain(
      "Datei öffnen",
    );

    expect(attachments).not.toContain(
      "<table",
    );

    expect(attachments).not.toContain(
      "Keine Anhänge w bazie",
    );
  });

  it("compacts and translates audit logs", () => {
    expect(audit).toContain(
      'data-testid="audit-summary-strip"',
    );

    expect(audit).toContain(
      'data-testid="audit-operational-list"',
    );

    expect(audit).toContain(
      "Eintrag öffnen",
    );

    expect(audit).toContain(
      'UPDATE: "Aktualisiert"',
    );

    expect(audit).toContain(
      'LOGOUT: "Abmeldung"',
    );

    expect(audit).not.toContain(
      "Zaktualizowano",
    );

    expect(audit).not.toContain(
      "Wylogowanie",
    );

    expect(audit).not.toContain(
      "<table",
    );
  });

  it("keeps security backend and cleanup logic", () => {
    expect(security).toContain(
      "getSecurityDashboardData",
    );

    expect(security).toContain(
      "cleanupSecurityLogs",
    );

    expect(security).toContain(
      "publicSecurityEvent",
    );

    expect(security).toContain(
      "publicAccessLog",
    );
  });

  it("shows only operational security information", () => {
    expect(security).toContain(
      'data-testid="security-summary-strip"',
    );

    expect(security).toContain(
      'data-testid="security-operational-list"',
    );

    expect(security).toContain(
      "Sicherheitsereignisse",
    );

    expect(security).toContain(
      "Fehlgeschlagene Requests",
    );

    expect(security).not.toContain(
      "<Card",
    );

    expect(security).not.toContain(
      "suspiciousFingerprints.map",
    );

    expect(security).not.toContain(
      "{safeExtraPreview(",
    );

    expect(security).not.toContain(
      "event.extra",
    );

    expect(security).not.toContain(
      "log.extra",
    );
  });
});