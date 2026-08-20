import { describe, expect, it } from "vitest";
import { formatNotesDocHtml, formatNotesText, getNotesExportFileName } from "./noteExport";

const note = {
  id: "note-1",
  lessonId: "module:python:setup",
  lessonTitle: "Python setup lesson",
  roadmapModuleTitle: "Setup & first program",
  videoUrl: "https://www.youtube.com/watch?v=setup-video",
  timestamp: "1:15",
  text: "Use the stable Python release.",
  createdAt: 1,
};

describe("multi-format note export", () => {
  it("uses clear filenames for every student-selectable format", () => {
    expect(getNotesExportFileName("Python basics", "txt")).toBe("python-basics-notes.txt");
    expect(getNotesExportFileName("Python basics", "doc")).toBe("python-basics-notes.doc");
    expect(getNotesExportFileName("Python basics", "pdf")).toBe("python-basics-notes.pdf");
    expect(getNotesExportFileName("Python basics", "png")).toBe("python-basics-notes.png");
  });

  it("includes lesson, video link, timestamp, and note text in TXT and DOC exports", () => {
    const text = formatNotesText("Python", [note]);
    const doc = formatNotesDocHtml("Python", [note]);
    for (const exportContent of [text, doc]) {
      expect(exportContent).toContain("Python setup lesson");
      expect(exportContent).toContain("https://www.youtube.com/watch?v=setup-video");
      expect(exportContent).toContain("1:15");
      expect(exportContent).toContain("Use the stable Python release.");
    }
  });
});
