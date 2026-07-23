import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const chat = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/components/AIChat/AIChat.tsx",
  ),
  "utf8",
);

const route = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/api/public/chat/lead/route.ts",
  ),
  "utf8",
);

describe(
  "E24H FINAL C complete chat CRM mapping",
  () => {
    it(
      "preserves and sends the full lead",
      () => {
        expect(chat).toContain(
          "lead: OnlineBeraterLead | null",
        );

        expect(chat).toContain(
          "session.lead",
        );

        for (const marker of [
          "objectType",
          "location",
          "rooms",
          "bathrooms",
          "parkingAccess",
          "condition",
          "extras",
          "photoRequired",
        ]) {
          expect(chat).toContain(
            marker,
          );
        }
      },
    );

    it(
      "accepts and normalizes the full lead",
      () => {
        expect(route).toContain(
          "type ChatLeadPayload",
        );

        for (const marker of [
          "objectType",
          "location",
          "rooms",
          "bathrooms",
          "parkingAccess",
          "condition",
          "extras",
          "preferredDate",
          "photoRequired",
        ]) {
          expect(route).toContain(
            marker,
          );
        }
      },
    );

    it(
      "writes customer and service address",
      () => {
        expect(route).toContain(
          "parseServiceLocation",
        );

        expect(route).toContain(
          "street:",
        );

        expect(route).toContain(
          "serviceStreet:",
        );

        expect(route).toContain(
          "serviceZipCode:",
        );
      },
    );

    it(
      "creates separate calculation positions",
      () => {
        expect(route).toMatch(
          /lineType:\s*"BASE_SERVICE"/,
        );

        expect(route).toMatch(
          /lineType:\s*"SELECTED_EXTRA"/,
        );

        expect(route).toContain(
          "...lead.answers.extras.map",
        );
      },
    );

    it(
      "keeps full history and full email summary",
      () => {
        expect(route).toContain(
          "conversationMessage.createMany",
        );

        expect(route).toContain(
          "buildChatDetailLines",
        );

        expect(route).toContain(
          "Vollständiger Auftragsumfang",
        );
      },
    );
  },
);
