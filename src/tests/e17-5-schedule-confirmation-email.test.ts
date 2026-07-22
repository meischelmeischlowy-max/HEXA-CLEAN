import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const routeSource = fs.readFileSync(
  "src/app/api/dashboard/orders/[id]/schedule/route.ts",
  "utf8",
);

describe(
  "E17.5 schedule confirmation email",
  () => {
    it(
      "loads customer email with the order",
      () => {
        expect(routeSource).toContain(
          "include: {",
        );

        expect(routeSource).toContain(
          "customer: {",
        );

        expect(routeSource).toContain(
          "email: true",
        );
      },
    );

    it(
      "creates an email notification for the scheduled order",
      () => {
        expect(routeSource).toContain(
          "NotificationChannel.EMAIL",
        );

        expect(routeSource).toContain(
          "NotificationStatus.PENDING",
        );

        expect(routeSource).toContain(
          "automatic_schedule_confirmation",
        );

        expect(routeSource).toContain(
          "customer_schedule_confirmation",
        );
      },
    );

    it(
      "sends the schedule confirmation through Resend",
      () => {
        expect(routeSource).toContain(
          "resend.emails.send",
        );

        expect(routeSource).toContain(
          "emailConfiguration.from",
        );

        expect(routeSource).toContain(
          "emailConfiguration.replyTo",
        );

        expect(routeSource).toContain(
          "Terminbest?tigung",
        );
      },
    );

    it(
      "records successful and failed delivery",
      () => {
        expect(routeSource).toContain(
          "NotificationStatus.SENT",
        );

        expect(routeSource).toContain(
          "NotificationStatus.FAILED",
        );

        expect(routeSource).toContain(
          "actionRequired: true",
        );

        expect(routeSource).toContain(
          "providerMessageId",
        );
      },
    );

    it(
      "does not resend an unchanged schedule",
      () => {
        expect(routeSource).toContain(
          "unchangedSchedule",
        );

        expect(routeSource).toContain(
          "alreadyConfirmed: true",
        );
      },
    );

    it(
      "keeps scheduling successful when delivery fails",
      () => {
        expect(routeSource).toContain(
          'status: "OK"',
        );

        expect(routeSource).toContain(
          "Der Termin wurde gespeichert, aber die Best?tigung konnte nicht versendet werden.",
        );
      },
    );
  },
);
