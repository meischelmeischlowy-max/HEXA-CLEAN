import { NextResponse } from "next/server";

import {
  sendInvoiceEmailWorkflow,
} from "@/lib/invoice-email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    let force = false;

    try {
      const body = (await request.json()) as {
        force?: unknown;
      };

      force = body.force === true;
    } catch {
      force = false;
    }

    const result =
      await sendInvoiceEmailWorkflow(
        id,
        {
          force,
        },
      );

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
