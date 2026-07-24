import type {
  CentralPricingCatalogItem,
  CentralPricingInput,
  CentralPricingResult,
} from "./types";

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(
    Math.max(value, minimum),
    maximum,
  );
}

function roundToFive(value: number) {
  return Math.round(value / 5) * 5;
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("de-CH")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function serviceScore(
  item: CentralPricingCatalogItem,
  requestedService: string,
) {
  const request = normalize(requestedService);
  const name = normalize(item.name);
  const slug = normalize(item.slug);
  const category = normalize(item.category);

  let score = 0;

  if (
    request &&
    (
      name.includes(request) ||
      request.includes(name)
    )
  ) {
    score += 100;
  }

  if (
    request &&
    (
      slug.includes(request) ||
      request.includes(slug)
    )
  ) {
    score += 80;
  }

  const mappings = [
    {
      terms: [
        "umzug",
        "endreinigung",
        "wohnungsabgabe",
        "abgabe",
      ],
      categories: [
        "wohnungsabgabe",
      ],
    },
    {
      terms: [
        "buro",
        "buero",
        "office",
      ],
      names: [
        "buroreinigung",
        "bueroreinigung",
      ],
    },
    {
      terms: [
        "fenster",
        "window",
      ],
      categories: [
        "fensterreinigung",
      ],
    },
    {
      terms: [
        "hauswartung",
        "objektunterhalt",
      ],
      categories: [
        "hauswartung",
      ],
    },
    {
      terms: [
        "reparatur",
        "montage",
      ],
      categories: [
        "kleinreparaturen",
      ],
    },
    {
      terms: [
        "spezial",
        "grundreinigung",
        "stark verschmutzt",
      ],
      categories: [
        "spezialreinigung",
      ],
    },
    {
      terms: [
        "wohnung",
        "wohnungsreinigung",
        "reinigung",
      ],
      categories: [
        "reinigung",
      ],
    },
  ];

  for (const mapping of mappings) {
    const termMatch =
      mapping.terms.some(
        (term) =>
          request.includes(term),
      );

    if (!termMatch) {
      continue;
    }

    if (
      mapping.categories?.some(
        (entry) =>
          category.includes(entry),
      )
    ) {
      score += 60;
    }

    if (
      mapping.names?.some(
        (entry) =>
          name.includes(entry),
      )
    ) {
      score += 60;
    }
  }

  if (
    request.includes("buro") ||
    request.includes("buero")
  ) {
    if (
      name.includes("buro") ||
      name.includes("buero")
    ) {
      score += 120;
    }

    if (
      category === "reinigung" &&
      item.unit === "HOUR"
    ) {
      score += 80;
    }

    if (item.unit === "M2") {
      score -= 50;
    }
  }

  return score;
}

export function findCentralPricingItem(
  catalog: CentralPricingCatalogItem[],
  service: string,
) {
  return catalog
    .map((item) => ({
      item,
      score: serviceScore(
        item,
        service,
      ),
    }))
    .sort(
      (left, right) =>
        right.score - left.score,
    )[0]?.item ?? null;
}

function conditionMultiplier(
  condition: string | null | undefined,
) {
  const normalized = normalize(condition);

  if (
    normalized.includes("leicht") ||
    normalized.includes("light")
  ) {
    return 0.95;
  }

  if (
    normalized.includes("stark") ||
    normalized.includes("heavy") ||
    normalized.includes("sehr") ||
    normalized.includes("verschmutzt")
  ) {
    return 1.3;
  }

  return 1;
}

function frequencyMultiplier(
  frequency: string | null | undefined,
) {
  const normalized = normalize(frequency);

  if (
    normalized.includes("wochentlich") ||
    normalized.includes("weekly")
  ) {
    return 0.9;
  }

  if (
    normalized.includes("zweiwochentlich") ||
    normalized.includes("14")
  ) {
    return 0.94;
  }

  if (
    normalized.includes("monatlich") ||
    normalized.includes("monthly")
  ) {
    return 0.97;
  }

  return 1;
}

function accessMultiplier(
  floor: number | null | undefined,
  elevator: boolean | null | undefined,
) {
  const safeFloor =
    Number.isFinite(Number(floor))
      ? Math.max(Number(floor), 0)
      : 0;

  if (
    safeFloor >= 4 &&
    elevator === false
  ) {
    return 1.15;
  }

  if (
    safeFloor >= 2 &&
    elevator === false
  ) {
    return 1.08;
  }

  return 1;
}

function estimateQuantity(
  item: CentralPricingCatalogItem,
  input: CentralPricingInput,
) {
  if (item.unit === "M2") {
    return clamp(
      Number(input.areaM2) ||
        item.defaultQuantity ||
        60,
      10,
      2000,
    );
  }

  if (item.unit === "WINDOW") {
    return clamp(
      Number(input.windows) ||
        item.defaultQuantity ||
        6,
      1,
      200,
    );
  }

  if (item.unit === "HOUR") {
    const area =
      clamp(
        Number(input.areaM2) || 80,
        10,
        2000,
      );

    const rooms =
      clamp(
        Number(input.rooms) || 2.5,
        1,
        20,
      );

    const bathrooms =
      clamp(
        Number(input.bathrooms) || 1,
        0,
        10,
      );

    const normalizedService =
      normalize(
        input.service,
      );

    if (
      normalizedService.includes("buro") ||
      normalizedService.includes("buero")
    ) {
      return Math.max(
        item.defaultQuantity || 3,
        Math.ceil(
          area / 35 +
            bathrooms * 0.4,
        ),
      );
    }

    if (
      normalizedService.includes("hauswart")
    ) {
      return Math.max(
        item.defaultQuantity || 3,
        Math.ceil(
          area / 80 +
            rooms * 0.15,
        ),
      );
    }

    return Math.max(
      item.defaultQuantity || 2,
      Math.ceil(
        area / 60 +
          rooms * 0.2,
      ),
    );
  }

  if (item.unit === "FLAT") {
    return 1;
  }

  return (
    item.defaultQuantity ??
    1
  );
}

function calculateExtras(
  extras: string[],
) {
  const prices: Record<string, number> = {
    fenster: 90,
    backofen: 45,
    ofen: 45,
    kuhlschrank: 40,
    kuehlschrank: 40,
    balkon: 50,
    keller: 70,
    garage: 70,
  };

  return extras.reduce(
    (total, extra) => {
      const key = normalize(extra)
        .replaceAll(" ", "");

      return (
        total +
        (
          prices[key] ??
          35
        )
      );
    },
    0,
  );
}

export function calculateCentralPrice(
  catalog: CentralPricingCatalogItem[],
  input: CentralPricingInput,
): CentralPricingResult {
  const item =
    findCentralPricingItem(
      catalog,
      input.service,
    );

  if (!item) {
    throw new Error(
      "No active pricing item matches the requested service",
    );
  }

  const quantity =
    estimateQuantity(
      item,
      input,
    );

  const condition =
    conditionMultiplier(
      input.condition,
    );

  const frequency =
    frequencyMultiplier(
      input.frequency,
    );

  const access =
    accessMultiplier(
      input.floor,
      input.elevator,
    );

  const normalizedExtras =
    (input.extras ?? []).map(
      (extra) => normalize(extra),
    );

  const windowCount =
    Number.isFinite(Number(input.windows)) &&
    Number(input.windows) > 0
      ? Math.round(Number(input.windows))
      : 0;

  const hasWindowCleaning =
    normalizedExtras.some(
      (extra) =>
        extra.includes("fenster") ||
        extra.includes("window"),
    );

  const extrasWithoutWindows =
    (input.extras ?? []).filter(
      (extra) => {
        const normalizedExtra =
          normalize(extra);

        return !(
          windowCount > 0 &&
          (
            normalizedExtra.includes("fenster") ||
            normalizedExtra.includes("window")
          )
        );
      },
    );

  const extrasTotal =
    calculateExtras(
      extrasWithoutWindows,
    );

  const roomCount =
    Number.isFinite(Number(input.rooms))
      ? Math.max(Number(input.rooms), 0)
      : 0;

  const bathroomCount =
    Number.isFinite(Number(input.bathrooms))
      ? Math.max(Number(input.bathrooms), 0)
      : 0;

  const roomSupplement =
    item.unit === "M2"
      ? Math.max(
          roomCount - 2,
          0,
        ) * 18
      : 0;

  const bathroomSupplement =
    item.unit === "M2"
      ? bathroomCount * 35
      : 0;

  const windowSupplement =
    hasWindowCleaning &&
    windowCount > 0
      ? windowCount * 14
      : 0;

  const scopeSupplement =
    roomSupplement +
    bathroomSupplement +
    windowSupplement;

  const travelItem =
    catalog.find(
      (catalogItem) =>
        normalize(
          catalogItem.name,
        ).includes("anfahrt") ||
        normalize(
          catalogItem.slug,
        ).includes("anfahrt"),
    );

  const travelTotal =
    travelItem
      ? Math.max(
          travelItem.basePrice,
          travelItem.minPrice,
        )
      : 0;

  const rawSubtotal =
    item.unit === "CUSTOM"
      ? item.minPrice
      : quantity *
        item.basePrice;

  const subtotal =
    Math.max(
      rawSubtotal,
      item.minPrice,
    );

  const adjusted =
    (
      subtotal *
      Math.max(
        item.riskMultiplier,
        1,
      ) *
      condition *
      frequency *
      access
    ) +
    scopeSupplement +
    extrasTotal +
    travelTotal;

  const requiresPhotoReview =
    item.unit === "CUSTOM" ||
    item.riskMultiplier >= 1.5 ||
    condition >= 1.3;

  const photoCount =
    Math.max(
      Number(input.photoCount) || 0,
      0,
    );

  const missingPricingFields = [
    input.areaM2,
    input.rooms,
    input.bathrooms,
    input.condition,
    input.frequency,
    hasWindowCleaning
      ? input.windows
      : 1,
  ].filter(
    (value) =>
      value === null ||
      value === undefined ||
      value === "",
  ).length;

  const baseUncertainty =
    requiresPhotoReview &&
    photoCount === 0
      ? 0.2
      : photoCount > 0
        ? 0.1
        : 0.14;

  const uncertainty =
    clamp(
      baseUncertainty +
        missingPricingFields * 0.025,
      0.1,
      0.32,
    );

  const minimumFloor =
    item.minPrice +
    travelTotal;

  const min = roundToFive(
    Math.max(
      adjusted *
        (1 - uncertainty),
      minimumFloor,
    ),
  );

  const maxBeforeCap =
    adjusted *
    (1 + uncertainty);

  const max = roundToFive(
    Math.max(
      min + 20,
      maxBeforeCap,
    ),
  );

  const estimatedPrice =
    roundToFive(
      (min + max) / 2,
    );

  const confidence =
    requiresPhotoReview &&
    photoCount === 0
      ? "LOW"
      : photoCount > 0
        ? "HIGH"
        : "MEDIUM";

  const explanation = [
    `${item.name}: ${quantity} × CHF ${item.basePrice.toFixed(2)}`,
    `Mindestpreis: CHF ${item.minPrice.toFixed(2)}`,
    travelTotal > 0
      ? `Anfahrt: CHF ${travelTotal.toFixed(2)}`
      : null,
    roomSupplement > 0
      ? `Zimmerzuschlag: CHF ${roomSupplement.toFixed(2)}`
      : null,
    bathroomSupplement > 0
      ? `Badezimmerzuschlag: CHF ${bathroomSupplement.toFixed(2)}`
      : null,
    windowSupplement > 0
      ? `Fensterreinigung (${windowCount}): CHF ${windowSupplement.toFixed(2)}`
      : null,
    extrasTotal > 0
      ? `Zusatzleistungen: CHF ${extrasTotal.toFixed(2)}`
      : null,
    condition !== 1
      ? `Zustandsfaktor: ${condition.toFixed(2)}`
      : null,
    frequency !== 1
      ? `Rhythmusfaktor: ${frequency.toFixed(2)}`
      : null,
    access !== 1
      ? `Zugangsfaktor: ${access.toFixed(2)}`
      : null,
  ].filter(
    (value): value is string =>
      Boolean(value),
  );

  return {
    catalogItemId: item.id,
    serviceName: item.name,
    serviceSlug: item.slug,
    category: item.category,
    unit: item.unit,
    quantity,
    unitPrice: item.basePrice,
    subtotal:
      roundToFive(subtotal),
    minimumPrice:
      item.minPrice,
    riskMultiplier:
      item.riskMultiplier,
    conditionMultiplier:
      condition,
    frequencyMultiplier:
      frequency,
    accessMultiplier:
      access,
    extrasTotal,
    travelTotal,
    min,
    max,
    estimatedPrice,
    priceRange:
      `CHF ${min}–${max}`,
    confidence,
    requiresPhotoReview,
    explanation,
  };
}
