export function TokenBudgetBar({ promptLength }: { promptLength?: number }) {
  const total = 128000
  const pct = promptLength ? Math.min((promptLength / total) * 100, 70) : 0
  const segments = [
    { label: "Context", pct: Math.round(pct), color: "context", tooltip: `Context: ${promptLength?.toLocaleString() ?? "?"} tokens` },
    { label: "Query", pct: 4, color: "query", tooltip: "Query tokens" },
    { label: "Reserve", pct: Math.max(26, 100 - Math.round(pct) - 4), color: "reserve", tooltip: "Reserved tokens" },
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
        <span>{(total / 1000).toFixed(0)}k context window</span>
      </div>
    </div>
  )
}
