import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function sendPomodoroCompleteNotification() {
  await sendCurrentNotification({
    title: "Focus complete",
    body: "Write a quick log and lightly tidy Todo.",
    failureMessage: "Failed to send Pomodoro notification.",
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
