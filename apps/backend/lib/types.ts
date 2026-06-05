export interface Source {
  id: number
  url: string
  title: string
  score: number
  date?: string
}

export interface Citation {
  id: number
  url: string
  title: string
  snippet: string
}

export interface PipelineInput {
  query: string
  focus?: FocusMode
  history?: { role: "user" | "assistant"; content: string }[]
}

export type FocusMode = "all" | "academic" | "writing" | "news" | "video"

export interface QueryAnalysis {
  original: string
  rewritten: string
  intent: "factual" | "comparison" | "how-to" | "explanatory" | "recent" | "general"
  subQueries: string[]
  entities: string[]
  needsRecency: boolean
}

export interface RetrievalResult {
  url: string
  title: string
  content: string
  snippet: string
  date?: string
  score: number
}

export interface RerankedSource {
  id: number
  url: string
  title: string
  content: string
  snippet: string
  date?: string
  score: number
  quality: number
}

export interface AssembledContext {
  sources: RerankedSource[]
  prompt: string
}

export interface PipelineMetadata {
  queryAnalysis: QueryAnalysis
  retrievalCount: number
  rerankedCount: number
  model: string
  latencyMs: number
}

export interface PipelineOutput {
  answer: string
  citations: Citation[]
  sources: Source[]
  metadata: PipelineMetadata
  followUps: string[]
}

export interface PipelineEvent {
  stage: string
  data?: unknown
  error?: string
}
