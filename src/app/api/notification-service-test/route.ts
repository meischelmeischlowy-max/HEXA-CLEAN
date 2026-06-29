import { NextResponse } from "next/server";

import { notificationService } from "@/services/notificationService";

export async function POST() {
  try {
    const notification = await notificationService.createNotification({
      channel: "EMAIL" as never,
      recipient: "test@example.com",
      subject: "Notification Service Test",
      message: "Notification Service works",
      metadata: {
        source: "notification-service-test",
      },
    });

    return NextResponse.json({
      layer: "notification-service",
      message: "Notification Service works",
      test: {
        notificationCreated: true,
        notificationId: notification.id,
        channel: notification.channel,
        status: notification.status,
      },
      data: notification,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "notification-service",
        message: "Notification Service failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}