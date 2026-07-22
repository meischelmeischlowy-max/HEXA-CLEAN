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
    "src/app/dashboard/orders/[id]/page.tsx",
  ),
  "utf8",
);

describe(
  "E17.16 focused order workspace",
  () => {
    it(
      "formats operational dates in Europe Zurich",
      () => {
        expect(source).toContain(
          'timeZone: "Europe/Zurich"',
        );

        expect(source).toContain(
          "formatAppointmentWindow",
        );

        expect(source).toContain(
          "appointmentWindow",
        );
      },
    );

    it(
      "shows customer photos as a safe gallery",
      () => {
        expect(source).toContain(
          'data-testid="customer-photo-gallery"',
        );

        expect(source).toContain(
          "isSafeImageUrl",
        );

        expect(source).toContain(
          "customerPhotos",
        );

        expect(source).toContain(
          'mimeType.startsWith("image/")',
        );
      },
    );

    it(
      "hides obsolete public lead review panels",
      () => {
        expect(source).toContain(
          "quickOffer && reviewRequired",
        );

        expect(source).toContain(
          "chatbot && reviewRequired",
        );

        expect(source).toContain(
          "{reviewRequired ? (",
        );
      },
    );

    it(
      "keeps photos out of the technical attachment table",
      () => {
        expect(source).toContain(
          "items={nonImageAttachments}",
        );

        expect(source).not.toContain(
          "items={attachments}",
        );
      },
    );

    it(
      "places technical information in a collapsed section",
      () => {
        expect(source).toContain(
          'data-testid="order-technical-details"',
        );

        expect(source).toContain(
          "<details",
        );

        expect(source).toContain(
          "Weitere Auftrags- und Systemdetails anzeigen",
        );
      },
    );

    it(
      "keeps one operational primary action",
      () => {
        expect(source).toContain(
          'data-testid="order-primary-action"',
        );

        expect(source).toContain(
          "MarkOrderAsCompletedButton",
        );

        expect(source).toContain(
          "Offerte akzeptiert und Termin reserviert",
        );
      },
    );
  },
);
