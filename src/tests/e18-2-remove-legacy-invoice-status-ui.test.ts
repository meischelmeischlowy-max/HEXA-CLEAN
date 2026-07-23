import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const currentTest =
  "src/tests/e18-2-remove-legacy-invoice-status-ui.test.ts";

function collectSourceFiles(
  directory: string,
): string[] {
  return fs
    .readdirSync(
      directory,
      {
        withFileTypes: true,
      },
    )
    .flatMap((entry) => {
      const fullPath =
        path.join(
          directory,
          entry.name,
        );

      if (entry.isDirectory()) {
        return collectSourceFiles(
          fullPath,
        );
      }

      if (
        !entry.isFile() ||
        ![".ts", ".tsx"].includes(
          path.extname(entry.name),
        )
      ) {
        return [];
      }

      return [
        fullPath.replaceAll("\\", "/"),
      ];
    });
}

describe(
  "E18.2 remove legacy invoice status UI",
  () => {
    it(
      "removes both unused manual status components",
      () => {
        expect(
          fs.existsSync(
            "src/components/dashboard/InvoiceStatusActions.tsx",
          ),
        ).toBe(false);

        expect(
          fs.existsSync(
            "src/components/dashboard/InvoiceStatusQuickActions.tsx",
          ),
        ).toBe(false);
      },
    );

    it(
      "contains no remaining references to removed components",
      () => {
        const source = collectSourceFiles(
          "src",
        )
          .filter(
            (file) =>
              file !== currentTest,
          )
          .map((file) =>
            fs.readFileSync(
              file,
              "utf8",
            ),
          )
          .join("\n");

        expect(source).not.toContain(
          "InvoiceStatusActions",
        );

        expect(source).not.toContain(
          "InvoiceStatusQuickActions",
        );
      },
    );

    it(
      "keeps the real invoice email action",
      () => {
        const component =
          fs.readFileSync(
            "src/components/dashboard/InvoiceEmailAction.tsx",
            "utf8",
          );

        expect(component).toContain(
          "/send-email",
        );

        expect(component).toContain(
          "Rechnung erneut senden",
        );

        expect(component).not.toContain(
          'method: "PATCH"',
        );
      },
    );

    it(
      "keeps real payment recording components",
      () => {
        expect(
          fs.existsSync(
            "src/components/dashboard/InvoicePaymentRecorder.tsx",
          ),
        ).toBe(true);

        expect(
          fs.existsSync(
            "src/components/dashboard/MarkPaymentAsPaidButton.tsx",
          ),
        ).toBe(true);
      },
    );
  },
);