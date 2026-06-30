import { NextResponse } from "next/server";

import { dashboardPaymentActionsRepository } from "@/repositories/dashboardPaymentActionsRepository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const result =
    await dashboardPaymentActionsRepository.createPaymentFromInvoice(id);

  if (!result) {
    return NextResponse.json(
      {
        status: "NOT_FOUND",
        message: "Invoice not found",
        invoiceId: id,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      status: "OK",
      message: result.created
        ? "Payment created from invoice"
        : "Payment already exists for invoice",
      invoiceId: id,
      paymentId: result.payment.id,
      created: result.created,
      invoice: result.invoice,
      payment: result.payment,
    },
    {
      status: result.created ? 201 : 200,
    }
  );
}