"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import type { Source, StageData, SSELogEntry, StageMeta } from "./types"
import { API_BASE, EXAMPLE_QUERIES, STAGE_ORDER } from "./constants"
import { extractDomain, computeConfidenceScore, renderAnswerWithCitations } from "./utils"
import { AuthModal } from "./components/auth-modal"
import { ConfidenceBadge } from "./components/confidence-badge"
import { ConfidenceCurve } from "./components/confidence-curve"
import { StageMetadata } from "./components/stage-metadata"
import { LatencyWaterfall } from "./components/latency-waterfall"
import { SourceCard } from "./components/source-card"
import { SemanticHeatmap } from "./components/semantic-heatmap"
import { KnowledgeGraph } from "./components/knowledge-graph"

export default function Home() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [stages, setStages] = useState<Record<string, StageData>>({})
  const [answer, setAnswer] = useState("")
  const [sources, setSources] = useState<Source[]>([])
  const [followUps, setFollowUps] = useState<string[]>([])
  const [highlightedSource, setHighlightedSource] = useState<number | null>(null)
  const [sseLog, setSseLog] = useState<SSELogEntry[]>([])
  const [sseOpen, setSseOpen] = useState(false)
  const [latencyEntries, setLatencyEntries] = useState<{ stage: string; time: number }[]>([])
  const [tokenCount, setTokenCount] = useState(0)
  const [showPullQuote, setShowPullQuote] = useState(false)
  const [complete, setComplete] = useState(false)
  const [tokenRate, setTokenRate] = useState(0)
  const [stageMeta, setStageMeta] = useState<Record<string, StageMeta>>({})
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)
  const tokenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenStartRef = useRef(0)
  const tokenCountRef = useRef(0)
  const generationStartedRef = useRef(false)

  const highlightSource = useCallback((id: number | null) => {
    setHighlightedSource(id)
  }, [])

  function initStages() {
    const s: Record<string, StageData> = {}
    STAGE_ORDER.forEach((st) => {
      s[st] = { status: "idle", elapsed: 0 }
    })
    return s
  }

  async function runPipeline(searchQuery: string) {
    setComplete(false)
    setShowPullQuote(false)
    setAnswer("")
    setTokenCount(0)
    setTokenRate(0)
    tokenCountRef.current = 0
    generationStartedRef.current = false
    setStages(initStages())
    setSources([])
    setFollowUps([])
    setLatencyEntries([])
    setSseLog([])
    setStageMeta({})
    setHighlightedSource(null)
    setLoading(true)
    setCurrentStage("query-understanding")

    if (tokenIntervalRef.current) {
      clearInterval(tokenIntervalRef.current)
      tokenIntervalRef.current = null
    }

    const controller = new AbortController()
    setAbortController(controller)

    const sseEntries: SSELogEntry[] = []
    const latencyData: { stage: string; time: number }[] = []
    const startTime = performance.now()
    let lastEventTime = startTime

    function logEvent(event: string, payload: string = "") {
      const elapsed = Math.round(performance.now() - startTime)
      sseEntries.push({ time: elapsed, event, data: payload })
      setSseLog([...sseEntries])
    }

    function advanceStage(stage: string, elapsed?: number) {
      const stageIndex = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number])
      setCurrentStage(stage)
      setStages((prev) => {
        const next = { ...prev }
        if (stageIndex > 0) {
          const prevStage = STAGE_ORDER[stageIndex - 1]
          if (prevStage && next[prevStage]) {
            const dur = elapsed ?? Math.round(performance.now() - lastEventTime)
            next[prevStage] = { ...next[prevStage], status: "done", elapsed: dur }
          }
        }
        if (next[stage]) {
          next[stage] = { ...next[stage], status: "active", elapsed: 0 }
        }
        return next
      })
    }

    function markStageDone(stage: string, elapsed?: number) {
      setStages((prev) => {
        const next = { ...prev }
        if (next[stage]) {
          next[stage] = { ...next[stage], status: "done", elapsed: elapsed ?? Math.round(performance.now() - lastEventTime) }
        }
        return next
      })
    }

    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (!payload) continue

          let event: { stage: string; data?: unknown; error?: string }
          try {
            event = JSON.parse(payload)
          } catch {
            continue
          }

          logEvent(event.stage, payload)

          if (event.error) {
            setCurrentStage(null)
            setLoading(false)
            logEvent("error", event.error)
            return
          }

          const now = performance.now()
          const stageElapsed = Math.round(now - lastEventTime)

          switch (event.stage) {
            case "query-understanding": {
              advanceStage("query-understanding")
              const d = event.data as Record<string, unknown> | undefined
              if (d) {
                setStageMeta((prev) => ({
                  ...prev,
                  "query-understanding": {
                    intent: d.intent as string,
                    subQueries: d.subQueries as string[],
                    entities: d.entities as string[],
                    needsRecency: d.needsRecency as boolean,
                  },
                }))
              }
              break
            }
            case "retrieval": {
              advanceStage("retrieval")
              const d = event.data as Record<string, unknown> | undefined
              if (d) {
                setStageMeta((prev) => ({
                  ...prev,
                  retrieval: { count: d.count as number, topScore: d.topScore as number },
                }))
              }
              break
            }
            case "reranking": {
              advanceStage("reranking")
              const d = event.data as Record<string, unknown> | undefined
              if (d) {
                setStageMeta((prev) => ({
                  ...prev,
                  reranking: { passed: d.passed as number, discarded: d.discarded as number, threshold: d.threshold as number },
                }))
              }
              break
            }
            case "assembly": {
              advanceStage("assembly")
              const d = event.data as Record<string, unknown> | undefined
              if (d) {
                setStageMeta((prev) => ({
                  ...prev,
                  assembly: { promptLength: d.promptLength as number },
                }))
              }
              break
            }
            case "generation": {
              if (!generationStartedRef.current) {
                generationStartedRef.current = true
                advanceStage("generation")
                markStageDone("assembly")
                markStageDone("reranking")
                lastEventTime = now
                tokenStartRef.current = Date.now()
                tokenIntervalRef.current = setInterval(() => {
                  const elapsed = (Date.now() - tokenStartRef.current) / 1000
                  if (elapsed > 0) {
                    setTokenRate(Math.round(tokenCountRef.current / elapsed))
                  }
                }, 500)
              }
              const d = event.data as Record<string, unknown> | undefined
              if (d?.chunk) {
                const chunk = d.chunk as string
                const words = chunk.split(/\s+/).filter(Boolean).length
                tokenCountRef.current += words
                setAnswer((prev) => prev + chunk)
                setTokenCount(tokenCountRef.current)
              }
              break
            }
            case "citations": {
              advanceStage("citations")
              markStageDone("generation")
              const d = event.data as Record<string, unknown> | undefined
              if (d) {
                const rawSources = d.sources as Array<{ id: number; url: string; title: string; score: number }> | undefined
                if (rawSources) {
                  setSources(
                    rawSources.map((s) => ({
                      id: s.id,
                      title: s.title,
                      domain: extractDomain(s.url),
                      url: s.url,
                      score: s.score,
                    })),
                  )
                }
                setFollowUps((d.followUps as string[]) ?? [])
                setStageMeta((prev) => ({
                  ...prev,
                  citations: {
                    sourcesCount: (d.sources as unknown[])?.length,
                    followUpsCount: (d.followUps as string[])?.length,
                    latencyMs: d.latencyMs as number,
                  },
                }))
              }
              break
            }
            case "complete": {
              advanceStage("complete")
              markStageDone("citations")
              const d = event.data as Record<string, unknown> | undefined
              if (d) {
                const totalMs = d.latencyMs as number
                setStageMeta((prev) => ({
                  ...prev,
                  complete: { totalMs },
                }))
              }
              break
            }
            case "done": {
              setStages((prev) => {
                const next = { ...prev }
                if (next.complete) next.complete = { ...next.complete, status: "done" }
                return next
              })
              if (tokenIntervalRef.current) {
                clearInterval(tokenIntervalRef.current)
                tokenIntervalRef.current = null
              }
              setComplete(true)
              setLoading(false)
              setCurrentStage(null)
              setTimeout(() => setShowPullQuote(true), 300)
              break
            }
          }

          if (event.stage !== "generation") {
            lastEventTime = now
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setLoading(false)
        setCurrentStage(null)
        return
      }
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      logEvent("error", errorMessage)
      setLoading(false)
      setCurrentStage(null)
    }
  }

  const handleSubmit = useCallback(
    (q?: string) => {
      const text = (q ?? query).trim()
      if (!text || loading) return
      if (!q) setQuery("")
      runPipeline(text)
    },
    [query, loading],
  )

  function handleReplay() {
    const q = query.trim() || EXAMPLE_QUERIES[0] || ""
    if (!q) return
    runPipeline(q)
  }

  function handleCancel() {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
    if (tokenIntervalRef.current) {
      clearInterval(tokenIntervalRef.current)
      tokenIntervalRef.current = null
    }
    setLoading(false)
    setCurrentStage(null)
  }

  useEffect(() => {
    return () => {
      if (tokenIntervalRef.current) clearInterval(tokenIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
      if (e.key === "Escape") {
        inputRef.current?.blur()
        if (loading) {
          handleCancel()
        } else {
          setLoading(false)
          setCurrentStage(null)
        }
      }
      if (e.key === "r" && !e.ctrlKey && !e.metaKey && complete) {
        handleReplay()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [complete, handleReplay, loading])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = []

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1 + Math.random() * 1,
      })
    }

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (loading) {
        particles.forEach((p) => {
          const cx = canvas.width / 2
          const cy = canvas.height / 2
          p.x += (cx - p.x) * 0.003
          p.y += (cy - p.y) * 0.003
          p.vx *= 0.99
          p.vy *= 0.99
        })
      } else {
        particles.forEach((p) => {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0) p.x = canvas.width
          if (p.x > canvas.width) p.x = 0
          if (p.y < 0) p.y = canvas.height
          if (p.y > canvas.height) p.y = 0
        })
      }

      particles.forEach((p) => {
        ctx.fillStyle = "rgba(90, 88, 96, 0.4)"
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i]
        if (!pi) continue
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j]
          if (!pj) continue
          const dx = pi.x - pj.x
          const dy = pi.y - pj.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 80) {
            ctx.strokeStyle = `rgba(90, 88, 96, ${0.15 * (1 - dist / 80)})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(pi.x, pi.y)
            ctx.lineTo(pj.x, pj.y)
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [loading])

  useEffect(() => {
    if (loading) {
      document.title = "Perplx \u00b7 Searching\u2026"
    } else if (complete) {
      const conf = computeConfidenceScore(answer, sources)
      document.title = `Perplx \u00b7 ${Math.round(conf * 100)}% confident`
    } else {
      document.title = "Perplx"
    }
  }, [loading, complete, sources, answer])

  const confidenceScore = useMemo(() => computeConfidenceScore(answer, sources), [answer, sources])

  const isGenerating = currentStage === "generation"
  const isIdle = !loading && !complete && answer === ""
  const isPostGeneration = complete

  return (
    <div className="app">
      <canvas ref={canvasRef} className="particle-canvas" />

      <header className="header">
        <div className="logo">
          <svg className="logo-mark" width="20" height="20" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 11v10h2.8a4.2 4.2 0 0 0 0-8.4H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 20l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span className="logo-text">Perplx</span>
        </div>

        <div className="header-divider" />
        <button className="auth-trigger" onClick={() => setAuthOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 1 0-16 0" />
          </svg>
          <span>Sign in</span>
        </button>

        <div className="header-center">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
          >
            <div className="search-pill">
              <span className={`search-icon ${loading ? "active" : "idle"}`}>
                {loading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 2v4" />
                    <path d="M12 18v4" />
                    <path d="M22 12h-4" />
                    <path d="M6 12H2" />
                    <path d="m4.93 4.93 2.83 2.83" />
                    <path d="m16.24 16.24 2.83 2.83" />
                    <path d="m4.93 19.07 2.83-2.83" />
                    <path d="m16.24 7.76 2.83-2.83" />
                  </svg>
                )}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything..."
                disabled={loading}
              />
              {loading ? (
                <button
                  type="button"
                  className="search-arrow"
                  onClick={handleCancel}
                  title="Cancel"
                  style={{ background: "var(--coral)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  className="search-arrow"
                  disabled={!query.trim() || loading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      </header>

      {isIdle && (
        <div className="example-chips">
          {EXAMPLE_QUERIES.map((eq, i) => (
            <button
              key={i}
              className="example-chip"
              onClick={() => {
                setQuery(eq)
                handleSubmit(eq)
              }}
            >
              {eq}
            </button>
          ))}
        </div>
      )}

      <div className="panels">
        <div className={`answer-column ${isGenerating ? "generating" : ""}`}>
          {isIdle ? (
            <div className="idle-state">
              <div className="idle-ghost">Ask anything.</div>
              <div className="idle-ghost">Witness how it knows.</div>
              <div className="idle-suggestions">
                {EXAMPLE_QUERIES.map((eq, i) => (
                  <button
                    key={i}
                    className="idle-suggestion"
                    onClick={() => {
                      setQuery(eq)
                      handleSubmit(eq)
                    }}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="answer-header">
                <span className="answer-label">
                  ANSWER
                  {isPostGeneration && <ConfidenceBadge score={confidenceScore} />}
                </span>
              </div>

              {showPullQuote && (
                <blockquote className="pull-quote">
                  &ldquo;The search is over. Here is what the sources reveal.&rdquo;
                </blockquote>
              )}

              <div className="answer-body" ref={answerRef}>
                {renderAnswerWithCitations(answer, sources, highlightSource)}
                {isGenerating && <span className="streaming-cursor" />}
              </div>

              {isPostGeneration && <ConfidenceCurve />}
            </>
          )}
        </div>

        <div className="pipeline-panel">
          <div className="pipeline-header">
            <label>PIPELINE</label>
            <div className="pipeline-header-actions">
              <button
                className="sse-toggle"
                onClick={() => setSseOpen(!sseOpen)}
                title="Toggle SSE Event Log"
              >
                {"{ }"}
              </button>
            </div>
          </div>

          <div className="pipeline-stages">
            {STAGE_ORDER.map((stage, idx) => {
              const data = stages[stage] || { status: "idle", elapsed: 0 }
              const isActive = data.status === "active"
              const isDone = data.status === "done"
              return (
                <div key={stage} className="stage-node">
                  <div className={`stage-row ${isActive ? "active" : ""} ${isDone ? "done" : ""} ${data.status === "error" ? "error" : ""}`}>
                    <div
                      className={`stage-circle ${isActive ? "active" : ""} ${isDone ? "done" : ""} ${data.status === "error" ? "error" : ""}`}
                    />
                    <span className="stage-name">
                      {stage.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                    {isDone && data.elapsed > 0 && (
                      <span className="stage-duration">{data.elapsed}ms</span>
                    )}
                  </div>

                  <div className={`metadata-card ${isActive || isDone ? "open" : ""}`}>
                    <StageMetadata stage={stage} active={isActive} meta={stageMeta[stage]} />
                  </div>

                  {idx < STAGE_ORDER.length - 1 && (
                    <div
                      className={`stage-connector ${isDone ? "done" : ""} ${isActive ? "active-prev" : ""}`}
                    />
                  )}
                </div>
              )
            })}

            {complete && (
              <button className="replay-btn" onClick={handleReplay}>
                \u21BA Replay
              </button>
            )}
          </div>

          {complete && latencyEntries.length > 0 && (
            <LatencyWaterfall entries={latencyEntries} />
          )}
        </div>

        <div className="sources-panel">
          <div className="sources-header">
            <label>
              SOURCES
              {sources.length > 0 && (
                <span className="sources-count">{sources.length}</span>
              )}
            </label>
          </div>

          <div className="sources-list">
            {!sources.length && loading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-line" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line" />
                  </div>
                ))}
              </>
            ) : sources.length > 0 ? (
              sources.map((src, i) => (
                <SourceCard
                  key={src.id}
                  source={src}
                  isHighlighted={highlightedSource === src.id}
                  style={{ animationDelay: `${i * 80}ms` }}
                  onMouseEnter={() => highlightSource(src.id)}
                  onMouseLeave={() => highlightSource(null)}
                />
              ))
            ) : null}

            {sources.length > 0 && <SemanticHeatmap sources={sources} />}
            {sources.length > 0 && (
              <KnowledgeGraph
                sources={sources}
                onNodeClick={(id) => highlightSource(id)}
              />
            )}
          </div>

          {followUps.length > 0 && (
            <div className="related-queries">
              <div className="related-label">Related Queries</div>
              <div className="related-pills">
                {followUps.map((rq, i) => (
                  <button
                    key={i}
                    className="related-pill"
                    onClick={() => {
                      setQuery(rq)
                      handleSubmit(rq)
                    }}
                  >
                    {rq}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`sse-log ${sseOpen ? "open" : ""}`}>
        <div className="sse-log-inner">
          {sseLog.length === 0 && !loading && !complete && (
            <div style={{ color: "var(--text3)", fontSize: 11 }}>
              Waiting for events\u2026
            </div>
          )}
          {sseLog.map((entry, i) => {
            const timeStr = `[${String(Math.floor(entry.time / 1000)).padStart(2, "0")}:${String(entry.time % 1000).padStart(3, "0")}]`
            return (
              <div key={i} className="sse-line">
                <span className="sse-time">{timeStr}</span>
                <span className="sse-event">{entry.event}</span>
                <span className="sse-data">{entry.data}</span>
              </div>
            )
          })}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
