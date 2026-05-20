export type WorkLogTextPart = {
  kind: "text";
  value: string;
};

export type WorkLogUrlPart = {
  kind: "url";
  value: string;
};

export type WorkLogBodyPart = WorkLogTextPart | WorkLogUrlPart;

const urlPattern = /https?:\/\/[^\s<>"']+/g;
const trailingUrlPunctuationPattern = /[),.:;!?]+$/;

export function linkifyWorkLogBody(body: string): WorkLogBodyPart[] {
  const parts: WorkLogBodyPart[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(urlPattern)) {
    const matchedUrl = match[0];
    const matchIndex = match.index ?? 0;
    const url = matchedUrl.replace(trailingUrlPunctuationPattern, "");
    const trailingText = matchedUrl.slice(url.length);

    if (matchIndex > lastIndex) {
      appendTextPart(parts, body.slice(lastIndex, matchIndex));
    }

    if (url) {
      parts.push({
        kind: "url",
        value: url,
      });
    }

    if (trailingText) {
      appendTextPart(parts, trailingText);
    }

    lastIndex = matchIndex + matchedUrl.length;
  }

  if (lastIndex < body.length) {
    appendTextPart(parts, body.slice(lastIndex));
  }

  return parts.length > 0
    ? parts
    : [
        {
          kind: "text",
          value: body,
        },
      ];
}

function appendTextPart(parts: WorkLogBodyPart[], value: string) {
  const previousPart = parts.at(-1);

  if (previousPart?.kind === "text") {
    previousPart.value += value;
    return;
  }

  parts.push({
    kind: "text",
    value,
  });
}
