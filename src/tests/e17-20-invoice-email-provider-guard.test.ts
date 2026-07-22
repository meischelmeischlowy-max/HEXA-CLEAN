import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const source = fs.readFileSync(
  "src/lib/invoice-email-service.ts",
  "utf8",
);

describe(
  "E17.20 invoice email provider guard",
  () => {
    it(
      "does not trust SENT without a Resend message ID",
      () => {
        expect(source).toContain(
          "notificationHasProviderMessageId",
        );

        expect(source).toContain(
          "existingSentNotification.metadata",
        );

        expect(source).toContain(
          "providerMessageId.trim().length > 0",
        );
      },
    );

    it(
      "requires a provider message ID before marking the invoice sent",
      () => {
        expect(source).toContain(
          "const providerMessageId =",
        );

        expect(source).toContain(
          "RESEND_MESSAGE_ID_MISSING",
        );

        expect(source).not.toMatch(
          /providerMessageId:\s*emailResult\.data\?\.id/,
        );
      },
    );

    it(
      "stores the verified provider ID",
      () => {
        const matches = source.match(
          /providerMessageId,/g,
        );

        expect(
          matches?.length ?? 0,
        ).toBeGreaterThanOrEqual(2);
      },
    );
  },
);