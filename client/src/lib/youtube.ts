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
