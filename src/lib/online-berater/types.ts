export type OnlineBeraterRole =
  | "user"
  | "assistant";

export type OnlineBeraterMessage = {
  role: OnlineBeraterRole;
  content: string;
};

export type OnlineBeraterService = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number | null;
};

export type OnlineBeraterAvailability = {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string | null;
};

export type OnlineBeraterBusinessContext = {
  company: {
    name: "HEXA CLEAN";
    email: "info@hexaclean.ch";
    phone: "+41 76 258 19 48";
    location: "Pieterlen, Biel/Bienne, Schweiz";
    openingHours: {
      weekdays: "Montag bis Freitag, 08:00 bis 18:00";
      saturday: "Nach Vereinbarung";
      sunday: "Geschlossen";
    };
  };
  services: OnlineBeraterService[];
  availability: OnlineBeraterAvailability[];
  generatedAt: string;
};

export type OnlineBeraterLeadData = {
  service: string | null;
  objectType: string | null;
  location: string | null;
  areaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  windows: number | null;
  floor: number | null;
  elevator: boolean | null;
  parkingAccess: string | null;
  condition: string | null;
  frequency: string | null;
  extras: string[];
  preferredDate: string | null;
  flexibleDate: boolean | null;
  photoRequired: boolean | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
};

export type OnlineBeraterResult = {
  reply: string;
  lead: OnlineBeraterLeadData;
  missingFields: string[];
  leadReady: boolean;
  shouldCreateLead: boolean;
  shouldAskForPhotos: boolean;
  confidence: "LOW" | "MEDIUM" | "HIGH";
};
