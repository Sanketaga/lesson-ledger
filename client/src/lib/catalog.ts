import { normalizeLearningQuery } from "@shared/learningQuery";

export type Topic =
  | "All"
  | "Mathematics"
  | "Science"
  | "History"
  | "Technology";

export type CatalogVideo = {
  id: string;
  title: string;
  channel: string;
  topic: Exclude<Topic, "All">;
  level: "Foundational" | "Intermediate" | "Deep dive" | "Direct link";
  duration: string;
  note: string;
  videoUrl: string;
  embedUrl: string;
  thumbnail: string;
  featured?: boolean;
};

const youtube = (id: string) => ({
  videoUrl: `https://www.youtube.com/watch?v=${id}`,
  embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
});

export const catalog: CatalogVideo[] = [
  {
    id: "neural-network",
    title: "But what is a neural network?",
    channel: "3Blue1Brown",
    topic: "Technology",
    level: "Foundational",
    duration: "19 min",
    note: "A visual starting point for the intuition behind a neural network.",
    featured: true,
    ...youtube("aircAruvnKk"),
  },
  {
    id: "gradient-descent",
    title: "Gradient descent, how neural networks learn",
    channel: "3Blue1Brown",
    topic: "Mathematics",
    level: "Intermediate",
    duration: "21 min",
    note: "Follow the geometry behind optimization, loss, and iterative learning.",
    ...youtube("IHZwWFHWa-w"),
  },
  {
    id: "map-of-mathematics",
    title: "The Map of Mathematics",
    channel: "Domain of Science",
    topic: "Mathematics",
    level: "Foundational",
    duration: "11 min",
    note: "A compact orientation to the many branches of modern mathematics.",
    ...youtube("OmJ-4B-mS-Y"),
  },
  {
    id: "backwards-bicycle",
    title: "The Backwards Brain Bicycle",
    channel: "Smarter Every Day",
    topic: "Science",
    level: "Foundational",
    duration: "10 min",
    note: "A memorable experiment about intuition, practice, and relearning.",
    ...youtube("MFzDaBzBlL0"),
  },
  {
    id: "french-revolution",
    title: "The French Revolution",
    channel: "Crash Course",
    topic: "History",
    level: "Foundational",
    duration: "12 min",
    note: "A brisk, contextual introduction to the causes and turning points of 1789.",
    ...youtube("lTTvKwCylFY"),
  },
  {
    id: "early-computing",
    title: "Early Computing",
    channel: "Crash Course Computer Science",
    topic: "Technology",
    level: "Foundational",
    duration: "12 min",
    note: "Trace the early ideas and machines that shaped modern computing.",
    ...youtube("O5nskjZ_GoI"),
  },
  {
    id: "python-beginners",
    title: "Learn Python - Full Course for Beginners",
    channel: "freeCodeCamp.org",
    topic: "Technology",
    level: "Foundational",
    duration: "4 hr 26 min",
    note: "Build a practical foundation in Python syntax, data structures, functions, and object-oriented programming.",
    ...youtube("rfscVS0vtbw"),
  },
];

export function filterCatalog(topic: Topic, searchTerm: string) {
  const needle = normalizeLearningQuery(searchTerm);
  return catalog.filter((video) => {
    const topicMatches = topic === "All" || video.topic === topic;
    const searchText = [video.title, video.channel, video.topic, video.note, video.level].join(" ").toLowerCase();
    const textMatches = !needle || searchText.includes(needle) || needle.split(" ").every(word => searchText.includes(word));
    return topicMatches && textMatches;
  });
}

export const topics: Array<{ name: Topic; count: number; accent: string }> = [
  { name: "All", count: catalog.length, accent: "bg-[#08756A]" },
  { name: "Mathematics", count: 2, accent: "bg-[#4A648D]" },
  { name: "Science", count: 1, accent: "bg-[#B85C45]" },
  { name: "History", count: 1, accent: "bg-[#9B6B31]" },
  { name: "Technology", count: 3, accent: "bg-[#6C597D]" },
];

export const trailCovers = [
  {
    name: "Science, made tangible",
    topic: "Science" as Topic,
    image: "/manus-storage/lesson-ledger-science_3735e39c.jpg",
    tone: "from-[#18394a]/66 via-[#18394a]/12 to-transparent",
  },
  {
    name: "History in context",
    topic: "History" as Topic,
    image: "/manus-storage/lesson-ledger-humanities_665abbcd.jpg",
    tone: "from-[#492c1c]/68 via-[#492c1c]/12 to-transparent",
  },
  {
    name: "Make & think",
    topic: "Technology" as Topic,
    image: "/manus-storage/lesson-ledger-creativity_b4b70d72.jpg",
    tone: "from-[#263d3a]/68 via-[#263d3a]/12 to-transparent",
  },
];
