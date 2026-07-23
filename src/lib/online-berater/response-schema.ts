export const onlineBeraterResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: {
      type: "string",
    },
    lead: {
      type: "object",
      additionalProperties: false,
      properties: {
        service: {
          type: ["string", "null"],
        },
        objectType: {
          type: ["string", "null"],
        },
        location: {
          type: ["string", "null"],
        },
        areaM2: {
          type: ["number", "null"],
        },
        rooms: {
          type: ["number", "null"],
        },
        bathrooms: {
          type: ["number", "null"],
        },
        floor: {
          type: ["number", "null"],
        },
        elevator: {
          type: ["boolean", "null"],
        },
        parkingAccess: {
          type: ["string", "null"],
        },
        condition: {
          type: ["string", "null"],
        },
        frequency: {
          type: ["string", "null"],
        },
        extras: {
          type: "array",
          items: {
            type: "string",
          },
        },
        preferredDate: {
          type: ["string", "null"],
        },
        flexibleDate: {
          type: ["boolean", "null"],
        },
        photoRequired: {
          type: ["boolean", "null"],
        },
        customerName: {
          type: ["string", "null"],
        },
        email: {
          type: ["string", "null"],
        },
        phone: {
          type: ["string", "null"],
        },
      },
      required: [
        "service",
        "objectType",
        "location",
        "areaM2",
        "rooms",
        "bathrooms",
        "floor",
        "elevator",
        "parkingAccess",
        "condition",
        "frequency",
        "extras",
        "preferredDate",
        "flexibleDate",
        "photoRequired",
        "customerName",
        "email",
        "phone",
      ],
    },
    missingFields: {
      type: "array",
      items: {
        type: "string",
      },
    },
    leadReady: {
      type: "boolean",
    },
    shouldCreateLead: {
      type: "boolean",
    },
    shouldAskForPhotos: {
      type: "boolean",
    },
    confidence: {
      type: "string",
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
      ],
    },
  },
  required: [
    "reply",
    "lead",
    "missingFields",
    "leadReady",
    "shouldCreateLead",
    "shouldAskForPhotos",
    "confidence",
  ],
} as const;
