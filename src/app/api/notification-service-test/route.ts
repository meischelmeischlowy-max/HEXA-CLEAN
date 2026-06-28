import { NextResponse } from "next/server";
import { NotificationChannel } from "@prisma/client";
import { notificationService } from "@/services/notificationService";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const allowedChannels = Object.values(NotificationChannel);

    const channelFromBody =
      typeof body.channel === "string" ? body.channel : allowedChannels[0];

    if (!allowedChannels.includes(channelFromBody as NotificationChannel)) {
      return NextResponse.json(
        {
          layer: "notification-service",
          message: "Invalid notification channel",
          allowedChannels,
        },
        { status: 400 }
      );
    }

    const notification = await notificationService.createNotification({
      channel: channelFromBody as NotificationChannel,
      recipient: body.recipient ?? "owner@hexa-clean.ch",
      subject: body.subject ?? "HEXA OS Test Notification",
      message:
        body.message ??
        "Notification Service works. This is a test notification from HEXA OS.",
      metadata: {
        source: "notification-service-test",
        createdBy: "HEXA OS backend test",
      },
    });

    const loadedNotification =
      await notificationService.getNotificationById(notification.id);

    const notifications = await notificationService.getAllNotifications();

    return NextResponse.json({
      layer: "notification-service",
      message: "Notification Service works",
      test: {
        notificationCreated: true,
        notificationId: notification.id,
        channel: notification.channel,
        status: notification.status,
        recipient: notification.recipient,
        loadedNotificationId: loadedNotification?.id,
        notificationsCount: notifications.length,
        allowedChannels,
      },
      data: {
        notification,
      },
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