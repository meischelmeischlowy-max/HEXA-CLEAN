import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateCentralPrice,
  findCentralPricingItem,
} from "@/lib/pricing/engine";
import type {
  CentralPricingCatalogItem,
} from "@/lib/pricing/types";

const catalog:
CentralPricingCatalogItem[] = [
  {
    id: "apartment",
    name:
      "Wohnungsreinigung",
    slug:
      "reinigung-mieszkania",
    category: "REINIGUNG",
    unit: "M2",
    basePrice: 3.5,
    minPrice: 120,
    maxPrice: null,
    defaultQuantity: 60,
    riskMultiplier: 1,
  },
  {
    id: "office",
    name:
      "Büroreinigung",
    slug:
      "reinigung-biura",
    category: "REINIGUNG",
    unit: "HOUR",
    basePrice: 45,
    minPrice: 120,
    maxPrice: null,
    defaultQuantity: 3,
    riskMultiplier: 1,
  },
  {
    id: "travel",
    name: "Anfahrt",
    slug: "anfahrt",
    category: "OTHER",
    unit: "FLAT",
    basePrice: 35,
    minPrice: 0,
    maxPrice: null,
    defaultQuantity: 1,
    riskMultiplier: 1,
  },
];

describe(
  "E24G2 central pricing engine",
  () => {
    it(
      "selects the office hourly service instead of apartment M2 pricing",
      () => {
        const selected =
          findCentralPricingItem(
            catalog,
            "Büroreinigung",
          );

        expect(
          selected?.id,
        ).toBe("office");
      },
    );

    it(
      "does not price an 80 m2 office at CHF 70-100",
      () => {
        const result =
          calculateCentralPrice(
            catalog,
            {
              service:
                "Büroreinigung",
              areaM2: 80,
              rooms: 2.5,
              bathrooms: 1,
              condition: "LEICHT",
              frequency:
                "EINMALIG",
              extras: [],
            },
          );

        expect(
          result.quantity,
        ).toBeGreaterThanOrEqual(
          3,
        );

        expect(
          result.min,
        ).toBeGreaterThanOrEqual(
          150,
        );

        expect(
          result.priceRange,
        ).not.toBe(
          "CHF 70–100",
        );
      },
    );

    it(
      "uses catalog base and minimum prices",
      () => {
        const result =
          calculateCentralPrice(
            catalog,
            {
              service:
                "Wohnungsreinigung",
              areaM2: 20,
              extras: [],
            },
          );

        expect(
          result.unitPrice,
        ).toBe(3.5);

        expect(
          result.minimumPrice,
        ).toBe(120);

        expect(
          result.min,
        ).toBeGreaterThanOrEqual(
          155,
        );
      },
    );

    it(
      "adds travel from the catalog",
      () => {
        const result =
          calculateCentralPrice(
            catalog,
            {
              service:
                "Wohnungsreinigung",
              areaM2: 80,
              extras: [],
            },
          );

        expect(
          result.travelTotal,
        ).toBe(35);
      },
    );
  },
);
