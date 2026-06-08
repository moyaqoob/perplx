export type StageStatus = "idle" | "active" | "done" | "error"

export interface StageData {
  status: StageStatus
  elapsed: number
  metadata?: string
}

export interface Source {
  id: number
  title: string
  domain: string
  url: string
  score: number
}

export interface SSELogEntry {
  time: number
  event: string
  data: string
}

export interface StageMeta {
  subQueries?: string[]
  entities?: string[]
  intent?: string
  needsRecency?: boolean
  count?: number
  topScore?: number
  passed?: number
  discarded?: number
  threshold?: number
  promptLength?: number
  tokens?: number
  rate?: number
  sourcesCount?: number
  followUpsCount?: number
  latencyMs?: number
  breakdown?: string
  totalMs?: number
  [key: string]: unknown
}
