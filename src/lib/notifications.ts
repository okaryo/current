import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

type NotificationRequest = {
  title: string;
  body: string;
  failureMessage: string;
};

export type NotificationGateway = {
  isPermissionGranted: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
  sendNotification: (notification: { title: string; body: string }) => void;
  warn: (message: string, error: unknown) => void;
};

const tauriNotificationGateway: NotificationGateway = {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  warn: console.warn,
};

export async function sendPomodoroCompleteNotification() {
  await sendCurrentNotification({
    title: "Focus complete",
    body: "Write a quick log and lightly tidy Todo.",
    failureMessage: "Failed to send Pomodoro notification.",
  });
}

export async function sendCurrentNotification(
  { title, body, failureMessage }: NotificationRequest,
  gateway = tauriNotificationGateway,
) {
  try {
    const permissionGranted = await gateway.isPermissionGranted();

    if (!permissionGranted) {
      return;
    }

    gateway.sendNotification({ title, body });
  } catch (error) {
    gateway.warn(failureMessage, error);
  }
}

export async function isCurrentNotificationPermissionGranted(
  gateway = tauriNotificationGateway,
) {
  try {
    return await gateway.isPermissionGranted();
  } catch (error) {
    gateway.warn("Failed to check notification permission.", error);
    return false;
  }
}

export async function requestCurrentNotificationPermission(
  gateway = tauriNotificationGateway,
) {
  try {
    return (await gateway.requestPermission()) === "granted";
  } catch (error) {
    gateway.warn("Failed to request notification permission.", error);
    return false;
  }
}
