export function QueryTree({ subQueries, entities }: { subQueries?: string[]; entities?: string[] }) {
  if (!subQueries?.length) return null
  const w = 200
  const h = 80
  const rootX = w / 2
  const rootY = 10
  const childY = 35
  const grandY = 60
  const childSpacing = 55
  const children = subQueries.slice(0, 3)
  const grandchildren = [
    entities?.slice(0, 3) ?? [],
    entities?.slice(2, 5) ?? [],
    entities?.slice(4, 7) ?? [],
  ]

  return (
    <div className="query-tree">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
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
        <rect x={rootX - 40} y={rootY - 5} width={80} height={12} rx={6} fill="var(--surface)" stroke="var(--border2)" strokeWidth="1" />
        <text x={rootX} y={rootY + 3} textAnchor="middle" fill="var(--text2)" fontSize="7" fontFamily="DM Mono, monospace">
          {(children[0] ?? "").length > 16 ? (children[0] ?? "").slice(0, 16) + "\u2026" : children[0]}
        </text>
        {children.map((c, i) => {
          const cx = w / 2 - (children.length - 1) * (childSpacing / 2) + i * childSpacing
          return (
            <g key={`child-${i}`}>
              <rect x={cx - 28} y={childY - 5} width={56} height={12} rx={6} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="0.5" />
              <text x={cx} y={childY + 3} textAnchor="middle" fill="var(--accent)" fontSize="6" fontFamily="DM Mono, monospace">
                {c.length > 14 ? c.slice(0, 14) + "\u2026" : c}
              </text>
            </g>
          )
        })}
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
                  {g.length > 10 ? g.slice(0, 10) + "\u2026" : g}
                </text>
              </g>
            )
          })
        })}
      </svg>
    </div>
  )
}
