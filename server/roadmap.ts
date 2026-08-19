export type RoadmapModule = {
  id: string;
  stage: number;
  title: string;
  objective: string;
  searchQuery: string;
  keywords: string[];
};

export type LearningRoadmap = {
  topic: string;
  track: string;
  modules: RoadmapModule[];
};

type ModuleDefinition = Omit<RoadmapModule, "stage" | "searchQuery"> & { querySuffix: string };

const LANGUAGE_TOPICS = new Set(["hindi", "spanish", "french", "german", "japanese", "korean", "arabic", "english"]);
const PROGRAMMING_TERMS = /\b(?:python|javascript|typescript|java|c\+\+|c#|ruby|php|go|golang|rust|kotlin|swift|sql|html|css|react|angular|vue|node|programming|coding|web development|data structures|algorithms|machine learning|neural network|llm)\b/i;
const ACADEMIC_TERMS = /\b(?:calculus|mathematics|maths|algebra|geometry|statistics|probability|physics|chemistry|biology|economics|accounting|history|psychology|philosophy|biology)\b/i;
const PRACTICAL_TERMS = /\b(?:cooking|baking|photography|drawing|painting|guitar|piano|music theory|fitness|yoga|gardening|sewing|woodworking|design|public speaking)\b/i;

function displayTopic(topic: string) {
  return topic.replace(/\b\w/g, letter => letter.toUpperCase());
}

function module(definition: ModuleDefinition, subject: string, stage: number): RoadmapModule {
  return {
    id: definition.id,
    stage,
    title: definition.title,
    objective: definition.objective,
    searchQuery: `${subject} ${definition.querySuffix} tutorial`,
    keywords: definition.keywords,
  };
}

function definitionsFor(topic: string): { track: string; definitions: ModuleDefinition[] } {
  if (LANGUAGE_TOPICS.has(topic)) {
    return {
      track: "Language learning",
      definitions: [
        { id: "sounds", title: "Sounds & script", objective: "Recognize the sound system and writing system before memorizing words.", querySuffix: "alphabet script pronunciation sounds beginner lesson", keywords: ["alphabet", "script", "pronunciation", "sounds", "letters"] },
        { id: "everyday-words", title: "Everyday words", objective: "Build a useful starter vocabulary for real situations.", querySuffix: "essential vocabulary common words phrases beginner", keywords: ["vocabulary", "words", "phrases", "common"] },
        { id: "sentence-building", title: "Sentence building", objective: "Learn the grammar patterns needed to make your own sentences.", querySuffix: "grammar sentence structure verbs beginner", keywords: ["grammar", "sentence", "verbs", "structure"] },
        { id: "guided-dialogue", title: "Guided dialogue", objective: "Follow short dialogues and respond in everyday contexts.", querySuffix: "beginner conversation listening speaking lesson", keywords: ["conversation", "dialogue", "speaking", "listening"] },
        { id: "real-practice", title: "Real practice", objective: "Apply the language through structured conversations and exercises.", querySuffix: "conversation practice exercises beginner", keywords: ["practice", "exercise", "conversation", "fluency"] },
      ],
    };
  }

  if (PROGRAMMING_TERMS.test(topic)) {
    return {
      track: "Programming",
      definitions: [
        { id: "setup", title: "Setup & first program", objective: "Prepare the tools and run a small first program with confidence.", querySuffix: "setup installation first program beginner", keywords: ["setup", "install", "environment", "first program", "getting started"] },
        { id: "foundations", title: "Syntax & data", objective: "Understand the language building blocks, values, and data types.", querySuffix: "syntax variables data types basics", keywords: ["syntax", "variables", "data types", "strings", "numbers"] },
        { id: "logic", title: "Logic & functions", objective: "Use control flow and reusable functions to express program logic.", querySuffix: "conditions loops functions tutorial", keywords: ["conditions", "loops", "functions", "control flow"] },
        { id: "real-programs", title: "Files, modules & errors", objective: "Work with real program structure, reusable modules, and debugging.", querySuffix: "files modules error handling debugging", keywords: ["files", "modules", "errors", "debugging", "libraries"] },
        { id: "project", title: "Guided project", objective: "Combine the foundations in one small, complete project.", querySuffix: "beginner project build tutorial", keywords: ["project", "build", "application", "automation"] },
      ],
    };
  }

  if (ACADEMIC_TERMS.test(topic)) {
    return {
      track: "Academic subject",
      definitions: [
        { id: "orientation", title: "Orientation & prerequisites", objective: "Know what the subject studies and the prerequisite ideas to review.", querySuffix: "introduction prerequisites fundamentals", keywords: ["introduction", "overview", "fundamentals", "prerequisites"] },
        { id: "definitions", title: "Core definitions", objective: "Learn the key terms, quantities, and definitions precisely.", querySuffix: "core definitions concepts explained", keywords: ["definitions", "concepts", "theory", "principles"] },
        { id: "methods", title: "Methods & representations", objective: "See the main methods, notation, and representations used in the subject.", querySuffix: "methods notation techniques tutorial", keywords: ["methods", "notation", "techniques", "formulas"] },
        { id: "problem-solving", title: "Problem-solving techniques", objective: "Turn concepts into a repeatable approach for solving problems.", querySuffix: "problem solving techniques examples", keywords: ["problem", "techniques", "examples", "strategy"] },
        { id: "worked-practice", title: "Worked practice", objective: "Practice with guided examples and increasingly independent exercises.", querySuffix: "practice problems worked examples exercises", keywords: ["practice", "problems", "worked examples", "exercises"] },
      ],
    };
  }

  if (PRACTICAL_TERMS.test(topic)) {
    return {
      track: "Practical skill",
      definitions: [
        { id: "setup", title: "Tools, safety & setup", objective: "Understand the essential tools, preparation, and safe working habits.", querySuffix: "tools safety setup beginner basics", keywords: ["tools", "safety", "setup", "equipment"] },
        { id: "fundamentals", title: "Foundational techniques", objective: "Build the core movements or techniques that underpin the skill.", querySuffix: "fundamental techniques basics beginner", keywords: ["fundamentals", "techniques", "basics", "beginner"] },
        { id: "methods", title: "Core methods", objective: "Learn how to select and combine the main methods in real work.", querySuffix: "core methods techniques tutorial", keywords: ["methods", "techniques", "skills", "process"] },
        { id: "guided-task", title: "Guided real-world task", objective: "Follow a complete example from preparation through finish.", querySuffix: "complete beginner task walkthrough", keywords: ["walkthrough", "recipe", "complete", "step by step"] },
        { id: "practice-project", title: "Practice project", objective: "Use the skill independently in a structured practice project.", querySuffix: "practice project beginner tutorial", keywords: ["practice", "project", "exercise", "challenge"] },
      ],
    };
  }

  return {
    track: "General learning",
    definitions: [
      { id: "orientation", title: "Orientation & vocabulary", objective: "Understand the subject, its scope, and its most important terms.", querySuffix: "introduction fundamentals vocabulary", keywords: ["introduction", "fundamentals", "vocabulary", "overview"] },
      { id: "first-principles", title: "First principles", objective: "Build the foundational ideas before trying advanced applications.", querySuffix: "basics for beginners first principles", keywords: ["basics", "beginner", "first principles", "foundations"] },
      { id: "core-concepts", title: "Core concepts", objective: "Connect the concepts that explain how the subject works.", querySuffix: "core concepts explained", keywords: ["concepts", "explained", "principles", "theory"] },
      { id: "methods", title: "Methods & techniques", objective: "Learn the practical methods used to work with the subject.", querySuffix: "methods techniques tutorial", keywords: ["methods", "techniques", "skills", "tutorial"] },
      { id: "applied-practice", title: "Applied practice", objective: "Consolidate learning through guided examples, practice, or a project.", querySuffix: "practice project examples", keywords: ["practice", "project", "examples", "exercise"] },
    ],
  };
}

/** A deterministic, topic-aware roadmap that requires neither an API key nor an external AI service. */
export function buildLearningRoadmap(topic: string): LearningRoadmap {
  const normalizedTopic = topic.trim().toLowerCase();
  const subject = displayTopic(normalizedTopic || "Learning");
  const { track, definitions } = definitionsFor(normalizedTopic);
  return { topic: normalizedTopic, track, modules: definitions.map((definition, stage) => module(definition, subject, stage)) };
}
