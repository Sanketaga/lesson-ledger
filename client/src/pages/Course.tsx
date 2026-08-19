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
      const stored = localStorage.getItem(learningStorageKey(courseQuery));
      setLearningRecord(stored ? mergeLearningRecord(JSON.parse(stored)) : EMPTY_LEARNING_RECORD);
    } catch {
      setLearningRecord(EMPTY_LEARNING_RECORD);
    } finally {
      setLearningReady(true);
    }
  }, [courseQuery]);

  useEffect(() => {
    if (!learningReady) return;
    try {
      localStorage.setItem(learningStorageKey(courseQuery), JSON.stringify(learningRecord));
    } catch {
      // Storage remains optional; students can still use the current learning session.
    }
  }, [courseQuery, learningReady, learningRecord]);

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
    const normalized = nextQuery.trim();
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
          <button type="button" onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-sm font-medium text-[#555954] transition hover:text-[#1F201E]"><ArrowLeft className="h-4 w-4" /> Library</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pb-16">
        <section className="border-b border-[#DDE0E3] pb-8 sm:pb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#85888D]">Focused course</p>
          <div className="mt-4 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl font-display text-5xl leading-[0.9] tracking-[-0.05em] text-[#252624] sm:text-6xl lg:text-7xl">{courseQuery || "Your next course"}</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#70737A]">One ordered path, a clear learning goal, and just enough support to help the lesson stick.</p>
            </div>
            <div className="w-full max-w-lg border border-[#D8DBDE] bg-white p-1.5 shadow-[0_12px_24px_rgba(42,45,48,0.04)]">
              <div className="flex items-center"><Search className="ml-3 h-4 w-4 shrink-0 text-[#8A8D92]" /><input value={nextQuery} onChange={(event) => setNextQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && buildCourse()} className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#9A9DA2]" placeholder="Choose another topic" aria-label="Build a course for a new topic" /><Button type="button" onClick={buildCourse} disabled={nextQuery.trim().length < 2} className="h-9 bg-[#252624] px-3.5 text-xs font-semibold text-white hover:bg-[#50534F] active:scale-[0.97]">Build course</Button></div>
            </div>
          </div>
        </section>

        {liveSearch.isFetching && courseLessons.length === 0 ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center text-center"><Loader2 className="h-6 w-6 animate-spin text-[#6F747B]" /><h2 className="mt-5 font-display text-4xl">Building your lesson path.</h2><p className="mt-3 text-sm text-[#74777D]">Looking for useful explanations without leaving this space.</p></div>
        ) : activeLesson ? (
          <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)] xl:gap-10">
            <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <div className="overflow-hidden border border-[#2A2B29] bg-[#171817] shadow-[0_18px_38px_rgba(27,29,28,0.16)]">
                <div ref={playerSurfaceRef} className="relative aspect-video overflow-hidden bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:aspect-auto">
                  <iframe ref={playerFrameRef} className="pointer-events-none h-full w-full" src={`${activeLesson.embedUrl}&modestbranding=1&controls=0&disablekb=1&fs=0&playsinline=1&enablejsapi=1&autoplay=${isPlaying ? "1" : "0"}`} title="Embedded lesson media" tabIndex={-1} aria-hidden="true" inert sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture" />
                  {!isPlaying ? <button type="button" onClick={() => setPlayerPlayback(true)} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 text-white transition hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-white"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#232421] shadow-lg"><Play className="ml-0.5 h-5 w-5 fill-current" /></span><span className="mt-4 text-sm font-semibold">Play lesson here</span><span className="mt-1 text-xs text-white/68">The course player keeps you inside Lesson Ledger.</span></button> : <div className="absolute inset-0 z-20" aria-label="Lesson playing in Lesson Ledger" />}
                  <div className="absolute right-3 top-3 z-40 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => seekBy(-5)} className="inline-flex h-9 items-center gap-1 bg-white px-2.5 text-xs font-semibold text-[#242523] shadow-sm transition hover:bg-[#ECEDEA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="Go back 5 seconds" title="Go back 5 seconds"><RotateCcw className="h-3.5 w-3.5" />5s</button>
                    <button type="button" onClick={togglePlayback} className="inline-flex h-9 items-center gap-1.5 bg-white px-3 text-xs font-semibold text-[#242523] shadow-sm transition hover:bg-[#ECEDEA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={isPlaying ? "Pause lesson" : "Play lesson"}>{isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}{isPlaying ? "Pause" : "Play"}<kbd className="ml-1 border border-[#D5D7D4] px-1 py-0.5 text-[9px] text-[#6E716D]">Ctrl</kbd></button>
                    <button type="button" onClick={() => seekBy(5)} className="inline-flex h-9 items-center gap-1 bg-white px-2.5 text-xs font-semibold text-[#242523] shadow-sm transition hover:bg-[#ECEDEA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="Go forward 5 seconds" title="Go forward 5 seconds">5s<FastForward className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => void toggleFullscreen()} className="inline-flex h-9 items-center gap-1.5 bg-[#252624] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#50534F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}{isFullscreen ? "Exit" : "Fullscreen"}</button>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex h-10 items-center justify-between bg-[#171817] px-4 text-[10px] font-medium tracking-[0.08em] text-white/58"><span>Lesson Ledger player</span><span>External navigation disabled</span></div>
                </div>
                <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48">Lesson {String(activeIndex + 1).padStart(2, "0")} of {String(courseLessons.length).padStart(2, "0")}</p><h2 className="mt-1 font-display text-2xl leading-none tracking-[-0.02em]">{activeLesson.title}</h2></div>
                  <div className="flex items-center gap-3"><span className="inline-flex items-center gap-1.5 text-xs text-white/60"><Clock3 className="h-3.5 w-3.5" /> {activeLesson.duration}</span><Button type="button" onClick={markLessonComplete} className="h-9 bg-white px-3 text-xs font-semibold text-[#20211F] hover:bg-[#E8E9E8]">{learningRecord.completedLessonIds.includes(activeLesson.id) ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}Complete</Button></div>
                </div>
              </div>

              {playerStatus && <p aria-live="polite" className="mt-4 border border-[#C7CCD1] bg-white px-4 py-3 text-sm leading-6 text-[#575B60]">{playerStatus}</p>}
              {autoAdvanceTarget !== null && <div className="mt-4 flex items-center justify-between gap-4 border border-[#C7CCD1] bg-white px-4 py-3 text-sm"><span className="flex items-center gap-2"><Timer className="h-4 w-4" /> Next lesson begins in {autoAdvanceRemaining}s.</span><button type="button" onClick={() => setAutoAdvanceTarget(null)} className="font-semibold text-[#3F4348] hover:text-black">Pause</button></div>}

              <div className="mt-5 flex items-start gap-3 border-l-2 border-[#2B2D2A] pl-4 text-sm leading-6 text-[#666A6D]"><Play className="mt-1 h-3.5 w-3.5 shrink-0 text-[#2B2D2A]" /><p>Mark a lesson complete when you are ready. With auto-advance on, the next lesson opens after a short pause; beginning a reflection pauses the move.</p></div>

              {showRecall && <div className="mt-6 border border-[#D8DBDE] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><Lightbulb className="mt-0.5 h-5 w-5 text-[#4A4E52]" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#84888D]">A quick recall</p><h3 className="mt-2 font-display text-3xl leading-none">What is one idea you can explain from this lesson?</h3></div></div><textarea value={recallDraft} onFocus={() => setAutoAdvanceTarget(null)} onChange={(event) => { setRecallDraft(event.target.value); setAutoAdvanceTarget(null); }} className="mt-5 min-h-24 w-full resize-y border border-[#D8DBDE] bg-[#FBFBFA] p-3 text-sm leading-6 outline-none focus:border-[#292A28]" placeholder="Write it in your own words…" /><p className="mt-2 text-xs text-[#7B7F84]">Writing here pauses automatic advance so you can finish your thought.</p><div className="mt-3 flex justify-end"><Button type="button" onClick={saveRecall} className="h-9 bg-[#252624] px-3.5 text-xs text-white hover:bg-[#50534F]">Save reflection</Button></div></div>}
            </div>

            <aside className="space-y-5">
              <div className="border border-[#DCE0E2] bg-[#FBFBFA] xl:max-h-[50vh] xl:overflow-y-auto">
                <div className="border-b border-[#E0E3E5] px-5 py-5 sm:px-6"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#83878D]">Course progress</p><h2 className="mt-2 font-display text-3xl leading-none">Keep your place.</h2></div><span className="text-xs text-[#80848A]">{completedCount}/{courseLessons.length} complete</span></div><div className="mt-5 h-1.5 overflow-hidden bg-[#E6E8EA]"><div className="h-full bg-[#292A28] transition-all duration-200" style={{ width: `${courseProgress}%` }} /></div></div>
                <ol className="divide-y divide-[#E1E4E6]">{courseLessons.map((lesson, index) => { const isComplete = learningRecord.completedLessonIds.includes(lesson.id); return <li key={lesson.id}><button type="button" onClick={() => selectLesson(index)} className={`group flex w-full items-start gap-4 px-5 py-4 text-left transition sm:px-6 ${index === activeIndex ? "bg-[#ECEEF0]" : "hover:bg-[#F4F5F6]"}`}><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-[10px] font-semibold ${index === activeIndex ? "bg-[#292A28] text-white" : isComplete ? "border border-[#798079] text-[#465047]" : "border border-[#D2D5D8] text-[#767A80]"}`}>{isComplete ? <Check className="h-3.5 w-3.5" /> : String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-medium uppercase tracking-[0.13em] text-[#888C91]">{lesson.source === "catalog" ? "Saved lesson" : "Live result"} · {lesson.duration}</span><span className="mt-1.5 block font-display text-xl leading-[0.98] text-[#292A28]">{lesson.title}</span><span className="mt-1.5 block truncate text-xs text-[#74787D]">{lesson.channel}</span></span>{index === activeIndex && <Play className="mt-2 h-3.5 w-3.5 shrink-0 fill-current text-[#292A28]" />}</button></li>; })}</ol>
              </div>

              <div className="border border-[#DCE0E2] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#83878D]">Learning settings</p><h2 className="mt-2 font-display text-3xl leading-none">Set your pace.</h2></div><Timer className="h-5 w-5 text-[#64686D]" /></div><label className="mt-5 block"><span className="text-xs font-semibold text-[#42464A]">Today I want to be able to…</span><input value={learningRecord.goal} onChange={(event) => setLearningRecord(record => ({ ...record, goal: event.target.value }))} className="mt-2 h-10 w-full border border-[#D8DBDE] bg-[#FBFBFA] px-3 text-sm outline-none focus:border-[#292A28]" placeholder="Explain the core idea in my own words" /></label><button type="button" onClick={() => setLearningRecord(record => ({ ...record, autoAdvance: !record.autoAdvance }))} className="mt-5 flex w-full items-center justify-between border-t border-[#E2E4E6] pt-4 text-left"><span><span className="block text-sm font-semibold">Auto-play next lesson</span><span className="mt-1 block text-xs leading-5 text-[#777B80]">Move on after an eight-second reflection window, or sooner when you save.</span></span><span className={`relative h-6 w-11 shrink-0 rounded-full transition ${learningRecord.autoAdvance ? "bg-[#292A28]" : "bg-[#CFD2D5]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${learningRecord.autoAdvance ? "left-6" : "left-1"}`} /></span></button></div>

              <div className="border border-[#DCE0E2] bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#83878D]">Lesson notes</p><h2 className="mt-2 font-display text-3xl leading-none">Save the useful moment.</h2></div><NotebookPen className="h-5 w-5 text-[#64686D]" /></div><div className="mt-5 flex gap-2"><input value={noteTimestamp} onChange={(event) => setNoteTimestamp(event.target.value)} className="h-10 w-20 border border-[#D8DBDE] bg-[#FBFBFA] px-2 text-center text-sm outline-none focus:border-[#292A28]" aria-label="Video timestamp" placeholder="00:00" /><input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveNote()} className="h-10 min-w-0 flex-1 border border-[#D8DBDE] bg-[#FBFBFA] px-3 text-sm outline-none focus:border-[#292A28]" placeholder="Write a short note…" /><Button type="button" onClick={saveNote} disabled={!noteDraft.trim()} className="h-10 bg-[#252624] px-3 text-xs text-white hover:bg-[#50534F]">Save</Button></div>{activeNotes.length > 0 ? <ul className="mt-4 divide-y divide-[#E4E6E8] border-t border-[#E4E6E8]">{activeNotes.slice().reverse().map(note => <li key={note.id} className="flex gap-3 py-3 text-sm leading-5"><span className="shrink-0 font-mono text-xs text-[#777B80]">{note.timestamp}</span><span>{note.text}</span></li>)}</ul> : <p className="mt-4 text-xs leading-5 text-[#85898E]">Notes are saved for this lesson in this browser.</p>}</div>
            </aside>
          </section>
        ) : (
          <div className="flex min-h-[55vh] flex-col items-center justify-center border border-dashed border-[#CDD1D5] bg-white px-6 text-center"><Sparkles className="h-6 w-6 text-[#777C83]" /><h2 className="mt-5 font-display text-4xl">No course assembled yet.</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#73777C]">{liveSearch.data?.message || "Try a clearer topic, such as “intro to Python” or “French Revolution.”"}</p><Button type="button" onClick={() => setLocation("/")} variant="outline" className="mt-6 border-[#BFC3C7] bg-white text-[#292A28] hover:bg-[#F0F1F2]">Return to the library <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
        )}
      </main>
    </div>
  );
}
