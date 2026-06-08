import type { RerankedSource, AssembledContext } from "../types"

const MAX_SOURCE_CHARS = 2500

function trimSourceContent(content: string): string {
  const trimmed = content.trim()
  if (trimmed.length <= MAX_SOURCE_CHARS) return trimmed
  return `${trimmed.slice(0, MAX_SOURCE_CHARS)}\n[... content truncated ...]`
}

export function formatSourceBlocks(sources: RerankedSource[]): string {
  return sources
    .map((s) => {
      const body = trimSourceContent(s.content || s.snippet || "")
      return `<source id="${s.id}">
URL: ${s.url}
Title: ${s.title}
${s.date ? `Date: ${s.date}\n` : ""}Content:
${body}
</source>`
    })
    .join("\n\n")
}

export function assembleContext(
  query: string,
  sources: RerankedSource[],
): AssembledContext {
  const sourceContext = formatSourceBlocks(sources)
  const prompt = `${sourceContext}\n\nQuestion: ${query}`

  return { sources, prompt }
}

export function extractFollowUps(query: string): string[] {
  return [
    `Tell me more about ${query}`,
    `What are the latest developments in ${query}?`,
    `How does ${query} compare to alternatives?`,
  ]
}
