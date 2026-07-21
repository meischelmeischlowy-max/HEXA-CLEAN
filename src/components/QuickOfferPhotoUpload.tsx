"use client";

import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";

const MAX_FILES = 5;
const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const OUTPUT_QUALITY = 0.82;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type QuickOfferPhotoUploadProps = {
  files: File[];
  disabled?: boolean;
  onChange: (files: File[]) => void;
};

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function compressImage(source: File): Promise<File> {
  const bitmap = await createImageBitmap(source);

  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
    );

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Bildverarbeitung konnte nicht gestartet werden.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", OUTPUT_QUALITY);
    });

    if (!blob) {
      throw new Error("Das Bild konnte nicht verarbeitet werden.");
    }

    const safeBaseName =
      source.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "_") ||
      "foto";

    return new File(
      [blob],
      `${safeBaseName}.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      },
    );
  } finally {
    bitmap.close();
  }
}

export default function QuickOfferPhotoUpload({
  files,
  disabled = false,
  onChange,
}: QuickOfferPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError("");

    if (selectedFiles.length === 0) {
      return;
    }

    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`Maximal ${MAX_FILES} Fotos sind erlaubt.`);
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) =>
        !ACCEPTED_TYPES.includes(file.type) ||
        file.size <= 0 ||
        file.size > MAX_SOURCE_FILE_BYTES,
    );

    if (invalidFile) {
      setError(
        "Erlaubt sind JPG, PNG und WEBP bis 10 MB pro Ausgangsdatei.",
      );
      return;
    }

    try {
      const compressedFiles = [];

      for (const file of selectedFiles) {
        compressedFiles.push(await compressImage(file));
      }

      onChange([...files, ...compressedFiles]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Die Fotos konnten nicht verarbeitet werden.",
      );
    }
  }

  function removeFile(index: number) {
    onChange(files.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="rounded-[20px] border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-300">
          <Camera size={19} />
        </div>

        <div>
          <h3 className="font-black text-white">
            Fotos fuer die genaue Einschaetzung
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Zeigen Sie den Zustand und den Arbeitsumfang. Die Fotos werden
            vor der Preisfreigabe direkt in der Kalkulation angezeigt.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled}
        onChange={handleFiles}
        className="hidden"
      />

      <button
        type="button"
        disabled={disabled || files.length >= MAX_FILES}
        onClick={() => inputRef.current?.click()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-black/25 px-4 py-3 text-sm font-black text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ImagePlus size={18} />
        Fotos auswaehlen
      </button>

      {files.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-200">
                  {file.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatBytes(file.size)}
                </p>
              </div>

              <button
                type="button"
                disabled={disabled}
                onClick={() => removeFile(index)}
                aria-label={`Foto ${file.name} entfernen`}
                className="rounded-lg border border-red-400/20 p-2 text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          <p className="text-[11px] text-cyan-200/75">
            {files.length} von {MAX_FILES} Fotos vorbereitet.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
