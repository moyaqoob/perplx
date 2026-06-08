"use client"

import { useMemo } from "react"

export function ConfidenceCurve() {
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
