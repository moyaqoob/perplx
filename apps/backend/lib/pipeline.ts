import type {
  PipelineInput,
  PipelineOutput,
  PipelineEvent,
  PipelineMetadata,
  QueryAnalysis,
  RetrievalResult,
  RerankedSource,
} from "./types"
import { analyzeQuery } from "./query-understanding"
import { hybridRetrieve } from "./retrieval"
import { multiLayerRerank } from "./reranking"
import { assembleContext, extractFollowUps } from "./assembly"
import { generateAnswer } from "./generation"
import { bindCitations } from "./citations"

export async function* runPipeline(
  input: PipelineInput,
): AsyncGenerator<PipelineEvent, PipelineOutput, unknown> {
  const startTime = Date.now()
  let answer = ""
  let analysis!: QueryAnalysis
  let retrievalResults: RetrievalResult[] = []
  let rerankedSources: RerankedSource[] = []
  let discardedCount = 0

  // Stage 1: Query Understanding
  yield { stage: "query-understanding", data: { query: input.query } }
  analysis = await analyzeQuery(input.query, input.focus)
  yield {
    stage: "query-understanding",
    data: {
      intent: analysis.intent,
      subQueries: analysis.subQueries,
      entities: analysis.entities,
      needsRecency: analysis.needsRecency,
    },
  }

  // Stage 2: Hybrid Retrieval (BM25 + semantic)
  yield { stage: "retrieval", data: { query: analysis.rewritten, subQueries: analysis.subQueries } }
  retrievalResults = await hybridRetrieve(analysis)
  yield {
    stage: "retrieval",
    data: { count: retrievalResults.length, topScore: retrievalResults[0]?.score ?? 0 },
  }

  // Stage 3: Multi-Layer Reranking (L1 → L2 → L3)
  yield { stage: "reranking", data: { candidates: retrievalResults.length } }
  const reranked = await multiLayerRerank(analysis.rewritten, retrievalResults)
  rerankedSources = reranked.sources
  discardedCount = reranked.discarded
  yield {
    stage: "reranking",
    data: {
      passed: rerankedSources.length,
      discarded: discardedCount,
      threshold: 0.4,
    },
  }

  // Stage 4: Prompt Assembly with pre-embedded citations
  yield { stage: "assembly", data: { sources: rerankedSources.length } }
  const assembled = assembleContext(analysis.rewritten, rerankedSources)
  yield { stage: "assembly", data: { promptLength: assembled.prompt.length } }

  // Stage 5: Constrained LLM Synthesis (streaming)
  yield { stage: "generation", data: { model: "mock-llm-4o", sources: rerankedSources.length } }

  const stream = generateAnswer(assembled.prompt, rerankedSources)
  for await (const chunk of stream) {
    answer += chunk
    yield { stage: "generation", data: { chunk } }
  }

  // Stage 6: Citation Binding & Post-Processing
  const { citations, sources_out } = bindCitations(rerankedSources)
  const followUps = extractFollowUps(analysis.original)
  const latencyMs = Date.now() - startTime

  yield {
    stage: "citations",
    data: { citations, sources: sources_out, followUps, latencyMs },
  }

  yield { stage: "complete", data: { latencyMs } }

  const metadata: PipelineMetadata = {
    queryAnalysis: analysis,
    retrievalCount: retrievalResults.length,
    rerankedCount: rerankedSources.length,
    model: "mock-llm-4o",
    latencyMs,
  }

  return {
    answer,
    citations,
    sources: sources_out,
    metadata,
    followUps,
  }
}
