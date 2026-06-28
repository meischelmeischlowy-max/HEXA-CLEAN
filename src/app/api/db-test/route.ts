import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const customersCount = await prisma.customer.count();
    const sessionsCount = await prisma.session.count();
    const ordersCount = await prisma.order.count();

    return NextResponse.json({
      status: "OK",
      database: "connected",
      counts: {
        customers: customersCount,
        sessions: sessionsCount,
        orders: ordersCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        database: "not_connected",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}