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
    "src/app/dashboard/notifications/page.tsx",
  ),
  "utf8",
);

describe("E20.9 compact notifications queue", () => {
  it("uses compact header and summary strip", () => {
    expect(source).toContain(
      'data-testid="notifications-summary-strip"',
    );

    expect(source).toContain(
      'data-testid="notifications-operational-list"',
    );

    expect(source).toContain(
      "max-w-[1600px]",
    );

    expect(source).not.toContain(
      "StatCard",
    );

    expect(source).not.toContain(
      "Security Logs",
    );
  });

  it("removes duplicate failure panel and technical table", () => {
    expect(source).not.toContain(
      "failedNotifications",
    );

    expect(source).not.toContain(
      "Fehlgeschlagene E-Mail Benachrichtigungen",
    );

    expect(source).not.toContain(
      "<table",
    );

    expect(source).not.toContain(
      "<thead",
    );

    expect(source).not.toContain(
      "ErrorBox",
    );
  });

  it("prioritizes failed and pending notifications", () => {
    expect(source).toContain(
      "function statusPriority(",
    );

    expect(source).toContain(
      'case "FAILED":',
    );

    expect(source).toContain(
      'case "PENDING":',
    );

    expect(source).toContain(
      "priorityDifference",
    );
  });

  it("uses fixed operational notification columns", () => {
    expect(source).toContain(
      "xl:grid-cols-[120px_minmax(210px,0.9fr)_minmax(240px,1.1fr)_minmax(300px,1.4fr)_145px_auto]",
    );

    expect(source).toContain(
      "notification.recipient",
    );

    expect(source).toContain(
      "notification.subject",
    );

    expect(source).toContain(
      "rowDescription(",
    );

    expect(source).toContain(
      "formatDate(",
    );
  });

  it("keeps one action per notification", () => {
    expect(source).toContain(
      'href={`/dashboard/notifications/${notification.id}`}',
    );

    expect(source).toContain(
      "Details öffnen",
    );

    expect(source).not.toContain(
      'href="/dashboard/security"',
    );
  });
});