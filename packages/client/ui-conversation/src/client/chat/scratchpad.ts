/**
 * Detects and separates agent internal scratchpad / monologue (e.g. "Let's see...",
 * "Let's inspect...", "Let's check...", code analysis lines) from the user-facing answer.
 */

export interface SplitScratchpadResult {
  readonly monologue: string | null
  readonly answer: string
}

/** Prefix regexes live in the RegExp constructor: the patterns exceed the
 *  140-column budget and a regex literal cannot wrap across lines. */
const SCRATCHPAD_PREFIX = new RegExp(
  "^(?:Let's\\s+(?:see|check|inspect|examine|read|look|grep|search|edit|update|test|run"
  + '|verify|find|make|trace|plan|review|re-run|do|analyze|summarize)'
  + '|Thinking Process|Thought Process|I will check|I need to check|Let me check)\\b',
  'i',
)

const ENGLISH_SUMMARY_HEADER = new RegExp(
  '\\n\\n+(?=(?:(?:Here is|Summary|In summary|Conclusion|Based on|To summarize)[^\\n]*:'
  + '|\\*{2}(?:Summary|Result|Conclusion)\\*{2}|\\#+\\s+(?:Summary|Result|Conclusion)))',
  'i',
)

/**
 * Check if text begins with an agentic scratchpad / monologue prefix.
 * @param text - assistant message text to test.
 * @returns true when the first non-space run matches a scratchpad opener.
 */
export function isAgentScratchpad(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.trimStart()
  return SCRATCHPAD_PREFIX.test(trimmed)
}

/**
 * Extract monologue and separate it from user-facing answer.
 * @param text - raw text from an assistant message block
 * @returns SplitScratchpadResult with separated monologue and answer
 */
export function splitScratchpad(text: string): SplitScratchpadResult {
  if (!text || typeof text !== 'string') {
    return { monologue: null, answer: text }
  }

  if (!isAgentScratchpad(text)) {
    return { monologue: null, answer: text }
  }

  // 1. Transition to Thai text:
  // Match points where monologue ends (e.g. "Let's summarize ... in Thai." or "\n\n") followed by Thai characters
  const thaiMatch = text.match(/(?:Let's summarize[^\n]*\.\s*|Typecheck passes[^\n]*\.\s*|\n\n+)(?=[\u0E00-\u0E7F])/)
  if (thaiMatch && thaiMatch.index !== undefined) {
    const splitIndex = thaiMatch.index + thaiMatch[0].length
    const monologue = text.slice(0, splitIndex).trim()
    const answer = text.slice(splitIndex).trim()
    if (monologue.length > 0 && answer.length > 0) {
      return { monologue, answer }
    }
  }

  // 2. Transition to English summary headers (e.g. "\n\nHere is the summary:", "## Summary", "**Conclusion**")
  const engMatch = text.match(ENGLISH_SUMMARY_HEADER)
  if (engMatch && engMatch.index !== undefined) {
    const splitIndex = engMatch.index
    const monologue = text.slice(0, splitIndex).trim()
    const answer = text.slice(splitIndex).trim()
    if (monologue.length > 0 && answer.length > 0) {
      return { monologue, answer }
    }
  }

  // 3. Fallback: if Thai text starts after at least 150 characters of monologue
  const firstThai = text.search(/[\u0E00-\u0E7F]/)
  if (firstThai > 150) {
    const beforeThai = text.slice(0, firstThai)
    const lastNewline = beforeThai.lastIndexOf('\n')
    const splitAt = lastNewline !== -1 ? lastNewline + 1 : firstThai
    const monologue = text.slice(0, splitAt).trim()
    const answer = text.slice(splitAt).trim()
    if (monologue.length > 0 && answer.length > 0) {
      return { monologue, answer }
    }
  }

  // If entire text is scratchpad without an answer (e.g. mid-turn narration before tool call)
  return { monologue: text.trim(), answer: '' }
}
