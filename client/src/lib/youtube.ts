export type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
};

type YouTubePlayerEvent = {
  target: YouTubePlayer;
  data: number;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      host?: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: YouTubePlayerEvent) => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
        onError?: (event: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeNamespace> | null = null;

export function getYouTubeVideoId(embedUrl: string) {
  try {
    const parts = new URL(embedUrl).pathname.split("/");
    const embedIndex = parts.findIndex(part => part === "embed");
    return embedIndex >= 0 ? parts[embedIndex + 1] || null : null;
  } catch {
    return null;
  }
}

export function getYouTubeEmbedHost(embedUrl: string) {
  try {
    const host = new URL(embedUrl).host;
    return host === "www.youtube-nocookie.com" ? "https://www.youtube-nocookie.com" : undefined;
  } catch {
    return undefined;
  }
}

export function createManagedPlayerVars(origin: string) {
  return {
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    enablejsapi: 1,
    fs: 0,
    playsinline: 1,
    rel: 0,
    origin,
  };
}

export function describeYouTubePlayerError(code: number) {
  if (code === 2) return "This lesson has an invalid video identifier.";
  if (code === 5) return "This lesson could not be played in the embedded player.";
  if (code === 100) return "This lesson is no longer available on YouTube.";
  if (code === 101 || code === 150) return "This lesson does not allow embedded playback. Choose another lesson in the course.";
  return "The lesson could not start. Choose another lesson or try again shortly.";
}

export type ManagedPlaybackViewState = {
  isPlaying: boolean;
  allowNativeStart: boolean;
  status: string;
  confirmed: boolean;
  shouldRetryCuedPlayback: boolean;
};

export function getManagedPlaybackViewState(state: number, requestedPlayback: boolean): ManagedPlaybackViewState | null {
  if (state === 1) return { isPlaying: true, allowNativeStart: false, status: "Playing lesson.", confirmed: true, shouldRetryCuedPlayback: false };
  if (state === 2) return { isPlaying: false, allowNativeStart: false, status: "Lesson paused.", confirmed: false, shouldRetryCuedPlayback: false };
  if (state === 3) return { isPlaying: false, allowNativeStart: false, status: "Buffering lesson…", confirmed: false, shouldRetryCuedPlayback: false };
  if (state === 5) return requestedPlayback
    ? { isPlaying: false, allowNativeStart: false, status: "Starting lesson…", confirmed: false, shouldRetryCuedPlayback: true }
    : { isPlaying: false, allowNativeStart: false, status: "Lesson ready. Press Play when you are ready.", confirmed: false, shouldRetryCuedPlayback: false };
  if (state === 0) return { isPlaying: false, allowNativeStart: false, status: "Lesson finished. Mark it complete when you are ready to continue.", confirmed: false, shouldRetryCuedPlayback: false };
  if (state === -1 && !requestedPlayback) return { isPlaying: false, allowNativeStart: false, status: "Lesson ready. Press Play when you are ready.", confirmed: false, shouldRetryCuedPlayback: false };
  return null;
}

export function getFocusedPlayerGuard(allowNativeStart: boolean) {
  return {
    allowIframePointerEvents: allowNativeStart,
    showOwnedPlayOverlay: !allowNativeStart,
    preserveCourseControlGuard: true,
  };
}

export function formatPlayerElapsedTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function hasPlayerTimeAdvanced(previousSeconds: number, nextSeconds: number) {
  return Number.isFinite(nextSeconds) && nextSeconds > Math.max(0, previousSeconds) + 0.2;
}

export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("The YouTube player is only available in a browser."));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube player API loaded without a player constructor."));
    };

    const existingScript = document.getElementById("lesson-ledger-youtube-iframe-api");
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = "lesson-ledger-youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("The YouTube player API could not be loaded."));
    document.head.appendChild(script);
  });

  return apiPromise;
}
