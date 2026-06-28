import { NextResponse } from "next/server";
import { customerService } from "@/services/customerService";
import { sessionService } from "@/services/sessionService";

export async function POST() {
  try {
    const timestamp = Date.now();

    const customerResult = await customerService.createOrFindCustomer({
      type: "PRIVATE",
      firstName: "Session",
      lastName: "Service Test",
      email: `session-service-${timestamp}@hexa-clean.local`,
      phone: "+41000000003",
      city: "Biel/Bienne",
      country: "CH",
      notes: "Customer created for Session Service test",
    });

    const session = await sessionService.startSession({
      customerId: customerResult.customer.id,
      source: "session-service-test",
    });

    const loadedSession = await sessionService.getSessionById(session.id);

    const completedSession = await sessionService.completeSession(session.id);

    return NextResponse.json({
      status: "OK",
      layer: "session-service",
      message: "Session Service works",
      test: {
        customerCreated: customerResult.wasCreated,
        sessionCreated: Boolean(session.id),
        loadedSessionId: loadedSession.id,
        completedStatus: completedSession.status,
        hasEndedAt: Boolean(completedSession.endedAt),
      },
      data: {
        customerId: customerResult.customer.id,
        sessionId: session.id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        layer: "session-service",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}