import { Mistral } from "@mistralai/mistralai"
import type { ContentChunk } from "@mistralai/mistralai/models/components"
import { formatSourceBlocks } from "../assembly"
import type { RerankedSource } from "../types"

const MAX_GENERATION_SOURCES = 5
const MIN_SOURCE_CHARS = 80

let client: Mistral | null = null

function getClient(): Mistral {
  if (!client) {
    const key = process.env.MISTRAL_API_KEY
    if (!key) throw new Error("MISTRAL_API_KEY is not set. Add it to apps/backend/.env")
    client = new Mistral({ apiKey: key })
  }
  return client
}

export function getModel(): string {
  return process.env.LLM_MODEL || "mistral-small-latest"
}

function getTemperature(): number {
  const value = Number(process.env.LLM_TEMPERATURE)
  return Number.isFinite(value) ? value : 0
}

function getMaxTokens(): number {
  return Number(process.env.LLM_MAX_TOKENS) || 2048
}

function extractDeltaText(content: string | ContentChunk[] | null | undefined): string {
  if (!content) return ""
  if (typeof content === "string") return content
  return content
    .map((chunk) => (chunk.type === "text" ? chunk.text : ""))
    .join("")
}

function selectSourcesForGeneration(sources: RerankedSource[]): RerankedSource[] {
  return sources
    .filter((s) => (s.content || s.snippet || "").trim().length >= MIN_SOURCE_CHARS)
    .slice(0, MAX_GENERATION_SOURCES)
    .map((s, i) => ({ ...s, id: i + 1 }))
}

export function prepareSourcesForGeneration(sources: RerankedSource[]): RerankedSource[] {
  return selectSourcesForGeneration(sources)
}

function buildGroundedPrompt(query: string, sources: RerankedSource[]): {
  system: string
  user: string
} {
  const sourceBlocks = formatSourceBlocks(sources)
  const sourceIds = sources.map((s) => s.id).join(", ")

  const system = `You are Perplx, a research assistant. You answer ONLY from the source documents in the user message.

Rules:
1. Every sentence must come from the sources. Do not use outside knowledge.
2. Every factual sentence must end with a citation [N] using a valid source id (${sourceIds}).
3. If the sources cannot answer the question, reply ONLY with: "The provided sources do not contain enough information to answer this question." Then briefly list what the sources do say, each with citations.
4. Do not invent facts, numbers, dates, names, or quotes.
5. Do not repeat sentences. Write once, clearly and concisely.
6. Do not add introductions, conclusions, or filler.`

  const user = `${sourceBlocks}

Question: ${query}

Answer using ONLY the sources above. Cite every claim.`

  return { system, user }
}

export async function* generateAnswer(
  query: string,
  sources: RerankedSource[],
): AsyncGenerator<string> {
  if (sources.length === 0) {
    yield "I couldn't find any relevant sources to answer this question. Try rephrasing your query."
    return
  }

  const { system, user } = buildGroundedPrompt(query, sources)

  try {
    const stream = await getClient().chat.stream({
      model: getModel(),
      temperature: getTemperature(),
      maxTokens: getMaxTokens(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    })

    for await (const event of stream) {
      const text = extractDeltaText(event.data?.choices[0]?.delta?.content)
      if (text) yield text
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Mistral generation error:", message)

    if (message.includes("API key") || message.includes("Unauthorized")) {
      yield "⚠️ **LLM not configured.** Set `MISTRAL_API_KEY` in `apps/backend/.env` to enable AI-powered answers.\n\n"
      return
    }

    yield fallbackGeneration(query, sources)
  }
}

function fallbackGeneration(query: string, sources: RerankedSource[]): string {
  const parts: string[] = [
    `The provided sources contain the following about **${query}**:\n\n`,
  ]

  for (const source of sources) {
    const excerpt = (source.content || source.snippet)?.slice(0, 400).trim()
    if (excerpt) {
      parts.push(`[${source.id}] ${excerpt}\n\n`)
    }
  }

  return parts.join("")
}
