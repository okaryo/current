<script lang="ts">
  type Props = {
    value: string;
    label?: string;
  };

  let { value, label = value }: Props = $props();

  const symbolValues = new Set(["⌘", "⇧", "⌥", "⌃"]);
  const isSymbolOnly = $derived(symbolValues.has(value));
  const hasSymbol = $derived(
    [...symbolValues].some((symbol) => value.includes(symbol)),
  );
</script>

<kbd
  class:symbol-only={isSymbolOnly}
  class:has-symbol={hasSymbol}
  aria-label={label}
>
  {value}
</kbd>

<style>
  kbd {
    display: inline-flex;
    min-width: 1.65rem;
    height: 1.35rem;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 5px;
    padding: 0 0.38rem;
    color: #d2d8e2;
    background: rgba(255, 255, 255, 0.07);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.34);
    font-size: 0.76rem;
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    font-weight: 550;
    letter-spacing: 0;
    line-height: 1;
  }

  .has-symbol {
    min-width: 1.85rem;
    color: #e1e6ee;
    font-size: 0.88rem;
    font-weight: 650;
  }

  .symbol-only {
    min-width: 1.45rem;
    font-size: 0.92rem;
  }
</style>
