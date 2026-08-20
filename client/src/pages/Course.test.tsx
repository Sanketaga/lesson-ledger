// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Course from "./Course";

const setLocation = vi.fn();
const mocks = vi.hoisted(() => ({ liveSearchData: undefined as any }));

vi.mock("wouter", () => ({
  useLocation: () => ["/learn/python", setLocation],
  useParams: () => ({ query: "python" }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    liveSearch: {
      search: {
        useQuery: () => ({ data: mocks.liveSearchData, isFetching: false }),
      },
    },
  },
}));

vi.mock("@/lib/youtube", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/youtube")>();
  return { ...actual, loadYouTubeIframeApi: () => Promise.reject(new Error("Not needed for notes UI testing")) };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("Course timestamped notes", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    setLocation.mockClear();
    mocks.liveSearchData = undefined;
  });

  const liveCourse = (setupVideoId: string) => ({
    roadmap: {
      topic: "python",
      track: "Programming",
      modules: [
        { id: "setup", stage: 0, title: "Setup & first program", objective: "Prepare tools.", searchQuery: "python setup", keywords: ["setup"] },
        { id: "foundations", stage: 1, title: "Syntax & data", objective: "Learn syntax.", searchQuery: "python syntax", keywords: ["syntax"] },
        { id: "logic", stage: 2, title: "Logic & functions", objective: "Write logic.", searchQuery: "python functions", keywords: ["functions"] },
      ],
    },
    results: [
      { provider: "youtube", videoId: setupVideoId, title: "Python setup lesson", channel: "Teacher", duration: "5:00", note: "Setup lesson", thumbnail: "", roadmapModuleId: "setup", roadmapModuleTitle: "Setup & first program", roadmapModuleObjective: "Prepare tools." },
      { provider: "youtube", videoId: "syntax-video", title: "Python syntax lesson", channel: "Teacher", duration: "5:00", note: "Syntax lesson", thumbnail: "", roadmapModuleId: "foundations", roadmapModuleTitle: "Syntax & data", roadmapModuleObjective: "Learn syntax." },
      { provider: "youtube", videoId: "logic-video", title: "Python functions lesson", channel: "Teacher", duration: "5:00", note: "Logic lesson", thumbnail: "", roadmapModuleId: "logic", roadmapModuleTitle: "Logic & functions", roadmapModuleObjective: "Write logic." },
    ],
  });

  it("renders the note editor and saves an active-lesson note at its entered timestamp", async () => {
    const user = userEvent.setup();
    render(<Course />);

    const noteEditor = await screen.findByLabelText("Note for the current lesson");
    await user.type(noteEditor, "Check the interpreter path before the first run.");
    const timestampInput = screen.getByLabelText("Note timestamp");
    fireEvent.change(timestampInput, { target: { value: "1:15" } });
    await user.click(screen.getByRole("button", { name: "Save timestamped note" }));

    expect(await screen.findByText("Check the interpreter path before the first run.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "1:15" })).toBeTruthy();
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("lesson-ledger:learning:python") || "{}");
      expect(stored.notes).toEqual(expect.arrayContaining([
        expect.objectContaining({ timestamp: "1:15", text: "Check the interpreter path before the first run.", lessonId: "lesson:catalog-python-beginners" }),
      ]));
    });
  });

  it("keeps a saved note visible when live discovery replaces the video for the same roadmap module", async () => {
    mocks.liveSearchData = liveCourse("initial-setup-video");
    const user = userEvent.setup();
    const view = render(<Course />);

    await user.type(await screen.findByLabelText("Note for the current lesson"), "Use the official installer for this step.");
    await user.click(screen.getByRole("button", { name: "Save timestamped note" }));
    expect(await screen.findByText("Use the official installer for this step.")).toBeTruthy();

    mocks.liveSearchData = liveCourse("replacement-setup-video");
    view.rerender(<Course />);

    expect(await screen.findByText("Use the official installer for this step.")).toBeTruthy();
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("lesson-ledger:learning:python") || "{}");
      expect(stored.notes[0].lessonId).toBe("module:python:setup");
    });
  });

  it("gives clear save feedback and downloads notes with lesson links", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:notes-download");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<Course />);

    await user.click(screen.getByRole("button", { name: "Save timestamped note" }));
    expect(await screen.findByText("Write a note before saving it.")).toBeTruthy();
    await user.type(screen.getByLabelText("Note for the current lesson"), "Confirm the install path.");
    await user.click(screen.getByRole("button", { name: "Save timestamped note" }));
    await user.click(screen.getByRole("button", { name: "Preview export" }));
    const preview = await screen.findByLabelText("Notes export preview");
    expect(preview.textContent).toContain("Confirm the install path.");
    expect(preview.textContent).toMatch(/https:\/\/www\.youtube\.com\/watch\?v=/);
    await user.click(screen.getByRole("button", { name: "Download notes (.md)" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(await screen.findByText("Notes downloaded with lesson links and timestamps.")).toBeTruthy();
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
