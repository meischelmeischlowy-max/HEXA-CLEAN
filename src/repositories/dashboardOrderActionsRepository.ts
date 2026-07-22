import { prisma } from "@/lib/prisma";

export const dashboardOrderActionsRepository = {
  async markOrderAsCompleted(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
      });

      if (!order) {
        return null;
      }

      if (order.status === "COMPLETED") {
        return {
          order,
          updatedOrder: order,
          updated: false,
          conflict: false,
          requiredStatus: "SCHEDULED" as const,
        };
      }

      if (order.status !== "SCHEDULED") {
        return {
          order,
          updatedOrder: order,
          updated: false,
          conflict: true,
          requiredStatus: "SCHEDULED" as const,
        };
      }

      const updatedOrder = await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: "COMPLETED",
        },
      });

      await tx.auditLog.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          sessionId: order.sessionId,
          action: "STATUS_CHANGE",
          entityType: "Order",
          entityId: order.id,
          actorType: "dashboard",
          before: {
            status: order.status,
          },
          after: {
            status: updatedOrder.status,
          },
          message: `Order ${order.orderNumber} marked as completed`,
          metadata: {
            source: "dashboard_quick_action",
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
        },
      });

      return {
        order,
        updatedOrder,
        updated: true,
        conflict: false,
        requiredStatus: "SCHEDULED" as const,
      };
    }, {
      maxWait: 10_000,
      timeout: 15_000,
    });
  },
};