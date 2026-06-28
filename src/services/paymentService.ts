import { PaymentStatus, Prisma } from "@prisma/client";
import { invoiceRepository } from "@/repositories/invoiceRepository";
import { paymentRepository } from "@/repositories/paymentRepository";

type CreatePaymentInput = {
  invoiceId: string;
  amount: number;
  status?: PaymentStatus;
};

export const paymentService = {
  async createPayment(input: CreatePaymentInput) {
    const invoice = await invoiceRepository.findById(input.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (!input.amount || input.amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    return paymentRepository.create({
      invoice: {
        connect: {
          id: input.invoiceId,
        },
      },
      amount: new Prisma.Decimal(input.amount),
      status: input.status ?? PaymentStatus.PENDING,
    });
  },

  async getPaymentById(id: string) {
    return paymentRepository.findById(id);
  },

  async getPaymentsByInvoiceId(invoiceId: string) {
    return paymentRepository.findByInvoiceId(invoiceId);
  },

  async markAsPending(id: string) {
    return paymentRepository.updateStatus(id, PaymentStatus.PENDING);
  },

  async markAsPaid(id: string) {
    return paymentRepository.updateStatus(id, PaymentStatus.PAID);
  },

  async markAsFailed(id: string) {
    return paymentRepository.updateStatus(id, PaymentStatus.FAILED);
  },
};