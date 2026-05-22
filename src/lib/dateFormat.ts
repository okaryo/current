const APP_DATE_LOCALE = "en-US";

export function formatFooterDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat(APP_DATE_LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatWorkLogDateLabel(date: Date, todayStartMs: number) {
  const dateStartMs = startOfLocalDay(date.getTime());

  if (dateStartMs === todayStartMs) {
    return "Today";
  }

  if (dateStartMs === addLocalDays(todayStartMs, -1)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(APP_DATE_LOCALE, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date(todayStartMs).getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

export function formatWorkLogTime(createdAtMs: number) {
  return new Intl.DateTimeFormat(APP_DATE_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(createdAtMs));
}

export function startOfLocalDay(timestampMs: number) {
  const date = new Date(timestampMs);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

export function addLocalDays(timestampMs: number, dayOffset: number) {
  const date = new Date(timestampMs);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + dayOffset,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  ).getTime();
}
