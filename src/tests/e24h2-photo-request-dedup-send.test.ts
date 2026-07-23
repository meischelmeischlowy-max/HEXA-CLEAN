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
    "src/app/api/dashboard/estimates/[id]/review/route.ts",
  ),
  "utf8",
);

describe(
  "E24H2 photo request dedup and send",
  () => {
    it(
      "reuses an existing photo request",
      () => {
        expect(source).toContain(
          "existingPhotoRequest",
        );

        expect(source).toContain(
          "reusedExisting",
        );

        expect(source).toContain(
          "NotificationStatus.PENDING",
        );

        expect(source).toMatch(
          /NotificationStatus\s*\.\s*SENT/,
        );
      },
    );

    it(
      "sends the email through Resend",
      () => {
        expect(source).toContain(
          'import { Resend } from "resend"',
        );

        expect(source).toContain(
          "resend.emails.send",
        );

        expect(source).toContain(
          "sendPhotoRequestEmail",
        );
      },
    );

    it(
      "writes SENT or FAILED status",
      () => {
        expect(source).toMatch(
          /NotificationStatus\s*\.\s*FAILED/,
        );

        expect(source).toContain(
          "sentAt:",
        );

        expect(source).toContain(
          "errorMessage:",
        );
      },
    );

    it(
      "does not create a new request when one exists",
      () => {
        expect(source).toContain(
          "findFirst",
        );

        expect(source).toContain(
          "existingPhotoRequest.id",
        );

        expect(source).toContain(
          "tx.notification.update",
        );
      },
    );
  },
);
