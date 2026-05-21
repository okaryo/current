export function disableTextInputAssistance(
  node: HTMLInputElement | HTMLTextAreaElement,
) {
  node.autocapitalize = "off";
  node.spellcheck = false;
  node.setAttribute("autocorrect", "off");
}
