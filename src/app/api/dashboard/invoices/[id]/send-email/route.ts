import { NextResponse } from "next/server";

import {
  sendInvoiceEmailWorkflow,
} from "@/lib/invoice-email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    const result =
      await sendInvoiceEmailWorkflow(id);

    return NextResponse.json(
      {
        success: result.ok,
        message: result.message,
        data: result,
      },
      {
        status: result.statusCode,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Invoice email retry endpoint error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unbekannter Fehler beim Rechnungsversand.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
