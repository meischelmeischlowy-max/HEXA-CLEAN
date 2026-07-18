import {
  calculateAutomatedInvoiceState,
  calculatePaidPaymentsTotal,
  decimalToNumber,
  invoiceAutomationChanged,
  moneyString,
  normalizeInvoiceCurrency,
  roundMoney,
} from "@/lib/dashboard/invoice-status";
import { describe, expect, it } from "vitest";

describe("invoice money helpers", () => {
  it("normalizes supported numeric inputs", () => {
    expect(decimalToNumber(null)).toBe(0);
    expect(decimalToNumber(Number.NaN)).toBe(0);
    expect(decimalToNumber("12,34")).toBe(12.34);
    expect(decimalToNumber({ toString: () => "45.67" })).toBe(45.67);
    expect(decimalToNumber("invalid")).toBe(0);
  });

  it("rounds and formats monetary values to two decimals", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(moneyString("19,999")).toBe("20.00");
  });

  it("normalizes supported currencies and falls back to CHF", () => {
    expect(normalizeInvoiceCurrency("chf ")).toBe("CHF");
    expect(normalizeInvoiceCurrency("EUR invoice")).toBe("EUR");
    expect(normalizeInvoiceCurrency("usd")).toBe("USD");
    expect(normalizeInvoiceCurrency("GBP")).toBe("CHF");
    expect(normalizeInvoiceCurrency(null)).toBe("CHF");
  });

  it("sums only paid payments and rounds the result", () => {
    expect(
      calculatePaidPaymentsTotal([
        { amount: "10.10", status: "PAID" },
        { amount: "4,25", status: "PAID" },
        { amount: "99.00", status: "PENDING" },
        { amount: null, status: "PAID" },
      ]),
    ).toBe(14.35);
  });
});

describe("automated invoice state", () => {
  const now = new Date("2026-07-18T10:00:00.000Z");

  it("preserves cancellation before all automatic transitions", () => {
    expect(
      calculateAutomatedInvoiceState({
        currentStatus: "CANCELLED",
        total: 100,
        paidPaymentsTotal: 100,
        paidAt: "2026-07-17T10:00:00.000Z",
        now,
      }),
    ).toEqual({
      status: "CANCELLED",
      paidAmount: 100,
      paidAt: new Date("2026-07-17T10:00:00.000Z"),
    });
  });

  it("marks a fully paid invoice and sets paidAt", () => {
    expect(
      calculateAutomatedInvoiceState({
        total: "100.00",
        paidPaymentsTotal: "100.01",
        now,
      }),
    ).toEqual({
      status: "PAID",
      paidAmount: 100.01,
      paidAt: now,
    });
  });

  it("preserves an existing paidAt date", () => {
    const paidAt = new Date("2026-07-16T09:00:00.000Z");

    expect(
      calculateAutomatedInvoiceState({
        total: 50,
        paidPaymentsTotal: 50,
        paidAt,
        now,
      }).paidAt,
    ).toBe(paidAt);
  });

  it("marks a positive payment below total as partial", () => {
    expect(
      calculateAutomatedInvoiceState({
        total: 100,
        paidPaymentsTotal: 25,
        dueDate: "2026-07-01T00:00:00.000Z",
        now,
      }),
    ).toEqual({
      status: "PARTIALLY_PAID",
      paidAmount: 25,
      paidAt: null,
    });
  });

  it("marks an unpaid invoice overdue only after its due date", () => {
    expect(
      calculateAutomatedInvoiceState({
        total: 100,
        paidPaymentsTotal: 0,
        dueDate: "2026-07-17T23:59:59.000Z",
        sentAt: "2026-07-01T00:00:00.000Z",
        now,
      }).status,
    ).toBe("OVERDUE");

    expect(
      calculateAutomatedInvoiceState({
        total: 100,
        paidPaymentsTotal: 0,
        dueDate: now,
        sentAt: "2026-07-01T00:00:00.000Z",
        now,
      }).status,
    ).toBe("SENT");
  });

  it("returns SENT or DRAFT when no payment transition applies", () => {
    expect(
      calculateAutomatedInvoiceState({
        total: 100,
        paidPaymentsTotal: 0,
        sentAt: "2026-07-01T00:00:00.000Z",
        now,
      }).status,
    ).toBe("SENT");

    expect(
      calculateAutomatedInvoiceState({
        total: 100,
        paidPaymentsTotal: 0,
        dueDate: "invalid",
        now,
      }).status,
    ).toBe("DRAFT");
  });
});

describe("invoice automation change detection", () => {
  const state = {
    status: "PAID" as const,
    paidAmount: 100,
    paidAt: new Date("2026-07-18T10:00:00.000Z"),
  };

  it("does not report a change for equivalent normalized values", () => {
    expect(
      invoiceAutomationChanged(
        {
          status: "PAID",
          paidAmount: "100.00",
          paidAt: "2026-07-18T10:00:00.000Z",
        },
        state,
      ),
    ).toBe(false);
  });

  it("detects status, amount, and paidAt changes", () => {
    expect(
      invoiceAutomationChanged(
        { status: "SENT", paidAmount: 100, paidAt: state.paidAt },
        state,
      ),
    ).toBe(true);
    expect(
      invoiceAutomationChanged(
        { status: "PAID", paidAmount: 99, paidAt: state.paidAt },
        state,
      ),
    ).toBe(true);
    expect(
      invoiceAutomationChanged(
        { status: "PAID", paidAmount: 100, paidAt: null },
        state,
      ),
    ).toBe(true);
  });
});
