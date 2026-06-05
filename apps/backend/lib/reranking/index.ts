import type { RetrievalResult, RerankedSource } from "../types"

const QUALITY_THRESHOLD = 0.4

export async function multiLayerRerank(
  query: string,
  candidates: RetrievalResult[],
): Promise<{
  sources: RerankedSource[]
  discarded: number
}> {
  // L1: Fast prefilter - remove clearly irrelevant or stale
  let passed = l1Prefilter(query, candidates)
  const l1Discarded = candidates.length - passed.length

  // L2: Cross-encoder style scoring on top candidates
  passed = l2Score(query, passed)
  const topL2 = passed.slice(0, 30)

  // L3: Heavy reranker with quality threshold
  const { ranked, discarded } = l3HeavyRanker(query, topL2)

  const sources: RerankedSource[] = ranked.map((r, i) => ({
    ...r,
    id: i + 1,
    quality: r.score,
  }))

  return {
    sources,
    discarded: l1Discarded + discarded,
  }
}

function l1Prefilter(query: string, candidates: RetrievalResult[]): RetrievalResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  const hasRecency = /\b(202[4-9]|202[0-9])\b/.test(query)

  return candidates.filter((c) => {
    const content = (c.title + " " + c.snippet + " " + (c.content ?? "")).toLowerCase()

    // Must match at least one meaningful term
    const matches = queryTerms.some((t) => content.includes(t))
    if (!matches && queryTerms.length > 0) return false

    // Content must have substance
    const wordCount = (c.content ?? c.snippet).split(/\s+/).length
    if (wordCount < 10) return false

    // Recency filter if query needs fresh content
    if (hasRecency && c.date) {
      const year = parseInt(c.date.slice(0, 4))
      if (year < 2024) return false
    }

    return true
  })
}

function l2Score(query: string, candidates: RetrievalResult[]): RetrievalResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

  return candidates
    .map((c) => {
      const content = (c.title + " " + c.snippet + " " + (c.content ?? "")).toLowerCase()

      const termMatches = queryTerms.filter((t) => content.includes(t)).length
      const termScore = queryTerms.length > 0 ? termMatches / queryTerms.length : 0

      const exactMatch = content.includes(query.toLowerCase()) ? 0.2 : 0

      const score = c.score * 0.4 + termScore * 0.4 + exactMatch * 0.2

      return { ...c, score }
    })
    .sort((a, b) => b.score - a.score)
}

function l3HeavyRanker(
  query: string,
  candidates: RetrievalResult[],
): { ranked: RetrievalResult[]; discarded: number } {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

  const scored = candidates.map((c) => {
    const content = (c.title + " " + c.snippet + " " + (c.content ?? "")).toLowerCase()

    // Depth: longer content with specific claims scores higher
    const wordCount = (c.content ?? c.snippet).split(/\s+/).length
    const depthScore = Math.min(wordCount / 200, 0.15)

    // Freshness bonus
    let freshnessScore = 0
    if (c.date) {
      const year = parseInt(c.date.slice(0, 4))
      freshnessScore = Math.max(0, (year - 2020) * 0.03)
    }

    // Coverage: what fraction of query terms appear
    const coverage = queryTerms.filter((t) => content.includes(t)).length / Math.max(queryTerms.length, 1)

    // Entity mention bonus
    const entityBonus = queryTerms.some((t) => {
      const pattern = new RegExp(`\\b${t}\\b`, "i")
      return pattern.test(c.title)
    }) ? 0.1 : 0

    const combined = coverage * 0.45 + c.score * 0.2 + depthScore + freshnessScore + entityBonus

    return { ...c, score: Math.min(combined, 1) }
  })

  scored.sort((a, b) => b.score - a.score)

  // Apply quality threshold
  const passed = scored.filter((s) => s.score >= QUALITY_THRESHOLD)
  const discarded = scored.length - passed.length

  return {
    ranked: passed.slice(0, 8),
    discarded,
  }
}
