import type { RetrievalResult, QueryAnalysis } from "../types"
import { scrapeUrl } from "./scraper"

interface SearchHit {
  url: string
  title: string
  snippet: string
  score: number
  date?: string
  content?: string
}

const TAVILY_API = "https://api.tavily.com/search"

function getTavilyKey(): string {
  const key = process.env.TAVILY_API_KEY
  if (!key) throw new Error("TAVILY_API_KEY is not set")
  return key
}

function getMaxResults(): number {
  return Math.min(Number(process.env.SEARCH_MAX_RESULTS) || 10, 20)
}

export async function hybridRetrieve(
  analysis: QueryAnalysis,
): Promise<RetrievalResult[]> {
  const allQueries = [analysis.rewritten, ...analysis.subQueries]
  const seen = new Set<string>()
  const results: RetrievalResult[] = []

  for (const q of allQueries) {
    const hits = await searchWeb(q)
    for (const hit of hits) {
      if (!hit.url) continue
      const key = hit.url.split("#").shift() ?? hit.url
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          url: hit.url,
          title: hit.title ?? "",
          content: hit.content ?? hit.snippet ?? "",
          snippet: hit.snippet ?? "",
          date: hit.date,
          score: hit.score ?? 0,
        })
      }
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, getMaxResults())
}

async function searchWeb(query: string): Promise<SearchHit[]> {
  try {
    return await tavilySearch(query)
  } catch (err) {
    console.warn(`Tavily search failed for "${query}":`, err)
    console.warn("Falling back to mock results")
    return generateMockHits(query)
  }
}

async function tavilySearch(query: string): Promise<SearchHit[]> {
  const res = await fetch(TAVILY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTavilyKey()}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: Math.min(getMaxResults(), 10),
      include_answer: false,
      include_raw_content: true,
    }),
  })

  if (!res.ok) {
    throw new Error(`Tavily API error: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as {
    results?: Array<{
      url: string
      title: string
      content: string
      raw_content?: string
      score?: number
      published_date?: string
    }>
  }

  if (!data.results?.length) {
    return []
  }

  const hits: SearchHit[] = []
  for (const r of data.results) {
    let content = r.raw_content || r.content || ""
    if (!content || content.length < 100) {
      const scraped = await scrapeUrl(r.url).catch(() => null)
      if (scraped) content = scraped
    }
    hits.push({
      url: r.url,
      title: r.title,
      snippet: r.content?.slice(0, 300) ?? "",
      content: content.slice(0, 5000),
      score: r.score ?? 0.5,
      date: r.published_date,
    })
  }

  hits.sort((a, b) => b.score - a.score)
  return hits
}

function generateMockHits(query: string): SearchHit[] {
  const base: SearchHit[] = [
    {
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
      title: `${query} - Wikipedia`,
      snippet: `Information about ${query}.`,
      score: 0.9,
      content: `${query} is a topic of significant interest. This article provides a comprehensive overview of ${query}, covering its history, key concepts, and modern applications. The field continues to evolve rapidly with new developments emerging regularly.`,
    },
    {
      url: `https://example.com/research/${encodeURIComponent(query)}`,
      title: `Research: ${query} — A Comprehensive Analysis`,
      snippet: `Recent research on ${query} shows promising developments.`,
      score: 0.75,
      content: `Recent advances in ${query} have demonstrated significant progress. Studies indicate that ${query} plays a crucial role in modern technology and science. Researchers continue to explore new applications and implications.`,
    },
  ]

  const queryTerms = query.toLowerCase().split(/\s+/)
  return base.map((hit) => {
    const content = (hit.title + " " + hit.snippet + " " + hit.content).toLowerCase()
    const keywordScore = queryTerms.filter((t) => t.length > 2 && content.includes(t)).length / Math.max(queryTerms.filter((t) => t.length > 2).length, 1)
    const combined = (hit.score * 0.6) + (keywordScore * 0.4)
    return { ...hit, score: Math.min(combined + Math.random() * 0.05, 1) }
  }).sort((a, b) => b.score - a.score)
}
