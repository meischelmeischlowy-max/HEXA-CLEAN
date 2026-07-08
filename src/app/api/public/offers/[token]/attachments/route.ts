import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  AttachmentType,
  AuditAction,
  PrismaClient,
  QuoteStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  createPublicOfferTokenHash,
  createPublicOfferTokenPrefix,
  isPublicOfferLinkExpired,
  normalizePublicOfferToken,
} from "@/lib/public-offer-links";
import {
  checkPublicRateLimit,
  logPublicAccessEvent,
  logPublicSecurityEvent,
} from "@/lib/public-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_OFFER_UPLOAD_RATE_LIMIT = 10;
const PUBLIC_OFFER_UPLOAD_RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_QUOTE = 30;
const MAX_NOTE_LENGTH = 500;

type DetectedFileKind = "jpg" | "png" | "webp" | "pdf" | "heic";

type AllowedUpload = {
  kind: DetectedFileKind;
  mimeTypes: string[];
  extensions: string[];
  attachmentType: AttachmentType;
};

const ALLOWED_UPLOADS: AllowedUpload[] = [
  {
    kind: "jpg",
    mimeTypes: ["image/jpeg"],
    extensions: [".jpg", ".jpeg"],
    attachmentType: AttachmentType.PHOTO,
  },
  {
    kind: "png",
    mimeTypes: ["image/png"],
    extensions: [".png"],
    attachmentType: AttachmentType.PHOTO,
  },
  {
    kind: "webp",
    mimeTypes: ["image/webp"],
    extensions: [".webp"],
    attachmentType: AttachmentType.PHOTO,
  },
  {
    kind: "heic",
    mimeTypes: ["image/heic", "image/heif"],
    extensions: [".heic", ".heif"],
    attachmentType: AttachmentType.PHOTO,
  },
  {
    kind: "pdf",
    mimeTypes: ["application/pdf"],
    extensions: [".pdf"],
    attachmentType: AttachmentType.DOCUMENT,
  },
];

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });
  }

  return globalForPrisma.hexaPrisma;
}

function responseHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);

  headers.set("Cache-Control", "no-store");

  return headers;
}

function jsonError(
  message: string,
  status = 400,
  details?: Record<string, unknown>,
  extraHeaders?: HeadersInit,
) {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      message,
      ...(details ? { details } : {}),
    },
    {
      status,
      headers: responseHeaders(extraHeaders),
    },
  );
}

function jsonSuccess(
  data: Record<string, unknown>,
  status = 200,
  extraHeaders?: HeadersInit,
) {
  return NextResponse.json(
    {
      ok: true,
      success: true,
      ...data,
    },
    {
      status,
      headers: responseHeaders(extraHeaders),
    },
  );
}

function safePositiveInt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function safeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.replace(/\s+/g, " ").trim();

  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

function getFileExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return normalizedName.slice(lastDotIndex);
}

function sanitizeFileName(fileName: string, fallbackExtension: string) {
  const cleanedName = fileName
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  if (!cleanedName) {
    return `kunden-upload-${Date.now()}${fallbackExtension}`;
  }

  if (!getFileExtension(cleanedName) && fallbackExtension) {
    return `${cleanedName}${fallbackExtension}`;
  }

  return cleanedName;
}

function bufferStartsWith(buffer: Buffer, signature: number[]) {
  if (buffer.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => buffer[index] === byte);
}

function detectFileKind(buffer: Buffer): DetectedFileKind | null {
  if (bufferStartsWith(buffer, [0xff, 0xd8, 0xff])) {
    return "jpg";
  }

  if (bufferStartsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "pdf";
  }

  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();

    if (["heic", "heix", "hevc", "hevx", "heif", "mif1", "msf1"].includes(brand)) {
      return "heic";
    }
  }

  return null;
}

function getAllowedUpload(fileName: string, mimeType: string, detectedKind: DetectedFileKind) {
  const extension = getFileExtension(fileName);
  const normalizedMimeType = mimeType.trim().toLowerCase();

  return (
    ALLOWED_UPLOADS.find((upload) => {
      return (
        upload.kind === detectedKind &&
        upload.mimeTypes.includes(normalizedMimeType) &&
        upload.extensions.includes(extension)
      );
    }) ?? null
  );
}

function createFileHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const startedAt = Date.now();
  const requestBytes = safePositiveInt(request.headers.get("content-length"));

  try {
    const { token } = await context.params;
    const rawToken = normalizePublicOfferToken(token);

    const rateLimit = checkPublicRateLimit(request, {
      scope: "public_offer_upload",
      limit: PUBLIC_OFFER_UPLOAD_RATE_LIMIT,
      windowMs: PUBLIC_OFFER_UPLOAD_RATE_WINDOW_MS,
      token: rawToken ?? token,
    });

    if (!rateLimit.allowed) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "rate_limit_exceeded",
        severity: "warning",
        token: rawToken ?? token,
        extra: {
          limit: rateLimit.limit,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 429,
        success: false,
        token: rawToken ?? token,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Zu viele Upload-Versuche. Bitte versuchen Sie es später erneut.",
        429,
        undefined,
        rateLimit.headers,
      );
    }

    if (!rawToken) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "invalid_token_format",
        severity: "warning",
        token,
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 404,
        success: false,
        token,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError("Dieser Angebotslink ist nicht verfügbar.", 404, undefined, rateLimit.headers);
    }

    if (requestBytes && requestBytes > MAX_FILE_SIZE_BYTES + 1024 * 1024) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "request_too_large",
        severity: "warning",
        token: rawToken,
        extra: {
          requestBytes,
          maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 413,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Die Datei ist zu gross. Maximal erlaubt sind 6 MB.",
        413,
        {
          maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        },
        rateLimit.headers,
      );
    }

    const prisma = getPrisma();
    const tokenHash = createPublicOfferTokenHash(rawToken);
    const now = new Date();

    const link = await prisma.publicOfferLink.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        customerId: true,
        expiresAt: true,
        revokedAt: true,
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            customerId: true,
            orderId: true,
            sessionId: true,
            validUntil: true,
          },
        },
      },
    });

    if (!link) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "token_not_found",
        severity: "warning",
        token: rawToken,
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 404,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError("Dieser Angebotslink ist nicht verfügbar.", 404, undefined, rateLimit.headers);
    }

    if (link.revokedAt) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "revoked_link_upload_attempt",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 410,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Dieser Angebotslink ist nicht mehr aktiv.",
        410,
        undefined,
        rateLimit.headers,
      );
    }

    if (isPublicOfferLinkExpired(link.expiresAt, now)) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "expired_link_upload_attempt",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 410,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Dieser Angebotslink ist abgelaufen.",
        410,
        undefined,
        rateLimit.headers,
      );
    }

    if (link.quote.validUntil && link.quote.validUntil.getTime() <= now.getTime()) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "expired_quote_upload_attempt",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 410,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Die Gültigkeit der Offerte ist bereits abgelaufen.",
        410,
        undefined,
        rateLimit.headers,
      );
    }

    if (link.quote.status !== QuoteStatus.SENT) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "quote_not_uploadable",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
          quoteStatus: link.quote.status,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 409,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Für diese Offerte können aktuell keine Dateien hochgeladen werden.",
        409,
        {
          quoteStatus: link.quote.status,
        },
        rateLimit.headers,
      );
    }

    const currentAttachmentCount = await prisma.attachment.count({
      where: {
        quoteId: link.quote.id,
      },
    });

    if (currentAttachmentCount >= MAX_ATTACHMENTS_PER_QUOTE) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "quote_attachment_limit_reached",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
          currentAttachmentCount,
          maxAttachmentsPerQuote: MAX_ATTACHMENTS_PER_QUOTE,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 409,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Für diese Offerte wurden bereits zu viele Dateien hochgeladen.",
        409,
        {
          maxAttachmentsPerQuote: MAX_ATTACHMENTS_PER_QUOTE,
        },
        rateLimit.headers,
      );
    }

    const formData = await request.formData();
    const fileValue = formData.get("file");
    const note = safeText(formData.get("note"), MAX_NOTE_LENGTH);

    if (!(fileValue instanceof File)) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "missing_upload_file",
        severity: "info",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 400,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Bitte wählen Sie eine Datei aus.",
        400,
        undefined,
        rateLimit.headers,
      );
    }

    if (fileValue.size <= 0) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "empty_upload_file",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
          fileName: fileValue.name,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 400,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Die Datei ist leer.",
        400,
        undefined,
        rateLimit.headers,
      );
    }

    if (fileValue.size > MAX_FILE_SIZE_BYTES) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "upload_file_too_large",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
          fileName: fileValue.name,
          fileSize: fileValue.size,
          maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 413,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Die Datei ist zu gross. Maximal erlaubt sind 6 MB.",
        413,
        {
          maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
        },
        rateLimit.headers,
      );
    }

    const extension = getFileExtension(fileValue.name);
    const arrayBuffer = await fileValue.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const detectedKind = detectFileKind(fileBuffer);

    if (!detectedKind) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "unsupported_or_unreadable_file_signature",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
          fileName: fileValue.name,
          mimeType: fileValue.type,
          extension,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 400,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Dieser Dateityp ist nicht erlaubt. Erlaubt sind JPG, PNG, WEBP, HEIC und PDF.",
        400,
        undefined,
        rateLimit.headers,
      );
    }

    const allowedUpload = getAllowedUpload(
      fileValue.name,
      fileValue.type,
      detectedKind,
    );

    if (!allowedUpload) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_upload",
        reason: "upload_mime_extension_mismatch",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
          fileName: fileValue.name,
          mimeType: fileValue.type,
          extension,
          detectedKind,
        },
      });

      logPublicAccessEvent(request, {
        scope: "public_offer_upload",
        statusCode: 400,
        success: false,
        token: rawToken,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
      });

      return jsonError(
        "Dateiname, Dateityp und Dateiinhalt passen nicht zusammen.",
        400,
        undefined,
        rateLimit.headers,
      );
    }

    const safeFileName = sanitizeFileName(fileValue.name, allowedUpload.extensions[0] ?? "");
    const fileHashSha256 = createFileHash(fileBuffer);
    const dataUrl = `data:${allowedUpload.mimeTypes[0]};base64,${fileBuffer.toString("base64")}`;
    const tokenPrefix = createPublicOfferTokenPrefix(rawToken);

    const attachment = await prisma.$transaction(async (tx) => {
      const createdAttachment = await tx.attachment.create({
        data: {
          customerId: link.customerId,
          orderId: link.quote.orderId,
          sessionId: link.quote.sessionId,
          quoteId: link.quote.id,
          type: allowedUpload.attachmentType,
          fileName: safeFileName,
          mimeType: allowedUpload.mimeTypes[0],
          url: dataUrl,
          sizeBytes: fileBuffer.length,
          uploadedBy: "customer_public_link",
          metadata: {
            source: "public_offer_upload",
            storage: "database_data_url",
            publicOfferLinkId: link.id,
            tokenPrefix,
            rawTokenStored: false,
            tokenHashStoredOnly: true,
            fileHashSha256,
            originalMimeType: fileValue.type,
            detectedKind,
            note,
          },
        },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          type: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          customerId: link.customerId,
          orderId: link.quote.orderId,
          sessionId: link.quote.sessionId,
          action: AuditAction.CREATE,
          entityType: "Attachment",
          entityId: createdAttachment.id,
          actorType: "customer_public_link",
          after: {
            attachmentId: createdAttachment.id,
            quoteId: link.quote.id,
            quoteNumber: link.quote.quoteNumber,
            fileName: createdAttachment.fileName,
            mimeType: createdAttachment.mimeType,
            sizeBytes: createdAttachment.sizeBytes,
            type: createdAttachment.type,
            publicOfferLinkId: link.id,
          },
          message: `Kundendatei ${createdAttachment.fileName} wurde über den öffentlichen Angebotslink hochgeladen.`,
          metadata: {
            source: "public_offer_upload",
            securityHardened: true,
            rawTokenStored: false,
            tokenHashStoredOnly: true,
            publicOfferLinkId: link.id,
            quoteId: link.quote.id,
            quoteNumber: link.quote.quoteNumber,
            tokenPrefix,
            fileHashSha256,
          },
        },
      });

      return createdAttachment;
    });

    logPublicAccessEvent(request, {
      scope: "public_offer_upload",
      statusCode: 201,
      success: true,
      token: rawToken,
      rateLimit,
      requestBytes,
      responseMs: Date.now() - startedAt,
      extra: {
        attachmentId: attachment.id,
        quoteId: link.quote.id,
        fileType: attachment.type,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      },
    });

    return jsonSuccess(
      {
        message: "Die Datei wurde erfolgreich hochgeladen.",
        attachment: {
          id: attachment.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          type: attachment.type,
          createdAt: attachment.createdAt.toISOString(),
        },
      },
      201,
      rateLimit.headers,
    );
  } catch (error) {
    console.error("Public offer upload error:", error);

    logPublicAccessEvent(request, {
      scope: "public_offer_upload",
      statusCode: 500,
      success: false,
      requestBytes,
      responseMs: Date.now() - startedAt,
    });

    return jsonError(
      "Die Datei konnte nicht hochgeladen werden.",
      500,
    );
  }
}