"use client"

import { useState, useMemo } from "react"
import type { Source } from "../types"

export function SemanticHeatmap({ sources }: { sources: Source[] }) {
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
                  : { background: `oklch(60% 0.15 ${hue} / ${opacity})` }
              }
              onMouseEnter={(e) => {
                if (p.i !== p.j) setTooltip({ x: e.clientX, y: e.clientY, score: p.score })
              }}
              onMouseMove={(e) => {
                if (p.i !== p.j) setTooltip({ x: e.clientX, y: e.clientY, score: p.score })
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        })}
      </div>
      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x + 10, top: tooltip.y - 20 }}>
          similarity: {tooltip.score.toFixed(3)}
        </div>
      )}
    </div>
  )
}
