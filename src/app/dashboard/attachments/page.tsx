"use client";

import { useEffect, useState } from "react";

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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatSize(sizeBytes?: number | null) {
  if (!sizeBytes) return "—";

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DashboardAttachmentsPage() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttachments() {
      try {
        const response = await fetch("/api/dashboard/attachments", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard Attachments API returned an error");
        }

        const json: DashboardAttachmentsResponse = await response.json();

        setAttachments(json.data.attachments);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown attachments error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadAttachments();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Załączniki
          </h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Lista plików, zdjęć i dokumentów zapisanych w bazie HEXA OS.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie załączników...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            Błąd: {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 p-5">
              <h2 className="text-xl font-semibold">Lista załączników</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Liczba rekordów: {attachments.length}
              </p>
            </div>

            {attachments.length === 0 ? (
              <div className="p-6 text-neutral-500">
                Brak załączników w bazie.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Plik</th>
                      <th className="p-4 font-medium">Typ</th>
                      <th className="p-4 font-medium">MIME</th>
                      <th className="p-4 font-medium">Rozmiar</th>
                      <th className="p-4 font-medium">Uploaded by</th>
                      <th className="p-4 font-medium">Link</th>
                      <th className="p-4 font-medium">Dodano</th>
                    </tr>
                  </thead>

                  <tbody>
                    {attachments.map((attachment) => (
                      <tr
                        key={attachment.id}
                        className="border-b border-neutral-800 last:border-b-0"
                      >
                        <td className="p-4 font-medium text-white">
                          {attachment.fileName ?? attachment.id}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {attachment.type ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {attachment.mimeType ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {formatSize(attachment.sizeBytes)}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {attachment.uploadedBy ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {attachment.url ? (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              Otwórz
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="p-4 text-neutral-400">
                          {formatDate(attachment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}