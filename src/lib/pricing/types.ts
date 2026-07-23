export type CentralPricingCatalogItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  unit:
    | "M2"
    | "HOUR"
    | "WINDOW"
    | "FLAT"
    | "CUSTOM"
    | string;
  basePrice: number;
  minPrice: number;
  maxPrice: number | null;
  defaultQuantity: number | null;
  riskMultiplier: number;
};

export type CentralPricingInput = {
  service: string;
  areaM2?: number | null;
  rooms?: number | null;
  bathrooms?: number | null;
  windows?: number | null;
  condition?: string | null;
  frequency?: string | null;
  extras?: string[];
  floor?: number | null;
  elevator?: boolean | null;
  photoCount?: number;
};

export type CentralPricingResult = {
  catalogItemId: string;
  serviceName: string;
  serviceSlug: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  minimumPrice: number;
  riskMultiplier: number;
  conditionMultiplier: number;
  frequencyMultiplier: number;
  accessMultiplier: number;
  extrasTotal: number;
  travelTotal: number;
  min: number;
  max: number;
  estimatedPrice: number;
  priceRange: string;
  confidence:
    | "LOW"
    | "MEDIUM"
    | "HIGH";
  requiresPhotoReview: boolean;
  explanation: string[];
};
