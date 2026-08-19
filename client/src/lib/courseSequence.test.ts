import { describe, expect, it } from "vitest";
import { dedupeCourseSequence } from "./courseSequence";

describe("combined course sequencing", () => {
  it("keeps only one complete-course overview when catalog and live results overlap", () => {
    expect(dedupeCourseSequence([
      { id: "catalog-course", title: "Learn Python - Full Course for Beginners" },
      { id: "live-course", title: "Python Tutorial for Beginners - Learn Python in 5 Hours [FULL COURSE]" },
      { id: "university-course", title: "Introduction to Programming with Python – Full University Course" },
      { id: "basics", title: "Python basics for beginners" },
    ]).map(item => item.id)).toEqual(["catalog-course", "basics"]);
  });
});
