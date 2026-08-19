/**
 * FOCUSED COURSE WORKSPACE — One request becomes one ordered learning path.
 * Student progress, notes, recall, and pacing are saved per course in this browser.
 */
import { Button } from "@/components/ui/button";
import { filterCatalog, type CatalogVideo } from "@/lib/catalog";
import { isFullscreenTarget } from "@/lib/fullscreen";
import {
  completeLesson,
  EMPTY_LEARNING_RECORD,
  formatTimestamp,
  learningStorageKey,
  mergeLearningRecord,
  type LearningRecord,
} from "@/lib/learning";
import { trpc } from "@/lib/trpc";
import { normalizeLearningQuery } from "@shared/learningQuery";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FastForward,
  Lightbulb,
  Loader2,
  Maximize2,
  Minimize2,
  NotebookPen,
  Pause,
  Play,
  Search,
  Sparkles,
  Timer,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const courseTopic = normalizeLearningQuery(courseQuery) || courseQuery;
  const [nextQuery, setNextQuery] = useState(courseQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [learningRecord, setLearningRecord] = useState<LearningRecord>(EMPTY_LEARNING_RECORD);
  const [learningReady, setLearningReady] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteTimestamp, setNoteTimestamp] = useState("00:00");
  const [recallDraft, setRecallDraft] = useState("");
  const [showRecall, setShowRecall] = useState(false);
  const [autoAdvanceTarget, setAutoAdvanceTarget] = useState<number | null>(null);
  const [autoAdvanceRemaining, setAutoAdvanceRemaining] = useState(8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerSeconds, setPlayerSeconds] = useState(0);
  const [playerStatus, setPlayerStatus] = useState<string | null>(null);
  const playerFrameRef = useRef<HTMLIFrameElement>(null);
  const playerSurfaceRef = useRef<HTMLDivElement>(null);
  const playerSecondsRef = useRef(0);
  const canSearch = courseTopic.length >= 2;
  const liveSearch = trpc.liveSearch.search.useQuery(
    { query: canSearch ? courseTopic : "learning" },
    { enabled: canSearch, staleTime: 60_000, retry: 2, retryDelay: attempt => Math.min(1_000 * (attempt + 1), 3_000) },
  );

  const courseLessons = useMemo<CourseLesson[]>(() => {
    const localLessons = filterCatalog("All", courseTopic).map(fromCatalog);
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
  }, [courseTopic, liveSearch.data]);

  // Auto-create and persist a curated playlist in localStorage so users can play the
  // course inside the site. We avoid requiring any explicit user action.
  useEffect(() => {
    try {
      if (!courseTopic || courseTopic.length < 2) return;
      if (!courseLessons || courseLessons.length === 0) return;
      const key = `lesson-ledger:playlist:${encodeURIComponent(courseTopic)}`;
      const payload = {
        topic: courseTopic,
        createdAt: Date.now(),
        lessons: courseLessons.map(l => ({
          id: l.id,
          title: l.title,
          channel: l.channel,
          duration: l.duration,
          note: l.note,
          thumbnail: l.thumbnail,
          embedUrl: l.embedUrl,
          source: l.source,
        })),
      };
      const exists = localStorage.getItem(key);
      // Save or update the playlist; notify only when first created to avoid spamming.
      localStorage.setItem(key, JSON.stringify(payload));
      if (!exists) {
        toast.success("Curated playlist ready", { description: `A course for "${courseTopic}" is available in your library.` });
      }
    } catch {
      // ignore storage errors
    }
  }, [courseTopic, courseLessons]);

  const activeLesson = courseLessons[activeIndex];
  const completedCount = courseLessons.filter(lesson => learningRecord.completedLessonIds.includes(lesson.id)).length;
  const courseProgress = courseLessons.length ? Math.round((completedCount / courseLessons.length) * 100) : 0;
  const activeNotes = activeLesson ? learningRecord.notes.filter(note => note.lessonId === activeLesson.id) : [];

  const postPlayerCommand = (func: string, args: unknown[] = []) => {
    playerFrameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube-nocookie.com",
    );
  };

  const setPlayerPlayback = (shouldPlay: boolean) => {
    postPlayerCommand(shouldPlay ? "playVideo" : "pauseVideo");
    setIsPlaying(shouldPlay);
    setPlayerStatus(shouldPlay ? "Playing lesson." : "Lesson paused.");
  };

  const togglePlayback = () => setPlayerPlayback(!isPlaying);

  const seekBy = (seconds: number) => {
    const nextSecond = Math.max(0, playerSecondsRef.current + seconds);
    postPlayerCommand("seekTo", [nextSecond, true]);
    setPlayerSeconds(nextSecond);
    setPlayerStatus(seconds < 0 ? "Moved back 5 seconds." : "Moved forward 5 seconds.");
  };

  const toggleFullscreen = async () => {
    const playerSurface = playerSurfaceRef.current;
    if (!playerSurface) return;
    try {
      if (isFullscreenTarget(playerSurface, document.fullscreenElement)) {
        await document.exitFullscreen();
      } else {
        await playerSurface.requestFullscreen();
      }
    } catch {
      setPlayerStatus("Fullscreen is unavailable in this browser. Try a current desktop browser.");
    }
  };

  useEffect(() => {
    playerSecondsRef.current = playerSeconds;
  }, [playerSeconds]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => setPlayerSeconds(seconds => seconds + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(isFullscreenTarget(playerSurfaceRef.current, document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    const handleCtrlShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "Control" && !event.repeat && !editing && activeLesson) {
        event.preventDefault();
        togglePlayback();
      }
    };
    const previousHandler = window.onkeydown;
    window.onkeydown = handleCtrlShortcut;
    return () => {
      if (window.onkeydown === handleCtrlShortcut) window.onkeydown = previousHandler;
    };
  }, [activeLesson, isPlaying]);

  useEffect(() => {
    setNextQuery(courseQuery);
    setActiveIndex(0);
    setIsPlaying(false);
    setPlayerSeconds(0);
    setPlayerStatus(null);
    setShowRecall(false);
    setAutoAdvanceTarget(null);
    setLearningReady(false);
    try {
      const stored = localStorage.getItem(learningStorageKey(courseTopic));
      setLearningRecord(stored ? mergeLearningRecord(JSON.parse(stored)) : EMPTY_LEARNING_RECORD);
    } catch {
      setLearningRecord(EMPTY_LEARNING_RECORD);
    } finally {
      setLearningReady(true);
    }
  }, [courseTopic]);

  useEffect(() => {
    if (!learningReady) return;
    try {
      localStorage.setItem(learningStorageKey(courseTopic), JSON.stringify(learningRecord));
    } catch {
      // Storage remains optional; students can still use the current learning session.
    }
  }, [courseTopic, learningReady, learningRecord]);

  useEffect(() => {
    if (!learningReady || !learningRecord.activeLessonId) return;
    const resumeIndex = courseLessons.findIndex(lesson => lesson.id === learningRecord.activeLessonId);
    if (resumeIndex >= 0) setActiveIndex(resumeIndex);
  }, [courseLessons, learningReady, learningRecord.activeLessonId]);

  useEffect(() => {
    if (!activeLesson) return;
    setRecallDraft(learningRecord.recallAnswers[activeLesson.id] || "");
    setNoteTimestamp("00:00");
  }, [activeLesson?.id, learningRecord.recallAnswers]);

  useEffect(() => {
    if (activeIndex >= courseLessons.length && courseLessons.length > 0) setActiveIndex(0);
  }, [activeIndex, courseLessons.length]);

  useEffect(() => {
    if (autoAdvanceTarget === null) return;
    if (autoAdvanceRemaining <= 0) {
      const targetLesson = courseLessons[autoAdvanceTarget];
      if (targetLesson) {
        setActiveIndex(autoAdvanceTarget);
        setLearningRecord(record => ({ ...record, activeLessonId: targetLesson.id }));
        setPlayerSeconds(0);
        setIsPlaying(true);
        setShowRecall(false);
      }
      setAutoAdvanceTarget(null);
      return;
    }
    const timer = window.setTimeout(() => setAutoAdvanceRemaining(seconds => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [autoAdvanceRemaining, autoAdvanceTarget, courseLessons]);

  const buildCourse = () => {
    const normalized = normalizeLearningQuery(nextQuery) || nextQuery.trim();
    if (normalized.length >= 2) setLocation(`/learn/${encodeURIComponent(normalized)}`);
  };

  const selectLesson = (index: number, play = false) => {
    const lesson = courseLessons[index];
    if (!lesson) return;
    setActiveIndex(index);
    setLearningRecord(record => ({ ...record, activeLessonId: lesson.id }));
    setPlayerSeconds(0);
    setPlayerStatus(null);
    setIsPlaying(play);
    setShowRecall(false);
    setAutoAdvanceTarget(null);
  };

  const saveNote = () => {
    if (!activeLesson || !noteDraft.trim()) return;
    setLearningRecord(record => ({
      ...record,
      notes: [...record.notes, {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        lessonId: activeLesson.id,
        timestamp: formatTimestamp(noteTimestamp),
        text: noteDraft.trim(),
        createdAt: Date.now(),
      }],
    }));
    setNoteDraft("");
  };

  const saveRecall = () => {
    if (!activeLesson) return;
    setLearningRecord(record => ({ ...record, recallAnswers: { ...record.recallAnswers, [activeLesson.id]: recallDraft.trim() } }));
    setShowRecall(false);
    if (autoAdvanceTarget !== null) setAutoAdvanceRemaining(0);
  };

  const markLessonComplete = () => {
    if (!activeLesson) return;
    setLearningRecord(record => completeLesson(record, activeLesson.id));
    setShowRecall(true);
    const nextIndex = activeIndex + 1;
    if (learningRecord.autoAdvance && nextIndex < courseLessons.length) {
      setAutoAdvanceRemaining(8);
      setAutoAdvanceTarget(nextIndex);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F6] text-[#20211F]">
      <header className="border-b border-[#DFE1E3] bg-[#FBFBFA] px-5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2.5 text-left">
            <span className="flex h-8 w-8 items-center justify-center bg-[#20211F] font-display text-lg italic text-white">L</span>
            <span className="font-display text-[1.35rem] leading-none tracking-[-0.03em]">Lesson Ledger</span>
          </button>
          <button type="button" onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-sm font-medium text-[#555954] transition hover:text-[#1F201E]"><ArrowLeft className="h-4 w-4" /> Back</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pb-16">
        <section className="border-b border-[#DDE0E3] pb-8 sm:pb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#85888D]">Focused course</p>
          <div className="mt-4 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl font-display text-5xl leading-[0.9] tracking-[-0.05em] text-[#252624] sm:text-6xl lg:text-7xl">{courseTopic || "Your next course"}</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#70737A]">One ordered path, a clear learning goal, and just enough support to help the lesson stick.</p>
            </div>
            <div className="w-full max-w-lg border border-[#D8DBDE] bg-white p-1.5 shadow-[0_12px_24px_rgba(42,45,48,0.04)]">
              <div className="flex items-center"><Search className="ml-3 h-4 w-4 shrink-0 text-[#8A8D92]" /><input value={nextQuery} onChange={(event) => setNextQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && buildCourse()} className="h-9 w-full bg-transparent px-3 text-sm outline-none" placeholder="Refine your course topic" /></div>
            </div>
          </div>
        </section>

        {liveSearch.isFetching && courseLessons.length === 0 ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center text-center"><Loader2 className="h-6 w-6 animate-spin text-[#6F747B]" /><h2 className="mt-5 font-display text-4xl">Searching for lessons…</h2><p className="mt-3 text-sm text-[#6F747B]">This can take a moment while we pull public videos to build your course.</p></div>
        ) : activeLesson ? (
          <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)] xl:gap-10">
            <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <div className="overflow-hidden border border-[#2A2B29] bg-[#171817] shadow-[0_18px_38px_rgba(27,29,28,0.16)]">
                <div ref={playerSurfaceRef} className="relative aspect-video overflow-hidden bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:aspect-auto">
                  <iframe ref={playerFrameRef} className="pointer-events-none h-full w-full" src={`${activeLesson.embedUrl}&modestbranding=1&controls=0&disablekb=1&fs=0&playsinline=1&enablejsapi=1`} title={activeLesson.title} sandbox="allow-same-origin allow-scripts allow-presentation" />
                  {!isPlaying ? <button type="button" onClick={() => setPlayerPlayback(true)} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 text-white transition"><Play className="h-10 w-10" /></button> : null}
                  <div className="absolute right-3 top-3 z-40 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => seekBy(-5)} className="inline-flex h-9 items-center gap-1 bg-white px-2.5 text-xs font-semibold text-[#242523] shadow-sm transition hover:bg-[#F0F1F2]">-5s</button>
                    <button type="button" onClick={togglePlayback} className="inline-flex h-9 items-center gap-1.5 bg-white px-3 text-xs font-semibold text-[#242523] shadow-sm transition hover:bg-[#F0F1F2]">{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                    <button type="button" onClick={() => seekBy(5)} className="inline-flex h-9 items-center gap-1 bg-white px-2.5 text-xs font-semibold text-[#242523] shadow-sm transition hover:bg-[#F0F1F2]">+5s</button>
                    <button type="button" onClick={() => void toggleFullscreen()} className="inline-flex h-9 items-center gap-1.5 bg-[#252624] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#3A3B3A]"><Maximize2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex h-10 items-center justify-between bg-[#171817] px-4 text-[10px] font-medium tracking-[0.08em] text-white/70">
                    <div>Lesson player</div>
                    <div>{playerStatus}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48">Lesson {String(activeIndex + 1).padStart(2, "0")} of {String(courseLessons.length).padStart(2, "0")}</p></div>
                  <div className="flex items-center gap-3"><span className="inline-flex items-center gap-1.5 text-xs text-white/60"><Clock3 className="h-3.5 w-3.5" /> {activeLesson.duration}</span></div>
                </div>
              </div>

              {playerStatus && <p aria-live="polite" className="mt-4 border border-[#C7CCD1] bg-white px-4 py-3 text-sm leading-6 text-[#575B60]">{playerStatus}</p>}
              {autoAdvanceTarget !== null && <div className="mt-4 flex items-center justify-between gap-4 border border-[#C7CCD1] bg-white px-4 py-3 text-sm"><div>Advancing in {autoAdvanceRemaining}s</div></div>}

              <div className="mt-5 flex items-start gap-3 border-l-2 border-[#2B2D2A] pl-4 text-sm leading-6 text-[#666A6D]"><Play className="mt-1 h-3.5 w-3.5 shrink-0 text-[#2B2D2A]" /><p>Mark a lesson complete to record progress and move forward when ready.</p></div>

              {showRecall && <div className="mt-6 border border-[#D8DBDE] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><Lightbulb className="mt-0.5 h-5 w-5 text-[#4A4E52]" /><div>Recall prompt</div></div></div>}
            </div>

            <aside className="space-y-5">
              <div className="border border-[#DCE0E2] bg-[#FBFBFA] xl:max-h-[50vh] xl:overflow-y-auto">
                <div className="border-b border-[#E0E3E5] px-5 py-5 sm:px-6"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6F7376]">Curated playlist</p><p className="mt-1 text-sm text-[#6F7376]">An ordered set of lessons for this topic.</p></div></div></div>
                <ol className="divide-y divide-[#E1E4E6]">{courseLessons.map((lesson, index) => { const isComplete = learningRecord.completedLessonIds.includes(lesson.id); return <li key={lesson.id} className="px-5 py-4 sm:px-6"><div className="flex items-center justify-between"><div><button type="button" onClick={() => selectLesson(index, true)} className="text-left"><div className="font-medium">{lesson.title}</div><div className="text-xs text-[#6F7376]">{lesson.channel} · {lesson.duration}</div></button></div><div className="flex items-center gap-2"><button type="button" onClick={() => { setLearningRecord(r => completeLesson(r, lesson.id)); toast.success("Marked complete"); }} className="inline-flex items-center gap-2 rounded bg-white px-2 py-1 text-xs">{isComplete ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Check className="h-4 w-4" />}</button></div></div></li>})}</ol>
              </div>

              <div className="border border-[#DCE0E2] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6F7376]">Course progress</p><p className="mt-1 text-sm text-[#6F7376]">{courseProgress}% complete</p></div><div className="text-sm text-[#6F7376]"><button type="button" onClick={() => { localStorage.removeItem(`lesson-ledger:playlist:${encodeURIComponent(courseTopic)}`); toast.success("Removed curated playlist"); }} className="text-xs underline">Remove playlist</button></div></div></div>

              <div className="border border-[#DCE0E2] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6F7376]">Notes</p><p className="mt-1 text-sm text-[#6F7376]">Take notes as you study.</p></div></div></div>
            </aside>
          </section>
        ) : (
          <div className="flex min-h-[55vh] flex-col items-center justify-center border border-dashed border-[#CDD1D5] bg-white px-6 text-center"><Sparkles className="h-6 w-6 text-[#777C83]" /><h2 className="mt-4 font-display text-3xl">No lessons found yet</h2><p className="mt-3 text-sm text-[#6F7376]">Try a slightly different phrase or check your connection — we search public providers for matching videos.</p></div>
        )}
      </main>
    </div>
  );
}
