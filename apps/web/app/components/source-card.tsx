"use client"

import { useState, useEffect } from "react"
import type { Source } from "../types"

export function SourceCard({
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
