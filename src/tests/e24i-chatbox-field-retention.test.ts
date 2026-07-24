import {
  describe,
  expect,
  it,
} from "vitest";
import {
  readFileSync,
} from "node:fs";

const chatSource = readFileSync(
  "src/components/AIChat/AIChat.tsx",
  "utf8",
);

const routeSource = readFileSync(
  "src/app/api/public/chat/lead/route.ts",
  "utf8",
);

describe("E24I chatbox field retention", () => {
  it("retains fields collected during earlier chat turns", () => {
    expect(chatSource).toContain(
      "function mergeOnlineBeraterLead(",
    );

    expect(chatSource).toContain(
      "previousSession?.lead ?? null",
    );

    expect(chatSource).toContain(
      "incoming.rooms ??",
    );

    expect(chatSource).toContain(
      "previous?.rooms ??",
    );

    expect(chatSource).toContain(
      "incoming.bathrooms ??",
    );

    expect(chatSource).toContain(
      "incoming.frequency ??",
    );

    expect(chatSource).toContain(
      "incoming.parkingAccess ??",
    );
  });

  it("retains and combines extras from the complete conversation", () => {
    expect(chatSource).toContain(
      "...(previous?.extras ?? [])",
    );

    expect(chatSource).toContain(
      "...incoming.extras",
    );
  });

  it("keeps email and phone independently", () => {
    expect(chatSource).toContain(
      "incoming.email ??",
    );

    expect(chatSource).toContain(
      "previous?.email ??",
    );

    expect(chatSource).toContain(
      "incoming.phone ??",
    );

    expect(chatSource).toContain(
      "previous?.phone ??",
    );
  });

  it("merges the previous session instead of replacing it", () => {
    expect(chatSource).toContain(
      "setSession((current) =>",
    );

    expect(chatSource).toContain(
      "pricing,\n          current,",
    );
  });

  it("normalizes explicit lead phone even when contact contains email", () => {
    expect(routeSource).toContain(
      "explicitLead.phone",
    );

    expect(routeSource).toContain(
      "normalizePhone(rawContact)",
    );

    expect(routeSource).toContain(
      "explicitLead.email",
    );

    expect(routeSource).toContain(
      "normalizeEmail(rawContact)",
    );
  });
});