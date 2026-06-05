import type { RerankedSource, AssembledContext } from "../types"

export function assembleContext(
  query: string,
  sources: RerankedSource[],
): AssembledContext {
  const contextBlocks = sources.map((s) => {
    return `<source id="${s.id}">
URL: ${s.url}
Title: ${s.title}
${s.date ? `Date: ${s.date}` : ""}
Content:
${s.content}
</source>`
  })

  const contextStr = contextBlocks.join("\n\n")

  const prompt = buildPrompt(query, contextStr, sources)

  return { sources, prompt }
}

function buildPrompt(
  query: string,
  context: string,
  sources: RerankedSource[],
): string {
  const sourceMeta = sources
    .map((s) => `[${s.id}] ${s.title} - ${s.url}`)
    .join("\n")

  return `You are Perplx, an AI research assistant. Answer the user's question based ONLY on the provided sources. Cite sources inline using [1], [2], etc.

Rules:
- Use information from the sources to answer accurately.
- If the sources don't contain enough information, say so.
- Cite sources next to the specific claim they support using [source_id].
- Use multiple citations where appropriate.
- Format your answer clearly with paragraphs and bullet points where helpful.

Sources:
${context}

Reference:
${sourceMeta}

Question: ${query}`
}

export function extractFollowUps(query: string): string[] {
  return [
    `Tell me more about ${query}`,
    `What are the latest developments in ${query}?`,
    `How does ${query} compare to alternatives?`,
  ]
}
