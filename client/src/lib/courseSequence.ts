export type SequencedLesson = {
  id: string;
  title: string;
};

const COMPLETE_COURSE_TITLE = /\b(?:full course|all (?:the )?basics|\b(?:learn|learned)\b.*?\bin\s+\d+\s+(?:minutes?|hours?)|\d+\s+beginner lessons)\b/i;

/** Keeps one course overview when vetted catalog and live discovery return overlapping complete tracks. */
export function dedupeCourseSequence<T extends SequencedLesson>(lessons: T[]) {
  let completeCourseSeen = false;
  return lessons.filter(lesson => {
    if (!COMPLETE_COURSE_TITLE.test(lesson.title)) return true;
    if (completeCourseSeen) return false;
    completeCourseSeen = true;
    return true;
  });
}
