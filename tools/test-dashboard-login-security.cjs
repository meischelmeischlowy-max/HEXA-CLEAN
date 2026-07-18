const { createHmac } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const baseUrl = process.argv[2] || "http://localhost:3100";
const password = process.env.DASHBOARD_PASSWORD;
const hashSecret =
  process.env.HEXA_PUBLIC_SECURITY_SECRET ||
  process.env.DASHBOARD_AUTH_TOKEN ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET;

if (!password || !hashSecret || !process.env.DATABASE_URL) {
  throw new Error("Brak wymaganych zmiennych srodowiskowych testu.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const startedAt = new Date(Date.now() - 2000);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const wrongPassword = `C2B-wrong-${suffix}`;
const firstIp = `198.51.100.${20 + (Date.now() % 100)}`;
const secondIp = `203.0.113.${20 + (Date.now() % 100)}`;
const firstAgent = `Hexa-C2B-Blocked-${suffix}`;
const secondAgent = `Hexa-C2B-Success-${suffix}`;

function fingerprint(ip, userAgent) {
  return createHmac("sha256", hashSecret)
    .update(`${ip}|${userAgent}|de-CH`, "utf8")
    .digest("hex");
}

const firstFingerprint = fingerprint(firstIp, firstAgent);
const secondFingerprint = fingerprint(secondIp, secondAgent);

async function login(ip, userAgent, submittedPassword) {
  return fetch(`${baseUrl}/api/dashboard/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": userAgent,
      "accept-language": "de-CH",
    },
    body: JSON.stringify({ password: submittedPassword }),
  });
}

function expectStatus(name, response, expected) {
  console.log(`${name} -> HTTP ${response.status}`);
  if (response.status !== expected) {
    throw new Error(`${name}: oczekiwano ${expected}, otrzymano ${response.status}`);
  }
}

async function main() {
  try {
    for (let attempt = 1; attempt <= 7; attempt += 1) {
      expectStatus(
        `INVALID ${attempt}`,
        await login(firstIp, firstAgent, wrongPassword),
        401,
      );
    }

    const threshold = await login(firstIp, firstAgent, wrongPassword);
    expectStatus("INVALID 8 LIMIT", threshold, 429);
    if (!threshold.headers.get("retry-after")) {
      throw new Error("Brak naglowka Retry-After.");
    }

    expectStatus(
      "REPEATED BLOCK",
      await login(firstIp, firstAgent, wrongPassword),
      429,
    );
    expectStatus(
      "CORRECT PASSWORD BLOCKED",
      await login(firstIp, firstAgent, password),
      429,
    );

    const success = await login(secondIp, secondAgent, password);
    expectStatus("UNIQUE FINGERPRINT LOGIN", success, 200);
    const cookie = success.headers.get("set-cookie") || "";
    if (!/hexa_dashboard_auth=v1\.\d+\.\d+\.[0-9a-f]{32}\.[0-9a-f]{64}/.test(cookie)) {
      throw new Error("Brak prawidlowego podpisanego cookie.");
    }

    const events = await prisma.publicSecurityEvent.findMany({
      where: {
        scope: "dashboard_login",
        fingerprintHash: { in: [firstFingerprint, secondFingerprint] },
        createdAt: { gte: startedAt },
      },
      orderBy: { createdAt: "asc" },
    });

    const invalidCount = events.filter((event) => event.reason === "login_invalid").length;
    const limitedCount = events.filter((event) => event.reason === "login_rate_limited").length;
    const successCount = events.filter((event) => event.reason === "login_success").length;
    console.log(`DB EVENTS -> invalid=${invalidCount}, limited=${limitedCount}, success=${successCount}`);

    if (invalidCount !== 8 || limitedCount < 1 || successCount !== 1) {
      throw new Error("Nieprawidlowa liczba zdarzen bezpieczenstwa.");
    }

    const serialized = JSON.stringify(events);
    for (const secretValue of [wrongPassword, firstIp, secondIp, firstAgent, secondAgent]) {
      if (serialized.includes(secretValue)) {
        throw new Error("Zdarzenia zawieraja surowe dane testowe.");
      }
    }
    console.log("PRIVACY CHECK -> OK");
  } finally {
    await prisma.publicSecurityEvent.deleteMany({
      where: {
        scope: "dashboard_login",
        fingerprintHash: { in: [firstFingerprint, secondFingerprint] },
        createdAt: { gte: startedAt },
      },
    });

    const remaining = await prisma.publicSecurityEvent.count({
      where: {
        scope: "dashboard_login",
        fingerprintHash: { in: [firstFingerprint, secondFingerprint] },
        createdAt: { gte: startedAt },
      },
    });
    console.log(`TEST EVENT CLEANUP -> ${remaining === 0 ? "OK" : "ERROR"}`);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
