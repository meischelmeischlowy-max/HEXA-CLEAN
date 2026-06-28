import { NextResponse } from "next/server";
import { customerService } from "@/services/customerService";
import { sessionService } from "@/services/sessionService";
import { orderService } from "@/services/orderService";

export async function POST() {
  try {
    const timestamp = Date.now();

    const customerResult = await customerService.createOrFindCustomer({
      type: "PRIVATE",
      firstName: "Order",
      lastName: "Service Test",
      email: `order-service-${timestamp}@hexa-clean.local`,
      phone: "+41000000004",
      city: "Biel/Bienne",
      country: "CH",
      notes: "Customer created for Order Service test",
    });

    const session = await sessionService.startSession({
      customerId: customerResult.customer.id,
      source: "order-service-test",
    });

    const order = await orderService.createOrder({
      customerId: customerResult.customer.id,
      sessionId: session.id,
      serviceType: "REINIGUNG",
      title: "Order Service test cleaning",
      description: "Order created through Order Service",
      estimatedPrice: 320,
      currency: "CHF",
      serviceStreet: "Teststrasse 1",
      serviceZipCode: "2500",
      serviceCity: "Biel/Bienne",
      serviceCountry: "CH",
      notesCustomer: "Customer note from test",
      notesInternal: "Internal note from test",
    });

    const loadedOrder = await orderService.getOrderById(order.id);

    const confirmedOrder = await orderService.updateOrderStatus(
      order.id,
      "CONFIRMED"
    );

    return NextResponse.json({
      status: "OK",
      layer: "order-service",
      message: "Order Service works",
      test: {
        customerCreated: customerResult.wasCreated,
        sessionCreated: Boolean(session.id),
        orderCreated: Boolean(order.id),
        orderNumber: order.orderNumber,
        loadedOrderId: loadedOrder.id,
        confirmedStatus: confirmedOrder.status,
      },
      data: {
        customerId: customerResult.customer.id,
        sessionId: session.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        layer: "order-service",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}