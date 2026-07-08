"use client";

import { FormEvent, useRef, useState } from "react";

type UploadedAttachment = {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  type: string;
  createdAt: string;
};

type UploadResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  attachment?: UploadedAttachment;
};

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf";

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) {
    return "—";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function hasAllowedClientExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();

  return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf"].some(
    (extension) => normalizedName.endsWith(extension),
  );
}

async function readUploadResponse(response: Response): Promise<UploadResponse> {
  try {
    const data = await response.json();

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {};
    }

    return data as UploadResponse;
  } catch {
    return {};
  }
}

export default function PublicOfferUploadBox({ token }: { token: string }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [uploadedAttachments, setUploadedAttachments] = useState<
    UploadedAttachment[]
  >([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    const files = Array.from(fileInputRef.current?.files ?? []);

    if (files.length === 0) {
      setMessageType("error");
      setMessage("Bitte wählen Sie mindestens eine Datei aus.");
      return;
    }

    const invalidFile = files.find((file) => {
      return file.size > MAX_FILE_SIZE_BYTES || !hasAllowedClientExtension(file.name);
    });

    if (invalidFile) {
      setMessageType("error");
      setMessage(
        "Erlaubt sind JPG, PNG, WEBP, HEIC und PDF bis maximal 6 MB pro Datei.",
      );
      return;
    }

    setIsUploading(true);
    setMessageType("info");
    setMessage("Upload läuft. Bitte warten Sie kurz.");

    const newUploadedAttachments: UploadedAttachment[] = [];

    try {
      for (const file of files) {
        const formData = new FormData();

        formData.append("file", file);

        if (note.trim()) {
          formData.append("note", note.trim());
        }

        const response = await fetch(
          `/api/public/offers/${encodeURIComponent(token)}/attachments`,
          {
            method: "POST",
            body: formData,
            cache: "no-store",
          },
        );

        const data = await readUploadResponse(response);

        if (!response.ok || !data.ok || !data.attachment) {
          throw new Error(
            data.message || "Die Datei konnte nicht hochgeladen werden.",
          );
        }

        newUploadedAttachments.push(data.attachment);
      }

      setUploadedAttachments((currentAttachments) => [
        ...newUploadedAttachments,
        ...currentAttachments,
      ]);
      setMessageType("success");
      setMessage(
        files.length === 1
          ? "Die Datei wurde erfolgreich hochgeladen."
          : "Die Dateien wurden erfolgreich hochgeladen.",
      );
      setNote("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Die Datei konnte nicht hochgeladen werden.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(15,23,42,0.45)]">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
        Fotos und Dateien
      </p>

      <h2 className="mt-3 text-2xl font-black">Unterlagen hochladen</h2>

      <p className="mt-3 text-sm leading-7 text-slate-300">
        Sie können hier Fotos oder eine PDF-Datei zur Offerte hochladen, zum Beispiel
        Bilder der Wohnung, besondere Stellen oder wichtige Dokumente.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="public-offer-upload"
            className="block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
          >
            Datei auswählen
          </label>

          <input
            ref={fileInputRef}
            id="public-offer-upload"
            name="file"
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            disabled={isUploading}
            className="mt-3 block w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-black file:text-slate-950 hover:file:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <p className="mt-2 text-xs leading-6 text-slate-500">
            Erlaubt: JPG, PNG, WEBP, HEIC und PDF. Maximal 6 MB pro Datei.
          </p>
        </div>

        <div>
          <label
            htmlFor="public-offer-upload-note"
            className="block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
          >
            Hinweis optional
          </label>

          <textarea
            id="public-offer-upload-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            disabled={isUploading}
            rows={3}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Kurzer Hinweis zu den Fotos oder Dateien..."
          />
        </div>

        {message ? (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm leading-6",
              messageType === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                : messageType === "error"
                  ? "border-red-400/30 bg-red-500/10 text-red-100"
                  : "border-sky-400/30 bg-sky-500/10 text-sky-100",
            ].join(" ")}
          >
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isUploading}
          className="w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isUploading ? "Upload läuft..." : "Dateien hochladen"}
        </button>
      </form>

      {uploadedAttachments.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Erfolgreich hochgeladen
          </p>

          <div className="mt-3 space-y-2">
            {uploadedAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300"
              >
                <p className="font-bold text-slate-100">{attachment.fileName}</p>
                <p className="mt-1 text-slate-500">
                  {attachment.mimeType || attachment.type} ·{" "}
                  {formatBytes(attachment.sizeBytes)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}