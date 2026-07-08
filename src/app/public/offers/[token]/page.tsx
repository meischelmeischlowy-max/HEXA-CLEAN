import { PrismaClient, QuoteStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import PublicOfferAcceptButton from "@/components/public/PublicOfferAcceptButton";
import PublicOfferUploadBox from "@/components/public/PublicOfferUploadBox";
import {
  createPublicOfferTokenHash,
  isPublicOfferLinkExpired,
  normalizePublicOfferToken,
} from "@/lib/public-offer-links";
import {
  checkPublicRateLimit,
  logPublicSecurityEvent,
} from "@/lib/public-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_OFFER_PAGE_RATE_LIMIT = 30;
const PUBLIC_OFFER_PAGE_RATE_WINDOW_MS = 60 * 1000;

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type PublicOfferItem = {
  name: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  total: string;
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

async function createPublicPageSecurityRequest(path: string) {
  const requestHeaders = await headers();
  const safeHeaders = new Headers();

  for (const headerName of [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "user-agent",
  ]) {
    const value = requestHeaders.get(headerName);

    if (value) {
      safeHeaders.set(headerName, value);
    }
  }

  return new NextRequest(`http://localhost${path}`, {
    headers: safeHeaders,
  });
}

function decimalToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "0.00";
  }

  if (typeof value === "object" && "toString" in value) {
    return String(value.toString());
  }

  return String(value);
}

function formatMoney(value: unknown, currency = "CHF") {
  const amount = Number(decimalToString(value));

  if (!Number.isFinite(amount)) {
    return `${decimalToString(value)} ${currency}`;
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function serializeCustomerName(customer: {
  type: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}) {
  if (customer.type === "COMPANY") {
    return customer.companyName || "Kunde";
  }

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Kunde";
}

function readString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (value && typeof value === "object" && "toString" in value) {
    return String(value.toString());
  }

  return fallback;
}

function readNullableString(value: unknown) {
  const text = readString(value).trim();

  return text.length > 0 ? text : null;
}

function normalizeOfferItems(items: unknown): PublicOfferItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const itemRecord = item as Record<string, unknown>;
      const name = readString(itemRecord.name, "Leistung").trim() || "Leistung";

      return {
        name,
        description: readNullableString(itemRecord.description),
        quantity: readString(itemRecord.quantity, "1"),
        unitPrice: readString(itemRecord.unitPrice, "0.00"),
        subtotal: readString(itemRecord.subtotal, "0.00"),
        total: readString(itemRecord.total ?? itemRecord.subtotal, "0.00"),
      };
    })
    .filter((item): item is PublicOfferItem => Boolean(item));
}

function statusLabel(status: QuoteStatus) {
  switch (status) {
    case QuoteStatus.ACCEPTED:
      return "Akzeptiert";
    case QuoteStatus.SENT:
      return "Zur Prüfung";
    case QuoteStatus.REJECTED:
      return "Abgelehnt";
    case QuoteStatus.EXPIRED:
      return "Abgelaufen";
    default:
      return "Nicht verfügbar";
  }
}

function ErrorView({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_120px_rgba(15,23,42,0.65)]">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-red-300">
            HEXA CLEAN
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">{message}</p>
          <p className="mt-8 text-xs leading-6 text-slate-500">
            Aus Sicherheitsgründen werden keine weiteren Kundendaten angezeigt.
          </p>
        </section>
      </div>
    </main>
  );
}

function DecisionStatusBox({
  status,
  acceptedAt,
}: {
  status: QuoteStatus;
  acceptedAt: Date | null;
}) {
  if (status === QuoteStatus.ACCEPTED) {
    return (
      <section className="rounded-[2rem] border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-100 shadow-[0_25px_90px_rgba(16,185,129,0.16)]">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200">
          Offerte akzeptiert
        </p>
        <p className="mt-3 text-sm leading-7 text-emerald-50">
          Diese Offerte wurde bereits akzeptiert
          {acceptedAt ? ` am ${formatDateTime(acceptedAt)}` : ""}.
        </p>
      </section>
    );
  }

  if (status === QuoteStatus.REJECTED) {
    return (
      <section className="rounded-[2rem] border border-red-400/30 bg-red-500/10 p-6 text-red-100 shadow-[0_25px_90px_rgba(239,68,68,0.14)]">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-200">
          Offerte abgelehnt
        </p>
        <p className="mt-3 text-sm leading-7 text-red-50">
          Diese Offerte wurde bereits abgelehnt. Für eine neue Offerte kontaktieren
          Sie bitte HEXA CLEAN.
        </p>
      </section>
    );
  }

  return null;
}

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const rawToken = normalizePublicOfferToken(token);
  const securityRequest = await createPublicPageSecurityRequest(
    `/public/offers/${encodeURIComponent(token)}`,
  );

  const rateLimit = checkPublicRateLimit(securityRequest, {
    scope: "public_offer_page",
    limit: PUBLIC_OFFER_PAGE_RATE_LIMIT,
    windowMs: PUBLIC_OFFER_PAGE_RATE_WINDOW_MS,
    token: rawToken ?? token,
  });

  if (!rateLimit.allowed) {
    logPublicSecurityEvent(securityRequest, {
      scope: "public_offer_page",
      reason: "rate_limit_exceeded",
      severity: "warning",
      token: rawToken ?? token,
      extra: {
        limit: rateLimit.limit,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });

    return (
      <ErrorView
        title="Zu viele Versuche"
        message="Dieser Link wurde zu oft in kurzer Zeit geöffnet. Bitte versuchen Sie es später erneut."
      />
    );
  }

  if (!rawToken) {
    logPublicSecurityEvent(securityRequest, {
      scope: "public_offer_page",
      reason: "invalid_token_format",
      severity: "warning",
      token,
    });

    return (
      <ErrorView
        title="Offerte nicht verfügbar"
        message="Dieser Angebotslink ist ungültig oder wurde falsch kopiert."
      />
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
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          subtotal: true,
          taxRate: true,
          taxAmount: true,
          total: true,
          currency: true,
          items: true,
          notes: true,
          validUntil: true,
          sentAt: true,
          acceptedAt: true,
          customer: {
            select: {
              type: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      },
    },
  });

  if (!link) {
    logPublicSecurityEvent(securityRequest, {
      scope: "public_offer_page",
      reason: "token_not_found",
      severity: "warning",
      token: rawToken,
    });

    return (
      <ErrorView
        title="Offerte nicht verfügbar"
        message="Dieser Angebotslink wurde nicht gefunden oder ist nicht mehr aktiv."
      />
    );
  }

  if (link.revokedAt) {
    logPublicSecurityEvent(securityRequest, {
      scope: "public_offer_page",
      reason: "revoked_link_opened",
      severity: "info",
      token: rawToken,
      extra: {
        linkId: link.id,
      },
    });

    return (
      <ErrorView
        title="Link deaktiviert"
        message="Dieser Angebotslink wurde deaktiviert. Bitte fordern Sie bei HEXA CLEAN einen neuen Link an."
      />
    );
  }

  if (isPublicOfferLinkExpired(link.expiresAt, now)) {
    logPublicSecurityEvent(securityRequest, {
      scope: "public_offer_page",
      reason: "expired_link_opened",
      severity: "info",
      token: rawToken,
      extra: {
        linkId: link.id,
      },
    });

    return (
      <ErrorView
        title="Link abgelaufen"
        message="Dieser Angebotslink ist abgelaufen. Bitte fordern Sie bei HEXA CLEAN eine aktuelle Offerte an."
      />
    );
  }

  if (link.quote.status === QuoteStatus.EXPIRED) {
    return (
      <ErrorView
        title="Offerte nicht mehr verfügbar"
        message="Diese Offerte ist abgelaufen."
      />
    );
  }

  if (
    link.quote.status !== QuoteStatus.SENT &&
    link.quote.status !== QuoteStatus.ACCEPTED &&
    link.quote.status !== QuoteStatus.REJECTED
  ) {
    logPublicSecurityEvent(securityRequest, {
      scope: "public_offer_page",
      reason: "quote_not_publicly_viewable",
      severity: "info",
      token: rawToken,
      extra: {
        linkId: link.id,
        quoteStatus: link.quote.status,
      },
    });

    return (
      <ErrorView
        title="Offerte nicht freigegeben"
        message="Diese Offerte ist noch nicht für die öffentliche Ansicht freigegeben."
      />
    );
  }

  await prisma.publicOfferLink.update({
    where: {
      id: link.id,
    },
    data: {
      lastViewedAt: now,
      viewCount: {
        increment: 1,
      },
    },
  });

  const customerName = serializeCustomerName(link.quote.customer);
  const quoteAcceptedAt = link.quote.acceptedAt ?? link.acceptedAt;
  const items = normalizeOfferItems(link.quote.items);
  const canDecide = link.quote.status === QuoteStatus.SENT && !quoteAcceptedAt;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_55%,_#111827)] px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(15,23,42,0.65)] md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              HEXA CLEAN
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
              Offerte {link.quote.quoteNumber}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Guten Tag {customerName}. Bitte prüfen Sie die Offerte sorgfältig. Über
              diesen geschützten Link können Sie die Offerte verbindlich akzeptieren
              oder ablehnen.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Status
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-200">
              {statusLabel(link.quote.status)}
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Link gültig bis:{" "}
              <span className="font-bold text-slate-200">
                {formatDate(link.expiresAt)}
              </span>
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(15,23,42,0.45)]">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    Kunde
                  </p>
                  <p className="mt-2 text-base font-bold text-slate-100">
                    {customerName}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    Gesendet
                  </p>
                  <p className="mt-2 text-base font-bold text-slate-100">
                    {formatDate(link.quote.sentAt)}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    Offerte gültig bis
                  </p>
                  <p className="mt-2 text-base font-bold text-slate-100">
                    {formatDate(link.quote.validUntil)}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_25px_90px_rgba(15,23,42,0.45)]">
              <div className="border-b border-white/10 p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                  Leistungen
                </p>
                <h2 className="mt-3 text-2xl font-black">Ihre Offerte</h2>
              </div>

              {items.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {items.map((item, index) => (
                    <article key={`${item.name}-${index}`} className="p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-lg font-black text-white">
                            {item.name}
                          </p>
                          {item.description ? (
                            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                              {item.description}
                            </p>
                          ) : null}
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Menge: {item.quantity} · Einzelpreis:{" "}
                            {formatMoney(item.unitPrice, link.quote.currency)}
                          </p>
                        </div>

                        <p className="shrink-0 text-xl font-black text-emerald-200">
                          {formatMoney(item.total, link.quote.currency)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-sm leading-7 text-slate-400">
                  Die Detailpositionen sind in dieser Offerte nicht separat aufgeführt.
                </div>
              )}
            </section>

            {link.quote.notes ? (
              <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(15,23,42,0.45)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                  Hinweise
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {link.quote.notes}
                </p>
              </section>
            ) : null}

            {canDecide ? <PublicOfferUploadBox token={rawToken} /> : null}
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_90px_rgba(15,23,42,0.55)]">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                Zusammenfassung
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Zwischensumme</span>
                  <span className="font-bold text-slate-100">
                    {formatMoney(link.quote.subtotal, link.quote.currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">
                    MwSt. {decimalToString(link.quote.taxRate)}%
                  </span>
                  <span className="font-bold text-slate-100">
                    {formatMoney(link.quote.taxAmount, link.quote.currency)}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-base font-black text-white">Total</span>
                    <span className="text-2xl font-black text-emerald-200">
                      {formatMoney(link.quote.total, link.quote.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {canDecide ? (
              <PublicOfferAcceptButton
                token={rawToken}
                disabled={!canDecide}
                acceptedAt={null}
              />
            ) : (
              <DecisionStatusBox
                status={link.quote.status}
                acceptedAt={quoteAcceptedAt}
              />
            )}

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 text-xs leading-6 text-slate-400">
              <p className="font-bold text-slate-200">Datenschutz-Hinweis</p>
              <p className="mt-2">
                Dieser Link ist geschützt und nur für den Empfänger bestimmt. Bitte leiten
                Sie ihn nicht weiter. Aus Datenschutzgründen werden hier nur die für die
                Offertenprüfung notwendigen Kundendaten angezeigt.
              </p>
              {quoteAcceptedAt ? (
                <p className="mt-3 text-emerald-200">
                  Akzeptiert am {formatDateTime(quoteAcceptedAt)}.
                </p>
              ) : null}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}