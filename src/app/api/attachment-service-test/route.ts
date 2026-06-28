import { NextResponse } from "next/server";
import { AttachmentType, Prisma } from "@prisma/client";
import { attachmentService } from "@/services/attachmentService";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const allowedTypes = Object.values(AttachmentType);

    const typeFromBody =
      typeof body.type === "string" ? body.type : AttachmentType.OTHER;

    if (!allowedTypes.includes(typeFromBody as AttachmentType)) {
      return NextResponse.json(
        {
          layer: "attachment-service",
          message: "Invalid attachment type",
          allowedTypes,
        },
        { status: 400 }
      );
    }

    const attachmentData: Prisma.AttachmentCreateInput = {
      type: typeFromBody as AttachmentType,
      fileName: body.fileName ?? "test-photo.jpg",
      mimeType: body.mimeType ?? "image/jpeg",
      url: body.url ?? "https://hexa-clean.ch/test/test-photo.jpg",
      sizeBytes: body.sizeBytes ?? 123456,
      uploadedBy: body.uploadedBy ?? "system",
      metadata: {
        source: "attachment-service-test",
        description: "Test attachment created by HEXA OS backend",
      },

      ...(body.customerId
        ? {
            customer: {
              connect: {
                id: body.customerId,
              },
            },
          }
        : {}),

      ...(body.orderId
        ? {
            order: {
              connect: {
                id: body.orderId,
              },
            },
          }
        : {}),

      ...(body.sessionId
        ? {
            session: {
              connect: {
                id: body.sessionId,
              },
            },
          }
        : {}),

      ...(body.quoteId
        ? {
            quote: {
              connect: {
                id: body.quoteId,
              },
            },
          }
        : {}),

      ...(body.invoiceId
        ? {
            invoice: {
              connect: {
                id: body.invoiceId,
              },
            },
          }
        : {}),
    };

    const attachment = await attachmentService.createAttachment(attachmentData);

    const loadedAttachment = await attachmentService.getAttachmentById(
      attachment.id
    );

    const attachments = await attachmentService.getAllAttachments();

    return NextResponse.json({
      layer: "attachment-service",
      message: "Attachment Service works",
      test: {
        attachmentCreated: true,
        attachmentId: attachment.id,
        loadedAttachmentId: loadedAttachment?.id,
        fileName: attachment.fileName,
        type: attachment.type,
        attachmentsCount: attachments.length,
        allowedTypes,
      },
      data: {
        attachment,
      },
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