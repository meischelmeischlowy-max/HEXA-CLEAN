import { randomUUID } from "crypto";

export type OrderStatus =
  | "new"
  | "contacted"
  | "quote_sent"
  | "accepted"
  | "in_progress"
  | "done"
  | "cancelled";

export type CustomerData = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
};

export type ServiceDetails = {
  service?: string;
  area?: number;
  windows?: number;
  floor?: string;
  elevator?: boolean;
  appointment?: string;
  notes?: string;
};

export type Order = {
  id: string;
  orderId: string;
  sessionId: string;
  status: OrderStatus;
  customer: CustomerData;
  serviceDetails: ServiceDetails;
  estimatedPrice?: number;
  createdAt: string;
  updatedAt: string;
};

export function createOrder(input: {
  sessionId: string;
  orderId: string;
  customer?: CustomerData;
  serviceDetails?: ServiceDetails;
  estimatedPrice?: number;
}): Order {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    orderId: input.orderId,
    sessionId: input.sessionId,
    status: "new",
    customer: input.customer ?? {},
    serviceDetails: input.serviceDetails ?? {},
    estimatedPrice: input.estimatedPrice,
    createdAt: now,
    updatedAt: now,
  };
}