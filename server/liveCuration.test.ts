import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLearningIntent, curateLearningResults, searchEducationalVideos, type LiveSearchResult } from "./liveSearch";

const result = (videoId: string, title: string): LiveSearchResult => ({
  videoId,
  title,
  channel: "Example Teacher",
  thumbnail: "",
  duration: "8:00",
  note: "A focused Hindi lesson for independent learners.",
  provider: "youtube",
});

describe("learning-intent course curation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("turns Hindi into a beginner language-learning query while preserving explicit media intent", () => {
    expect(buildLearningIntent("Hindi")).toMatchObject({
      topic: "hindi",
      searchQuery: "learn Hindi language for beginners",
      enforceEducationalFocus: true,
    });
    expect(buildLearningIntent("Hindi news")).toMatchObject({
      searchQuery: "hindi news",
      enforceEducationalFocus: false,
    });
  });

  it("rejects entertainment and news, then sequences teaching material from foundations to practice", () => {
    const curated = curateLearningResults([
      result("song", "Best Hindi love songs 2026"),
      result("news", "Hindi news headlines live"),
      result("advice", "How to learn Hindi faster than I did"),
      result("conversation", "Hindi conversation practice for beginners"),
      result("grammar", "Hindi grammar: build simple sentences"),
      result("alphabet", "Learn the Hindi alphabet and pronunciation"),
      result("vocabulary", "Hindi vocabulary: essential everyday words"),
      result("overview-1", "Learn Hindi in 30 minutes - all the basics you need"),
      result("overview-2", "Learn Hindi in 3 hours - all Hindi basics you need"),
    ], buildLearningIntent("Hindi"));

    expect(curated.map(item => item.videoId)).toEqual(["alphabet", "overview-1", "vocabulary", "grammar", "conversation"]);
    expect(curated.find(item => item.videoId === "alphabet")).toMatchObject({ learningStage: "Foundations" });
    expect(curated).not.toEqual(expect.arrayContaining([expect.objectContaining({ videoId: "overview-2" })]));
    expect(curated).not.toEqual(expect.arrayContaining([expect.objectContaining({ videoId: "advice" })]));
  });

  it("applies the same learning progression to a technical topic", () => {
    const curated = curateLearningResults([
      result("music", "Python coding music playlist"),
      result("project", "Build a Python automation project tutorial"),
      result("syntax", "Python syntax and core concepts explained"),
      result("basics", "Python basics for beginners"),
      result("overview", "What is Python? An overview for learners"),
    ], buildLearningIntent("Python"));

    expect(curated.map(item => item.videoId)).toEqual(["overview", "basics", "syntax", "project"]);
    expect(curated.map(item => item.learningStage)).toEqual(["Foundations", "Getting started", "Core concepts", "Applied practice"]);
  });

  it("searches Hindi as a language-learning request and never uses provider songs or headlines to fill the course", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("api.piped.private.coffee")) {
        expect(url).toContain("learn%20Hindi%20language%20for%20beginners");
        return {
          ok: true,
          json: async () => ({
            items: [
              { type: "stream", url: "/watch?v=song", title: "New Hindi love songs", uploaderName: "Music channel", duration: "30:00" },
              { type: "stream", url: "/watch?v=news", title: "Hindi news headlines today", uploaderName: "News channel", duration: "20:00" },
              { type: "stream", url: "/watch?v=alphabet", title: "Learn Hindi alphabet for beginners", uploaderName: "Hindi Teacher", duration: "12:00" },
              { type: "stream", url: "/watch?v=grammar", title: "Hindi grammar lesson: simple sentences", uploaderName: "Hindi Teacher", duration: "10:00" },
              { type: "stream", url: "/watch?v=conversation", title: "Hindi conversation practice", uploaderName: "Hindi Teacher", duration: "9:00" },
            ],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    }));

    await expect(searchEducationalVideos("Hindi")).resolves.toMatchObject({
      status: "ok",
      results: [
        expect.objectContaining({ videoId: "alphabet" }),
        expect.objectContaining({ videoId: "grammar" }),
        expect.objectContaining({ videoId: "conversation" }),
      ],
    });
  });
});
