import { untrack } from "svelte";

type EffectCleanup = () => void;

/**
 * Runs an effect with explicit dependencies.
 *
 * Svelte tracks values read synchronously inside `$effect`, but bare reads like
 * `value;` are flagged by ESLint. This helper keeps dependency reads explicit
 * while preventing state reads inside `effect` from becoming implicit deps.
 */
export function effectWithDeps(
  effect: () => void | EffectCleanup,
  deps: () => unknown,
) {
  $effect(() => {
    deps();
    return untrack(effect);
  });
}
