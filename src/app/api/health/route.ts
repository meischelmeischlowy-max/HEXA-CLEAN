import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ok",
    service: "HEXA CLEAN Backend",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
}