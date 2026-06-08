export function LatencyWaterfall({ entries }: { entries: { stage: string; time: number }[] }) {
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
        const label = e.stage.replace("-", "").slice(0, 2).toUpperCase()
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
