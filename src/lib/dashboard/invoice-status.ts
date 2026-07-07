export type AutomatedInvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

type PaymentLike = {
  amount: unknown;
  status: string;
};

type InvoiceStatusInput = {
  currentStatus?: string | null;
  total: unknown;
  paidPaymentsTotal: unknown;
  dueDate?: Date | string | null;
  sentAt?: Date | string | null;
  paidAt?: Date | string | null;
  now?: Date;
};

export type AutomatedInvoiceState = {
  status: AutomatedInvoiceStatus;
  paidAmount: number;
  paidAt: Date | null;
};

export function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const number = Number(value.toString());
    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyString(value: unknown) {
  return roundMoney(decimalToNumber(value)).toFixed(2);
}

export function normalizeInvoiceCurrency(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (raw === "CHF" || raw.startsWith("CHF")) {
    return "CHF";
  }

  if (raw === "EUR" || raw.startsWith("EUR")) {
    return "EUR";
  }

  if (raw === "USD" || raw.startsWith("USD")) {
    return "USD";
  }

  return "CHF";
}

export function calculatePaidPaymentsTotal(payments: PaymentLike[]) {
  return roundMoney(
    payments
      .filter((payment) => payment.status === "PAID")
      .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0),
  );
}

function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOverdue(dueDate: Date | string | null | undefined, now: Date) {
  const date = toDate(dueDate);

  if (!date) {
    return false;
  }

  return date.getTime() < now.getTime();
}

export function calculateAutomatedInvoiceState(
  input: InvoiceStatusInput,
): AutomatedInvoiceState {
  const now = input.now ?? new Date();
  const currentStatus = input.currentStatus ?? "DRAFT";
  const total = roundMoney(decimalToNumber(input.total));
  const paidAmount = roundMoney(decimalToNumber(input.paidPaymentsTotal));
  const existingPaidAt = toDate(input.paidAt);

  if (currentStatus === "CANCELLED") {
    return {
      status: "CANCELLED",
      paidAmount,
      paidAt: existingPaidAt,
    };
  }

  if (total > 0 && paidAmount >= total) {
    return {
      status: "PAID",
      paidAmount,
      paidAt: existingPaidAt ?? now,
    };
  }

  if (paidAmount > 0) {
    return {
      status: "PARTIALLY_PAID",
      paidAmount,
      paidAt: null,
    };
  }

  if (isOverdue(input.dueDate, now)) {
    return {
      status: "OVERDUE",
      paidAmount,
      paidAt: null,
    };
  }

  if (input.sentAt) {
    return {
      status: "SENT",
      paidAmount,
      paidAt: null,
    };
  }

  return {
    status: "DRAFT",
    paidAmount,
    paidAt: null,
  };
}

export function invoiceAutomationChanged(
  current: {
    status: string;
    paidAmount: unknown;
    paidAt?: Date | string | null;
  },
  next: AutomatedInvoiceState,
) {
  const currentPaidAmount = roundMoney(decimalToNumber(current.paidAmount));
  const currentPaidAt = toDate(current.paidAt);
  const nextPaidAt = next.paidAt;

  const paidAtChanged =
    currentPaidAt?.getTime() !== nextPaidAt?.getTime();

  return (
    current.status !== next.status ||
    currentPaidAmount !== next.paidAmount ||
    paidAtChanged
  );
}