import type { StageMeta } from "../types"
import { QueryTree } from "./query-tree"
import { TokenBudgetBar } from "./token-budget-bar"

export function StageMetadata({
  stage,
  active,
  meta,
}: {
  stage: string
  active: boolean
  meta?: StageMeta
}) {
  switch (stage) {
    case "query-understanding":
      return (
        <div className="metadata-content">
          {meta?.intent && <span className="intent-chip">{meta.intent}</span>}
          {meta?.subQueries && (
            <div style={{ marginTop: 6 }}>
              {meta.subQueries.map((sq, i) => (
                <span key={i} className="tag">{sq}</span>
              ))}
            </div>
          )}
          {meta?.needsRecency !== undefined && (
            <div style={{ marginTop: 4, color: "var(--text3)", fontSize: 9 }}>
              needsRecency: {String(meta.needsRecency)}
            </div>
          )}
          {meta?.subQueries && <QueryTree subQueries={meta.subQueries} entities={meta.entities} />}
        </div>
      )
    case "retrieval":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>docs</span>
            <span>{meta?.count ?? "\u2014"}</span>
          </div>
          <div className="token-kv">
            <span>topScore</span>
            <span>{meta?.topScore?.toFixed(2) ?? "\u2014"}</span>
          </div>
          {meta?.topScore && (
            <div className="score-bar-mini">
              <div
                className="score-bar-mini-fill"
                style={{ width: active ? `${meta.topScore * 100}%` : "0%" }}
              />
            </div>
          )}
        </div>
      )
    case "reranking":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>passed</span>
            <span>{meta?.passed ?? "\u2014"}</span>
          </div>
          <div className="token-kv">
            <span>discarded</span>
            <span>{meta?.discarded ?? "\u2014"}</span>
          </div>
          {(meta?.passed ?? 0) > 0 && (
            <div className="bar-chart">
              <div className="bar-pass" style={{ height: active ? "16px" : "0px" }} />
              <div className="bar-discard" style={{ height: active ? `${Math.min((meta?.discarded ?? 0) / Math.max(meta?.passed ?? 1, 1) * 16, 16)}px` : "0px" }} />
            </div>
          )}
        </div>
      )
    case "assembly":
      return (
        <div className="metadata-content">
          {meta?.promptLength && (
            <div className="token-kv">
              <span>~tokens</span>
              <span>{meta.promptLength.toLocaleString()}</span>
            </div>
          )}
          <TokenBudgetBar promptLength={meta?.promptLength} />
        </div>
      )
    case "generation":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>tokens</span>
            <span>{meta?.tokens ?? 0}</span>
          </div>
          <div className="token-kv">
            <span>rate</span>
            <span>{meta?.rate ?? 0} tok/s</span>
          </div>
        </div>
      )
    case "citations":
      return (
        <div className="metadata-content">
          <div className="token-kv">
            <span>sources</span>
            <span>{meta?.sourcesCount ?? "\u2014"}</span>
          </div>
          <div className="token-kv">
            <span>follow-ups</span>
            <span>{meta?.followUpsCount ?? "\u2014"}</span>
          </div>
          {meta?.latencyMs && (
            <div className="token-kv">
              <span>latency</span>
              <span>{meta.latencyMs.toLocaleString()}ms</span>
            </div>
          )}
        </div>
      )
    case "complete":
      return (
        <div className="metadata-content">
          {meta?.totalMs && (
            <div className="token-kv">
              <span>total</span>
              <span>{meta.totalMs.toLocaleString()}ms</span>
            </div>
          )}
          {meta?.breakdown && (
            <div style={{ fontSize: 8, color: "var(--text3)", lineHeight: 1.4 }}>
              {meta.breakdown}
            </div>
          )}
        </div>
      )
    default:
      return null
  }
}
