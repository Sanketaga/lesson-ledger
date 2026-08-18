import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDuration, mapInvidiousResults, mapPipedResults, searchEducationalVideos } from "./liveSearch";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("live search result mapping", () => {
  it("formats provider durations predictably", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3665)).toBe("1:01:05");
    expect(formatDuration(0)).toBe("On demand");
  });

  it("keeps only usable Invidious video records", () => {
    const results = mapInvidiousResults([
      { type: "channel", author: "not a video" },
      {
        type: "video",
        videoId: "abc123",
        title: "A useful lesson",
        author: "Example Channel",
        lengthSeconds: 125,
        description: "A concise overview.",
        videoThumbnails: [{ quality: "medium", url: "https://image.example/thumb.jpg" }],
      },
    ]);

    expect(results).toEqual([
      expect.objectContaining({ videoId: "abc123", duration: "2:05", provider: "invidious" }),
    ]);
  });

  it("maps Piped stream results into the shared live-video shape", () => {
    const results = mapPipedResults({
      items: [
        {
          type: "stream",
          url: "/watch?v=xyz987",
          title: "A second lesson",
          uploaderName: "Example Teacher",
          thumbnail: "https://image.example/thumb.jpg",
          duration: "10:22",
        },
      ],
    });

    expect(results).toEqual([
      expect.objectContaining({ videoId: "xyz987", duration: "10:22", provider: "piped" }),
    ]);
  });

  it("reports a clear no-result state when providers respond without matching videos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await expect(searchEducationalVideos("vifdfeosa")).resolves.toMatchObject({
      status: "empty",
      results: [],
    });
  });

  it("keeps the local shelf viable when every optional provider is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

    await expect(searchEducationalVideos("python programming")).resolves.toMatchObject({
      status: "unavailable",
      results: [],
    });
  });
});
