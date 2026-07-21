export type EstimatePrimaryAction = {
  kind:
    | "RELEASE_AND_CREATE"
    | "CREATE"
    | "BLOCKED"
    | "COMPLETED";
  title: string;
  description: string;
  buttonLabel: string | null;
  shouldRelease: boolean;
};

export function normalizeEstimateStatus(
  value?: string | null,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function getEstimatePrimaryAction(
  value?: string | null,
): EstimatePrimaryAction {
  const status =
    normalizeEstimateStatus(value);

  if (
    status === "DRAFT" ||
    status === "AI_REVIEW" ||
    status === "NEEDS_HUMAN_REVIEW"
  ) {
    return {
      kind: "RELEASE_AND_CREATE",
      title: "Offerte freigeben",
      description:
        "Prüfen Sie Preis und Leistungsumfang. Ein Klick gibt die Kalkulation frei, erstellt die Offerte und öffnet sie.",
      buttonLabel:
        "Offerte freigeben und erstellen",
      shouldRelease: true,
    };
  }

  if (status === "READY_TO_SEND") {
    return {
      kind: "CREATE",
      title: "Offerte erstellen",
      description:
        "Die Kalkulation ist bereits freigegeben. Die Offerte wird erstellt und direkt geöffnet.",
      buttonLabel:
        "Offerte jetzt erstellen",
      shouldRelease: false,
    };
  }

  if (status === "NEEDS_PHOTOS") {
    return {
      kind: "BLOCKED",
      title: "Unterlagen fehlen",
      description:
        "Die Offerte kann erst erstellt werden, wenn die erforderlichen Fotos oder Angaben vorliegen.",
      buttonLabel: null,
      shouldRelease: false,
    };
  }

  if (
    status === "SENT" ||
    status === "ACCEPTED"
  ) {
    return {
      kind: "COMPLETED",
      title: "Kundenprozess läuft",
      description:
        "Die Kalkulation wurde bereits weiterverarbeitet. Die nächsten Statusänderungen erfolgen automatisch.",
      buttonLabel: null,
      shouldRelease: false,
    };
  }

  if (
    status === "REJECTED" ||
    status === "EXPIRED"
  ) {
    return {
      kind: "COMPLETED",
      title: "Vorgang abgeschlossen",
      description:
        "Für diese Kalkulation ist keine weitere operative Aktion erforderlich.",
      buttonLabel: null,
      shouldRelease: false,
    };
  }

  return {
    kind: "BLOCKED",
    title: "Status prüfen",
    description:
      "Der aktuelle Status erlaubt keine automatische Offertenerstellung.",
    buttonLabel: null,
    shouldRelease: false,
  };
}
