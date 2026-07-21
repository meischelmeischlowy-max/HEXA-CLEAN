export type OverdueReminderMetadata = {
  source: "automatic_overdue_reminder";
  type: "owner_overdue_invoice";
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string | null;
  automatic: true;
  actionRequired: true;
};

export function isOverdueReminderMetadata(
  value: unknown,
  invoiceId: string,
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const metadata =
    value as Record<string, unknown>;

  return (
    metadata.source ===
      "automatic_overdue_reminder" &&
    metadata.type ===
      "owner_overdue_invoice" &&
    metadata.invoiceId === invoiceId
  );
}

export function buildOverdueReminderSubject(
  invoiceNumber: string,
) {
  return `Zahlung überfällig: ${invoiceNumber}`;
}

export function buildOverdueReminderText(input: {
  invoiceNumber: string;
  customerName: string;
  total: string;
  currency: string;
  dueDate: string;
}) {
  return [
    `Die Rechnung ${input.invoiceNumber} ist überfällig.`,
    "",
    `Kunde: ${input.customerName}`,
    `Betrag: ${input.total} ${input.currency}`,
    `Fällig seit: ${input.dueDate}`,
    "",
    "Bitte Zahlungseingang prüfen und bei Bedarf eine Mahnung vorbereiten.",
    "",
    "HEXA CLEAN CRM",
  ].join("\n");
}