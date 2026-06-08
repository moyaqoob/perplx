"use client"

import { useMemo } from "react"
import type { Source } from "../types"

export function KnowledgeGraph({ sources, onNodeClick }: { sources: Source[]; onNodeClick: (id: number) => void }) {
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
