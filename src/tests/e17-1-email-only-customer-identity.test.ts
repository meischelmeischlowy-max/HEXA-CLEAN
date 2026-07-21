import fs from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";

const quickOfferSource = fs.readFileSync(
  "src/app/api/contact/route.ts",
  "utf8",
);

const chatLeadSource = fs.readFileSync(
  "src/app/api/public/chat/lead/route.ts",
  "utf8",
);

function sectionBetween(
  source: string,
  startMarker: string,
  endMarker: string,
) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe(
  "E17.1 email-only customer identity",
  () => {
    it(
      "QuickOffer finds existing customer only by email",
      () => {
        const section = sectionBetween(
          quickOfferSource,
          "async function findOrCreateQuickOfferCustomer",
          "async function sendEmail",
        );

        expect(section).toContain(
          "email: offer.email",
        );

        expect(section).not.toMatch(
          /if\s*\(\s*offer\.phone\s*\)\s*\{[\s\S]*?customer\.findFirst/,
        );

        expect(section).toContain(
          "phone: offer.phone",
        );
      },
    );

    it(
      "Chatbox finds existing customer only by email",
      () => {
        expect(chatLeadSource).toContain(
          "email: lead.email",
        );

        expect(chatLeadSource).not.toMatch(
          /if\s*\(\s*lead\.phone\s*\)\s*\{[\s\S]*?customer\.findFirst/,
        );

        expect(chatLeadSource).toContain(
          "phone: lead.phone",
        );
      },
    );

    it(
      "phone remains contact data but is not an identity key",
      () => {
        expect(quickOfferSource).toContain(
          "phone: offer.phone",
        );

        expect(chatLeadSource).toContain(
          "phone: lead.phone",
        );
      },
    );
  },
);