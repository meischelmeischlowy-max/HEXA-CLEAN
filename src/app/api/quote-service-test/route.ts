import { NextResponse } from "next/server";
import { customerService } from "@/services/customerService";
import { sessionService } from "@/services/sessionService";
import { orderService } from "@/services/orderService";
import { quoteService } from "@/services/quoteService";

export async function POST() {
  try {
    const timestamp = Date.now();

    const customerResult = await customerService.createOrFindCustomer({
      type: "PRIVATE",
      firstName: "Quote",
      lastName: "Service Test",
      email: `quote-service-${timestamp}@hexa-clean.local`,
      phone: "+41000000006",
      city: "Biel/Bienne",
      country: "CH",
    });

    const session = await sessionService.startSession({
      customerId: customerResult.customer.id,
      source: "quote-service-test",
    });

    const order = await orderService.createOrder({
      customerId: customerResult.customer.id,
      sessionId: session.id,
      serviceType: "REINIGUNG",
      title: "Quote Service test order",
      estimatedPrice: 500,
      currency: "CHF",
      serviceCity: "Biel/Bienne",
      serviceCountry: "CH",
    });

    const quote = await quoteService.createQuote({
      customerId: customerResult.customer.id,
      orderId: order.id,
      sessionId: session.id,
      subtotal: 500,
      taxRate: 0,
      currency: "CHF",
      items: [
        {
          name: "Reinigung",
          quantity: 1,
          unitPrice: 500,
          total: 500,
        },
      ],
      notes: "Test quote created through Quote Service",
    });

    const sentQuote = await quoteService.updateQuoteStatus(quote.id, "SENT");
    const loadedQuote = await quoteService.getQuoteById(quote.id);

    return NextResponse.json({
      status: "OK",
      layer: "quote-service",
      message: "Quote Service works",
      test: {
        customerCreated: customerResult.wasCreated,
        sessionCreated: Boolean(session.id),
        orderCreated: Boolean(order.id),
        quoteCreated: Boolean(quote.id),
        quoteNumber: quote.quoteNumber,
        quoteStatus: sentQuote.status,
        loadedQuoteId: loadedQuote.id,
        total: quote.total,
      },
      data: {
        customerId: customerResult.customer.id,
        sessionId: session.id,
        orderId: order.id,
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        layer: "quote-service",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}