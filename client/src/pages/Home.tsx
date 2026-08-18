/**
 * FOCUS-ROOM REFERENCE — Preserve the supplied reference's airy editorial workspace:
 * expansive white space, serif statements, a central learning command, and quiet geometry.
 * Lesson Ledger remains original: local catalog, oEmbed import, and a reserved provider slot.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  ExternalLink,
  Link2,
  Loader2,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  catalog,
  filterCatalog,
  type CatalogVideo,
  type Topic,
  topics,
} from "@/lib/catalog";
import { trpc } from "@/lib/trpc";

type ImportedVideo = CatalogVideo & {
  provider: "YouTube" | "Vimeo";
  isImported: true;
};

type LiveVideo = {
  id: string;
  title: string;
  channel: string;
  topic: Topic;
  level: string;
  duration: string;
  note: string;
  videoUrl: string;
  embedUrl: string;
  thumbnail: string;
  provider: "invidious" | "piped";
};

type VideoRecord = CatalogVideo | ImportedVideo | LiveVideo;

type OEmbedResult = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

function getYoutubeId(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace("www.", "").toLowerCase();
    const candidate =
      hostname === "youtu.be"
        ? url.pathname.slice(1)
        : url.searchParams.get("v") ||
            url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1];
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function getVimeoId(value: string) {
  try {
    const url = new URL(value);
    if (!url.hostname.replace("www.", "").toLowerCase().endsWith("vimeo.com")) return null;
    return url.pathname.match(/(?:video\/)?(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function oEmbedSource(value: string) {
  const youtubeId = getYoutubeId(value);
  if (youtubeId) {
    return {
      provider: "YouTube" as const,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`,
      endpoint: `https://www.youtube.com/oembed?url=${encodeURIComponent(value)}&format=json`,
      fallbackThumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }
  const vimeoId = getVimeoId(value);
  if (vimeoId) {
    return {
      provider: "Vimeo" as const,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      endpoint: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(value)}`,
      fallbackThumbnail: "",
    };
  }
  return null;
}

function VideoLesson({ video, onOpen, index }: { video: VideoRecord; onOpen: (video: VideoRecord) => void; index: number }) {
  const number = String(index + 1).padStart(2, "0");
  return (
    <article className="lesson-card group bg-white">
      <button
        type="button"
        onClick={() => onOpen(video)}
        className="grid w-full grid-cols-[96px_minmax(0,1fr)] gap-4 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#20211F] focus-visible:ring-inset sm:grid-cols-[118px_minmax(0,1fr)] sm:gap-5 sm:p-4"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#EFF0F2]">
          <img src={video.thumbnail} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.035]" />
          <span className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
          <span className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center bg-white text-[#1E1F1D] shadow-sm"><Play className="h-3 w-3 fill-current" /></span>
        </div>
        <div className="min-w-0 py-0.5">
          <div className="flex items-center justify-between gap-3 text-[10px] font-medium tracking-[0.06em] text-[#8A8D90]">
            <span>{number} · {video.topic}</span>
            <span className="flex shrink-0 items-center gap-1"><Clock3 className="h-3 w-3" /> {video.duration}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 font-display text-[1.35rem] leading-[1.02] tracking-[-0.02em] text-[#232421] transition-colors group-hover:text-[#53565A] sm:text-[1.55rem]">{video.title}</h3>
          <p className="mt-1.5 truncate text-xs text-[#74777A]">{video.channel} · {video.level}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#272927]">Open lesson <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
        </div>
      </button>
    </article>
  );
}

export default function Home() {
  const [activeTopic, setActiveTopic] = useState<Topic>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [heroTerm, setHeroTerm] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importedVideo, setImportedVideo] = useState<ImportedVideo | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoRecord | null>(null);

  const visibleCatalog = useMemo(
    () => filterCatalog(activeTopic, searchTerm),
    [activeTopic, searchTerm],
  );

  const normalizedSearch = searchTerm.trim();
  const shouldUseLiveSearch = normalizedSearch.length >= 2 && visibleCatalog.length === 0;
  const liveSearch = trpc.liveSearch.search.useQuery(
    { query: shouldUseLiveSearch ? normalizedSearch : "learning" },
    { enabled: shouldUseLiveSearch, staleTime: 60_000, retry: 0 },
  );
  const liveLessons = useMemo<LiveVideo[]>(() => (
    (liveSearch.data?.results ?? []).map(result => ({
      id: `live-${result.provider}-${result.videoId}`,
      title: result.title,
      channel: result.channel || "Public video",
      topic: "Technology" as Topic,
      level: "Live search",
      duration: result.duration,
      note: result.note,
      videoUrl: `https://www.youtube.com/watch?v=${result.videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${result.videoId}?rel=0`,
      thumbnail: result.thumbnail || `https://i.ytimg.com/vi/${result.videoId}/hqdefault.jpg`,
      provider: result.provider,
    }))
  ), [liveSearch.data]);

  const focusPick = catalog.find((video) => video.featured) ?? catalog[0];
  const showFocusPick = activeTopic === "All" && !searchTerm.trim();
  const lessonList = showFocusPick ? visibleCatalog.filter((video) => video.id !== focusPick.id) : visibleCatalog;
  const displayedLessons: VideoRecord[] = visibleCatalog.length > 0 ? lessonList : liveLessons;
  const hasDisplayedLessons = visibleCatalog.length > 0 || liveLessons.length > 0;

  const goToShelf = () => document.getElementById("learning-shelf")?.scrollIntoView({ behavior: "smooth" });

  const chooseTopic = (topic: Topic) => {
    setActiveTopic(topic);
    setSearchTerm("");
    goToShelf();
  };

  const handleHeroSearch = () => {
    const value = heroTerm.trim();
    if (!value) {
      goToShelf();
      return;
    }
    if (oEmbedSource(value)) {
      setImportUrl(value);
      setImportError("");
      setImportOpen(true);
      return;
    }
    setActiveTopic("All");
    setSearchTerm(value);
    goToShelf();
  };

  const importVideo = async () => {
    const source = oEmbedSource(importUrl.trim());
    if (!source) {
      setImportError("Use a public YouTube or Vimeo link. You can still search the local learning shelf below.");
      return;
    }
    setImportError("");
    setIsImporting(true);
    try {
      const response = await fetch(source.endpoint);
      if (!response.ok) throw new Error("No public oEmbed response");
      const metadata = (await response.json()) as OEmbedResult;
      const record: ImportedVideo = {
        id: `import-${Date.now()}`,
        title: metadata.title || "Imported learning video",
        channel: metadata.author_name || `${source.provider} video`,
        topic: "Technology",
        level: "Direct link",
        duration: "On demand",
        note: "Opened from a public link using provider metadata.",
        videoUrl: importUrl.trim(),
        embedUrl: source.embedUrl,
        thumbnail: metadata.thumbnail_url || source.fallbackThumbnail,
        provider: source.provider,
        isImported: true,
      };
      setImportedVideo(record);
      setActiveVideo(record);
      setImportUrl("");
      setImportOpen(false);
      toast.success("Your learning link is ready", { description: "We read public metadata directly from the provider." });
    } catch {
      setImportError("We could not read that provider’s metadata right now. Check that the URL is public and try once more.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#FBFBFA] text-[#20211F]">
      <header className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 text-left">
          <span className="flex h-8 w-8 items-center justify-center bg-[#20211F] font-display text-lg italic text-white">L</span>
          <span className="font-display text-[1.35rem] leading-none tracking-[-0.03em]">Lesson Ledger</span>
        </button>
        <nav className="flex items-center gap-4 sm:gap-6" aria-label="Main navigation">
          <button type="button" onClick={goToShelf} className="hidden text-sm text-[#60625F] transition hover:text-[#1F201E] sm:block">Library</button>
          <button type="button" onClick={() => setImportOpen(true)} className="hidden text-sm text-[#60625F] transition hover:text-[#1F201E] sm:block">Open a link</button>
          <Button type="button" onClick={goToShelf} className="h-9 bg-[#242523] px-3.5 text-xs font-semibold text-white hover:bg-[#4B4D49] active:scale-[0.97] sm:h-10 sm:px-4 sm:text-sm">
            Start learning <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </nav>
      </header>

      <main>
        <section className="relative isolate mx-auto flex min-h-[640px] max-w-[1440px] items-center justify-center px-5 pb-24 pt-12 sm:min-h-[690px] sm:px-8 lg:min-h-[740px] lg:px-12 lg:pb-32 lg:pt-14">
          <div className="hero-orb -left-8 top-10 h-24 w-24 bg-[#F0F3FB] sm:left-[5%] sm:h-32 sm:w-32" aria-hidden="true" />
          <div className="hero-orb right-[-54px] top-[21%] h-52 w-52 border border-[#DCE0EB] bg-transparent sm:right-[3%] sm:h-72 sm:w-72" aria-hidden="true" />
          <div className="hero-pillow bottom-[16%] right-[8%] hidden h-20 w-44 bg-[#E7EBF8] sm:block" aria-hidden="true" />
          <div className="dot-cluster bottom-[23%] right-[26%] hidden sm:block" aria-hidden="true" />
          <div className="hero-orb bottom-[14%] left-[9%] h-32 w-32 border border-[#ECEDEF] bg-transparent sm:h-44 sm:w-44" aria-hidden="true" />

          <div className="relative z-10 w-full max-w-4xl text-center">
            <p className="animate-in fade-in slide-in-from-bottom-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#81847F]">A calmer way to learn from video</p>
            <h1 className="mt-6 font-display text-[3.6rem] leading-[0.88] tracking-[-0.055em] text-[#292A28] sm:text-7xl lg:mt-8 lg:text-[6.6rem] xl:text-[7.5rem]">
              Make room to <em className="font-normal text-[#7B7F88]">understand.</em>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#6B6D6B] sm:text-lg sm:leading-8">Choose a useful explanation from a small, structured shelf—or bring a public video link into a quieter learning space.</p>

            <div className="mx-auto mt-9 max-w-2xl border border-[#DADBD9] bg-white p-1.5 shadow-[0_18px_38px_rgba(45,46,42,0.05)] sm:mt-10 sm:p-2">
              <div className="flex items-center">
                <Search className="ml-3 h-4 w-4 shrink-0 text-[#8B8D8A] sm:ml-4" />
                <input
                  value={heroTerm}
                  onChange={(event) => setHeroTerm(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleHeroSearch()}
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#2A2B29] outline-none placeholder:text-[#939591] sm:h-12 sm:px-4 sm:text-base"
                  placeholder="I want to learn about neural networks"
                  aria-label="Search the catalog or paste a video URL"
                />
                <Button type="button" onClick={handleHeroSearch} className="h-10 shrink-0 bg-[#252624] px-3.5 text-xs font-semibold text-white hover:bg-[#515350] active:scale-[0.97] sm:h-11 sm:px-5 sm:text-sm">
                  Search <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-[#8B8D8A]">Search the local shelf or paste a public YouTube / Vimeo URL.</p>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-24 sm:px-8 sm:pb-32 lg:px-12 lg:pb-40">
          <div className="border-t border-[#E4E5E2] pt-7 sm:pt-9">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#858783]">Why this stays focused</p>
            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-20">
              <h2 className="max-w-2xl font-display text-5xl leading-[0.92] tracking-[-0.05em] text-[#272825] sm:text-6xl lg:text-7xl">From scattered tabs to a clear next lesson.</h2>
              <div className="grid content-start gap-7 sm:grid-cols-3 lg:grid-cols-1">
                <div>
                  <span className="flex h-8 w-8 items-center justify-center border border-[#D8DAD7] text-[#30312F]"><Play className="h-3.5 w-3.5 fill-current" /></span>
                  <h3 className="mt-4 text-sm font-semibold">A quieter player</h3>
                  <p className="mt-2 text-sm leading-6 text-[#737572]">Open a lesson without the surrounding recommendation loop.</p>
                </div>
                <div>
                  <span className="flex h-8 w-8 items-center justify-center border border-[#D8DAD7] text-[#30312F]"><Bookmark className="h-3.5 w-3.5" /></span>
                  <h3 className="mt-4 text-sm font-semibold">A deliberate shelf</h3>
                  <p className="mt-2 text-sm leading-6 text-[#737572]">Every starting point includes its source, length, and learning level.</p>
                </div>
                <div>
                  <span className="flex h-8 w-8 items-center justify-center border border-[#D8DAD7] text-[#30312F]"><Link2 className="h-3.5 w-3.5" /></span>
                  <h3 className="mt-4 text-sm font-semibold">Your link, on purpose</h3>
                  <p className="mt-2 text-sm leading-6 text-[#737572]">Bring one public video when it matters. The catalog remains ready.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="learning-shelf" className="scroll-mt-6 bg-[#F2F3F5] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-[1260px]">
            <div className="flex flex-col justify-between gap-6 border-b border-[#DDE0E3] pb-7 sm:flex-row sm:items-end sm:gap-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7E8288]">Structured learning shelf</p>
                <h2 className="mt-3 max-w-2xl font-display text-5xl leading-[0.9] tracking-[-0.05em] text-[#262725] sm:text-6xl">Choose one good place to begin.</h2>
              </div>
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#2A2B29] transition hover:text-[#6C7075]">
                Open a video link <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
              <aside className="lg:pt-2">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#858890]">Topics</p>
                <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
                  {topics.map((topic) => (
                    <button
                      key={topic.name}
                      type="button"
                      onClick={() => {
                        setActiveTopic(topic.name);
                        setSearchTerm("");
                      }}
                      className={`flex items-center justify-between gap-4 border px-3 py-2.5 text-left text-sm transition ${activeTopic === topic.name ? "border-[#292A28] bg-[#292A28] text-white" : "border-transparent text-[#686B70] hover:border-[#D4D7DB] hover:bg-white"}`}
                    >
                      <span>{topic.name}</span><span className={activeTopic === topic.name ? "text-white/60" : "text-[#A0A3A7]"}>{topic.count}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTopic("All");
                    setSearchTerm("learning science");
                  }}
                  className="mt-7 flex w-full items-start gap-2 border-t border-[#DDE0E3] pt-5 text-left text-xs leading-5 text-[#777A80] transition hover:text-[#292A28]"
                >
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0" />
                  <span><strong className="font-semibold text-[#4A4C4F]">Live search</strong><br />Expand beyond this shelf</span>
                </button>
              </aside>

              <div>
                <div className="flex flex-col gap-4 border-b border-[#DDE0E3] pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#70737A]">
                    {shouldUseLiveSearch
                      ? liveSearch.isFetching
                        ? "Searching beyond the shelf…"
                        : liveLessons.length
                          ? `Live results via ${liveSearch.data?.source === "invidious" ? "Invidious" : "a public provider"}`
                          : "Expanded search"
                      : activeTopic === "All" ? "Every starting point" : `${activeTopic} lessons`}
                    <span className="text-[#A0A3A7]"> · {shouldUseLiveSearch ? liveLessons.length : visibleCatalog.length} available</span>
                  </p>
                  <label className="relative block w-full sm:w-[285px]">
                    <span className="sr-only">Search the learning shelf</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#90939A]" />
                    <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="h-9 w-full border border-[#D8DBDE] bg-white pl-9 pr-8 text-sm outline-none focus:border-[#292A28]" placeholder="Search lessons" />
                    {searchTerm && <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8D9095] hover:text-[#2B2C2B]" aria-label="Clear catalog search"><X className="h-4 w-4" /></button>}
                  </label>
                </div>

                {importedVideo && (
                  <button type="button" onClick={() => setActiveVideo(importedVideo)} className="mt-5 flex w-full items-center justify-between gap-4 border border-[#D9DCE0] bg-white px-4 py-3 text-left transition hover:border-[#6D7075]">
                    <span className="flex min-w-0 items-center gap-3"><Check className="h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block text-xs text-[#85888C]">Recent direct link · {importedVideo.provider}</span><span className="block truncate text-sm font-semibold text-[#2C2D2B]">{importedVideo.title}</span></span></span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>
                )}

                {hasDisplayedLessons ? (
                  <div className="mt-6 space-y-6">
                    {showFocusPick && (
                      <button type="button" onClick={() => setActiveVideo(focusPick)} className="group grid w-full overflow-hidden border border-[#D8DBDE] bg-white text-left outline-none transition hover:border-[#7A7E83] focus-visible:ring-2 focus-visible:ring-[#20211F] sm:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                        <div className="relative aspect-[16/9] overflow-hidden bg-[#DCE1E6] sm:aspect-auto sm:min-h-[285px]">
                          <img src={focusPick.thumbnail} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                          <span className="absolute inset-0 bg-gradient-to-r from-black/15 to-transparent" />
                          <span className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center bg-white text-[#252624]"><Play className="h-4 w-4 fill-current" /></span>
                        </div>
                        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848A]">A considered first lesson</span>
                          <h3 className="mt-4 font-display text-4xl leading-[0.92] tracking-[-0.045em] text-[#272825] sm:text-5xl">{focusPick.title}</h3>
                          <p className="mt-4 text-sm leading-6 text-[#70737A]">{focusPick.note}</p>
                          <div className="mt-7 flex items-center justify-between border-t border-[#E1E3E5] pt-4 text-xs text-[#70737A]"><span>{focusPick.channel} · {focusPick.duration}</span><span className="inline-flex items-center gap-1 font-semibold text-[#2B2C2B]">Begin <ArrowRight className="h-3.5 w-3.5" /></span></div>
                        </div>
                      </button>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {displayedLessons.map((video, index) => <VideoLesson key={video.id} video={video} index={index + (showFocusPick ? 1 : 0)} onOpen={setActiveVideo} />)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 border border-dashed border-[#CDD1D5] bg-white px-6 py-16 text-center">
                    {liveSearch.isFetching ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#7C8085]" /> : <Sparkles className="mx-auto h-5 w-5 text-[#7C8085]" />}
                    <h3 className="mt-4 font-display text-3xl">{liveSearch.isFetching ? "Looking beyond the shelf." : shouldUseLiveSearch ? "No lesson surfaced for that yet." : "Nothing matching that phrase yet."}</h3>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#74777D]">{shouldUseLiveSearch ? liveSearch.data?.message || "The optional public providers did not return a match. Try a more specific topic or phrase." : "Try a broader search, browse every topic, or paste a direct learning link."}</p>
                    <Button type="button" variant="outline" onClick={() => { setActiveTopic("All"); setSearchTerm(""); }} className="mt-5 border-[#BFC3C7] bg-white text-[#292A28] hover:bg-[#F0F1F2]">View every lesson</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1fr_minmax(390px,0.82fr)] lg:gap-20 lg:px-12 lg:py-40">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#858783]">Direct learning links</p>
            <h2 className="mt-5 max-w-xl font-display text-5xl leading-[0.91] tracking-[-0.05em] text-[#272825] sm:text-6xl">One small step. A better way to watch.</h2>
          </div>
          <div className="self-end lg:pb-1">
            <p className="max-w-md text-base leading-8 text-[#6B6E6C]">Paste a public YouTube or Vimeo URL when you already know what you need. Lesson Ledger reads its metadata, opens a clean player, and leaves the local shelf untouched.</p>
            <Button type="button" onClick={() => setImportOpen(true)} variant="outline" className="mt-7 h-11 border-[#BFC3C7] bg-white px-4 text-sm font-semibold text-[#292A28] hover:bg-[#F0F1F2] active:scale-[0.97]">Paste a video URL <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </section>
      </main>

      <footer className="bg-[#20211F] px-5 py-12 text-[#F6F6F2] sm:px-8 sm:py-14 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-10 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center border border-white/40 font-display text-lg italic">L</span><span className="font-display text-2xl">Lesson Ledger</span></div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/62">A focused learning shelf built from useful educational video.</p>
          </div>
          <div className="text-xs text-white/52 sm:text-right"><p>Catalog + direct URL mode</p><p className="mt-2">Optional live discovery enabled</p></div>
        </div>
      </footer>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl border-[#D7D9D6] bg-[#FBFBFA] p-0 shadow-[0_24px_70px_rgba(30,31,29,0.16)]">
          <div className="border-b border-[#E1E2DF] px-6 py-7 sm:px-8 sm:py-8">
            <DialogHeader>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#858783]">Open a lesson</p>
              <DialogTitle className="mt-3 font-display text-4xl leading-[0.93] tracking-[-0.04em] text-[#282925]">Bring one video into focus.</DialogTitle>
              <DialogDescription className="mt-4 max-w-md text-sm leading-6 text-[#70736F]">Paste a public YouTube or Vimeo URL. We request only its public oEmbed metadata.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 sm:p-8">
            <label className="block">
              <span className="sr-only">Public YouTube or Vimeo URL</span>
              <div className="flex border border-[#D5D7D4] bg-white focus-within:border-[#292A28] focus-within:ring-1 focus-within:ring-[#292A28]">
                <Link2 className="m-3.5 h-4 w-4 shrink-0 text-[#777B7F]" />
                <input value={importUrl} onChange={(event) => { setImportUrl(event.target.value); setImportError(""); }} onKeyDown={(event) => event.key === "Enter" && void importVideo()} className="min-w-0 flex-1 bg-transparent py-3 pr-3 text-sm outline-none placeholder:text-[#A0A2A1]" placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            </label>
            {importError && <p role="alert" className="mt-3 text-sm leading-6 text-[#9A3D32]">{importError}</p>}
            <div className="mt-5 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-[225px] text-xs leading-5 text-[#898C89]">The catalog works even when no link is supplied.</p>
              <Button type="button" onClick={() => void importVideo()} disabled={isImporting} className="h-10 bg-[#252624] px-4 text-sm font-semibold text-white hover:bg-[#515350] active:scale-[0.97]">
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />} Open lesson
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeVideo)} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-5xl overflow-hidden border-[#222321] bg-[#20211F] p-0 text-white shadow-[0_28px_80px_rgba(28,29,27,0.32)]">
          {activeVideo && <>
            <DialogHeader className="sr-only"><DialogTitle>{activeVideo.title}</DialogTitle><DialogDescription>Preview the selected learning video.</DialogDescription></DialogHeader>
            <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
              <div className="aspect-video bg-black"><iframe className="h-full w-full" src={activeVideo.embedUrl} title={activeVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
              <div className="flex flex-col p-6 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">{activeVideo.topic} · {activeVideo.level}</p>
                <h2 className="mt-4 font-display text-4xl leading-[0.92] tracking-[-0.04em]">{activeVideo.title}</h2>
                <p className="mt-3 text-sm text-white/62">{activeVideo.channel} · {activeVideo.duration}</p>
                <p className="mt-5 text-sm leading-6 text-white/72">{activeVideo.note}</p>
                <a href={activeVideo.videoUrl} target="_blank" rel="noreferrer" className="mt-auto inline-flex h-10 items-center justify-center gap-2 border border-white/30 text-sm font-semibold text-white transition hover:bg-white hover:text-[#20211F]">Open at source <ExternalLink className="h-4 w-4" /></a>
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
