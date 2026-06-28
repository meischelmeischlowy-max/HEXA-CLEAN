import { NextResponse } from "next/server";
import { createSession } from "@/lib/session/sessionEngine";

export async function GET() {
  const session = createSession();

  return NextResponse.json({
    success: true,
    message: "HEXA CLEAN session created",
    data: session,
  });
}