import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateCentralPrice,
} from "@/lib/pricing/engine";
import type {
  CentralPricingCatalogItem,
} from "@/lib/pricing/types";

const catalog:
CentralPricingCatalogItem[] = [
  {
    id: "apartment",
    name: "Wohnungsreinigung",
    slug: "wohnungsreinigung",
    category: "REINIGUNG",
    unit: "M2",
    basePrice: 3.5,
    minPrice: 120,
    maxPrice: null,
    defaultQuantity: 60,
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
  "E24J orientational pricing",
  () => {
    it(
      "does not price a substantial 85 m2 apartment like base cleaning only",
      () => {
        const result =
          calculateCentralPrice(
            catalog,
            {
              service:
                "Wohnungsreinigung",
              areaM2: 85,
              rooms: 4.5,
              bathrooms: 2,
              windows: 8,
              condition: "NORMAL",
              frequency: "EINMALIG",
              extras: [
                "Fensterreinigung",
                "Backofenreinigung",
              ],
              floor: 2,
              elevator: false,
            },
          );

        expect(
          result.estimatedPrice,
        ).toBeGreaterThanOrEqual(
          550,
        );

        expect(
          result.min,
        ).toBeGreaterThanOrEqual(
          450,
        );

        expect(
          result.max,
        ).toBeGreaterThan(
          result.min,
        );

        expect(
          result.extrasTotal,
        ).toBeGreaterThanOrEqual(
          35,
        );

        expect(
          result.travelTotal,
        ).toBe(35);
      },
    );

    it(
      "widens the range when important details are still missing",
      () => {
        const incomplete =
          calculateCentralPrice(
            catalog,
            {
              service:
                "Wohnungsreinigung",
              areaM2: 85,
              extras: [],
            },
          );

        const complete =
          calculateCentralPrice(
            catalog,
            {
              service:
                "Wohnungsreinigung",
              areaM2: 85,
              rooms: 4.5,
              bathrooms: 2,
              condition: "NORMAL",
              frequency: "EINMALIG",
              extras: [],
            },
          );

        expect(
          incomplete.max -
            incomplete.min,
        ).toBeGreaterThan(
          complete.max -
            complete.min,
        );
      },
    );

    it(
      "prices window cleaning by the number of windows",
      () => {
        const eightWindows =
          calculateCentralPrice(
            catalog,
            {
              service:
                "Wohnungsreinigung",
              areaM2: 85,
              rooms: 4,
              bathrooms: 2,
              windows: 8,
              extras: [
                "Fensterreinigung",
              ],
            },
          );

        const fourWindows =
          calculateCentralPrice(
            catalog,
            {
              service:
                "Wohnungsreinigung",
              areaM2: 85,
              rooms: 4,
              bathrooms: 2,
              windows: 4,
              extras: [
                "Fensterreinigung",
              ],
            },
          );

        expect(
          eightWindows.estimatedPrice,
        ).toBeGreaterThan(
          fourWindows.estimatedPrice,
        );
      },
    );
  },
);