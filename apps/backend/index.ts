import express from "express"
import cors from "cors"
import { runPipeline } from "./lib/pipeline"

const app = express()

app.use(cors())
app.use(express.json())

app.post("/api/search", async (req, res) => {
  const { query, focus } = req.body

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" })
    return
  }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")

  const stream = runPipeline({ query, focus })

  try {
    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    }
    res.write(`data: ${JSON.stringify({ stage: "done" })}\n\n`)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    res.write(
      `data: ${JSON.stringify({ stage: "error", error: errorMessage })}\n\n`,
    )
  } finally {
    res.end()
  }
})

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.listen(3001, () => {
  console.log("⟳ Perplx backend running on http://localhost:3001")
})
