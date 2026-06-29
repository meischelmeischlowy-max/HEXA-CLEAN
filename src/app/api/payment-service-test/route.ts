import { NextResponse } from "next/server";

import { paymentService } from "@/services/paymentService";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const invoiceId = body.invoiceId;
    const amount = body.amount ?? 100;

    if (!invoiceId) {
      return NextResponse.json(
        {
          layer: "payment-service",
          message: "Missing invoiceId",
          hint: "Send invoiceId in POST body.",
        },
        { status: 400 }
      );
    }

    const payment = await paymentService.createPayment({
      invoiceId,
      amount,
      status: "PENDING" as never,
    });

    const paidPayment = await paymentService.markAsPaid(payment.id);

    const loadedPayments = await paymentService.getPaymentsByInvoiceId(invoiceId);

    return NextResponse.json({
      layer: "payment-service",
      message: "Payment Service works",
      test: {
        paymentCreated: true,
        paymentId: payment.id,
        paymentStatusBefore: payment.status,
        paymentStatusAfter: paidPayment.status,
        invoiceId,
        paymentsForInvoice: loadedPayments.length,
      },
      data: {
        payment,
        paidPayment,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "payment-service",
        message: "Payment Service failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
