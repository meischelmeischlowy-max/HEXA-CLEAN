import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateServerPrice,
} from "@/lib/pricing/server";
import type {
  CentralPricingInput,
} from "@/lib/pricing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 20_000;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function cleanText(
  value: unknown,
  maximum = 200,
) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed
    ? trimmed.slice(0, maximum)
    : null;
}

function cleanNumber(
  value: unknown,
) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseInput(
  value: unknown,
): CentralPricingInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const service =
    cleanText(value.service);

  if (!service) {
    return null;
  }

  const extras =
    Array.isArray(value.extras)
      ? value.extras
          .filter(
            (
              entry,
            ): entry is string =>
              typeof entry ===
              "string",
          )
          .map(
            (entry) =>
              entry
                .trim()
                .slice(0, 100),
          )
          .filter(Boolean)
          .slice(0, 20)
      : [];

  return {
    service,
    areaM2:
      cleanNumber(
        value.areaM2,
      ),
    rooms:
      cleanNumber(
        value.rooms,
      ),
    bathrooms:
      cleanNumber(
        value.bathrooms,
      ),
    windows:
      cleanNumber(
        value.windows,
      ),
    condition:
      cleanText(
        value.condition,
      ),
    frequency:
      cleanText(
        value.frequency,
      ),
    extras,
    floor:
      cleanNumber(
        value.floor,
      ),
    elevator:
      typeof value.elevator ===
      "boolean"
        ? value.elevator
        : null,
    photoCount:
      Math.max(
        Math.min(
          Number(
            value.photoCount,
          ) || 0,
          5,
        ),
        0,
      ),
  };
}

export async function POST(
  request: NextRequest,
) {
  const contentLength =
    Number(
      request.headers.get(
        "content-length",
      ) ?? 0,
    );

  if (
    Number.isFinite(
      contentLength,
    ) &&
    contentLength >
      MAX_REQUEST_BYTES
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Die Preisanfrage ist zu groß.",
      },
      {
        status: 413,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  try {
    const body: unknown =
      await request.json();

    const input =
      parseInput(body);

    if (!input) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Preisangaben.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const pricing =
      await calculateServerPrice(
        input,
      );

    return NextResponse.json(
      {
        success: true,
        pricing,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Public pricing error:",
      error instanceof Error
        ? error.message
        : "Unknown error",
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Preisorientierung konnte nicht berechnet werden.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
