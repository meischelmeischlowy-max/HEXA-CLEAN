import {
  Prisma,
  ServiceCatalogCategory,
  ServiceCatalogUnit,
} from "@prisma/client";

const CATEGORY_VALUES = new Set<string>(
  Object.values(ServiceCatalogCategory),
);

const UNIT_VALUES = new Set<string>(
  Object.values(ServiceCatalogUnit),
);

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return String(value.toString()).trim();
  }

  return fallback;
}

function readNullableString(value: unknown) {
  const text = readString(value);

  return text || null;
}

function readMoney(value: unknown, fallback = "0.00") {
  const normalized = readString(value, fallback).replace(",", ".");
  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return (
    Math.round((number + Number.EPSILON) * 100) / 100
  ).toFixed(2);
}

function readSortOrder(value: unknown, fallback: number) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    return fallback;
  }

  return number;
}

function readCategory(value: unknown) {
  const category = readString(value).toUpperCase();

  if (!CATEGORY_VALUES.has(category)) {
    return null;
  }

  return category as ServiceCatalogCategory;
}

function readUnit(value: unknown) {
  const unit = readString(value).toUpperCase();

  if (!UNIT_VALUES.has(unit)) {
    return ServiceCatalogUnit.FLAT;
  }

  return unit as ServiceCatalogUnit;
}

export function extractQuoteItemRecords(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  const record = readRecord(value);

  if (!record || !Array.isArray(record.items)) {
    return [];
  }

  return record.items;
}

export function createInvoiceItemsFromQuote(
  value: unknown,
): Prisma.InvoiceItemCreateWithoutInvoiceInput[] {
  const result: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = [];

  extractQuoteItemRecords(value).forEach((entry, index) => {
    const item = readRecord(entry);

    if (!item) {
      return;
    }

    const name =
      readString(item.name) ||
      readString(item.serviceName) ||
      `Leistung ${index + 1}`;

    const quantity = readMoney(item.quantity, "1.00");
    const unitPrice = readMoney(item.unitPrice);
    const subtotal = readMoney(
      item.subtotal,
      readMoney(
        Number(quantity) * Number(unitPrice),
      ),
    );

    const taxRate = readMoney(item.taxRate);
    const taxAmount = readMoney(item.taxAmount);
    const discountAmount = readMoney(item.discountAmount);
    const total = readMoney(
      item.total,
      subtotal,
    );

    const serviceCatalogItemId =
      readNullableString(item.serviceCatalogItemId);

    const invoiceItem: Prisma.InvoiceItemCreateWithoutInvoiceInput = {
      name,
      description: readNullableString(item.description),
      category: readCategory(item.category),
      unit: readUnit(item.unit),
      quantity,
      unitPrice,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      total,
      sortOrder: readSortOrder(item.sortOrder, index),
      metadata: {
        source: "quote",
      },
      ...(serviceCatalogItemId
        ? {
            serviceCatalogItem: {
              connect: {
                id: serviceCatalogItemId,
              },
            },
          }
        : {}),
    };

    result.push(invoiceItem);
  });

  return result;
}

export function sanitizeInvoiceNoteFromQuote(value: unknown) {
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
        !normalized.startsWith(
          "quote generated from estimate",
        ) &&
        !normalized.startsWith("estimate id:") &&
        !normalized.startsWith("customer notes:")
      );
    });

  return safeLines.length > 0
    ? safeLines.join("\n")
    : null;
}
