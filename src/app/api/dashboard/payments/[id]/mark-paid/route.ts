import { NextResponse } from "next/server";
import {
  sendPaymentConfirmationWorkflow,
} from "@/lib/payment-confirmation-service";

import { dashboardPaymentActionsRepository } from "@/repositories/dashboardPaymentActionsRepository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const result = await dashboardPaymentActionsRepository.markPaymentAsPaid(id);

  if (!result) {
    return NextResponse.json(
      {
        status: "NOT_FOUND",
        message: "Payment not found",
        paymentId: id,
      },
      { status: 404 }
    );
  }

  const finalInvoice =
    result.updatedInvoice ??
    result.invoice;

  const paymentConfirmation =
    finalInvoice?.status === "PAID"
      ? await sendPaymentConfirmationWorkflow(
          finalInvoice.id,
        )
      : null;

  return NextResponse.json(
    {
      status: "OK",
      message: result.updated
        ? "Payment marked as paid"
        : "Payment was already paid",
      paymentId: id,
      invoiceId: result.updatedInvoice?.id ?? result.invoice?.id ?? null,
      updated: result.updated,
      payment: result.payment,
      invoice: finalInvoice,
      paymentConfirmation,
    },
    {
      status: 200,
    }
  );
}