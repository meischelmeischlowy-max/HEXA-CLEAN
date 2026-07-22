import {
  AvailabilitySlotStatus,
  OrderStatus,
  PrismaClient,
} from "@prisma/client";

const TENANT_KEY = "hexa-clean";
const TIME_ZONE = "Europe/Zurich";

const HORIZON_DAYS = 30;
const SLOT_MINUTES = 120;

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;

const WORKING_DAYS = new Set([
  1,
  2,
  3,
  4,
  5,
  6,
]);

type TimeRange = {
  startAt: Date;
  endAt: Date;
};

function overlaps(
  left: TimeRange,
  right: TimeRange,
) {
  return (
    left.startAt.getTime() <
      right.endAt.getTime() &&
    left.endAt.getTime() >
      right.startAt.getTime()
  );
}

function getZurichParts(
  date: Date,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      },
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ]),
    );

  const weekdays:
    Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

  return {
    year:
      Number(values.year),

    month:
      Number(values.month),

    day:
      Number(values.day),

    weekday:
      weekdays[
        values.weekday
      ] ?? 0,
  };
}

function getZurichOffsetMs(
  date: Date,
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ]),
    );

  const representedUtc =
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );

  return (
    representedUtc -
    date.getTime()
  );
}

function zurichToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const target =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0,
    );

  let result = target;

  for (
    let pass = 0;
    pass < 3;
    pass += 1
  ) {
    result =
      target -
      getZurichOffsetMs(
        new Date(result),
      );
  }

  return new Date(result);
}

function createCandidates(
  now: Date,
) {
  const candidates:
    TimeRange[] = [];

  for (
    let dayOffset = 0;
    dayOffset < HORIZON_DAYS;
    dayOffset += 1
  ) {
    const reference =
      new Date(
        now.getTime() +
          dayOffset *
            24 *
            60 *
            60 *
            1000,
      );

    const local =
      getZurichParts(
        reference,
      );

    if (
      !WORKING_DAYS.has(
        local.weekday,
      )
    ) {
      continue;
    }

    for (
      let startMinutes =
        WORK_START_HOUR * 60;
      startMinutes +
          SLOT_MINUTES <=
        WORK_END_HOUR * 60;
      startMinutes +=
        SLOT_MINUTES
    ) {
      const endMinutes =
        startMinutes +
        SLOT_MINUTES;

      const startAt =
        zurichToUtc(
          local.year,
          local.month,
          local.day,
          Math.floor(
            startMinutes / 60,
          ),
          startMinutes % 60,
        );

      const endAt =
        zurichToUtc(
          local.year,
          local.month,
          local.day,
          Math.floor(
            endMinutes / 60,
          ),
          endMinutes % 60,
        );

      if (
        startAt.getTime() <=
        now.getTime() +
          30 * 60 * 1000
      ) {
        continue;
      }

      candidates.push({
        startAt,
        endAt,
      });
    }
  }

  return candidates;
}

export async function ensureAutomaticAvailability(
  prisma: PrismaClient,
  now = new Date(),
) {
  const bookedSlots =
    await prisma.availabilitySlot.findMany({
      where: {
        tenantKey: TENANT_KEY,
        status:
          AvailabilitySlotStatus.BOOKED,
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

  const releasableIds =
    bookedSlots
      .filter(
        (slot) =>
          !slot.order ||
          slot.order.status ===
            OrderStatus.CANCELLED,
      )
      .map(
        (slot) => slot.id,
      );

  if (
    releasableIds.length > 0
  ) {
    await prisma.availabilitySlot.updateMany({
      where: {
        id: {
          in: releasableIds,
        },
      },
      data: {
        status:
          AvailabilitySlotStatus.AVAILABLE,
        orderId: null,
      },
    });
  }

  const candidates =
    createCandidates(now);

  if (
    candidates.length === 0
  ) {
    return {
      created: 0,
      released:
        releasableIds.length,
    };
  }

  const horizonStart =
    candidates[0].startAt;

  const horizonEnd =
    candidates[
      candidates.length - 1
    ].endAt;

  const [
    existingSlots,
    orders,
  ] = await Promise.all([
    prisma.availabilitySlot.findMany({
      where: {
        tenantKey: TENANT_KEY,
        startAt: {
          lt: horizonEnd,
        },
        endAt: {
          gt: horizonStart,
        },
      },
      select: {
        startAt: true,
        endAt: true,
      },
    }),

    prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.SCHEDULED,
            OrderStatus.IN_PROGRESS,
          ],
        },
        scheduledStart: {
          not: null,
          lt: horizonEnd,
        },
        scheduledEnd: {
          not: null,
          gt: horizonStart,
        },
      },
      select: {
        scheduledStart: true,
        scheduledEnd: true,
      },
    }),
  ]);

  const occupied:
    TimeRange[] = [];

  for (
    const slot
    of existingSlots
  ) {
    occupied.push({
      startAt:
        slot.startAt,
      endAt:
        slot.endAt,
    });
  }

  for (
    const order
    of orders
  ) {
    if (
      !order.scheduledStart ||
      !order.scheduledEnd
    ) {
      continue;
    }

    occupied.push({
      startAt:
        order.scheduledStart,
      endAt:
        order.scheduledEnd,
    });
  }

  const newSlots =
    candidates.filter(
      (candidate) =>
        !occupied.some(
          (range) =>
            overlaps(
              candidate,
              range,
            ),
        ),
    );

  if (
    newSlots.length === 0
  ) {
    return {
      created: 0,
      released:
        releasableIds.length,
    };
  }

  const result =
    await prisma.availabilitySlot.createMany({
      data:
        newSlots.map(
          (slot) => ({
            tenantKey:
              TENANT_KEY,

            startAt:
              slot.startAt,

            endAt:
              slot.endAt,

            status:
              AvailabilitySlotStatus.AVAILABLE,

            notes:
              "Automatisch aus den Arbeitszeiten erstellt",
          }),
        ),

      skipDuplicates: true,
    });

  return {
    created:
      result.count,

    released:
      releasableIds.length,
  };
}
