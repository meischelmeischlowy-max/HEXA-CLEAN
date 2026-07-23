import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const root = "src";

const currentTest =
  "src/tests/e18-1-final-workflow-cleanup.test.ts";

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

const sourceFiles =
  collectSourceFiles(root).filter(
    (file) => file !== currentTest,
  );

const brokenTokens = [
  "?berf?llig",
  "?ffnen",
  "Zur?ck",
  "f?r",
  "vollst?ndig",
  "m?glich",
  "M?chten",
  "Anh?nge",
  "Sp?ter",
  "Rechnungs?bersicht",
  "Bank?berweisung",
  "Zur?ckerstattet",
  "Zahlungsbest?tigungen",
  "Terminbest?tigung",
  "Ausf?hrungstermin",
  "N?chster",
  "n?chster",
  "Pr?fung",
  "pr?fen",
  "m?ssen",
  "gepr?ft",
];

describe(
  "E18.1 final workflow cleanup",
  () => {
    it(
      "removes unused manual invoice status components",
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
      "contains no references to removed components",
      () => {
        const combinedSource =
          sourceFiles
            .map((file) =>
              fs.readFileSync(
                file,
                "utf8",
              ),
            )
            .join("\n");

        expect(
          combinedSource,
        ).not.toContain(
          "InvoiceStatusActions",
        );

        expect(
          combinedSource,
        ).not.toContain(
          "InvoiceStatusQuickActions",
        );
      },
    );

    it(
      "contains no known broken German text sequences",
      () => {
        const failures =
          sourceFiles.flatMap(
            (file) => {
              const source =
                fs.readFileSync(
                  file,
                  "utf8",
                );

              return brokenTokens
                .filter((token) =>
                  source.includes(token),
                )
                .map(
                  (token) =>
                    `${file}: ${token}`,
                );
            },
          );

        expect(failures).toEqual([]);
      },
    );

    it(
      "keeps real payment actions available",
      () => {
        expect(
          fs.existsSync(
            "src/components/dashboard/MarkPaymentAsPaidButton.tsx",
          ),
        ).toBe(true);

        expect(
          fs.existsSync(
            "src/components/dashboard/InvoicePaymentRecorder.tsx",
          ),
        ).toBe(true);
      },
    );
  },
);