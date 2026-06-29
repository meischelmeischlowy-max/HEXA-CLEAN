import { NextResponse } from "next/server";

import { attachmentService } from "@/services/attachmentService";

export async function POST() {
  try {
    const attachment = await attachmentService.createAttachment({
      type: "OTHER" as never,
      fileName: `test-attachment-${Date.now()}.txt`,
      mimeType: "text/plain",
      url: "https://example.com/test-attachment.txt",
      sizeBytes: 1234,
      uploadedBy: "system",
      metadata: {
        source: "attachment-service-test",
      },
    });

    return NextResponse.json({
      layer: "attachment-service",
      message: "Attachment Service works",
      test: {
        attachmentCreated: true,
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        type: attachment.type,
      },
      data: attachment,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "attachment-service",
        message: "Attachment Service failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}