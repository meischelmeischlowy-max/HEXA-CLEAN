export const companyConfig = {
  country: "CH",
  name: "HEXA CLEAN",
  legalName: "HEXA CLEAN",

  street: "",
  zipCode: "",
  city: "",
  canton: "",
  email: "",
  phone: "",
  website: "",

  iban: "",
  bankName: "",
  paymentRecipient: "HEXA CLEAN",

  invoice: {
    currency: "CHF",
    paymentDays: 14,
    defaultServiceText: "Reinigungsdienstleistungen gemäss vereinbartem Angebot.",
    defaultPaymentText:
      "Bitte begleichen Sie den offenen Betrag bis zum angegebenen Fälligkeitsdatum.",
    footerText: "Dieses Dokument wurde mit HEXA OS CRM erstellt.",
  },

  mwst: {
    registered: false,
    uid: "",
    rate: 0,
    notRegisteredText:
      "Nicht MWST-pflichtig. Es wird keine Mehrwertsteuer ausgewiesen.",
  },
} as const;