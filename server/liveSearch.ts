import { normalizeLearningQuery } from "../shared/learningQuery";

type SearchProvider = "invidious" | "piped";

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
  "https://pipedapi.kavin.rocks",
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

async function fetchJson(url: string) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 6_000);
  try {
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: { Accept: "application/json", "User-Agent": "LessonLedger/1.0 (+educational-video-catalog)" },
    });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchEducationalVideos(query: string): Promise<LiveSearchResponse> {
  const normalizedQuery = normalizeLearningQuery(query) || query.trim();
  if (!normalizedQuery) return { status: "empty", source: null, results: [] };
  const encodedQuery = encodeURIComponent(normalizedQuery);
  const [invidiousPayloads, pipedPayloads] = await Promise.all([
    Promise.all(INVIDIOUS_INSTANCES.map(instance => fetchJson(`${instance}/api/v1/search?q=${encodedQuery}&type=video&region=US`))),
    Promise.all(PIPED_INSTANCES.map(instance => fetchJson(`${instance}/search?q=${encodedQuery}&region=US&filter=videos`))),
  ]);

  const invidiousResults = invidiousPayloads.flatMap(mapInvidiousResults);
  if (invidiousResults.length > 0) return { status: "ok", source: "invidious", results: invidiousResults.slice(0, 8) };

  const pipedResults = pipedPayloads.flatMap(mapPipedResults);
  if (pipedResults.length > 0) return { status: "ok", source: "piped", results: pipedResults.slice(0, 8) };

  const providerResponded = [...invidiousPayloads, ...pipedPayloads].some(payload => payload !== undefined);

  if (providerResponded) {
    return {
      status: "empty",
      source: null,
      results: [],
      message: "No public videos matched that search. Try a more specific topic or phrase.",
    };
  }

  return {
    status: "unavailable",
    source: null,
    results: [],
    message: "The expanded search providers are unavailable right now. Your local learning shelf is still ready.",
  };
}
