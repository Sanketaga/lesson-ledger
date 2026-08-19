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
  // debug is only present when diagnosing issues; optional so clients are unaffected.
  debug?: {
    attempts: {
      provider: SearchProvider;
      endpoint?: string;
      responded: boolean;
      resultCount: number;
      error?: string;
      tookMs?: number;
    }[];
  };
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
  return largest ? stringValue((largest as any).url) : "";
}

export function mapInvidiousResults(payload: unknown): LiveSearchResult[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(isRecord)
    .filter(item => stringValue((item as any).type) === "video")
    .map(item => ({
      videoId: stringValue((item as any).videoId),
      title: stringValue((item as any).title),
      channel: stringValue((item as any).author),
      thumbnail: thumbnailFromInvidious((item as any).videoThumbnails),
      duration: formatDuration(typeof (item as any).lengthSeconds === "number" ? (item as any).lengthSeconds : 0),
      note: stringValue((item as any).description).replace(/\s+/g, " ").trim().slice(0, 180) || "Live result discovered through the optional provider.",
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
  if (!isRecord(payload) || !Array.isArray((payload as any).items)) return [];
  return (payload as any).items
    .filter(isRecord)
    .filter(item => stringValue((item as any).type) === "stream")
    .map(item => ({
      videoId: videoIdFromPipedUrl(stringValue((item as any).url)),
      title: stringValue((item as any).title),
      channel: stringValue((item as any).uploaderName),
      thumbnail: stringValue((item as any).thumbnail),
      duration: stringValue((item as any).duration) || "On demand",
      note: stringValue((item as any).shortDescription).replace(/\s+/g, " ").trim().slice(0, 180) || "Live result discovered through the optional provider.",
      provider: "piped" as const,
    }))
    .filter(item => item.videoId && item.title)
    .slice(0, 8);
}

function textFromYouTubeNode(value: unknown) {
  if (!isRecord(value)) return "";
  const simpleText = stringValue((value as any).simpleText);
  if (simpleText) return simpleText;
  if (!Array.isArray((value as any).runs)) return "";
  return ((value as any).runs as unknown[]).filter(isRecord).map(run => stringValue((run as any).text)).join("").trim();
}

function findYouTubeVideoRenderers(value: unknown, found: Record<string, unknown>[] = []) {
  if (Array.isArray(value)) {
    value.forEach(item => findYouTubeVideoRenderers(item, found));
    return found;
  }
  if (!isRecord(value)) return found;
  if (isRecord((value as any).videoRenderer)) found.push((value as any).videoRenderer);
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
        videoId: stringValue((renderer as any).videoId),
        title: textFromYouTubeNode((renderer as any).title),
        channel: textFromYouTubeNode((renderer as any).ownerText) || textFromYouTubeNode((renderer as any).longBylineText) || "YouTube creator",
        thumbnail: isRecord((renderer as any).thumbnail) && Array.isArray((renderer as any).thumbnail.thumbnails)
          ? stringValue([...(renderer as any).thumbnail.thumbnails].reverse().find(isRecord)?.url)
          : "",
        duration: textFromYouTubeNode((renderer as any).lengthText) || "On demand",
        note: "Live result discovered through YouTube search.",
        provider: "youtube" as const,
      }))
      .filter(item => item.videoId && item.title)
      .filter((item, index, items) => items.findIndex(candidate => candidate.videoId === item.videoId) === index)
      .slice(0, 8);
  } catch (err) {
    // keep quiet on parse errors
    return [];
  }
}

type ProviderAttempt = {
  provider: SearchProvider;
  responded: boolean;
  results: LiveSearchResult[];
};

const JSON_TIMEOUT = 6_000;
const TEXT_TIMEOUT = 10_000;

async function ensureFetchAvailable() {
  if (typeof globalThis.fetch !== "undefined") return;
  try {
    // try undici first (bundled in newer runtimes), fall back to node-fetch
    const undici = await import("undici");
    // @ts-ignore assign
    globalThis.fetch = undici.fetch;
    // @ts-ignore assign
    globalThis.AbortController = undici.AbortController;
    console.info("liveSearch: polyfilled fetch with undici");
  } catch (e) {
    try {
      const nodeFetch = await import("node-fetch");
      // @ts-ignore assign
      globalThis.fetch = nodeFetch.default || nodeFetch;
      // @ts-ignore assign
      globalThis.AbortController = (await import("abort-controller")).AbortController;
      console.info("liveSearch: polyfilled fetch with node-fetch");
    } catch (err) {
      console.warn("liveSearch: could not polyfill fetch — server environment may not support fetch or polyfills");
    }
  }
}

async function fetchJson(url: string): Promise<{ responded: boolean; payload: unknown }> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), JSON_TIMEOUT);
  try {
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: { Accept: "application/json", "User-Agent": "LessonLedger/1.0 (+educational-video-catalog)" },
    });
    if (!response.ok) return { responded: false, payload: undefined };
    return { responded: true, payload: await response.json() };
  } catch (err) {
    return { responded: false, payload: undefined };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string): Promise<{ responded: boolean; body: string }> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), TEXT_TIMEOUT);
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
  } catch (err) {
    return { responded: false, body: "" };
  } finally {
    clearTimeout(timeout);
  }
}

async function searchProvider(
  provider: SearchProvider,
  instance: string,
  encodedQuery: string,
): Promise<ProviderAttempt & { endpoint?: string; tookMs?: number; error?: string }> {
  const endpoint = provider === "invidious"
    ? `${instance}/api/v1/search?q=${encodedQuery}&type=video&region=US`
    : `${instance}/search?q=${encodedQuery}&region=US&filter=videos`;
  const start = Date.now();
  try {
    const response = await fetchJson(endpoint);
    const tookMs = Date.now() - start;
    return {
      provider,
      endpoint,
      responded: response.responded,
      results: provider === "invidious" ? mapInvidiousResults(response.payload) : mapPipedResults(response.payload),
      tookMs,
    };
  } catch (err: any) {
    return { provider, endpoint, responded: false, results: [], tookMs: Date.now() - start, error: String(err) };
  }
}

async function searchYouTube(encodedQuery: string): Promise<ProviderAttempt & { endpoint?: string; tookMs?: number; error?: string }> {
  const endpoint = `https://www.youtube.com/results?search_query=${encodedQuery}`;
  const start = Date.now();
  try {
    const response = await fetchText(endpoint);
    const tookMs = Date.now() - start;
    return { provider: "youtube", endpoint, responded: response.responded, results: mapYouTubeSearchHtml(response.body), tookMs };
  } catch (err: any) {
    return { provider: "youtube", endpoint, responded: false, results: [], tookMs: Date.now() - start, error: String(err) };
  }
}

function parseISODurationToSeconds(duration = "") {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

async function searchYouTubeDataApi(encodedQuery: string): Promise<ProviderAttempt & { endpoint?: string; tookMs?: number; error?: string }> {
  const key = process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY || "";
  if (!key) return { provider: "youtube", responded: false, results: [], endpoint: undefined };

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodedQuery}&key=${key}`;
  const start = Date.now();
  const searchResp = await fetchJson(searchUrl);
  const tookMs = Date.now() - start;
  if (!searchResp.responded || !isRecord(searchResp.payload) || !Array.isArray((searchResp.payload as any).items)) {
    return { provider: "youtube", responded: false, results: [], endpoint: searchUrl, tookMs };
  }

  const items = (searchResp.payload as any).items as any[];
  const ids = items.map(i => i.id?.videoId).filter(Boolean);
  let durationsMap: Record<string, string> = {};
  if (ids.length > 0) {
    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids.join(",")}&key=${key}`;
    const videosResp = await fetchJson(videosUrl);
    if (videosResp.responded && isRecord(videosResp.payload) && Array.isArray((videosResp.payload as any).items)) {
      ((videosResp.payload as any).items as any[]).forEach(item => {
        const id = item.id;
        const dur = item.contentDetails?.duration;
        durationsMap[id] = dur ? formatDuration(parseISODurationToSeconds(dur)) : "On demand";
      });
    }
  }

  const results: LiveSearchResult[] = items
    .filter(isRecord)
    .map(item => {
      const videoId = item.id?.videoId || "";
      const snippet = item.snippet || {};
      const thumb = (snippet.thumbnails && (snippet.thumbnails.high || snippet.thumbnails.medium || snippet.thumbnails.default)) || null;
      return {
        videoId: String(videoId),
        title: String(snippet.title || ""),
        channel: String(snippet.channelTitle || "YouTube creator"),
        thumbnail: thumb ? String(thumb.url) : "",
        duration: videoId && durationsMap[videoId] ? durationsMap[videoId] : "On demand",
        note: String(snippet.description || "").replace(/\s+/g, " ").trim().slice(0, 180) || "Public YouTube result discovered via Data API.",
        provider: "youtube" as const,
      };
    })
    .filter(r => r.videoId && r.title)
    .slice(0, 8);

  return { provider: "youtube", responded: true, results, endpoint: searchUrl, tookMs };
}

export async function searchEducationalVideos(query: string): Promise<LiveSearchResponse> {
  await ensureFetchAvailable();
  const normalizedQuery = normalizeLearningQuery(query) || query.trim();
  if (!normalizedQuery) return { status: "empty", source: null, results: [] };
  const encodedQuery = encodeURIComponent(normalizedQuery);

  console.info("liveSearch: query=", normalizedQuery);

  const attempts: Promise<ProviderAttempt & { endpoint?: string; tookMs?: number; error?: string }>[] = [];

  // Prefer Data API when present
  if (process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY) {
    attempts.push(searchYouTubeDataApi(encodedQuery));
  }

  // Try YouTube HTML scraping early — it's often the fastest to return usable results
  attempts.push(searchYouTube(encodedQuery));

  // Then try public relays
  attempts.push(...PIPED_INSTANCES.map(instance => searchProvider("piped", instance, encodedQuery)));
  attempts.push(...INVIDIOUS_INSTANCES.map(instance => searchProvider("invidious", instance, encodedQuery)));

  const debugAttempts: { provider: SearchProvider; endpoint?: string; responded: boolean; resultCount: number; error?: string; tookMs?: number }[] = [];

  return await new Promise<LiveSearchResponse>(resolve => {
    let completed = 0;
    let providerResponded = false;
    let settled = false;
    attempts.forEach(async attemptPromise => {
      try {
        const result = await attemptPromise;
        completed += 1;
        providerResponded = providerResponded || result.responded;
        debugAttempts.push({ provider: result.provider, endpoint: (result as any).endpoint, responded: result.responded, resultCount: result.results.length, error: (result as any).error, tookMs: (result as any).tookMs });
        if (!settled && result.results.length > 0) {
          settled = true;
          resolve({ status: "ok", source: result.provider, results: result.results.slice(0, 8), debug: { attempts: debugAttempts } });
          return;
        }
      } catch (err: any) {
        // record the unexpected error for debugging and continue
        completed += 1;
        debugAttempts.push({ provider: (err && err.provider) || "youtube", responded: false, resultCount: 0, error: String(err) });
      }

      if (!settled && completed === attempts.length) {
        const response = providerResponded
          ? { status: "empty", source: null, results: [], message: "No public videos matched that topic. Try another phrase.", debug: { attempts: debugAttempts } }
          : { status: "unavailable", source: null, results: [], message: "Live video search is temporarily unavailable. Retry in a moment.", debug: { attempts: debugAttempts } };
        resolve(response);
      }
    });
  });
}
