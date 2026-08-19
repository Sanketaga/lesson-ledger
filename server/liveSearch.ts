import { normalizeLearningQuery } from "../shared/learningQuery";

type SearchProvider = "invidious" | "piped" | "youtube";

export type LiveSearchResult = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  note: string;
  provider: SearchProvider;
};

export type LiveSearchResponse = {
  status: "ok" | "empty" | "unavailable";
  source: SearchProvider | null;
  results: LiveSearchResult[];
  message?: string;
};

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.f5.si",
  "https://yt.chocolatemoo53.com",
];

const PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.orangenet.cc",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.reallyaweso.me",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "On demand";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function thumbnailFromInvidious(value: unknown) {
  if (!Array.isArray(value)) return "";
  const largest = [...value].reverse().find(isRecord);
  return largest ? stringValue(largest.url) : "";
}

export function mapInvidiousResults(payload: unknown): LiveSearchResult[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(isRecord)
    .filter(item => stringValue(item.type) === "video")
    .map(item => ({
      videoId: stringValue(item.videoId),
      title: stringValue(item.title),
      channel: stringValue(item.author),
      thumbnail: thumbnailFromInvidious(item.videoThumbnails),
      duration: formatDuration(typeof item.lengthSeconds === "number" ? item.lengthSeconds : 0),
      note: stringValue(item.description).replace(/\s+/g, " ").trim().slice(0, 180) || "Live result discovered through the optional provider.",
      provider: "invidious" as const,
    }))
    .filter(item => item.videoId && item.title)
    .slice(0, 8);
}

function videoIdFromPipedUrl(value: string) {
  const match = value.match(/[?&]v=([^&]+)/);
  return match?.[1] ?? "";
}

export function mapPipedResults(payload: unknown): LiveSearchResult[] {
  if (!isRecord(payload) || !Array.isArray(payload.items)) return [];
  return payload.items
    .filter(isRecord)
    .filter(item => stringValue(item.type) === "stream")
    .map(item => ({
      videoId: videoIdFromPipedUrl(stringValue(item.url)),
      title: stringValue(item.title),
      channel: stringValue(item.uploaderName),
      thumbnail: stringValue(item.thumbnail),
      duration: stringValue(item.duration) || "On demand",
      note: stringValue(item.shortDescription).replace(/\s+/g, " ").trim().slice(0, 180) || "Live result discovered through the optional provider.",
      provider: "piped" as const,
    }))
    .filter(item => item.videoId && item.title)
    .slice(0, 8);
}

function textFromYouTubeNode(value: unknown) {
  if (!isRecord(value)) return "";
  const simpleText = stringValue(value.simpleText);
  if (simpleText) return simpleText;
  if (!Array.isArray(value.runs)) return "";
  return value.runs.filter(isRecord).map(run => stringValue(run.text)).join("").trim();
}

function findYouTubeVideoRenderers(value: unknown, found: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) {
    value.forEach(item => findYouTubeVideoRenderers(item, found));
    return found;
  }
  if (!isRecord(value)) return found;
  if (isRecord(value.videoRenderer)) found.push(value.videoRenderer);
  Object.values(value).forEach(item => findYouTubeVideoRenderers(item, found));
  return found;
}

export function mapYouTubeSearchHtml(html: string): LiveSearchResult[] {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const end = html.indexOf(";</script>", start);
  if (end < 0) return [];
  try {
    const payload = JSON.parse(html.slice(start + marker.length, end));
    return findYouTubeVideoRenderers(payload)
      .map(renderer => ({
        videoId: stringValue(renderer.videoId),
        title: textFromYouTubeNode(renderer.title),
        channel: textFromYouTubeNode(renderer.ownerText) || textFromYouTubeNode(renderer.longBylineText) || "YouTube creator",
        thumbnail: isRecord(renderer.thumbnail) && Array.isArray(renderer.thumbnail.thumbnails)
          ? stringValue([...renderer.thumbnail.thumbnails].reverse().find(isRecord)?.url)
          : "",
        duration: textFromYouTubeNode(renderer.lengthText) || "On demand",
        note: "Live result discovered through YouTube search.",
        provider: "youtube" as const,
      }))
      .filter(item => item.videoId && item.title)
      .filter((item, index, items) => items.findIndex(candidate => candidate.videoId === item.videoId) === index)
      .slice(0, 8);
  } catch {
    return [];
  }
}

type ProviderAttempt = {
  provider: SearchProvider;
  responded: boolean;
  results: LiveSearchResult[];
};

async function fetchJson(url: string): Promise<{ responded: boolean; payload: unknown }> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 4_500);
  try {
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: { Accept: "application/json", "User-Agent": "LessonLedger/1.0 (+educational-video-catalog)" },
    });
    if (!response.ok) return { responded: false, payload: undefined };
    return { responded: true, payload: await response.json() };
  } catch {
    return { responded: false, payload: undefined };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string): Promise<{ responded: boolean; body: string }> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 8_000);
  try {
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (compatible; LessonLedger/1.0; +educational-video-catalog)",
      },
    });
    if (!response.ok) return { responded: false, body: "" };
    return { responded: true, body: await response.text() };
  } catch {
    return { responded: false, body: "" };
  } finally {
    clearTimeout(timeout);
  }
}

async function searchProvider(
  provider: SearchProvider,
  instance: string,
  encodedQuery: string,
): Promise<ProviderAttempt> {
  const endpoint = provider === "invidious"
    ? `${instance}/api/v1/search?q=${encodedQuery}&type=video&region=US`
    : `${instance}/search?q=${encodedQuery}&region=US&filter=videos`;
  const response = await fetchJson(endpoint);
  return {
    provider,
    responded: response.responded,
    results: provider === "invidious" ? mapInvidiousResults(response.payload) : mapPipedResults(response.payload),
  };
}

async function searchYouTube(encodedQuery: string): Promise<ProviderAttempt> {
  const response = await fetchText(`https://www.youtube.com/results?search_query=${encodedQuery}`);
  return { provider: "youtube", responded: response.responded, results: mapYouTubeSearchHtml(response.body) };
}

export async function searchEducationalVideos(query: string): Promise<LiveSearchResponse> {
  const normalizedQuery = normalizeLearningQuery(query) || query.trim();
  if (!normalizedQuery) return { status: "empty", source: null, results: [] };
  const encodedQuery = encodeURIComponent(normalizedQuery);
  const attempts = [
    ...PIPED_INSTANCES.map(instance => searchProvider("piped", instance, encodedQuery)),
    ...INVIDIOUS_INSTANCES.map(instance => searchProvider("invidious", instance, encodedQuery)),
    searchYouTube(encodedQuery),
  ];

  // Public relays change availability frequently. Return immediately when any
  // live YouTube-compatible provider produces videos instead of waiting for
  // slower or blocked relays to time out.
  return await new Promise<LiveSearchResponse>(resolve => {
    let completed = 0;
    let providerResponded = false;
    let settled = false;
    attempts.forEach(async attempt => {
      const result = await attempt;
      completed += 1;
      providerResponded = providerResponded || result.responded;
      if (!settled && result.results.length > 0) {
        settled = true;
        resolve({ status: "ok", source: result.provider, results: result.results.slice(0, 8) });
        return;
      }
      if (!settled && completed === attempts.length) {
        resolve(providerResponded
          ? { status: "empty", source: null, results: [], message: "No public YouTube videos matched that topic. Try another phrase." }
          : { status: "unavailable", source: null, results: [], message: "Live YouTube search is temporarily unavailable. Retry in a moment." });
      }
    });
  });
}
