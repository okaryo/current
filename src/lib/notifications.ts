import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function sendPomodoroCompleteNotification() {
  try {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();

      permissionGranted = permission === "granted";
    }

    if (!permissionGranted) {
      return;
    }

    sendNotification({
      title: "Focus complete",
      body: "Take a short break.",
    });
  } catch (error) {
    console.warn("Failed to send Pomodoro notification.", error);
  }
}
