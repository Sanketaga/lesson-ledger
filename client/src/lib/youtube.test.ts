import { describe, expect, it } from "vitest";
import { createManagedPlayerVars, describeYouTubePlayerError, getYouTubeEmbedHost, getYouTubeVideoId } from "./youtube";

describe("managed YouTube player setup", () => {
  it("extracts a video identifier from nocookie and standard embed URLs", () => {
    expect(getYouTubeVideoId("https://www.youtube-nocookie.com/embed/LPZh9BOjkQs?rel=0")).toBe("LPZh9BOjkQs");
    expect(getYouTubeVideoId("https://www.youtube.com/embed/5sLYAQS9sWQ")).toBe("5sLYAQS9sWQ");
    expect(getYouTubeVideoId("not an embed")).toBeNull();
    expect(getYouTubeEmbedHost("https://www.youtube-nocookie.com/embed/LPZh9BOjkQs")).toBe("https://www.youtube-nocookie.com");
    expect(getYouTubeEmbedHost("https://www.youtube.com/embed/LPZh9BOjkQs")).toBeUndefined();
  });

  it("enables the API while retaining course-owned controls and the host origin", () => {
    expect(createManagedPlayerVars("https://lessonledger.example")).toMatchObject({
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      fs: 0,
      playsinline: 1,
      rel: 0,
      origin: "https://lessonledger.example",
    });
  });

  it("turns YouTube embed failures into actionable in-course guidance", () => {
    expect(describeYouTubePlayerError(150)).toContain("does not allow embedded playback");
    expect(describeYouTubePlayerError(100)).toContain("no longer available");
  });
});
