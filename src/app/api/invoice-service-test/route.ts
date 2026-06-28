import { NextResponse } from "next/server";
import { customerService } from "@/services/customerService";
import { invoiceService } from "@/services/invoiceService";

export async function POST() {
  try {
    const timestamp = Date.now();

    const customerResult = await customerService.createOrFindCustomer({
      type: "PRIVATE",
      firstName: "Invoice",
      lastName: "Service Test",
      email: `invoice-service-${timestamp}@hexa-clean.local`,
      phone: "+41000000005",
      city: "Biel/Bienne",
      country: "CH",
      notes: "Customer created for Invoice Service test",
    });

    const invoice = await invoiceService.createInvoice({
      customerId: customerResult.customer.id,
      subtotal: 250,
      taxRate: 7.7,
      currency: "CHF",
      notes: "Invoice created through Invoice Service",
    });

    const loadedInvoice = await invoiceService.getInvoiceById(invoice.id);
    const sentInvoice = await invoiceService.updateInvoiceStatus(invoice.id, "SENT");

    return NextResponse.json({
      status: "OK",
      layer: "invoice-service",
      message: "Invoice Service works",
      test: {
        customerCreated: customerResult.wasCreated,
        invoiceCreated: Boolean(invoice.id),
        invoiceNumber: invoice.invoiceNumber,
        loadedInvoiceId: loadedInvoice.id,
        invoiceStatus: sentInvoice.status,
      },
      data: {
        customerId: customerResult.customer.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        layer: "invoice-service",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
