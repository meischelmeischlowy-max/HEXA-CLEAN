import { NextResponse } from "next/server";
import { customerService } from "@/services/customerService";
import { sessionService } from "@/services/sessionService";
import { conversationService } from "@/services/conversationService";

export async function POST() {
  try {
    const timestamp = Date.now();

    const customerResult = await customerService.createOrFindCustomer({
      type: "PRIVATE",
      firstName: "Conversation",
      lastName: "Service Test",
      email: `conversation-service-${timestamp}@hexa-clean.local`,
      phone: "+41000000005",
      city: "Biel/Bienne",
      country: "CH",
      notes: "Customer created for Conversation Service test",
    });

    const session = await sessionService.startSession({
      customerId: customerResult.customer.id,
      source: "conversation-service-test",
    });

    const userMessage = await conversationService.addUserMessage(
      session.id,
      "Hallo, ich brauche eine Reinigung.",
      customerResult.customer.id
    );

    const assistantMessage = await conversationService.addAssistantMessage(
      session.id,
      "Gerne. Um welche Reinigung geht es genau?",
      customerResult.customer.id
    );

    const history = await conversationService.getHistory(session.id);

    return NextResponse.json({
      status: "OK",
      layer: "conversation-service",
      message: "Conversation Service works",
      test: {
        customerCreated: customerResult.wasCreated,
        sessionCreated: Boolean(session.id),
        userMessageCreated: Boolean(userMessage.id),
        assistantMessageCreated: Boolean(assistantMessage.id),
        historyCount: history.length,
        firstRole: history[0]?.role,
        secondRole: history[1]?.role,
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
        layer: "conversation-service",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}