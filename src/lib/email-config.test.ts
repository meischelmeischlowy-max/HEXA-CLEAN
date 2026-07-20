import { describe, expect, it } from "vitest";

import { resolveEmailConfiguration } from "@/lib/email-config";

describe("resolveEmailConfiguration", () => {
  it("uses HEXA CLEAN company defaults", () => {
    expect(resolveEmailConfiguration({})).toEqual({
      ownerEmail: "info@hexaclean.ch",
      from: "HEXA CLEAN <notifications@hexaclean.ch>",
      replyTo: "info@hexaclean.ch",
    });
  });

  it("uses configured addresses", () => {
    expect(
      resolveEmailConfiguration({
        HEXA_OWNER_EMAIL: "owner@example.com",
        HEXA_EMAIL_FROM: "Sender <sender@example.com>",
        HEXA_EMAIL_REPLY_TO: "reply@example.com",
      }),
    ).toEqual({
      ownerEmail: "owner@example.com",
      from: "Sender <sender@example.com>",
      replyTo: "reply@example.com",
    });
  });

  it("trims configured values", () => {
    expect(
      resolveEmailConfiguration({
        HEXA_OWNER_EMAIL: "  owner@example.com  ",
        HEXA_EMAIL_FROM: "  Sender <sender@example.com>  ",
      }),
    ).toEqual({
      ownerEmail: "owner@example.com",
      from: "Sender <sender@example.com>",
      replyTo: "owner@example.com",
    });
  });

  it("falls back when configured values are empty", () => {
    expect(
      resolveEmailConfiguration({
        HEXA_OWNER_EMAIL: " ",
        HEXA_EMAIL_FROM: "",
        HEXA_EMAIL_REPLY_TO: "  ",
      }),
    ).toEqual({
      ownerEmail: "info@hexaclean.ch",
      from: "HEXA CLEAN <notifications@hexaclean.ch>",
      replyTo: "info@hexaclean.ch",
    });
  });
});
