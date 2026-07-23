"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PremiumButton from "../../../components/dashboard/PremiumButton";

type Attachment = {
  id: string;
  type?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  url?: string | null;
  sizeBytes?: number | null;
  uploadedBy?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  sessionId?: string | null;
  quoteId?: string | null;
  invoiceId?: string | null;
  createdAt?: string;
};

type DashboardAttachmentsResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    attachments: Attachment[];
  };
};

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Kein Datum";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Kein Datum";
  }

  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Zurich",
    },
  ).format(date);
}

function formatSize(
  sizeBytes?: number | null,
) {
  if (
    !sizeBytes ||
    sizeBytes < 1
  ) {
    return "Grösse unbekannt";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (
    sizeBytes <
    1024 * 1024
  ) {
    return `${(
      sizeBytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    sizeBytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

function typeLabel(
  type?: string | null,
) {
  switch (
    String(
      type || "",
    ).toUpperCase()
  ) {
    case "PHOTO":
      return "Foto";

    case "DOCUMENT":
      return "Dokument";

    case "INVOICE":
      return "Rechnung";

    case "QUOTE":
      return "Offerte";

    default:
      return type || "Datei";
  }
}

function sourceLabel(
  attachment: Attachment,
) {
  if (attachment.quoteId) {
    return "Offerte";
  }

  if (attachment.invoiceId) {
    return "Rechnung";
  }

  if (attachment.orderId) {
    return "Auftrag";
  }

  if (attachment.customerId) {
    return "Kunde";
  }

  if (attachment.sessionId) {
    return "Sitzung";
  }

  return "System";
}

function timestamp(
  attachment: Attachment,
) {
  if (!attachment.createdAt) {
    return 0;
  }

  const value =
    new Date(
      attachment.createdAt,
    ).getTime();

  return Number.isNaN(value)
    ? 0
    : value;
}

export default function DashboardAttachmentsPage() {
  const [
    attachments,
    setAttachments,
  ] = useState<Attachment[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const loadAttachments =
    useCallback(
      async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
          const response =
            await fetch(
              "/api/dashboard/attachments",
              {
                method: "GET",
                cache: "no-store",
              },
            );

          if (!response.ok) {
            throw new Error(
              "Die Dateien konnten nicht geladen werden.",
            );
          }

          const json =
            (await response.json()) as DashboardAttachmentsResponse;

          setAttachments(
            json.data
              ?.attachments ??
              [],
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Die Dateien konnten nicht geladen werden.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadAttachments();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [loadAttachments]);

  const sortedAttachments =
    useMemo(
      () =>
        [...attachments].sort(
          (left, right) =>
            timestamp(right) -
            timestamp(left),
        ),
      [attachments],
    );

  const stats =
    useMemo(() => {
      const photos =
        attachments.filter(
          (attachment) =>
            String(
              attachment.type || "",
            ).toUpperCase() ===
            "PHOTO",
        ).length;

      const documents =
        attachments.length -
        photos;

      return {
        photos,
        documents,
      };
    }, [attachments]);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Dateien
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Dateien
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Kundenfotos und Dokumente aus dem laufenden Workflow.
                </p>
              </div>
            </div>

            <PremiumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={
                loadAttachments
              }
              disabled={loading}
            >
              Aktualisieren
            </PremiumButton>
          </div>

          <div
            data-testid="attachments-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {attachments.length} gesamt
            </span>

            <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
              {stats.photos} Fotos
            </span>

            <span className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100">
              {stats.documents} Dokumente
            </span>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {errorMessage}
          </section>
        ) : null}

        <section
          data-testid="attachments-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Dateiliste
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                Neueste Dateien stehen zuerst.
              </p>
            </div>

            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedAttachments.length} Positionen
            </span>
          </div>

          {loading ? (
            <div className="space-y-2 p-3">
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedAttachments.length ===
            0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black">
                Keine Dateien vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Neue Kundenfotos und Dokumente erscheinen automatisch.
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedAttachments.length >
            0 ? (
            <div className="divide-y divide-white/10">
              {sortedAttachments.map(
                (attachment) => (
                  <article
                    key={attachment.id}
                    className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[minmax(280px,1.4fr)_130px_150px_160px_170px_auto] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-cyan-100">
                        {attachment.fileName ||
                          "Datei ohne Namen"}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {attachment.mimeType ||
                          "Dateityp unbekannt"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Typ
                      </p>

                      <p className="mt-0.5 text-xs font-bold">
                        {typeLabel(
                          attachment.type,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Quelle
                      </p>

                      <p className="mt-0.5 text-xs font-bold">
                        {sourceLabel(
                          attachment,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Grösse
                      </p>

                      <p className="mt-0.5 text-xs font-bold">
                        {formatSize(
                          attachment.sizeBytes,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Hinzugefügt
                      </p>

                      <p className="mt-0.5 text-xs font-bold">
                        {formatDate(
                          attachment.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      <PremiumButton
                        href={`/dashboard/attachments/${attachment.id}`}
                        variant="primary"
                        size="sm"
                      >
                        Datei öffnen
                      </PremiumButton>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}