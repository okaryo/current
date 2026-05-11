<script lang="ts">
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";

  type Props = {
    active: boolean;
    title: string;
    shortcut: string;
    onActivate: () => void;
  };

  let { active, title, shortcut, onActivate }: Props = $props();
</script>

<section
  class="panel pomodoro"
  class:panel-active={active}
  aria-label="Pomodoro"
>
  <header class="panel-header">
    <div class="title-row">
      <p class="section-label section-label-focus">{title}</p>
      <KeyboardKey value={shortcut} label="Command 1" />
    </div>
  </header>

  <div class="timer-layout">
    <div class="timer-ring" aria-label="25 minutes remaining">
      <span class="time">25:00</span>
      <span class="mode">Focus</span>
    </div>

    <div class="timer-details">
      <p class="session">Today's sessions <strong>2 / 4</strong></p>
      <div class="timer-actions" aria-label="Pomodoro controls">
        <button
          class="primary-button"
          type="button"
          onfocus={onActivate}
          onclick={onActivate}
        >
          Start
        </button>
        <button type="button" onfocus={onActivate} onclick={onActivate}>
          Pause
        </button>
        <button type="button" onfocus={onActivate} onclick={onActivate}>
          Reset
        </button>
      </div>
    </div>

    <dl class="shortcut-list" aria-label="Pomodoro shortcuts">
      <div>
        <dt><KeyboardKey value="⌘P" label="Command P" /></dt>
        <dd>Start / Pause</dd>
      </div>
      <div>
        <dt><KeyboardKey value="⌘R" label="Command R" /></dt>
        <dd>Reset</dd>
      </div>
      <div>
        <dt><KeyboardKey value="⌘L" label="Command L" /></dt>
        <dd>Log completed session</dd>
      </div>
    </dl>
  </div>
</section>

<style>
  .panel {
    position: relative;
    min-width: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0.85rem;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04),
      rgba(255, 255, 255, 0.02)
    );
    opacity: 0.7;
    filter: saturate(0.82);
    transition:
      border-color 120ms ease,
      filter 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
  }

  .panel-active {
    border-color: rgba(255, 255, 255, 0.18);
    opacity: 1;
    filter: saturate(1);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.055),
      rgba(255, 255, 255, 0.026)
    );
  }

  .pomodoro.panel-active {
    border-color: #ff5965;
    box-shadow:
      0 0 0 1px rgba(255, 89, 101, 0.34),
      0 0 0 4px rgba(255, 89, 101, 0.08),
      0 0.8rem 2rem rgba(255, 89, 101, 0.1);
  }

  button {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #e8ecf2;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.11),
      rgba(255, 255, 255, 0.05)
    );
    cursor: pointer;
    font: inherit;
  }

  button:focus-visible {
    outline: 1px solid rgba(68, 209, 107, 0.8);
    outline-offset: 2px;
  }

  .panel-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .section-label {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0;
  }

  .section-label-focus {
    color: #ff5965;
  }

  .timer-layout {
    display: grid;
    grid-template-columns: auto minmax(14rem, 1fr) minmax(13rem, auto);
    align-items: center;
    gap: 1.4rem;
    min-height: 7.4rem;
    padding: 0.65rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(9, 12, 16, 0.28);
  }

  .timer-ring {
    display: grid;
    place-items: center;
    align-content: center;
    width: clamp(6.4rem, 12vw, 7.6rem);
    aspect-ratio: 1;
    border: 0.3rem solid #f05260;
    border-radius: 999px;
    box-shadow:
      0 0 0 0.35rem rgba(240, 82, 96, 0.08),
      inset 0 0 2rem rgba(0, 0, 0, 0.22);
  }

  .time {
    font-size: clamp(1.8rem, 3.6vw, 2.25rem);
    font-weight: 650;
    line-height: 1;
  }

  .mode {
    margin-top: 0.25rem;
    color: #ff5965;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .session {
    margin: 0 0 0.75rem;
    color: #c7cdd6;
    font-size: 1rem;
  }

  .session strong {
    margin-left: 0.5rem;
    color: #ffffff;
  }

  .timer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .timer-actions button {
    min-width: 5.5rem;
    min-height: 2.45rem;
    padding: 0 0.85rem;
    font-weight: 650;
  }

  .timer-actions .primary-button {
    border-color: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    background: linear-gradient(180deg, #ff6670, #df3745);
  }

  .shortcut-list {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    color: #aeb5c1;
  }

  .shortcut-list div {
    display: grid;
    grid-template-columns: 3rem 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  .shortcut-list dt,
  .shortcut-list dd {
    margin: 0;
  }

  @media (max-width: 860px) {
    .timer-layout {
      grid-template-columns: 1fr;
      justify-items: start;
      gap: 1.25rem;
    }

    .shortcut-list {
      width: 100%;
    }
  }

  @media (max-width: 560px) {
    .panel {
      padding: 0.8rem;
    }

    .timer-actions {
      width: 100%;
    }

    .timer-actions button {
      flex: 1 1 8rem;
    }
  }
</style>
