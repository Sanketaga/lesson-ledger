export type TimestampedNote = {
  id: string;
  lessonId: string;
  timestamp: string;
  text: string;
  createdAt: number;
  lessonTitle?: string;
  videoUrl?: string;
  roadmapModuleTitle?: string;
};

export type LearningRecord = {
  goal: string;
  autoAdvance: boolean;
  activeLessonId: string | null;
  completedLessonIds: string[];
  notes: TimestampedNote[];
  recallAnswers: Record<string, string>;
};

export const EMPTY_LEARNING_RECORD: LearningRecord = {
  goal: "",
  autoAdvance: true,
  activeLessonId: null,
  completedLessonIds: [],
  notes: [],
  recallAnswers: {},
};

export function learningStorageKey(courseQuery: string) {
  return `lesson-ledger:learning:${courseQuery.trim().toLowerCase()}`;
}

/**
 * Keeps notes attached to the learner's curriculum step even if live discovery
 * returns a different teaching video for the same roadmap module on a later visit.
 */
export function learningNoteScopeId(courseQuery: string, lessonId: string, roadmapModuleId?: string) {
  const course = courseQuery.trim().toLowerCase();
  return roadmapModuleId ? `module:${course}:${roadmapModuleId}` : `lesson:${lessonId}`;
}

export function formatNotesDownload(courseTopic: string, notes: TimestampedNote[]) {
  const title = courseTopic.trim() || "Lesson Ledger course";
  const entries = [...notes]
    .sort((left, right) => left.createdAt - right.createdAt)
    .map((note, index) => {
      const lesson = note.roadmapModuleTitle || note.lessonTitle || "Course lesson";
      const video = note.videoUrl
        ? `[${note.lessonTitle || "Open lesson"}](${note.videoUrl})`
        : "Link unavailable for an older saved note";
      return `## ${index + 1}. ${lesson}\n\n- **Timestamp:** ${formatTimestamp(note.timestamp)}\n- **Video:** ${video}\n\n${note.text}`;
    });
  return `# Lesson Ledger notes: ${title}\n\n${entries.length ? entries.join("\n\n---\n\n") : "No timestamped notes have been saved yet."}\n`;
}

export function mergeLearningRecord(value: Partial<LearningRecord> | null | undefined): LearningRecord {
  return {
    goal: typeof value?.goal === "string" ? value.goal : "",
    autoAdvance: typeof value?.autoAdvance === "boolean" ? value.autoAdvance : true,
    activeLessonId: typeof value?.activeLessonId === "string" ? value.activeLessonId : null,
    completedLessonIds: Array.isArray(value?.completedLessonIds) ? value.completedLessonIds.filter((id): id is string => typeof id === "string") : [],
    notes: Array.isArray(value?.notes)
      ? value.notes.filter((note): note is TimestampedNote => Boolean(note) && typeof note.id === "string" && typeof note.lessonId === "string" && typeof note.timestamp === "string" && typeof note.text === "string" && typeof note.createdAt === "number")
      : [],
    recallAnswers: value?.recallAnswers && typeof value.recallAnswers === "object" ? Object.fromEntries(Object.entries(value.recallAnswers).filter(([, answer]) => typeof answer === "string")) : {},
  };
}

export function completeLesson(record: LearningRecord, lessonId: string): LearningRecord {
  return record.completedLessonIds.includes(lessonId)
    ? record
    : { ...record, completedLessonIds: [...record.completedLessonIds, lessonId] };
}

export function formatTimestamp(value: string) {
  const trimmed = value.trim();
  return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(trimmed) ? trimmed : "00:00";
}

/** Formats the player’s live time at second precision for a saved note. */
export function secondsToNoteTimestamp(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

/** Preserves a student-entered timestamp; otherwise records the live player moment at save time. */
export function resolveSavedNoteTimestamp(value: string, isManual: boolean, currentPlayerSeconds: number) {
  return isManual ? formatTimestamp(value) : secondsToNoteTimestamp(currentPlayerSeconds);
}

/** Converts a displayed lesson timestamp into a player position in seconds. */
export function timestampToSeconds(value: string) {
  const parts = formatTimestamp(value).split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
