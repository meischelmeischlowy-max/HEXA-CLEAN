import { NextResponse } from "next/server";

import { dashboardInvoiceActionsRepository } from "@/repositories/dashboardInvoiceActionsRepository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const result = await dashboardInvoiceActionsRepository.markInvoiceAsSent(id);

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
      message: result.updated
        ? "Invoice marked as sent"
        : "Invoice was already sent or paid",
      invoiceId: id,
      updated: result.updated,
      invoice: result.updatedInvoice,
    },
    {
      status: 200,
    }
  );
}