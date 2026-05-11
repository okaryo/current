import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function sendPomodoroCompleteNotification() {
  await sendCurrentNotification({
    title: "Focus complete",
    body: "Take a short break.",
    failureMessage: "Failed to send Pomodoro notification.",
  });
}

export async function sendWorkLogReminderNotification() {
  await sendCurrentNotification({
    title: "Write a quick work log",
    body: "Capture what you are working on.",
    failureMessage: "Failed to send work log reminder notification.",
  });
}

async function sendCurrentNotification({
  title,
  body,
  failureMessage,
}: {
  title: string;
  body: string;
  failureMessage: string;
}) {
  try {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();

      permissionGranted = permission === "granted";
    }

    if (!permissionGranted) {
      return;
    }

    sendNotification({ title, body });
  } catch (error) {
    console.warn(failureMessage, error);
  }
}
