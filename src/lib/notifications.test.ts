import { describe, expect, it, vi } from "vitest";
import {
  requestCurrentNotificationPermission,
  sendCurrentNotification,
  type NotificationGateway,
} from "$lib/notifications";

function gateway(
  overrides: Partial<NotificationGateway> = {},
): NotificationGateway {
  return {
    isPermissionGranted: vi.fn().mockResolvedValue(true),
    requestPermission: vi.fn().mockResolvedValue("granted"),
    sendNotification: vi.fn(),
    warn: vi.fn(),
    ...overrides,
  };
}

const notification = {
  title: "Focus complete",
  body: "Write a quick log.",
  failureMessage: "Failed to send notification.",
};

describe("sendCurrentNotification", () => {
  it("sends immediately when permission is already granted", async () => {
    const notificationGateway = gateway();

    await sendCurrentNotification(notification, notificationGateway);

    expect(notificationGateway.requestPermission).not.toHaveBeenCalled();
    expect(notificationGateway.sendNotification).toHaveBeenCalledWith({
      title: notification.title,
      body: notification.body,
    });
  });

  it("skips sending without requesting permission when permission is not granted", async () => {
    const notificationGateway = gateway({
      isPermissionGranted: vi.fn().mockResolvedValue(false),
    });

    await sendCurrentNotification(notification, notificationGateway);

    expect(notificationGateway.requestPermission).not.toHaveBeenCalled();
    expect(notificationGateway.sendNotification).not.toHaveBeenCalled();
  });

  it("requests notification permission explicitly", async () => {
    const notificationGateway = gateway({
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });

    await expect(
      requestCurrentNotificationPermission(notificationGateway),
    ).resolves.toBe(true);

    expect(notificationGateway.requestPermission).toHaveBeenCalledOnce();
  });

  it("warns and swallows notification errors", async () => {
    const error = new Error("notification failed");
    const notificationGateway = gateway({
      isPermissionGranted: vi.fn().mockRejectedValue(error),
    });

    await expect(
      sendCurrentNotification(notification, notificationGateway),
    ).resolves.toBeUndefined();
    expect(notificationGateway.warn).toHaveBeenCalledWith(
      notification.failureMessage,
      error,
    );
  });
});
