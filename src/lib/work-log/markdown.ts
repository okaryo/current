export type MarkdownNewLineInsertion = {
  value: string;
  cursorPosition: number;
};

export function insertMarkdownNewLine(
  value: string,
  selectionStart: number,
  selectionEnd = selectionStart,
): MarkdownNewLineInsertion {
  const currentLineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const currentLineEnd = value.indexOf("\n", selectionStart);
  const currentLine = value.slice(
    currentLineStart,
    currentLineEnd === -1 ? value.length : currentLineEnd,
  );
  const nextPrefix = markdownContinuationPrefix(currentLine);
  const nextValue =
    value.slice(0, selectionStart) +
    "\n" +
    nextPrefix +
    value.slice(selectionEnd);

  return {
    value: nextValue,
    cursorPosition: selectionStart + 1 + nextPrefix.length,
  };
}

export function markdownContinuationPrefix(line: string) {
  return (
    checkboxContinuationPrefix(line) ??
    bulletContinuationPrefix(line) ??
    orderedListContinuationPrefix(line) ??
    indentationPrefix(line)
  );
}

function checkboxContinuationPrefix(line: string) {
  const match = line.match(/^(\s*)([-*+])\s+\[[ xX]\]\s+(.*)$/);

  if (!match) {
    return null;
  }

  const [, indentation, marker, content] = match;

  return content.trim() ? `${indentation}${marker} [ ] ` : indentation;
}

function bulletContinuationPrefix(line: string) {
  const match = line.match(/^(\s*)([-*+])\s+(.*)$/);

  if (!match) {
    return null;
  }

  const [, indentation, marker, content] = match;

  return content.trim() ? `${indentation}${marker} ` : indentation;
}

function orderedListContinuationPrefix(line: string) {
  const match = line.match(/^(\s*)(\d+)([.)])\s+(.*)$/);

  if (!match) {
    return null;
  }

  const [, indentation, number, delimiter, content] = match;

  return content.trim()
    ? `${indentation}${Number(number) + 1}${delimiter} `
    : indentation;
}

function indentationPrefix(line: string) {
  return line.match(/^\s*/)?.[0] ?? "";
}
