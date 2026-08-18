/**
 * FOCUSED COURSE WORKSPACE — One request becomes one ordered lesson path.
 * No topic controls, no external navigation, and one in-site player at a time.
 */
import { Button } from "@/components/ui/button";
import { filterCatalog, type CatalogVideo } from "@/lib/catalog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Check, Clock3, Loader2, Play, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";

type CourseLesson = {
  id: string;
  title: string;
  channel: string;
  duration: string;
  note: string;
  thumbnail: string;
  embedUrl: string;
  source: "catalog" | "live";
};

function decodeCourseQuery(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function fromCatalog(video: CatalogVideo): CourseLesson {
  return {
    id: `catalog-${video.id}`,
    title: video.title,
    channel: video.channel,
    duration: video.duration,
    note: video.note,
    thumbnail: video.thumbnail,
    embedUrl: video.embedUrl,
    source: "catalog",
  };
}

export default function Course() {
  const params = useParams<{ query: string }>();
  const [, setLocation] = useLocation();
  const courseQuery = decodeCourseQuery(params.query || "").trim();
  const [nextQuery, setNextQuery] = useState(courseQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const canSearch = courseQuery.length >= 2;
  const liveSearch = trpc.liveSearch.search.useQuery(
    { query: canSearch ? courseQuery : "learning" },
    { enabled: canSearch, staleTime: 60_000, retry: 0 },
  );

  const courseLessons = useMemo<CourseLesson[]>(() => {
    const localLessons = filterCatalog("All", courseQuery).map(fromCatalog);
    const localVideoIds = new Set(localLessons.map(lesson => lesson.embedUrl));
    const liveLessons = (liveSearch.data?.results ?? [])
      .map(result => ({
        id: `live-${result.provider}-${result.videoId}`,
        title: result.title,
        channel: result.channel || "Public video",
        duration: result.duration,
        note: result.note,
        thumbnail: result.thumbnail || `https://i.ytimg.com/vi/${result.videoId}/hqdefault.jpg`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${result.videoId}?rel=0`,
        source: "live" as const,
      }))
      .filter(lesson => !localVideoIds.has(lesson.embedUrl));
    return [...localLessons, ...liveLessons];
  }, [courseQuery, liveSearch.data]);

  const activeLesson = courseLessons[activeIndex];

  useEffect(() => {
    setNextQuery(courseQuery);
    setActiveIndex(0);
    setIsPlaying(false);
  }, [courseQuery]);

  useEffect(() => {
    if (activeIndex >= courseLessons.length && courseLessons.length > 0) setActiveIndex(0);
  }, [activeIndex, courseLessons.length]);

  const buildCourse = () => {
    const normalized = nextQuery.trim();
    if (normalized.length >= 2) setLocation(`/learn/${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F6] text-[#20211F]">
      <header className="border-b border-[#DFE1E3] bg-[#FBFBFA] px-5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2.5 text-left">
            <span className="flex h-8 w-8 items-center justify-center bg-[#20211F] font-display text-lg italic text-white">L</span>
            <span className="font-display text-[1.35rem] leading-none tracking-[-0.03em]">Lesson Ledger</span>
          </button>
          <button type="button" onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-sm font-medium text-[#555954] transition hover:text-[#1F201E]">
            <ArrowLeft className="h-4 w-4" /> Library
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pb-16">
        <section className="border-b border-[#DDE0E3] pb-8 sm:pb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#85888D]">Focused course</p>
          <div className="mt-4 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl font-display text-5xl leading-[0.9] tracking-[-0.05em] text-[#252624] sm:text-6xl lg:text-7xl">{courseQuery || "Your next course"}</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#70737A]">A single, ordered path assembled for this question. Keep one lesson open, then move deliberately to the next.</p>
            </div>
            <div className="w-full max-w-lg border border-[#D8DBDE] bg-white p-1.5 shadow-[0_12px_24px_rgba(42,45,48,0.04)]">
              <div className="flex items-center">
                <Search className="ml-3 h-4 w-4 shrink-0 text-[#8A8D92]" />
                <input value={nextQuery} onChange={(event) => setNextQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && buildCourse()} className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#9A9DA2]" placeholder="Choose another topic" aria-label="Build a course for a new topic" />
                <Button type="button" onClick={buildCourse} disabled={nextQuery.trim().length < 2} className="h-9 bg-[#252624] px-3.5 text-xs font-semibold text-white hover:bg-[#50534F] active:scale-[0.97]">Build course</Button>
              </div>
            </div>
          </div>
        </section>

        {liveSearch.isFetching && courseLessons.length === 0 ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#6F747B]" />
            <h2 className="mt-5 font-display text-4xl">Building your lesson path.</h2>
            <p className="mt-3 text-sm text-[#74777D]">Looking for useful explanations without leaving this space.</p>
          </div>
        ) : activeLesson ? (
          <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)] xl:gap-10">
            <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <div className="overflow-hidden border border-[#2A2B29] bg-[#171817] shadow-[0_18px_38px_rgba(27,29,28,0.16)]">
                <div className="relative aspect-video overflow-hidden bg-black">
                  <iframe className="pointer-events-none h-full w-full" src={`${activeLesson.embedUrl}&modestbranding=1&controls=0&disablekb=1&fs=0&playsinline=1&enablejsapi=1&autoplay=${isPlaying ? "1" : "0"}`} title="Embedded lesson media" tabIndex={-1} aria-hidden="true" inert sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture" />
                  {!isPlaying ? (
                    <button type="button" onClick={() => setIsPlaying(true)} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 text-white transition hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-white">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#232421] shadow-lg"><Play className="ml-0.5 h-5 w-5 fill-current" /></span>
                      <span className="mt-4 text-sm font-semibold">Play lesson here</span>
                      <span className="mt-1 text-xs text-white/68">The course player keeps you inside Lesson Ledger.</span>
                    </button>
                  ) : (
                    <div className="absolute inset-0 z-20" aria-label="Lesson playing in Lesson Ledger" />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex h-10 items-center justify-between bg-[#171817] px-4 text-[10px] font-medium tracking-[0.08em] text-white/58">
                    <span>Lesson Ledger player</span>
                    <span>External navigation disabled</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48">Lesson {String(activeIndex + 1).padStart(2, "0")} of {String(courseLessons.length).padStart(2, "0")}</p>
                    <h2 className="mt-1 font-display text-2xl leading-none tracking-[-0.02em]">{activeLesson.title}</h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/60"><Clock3 className="h-3.5 w-3.5" /> {activeLesson.duration}</span>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3 border-l-2 border-[#2B2D2A] pl-4 text-sm leading-6 text-[#666A6D]">
                <Play className="mt-1 h-3.5 w-3.5 shrink-0 text-[#2B2D2A]" />
                <p>Playback stays here. External source navigation is disabled; when you finish, choose the next lesson from the course outline.</p>
              </div>
            </div>

            <aside className="border border-[#DCE0E2] bg-[#FBFBFA] xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
              <div className="border-b border-[#E0E3E5] px-5 py-5 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#83878D]">Course outline</p><h2 className="mt-2 font-display text-3xl leading-none">Keep your place.</h2></div>
                  <span className="text-xs text-[#80848A]">{courseLessons.length} lessons</span>
                </div>
                <div className="mt-5 h-1.5 overflow-hidden bg-[#E6E8EA]"><div className="h-full bg-[#292A28] transition-all duration-200" style={{ width: `${((activeIndex + 1) / courseLessons.length) * 100}%` }} /></div>
              </div>
              <ol className="divide-y divide-[#E1E4E6]">
                {courseLessons.map((lesson, index) => (
                  <li key={lesson.id}>
                    <button type="button" onClick={() => { setActiveIndex(index); setIsPlaying(false); }} className={`group flex w-full items-start gap-4 px-5 py-4 text-left transition sm:px-6 ${index === activeIndex ? "bg-[#ECEEF0]" : "hover:bg-[#F4F5F6]"}`}>
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-[10px] font-semibold ${index === activeIndex ? "bg-[#292A28] text-white" : "border border-[#D2D5D8] text-[#767A80]"}`}>{index < activeIndex ? <Check className="h-3.5 w-3.5" /> : String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1"><span className="block text-[10px] font-medium uppercase tracking-[0.13em] text-[#888C91]">{lesson.source === "catalog" ? "Saved lesson" : "Live result"} · {lesson.duration}</span><span className="mt-1.5 block font-display text-xl leading-[0.98] text-[#292A28]">{lesson.title}</span><span className="mt-1.5 block truncate text-xs text-[#74787D]">{lesson.channel}</span></span>
                      {index === activeIndex && <Play className="mt-2 h-3.5 w-3.5 shrink-0 fill-current text-[#292A28]" />}
                    </button>
                  </li>
                ))}
              </ol>
            </aside>
          </section>
        ) : (
          <div className="flex min-h-[55vh] flex-col items-center justify-center border border-dashed border-[#CDD1D5] bg-white px-6 text-center">
            <Sparkles className="h-6 w-6 text-[#777C83]" />
            <h2 className="mt-5 font-display text-4xl">No course assembled yet.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#73777C]">{liveSearch.data?.message || "Try a clearer topic, such as “intro to Python” or “French Revolution.”"}</p>
            <Button type="button" onClick={() => setLocation("/")} variant="outline" className="mt-6 border-[#BFC3C7] bg-white text-[#292A28] hover:bg-[#F0F1F2]">Return to the library <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        )}
      </main>
    </div>
  );
}
