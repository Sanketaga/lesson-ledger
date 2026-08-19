import { describe, expect, it } from "vitest";
import { createLessonSnapshot, formatCourseTime } from "./snapshot";

describe("course snapshots", () => {
  it("formats the course timer predictably", () => {
    expect(formatCourseTime(0)).toBe("0:00");
    expect(formatCourseTime(65.8)).toBe("1:05");
  });

  it("creates a self-contained SVG without exposing raw lesson markup", () => {
    const snapshot = createLessonSnapshot({
      courseTitle: "neural network",
      lessonTitle: "<script>not markup</script>",
      channel: "Learning Lab",
      duration: "12 min",
      lessonNumber: 1,
      lessonCount: 4,
      currentSecond: 75,
    });
    expect(snapshot).toContain("Lesson Ledger");
    expect(snapshot).toContain("1:15");
    expect(snapshot).not.toContain("<script>");
  });
});
