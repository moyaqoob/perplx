export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export const EXAMPLE_QUERIES = [
  "What is the no-communication theorem?",
  "Explain quantum entanglement simply",
  "How does quantum teleportation work?",
]

export const STAGE_ORDER = [
  "query-understanding",
  "retrieval",
  "reranking",
  "assembly",
  "generation",
  "citations",
  "complete",
] as const
