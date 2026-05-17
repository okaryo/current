import { describe, expect, it, vi } from "vitest";
import {
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

  it("requests permission before sending when permission is not yet granted", async () => {
    const notificationGateway = gateway({
      isPermissionGranted: vi.fn().mockResolvedValue(false),
    });

    await sendCurrentNotification(notification, notificationGateway);

    expect(notificationGateway.requestPermission).toHaveBeenCalledOnce();
    expect(notificationGateway.sendNotification).toHaveBeenCalledWith({
      title: notification.title,
      body: notification.body,
    });
  });

  it("does not send when permission is denied", async () => {
    const notificationGateway = gateway({
      isPermissionGranted: vi.fn().mockResolvedValue(false),
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    await sendCurrentNotification(notification, notificationGateway);

    expect(notificationGateway.sendNotification).not.toHaveBeenCalled();
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
