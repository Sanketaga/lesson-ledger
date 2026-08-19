import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCurriculumSearchQueries, buildLearningIntent, curateLearningResults, searchEducationalVideos, type LiveSearchResult } from "./liveSearch";
import { buildLearningRoadmap } from "./roadmap";

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

  it("plans named roadmap-module discovery queries instead of relying on one broad search", () => {
    expect(buildCurriculumSearchQueries(buildLearningIntent("Python"))).toEqual([
      "Python setup installation first program beginner tutorial",
      "Python syntax variables data types basics tutorial",
      "Python conditions loops functions tutorial tutorial",
      "Python files modules error handling debugging tutorial",
      "Python beginner project build tutorial tutorial",
    ]);
  });

  it("selects one lesson for each Python roadmap module instead of stacking beginner courses", () => {
    const intent = buildLearningIntent("Python");
    const roadmap = buildLearningRoadmap(intent.topic);
    const curated = curateLearningResults([
      result("setup", "Python setup: install tools and run your first program"),
      result("syntax", "Python syntax, variables, and data types tutorial"),
      result("logic", "Python conditions, loops, and functions tutorial"),
      result("files", "Python files, modules, and debugging tutorial"),
      result("project", "Build a Python automation project for beginners"),
      result("duplicate", "Python crash course for beginners"),
    ], intent, roadmap);

    expect(curated.map(item => item.roadmapModuleId)).toEqual(["setup", "foundations", "logic", "real-programs", "project"]);
    expect(curated.map(item => item.roadmapModuleTitle)).toEqual([
      "Setup & first program", "Syntax & data", "Logic & functions", "Files, modules & errors", "Guided project",
    ]);
  });

  it("avoids duplicate full-course tracks while retaining distinct roadmap modules across subject types", () => {
    ["Python", "Calculus", "Cooking", "Hindi"].forEach(topic => {
      const intent = buildLearningIntent(topic);
      const roadmap = buildLearningRoadmap(intent.topic);
      const curated = curateLearningResults([
        result("full-one", `${topic} Full Course for Beginners`),
        result("full-two", `Learn ${topic} in 4 Hours - Full Course`),
        result("basics", `${topic} basics and core concepts tutorial`),
        result("practice", `${topic} practice project walkthrough`),
      ], intent, roadmap);

      expect(curated.filter(item => /full course/i.test(item.title))).toHaveLength(1);
      expect(new Set(curated.map(item => item.roadmapModuleId)).size).toBe(curated.length);
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

  it("keeps one complete-course overview and rejects first-person study advice for a general topic", () => {
    const curated = curateLearningResults([
      result("course-one", "Learn Python in 2 Hours - Full Course for Beginners"),
      result("course-two", "Python Full Course for Beginners"),
      result("advice", "How I would learn Python fast if I started over"),
      result("project", "Build a Python automation project tutorial"),
    ], buildLearningIntent("Python"));

    expect(curated.map(item => item.videoId)).toEqual(["course-one", "project"]);
  });

  it("excludes ultra-short clips while retaining substantive and unknown-duration instructional lessons", () => {
    const short = { ...result("short", "Python tutorial for beginners"), duration: "0:05" };
    const lesson = { ...result("lesson", "Python tutorial for beginners"), duration: "5:00" };
    const unknownDuration = { ...result("unknown", "Python concepts explained"), duration: "On demand" };

    expect(curateLearningResults([short, lesson, unknownDuration], buildLearningIntent("Python")).map(item => item.videoId)).toEqual(["unknown", "lesson"]);
  });

  it("removes first-person advice and English-learning detours from a practical subject course", () => {
    const cookingLesson = result("lesson", "Cooking basics: knife skills tutorial");
    const advice = result("advice", "How I would learn to cook if I could start over");
    const languageDetour = result("english", "How to Cook in English: Cooking Vocabulary");

    expect(curateLearningResults([advice, languageDetour, cookingLesson], buildLearningIntent("Cooking")).map(item => item.videoId)).toEqual(["lesson"]);
  });

  it("sequences representative academic and practical topics through learning stages", () => {
    const calculus = curateLearningResults([
      result("practice", "Calculus practice problems walkthrough"),
      result("skills", "Calculus derivative techniques and skills"),
      result("basics", "Calculus basics for beginners"),
      result("foundation", "What is calculus? Introduction and fundamentals"),
    ], buildLearningIntent("Calculus"));
    const cooking = curateLearningResults([
      result("practice", "Cooking practice: build a weeknight meal"),
      result("skills", "Essential cooking skills and techniques"),
      result("basics", "Cooking basics for beginners"),
      result("foundation", "Introduction to cooking fundamentals"),
    ], buildLearningIntent("Cooking"));

    expect(calculus.map(item => item.learningStage)).toEqual(["Foundations", "Getting started", "Structured skills", "Applied practice"]);
    expect(cooking.map(item => item.learningStage)).toEqual(["Foundations", "Getting started", "Structured skills", "Applied practice"]);
  });

  it("prevents academic and practical courses from collapsing into a stack of introductory lessons", () => {
    const curated = curateLearningResults([
      result("foundation-one", "Calculus introduction and fundamentals"),
      result("foundation-two", "What is calculus? An overview"),
      result("foundation-three", "Calculus introduction for students"),
      result("beginner-one", "Calculus basics for beginners"),
      result("beginner-two", "Calculus first lesson"),
      result("beginner-three", "Calculus getting started guide"),
      result("core", "Calculus concepts and methods explained"),
      result("skills", "Calculus derivative techniques and skills"),
      result("practice", "Calculus practice problems walkthrough"),
    ], buildLearningIntent("Calculus"));

    expect(curated.map(item => item.learningStage)).toEqual([
      "Foundations", "Foundations", "Getting started", "Getting started", "Core concepts", "Structured skills", "Applied practice",
    ]);
  });

  it("keeps explicit skills and practice signals when an early discovery query returns them", () => {
    const curated = curateLearningResults([
      { ...result("skills", "How to master basic cooking skills"), curriculumStageHint: 1 },
      { ...result("practice", "Calculus practice problems walkthrough"), curriculumStageHint: 1 },
    ], buildLearningIntent("Cooking"));

    expect(curated.map(item => item.learningStage)).toEqual(["Structured skills", "Applied practice"]);
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
