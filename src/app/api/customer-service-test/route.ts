import { NextResponse } from "next/server";
import { customerService } from "@/services/customerService";

export async function POST() {
  try {
    const timestamp = Date.now();
    const email = `customer-service-${timestamp}@hexa-clean.local`;

    const firstCall = await customerService.createOrFindCustomer({
      type: "PRIVATE",
      firstName: "Customer",
      lastName: "Service Test",
      email,
      phone: "+41000000002",
      city: "Biel/Bienne",
      country: "CH",
      notes: "First call from Customer Service test",
    });

    const secondCall = await customerService.createOrFindCustomer({
      type: "PRIVATE",
      firstName: "Customer Duplicate",
      lastName: "Service Test",
      email,
      phone: "+41000000002",
      city: "Biel/Bienne",
      country: "CH",
      notes: "Second call should find existing customer",
    });

    return NextResponse.json({
      status: "OK",
      layer: "customer-service",
      message: "Customer Service works",
      test: {
        firstCallCreated: firstCall.wasCreated,
        secondCallCreated: secondCall.wasCreated,
        secondCallMatchedBy: secondCall.matchedBy,
        sameCustomer:
          firstCall.customer.id === secondCall.customer.id,
      },
      customer: {
        id: firstCall.customer.id,
        email: firstCall.customer.email,
        phone: firstCall.customer.phone,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        layer: "customer-service",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}