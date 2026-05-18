import { browser } from "$app/environment";

type AudioOptions = {
  src: string;
  loop?: boolean;
  failureMessage: string;
  warn?: (message: string, error: unknown) => void;
};

type AudioSequenceOptions = {
  sources: string[];
  intervalMs?: number;
  failureMessage: string;
  warn?: (message: string, error: unknown) => void;
};

export type CurrentAudio = {
  play: () => void;
  stop: () => void;
  dispose: () => void;
};

export function createCurrentAudio({
  src,
  loop = false,
  failureMessage,
  warn = console.warn,
}: AudioOptions): CurrentAudio {
  let audio: HTMLAudioElement | undefined;

  function getAudio() {
    if (!browser) {
      return undefined;
    }

    if (!audio) {
      audio = new Audio(src);
      audio.loop = loop;
      audio.preload = "auto";
    }

    return audio;
  }

  return {
    play() {
      const element = getAudio();

      if (!element || (loop && !element.paused)) {
        return;
      }

      element.currentTime = 0;
      void element.play().catch((error: unknown) => {
        warn(failureMessage, error);
      });
    },
    stop() {
      if (!audio) {
        return;
      }

      audio.pause();
      audio.currentTime = 0;
    },
    dispose() {
      this.stop();
      audio = undefined;
    },
  };
}

export function createCurrentAudioSequence({
  sources,
  intervalMs = 1000,
  failureMessage,
  warn = console.warn,
}: AudioSequenceOptions): CurrentAudio {
  let audio: HTMLAudioElement | undefined;
  let audioInterval: ReturnType<typeof setInterval> | undefined;
  let currentIndex = 0;
  let playing = false;

  function getAudio() {
    if (!browser) {
      return undefined;
    }

    if (!audio && sources[0]) {
      audio = new Audio(sources[0]);
      audio.preload = "auto";
    }

    return audio;
  }

  function playCurrent() {
    const element = getAudio();

    if (!element) {
      return;
    }

    element.pause();
    element.src = sources[currentIndex];
    element.currentTime = 0;
    void element.play().catch((error: unknown) => {
      stopPlayback();
      warn(failureMessage, error);
    });
  }

  function playNext() {
    if (!playing || sources.length === 0) {
      return;
    }

    currentIndex = (currentIndex + 1) % sources.length;
    playCurrent();
  }

  function stopPlayback() {
    playing = false;

    if (audioInterval) {
      clearInterval(audioInterval);
      audioInterval = undefined;
    }

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  return {
    play() {
      if (playing) {
        return;
      }

      playing = true;
      currentIndex = 0;
      playCurrent();
      audioInterval = setInterval(playNext, intervalMs);
    },
    stop() {
      stopPlayback();
    },
    dispose() {
      this.stop();

      audio = undefined;
    },
  };
}
