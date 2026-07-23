import type {
  OnlineBeraterLeadData,
  OnlineBeraterResult,
} from "./types";

export const emptyOnlineBeraterLead: OnlineBeraterLeadData = {
  service: null,
  objectType: null,
  location: null,
  areaM2: null,
  rooms: null,
  bathrooms: null,
  floor: null,
  elevator: null,
  parkingAccess: null,
  condition: null,
  frequency: null,
  extras: [],
  preferredDate: null,
  flexibleDate: null,
  photoRequired: null,
  customerName: null,
  email: null,
  phone: null,
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function stringOrNull(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0
    ? trimmed.slice(0, 500)
    : null;
}

function numberOrNull(
  value: unknown,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return value;
}

function booleanOrNull(
  value: unknown,
): boolean | null {
  return typeof value === "boolean"
    ? value
    : null;
}

function stringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is string =>
        typeof entry === "string",
    )
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function validateOnlineBeraterResult(
  value: unknown,
): OnlineBeraterResult {
  if (!isRecord(value)) {
    throw new Error(
      "Online Berater returned an invalid result",
    );
  }

  const leadSource = isRecord(value.lead)
    ? value.lead
    : {};

  const reply = stringOrNull(value.reply);

  if (!reply) {
    throw new Error(
      "Online Berater returned no reply",
    );
  }

  const confidence =
    value.confidence === "HIGH" ||
    value.confidence === "MEDIUM" ||
    value.confidence === "LOW"
      ? value.confidence
      : "LOW";

  return {
    reply,
    lead: {
      service:
        stringOrNull(leadSource.service),
      objectType:
        stringOrNull(leadSource.objectType),
      location:
        stringOrNull(leadSource.location),
      areaM2:
        numberOrNull(leadSource.areaM2),
      rooms:
        numberOrNull(leadSource.rooms),
      bathrooms:
        numberOrNull(leadSource.bathrooms),
      floor:
        numberOrNull(leadSource.floor),
      elevator:
        booleanOrNull(leadSource.elevator),
      parkingAccess:
        stringOrNull(
          leadSource.parkingAccess,
        ),
      condition:
        stringOrNull(leadSource.condition),
      frequency:
        stringOrNull(leadSource.frequency),
      extras:
        stringArray(leadSource.extras),
      preferredDate:
        stringOrNull(
          leadSource.preferredDate,
        ),
      flexibleDate:
        booleanOrNull(
          leadSource.flexibleDate,
        ),
      photoRequired:
        booleanOrNull(
          leadSource.photoRequired,
        ),
      customerName:
        stringOrNull(
          leadSource.customerName,
        ),
      email:
        stringOrNull(leadSource.email),
      phone:
        stringOrNull(leadSource.phone),
    },
    missingFields:
      stringArray(value.missingFields),
    leadReady:
      value.leadReady === true,
    shouldCreateLead:
      value.shouldCreateLead === true,
    shouldAskForPhotos:
      value.shouldAskForPhotos === true,
    confidence,
  };
}
