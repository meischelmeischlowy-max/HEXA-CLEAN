import { orderRepository } from "@/repositories/orderRepository";
import type { OrderStatus, ServiceType } from "@prisma/client";

type CreateOrderInput = {
  customerId: string;
  sessionId?: string;
  serviceType: ServiceType;
  title?: string;
  description?: string;
  estimatedPrice?: number;
  currency?: string;
  serviceStreet?: string;
  serviceZipCode?: string;
  serviceCity?: string;
  serviceCountry?: string;
  preferredDate?: Date;
  notesCustomer?: string;
  notesInternal?: string;
};

function generateOrderNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `HEX-${year}${month}${day}-${random}`;
}

function cleanText(value?: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

export const orderService = {
  async createOrder(input: CreateOrderInput) {
    const order = await orderRepository.create({
      orderNumber: generateOrderNumber(),
      customerId: input.customerId,
      sessionId: input.sessionId,
      serviceType: input.serviceType,
      title: cleanText(input.title),
      description: cleanText(input.description),
      status: "NEW",
      estimatedPrice: input.estimatedPrice,
      currency: input.currency ?? "CHF",
      serviceStreet: cleanText(input.serviceStreet),
      serviceZipCode: cleanText(input.serviceZipCode),
      serviceCity: cleanText(input.serviceCity),
      serviceCountry: cleanText(input.serviceCountry) ?? "CH",
      preferredDate: input.preferredDate,
      notesCustomer: cleanText(input.notesCustomer),
      notesInternal: cleanText(input.notesInternal),
    });

    return order;
  },

  async getOrderById(id: string) {
    const order = await orderRepository.findById(id);

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  },

  async getOrdersByCustomerId(customerId: string) {
    return orderRepository.findByCustomerId(customerId);
  },

  async updateOrderStatus(id: string, status: OrderStatus) {
    return orderRepository.updateStatus(id, status);
  },
};