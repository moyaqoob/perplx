import type { RerankedSource, Citation, Source } from "../types"

export function bindCitations(
  sources: RerankedSource[],
): { citations: Citation[]; sources_out: Source[] } {
  const citations: Citation[] = sources.map((s) => ({
    id: s.id,
    url: s.url,
    title: s.title,
    snippet: s.content.slice(0, 200).trim() + "...",
  }))

  const sources_out: Source[] = sources.map((s) => ({
    id: s.id,
    url: s.url,
    title: s.title,
    score: s.score,
    date: s.date,
  }))

  return { citations, sources_out }
}
