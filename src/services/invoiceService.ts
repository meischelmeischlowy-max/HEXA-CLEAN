import { invoiceRepository } from "@/repositories/invoiceRepository";
import type { InvoiceStatus, Prisma } from "@prisma/client";

type CreateInvoiceInput = {
  customerId: string;
  orderId?: string;
  quoteId?: string;
  subtotal: number;
  taxRate?: number;
  currency?: string;
  dueDate?: Date;
  notes?: string;
};

function generateInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `INV-${year}${month}${day}-${random}`;
}

function cleanText(value?: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

export const invoiceService = {
  async createInvoice(input: CreateInvoiceInput) {
    const taxRate = input.taxRate ?? 0;
    const taxAmount = Number(((input.subtotal * taxRate) / 100).toFixed(2));
    const total = Number((input.subtotal + taxAmount).toFixed(2));

    const data: Prisma.InvoiceUncheckedCreateInput = {
      invoiceNumber: generateInvoiceNumber(),
      customerId: input.customerId,
      subtotal: input.subtotal,
      taxRate,
      taxAmount,
      total,
      paidAmount: 0,
      currency: input.currency ?? "CHF",
      status: "DRAFT",
    };

    if (input.orderId) data.orderId = input.orderId;
    if (input.quoteId) data.quoteId = input.quoteId;
    if (input.dueDate) data.dueDate = input.dueDate;
    if (input.notes) data.notes = cleanText(input.notes);

    return invoiceRepository.create(data);
  },

  async getInvoiceById(id: string) {
    const invoice = await invoiceRepository.findById(id);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  },

  async updateInvoiceStatus(id: string, status: InvoiceStatus) {
    return invoiceRepository.updateStatus(id, status);
  },
};