export type PublicOfferItem = {
  name: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  total: string;
};

function readString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (value && typeof value === "object" && "toString" in value) {
    return String(value.toString());
  }

  return fallback;
}

function readNullableString(value: unknown) {
  const text = readString(value).trim();

  return text.length > 0 ? text : null;
}

export function extractPublicOfferItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "items" in value
  ) {
    const nestedItems = (value as Record<string, unknown>).items;

    if (Array.isArray(nestedItems)) {
      return nestedItems;
    }
  }

  return [];
}

export function normalizePublicOfferItems(
  value: unknown,
): PublicOfferItem[] {
  return extractPublicOfferItems(value)
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const itemRecord = item as Record<string, unknown>;
      const name =
        readString(itemRecord.name, "Leistung").trim() || "Leistung";

      return {
        name,
        description: readNullableString(itemRecord.description),
        quantity: readString(itemRecord.quantity, "1"),
        unitPrice: readString(itemRecord.unitPrice, "0.00"),
        subtotal: readString(itemRecord.subtotal, "0.00"),
        total: readString(
          itemRecord.total ?? itemRecord.subtotal,
          "0.00",
        ),
      };
    })
    .filter((item): item is PublicOfferItem => Boolean(item));
}

export function sanitizePublicCustomerNote(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const safeLines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const normalized = line.toLowerCase();

      return (
        !normalized.startsWith("quote generated from estimate") &&
        !normalized.startsWith("estimate id:") &&
        !normalized.startsWith("customer notes:")
      );
    });

  return safeLines.length > 0 ? safeLines.join("\n") : null;
}
