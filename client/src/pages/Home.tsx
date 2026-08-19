import { Button } from "@/components/ui/button";
import { catalog, filterCatalog, type CatalogVideo } from "@/lib/catalog";
import { trpc } from "@/lib/trpc";
import { normalizeLearningQuery } from "@shared/learningQuery";
import { ArrowRight, Clock3, Loader2, Play, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type LessonCardProps = {
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  onOpen: () => void;
  label: string;
};

function LessonCard({ title, channel, duration, thumbnail, onOpen, label }: LessonCardProps) {
  return (
    <button type="button" onClick={onOpen} className="group grid w-full grid-cols-[104px_minmax(0,1fr)] gap-4 border border-[#DDE0DF] bg-white p-3 text-left transition hover:border-[#6E736F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252624] sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-5 sm:p-4">
      <div className="relative aspect-video overflow-hidden bg-[#ECEEED]">
        <img src={thumbnail} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.035]" />
        <span className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center bg-white text-[#252624] shadow-sm"><Play className="h-3 w-3 fill-current" /></span>
      </div>
      <div className="min-w-0 py-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#828682]">{label}</p>
        <h3 className="mt-2 line-clamp-2 font-display text-[1.45rem] leading-[0.96] tracking-[-0.03em] text-[#272825]">{title}</h3>
        <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-[#6F736F]"><span className="truncate">{channel}</span><span>·</span><Clock3 className="h-3 w-3 shrink-0" /><span>{duration}</span></p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#30322F]">Build focused course <ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
    </button>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeLearningQuery(query);
  const localMatches = useMemo(() => filterCatalog("All", normalizedQuery), [normalizedQuery]);
  const shouldUseLiveSearch = normalizedQuery.length >= 2 && localMatches.length === 0;
  const liveSearch = trpc.liveSearch.search.useQuery(
    { query: shouldUseLiveSearch ? normalizedQuery : "learning" },
    { enabled: shouldUseLiveSearch, staleTime: 60_000, retry: 2 },
  );

  const startCourse = (value: string) => {
    const topic = normalizeLearningQuery(value) || value.trim();
    if (topic) setLocation(`/learn/${encodeURIComponent(topic)}`);
  };

  const featuredLessons = query.trim() ? localMatches : catalog.slice(0, 4);

  return (
    <div className="min-h-screen overflow-hidden bg-[#FBFBFA] text-[#242522]">
      <header className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 text-left">
          <span className="flex h-8 w-8 items-center justify-center bg-[#242522] font-display text-lg italic text-white">L</span>
          <span className="font-display text-[1.35rem] tracking-[-0.04em]">Lesson Ledger</span>
        </button>
        <button type="button" onClick={() => document.getElementById("learning-shelf")?.scrollIntoView({ behavior: "smooth" })} className="text-sm font-medium text-[#616560] transition hover:text-[#232421]">Library</button>
      </header>

      <main>
        <section className="relative mx-auto flex min-h-[580px] max-w-[1320px] items-center justify-center px-5 pb-24 pt-12 text-center sm:px-8 sm:pb-28 sm:pt-16 lg:min-h-[650px] lg:px-12">
          <span className="absolute left-[6%] top-[13%] h-28 w-28 rounded-full border border-[#E0E2E0]" aria-hidden="true" />
          <span className="absolute right-[7%] top-[24%] h-44 w-44 rounded-full border border-[#E0E2E0]" aria-hidden="true" />
          <div className="relative z-10 w-full max-w-4xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#81857F]">A calmer way to learn from video</p>
            <h1 className="mt-6 font-display text-[3.8rem] leading-[0.86] tracking-[-0.06em] sm:text-7xl lg:text-[6.8rem]">Make room to <em className="font-normal text-[#81868C]">understand.</em></h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#696D69] sm:text-lg">Search any topic. Lesson Ledger finds useful public explanations and builds one ordered learning path in this space.</p>
            <form onSubmit={(event) => { event.preventDefault(); startCourse(query); }} className="mx-auto mt-9 flex max-w-2xl border border-[#D9DCDA] bg-white p-1.5 shadow-[0_18px_38px_rgba(45,46,42,0.05)] sm:p-2">
              <Search className="ml-3 h-4 w-4 shrink-0 self-center text-[#8A8E89] sm:ml-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#969995] sm:h-12 sm:px-4 sm:text-base" placeholder="I want to learn about neural networks" aria-label="What do you want to learn?" />
              <Button type="submit" className="h-10 shrink-0 bg-[#252624] px-4 text-xs font-semibold text-white hover:bg-[#50534F] sm:h-11 sm:px-5 sm:text-sm">Build course <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
            </form>
            <p className="mt-3 text-xs text-[#8B8E8A]">Live YouTube-compatible search, organized into one focused course.</p>
          </div>
        </section>

        <section id="learning-shelf" className="bg-[#F2F3F4] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-[1120px]">
            <div className="flex flex-col justify-between gap-5 border-b border-[#DCE0DD] pb-7 sm:flex-row sm:items-end">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#80857F]">Focused learning shelf</p><h2 className="mt-3 font-display text-5xl leading-[0.9] tracking-[-0.05em] sm:text-6xl">Choose a useful place to begin.</h2></div>
              {query && <button type="button" onClick={() => setQuery("")} className="text-sm font-semibold text-[#4E534E] hover:text-[#252624]">Clear search</button>}
            </div>

            <div className="mt-7 space-y-3">
              {shouldUseLiveSearch && liveSearch.isFetching && <div className="flex items-center gap-2 border border-dashed border-[#CED2CF] bg-white px-5 py-8 text-sm text-[#686D69]"><Loader2 className="h-4 w-4 animate-spin" /> Searching live video sources for {normalizedQuery}…</div>}
              {!shouldUseLiveSearch && featuredLessons.map((lesson: CatalogVideo) => <LessonCard key={lesson.id} title={lesson.title} channel={lesson.channel} duration={lesson.duration} thumbnail={lesson.thumbnail} label={lesson.topic} onOpen={() => startCourse(lesson.topic || lesson.title)} />)}
              {shouldUseLiveSearch && !liveSearch.isFetching && (liveSearch.data?.results ?? []).map((lesson) => <LessonCard key={`${lesson.provider}-${lesson.videoId}`} title={lesson.title} channel={lesson.channel || "Public video"} duration={lesson.duration} thumbnail={lesson.thumbnail || `https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg`} label="Live result" onOpen={() => startCourse(normalizedQuery)} />)}
              {shouldUseLiveSearch && !liveSearch.isFetching && (liveSearch.data?.results ?? []).length === 0 && <div className="border border-dashed border-[#CDD1D5] bg-white px-6 py-14 text-center"><Sparkles className="mx-auto h-5 w-5 text-[#7D827E]" /><h3 className="mt-4 font-display text-3xl">No course assembled yet.</h3><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#727671]">{liveSearch.data?.message || "Try another phrase and Lesson Ledger will search public video sources again."}</p><Button type="button" onClick={() => void liveSearch.refetch()} className="mt-5 bg-[#252624] text-white hover:bg-[#50534F]">Retry live search</Button></div>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
