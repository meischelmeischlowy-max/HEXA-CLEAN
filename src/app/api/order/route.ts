import { NextResponse } from "next/server";
import { createSession } from "@/lib/session/sessionEngine";
import { createOrder } from "@/lib/orders/orderEngine";

export async function GET() {
  const session = createSession();

  const order = createOrder({
    sessionId: session.sessionId,
    orderId: session.orderId,
    customer: {
      name: "Max Muster",
      email: "kunde@example.com",
      phone: "+41 76 123 45 67",
      address: "Musterstrasse 12",
      city: "Zürich",
    },
    serviceDetails: {
      service: "Wohnungsreinigung",
      area: 80,
      windows: 6,
      floor: "2",
      elevator: true,
      appointment: "2026-07-01",
      notes: "Testowe zamówienie backendu.",
    },
    estimatedPrice: 350,
  });

  return NextResponse.json({
    success: true,
    message: "HEXA CLEAN order created",
    data: order,
  });
}