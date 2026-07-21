import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getEstimatePrimaryAction,
  normalizeEstimateStatus,
} from "./estimate-primary-action";

describe("estimate primary action", () => {
  it("normalizes the status", () => {
    expect(
      normalizeEstimateStatus(
        " ai_review ",
      ),
    ).toBe("AI_REVIEW");
  });

  it("uses one release and create action during review", () => {
    const action =
      getEstimatePrimaryAction(
        "AI_REVIEW",
      );

    expect(action.kind).toBe(
      "RELEASE_AND_CREATE",
    );

    expect(action.shouldRelease).toBe(
      true,
    );

    expect(action.buttonLabel).toBe(
      "Offerte freigeben und erstellen",
    );
  });

  it("creates the quote directly when already released", () => {
    const action =
      getEstimatePrimaryAction(
        "READY_TO_SEND",
      );

    expect(action.kind).toBe(
      "CREATE",
    );

    expect(action.shouldRelease).toBe(
      false,
    );

    expect(action.buttonLabel).toBe(
      "Offerte jetzt erstellen",
    );
  });

  it("does not bypass missing documents", () => {
    const action =
      getEstimatePrimaryAction(
        "NEEDS_PHOTOS",
      );

    expect(action.kind).toBe(
      "BLOCKED",
    );

    expect(action.buttonLabel).toBeNull();
  });

  it("does not show manual status actions after processing", () => {
    for (const status of [
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
    ]) {
      expect(
        getEstimatePrimaryAction(
          status,
        ).buttonLabel,
      ).toBeNull();
    }
  });
});
