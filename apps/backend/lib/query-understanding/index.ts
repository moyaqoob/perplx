import type { QueryAnalysis, FocusMode } from "../types"

export async function analyzeQuery(
  query: string,
  focus?: FocusMode,
): Promise<QueryAnalysis> {
  const lower = query.toLowerCase()

  const intent = classifyIntent(lower)
  const entities = extractEntities(query)
  const needsRecency = detectRecency(lower)
  const rewritten = rewriteQuery(query, intent, focus)
  const subQueries = decomposeQuery(query, intent)

  return {
    original: query,
    rewritten,
    intent,
    subQueries,
    entities,
    needsRecency,
  }
}

function classifyIntent(query: string): QueryAnalysis["intent"] {
  if (/\b(?:how\s+to|steps?\s+to|guide|tutorial|way\s+to)\b/i.test(query)) return "how-to"
  if (/\b(?:compare|vs\.?|versus|difference|better|pros\s+(?:and|&)\s+cons)\b/i.test(query)) return "comparison"
  if (/\b(?:why|reason|cause|explain|how\s+does|how\s+do)\b/i.test(query)) return "explanatory"
  if (/\b(?:latest|recent|news|update|new\s+|today|this\s+(?:week|month|year))\b/i.test(query)) return "recent"
  if (/\b(?:what|who|which|when|where|define|meaning)\b/i.test(query)) return "factual"
  return "general"
}

function extractEntities(query: string): string[] {
  const entities: string[] = []

  const topicMatch = query.match(/\b(?:what|who|which|about)\s+(?:is|are|was|were)\s+(.+?)(?:\s*[?.!]|$)/i)
  if (topicMatch) {
    entities.push(topicMatch[1].trim())
  }

  const namedMatches = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)
  if (namedMatches) {
    entities.push(...namedMatches)
  }

  const quoted = query.match(/"([^"]+)"/g)
  if (quoted) {
    entities.push(...quoted.map((q) => q.replace(/"/g, "")))
  }

  return [...new Set(entities)].slice(0, 5)
}

function detectRecency(query: string): boolean {
  return /\b(?:latest|recent|news|update|today|this\s+(?:week|month|year)|current|breaking|202[4-9]|202[0-9])\b/i.test(query)
}

function rewriteQuery(query: string, intent: QueryAnalysis["intent"], focus?: FocusMode): string {
  let q = query.trim().replace(/[?.!]+$/, "").trim()

  switch (focus) {
    case "academic":
      q = `${q} scholarly article research paper study`
      break
    case "news":
      q = `${q} latest news 2025 2026`
      break
    case "writing":
      q = q
      break
  }

  return q
}

function decomposeQuery(query: string, intent: QueryAnalysis["intent"]): string[] {
  const subs: string[] = [query]

  if (intent === "comparison") {
    const parts = query.split(/\b(?:vs\.?|versus|and|or)\b/i).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      subs.push(...parts.map((p) => `what is ${p}`))
    }
  }

  if (intent === "explanatory") {
    const match = query.match(/\b(?:how|why|what)\s+(.+)/i)
    if (match) subs.push(`${match[1]} explained`)
  }

  return [...new Set(subs)].slice(0, 3)
}
