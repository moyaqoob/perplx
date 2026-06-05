"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"

type StageStatus = "idle" | "active" | "done" | "error"

interface StageData {
  status: StageStatus
  elapsed: number
  metadata?: string
}

interface Source {
  id: number
  title: string
  domain: string
  url: string
  score: number
}

interface SSELogEntry {
  time: number
  event: string
  data: string
}

const MOCK_ANSWER =
  'The no-communication theorem is a fundamental result in quantum information theory that demonstrates the impossibility of transmitting information using entangled quantum states alone [1]. This theorem, first formally proven by Ghirardi, Rimini, and Weber in 1980, shows that despite the non-local correlations predicted by quantum mechanics [2], these correlations cannot be exploited for faster-than-light communication [3]. The theorem holds that while measurement outcomes on entangled particles are correlated, the marginal probability distribution of outcomes on any individual particle remains independent of what measurements are performed on its entangled partner [4]. This ensures that no signal can propagate between spacelike separated regions through quantum entanglement alone [5].\n\nThe implications of the no-communication theorem are profound for our understanding of quantum mechanics and relativity. It preserves the causality structure of special relativity while accommodating the non-local correlations of quantum theory [3]. Without this theorem, quantum entanglement could potentially be used to build a "quantum telephone" capable of instantaneous communication across any distance [1].\n\nHowever, the theorem does not prevent all uses of entanglement for communication — it specifically rules out classical communication. Quantum communication protocols like quantum teleportation and superdense coding [4] actually rely on entanglement plus a classical channel. The classical channel acts as the bottleneck that enforces the speed-of-light limit [2]. In quantum teleportation, for instance, an entangled pair and two classical bits are needed to transmit a single qubit, ensuring no faster-than-light information transfer occurs [5].'

const MOCK_ANSWER_NO_CITATIONS = MOCK_ANSWER.replace(/\[\d+\]/g, "")

const MOCK_SOURCES: Source[] = [
  {
    id: 1,
    title: "No-Communication Theorem — Stanford Encyclopedia of Philosophy",
    domain: "plato.stanford.edu",
    url: "https://plato.stanford.edu/entries/qt-no-communication/",
    score: 0.94,
  },
  {
    id: 2,
    title: "Quantum Entanglement and Faster-than-Light Communication",
    domain: "arxiv.org",
    url: "https://arxiv.org/abs/quant-ph/9908087",
    score: 0.88,
  },
  {
    id: 3,
    title: "Ghirardi-Rimini-Weber Theorem — Scholarpedia",
    domain: "scholarpedia.org",
    url: "https://scholarpedia.org/article/Ghirardi-Rimini-Weber_theory",
    score: 0.82,
  },
  {
    id: 4,
    title: "The Limits of Quantum Correlations — Nature Physics",
    domain: "nature.com",
    url: "https://www.nature.com/articles/s41567-020-01105-0",
    score: 0.76,
  },
  {
    id: 5,
    title: "Bell's Theorem and the No-Communication Theorem — arXiv",
    domain: "arxiv.org",
    url: "https://arxiv.org/abs/2104.12345",
    score: 0.71,
  },
]

const RELATED_QUERIES = [
  "Can quantum entanglement be used for communication?",
  "What is quantum teleportation?",
  "How does special relativity relate to quantum mechanics?",
]

const EXAMPLE_QUERIES = [
  "What is the no-communication theorem?",
  "Explain quantum entanglement simply",
  "How does quantum teleportation work?",
]

const PIPELINE_TIMING = {
  "query-understanding": 600,
  retrieval: 500,
  reranking: 700,
  assembly: 300,
  generation: 2100,
  citations: 400,
  complete: 150,
} as const

const SUB_QUERIES = [
  "What is the no-communication theorem in quantum mechanics",
  "How does quantum entanglement relate to communication",
  "Ghirardi-Rimini-Weber theorem explained",
]

const ENTITIES = ["no-communication theorem", "quantum entanglement", "Ghirardi-Rimini-Weber", "Bell's theorem", "quantum teleportation", "superdense coding", "special relativity"]

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 85 ? "green" : pct >= 60 ? "amber" : "red"
  return (
    <span
      className={`answer-confidence-badge ${color}`}
      title={`Confidence score based on citation density (${pct}%). Higher = more citations per token × relevance.`}
    >
      ◉ {pct}% confidence
    </span>
  )
}

function TokenBudgetBar() {
  const segments = [
    { label: "System", pct: 5, color: "system", tooltip: "System prompt: 6,400 tokens" },
    { label: "Context 1", pct: 18, color: "context", tooltip: "Source [1]: 23,040 tokens" },
    { label: "Context 2", pct: 15, color: "context", tooltip: "Source [2]: 19,200 tokens" },
    { label: "Context 3", pct: 12, color: "context", tooltip: "Source [3]: 15,360 tokens" },
    { label: "Context 4", pct: 10, color: "context", tooltip: "Source [4]: 12,800 tokens" },
    { label: "Context 5", pct: 8, color: "context", tooltip: "Source [5]: 10,240 tokens" },
    { label: "Query", pct: 4, color: "query", tooltip: "Query: 5,120 tokens" },
    { label: "Reserve", pct: 28, color: "reserve", tooltip: "Reserved: 35,840 tokens" },
  ]
  return (
    <div className="token-budget">
      <div className="token-budget-bar">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`token-budget-segment ${s.color}`}
            style={{ width: `${s.pct}%` }}
            title={s.tooltip}
          />
        ))}
      </div>
      <div className="token-budget-label">
        <span>0</span>
        <span>128k context window</span>
      </div>
    </div>
  )
}

function ConfidenceCurve() {
  const points = useMemo(() => {
    const pts: { x: number; y: number; citation: boolean }[] = []
    for (let i = 0; i < 60; i++) {
      const t = i / 59
      const base = Math.sin(t * Math.PI) * 0.6 + 0.3
      const noise = Math.sin(t * 12) * 0.08 + Math.sin(t * 3) * 0.04
      const dip = Math.abs(t - 0.5) < 0.08 ? -0.15 : 0
      const citation = [0.12, 0.25, 0.38, 0.55, 0.7].some((c) => Math.abs(t - c) < 0.02)
      pts.push({ x: t, y: Math.max(0.05, Math.min(1, base + noise + dip)), citation })
    }
    return pts
  }, [])

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x * 100} ${(1 - p.y) * 36}`).join(" ")

  return (
    <div className="confidence-curve">
      <div className="confidence-curve-label">Model Confidence · Per-Token</div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--pulse)" />
            <stop offset="40%" stopColor="var(--pulse)" />
            <stop offset="50%" stopColor="var(--amber)" />
            <stop offset="60%" stopColor="var(--pulse)" />
            <stop offset="100%" stopColor="var(--pulse)" />
          </linearGradient>
        </defs>
        <path d={pathD} fill="none" stroke="url(#curveGrad)" strokeWidth="1.5" strokeLinecap="round" />
        {points
          .filter((p) => p.citation)
          .map((p, i) => (
            <line
              key={i}
              x1={p.x * 100}
              y1={(1 - p.y) * 36 - 4}
              x2={p.x * 100}
              y2={(1 - p.y) * 36 + 4}
              stroke="var(--accent)"
              strokeWidth="1"
            />
          ))}
      </svg>
    </div>
  )
}

function QueryTree({ query }: { query: string }) {
  const w = 200
  const h = 80
  const rootX = w / 2
  const rootY = 10
  const childY = 35
  const grandY = 60
  const childSpacing = 55
  const children = SUB_QUERIES.slice(0, 3)
  const grandchildren = [ENTITIES.slice(0, 3), ENTITIES.slice(2, 5), ENTITIES.slice(4, 7)]

  return (
    <div className="query-tree">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        {/* Root to children */}
        {children.map((_, i) => {
          const cx = w / 2 - (children.length - 1) * (childSpacing / 2) + i * childSpacing
          return (
            <line
              key={`r-${i}`}
              x1={rootX}
              y1={rootY + 6}
              x2={cx}
              y2={childY - 6}
              stroke="var(--border2)"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
          )
        })}
        {/* Children to grandchildren */}
        {children.map((_, i) => {
          const cx = w / 2 - (children.length - 1) * (childSpacing / 2) + i * childSpacing
          const gs = grandchildren[i]
          if (!gs) return null
          return gs.map((_, j) => {
            const gx = cx - (gs.length - 1) * 20 + j * 40
            return (
              <line
                key={`c-${i}-${j}`}
                x1={cx}
                y1={childY + 6}
                x2={gx}
                y2={grandY - 6}
                stroke="var(--border2)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )
          })
        })}
        {/* Root node */}
        <rect x={rootX - 40} y={rootY - 5} width={80} height={12} rx={6} fill="var(--surface)" stroke="var(--border2)" strokeWidth="1" />
        <text x={rootX} y={rootY + 3} textAnchor="middle" fill="var(--text2)" fontSize="7" fontFamily="DM Mono, monospace">
          {query.length > 16 ? query.slice(0, 16) + "…" : query}
        </text>
        {/* Child nodes */}
        {children.map((c, i) => {
          const cx = w / 2 - (children.length - 1) * (childSpacing / 2) + i * childSpacing
          return (
            <g key={`child-${i}`}>
              <rect x={cx - 28} y={childY - 5} width={56} height={12} rx={6} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="0.5" />
              <text x={cx} y={childY + 3} textAnchor="middle" fill="var(--accent)" fontSize="6" fontFamily="DM Mono, monospace">
                {c.length > 14 ? c.slice(0, 14) + "…" : c}
              </text>
            </g>
          )
        })}
        {/* Grandchild nodes */}
        {children.map((_, i) => {
          const cx = w / 2 - (children.length - 1) * (childSpacing / 2) + i * childSpacing
          const gs = grandchildren[i]
          if (!gs) return null
          return gs.map((g, j) => {
            const gx = cx - (gs.length - 1) * 20 + j * 40
            return (
              <g key={`gc-${i}-${j}`}>
                <rect x={gx - 18} y={grandY - 5} width={36} height={10} rx={5} fill="var(--surface)" stroke="var(--border)" strokeWidth="0.5" />
                <text x={gx} y={grandY + 2} textAnchor="middle" fill="var(--text3)" fontSize="5" fontFamily="DM Mono, monospace">
                  {g.length > 10 ? g.slice(0, 10) + "…" : g}
                </text>
              </g>
            )
          })
        })}
      </svg>
    </div>
  )
}

function KnowledgeGraph({ sources, onNodeClick }: { sources: Source[]; onNodeClick: (id: number) => void }) {
  const nodes = useMemo(() => {
    const positions = sources.map((s, i) => ({
      id: s.id,
      r: 6 + s.score * 8,
      x: 30 + Math.cos((i / sources.length) * Math.PI * 2) * 30,
      y: 30 + Math.sin((i / sources.length) * Math.PI * 2) * 30,
      central: s.score > 0.85,
    }))
    return positions
  }, [sources])

  const edges = useMemo(() => {
    const e: { source: number; target: number }[] = []
    for (let i = 0; i < sources.length; i++) {
      const si = sources[i]
      if (!si) continue
      for (let j = i + 1; j < sources.length; j++) {
        const sj = sources[j]
        if (!sj) continue
        if (Math.abs(si.score - sj.score) < 0.15) {
          e.push({ source: si.id, target: sj.id })
        }
      }
    }
    if (e.length === 0) {
      for (let i = 0; i < sources.length - 1; i++) {
        const si = sources[i]
        const sj = sources[i + 1]
        if (si && sj) {
          e.push({ source: si.id, target: sj.id })
        }
      }
    }
    return e
  }, [sources])

  return (
    <div className="knowledge-graph">
      <div className="kg-label">Knowledge Graph</div>
      <div className="kg-container">
        <svg viewBox="0 0 100 70">
          {edges.map((e, i) => {
            const s = nodes.find((n) => n.id === e.source)
            const t = nodes.find((n) => n.id === e.target)
            if (!s || !t) return null
            return (
              <line
                key={`edge-${i}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="var(--accent)"
                strokeWidth="0.5"
                opacity="0.4"
              />
            )
          })}
          {nodes.map((n) => (
            <g
              key={n.id}
              style={{ cursor: "pointer" }}
              onClick={() => onNodeClick(n.id)}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.central ? "var(--pulse)" : "var(--accent-soft)"}
                stroke={n.central ? "var(--pulse)" : "var(--accent)"}
                strokeWidth="1"
                opacity="0.8"
              />
              <text
                x={n.x + n.r + 3}
                y={n.y + 2}
                fill="var(--text3)"
                fontSize="5"
                fontFamily="DM Mono, monospace"
              >
                [{n.id}]
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function StageMetadata({
  stage,
  active,
}: {
  stage: string
  active: boolean
}) {
  switch (stage) {
    case "query-understanding":
      return (
        <div className="metadata-content">
          <span className="intent-chip">scientific-explanation</span>
          <div style={{ marginTop: 6 }}>
            {SUB_QUERIES.map((sq, i) => (
              <span key={i} className="tag">
                {sq}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 4, color: "var(--text3)", fontSize: 9 }}>
            needsRecency: false
          </div>
          <QueryTree query={SUB_QUERIES[0] ?? ""} />
        </div>
      )
    case "retrieval":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>docs</span>
            <span>47</span>
          </div>
          <div className="token-kv">
            <span>topScore</span>
            <span>0.94</span>
          </div>
          <div className="score-bar-mini">
            <div
              className="score-bar-mini-fill"
              style={{ width: active ? "94%" : "0%" }}
            />
          </div>
        </div>
      )
    case "reranking":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>passed</span>
            <span>5</span>
          </div>
          <div className="token-kv">
            <span>discarded</span>
            <span>42</span>
          </div>
          <div className="token-kv">
            <span>threshold</span>
            <span>0.71</span>
          </div>
          <div className="bar-chart">
            <div className="bar-pass" style={{ height: active ? "16px" : "0px" }} />
            <div className="bar-discard" style={{ height: active ? "4px" : "0px" }} />
          </div>
        </div>
      )
    case "assembly":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>~tokens</span>
            <span>961</span>
          </div>
          <div className="token-kv">
            <span>chars</span>
            <span>3,847</span>
          </div>
          <TokenBudgetBar />
        </div>
      )
    case "generation":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>tokens</span>
            <span id="token-counter">0</span>
          </div>
          <div className="token-kv">
            <span>rate</span>
            <span id="token-rate">0 tok/s</span>
          </div>
        </div>
      )
    case "citations":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>sources</span>
            <span>5</span>
          </div>
          <div className="token-kv">
            <span>follow-ups</span>
            <span>3</span>
          </div>
          <div className="token-kv">
            <span>latency</span>
            <span>2,340ms</span>
          </div>
        </div>
      )
    case "complete":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>total</span>
            <span>2,340ms</span>
          </div>
          <div className="token-kv">
            <span>breakdown</span>
            <span />
          </div>
          <div style={{ fontSize: 8, color: "var(--text3)", lineHeight: 1.4 }}>
            Q.{">"}600ms R.{">"}500ms RR.{">"}700ms A.{">"}300ms G.{">"}2,100ms C.{">"}400ms
          </div>
        </div>
      )
    default:
      return null
  }
}

function LatencyWaterfall({ entries }: { entries: { stage: string; time: number }[] }) {
  if (entries.length === 0) return null
  const maxTime = Math.max(...entries.map((e) => e.time))
  const barColors: Record<string, string> = {
    "query-understanding": "#6d7cff",
    retrieval: "#5a6ae6",
    reranking: "#4758cc",
    assembly: "#3546b3",
    generation: "#6d7cff",
    citations: "#5a6ae6",
  }
  return (
    <div className="latency-waterfall">
      <div className="latency-header">Latency Waterfall</div>
      {entries.map((e) => {
        const pct = maxTime > 0 ? (e.time / maxTime) * 100 : 0
        const label = e.stage
          .replace("-", "")
          .slice(0, 2)
          .toUpperCase()
        return (
          <div key={e.stage} className="latency-bar-row">
            <span className="latency-bar-label">{label}</span>
            <div className="latency-bar-track">
              <div
                className="latency-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: barColors[e.stage] || "var(--accent)",
                }}
              />
            </div>
            <span className="latency-bar-time">{e.time}ms</span>
          </div>
        )
      })}
    </div>
  )
}

function SourceCard({
  source,
  isHighlighted,
  style,
  onMouseEnter,
  onMouseLeave,
}: {
  source: Source
  isHighlighted: boolean
  style?: React.CSSProperties
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const scoreColor = source.score >= 0.85 ? "high" : source.score >= 0.7 ? "med" : "low"
  const [animScore, setAnimScore] = useState(0)

  useEffect(() => {
    const duration = 600
    const start = performance.now()
    const target = source.score
    let raf: number
    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setAnimScore(ease * target)
      if (t < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [source.score])

  return (
    <div
      className={`source-card ${isHighlighted ? "highlighted" : ""}`}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="source-card-top">
        <span className="source-num">[{source.id}]</span>
        <div className="source-info">
          <div className="source-title">{source.title}</div>
          <div className="source-domain">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {source.domain}
          </div>
        </div>
      </div>
      <div className="source-score-row">
        <div className="source-score-bar">
          <div
            className={`source-score-fill ${scoreColor}`}
            style={{ width: `${animScore * 100}%` }}
          />
        </div>
        <span className="source-score-num">{animScore.toFixed(2)}</span>
      </div>
    </div>
  )
}

function SemanticHeatmap({ sources }: { sources: Source[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; score: number } | null>(null)

  const pairs = useMemo(() => {
    const p: { i: number; j: number; score: number }[] = []
    for (let i = 0; i < sources.length; i++) {
      const si = sources[i]
      if (!si) continue
      for (let j = 0; j < sources.length; j++) {
        const sj = sources[j]
        if (!sj) continue
        if (i === j) {
          p.push({ i, j, score: 1 })
        } else {
          const base = 1 - Math.abs(si.score - sj.score)
          const noise = Math.sin(i * 7 + j * 13) * 0.1
          p.push({ i, j, score: Math.max(0, Math.min(1, base + noise)) })
        }
      }
    }
    return p
  }, [sources])

  return (
    <div className="semantic-heatmap">
      <div className="heatmap-label">Semantic Map</div>
      <div className="heatmap-grid">
        {pairs.map((p, idx) => {
          const hue = 200 + p.score * 100
          const opacity = 0.2 + p.score * 0.6
          return (
            <div
              key={idx}
              className={`heatmap-cell ${p.i === p.j ? "empty" : ""}`}
              style={
                p.i === p.j
                  ? undefined
                  : {
                      background: `oklch(60% 0.15 ${hue} / ${opacity})`,
                    }
              }
              onMouseEnter={(e) => {
                if (p.i !== p.j) {
                  setTooltip({ x: e.clientX, y: e.clientY, score: p.score })
                }
              }}
              onMouseMove={(e) => {
                if (p.i !== p.j) {
                  setTooltip({ x: e.clientX, y: e.clientY, score: p.score })
                }
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        })}
      </div>
      {tooltip && (
        <div
          className="tooltip"
          style={{ left: tooltip.x + 10, top: tooltip.y - 20 }}
        >
          similarity: {tooltip.score.toFixed(3)}
        </div>
      )}
    </div>
  )
}

const STAGE_ORDER = [
  "query-understanding",
  "retrieval",
  "reranking",
  "assembly",
  "generation",
  "citations",
  "complete",
] as const

export default function Home() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [stages, setStages] = useState<Record<string, StageData>>({})
  const [answer, setAnswer] = useState("")
  const [displayedChars, setDisplayedChars] = useState(0)
  const [sources, setSources] = useState<Source[]>([])
  const [highlightedSource, setHighlightedSource] = useState<number | null>(null)
  const [sseLog, setSseLog] = useState<SSELogEntry[]>([])
  const [sseOpen, setSseOpen] = useState(false)
  const [latencyEntries, setLatencyEntries] = useState<{ stage: string; time: number }[]>([])
  const [tokenCount, setTokenCount] = useState(0)
  const [showPullQuote, setShowPullQuote] = useState(false)
  const [complete, setComplete] = useState(false)
  const [tokenRate, setTokenRate] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const streamTimerRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const tokenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenStartRef = useRef(0)

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

  function streamAnswer(text: string) {
    const chars = text.split("")
    let idx = 0
    const tokenStart = Date.now()
    tokenStartRef.current = tokenStart
    let tokensEmitted = 0

    tokenIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - tokenStartRef.current) / 1000
      if (elapsed > 0) {
        setTokenRate(Math.round(tokensEmitted / elapsed))
      }
    }, 200)

    function emitChar() {
      if (idx >= chars.length) return
      setDisplayedChars(idx + 1)
      tokensEmitted++
      setTokenCount((prev) => prev + 1)
      idx++
      const delay = 8 + Math.random() * 12
      const t = setTimeout(emitChar, delay)
      streamTimerRef.current.push(t)
    }
    emitChar()
  }

  function runPipeline(searchQuery: string) {
    setComplete(false)
    setShowPullQuote(false)
    setDisplayedChars(0)
    setAnswer("")
    setTokenCount(0)
    setTokenRate(0)
    setStages(initStages())
    setSources([])
    setLatencyEntries([])
    setSseLog([])
    setHighlightedSource(null)
    setComplete(false)
    setLoading(true)
    setCurrentStage("query-understanding")

    if (tokenIntervalRef.current) {
      clearInterval(tokenIntervalRef.current)
      tokenIntervalRef.current = null
    }

    timersRef.current.forEach(clearTimeout)
    streamTimerRef.current.forEach(clearTimeout)
    timersRef.current = []
    streamTimerRef.current = []

    let cumulativeTime = 0
    const sseEntries: SSELogEntry[] = []
    const latencyData: { stage: string; time: number }[] = []

    STAGE_ORDER.forEach((stage, idx) => {
      const delay = PIPELINE_TIMING[stage] || 300
      cumulativeTime += delay

      const t = setTimeout(
        () => {
          setCurrentStage(stage)

          setStages((prev) => {
            const next = { ...prev }
            // Mark previous as done
            if (idx > 0) {
              const prevStage = STAGE_ORDER[idx - 1]
              if (prevStage && next[prevStage]) {
                next[prevStage] = { ...next[prevStage], status: "done", elapsed: delay }
              }
            }
            if (stage && next[stage]) {
              next[stage] = { ...next[stage], status: "active", elapsed: 0 }
            }
            return next
          })

          latencyData.push({ stage, time: PIPELINE_TIMING[stage] ?? 0 })
          setLatencyEntries([...latencyData])

          sseEntries.push({
            time: cumulativeTime,
            event: stage,
            data: "",
          })
          setSseLog([...sseEntries])

          if (stage === "generation") {
            // Mark reranking as done and set sources
            setStages((prev) => {
              const next = { ...prev }
              if (next.reranking) next.reranking = { ...next.reranking, status: "done", elapsed: PIPELINE_TIMING.reranking }
              if (next.assembly) next.assembly = { ...next.assembly, status: "done", elapsed: PIPELINE_TIMING.assembly }
              if (next.generation) next.generation = { ...next.generation, status: "active", elapsed: 0 }
              return next
            })
            setSources(MOCK_SOURCES)
            setAnswer(MOCK_ANSWER_NO_CITATIONS)
            streamAnswer(MOCK_ANSWER)
          }

          if (stage === "complete") {
            setStages((prev) => {
              const next = { ...prev }
              if (next.generation) next.generation = { ...next.generation, status: "done", elapsed: PIPELINE_TIMING.generation }
              if (next.citations) next.citations = { ...next.citations, status: "done", elapsed: PIPELINE_TIMING.citations }
              if (next.complete) next.complete = { ...next.complete, status: "done", elapsed: PIPELINE_TIMING.complete }
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

            const fullEntries = [
              ...sseEntries,
              { time: cumulativeTime + 8, event: "done", data: "" },
            ]
            setSseLog(fullEntries)
          }
        },
        cumulativeTime,
      )
      timersRef.current.push(t)
    })
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
    const q = query.trim() || EXAMPLE_QUERIES[0] || "What is the no-communication theorem?"
    runPipeline(q)
  }

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      streamTimerRef.current.forEach(clearTimeout)
      if (tokenIntervalRef.current) clearInterval(tokenIntervalRef.current)
    }
  }, [])

  // Keyboard shortcuts
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
        timersRef.current.forEach(clearTimeout)
        streamTimerRef.current.forEach(clearTimeout)
        setLoading(false)
        setCurrentStage(null)
      }
      if (e.key === "r" && !e.ctrlKey && !e.metaKey && complete) {
        handleReplay()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [complete, handleReplay])

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      r: number
    }[] = []

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

  // Dynamic title
  useEffect(() => {
    if (loading) {
      document.title = "Aletheia · Searching…"
    } else if (complete) {
      const conf = computeConfidenceScore()
      document.title = `Aletheia · ${Math.round(conf * 100)}% confident`
    } else {
      document.title = "Aletheia"
    }
  }, [loading, complete, sources, answer])

  function computeConfidenceScore(): number {
    if (!answer || sources.length === 0) return 0
    const citationMatches = answer.match(/\[\d+\]/g)
    const numCitations = citationMatches?.length || 0
    const avgScore = sources.reduce((s, src) => s + src.score, 0) / sources.length
    const score = (numCitations / answer.length) * avgScore * 100
    return Math.min(1, Math.max(0, score * 2))
  }

  const confidenceScore = useMemo(computeConfidenceScore, [answer, sources])

  const isGenerating = currentStage === "generation"
  const isIdle = !loading && !complete && answer === ""
  const isPostGeneration = complete

  const displayAnswer = useMemo(() => {
    return MOCK_ANSWER_NO_CITATIONS.slice(0, displayedChars)
  }, [displayedChars])

  return (
    <div className="app">
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-dot" />
          <span className="logo-text">Aletheia</span>
        </div>

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

      {/* Three-panel layout */}
      <div className="panels">
        {/* Answer Column */}
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
                  &ldquo;The no-communication theorem ensures that measurement outcomes appear random, making signal encoding impossible.&rdquo;
                </blockquote>
              )}

              <div className="answer-body" ref={answerRef}>
                {renderAnswerWithCitations(displayAnswer, sources, highlightSource)}
                {isGenerating && <span className="streaming-cursor" />}
              </div>

              {isPostGeneration && <ConfidenceCurve />}
            </>
          )}
        </div>

        {/* Pipeline Panel */}
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
                      {stage
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </span>
                    {isDone && (
                      <span className="stage-duration">{data.elapsed}ms</span>
                    )}
                  </div>

                  <div className={`metadata-card ${isActive || isDone ? "open" : ""}`}>
                    <StageMetadata stage={stage} active={isActive} />
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
                ↺ Replay
              </button>
            )}
          </div>

          {complete && latencyEntries.length > 0 && (
            <LatencyWaterfall entries={latencyEntries} />
          )}
        </div>

        {/* Sources Panel */}
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

          {sources.length > 0 && (
            <div className="related-queries">
              <div className="related-label">Related Queries</div>
              <div className="related-pills">
                {RELATED_QUERIES.map((rq, i) => (
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

      {/* SSE Event Log */}
      <div className={`sse-log ${sseOpen ? "open" : ""}`}>
        <div className="sse-log-inner">
          {sseLog.length === 0 && !loading && !complete && (
            <div style={{ color: "var(--text3)", fontSize: 11 }}>
              Waiting for events…
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
    </div>
  )
}

function renderAnswerWithCitations(
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
