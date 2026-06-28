import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const customer = await prisma.customer.create({
      data: {
        type: "PRIVATE",
        firstName: "Test",
        lastName: "Customer",
        email: `test-${Date.now()}@hexa-clean.local`,
        phone: "+41000000000",
        city: "Biel/Bienne",
        country: "CH",
        notes: "Test customer created from db-write-test API",
      },
    });

    const session = await prisma.session.create({
      data: {
        customerId: customer.id,
        source: "db-write-test",
        status: "ACTIVE",
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-${Date.now()}`,
        customerId: customer.id,
        sessionId: session.id,
        serviceType: "REINIGUNG",
        title: "Test cleaning order",
        description: "Test order created from API",
        status: "NEW",
        estimatedPrice: 150,
        currency: "CHF",
        serviceCity: "Biel/Bienne",
        serviceCountry: "CH",
      },
    });

    return NextResponse.json({
      status: "OK",
      message: "Test data created",
      data: {
        customerId: customer.id,
        sessionId: session.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}