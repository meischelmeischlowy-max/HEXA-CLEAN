import { NextResponse } from "next/server";
import { customerRepository } from "@/repositories/customerRepository";
import { sessionRepository } from "@/repositories/sessionRepository";
import { orderRepository } from "@/repositories/orderRepository";

export async function POST() {
  try {
    const timestamp = Date.now();

    const customer = await customerRepository.create({
      type: "PRIVATE",
      firstName: "Repository",
      lastName: "Test",
      email: `repository-test-${timestamp}@hexa-clean.local`,
      phone: "+41000000001",
      city: "Biel/Bienne",
      country: "CH",
      notes: "Created through Repository Layer test",
    });

    const session = await sessionRepository.create({
      customerId: customer.id,
      source: "repository-test",
      status: "ACTIVE",
    });

    const order = await orderRepository.create({
      orderNumber: `REPO-${timestamp}`,
      customerId: customer.id,
      sessionId: session.id,
      serviceType: "REINIGUNG",
      title: "Repository test order",
      description: "Order created through Repository Layer",
      status: "NEW",
      estimatedPrice: 250,
      currency: "CHF",
      serviceCity: "Biel/Bienne",
      serviceCountry: "CH",
    });

    const fullOrder = await orderRepository.findById(order.id);

    return NextResponse.json({
      status: "OK",
      layer: "repository",
      message: "Repository Layer works",
      data: {
        customerId: customer.id,
        sessionId: session.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        fullOrder,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        layer: "repository",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}