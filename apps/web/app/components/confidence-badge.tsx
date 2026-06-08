export function ConfidenceBadge({ score }: { score: number }) {
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
