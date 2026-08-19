const LEADING_INSTRUCTION = /^(?:(?:can|could|would)\s+you\s+)?(?:(?:please|help me|i(?:'d| would)? like to|i want to|teach me|show me how to)\s+)?(?:(?:learn|study|understand|explore|practice|start|know)\s+)?/i;
const INTRODUCTION = /^(?:(?:an?\s+)?(?:introduction|intro|beginner(?:'s)? guide)\s+to\s+)/i;
const TRAILING_CONTEXT = /\b(?:from scratch|for (?:absolute )?beginners?|basics?)\b/gi;

const TOPIC_ALIASES: Record<string, string> = {
  py: "python",
  javascript: "javascript",
  js: "javascript",
  "neural networks": "neural network",
  "machine learning": "neural network",
  "computer programming": "programming",
  coding: "programming",
};

/** Converts a learner's conversational request into a concise search topic. */
export function normalizeLearningQuery(input: string): string {
  const cleaned = input
    .trim()
    .replace(/^['"“”]+|['"“”]+$/g, "")
    .replace(/[?!]+$/g, "")
    .replace(LEADING_INSTRUCTION, "")
    .replace(INTRODUCTION, "")
    .replace(TRAILING_CONTEXT, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = cleaned.toLowerCase();
  return TOPIC_ALIASES[lower] ?? lower;
}
