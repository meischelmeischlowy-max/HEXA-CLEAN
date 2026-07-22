import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const publicLinksPath = path.join(
  root,
  "src/lib/public-offer-links.ts",
);

const legacyRoutePath = path.join(
  root,
  "src/app/api/order/route.ts",
);

const source = fs.readFileSync(
  publicLinksPath,
  "utf8",
);

describe(
  "E17.11D legacy route and public URL configuration",
  () => {
    it(
      "removes the legacy demo order endpoint",
      () => {
        expect(
          fs.existsSync(legacyRoutePath),
        ).toBe(false);
      },
    );

    it(
      "uses HEXA_APP_URL before other URL variables",
      () => {
        const hexaIndex = source.indexOf(
          "process.env.HEXA_APP_URL",
        );

        const publicIndex = source.indexOf(
          "process.env.NEXT_PUBLIC_APP_URL",
        );

        expect(hexaIndex).toBeGreaterThanOrEqual(0);
        expect(publicIndex).toBeGreaterThan(hexaIndex);
      },
    );

    it(
      "blocks missing base URL in production",
      () => {
        expect(source).toContain(
          'process.env.NODE_ENV === "production"',
        );

        expect(source).toContain(
          "Public offer base URL is not configured.",
        );
      },
    );

    it(
      "keeps localhost only as a non-production fallback",
      () => {
        expect(source).toContain(
          "http://localhost:3000/public/offers/",
        );

        const productionCheck = source.indexOf(
          'process.env.NODE_ENV === "production"',
        );

        const localhostFallback = source.indexOf(
          "http://localhost:3000/public/offers/",
        );

        expect(productionCheck).toBeGreaterThanOrEqual(0);
        expect(localhostFallback).toBeGreaterThan(
          productionCheck,
        );
      },
    );
  },
);
