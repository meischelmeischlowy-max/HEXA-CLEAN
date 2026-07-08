export type ActionTone = "green" | "amber" | "red" | "cyan" | "neutral";

export type ActionOwner =
  | "customer"
  | "estimate"
  | "quote"
  | "order"
  | "invoice"
  | "payment"
  | "system";

export type DashboardRecordAction = {
  label: string;
  title: string;
  description: string;
  tone: ActionTone;
  status: string;
  owner: ActionOwner;
  href: string;
  primaryLabel: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export type CustomerActionInput = {
  id: string;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  address?: string | null;
  zipCode?: string | null;
  postalCode?: string | null;
  city?: string | null;
  notes?: string | null;
  messagesCount?: number;
  estimatesNeedPhotos?: boolean;
  estimatesNeedReview?: boolean;
  estimatesReady?: boolean;
  quotesDraft?: number;
  quotesSent?: number;
  quotesAccepted?: number;
  openInvoices?: number;
  overdueInvoices?: number;
  activeOrders?: number;
  completedOrdersWithoutInvoice?: number;
};

export type EstimateActionInput = {
  id: string;
  status?: string | null;
};

export type QuoteActionInput = {
  id: string;
  status?: string | null;
  hasActivePublicLink?: boolean;
  hasInvoice?: boolean;
};

export type OrderActionInput = {
  id: string;
  status?: string | null;
  hasInvoice?: boolean;
  hasOpenInvoice?: boolean;
  hasPaidInvoice?: boolean;
};

export type InvoiceActionInput = {
  id: string;
  status?: string | null;
  total?: number;
  paidAmount?: number;
  isOverdue?: boolean;
};

export type CustomerMissingItem = {
  key: string;
  title: string;
  description: string;
  isMissing: boolean;
  tone: ActionTone;
  actionLabel: string;
  actionHref: string;
};

export function hasCustomerContact(customer: {
  email?: string | null;
  phone?: string | null;
}) {
  return Boolean(customer.email || customer.phone);
}

export function hasCustomerCompleteAddress(customer: {
  street?: string | null;
  address?: string | null;
  zipCode?: string | null;
  postalCode?: string | null;
  city?: string | null;
}) {
  const street = Boolean(customer.street || customer.address);
  const zip = Boolean(customer.zipCode || customer.postalCode);
  const city = Boolean(customer.city);

  return street && zip && city;
}

export function getToneClassName(tone: ActionTone) {
  if (tone === "green") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
  }

  if (tone === "amber") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  }

  if (tone === "red") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-100";
  }

  if (tone === "cyan") {
    return "border-cyan-400/25 bg-cyan-400/10 text-cyan-100";
  }

  return "border-white/10 bg-white/[0.03] text-white";
}

export function getCustomerListAction(
  customer: CustomerActionInput,
): DashboardRecordAction {
  if (!hasCustomerContact(customer)) {
    return {
      label: "Kontakt fehlt",
      title: "Kontaktdaten fehlen",
      description:
        "E-Mail oder Telefon fehlt. Kundenprofil oeffnen und Kontakt ergaenzen.",
      tone: "red",
      status: "REJECTED",
      owner: "customer",
      href: `/dashboard/customers/${customer.id}?action=missing-data#fehlende-daten`,
      primaryLabel: "Kontakt klaeren",
    };
  }

  if (!hasCustomerCompleteAddress(customer)) {
    return {
      label: "Adresse fehlt",
      title: "Adresse unvollstaendig",
      description:
        "Adresse ist nicht vollstaendig. Kundenprofil oeffnen und Adresse klaeren.",
      tone: "amber",
      status: "PENDING",
      owner: "customer",
      href: `/dashboard/customers/${customer.id}?action=missing-data#fehlende-daten`,
      primaryLabel: "Adresse klaeren",
    };
  }

  return {
    label: "Profil vollstaendig",
    title: "Kundenprofil ausreichend",
    description:
      "Kontakt und Adresse sind vorhanden. Weitere Arbeit laeuft ueber Kalkulation, Offerte, Auftrag oder Rechnung.",
    tone: "green",
    status: "ACCEPTED",
    owner: "customer",
    href: `/dashboard/customers/${customer.id}#kundendaten`,
    primaryLabel: "Kundendaten ansehen",
  };
}

export function getCustomerDetailAction(
  customer: CustomerActionInput,
): DashboardRecordAction {
  if (!hasCustomerContact(customer)) {
    return {
      label: "Kontakt fehlt",
      title: "Kontaktdaten ergaenzen",
      description:
        "Fuer diesen Kunden fehlen E-Mail oder Telefon. Ohne Kontakt koennen Rueckfragen und Offerten nicht sauber verarbeitet werden.",
      tone: "red",
      status: "REJECTED",
      owner: "customer",
      href: `/dashboard/customers/${customer.id}/edit`,
      primaryLabel: "Kontaktdaten eintragen",
      secondaryLabel: "Checkliste anzeigen",
      secondaryHref: "#fehlende-daten",
    };
  }

  if (!hasCustomerCompleteAddress(customer)) {
    return {
      label: "Adresse fehlt",
      title: "Adresse ergaenzen",
      description:
        "Fuer Auftrag, Offerte und Rechnung braucht der Kunde eine vollstaendige Adresse. Daten manuell ergaenzen oder E-Mail vorbereiten.",
      tone: "amber",
      status: "PENDING",
      owner: "customer",
      href: "#fehlende-daten",
      primaryLabel: "Fehlende Daten klaeren",
      secondaryLabel: "Kunde bearbeiten",
      secondaryHref: `/dashboard/customers/${customer.id}/edit`,
    };
  }

  if (customer.estimatesNeedPhotos) {
    return {
      label: "Fotos erforderlich",
      title: "Fotos / Uploads anfordern",
      description:
        "Mindestens eine Kalkulation wartet auf Fotos. Uploads pruefen oder Kunden um Bilder bitten.",
      tone: "cyan",
      status: "PENDING",
      owner: "estimate",
      href: "#fehlende-daten",
      primaryLabel: "Fotos klaeren",
      secondaryLabel: "Dateien anzeigen",
      secondaryHref: "#dateien",
    };
  }

  if (customer.estimatesNeedReview) {
    return {
      label: "Kalkulation pruefen",
      title: "Kalkulation braucht Pruefung",
      description:
        "Eine Kalkulation braucht AI-Pruefung, Fotos oder manuelle Freigabe. Im Bereich Kalkulationen weiterarbeiten.",
      tone: "amber",
      status: "PENDING",
      owner: "estimate",
      href: "#kalkulationen",
      primaryLabel: "Kalkulationen pruefen",
    };
  }

  if (customer.estimatesReady) {
    return {
      label: "Bereit fuer Offerte",
      title: "Kalkulation bereit fuer Offerte",
      description:
        "Eine Kalkulation ist bereit. Naechster sauberer Schritt ist eine Offerte fuer den Kunden.",
      tone: "cyan",
      status: "PENDING",
      owner: "estimate",
      href: "#kalkulationen",
      primaryLabel: "Kalkulation oeffnen",
    };
  }

  if ((customer.quotesDraft ?? 0) > 0) {
    return {
      label: "Offerte im Entwurf",
      title: "Offerte fertigstellen",
      description:
        "Es gibt eine Offerte im Entwurf. Diese Offerte im Offertenmodul fertigstellen und danach an den Kunden senden.",
      tone: "amber",
      status: "PENDING",
      owner: "quote",
      href: "#offerten",
      primaryLabel: "Offerten pruefen",
    };
  }

  if ((customer.quotesSent ?? 0) > 0) {
    return {
      label: "Wartet auf Kunde",
      title: "Offerte wartet auf Kundenantwort",
      description:
        "Eine Offerte wurde gesendet. Jetzt nicht neu duplizieren, sondern bestehende Offerte oeffnen und Antwortstatus pruefen.",
      tone: "cyan",
      status: "PENDING",
      owner: "quote",
      href: "#offerten",
      primaryLabel: "Offerte oeffnen",
    };
  }

  if ((customer.quotesAccepted ?? 0) > 0) {
    return {
      label: "Offerte akzeptiert",
      title: "Auftrag oder Rechnung erstellen",
      description:
        "Eine Offerte wurde akzeptiert. Naechster Prozessschritt ist Auftrag oder Rechnung im passenden Modul.",
      tone: "green",
      status: "ACCEPTED",
      owner: "quote",
      href: "#offerten",
      primaryLabel: "Akzeptierte Offerte oeffnen",
    };
  }

  if ((customer.completedOrdersWithoutInvoice ?? 0) > 0) {
    return {
      label: "Rechnung fehlt",
      title: "Auftrag abgeschlossen, Rechnung fehlt",
      description:
        "Mindestens ein Auftrag ist abgeschlossen, aber noch nicht sauber abgerechnet.",
      tone: "amber",
      status: "PENDING",
      owner: "invoice",
      href: "#auftraege",
      primaryLabel: "Auftrag pruefen",
    };
  }

  if ((customer.overdueInvoices ?? 0) > 0) {
    return {
      label: "Ueberfaellig",
      title: "Rechnung ueberfaellig",
      description:
        "Mindestens eine Rechnung ist ueberfaellig. Rechnung oeffnen und Zahlung oder Mahnung pruefen.",
      tone: "red",
      status: "REJECTED",
      owner: "invoice",
      href: "#rechnungen",
      primaryLabel: "Rechnungen pruefen",
    };
  }

  if ((customer.openInvoices ?? 0) > 0) {
    return {
      label: "Rechnung offen",
      title: "Offene Rechnung pruefen",
      description:
        "Fuer diesen Kunden gibt es offene Rechnungen. Zahlung oder Status im Rechnungsmodul pruefen.",
      tone: "amber",
      status: "PENDING",
      owner: "invoice",
      href: "#rechnungen",
      primaryLabel: "Rechnungen pruefen",
    };
  }

  if ((customer.activeOrders ?? 0) > 0) {
    return {
      label: "Auftrag aktiv",
      title: "Aktiven Auftrag pruefen",
      description:
        "Dieser Kunde hat aktive Auftraege. Konkreten Auftrag oeffnen und dort weiterarbeiten.",
      tone: "cyan",
      status: "PENDING",
      owner: "order",
      href: "#auftraege",
      primaryLabel: "Auftraege pruefen",
    };
  }

  return {
    label: "Bereit",
    title: "Keine sofortige Aktion",
    description:
      "Kundenprofil ist ausreichend. Neue Arbeit beginnt ueber Kalkulation, Offerte, Auftrag oder Kundenkontakt.",
    tone: "green",
    status: "ACCEPTED",
    owner: "customer",
    href: "#kundendaten",
    primaryLabel: "Kundendaten ansehen",
  };
}

export function buildCustomerMissingItems(
  customer: CustomerActionInput,
): CustomerMissingItem[] {
  const hasAddress = hasCustomerCompleteAddress(customer);

  return [
    {
      key: "email",
      title: "E-Mail fehlt",
      description: customer.email
        ? "E-Mail ist vorhanden."
        : "Ohne E-Mail koennen Offerten und Rueckfragen nicht sauber vorbereitet werden.",
      isMissing: !customer.email,
      tone: "red",
      actionLabel: "E-Mail eintragen",
      actionHref: `/dashboard/customers/${customer.id}/edit`,
    },
    {
      key: "phone",
      title: "Telefon fehlt",
      description: customer.phone
        ? "Telefonnummer ist vorhanden."
        : "Ohne Telefon ist schnelle Rueckfrage beim Kunden nicht moeglich.",
      isMissing: !customer.phone,
      tone: "amber",
      actionLabel: "Telefon eintragen",
      actionHref: `/dashboard/customers/${customer.id}/edit`,
    },
    {
      key: "address",
      title: "Adresse unvollstaendig",
      description: hasAddress
        ? "Strasse, PLZ und Ort sind vorhanden."
        : "Fuer Auftrag, Offerte und Rechnung braucht der Kunde eine vollstaendige Adresse.",
      isMissing: !hasAddress,
      tone: "amber",
      actionLabel: "Adresse ergaenzen",
      actionHref: `/dashboard/customers/${customer.id}/edit`,
    },
    {
      key: "photos",
      title: "Fotos / Uploads erforderlich",
      description: customer.estimatesNeedPhotos
        ? "Eine Kalkulation wartet auf Fotos oder Uploads."
        : "Keine offene Foto-Anforderung erkannt.",
      isMissing: Boolean(customer.estimatesNeedPhotos),
      tone: "cyan",
      actionLabel: "Dateien pruefen",
      actionHref: "#dateien",
    },
    {
      key: "notes",
      title: "Kundenwunsch / Notiz",
      description: customer.notes
        ? "Interne Notiz ist vorhanden."
        : "Optional: Kundenwunsch oder interne Notiz ergaenzen, wenn der Fall telefonisch geklaert wurde.",
      isMissing: !customer.notes && (customer.messagesCount ?? 0) === 0,
      tone: "cyan",
      actionLabel: "Notiz ergaenzen",
      actionHref: `/dashboard/customers/${customer.id}/edit`,
    },
  ];
}

export function getEstimateAction(
  estimate: EstimateActionInput,
): DashboardRecordAction {
  const status = String(estimate.status || "DRAFT").toUpperCase();

  if (status === "DRAFT") {
    return {
      label: "Entwurf",
      title: "Kalkulation fertigstellen",
      description:
        "Diese Kalkulation ist noch ein interner Entwurf. Positionen, Risiko, Anfahrt, Material und Notizen pruefen.",
      tone: "amber",
      status,
      owner: "estimate",
      href: `/dashboard/estimates/${estimate.id}#status-aktionen`,
      primaryLabel: "Status / Pruefung bearbeiten",
      secondaryLabel: "Kalkulation ansehen",
      secondaryHref: `/dashboard/estimates/${estimate.id}`,
    };
  }

  if (status === "NEEDS_PHOTOS") {
    return {
      label: "Fotos erforderlich",
      title: "Fotos oder Uploads anfordern",
      description:
        "Diese Kalkulation braucht Fotos oder Uploads, bevor sie sauber freigegeben werden kann.",
      tone: "amber",
      status,
      owner: "estimate",
      href: `/dashboard/estimates/${estimate.id}#status-aktionen`,
      primaryLabel: "Foto-Anforderung klaeren",
      secondaryLabel: "Kunde oeffnen",
      secondaryHref: "",
    };
  }

  if (status === "AI_REVIEW" || status === "NEEDS_HUMAN_REVIEW") {
    return {
      label: "Pruefung erforderlich",
      title: "Kalkulation intern pruefen",
      description:
        "Diese Kalkulation braucht interne Pruefung. Erst nach Kontrolle darf daraus eine Offerte entstehen.",
      tone: "amber",
      status,
      owner: "estimate",
      href: `/dashboard/estimates/${estimate.id}#status-aktionen`,
      primaryLabel: "Pruefung bearbeiten",
      secondaryLabel: "Kalkulation ansehen",
      secondaryHref: `/dashboard/estimates/${estimate.id}`,
    };
  }

  if (status === "READY_TO_SEND") {
    return {
      label: "Bereit fuer Offerte",
      title: "Offerte vorbereiten",
      description:
        "Die Kalkulation ist freigegeben. Naechster Schritt ist eine Offerte fuer den Kunden, nicht eine Rechnung.",
      tone: "cyan",
      status,
      owner: "quote",
      href: `/dashboard/estimates/${estimate.id}/offer`,
      primaryLabel: "Offerte vorbereiten",
      secondaryLabel: "Freigabe pruefen",
      secondaryHref: `/dashboard/estimates/${estimate.id}#status-aktionen`,
    };
  }

  if (status === "SENT") {
    return {
      label: "Versendet",
      title: "Offerte wartet auf Kundenantwort",
      description:
        "Der Vorgang ist als versendet markiert. Jetzt zaehlt die Kundenreaktion ueber E-Mail, Kundenlink, Chat oder Rueckfrage. Die weitere Arbeit gehoert in Offerte und Kommunikation.",
      tone: "cyan",
      status,
      owner: "quote",
      href: `/dashboard/estimates/${estimate.id}/offer`,
      primaryLabel: "Offerte / Versand pruefen",
      secondaryLabel: "Offerten oeffnen",
      secondaryHref: "/dashboard/quotes",
    };
  }

  if (status === "ACCEPTED") {
    return {
      label: "Akzeptiert",
      title: "Kundenantwort akzeptiert",
      description:
        "Der Kunde hat akzeptiert. Naechster Prozessschritt ist Auftrag oder Rechnung im passenden Modul.",
      tone: "green",
      status,
      owner: "quote",
      href: `/dashboard/estimates/${estimate.id}/offer`,
      primaryLabel: "Naechsten Schritt pruefen",
      secondaryLabel: "Offerten oeffnen",
      secondaryHref: "/dashboard/quotes",
    };
  }

  if (status === "REJECTED") {
    return {
      label: "Abgelehnt",
      title: "Kundenantwort abgelehnt",
      description:
        "Der Kunde hat abgelehnt. Fall pruefen: abschliessen, Notiz speichern oder neue Version vorbereiten.",
      tone: "red",
      status,
      owner: "quote",
      href: `/dashboard/estimates/${estimate.id}/offer`,
      primaryLabel: "Antwort pruefen",
      secondaryLabel: "Status ansehen",
      secondaryHref: `/dashboard/estimates/${estimate.id}#status-aktionen`,
    };
  }

  if (status === "EXPIRED") {
    return {
      label: "Abgelaufen",
      title: "Offerte abgelaufen",
      description:
        "Die Offerte ist nicht mehr gueltig. Entscheiden: erneuern, neue Version vorbereiten oder abschliessen.",
      tone: "amber",
      status,
      owner: "quote",
      href: `/dashboard/estimates/${estimate.id}/offer`,
      primaryLabel: "Offerte pruefen",
      secondaryLabel: "Status ansehen",
      secondaryHref: `/dashboard/estimates/${estimate.id}#status-aktionen`,
    };
  }

  return {
    label: "Kalkulation",
    title: "Kalkulation oeffnen",
    description: "Kalkulation pruefen oder bearbeiten.",
    tone: "neutral",
    status,
    owner: "estimate",
    href: `/dashboard/estimates/${estimate.id}`,
    primaryLabel: "Oeffnen",
  };
}

export function getQuoteAction(quote: QuoteActionInput): DashboardRecordAction {
  const status = String(quote.status || "DRAFT").toUpperCase();

  if (status === "DRAFT") {
    return {
      label: "Entwurf",
      title: "Offerte fertigstellen",
      description:
        "Diese Offerte ist noch nicht gesendet. Im Offertenmodul fertigstellen.",
      tone: "amber",
      status,
      owner: "quote",
      href: `/dashboard/quotes/${quote.id}`,
      primaryLabel: "Offerte bearbeiten",
    };
  }

  if (status === "SENT") {
    return {
      label: quote.hasActivePublicLink ? "Kundenlink aktiv" : "Gesendet",
      title: "Wartet auf Kundenantwort",
      description:
        "Offerte wurde gesendet. Keine neue Offerte erstellen, sondern Antwortstatus pruefen.",
      tone: "cyan",
      status,
      owner: "quote",
      href: `/dashboard/quotes/${quote.id}`,
      primaryLabel: "Antwort pruefen",
    };
  }

  if (status === "ACCEPTED" && !quote.hasInvoice) {
    return {
      label: "Akzeptiert",
      title: "Auftrag oder Rechnung erstellen",
      description:
        "Offerte wurde akzeptiert. Naechster Schritt ist Auftrag oder Rechnung.",
      tone: "green",
      status,
      owner: "quote",
      href: `/dashboard/quotes/${quote.id}`,
      primaryLabel: "Naechsten Schritt oeffnen",
    };
  }

  return {
    label: status === "REJECTED" ? "Abgelehnt" : status,
    title: "Offerte oeffnen",
    description: "Offerte und Kundenstatus im Offertenmodul pruefen.",
    tone: status === "REJECTED" ? "red" : "neutral",
    status,
    owner: "quote",
    href: `/dashboard/quotes/${quote.id}`,
    primaryLabel: "Oeffnen",
  };
}

export function getOrderAction(order: OrderActionInput): DashboardRecordAction {
  const status = String(order.status || "NEW").toUpperCase();

  if (status === "NEW") {
    return {
      label: "Neu",
      title: "Auftrag planen",
      description: "Neuer Auftrag braucht Planung oder Rueckfrage.",
      tone: "amber",
      status,
      owner: "order",
      href: `/dashboard/orders/${order.id}`,
      primaryLabel: "Auftrag planen",
    };
  }

  if (status === "WAITING_FOR_CUSTOMER") {
    return {
      label: "Wartet auf Kunde",
      title: "Kundenreaktion klaeren",
      description: "Auftrag wartet auf Rueckmeldung oder fehlende Daten.",
      tone: "amber",
      status,
      owner: "order",
      href: `/dashboard/orders/${order.id}`,
      primaryLabel: "Rueckfrage pruefen",
    };
  }

  if (status === "COMPLETED" && !order.hasInvoice) {
    return {
      label: "Rechnung fehlt",
      title: "Rechnung erstellen",
      description:
        "Auftrag ist abgeschlossen. Naechster Schritt ist saubere Abrechnung.",
      tone: "amber",
      status,
      owner: "invoice",
      href: `/dashboard/orders/${order.id}`,
      primaryLabel: "Auftrag oeffnen",
    };
  }

  return {
    label: status,
    title: "Auftrag oeffnen",
    description: "Auftrag im Auftragsmodul weiterbearbeiten.",
    tone: status === "COMPLETED" ? "green" : "cyan",
    status,
    owner: "order",
    href: `/dashboard/orders/${order.id}`,
    primaryLabel: "Oeffnen",
  };
}

export function getInvoiceAction(
  invoice: InvoiceActionInput,
): DashboardRecordAction {
  const status = String(invoice.status || "DRAFT").toUpperCase();

  if (invoice.isOverdue || status === "OVERDUE") {
    return {
      label: "Ueberfaellig",
      title: "Mahnung vorbereiten",
      description:
        "Rechnung ist ueberfaellig. Zahlungseingang pruefen oder Mahnung vorbereiten.",
      tone: "red",
      status,
      owner: "invoice",
      href: `/dashboard/invoices/${invoice.id}`,
      primaryLabel: "Rechnung pruefen",
    };
  }

  if (status === "SENT" || status === "PARTIALLY_PAID") {
    return {
      label: status === "PARTIALLY_PAID" ? "Teilzahlung" : "Offen",
      title: "Zahlung pruefen",
      description:
        "Rechnung ist offen. Zahlungseingang im Rechnungsmodul pruefen.",
      tone: "amber",
      status,
      owner: "invoice",
      href: `/dashboard/invoices/${invoice.id}`,
      primaryLabel: "Zahlung pruefen",
    };
  }

  return {
    label: status === "PAID" ? "Bezahlt" : status,
    title: "Rechnung oeffnen",
    description: "Rechnung im Rechnungsmodul pruefen.",
    tone: status === "PAID" ? "green" : "neutral",
    status,
    owner: "invoice",
    href: `/dashboard/invoices/${invoice.id}`,
    primaryLabel: "Oeffnen",
  };
}