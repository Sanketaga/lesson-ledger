import { normalizeLearningQuery } from "../shared/learningQuery";

type SearchProvider = "invidious" | "piped" | "youtube";

type LearningIntent = {
  topic: string;
  searchQuery: string;
  enforceEducationalFocus: boolean;
};

const LANGUAGE_TOPICS: Record<string, string> = {
  hindi: "Hindi",
  spanish: "Spanish",
  french: "French",
  german: "German",
  japanese: "Japanese",
  korean: "Korean",
  arabic: "Arabic",
  english: "English",
};

const EXPLICIT_MEDIA_TERMS = /\b(?:news|khabar|headlines|music|song|songs|gana|movie|movies|film|films|bollywood|trailer)\b/i;
const NON_INSTRUCTIONAL_TERMS = /\b(?:news|khabar|headlines|breaking|live news|song|songs|gana|music video|romantic|love songs|bollywood|movie|full movie|film|trailer|episode|serial|remix|playlist|reaction)\b/i;
const NON_COURSE_ADVICE_TERMS = /\b(?:how (?:i|we) would learn(?: to)? .*|how (?:to|you) (?:should |can )?learn .*?(?:faster|fast)|tips(?: for learning)?|review|my journey|my experience|why i (?:learned|moved))\b/i;
const LANGUAGE_LEARNING_DETOUR_TERMS = /\b(?:english speaking|english vocabulary|learn .* in english|how to .* in english|in english.* vocabulary)\b/i;
const COMPLETE_COURSE_TERMS = /\b(?:full course|all (?:the )?basics|\b(?:learn|learned)\b.*?\bin\s+\d+\s+(?:minutes?|hours?)|\d+\s+beginner lessons)\b/i;
const INSTRUCTIONAL_TERMS = /\b(?:learn|learning|lesson|lessons|tutorial|course|beginner|beginners|basics|basic|introduction|intro|overview|what is|from scratch|fundamentals|concepts|how to|walkthrough|guide|recipe|project|exercise|setup|installation|alphabet|script|letters|pronunciation|vocabulary|words|phrases|grammar|verbs|sentence|conversation|speaking|writing|practice|explained)\b/i;
const FOUNDATION_STAGE = /\b(?:what is|overview|introduction|intro|fundamentals|foundations?|alphabet|script|letters|pronunciation|sounds)\b/i;
const BEGINNER_STAGE = /\b(?:beginner(?:s)?|basics|basic|first lesson|lesson\s*(?:1|one)|from scratch|getting started|setup|installation)\b/i;
const CORE_CONCEPT_STAGE = /\b(?:vocabulary|words|phrases|syntax|concepts?|principles?|theory|tools?|methods?)\b/i;
const STRUCTURED_SKILL_STAGE = /\b(?:grammar|verbs|sentence|reading|writing|examples?|techniques?|skills?)\b/i;
const APPLIED_STAGE = /\b(?:tutorials?|walkthroughs?|recipes?|projects?|build|exercise|practice|conversation|speaking|fluency|examples?|techniques?)\b/i;

/** Converts a broad topic into a provider query that expresses the learner's educational goal. */
export function buildLearningIntent(query: string): LearningIntent {
  const topic = normalizeLearningQuery(query) || query.trim().toLowerCase();
  const isExplicitMediaRequest = EXPLICIT_MEDIA_TERMS.test(query);
  const language = LANGUAGE_TOPICS[topic];
  if (isExplicitMediaRequest) return { topic, searchQuery: topic, enforceEducationalFocus: false };
  return {
    topic,
    searchQuery: language ? `learn ${language} language for beginners` : `learn ${topic} for beginners`,
    enforceEducationalFocus: true,
  };
}

export type LiveSearchResult = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  note: string;
  provider: SearchProvider;
  learningStage?: string;
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

function curriculumStage(result: LiveSearchResult) {
  const text = `${result.title} ${result.note}`;
  if (FOUNDATION_STAGE.test(text)) return 0;
  if (CORE_CONCEPT_STAGE.test(text)) return 2;
  if (STRUCTURED_SKILL_STAGE.test(text)) return 3;
  if (APPLIED_STAGE.test(text)) return 4;
  if (BEGINNER_STAGE.test(text)) return 1;
  return 5;
}

const CURRICULUM_STAGE_LABELS = [
  "Foundations",
  "Getting started",
  "Core concepts",
  "Structured skills",
  "Applied practice",
  "Further practice",
];

function canonicalTeachingFingerprint(title: string) {
  const ignoredWords = new Set(["learn", "language", "for", "the", "all", "basics", "basic", "beginner", "beginners", "course", "full", "tutorial", "you", "need", "every", "in", "minute", "minutes", "hour", "hours"]);
  return Array.from(new Set(title.toLowerCase().replace(/\d+/g, " ").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(word => word.length > 1 && !ignoredWords.has(word)))).sort().join(" ");
}

function educationalScore(result: LiveSearchResult, intent: LearningIntent) {
  const text = `${result.title} ${result.note} ${result.channel}`.toLowerCase();
  const topicTokens = intent.topic.split(/\s+/).filter(token => token.length > 1);
  const topicMatches = topicTokens.filter(token => text.includes(token)).length;
  const instructionMatches = (text.match(/\b(?:learn|lesson|tutorial|course|beginner|basics|alphabet|pronunciation|vocabulary|grammar|conversation|speaking|writing|practice|explained|guide)\b/g) ?? []).length;
  return topicMatches * 8 + instructionMatches * 3 - curriculumStage(result);
}

function lessonDurationSeconds(duration: string) {
  const clockParts = duration.split(":").map(part => Number(part));
  if (clockParts.length === 2 && clockParts.every(Number.isFinite)) return clockParts[0] * 60 + clockParts[1];
  if (clockParts.length === 3 && clockParts.every(Number.isFinite)) return clockParts[0] * 3600 + clockParts[1] * 60 + clockParts[2];
  const hours = duration.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/i);
  const minutes = duration.match(/(\d+)\s*(?:min|minute)/i);
  if (hours || minutes) return Math.round(Number(hours?.[1] || 0) * 3600 + Number(minutes?.[1] || 0) * 60);
  return null;
}

function isSubstantiveLesson(result: LiveSearchResult) {
  const seconds = lessonDurationSeconds(result.duration);
  return seconds === null || seconds >= 180;
}

function isLanguageLearningDetour(result: LiveSearchResult, intent: LearningIntent) {
  if (LANGUAGE_TOPICS[intent.topic]) return false;
  return LANGUAGE_LEARNING_DETOUR_TERMS.test(`${result.title} ${result.note} ${result.channel}`);
}

/** Filters generic-provider results to teaching material and orders remaining lessons from foundations to practice. */
export function curateLearningResults(results: LiveSearchResult[], intent: LearningIntent) {
  const uniqueResults = results.filter((result, index) => results.findIndex(candidate => candidate.videoId === result.videoId) === index);
  const focusedResults = intent.enforceEducationalFocus
    ? uniqueResults.filter(result => {
      const text = `${result.title} ${result.note} ${result.channel}`;
      return isSubstantiveLesson(result) && INSTRUCTIONAL_TERMS.test(text) && !NON_INSTRUCTIONAL_TERMS.test(text) && !NON_COURSE_ADVICE_TERMS.test(text) && !isLanguageLearningDetour(result, intent);
    })
    : uniqueResults;

  const rankedResults = focusedResults
    .map((result, providerIndex) => ({ result, providerIndex, stage: curriculumStage(result), score: educationalScore(result, intent) }))
    .sort((left, right) => left.stage - right.stage || right.score - left.score || left.providerIndex - right.providerIndex);
  const seenTeachingFingerprints = new Set<string>();
  let completeCourseSeen = false;

  return rankedResults
    .filter(item => {
      const fingerprint = canonicalTeachingFingerprint(item.result.title);
      if (!fingerprint || seenTeachingFingerprints.has(fingerprint)) return false;
      const isCompleteCourse = COMPLETE_COURSE_TERMS.test(item.result.title);
      if (isCompleteCourse && completeCourseSeen) return false;
      seenTeachingFingerprints.add(fingerprint);
      if (isCompleteCourse) completeCourseSeen = true;
      return true;
    })
    .map(item => ({ ...item.result, learningStage: CURRICULUM_STAGE_LABELS[item.stage] ?? "Further practice" }))
    .slice(0, 8);
}

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
    .filter((item: unknown) => stringValue((item as any).type) === "stream")
    .map((item: unknown) => ({
      videoId: videoIdFromPipedUrl(stringValue((item as any).url)),
      title: stringValue((item as any).title),
      channel: stringValue((item as any).uploaderName),
      thumbnail: stringValue((item as any).thumbnail),
      duration: stringValue((item as any).duration) || "On demand",
      note: stringValue((item as any).shortDescription).replace(/\s+/g, " ").trim().slice(0, 180) || "Live result discovered through the optional provider.",
      provider: "piped" as const,
    }))
    .filter((item: LiveSearchResult) => item.videoId && item.title)
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

/** Builds topic-agnostic discovery prompts that seek the main stages of a learnable path. */
export function buildCurriculumSearchQueries(intent: LearningIntent) {
  const language = LANGUAGE_TOPICS[intent.topic];
  const subject = language ? `${language} language` : intent.topic;
  return [
    `learn ${subject} introduction fundamentals`,
    `learn ${subject} basics for beginners`,
    `${subject} core concepts tutorial`,
    `${subject} practice project examples`,
  ];
}

async function searchYouTubeCurriculum(intent: LearningIntent) {
  return Promise.all(buildCurriculumSearchQueries(intent).map(query => searchYouTube(encodeURIComponent(query))));
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
      const id = isRecord(item.id) ? item.id : {};
      const videoId = stringValue(id.videoId);
      const snippet = isRecord(item.snippet) ? item.snippet : {};
      const thumbnails = isRecord(snippet.thumbnails) ? snippet.thumbnails : {};
      const thumb = [thumbnails.high, thumbnails.medium, thumbnails.default].find(isRecord);
      return {
        videoId,
        title: stringValue(snippet.title),
        channel: stringValue(snippet.channelTitle) || "YouTube creator",
        thumbnail: thumb ? stringValue(thumb.url) : "",
        duration: videoId && durationsMap[videoId] ? durationsMap[videoId] : "On demand",
        note: stringValue(snippet.description).replace(/\s+/g, " ").trim().slice(0, 180) || "Public YouTube result discovered via Data API.",
        provider: "youtube" as const,
      };
    })
    .filter(r => r.videoId && r.title)
    .slice(0, 8);

  return { provider: "youtube", responded: true, results, endpoint: searchUrl, tookMs };
}

export async function searchEducationalVideos(query: string): Promise<LiveSearchResponse> {
  const intent = buildLearningIntent(query);
  if (!intent.topic) return { status: "empty", source: null, results: [] };
  const encodedQuery = encodeURIComponent(intent.searchQuery);

  console.info("liveSearch: query=", intent.searchQuery);

  const debugAttempts: { provider: SearchProvider; endpoint?: string; responded: boolean; resultCount: number; error?: string; tookMs?: number }[] = [];
  const curriculumAttempts = await searchYouTubeCurriculum(intent);
  const curriculumResults = curriculumAttempts.reduce<LiveSearchResult[]>((all, attempt) => all.concat(attempt.results), []);
  const curatedCurriculum = curateLearningResults(curriculumResults, intent);

  curriculumAttempts.forEach(attempt => {
    const curatedCount = curateLearningResults(attempt.results, intent).length;
    debugAttempts.push({ provider: attempt.provider, endpoint: attempt.endpoint, responded: attempt.responded, resultCount: curatedCount, error: attempt.error, tookMs: attempt.tookMs });
  });

  if (curatedCurriculum.length >= 3) {
    return { status: "ok", source: "youtube", results: curatedCurriculum, debug: { attempts: debugAttempts } };
  }

  const attempts: Promise<ProviderAttempt & { endpoint?: string; tookMs?: number; error?: string }>[] = [];

  // Prefer Data API when present
  if (process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY) {
    attempts.push(searchYouTubeDataApi(encodedQuery));
  }

  // Fall back to the broad provider query when stage-specific direct discovery did not form a viable path.
  attempts.push(...PIPED_INSTANCES.map(instance => searchProvider("piped", instance, encodedQuery)));
  attempts.push(...INVIDIOUS_INSTANCES.map(instance => searchProvider("invidious", instance, encodedQuery)));

  return await new Promise<LiveSearchResponse>(resolve => {
    let completed = 0;
    let providerResponded = false;
    let settled = false;
    attempts.forEach(async attemptPromise => {
      try {
        const result = await attemptPromise;
        completed += 1;
        providerResponded = providerResponded || result.responded;
        const curatedResults = curateLearningResults([...curatedCurriculum, ...result.results], intent);
        debugAttempts.push({ provider: result.provider, endpoint: (result as any).endpoint, responded: result.responded, resultCount: curatedResults.length, error: (result as any).error, tookMs: (result as any).tookMs });
        if (!settled && result.results.length > 0 && curatedResults.length > 0) {
          settled = true;
          resolve({ status: "ok", source: result.provider, results: curatedResults, debug: { attempts: debugAttempts } });
          return;
        }
      } catch (err: any) {
        // record the unexpected error for debugging and continue
        completed += 1;
        debugAttempts.push({ provider: (err && err.provider) || "youtube", responded: false, resultCount: 0, error: String(err) });
      }

      if (!settled && completed === attempts.length) {
        const response: LiveSearchResponse = curatedCurriculum.length > 0
          ? { status: "ok", source: "youtube", results: curatedCurriculum, debug: { attempts: debugAttempts } }
          : providerResponded
          ? { status: "empty", source: null, results: [], message: "No teaching-quality videos matched that topic. Try a more specific learning goal.", debug: { attempts: debugAttempts } }
          : { status: "unavailable", source: null, results: [], message: "Live video search is temporarily unavailable. Retry in a moment.", debug: { attempts: debugAttempts } };
        resolve(response);
      }
    });
  });
}
