import type { Source } from "./types"

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

export function computeConfidenceScore(answer: string, sources: Source[]): number {
  if (!answer || sources.length === 0) return 0
  const citationMatches = answer.match(/\[\d+\]/g)
  const numCitations = citationMatches?.length || 0
  const avgScore = sources.reduce((s, src) => s + src.score, 0) / sources.length
  const score = (numCitations / Math.max(answer.length, 1)) * avgScore * 100
  return Math.min(1, Math.max(0, score * 2))
}

export function renderAnswerWithCitations(
  text: string,
  sources: Source[],
  highlightSource: (id: number | null) => void,
) {
  if (!text) return null
  const parts = text.split(/(\[\d+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/)
        if (match) {
          const idStr = match[1]
          if (!idStr) return <span key={i}>{part}</span>
          const id = parseInt(idStr)
          return (
            <span
              key={i}
              className="citation-marker"
              onMouseEnter={() => highlightSource(id)}
              onMouseLeave={() => highlightSource(null)}
            >
              [{id}]
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
